import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  verifyOutlookDesktopLifecycleProof,
} from "../../../packages/email-dms/src/outlook-desktop-installation-proof.js";
import {
  createOutlookInstallationIdentityStore,
  projectOutlookInstallationIdentity,
} from "../src/main/outlook-installation.js";

const PRINCIPAL = Object.freeze({
  tenant_id: "tenant-desktop-identity-a",
  user_id: "user-desktop-identity-a",
  entra_subject_id: "subject-desktop-identity-a",
});
const OTHER_PRINCIPAL = Object.freeze({
  tenant_id: "tenant-desktop-identity-a",
  user_id: "user-desktop-identity-b",
  entra_subject_id: "subject-desktop-identity-b",
});
const INSTALLATION_ID = "odi_desktop_identity_00000001";
const NOW = "2026-08-11T03:00:00.000Z";

function filePath(label = "store") {
  return join(
    mkdtempSync(join(tmpdir(), `lawos-outlook-identity-${label}-`)),
    "outlook-installation-identity.json",
  );
}

function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`safe-storage:${value}`, "utf8"),
    decryptString: (value) => String(value).replace(/^safe-storage:/u, ""),
  };
}

function proof(overrides = {}) {
  return {
    idempotency_key: "idem_desktop_identity_0001",
    nonce: Buffer.alloc(24, 7).toString("base64url"),
    issued_at: NOW,
    expires_at: "2026-08-11T03:02:00.000Z",
    ...overrides,
  };
}

test("first use creates one encrypted Ed25519 candidate and signs only registration", async () => {
  const target = filePath("first-use");
  const store = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  const identity = await store.getOrCreate(PRINCIPAL);
  assert.equal(identity.state, "candidate");
  assert.equal(identity.installation_id, null);
  assert.match(identity.device_key_fingerprint, /^[a-f0-9]{64}$/u);

  const signed = await store.signRegistration(PRINCIPAL, {
    platform: "darwin",
    app_version: "0.1.26",
    source_sha: "2".repeat(40),
    ...proof(),
  });
  const { signature, ...apiBody } = signed;
  assert.doesNotMatch(
    JSON.stringify(signed),
    /private_key|privateKey|session_token|access_token|refresh_token/iu,
  );
  const verified = verifyOutlookDesktopLifecycleProof({
    request: {
      method: "POST",
      path: "/api/desktop/installations",
      body: {
        platform: apiBody.platform,
        app_version: apiBody.app_version,
        source_sha: apiBody.source_sha,
        device_public_key: apiBody.device_public_key,
      },
      installation_id: "NEW",
      idempotency_key: apiBody.idempotency_key,
      nonce: apiBody.nonce,
      issued_at: apiBody.issued_at,
      expires_at: apiBody.expires_at,
    },
    signature,
    public_key: identity.device_public_key,
    now: new Date(NOW),
  });
  assert.equal(verified.verified, true);

  const raw = readFileSync(target, "utf8");
  assert.equal(raw.includes(identity.device_public_key), false);
  assert.equal(raw.includes(identity.device_key_fingerprint), false);
  assert.equal(raw.includes(PRINCIPAL.tenant_id), false);
  assert.equal(raw.includes(PRINCIPAL.user_id), false);
  assert.equal(raw.includes(PRINCIPAL.entra_subject_id), false);
  assert.doesNotMatch(raw, /PRIVATE KEY|private_key|session_token/iu);
});

test("restart restores the same principal-bound key and server installation id", async () => {
  const target = filePath("restart");
  const first = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "win32",
  });
  const candidate = await first.getOrCreate(PRINCIPAL);
  await first.markRegistered(PRINCIPAL, {
    installation_id: INSTALLATION_ID,
    state_version: 3,
  });

  const restarted = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "win32",
  });
  const restored = await restarted.getOrCreate(PRINCIPAL);
  assert.equal(restored.state, "registered");
  assert.equal(restored.installation_id, INSTALLATION_ID);
  assert.equal(restored.state_version, 3);
  assert.equal(restored.device_public_key, candidate.device_public_key);
  assert.equal(
    restored.device_key_fingerprint,
    candidate.device_key_fingerprint,
  );
});

