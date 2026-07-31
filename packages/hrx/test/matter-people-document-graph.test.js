import assert from "node:assert/strict";
import test from "node:test";
import {
  createMatterPeopleDocumentGraphSeed,
  createMatterPeopleDocumentGraphSeedFromRuntime,
  createMatterPeopleDocumentGraphTable,
  createMatterPeopleDocumentRelationship,
  MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY,
} from "../src/matter-people-document-graph.js";
import { createLegalPeoplePermissionContext } from "../src/legal-people-api.js";

const tenant_id = "tenant_mpd_test";

function privilegedPermission() {
  return createLegalPeoplePermissionContext({
    actor_id: "legal-ops-001",
    actor_role: "legal_ops,conflicts_reviewer",
  });
}

function restrictedPermission() {
  return createLegalPeoplePermissionContext({
    actor_id: "people-ops-001",
    actor_role: "people_ops",
  });
}

test("UPL-E-07 graph table stores matter, people, and document relationships", () => {
  const table = createMatterPeopleDocumentGraphTable(createMatterPeopleDocumentGraphSeed(tenant_id));
  const rows = table.listRelationshipRows({ tenant_id });

  assert.ok(rows.some((row) => row.relationship_type === "matter_person"));
  assert.ok(rows.some((row) => row.relationship_type === "matter_document"));
  assert.ok(rows.some((row) => row.relationship_type === "person_document"));
  assert.ok(rows.some((row) => row.to_id === "document_lcx_expert_report_001"));
  assert.equal(JSON.stringify(rows).includes("must not be stored"), false);
});

test("UPL-E-07 runtime seed derives graph rows from assignments and HR documents", () => {
  const seed = createMatterPeopleDocumentGraphSeedFromRuntime({
    tenant_id,
    employees: [{ tenant_id, employee_id: "emp-001", display_name: "검증 구성원", status: "active" }],
    matter_assignments: [{ tenant_id, employee_id: "emp-001", matter_id: "matter-001", capacity_pct: 25 }],
    documents: [{
      tenant_id,
      employee_id: "emp-001",
      document_id: "doc-001",
      document_type: "employment_contract",
      title: "근로계약서",
      source_ref: "DMS:doc-001",
      document_body_included: false,
    }],
  });
  const table = createMatterPeopleDocumentGraphTable(seed);
  const traversal = table.traverse(
    { tenant_id, start_type: "matter", start_id: "matter-001", depth: 2 },
    privilegedPermission(),
  );

  assert.equal(seed.source_kind, "runtime_repository_derived");
  assert.equal(traversal.table_source, "runtime_repository_derived");
  assert.ok(traversal.nodes.some((node) => node.node_type === "person" && node.node_id === "emp-001"));
  assert.ok(traversal.nodes.some((node) => node.node_type === "document" && node.node_id === "doc-001"));
  assert.ok(traversal.relationships.some((row) => row.relationship_type === "matter_person"));
  assert.ok(traversal.relationships.some((row) => row.relationship_type === "person_document"));
  assert.ok(traversal.relationships.some((row) => row.relationship_type === "matter_document"));
  assert.equal(traversal.audit_summary.relationship_table_source, "runtime_repository_derived");
  assert.equal(JSON.stringify(traversal).includes("document_body"), false);
});

test("UPL-E-07 runtime person labels never expose employee identifiers", () => {
  const employees = [
    { tenant_id, employee_id: "emp-email", display_name: "lee@example.com" },
    { tenant_id, employee_id: "emp-uuid", display_name: "550e8400-e29b-41d4-a716-446655440000" },
    { tenant_id, employee_id: "emp-hex", display_name: "0123456789abcdef0123456789abcdef" },
    { tenant_id, employee_id: "emp-opaque", display_name: "opaque-9f2a4c7b8d1e" },
    { tenant_id, employee_id: "emp-id-equal", display_name: "emp-id-equal" },
    { tenant_id, employee_id: "emp-leena", name: "Leena Kim" },
    { tenant_id, employee_id: "emp-doc-email", display_name: "doc.owner@example.com" },
  ];
  const assignments = employees.slice(0, 6).map((employee, index) => ({
    tenant_id,
    employee_id: employee.employee_id,
    matter_id: `matter-label-${index + 1}`,
  }));
  const seed = createMatterPeopleDocumentGraphSeedFromRuntime({
    tenant_id,
    employees,
    matter_assignments: assignments,
    documents: [{
      tenant_id,
      employee_id: "emp-doc-email",
      document_id: "doc-label-only",
      document_type: "employment_contract",
      title: "근로계약서",
    }],
  });

  const personNodes = new Map(
    seed.nodes
      .filter((node) => node.node_type === "person")
      .map((node) => [node.node_id, node]),
  );
  const unresolved = "구성원 이름 확인 필요";
  for (const employeeId of ["emp-email", "emp-uuid", "emp-hex", "emp-opaque", "emp-id-equal", "emp-doc-email"]) {
    const node = personNodes.get(employeeId);
    assert.equal(node.node_id, employeeId);
    assert.equal(node.display_label, unresolved);
    assert.notEqual(node.display_label, node.node_id);
  }
  assert.equal(personNodes.get("emp-leena").node_id, "emp-leena");
  assert.equal(personNodes.get("emp-leena").display_label, "Leena Kim");

  const table = createMatterPeopleDocumentGraphTable(seed);
  const traversal = table.traverse(
    { tenant_id, start_type: "matter", start_id: "matter-label-1", depth: 1 },
    privilegedPermission(),
  );
  const visibleAssignmentPerson = traversal.nodes.find((node) => node.node_type === "person");
  assert.equal(visibleAssignmentPerson.node_id, "emp-email");
  assert.equal(visibleAssignmentPerson.display_label, unresolved);
});

