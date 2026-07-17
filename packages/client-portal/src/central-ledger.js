import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  createRecordDomainDescriptor,
  createRecordRepositoryDomainSnapshot,
  runRecordRepositoryDomainCommand,
} from "../../persistence/src/record-domain-adapter.js";
import {
  createClientPortalRepository,
  PORTAL_NON_PERSISTENT_FIELDS,
  PORTAL_PRIMARY_ID_FIELDS,
} from "./runtime-repository.js";

export const PORTAL_APPEND_ONLY_RECORD_TYPES = Object.freeze([
  "ClientApproval",
  "RfiResponse",
].sort());

const BLOCKED_PERSISTED_FIELDS = new Set(PORTAL_NON_PERSISTENT_FIELDS);

function reference(reference_name, target_record_type, target_record_id, options = {}) {
  if (target_record_id === undefined || target_record_id === null || target_record_id === "") return null;
  return {
    reference_name,
    target_domain_id: options.target_domain_id,
    target_record_type,
    target_record_id,
    required: options.required === true,
  };
}

function references(record) {
  const values = [];
  const add = (...args) => {
    const value = reference(...args);
    if (value) values.push(value);
  };
  add("matter", "Matter", record.matter_id, { target_domain_id: "matter" });
  add("client_group", "ClientGroup", record.client_group_id, { target_domain_id: "master-data" });
  if (record.model_type !== "ExternalUser") {
    add("external_user", "ExternalUser", record.external_user_id, {
      required: ["ExternalAcl", "PortalProjection", "RfiRequest", "ClientApproval", "PortalMagicLinkInvite", "PortalExternalSession"].includes(record.model_type),
    });
  }
  if (record.model_type === "PortalProjection") {
    for (const ref of record.visible_object_refs ?? []) {
      if (ref.object_type === "rfi") add("visible_rfi", "RfiRequest", ref.object_id, { required: true });
      if (ref.object_type === "document") add("visible_document", "Document", ref.object_id, { target_domain_id: "dms" });
    }
  }
  if (record.model_type === "ExternalAcl") {
    for (const ref of record.allowed_object_refs ?? []) {
      if (ref.object_type === "document") add("allowed_document", "Document", ref.object_id, { target_domain_id: "dms" });
    }
  }
  if (record.model_type === "RfiResponse") {
    add("rfi_request", "RfiRequest", record.rfi_request_id, { required: true });
    add("external_session", "PortalExternalSession", record.external_session_id);
  }
  if (record.model_type === "SecureLink") {
    add("target_document", "Document", record.target_object_id, { target_domain_id: "dms" });
  }
  if (record.model_type === "PortalMagicLinkInvite") {
    add("rfi_request", "RfiRequest", record.rfi_request_id, { required: true });
    add("secure_link", "SecureLink", record.secure_link_id, { required: true });
  }
  if (record.model_type === "PortalExternalSession") {
    add("invite", "PortalMagicLinkInvite", record.invite_id, { required: true });
    add("rfi_request", "RfiRequest", record.rfi_request_id, { required: true });
    add("secure_link", "SecureLink", record.secure_link_id, { required: true });
  }
  if (record.model_type === "DataRoomProjection") {
    add("data_room", "DataRoom", record.data_room_id, { required: true });
    for (const ref of record.source_document_refs ?? []) {
      add("source_document", "Document", ref.object_id ?? ref.document_id, { target_domain_id: "dms" });
    }
  }
  return values;
}

function uniqueKey(record) {
  if (record.model_type === "ExternalUser" && record.email) {
    return `external-user-email:${hashDomainValue(String(record.email).trim().toLowerCase())}`;
  }
  if (record.model_type === "ExternalAcl" && record.external_user_id && record.matter_id) {
    return `external-acl:${hashDomainValue({ external_user_id: record.external_user_id, matter_id: record.matter_id })}`;
  }
  if (record.model_type === "PortalMagicLinkInvite" && record.token_hash) {
    return `magic-link-token:${record.token_hash}`;
  }
  if (record.model_type === "PortalExternalSession" && record.invite_id) {
    return `external-session-invite:${hashDomainValue(record.invite_id)}`;
  }
  return null;
}

export const PORTAL_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "client-portal",
  resolve_record_id(record) {
    const field = PORTAL_PRIMARY_ID_FIELDS[record.model_type];
    return field ? record[field] : record.resource_id ?? record.id;
  },
  unique_key: uniqueKey,
  append_only: (record) => PORTAL_APPEND_ONLY_RECORD_TYPES.includes(record.model_type),
  references,
  pii_fields: [
    "email",
    "title",
    "response_text",
    "external_user_id",
    "allowed_object_refs",
    "visible_object_refs",
    "source_document_refs",
  ],
  primary_key_fields: [...Object.values(PORTAL_PRIMARY_ID_FIELDS), "resource_id"],
  unique_rules: [
    "ExternalUser.normalized_email_hash",
    "ExternalAcl.external_user_id+matter_id",
    "PortalMagicLinkInvite.token_hash",
    "PortalExternalSession.invite_id",
  ],
  reference_rules: [
    "ExternalAcl.external_user_id->ExternalUser",
    "PortalProjection.external_user_id->ExternalUser",
    "RfiRequest.external_user_id->ExternalUser",
    "RfiResponse.rfi_request_id->RfiRequest",
    "PortalMagicLinkInvite.rfi_request_id->RfiRequest",
    "PortalMagicLinkInvite.secure_link_id->SecureLink",
    "PortalExternalSession.invite_id->PortalMagicLinkInvite",
    "DataRoomProjection.data_room_id->DataRoom",
    "*.matter_id->matter.Matter",
    "*.document_ref->dms.Document",
  ],
});

