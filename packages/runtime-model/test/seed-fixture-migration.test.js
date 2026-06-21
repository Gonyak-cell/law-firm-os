import assert from "node:assert/strict";
import test from "node:test";
import { createDmsDocument, createDmsDocumentVersion, createDmsWorkspace } from "../../dms/src/index.js";
import { createEmployee } from "../../hrx/src/index.js";
import { createMasterDataParty, createMasterDataPerson } from "../../master-data/src/index.js";
import { createMatter, createMatterMember, createMatterTask } from "../../matter/src/index.js";
import { CANONICAL_SEED_FIXTURE, assertCanonicalMigrationCompatibility, validateCanonicalDataset } from "../src/index.js";

test("Canonical seed fixture covers every canonical object without runtime write claims", () => {
  const validation = validateCanonicalDataset(CANONICAL_SEED_FIXTURE);
  assert.equal(validation.ok, true);
  assert.equal(validation.object_type_count, validation.required_object_type_count);
  assert.equal(CANONICAL_SEED_FIXTURE.every((record) => record.synthetic_only === true), true);
  assert.equal(CANONICAL_SEED_FIXTURE.some((record) => record.writes_product_state === true), false);
});

test("Migration compatibility maps existing master-data, matter, HRX, and DMS records to canonical records", () => {
  const tenant_id = "tenant-a";
  const matter_id = "matter-a";
  const masterData = [
    createMasterDataParty({
      tenant_id,
      party_id: "party-a",
      party_type: "organization",
      display_name: "Party A",
      status: "active",
      owner_user_id: "user-a"
    }),
    createMasterDataPerson({
      tenant_id,
      person_id: "person-a",
      entity_id: "entity-a",
      display_name: "Person A",
      status: "active",
      owner_user_id: "user-a"
    })
  ];
  const matter = [
    createMatter({
      tenant_id,
      matter_id,
      client_id: "client-a",
      title: "Matter A",
      status: "open",
      created_by: "user-a",
      created_at: "2026-06-21T00:00:00.000Z",
      permission_envelope_id: "permission-a",
      audit_trace_id: "audit-a"
    }),
    createMatterMember({
      tenant_id,
      matter_id,
      member_id: "member-a",
      employee_id: "employee-a",
      user_id: "user-a",
      role: "responsible_attorney",
      status: "active",
      permission_envelope_id: "permission-a",
      audit_trace_id: "audit-a"
    }),
    createMatterTask({
      tenant_id,
      matter_id,
      task_id: "task-a",
      title: "Task A",
      status: "todo",
      created_by: "user-a",
      permission_envelope_id: "permission-a",
      audit_trace_id: "audit-a"
    })
  ];
  const hrx = [createEmployee({ tenant_id, employee_id: "employee-a", display_name: "Employee A", status: "active" })];
  const dms = [
    createDmsWorkspace({
      tenant_id,
      matter_id,
      workspace_id: "workspace-a",
      name: "Workspace A",
      status: "active",
      permission_envelope_id: "permission-a",
      audit_trace_id: "audit-a"
    }),
    createDmsDocument({
      tenant_id,
      matter_id,
      workspace_id: "workspace-a",
      document_id: "document-a",
      title: "Document A",
      status: "active",
      current_version_id: "version-a",
      permission_envelope_id: "classification-a",
      audit_trace_id: "audit-a"
    }),
    createDmsDocumentVersion({
      tenant_id,
      matter_id,
      version_id: "version-a",
      document_id: "document-a",
      version_number: 1,
      status: "current",
      file_object_id: "file-a",
      permission_envelope_id: "classification-a",
      audit_trace_id: "audit-a"
    })
  ];
  const result = assertCanonicalMigrationCompatibility({ masterData, matter, hrx, dms });
  assert.equal(result.ok, true);
  assert.ok(result.object_types.includes("Document"));
  assert.ok(result.object_types.includes("Employee"));
  assert.ok(result.object_types.includes("Matter"));
  assert.equal(result.records.some((record) => record.creates_database_rows === true), false);
});
