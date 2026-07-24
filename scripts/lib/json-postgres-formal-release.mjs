import { createHash } from "node:crypto";
import {
  validateJsonPostgresArtifactReproducibilityEvidence,
} from "./json-postgres-artifact-reproducibility.mjs";
import {
  validateJsonPostgresReleaseSecurityEvidence,
} from "./json-postgres-release-security.mjs";

export const JSON_POSTGRES_FORMAL_RELEASE_BUNDLE_VERSION =
  "law-firm-os.json-postgres-formal-release-bundle.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TAG = /^lawos-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const ARTIFACT_KINDS = Object.freeze([
  "macos-dmg",
  "macos-zip",
  "windows-installer",
  "windows-blockmap",
]);

function fail(message) {
  throw new Error(message);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value))
    .digest("hex");
}

function exactReceipt(receipt, kind, packet) {
  if (receipt?.valid !== true
    || receipt.signature_valid !== true
    || receipt.receipt_kind !== kind
    || receipt.execution_state !== "PASS"
    || receipt.source_sha !== packet.source_sha
    || receipt.source_tree !== packet.source_tree
    || receipt.packet_sha256 !== packet.packet_sha256
    || !SHA256.test(receipt.canonical_sha256 ?? "")) {
    fail(`formal release requires exact signed ${kind} PASS`);
  }
  return receipt;
}

function validateArtifacts(artifacts, packet) {
  if (!Array.isArray(artifacts)
    || artifacts.length !== ARTIFACT_KINDS.length
    || JSON.stringify(artifacts.map((item) => item.kind).sort())
      !== JSON.stringify([...ARTIFACT_KINDS].sort())) {
    fail("formal release artifact set is incomplete");
  }
  const names = new Set();
  for (const artifact of artifacts) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,159}$/u.test(artifact.name ?? "")
      || names.has(artifact.name)
      || !SHA256.test(artifact.sha256 ?? "")
      || !Number.isSafeInteger(artifact.byte_size)
      || artifact.byte_size < 1
      || artifact.source_sha !== packet.source_sha
      || artifact.source_tree !== packet.source_tree
      || (artifact.kind === "windows-blockmap"
        ? artifact.bound_to_signed_artifact !== true
        : artifact.native_signature_verified !== true)) {
      fail("formal release artifact binding or native signature state is invalid");
    }
    names.add(artifact.name);
  }
  return artifacts;
}

