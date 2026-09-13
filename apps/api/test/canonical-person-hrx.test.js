import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { transitionEmployee } from "../../../packages/hrx/src/employee-lifecycle.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createPersonProfileService } from "../../../packages/master-data/src/person-profile-service.js";
import { withCanonicalPersonProfiles } from "../src/canonical-person-hrx.js";

test("People reads canonical fields, HR edits cannot supersede them, and external links fail closed", () => {
  const tenant_id = "tenant_synthetic", user_id = "user_synthetic";
  const repository = createInMemoryHrxRepository({ employees: [{ tenant_id, employee_id: "employee_synthetic", display_name: "Legacy" }],
    employee_user_links: [{ tenant_id, link_id: "link_synthetic", employee_id: "employee_synthetic", user_id, purpose: "login_mapping" }],
    employment_profiles: [{ tenant_id, profile_id: "employment_synthetic", employee_id: "employee_synthetic", employment_type: "full_time", effective_from: "2026-01-01",
      professional_profile: { schema_version: "law-firm-os.people-professional-profile.v0.1", profile_kind: "legacy" } }] });
  const master = createMasterDataRepository();
  const subject = { tenant_id, user_id, display_name: "Canonical" };
  const person = createPersonProfileService({ repository: master }).save({ subject, actor: subject, patch: { professional_profile: { bio: "Bio" } }, idempotency_key: "create" });
  repository.updateEmployee({ tenant_id, employee_id: "employee_synthetic" }, { person_id: person.person_id });
  const externalUsers = [];
  const runtime = withCanonicalPersonProfiles({ repository }, master, { list: () => externalUsers });
  const employee = runtime.repository.getEmployee({ tenant_id, employee_id: "employee_synthetic" });
  assert.equal(employee.person_id, person.person_id);
  assert.equal(employee.display_name, "Canonical");
  assert.equal(employee.mobile_phone, null);
  assert.equal(transitionEmployee(employee, { status: "active" }).status, "active");
  assert.equal(runtime.repository.listEmploymentProfiles({ tenant_id })[0].person_id, person.person_id);
  assert.equal(runtime.repository.getEmploymentProfile({ tenant_id, profile_id: "employment_synthetic" }).professional_profile.profile_kind, "legacy");
  const scheduled = runtime.repository.createEmploymentProfile({
    tenant_id,
    profile_id: "employment_future",
    employee_id: employee.employee_id,
    person_id: person.person_id,
    employment_type: "full_time",
    effective_from: "2027-01-01",
    title: "Counsel",
  });
  assert.equal(scheduled.title, "Counsel");
  assert.equal(scheduled.professional_profile, null);
  assert.throws(() => runtime.repository.updateEmployee({ tenant_id, employee_id: employee.employee_id }, { mobile_phone: "forged" }), /PERSON_PROFILE_OWNER_REQUIRED/);
  assert.throws(() => runtime.repository.updateEmploymentProfile({ tenant_id, profile_id: "employment_synthetic" }, { professional_profile: { bio: "forged" } }), /PERSON_PROFILE_OWNER_REQUIRED/);
  assert.throws(() => runtime.repository.updateEmployee({ tenant_id, employee_id: employee.employee_id }, { person_id: "person_forged" }), /PROFILE_ROLE_LINK_CONFLICT/);
  assert.throws(() => runtime.repository.createEmployee({ tenant_id, employee_id: "employee_forged", person_id: "person_missing", display_name: "Forged" }), /PROFILE_ROLE_LINK_CONFLICT/);
  const otherSubject = { tenant_id, user_id: "other_user", display_name: "Other Person" };
  const otherPerson = createPersonProfileService({ repository: master }).save({
    subject: otherSubject,
    actor: otherSubject,
    patch: {},
    idempotency_key: "create-other",
  });
  runtime.repository.createEmployee({ tenant_id, employee_id: "employee_other", person_id: otherPerson.person_id, display_name: "Other" });
  assert.throws(() => runtime.repository.createEmployeeUserLink({ tenant_id, link_id: "forged_link", employee_id: "employee_other", user_id: "wrong_user", purpose: "login_mapping" }), /PROFILE_ROLE_LINK_CONFLICT/);
  assert.throws(() => runtime.repository.createEmployeeUserLink({ tenant_id, link_id: "second_link", employee_id: "employee_synthetic", user_id: "other_user", purpose: "login_mapping" }), /PROFILE_ROLE_LINK_CONFLICT/);
  assert.equal(repository.getEmployee({ tenant_id, employee_id: employee.employee_id }).display_name, "Legacy");
  externalUsers.push({ tenant_id, user_id });
  assert.throws(() => runtime.repository.listEmployees({ tenant_id }), /PROFILE_ROLE_LINK_CONFLICT/);
  externalUsers.length = 0;
  runtime.repository.revokeEmployeeUserLink({ tenant_id, link_id: "link_synthetic" });
  assert.equal(runtime.repository.getEmployee({ tenant_id, employee_id: employee.employee_id }).display_name, "Canonical");
});
