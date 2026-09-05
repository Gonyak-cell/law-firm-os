import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createOutlookInstallationIdentityStore } from "../../desktop/src/main/outlook-installation.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { verifyInternalUnsignedInstallationAttestation } from "../../../packages/runtime-auth/src/internal-unsigned-installation-attestation.js";
import {
  createOutlookAssignmentAuthorityFixture,
  roleDatabaseNow,
  roleJsonCall,
} from "../../../packages/email-dms/test/support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { createPostgresInternalUnsignedInstallationAuthority } from "../src/internal-unsigned-installation-authority.js";
import { composeInternalUnsignedInstallationRuntime } from "../src/internal-unsigned-installation-runtime-context.js";
import { createPostgresOutlookDesktopOperationalRuntime } from "../src/outlook-desktop-operational-runtime.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import { createApiServer } from "../src/server.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const buildIdentity = {
  platform: "win32",
  app_version: "0.1.32",
  source_sha: "a1bf725fb94302b166cdf9a4a9f6f9c1d2a31ce7",
};
const proof = (operation) => ({
  idempotency_key: `legacy-http-${operation}-${randomBytes(12).toString("hex")}`,
  nonce: randomBytes(24).toString("base64url"),
  issued_at: new Date(Date.now() - 1000).toISOString(),
  expires_at: new Date(Date.now() + 120000).toISOString(),
});

