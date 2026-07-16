import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  createRecordDomainDescriptor,
  createRecordRepositoryDomainSnapshot,
  runRecordRepositoryDomainCommand,
} from "../../persistence/src/record-domain-adapter.js";
import {
  AI_GOVERNANCE_NON_PERSISTENT_FIELDS,
  AI_GOVERNANCE_PRIMARY_ID_FIELDS,
  createAiGovernanceRepository,
} from "./runtime-repository.js";

export const AI_GOVERNANCE_APPEND_ONLY_RECORD_TYPES = Object.freeze([
  "AiOutput",
  "AiOutputExport",
  "CitationLedger",
  "ModelGatewayInvocation",
  "PromptLog",
  "RetrievalRequest",
].sort());

const BLOCKED_PERSISTED_FIELDS = new Set(AI_GOVERNANCE_NON_PERSISTENT_FIELDS);

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
  if (record.model_type === "RetrievalRequest") {
    add("ai_policy", "AiPolicy", record.ai_policy_id, { required: true });
    for (const ref of record.source_refs ?? []) add("source_document", "Document", ref.source_id, { target_domain_id: "dms" });
  }
  if (record.model_type === "PromptLog") add("retrieval_request", "RetrievalRequest", record.retrieval_request_id, { required: true });
  if (record.model_type === "AiOutput") {
    add("prompt_log", "PromptLog", record.prompt_log_id, { required: true });
    add("gateway_invocation", "ModelGatewayInvocation", record.gateway_invocation_id);
  }
  if (record.model_type === "CitationLedger") {
    add("ai_output", "AiOutput", record.ai_output_id, { required: true });
    for (const source of record.sources ?? []) add("citation_document", "Document", source.source_id, { target_domain_id: "dms" });
  }
  if (record.model_type === "HumanReviewTask") add("ai_output", "AiOutput", record.ai_output_id);
  if (record.model_type === "AiOutputExport") add("ai_output", "AiOutput", record.ai_output_id, { required: true });
  if (record.model_type === "ModelGatewayInvocation") add("retrieval_request", "RetrievalRequest", record.retrieval_request_id, { required: true });
  if (record.model_type === "AiDisableSwitch") add("ai_policy", "AiPolicy", record.ai_policy_id, { required: true });
  return values;
}

function uniqueKey(record) {
  if (record.model_type === "HumanReviewTask" && record.ai_output_id) {
    return `human-review-output:${hashDomainValue(record.ai_output_id)}`;
  }
  if (record.model_type === "CitationLedger" && record.ai_output_id) {
    return `citation-output:${hashDomainValue(record.ai_output_id)}`;
  }
  if (record.model_type === "AiDisableSwitch" && record.ai_policy_id) {
    return `disable-switch-policy:${hashDomainValue(record.ai_policy_id)}`;
  }
  return null;
}

export const AI_GOVERNANCE_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "ai-governance",
  resolve_record_id(record) {
    const field = AI_GOVERNANCE_PRIMARY_ID_FIELDS[record.model_type];
    return field ? record[field] : record.resource_id ?? record.id;
  },
  unique_key: uniqueKey,
  append_only: (record) => AI_GOVERNANCE_APPEND_ONLY_RECORD_TYPES.includes(record.model_type),
  references,
  pii_fields: [
    "prompt_hash",
    "output_digest",
    "source_refs",
    "retrieved_doc_ids",
    "sources",
    "reviewer_id",
  ],
  primary_key_fields: Object.values(AI_GOVERNANCE_PRIMARY_ID_FIELDS),
  unique_rules: [
    "HumanReviewTask.ai_output_id",
    "CitationLedger.ai_output_id",
    "AiDisableSwitch.ai_policy_id",
  ],
  reference_rules: [
    "RetrievalRequest.ai_policy_id->AiPolicy",
    "PromptLog.retrieval_request_id->RetrievalRequest",
    "AiOutput.prompt_log_id->PromptLog",
    "AiOutput.gateway_invocation_id->ModelGatewayInvocation",
    "CitationLedger.ai_output_id->AiOutput",
    "HumanReviewTask.ai_output_id->AiOutput",
    "AiOutputExport.ai_output_id->AiOutput",
    "*.source_refs->dms.Document",
    "*.matter_id->matter.Matter",
  ],
});

function assertNoBlockedFields(value, path = "record") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoBlockedFields(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (BLOCKED_PERSISTED_FIELDS.has(key)) {
      throw Object.assign(new Error(`AI governance persisted a blocked field at ${path}.${key}`), {
        safe_error_code: "AI_RAW_PAYLOAD_REJECTED",
        status: 409,
      });
    }
    assertNoBlockedFields(entry, `${path}.${key}`);
  }
}

