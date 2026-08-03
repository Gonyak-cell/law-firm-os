import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  createRecordDomainDescriptor,
  createRecordRepositoryDomainSnapshot,
} from "../../persistence/src/record-domain-adapter.js";
import {
  normalizeEvidenceMailboxAddress,
  normalizeInquiryEmailEvidence,
  normalizeInquiryEvidenceFileObject,
} from "./inquiry-evidence-model.js";
import { normalizeM365Connection } from "./m365-connection-model.js";
import { normalizePeopleOutlookConnection } from "./people-outlook-connection-model.js";
import {
  EMAIL_DMS_PRIMARY_ID_FIELDS,
  emailDmsPrimaryIdOf,
} from "./repository.js";

function messageUniqueKey(record) {
  const internetMessageId =
    typeof record.internet_message_id === "string"
      ? record.internet_message_id.trim().normalize("NFKC").toLowerCase()
      : "";
  const graphMessageId =
    typeof record.graph_immutable_message_id === "string"
      ? record.graph_immutable_message_id.trim()
      : "";
  const messageKind = internetMessageId ? "internet" : "graph-immutable";
  const messageValue = internetMessageId || graphMessageId;
  if (!messageValue) return null;
  return `mailbox-message:${hashDomainValue({
    mailbox_address: normalizeEvidenceMailboxAddress(
      record.mailbox_address,
    ),
    message_kind: messageKind,
    message_value: messageValue,
  })}`;
}

function uniqueKey(record) {
  if (record.model_type === "M365Connection") {
    return `m365-user:${record.user_id}`;
  }
  if (record.model_type === "PeopleOutlookConnection") {
    return `people-outlook-employee:${record.employee_id}`;
  }
  if (record.model_type === "InquiryEmailEvidence") {
    return messageUniqueKey(record);
  }
  if (record.model_type === "InquiryEvidenceFileObject") {
    return `inquiry-file-kind:${record.inquiry_email_evidence_id}:${record.object_kind}`;
  }
  return null;
}

function references(record) {
  const values = [];
  const add = (
    reference_name,
    target_record_type,
    target_record_id,
    options = {},
  ) => {
    if (!target_record_id) return;
    values.push({
      reference_name,
      target_domain_id: options.target_domain_id,
      target_record_type,
      target_record_id,
      required: options.required === true,
    });
  };
  if (record.model_type === "InquiryEmailEvidence") {
    add("lead", "Lead", record.lead_id, {
      target_domain_id: "crm",
      required: record.capture_status === "complete",
    });
    add(
      "original_mime",
      "InquiryEvidenceFileObject",
      record.mime_file_object_id,
      { required: record.capture_status !== "failed" },
    );
    add(
      "sanitized_display",
      "InquiryEvidenceFileObject",
      record.display_file_object_id,
      { required: record.capture_status !== "failed" },
    );
  }
  if (record.model_type === "InquiryEvidenceFileObject") {
    add(
      "inquiry_email_evidence",
      "InquiryEmailEvidence",
      record.inquiry_email_evidence_id,
      { required: true },
    );
  }
  return values;
}

export const EMAIL_DMS_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "email-dms",
  resolve_record_id: emailDmsPrimaryIdOf,
  unique_key: uniqueKey,
  references,
  pii_fields: [
    "mailbox_address",
    "credential_envelope",
    "provider_subject_id",
    "subject",
    "sender",
    "recipients",
    "attachment_manifest",
  ],
  primary_key_fields: Object.values(EMAIL_DMS_PRIMARY_ID_FIELDS),
  unique_rules: [
    "M365Connection.tenant_id+user_id",
    "PeopleOutlookConnection.tenant_id+employee_id",
    "InquiryEmailEvidence.tenant_id+mailbox_address+internet_message_id_or_graph_immutable_message_id",
    "InquiryEvidenceFileObject.tenant_id+inquiry_email_evidence_id+object_kind",
  ],
  reference_rules: [
    "InquiryEmailEvidence.lead_id->crm.Lead",
    "InquiryEmailEvidence.mime_file_object_id|display_file_object_id->InquiryEvidenceFileObject",
    "InquiryEvidenceFileObject.inquiry_email_evidence_id->InquiryEmailEvidence",
  ],
});

