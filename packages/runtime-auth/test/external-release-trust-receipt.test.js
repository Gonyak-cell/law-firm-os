import assert from "node:assert/strict";
import { sign } from "node:crypto";
import test from "node:test";

import * as packageTrust from "@law-firm-os/runtime-auth/external-release-trust";
import {
  now,
  syntheticTrustFixture,
  writeBytes,
} from "./external-release-trust-fixture.js";

test("synthetic policy is accepted only by the explicit direct-unit API", (t) => {
  const fixture = syntheticTrustFixture(t);
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  let registryTrust;
  try {
    registryTrust = packageTrust.verifyProductionTrustedRegistry({
      testOnlyPolicy: fixture.testOnlyPolicy,
      now,
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
  assert.equal(registryTrust.registrySerial, 7);
  assert.deepEqual(Object.keys(registryTrust).sort(), [
    "anchorPath",
    "anchorSha256",
    "bytes",
    "policySchemaVersion",
    "registry",
    "registrySerial",
    "registrySignaturePath",
    "registrySignatureSha256",
    "registryTrust",
    "sha256",
    "target",
  ]);

  const receipt = {
    key_id: "unit-leaf-001",
    issued_at: "2026-08-16T12:00:00Z",
    expires_at: "2026-08-18T00:00:00Z",
    ...fixture.scope,
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8");
  const receiptRef = writeBytes(fixture.root, "receipts/unit.json", receiptBytes);
  const signatureBytes = sign(null, receiptBytes, fixture.leafKeyPair.privateKey);
  const signatureRef = writeBytes(fixture.root, "receipts/unit.json.sig", signatureBytes);
  const expectedScope = {
    registry: registryTrust.registryTrust,
    expectedReceiptType: fixture.scope.receipt_type,
    expectedReceiptSource: fixture.scope.receipt_source,
    expectedPilotId: fixture.scope.pilot_id,
    expectedLawosTenantId: fixture.scope.lawos_tenant_id,
    expectedEntraTenantId: fixture.scope.entra_tenant_id,
    expectedSourceSha: fixture.scope.source_sha,
    expectedSourceTree: fixture.scope.source_tree,
    expectedVersion: fixture.scope.version,
    expectedRole: fixture.scope.role,
    expectedOperation: fixture.scope.operation,
    expectedArtifactSha256: fixture.scope.artifact_sha256,
    expectedBindingSha256: fixture.scope.binding_sha256,
    now,
  };
  const bytesVerification = packageTrust.verifyDetachedReceiptBytes({
    ...expectedScope,
    receiptBytes,
    signatureBytes,
  });
  assert.equal(bytesVerification.valid, true);
  assert.equal(bytesVerification.receipt_sha256, receiptRef.sha256);
  assert.notStrictEqual(bytesVerification.receipt_bytes, receiptBytes);
  assert.deepEqual(bytesVerification.receipt_bytes, receiptBytes);
  assert.deepEqual(Object.keys(bytesVerification).sort(), [
    "expires_at",
    "issued_at",
    "key_id",
    "receipt",
    "receipt_bytes",
    "receipt_sha256",
    "signature_sha256",
    "valid",
  ]);

  const verification = packageTrust.verifyDetachedReceipt({
    ...expectedScope,
    rootDir: fixture.root,
    receiptRef: { ...receiptRef, signature_ref: signatureRef },
  });
  assert.equal(verification.valid, true);
  assert.equal(verification.receipt_sha256, receiptRef.sha256);
  assert.equal(verification.receipt_path, receiptRef.path);
  assert.equal(verification.signature_path, signatureRef.path);

  assert.throws(
    () => packageTrust.verifyDetachedReceiptBytes({
      ...expectedScope,
      receiptBytes: Buffer.concat([receiptBytes, Buffer.from(" ")]),
      signatureBytes,
    }),
    (error) => error?.code === "TRUST_SIGNATURE_INVALID",
  );
  const mutatedSignatureBytes = Buffer.from(signatureBytes);
  mutatedSignatureBytes[0] ^= 1;
  assert.throws(
    () => packageTrust.verifyDetachedReceiptBytes({
      ...expectedScope,
      receiptBytes,
      signatureBytes: mutatedSignatureBytes,
    }),
    (error) => error?.code === "TRUST_SIGNATURE_INVALID",
  );
  assert.throws(
    () => packageTrust.verifyDetachedReceiptBytes({
      ...expectedScope,
      registry: Object.freeze({ registry: registryTrust.registryTrust.registry }),
      receiptBytes,
      signatureBytes,
    }),
    (error) => error?.code === "TRUST_RECEIPT_INPUT_INVALID",
  );
  const callerPinnedRegistry = packageTrust.verifyTrustedRegistry({
    rootDir: fixture.root,
    registryPath: fixture.testOnlyPolicy.registry_installation_path,
    registrySha256: fixture.testOnlyPolicy.registry_sha256,
    now,
  });
  assert.throws(
    () => packageTrust.verifyDetachedReceiptBytes({
      ...expectedScope,
      registry: callerPinnedRegistry,
      receiptBytes,
      signatureBytes,
    }),
    (error) => error?.code === "TRUST_RECEIPT_INPUT_INVALID",
  );
  for (const forbiddenInput of [
    { registryBytes: Buffer.from("{}") },
    { registrySha256: fixture.testOnlyPolicy.registry_sha256 },
    { rootDir: fixture.root },
  ]) {
    assert.throws(
      () => packageTrust.verifyDetachedReceiptBytes({
        ...expectedScope,
        receiptBytes,
        signatureBytes,
        ...forbiddenInput,
      }),
      (error) => error?.code === "TRUST_RECEIPT_INPUT_INVALID",
    );
  }

  process.env.NODE_ENV = "production";
  try {
    assert.throws(
      () => packageTrust.verifyProductionTrustedRegistry({ testOnlyPolicy: fixture.testOnlyPolicy, now }),
      (error) => error?.code === "TEST_TRUST_ROOT_FORBIDDEN",
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
