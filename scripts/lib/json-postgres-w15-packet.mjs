import {
  JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS,
  createJsonPostgresExecutionPacket,
  validateJsonPostgresExecutionPacket,
} from "../../packages/persistence/src/postgres/execution-contract.js";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  validateHrxRelationalMappingManifest,
  validateHrxRelationalProductionInventory,
} from "../../packages/hrx/src/relational-projection-contract.js";
import {
  validateJsonPostgresProductionArtifactStoreTemplate,
  validateJsonPostgresProductionTemplate,
} from "./json-postgres-production-infrastructure.mjs";
import {
  jsonPostgresProductionCombinedTemplateSha256,
} from "./json-postgres-production-execution.mjs";
import {
  validateJsonPostgresW15BaselineManifest,
  validateJsonPostgresW15PredecessorVerification,
} from "./json-postgres-w15-preflight.mjs";

export const JSON_POSTGRES_W15_PACKET_INPUT_VERSION =
  "law-firm-os.json-postgres-execution-packet-input.v1";
export const JSON_POSTGRES_W15_PACKET_READINESS_VERSION =
  "law-firm-os.json-postgres-w15-packet-readiness.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const COMPUTED_BINDINGS = new Set([
  "artifact_sha256",
  "artifact_manifest_sha256",
  "lockfile_sha256",
]);
const INHERITED_BINDINGS = Object.freeze([
  "record_authority_sha256",
  "authority_manifest_sha256",
  "authority_bundle_sha256",
  "migration_manifest_sha256",
  "dms_object_manifest_sha256",
  "inventory_delta_policy_sha256",
  "transform_sha256",
  "dms_provider_contract_sha256",
  "backup_retention_contract_sha256",
  "post_write_runbook_sha256",
]);

function fail(message) {
  throw new Error(message);
}

function sameStringSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function assertSameProductionTarget(baselineTarget, executionTarget) {
  if (baselineTarget.aws_account !== executionTarget.aws_account
    || baselineTarget.aws_region !== executionTarget.aws_region
    || baselineTarget.monthly_cost_ceiling_krw
      !== executionTarget.monthly_cost_ceiling_krw
    || baselineTarget.public_access !== executionTarget.public_access
    || baselineTarget.tls_mode !== executionTarget.tls_mode
    || executionTarget.target_ref !== "lawos-production"
    || executionTarget.production !== true
    || executionTarget.isolated !== false
    || !sameStringSet(
      baselineTarget.approved_tenant_ids,
      executionTarget.approved_tenant_ids,
    )) {
    fail("W15 baseline target drifted from the completed production target");
  }
}

