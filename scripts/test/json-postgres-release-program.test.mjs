import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresFormalReleaseProbe,
  createJsonPostgresGoLiveEvidence,
  createJsonPostgresGoLiveProbe,
  createJsonPostgresMacosSigningEvidence,
  createJsonPostgresMacosSigningProbe,
  createJsonPostgresWindowsSigningEvidence,
  createJsonPostgresWindowsSigningProbe,
  jsonPostgresReleaseEvidenceSha256,
} from "../lib/json-postgres-release-program.mjs";
import {
  JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS,
  JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS,
  createJsonPostgresEventAcceptanceComponent,
  createJsonPostgresEventAcceptanceEvidence,
  createJsonPostgresProductionSmokeComponent,
  createJsonPostgresProductionSmokeEvidence,
} from "../lib/json-postgres-production-smoke.mjs";
import {
  jsonPostgresProductionInfrastructureResultSha256,
} from "../lib/json-postgres-production-execution.mjs";

const packet = {
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  phase: "w13-production-cutover",
  bindings: { artifact_sha256: "d".repeat(64) },
  target: { target_ref: "lawos-production" },
};
const artifact = (platform, name) => ({
  name,
  sha256: "e".repeat(64),
  byte_size: 100,
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  platform,
  signed: true,
});
const time = {
  startedAt: "2026-07-23T00:00:00.000Z",
  finishedAt: "2026-07-23T00:01:00.000Z",
  monthlyCostForecastKrw: 269100,
};

test("macOS and Windows signing probes require exact native signature evidence", () => {
  const mac = createJsonPostgresMacosSigningEvidence({
    packet,
    artifacts: [artifact("macos", "matter.dmg")],
    build: {
      verdict: "PASS",
      source_sha: packet.source_sha,
      source_tree: packet.source_tree,
      source_dirty: false,
      release_channel: "formal",
      signing_mode: "developer-id",
      developer_id_signature: "pass",
      codesign_verify: "pass",
      strict_codesign_verify: "pass",
      gatekeeper_assess: "pass",
      notarization_requested: true,
      notarization_credential_source: "present",
      notarization_state: "submitted_and_accepted_by_notarytool",
      dmg_codesign_verify: "pass",
      dmg_notarization_state: "submitted_and_accepted_by_notarytool",
      dmg_stapler_validate: "pass",
      dmg_gatekeeper_assess: "pass",
      dmg_image_verify: "pass",
    },
  });
  const windows = createJsonPostgresWindowsSigningEvidence({
    packet,
    artifacts: [artifact("windows", "matter-win-x64.exe")],
    build: {
      verdict: "PASS",
      installer_source_sha: packet.source_sha,
      installer_source_tree: packet.source_tree,
      release_channel: "formal",
      windows_authenticode_signing: true,
      windows_authenticode_timestamp_verified: true,
      windows_authenticode_signature_verified: true,
      installer_formal_marker: true,
    },
  });
  assert.equal(createJsonPostgresMacosSigningProbe({
    packet,
    evidence: mac,
    probeId: "macos-signing-001",
    ...time,
  }).outcome, "PASS");
  assert.equal(createJsonPostgresWindowsSigningProbe({
    packet,
    evidence: windows,
    probeId: "windows-signing-001",
    ...time,
  }).outcome, "PASS");
  assert.throws(() => createJsonPostgresWindowsSigningEvidence({
    packet,
    artifacts: [artifact("windows", "unsigned.exe")],
    build: {
      verdict: "PASS",
      installer_source_sha: packet.source_sha,
      installer_source_tree: packet.source_tree,
      release_channel: "formal",
      windows_authenticode_signing: false,
    },
  }), /not Authenticode signed/u);
});