test("UPL-E-07 runtime document labels never expose missing or unsafe document identifiers", () => {
  const seed = createMatterPeopleDocumentGraphSeedFromRuntime({
    tenant_id,
    documents: [
      {
        tenant_id,
        employee_id: "emp-null-title",
        document_id: "550e8400-e29b-41d4-a716-446655440000",
        title: null,
      },
      {
        tenant_id,
        employee_id: "emp-opaque-title",
        document_id: "doc-opaque-9f2a4c7b8d1e",
        title: "doc-opaque-9f2a4c7b8d1e",
      },
      {
        tenant_id,
        employee_id: "emp-uuid-title",
        document_id: "doc-uuid-title",
        title: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        tenant_id,
        employee_id: "emp-legitimate-title",
        document_id: "doc-legitimate-title",
        title: "근로계약서",
      },
    ],
  });
  const documentNodes = new Map(
    seed.nodes
      .filter((node) => node.node_type === "document")
      .map((node) => [node.node_id, node]),
  );

  assert.equal(documentNodes.get("550e8400-e29b-41d4-a716-446655440000").display_label, "문서 제목 확인 필요");
  assert.equal(documentNodes.get("doc-opaque-9f2a4c7b8d1e").display_label, "문서 제목 확인 필요");
  assert.equal(documentNodes.get("doc-uuid-title").display_label, "문서 제목 확인 필요");
  assert.equal(documentNodes.get("doc-legitimate-title").display_label, "근로계약서");
  assert.notEqual(documentNodes.get("550e8400-e29b-41d4-a716-446655440000").display_label, "550e8400-e29b-41d4-a716-446655440000");
  assert.notEqual(documentNodes.get("doc-opaque-9f2a4c7b8d1e").display_label, "doc-opaque-9f2a4c7b8d1e");
});

test("UPL-E-07 traversal reaches people and documents from a matter pivot", () => {
  const table = createMatterPeopleDocumentGraphTable(createMatterPeopleDocumentGraphSeed(tenant_id));
  const traversal = table.traverse(
    { tenant_id, start_type: "matter", start_id: "matter_lcx_001", depth: 2 },
    privilegedPermission(),
  );

  assert.equal(traversal.outcome, "ok");
  assert.equal(traversal.table_kind, "matter_people_document_relationship_table");
  assert.ok(traversal.nodes.some((node) => node.node_type === "matter" && node.node_id === "matter_lcx_001"));
  assert.ok(traversal.nodes.some((node) => node.node_type === "person" && node.node_id === "person_internal_lawyer_001"));
  assert.ok(traversal.nodes.some((node) => node.node_type === "document" && node.node_id === "document_lcx_expert_report_001"));
  assert.ok(traversal.relationships.some((row) => row.relationship_type === "person_document"));
  assert.ok(
    traversal.traversal_paths.some((path) =>
      path.to.node_id === "document_lcx_expert_report_001" &&
      path.relationship_ids.includes("mpd_rel_expert_report"),
    ),
  );
  assert.equal(traversal.audit_summary.raw_document_text_included, false);
  assert.equal(traversal.claim_boundary.production_ready, false);
});

test("UPL-E-07 restricted traversal redacts review-required endpoints", () => {
  const table = createMatterPeopleDocumentGraphTable(createMatterPeopleDocumentGraphSeed(tenant_id));
  const traversal = table.traverse(
    { tenant_id, start_type: "matter", start_id: "matter_lcx_001", depth: 2 },
    restrictedPermission(),
  );

  const restrictedEdges = traversal.relationships.filter((row) => row.access_state === "restricted");
  assert.ok(restrictedEdges.length >= 1);
  assert.ok(restrictedEdges.every((row) => row.to_id === null));
  assert.equal(JSON.stringify(traversal).includes("document_lcx_expert_report_001"), false);
  assert.equal(JSON.stringify(traversal).includes("Expert report metadata"), false);
});

test("UPL-E-07 graph rejects raw document payload fields", () => {
  assert.throws(
    () =>
      createMatterPeopleDocumentRelationship({
        tenant_id,
        relationship_id: "bad_raw_document",
        from_type: "matter",
        from_id: "matter_lcx_001",
        to_type: "document",
        to_id: "doc",
        relationship_type: "matter_document",
        status: "active",
        audit_ref: "audit_bad",
        raw_document_text: "must not be stored",
      }),
    /raw_document_text/,
  );
});

test("UPL-E-07 boundary stays local and does not claim production readiness", () => {
  assert.equal(MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY.matter_people_document_relationship_table_complete, true);
  assert.equal(MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY.traversal_api_complete, true);
  assert.equal(MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY.raw_document_text_included, false);
  assert.equal(MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY.production_ready, false);
  assert.equal(MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY.go_live_approved, false);
});