export function reconcileEmailDmsRecords(records = []) {
  let m365ConnectionCount = 0;
  let peopleOutlookConnectionCount = 0;
  let inquiryEvidenceCount = 0;
  let inquiryFileObjectCount = 0;
  const evidenceIds = new Set();
  const fileObjectsByEvidenceAndKind = new Map();

  for (const input of records) {
    if (input.model_type === "M365Connection") {
      normalizeM365Connection(input);
      m365ConnectionCount += 1;
      continue;
    }
    if (input.model_type === "PeopleOutlookConnection") {
      normalizePeopleOutlookConnection(input);
      peopleOutlookConnectionCount += 1;
      continue;
    }
    if (input.model_type === "InquiryEmailEvidence") {
      const evidence = normalizeInquiryEmailEvidence(input);
      evidenceIds.add(evidence.inquiry_email_evidence_id);
      inquiryEvidenceCount += 1;
      continue;
    }
    if (input.model_type === "InquiryEvidenceFileObject") {
      const fileObject = normalizeInquiryEvidenceFileObject(input);
      const key =
        `${fileObject.inquiry_email_evidence_id}:${fileObject.object_kind}`;
      if (fileObjectsByEvidenceAndKind.has(key)) {
        throw new TypeError(
          "InquiryEvidenceFileObject kind is duplicated for one evidence",
        );
      }
      fileObjectsByEvidenceAndKind.set(key, fileObject);
      inquiryFileObjectCount += 1;
      continue;
    }
    throw new TypeError(`unsupported Email DMS model_type: ${input.model_type}`);
  }

  for (const input of records) {
    if (input.model_type !== "InquiryEmailEvidence") continue;
    const evidence = normalizeInquiryEmailEvidence(input);
    if (evidence.capture_status === "failed") continue;
    const original = fileObjectsByEvidenceAndKind.get(
      `${evidence.inquiry_email_evidence_id}:original_mime`,
    );
    const display = fileObjectsByEvidenceAndKind.get(
      `${evidence.inquiry_email_evidence_id}:sanitized_display`,
    );
    if (
      !original
      || !display
      || original.inquiry_evidence_file_object_id
        !== evidence.mime_file_object_id
      || display.inquiry_evidence_file_object_id
        !== evidence.display_file_object_id
      || original.sha256 !== evidence.mime_sha256
      || original.byte_size !== evidence.mime_byte_size
    ) {
      throw new TypeError(
        "InquiryEmailEvidence file objects do not reconcile",
      );
    }
  }
  for (const fileObject of fileObjectsByEvidenceAndKind.values()) {
    if (!evidenceIds.has(fileObject.inquiry_email_evidence_id)) {
      throw new TypeError(
        "InquiryEvidenceFileObject requires InquiryEmailEvidence",
      );
    }
  }

  return Object.freeze({
    record_count: records.length,
    m365_connection_count: m365ConnectionCount,
    people_outlook_connection_count: peopleOutlookConnectionCount,
    inquiry_email_evidence_count: inquiryEvidenceCount,
    inquiry_evidence_file_object_count: inquiryFileObjectCount,
    invariant_hash: hashDomainValue({
      record_count: records.length,
      evidence_ids: [...evidenceIds].sort(),
      file_object_keys: [...fileObjectsByEvidenceAndKind.keys()].sort(),
    }),
    invariant_passed: true,
  });
}

export function createEmailDmsDomainSnapshot({
  repositories,
  tenant_id,
} = {}) {
  const result = createRecordRepositoryDomainSnapshot({
    descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
    repositories,
    tenant_id,
  });
  const records = result.snapshot.records.map((record) => record.payload);
  return Object.freeze({
    snapshot: result.snapshot,
    inventory: Object.freeze({
      ...result.inventory,
      reconciliation: reconcileEmailDmsRecords(records),
    }),
  });
}