test("formal release and go-live remain separate exact evidence gates", () => {
  const releaseMaterial = {
    schema_version: "law-firm-os.json-postgres-formal-release-evidence.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    tag: "lawos-v1.0.0",
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
    published_artifact_count: 6,
    sbom_sha256: "1".repeat(64),
    checksums_sha256: "2".repeat(64),
    provenance_sha256: "3".repeat(64),
    dependency_inventory_sha256: "4".repeat(64),
  };
  const release = {
    ...releaseMaterial,
    result_sha256: jsonPostgresReleaseEvidenceSha256(releaseMaterial),
  };
  assert.equal(createJsonPostgresFormalReleaseProbe({
    packet,
    evidence: release,
    probeId: "formal-release-001",
    ...time,
  }).outcome, "PASS");

  const authority = Object.fromEntries([
    "json_fallback_count",
    "json_writer_count",
    "dual_write_count",
    "file_current_authority_count",
    "offline_mutation_count",
    "memory_fallback_count",
  ].map((key) => [key, 0]));
  const goLiveMaterial = {
    schema_version: "law-firm-os.json-postgres-go-live-evidence.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
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
    ...authority,
  };
  const goLive = {
    ...goLiveMaterial,
    result_sha256: jsonPostgresReleaseEvidenceSha256(goLiveMaterial),
  };
  assert.equal(createJsonPostgresGoLiveProbe({
    packet,
    evidence: goLive,
    probeId: "go-live-001",
    ...time,
  }).outcome, "PASS");
  assert.throws(() => createJsonPostgresGoLiveProbe({
    packet,
    evidence: { ...goLive, traffic_activated: false },
    probeId: "go-live-002",
    ...time,
  }), /binding drifted|stop condition/u);
});

test("go-live evidence requires independent CUT-012, release, traffic, smoke, and event acceptance", () => {
  const cut012 = {
    valid: true,
    signature_valid: true,
    receipt_kind: "cut-012",
    execution_state: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    canonical_sha256: "5".repeat(64),
    claims: { json_authority_disabled: true },
  };
  const formal = {
    ...cut012,
    receipt_kind: "formal-release",
    canonical_sha256: "6".repeat(64),
    claims: { release: true, go_live: false },
  };
  const trafficMaterial = {
    schema_version: "law-firm-os.json-postgres-production-infrastructure-result.v1",
    operation: "execute-go-live-change-set",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    production_traffic_enabled: true,
    temporary_eni_allow_count: 0,
  };
  const traffic = {
    ...trafficMaterial,
    result_sha256: jsonPostgresProductionInfrastructureResultSha256(trafficMaterial),
  };
  const zeros = Object.fromEntries([
    "json_fallback_count",
    "json_writer_count",
    "dual_write_count",
    "file_current_authority_count",
    "offline_mutation_count",
    "memory_fallback_count",
  ].map((key) => [key, 0]));
  const smoke = createJsonPostgresProductionSmokeEvidence({
    packet,
    components: JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS.map((component, index) =>
      createJsonPostgresProductionSmokeComponent({
        packet,
        component,
        observedAt: "2026-07-23T00:00:00.000Z",
        observedEventCount: 1,
        externalEvidenceSha256: String(index + 1).repeat(64),
      })),
    authorityCounters: zeros,
  });
  const acceptance = createJsonPostgresEventAcceptanceEvidence({
    packet,
    components: JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS.map((component, index) =>
      createJsonPostgresEventAcceptanceComponent({
        packet,
        component,
        observedAt: "2026-07-23T00:00:00.000Z",
        observedEventCount: 1,
        externalEvidenceSha256: String(index + 6).repeat(64),
      })),
  });
  const evidence = createJsonPostgresGoLiveEvidence({
    packet,
    cut012Receipt: cut012,
    formalReleaseReceipt: formal,
    trafficActivation: traffic,
    smoke,
    eventAcceptance: acceptance,
  });
  assert.equal(evidence.traffic_activated, true);
  assert.throws(() => createJsonPostgresGoLiveEvidence({
    packet,
    cut012Receipt: cut012,
    formalReleaseReceipt: formal,
    trafficActivation: traffic,
    smoke,
    eventAcceptance: { ...acceptance, failed_event_count: 1 },
  }), /event acceptance evidence is invalid/u);
});
