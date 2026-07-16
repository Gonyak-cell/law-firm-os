const NODE_TYPES = Object.freeze(["matter", "person", "document"]);
const RELATIONSHIP_TYPES = Object.freeze([
  "matter_person",
  "matter_document",
  "person_document",
]);
const RELATIONSHIP_STATUSES = Object.freeze(["active", "review_required", "inactive", "historical"]);
const FORBIDDEN_RAW_FIELDS = Object.freeze([
  "raw_document_text",
  "document_body",
  "storage_path",
  "raw_email",
  "raw_phone",
  "provider_payload",
  "credential",
  "token",
]);

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined;
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value).trim();
}

function requiredEnum(input, field, allowed) {
  const value = requiredString(input, field);
  if (!allowed.includes(value)) throw new TypeError(`${field} must be one of ${allowed.join(", ")}`);
  return value;
}

function rejectRawFields(input) {
  for (const field of FORBIDDEN_RAW_FIELDS) {
    if (Object.hasOwn(input ?? {}, field)) throw new TypeError(`Matter-People-Document graph must not include ${field}`);
  }
}

function safeMetadata(input = {}) {
  const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
  rejectRawFields(metadata);
  return Object.freeze({
    ...clone(metadata),
    raw_document_text_included: false,
    provider_payload_included: false,
    credentials_included: false,
    production_ready_claim: false,
    go_live_claim: false,
  });
}

function arrayOfStrings(input, field) {
  const value = input?.[field] ?? [];
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return Object.freeze(
    value.map((item) => {
      if (typeof item !== "string" || item.trim() === "") throw new TypeError(`${field} must contain non-empty strings`);
      return item.trim();
    }),
  );
}

function nodeKey(row) {
  return `${row.tenant_id}:${row.node_type}:${row.node_id}`;
}

function endpointKey(tenant_id, node_type, node_id) {
  return `${tenant_id}:${node_type}:${node_id}`;
}

function relationshipKey(row) {
  return `${row.tenant_id}:${row.relationship_id}`;
}

function canViewSensitive(permissionContext = {}) {
  return Boolean(permissionContext.can_view_sensitive_relationship_details);
}

function isRestrictedRelationship(row) {
  if (row.review_required) return true;
  return /(restricted|external|expert|tribunal|regulator)/i.test(String(row.permission_scope ?? ""));
}

function isRestrictedNode(row) {
  return Boolean(row.restricted_reference) || /(external|expert|tribunal|regulator|restricted)/i.test(String(row.permission_scope ?? ""));
}

function visibleNode(row, permissionContext) {
  const restricted = isRestrictedNode(row);
  const canView = !restricted || canViewSensitive(permissionContext);
  return Object.freeze({
    schema_version: row.schema_version,
    tenant_id: row.tenant_id,
    node_type: row.node_type,
    node_id: row.node_id,
    display_label: canView ? row.display_label : "restricted_reference",
    status: row.status,
    access_state: canView ? "visible" : "restricted",
    redacted_fields: canView ? [] : ["display_label", "metadata"],
    raw_document_text_included: false,
    provider_payload_included: false,
  });
}

function visibleRelationship(row, permissionContext) {
  const restricted = isRestrictedRelationship(row);
  const canView = !restricted || canViewSensitive(permissionContext);
  return Object.freeze({
    schema_version: row.schema_version,
    tenant_id: row.tenant_id,
    relationship_id: row.relationship_id,
    relationship_type: row.relationship_type,
    from_type: row.from_type,
    from_id: canView || row.from_type === "matter" ? row.from_id : null,
    to_type: row.to_type,
    to_id: canView ? row.to_id : null,
    status: row.status,
    source_refs: canView ? row.source_refs : [],
    permission_scope: canView ? row.permission_scope : "restricted_reference",
    review_required: row.review_required,
    audit_ref: canView ? row.audit_ref : null,
    access_state: canView ? "visible" : "restricted",
    redacted_fields: canView ? [] : ["to_id", "source_refs", "audit_ref"],
    raw_document_text_included: false,
    provider_payload_included: false,
  });
}

function touches(row, node_type, node_id) {
  return (row.from_type === node_type && row.from_id === node_id) || (row.to_type === node_type && row.to_id === node_id);
}

function otherEndpoint(row, node_type, node_id) {
  if (row.from_type === node_type && row.from_id === node_id) {
    return { node_type: row.to_type, node_id: row.to_id };
  }
  if (row.to_type === node_type && row.to_id === node_id) {
    return { node_type: row.from_type, node_id: row.from_id };
  }
  return null;
}

