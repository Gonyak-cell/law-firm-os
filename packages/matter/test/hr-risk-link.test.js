import assert from "node:assert/strict";
import test from "node:test";
import { createHrxMatterRiskLink } from "../src/hr-risk-link.js";

test("HR risk Matter link records privilege and audit refs without client detail", () => {
  const link = createHrxMatterRiskLink({
    tenant_id: "tenant-a",
    link_id: "hr-risk-link-001",
    risk_event_id: "risk-001",
    matter_id: "matter-001",
    privilege_flag: true,
    audit_ref: "Audit:001",
  });
  assert.equal(link.privilege_flag, true);
  assert.equal(link.audit_ref, "Audit:001");
  assert.equal(Object.hasOwn(link, "client_id"), false);
});

test("HR risk Matter link rejects client details and missing audit refs", () => {
  assert.throws(
    () =>
      createHrxMatterRiskLink({
        tenant_id: "tenant-a",
        link_id: "hr-risk-link-001",
        risk_event_id: "risk-001",
        matter_id: "matter-001",
        privilege_flag: true,
      }),
    /audit_ref is required/,
  );
  assert.throws(
    () =>
      createHrxMatterRiskLink({
        tenant_id: "tenant-a",
        link_id: "hr-risk-link-001",
        risk_event_id: "risk-001",
        matter_id: "matter-001",
        audit_ref: "Audit:001",
        client_name: "Sensitive Client",
      }),
    /must not include client_name/,
  );
});
