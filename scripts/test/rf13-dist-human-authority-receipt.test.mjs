import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  chmodSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalizeJson } from "../lib/runtime-safety-approval-contract.mjs";
import {
  HUMAN_AUTHORITY_RECEIPT_SCHEMA,
  assertRf13HumanAuthorityCapability,
  buildAllBlockedTemplate,
  readRf13HumanAuthorityReceipt,
} from "../lib/rf13-dist-authority-contract.mjs";

const SOURCE_SHA = "34d16954f54a188f93b087e3bc4ad1bce99c049f";
const SOURCE_TREE = "54d16954f54a188f93b087e3bc4ad1bce99c049f";
const ARTIFACT_SHA = "a".repeat(64);
let sequence = 0;

function tempRoot(testContext) {
  const root = mkdtempSync(join(tmpdir(), "rf13-human-authority-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function testKey() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeySpkiPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const fingerprintSha256 = createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
  return {
    privateKey,
    trustKey: {
      key_id: "TEST_ONLY_KEY_001",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKeySpkiPem,
      fingerprint_sha256: fingerprintSha256,
      owner: "TEST_ONLY_OWNER_001",
      actions: ["production_go_live", "canary_acceptance"],
      release_scopes: ["macos_primary", "macos_canary", "all_platforms"],
    },
  };
}

function basePayload(overrides = {}) {
  sequence += 1;
  return {
    schema_version: HUMAN_AUTHORITY_RECEIPT_SCHEMA,
    receipt_id: `TEST_ONLY_RECEIPT_${String(sequence).padStart(3, "0")}`,
    release_id: "TEST_ONLY_RELEASE_001",
    environment: "production",
    action: "production_go_live",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: [ARTIFACT_SHA],
    release_scope: "macos_primary",
    canary_user_count: null,
    issued_at: "2026-07-30T00:00:00.000Z",
    expires_at: "2026-08-02T00:00:00.000Z",
    nonce: `TEST_ONLY_NONCE_${String(sequence).padStart(3, "0")}`,
    template: false,
    ...overrides,
  };
}

function writeBundle(testContext, { payload = basePayload(), signaturePath = "evidence/authority.sig", rawSignature, signatureOverrides = {} } = {}) {
  const root = tempRoot(testContext);
  const evidenceRoot = join(root, "evidence");
  mkdirSync(evidenceRoot, { recursive: true });
  const { privateKey, trustKey } = testKey();
  const signatureBytes = rawSignature ?? sign(null, Buffer.from(canonicalizeJson(payload)), privateKey);
  const receipt = {
    ...payload,
    signature: {
      algorithm: "Ed25519",
      key_id: trustKey.key_id,
      fingerprint_sha256: trustKey.fingerprint_sha256,
      signature_sha256: createHash("sha256").update(signatureBytes).digest("hex"),
      path: signaturePath,
      ...signatureOverrides,
    },
  };
  const receiptPath = join(evidenceRoot, "authority.json");
  const detachedPath = join(root, signaturePath);
  mkdirSync(join(detachedPath, ".."), { recursive: true });
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  writeFileSync(detachedPath, signatureBytes);
  chmodSync(receiptPath, 0o600);
  chmodSync(detachedPath, 0o600);
  return {
    root,
    receiptPath,
    receipt,
    trustKey,
    privateKey,
    detachedPath,
  };
}

function readOptions(bundle, overrides = {}) {
  return {
    receiptPath: bundle.receiptPath,
    repoRoot: bundle.root,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedReleaseId: "TEST_ONLY_RELEASE_001",
    expectedEnvironment: "production",
    expectedArtifactSha256: [ARTIFACT_SHA],
    expectedAction: "production_go_live",
    expectedReleaseScope: "macos_primary",
    expectedCanaryUserCount: null,
    now: "2026-08-01T12:00:00.000Z",
    testOnly: true,
    testOnlyTrustedKeys: [bundle.trustKey],
    ...overrides,
  };
}

function rewriteReceipt(bundle, rewrite) {
  const original = readFileSync(bundle.receiptPath, "utf8");
  writeFileSync(bundle.receiptPath, rewrite(original));
  chmodSync(bundle.receiptPath, 0o600);
}

test("signed canonical receipt verifies with an explicit TEST_ONLY key and mints only a private capability", (testContext) => {
  const bundle = writeBundle(testContext, {});
  const result = readRf13HumanAuthorityReceipt(readOptions(bundle));
  assert.equal(result.status, "PASS");
  assert.equal(result.receipt.signature.fingerprint_sha256, bundle.trustKey.fingerprint_sha256);
  const bothIds = readRf13HumanAuthorityReceipt(readOptions(bundle, { expectedReceiptId: bundle.receipt.receipt_id }));
  assert.equal(bothIds.status, "PASS");
  assert.throws(
    () => readRf13HumanAuthorityReceipt(readOptions(bundle, { expectedReceiptId: "TEST_ONLY_RECEIPT_WRONG" })),
    (error) => error.code === "HUMAN_AUTHORITY_RECEIPT_ID_MISMATCH",
  );
  assert.equal(result.capability.test_only, true);
  assert.match(result.capability.receipt_sha256, /^[0-9a-f]{64}$/u);
  assert.match(result.capability.signed_payload_sha256, /^[0-9a-f]{64}$/u);
  assert.equal("public_key_spki_pem" in result.capability, false);
  assert.doesNotMatch(JSON.stringify(result.capability), /PRIVATE KEY/u);
  const spread = { ...result.capability };
  const serialized = JSON.parse(JSON.stringify(result.capability));
  for (const forged of [spread, serialized, structuredClone(result.capability)]) {
    assert.throws(
      () => assertRf13HumanAuthorityCapability(forged, {
        releaseId: "TEST_ONLY_RELEASE_001",
        environment: "production",
        action: "production_go_live",
        sourceSha: SOURCE_SHA,
        sourceTree: SOURCE_TREE,
        artifactSha256: [ARTIFACT_SHA],
        releaseScope: "macos_primary",
        canaryUserCount: null,
        now: "2026-08-01T12:00:00.000Z",
      }),
      (error) => error.code === "HUMAN_AUTHORITY_CAPABILITY_INVALID",
    );
  }
  assert.throws(
    () => assertRf13HumanAuthorityCapability(result.capability, {
      action: "production_go_live",
      releaseId: "TEST_ONLY_RELEASE_001",
      environment: "production",
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      artifactSha256: [ARTIFACT_SHA],
      releaseScope: "macos_primary",
      canaryUserCount: null,
      now: "2026-08-01T12:00:00.000Z",
    }),
    (error) => error.code === "HUMAN_AUTHORITY_TEST_CAPABILITY_FORBIDDEN",
  );
});

test("testOnly is a strict boolean and cannot be enabled through truthy coercion", (testContext) => {
  const bundle = writeBundle(testContext, {});
  for (const invalidTestOnly of [1, "true", {}, null]) {
    assert.throws(
      () => readRf13HumanAuthorityReceipt(readOptions(bundle, { testOnly: invalidTestOnly })),
      (error) => error.code === "HUMAN_AUTHORITY_TEST_MODE_INVALID",
    );
  }
});

test("signed receipts bind release, environment, source, tree, action, scope, artifacts, and path", (testContext) => {
  const payloadMutations = [
    { name: "release id", payload: { release_id: "TEST_ONLY_RELEASE_002" }, code: "HUMAN_AUTHORITY_BINDING_MISMATCH" },
    { name: "environment", payload: { environment: "canary" }, code: "HUMAN_AUTHORITY_PRODUCTION_SCOPE_INVALID" },
    { name: "source sha", payload: { source_sha: "64d16954f54a188f93b087e3bc4ad1bce99c049f" }, code: "HUMAN_AUTHORITY_BINDING_MISMATCH" },
    { name: "source tree", payload: { source_tree: "64d16954f54a188f93b087e3bc4ad1bce99c049f" }, code: "HUMAN_AUTHORITY_BINDING_MISMATCH" },
    { name: "action", payload: { action: "canary_acceptance" }, code: "HUMAN_AUTHORITY_CANARY_SCOPE_INVALID" },
    { name: "scope", payload: { release_scope: "all_platforms" }, code: "HUMAN_AUTHORITY_BINDING_MISMATCH" },
    { name: "artifact hash", payload: { artifact_sha256: ["b".repeat(64)] }, code: "HUMAN_AUTHORITY_BINDING_MISMATCH" },
    { name: "signature path", signatureOverrides: { path: "evidence/other.sig" }, code: "HUMAN_AUTHORITY_PATH_INVALID" },
  ];
  for (const mutation of payloadMutations) {
    const bundle = writeBundle(testContext, {
      payload: basePayload(mutation.payload),
      signatureOverrides: mutation.signatureOverrides,
    });
    assert.throws(
      () => readRf13HumanAuthorityReceipt(readOptions(bundle)),
      (error) => error.code === mutation.code,
      mutation.name,
    );
  }

  const expectedBindingMutations = [
    { name: "expected release id", expectedReleaseId: "TEST_ONLY_RELEASE_002" },
    { name: "expected source sha", expectedSourceSha: "64d16954f54a188f93b087e3bc4ad1bce99c049f" },
    { name: "expected source tree", expectedSourceTree: "64d16954f54a188f93b087e3bc4ad1bce99c049f" },
    { name: "expected action and environment", expectedEnvironment: "canary", expectedAction: "canary_acceptance", expectedReleaseScope: "macos_canary", expectedCanaryUserCount: 1 },
    { name: "expected artifact hash", expectedArtifactSha256: ["b".repeat(64)] },
  ];
  for (const mutation of expectedBindingMutations) {
    const bundle = writeBundle(testContext, {});
    assert.throws(
      () => readRf13HumanAuthorityReceipt(readOptions(bundle, mutation)),
      (error) => error.code === "HUMAN_AUTHORITY_BINDING_MISMATCH",
      mutation.name,
    );
  }
});

test("signed payload tampering rejects nonce, time, and coherent environment/action/scope changes", (testContext) => {
  const nonceTamper = writeBundle(testContext, {});
  rewriteReceipt(nonceTamper, (raw) => raw.replace(/("nonce"\s*:\s*")[^"]+/u, "$1TEST_ONLY_NONCE_TAMPERED"));
  assert.throws(
    () => readRf13HumanAuthorityReceipt(readOptions(nonceTamper)),
    (error) => error.code === "HUMAN_AUTHORITY_SIGNATURE_INVALID",
  );

  const timeTamper = writeBundle(testContext, {});
  rewriteReceipt(timeTamper, (raw) => raw.replace(/("issued_at"\s*:\s*")[^"]+/u, "$12026-07-31T00:00:00.000Z"));
  assert.throws(
    () => readRf13HumanAuthorityReceipt(readOptions(timeTamper)),
    (error) => error.code === "HUMAN_AUTHORITY_SIGNATURE_INVALID",
  );

  const scopeTamper = writeBundle(testContext, {});
  rewriteReceipt(scopeTamper, (raw) => raw
    .replace(/("environment"\s*:\s*")production/u, "$1canary")
    .replace(/("action"\s*:\s*")production_go_live/u, "$1canary_acceptance")
    .replace(/("release_scope"\s*:\s*")macos_primary/u, "$1macos_canary")
    .replace(/("canary_user_count"\s*:\s*)null/u, "$11"));
  assert.throws(
    () => readRf13HumanAuthorityReceipt(readOptions(scopeTamper, {
      expectedEnvironment: "canary",
      expectedAction: "canary_acceptance",
      expectedReleaseScope: "macos_canary",
      expectedCanaryUserCount: 1,
    })),
    (error) => error.code === "HUMAN_AUTHORITY_SIGNATURE_INVALID",
  );
});

test("duplicate JSON object keys are rejected before last-write-wins parsing", (testContext) => {
  const topLevel = writeBundle(testContext, {});
  rewriteReceipt(topLevel, (raw) => raw.replace(
    `"schema_version": "${HUMAN_AUTHORITY_RECEIPT_SCHEMA}"`,
    `"schema_version": "TEST_ONLY_FIRST_SCHEMA",\n  "schema_version": "${HUMAN_AUTHORITY_RECEIPT_SCHEMA}"`,
  ));
  assert.throws(
    () => readRf13HumanAuthorityReceipt(readOptions(topLevel)),
    (error) => error.code === "HUMAN_AUTHORITY_JSON_DUPLICATE_KEY",
  );

  const nested = writeBundle(testContext, {});
  rewriteReceipt(nested, (raw) => raw.replace(
    '"algorithm": "Ed25519"',
    '"algorithm": "RSA",\n    "algorithm": "Ed25519"',
  ));
  assert.throws(
    () => readRf13HumanAuthorityReceipt(readOptions(nested)),
    (error) => error.code === "HUMAN_AUTHORITY_JSON_DUPLICATE_KEY",
  );
});

test("production verification remains BLOCKED_BY_AUTHORITY with no approved production key or receipt", (testContext) => {
  const missing = readRf13HumanAuthorityReceipt();
  assert.deepEqual(missing, { receipt: null, capability: null, status: "BLOCKED_BY_AUTHORITY", reason_code: "AUTHORITY_RECEIPT_MISSING" });

  const wallNow = Date.now();
  const bundle = writeBundle(testContext, {
    payload: basePayload({
      issued_at: new Date(wallNow - 60_000).toISOString(),
      expires_at: new Date(wallNow + 3_600_000).toISOString(),
    }),
  });
  const productionOptions = readOptions(bundle, {
    testOnly: false,
    testOnlyTrustedKeys: undefined,
  });
  assert.throws(() => readRf13HumanAuthorityReceipt({ ...productionOptions, testOnly: false }), (error) => error.code === "HUMAN_AUTHORITY_CLOCK_OVERRIDE");
  delete productionOptions.now;
  assert.throws(() => readRf13HumanAuthorityReceipt(productionOptions), (error) => error.code === "HUMAN_AUTHORITY_KEY_NOT_APPROVED");
});

test("scope and artifact hash alterations are rejected against expected manifest bindings", (testContext) => {
  const scopeBundle = writeBundle(testContext, { payload: basePayload({ release_scope: "all_platforms" }) });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(scopeBundle)), (error) => error.code === "HUMAN_AUTHORITY_BINDING_MISMATCH");

  const hashBundle = writeBundle(testContext, { payload: basePayload({ artifact_sha256: ["b".repeat(64)] }) });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(hashBundle)), (error) => error.code === "HUMAN_AUTHORITY_BINDING_MISMATCH");
});

test("expired and not-yet-valid receipts are rejected even with valid signatures", (testContext) => {
  const expired = writeBundle(testContext, { payload: basePayload({ expires_at: "2026-08-01T01:00:00.000Z" }) });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(expired)), (error) => error.code === "HUMAN_AUTHORITY_EXPIRED");

  const future = writeBundle(testContext, { payload: basePayload({ issued_at: "2026-08-02T00:00:00.000Z", expires_at: "2026-08-03T00:00:00.000Z" }) });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(future)), (error) => error.code === "HUMAN_AUTHORITY_NOT_YET_VALID");
});

