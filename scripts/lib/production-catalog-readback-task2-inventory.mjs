import {
  catalogReadbackCanonicalSnapshot,
} from "../../packages/persistence/src/postgres/catalog-readback-canonical.js";
import path from "node:path";
import {
  SCHEMA_VERSION,
  canonicalJson,
  expectedFunctionIdentity,
  sha256,
} from "./outlook-production-aws-inventory-contract.mjs";
import {
  readInventoryEvidence as readTask2InventoryEvidence,
  validateInventoryEvidence,
} from "./outlook-production-aws-inventory-evidence.mjs";
import {
  exactProjectionAuditorEnvironment,
} from "./production-catalog-readback-task2-authority.mjs";
import {
  task3ExactKeys as exactKeys,
  task3Fail as fail,
} from "./production-catalog-readback-common.mjs";

const INVENTORY_DESCRIPTOR_KEYS = Object.freeze(["path"]);
const SOURCE_BINDING_NAMES = Object.freeze([
  "LAWOS_DEPLOYMENT_ARTIFACT_SHA256",
  "LAWOS_DEPLOYMENT_COMMIT",
  "LAWOS_DEPLOYMENT_TREE",
]);
const EXPECTED_FUNCTION = expectedFunctionIdentity(
  "lawos-production-projection-auditor",
);
export const TASK2_INVENTORY_MAX_CAPTURE_AGE_MS = 60 * 60 * 1000;

function invalid() {
  fail(
    "TASK3_TASK2_INVENTORY_INVALID",
    "Task 2 completion-bound inventory receipt is invalid",
  );
}

function exactSourcePresence(row) {
  const source = new Map(row.source_variables.map((entry) => [
    entry.name,
    entry,
  ]));
  return SOURCE_BINDING_NAMES.every((name) => {
    const entry = source.get(name);
    return entry?.status === "OBSERVED" && entry.present === true;
  });
}

function exactEnvironment(row) {
  return exactProjectionAuditorEnvironment(
    row.config_stable_projection.environment_key_inventory,
  );
}

function inventoryBinding(evidence, row) {
  return catalogReadbackCanonicalSnapshot({
    schema_version: evidence.schema_version,
    inventory_sha256: evidence.inventory_sha256,
    observed_at: evidence.observed_at,
    projection_auditor_row_sha256: sha256(canonicalJson(row)),
  });
}

function inventoryLocator(descriptor, evidence) {
  if (!path.isAbsolute(descriptor.path)) invalid();
  const bytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return catalogReadbackCanonicalSnapshot({
    path: descriptor.path,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
  });
}

export function validateTask2InventoryFresh(
  binding,
  approval,
  now = Date.now(),
) {
  const observedAt = Date.parse(binding?.observed_at);
  const signedAt = Date.parse(approval?.signed_at);
  const observedNow = Number(now);
  if (!Number.isFinite(observedAt) || !Number.isFinite(signedAt)
    || !Number.isFinite(observedNow)
    || observedAt > observedNow
    || signedAt > observedNow
    || observedAt > signedAt
    || observedNow - observedAt > TASK2_INVENTORY_MAX_CAPTURE_AGE_MS) {
    fail(
      "TASK3_TASK2_INVENTORY_STALE",
      "Task 2 inventory is outside the approval capture window",
    );
  }
  return binding;
}

export async function readAndValidateTask2CatalogReadbackInventory({
  descriptor,
  packet,
  artifacts,
  readInventoryEvidence = readTask2InventoryEvidence,
} = {}) {
  exactKeys(
    descriptor,
    INVENTORY_DESCRIPTOR_KEYS,
    "TASK3_TASK2_INVENTORY_INVALID",
    "Task 2 inventory descriptor",
  );
  if (typeof descriptor.path !== "string" || !descriptor.path
    || typeof readInventoryEvidence !== "function") invalid();

  let evidence;
  try {
    evidence = catalogReadbackCanonicalSnapshot(
      await readInventoryEvidence(descriptor.path),
    );
    validateInventoryEvidence(evidence);
  } catch {
    invalid();
  }
  if (evidence.outcome !== "PASS") {
    fail(
      "TASK3_TASK2_INVENTORY_NOT_PASS",
      "Task 2 inventory outcome is not PASS",
    );
  }
  const rows = evidence.functions.filter(
    ({ name }) => name === packet.target.function_name,
  );
  const row = rows[0];
  const expectedBinding = inventoryBinding(evidence, row);
  const stable = row?.config_stable_projection;
  const rollback = row?.rollback_code;
  if (evidence.schema_version !== SCHEMA_VERSION
    || evidence.profile !== "matter-readonly-auditor"
    || evidence.region !== packet.target.aws_region
    || evidence.identity.account_id !== packet.target.aws_account
    || evidence.identity.account_matches !== true
    || evidence.identity.readonly_role_matches !== true
    || evidence.cloudformation_stacks.join("\n") !== "lawos-production"
    || rows.length !== 1
    || row.status !== "PASS"
    || row.error_code !== null
    || row.function_arn_sha256 !== sha256(EXPECTED_FUNCTION.function_arn)
    || row.role_sha256 !== sha256(EXPECTED_FUNCTION.role_arn)
    || row.runtime !== EXPECTED_FUNCTION.runtime
    || row.handler !== EXPECTED_FUNCTION.handler
    || row.architecture.join("\n") !== EXPECTED_FUNCTION.architecture
    || row.revision_id !== packet.pre_state.revision_id
    || row.code.code_sha256_base64 !== packet.pre_state.code_sha256_base64
    || row.configuration_fingerprint_sha256
      !== packet.pre_state.configuration_fingerprint_sha256
    || row.non_code_configuration_fingerprint_sha256
      !== packet.pre_state.non_code_configuration_fingerprint_sha256
    || stable.function_name !== packet.target.function_name
    || stable.function_arn_sha256 !== row.function_arn_sha256
    || stable.role_sha256 !== row.role_sha256
    || stable.runtime !== row.runtime
    || stable.handler !== row.handler
    || stable.architectures.join("\n") !== row.architecture.join("\n")
    || stable.code_sha256_base64 !== row.code.code_sha256_base64
    || !exactEnvironment(row)
    || !exactSourcePresence(row)
    || row.direct_invoke.status !== "NOT_CONFIGURED"
    || row.direct_invoke.function_url_present !== false
    || rollback.status !== "CAPTURED"
    || rollback.code_sha256_base64 !== packet.rollback_artifact.code_sha256_base64
    || rollback.code_sha256_base64 !== packet.pre_state.code_sha256_base64
    || rollback.zip_sha256 !== packet.rollback_artifact.sha256
    || rollback.bytes !== packet.rollback_artifact.bytes
    || (artifacts !== undefined
      && (artifacts.rollback.path !== rollback.path
        || artifacts.rollback.manifest.path !== rollback.manifest_path))
    || canonicalJson(expectedBinding) !== canonicalJson(packet.task2_inventory)) {
    invalid();
  }
  return Object.freeze({
    binding: expectedBinding,
    validateLocator: inventoryLocator(descriptor, evidence),
  });
}