function byNode(left, right) {
  return left.node_type.localeCompare(right.node_type) || left.node_id.localeCompare(right.node_id);
}

function byRelationship(left, right) {
  return left.relationship_id.localeCompare(right.relationship_id);
}

export function createMatterPeopleDocumentNode(input = {}) {
  rejectRawFields(input);
  return Object.freeze({
    schema_version: "lawos.upl_e07.matter_people_document_node.v1",
    tenant_id: requiredString(input, "tenant_id"),
    node_type: requiredEnum(input, "node_type", NODE_TYPES),
    node_id: requiredString(input, "node_id"),
    display_label: requiredString(input, "display_label"),
    status: optionalString(input, "status") ?? "active",
    permission_scope: optionalString(input, "permission_scope") ?? "matter_graph_reference",
    restricted_reference: Boolean(input.restricted_reference),
    metadata: safeMetadata(input),
  });
}

export function createMatterPeopleDocumentRelationship(input = {}) {
  rejectRawFields(input);
  return Object.freeze({
    schema_version: "lawos.upl_e07.matter_people_document_relationship.v1",
    tenant_id: requiredString(input, "tenant_id"),
    relationship_id: requiredString(input, "relationship_id"),
    from_type: requiredEnum(input, "from_type", NODE_TYPES),
    from_id: requiredString(input, "from_id"),
    to_type: requiredEnum(input, "to_type", NODE_TYPES),
    to_id: requiredString(input, "to_id"),
    relationship_type: requiredEnum(input, "relationship_type", RELATIONSHIP_TYPES),
    status: requiredEnum(input, "status", RELATIONSHIP_STATUSES),
    source_refs: arrayOfStrings(input, "source_refs"),
    permission_scope: optionalString(input, "permission_scope") ?? "matter_graph_reference",
    review_required: Boolean(input.review_required),
    audit_ref: requiredString(input, "audit_ref"),
    metadata: safeMetadata(input),
  });
}

