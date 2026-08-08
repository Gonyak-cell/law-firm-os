import { createRecordDomainDescriptor } from "../../persistence/src/record-domain-adapter.js";
import { primaryIdOf } from "./repository-record.js";

const APPEND_ONLY_TYPES = new Set([
  "EmailFilingPlacementEvent",
  "EmailFilingPlacementReference",
  "MatterStatusHistory",
  "MatterTimelineEvent",
  "MatterAuditEvent",
  "MatterWorktreeTemplateSnapshot",
]);

function references(record) {
  const values = [];
  const add = (reference_name, target_record_type, target_record_id, required = false) => {
    if (target_record_id) values.push({ reference_name, target_record_type, target_record_id, required });
  };
  if (record.model_type !== "Matter") add("matter", "Matter", record.matter_id, true);
  if (["EmailFilingPlacementEvent", "EmailFilingPlacementReference"].includes(record.model_type)) {
    add("source_matter", "Matter", record.source_matter_id, true);
    add("target_matter", "Matter", record.target_matter_id, true);
  }
  add("client", "MatterClient", record.client_id);
  add("worktree", "MatterWorktree", record.worktree_id);
  add("template", "MatterWorktreeTemplate", record.template_id);
  add("parent_node", "MatterWorktreeNode", record.parent_node_id);
  add("task", "MatterTask", record.task_id);
  add("calendar_event", "MatterCalendarEvent", record.event_id);
  return values;
}

function uniqueKey(record) {
  if (record.model_type === "Matter" && record.matter_code) return `matter-code:${record.matter_code}`;
  if (record.model_type === "MatterWorktree" && record.status === "active") {
    return `active-worktree:${record.matter_id}`;
  }
  if (record.model_type === "MatterWorktreeNode" && record.worktree_id && record.node_key) {
    return `worktree-node:${record.worktree_id}:${record.node_key}`;
  }
  return null;
}

export const MATTER_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "matter",
  resolve_record_id: primaryIdOf,
  unique_key: uniqueKey,
  append_only: (record) => APPEND_ONLY_TYPES.has(record.model_type),
  references,
  pii_fields: [
    "title",
    "client_name",
    "party_name",
    "email",
    "phone",
    "description",
    "notes",
    "message_body",
  ],
  primary_key_fields: [
    "resource_id",
    "client_id",
    "matter_id",
    "member_id",
    "task_id",
    "event_id",
    "checklist_id",
    "worktree_id",
    "node_id",
    "template_id",
    "template_node_id",
  ],
  unique_rules: [
    "Matter.matter_code",
    "MatterWorktree.active_per_matter",
    "MatterWorktreeNode.worktree_id_node_key",
  ],
  reference_rules: [
    "*.matter_id->Matter",
    "Matter.client_id->MatterClient",
    "*.worktree_id->MatterWorktree",
    "*.template_id->MatterWorktreeTemplate",
    "MatterWorktreeNode.parent_node_id->MatterWorktreeNode",
  ],
});
