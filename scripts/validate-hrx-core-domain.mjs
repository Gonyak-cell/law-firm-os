#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHrxAuditEventStore } from "../packages/audit/src/hrx-event-store.js";
import { createHrxEmployeeUserLinksRoute } from "../apps/api/src/routes/hrx/employees.js";
import { createInMemoryHrxRepository } from "../packages/hrx/src/repository.js";
import { createHrxM365DocumentSourceAdapter } from "../packages/integrations-core/src/hrx-m365-doc-source.js";
import { createHrxAssignment } from "../packages/hrx/src/assignment.js";
import { createCompensationRecordMetadata } from "../packages/hrx/src/compensation.js";
import { createEmploymentContract, transitionEmploymentContract } from "../packages/hrx/src/contracts.js";
import { createHrxDocumentSourceVerification } from "../packages/hrx/src/documents/source-adapter.js";
import { canMutateHrxObjectUnderLegalHold, createHrxLegalHold } from "../packages/hrx/src/legal-hold.js";
import { createHrxLegalRiskWorkflow, markHrxLegalRiskPrivileged } from "../packages/hrx/src/legal-risk.js";
import { createInMemoryHrxOrgDirectory } from "../packages/hrx/src/org.js";
import { createPayrollExportPreview } from "../packages/hrx/src/payroll-boundary.js";
import { createInMemoryPeopleGraph } from "../packages/hrx/src/people-graph.js";
import { createHrxReportingLine } from "../packages/hrx/src/reporting-line.js";
import { canPurgeHrxRecord, createHrxRetentionPolicy } from "../packages/hrx/src/retention.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

