import assert from "node:assert/strict";
import test from "node:test";
import { createHrxOrgHistoryEntry, createHrxOrgUnit, createInMemoryHrxOrgDirectory } from "../src/org.js";
import { createHrxReportingLine } from "../src/reporting-line.js";

test("HRX org model creates effective-dated org units and history", () => {
  const unit = createHrxOrgUnit({
    tenant_id: "tenant-a",
    org_unit_id: "org-001",
    display_name: "Disputes",
    effective_from: "2026-06-19",
  });
  assert.equal(unit.display_name, "Disputes");
  const history = createHrxOrgHistoryEntry({
    tenant_id: "tenant-a",
    org_unit_id: "org-001",
    change_type: "parent_changed",
    effective_from: "2026-07-01",
    next_parent_org_unit_id: "org-root",
  });
  assert.equal(history.next_parent_org_unit_id, "org-root");
});

test("HRX reporting line supports solid and dotted manager lines", () => {
  const solid = createHrxReportingLine({
    tenant_id: "tenant-a",
    reporting_line_id: "line-001",
    employee_id: "emp-001",
    manager_employee_id: "emp-002",
    line_type: "solid",
    effective_from: "2026-06-19",
  });
  const dotted = createHrxReportingLine({
    tenant_id: "tenant-a",
    reporting_line_id: "line-002",
    employee_id: "emp-001",
    manager_employee_id: "emp-003",
    line_type: "dotted",
    effective_from: "2026-06-19",
  });
  assert.equal(solid.line_type, "solid");
  assert.equal(dotted.line_type, "dotted");
  assert.throws(
    () =>
      createHrxReportingLine({
        tenant_id: "tenant-a",
        reporting_line_id: "bad",
        employee_id: "emp-001",
        manager_employee_id: "emp-001",
        line_type: "solid",
        effective_from: "2026-06-19",
      }),
    /must not equal/,
  );
});

test("HRX org directory creates lists and updates effective-dated org tree nodes", () => {
  const directory = createInMemoryHrxOrgDirectory();
  directory.create({
    tenant_id: "tenant-a",
    org_unit_id: "org-root",
    display_name: "Firm",
    effective_from: "2026-01-01",
  });
  directory.create({
    tenant_id: "tenant-a",
    org_unit_id: "org-litigation",
    display_name: "Litigation",
    parent_org_unit_id: "org-root",
    effective_from: "2026-01-01",
  });
  assert.equal(directory.list({ tenant_id: "tenant-a", parent_org_unit_id: "org-root" }).length, 1);

  const updated = directory.update(
    { tenant_id: "tenant-a", org_unit_id: "org-litigation" },
    {
      display_name: "Disputes",
      parent_org_unit_id: null,
      effective_from: "2026-07-01",
      change_type: "parent_changed",
    },
  );
  assert.equal(updated.display_name, "Disputes");
  assert.equal(updated.effective_from, "2026-07-01");
  assert.equal(directory.history({ tenant_id: "tenant-a", org_unit_id: "org-litigation" }).at(-1).change_type, "parent_changed");
});