test("principal partitions and concurrent creation cannot reuse or race one key", async () => {
  const target = filePath("partitions");
  const store = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => store.getOrCreate(PRINCIPAL)),
  );
  assert.equal(
    new Set(concurrent.map(({ device_key_fingerprint }) =>
      device_key_fingerprint)).size,
    1,
  );
  const other = await store.getOrCreate(OTHER_PRINCIPAL);
  assert.notEqual(
    other.device_key_fingerprint,
    concurrent[0].device_key_fingerprint,
  );
  assert.equal((await store.getOrCreate(PRINCIPAL)).device_key_fingerprint,
    concurrent[0].device_key_fingerprint);
  assert.equal((await store.getOrCreate({
    ...PRINCIPAL,
    ignored_renderer_field: "must-not-change-binding",
  })).device_key_fingerprint, concurrent[0].device_key_fingerprint);
});

test("unavailable corrupt or undecryptable safeStorage fails closed without overwriting", async () => {
  const unavailablePath = filePath("unavailable");
  const unavailable = createOutlookInstallationIdentityStore({
    filePath: unavailablePath,
    safeStorage: { isEncryptionAvailable: () => false },
    platform: "darwin",
  });
  await assert.rejects(
    unavailable.getOrCreate(PRINCIPAL),
    (error) => error.safe_error_code
      === "OUTLOOK_DESKTOP_SECURE_STORAGE_UNAVAILABLE",
  );
  assert.equal(existsSync(unavailablePath), false);

  const encryptedPath = filePath("decrypt");
  const valid = createOutlookInstallationIdentityStore({
    filePath: encryptedPath,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  await valid.getOrCreate(PRINCIPAL);
  const encryptedBefore = readFileSync(encryptedPath, "utf8");
  const undecryptable = createOutlookInstallationIdentityStore({
    filePath: encryptedPath,
    safeStorage: {
      isEncryptionAvailable: () => true,
      decryptString() {
        throw new Error("Keychain temporarily unavailable");
      },
    },
    platform: "darwin",
  });
  await assert.rejects(
    undecryptable.getOrCreate(PRINCIPAL),
    (error) => error.safe_error_code
      === "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
  );
  assert.equal(readFileSync(encryptedPath, "utf8"), encryptedBefore);

  const corruptPath = filePath("corrupt");
  writeFileSync(corruptPath, "{not-json");
  const corruptBefore = readFileSync(corruptPath, "utf8");
  const corrupt = createOutlookInstallationIdentityStore({
    filePath: corruptPath,
    safeStorage: fakeSafeStorage(),
    platform: "win32",
  });
  await assert.rejects(
    corrupt.getOrCreate(PRINCIPAL),
    (error) => error.safe_error_code
      === "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
  );
  assert.equal(readFileSync(corruptPath, "utf8"), corruptBefore);
});

test("encryption and key-validation failures preserve the previous encrypted copy", async () => {
  const encryptPath = filePath("encrypt-failure");
  const valid = createOutlookInstallationIdentityStore({
    filePath: encryptPath,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  await valid.getOrCreate(PRINCIPAL);
  const encryptedBefore = readFileSync(encryptPath, "utf8");
  const failedWriter = createOutlookInstallationIdentityStore({
    filePath: encryptPath,
    safeStorage: {
      ...fakeSafeStorage(),
      encryptString() {
        throw new Error("Keychain write unavailable");
      },
    },
    platform: "darwin",
  });
  await assert.rejects(
    failedWriter.markRegistered(PRINCIPAL, {
      installation_id: INSTALLATION_ID,
      state_version: 1,
    }),
    (error) => error.safe_error_code
      === "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
  );
  assert.equal(readFileSync(encryptPath, "utf8"), encryptedBefore);

  const invalidKeyStore = createOutlookInstallationIdentityStore({
    filePath: encryptPath,
    safeStorage: {
      ...fakeSafeStorage(),
      decryptString(value) {
        const payload = JSON.parse(fakeSafeStorage().decryptString(value));
        const [binding] = Object.keys(payload.entries);
        payload.entries[binding].device_public_key = "AAAA";
        return JSON.stringify(payload);
      },
    },
    platform: "darwin",
  });
  await assert.rejects(
    invalidKeyStore.getOrCreate(PRINCIPAL),
    (error) => error.safe_error_code
      === "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
  );
  assert.equal(readFileSync(encryptPath, "utf8"), encryptedBefore);
});

test("loss of the encrypted file creates a new candidate but corrupt data never does", async () => {
  const target = filePath("key-loss");
  const first = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  const original = await first.getOrCreate(PRINCIPAL);
  unlinkSync(target);

  const afterLoss = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  const replacement = await afterLoss.getOrCreate(PRINCIPAL);
  assert.equal(replacement.state, "candidate");
  assert.equal(replacement.installation_id, null);
  assert.notEqual(
    replacement.device_key_fingerprint,
    original.device_key_fingerprint,
  );
});

test("confirmed retire erases only one principal partition", async () => {
  const target = filePath("retire");
  const store = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "win32",
  });
  const first = await store.getOrCreate(PRINCIPAL);
  const second = await store.getOrCreate(OTHER_PRINCIPAL);
  await store.markRegistered(PRINCIPAL, {
    installation_id: INSTALLATION_ID,
    state_version: 2,
  });
  const retired = await store.confirmRetire(PRINCIPAL, {
    installation_id: INSTALLATION_ID,
  });
  assert.deepEqual(retired, {
    removed: true,
    identity_material_removed: true,
    token_material_returned: false,
  });

  const reopened = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "win32",
  });
  const recreated = await reopened.getOrCreate(PRINCIPAL);
  const preserved = await reopened.getOrCreate(OTHER_PRINCIPAL);
  assert.notEqual(recreated.device_key_fingerprint, first.device_key_fingerprint);
  assert.equal(preserved.device_key_fingerprint, second.device_key_fingerprint);
});

