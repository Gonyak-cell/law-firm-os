import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createRecordDomainDescriptor, createRecordRepositoryDomainSnapshot } from "../../persistence/src/record-domain-adapter.js";
import { createDmsRepository, DMS_PRIMARY_ID_FIELDS, primaryIdOf } from "./repository.js";
import { assertNoDmsPersistedSecrets } from "./persistence-guard.js";

export const DMS_APPEND_ONLY_RECORD_TYPES = Object.freeze([
  "DmsDocumentVersion",
  "DmsFileObject",
  "DmsRendition",
  "DmsExtractedText",
  "DmsOcrResult",
  "DmsDocumentRelation",
  "DmsRagEvidence",
]);

export const DMS_SPECIALIZED_AUTHORITY_RECORD_TYPES = Object.freeze([
  "DmsDocument",
  "DmsDocumentVersion",
  "DmsFileObject",
  "DmsLegalHold",
  "DmsRetentionPolicy",
]);

export const DMS_AUTHORITY_TRANSITION_BOUNDARY = Object.freeze({
  schema_version: "law-firm-os.dms-authority-transition.v0.2",
  current_file_json_authority_active: true,
  postgres_mutable_target_schema: "lawos_dms",
  lawos_domain_records_mode: "immutable_snapshot_shadow_only",
  mutable_domain_ledger_command_allowed: false,
  auxiliary_metadata_domain_id: "dms-auxiliary",
  dual_write_allowed: false,
  global_postgres_authority_active: false,
});

function references(record) {
  const values = [];
  const add = (reference_name, target_record_type, target_record_id, options = {}) => {
    if (!target_record_id) return;
    values.push({
      reference_name,
      target_domain_id: options.target_domain_id,
      target_record_type,
      target_record_id,
      required: options.required === true,
    });
  };
  add("matter", "Matter", record.matter_id, { target_domain_id: "matter" });
  if (record.model_type !== "DmsWorkspace") add("workspace", "DmsWorkspace", record.workspace_id);
  if (record.model_type === "DmsFolder") add("parent_folder", "DmsFolder", record.parent_folder_id);
  if (record.model_type === "DmsDocument") {
    add("folder", "DmsFolder", record.folder_id);
    add("current_version", "DmsDocumentVersion", record.current_version_id);
  }
  if (record.model_type === "DmsDocumentVersion") {
    add("document", "DmsDocument", record.document_id, { required: true });
    add("file_object", "DmsFileObject", record.file_object_id, { required: true });
  }
  if (["DmsRendition", "DmsExtractedText", "DmsOcrResult"].includes(record.model_type)) {
    add("file_object", "DmsFileObject", record.file_object_id, { required: true });
  }
  if (record.model_type === "DmsDocumentRelation") {
    add("source_document", "DmsDocument", record.source_document_id, { required: true });
    add("target_document", "DmsDocument", record.target_document_id, { required: true });
  }
  if ([
    "DmsLock",
    "DmsPrivilegeLabel",
    "DmsLegalHold",
    "DmsRetentionPolicy",
    "DmsRedaction",
    "DmsSecureLink",
    "DmsSearchIndex",
    "DmsRagEvidence",
  ].includes(record.model_type)) add("document", "DmsDocument", record.document_id, { required: true });
  return values;
}

function uniqueKey(record) {
  if (record.model_type === "DmsWorkspace" && record.status === "active" && record.matter_id) {
    return `active-workspace:${record.matter_id}`;
  }
  if (record.model_type === "DmsDocumentVersion" && record.document_id && record.version_number) {
    return `document-version:${record.document_id}:${record.version_number}`;
  }
  if (record.model_type === "DmsFileObject" && record.storage_pointer_ref) {
    return `storage-pointer:${hashDomainValue(record.storage_pointer_ref)}`;
  }
  return null;
}

