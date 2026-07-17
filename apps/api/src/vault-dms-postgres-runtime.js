import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";

export const VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY = Object.freeze({
  schema_version: "law-firm-os.vault-dms-postgres-boundary.v0.2",
  source_only: true,
  api_authority_active: false,
  provider_approved: false,
  staging_migration_executed: false,
  production_migration_executed: false,
  production_ready_claim: false,
  file_json_authority_active: true,
  postgres_mutable_schema: "lawos_dms",
  lawos_domain_mutable_write_allowed: false,
  dual_write_allowed: false,
  global_postgres_authority_active: false,
  allowed_claim: "DMS_SOURCE_CHECKPOINT_VERIFIED",
});

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function decodeBase64(value) {
  if (typeof value !== "string") throw new TypeError("bytes_base64 is required");
  const encoded = value;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
    throw new TypeError("bytes_base64 is not valid base64");
  }
  return Buffer.from(encoded, "base64");
}

export function createVaultDmsPostgresRuntime(options = {}) {
  const uploadRuntime = createPostgresDmsUploadRuntime(options);
  return Object.freeze({
    boundary: VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY,
    upload_runtime: uploadRuntime,
  });
}

export async function handleVaultDmsPostgresCommand({ runtime, command, payload = {} } = {}) {
  if (runtime?.boundary !== VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY || runtime?.upload_runtime?.source_only !== true) {
    throw new TypeError("source-only Vault DMS PostgreSQL runtime is required");
  }
  const operation = requiredText(command, "command");
  let result;
  if (operation === "create_upload_session") {
    result = await runtime.upload_runtime.createUploadSession(payload);
  } else if (operation === "stage_upload") {
    result = await runtime.upload_runtime.stageUpload({
      tenant_id: payload.tenant_id,
      session_id: payload.session_id,
      bytes: decodeBase64(payload.bytes_base64),
    });
  } else if (operation === "finalize_upload") {
    result = await runtime.upload_runtime.finalizeUpload(payload);
  } else if (operation === "get_upload_session") {
    result = await runtime.upload_runtime.getUploadSession(payload);
  } else if (operation === "reconcile_upload_sessions") {
    result = await runtime.upload_runtime.reconcileUploadSessions(payload);
  } else if (operation === "get_document_state") {
    result = await runtime.upload_runtime.getDocumentState(payload);
  } else if (operation === "place_legal_hold") {
    result = await runtime.upload_runtime.placeLegalHold(payload);
  } else if (operation === "set_retention_policy") {
    result = await runtime.upload_runtime.setRetentionPolicy(payload);
  } else if (operation === "request_committed_object_delete") {
    result = await runtime.upload_runtime.requestCommittedObjectDelete(payload);
  } else if (operation === "execute_committed_object_delete") {
    result = await runtime.upload_runtime.executeCommittedObjectDelete(payload);
  } else {
    const error = new Error("unsupported Vault DMS PostgreSQL source command");
    error.code = "LAWOS_DMS_POSTGRES_COMMAND_UNSUPPORTED";
    error.safe_error_code = "DMS_POSTGRES_COMMAND_UNSUPPORTED";
    error.status = 400;
    throw error;
  }
  return Object.freeze({
    outcome: "source_rehearsal",
    command: operation,
    result,
    boundary: VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY,
  });
}