export function createMatterPeopleDocumentGraphSeed(tenantId = "tenant_lcx_ppl") {
  return Object.freeze({
    source_kind: "fixture_seed",
    nodes: Object.freeze([
      createMatterPeopleDocumentNode({
        tenant_id: tenantId,
        node_type: "matter",
        node_id: "matter_lcx_001",
        display_label: "LCX Litigation Matter",
      }),
      createMatterPeopleDocumentNode({
        tenant_id: tenantId,
        node_type: "person",
        node_id: "person_internal_lawyer_001",
        display_label: "Ari Kim",
        permission_scope: "firm_internal_reference",
      }),
      createMatterPeopleDocumentNode({
        tenant_id: tenantId,
        node_type: "person",
        node_id: "person_staff_paralegal_001",
        display_label: "Mina Park",
        permission_scope: "firm_internal_reference",
      }),
      createMatterPeopleDocumentNode({
        tenant_id: tenantId,
        node_type: "person",
        node_id: "person_opposing_counsel_001",
        display_label: "Noah Choi",
        permission_scope: "external_reference_only",
        restricted_reference: true,
      }),
      createMatterPeopleDocumentNode({
        tenant_id: tenantId,
        node_type: "person",
        node_id: "person_expert_witness_001",
        display_label: "Dr. Seo",
        permission_scope: "expert_limited",
        restricted_reference: true,
      }),
      createMatterPeopleDocumentNode({
        tenant_id: tenantId,
        node_type: "document",
        node_id: "document_lcx_expert_report_001",
        display_label: "Expert report metadata",
        permission_scope: "work_product_limited",
        restricted_reference: true,
        metadata: { hash_ref: "sha256:expert-report-fixture", byte_body_included: false },
      }),
      createMatterPeopleDocumentNode({
        tenant_id: tenantId,
        node_type: "document",
        node_id: "document_lcx_hearing_bundle_001",
        display_label: "Hearing bundle metadata",
        permission_scope: "matter_team_reference",
        metadata: { hash_ref: "sha256:hearing-bundle-fixture", byte_body_included: false },
      }),
    ]),
    relationships: Object.freeze([
      createMatterPeopleDocumentRelationship({
        tenant_id: tenantId,
        relationship_id: "mpd_rel_matter_internal_lawyer",
        from_type: "matter",
        from_id: "matter_lcx_001",
        to_type: "person",
        to_id: "person_internal_lawyer_001",
        relationship_type: "matter_person",
        status: "active",
        source_refs: ["UPL-E-07:seed:responsible-attorney"],
        permission_scope: "firm_internal_reference",
        audit_ref: "audit_mpd_matter_internal_lawyer",
      }),
      createMatterPeopleDocumentRelationship({
        tenant_id: tenantId,
        relationship_id: "mpd_rel_matter_paralegal",
        from_type: "matter",
        from_id: "matter_lcx_001",
        to_type: "person",
        to_id: "person_staff_paralegal_001",
        relationship_type: "matter_person",
        status: "active",
        source_refs: ["UPL-E-07:seed:matter-team"],
        permission_scope: "firm_internal_reference",
        audit_ref: "audit_mpd_matter_paralegal",
      }),
      createMatterPeopleDocumentRelationship({
        tenant_id: tenantId,
        relationship_id: "mpd_rel_matter_opposing_counsel",
        from_type: "matter",
        from_id: "matter_lcx_001",
        to_type: "person",
        to_id: "person_opposing_counsel_001",
        relationship_type: "matter_person",
        status: "review_required",
        source_refs: ["UPL-E-07:seed:opposing-counsel"],
        permission_scope: "external_reference_only",
        review_required: true,
        audit_ref: "audit_mpd_matter_opposing_counsel",
      }),
      createMatterPeopleDocumentRelationship({
        tenant_id: tenantId,
        relationship_id: "mpd_rel_matter_expert",
        from_type: "matter",
        from_id: "matter_lcx_001",
        to_type: "person",
        to_id: "person_expert_witness_001",
        relationship_type: "matter_person",
        status: "review_required",
        source_refs: ["UPL-E-07:seed:expert"],
        permission_scope: "expert_limited",
        review_required: true,
        audit_ref: "audit_mpd_matter_expert",
      }),
      createMatterPeopleDocumentRelationship({
        tenant_id: tenantId,
        relationship_id: "mpd_rel_matter_hearing_bundle",
        from_type: "matter",
        from_id: "matter_lcx_001",
        to_type: "document",
        to_id: "document_lcx_hearing_bundle_001",
        relationship_type: "matter_document",
        status: "active",
        source_refs: ["UPL-E-07:seed:hearing-bundle"],
        permission_scope: "matter_team_reference",
        audit_ref: "audit_mpd_matter_hearing_bundle",
      }),
      createMatterPeopleDocumentRelationship({
        tenant_id: tenantId,
        relationship_id: "mpd_rel_expert_report",
        from_type: "person",
        from_id: "person_expert_witness_001",
        to_type: "document",
        to_id: "document_lcx_expert_report_001",
        relationship_type: "person_document",
        status: "review_required",
        source_refs: ["UPL-E-07:seed:expert-report"],
        permission_scope: "expert_limited",
        review_required: true,
        audit_ref: "audit_mpd_expert_report",
      }),
      createMatterPeopleDocumentRelationship({
        tenant_id: tenantId,
        relationship_id: "mpd_rel_matter_expert_report",
        from_type: "matter",
        from_id: "matter_lcx_001",
        to_type: "document",
        to_id: "document_lcx_expert_report_001",
        relationship_type: "matter_document",
        status: "review_required",
        source_refs: ["UPL-E-07:seed:matter-expert-report"],
        permission_scope: "work_product_limited",
        review_required: true,
        audit_ref: "audit_mpd_matter_expert_report",
      }),
    ]),
  });
}

