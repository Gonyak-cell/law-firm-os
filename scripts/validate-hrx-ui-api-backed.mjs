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

const STATIC_UI_FALLBACK_PATTERN = /mockData|profileRows|const\s+matters\s*=\s*\[|from\s+["'][^"']*(?:mock|fixture|static)/;

function assertNoLocalFallback(path) {
  const source = read(path);
  assert(!STATIC_UI_FALLBACK_PATTERN.test(source), `${path}: must not import static UI fallback data`);
}

for (const file of [
  "apps/web/src/people/hrxApiClient.ts",
  "apps/web/src/people/PeopleHome.tsx",
  "apps/web/src/components/GlobalUtilitySurface.jsx",
  "apps/web/src/data/globalUtilities.js",
  "apps/web/src/people/peopleFeatureCatalog.js",
  "apps/web/src/people/employees/EmployeeList.tsx",
  "apps/web/src/people/employees/PeopleWorkforceDirectory.tsx",
  "apps/web/src/people/employees/EmployeeProfile.tsx",
  "apps/web/src/people/documents/HRDocumentWorkspace.tsx",
  "apps/web/src/people/leave/LeaveRequestPage.tsx",
  "apps/web/src/people/approvals/ManagerApprovalQueue.tsx",
  "apps/web/src/candidate/CandidatePortal.tsx",
  "apps/web/src/people/recruiting/RecruitingPipeline.tsx",
  "apps/web/src/people/lifecycle/LifecycleBoard.tsx",
  "apps/web/src/people/security/HrxRiskDashboard.tsx",
  "apps/web/src/admin/hrx/HRXPolicyConsole.tsx",
  "apps/web/src/admin/hrx/HRXAuditViewer.tsx",
  "apps/web/src/people/security/HrxStepUpChallenge.tsx",
  "apps/web/src/people/analytics/HRAnalytics.tsx",
  "apps/web/src/people/ai/HRAIAssistant.tsx",
  "apps/web/src/people/payroll/PayrollBoundaryPanel.tsx",
  "apps/web/e2e/hrx/people-home.spec.ts",
  "apps/web/e2e/hrx/employee-list.spec.ts",
  "apps/web/e2e/hrx/employee-profile.spec.ts",
  "apps/web/e2e/hrx/hr-documents.spec.ts",
  "apps/web/e2e/hrx/leave-request.spec.ts",
  "apps/web/e2e/hrx/manager-approval.spec.ts",
  "apps/web/e2e/hrx/candidate-portal.spec.ts",
  "apps/web/e2e/hrx/recruiting-pipeline.spec.ts",
  "apps/web/e2e/hrx/lifecycle-board.spec.ts",
  "apps/web/e2e/hrx/risk-dashboard.spec.ts",
  "apps/web/e2e/hrx/hrx-policy-console.spec.ts",
  "apps/web/e2e/hrx/hrx-audit-viewer.spec.ts",
  "apps/web/e2e/hrx/hrx-step-up-challenge.spec.ts",
  "apps/web/e2e/hrx/hrx-analytics.spec.ts",
  "apps/web/e2e/hrx/hrx-ai-assistant.spec.ts",
  "apps/web/e2e/hrx/hrx-payroll-boundary.spec.ts",
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
assert(apiClient.includes("/api/hrx/org-chart"), "HRX UI client must fetch organization chart API");
assert(apiClient.includes("updateHrxReportingLine"), "HRX UI client must update reporting lines through API");
assert(apiClient.includes("/api/hrx/audit"), "HRX UI client must fetch audit API");
assert(apiClient.includes("/api/hrx/lifecycle/onboarding"), "HRX UI client must fetch onboarding lifecycle API");
assert(apiClient.includes("/api/hrx/lifecycle/offboarding"), "HRX UI client must fetch offboarding lifecycle API");
assert(apiClient.includes("/api/hrx/risks") && apiClient.includes("/api/hrx/risks/scan"), "HRX UI client must fetch and scan HR risk events through API");
assert(apiClient.includes("transitionHrxRiskEvent"), "HRX UI client must transition HR risk events through API");
assert(apiClient.includes("/api/hrx/documents"), "HRX UI client must fetch documents API");
assert(apiClient.includes("/api/hrx/documents/expiring"), "HRX UI client must fetch expiring HR documents API");
assert(apiClient.includes("signHrxEmploymentContractDocument") && apiClient.includes("/sign"), "HRX UI client must sign employment contract documents through API");
assert(apiClient.includes("expireHrxEmploymentContractDocument") && apiClient.includes("/expire"), "HRX UI client must expire employment contract documents through API");
assert(apiClient.includes('options.scope !== "all"'), "HRX documents client must support company-wide regulation reads without employee selection");
assert(apiClient.includes("/api/hrx/payroll/preview"), "HRX UI client must call payroll preview API");
assert(apiClient.includes("/api/hrx/payroll/approve"), "HRX UI client must call payroll approval API");
assert(apiClient.includes("/api/hrx/payroll/export"), "HRX UI client must call payroll export API");
assert(apiClient.includes("내보내기-파일") && !apiClient.includes("아티팩트"), "HRX payroll export fallback must use Korean user-facing export file copy");
assert(apiClient.includes("/api/hrx/compensation"), "HRX UI client must call compensation record API");
assert(apiClient.includes("lawos_hrx_step_up_token"), "HRX UI client must read only signed session step-up tokens");
assert(apiClient.includes('kind: "step_up_required"'), "HRX UI client must preserve server step-up-required state");
assert(apiClient.includes("tenant_amic_matter_vault"), "HRX UI client must use the registered Matter Vault tenant for local runtime");
assert(apiClient.includes("lawos.session.envelope"), "HRX UI client must read the non-secret LawOS session envelope");
assert(apiClient.includes("sessionHrxRuntimeHeaders"), "HRX UI client must derive HRX runtime headers from the signed-in session envelope");
assert(apiClient.includes("function desktopReadBridge") && apiClient.includes("window.matterSession?.api"), "Desktop HRX UI client must use the main-process read bridge when no local API base URL is handed off");
assert(apiClient.includes("user_amic_yjlee"), "HRX UI client must fall back to a self-service staff actor, not an admin actor");
assert(apiClient.includes("lawos_staff"), "HRX UI client must fall back to the staff self-service role");
assert(!apiClient.includes("security_admin,hr_admin,people_ops"), "HRX UI client must not hardcode all users as HR admins");
assert(!apiClient.includes("const HRX_USER_REF = \"user_amic_jwsuh\""), "HRX UI client must not hardcode the system admin actor");
assert(apiClient.includes('"x-lawos-tenant-id"'), "HRX UI client must pass tenant context to HRX API");
assert(apiClient.includes('"x-lawos-actor-id"'), "HRX UI client must pass actor context to HRX API");
assert(apiClient.includes('"x-lawos-hrx-scopes"'), "HRX UI client must pass HRX scopes to HRX API");
assert(apiClient.includes('"x-lawos-hrx-step-up"'), "HRX UI client must pass step-up context to HRX API");
assert(!/required_scope|evaluateHrxPolicy|hasHrxPermission|canAccessHrx/.test(apiClient), "HRX UI client must not implement local HRX policy evaluation");
assert(!STATIC_UI_FALLBACK_PATTERN.test(apiClient), "HRX UI client must not fallback to static data");

const employeeList = read("apps/web/src/people/employees/EmployeeList.tsx");
assert(employeeList.includes("live-data-loading") && employeeList.includes("live-data-empty") && employeeList.includes("live-data-error"), "Employee list must expose loading, empty, and error states");
assert(employeeList.includes("accountLabel") && employeeList.includes("등록 계정"), "Employee list must render registered account state without exposing account strings");

const workforceDirectory = read("apps/web/src/people/employees/PeopleWorkforceDirectory.tsx");
assert(workforceDirectory.includes("fetchHrxOrgChart") && workforceDirectory.includes("updateHrxReportingLine"), "Workforce directory org view must use organization chart APIs");
assert(workforceDirectory.includes('data-hr-org-editor="true"') && workforceDirectory.includes('data-hr-org-change-history="true"'), "Workforce directory org view must expose reporting-line edit and change-history surfaces");
assert(!workforceDirectory.includes("groupByOrganization") && !workforceDirectory.includes("const orgGroups"), "Workforce directory org view must not rebuild org lines from local string grouping");

const employeeProfile = read("apps/web/src/people/employees/EmployeeProfile.tsx");
assert(employeeProfile.includes("fetchHrxCompensationRecords") && employeeProfile.includes("HrxStepUpChallenge"), "Employee profile must read compensation records through API and branch on step-up");
assert(employeeProfile.includes("보상 정보") && employeeProfile.includes("권한 필요"), "Employee profile must render masked sensitive fields");
assert(employeeProfile.includes('data-hrx-compensation-records="true"'), "Employee profile must expose compensation records after step-up");
assert(employeeProfile.includes("masked_compensation_ref") && employeeProfile.includes("contract_document_ref"), "Employee profile must render masked compensation refs with contract linkage");
assert(employeeProfile.includes("ProfessionalProfileSection") && employeeProfile.includes('data-people-professional-profile="true"'), "Employee profile must render API-backed public professional profile sections");
assert(employeeProfile.includes('data-people-professional-profile-kind={profileKind}') && employeeProfile.includes("professionalKindLabel"), "Employee profile must expose professional profile kind for browser proof");
assert(employeeProfile.includes("주요 경력") && employeeProfile.includes("학력") && employeeProfile.includes("자격") && employeeProfile.includes("출처"), "Employee profile must render career, education, qualification, and source sections");
assert(!/salary|base_pay|bonus_amount/.test(employeeProfile), "Employee profile must not render raw compensation fields");

const documents = read("apps/web/src/people/documents/HRDocumentWorkspace.tsx");
assert(documents.includes("document.source_ref") && documents.includes("회사 방침에 대한 설정은 회사 설정 - 일반에서 할 수 있습니다"), "HR documents UI must render source refs and omit bodies");
assert(documents.includes("회사방침") && documents.includes("policy_ack") && documents.includes("leave_notice"), "HR documents UI must use Shiftee company policy copy");
assert(documents.includes("증명서 발급 요청") && documents.includes("재직증명서") && documents.includes("경력증명서"), "HR documents UI must use Shiftee certificate request copy");
assert(documents.includes("createHrxEmploymentContractDocument") && documents.includes("signHrxEmploymentContractDocument") && documents.includes("expireHrxEmploymentContractDocument"), "HR documents UI must wire employment contract lifecycle actions");
assert(documents.includes("30일 내 만료") && documents.includes("signature_ref"), "HR documents UI must expose signed-ref and 30-day expiry monitoring");
assert(documents.includes("합격자 문서") && !documents.includes("오퍼 문서"), "HR documents UI must avoid offer loanword copy");
assert(!/문서 증명서|인사 문서|인사규정/.test(documents), "HR documents UI must avoid unclear mixed document/certificate copy");
assert(!/document\.body|document_body|content_text/.test(documents), "HR documents UI must not render document bodies");

const globalUtilitySurface = read("apps/web/src/components/GlobalUtilitySurface.jsx");
assert(globalUtilitySurface.includes('data-global-live-hr-documents="employment-contracts"'), "Global utility must mount the live employment contract HR document surface");
const globalUtilities = read("apps/web/src/data/globalUtilities.js");
assert(globalUtilities.includes("policies-employment-contracts") && globalUtilities.includes("Vault 원본과 HRX 계약 상태"), "Global utility catalog must route employment contracts to the live HRX/Vault surface");

const leave = read("apps/web/src/people/leave/LeaveRequestPage.tsx");
assert(leave.includes("submitHrxLeaveRequest") && leave.includes("onSubmitted?.()"), "Leave UI must submit through API and refresh state");
assert(leave.includes("formatLeaveHours") && leave.includes("request.request_id") && leave.includes("request.policy_id"), "Leave UI must render API leave balances and request identifiers");
assert(!leave.includes("요청 ${index + 1}") && !leave.includes("신청됨"), "Leave UI must not hide leave rows behind anonymous placeholder labels");
assert(!apiClient.includes('policy_id: "pto-us"') && apiClient.includes("policy_id: String(form.policy_id") && apiClient.includes("leave_type: String(form.leave_type"), "Leave API client must submit the selected policy and leave type instead of hardcoding PTO");

const approvals = read("apps/web/src/people/approvals/ManagerApprovalQueue.tsx");
assert(approvals.includes("resolveHrxApproval") && approvals.includes("fetchHrxAuditEvents"), "Manager approvals must resolve through API and show audit evidence");

const candidate = read("apps/web/src/candidate/CandidatePortal.tsx");
assert(candidate.includes("fetchCandidatePortal") && candidate.includes("지원 내역"), "Candidate portal must be candidate-scoped");
assert(candidate.includes("합격자") && candidate.includes("합격자 문서") && !candidate.includes("오퍼"), "Candidate portal must use Shiftee employee-registration copy");
assert(candidate.includes("권한 필요") && !/resume_body|interview_feedback/.test(candidate), "Candidate portal must omit sensitive document bodies");

const recruiting = read("apps/web/src/people/recruiting/RecruitingPipeline.tsx");
assert(recruiting.includes("updateHrxApplicationStage"), "Recruiting UI must update application stages through API");
assert(recruiting.includes("createHrxRecruitingPipeline"), "Recruiting UI must create recruiting pipelines through API");
assert(recruiting.includes("updateHrxOfferStage"), "Recruiting UI must update accepted candidate state through API");
assert(recruiting.includes("convertHrxApplicationToEmployee"), "Recruiting UI must convert hired applications through API");
assert(recruiting.includes("면접") && recruiting.includes("구성원 등록") && recruiting.includes("합격자"), "Recruiting UI must render Shiftee employee-registration copy");
assert(!recruiting.includes("오퍼"), "Recruiting UI must not expose offer as Korean loanword copy");
assert(apiClient.includes("/api/hrx/recruiting/job-openings"), "Recruiting API client must create job openings through API");
assert(apiClient.includes("/api/hrx/recruiting/candidates"), "Recruiting API client must create candidates through API");
assert(apiClient.includes("/api/hrx/recruiting/interviews"), "Recruiting API client must create interviews through API");
assert(apiClient.includes("/api/hrx/recruiting/offers"), "Recruiting API client must create accepted-candidate records through API");
assert(apiClient.includes("convert-to-employee"), "Recruiting API client must call convert-to-employee API");

const peopleHome = read("apps/web/src/people/PeopleHome.tsx");

const lifecycle = read("apps/web/src/people/lifecycle/LifecycleBoard.tsx");
assert(lifecycle.includes("fetchHrxLifecycleBoard"), "Lifecycle UI must read onboarding/offboarding through API");
assert(lifecycle.includes("updateHrxOnboardingTask"), "Lifecycle UI must update onboarding tasks through API");
assert(lifecycle.includes("closeHrxOffboardingCase"), "Lifecycle UI must close offboarding cases through API");
assert(lifecycle.includes("입퇴사 관리 업무를 불러오지 못했습니다"), "Lifecycle UI must fail closed without local fallback");
assert(lifecycle.includes("입퇴사 관리 업무를 확인합니다") && !lifecycle.includes("온보딩과 오프보딩 업무를 관리합니다"), "Lifecycle UI must use Shiftee entry/exit copy");

const riskDashboard = read("apps/web/src/people/security/HrxRiskDashboard.tsx");
assert(peopleHome.includes("HrxRiskDashboard") && peopleHome.includes("people-risk"), "People home must expose HR risk dashboard");
assert(riskDashboard.includes("fetchHrxRiskEvents") && riskDashboard.includes("scanHrxRiskEvents") && riskDashboard.includes("transitionHrxRiskEvent"), "HR risk dashboard must use risk list, scan, and transition APIs");
for (const label of ["근로계약 미체결", "연차촉진 대상", "법정교육 미이수", "초과근로 위험", "퇴사자 권한 미회수"]) {
  assert(riskDashboard.includes(label), `HR risk dashboard missing legal-five label: ${label}`);
}
assert(riskDashboard.includes('data-hrx-risk-dashboard="true"') && riskDashboard.includes('data-hrx-risk-scan="true"'), "HR risk dashboard must expose stable browser QA markers");
assert(!STATIC_UI_FALLBACK_PATTERN.test(riskDashboard), "HR risk dashboard must not fallback to static data");

const policy = read("apps/web/src/admin/hrx/HRXPolicyConsole.tsx");
assert(policy.includes("fetchHrxPolicies") && policy.includes("createHrxPolicyVersion"), "Policy console must read and create policy versions through API");
assert(policy.includes("승인 규칙") && policy.includes("회사 설정 - 요청") && policy.includes("규칙 이름") && !policy.includes("People 정책"), "Policy console must use Shiftee approval-rule copy");
assert(!policy.includes("인사 정책") && !policy.includes("정책 이름"), "Policy console must avoid vague HR policy copy");

const audit = read("apps/web/src/admin/hrx/HRXAuditViewer.tsx");
assert(audit.includes("fetchHrxAuditEvents") && audit.includes("HrxStepUpChallenge"), "Audit viewer must fetch audit API and render step-up challenge");
assert(audit.includes("step_up_required"), "Audit viewer must branch on server step-up-required state");
assert(audit.includes("인사기록") && audit.includes("조직 변경 이력"), "Audit viewer must use Shiftee personnel-record copy");
assert(!/활동 기록|인사 변경 이력|title="변경 이력"/.test(audit), "Audit viewer must avoid vague activity-log copy");

assert(peopleHome.includes("HRAnalytics") && peopleHome.includes("people-analytics"), "People home must expose API-backed People analytics");
assert(peopleHome.includes("HRAIAssistant") && peopleHome.includes("people-ai"), "People home must expose reviewed AI assistant");
assert(peopleHome.includes("people-certificates") && peopleHome.includes('mode="certificates"'), "People home must expose certificate issuance as a separate route");
assert(peopleHome.includes("구성원 현황을 불러오지 못했습니다") && !peopleHome.includes("People 정보를 불러오지 못했습니다"), "People home must use Korean error copy");

const shell = read("apps/web/src/components/Shell.jsx");
const peopleCatalog = read("apps/web/src/people/peopleFeatureCatalog.js");
const peopleNavigationSource = peopleCatalog;
assert(shell.includes("peopleNavigationGroups") && shell.includes("peopleSidebarGroups"), "Shell must render People menu from the shared catalog");
assert(peopleNavigationSource.includes("구성원") && peopleNavigationSource.includes("휴가관리") && peopleNavigationSource.includes("요청 관리"), "People menu must use Shiftee employee and request labels");
assert(peopleNavigationSource.includes("회사방침") && peopleNavigationSource.includes("증명서 발급 요청") && !peopleNavigationSource.includes('label: "문서"'), "People menu must use Shiftee document/request labels");
assert(peopleNavigationSource.includes("승인 규칙") && !peopleNavigationSource.includes('label: "정책"'), "People menu must use Shiftee approval-rule label");
assert(peopleNavigationSource.includes("인사기록") && !peopleNavigationSource.includes('label: "감사"'), "People menu must use Shiftee personnel-record label");
assert(peopleNavigationSource.includes('label: "권한"') && !peopleNavigationSource.includes('label: "권한 관리"'), "People menu must use Shiftee permission label");
assert(peopleNavigationSource.includes("리포트") && !peopleNavigationSource.includes('label: "현황"'), "People menu must use Shiftee report label");
assert(peopleNavigationSource.includes("근무일정") && peopleNavigationSource.includes("외부일정") && peopleNavigationSource.includes("출퇴근기록"), "People menu must expose Shiftee-style work schedule and attendance labels");
assert(!/문서 증명서|인사 문서|인사 정책|인사규정|활동 기록|권한 관리|권한 설정|인사 현황|구성원 인사이트|급여 정산|인력 현황|인사정보 접근 권한|인사 변경 이력|휴가 승인 규칙|관계자 관리|사건 관련 인물|인물 목록|인물 검색|연결 관계|Client\/Matter 연결/.test(peopleNavigationSource), "People menu must not reintroduce unclear or removed labels");

const analytics = read("apps/web/src/people/analytics/HRAnalytics.tsx");
assert(analytics.includes("fetchHrxAnalytics") && analytics.includes("row_level_details_included"), "People analytics must fetch API and show privacy grain");
assert(analytics.includes("리포트") && analytics.includes("실시간 리포트"), "People analytics must use Shiftee report panel copy");
assert(!/People 현황|People 업무 요약|People 정보를|인사 현황|구성원 인사이트|인력 현황/.test(analytics), "People analytics must not expose English People or vague HR status copy");
assert(!STATIC_UI_FALLBACK_PATTERN.test(analytics), "People analytics must not fallback to static data");

const ai = read("apps/web/src/people/ai/HRAIAssistant.tsx");
assert(ai.includes("askHrxAiAssistant") && ai.includes("fetchHrxAiReviews"), "People AI assistant must use HRX AI routes");
assert(ai.includes("검토 상태") && ai.includes("참고 자료"), "People AI assistant must show review state and citations");
assert(ai.includes("data-hrx-ai-source-scope") && ai.includes("권한 범위 내 근거 없음"), "People AI assistant must surface RAG source-scope state");
assert(ai.includes("인사 문의") && !ai.includes("People 문의"), "People AI assistant must use Korean panel title");
assert(!ai.includes("Grounded HRX advisory response"), "People AI assistant must not carry a hardcoded advisory answer");
assert(!STATIC_UI_FALLBACK_PATTERN.test(ai), "People AI assistant must not fallback to static data");

const payroll = read("apps/web/src/people/payroll/PayrollBoundaryPanel.tsx");
assert(peopleHome.includes("PayrollBoundaryPanel") && peopleHome.includes("people-payroll"), "People home must expose payroll boundary panel");
assert(payroll.includes("createHrxPayrollPreview") && payroll.includes("approveHrxPayrollPreview") && payroll.includes("exportHrxPayrollArtifact"), "Payroll UI must use payroll boundary APIs");
assert(payroll.includes("calculation_runtime") && payroll.includes("disbursement_instruction_included"), "Payroll UI must preserve calculation and disbursement boundary fields");
assert(payroll.includes("급여정산") && payroll.includes("내보내기 전용"), "Payroll UI must use Korean HR SaaS payroll settlement copy");
assert(payroll.includes("계산과 지급 실행은 아직 제공하지 않습니다"), "Payroll UI must show unavailable payroll execution state");
assert(payroll.includes("정산 처리") && payroll.includes("지급 지시는 아직 구현되지 않았습니다"), "Payroll UI must translate payroll execution gaps for users");
assert(!/calculation_runtime=false|disbursement_instruction_included=false|문서 ref|external-preview-only/.test(payroll), "Payroll UI must not expose raw internal payroll boundary strings");
assert(
  !/net_pay|gross_pay|tax_withholding|["']disbursement_instruction["']|disbursement_instruction\s*:/.test(payroll),
  "Payroll UI must not render blocked payroll execution fields"
);
assert(!STATIC_UI_FALLBACK_PATTERN.test(payroll), "Payroll UI must not fallback to static data");

const stepUp = read("apps/web/src/people/security/HrxStepUpChallenge.tsx");
assert(stepUp.includes('data-hrx-step-up-challenge="true"'), "Step-up challenge must have stable e2e marker");
assert(stepUp.includes("권한 확인"), "Step-up challenge must keep session ownership explicit");
assert(!/x-lawos-hrx-step-up|assurance_level|mfa: true|tenant-a|actor_id/.test(stepUp), "Step-up challenge must not fabricate trusted token data");

for (const file of [
  "apps/web/src/people/PeopleHome.tsx",
  "apps/web/src/people/employees/EmployeeList.tsx",
  "apps/web/src/people/employees/PeopleWorkforceDirectory.tsx",
  "apps/web/src/people/employees/EmployeeProfile.tsx",
  "apps/web/src/people/documents/HRDocumentWorkspace.tsx",
  "apps/web/src/people/leave/LeaveRequestPage.tsx",
  "apps/web/src/people/approvals/ManagerApprovalQueue.tsx",
  "apps/web/src/candidate/CandidatePortal.tsx",
  "apps/web/src/people/recruiting/RecruitingPipeline.tsx",
  "apps/web/src/people/lifecycle/LifecycleBoard.tsx",
  "apps/web/src/people/security/HrxRiskDashboard.tsx",
  "apps/web/src/admin/hrx/HRXPolicyConsole.tsx",
  "apps/web/src/admin/hrx/HRXAuditViewer.tsx",
  "apps/web/src/people/analytics/HRAnalytics.tsx",
  "apps/web/src/people/ai/HRAIAssistant.tsx",
  "apps/web/src/people/payroll/PayrollBoundaryPanel.tsx",
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
  "lifecycle-board",
  "risk-dashboard",
  "hrx-policy-console",
  "hrx-audit-viewer",
  "hrx-step-up-challenge",
  "hrx-analytics",
  "hrx-ai-assistant",
  "hrx-payroll-boundary",
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
