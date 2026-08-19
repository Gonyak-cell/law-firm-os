import { GIT_OID } from "./constants.mjs";
import { validateReleaseContract } from "./contract.mjs";
import { createJsonPostgresArtifactReproducibilityEvidence } from "../json-postgres-artifact-reproducibility.mjs";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  JSON_POSTGRES_PRODUCTION_LAMBDA_ENTRYPOINT,
  validateJsonPostgresProductionArtifactEntries,
  validateJsonPostgresProductionDeploymentManifest,
} from "../json-postgres-production-artifact.mjs";
import { EXPECTED_FUNCTION_IDENTITIES } from "../outlook-production-aws-inventory-contract.mjs";
import { validateRdsCaBundle } from "../private-staging-artifact.mjs";
import {
  assertEqual, assertExactKeys, assertNoSensitiveMaterial, assertSafeRelativePath, canonical,
  requiredText, sha256, sorted,
} from "./primitives.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;

const EMBEDDED_MANIFEST_FIELDS = Object.freeze([
  "data_scope", "dependency_lock_sha256", "dual_write", "file_current_authority", "json_fallback",
  "json_writer", "memory_fallback", "node_version", "npm_version", "offline_mutation",
  "operational_authority", "packaged_account_seed_count", "packaged_public_professional_profile_count",
  "packaged_real_client_count", "packaged_real_identity_count", "packaged_roster_count",
  "packaged_static_role_assignment_count", "production_ready_claim", "rds_ca_bundle", "runtime",
  "scanned_source_count", "schema_version", "secrets_in_environment", "source_override_count",
  "source_overrides", "source_redaction_count", "source_redactions", "source_sha", "source_timestamp",
  "source_tree",
]);
const OUTER_MANIFEST_FIELDS = Object.freeze([
  ...EMBEDDED_MANIFEST_FIELDS,
  "artifact_byte_size", "artifact_entries_sha256", "artifact_entry_count", "artifact_filename",
  "artifact_private_staging_entry_count", "artifact_real_json_store_count", "artifact_runtime_store_entry_count",
  "artifact_s3_key", "artifact_sha256", "artifact_symlink_count", "artifact_symlink_entries_sha256",
  "artifact_symlink_escape_count", "manifest_canonical_sha256",
  "outlook_runtime_entries_sha256", "outlook_runtime_entry_count",
]);
const OUTER_ONLY_FIELDS = new Set(OUTER_MANIFEST_FIELDS.filter((field) => !EMBEDDED_MANIFEST_FIELDS.includes(field)));

function artifactBuffer(value, name) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value ?? "");
  if (!bytes.byteLength) throw new Error(`${name} must not be empty`);
  return bytes;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateProductionManifest(manifest, {
  name, expectedSourceSha, expectedSourceTree, packageLockSha,
  rdsCaBundleSha, rdsCaBundleByteSize, rdsCaBundleCertificateCount,
}) {
  assertNoSensitiveMaterial(manifest, name);
  assertExactKeys(manifest, EMBEDDED_MANIFEST_FIELDS, name);
  validateJsonPostgresProductionDeploymentManifest(manifest);
  if (manifest.schema_version !== JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA
    || manifest.source_sha !== expectedSourceSha || manifest.source_tree !== expectedSourceTree
    || manifest.dependency_lock_sha256 !== packageLockSha
    || manifest.rds_ca_bundle?.sha256 !== rdsCaBundleSha
    || manifest.rds_ca_bundle?.byte_size !== rdsCaBundleByteSize
    || manifest.rds_ca_bundle?.certificate_count !== rdsCaBundleCertificateCount
    || manifest.runtime !== "nodejs22.x" || !/^22\./u.test(manifest.node_version ?? "")) {
    throw new Error(`${name} schema/source/tree/dependency-lock/CA binding failed`);
  }
}

