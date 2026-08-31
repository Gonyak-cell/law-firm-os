#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contractPath = "contracts/desktop-file-bridge-contract.json";
const contract = JSON.parse(readFileSync(new URL(`../${contractPath}`, import.meta.url), "utf8"));
const allowedActionIds = [
  "file_bridge_status",
  "precheck_file_upload",
  "choose_file_for_upload",
  "cancel_file_upload",
  "upload_selected_file",
  "resume_pending_uploads",
  "save_document_as",
  "open_temp_preview",
  "attach_document_to_classic_outlook",
  "clear_temp_cache"
];
const forbiddenActions = [
  "directory_watch",
  "recursive_scan",
  "arbitrary_path_read",
  "arbitrary_path_write",
  "silent_upload",
  "silent_download",
  "persistent_path_retention",
  "unbounded_path_retention",
  "default_path_write",
  "renderer_selected_tenant",
  "renderer_selected_actor",
  "renderer_supplied_document_bytes"
];

assert.equal(contract.schema, "law-firm-os.desktop.file-bridge-contract.v0.6");
assert.equal(contract.product, "amic-os");
assert.equal(contract.status, "contract_active");
assert(Array.isArray(contract.allowed_actions), "allowed_actions must be an array");

const actualActionIds = contract.allowed_actions.map((action) => action.id).sort();
assert.deepEqual(actualActionIds, [...allowedActionIds].sort(), "allowed_actions must match the exact desktop file bridge allowlist");
const actionsById = new Map(contract.allowed_actions.map((action) => [action.id, action]));

for (const actionId of allowedActionIds) {
  const action = actionsById.get(actionId);
  assert(action, `missing allowed action ${actionId}`);
  assert.equal(action.may_scan_directory, false, `${actionId} must not scan directories`);
}

for (const actionId of [
  "precheck_file_upload",
  "save_document_as",
  "open_temp_preview",
  "attach_document_to_classic_outlook",
]) {
  assert.equal(actionsById.get(actionId).requires_backend_permission_precheck, true);
}
for (const actionId of ["choose_file_for_upload", "cancel_file_upload", "upload_selected_file"]) {
  assert.equal(actionsById.get(actionId).requires_bound_backend_preflight, true);
}
for (const actionId of [
  "choose_file_for_upload",
  "save_document_as",
  "open_temp_preview",
  "attach_document_to_classic_outlook",
]) {
  assert.equal(actionsById.get(actionId).requires_user_activation, true);
}

