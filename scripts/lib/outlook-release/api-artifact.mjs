import { GIT_OID } from "./constants.mjs";
import { validateReleaseContract } from "./contract.mjs";
import {
  assertEqual, assertExactKeys, assertNoSensitiveMaterial, assertSafeRelativePath, canonical,
  requiredText, sha256, sorted,
} from "./primitives.mjs";

export function validateApiArtifactEntries(entries, embeddedManifestPath) {
  const expected = assertSafeRelativePath(embeddedManifestPath, "embedded API manifest path");
  const seen = new Set();
  let embeddedCount = 0;
  for (const rawEntry of entries ?? []) {
    const entry = requiredText(rawEntry, "API artifact entry");
    const pathWithoutDirectorySlash = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    if (entry.includes("\\") || entry.includes("//") || pathWithoutDirectorySlash.split("/").includes(".")
      || assertSafeRelativePath(pathWithoutDirectorySlash, "API artifact entry") !== pathWithoutDirectorySlash
      || seen.has(entry)) {
      throw new Error(`API artifact contains an unsafe or duplicate entry: ${entry}`);
    }
    seen.add(entry);
    if (entry === expected) embeddedCount += 1;
  }
  if (!seen.size || embeddedCount !== 1) throw new Error(`API artifact must contain exactly one ${expected}`);
  return { entry_count: seen.size, embedded_manifest_path: expected };
}

function environmentProjection(configuration) {
  const variables = configuration?.Environment?.Variables;
  if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
    throw new Error("Lambda configuration Environment.Variables is required");
  }
  const keys = sorted(Object.keys(variables));
  return {
    key_count: keys.length,
    keys_sha256: sha256(JSON.stringify(keys)),
    values_sha256: sha256(JSON.stringify(canonical(variables))),
  };
}

function validateLambdaTarget(configuration, contract, name) {
  const expectedArn = `arn:aws:lambda:${contract.api.region}:${contract.api.aws_account_id}:function:${contract.api.function_name}`;
  if (configuration?.FunctionName !== contract.api.function_name || configuration?.FunctionArn !== expectedArn) {
    throw new Error(`${name} Lambda target drifted`);
  }
}

export function validateApiArtifactRelease({
  receipt, artifactBytes, embeddedManifest, expectedSourceSha, expectedSourceTree, packageLockBytes,
  beforeConfiguration, afterConfiguration, contract,
}) {
  validateReleaseContract(contract);
  assertNoSensitiveMaterial(receipt, "API release receipt");
  assertNoSensitiveMaterial(embeddedManifest, "embedded API deployment manifest");
  if (!GIT_OID.test(expectedSourceSha ?? "") || !GIT_OID.test(expectedSourceTree ?? "")) {
    throw new Error("exact source SHA/tree is invalid");
  }
  if (receipt?.schema_version !== "amic-os.outlook-api-release.v1") throw new Error("API release receipt schema is invalid");
  assertExactKeys(receipt, [
    "artifact_sha256", "authorization_ref", "aws_account_id", "deployed_code_sha256", "environment",
    "function_name", "lambda_code_sha256", "mode", "mutation_count", "package_lock_sha256", "region",
    "schema_version", "source_sha", "source_tree", "status",
  ], "API release receipt");
  assertExactKeys(embeddedManifest, [
    "artifact_kind", "package_lock_sha256", "schema_version", "source_sha", "source_tree",
  ], "embedded API deployment manifest");
  const artifact = Buffer.isBuffer(artifactBytes) ? artifactBytes : Buffer.from(artifactBytes ?? "");
  if (!artifact.byteLength) throw new Error("API artifact must not be empty");
  const artifactSha = sha256(artifact);
  const lambdaCodeSha = sha256(artifact, "base64");
  const lockSha = sha256(packageLockBytes);
  if (receipt.source_sha !== expectedSourceSha || receipt.source_tree !== expectedSourceTree
    || receipt.package_lock_sha256 !== lockSha || receipt.artifact_sha256 !== artifactSha
    || receipt.lambda_code_sha256 !== lambdaCodeSha) throw new Error("API artifact exact-SHA binding failed");
  if (embeddedManifest.schema_version !== "amic-os.api-deployment-manifest.v1"
    || embeddedManifest.source_sha !== expectedSourceSha || embeddedManifest.source_tree !== expectedSourceTree
    || embeddedManifest.package_lock_sha256 !== lockSha || embeddedManifest.artifact_kind !== "matter-lawos-api-prod") {
    throw new Error("embedded API deployment manifest exact-SHA binding failed");
  }
  if (receipt.function_name !== contract.api.function_name || receipt.aws_account_id !== contract.api.aws_account_id
    || receipt.region !== contract.api.region) throw new Error("API deployment target drifted");
  validateLambdaTarget(beforeConfiguration, contract, "before-deploy");
  const before = environmentProjection(beforeConfiguration);
  assertEqual(receipt.environment?.before, before, "API before-environment fingerprint");
  if (receipt.mode === "dry-run") {
    assertExactKeys(receipt.environment, ["before", "preservation_status"], "API dry-run environment receipt");
    if (receipt.authorization_ref != null || afterConfiguration !== undefined
      || receipt.status !== "artifact_verified_awaiting_authorized_deployment"
      || receipt.environment.preservation_status !== "planned" || receipt.mutation_count !== 0
      || receipt.deployed_code_sha256 != null) {
      throw new Error("API dry-run receipt overclaims deployment or environment preservation");
    }
  } else if (receipt.mode === "post-deploy-readback") {
    assertExactKeys(receipt.environment, ["after", "before", "preservation_status"], "API post-deploy environment receipt");
    validateLambdaTarget(afterConfiguration, contract, "after-deploy");
    const after = environmentProjection(afterConfiguration);
    assertEqual(after, before, "API Lambda environment preservation");
    assertEqual(receipt.environment.after, after, "API after-environment fingerprint");
    if (!requiredText(receipt.authorization_ref, "API deployment authorization_ref")
      || receipt.status !== "deployed_readback_verified" || receipt.environment.preservation_status !== "verified"
      || receipt.mutation_count !== 1 || receipt.deployed_code_sha256 !== lambdaCodeSha
      || afterConfiguration.CodeSha256 !== lambdaCodeSha) {
      throw new Error("API post-deploy code/environment readback is incomplete");
    }
  } else throw new Error(`unsupported API release mode: ${receipt.mode}`);
  return {
    status: receipt.status, source_sha: expectedSourceSha, artifact_sha256: artifactSha,
    lambda_code_sha256: lambdaCodeSha, environment: before,
  };
}