export const DMS_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "dms",
  resolve_record_id: primaryIdOf,
  unique_key: uniqueKey,
  append_only: (record) => DMS_APPEND_ONLY_RECORD_TYPES.includes(record.model_type),
  references,
  pii_fields: [
    "title",
    "file_name",
    "email_subject",
    "extracted_text",
    "ocr_text",
    "registered_account_email",
  ],
  primary_key_fields: [...Object.values(DMS_PRIMARY_ID_FIELDS), "resource_id"],
  unique_rules: [
    "DmsWorkspace.active_per_matter",
    "DmsDocumentVersion.document_id+version_number",
    "DmsFileObject.storage_pointer_ref_hash",
  ],
  reference_rules: [
    "*.matter_id->matter.Matter",
    "*.workspace_id->DmsWorkspace",
    "DmsDocument.current_version_id->DmsDocumentVersion",
    "DmsDocumentVersion.document_id->DmsDocument",
    "DmsDocumentVersion.file_object_id->DmsFileObject",
    "DmsDocumentRelation.source_document_id|target_document_id->DmsDocument",
    "DmsLegalHold|DmsRetentionPolicy.document_id->DmsDocument",
  ],
});

export const DMS_AUXILIARY_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "dms-auxiliary",
  resolve_record_id: primaryIdOf,
  unique_key: uniqueKey,
  append_only: (record) => DMS_APPEND_ONLY_RECORD_TYPES.includes(record.model_type),
  references,
  pii_fields: DMS_DOMAIN_DESCRIPTOR.inventory.pii_fields,
  primary_key_fields: DMS_DOMAIN_DESCRIPTOR.inventory.primary_key_fields,
  unique_rules: DMS_DOMAIN_DESCRIPTOR.inventory.unique_rules,
  reference_rules: DMS_DOMAIN_DESCRIPTOR.inventory.reference_rules,
});

function assertAuxiliaryRecordType(value) {
  const modelType = value?.model_type;
  if (DMS_SPECIALIZED_AUTHORITY_RECORD_TYPES.includes(modelType)) {
    throw Object.assign(new Error(`${modelType} must use the lawos_dms specialized authority`), {
      code: "LAWOS_DMS_SPECIALIZED_AUTHORITY_REQUIRED",
      safe_error_code: "DMS_SPECIALIZED_AUTHORITY_REQUIRED",
      status: 409,
    });
  }
}

export function createDmsAuxiliaryRepository(options = {}) {
  for (const record of options.seedRecords ?? []) assertAuxiliaryRecordType(record);
  const repository = createDmsRepository(options);
  let auxiliary;
  auxiliary = Object.freeze({
    ...repository,
    create(record) {
      assertAuxiliaryRecordType(record);
      return repository.create(record);
    },
    upsert(record) {
      assertAuxiliaryRecordType(record);
      return repository.upsert(record);
    },
    update(ref, patch = {}) {
      assertAuxiliaryRecordType(ref);
      return repository.update(ref, patch);
    },
    delete(ref) {
      assertAuxiliaryRecordType(ref);
      return repository.delete(ref);
    },
    transaction(fn) {
      return repository.transaction(() => fn(auxiliary));
    },
  });
  return auxiliary;
}

export function createDmsDomainSnapshot({ repositories, tenant_id } = {}) {
  const result = createRecordRepositoryDomainSnapshot({
    descriptor: DMS_DOMAIN_DESCRIPTOR,
    repositories,
    tenant_id,
  });
  assertNoDmsPersistedSecrets(result.snapshot.records, "records");
  assertNoDmsPersistedSecrets(result.snapshot.idempotency_entries, "idempotency_entries");
  assertNoDmsPersistedSecrets(result.snapshot.audit_events, "audit_events");
  return Object.freeze({
    snapshot: result.snapshot,
    inventory: Object.freeze({
      ...result.inventory,
      append_only_record_types: DMS_APPEND_ONLY_RECORD_TYPES,
      blocked_persisted_field_count: 0,
      production_migrated: false,
    }),
  });
}

export async function runDmsPostgresCommand() {
  throw Object.assign(new Error("mutable DMS commands must target lawos_dms, not lawos_domain.records"), {
    code: "LAWOS_DMS_DOMAIN_LEDGER_MUTABLE_WRITE_REJECTED",
    safe_error_code: "DMS_DOMAIN_LEDGER_MUTABLE_WRITE_REJECTED",
    status: 409,
  });
}