assert.equal(actionsById.get("choose_file_for_upload").requires_native_picker, true);
assert.equal(actionsById.get("choose_file_for_upload").may_retain_absolute_path_in_main_memory, true);
assert.equal(actionsById.get("choose_file_for_upload").path_retention_ttl_ms, 300000);
assert.equal(actionsById.get("upload_selected_file").requires_user_selected_handle, true);
assert.equal(actionsById.get("upload_selected_file").requires_file_identity_recheck, true);
assert.equal(actionsById.get("upload_selected_file").path_retention_ttl_ms, 300000);
assert.equal(actionsById.get("resume_pending_uploads").requires_backend_permission_precheck, true);
assert.equal(actionsById.get("resume_pending_uploads").requires_server_operation_binding, true);
assert.equal(actionsById.get("resume_pending_uploads").requires_encrypted_pending_binding, true);
assert.equal(actionsById.get("resume_pending_uploads").requires_operation_only_status_request, true);
assert.equal(actionsById.get("resume_pending_uploads").may_read_user_selected_file, false);
assert.equal(actionsById.get("resume_pending_uploads").may_retain_absolute_path_in_main_memory, false);
assert.equal(actionsById.get("cancel_file_upload").deletes_user_file, false);
assert.equal(actionsById.get("save_document_as").may_write_user_selected_path, true);
assert.equal(actionsById.get("save_document_as").requires_exact_version_binding, true);
assert.equal(actionsById.get("save_document_as").requires_main_process_binary_transport, true);
assert.equal(actionsById.get("save_document_as").requires_local_hash_and_size_recheck, true);
assert.equal(actionsById.get("save_document_as").requires_delivery_ack_after_write, true);
assert.equal(actionsById.get("open_temp_preview").direction, "download");
assert.equal(actionsById.get("open_temp_preview").requires_exact_version_binding, true);
assert.equal(actionsById.get("open_temp_preview").requires_main_process_binary_transport, true);
assert.equal(actionsById.get("open_temp_preview").requires_local_hash_and_size_recheck, true);
assert.equal(actionsById.get("open_temp_preview").requires_delivery_ack_after_open, true);
assert.equal(actionsById.get("open_temp_preview").requires_supported_mime_type, true);
assert.equal(actionsById.get("open_temp_preview").writes_protected_app_temp, true);
assert.equal(actionsById.get("open_temp_preview").bound_to_renderer_owner, true);
assert.equal(actionsById.get("open_temp_preview").may_retain_absolute_path_in_main_memory, true);
assert.equal(actionsById.get("open_temp_preview").path_retention_ttl_ms, 300000);
assert.equal(actionsById.get("attach_document_to_classic_outlook").direction, "download");
assert.equal(actionsById.get("attach_document_to_classic_outlook").requires_exact_version_binding, true);
assert.equal(actionsById.get("attach_document_to_classic_outlook").requires_main_process_binary_transport, true);
assert.equal(actionsById.get("attach_document_to_classic_outlook").requires_local_hash_and_size_recheck, true);
assert.equal(actionsById.get("attach_document_to_classic_outlook").requires_click_scoped_host_request, true);
assert.equal(actionsById.get("attach_document_to_classic_outlook").requires_same_user_named_pipe, true);
assert.equal(actionsById.get("attach_document_to_classic_outlook").requires_host_ack_after_attachment, true);
assert.equal(actionsById.get("attach_document_to_classic_outlook").requires_attached_receipt_after_host_ack, true);
assert.equal(actionsById.get("attach_document_to_classic_outlook").may_retain_absolute_path_in_main_memory, false);

const pathPolicy = contract.main_process_path_policy;
assert.equal(pathPolicy.absolute_path_storage_location, "process_memory_only");
assert.equal(pathPolicy.maximum_retention_ms, 300000);
for (const field of [
  "bound_to_renderer_owner",
  "bound_to_server_preflight",
  "cleared_on_upload_success",
  "cleared_on_cancel",
  "cleared_on_expiry",
  "cleared_on_app_quit"
]) assert.equal(pathPolicy[field], true, `path policy ${field} must be true`);
for (const field of ["persisted", "serialized", "logged", "renderer_visible"]) {
  assert.equal(pathPolicy[field], false, `path policy ${field} must be false`);
}

const previewPolicy = contract.protected_temp_preview_policy;
assert.equal(previewPolicy.root, "os-temp/amic-os-vault-preview-cache");
assert.equal(previewPolicy.root_mode_posix, "0700");
assert.equal(previewPolicy.file_mode_posix, "0600");
for (const field of [
  "exclusive_create",
  "mime_extension_allowlist",
  "bound_to_renderer_owner",
  "cleared_on_startup",
  "cleared_before_explicit_login",
  "cleared_on_logout",
  "cleared_on_tenant_switch",
  "cleared_on_expiry",
  "cleared_on_app_quit",
  "cleanup_retry_on_native_lock",
  "startup_retries_quit_residue"
]) assert.equal(previewPolicy[field], true, `temp preview policy ${field} must be true`);
assert.equal(previewPolicy.maximum_retention_ms, 300000);
for (const field of [
  "native_path_renderer_visible",
  "document_bytes_renderer_visible",
  "persistent_user_copy_created"
]) assert.equal(previewPolicy[field], false, `temp preview policy ${field} must be false`);