export function reconcileAiGovernanceRecords(records = []) {
  const values = records.map((record) => structuredClone(record));
  for (const record of values) {
    assertNoBlockedFields(record);
    if (record.model_type === "PromptLog" && (!/^[a-f0-9]{64}$/u.test(record.prompt_hash ?? "") || record.raw_prompt_included !== false)) {
      throw Object.assign(new Error("PromptLog hash/raw boundary is invalid"), { safe_error_code: "AI_PROMPT_INVARIANT_FAILED", status: 409 });
    }
    if (record.model_type === "AiOutput" && (record.raw_output_included !== false || record.promotes_ai_output_to_final !== false)) {
      throw Object.assign(new Error("AiOutput review/raw boundary is invalid"), { safe_error_code: "AI_OUTPUT_INVARIANT_FAILED", status: 409 });
    }
    if (record.model_type === "CitationLedger" && (record.citation_source_validation !== true || record.raw_source_payload_included !== false)) {
      throw Object.assign(new Error("CitationLedger source boundary is invalid"), { safe_error_code: "AI_CITATION_INVARIANT_FAILED", status: 409 });
    }
    if (record.model_type === "AiOutputExport" && (
      record.privilege_label_inherited !== true
      || record.dms_acl_inherited !== true
      || record.external_share_boundary_checked !== true
      || record.raw_output_included !== false
    )) {
      throw Object.assign(new Error("AiOutputExport security boundary is invalid"), { safe_error_code: "AI_EXPORT_INVARIANT_FAILED", status: 409 });
    }
    if (record.model_type === "ModelGatewayInvocation" && (
      record.policy_checked !== true
      || record.raw_prompt_included !== false
      || record.raw_output_included !== false
    )) {
      throw Object.assign(new Error("ModelGatewayInvocation policy/raw boundary is invalid"), { safe_error_code: "AI_GATEWAY_INVARIANT_FAILED", status: 409 });
    }
  }
  const reviewTasks = values.filter((record) => record.model_type === "HumanReviewTask");
  const summary = {
    record_count: values.length,
    policy_count: values.filter((record) => record.model_type === "AiPolicy").length,
    retrieval_count: values.filter((record) => record.model_type === "RetrievalRequest").length,
    prompt_log_count: values.filter((record) => record.model_type === "PromptLog").length,
    output_count: values.filter((record) => record.model_type === "AiOutput").length,
    citation_ledger_count: values.filter((record) => record.model_type === "CitationLedger").length,
    review_task_count: reviewTasks.length,
    open_review_task_count: reviewTasks.filter((record) => record.status === "open").length,
    closed_review_task_count: reviewTasks.filter((record) => record.status === "closed").length,
    export_count: values.filter((record) => record.model_type === "AiOutputExport").length,
    blocked_persisted_field_count: 0,
    promotes_ai_output_to_final_count: values.filter((record) => record.promotes_ai_output_to_final === true).length,
    invariant_passed: true,
  };
  if (summary.promotes_ai_output_to_final_count !== 0) {
    throw Object.assign(new Error("AI output cannot promote itself to final"), { safe_error_code: "AI_OUTPUT_INVARIANT_FAILED", status: 409 });
  }
  return Object.freeze({ ...summary, invariant_hash: hashDomainValue(summary) });
}

export function createAiGovernanceDomainSnapshot({ repositories, tenant_id } = {}) {
  const result = createRecordRepositoryDomainSnapshot({
    descriptor: AI_GOVERNANCE_DOMAIN_DESCRIPTOR,
    repositories,
    tenant_id,
  });
  assertNoBlockedFields(result.snapshot.idempotency_entries, "idempotency_entries");
  assertNoBlockedFields(result.snapshot.audit_events, "audit_events");
  const reconciliation = reconcileAiGovernanceRecords(result.snapshot.records.map((record) => record.payload));
  return Object.freeze({
    snapshot: result.snapshot,
    inventory: Object.freeze({
      ...result.inventory,
      append_only_record_types: AI_GOVERNANCE_APPEND_ONLY_RECORD_TYPES,
      reconciliation,
    }),
  });
}

export function runAiGovernancePostgresCommand({ ledger, tenant_id, command } = {}) {
  return runRecordRepositoryDomainCommand({
    ledger,
    descriptor: AI_GOVERNANCE_DOMAIN_DESCRIPTOR,
    tenant_id,
    create_repository: createAiGovernanceRepository,
    command: async function commandWithAiGovernanceInvariants(repository) {
      const result = await command(repository);
      createAiGovernanceDomainSnapshot({
        repositories: [{ source_id: "ai-governance-postgres-unit-of-work", repository }],
        tenant_id,
      });
      return result;
    },
  });
}
