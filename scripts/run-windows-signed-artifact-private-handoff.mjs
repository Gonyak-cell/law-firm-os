#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createWindowsSignedArtifactAwsCliAdapter,
  createWindowsSignedArtifactEncryptedBridge,
  createWindowsSignedArtifactPrivateHandoffLocatorEnvelope,
  decryptWindowsSignedArtifactEncryptedBridge,
  executeWindowsSignedArtifactPrivateHandoff,
  parseWindowsSignedArtifactHandoffBindings,
  stageWindowsSignedArtifactHandoff,
  verifyWindowsSignedArtifactEncryptedBridge,
} from "./lib/windows-signed-artifact-private-handoff.mjs";

function option(name, { required = true } = {}) {
  const indexes = process.argv.flatMap((value, index) => (value === name ? [index] : []));
  assert.ok(indexes.length <= 1, `${name} cannot be repeated`);
  const value = indexes.length === 1 ? process.argv[indexes[0] + 1] : undefined;
  if (required) assert.ok(value && !value.startsWith("--"), `${name} is required`);
  return value;
}

function exactOperation() {
  const value = option("--operation");
  assert.ok(["stage", "encrypt", "verify-encrypted", "decrypt-upload", "encrypt-locator"].includes(value), "unsupported handoff operation");
  return value;
}

function identity() {
  return {
    sourceSha: option("--source-sha"),
    sourceTree: option("--source-tree"),
    candidateRole: option("--candidate-role"),
  };
}