for (const forbiddenAction of forbiddenActions) {
  assert(contract.forbidden_actions.includes(forbiddenAction), `missing forbidden action ${forbiddenAction}`);
  assert(!actionsById.has(forbiddenAction), `${forbiddenAction} must not be allowed`);
}

assert.equal(contract.renderer_policy.raw_absolute_path_visible_to_renderer, false);
assert.equal(contract.renderer_policy.file_bytes_visible_to_renderer, false);
assert.equal(contract.renderer_policy.bridge_invokes_allowlist_required, true);
assert.equal(contract.renderer_policy.renderer_can_register_file_watchers, false);
assert.equal(contract.renderer_policy.renderer_can_select_tenant_or_actor, false);
assert.equal(contract.renderer_policy.renderer_can_supply_idempotency_key, false);
assert.equal(contract.implementation_status.active_preload_exposed, true);
assert.equal(contract.implementation_status.active_ipc_registered, true);
assert.equal(contract.implementation_status.bounded_handle_lifecycle_implemented, true);
assert.equal(contract.implementation_status.vault_upload_transport_connected, true);
assert.equal(contract.implementation_status.vault_download_transport_connected, true);
assert.equal(contract.implementation_status.vault_download_routes_main_process_only, true);
assert.equal(contract.implementation_status.vault_exact_version_headers_rechecked, true);
assert.equal(contract.implementation_status.vault_download_local_hash_rechecked, true);
assert.equal(contract.implementation_status.vault_delivery_ack_after_atomic_write, true);
assert.equal(contract.implementation_status.vault_preview_transport_connected, true);
assert.equal(contract.implementation_status.vault_preview_routes_main_process_only, true);
assert.equal(contract.implementation_status.vault_preview_exact_version_rechecked, true);
assert.equal(contract.implementation_status.vault_preview_local_hash_and_size_rechecked, true);
assert.equal(contract.implementation_status.vault_preview_protected_temp_implemented, true);
assert.equal(contract.implementation_status.vault_preview_session_lifecycle_cleanup_implemented, true);
assert.equal(contract.implementation_status.classic_outlook_attach_source_connected, true);
assert.equal(contract.implementation_status.classic_outlook_pipe_protocol_implemented, true);
assert.equal(contract.implementation_status.classic_outlook_renderer_secret_isolation_implemented, true);
assert.equal(contract.implementation_status.classic_outlook_attached_receipt_after_host_ack, true);
assert.equal(contract.implementation_status.hosted_vault_export_provider_connected, false);
assert.equal(contract.implementation_status.server_operation_binding_required, true);
assert.equal(contract.implementation_status.multipart_main_process_stream, true);
assert.equal(contract.implementation_status.exact_commit_readback_required, true);
assert.equal(contract.implementation_status.desktop_upload_routes_main_process_only, true);
assert.equal(contract.non_claims.production_file_bridge_ready, false);
assert.equal(contract.non_claims.public_release_ready, false);
assert.equal(contract.non_claims.owner_approval_recorded, false);
assert.equal(contract.non_claims.real_host_os_dialog_verified, false);
assert.equal(contract.non_claims.hosted_vault_export_provider_verified, false);

console.log(JSON.stringify({
  verdict: "PASS",
  contract: contractPath,
  allowed_actions: allowedActionIds,
  exact_allowlist: true,
  forbidden_actions_checked: forbiddenActions.length,
  path_policy: "bounded-main-process-memory-plus-protected-temp",
  maximum_path_retention_ms: pathPolicy.maximum_retention_ms,
  maximum_temp_preview_retention_ms: previewPolicy.maximum_retention_ms,
  renderer_raw_path_visible: false,
  vault_upload_transport_connected: true,
  vault_download_transport_connected: true,
  vault_preview_transport_connected: true,
  hosted_vault_export_provider_connected: false
}, null, 2));
