#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const contract = JSON.parse(await readFile("contracts/email-dms-m365-runtime-contract.json", "utf8"));
const core = JSON.parse(await readFile("contracts/email-dms-core-contract.json", "utf8"));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(contract.schema_version === "law-firm-os.email-dms-m365-runtime-contract.v0.1", "schema_version mismatch");
assert(contract.status === "decision_record_only", "status must be decision_record_only");
assert(contract.relationship_to_existing_contracts?.email_dms_core_contract_modified === false, "email-dms core contract must remain unmodified");
assert(contract.runtime_layer_ref === "contracts/runtime-readiness-contract.json", "runtime_layer_ref mismatch");
assert(contract.runtime_admission_gate?.implementation_allowed === false, "implementation_allowed must be false");
assert(contract.runtime_admission_gate?.storage_decision_resolved === true, "storage decision must be owner-resolved");
assert(contract.runtime_admission_gate?.privilege_classification_decision_resolved === true, "privilege decision must be owner-resolved");

for (const [key, value] of Object.entries(contract.no_runtime_attestation ?? {})) {
  assert(value === false, `no_runtime_attestation.${key} must be false`);
}

assert(core.program?.descriptor_only === true, "email-dms core contract must remain descriptor_only");
const noWrite = core.no_write_attestation;
assert(noWrite && typeof noWrite === "object", "email-dms core contract missing no_write_attestation");
for (const key of [
  "dispatches_email_runtime",
  "dispatches_office_native_runtime",
  "dispatches_sync_runtime",
  "dispatches_filing_runtime",
  "evaluates_runtime_permission",
  "writes_audit_event",
  "writes_product_state",
  "creates_database_rows",
  "updates_database_rows",
  "reads_object_storage",
  "writes_object_storage",
  "emits_hermes_runtime_receipt",
  "executes_command_runtime",
  "loads_real_fixture_data",
  "exposes_raw_payload",
  "promotes_claude_to_final_approval",
  "claims_enterprise_trust_from_local_validation",
]) {
  assert(noWrite[key] === false, `core no_write_attestation.${key} must remain false`);
}

assert(contract.technical_decisions?.authentication?.legacy_exchange_user_identity_tokens === "prohibited", "legacy tokens must be prohibited");
assert(JSON.stringify(contract.technical_decisions?.email_identity?.id_triple) === JSON.stringify(["graph_message_id", "internet_message_id", "conversation_id"]), "id_triple mismatch");
assert(contract.technical_decisions?.email_identity?.dedup_key === "internet_message_id", "dedup_key must be internet_message_id");
assert(contract.technical_decisions?.graph_surfaces?.files === "sharepoint_onedrive_original_storage_decided_runtime_pending", "Graph files surface must reflect the SharePoint/OneDrive owner decision while runtime remains pending");
assert(JSON.stringify(contract.technical_decisions?.smart_alerts?.send_modes) === JSON.stringify(["prompt_user", "soft_block", "block"]), "send_modes mismatch");
assert((contract.filing_flow ?? []).length === 11, "filing_flow must have 11 steps");
assert((contract.attachment_flow ?? []).length === 8, "attachment_flow must have 8 steps");
assert((contract.email_object_fields ?? []).length === 16, "email_object_fields must have 16 fields");
assert(contract.storage_dependency_partition?.storage_decision_ref === "docs/launch/g1-owner-decisions-2026-06-19.md#mat-dec-03", "storage_decision_ref mismatch");
assert(contract.storage_dependency_partition?.selected_original_storage === "sharepoint_onedrive", "selected original storage must be SharePoint/OneDrive");
for (const item of contract.storage_dependency_partition?.storage_dependent ?? []) {
  assert(item.blocked_until_storage_decision === false, `${item.id} must no longer be blocked by storage decision`);
  assert(item.remaining_gate === "m365_admin_graph_scope_and_runtime_evidence", `${item.id} must retain the M365 runtime evidence gate`);
}

if (errors.length > 0) {
  console.error("Email DMS M365 runtime contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Email DMS M365 runtime contract validation passed.");
console.log(`storage_dependent_items: ${contract.storage_dependency_partition.storage_dependent.length}`);
