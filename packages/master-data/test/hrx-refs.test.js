import assert from "node:assert/strict";
import test from "node:test";
import {
  createHrxOrganizationRef,
  createHrxPersonRef,
  createHrxPracticeGroupRef,
  resolveHrxMasterDataRefs,
} from "../src/hrx-refs.js";

test("HRX master-data refs expose only safe reference fields", () => {
  assert.deepEqual(createHrxPersonRef({ tenant_id: "tenant-a", person_id: "person-001", display_name: "Ari Kim" }), {
    ref_type: "Person",
    tenant_id: "tenant-a",
    ref_id: "person-001",
    display_name: "Ari Kim",
  });
  assert.equal(createHrxOrganizationRef({ tenant_id: "tenant-a", organization_id: "org-001", display_name: "AMIC" }).ref_type, "Organization");
  assert.equal(
    createHrxPracticeGroupRef({ tenant_id: "tenant-a", practice_group_id: "pg-001", display_name: "Disputes" }).ref_type,
    "PracticeGroup",
  );
});

test("HRX master-data refs reject HR sensitive leakage", () => {
  assert.throws(
    () => createHrxPersonRef({ tenant_id: "tenant-a", person_id: "person-001", display_name: "Ari Kim", salary: "100" }),
    /HR sensitive field: salary/,
  );
  assert.throws(
    () =>
      createHrxOrganizationRef({
        tenant_id: "tenant-a",
        organization_id: "org-001",
        display_name: "AMIC",
        evaluation: "hidden",
      }),
    /HR sensitive field: evaluation/,
  );
});

test("HRX master-data resolver returns optional safe refs", () => {
  const refs = resolveHrxMasterDataRefs({
    person: { tenant_id: "tenant-a", person_id: "person-001", display_name: "Ari Kim" },
    practice_group: { tenant_id: "tenant-a", practice_group_id: "pg-001", display_name: "Disputes" },
  });
  assert.equal(refs.person.ref_id, "person-001");
  assert.equal(refs.organization, null);
  assert.equal(refs.practice_group.ref_id, "pg-001");
});