test("altered signer key, signature bytes, and detached signature digest are rejected", (testContext) => {
  const keyBundle = writeBundle(testContext, { signatureOverrides: { key_id: "TEST_ONLY_KEY_002" } });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(keyBundle)), (error) => error.code === "HUMAN_AUTHORITY_KEY_NOT_APPROVED");

  const fingerprintBundle = writeBundle(testContext, { signatureOverrides: { fingerprint_sha256: "f".repeat(64) } });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(fingerprintBundle)), (error) => error.code === "HUMAN_AUTHORITY_FINGERPRINT_MISMATCH");

  const alteredSignature = writeBundle(testContext, { rawSignature: Buffer.alloc(64, 0x7f) });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(alteredSignature)), (error) => error.code === "HUMAN_AUTHORITY_SIGNATURE_INVALID");

  const digestMismatch = writeBundle(testContext, { signatureOverrides: { signature_sha256: "f".repeat(64) } });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(digestMismatch)), (error) => error.code === "HUMAN_AUTHORITY_SIGNATURE_HASH_MISMATCH");
});

test("repeated reads are idempotent while altered signed bindings remain rejected", (testContext) => {
  const bundle = writeBundle(testContext, {});
  const options = readOptions(bundle);
  const first = readRf13HumanAuthorityReceipt(options);
  assert.equal(first.status, "PASS");
  const second = readRf13HumanAuthorityReceipt(options);
  assert.equal(second.status, "PASS");
  assert.deepEqual(second.capability, first.capability);

  const altered = writeBundle(testContext, {
    payload: basePayload({ artifact_sha256: ["b".repeat(64)] }),
  });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(altered)), (error) => error.code === "HUMAN_AUTHORITY_BINDING_MISMATCH");
});