export function createMatterPeopleDocumentGraphSeedFromRuntime({
  tenant_id,
  employees = [],
  documents = [],
  matter_assignments = [],
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const employeeById = new Map(
    employees
      .filter((employee) => employee?.tenant_id === tenantId && employee.employee_id)
      .map((employee) => [employee.employee_id, employee]),
  );
  const assignments = matter_assignments.filter((assignment) =>
    assignment?.tenant_id === tenantId && assignment.employee_id && assignment.matter_id
  );
  const documentsForTenant = documents.filter((document) =>
    document?.tenant_id === tenantId && document.employee_id && document.document_id
  );
  const nodes = new Map();
  const relationships = new Map();

  function putNode(input) {
    const node = createMatterPeopleDocumentNode({ tenant_id: tenantId, ...input });
    nodes.set(nodeKey(node), node);
  }

  function putRelationship(input) {
    const relationship = createMatterPeopleDocumentRelationship({ tenant_id: tenantId, ...input });
    relationships.set(relationshipKey(relationship), relationship);
  }

  for (const assignment of assignments) {
    putNode({
      node_type: "matter",
      node_id: assignment.matter_id,
      display_label: `Matter ${assignment.matter_id}`,
      permission_scope: "matter_assignment_reference",
      metadata: {
        source_kind: "hrx_matter_assignment",
        capacity_pct: assignment.capacity_pct ?? null,
      },
    });
    const employee = employeeById.get(assignment.employee_id);
    putNode({
      node_type: "person",
      node_id: assignment.employee_id,
      display_label: employee?.display_name ?? employee?.name ?? assignment.employee_id,
      permission_scope: "firm_internal_reference",
      metadata: {
        source_kind: "hrx_employee_repository",
        employee_status: employee?.status ?? null,
      },
    });
    putRelationship({
      relationship_id: `mpd_rt_matter_person_${assignment.matter_id}_${assignment.employee_id}`,
      from_type: "matter",
      from_id: assignment.matter_id,
      to_type: "person",
      to_id: assignment.employee_id,
      relationship_type: "matter_person",
      status: "active",
      source_refs: [`HrxMatterAssignment:${assignment.matter_id}:${assignment.employee_id}`],
      permission_scope: "matter_assignment_reference",
      audit_ref: `audit_mpd_runtime_assignment_${assignment.matter_id}_${assignment.employee_id}`,
      metadata: { source_kind: "hrx_matter_assignment" },
    });
  }

  for (const document of documentsForTenant) {
    const employee = employeeById.get(document.employee_id);
    if (!nodes.has(endpointKey(tenantId, "person", document.employee_id))) {
      putNode({
        node_type: "person",
        node_id: document.employee_id,
        display_label: employee?.display_name ?? employee?.name ?? document.employee_id,
        permission_scope: "firm_internal_reference",
        metadata: {
          source_kind: "hrx_employee_repository",
          employee_status: employee?.status ?? null,
        },
      });
    }
    putNode({
      node_type: "document",
      node_id: document.document_id,
      display_label: document.title ?? document.document_id,
      permission_scope: "hrx_document_metadata",
      metadata: {
        source_kind: "hrx_document_repository",
        document_type: document.document_type,
        source_ref: document.source_ref ?? null,
        document_body_included: false,
      },
    });
    putRelationship({
      relationship_id: `mpd_rt_person_document_${document.employee_id}_${document.document_id}`,
      from_type: "person",
      from_id: document.employee_id,
      to_type: "document",
      to_id: document.document_id,
      relationship_type: "person_document",
      status: "active",
      source_refs: [`HrxDocument:${document.document_id}`],
      permission_scope: "hrx_document_metadata",
      audit_ref: `audit_mpd_runtime_document_${document.document_id}`,
      metadata: { source_kind: "hrx_document_repository" },
    });
    for (const assignment of assignments.filter((item) => item.employee_id === document.employee_id)) {
      putRelationship({
        relationship_id: `mpd_rt_matter_document_${assignment.matter_id}_${document.document_id}`,
        from_type: "matter",
        from_id: assignment.matter_id,
        to_type: "document",
        to_id: document.document_id,
        relationship_type: "matter_document",
        status: "active",
        source_refs: [`HrxMatterAssignment:${assignment.matter_id}:${assignment.employee_id}`, `HrxDocument:${document.document_id}`],
        permission_scope: "hrx_document_metadata",
        audit_ref: `audit_mpd_runtime_matter_document_${assignment.matter_id}_${document.document_id}`,
        metadata: { source_kind: "hrx_document_repository" },
      });
    }
  }

  return Object.freeze({
    source_kind: "runtime_repository_derived",
    nodes: Object.freeze([...nodes.values()]),
    relationships: Object.freeze([...relationships.values()]),
  });
}

export function createMatterPeopleDocumentGraphTable(seed = createMatterPeopleDocumentGraphSeed()) {
  const nodes = new Map();
  const relationships = new Map();
  const tableSource = seed.source_kind ?? "fixture_seed";

  const table = Object.freeze({
    upsertNode(input) {
      const node = createMatterPeopleDocumentNode(input);
      nodes.set(nodeKey(node), node);
      return clone(node);
    },

    upsertRelationship(input) {
      const relationship = createMatterPeopleDocumentRelationship(input);
      const fromExists = nodes.has(endpointKey(relationship.tenant_id, relationship.from_type, relationship.from_id));
      const toExists = nodes.has(endpointKey(relationship.tenant_id, relationship.to_type, relationship.to_id));
      if (!fromExists) throw new TypeError(`from node not found: ${relationship.from_type}:${relationship.from_id}`);
      if (!toExists) throw new TypeError(`to node not found: ${relationship.to_type}:${relationship.to_id}`);
      relationships.set(relationshipKey(relationship), relationship);
      return clone(relationship);
    },

    listRelationshipRows(query = {}) {
      const tenant_id = requiredString(query, "tenant_id");
      return Object.freeze(
        [...relationships.values()]
          .filter((row) => row.tenant_id === tenant_id)
          .filter((row) => !query.relationship_type || row.relationship_type === query.relationship_type)
          .filter((row) => !query.from_type || row.from_type === query.from_type)
          .filter((row) => !query.from_id || row.from_id === query.from_id)
          .filter((row) => !query.to_type || row.to_type === query.to_type)
          .filter((row) => !query.to_id || row.to_id === query.to_id)
          .sort(byRelationship)
          .map(clone),
      );
    },

    traverse(query = {}, permissionContext = {}) {
      const tenant_id = requiredString(query, "tenant_id");
      const start_type = requiredEnum(query, "start_type", NODE_TYPES);
      const start_id = requiredString(query, "start_id");
      const maxDepth = Math.max(1, Math.min(Number(query.depth ?? 2), 3));
      const start = nodes.get(endpointKey(tenant_id, start_type, start_id));
      const visitedNodes = new Map();
      const visitedRelationships = new Map();
      const traversalPaths = [];
      const queue = [];

      if (start) {
        visitedNodes.set(nodeKey(start), start);
        queue.push({ node_type: start_type, node_id: start_id, depth: 0, path: [] });
      }

      while (queue.length > 0) {
        const current = queue.shift();
        if (current.depth >= maxDepth) continue;

        const adjacent = [...relationships.values()]
          .filter((row) => row.tenant_id === tenant_id)
          .filter((row) => row.status !== "inactive")
          .filter((row) => touches(row, current.node_type, current.node_id))
          .sort(byRelationship);

        for (const relationship of adjacent) {
          visitedRelationships.set(relationshipKey(relationship), relationship);
          const endpoint = otherEndpoint(relationship, current.node_type, current.node_id);
          if (!endpoint) continue;

          const restricted = isRestrictedRelationship(relationship);
          if (restricted && !canViewSensitive(permissionContext)) continue;

          const nextNode = nodes.get(endpointKey(tenant_id, endpoint.node_type, endpoint.node_id));
          if (!nextNode) continue;
          const nextPath = Object.freeze([...current.path, relationship.relationship_id]);
          traversalPaths.push(Object.freeze({
            from: Object.freeze({ node_type: start_type, node_id: start_id }),
            to: Object.freeze(endpoint),
            depth: current.depth + 1,
            relationship_ids: nextPath,
          }));

          if (!visitedNodes.has(nodeKey(nextNode))) {
            visitedNodes.set(nodeKey(nextNode), nextNode);
            queue.push({ ...endpoint, depth: current.depth + 1, path: nextPath });
          }
        }
      }

      const rawRelationships = Object.freeze([...visitedRelationships.values()].sort(byRelationship));
      const rawNodes = Object.freeze([...visitedNodes.values()].sort(byNode));
      return Object.freeze({
        schema_version: "lawos.upl_e07.matter_people_document_graph_traversal.v1",
        outcome: start ? "ok" : "not_found",
        table_kind: "matter_people_document_relationship_table",
        table_source: tableSource,
        pivot: Object.freeze({ tenant_id, start_type, start_id, depth: maxDepth }),
        nodes: Object.freeze(rawNodes.map((node) => visibleNode(node, permissionContext))),
        relationships: Object.freeze(rawRelationships.map((relationship) => visibleRelationship(relationship, permissionContext))),
        traversal_paths: Object.freeze(traversalPaths),
        audit_summary: Object.freeze({
          node_count: rawNodes.length,
          relationship_count: rawRelationships.length,
          path_count: traversalPaths.length,
          raw_document_text_included: false,
          provider_payload_included: false,
          relationship_table_source: tableSource,
          production_ready_claim: false,
        }),
        claim_boundary: MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY,
      });
    },
  });

  for (const node of seed.nodes ?? []) table.upsertNode(node);
  for (const relationship of seed.relationships ?? []) table.upsertRelationship(relationship);
  return table;
}

export const MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY = Object.freeze({
  matter_people_document_relationship_table_complete: true,
  traversal_api_complete: true,
  raw_document_text_included: false,
  provider_payload_included: false,
  production_ready: false,
  go_live_approved: false,
  enterprise_trust_approved: false,
});