test("unchanged 0.1.32 client signs its existing HTTP lifecycle against the internal PostgreSQL authority without replacing its identity", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-internal-legacy-http",
    userId: "user-internal-http-1",
    entraSubjectId: "subject-internal-http-1",
  });
  assert.ok(authority, "actual temporary PostgreSQL is required");
  const actor = { tenant_id: authority.tenantId, ...authority.principal };
  const principal = { ...actor, scopes: [OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE] };
  const clientPrincipal = { principal_ref: `odpr_${randomBytes(32).toString("base64url")}` };
  const directory = await mkdtemp(join(tmpdir(), "lawos-internal-legacy-http-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  // This fixture exercises persistence and signing, not native OS encryption.
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(value, "utf8"),
    decryptString: (value) => value.toString("utf8"),
  };
  const storeOptions = { filePath: join(directory, "identity.json"), safeStorage, platform: "win32" };
  const store = createOutlookInstallationIdentityStore(storeOptions);
  const candidate = await store.getOrCreate(clientPrincipal);
  assert.equal(candidate.state, "candidate");
  const signer = generateKeyPairSync("ed25519");
  const signerPin = digest(signer.publicKey.export({ type: "spki", format: "der" }));
  const now = Date.parse(await roleDatabaseNow(authority.appPool, authority.tenantId));
  const material = {
    ...actor,
    authorization_id: "synthetic-legacy-http-authorization",
    device_key_fingerprint: candidate.device_key_fingerprint,
    installed_receipt_sha256: digest("synthetic Windows installed receipt"),
    app_id: "com.amic.matter.desktop.internal",
    platform: buildIdentity.platform,
    architecture: "x64",
    channel: "internal-unsigned",
    release_id: "synthetic-legacy-http-release",
    release_sequence: 32,
    version: buildIdentity.app_version,
    source_sha: buildIdentity.source_sha,
    source_tree: "b".repeat(40),
    installer_sha256: digest("synthetic immutable installer"),
    installer_bytes: 109711906,
    installer_version_id: "synthetic-installer-version",
    bootstrap_marker_sha256: digest("synthetic bootstrap marker"),
    owner_approval_sha256: digest("synthetic exact device owner approval"),
    valid_from: new Date(now - 1000).toISOString(),
    valid_until: new Date(now + 3600000).toISOString(),
  };
  const grant = { ...material, release_authority_sha256: hashDomainValue(material) };
  await roleJsonCall(authority.controlPool, authority.tenantId, "authorize_internal_unsigned_release", grant);
  const service = createPostgresInternalUnsignedInstallationAuthority({
    pool: authority.appPool,
    tenant_id: authority.tenantId,
    attestation_key_id: "synthetic-legacy-http-attestation",
    attestation_private_key: signer.privateKey,
    expected_attestation_public_key_sha256: signerPin,
  });
  const roster = parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "synthetic-legacy-http-roster",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: authority.tenantId,
      user_id: `user-internal-http-${index + 1}`,
      entra_subject_id: `subject-internal-http-${index + 1}`,
      enabled: true,
    })),
  });
  const operational = createPostgresOutlookDesktopOperationalRuntime({
    pool: authority.appPool, tenant_id: authority.tenantId, entitlement_roster: roster,
  });
  let fallbackCalls = 0;
  let internalCalls = 0;
  let lastInternalResult;
  const runtime = composeInternalUnsignedInstallationRuntime({
    ...operational,
    legacy_installation_service: Object.fromEntries(["register", "heartbeat", "retire"].map((operation) => [
      operation, (...args) => {
        fallbackCalls += 1;
        return operational.legacy_installation_service[operation](...args);
      },
    ])),
  }, {
    ...service,
    ...Object.fromEntries(["registerLegacy", "heartbeatLegacy", "retireLegacy"].map((operation) => [
      operation, async (...args) => {
        internalCalls += 1;
        try {
          lastInternalResult = await service[operation](...args);
          return lastInternalResult;
        } catch (error) {
          t.diagnostic(`${operation}: ${error.safe_error_code ?? error.name}: ${error.message}`);
          throw error;
        }
      },
    ])),
  });
  let authenticated = true;
  let permitted = true;
  let productReads = 0;
  const server = createApiServer({
    sessionAuth: {
      capabilities: {},
      resolvePermissionContextFromHeaders: async () => authenticated ? {
        ok: true, principal,
        context: { principal, object_acl: [], rules: permitted
          ? [{ id: "manage-installation", effect: "allow", action_prefix: "outlook:connection:" }] : [] },
        token_payload: { surface: "desktop" },
      } : { ok: false, status: 401 },
    },
    requestRuntimeAuthority: { run: async () => { productReads += 1; throw new Error("unrelated domain read"); } },
    outlookDesktopRuntime: runtime,
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const registration = await store.signRegistration(clientPrincipal, { ...buildIdentity, ...proof("register") });
  assert.deepEqual(Object.keys(registration).sort(), [
    "platform", "app_version", "source_sha", "device_public_key",
    "idempotency_key", "nonce", "issued_at", "expires_at", "signature",
  ].sort());
  authenticated = false;
  assert.equal((await request("/api/desktop/installations", registration)).status, 401);
  authenticated = true;
  permitted = false;
  assert.equal((await request("/api/desktop/installations", registration)).status, 403);
  permitted = true;
  for (const extra of [{ release_authorization_id: grant.authorization_id }, { release_trusted: true }]) {
    assert.equal((await request("/api/desktop/installations", { ...registration, ...extra })).status, 400);
  }
  assert.equal(internalCalls, 0);
  const registered = await request("/api/desktop/installations", registration);
  assert.equal(registered.status, 201, JSON.stringify({ response: registered.body, lastInternalResult, internalCalls, fallbackCalls }));
  const installed = registered.body.installation;
  assert.equal(installed.state_version, 1);
  assert.equal(installed.status, "active");
  assert.deepEqual(Object.keys(installed).sort(), [
    "installation_id", "status", "state_version", "lease_expires_at", "retired_at",
  ].sort());
  await store.markRegistered(clientPrincipal, installed);
  const restartedStore = createOutlookInstallationIdentityStore(storeOptions);
  const persisted = await restartedStore.getOrCreate(clientPrincipal);
  assert.equal(persisted.installation_id, installed.installation_id);
  assert.equal(persisted.device_public_key, candidate.device_public_key);
  assert.equal(persisted.device_key_fingerprint, candidate.device_key_fingerprint);
  await assert.rejects(restartedStore.signRegistration(clientPrincipal, {
    ...buildIdentity, ...proof("already-registered"),
  }), (error) => error.safe_error_code === "OUTLOOK_DESKTOP_INSTALLATION_ALREADY_REGISTERED");
  const path = `/api/desktop/installations/${installed.installation_id}`;
  const read = await request(path);
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.deepEqual(read.body.installation, installed);
  const heartbeat = await restartedStore.signHeartbeat(clientPrincipal, { expected_state_version: 1, ...proof("heartbeat") });
  assert.equal((await request(`${path}/heartbeat`, { ...heartbeat, release_trusted: true })).status, 400);
  assert.equal(internalCalls, 1);
  const beat = await request(`${path}/heartbeat`, heartbeat);
  assert.equal(beat.status, 200, JSON.stringify(beat.body));
  assert.equal(beat.body.installation.state_version, 2);
  await restartedStore.markRegistered(clientPrincipal, beat.body.installation);
  const attestationRequest = {
    adoption_id: "synthetic-legacy-http-adoption",
    request_sha256: digest("synthetic adoption request"),
    installation_id: installed.installation_id,
  };
  const attested = await request("/api/desktop/internal-updates/baseline-adoption-attestation", attestationRequest);
  assert.equal(attested.status, 200, JSON.stringify(attested.body));
  const attestation = verifyInternalUnsignedInstallationAttestation({
    envelope: attested.body.attestation,
    publicKey: signer.publicKey,
    expectedPublicKeySha256: signerPin,
    expectedKeyId: "synthetic-legacy-http-attestation",
    adoptionId: attestationRequest.adoption_id,
    requestSha256: attestationRequest.request_sha256,
    installationId: installed.installation_id,
  });
  assert.equal(attestation.installation.state_version, 2);
  assert.equal(attestation.installation.source_sha, buildIdentity.source_sha);
  assert.equal(attestation.installation.release_authority_sha256, grant.release_authority_sha256);
  assert.equal(attestation.installation.installed_receipt_sha256, grant.installed_receipt_sha256);
  await roleJsonCall(authority.controlPool, authority.tenantId, "revoke_internal_unsigned_release", {
    authorization_id: grant.authorization_id,
    expected_release_authority_sha256: grant.release_authority_sha256,
    revocation_id: "synthetic-legacy-http-revocation",
    reason: "release_withdrawn",
    owner_approval_sha256: digest("synthetic revocation owner approval"),
  });
  const denied = await request(`${path}/heartbeat`, await restartedStore.signHeartbeat(clientPrincipal, {
    expected_state_version: 2, ...proof("revoked-heartbeat"),
  }));
  assert.equal(denied.status, 409, JSON.stringify(denied.body));
  assert.deepEqual(denied.body.safe_error_codes, ["INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"]);
  assert.equal((await request(path)).body.installation.state_version, 2);
  const revokedAttestation = await request("/api/desktop/internal-updates/baseline-adoption-attestation", attestationRequest);
  assert.equal(revokedAttestation.status, 409, JSON.stringify(revokedAttestation.body));
  assert.deepEqual(revokedAttestation.body.safe_error_codes, ["INTERNAL_INSTALLATION_RETIRED_OR_REVOKED"]);
  assert.equal(fallbackCalls, 0);
  const retire = await restartedStore.signRetire(clientPrincipal, {
    expected_state_version: 2, retire_reason: "device_disconnect", ...proof("retire"),
  });
  assert.equal((await request(`${path}/retire`, { ...retire, authorization_id: grant.authorization_id })).status, 400);
  assert.equal(internalCalls, 3);
  const retired = await request(`${path}/retire`, retire);
  assert.equal(retired.status, 200, JSON.stringify(retired.body));
  assert.equal(retired.body.installation.status, "retired");
  assert.equal(retired.body.installation.state_version, 3);
  assert.equal(retired.body.installation.installation_id, installed.installation_id);
  assert.equal((await request(path)).body.installation.status, "retired");
  const finalIdentity = await createOutlookInstallationIdentityStore(storeOptions).getOrCreate(clientPrincipal);
  assert.equal(finalIdentity.installation_id, installed.installation_id);
  assert.equal(finalIdentity.device_key_fingerprint, candidate.device_key_fingerprint);
  const counts = (await authority.observerPool.query(
    `SELECT (SELECT count(*)::integer FROM lawos_email_dms.outlook_desktop_installation_audit_events WHERE tenant_id=$1) AS audit,
            (SELECT count(*)::integer FROM lawos_email_dms.outlook_desktop_installation_nonces WHERE tenant_id=$1) AS nonces`,
    [authority.tenantId],
  )).rows[0];
  assert.deepEqual(counts, { audit: 3, nonces: 3 });
  assert.equal(internalCalls, 4);
  assert.equal(fallbackCalls, 0);
  assert.equal(productReads, 0);
});