test("signature descriptors cannot escape the root or traverse symlinks", (testContext) => {
  const unsafe = writeBundle(testContext, { signaturePath: "../outside.sig" });
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(unsafe)), (error) => error.code === "HUMAN_AUTHORITY_SIGNATURE_PATH_INVALID");

  const symlinked = writeBundle(testContext, {});
  const outside = join(symlinked.root, "outside.sig");
  writeFileSync(outside, readFileSync(symlinked.detachedPath));
  unlinkSync(symlinked.detachedPath);
  symlinkSync(outside, symlinked.detachedPath, "file");
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(symlinked)), (error) => error.code === "HUMAN_AUTHORITY_SYMLINK");
});

test("receipt and detached signature files require mode 0600 and current effective ownership", (testContext) => {
  const receiptMode = writeBundle(testContext, {});
  chmodSync(receiptMode.receiptPath, 0o640);
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(receiptMode)), (error) => error.code === "HUMAN_AUTHORITY_FILE_MODE_INVALID");

  const signatureMode = writeBundle(testContext, {});
  chmodSync(signatureMode.detachedPath, 0o640);
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions(signatureMode)), (error) => error.code === "HUMAN_AUTHORITY_FILE_MODE_INVALID");
});

test("unsigned status inventory remains structural evidence and cannot mint a capability", (testContext) => {
  const root = tempRoot(testContext);
  const path = join(root, "checkpoint.json");
  writeFileSync(path, JSON.stringify(buildAllBlockedTemplate(SOURCE_SHA)));
  chmodSync(path, 0o600);
  assert.throws(() => readRf13HumanAuthorityReceipt(readOptions({
    root,
    receiptPath: path,
    trustKey: null,
    repoRoot: root,
    testOnlyTrustedKeys: [],
  })), (error) => error.code === "HUMAN_AUTHORITY_MISSING_KEY");
});
