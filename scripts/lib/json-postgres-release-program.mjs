import { createHash } from "node:crypto";
import {
  createJsonPostgresStageProbe,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";
import {
  validateJsonPostgresEventAcceptanceEvidence,
  validateJsonPostgresProductionSmokeEvidence,
} from "./json-postgres-production-smoke.mjs";
import {
  jsonPostgresProductionInfrastructureResultSha256,
} from "./json-postgres-production-execution.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TAG = /^lawos-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const ZERO_AUTHORITY_COUNTERS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
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

function exactPacket(packet) {
  if (!SHA1.test(packet?.source_sha ?? "")
    || !SHA1.test(packet?.source_tree ?? "")
    || !SHA256.test(packet?.packet_sha256 ?? "")
    || packet.phase !== "w13-production-cutover") {
    fail("release evidence requires an exact W13/W14 packet");
  }
  return packet;
}

function exactEvidence(value, packet, schemaVersion, label) {
  exactPacket(packet);
  if (value?.schema_version !== schemaVersion
    || value.outcome !== "PASS"
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== jsonPostgresReleaseEvidenceSha256(value)) {
    fail(`${label} evidence binding drifted`);
  }
  return value;
}

function monthlyCost(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 300_000) {
    fail("release monthly cost forecast is invalid");
  }
  return value;
}

function commonProbe({
  packet,
  probeId,
  stage,
  startedAt,
  finishedAt,
  checks,
  safeCounts,
  evidenceSha256,
}) {
  return createJsonPostgresStageProbe({
    probeId,
    stage,
    probeKind: stage,
    collectorRef: "collect-json-postgres-release-probe.mjs",
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: jsonPostgresProgramBindingsSha256(packet),
    startedAt,
    finishedAt,
    command: `node scripts/collect-json-postgres-release-probe.mjs --stage ${stage}`,
    checks,
    safeCounts,
    evidenceSha256,
  });
}

function exactArtifacts(artifacts, sourceSha, sourceTree, platform) {
  if (!Array.isArray(artifacts) || artifacts.length < 1) {
    fail(`${platform} signing evidence has no artifacts`);
  }
  const paths = new Set();
  for (const artifact of artifacts) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,159}$/u.test(artifact?.name ?? "")
      || paths.has(artifact.name)
      || !SHA256.test(artifact.sha256 ?? "")
      || !Number.isSafeInteger(artifact.byte_size)
      || artifact.byte_size < 1
      || artifact.source_sha !== sourceSha
      || artifact.source_tree !== sourceTree
      || artifact.platform !== platform
      || artifact.signed !== true) {
      fail(`${platform} signed artifact inventory is invalid`);
    }
    paths.add(artifact.name);
  }
  return artifacts;
}