export function createJsonPostgresW15PacketInput({
  packetId,
  sourceSha,
  sourceTree,
  baseline,
  predecessorVerification,
  priorProductionPacket,
  mappingManifest,
  productionInventory,
  performanceAcceptance,
  artifactStoreTemplate,
  infrastructureTemplate,
} = {}) {
  if (!SHA1.test(sourceSha ?? "") || !SHA1.test(sourceTree ?? "")) {
    fail("W15 packet source SHA/tree is invalid");
  }
  const baselineValidation =
    validateJsonPostgresW15BaselineManifest(baseline);
  const predecessorValidation =
    validateJsonPostgresW15PredecessorVerification(predecessorVerification);
  if (baseline.predecessor_verification_sha256
      !== predecessorValidation.result_sha256
    || baseline.w12_terminal_receipt_sha256
      !== predecessorVerification.terminal_receipts["w12-terminal"]
    || baseline.cut012_terminal_receipt_sha256
      !== predecessorVerification.terminal_receipts["cut-012"]
    || baseline.go_live_receipt_sha256
      !== predecessorVerification.terminal_receipts["go-live"]) {
    fail("W15 baseline and terminal predecessor receipts drifted");
  }
  validateJsonPostgresExecutionPacket(priorProductionPacket, {
    phase: "w13-production-cutover",
  });
  assertSameProductionTarget(
    baselineValidation.target,
    priorProductionPacket.target,
  );
  validateHrxRelationalMappingManifest(mappingManifest);
  validateHrxRelationalProductionInventory(productionInventory);
  validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (mappingManifest.inventory_sha256 !== productionInventory.inventory_sha256
    || mappingManifest.performance_acceptance_sha256
      !== performanceAcceptance.acceptance_sha256
    || performanceAcceptance.record_count
      !== productionInventory.source_record_count
    || performanceAcceptance.tenant_count
      !== productionInventory.tenant_count) {
    fail("W15 mapping, inventory, and performance contracts drifted");
  }
  validateJsonPostgresProductionArtifactStoreTemplate(artifactStoreTemplate);
  validateJsonPostgresProductionTemplate(infrastructureTemplate);
  const infrastructureTemplateSha256 =
    jsonPostgresProductionCombinedTemplateSha256({
      artifactStoreTemplate,
      productionTemplate: infrastructureTemplate,
    });
  const inherited = Object.fromEntries(INHERITED_BINDINGS.map((key) => [
    key,
    priorProductionPacket.bindings[key],
  ]));
  const bindings = {
    artifact_sha256: "a".repeat(64),
    artifact_manifest_sha256: "b".repeat(64),
    lockfile_sha256: "c".repeat(64),
    migration_catalog_sha256: mappingManifest.migration_catalog_sha256,
    record_type_catalog_sha256:
      mappingManifest.record_type_catalog_sha256,
    ...inherited,
    field_crosswalk_sha256: mappingManifest.manifest_sha256,
    inventory_content_sha256: productionInventory.inventory_sha256,
    infrastructure_template_sha256: infrastructureTemplateSha256,
    performance_acceptance_sha256:
      performanceAcceptance.acceptance_sha256,
    w12_terminal_receipt_sha256:
      baseline.w12_terminal_receipt_sha256,
    cut012_terminal_receipt_sha256:
      baseline.cut012_terminal_receipt_sha256,
    go_live_receipt_sha256:
      baseline.go_live_receipt_sha256,
  };
  if (!sameStringSet(
    Object.keys(bindings),
    JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS,
  )) {
    fail("W15 execution binding set is incomplete");
  }
  createJsonPostgresExecutionPacket({
    packetId,
    sourceSha,
    sourceTree,
    phase: "w15-relational-projection",
    bindings,
    target: priorProductionPacket.target,
  });
  return Object.freeze({
    schema_version: JSON_POSTGRES_W15_PACKET_INPUT_VERSION,
    packet_id: packetId,
    phase: "w15-relational-projection",
    binding_sha256: Object.freeze(Object.fromEntries(
      Object.entries(bindings)
        .filter(([key]) => !COMPUTED_BINDINGS.has(key)),
    )),
    target: Object.freeze(structuredClone(priorProductionPacket.target)),
  });
}

export function createJsonPostgresW15PacketReadiness({
  sourceSha,
  sourceTree,
  packetInput,
  baseline,
  predecessorVerification,
  mappingManifest,
  productionInventory,
  performanceAcceptance,
  packetInputFileSha256,
} = {}) {
  if (!SHA1.test(sourceSha ?? "")
    || !SHA1.test(sourceTree ?? "")
    || packetInput?.schema_version !== JSON_POSTGRES_W15_PACKET_INPUT_VERSION
    || packetInput.phase !== "w15-relational-projection"
    || packetInput.binding_sha256.field_crosswalk_sha256
      !== mappingManifest?.manifest_sha256
    || packetInput.binding_sha256.inventory_content_sha256
      !== productionInventory?.inventory_sha256
    || packetInput.binding_sha256.performance_acceptance_sha256
      !== performanceAcceptance?.acceptance_sha256
    || packetInput.binding_sha256.w12_terminal_receipt_sha256
      !== baseline?.w12_terminal_receipt_sha256
    || packetInput.binding_sha256.cut012_terminal_receipt_sha256
      !== baseline?.cut012_terminal_receipt_sha256
    || packetInput.binding_sha256.go_live_receipt_sha256
      !== baseline?.go_live_receipt_sha256
    || predecessorVerification?.outcome !== "PASS"
    || !/^[0-9a-f]{64}$/u.test(packetInputFileSha256 ?? "")) {
    fail("W15 execution packet readiness binding is incomplete");
  }
  return Object.freeze({
    schema_version: JSON_POSTGRES_W15_PACKET_READINESS_VERSION,
    outcome: "READY_FOR_ARTIFACT_BUILD_AND_OWNER_SIGNATURE",
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_id: packetInput.packet_id,
    phase: packetInput.phase,
    packet_input_file_sha256: packetInputFileSha256,
    baseline_sha256: baseline.result_sha256,
    predecessor_verification_sha256:
      predecessorVerification.result_sha256,
    mapping_manifest_sha256: mappingManifest.manifest_sha256,
    production_inventory_sha256: productionInventory.inventory_sha256,
    performance_acceptance_sha256:
      performanceAcceptance.acceptance_sha256,
    required_terminal_receipt_count: 3,
    binding_count: Object.keys(packetInput.binding_sha256).length,
    external_actions_authorized: false,
    aws_mutated: false,
    postgres_mutated: false,
    production_write: false,
    authority_promotion: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  });
}
