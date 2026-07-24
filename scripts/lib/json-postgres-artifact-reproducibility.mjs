import { createHash } from "node:crypto";
import {
  validateJsonPostgresProductionDeploymentManifest,
} from "./json-postgres-production-artifact.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createJsonPostgresArtifactReproducibilityEvidence({
  sourceSha,
  sourceTree,
  firstArtifact,
  secondArtifact,
  firstManifest,
  secondManifest,
} = {}) {
  validateJsonPostgresProductionDeploymentManifest(firstManifest);
  validateJsonPostgresProductionDeploymentManifest(secondManifest);
  const firstArtifactSha256 = sha256(firstArtifact);
  const secondArtifactSha256 = sha256(secondArtifact);
  const firstManifestCanonicalSha256 = sha256(stableJson(firstManifest));
  const secondManifestCanonicalSha256 = sha256(stableJson(secondManifest));
  if (firstManifest.source_sha !== sourceSha
    || secondManifest.source_sha !== sourceSha
    || firstManifest.source_tree !== sourceTree
    || secondManifest.source_tree !== sourceTree
    || firstManifest.artifact_sha256 !== firstArtifactSha256
    || secondManifest.artifact_sha256 !== secondArtifactSha256
    || firstArtifactSha256 !== secondArtifactSha256
    || firstManifestCanonicalSha256 !== secondManifestCanonicalSha256) {
    throw new Error("production artifact builds are not reproducible at the exact source");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-artifact-reproducibility.v1",
    outcome: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: firstArtifactSha256,
    manifest_canonical_sha256: firstManifestCanonicalSha256,
    build_count: 2,
    artifact_match: true,
    manifest_match: true,
    mismatch_count: 0,
    claims: {
      source_dirty: false,
      external_action_executed: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({
    ...material,
    result_sha256: sha256(stableJson(material)),
  });
}

export function validateJsonPostgresArtifactReproducibilityEvidence(value, {
  packet,
} = {}) {
  const { result_sha256: ignored, ...material } = value ?? {};
  if (value?.schema_version !== "law-firm-os.json-postgres-artifact-reproducibility.v1"
    || value.outcome !== "PASS"
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || !SHA256.test(value.artifact_sha256 ?? "")
    || !SHA256.test(value.manifest_canonical_sha256 ?? "")
    || value.build_count !== 2
    || value.artifact_match !== true
    || value.manifest_match !== true
    || value.mismatch_count !== 0
    || value.claims?.source_dirty !== false
    || value.claims?.external_action_executed !== false
    || value.claims?.raw_value_returned !== false
    || value.claims?.pii_returned !== false
    || value.claims?.secret_material_returned !== false
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== sha256(stableJson(material))
    || (packet && (value.source_sha !== packet.source_sha
      || value.source_tree !== packet.source_tree
      || value.artifact_sha256 !== packet.bindings?.artifact_sha256))) {
    throw new Error("production artifact reproducibility evidence is invalid");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
    artifact_sha256: value.artifact_sha256,
  });
}
