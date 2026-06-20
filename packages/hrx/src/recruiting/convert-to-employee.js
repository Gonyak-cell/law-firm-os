import { createEmployee, createEmploymentProfile } from "../schema.js";
import { createApplication } from "./application.js";
import { createCandidateProfile } from "./candidate.js";
import { createOffer } from "./offer.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function convertCandidateToEmployee(input = {}) {
  const candidate = createCandidateProfile(input.candidate);
  const application = createApplication(input.application);
  const offer = createOffer(input.offer);
  if (application.stage !== "hired") throw new TypeError("candidate conversion requires hired application");
  if (offer.state !== "accepted") throw new TypeError("candidate conversion requires accepted offer");
  const approvalRef = requiredString(input, "approval_ref");
  const employee = createEmployee({
    tenant_id: candidate.tenant_id,
    employee_id: requiredString(input, "employee_id"),
    display_name: input.display_name ?? candidate.legal_name,
    legal_name: candidate.legal_name,
    work_email: input.work_email,
    status: "active",
    source_ref: `Candidate:${candidate.candidate_id}`,
  });
  const employmentProfile = createEmploymentProfile({
    tenant_id: candidate.tenant_id,
    profile_id: requiredString(input, "profile_id"),
    employee_id: employee.employee_id,
    employment_type: input.employment_type ?? "full_time",
    status: "active",
    title: requiredString(input, "title"),
    org_unit_id: input.org_unit_id,
    manager_employee_id: input.manager_employee_id,
    effective_from: requiredString(input, "effective_from"),
    source_ref: `Offer:${offer.offer_id}`,
  });
  return Object.freeze({
    tenant_id: candidate.tenant_id,
    candidate_id: candidate.candidate_id,
    application_id: application.application_id,
    offer_id: offer.offer_id,
    approval_ref: approvalRef,
    employee,
    employment_profile: employmentProfile,
    crm_party_linked: false,
    explicit_approval_required: true,
  });
}
