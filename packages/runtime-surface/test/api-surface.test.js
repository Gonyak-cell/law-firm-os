import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeSurfaceService, RUNTIME_SURFACE_DEFAULT_PRINCIPAL } from "../src/index.js";

const request = Object.freeze({
  principal: RUNTIME_SURFACE_DEFAULT_PRINCIPAL,
  permission_context_id: "api-surface-test"
});

test("Runtime surface session and current tenant APIs expose safe runtime state", () => {
  const service = createRuntimeSurfaceService();
  const session = service.getSession(request);
  const tenant = service.getCurrentTenant(request);
  assert.equal(session.body.item.user_id, "user-runtime-spine");
  assert.equal(tenant.body.item.object_type, "Tenant");
  assert.equal(session.body.production_ready_claim, false);
  assert.equal(tenant.body.runtime_ready_candidate, false);
});

test("Runtime surface supports client, matter, member, people, party, document, task, issue, wiki, and vault routes", () => {
  const service = createRuntimeSurfaceService();
  assert.equal(service.createClient({ ...request, client_id: "client-a", party_id: "party-runtime-spine", display_name: "Client A" }).body.item.object_type, "Client");
  assert.equal(service.getClient({ ...request, client_id: "client-a" }).body.item.client_id, "client-a");
  assert.equal(service.createMatter({ ...request, matter_id: "matter-a", client_id: "client-a", title: "Matter A" }).body.item.object_type, "Matter");
  assert.equal(service.getMatter({ ...request, matter_id: "matter-a" }).body.item.matter_id, "matter-a");
  assert.equal(service.assignMatterMember({ ...request, matter_id: "matter-a", employee_id: "employee-runtime-spine" }).body.item.object_type, "MatterMember");
  assert.ok(service.listEmployees(request).body.items.length > 0);
  assert.ok(service.listParties(request).body.items.length > 0);
  assert.ok(service.listContactRoles(request).body.items.length > 0);
  assert.ok(service.listDocuments(request).body.items.length > 0);
  assert.equal(service.linkMatterDocument({ ...request, matter_id: "matter-a", document_id: "document-a", title: "Document A" }).body.item.object_type, "Document");
  assert.ok(service.listTasks(request).body.items.length > 0);
  assert.equal(service.createTask({ ...request, task_id: "task-a", matter_id: "matter-a", title: "Task A" }).body.item.object_type, "Task");
  assert.ok(service.listIssues(request).body.items.length > 0);
  assert.equal(service.createIssue({ ...request, issue_id: "issue-a", matter_id: "matter-a", title: "Issue A" }).body.item.object_type, "Issue");
  assert.equal(service.readMatterWiki({ ...request, matter_id: "matter-runtime-spine" }).body.item.object_type, "MatterWiki");
  assert.equal(service.updateMatterWiki({ ...request, matter_id: "matter-a" }).body.item.snapshot_version, 1);
  const vault = service.exportVault({ ...request, matter_id: "matter-runtime-spine" });
  assert.equal(vault.body.export_only, true);
  assert.equal(vault.body.raw_payload_included, false);
});
