#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  readTrustedFileSnapshot,
  resolveTrustedRoot,
} from "./lib/external-release-trust.mjs";
import {
  createWindowsFormalUpdateHandoffAwsCliAdapter,
  createWindowsFormalUpdateEncryptedBridge,
  createWindowsFormalUpdateHandoffFailureReceipt,
  createWindowsFormalUpdateHandoffPreflightReceipt,
  decryptWindowsFormalUpdateEncryptedBridge,
  finalizeWindowsFormalUpdateConsumerReceipt,
  finalizeWindowsFormalUpdateHandoffReceipt,
  finalizeWindowsFormalUpdateLocatorSourceReceipt,
  materializeWindowsFormalUpdatePrivateHandoff,
  decryptWindowsFormalUpdatePrivateLocatorArtifact,
  parseWindowsFormalUpdatePrivateLocatorArtifactRefJson,
  purgeWindowsFormalUpdatePrivateRoots,
  reconcileWindowsFormalUpdateHandoffProviderCallState,
  readWindowsFormalUpdateHandoffProviderCallState,
  verifyWindowsFormalUpdatePrivateLocatorSource,
  writeWindowsFormalUpdateLocatorSourceReceipt,
  writeWindowsFormalUpdateHandoffReceipt,
} from "./lib/windows-formal-update-handoff-consumer.mjs";

const LOCATOR_REF_ENVIRONMENT = "MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_JSON";
const MODES = new Set([
  "--cleanup", "--cleanup-source", "--decrypt", "--encrypt", "--finalize", "--materialize",
  "--purge", "--validate", "--validate-ref", "--verify-source",
]);

function fail(code, message = code) {
  throw Object.assign(new Error(message), { code });
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length < 1 || value.includes("\0")) {
    fail("WINDOWS_HANDOFF_INPUT_REQUIRED", `${name} is required`);
  }
  return value;
}

function directChild(root, candidate, label) {
  const target = path.resolve(candidate);
  if (path.dirname(target) !== root) {
    fail("WINDOWS_HANDOFF_PATH_INVALID", `${label} must be a dedicated child of RUNNER_TEMP`);
  }
  return target;
}

function expectedBridgeFiles() {
  return ["envelope.json", ...Array.from({ length: 19 }, (_, index) => `payload-${String(index + 1).padStart(3, "0")}.enc`)];
}

function assertExactBridgeFileSet(root) {
  const actual = readdirSync(resolveTrustedRoot(root)).sort();
  const expected = expectedBridgeFiles().sort();
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    fail("WINDOWS_HANDOFF_BRIDGE_FILE_SET_INVALID", "encrypted bridge must contain exactly the frozen envelope and 19 ciphertext files");
  }
}

function assertExactAggregateArtifactFileSet(root) {
  const actual = readdirSync(resolveTrustedRoot(root)).sort();
  const expected = [
    "windows-formal-update-private-locator-envelope.json",
    "windows-formal-update-private-locator.enc",
  ].sort();
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    fail("WINDOWS_HANDOFF_LOCATOR_ARTIFACT_FILE_SET_INVALID", "aggregate locator artifact must contain exactly the public envelope and ciphertext files");
  }
}

function errorCode(error) {
  return /^[A-Z0-9._-]{1,96}$/u.test(error?.code ?? "")
    ? error.code
    : "WINDOWS_HANDOFF_CONSUMER_FAILED";
}

function credentialsPresent() {
  return [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "AWS_SECURITY_TOKEN",
    "AWS_REGION",
    "AWS_DEFAULT_REGION",
  ].some((name) => typeof process.env[name] === "string" && process.env[name].length > 0);
}

function oidcCredentialsPresent() {
  return ["ACTIONS_ID_TOKEN_REQUEST_TOKEN", "ACTIONS_ID_TOKEN_REQUEST_URL"]
    .some((name) => typeof process.env[name] === "string" && process.env[name].length > 0);
}

function locatorArtifactRefInputs() {
  const rawJson = requiredEnvironment(LOCATOR_REF_ENVIRONMENT);
  try {
    return parseWindowsFormalUpdatePrivateLocatorArtifactRefJson(rawJson, {
      expectedSourceSha: requiredEnvironment("MATTER_WINDOWS_UPDATE_SOURCE_SHA"),
      expectedSourceTree: requiredEnvironment("MATTER_WINDOWS_UPDATE_SOURCE_TREE"),
    });
  } finally {
    process.env[LOCATOR_REF_ENVIRONMENT] = "";
  }
}

