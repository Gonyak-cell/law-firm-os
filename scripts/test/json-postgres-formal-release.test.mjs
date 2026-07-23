import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresArtifactReproducibilityEvidence,
} from "../lib/json-postgres-artifact-reproducibility.mjs";
import {
  createJsonPostgresFormalReleaseBundle,
  createJsonPostgresFormalReleaseEvidence,
  validateJsonPostgresFormalReleaseBundle,
} from "../lib/json-postgres-formal-release.mjs";
import {
  createJsonPostgresReleaseSecurityEvidence,
} from "../lib/json-postgres-release-security.mjs";

const artifactBytes = Buffer.from("formal-release-exact-artifact");
const packet = {
  phase: "w13-production-cutover",
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  bindings: {
    artifact_sha256: createHash("sha256").update(artifactBytes).digest("hex"),
  },
};
const receipt = (kind, claims = {}) => ({
  valid: true,
  signature_valid: true,
  receipt_kind: kind,
  execution_state: "PASS",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  canonical_sha256: `${kind.length}`.repeat(64).slice(0, 64),
  claims: {
    json_authority_disabled: kind === "cut-012",
    release: false,
    ...claims,
  },
});
const artifacts = [
  "macos-dmg",
  "macos-zip",
  "windows-installer",
  "windows-blockmap",
].map((kind, index) => ({
  kind,
  name: `${kind}-${index}`,
  sha256: String(index + 1).repeat(64),
  byte_size: 100 + index,
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  ...(kind === "windows-blockmap"
    ? { bound_to_signed_artifact: true }
    : { native_signature_verified: true }),
}));
const artifactManifest = {
  schema_version: "law-firm-os.json-postgres-production-artifact.v1",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
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
  secrets_in_environment: false,
  production_ready_claim: false,
  artifact_sha256: packet.bindings.artifact_sha256,
};
const reproducibility = createJsonPostgresArtifactReproducibilityEvidence({
  sourceSha: packet.source_sha,
  sourceTree: packet.source_tree,
  firstArtifact: artifactBytes,
  secondArtifact: artifactBytes,
  firstManifest: artifactManifest,
  secondManifest: structuredClone(artifactManifest),
});
const security = createJsonPostgresReleaseSecurityEvidence({
  packet,
  cut008Receipt: {
    ...receipt("cut-008"),
    safe_counts: { required_postgres_test_skip_count: 0 },
  },
  checkRuns: [
    {
      name: "JSON PostgreSQL exact-head security",
      head_sha: packet.source_sha,
      status: "completed",
      conclusion: "success",
      app: { slug: "github-actions" },
    },
    {
      name: "HRX rollout validation",
      head_sha: packet.source_sha,
      status: "completed",
      conclusion: "success",
      app: { slug: "github-actions" },
    },
    {
      name: "CodeQL / Analyze (javascript-typescript)",
      head_sha: packet.source_sha,
      status: "completed",
      conclusion: "success",
      app: { slug: "github-code-scanning" },
    },
  ],
  codeAlerts: [],
  dependencyAlerts: [],
  secretAlerts: [],
});

test("formal release bundle accepts only four exact native-verified artifacts", () => {
  const bundle = createJsonPostgresFormalReleaseBundle({
    packet,
    tag: "lawos-v1.0.0",
    artifacts,
    cut012Receipt: receipt("cut-012"),
    macosSigningReceipt: receipt("macos-signing"),
    windowsSigningReceipt: receipt("windows-signing"),
    reproducibility,
    security,
    sbomSha256: "1".repeat(64),
    dependencyInventorySha256: "2".repeat(64),
    provenanceSha256: "3".repeat(64),
    checksumsSha256: "4".repeat(64),
  });
  assert.equal(validateJsonPostgresFormalReleaseBundle(bundle, { packet }).valid, true);
  const publication = {
    schema_version: "law-firm-os.json-postgres-release-publication.v1",
    outcome: "PASS",
    tag: bundle.tag,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    bundle_sha256: bundle.bundle_sha256,
    tag_created: true,
    artifacts_published: true,
    published_artifact_count: bundle.safe_counts.published_artifact_count,
    publication_failure_count: 0,
  };
  assert.equal(createJsonPostgresFormalReleaseEvidence({
    packet,
    bundle,
    publication,
  }).artifacts_published, true);
});

test("formal release rejects unsigned Windows or a pre-claimed publication", () => {
  assert.throws(() => createJsonPostgresFormalReleaseBundle({
    packet,
    tag: "lawos-v1.0.0",
    artifacts: artifacts.map((item) => item.kind === "windows-installer"
      ? { ...item, native_signature_verified: false }
      : item),
    cut012Receipt: receipt("cut-012"),
    macosSigningReceipt: receipt("macos-signing"),
    windowsSigningReceipt: receipt("windows-signing"),
    reproducibility,
    security,
    sbomSha256: "1".repeat(64),
    dependencyInventorySha256: "2".repeat(64),
    provenanceSha256: "3".repeat(64),
    checksumsSha256: "4".repeat(64),
  }), /native signature/u);
});