export function createJsonPostgresFormalReleaseBundle({
  packet,
  tag,
  artifacts,
  cut012Receipt,
  macosSigningReceipt,
  windowsSigningReceipt,
  reproducibility,
  security,
  sbomSha256,
  dependencyInventorySha256,
  provenanceSha256,
  checksumsSha256,
} = {}) {
  if (packet?.phase !== "w13-production-cutover"
    || !SHA1.test(packet.source_sha ?? "")
    || !SHA1.test(packet.source_tree ?? "")
    || !SHA256.test(packet.packet_sha256 ?? "")
    || !TAG.test(tag ?? "")) {
    fail("formal release exact packet or tag is invalid");
  }
  validateArtifacts(artifacts, packet);
  const cut012 = exactReceipt(cut012Receipt, "cut-012", packet);
  const macos = exactReceipt(macosSigningReceipt, "macos-signing", packet);
  const windows = exactReceipt(windowsSigningReceipt, "windows-signing", packet);
  if (cut012.claims?.json_authority_disabled !== true
    || macos.claims?.release !== false
    || windows.claims?.release !== false) {
    fail("formal release predecessor claims are invalid");
  }
  validateJsonPostgresArtifactReproducibilityEvidence(reproducibility, { packet });
  validateJsonPostgresReleaseSecurityEvidence(security, { packet });
  for (const [label, digest] of Object.entries({
    sbom: sbomSha256,
    dependency_inventory: dependencyInventorySha256,
    provenance: provenanceSha256,
    checksums: checksumsSha256,
  })) {
    if (!SHA256.test(digest ?? "")) fail(`formal release ${label} digest is invalid`);
  }
  const material = {
    schema_version: JSON_POSTGRES_FORMAL_RELEASE_BUNDLE_VERSION,
    outcome: "PASS",
    tag,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    artifact_sha256: packet.bindings.artifact_sha256,
    cut012_receipt_sha256: cut012.canonical_sha256,
    macos_signing_receipt_sha256: macos.canonical_sha256,
    windows_signing_receipt_sha256: windows.canonical_sha256,
    reproducibility_result_sha256: reproducibility.result_sha256,
    security_result_sha256: security.result_sha256,
    sbom_sha256: sbomSha256,
    dependency_inventory_sha256: dependencyInventorySha256,
    provenance_sha256: provenanceSha256,
    checksums_sha256: checksumsSha256,
    artifacts: artifacts.map((artifact) => ({ ...artifact })),
    safe_counts: {
      published_artifact_count: artifacts.length + 5,
      artifact_binding_failure_count: 0,
      publication_failure_count: 0,
      sensitive_material_finding_count: 0,
    },
    claims: {
      exact_main_package: true,
      deterministic_build_verified: true,
      sbom_verified: true,
      checksums_verified: true,
      provenance_verified: true,
      dependency_inventory_verified: true,
      sensitive_material_scan_passed: true,
      tag_created: false,
      artifacts_published: false,
      release: false,
      go_live: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({ ...material, bundle_sha256: sha256(material) });
}

export function createJsonPostgresFormalReleaseEvidence({
  packet,
  bundle,
  publication,
} = {}) {
  validateJsonPostgresFormalReleaseBundle(bundle, { packet });
  if (publication?.schema_version !== "law-firm-os.json-postgres-release-publication.v1"
    || publication.outcome !== "PASS"
    || publication.tag !== bundle.tag
    || publication.source_sha !== packet.source_sha
    || publication.source_tree !== packet.source_tree
    || publication.bundle_sha256 !== bundle.bundle_sha256
    || publication.tag_created !== true
    || publication.artifacts_published !== true
    || publication.published_artifact_count !== bundle.safe_counts.published_artifact_count
    || publication.publication_failure_count !== 0) {
    fail("formal release publication evidence is incomplete");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-formal-release-evidence.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    tag: bundle.tag,
    exact_main_package: true,
    deterministic_build_verified: true,
    sbom_verified: true,
    checksums_verified: true,
    provenance_verified: true,
    dependency_inventory_verified: true,
    sensitive_material_scan_passed: true,
    tag_created: true,
    artifacts_published: true,
    artifact_binding_failure_count: 0,
    publication_failure_count: 0,
    published_artifact_count: bundle.safe_counts.published_artifact_count,
    sbom_sha256: bundle.sbom_sha256,
    checksums_sha256: bundle.checksums_sha256,
    provenance_sha256: bundle.provenance_sha256,
    dependency_inventory_sha256: bundle.dependency_inventory_sha256,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function validateJsonPostgresFormalReleaseBundle(bundle, { packet } = {}) {
  if (bundle?.schema_version !== JSON_POSTGRES_FORMAL_RELEASE_BUNDLE_VERSION
    || bundle.outcome !== "PASS"
    || !TAG.test(bundle.tag ?? "")
    || !SHA1.test(bundle.source_sha ?? "")
    || !SHA1.test(bundle.source_tree ?? "")
    || !SHA256.test(bundle.packet_sha256 ?? "")
    || !SHA256.test(bundle.bundle_sha256 ?? "")
    || bundle.bundle_sha256 !== sha256((({ bundle_sha256: _, ...value }) => value)(bundle))
    || bundle.claims?.tag_created !== false
    || bundle.claims?.artifacts_published !== false
    || bundle.claims?.release !== false
    || bundle.claims?.go_live !== false
    || bundle.safe_counts?.artifact_binding_failure_count !== 0
    || bundle.safe_counts?.publication_failure_count !== 0
    || bundle.safe_counts?.sensitive_material_finding_count !== 0) {
    fail("formal release bundle is invalid");
  }
  if (packet && (bundle.source_sha !== packet.source_sha
    || bundle.source_tree !== packet.source_tree
    || bundle.packet_sha256 !== packet.packet_sha256
    || bundle.artifact_sha256 !== packet.bindings.artifact_sha256)) {
    fail("formal release bundle exact packet binding drifted");
  }
  validateArtifacts(bundle.artifacts, packet ?? bundle);
  return Object.freeze({
    valid: true,
    tag: bundle.tag,
    bundle_sha256: bundle.bundle_sha256,
    published_artifact_count: bundle.safe_counts.published_artifact_count,
  });
}

export function jsonPostgresFormalReleaseSha256(value) {
  return sha256(value);
}