function privateLocatorSha256(ref) {
  return ref.private_locator_sha256;
}

function locatorArtifactRoot(runnerTemp) {
  return directChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_LOCATOR_ARTIFACT_ROOT"),
    "aggregate locator artifact root",
  );
}

function locatorSourceRoot(runnerTemp) {
  return directChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_LOCATOR_SOURCE_ROOT"),
    "aggregate locator source root",
  );
}

function locatorSourceReceiptPath(runnerTemp) {
  return directChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_LOCATOR_SOURCE_RECEIPT_PATH"),
    "aggregate locator source receipt path",
  );
}

function providerCallStatePath(runnerTemp) {
  return directChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_PROVIDER_CALL_STATE_PATH"),
    "provider-call state path",
  );
}

function expandedLocatorInputs(runnerTemp) {
  const expandedPath = directChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_EXPANDED_LOCATOR_PATH"),
    "expanded private locator path",
  );
  const bytes = readTrustedFileSnapshot(
    path.dirname(expandedPath),
    path.basename(expandedPath),
  ).bytes;
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("WINDOWS_HANDOFF_EXPANDED_LOCATOR_INVALID", "expanded private locator is invalid");
  }
  const receiptPath = directChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_HANDOFF_RECEIPT_PATH"),
    "handoff receipt path",
  );
  const receipt = JSON.parse(readTrustedFileSnapshot(
    path.dirname(receiptPath),
    path.basename(receiptPath),
  ).bytes.toString("utf8"));
  if (!Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8").equals(bytes)
    || value?.schema_version !== "law-firm-os.windows-formal-update-expanded-private-locator.v1"
    || value.locator_sha256 !== requiredEnvironment("MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_SHA256")
    || receipt.expanded_locator_sha256 !== createHash("sha256").update(bytes).digest("hex")
    || !Array.isArray(value.objects) || value.objects.length !== 19) {
    fail("WINDOWS_HANDOFF_EXPANDED_LOCATOR_INVALID", "expanded private locator binding differs");
  }
  return { ...value, raw_sha256: value.locator_sha256 };
}

