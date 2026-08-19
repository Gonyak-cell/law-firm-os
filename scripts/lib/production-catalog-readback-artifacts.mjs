import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  validateJsonPostgresProductionDeploymentManifest,
} from "./json-postgres-production-artifact.mjs";
import {
  TASK3_SHA256,
  task3ExactKeys,
  task3Fail,
  task3Sha256,
  task3ValidateBoundBytes,
} from "./production-catalog-readback-common.mjs";

function parseManifest(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    task3Fail("TASK3_ARTIFACT_MANIFEST_INVALID", `${label} is not valid JSON`);
  }
}

function validateDiagnosticManifest(manifest, packet) {
  try {
    validateJsonPostgresProductionDeploymentManifest(manifest);
  } catch {
    task3Fail(
      "TASK3_ARTIFACT_MANIFEST_INVALID",
      "diagnostic artifact authority boundary drifted",
    );
  }
  const claimedManifestSha = manifest?.manifest_canonical_sha256;
  if (manifest.schema_version !== JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA
    || manifest.source_sha !== packet.source_sha
    || manifest.source_tree !== packet.source_tree
    || manifest.artifact_sha256 !== packet.diagnostic_artifact.sha256
    || manifest.artifact_byte_size !== packet.diagnostic_artifact.bytes
    || !TASK3_SHA256.test(claimedManifestSha ?? "")
    || claimedManifestSha !== task3Sha256(canonicalizeJson({
      ...manifest,
      manifest_canonical_sha256: "",
    }))) {
    task3Fail(
      "TASK3_ARTIFACT_MANIFEST_INVALID",
      "diagnostic artifact manifest drifted",
    );
  }
}

async function readBoundPrivateArtifact(
  descriptor,
  packetBinding,
  kind,
  readPrivateArtifact,
) {
  task3ExactKeys(
    descriptor,
    ["path", "bytes", "sha256", "manifest"],
    "TASK3_ARTIFACT_BINDING_DRIFT",
    `${kind} descriptor`,
  );
  if (typeof descriptor.path !== "string" || !descriptor.path
    || descriptor.bytes !== packetBinding.bytes
    || descriptor.sha256 !== packetBinding.sha256) {
    task3Fail("TASK3_ARTIFACT_BINDING_DRIFT", `${kind} descriptor drifted`);
  }
  const bytes = await readPrivateArtifact({
    kind,
    path: descriptor.path,
    expectedBytes: descriptor.bytes,
    expectedSha256: descriptor.sha256,
    zip: kind.endsWith("artifact"),
  });
  return task3ValidateBoundBytes(bytes, descriptor, kind);
}

async function readBoundManifest(
  descriptor,
  expectedSha256,
  kind,
  readPrivateArtifact,
) {
  task3ExactKeys(
    descriptor,
    ["path", "bytes", "sha256"],
    "TASK3_ARTIFACT_BINDING_DRIFT",
    `${kind} descriptor`,
  );
  if (typeof descriptor.path !== "string" || !descriptor.path
    || !Number.isSafeInteger(descriptor.bytes) || descriptor.bytes < 1
    || descriptor.sha256 !== expectedSha256) {
    task3Fail("TASK3_ARTIFACT_BINDING_DRIFT", `${kind} descriptor drifted`);
  }
  const bytes = await readPrivateArtifact({
    kind,
    path: descriptor.path,
    expectedBytes: descriptor.bytes,
    expectedSha256: descriptor.sha256,
    zip: false,
  });
  return task3ValidateBoundBytes(bytes, descriptor, kind);
}

export async function readAndVerifyCatalogReadbackArtifacts({
  artifacts,
  packet,
  readPrivateArtifact,
  verifyRollbackManifest,
} = {}) {
  const diagnosticBytes = await readBoundPrivateArtifact(
    artifacts?.diagnostic,
    packet.diagnostic_artifact,
    "diagnostic-artifact",
    readPrivateArtifact,
  );
  const diagnosticManifestBytes = await readBoundManifest(
    artifacts?.diagnostic?.manifest,
    packet.diagnostic_artifact.manifest_sha256,
    "diagnostic-manifest",
    readPrivateArtifact,
  );
  validateDiagnosticManifest(
    parseManifest(diagnosticManifestBytes, "diagnostic artifact manifest"),
    packet,
  );
  const rollbackBytes = await readBoundPrivateArtifact(
    artifacts?.rollback,
    packet.rollback_artifact,
    "rollback-artifact",
    readPrivateArtifact,
  );
  const rollbackManifestBytes = await readBoundManifest(
    artifacts?.rollback?.manifest,
    packet.rollback_artifact.manifest_sha256,
    "rollback-manifest",
    readPrivateArtifact,
  );
  const rollbackManifest = await verifyRollbackManifest({
    manifest: parseManifest(
      rollbackManifestBytes,
      "rollback artifact manifest",
    ),
    artifact: packet.rollback_artifact,
    functionName: packet.target.function_name,
  });
  if (rollbackManifest?.valid !== true) {
    task3Fail(
      "TASK3_ROLLBACK_MANIFEST_INVALID",
      "rollback artifact manifest is invalid",
    );
  }
  return Object.freeze({ diagnosticBytes, rollbackBytes });
}
