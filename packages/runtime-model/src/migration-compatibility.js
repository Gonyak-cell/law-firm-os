import { createCanonicalRecord, validateCanonicalDataset } from "./validators.js";

function statusOf(record, fallback = "active") {
  return record.status ?? record.review_status ?? fallback;
}

export function mapMasterDataRecordToCanonical(record = {}) {
  if (record.model_type === "Person") {
    return createCanonicalRecord("Person", {
      tenant_id: record.tenant_id,
      person_id: record.person_id,
      display_name: record.display_name,
      status: statusOf(record)
    });
  }
  if (record.model_type === "Organization") {
    return createCanonicalRecord("Organization", {
      tenant_id: record.tenant_id,
      organization_id: record.organization_id,
      display_name: record.display_name,
      status: statusOf(record)
    });
  }
  if (record.model_type === "Party") {
    return createCanonicalRecord("Party", {
      tenant_id: record.tenant_id,
      party_id: record.party_id,
      party_type: record.party_type,
      display_name: record.display_name,
      status: statusOf(record)
    });
  }
  if (record.model_type === "ClientGroup") {
    return createCanonicalRecord("ClientGroup", {
      tenant_id: record.tenant_id,
      client_group_id: record.client_group_id,
      display_name: record.display_name,
      client_ids: record.client_ids ?? record.member_party_ids ?? []
    });
  }
  throw new Error(`Unsupported master-data migration record ${record.model_type}`);
}

export function mapMatterRecordToCanonical(record = {}) {
  if (record.model_type === "Matter") {
    return createCanonicalRecord("Matter", {
      tenant_id: record.tenant_id,
      matter_id: record.matter_id,
      client_id: record.client_id,
      title: record.title,
      status: statusOf(record)
    });
  }
  if (record.model_type === "MatterMember") {
    return createCanonicalRecord("MatterMember", {
      tenant_id: record.tenant_id,
      matter_member_id: record.member_id,
      matter_id: record.matter_id,
      employee_id: record.employee_id ?? undefined,
      user_id: record.user_id ?? undefined,
      role: record.role,
      status: statusOf(record)
    });
  }
  if (record.model_type === "MatterTask") {
    return createCanonicalRecord("Task", {
      tenant_id: record.tenant_id,
      task_id: record.task_id,
      matter_id: record.matter_id,
      title: record.title,
      status: statusOf(record)
    });
  }
  if (record.model_type === "MatterCalendarEvent") {
    return createCanonicalRecord("Event", {
      tenant_id: record.tenant_id,
      event_id: record.event_id,
      matter_id: record.matter_id,
      title: record.title,
      starts_at: record.starts_at,
      status: statusOf(record, "scheduled")
    });
  }
  if (record.model_type === "MatterWiki") {
    return createCanonicalRecord("MatterWiki", {
      tenant_id: record.tenant_id,
      wiki_id: record.wiki_id,
      matter_id: record.matter_id,
      snapshot_version: record.snapshot_version,
      status: statusOf(record)
    });
  }
  throw new Error(`Unsupported matter migration record ${record.model_type}`);
}

export function mapHrxRecordToCanonical(record = {}) {
  if (record.employee_id) {
    return createCanonicalRecord("Employee", {
      tenant_id: record.tenant_id,
      employee_id: record.employee_id,
      display_name: record.display_name,
      status: statusOf(record)
    });
  }
  throw new Error("Unsupported HRX migration record");
}

export function mapDmsRecordToCanonical(record = {}) {
  if (record.model_type === "DmsDocument") {
    return createCanonicalRecord("Document", {
      tenant_id: record.tenant_id,
      document_id: record.document_id,
      matter_id: record.matter_id,
      title: record.title,
      status: statusOf(record),
      classification_envelope_id: record.permission_envelope_id
    });
  }
  if (record.model_type === "DmsDocumentVersion") {
    return createCanonicalRecord("DocumentVersion", {
      tenant_id: record.tenant_id,
      document_version_id: record.version_id,
      document_id: record.document_id,
      version_number: record.version_number,
      content_hash: `${record.hash_algorithm ?? "sha256"}:${record.file_object_id}`,
      status: statusOf(record, "current")
    });
  }
  if (record.model_type === "DmsWorkspace") {
    return createCanonicalRecord("VaultSnapshot", {
      tenant_id: record.tenant_id,
      vault_snapshot_id: `snapshot:${record.workspace_id}`,
      matter_id: record.matter_id,
      workspace_id: record.workspace_id,
      snapshot_hash: `sha256:${record.workspace_id}`,
      status: "captured"
    });
  }
  throw new Error(`Unsupported DMS migration record ${record.model_type}`);
}

export function assertCanonicalMigrationCompatibility({ masterData = [], matter = [], hrx = [], dms = [] } = {}) {
  const records = [
    ...masterData.map(mapMasterDataRecordToCanonical),
    ...matter.map(mapMatterRecordToCanonical),
    ...hrx.map(mapHrxRecordToCanonical),
    ...dms.map(mapDmsRecordToCanonical)
  ];
  const validation = validateCanonicalDataset(records, { require_all_object_types: false });
  if (!validation.ok) throw new Error(`Canonical migration compatibility failed: ${validation.errors.join("; ")}`);
  return Object.freeze({
    ok: true,
    projected_records: records.length,
    object_types: Object.freeze([...new Set(records.map((record) => record.object_type))].sort()),
    records: Object.freeze(records)
  });
}
