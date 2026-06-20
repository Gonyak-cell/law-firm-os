import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryPeopleGraph, createPeopleGraphEdge } from "../src/people-graph.js";

test("people graph persists employee org manager matter edges", () => {
  const graph = createInMemoryPeopleGraph();
  graph.add({
    tenant_id: "tenant-a",
    edge_id: "edge-001",
    edge_type: "employee_org",
    from_employee_id: "emp-001",
    to_ref: "org-001",
    effective_from: "2026-06-19",
  });
  graph.add({
    tenant_id: "tenant-a",
    edge_id: "edge-002",
    edge_type: "employee_manager",
    from_employee_id: "emp-001",
    to_ref: "emp-002",
    effective_from: "2026-06-19",
  });
  graph.add({
    tenant_id: "tenant-a",
    edge_id: "edge-003",
    edge_type: "employee_matter",
    from_employee_id: "emp-001",
    to_ref: "matter-001",
    effective_from: "2026-06-19",
  });
  graph.add({
    tenant_id: "tenant-a",
    edge_id: "edge-004",
    edge_type: "employee_workload",
    from_employee_id: "emp-001",
    to_ref: "workload:aggregate:2026-06",
    effective_from: "2026-06-19",
  });
  assert.equal(graph.list({ tenant_id: "tenant-a", from_employee_id: "emp-001" }).length, 4);
});

test("people graph rejects client detail leakage", () => {
  assert.throws(
    () =>
      createPeopleGraphEdge({
        tenant_id: "tenant-a",
        edge_id: "edge-001",
        edge_type: "employee_matter",
        from_employee_id: "emp-001",
        to_ref: "matter-001",
        client_name: "Sensitive Client",
        effective_from: "2026-06-19",
      }),
    /must not include client detail/,
  );
});
