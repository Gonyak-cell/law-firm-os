import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresArtifactReproducibilityEvidence,
  validateJsonPostgresArtifactReproducibilityEvidence,
} from "../lib/json-postgres-artifact-reproducibility.mjs";

const sourceSha = "a".repeat(40);
const sourceTree = "b".repeat(40);
const bytes = Buffer.from("deterministic artifact");
const digest = "7ed10017b66dbc94025266f3f6627f2120a84773f9d7c73450df2b4882fc9a5d";
const manifest = {
  schema_version: "law-firm-os.json-postgres-production-artifact.v2",
  source_sha: sourceSha,
  source_tree: sourceTree,
  data_scope: "approved-immutable-inputs-only",
  operational_authority: "postgres-v2",
  json_fallback: false,
  json_writer: false,
  dual_write: false,
  file_current_authority: false,
  offline_mutation: false,
  memory_fallback: false,
  packaged_real_identity_count: 0,
  packaged_real_client_count: 0,
  packaged_static_role_assignment_count: 0,
  packaged_private_profile_photo_count: 10,
  secrets_in_environment: false,
  production_ready_claim: false,
  profile_photo_artifact: {
    metadata_path: "apps/api/src/hrx-member-photo-artifact-metadata.json",
    metadata_schema_version: "law-firm-os.profile-photo-artifact-metadata.v1",
    metadata_sha256: "f".repeat(64),
    generation_ref: `profile_generation_${"d".repeat(32)}`,
    private_manifest_schema_version: "law-firm-os.profile-photo-replacement-manifest.v2",
    private_manifest_sha256: "d".repeat(64),
    private_manifest_entry_count: 10,
    injected_photo_entry_count: 10,
    git_source_photo_entry_count: 0,
  },
  artifact_sha256: digest,
};

test("two production builds must match in both archive and canonical manifest", () => {
  const evidence = createJsonPostgresArtifactReproducibilityEvidence({
    sourceSha,
    sourceTree,
    firstArtifact: bytes,
    secondArtifact: bytes,
    firstManifest: manifest,
    secondManifest: structuredClone(manifest),
  });
  assert.equal(evidence.artifact_match, true);
  assert.equal(evidence.manifest_match, true);
  assert.equal(evidence.mismatch_count, 0);
  assert.equal(validateJsonPostgresArtifactReproducibilityEvidence(evidence, {
    packet: {
      source_sha: sourceSha,
      source_tree: sourceTree,
      bindings: { artifact_sha256: digest },
    },
  }).valid, true);
  assert.throws(() => validateJsonPostgresArtifactReproducibilityEvidence({
    ...evidence,
    mismatch_count: 1,
  }), /invalid/u);
  assert.throws(() => createJsonPostgresArtifactReproducibilityEvidence({
    sourceSha,
    sourceTree,
    firstArtifact: bytes,
    secondArtifact: Buffer.from("drift"),
    firstManifest: manifest,
    secondManifest: { ...manifest, artifact_sha256: "0".repeat(64) },
  }), /not reproducible/u);
});