export function createJsonPostgresMacosSigningEvidence({
  packet,
  build,
  artifacts,
} = {}) {
  exactPacket(packet);
  exactArtifacts(artifacts, packet.source_sha, packet.source_tree, "macos");
  if (build?.verdict !== "PASS"
    || build.source_sha !== packet.source_sha
    || build.source_tree !== packet.source_tree
    || build.source_dirty !== false
    || build.release_channel !== "formal"
    || build.signing_mode !== "developer-id"
    || build.developer_id_signature !== "pass"
    || build.codesign_verify !== "pass"
    || build.strict_codesign_verify !== "pass"
    || build.gatekeeper_assess !== "pass"
    || build.notarization_requested !== true
    || build.notarization_credential_source !== "present"
    || build.notarization_state !== "submitted_and_accepted_by_notarytool"
    || build.dmg_codesign_verify !== "pass"
    || build.dmg_notarization_state !== "submitted_and_accepted_by_notarytool"
    || build.dmg_stapler_validate !== "pass"
    || build.dmg_gatekeeper_assess !== "pass"
    || build.dmg_image_verify !== "pass") {
    fail("macOS formal build is not signed, notarized, stapled, and verified");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-macos-signing-evidence.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    artifact_count: artifacts.length,
    artifact_inventory_sha256: sha256(artifacts),
    developer_id_signed: true,
    notarization_passed: true,
    stapling_passed: true,
    signature_verified: true,
    sensitive_material_finding_count: 0,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function createJsonPostgresWindowsSigningEvidence({
  packet,
  build,
  artifacts,
} = {}) {
  exactPacket(packet);
  exactArtifacts(artifacts, packet.source_sha, packet.source_tree, "windows");
  if (build?.verdict !== "PASS"
    || build.installer_source_sha !== packet.source_sha
    || build.installer_source_tree !== packet.source_tree
    || build.release_channel !== "formal"
    || build.windows_authenticode_signing !== true
    || build.windows_authenticode_timestamp_verified !== true
    || build.windows_authenticode_signature_verified !== true
    || build.installer_formal_marker !== true) {
    fail("Windows formal installer is not Authenticode signed and timestamp verified");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-windows-signing-evidence.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    artifact_count: artifacts.length,
    artifact_inventory_sha256: sha256(artifacts),
    authenticode_signed: true,
    timestamp_verified: true,
    signature_verified: true,
    sensitive_material_finding_count: 0,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function createJsonPostgresMacosSigningProbe({
  packet,
  evidence,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  exactEvidence(
    evidence,
    packet,
    "law-firm-os.json-postgres-macos-signing-evidence.v1",
    "macOS signing",
  );
  if (evidence.developer_id_signed !== true
    || evidence.notarization_passed !== true
    || evidence.stapling_passed !== true
    || evidence.signature_verified !== true
    || evidence.sensitive_material_finding_count !== 0
    || !SHA256.test(evidence.artifact_inventory_sha256 ?? "")
    || !Number.isSafeInteger(evidence.artifact_count)
    || evidence.artifact_count < 1) {
    fail("macOS signing evidence is incomplete");
  }
  return commonProbe({
    packet,
    probeId,
    stage: "macos-signing",
    startedAt,
    finishedAt,
    checks: {
      exact_main_package: true,
      developer_id_signed: true,
      notarization_passed: true,
      stapling_passed: true,
      signature_verified: true,
    },
    safeCounts: {
      signed_artifact_count: evidence.artifact_count,
      signing_failure_count: 0,
      sensitive_material_finding_count: 0,
      monthly_cost_forecast_krw: monthlyCost(monthlyCostForecastKrw),
    },
    evidenceSha256: evidence.result_sha256,
  });
}

export function createJsonPostgresWindowsSigningProbe({
  packet,
  evidence,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  exactEvidence(
    evidence,
    packet,
    "law-firm-os.json-postgres-windows-signing-evidence.v1",
    "Windows signing",
  );
  if (evidence.authenticode_signed !== true
    || evidence.timestamp_verified !== true
    || evidence.signature_verified !== true
    || evidence.sensitive_material_finding_count !== 0
    || !SHA256.test(evidence.artifact_inventory_sha256 ?? "")
    || !Number.isSafeInteger(evidence.artifact_count)
    || evidence.artifact_count < 1) {
    fail("Windows signing evidence is incomplete");
  }
  return commonProbe({
    packet,
    probeId,
    stage: "windows-signing",
    startedAt,
    finishedAt,
    checks: {
      exact_main_package: true,
      authenticode_signed: true,
      timestamp_verified: true,
      signature_verified: true,
    },
    safeCounts: {
      signed_artifact_count: evidence.artifact_count,
      signing_failure_count: 0,
      sensitive_material_finding_count: 0,
      monthly_cost_forecast_krw: monthlyCost(monthlyCostForecastKrw),
    },
    evidenceSha256: evidence.result_sha256,
  });
}

export function createJsonPostgresFormalReleaseProbe({
  packet,
  evidence,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  exactEvidence(
    evidence,
    packet,
    "law-firm-os.json-postgres-formal-release-evidence.v1",
    "formal release",
  );
  if (!TAG.test(evidence.tag ?? "")
    || evidence.exact_main_package !== true
    || evidence.deterministic_build_verified !== true
    || evidence.sbom_verified !== true
    || evidence.checksums_verified !== true
    || evidence.provenance_verified !== true
    || evidence.dependency_inventory_verified !== true
    || evidence.sensitive_material_scan_passed !== true
    || evidence.tag_created !== true
    || evidence.artifacts_published !== true
    || evidence.artifact_binding_failure_count !== 0
    || evidence.publication_failure_count !== 0
    || !Number.isSafeInteger(evidence.published_artifact_count)
    || evidence.published_artifact_count < 4
    || ["sbom_sha256", "checksums_sha256", "provenance_sha256", "dependency_inventory_sha256"]
      .some((key) => !SHA256.test(evidence[key] ?? ""))) {
    fail("formal release evidence is incomplete");
  }
  return commonProbe({
    packet,
    probeId,
    stage: "formal-release",
    startedAt,
    finishedAt,
    checks: {
      exact_main_package: true,
      deterministic_build_verified: true,
      sbom_verified: true,
      checksums_verified: true,
      provenance_verified: true,
      dependency_inventory_verified: true,
      sensitive_material_scan_passed: true,
      tag_created: true,
      artifacts_published: true,
    },
    safeCounts: {
      published_artifact_count: evidence.published_artifact_count,
      artifact_binding_failure_count: 0,
      publication_failure_count: 0,
      monthly_cost_forecast_krw: monthlyCost(monthlyCostForecastKrw),
    },
    evidenceSha256: evidence.result_sha256,
  });
}

export function createJsonPostgresGoLiveProbe({
  packet,
  evidence,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  exactEvidence(
    evidence,
    packet,
    "law-firm-os.json-postgres-go-live-evidence.v1",
    "go-live",
  );
  if (evidence.signed_artifacts_deployed !== true
    || evidence.production_smoke_passed !== true
    || evidence.tenant_isolation_passed !== true
    || evidence.internal_email_auth_passed !== true
    || evidence.critical_domain_flows_passed !== true
    || evidence.dms_passed !== true
    || evidence.audit_outbox_passed !== true
    || evidence.backup_visible !== true
    || evidence.cut_012_verified !== true
    || evidence.traffic_activated !== true
    || evidence.event_based_acceptance_passed !== true
    || evidence.critical_flow_failure_count !== 0
    || evidence.active_stop_condition_count !== 0
    || ZERO_AUTHORITY_COUNTERS.some((key) => evidence[key] !== 0)) {
    fail("go-live evidence is incomplete or a stop condition is active");
  }
  return commonProbe({
    packet,
    probeId,
    stage: "go-live",
    startedAt,
    finishedAt,
    checks: {
      signed_artifacts_deployed: true,
      production_smoke_passed: true,
      tenant_isolation_passed: true,
      internal_email_auth_passed: true,
      critical_domain_flows_passed: true,
      dms_passed: true,
      audit_outbox_passed: true,
      backup_visible: true,
      cut_012_verified: true,
      traffic_activated: true,
      event_based_acceptance_passed: true,
    },
    safeCounts: {
      ...Object.fromEntries(ZERO_AUTHORITY_COUNTERS.map((key) => [key, 0])),
      critical_flow_failure_count: 0,
      active_stop_condition_count: 0,
      monthly_cost_forecast_krw: monthlyCost(monthlyCostForecastKrw),
    },
    evidenceSha256: evidence.result_sha256,
  });
}

export function createJsonPostgresGoLiveEvidence({
  packet,
  cut012Receipt,
  formalReleaseReceipt,
  trafficActivation,
  smoke,
  eventAcceptance,
} = {}) {
  exactPacket(packet);
  if (cut012Receipt?.valid !== true
    || cut012Receipt.signature_valid !== true
    || cut012Receipt.receipt_kind !== "cut-012"
    || cut012Receipt.execution_state !== "PASS"
    || cut012Receipt.source_sha !== packet.source_sha
    || cut012Receipt.source_tree !== packet.source_tree
    || cut012Receipt.packet_sha256 !== packet.packet_sha256
    || cut012Receipt.claims?.json_authority_disabled !== true
    || formalReleaseReceipt?.valid !== true
    || formalReleaseReceipt.signature_valid !== true
    || formalReleaseReceipt.receipt_kind !== "formal-release"
    || formalReleaseReceipt.execution_state !== "PASS"
    || formalReleaseReceipt.source_sha !== packet.source_sha
    || formalReleaseReceipt.source_tree !== packet.source_tree
    || formalReleaseReceipt.packet_sha256 !== packet.packet_sha256
    || formalReleaseReceipt.claims?.release !== true
    || formalReleaseReceipt.claims?.go_live !== false) {
    fail("go-live requires exact signed CUT-012 and formal-release PASS receipts");
  }
  if (trafficActivation?.schema_version
      !== "law-firm-os.json-postgres-production-infrastructure-result.v1"
    || trafficActivation.operation !== "execute-go-live-change-set"
    || trafficActivation.outcome !== "PASS"
    || trafficActivation.source_sha !== packet.source_sha
    || trafficActivation.source_tree !== packet.source_tree
    || trafficActivation.packet_sha256 !== packet.packet_sha256
    || trafficActivation.production_traffic_enabled !== true
    || trafficActivation.temporary_eni_allow_count !== 0
    || !SHA256.test(trafficActivation.result_sha256 ?? "")
    || trafficActivation.result_sha256
      !== jsonPostgresProductionInfrastructureResultSha256(trafficActivation)) {
    fail("go-live traffic activation evidence is incomplete");
  }
  validateJsonPostgresProductionSmokeEvidence(smoke, { packet });
  validateJsonPostgresEventAcceptanceEvidence(eventAcceptance, { packet });
  const material = {
    schema_version: "law-firm-os.json-postgres-go-live-evidence.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    cut012_receipt_sha256: cut012Receipt.canonical_sha256,
    formal_release_receipt_sha256: formalReleaseReceipt.canonical_sha256,
    traffic_activation_result_sha256: trafficActivation.result_sha256,
    production_smoke_result_sha256: smoke.result_sha256,
    event_acceptance_result_sha256: eventAcceptance.result_sha256,
    signed_artifacts_deployed: true,
    production_smoke_passed: true,
    tenant_isolation_passed: true,
    internal_email_auth_passed: true,
    critical_domain_flows_passed: true,
    dms_passed: true,
    audit_outbox_passed: true,
    backup_visible: true,
    cut_012_verified: true,
    traffic_activated: true,
    event_based_acceptance_passed: true,
    critical_flow_failure_count: 0,
    active_stop_condition_count: 0,
    ...Object.fromEntries(ZERO_AUTHORITY_COUNTERS.map((key) => [key, 0])),
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function jsonPostgresReleaseEvidenceSha256(value = {}) {
  const { result_sha256: ignored, ...material } = value;
  return sha256(material);
}