test("heartbeat and retire signatures are fixed operations and reject another principal", async () => {
  const target = filePath("operations");
  const store = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  await store.getOrCreate(PRINCIPAL);
  await store.markRegistered(PRINCIPAL, {
    installation_id: INSTALLATION_ID,
    state_version: 4,
  });
  const heartbeat = await store.signHeartbeat(PRINCIPAL, {
    expected_state_version: 4,
    ...proof({ idempotency_key: "idem_desktop_identity_heartbeat_0002" }),
  });
  const retire = await store.signRetire(PRINCIPAL, {
    expected_state_version: 5,
    retire_reason: "device_disconnect",
    ...proof({ idempotency_key: "idem_desktop_identity_retire_0003" }),
  });
  assert.equal(typeof heartbeat.signature, "string");
  assert.equal(typeof retire.signature, "string");
  assert.equal(heartbeat.expected_state_version, 4);
  assert.equal(retire.retire_reason, "device_disconnect");
  await assert.rejects(
    store.signHeartbeat(OTHER_PRINCIPAL, {
      expected_state_version: 4,
      ...proof({ idempotency_key: "idem_desktop_identity_cross_0004" }),
    }),
    (error) => error.safe_error_code
      === "OUTLOOK_DESKTOP_INSTALLATION_IDENTITY_REQUIRED",
  );
});

test("renderer projection contains no key installation id principal or token material", async () => {
  const target = filePath("projection");
  const store = createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
  const identity = await store.getOrCreate(PRINCIPAL);
  const projection = projectOutlookInstallationIdentity(identity);
  assert.deepEqual(projection, {
    state: "candidate",
    registered: false,
    token_material_returned: false,
    private_key_material_returned: false,
  });
  assert.doesNotMatch(
    JSON.stringify(projection),
    /device_public_key|private_key_pkcs8|installation_id|tenant_id|user_id|entra_subject_id|session_token/iu,
  );
});
