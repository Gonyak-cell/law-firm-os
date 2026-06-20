import assert from "node:assert/strict";
import test from "node:test";
import { createHrxScimEmployeeLinkRequest, createHrxScimUserProvisioningEvent } from "../src/scim-boundary.js";

const scimEvent = Object.freeze({
  tenant_id: "tenant-a",
  scim_event_id: "scim-evt-001",
  scim_user_id: "scim-user-001",
  external_id: "external-user-001",
  user_id: "user-001",
  user_name: "user@example.com",
});

test("SCIM provisioning boundary creates User only and requires HRX Employee workflow", () => {
  const event = createHrxScimUserProvisioningEvent(scimEvent);
  assert.equal(event.provisioned_object_type, "User");
  assert.equal(event.employee_created, false);
  assert.equal(event.employee_profile_created, false);
  assert.equal(event.employee_workflow_required, true);
});

test("SCIM provisioning boundary rejects Employee and sensitive HR fields", () => {
  assert.throws(() => createHrxScimUserProvisioningEvent({ ...scimEvent, employee_id: "emp-001" }), /must not include employee_id/);
  assert.throws(() => createHrxScimUserProvisioningEvent({ ...scimEvent, salary: 100000 }), /must not include salary/);
  assert.throws(() => createHrxScimUserProvisioningEvent({ ...scimEvent, performance_rating: "A" }), /must not include performance_rating/);
});

test("SCIM can request an EmployeeUserLink, not create Employee directly", () => {
  const request = createHrxScimEmployeeLinkRequest({ ...scimEvent, link_request_id: "link-001" });
  assert.equal(request.requested_object_type, "EmployeeUserLink");
  assert.equal(request.status, "pending_hrx_workflow");
  assert.equal(Object.hasOwn(request, "employee_id"), false);
});