function validateOuterManifest(manifest, artifactBytes, archiveEntries, bindings, name) {
  assertExactKeys(manifest, OUTER_MANIFEST_FIELDS, name);
  const embeddedProjection = Object.fromEntries(
    Object.entries(manifest).filter(([field]) => !OUTER_ONLY_FIELDS.has(field)),
  );
  validateProductionManifest(embeddedProjection, { ...bindings, name: `${name} deployment projection` });
  const artifactSha = sha256(artifactBytes);
  const entries = [...archiveEntries].sort();
  const entriesSha = sha256(Buffer.from(`${entries.join("\n")}\n`));
  if (manifest.artifact_filename !== `lawos-production-${bindings.expectedSourceSha}.zip`
    || manifest.artifact_sha256 !== artifactSha
    || manifest.artifact_byte_size !== artifactBytes.byteLength
    || manifest.artifact_entry_count !== entries.length
    || manifest.artifact_entries_sha256 !== entriesSha
    || manifest.artifact_runtime_store_entry_count !== 0
    || manifest.artifact_real_json_store_count !== 0
    || manifest.artifact_private_staging_entry_count !== 0
    || !Number.isSafeInteger(manifest.artifact_symlink_count)
    || manifest.artifact_symlink_count < 1
    || !SHA256.test(manifest.artifact_symlink_entries_sha256 ?? "")
    || manifest.artifact_symlink_escape_count !== 0
    || manifest.outlook_runtime_entry_count !== bindings.outlookRuntimeEntryCount
    || manifest.outlook_runtime_entries_sha256 !== bindings.outlookRuntimeEntriesSha256
    || manifest.artifact_s3_key !== `lawos-production/${bindings.expectedSourceSha}/${artifactSha}.zip`
    || manifest.manifest_canonical_sha256 !== sha256(Buffer.from(stableJson({
      ...manifest,
      manifest_canonical_sha256: "",
    })))) {
    throw new Error(`${name} artifact binding failed`);
  }
  return embeddedProjection;
}

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
  const expected = EXPECTED_FUNCTION_IDENTITIES[contract.api.function_name];
  const closureHandler = `${JSON_POSTGRES_PRODUCTION_LAMBDA_ENTRYPOINT.replace(/\.js$/u, "")}.handler`;
  if (!expected || expected.function_arn !== expectedArn
    || expected.handler !== closureHandler
    || configuration?.FunctionName !== contract.api.function_name
    || configuration?.FunctionArn !== expected.function_arn
    || configuration?.Handler !== expected.handler
    || configuration?.Runtime !== expected.runtime
    || configuration?.PackageType !== expected.package_type
    || !Array.isArray(configuration?.Architectures)
    || configuration.Architectures.length !== 1
    || configuration.Architectures[0] !== expected.architecture) {
    throw new Error(`${name} Lambda execution identity drifted`);
  }
}