function safeLocatorSha256() {
  const value = process.env.MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_SHA256;
  return /^[0-9a-f]{64}$/u.test(value ?? "") ? value : "0".repeat(64);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !MODES.has(args[0])) {
    fail("WINDOWS_HANDOFF_MODE_INVALID", "exactly one handoff consumer mode is required");
  }
  const mode = args[0];
  const runnerTemp = resolveTrustedRoot(requiredEnvironment("RUNNER_TEMP"));
  const artifactRoot = ["--cleanup", "--decrypt", "--encrypt", "--finalize", "--materialize", "--purge"].includes(mode)
    ? directChild(
      runnerTemp,
      requiredEnvironment("MATTER_WINDOWS_UPDATE_PRIVATE_ARTIFACT_ROOT"),
      "private artifact root",
    )
    : null;
  const encryptedBridgeRoot = ["--encrypt", "--decrypt", "--finalize", "--purge"].includes(mode)
    ? directChild(
      runnerTemp,
      requiredEnvironment("MATTER_WINDOWS_UPDATE_ENCRYPTED_BRIDGE_ROOT"),
      "encrypted bridge root",
    )
    : null;
  const aggregateArtifactRoot = ["--cleanup", "--finalize", "--materialize", "--purge"].includes(mode)
    ? locatorArtifactRoot(runnerTemp)
    : null;
  const durableProviderStatePath = ["--cleanup", "--encrypt", "--materialize"].includes(mode)
    || (mode === "--purge" && process.env.MATTER_WINDOWS_UPDATE_PROVIDER_CALL_STATE_PATH)
    ? providerCallStatePath(runnerTemp)
    : null;

  if (mode === "--validate-ref") {
    const parsed = locatorArtifactRefInputs();
    process.stdout.write(`${JSON.stringify({
      verdict: "REF_VALIDATED",
      artifact_ref_sha256: parsed.artifact_ref_sha256,
      private_locator_sha256: parsed.ref.private_locator_sha256,
      wrapping_public_key_sha256: parsed.ref.wrapping_public_key_sha256,
      producer_run_id: parsed.ref.producer_run_id,
      producer_run_attempt: parsed.ref.producer_run_attempt,
      artifact_id: parsed.ref.artifact_id,
      artifact_digest: parsed.ref.artifact_digest,
      artifact_name: parsed.ref.artifact_name,
    })}\n`);
    return;
  }

  if (mode === "--verify-source") {
    const parsed = locatorArtifactRefInputs();
    const source = verifyWindowsFormalUpdatePrivateLocatorSource({
      artifactRef: parsed.ref,
      artifactRefSha256: parsed.artifact_ref_sha256,
      sourceRoot: locatorSourceRoot(runnerTemp),
      expectedWrappingKeyArn: requiredEnvironment("MATTER_WINDOWS_UPDATE_LOCATOR_WRAPPING_KMS_KEY_ARN"),
    });
    const receiptPath = locatorSourceReceiptPath(runnerTemp);
    const receiptSha256 = writeWindowsFormalUpdateLocatorSourceReceipt(receiptPath, source);
    process.stdout.write(`${JSON.stringify({
      verdict: "PASS",
      state: source.state,
      artifact_ref_sha256: parsed.artifact_ref_sha256,
      private_locator_sha256: parsed.ref.private_locator_sha256,
      receipt_sha256: receiptSha256,
      artifact_digest_verified: source.verification.raw_archive_digest_verified,
      exact_file_set_verified: source.verification.exact_file_set_verified,
      oidc_used: source.boundaries.oidc_used,
      plaintext_locator_recorded: source.boundaries.plaintext_locator_recorded,
    })}\n`);
    return;
  }

  if (mode === "--cleanup-source") {
    const sourceRoot = locatorSourceRoot(runnerTemp);
    const sourceArtifact = path.join(sourceRoot, "artifact");
    const targetArtifact = locatorArtifactRoot(runnerTemp);
    if (existsSync(targetArtifact)) fail("WINDOWS_HANDOFF_LOCATOR_ARTIFACT_ROOT_NOT_FRESH", "aggregate locator artifact root must start absent");
    cpSync(sourceArtifact, targetArtifact, { recursive: true, errorOnExist: true, force: false });
    assertExactAggregateArtifactFileSet(targetArtifact);
    const receipt = finalizeWindowsFormalUpdateLocatorSourceReceipt({
      sourceRoot,
      receiptPath: locatorSourceReceiptPath(runnerTemp),
      actionsReadTokenPresent: false,
      oidcCredentialsPresent: oidcCredentialsPresent(),
    });
    process.stdout.write(`${JSON.stringify({
      verdict: receipt.verdict,
      state: receipt.state,
      artifact_ref_sha256: receipt.artifact_ref_sha256,
      source_root_removed: receipt.cleanup.source_root_removed,
      locator_artifact_root_ready: existsSync(targetArtifact),
    })}\n`);
    return;
  }

  if (mode === "--purge") {
    const handoffReceiptPath = process.env.MATTER_WINDOWS_UPDATE_HANDOFF_RECEIPT_PATH
      ? directChild(
        runnerTemp,
        process.env.MATTER_WINDOWS_UPDATE_HANDOFF_RECEIPT_PATH,
        "handoff receipt path",
      )
      : null;
    const handoffReceiptTempPath = handoffReceiptPath ? `${handoffReceiptPath}.tmp` : null;
    const providerCallStateTempPath = durableProviderStatePath ? `${durableProviderStatePath}.tmp` : null;
    const sourceRoot = process.env.MATTER_WINDOWS_UPDATE_LOCATOR_SOURCE_ROOT
      ? locatorSourceRoot(runnerTemp)
      : null;
    const sourceReceipt = process.env.MATTER_WINDOWS_UPDATE_LOCATOR_SOURCE_RECEIPT_PATH
      ? locatorSourceReceiptPath(runnerTemp)
      : null;
    purgeWindowsFormalUpdatePrivateRoots(
      artifactRoot,
      aggregateArtifactRoot,
      encryptedBridgeRoot,
      sourceRoot,
      sourceReceipt,
      durableProviderStatePath,
      providerCallStateTempPath,
      handoffReceiptPath,
      handoffReceiptTempPath,
    );
    process.stdout.write(`${JSON.stringify({
      verdict: "PASS",
      private_artifact_root_removed: !existsSync(artifactRoot),
      locator_artifact_root_removed: !existsSync(aggregateArtifactRoot),
      locator_source_root_removed: sourceRoot ? !existsSync(sourceRoot) : true,
      locator_source_receipt_removed: sourceReceipt ? !existsSync(sourceReceipt) : true,
      encrypted_bridge_root_removed: !existsSync(encryptedBridgeRoot),
      provider_call_state_removed: durableProviderStatePath === null || !existsSync(durableProviderStatePath),
      provider_call_state_tmp_removed: providerCallStateTempPath === null || !existsSync(providerCallStateTempPath),
      handoff_receipt_removed: handoffReceiptPath === null || !existsSync(handoffReceiptPath),
      handoff_receipt_tmp_removed: handoffReceiptTempPath === null || !existsSync(handoffReceiptTempPath),
    })}\n`);
    return;
  }

  if (mode === "--decrypt") {
    assertExactBridgeFileSet(encryptedBridgeRoot);
    const result = decryptWindowsFormalUpdateEncryptedBridge({
      encryptedDir: encryptedBridgeRoot,
      artifactRoot,
      expectedEnvelopeSha256: requiredEnvironment("MATTER_WINDOWS_UPDATE_BRIDGE_ENVELOPE_SHA256"),
      expectedLocatorSha256: requiredEnvironment("MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_SHA256"),
      expectedWrappingPublicKeySha256: requiredEnvironment("MATTER_WINDOWS_UPDATE_BRIDGE_PUBLIC_KEY_SHA256"),
      privateKeyPath: requiredEnvironment("MATTER_WINDOWS_UPDATE_BRIDGE_PRIVATE_KEY_PATH"),
      runBinding: requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING"),
    });
    process.stdout.write(`${JSON.stringify({
      verdict: "PASS",
      locator_sha256: result.locator_sha256,
      envelope_sha256: result.envelope_sha256,
      object_count: result.object_count,
      automatic_update: result.automatic_update,
      public_release_claim: result.public_release_claim,
      external_distribution_claim: result.external_distribution_claim,
      production_go_live_claim: result.production_go_live_claim,
    })}\n`);
    return;
  }

  if (mode === "--finalize") {
    const finalReceiptPath = directChild(
      runnerTemp,
      requiredEnvironment("MATTER_WINDOWS_UPDATE_FINAL_RECEIPT_PATH"),
      "final consumer receipt path",
    );
    const readerReceiptPath = directChild(
      runnerTemp,
      requiredEnvironment("MATTER_WINDOWS_UPDATE_HANDOFF_RECEIPT_PATH"),
      "reader receipt path",
    );
    const runnerReceiptPath = directChild(
      runnerTemp,
      requiredEnvironment("MATTER_WINDOWS_UPDATE_OPERATOR_RECEIPT_PATH"),
      "operator receipt path",
    );
    const result = finalizeWindowsFormalUpdateConsumerReceipt({
      readerReceiptPath,
      finalReceiptPath,
      runnerReceiptPath,
      artifactRoot,
      locatorArtifactRoot: aggregateArtifactRoot,
      encryptedBridgeRoot,
      expectedLocatorSha256: requiredEnvironment("MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_SHA256"),
      expectedEnvelopeSha256: requiredEnvironment("MATTER_WINDOWS_UPDATE_BRIDGE_ENVELOPE_SHA256"),
      runBinding: requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING"),
      awsCredentialsPresent: credentialsPresent(),
      oidcCredentialsPresent: oidcCredentialsPresent(),
    });
    process.stdout.write(`${JSON.stringify({
      verdict: result.receipt.verdict,
      state: result.receipt.state,
      receipt_sha256: result.receipt_sha256,
      runner_receipt_sha256: result.receipt.runner_receipt_sha256,
      object_count: result.receipt.retrieval.expected_object_count,
      automatic_update: false,
      public_release_claim: false,
      external_distribution_claim: false,
      production_go_live_claim: false,
    })}\n`);
    return;
  }

  const receiptPath = directChild(
    runnerTemp,
    requiredEnvironment("MATTER_WINDOWS_UPDATE_HANDOFF_RECEIPT_PATH"),
    "handoff receipt path",
  );

  if (mode === "--cleanup") {
    const runBinding = requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING");
    const expectedLocatorSha256 = requiredEnvironment("MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_SHA256");
    if (existsSync(receiptPath) || existsSync(durableProviderStatePath)) {
      reconcileWindowsFormalUpdateHandoffProviderCallState({
        receiptPath,
        statePath: durableProviderStatePath,
        expectedLocatorSha256,
        runBinding,
      });
    }
    finalizeWindowsFormalUpdateHandoffReceipt({
      artifactRoot,
      locatorArtifactRoot: aggregateArtifactRoot,
      receiptPath,
      expandedLocatorPath: directChild(
        runnerTemp,
        requiredEnvironment("MATTER_WINDOWS_UPDATE_EXPANDED_LOCATOR_PATH"),
        "expanded private locator path",
      ),
      awsCredentialsPresent: credentialsPresent(),
      oidcCredentialsPresent: oidcCredentialsPresent(),
      runBinding,
      providerCallStatePath: durableProviderStatePath,
      bridgeEnvelopeSha256: process.env.MATTER_WINDOWS_UPDATE_BRIDGE_ENVELOPE_SHA256 ?? "",
      bridgeObjectCount: Number(process.env.MATTER_WINDOWS_UPDATE_BRIDGE_OBJECT_COUNT ?? 0),
    });
    const reconciled = reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath,
      statePath: durableProviderStatePath,
      expectedLocatorSha256,
      runBinding,
    });
    const cleanupReady = reconciled.receipt.cleanup.aws_credentials_cleared === true
      && reconciled.receipt.cleanup.oidc_credentials_cleared === true
      && reconciled.receipt.cleanup.private_artifact_root_removed === true
      && reconciled.receipt.cleanup.expanded_locator_removed === true
      && reconciled.receipt.cleanup.locator_artifact_root_removed === true;
    const passReady = reconciled.receipt.verdict === "PASS"
      && reconciled.receipt.state === "PENDING_OPERATOR";
    const diagnosticReady = reconciled.receipt.verdict === "FAIL"
      && reconciled.receipt.state === "BLOCKED"
      && /^[A-Z0-9._-]{1,96}$/u.test(reconciled.receipt.error_code ?? "");
    const receiptReady = cleanupReady && reconciled.provider_call_performed === true
      && (passReady || diagnosticReady);
    const bridgeReady = cleanupReady && reconciled.provider_call_performed === true && passReady;
    process.stdout.write(`${JSON.stringify({
      verdict: reconciled.receipt.verdict,
      state: reconciled.receipt.state,
      error_code: reconciled.receipt.error_code ?? null,
      aws_credentials_cleared: reconciled.receipt.cleanup.aws_credentials_cleared,
      oidc_credentials_cleared: reconciled.receipt.cleanup.oidc_credentials_cleared,
      private_artifact_root_removed: reconciled.receipt.cleanup.private_artifact_root_removed,
      expanded_locator_removed: reconciled.receipt.cleanup.expanded_locator_removed,
      locator_artifact_root_removed: reconciled.receipt.cleanup.locator_artifact_root_removed,
      provider_call_performed: reconciled.provider_call_performed,
      provider_state_reconciled: true,
      receipt_reconciled: true,
      receipt_ready: receiptReady,
      bridge_ready: bridgeReady,
    })}\n`);
    return;
  }

  let validated = null;
  let failureLocatorSha256 = safeLocatorSha256();
  let providerCallPerformed = false;
  let providerAdapter = null;
  const getProviderAdapter = (locatorSha256, runBinding) => {
    if (providerAdapter === null) {
      providerAdapter = createWindowsFormalUpdateHandoffAwsCliAdapter({
        providerCallState: {
          statePath: durableProviderStatePath,
          locatorSha256,
          runBinding,
        },
        onProviderCall: () => {
          providerCallPerformed = true;
        },
      });
    }
    return providerAdapter;
  };
  try {
    if (mode === "--materialize") {
      const parsed = locatorArtifactRefInputs();
      failureLocatorSha256 = privateLocatorSha256(parsed.ref);
      const runBinding = requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING");
      const awsAdapter = getProviderAdapter(failureLocatorSha256, runBinding);
      const decrypted = await decryptWindowsFormalUpdatePrivateLocatorArtifact({
        artifactRef: parsed.ref,
        artifactRefSha256: parsed.artifact_ref_sha256,
        artifactDir: aggregateArtifactRoot,
        sourceReceiptPath: locatorSourceReceiptPath(runnerTemp),
        expectedReaderRoleArn: requiredEnvironment("MATTER_WINDOWS_UPDATE_READER_ROLE_ARN"),
        expectedBucket: requiredEnvironment("MATTER_WINDOWS_UPDATE_HANDOFF_BUCKET"),
        expectedStorageKmsKeyArn: requiredEnvironment("MATTER_WINDOWS_UPDATE_HANDOFF_KMS_KEY_ARN"),
        expectedUnwrapKmsKeyArn: requiredEnvironment("MATTER_WINDOWS_UPDATE_LOCATOR_WRAPPING_KMS_KEY_ARN"),
        kms: awsAdapter,
      });
      validated = decrypted;
      const receiptPath = directChild(
        runnerTemp,
        requiredEnvironment("MATTER_WINDOWS_UPDATE_HANDOFF_RECEIPT_PATH"),
        "handoff receipt path",
      );
      writeWindowsFormalUpdateHandoffReceipt(receiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
        validated: decrypted,
        locatorSha256: privateLocatorSha256(parsed.ref),
        runBinding,
        providerCallStatePath: durableProviderStatePath,
      }), { replace: existsSync(receiptPath) });
    } else {
      if (mode === "--encrypt") {
        if (existsSync(receiptPath)) {
          const runBinding = requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING");
          providerCallPerformed = readWindowsFormalUpdateHandoffProviderCallState({
            receiptPath,
            providerCallStatePath: durableProviderStatePath,
            expectedLocatorSha256: requiredEnvironment("MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_SHA256"),
            runBinding,
          });
        }
      }
      validated = mode === "--encrypt" ? expandedLocatorInputs(runnerTemp) : null;
    }
    if (mode === "--encrypt") {
      const result = createWindowsFormalUpdateEncryptedBridge({
        validated,
        artifactRoot,
        outputDir: encryptedBridgeRoot,
        wrappingPublicKeySpkiBase64: requiredEnvironment("MATTER_WINDOWS_UPDATE_BRIDGE_PUBLIC_KEY_SPKI_B64"),
        wrappingPublicKeySha256: requiredEnvironment("MATTER_WINDOWS_UPDATE_BRIDGE_PUBLIC_KEY_SHA256"),
        runBinding: requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING"),
      });
      assertExactBridgeFileSet(encryptedBridgeRoot);
      process.stdout.write(`${JSON.stringify({
        verdict: "PASS",
        envelope_sha256: result.envelope_sha256,
        object_count: result.object_count,
        plaintext_uploaded_to_github: false,
        exact_s3_locator_included: false,
        automatic_update: false,
        public_release_claim: false,
        external_distribution_claim: false,
        production_go_live_claim: false,
      })}\n`);
      return;
    }
    if (mode === "--validate") {
      const parsed = locatorArtifactRefInputs();
      process.stdout.write(`${JSON.stringify({
        verdict: "LOCATOR_SOURCE_VALIDATED",
        artifact_ref_sha256: parsed.artifact_ref_sha256,
        locator_sha256: parsed.ref.private_locator_sha256,
      })}\n`);
      return;
    }

    if (mode !== "--materialize") return;
    const receiptPath = directChild(
      runnerTemp,
      requiredEnvironment("MATTER_WINDOWS_UPDATE_HANDOFF_RECEIPT_PATH"),
      "handoff receipt path",
    );
    const result = await materializeWindowsFormalUpdatePrivateHandoff({
      validated,
      artifactRoot,
      receiptPath,
      expandedLocatorPath: directChild(
        runnerTemp,
        requiredEnvironment("MATTER_WINDOWS_UPDATE_EXPANDED_LOCATOR_PATH"),
        "expanded private locator path",
      ),
      locatorSha256: validated.raw_sha256,
      runBinding: requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING"),
      providerCallStatePath: durableProviderStatePath,
      aws: providerAdapter ?? getProviderAdapter(
        validated.raw_sha256,
        requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING"),
      ),
    });
    process.stdout.write(`${JSON.stringify({
      verdict: result.receipt.verdict,
      object_count: result.receipt.retrieval.full_body_sha256_verified,
      sanitized_receipt_sha256: result.receipt_sha256,
      automatic_update: false,
      public_release_claim: false,
      production_go_live_claim: false,
    })}\n`);
  } catch (error) {
    if (error && (typeof error === "object" || typeof error === "function")) {
      Object.defineProperty(error, "provider_call_performed", {
        configurable: true,
        enumerable: false,
        value: providerCallPerformed,
      });
    }
    if (durableProviderStatePath !== null) {
      const failure = createWindowsFormalUpdateHandoffFailureReceipt({
        error,
        validated,
        locatorSha256: validated?.raw_sha256 ?? failureLocatorSha256,
        runBinding: requiredEnvironment("MATTER_WINDOWS_UPDATE_RUN_BINDING"),
        providerCallStatePath: durableProviderStatePath,
      });
      try {
        writeWindowsFormalUpdateHandoffReceipt(receiptPath, failure, { replace: existsSync(receiptPath) });
      } catch {
        // The workflow reports receipt_written only after independently checking the path.
      }
    }
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    verdict: "FAIL",
    error_code: errorCode(error),
  })}\n`);
  process.exitCode = 1;
});