for (const file of [
  "contracts/hrx-runtime-contract.json",
  "contracts/hrx-document-source-boundary.json",
  "apps/api/src/routes/hrx/employees.js",
  "apps/api/test/hrx/employees.test.js",
  "apps/api/test/hrx-runtime-api.test.js",
  "packages/hrx/src/org.js",
  "packages/hrx/src/reporting-line.js",
  "packages/hrx/src/assignment.js",
  "packages/hrx/src/contracts.js",
  "packages/hrx/src/compensation.js",
  "packages/hrx/src/payroll-boundary.js",
  "packages/hrx/src/retention.js",
  "packages/hrx/src/legal-hold.js",
  "packages/hrx/src/people-graph.js",
  "packages/hrx/src/legal-risk.js",
  "packages/hrx/test/org.test.js",
  "packages/hrx/test/assignment.test.js",
  "packages/hrx/test/contracts.test.js",
  "packages/hrx/test/compensation.test.js",
  "packages/hrx/test/retention.test.js",
  "packages/hrx/test/people-graph.test.js",
  "packages/hrx/test/legal-risk.test.js",
  "packages/hrx/src/documents/source-adapter.js",
  "packages/integrations-core/src/hrx-m365-doc-source.js",
  "packages/hrx/test/document-source-adapter.test.js",
  "packages/integrations-core/test/hrx-m365-doc-source.test.js",
  "apps/api/test/hrx/documents.test.js",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["hrx:core:validate"] === "node scripts/validate-hrx-core-domain.mjs", "package script hrx:core:validate missing");

const runtimeContract = JSON.parse(read("contracts/hrx-runtime-contract.json"));
for (const entity of [
  "Employee",
  "EmploymentProfile",
  "EmployeeUserLink",
  "OrgUnit",
  "ReportingLine",
  "Assignment",
  "HRDocument",
  "EmploymentContract",
  "CompensationRecordMetadata",
  "PayrollExportPreviewBoundary",
  "RetentionPolicy",
  "LegalHold",
  "PeopleGraphEdge",
  "HRLegalRiskWorkflow",
]) {
  assert(runtimeContract.core_hris_entities?.includes(entity), `runtime contract missing core entity: ${entity}`);
}
assert(runtimeContract.boundary?.runtime_ready === false, "runtime contract must not claim runtime_ready");
assert(runtimeContract.boundary?.enterprise_ready === false, "runtime contract must not claim enterprise_ready");
assert(runtimeContract.boundary?.go_live_claim_allowed === false, "runtime contract must block go-live claim before L8 owner sign-off");
assert(runtimeContract.boundary?.requires_l8_owner_sign_off === true, "runtime contract must require L8 owner sign-off");
assert(runtimeContract.tuw_ids?.includes("HRX-L3-014") && runtimeContract.tuw_ids?.includes("HRX-L3-015"), "runtime contract must bind schema/validator TUWs");

const contract = JSON.parse(read("contracts/hrx-document-source-boundary.json"));
assert(contract.metadata_only === true, "document source contract must be metadata-only");
assert(contract.document_body_storage_allowed === false, "document source contract must block document body storage");
assert(contract.secret_storage_allowed === false, "document source contract must block secret storage");
assert(contract.raw_external_payload_allowed === false, "document source contract must block raw external payload storage");
assert(contract.tuw_ids?.includes("HRX-L3-005") && contract.tuw_ids?.includes("HRX-L3-006"), "document source contract must bind PR-06 TUWs");

const documentSource = read("packages/hrx/src/documents/source-adapter.js");
assert(documentSource.includes("HRX_DOCUMENT_SOURCE_STATUSES"), "source adapter must declare statuses");
assert(documentSource.includes("assertNoHrxDocumentSourceLeak"), "source adapter must block body/secret leaks");
assert(documentSource.includes("mergeHrxDocumentSourceVerification"), "source adapter must merge verified source state into document metadata");

const routeSource = read("apps/api/src/routes/hrx/documents.js");
assert(routeSource.includes("sourceAdapter.verify"), "documents route must verify source_ref before create");
assert(routeSource.includes("mergeHrxDocumentSourceVerification"), "documents route must store source verification status");
assert(routeSource.includes("error.safe_error_code"), "documents route must preserve safe source verification errors");

const documentsStore = read("packages/hrx/src/documents.js");
assert(documentsStore.includes("source_status"), "document metadata must include source_status");
assert(documentsStore.includes("document_body_included: false"), "document metadata must keep body excluded");
assert(!documentsStore.includes("document_body: input"), "document metadata must not map document bodies");

const integrationSource = read("packages/integrations-core/src/hrx-m365-doc-source.js");
assert(integrationSource.includes("createHrxM365DocumentSourceAdapter"), "integrations-core must expose M365/DMS document source adapter");
assert(integrationSource.includes("assertMetadataOnly"), "M365/DMS source adapter must enforce metadata-only inputs");

const verified = createHrxDocumentSourceVerification({
  tenant_id: "tenant-a",
  source_ref: "dms://validator-doc",
  source_status: "verified",
  source_verified_at: "2026-06-20T00:00:00.000Z",
});
assert(verified.source_status === "verified", "source verification helper must produce verified status");

try {
  createHrxDocumentSourceVerification({
    tenant_id: "tenant-a",
    source_ref: "dms://validator-doc",
    source_metadata: { body: "blocked" },
  });
  errors.push("source verification helper must reject body metadata");
} catch (error) {
  assert(/body/.test(error.message), "source verification body rejection message must mention body");
}

const adapter = createHrxM365DocumentSourceAdapter({
  sources: [{
    tenant_id: "tenant-a",
    source_ref: "m365://drive/items/validator-doc",
    source_verified_at: "2026-06-20T00:00:00.000Z",
    provider_document_id: "validator-doc",
  }],
});
const adapterResult = await adapter.verify({ tenant_id: "tenant-a", source_ref: "m365://drive/items/validator-doc" });
assert(adapterResult.source_status === "verified", "M365 source adapter must verify seeded metadata refs");
assert(!JSON.stringify(adapterResult).includes("access_token"), "M365 source adapter must not expose token material");

const audit = createHrxAuditEventStore();
const employeeUserLinkRoute = createHrxEmployeeUserLinksRoute({
  repository: createInMemoryHrxRepository({
    employees: [{ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" }],
  }),
  authz: { evaluate: async () => ({ effect: "allow", reason: "validator_allow" }) },
  audit,
});
const actorContext = { tenant_id: "tenant-a", actor_id: "validator-user", actor_role: "hr_admin" };
const createdLink = await employeeUserLinkRoute.handle({
  method: "POST",
  context: actorContext,
  body: { link_id: "link-validator-001", employee_id: "emp-001", user_id: "iam-validator-001" },
});
assert(createdLink.status === 201, "EmployeeUserLink route must create login mapping");
const listedLinks = await employeeUserLinkRoute.handle({
  method: "GET",
  context: actorContext,
  query: { employee_id: "emp-001" },
});
assert(listedLinks.status === 200 && listedLinks.body.links.length === 1, "EmployeeUserLink route must list login mappings");
const revokedLink = await employeeUserLinkRoute.handle({
  method: "POST",
  context: actorContext,
  params: { link_id: "link-validator-001" },
});
assert(revokedLink.status === 200 && revokedLink.body.revoked === true, "EmployeeUserLink route must revoke login mappings");
assert(
  audit.list({ tenant_id: "tenant-a" }).map((event) => event.action).join(",") ===
    "hrx.employee_user_link.create,hrx.employee_user_link.read,hrx.employee_user_link.revoke",
  "EmployeeUserLink route must audit create/list/revoke",
);

const orgDirectory = createInMemoryHrxOrgDirectory();
orgDirectory.create({
  tenant_id: "tenant-a",
  org_unit_id: "org-root",
  display_name: "Firm",
  effective_from: "2026-01-01",
});
orgDirectory.create({
  tenant_id: "tenant-a",
  org_unit_id: "org-disputes",
  display_name: "Disputes",
  parent_org_unit_id: "org-root",
  effective_from: "2026-01-01",
});
assert(orgDirectory.list({ tenant_id: "tenant-a", parent_org_unit_id: "org-root" }).length === 1, "org directory must list tree children");
const updatedOrg = orgDirectory.update(
  { tenant_id: "tenant-a", org_unit_id: "org-disputes" },
  { display_name: "Litigation", effective_from: "2026-07-01" },
);
assert(updatedOrg.display_name === "Litigation" && updatedOrg.effective_from === "2026-07-01", "org directory must update with effective date");

const solidLine = createHrxReportingLine({
  tenant_id: "tenant-a",
  reporting_line_id: "line-solid",
  employee_id: "emp-001",
  manager_employee_id: "emp-002",
  line_type: "solid",
  effective_from: "2026-01-01",
});
const dottedLine = createHrxReportingLine({
  tenant_id: "tenant-a",
  reporting_line_id: "line-dotted",
  employee_id: "emp-001",
  manager_employee_id: "emp-003",
  line_type: "dotted",
  effective_from: "2026-01-01",
});
assert(solidLine.line_type === "solid" && dottedLine.line_type === "dotted", "reporting lines must support manager and dotted-line models");

const assignment = createHrxAssignment({
  tenant_id: "tenant-a",
  assignment_id: "assign-validator",
  employee_id: "emp-001",
  role_id: "role-counsel",
  position_id: "pos-001",
  practice_group_id: "pg-disputes",
  capacity_pct: 75,
  effective_from: "2026-01-01",
});
assert(assignment.capacity_pct === 75 && assignment.effective_from === "2026-01-01", "assignment must be effective-dated with capacity");

const draftContract = createEmploymentContract({
  tenant_id: "tenant-a",
  contract_id: "contract-validator",
  employee_id: "emp-001",
  profile_id: "profile-001",
  document_ref: "dms://contract-validator",
});
const signedContract = transitionEmploymentContract(transitionEmploymentContract(draftContract, { state: "approved" }), {
  state: "signed",
  signature_ref: "sign://validator",
});
assert(signedContract.state === "signed" && signedContract.signature_ref === "sign://validator", "employment contract must approve and sign with signature_ref");

try {
  createCompensationRecordMetadata({
    tenant_id: "tenant-a",
    compensation_id: "comp-validator",
    employee_id: "emp-001",
    encrypted_amount_ref: "vault://comp-validator",
    source_ref: "hris://comp-validator",
    effective_from: "2026-01-01",
    amount: 100,
  });
  errors.push("compensation metadata must reject raw amounts");
} catch (error) {
  assert(/raw amount/.test(error.message), "compensation raw amount rejection must mention raw amount");
}
const compensation = createCompensationRecordMetadata({
  tenant_id: "tenant-a",
  compensation_id: "comp-validator",
  employee_id: "emp-001",
  encrypted_amount_ref: "vault://comp-validator",
  source_ref: "hris://comp-validator",
  effective_from: "2026-01-01",
});
assert(compensation.raw_amount_included === false, "compensation metadata must store encrypted/masked refs only");

try {
  createPayrollExportPreview({
    tenant_id: "tenant-a",
    preview_id: "pay-validator",
    payroll_period: "2026-06",
    employee_ids: ["emp-001"],
    net_pay: 100,
  });
  errors.push("payroll boundary must reject calculation/disbursement fields");
} catch (error) {
  assert(/net_pay/.test(error.message), "payroll rejection must mention blocked field");
}
const payrollPreview = createPayrollExportPreview({
  tenant_id: "tenant-a",
  preview_id: "pay-validator",
  payroll_period: "2026-06",
  employee_ids: ["emp-001"],
});
assert(payrollPreview.calculation_runtime === false, "payroll preview must not open calculation runtime");

const retentionPolicy = createHrxRetentionPolicy({
  tenant_id: "tenant-a",
  policy_id: "ret-validator",
  object_type: "HRDocument",
  retain_until: "2026-06-19",
});
const legalHold = createHrxLegalHold({
  tenant_id: "tenant-a",
  hold_id: "hold-validator",
  object_type: "HRDocument",
  object_id: "doc-validator",
  reason: "litigation hold",
});
assert(canPurgeHrxRecord({ policy: retentionPolicy, legal_holds: [legalHold], as_of: "2026-06-20" }).allowed === false, "retention must honor legal hold override");
assert(
  canMutateHrxObjectUnderLegalHold({
    tenant_id: "tenant-a",
    object_type: "HRDocument",
    object_id: "doc-validator",
    mutation: "delete",
    legal_holds: [legalHold],
  }).allowed === false,
  "legal hold must block delete mutation",
);

const peopleGraph = createInMemoryPeopleGraph();
for (const edge of [
  ["edge-org", "employee_org", "org-disputes"],
  ["edge-manager", "employee_manager", "emp-002"],
  ["edge-matter", "employee_matter", "matter-001"],
  ["edge-workload", "employee_workload", "workload:aggregate:2026-06"],
]) {
  peopleGraph.add({
    tenant_id: "tenant-a",
    edge_id: edge[0],
    edge_type: edge[1],
    from_employee_id: "emp-001",
    to_ref: edge[2],
    effective_from: "2026-01-01",
  });
}
assert(peopleGraph.list({ tenant_id: "tenant-a", from_employee_id: "emp-001" }).length === 4, "people graph must include Employee/Org/Matter/Workload aggregate edges");

const legalRisk = createHrxLegalRiskWorkflow({
  tenant_id: "tenant-a",
  legal_risk_id: "legal-risk-validator",
  risk_event_id: "risk-validator",
  legal_owner_id: "legal-owner-validator",
  status: "review",
});
const privilegedRisk = markHrxLegalRiskPrivileged(legalRisk, {
  privilege_basis_ref: "LegalMemo:validator",
  audit_ref: "Audit:validator",
});
assert(privilegedRisk.privilege_flag === true && privilegedRisk.status === "review", "legal risk must preserve privilege flag/status/owner");

if (errors.length > 0) {
  console.error("HRX core domain validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX core domain validation passed.");
console.log("scope: core_hris_domain");
