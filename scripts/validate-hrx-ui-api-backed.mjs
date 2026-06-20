#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assertNoLocalFallback(path) {
  const source = read(path);
  assert(!/mockData|profileRows|matters/.test(source), `${path}: must not import static UI fallback data`);
}

for (const file of [
  "apps/web/src/people/hrxApiClient.ts",
  "apps/web/src/people/PeopleHome.tsx",
  "apps/web/src/people/employees/EmployeeList.tsx",
  "apps/web/src/people/employees/EmployeeProfile.tsx",
  "apps/web/src/people/documents/HRDocumentWorkspace.tsx",
  "apps/web/src/people/leave/LeaveRequestPage.tsx",
  "apps/web/src/people/approvals/ManagerApprovalQueue.tsx",
  "apps/web/src/candidate/CandidatePortal.tsx",
  "apps/web/src/people/recruiting/RecruitingPipeline.tsx",
  "apps/web/src/admin/hrx/HRXPolicyConsole.tsx",
  "apps/web/src/admin/hrx/HRXAuditViewer.tsx",
  "apps/web/src/people/security/HrxStepUpChallenge.tsx",
  "apps/web/e2e/hrx/people-home.spec.ts",
  "apps/web/e2e/hrx/employee-list.spec.ts",
  "apps/web/e2e/hrx/employee-profile.spec.ts",
  "apps/web/e2e/hrx/hr-documents.spec.ts",
  "apps/web/e2e/hrx/leave-request.spec.ts",
  "apps/web/e2e/hrx/manager-approval.spec.ts",
  "apps/web/e2e/hrx/candidate-portal.spec.ts",
  "apps/web/e2e/hrx/recruiting-pipeline.spec.ts",
  "apps/web/e2e/hrx/hrx-policy-console.spec.ts",
  "apps/web/e2e/hrx/hrx-audit-viewer.spec.ts",
  "apps/web/e2e/hrx/hrx-step-up-challenge.spec.ts",
  "apps/web/test/ui-regression.test.mjs",
  "scripts/run-web-e2e.mjs",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["hrx:ui:validate"] === "node scripts/validate-hrx-ui-api-backed.mjs", "package script hrx:ui:validate missing");
assert(packageJson.scripts?.["web:e2e"] === "node scripts/run-web-e2e.mjs", "package script web:e2e missing");

const apiClient = read("apps/web/src/people/hrxApiClient.ts");
assert(apiClient.includes('credentials: "same-origin"'), "HRX UI client must use same-origin API session");
assert(apiClient.includes("/api/hrx/employees"), "HRX UI client must fetch employees API");
assert(apiClient.includes("/api/hrx/audit"), "HRX UI client must fetch audit API");
assert(apiClient.includes('kind: "step_up_required"'), "HRX UI client must preserve server step-up-required state");
assert(!/x-lawos-tenant-id|x-lawos-actor-id|x-lawos-hrx-scopes|HRX_PERMISSION_CONTEXT/.test(apiClient), "HRX UI client must not fabricate trusted tenant, actor, or scope headers");
assert(!/allow.*hrx|hrx.*allow|required_scope|evaluateHrxPolicy/.test(apiClient), "HRX UI client must not implement local HRX allow rules");
assert(!/mockData|profileRows|matters/.test(apiClient), "HRX UI client must not fallback to static data");

const employeeList = read("apps/web/src/people/employees/EmployeeList.tsx");
assert(employeeList.includes("live-data-loading") && employeeList.includes("live-data-empty") && employeeList.includes("live-data-error"), "Employee list must expose loading, empty, and error states");
assert(employeeList.includes("No mock employee list is rendered."), "Employee list must fail closed without static fallback");

const employeeProfile = read("apps/web/src/people/employees/EmployeeProfile.tsx");
assert(employeeProfile.includes("masked_compensation_ref") && employeeProfile.includes("Masked by scope"), "Employee profile must render masked sensitive fields");
assert(!/salary|base_pay|bonus_amount/.test(employeeProfile), "Employee profile must not render raw compensation fields");

const documents = read("apps/web/src/people/documents/HRDocumentWorkspace.tsx");
assert(documents.includes("document.source_ref") && documents.includes("document body omitted"), "HR documents UI must render source refs and omit bodies");
assert(!/document\.body|document_body|content_text/.test(documents), "HR documents UI must not render document bodies");

const leave = read("apps/web/src/people/leave/LeaveRequestPage.tsx");
assert(leave.includes("submitHrxLeaveRequest") && leave.includes("onSubmitted?.()"), "Leave UI must submit through API and refresh state");

const approvals = read("apps/web/src/people/approvals/ManagerApprovalQueue.tsx");
assert(approvals.includes("resolveHrxApproval") && approvals.includes("fetchHrxAuditEvents"), "Manager approvals must resolve through API and show audit evidence");

const candidate = read("apps/web/src/candidate/CandidatePortal.tsx");
assert(candidate.includes("fetchCandidatePortal") && candidate.includes("Candidate-scoped"), "Candidate portal must be candidate-scoped");
assert(candidate.includes("Omitted") && !/resume_body|interview_feedback/.test(candidate), "Candidate portal must omit sensitive document bodies");

const recruiting = read("apps/web/src/people/recruiting/RecruitingPipeline.tsx");
assert(recruiting.includes("updateHrxApplicationStage"), "Recruiting UI must update application stages through API");
assert(recruiting.includes("Interview") && recruiting.includes("Offer"), "Recruiting UI must render interview and offer state");

const policy = read("apps/web/src/admin/hrx/HRXPolicyConsole.tsx");
assert(policy.includes("fetchHrxPolicies") && policy.includes("createHrxPolicyVersion"), "Policy console must read and create policy versions through API");

const audit = read("apps/web/src/admin/hrx/HRXAuditViewer.tsx");
assert(audit.includes("fetchHrxAuditEvents") && audit.includes("HrxStepUpChallenge"), "Audit viewer must fetch audit API and render step-up challenge");
assert(audit.includes("step_up_required"), "Audit viewer must branch on server step-up-required state");

const stepUp = read("apps/web/src/people/security/HrxStepUpChallenge.tsx");
assert(stepUp.includes('data-hrx-step-up-challenge="true"'), "Step-up challenge must have stable e2e marker");
assert(stepUp.includes("Trusted session only"), "Step-up challenge must keep session ownership explicit");
assert(!/x-lawos-hrx-step-up|assurance_level|mfa: true|tenant-a|actor_id/.test(stepUp), "Step-up challenge must not fabricate trusted token data");

for (const file of [
  "apps/web/src/people/PeopleHome.tsx",
  "apps/web/src/people/employees/EmployeeList.tsx",
  "apps/web/src/people/employees/EmployeeProfile.tsx",
  "apps/web/src/people/documents/HRDocumentWorkspace.tsx",
  "apps/web/src/people/leave/LeaveRequestPage.tsx",
  "apps/web/src/people/approvals/ManagerApprovalQueue.tsx",
  "apps/web/src/candidate/CandidatePortal.tsx",
  "apps/web/src/people/recruiting/RecruitingPipeline.tsx",
  "apps/web/src/admin/hrx/HRXPolicyConsole.tsx",
  "apps/web/src/admin/hrx/HRXAuditViewer.tsx",
]) {
  assertNoLocalFallback(file);
}

const e2eRunner = read("scripts/run-web-e2e.mjs");
for (const name of [
  "people-home",
  "employee-list",
  "employee-profile",
  "hr-documents",
  "leave-request",
  "manager-approval",
  "candidate-portal",
  "recruiting-pipeline",
  "hrx-policy-console",
  "hrx-audit-viewer",
  "hrx-step-up-challenge",
]) {
  assert(e2eRunner.includes(name), `web:e2e missing ${name}`);
}

if (errors.length > 0) {
  console.error("HRX UI API-backed validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX UI API-backed validation passed.");
console.log("scope: portal_api_hardening");
