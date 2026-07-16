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
