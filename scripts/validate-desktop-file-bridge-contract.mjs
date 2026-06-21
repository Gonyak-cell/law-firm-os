#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contractPath = "contracts/desktop-file-bridge-contract.json";
const contract = JSON.parse(readFileSync(contractPath, "utf8"));

const allowedActionIds = [
  "choose_file_for_upload",
  "save_document_as",
  "open_temp_preview",
  "clear_temp_cache"
];

const forbiddenActions = [
  "directory_watch",
  "recursive_scan",
  "arbitrary_path_read",
  "arbitrary_path_write",
  "silent_upload",
  "silent_download",
  "path_retention",
  "default_path_write"
];

assert.equal(contract.schema, "law-firm-os.desktop.file-bridge-contract.v0.1");
assert.equal(contract.product, "mater");
assert.equal(contract.status, "contract_active");
assert(Array.isArray(contract.allowed_actions), "allowed_actions must be an array");

const actualActionIds = contract.allowed_actions.map((action) => action.id).sort();
assert.deepEqual(actualActionIds, [...allowedActionIds].sort(), "allowed_actions must match the exact desktop file bridge allowlist");

const actionsById = new Map(contract.allowed_actions.map((action) => [action.id, action]));

for (const actionId of allowedActionIds) {
  const action = actionsById.get(actionId);
  assert(action, `missing allowed action ${actionId}`);
  assert.equal(action.may_scan_directory, false, `${actionId} must not scan directories`);
  assert.equal(action.may_retain_absolute_path, false, `${actionId} must not retain absolute paths`);
}

for (const actionId of ["choose_file_for_upload", "save_document_as", "open_temp_preview"]) {
  const action = actionsById.get(actionId);
  assert.equal(action.requires_user_gesture, true, `${actionId} must require user gesture`);
  assert.equal(action.requires_backend_permission_precheck, true, `${actionId} must require backend permission precheck`);
  assert.equal(action.requires_audit_event, true, `${actionId} must require audit event`);
}

assert.equal(actionsById.get("choose_file_for_upload").requires_native_picker, true);
assert.equal(actionsById.get("choose_file_for_upload").may_read_user_selected_file, true);
assert.equal(actionsById.get("choose_file_for_upload").may_write_user_selected_path, false);

assert.equal(actionsById.get("save_document_as").requires_native_picker, true);
assert.equal(actionsById.get("save_document_as").may_read_user_selected_file, false);
assert.equal(actionsById.get("save_document_as").may_write_user_selected_path, true);

assert.equal(actionsById.get("open_temp_preview").requires_native_picker, false);
assert.equal(actionsById.get("open_temp_preview").may_read_user_selected_file, false);
assert.equal(actionsById.get("open_temp_preview").may_write_user_selected_path, false);

assert.equal(actionsById.get("clear_temp_cache").requires_user_gesture, false);
assert.equal(actionsById.get("clear_temp_cache").requires_backend_permission_precheck, false);
assert.equal(actionsById.get("clear_temp_cache").requires_audit_event, true);

for (const forbiddenAction of forbiddenActions) {
  assert(contract.forbidden_actions.includes(forbiddenAction), `missing forbidden action ${forbiddenAction}`);
  assert(!actionsById.has(forbiddenAction), `${forbiddenAction} must not be allowed`);
}

assert.equal(contract.renderer_policy.raw_absolute_path_visible_to_renderer, false);
assert.equal(contract.renderer_policy.file_bytes_visible_to_renderer, false);
assert.equal(contract.renderer_policy.bridge_invokes_allowlist_required, true);
assert.equal(contract.renderer_policy.renderer_can_register_file_watchers, false);
assert.equal(contract.non_claims.implementation_complete, false);
assert.equal(contract.non_claims.production_file_bridge_ready, false);
assert.equal(contract.non_claims.public_release_ready, false);
assert.equal(contract.non_claims.owner_approval_recorded, false);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      contract: contractPath,
      allowed_actions: allowedActionIds,
      exact_allowlist: true,
      forbidden_actions_checked: forbiddenActions.length,
      renderer_raw_path_visible: false,
      implementation_complete_claim: false
    },
    null,
    2
  )
);