function assertNoBlockedFields(value, path = "record") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoBlockedFields(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (BLOCKED_PERSISTED_FIELDS.has(key) && entry !== null && entry !== undefined) {
      throw Object.assign(new Error(`Portal persisted a blocked field at ${path}.${key}`), {
        safe_error_code: "PORTAL_PERSISTED_SECRET_REJECTED",
        status: 409,
      });
    }
    assertNoBlockedFields(entry, `${path}.${key}`);
  }
}

export function reconcilePortalRecords(records = []) {
  const values = records.map((record) => structuredClone(record));
  let activeInviteCount = 0;
  let usedInviteCount = 0;
  let revokedInviteCount = 0;
  let activeSecureLinkCount = 0;
  let revokedSecureLinkCount = 0;
  for (const record of values) {
    assertNoBlockedFields(record);
    if (record.model_type === "PortalMagicLinkInvite") {
      if (!/^[a-f0-9]{64}$/u.test(record.token_hash ?? "") || record.token_material_included !== false) {
        throw Object.assign(new Error("Portal invite must persist only a SHA-256 token hash"), {
          safe_error_code: "PORTAL_TOKEN_INVARIANT_FAILED",
          status: 409,
        });
      }
      if (record.status === "active") activeInviteCount += 1;
      else if (record.status === "used" && record.used_at) usedInviteCount += 1;
      else if (record.status === "revoked" && record.revoked_at) revokedInviteCount += 1;
      else throw Object.assign(new Error("Portal invite state is incomplete"), { safe_error_code: "PORTAL_STATE_INVARIANT_FAILED", status: 409 });
    }
    if (record.model_type === "SecureLink") {
      if (record.dms_acl_inherited !== true || record.watermark_enabled !== true || record.external_share_boundary_checked !== true) {
        throw Object.assign(new Error("SecureLink security controls are incomplete"), { safe_error_code: "PORTAL_SECURE_LINK_INVARIANT_FAILED", status: 409 });
      }
      if (!Number.isFinite(Date.parse(record.expires_at))) {
        throw Object.assign(new Error("SecureLink expires_at is invalid"), { safe_error_code: "PORTAL_SECURE_LINK_INVARIANT_FAILED", status: 409 });
      }
      if (record.status === "active") activeSecureLinkCount += 1;
      else if (record.status === "revoked" && record.revoked_at) revokedSecureLinkCount += 1;
      else throw Object.assign(new Error("SecureLink state is incomplete"), { safe_error_code: "PORTAL_STATE_INVARIANT_FAILED", status: 409 });
    }
    if (record.model_type === "PortalExternalSession" && record.token_material_included !== false) {
      throw Object.assign(new Error("Portal external session contains token material"), { safe_error_code: "PORTAL_TOKEN_INVARIANT_FAILED", status: 409 });
    }
  }
  const summary = {
    record_count: values.length,
    invite_count: activeInviteCount + usedInviteCount + revokedInviteCount,
    active_invite_count: activeInviteCount,
    used_invite_count: usedInviteCount,
    revoked_invite_count: revokedInviteCount,
    secure_link_count: activeSecureLinkCount + revokedSecureLinkCount,
    active_secure_link_count: activeSecureLinkCount,
    revoked_secure_link_count: revokedSecureLinkCount,
    external_session_count: values.filter((record) => record.model_type === "PortalExternalSession").length,
    rfi_response_count: values.filter((record) => record.model_type === "RfiResponse").length,
    blocked_persisted_field_count: 0,
    invariant_passed: true,
  };
  return Object.freeze({ ...summary, invariant_hash: hashDomainValue(summary) });
}

export function createPortalDomainSnapshot({ repositories, tenant_id } = {}) {
  const result = createRecordRepositoryDomainSnapshot({
    descriptor: PORTAL_DOMAIN_DESCRIPTOR,
    repositories,
    tenant_id,
  });
  assertNoBlockedFields(result.snapshot.idempotency_entries, "idempotency_entries");
  assertNoBlockedFields(result.snapshot.audit_events, "audit_events");
  const reconciliation = reconcilePortalRecords(result.snapshot.records.map((record) => record.payload));
  return Object.freeze({
    snapshot: result.snapshot,
    inventory: Object.freeze({
      ...result.inventory,
      append_only_record_types: PORTAL_APPEND_ONLY_RECORD_TYPES,
      reconciliation,
    }),
  });
}

export function runPortalPostgresCommand({ ledger, tenant_id, command } = {}) {
  return runRecordRepositoryDomainCommand({
    ledger,
    descriptor: PORTAL_DOMAIN_DESCRIPTOR,
    tenant_id,
    create_repository: createClientPortalRepository,
    command: async function commandWithPortalInvariants(repository) {
      const result = await command(repository);
      createPortalDomainSnapshot({
        repositories: [{ source_id: "portal-postgres-unit-of-work", repository }],
        tenant_id,
      });
      return result;
    },
  });
}