function artifactPaths(root) {
  return {
    installer: option("--installer", { required: false }) ?? path.join(root, "signed-installer.exe"),
    build_manifest: option("--build-manifest", { required: false }) ?? path.join(root, "windows-build-manifest.json"),
    native_package_qa: option("--native-package-qa", { required: false }) ?? path.join(root, "formal-windows-package-qa.json"),
    installed_tree_sbom: option("--installed-tree-sbom", { required: false }) ?? path.join(root, "windows-installed-tree-sbom.cdx.json"),
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const operation = exactOperation();
  const exactIdentity = identity();
  if (operation === "encrypt-locator") {
    const result = createWindowsSignedArtifactPrivateHandoffLocatorEnvelope({
      locatorPath: option("--receipt-locator"),
      outputDir: option("--output-dir"),
      ...exactIdentity,
      version: option("--version"),
      producerRepository: option("--producer-repository"),
      producerWorkflowRef: option("--producer-workflow-ref"),
      producerJob: option("--producer-job"),
      producerRunId: option("--producer-run-id"),
      producerRunAttempt: option("--producer-run-attempt"),
      privateReceiptSha256: option("--private-receipt-sha256"),
      wrappingKeyArn: option("--wrapping-key-arn"),
      wrappingPublicKeySpkiBase64: option("--wrapping-public-key-spki-b64"),
      wrappingPublicKeySha256: option("--wrapping-public-key-sha256"),
    });
    process.stdout.write(`${JSON.stringify({
      schema_version: result.envelope.schema_version,
      envelope_sha256: result.envelope_sha256,
      private_receipt_locator_sha256: result.private_receipt_locator_sha256,
      private_receipt_sha256: result.envelope.private_receipt_sha256,
      plaintext_locator_uploaded: false,
    }, null, 2)}\n`);
    return;
  }
  if (operation === "stage") {
    const sourceRoot = option("--source-root", { required: false }) ?? process.cwd();
    const result = stageWindowsSignedArtifactHandoff({
      paths: artifactPaths(sourceRoot),
      stagingDir: option("--output-dir"),
      ...exactIdentity,
    });
    process.stdout.write(`${JSON.stringify({ ...result, private_upload: false }, null, 2)}\n`);
    return;
  }
  if (operation === "encrypt") {
    const inputDir = option("--input-dir");
    const result = createWindowsSignedArtifactEncryptedBridge({
      paths: artifactPaths(inputDir),
      outputDir: option("--output-dir"),
      ...exactIdentity,
      wrappingKeyArn: option("--wrapping-key-arn"),
      wrappingPublicKeySpkiBase64: option("--wrapping-public-key-spki-b64"),
      wrappingPublicKeySha256: option("--wrapping-public-key-sha256"),
    });
    process.stdout.write(`${JSON.stringify({
      schema_version: result.envelope.schema_version,
      envelope_sha256: result.envelope_sha256,
      artifact_count: Object.keys(result.envelope.artifacts).length,
      plaintext_uploaded_to_github: false,
    }, null, 2)}\n`);
    return;
  }
  const encryptedDir = path.resolve(option("--encrypted-dir"));
  const wrappingKeyArn = option("--wrapping-key-arn");
  const bridge = {
    encryptedDir,
    ...exactIdentity,
    wrappingKeyArn,
    wrappingPublicKeySha256: option("--wrapping-public-key-sha256"),
    expectedEnvelopeSha256: option("--expected-envelope-sha256"),
  };
  if (operation === "verify-encrypted") {
    const envelope = verifyWindowsSignedArtifactEncryptedBridge(bridge);
    process.stdout.write(`${JSON.stringify({
      schema_version: envelope.schema_version,
      ciphertext_verified: true,
      artifact_count: Object.keys(envelope.artifacts).length,
      plaintext_materialized: false,
    }, null, 2)}\n`);
    return;
  }
  const decryptedDir = path.resolve(option("--decrypted-dir"));
  const receiptPath = path.resolve(option("--receipt"));
  const receiptLocatorPath = path.resolve(option("--receipt-locator"));
  const bindings = parseWindowsSignedArtifactHandoffBindings(
    readFileSync(path.resolve(option("--handoff-bindings")), "utf8"),
  );
  assert.equal(wrappingKeyArn, option("--expected-wrapping-key-arn"), "wrapping KMS key environment binding differs");
  const aws = createWindowsSignedArtifactAwsCliAdapter({ region: bindings.region });
  try {
    const decrypted = await decryptWindowsSignedArtifactEncryptedBridge({
      ...bridge,
      outputDir: decryptedDir,
      inspectWrappingKey: (input) => aws.inspectWrappingKey(input),
      decryptDataKey: (input) => aws.decryptDataKey(input),
    });
    const handoff = await executeWindowsSignedArtifactPrivateHandoff({
      stagingDir: decrypted.decrypted_dir,
      receiptPath,
      ...exactIdentity,
      bindings,
      aws,
    });
    writeFileSync(receiptLocatorPath, `${JSON.stringify(handoff.receipt_locator, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    process.stdout.write(`${JSON.stringify({
      schema_version: handoff.receipt.schema_version,
      verdict: handoff.receipt.verdict,
      receipt_sha256: handoff.receipt_sha256,
      receipt_bytes: handoff.receipt_bytes,
      version: handoff.receipt.version,
      receipt_locator_sha256: sha256(Buffer.from(JSON.stringify(handoff.receipt_locator), "utf8")),
      artifact_count: Object.keys(handoff.receipt.artifacts).length,
      private_immutable_handoff: true,
      public_distribution: false,
      production_go_live: false,
    }, null, 2)}\n`);
  } finally {
    rmSync(encryptedDir, { recursive: true, force: true });
    rmSync(decryptedDir, { recursive: true, force: true });
    for (const name of [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_SESSION_TOKEN",
      "AWS_SECURITY_TOKEN",
      "AWS_REGION",
      "AWS_DEFAULT_REGION",
      "AWS_WEB_IDENTITY_TOKEN_FILE",
      "AWS_ROLE_ARN",
      "AWS_PROFILE",
      "AWS_DEFAULT_PROFILE",
    ]) delete process.env[name];
  }
}

try {
  await main();
} catch {
  process.stderr.write("WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_BLOCKED\n");
  process.exitCode = 1;
}
