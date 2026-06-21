import assert from "node:assert/strict";
import test from "node:test";
import { createCanonicalRecord, validateCanonicalRecord } from "../src/index.js";

test("Canonical records fail closed on tenant and identity boundary errors", () => {
  assert.throws(
    () => createCanonicalRecord("Matter", { matter_id: "m-1", client_id: "c-1", title: "Matter", status: "open" }),
    /tenant_id/,
  );
  assert.throws(
    () =>
      createCanonicalRecord("Employee", {
        tenant_id: "tenant-a",
        employee_id: "emp-a",
        display_name: "Employee A",
        status: "active",
        account_id: "caller-supplied-account"
      }),
    /account_id is blocked/,
  );
  assert.throws(
    () =>
      createCanonicalRecord("ExternalUser", {
        tenant_id: "tenant-a",
        external_user_id: "external-a",
        party_id: "party-a",
        display_name: "External A",
        status: "invited",
        employee_id: "emp-a"
      }),
    /employee_id is blocked/,
  );
});

test("Classification envelope validates privilege, legal hold, retention, and permission envelope", () => {
  const envelope = createCanonicalRecord("ClassificationEnvelope", {
    tenant_id: "tenant-a",
    classification_envelope_id: "class-a",
    classification: "privileged",
    privilege: true,
    legal_hold: true,
    retention_policy_id: "retention-a",
    permission_envelope_id: "permission-a"
  });
  assert.equal(envelope.writes_product_state, false);
  assert.equal(envelope.creates_database_rows, false);
  assert.equal(Object.isFrozen(envelope), true);
  assert.equal(
    validateCanonicalRecord("ClassificationEnvelope", {
      tenant_id: "tenant-a",
      classification_envelope_id: "class-b",
      classification: "secret",
      privilege: "yes",
      legal_hold: false,
      retention_policy_id: "retention-a",
      permission_envelope_id: "permission-a"
    }).ok,
    false,
  );
});