export function validateApiArtifactReleaseFromProducerBuilds({
  receipt, artifactBytes, archiveEntries, embeddedManifest, candidateOuterManifest, producerBuilds,
  expectedSourceSha, expectedSourceTree, packageLockBytes, rdsCaBundleBytes,
  beforeConfiguration, afterConfiguration, contract,
}) {
  validateReleaseContract(contract);
  assertNoSensitiveMaterial(receipt, "API release receipt");
  if (!GIT_OID.test(expectedSourceSha ?? "") || !GIT_OID.test(expectedSourceTree ?? "")) {
    throw new Error("exact source SHA/tree is invalid");
  }
  if (receipt?.schema_version !== "amic-os.outlook-api-release.v1") throw new Error("API release receipt schema is invalid");
  assertExactKeys(receipt, [
    "artifact_sha256", "authorization_ref", "aws_account_id", "deployed_code_sha256", "environment",
    "function_name", "lambda_code_sha256", "mode", "mutation_count", "package_lock_sha256", "region",
    "producer_build_count", "reproducibility_result_sha256", "schema_version", "source_sha", "source_tree",
    "status",
  ], "API release receipt");
  const artifact = artifactBuffer(artifactBytes, "API artifact");
  const artifactSha = sha256(artifact);
  const lambdaCodeSha = sha256(artifact, "base64");
  const lockSha = sha256(packageLockBytes);
  const caBundle = artifactBuffer(rdsCaBundleBytes, "RDS CA bundle");
  const ca = validateRdsCaBundle(caBundle);
  const validatedArchive = validateApiArtifactEntries(archiveEntries, contract.api.embedded_manifest_path);
  const productionArchive = validateJsonPostgresProductionArtifactEntries(archiveEntries);
  if (validatedArchive.entry_count !== productionArchive.entry_count) {
    throw new Error("API production archive inventory count drifted");
  }
  const bindings = {
    expectedSourceSha,
    expectedSourceTree,
    packageLockSha: lockSha,
    rdsCaBundleSha: sha256(caBundle),
    rdsCaBundleByteSize: ca.byte_size,
    rdsCaBundleCertificateCount: ca.certificate_count,
    outlookRuntimeEntryCount: productionArchive.outlook_runtime_entry_count,
    outlookRuntimeEntriesSha256:
      productionArchive.outlook_runtime_entries_sha256,
  };
  validateProductionManifest(embeddedManifest, {
    ...bindings,
    name: "embedded API deployment manifest",
  });
  const candidateProjection = validateOuterManifest(
    candidateOuterManifest,
    artifact,
    archiveEntries,
    bindings,
    "candidate API outer manifest",
  );
  assertEqual(
    canonical(candidateProjection),
    canonical(embeddedManifest),
    "candidate outer/embedded API deployment manifest",
  );
  if (!Array.isArray(producerBuilds) || producerBuilds.length !== 2) {
    throw new Error("two independently produced API artifacts are required");
  }
  const produced = producerBuilds.map((build, index) => {
    const name = `API producer build ${index + 1}`;
    assertExactKeys(build, ["artifactBytes", "outerManifest"], name);
    const bytes = artifactBuffer(build.artifactBytes, `${name} artifact`);
    validateOuterManifest(build.outerManifest, bytes, archiveEntries, bindings, `${name} outer manifest`);
    return { artifactBytes: bytes, outerManifest: build.outerManifest };
  });
  const reproducibility = createJsonPostgresArtifactReproducibilityEvidence({
    sourceSha: expectedSourceSha,
    sourceTree: expectedSourceTree,
    firstArtifact: produced[0].artifactBytes,
    secondArtifact: produced[1].artifactBytes,
    firstManifest: produced[0].outerManifest,
    secondManifest: produced[1].outerManifest,
  });
  if (!artifact.equals(produced[0].artifactBytes) || !artifact.equals(produced[1].artifactBytes)) {
    throw new Error("candidate API artifact is not byte-identical to both producer builds");
  }
  assertEqual(
    canonical(candidateOuterManifest),
    canonical(produced[0].outerManifest),
    "candidate/producer-1 API outer manifest",
  );
  assertEqual(
    canonical(candidateOuterManifest),
    canonical(produced[1].outerManifest),
    "candidate/producer-2 API outer manifest",
  );
  if (receipt.source_sha !== expectedSourceSha || receipt.source_tree !== expectedSourceTree
    || receipt.package_lock_sha256 !== lockSha || receipt.artifact_sha256 !== artifactSha
    || receipt.lambda_code_sha256 !== lambdaCodeSha || receipt.producer_build_count !== 2
    || receipt.reproducibility_result_sha256 !== reproducibility.result_sha256) {
    throw new Error("API artifact exact-SHA/reproducibility binding failed");
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
    status: receipt.status, source_sha: expectedSourceSha, source_tree: expectedSourceTree,
    artifact_sha256: artifactSha, lambda_code_sha256: lambdaCodeSha,
    producer_build_count: reproducibility.build_count,
    reproducibility_result_sha256: reproducibility.result_sha256,
    environment: before,
  };
}
