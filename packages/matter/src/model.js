import {
  MATTER_CORE_MODEL_DEFINITIONS,
  MATTER_GRAPH_EDGE_TYPES,
  MATTER_GRAPH_NODE_TYPES,
  MATTER_LIFECYCLE_STATUSES,
  MATTER_WIKI_REVIEW_STATUSES,
  MATTER_WIKI_SECTION_TYPES,
  MATTER_WIKI_SOURCE_POLICIES,
  getMatterCoreModelDefinition,
} from "./registry.js";

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeList(list) {
  return Object.freeze([...(list ?? [])]);
}

export function missingMatterCoreRequiredFields(modelType, input) {
  const definition = getMatterCoreModelDefinition(modelType);
  return definition.required_fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function assertRequiredFields(modelType, input) {
  const missing = missingMatterCoreRequiredFields(modelType, input);
  if (missing.length > 0) throw new Error(`${modelType} missing required fields: ${missing.join(", ")}`);
}

function assertLifecycleStatus(modelType, status) {
  const definition = getMatterCoreModelDefinition(modelType);
  const allowed = definition.lifecycle_statuses;
  if (status && !allowed.includes(status)) {
    throw new Error(`${modelType} status must be one of ${allowed.join(", ")}`);
  }
}

function baseRecord(modelType, input) {
  assertRequiredFields(modelType, input);
  const definition = getMatterCoreModelDefinition(modelType);
  assertLifecycleStatus(modelType, input.status ?? input.review_status);
  return {
    model_type: modelType,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id ?? null,
    owner_module: definition.owner_module,
    permission_envelope_id: input.permission_envelope_id ?? null,
    audit_trace_id: input.audit_trace_id ?? null,
    synthetic_only: input.synthetic_only ?? true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
  };
}

export function createMatter(input) {
  if (!MATTER_LIFECYCLE_STATUSES.includes(input.status)) {
    throw new Error(`Matter status must be one of ${MATTER_LIFECYCLE_STATUSES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("Matter", input),
    matter_id: input.matter_id,
    client_id: input.client_id,
    title: input.title,
    status: input.status,
    created_by: input.created_by,
    created_at: input.created_at,
    opened_at: input.opened_at ?? null,
    closed_at: input.closed_at ?? null,
    matter_wiki_ref: input.matter_wiki_ref ?? `matterwiki:${input.tenant_id}:${input.matter_id}`,
    matter_graph_ref: input.matter_graph_ref ?? `mattergraph:${input.tenant_id}:${input.matter_id}`,
    future_citation_ledger_ref_policy: "reserved_for_rp06",
    future_loop_context_policy: "stable_context_reference_only_no_loop_engine",
    client_visible_by_default: false,
  });
}

export function createMatterMember(input) {
  return freezeRecord({
    ...baseRecord("MatterMember", input),
    member_id: input.member_id,
    user_id: input.user_id,
    role: input.role,
    status: input.status,
    access_scope: input.access_scope ?? "matter_team",
  });
}

export function createMatterTask(input) {
  return freezeRecord({
    ...baseRecord("MatterTask", input),
    task_id: input.task_id,
    title: input.title,
    status: input.status,
    created_by: input.created_by,
    assigned_to: input.assigned_to ?? null,
    due_at: input.due_at ?? null,
    source_ref: input.source_ref ?? null,
  });
}

export function createMatterCalendarEvent(input) {
  return freezeRecord({
    ...baseRecord("MatterCalendarEvent", input),
    event_id: input.event_id,
    title: input.title,
    status: input.status,
    starts_at: input.starts_at,
    ends_at: input.ends_at ?? null,
    source_ref: input.source_ref ?? null,
  });
}

export function createMatterChecklist(input) {
  return freezeRecord({
    ...baseRecord("MatterChecklist", input),
    checklist_id: input.checklist_id,
    title: input.title,
    status: input.status,
    item_ids: freezeList(input.item_ids),
    source_ref: input.source_ref ?? null,
  });
}

export function createMatterWiki(input) {
  return freezeRecord({
    ...baseRecord("MatterWiki", input),
    wiki_id: input.wiki_id,
    status: input.status,
    created_by: input.created_by,
    created_at: input.created_at,
    updated_by: input.updated_by,
    updated_at: input.updated_at,
    last_reviewed_by: input.last_reviewed_by ?? null,
    last_reviewed_at: input.last_reviewed_at ?? null,
    snapshot_version: input.snapshot_version,
    default_shell_created: input.default_shell_created ?? true,
    client_visible_sections_require_review: true,
    permission_trimmed_summary_required: true,
  });
}

export function createMatterWikiSection(input) {
  if (!MATTER_WIKI_SECTION_TYPES.includes(input.section_type)) {
    throw new Error(`MatterWikiSection section_type must be one of ${MATTER_WIKI_SECTION_TYPES.join(", ")}`);
  }
  if (!MATTER_WIKI_SOURCE_POLICIES.includes(input.source_policy)) {
    throw new Error(`MatterWikiSection source_policy must be one of ${MATTER_WIKI_SOURCE_POLICIES.join(", ")}`);
  }
  if (!MATTER_WIKI_REVIEW_STATUSES.includes(input.review_status)) {
    throw new Error(`MatterWikiSection review_status must be one of ${MATTER_WIKI_REVIEW_STATUSES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("MatterWikiSection", { ...input, status: input.review_status }),
    section_id: input.section_id,
    wiki_id: input.wiki_id,
    section_type: input.section_type,
    title: input.title,
    body: input.body ?? "",
    source_policy: input.source_policy,
    review_status: input.review_status,
    order_index: input.order_index,
    updated_at: input.updated_at,
    source_link_refs: freezeList(input.source_link_refs),
    ai_generated: input.ai_generated ?? false,
    client_visible_candidate: input.client_visible_candidate ?? false,
  });
}

export function createMatterWikiSourceLink(input) {
  return freezeRecord({
    ...baseRecord("MatterWikiSourceLink", input),
    link_id: input.link_id,
    section_id: input.section_id,
    source_type: input.source_type,
    source_id: input.source_id,
    citation_id: input.citation_id ?? null,
    document_version_id: input.document_version_id ?? null,
    email_message_id: input.email_message_id ?? null,
    ai_result_id: input.ai_result_id ?? null,
    status: input.status ?? "reserved",
  });
}

export function createMatterWikiSnapshot(input) {
  return freezeRecord({
    ...baseRecord("MatterWikiSnapshot", input),
    snapshot_id: input.snapshot_id,
    wiki_id: input.wiki_id,
    snapshot_hash: input.snapshot_hash,
    created_by: input.created_by,
    created_at: input.created_at,
    reason: input.reason,
    retention_class: input.retention_class,
    status: input.status ?? "created",
  });
}

export function createMatterGraphNode(input) {
  if (!MATTER_GRAPH_NODE_TYPES.includes(input.node_type)) {
    throw new Error(`MatterGraphNode node_type must be one of ${MATTER_GRAPH_NODE_TYPES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("MatterGraphNode", { ...input, status: input.review_status }),
    node_id: input.node_id,
    node_type: input.node_type,
    source_ref: input.source_ref,
    classification: input.classification,
    review_status: input.review_status,
    hidden_from_client: input.hidden_from_client ?? true,
  });
}

export function createMatterGraphEdge(input) {
  if (!MATTER_GRAPH_EDGE_TYPES.includes(input.edge_type)) {
    throw new Error(`MatterGraphEdge edge_type must be one of ${MATTER_GRAPH_EDGE_TYPES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("MatterGraphEdge", { ...input, status: input.review_status }),
    edge_id: input.edge_id,
    from_node_id: input.from_node_id ?? null,
    to_node_id: input.to_node_id ?? null,
    edge_type: input.edge_type,
    source_ref: input.source_ref,
    confidence: input.confidence,
    created_by: input.created_by,
    created_at: input.created_at,
    review_status: input.review_status,
    similarity_metadata: Object.freeze(input.similarity_metadata ?? {}),
  });
}

export function createMatterGraphTraversalResult(input) {
  return freezeRecord({
    result_id: input.result_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    visible_nodes: freezeList(input.visible_nodes),
    visible_edges: freezeList(input.visible_edges),
    trimmed_node_count: input.trimmed_node_count ?? 0,
    trimmed_edge_count: input.trimmed_edge_count ?? 0,
    policy_decision_id: input.policy_decision_id,
    audit_hint_refs: freezeList(input.audit_hint_refs),
    provider_runtime_executed: false,
    synthetic_only: input.synthetic_only ?? true,
  });
}

export function createMatterWikiShellForMatter(matter, input = {}) {
  const timestamp = input.timestamp ?? matter.created_at;
  const wiki = createMatterWiki({
    wiki_id: matter.matter_wiki_ref,
    tenant_id: matter.tenant_id,
    matter_id: matter.matter_id,
    status: "shell",
    created_by: input.created_by ?? matter.created_by,
    created_at: timestamp,
    updated_by: input.updated_by ?? matter.created_by,
    updated_at: timestamp,
    snapshot_version: 0,
    permission_envelope_id: matter.permission_envelope_id,
    audit_trace_id: matter.audit_trace_id,
  });
  const sections = ["matter_summary", "timeline", "facts", "issues", "risks", "tasks"].map((sectionType, index) =>
    createMatterWikiSection({
      section_id: `${wiki.wiki_id}:section:${sectionType}`,
      tenant_id: matter.tenant_id,
      matter_id: matter.matter_id,
      wiki_id: wiki.wiki_id,
      section_type: sectionType,
      title: sectionType.replaceAll("_", " "),
      source_policy: "uncited_internal_note",
      review_status: "under_review",
      order_index: index + 1,
      updated_at: timestamp,
      permission_envelope_id: matter.permission_envelope_id,
      audit_trace_id: matter.audit_trace_id,
    }),
  );
  return freezeRecord({
    shell_id: `matterwiki-shell:${matter.tenant_id}:${matter.matter_id}`,
    matter_id: matter.matter_id,
    tenant_id: matter.tenant_id,
    wiki,
    sections: Object.freeze(sections),
    creates_or_schedules_shell: true,
    writes_product_state: false,
    exposes_client_visible_wiki_output: false,
  });
}

export function createMatterGraphSkeletonForMatter(matter, input = {}) {
  const node = createMatterGraphNode({
    node_id: `mattergraph:${matter.tenant_id}:${matter.matter_id}:node:matter`,
    tenant_id: matter.tenant_id,
    matter_id: matter.matter_id,
    node_type: "Matter",
    source_ref: `matter:${matter.matter_id}`,
    classification: input.classification ?? "internal",
    review_status: "under_review",
    permission_envelope_id: matter.permission_envelope_id,
    audit_trace_id: matter.audit_trace_id,
  });
  return freezeRecord({
    skeleton_id: matter.matter_graph_ref,
    tenant_id: matter.tenant_id,
    matter_id: matter.matter_id,
    provider_runtime_selected: false,
    provider_runtime_executed: false,
    nodes: Object.freeze([node]),
    edges: Object.freeze([]),
    cross_matter_similarity_enabled: false,
    writes_product_state: false,
  });
}

const FACTORIES = Object.freeze({
  Matter: createMatter,
  MatterMember: createMatterMember,
  MatterTask: createMatterTask,
  MatterCalendarEvent: createMatterCalendarEvent,
  MatterChecklist: createMatterChecklist,
  MatterWiki: createMatterWiki,
  MatterWikiSection: createMatterWikiSection,
  MatterWikiSourceLink: createMatterWikiSourceLink,
  MatterWikiSnapshot: createMatterWikiSnapshot,
  MatterGraphNode: createMatterGraphNode,
  MatterGraphEdge: createMatterGraphEdge,
});

export function createMatterCoreRecord(modelType, input) {
  const factory = FACTORIES[modelType];
  if (!factory) throw new Error(`Unknown Matter Core model type ${modelType}`);
  return factory(input);
}

export function createMatterCoreSyntheticFixture() {
  const tenant_id = "tenant_rp05_synthetic";
  const matter = createMatter({
    matter_id: "matter_rp05_synthetic_opening",
    tenant_id,
    client_id: "client_rp05_amic",
    title: "RP05 synthetic matter opening",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-09T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  });
  const member = createMatterMember({
    member_id: "member_rp05_synthetic_owner",
    tenant_id,
    matter_id: matter.matter_id,
    user_id: "user_rp05_owner",
    role: "responsible_attorney",
    status: "active",
    permission_envelope_id: matter.permission_envelope_id,
    audit_trace_id: matter.audit_trace_id,
  });
  const task = createMatterTask({
    task_id: "task_rp05_conflict_clearance",
    tenant_id,
    matter_id: matter.matter_id,
    title: "Confirm matter opening checklist",
    status: "todo",
    created_by: "user_rp05_owner",
    permission_envelope_id: matter.permission_envelope_id,
    audit_trace_id: matter.audit_trace_id,
  });
  const wikiShell = createMatterWikiShellForMatter(matter);
  const graphSkeleton = createMatterGraphSkeletonForMatter(matter);
  return freezeRecord({
    fixture_id: "matter_core_cp177_synthetic_fixture",
    tenant_id,
    matter_id: matter.matter_id,
    records: Object.freeze([matter, member, task]),
    wiki_shell: wikiShell,
    graph_skeleton: graphSkeleton,
    synthetic_only: true,
    uses_real_client_data: false,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    model_definition_count: Object.keys(MATTER_CORE_MODEL_DEFINITIONS).length,
  });
}

