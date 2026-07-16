# RC-004 Upper-compatible Capability Review

## Comparison universe

- Forest checkpoint changed paths: 222
- root dirty paths: 77
- common product paths: 51
- root-only paths: 25
- Forest-only paths: 170
- product comparison universe: 246
- root contributions classified: 76
- Forest-only paths preserved: 170
- unclassified: 0

## Root contribution dispositions

| Path | Origin | Disposition | Source gate |
|---|---|---|---|
| `apps/api/src/hrx-member-roster-registry.js` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/api/src/hrx-runtime-context.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/api/src/lawos-role-registry.js` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/api/src/middleware/hrx-step-up.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/api/src/routes/hrx/payroll.js` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `apps/api/src/routes/hrx/route-policy-map.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/api/src/server.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/api/test/hrx/leave-accrual-api.test.js` | common | `PORT_TEST_ONLY` | `MERGE_TESTS` |
| `apps/api/test/hrx/leave-management-api.test.js` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/api/test/hrx/leave-policy-api.test.js` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/api/test/hrx/payroll-items-api.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `apps/api/test/hrx/payroll-profile-api.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `apps/api/test/hrx/payroll-time-input-api.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `apps/api/test/hrx/route-authz.test.js` | common | `PORT_TEST_ONLY` | `MERGE_TESTS` |
| `apps/api/test/hrx/step-up-route.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `apps/api/test/profile-api.test.js` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/desktop/src/main/main.js` | common | `SUPERSEDED` | `KEEP_IDENTICAL` |
| `apps/desktop/test/shell-smoke.test.mjs` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/src/components/AuthSurface.jsx` | common | `REJECTED` | `REJECT_ROOT_VISUAL` |
| `apps/web/src/components/UserProfileSurface.jsx` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/src/people/hrxApiClient.ts` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/web/src/people/leave/LeaveAccrualAutoPage.tsx` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/web/src/people/leave/LeaveAccrualManualPage.tsx` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/web/src/people/leave/LeaveApprovalQueue.tsx` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/web/src/people/leave/LeavePromotionPage.tsx` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/src/people/leave/LeaveRequestPage.tsx` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/src/people/leave/LeaveTerminationPage.tsx` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/web/src/people/leave/LeaveTypeSettingsPage.tsx` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/web/src/people/leave/LeaveUsagePage.tsx` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/src/people/memberPhotos.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `apps/web/test/leave-accrual-ui.test.mjs` | common | `PORT_TEST_ONLY` | `MERGE_TESTS` |
| `apps/web/test/leave-integration-ui.test.mjs` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/test/leave-promotion-ui.test.mjs` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/test/leave-reporting-ui.test.mjs` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `apps/web/test/leave-self-service-ui.test.mjs` | common | `PORT_TEST_ONLY` | `MERGE_TESTS` |
| `apps/web/test/ui-regression.test.mjs` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `docs/lazycodex/evidence/matter-desktop/artifacts/lv009-forest-leave-auto-packaged-2026-07-15.png` | root-only | `REJECTED` | `REJECTED` |
| `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md` | common | `REJECTED` | `REGENERATE` |
| `docs/lazycodex/evidence/matter-web/desktop-web-renderer-asset.md` | common | `REJECTED` | `REGENERATE` |
| `docs/runbooks/hrx-member-contact-visibility.md` | root-only | `SUPERSEDED` | `SUPERSEDED` |
| `packages/authz/src/hrx-sensitive-scopes.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/src/index.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/src/leave/accrual-service.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/src/leave/allocation.js` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/leave/integration-service.js` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `packages/hrx/src/leave/management-service.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/src/leave/manual-adjustment-file.js` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/leave/policy-service.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/src/leave/xlsx-export.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/src/migrations/011_hrx_payroll_items.sql` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/migrations/012_hrx_payroll_profiles.sql` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/migrations/013_hrx_payroll_time_inputs.sql` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/migrations/014_hrx_leave_usage_units.sql` | root-only | `SUPERSEDED` | `SUPERSEDED` |
| `packages/hrx/src/migrations/015_hrx_leave_accrual_rule_versions.sql` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/migrations/016_hrx_leave_entitlement_lifecycle.sql` | root-only | `SUPERSEDED` | `SUPERSEDED` |
| `packages/hrx/src/migrations/index.js` | common | `PORT_REQUIRED` | `RENUMBER_026_PLUS` |
| `packages/hrx/src/payroll-item-catalog.js` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/payroll-profile-service.js` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/payroll-time-input-snapshot.js` | root-only | `PORT_REQUIRED` | `PORT_REQUIRED` |
| `packages/hrx/src/store/file-store.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/src/store/port.js` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `packages/hrx/test/leave-accrual-service.test.js` | common | `PORT_TEST_ONLY` | `MERGE_TESTS` |
| `packages/hrx/test/leave-integration-service.test.js` | common | `PORT_TEST_ONLY` | `MERGE_TESTS` |
| `packages/hrx/test/leave-management-durable.test.js` | common | `PORT_TEST_ONLY` | `MERGE_TESTS` |
| `packages/hrx/test/leave-manual-adjustment-file.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `packages/hrx/test/leave-policy-service.test.js` | root-only | `SUPERSEDED` | `SUPERSEDED` |
| `packages/hrx/test/migration.test.js` | common | `PORT_TEST_ONLY` | `REWRITE_FOR_026_PLUS` |
| `packages/hrx/test/payroll-item-catalog.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `packages/hrx/test/payroll-profile-service.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `packages/hrx/test/payroll-time-input-snapshot.test.js` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `scripts/build-matter-desktop-mac.mjs` | common | `PORT_REQUIRED` | `SELECTIVE_PORT` |
| `scripts/build-matter-desktop-win.mjs` | common | `SUPERSEDED` | `KEEP_FOREST_PENDING_INVENTORY` |
| `scripts/prepare-matter-desktop-web-renderer.mjs` | common | `SUPERSEDED` | `KEEP_FOREST` |
| `scripts/smoke-matter-profile-packaged.mjs` | root-only | `PORT_TEST_ONLY` | `PORT_TEST_ONLY` |
| `scripts/validate-public-renderer-no-hrx-roster-pii.mjs` | common | `SUPERSEDED` | `KEEP_IDENTICAL` |
| `workbook/hrx-payroll-leave-tuw-execution-plan-2026-07-14.md` | root-only | `SUPERSEDED` | `SUPERSEDED` |

## PORT_REQUIRED groups

| Group | Selected paths | Destination anchors | Negative regression | Manual proof |
|---|---:|---|---|---|
| `RUNTIME_AUTHZ_UNION` | 10 | `apps/api/src/hrx-role-scope-matrix.js`<br>`apps/api/src/hrx-payroll-runtime.js`<br>`apps/api/src/routes/hrx/payroll-runtime.js`<br>`packages/hrx/src/store/port.js` | 기존 Forest leave/payroll route, attachment, provider retry, profile resolution, tenant/session boundary 삭제 0. | 6개 역할별 People/휴가/급여 route와 서지원 프로필을 최종 packaged renderer에서 확인한다. |
| `LEAVE_RULE_LEDGER` | 7 | `packages/hrx/src/leave/entitlement-command-service.js`<br>`packages/hrx/src/leave/entitlement-lifecycle.js`<br>`packages/hrx/src/leave/type-economics.js`<br>`packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql` | 미리보기 전 write, 원장 직접 수정, 중복 발생, 기존 type economics/반올림 손실 0. | Forest 44px 밀도의 자동발생·유형 설정 화면에서 규칙 버전과 실행 receipt만 간결하게 확인한다. |
| `LEAVE_FILE_IMPORT` | 3 | `packages/hrx/src/leave/occurrence-upload-batch-service.js`<br>`apps/web/src/people/leave/LeaveAccrualManualPage.tsx` | zip bomb, malformed XLSX, formula injection, row limit 초과, preview 우회, 부분 write 0. | 템플릿 다운로드부터 preview·승인·실행·오류 receipt까지 단일 흐름으로 검수한다. |
| `LEAVE_COMPACT_ACTIONS` | 2 | `apps/web/src/people/leave/LeaveApprovalQueue.tsx`<br>`apps/web/src/people/leave/LeaveTerminationPage.tsx` | 휴가·비용처리 분류 재도입, 무의미한 empty copy, 2줄 metadata, 이중 승인 문구 재도입 0. | 승인 대기와 퇴사 정산을 실제 Forest 화면에서 단일 행·단일 action으로 검수한다. |
| `PROFILE_HARDENING` | 2 | `apps/api/src/hrx-member-roster-registry.js`<br>`apps/web/src/components/UserProfileSurface.jsx`<br>`scripts/validate-public-renderer-no-hrx-roster-pii.mjs` | jwsuh@amic.kr의 서지원 매핑 손실, 세션 사용자 표기, 미등록 placeholder, 비이미지 data URL, PII 번들 포함 0. | 동일 계정으로 로그인하여 프로필 이름·부서·직위와 사진을 packaged app에서 확인한다. |
| `PAYROLL_CATALOG_ASSIGNMENT_TIME` | 7 | `apps/api/src/hrx-payroll-runtime.js`<br>`packages/hrx/src/payroll/input-snapshot-service.js`<br>`packages/hrx/src/payroll/repository.js`<br>`packages/hrx/src/migrations/021_hrx_payroll_runtime.sql`<br>`packages/hrx/src/migrations/025_hrx_payroll_year_end.sql` | root 011~013 재사용, raw amount/계좌 노출, 승인 전 시간 입력 반영, 기존 run/payment/filing/year-end 기능 삭제 0. | 급여 항목 설정부터 입력 snapshot·계산·명세서·지급·신고 상태를 역할별 Forest 화면에서 검수한다. |

## Forest-only preservation

| Path | Capability | Preservation | Checkpoint relation |
|---|---|---|---|
| `apps/api/src/hrx-payroll-runtime.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/api/src/hrx-role-scope-matrix.js` | `AUTH_PROFILE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/api/src/routes/hrx/payroll-runtime.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/api/test/hrx-runtime-api.test.js` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_TEST` | `APPROVED_FZ006_STABILIZATION` |
| `apps/api/test/hrx/hrx-role-scope-matrix.test.js` | `AUTH_PROFILE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/api/test/hrx/leave-entitlement-lifecycle-api.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/api/test/hrx/leave-integration-api.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/api/test/hrx/leave-promotion-api.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/api/test/hrx/leave-reporting-api.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/api/test/hrx/payroll-runtime.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/desktop/src/main/aws-runtime.js` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/desktop/src/renderer/offline.html` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/desktop/test/aws-runtime-client.test.mjs` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/desktop/test/renderer-runtime-ui.test.mjs` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/web/src/App.jsx` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/admin/hrx/HRXAuditViewer.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/admin/hrx/HRXPolicyConsole.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/candidate/CandidatePortal.tsx` | `PORTAL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/AnalyticsSurface.jsx` | `SEARCH` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/AskSurface.jsx` | `SEARCH` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/ClientsSurface.jsx` | `CLIENT` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/DashboardList.jsx` | `HOME` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/DataCloudEnrichmentPanel.jsx` | `CLIENT` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/FinanceSurface.jsx` | `HOME` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/HomeFinanceOperations.jsx` | `HOME` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/HomeSurface.jsx` | `HOME` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/ImportDataMappingPanel.jsx` | `CLIENT` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/IntakeSurface.jsx` | `CLIENT` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/MatterVaultPanel.jsx` | `MATTER` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/MattersSurface.jsx` | `MATTER` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/OpsSurface.jsx` | `HOME` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/PortalSurface.jsx` | `PORTAL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/ProfilesSurface.jsx` | `CLIENT` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/ReadinessSurface.jsx` | `SEARCH` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/ReportBuilderPanel.jsx` | `SEARCH` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/Shell.jsx` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/VaultSurface.jsx` | `SEARCH` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/components/primitives.jsx` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/data/globalUtilities.js` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/i18n.js` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/PeopleHome.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/admin/PermissionAdminPanel.jsx` | `AUTH_PROFILE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/ai/HRAIAssistant.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/analytics/HRAnalytics.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/approvals/ManagerApprovalQueue.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/attendance/AttendanceWorkspace.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/documents/HRDocumentWorkspace.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/employees/EmployeeList.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/employees/PeopleWorkforceDirectory.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/legal/LegalPeopleWorkspace.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/lifecycle/LifecycleBoard.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/payroll/PayrollBoundaryPanel.tsx` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/payroll/PayrollStatementWorkspace.tsx` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/peopleFeatureCatalog.js` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/recruiting/RecruitingPipeline.tsx` | `PEOPLE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/security/HrxRiskDashboard.tsx` | `AUTH_PROFILE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/people/security/HrxStepUpChallenge.tsx` | `AUTH_PROFILE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/src/styles.css` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `apps/web/test/forest-responsive-layout-browser.test.mjs` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/web/test/home-dashboard-r1.test.mjs` | `HOME` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/web/test/leave-settings-ui.test.mjs` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `apps/web/test/payroll-workspace-ui.test.mjs` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `docs/lazycodex/evidence/matter-desktop/artifacts/leave-management-package-qa.json` | `LEAVE` | `HISTORICAL_EVIDENCE_ONLY` | `BYTE_IDENTICAL` |
| `docs/lazycodex/evidence/matter-desktop/artifacts/payroll-final-verification-2026-07-15.md` | `PAYROLL` | `HISTORICAL_EVIDENCE_ONLY` | `BYTE_IDENTICAL` |
| `docs/lazycodex/evidence/matter-desktop/artifacts/payroll-package-qa-2026-07-15.json` | `PAYROLL` | `HISTORICAL_EVIDENCE_ONLY` | `BYTE_IDENTICAL` |
| `docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md` | `PERSISTENCE_AUTHZ_PACKAGE` | `HISTORICAL_EVIDENCE_ONLY` | `BYTE_IDENTICAL` |
| `docs/lazycodex/evidence/matter-web/artifacts/payroll-browser-qa-2026-07-15.json` | `PAYROLL` | `HISTORICAL_EVIDENCE_ONLY` | `BYTE_IDENTICAL` |
| `packages/billing/src/invoice-pdf-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/fixtures/company-time-payroll-policy.synthetic.json` | `PAYROLL` | `PRESERVE_FIXTURE` | `BYTE_IDENTICAL` |
| `packages/hrx/fixtures/leave-payroll-golden.synthetic.json` | `PAYROLL` | `PRESERVE_FIXTURE` | `BYTE_IDENTICAL` |
| `packages/hrx/fixtures/payroll-statutory-rules.synthetic.json` | `PAYROLL` | `PRESERVE_FIXTURE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/company-policy-manifest.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/golden-fixture.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/accrual-batch-repository.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/accrual-batch-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/accrual-period-generator.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/entitlement-command-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/entitlement-lifecycle.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/entitlement-read-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/expiration-job.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/expiration-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/migration-reconciliation-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/occurrence-upload-batch-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/promotion-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/provider-adapters.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/reporting-service.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/type-economics.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/leave/type-rule-backfill.js` | `LEAVE` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/011_hrx_leave_type_economics.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/012_hrx_leave_job_outbox.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/013_hrx_leave_accrual_batches.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/014_hrx_leave_occurrence_metadata.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/015_hrx_leave_occurrence_upload_batches.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/016_hrx_leave_promotion_exclusions.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/017_hrx_leave_promotion_notice_hashes.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/018_hrx_leave_promotion_evidence_receipts.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/019_hrx_leave_integration_dead_letters.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql` | `LEAVE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` | `PAYROLL` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/022_hrx_payroll_inputs.sql` | `PAYROLL` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/023_hrx_payroll_profile_units.sql` | `PAYROLL` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/024_hrx_payroll_run_controls.sql` | `PAYROLL` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/025_hrx_payroll_year_end.sql` | `PAYROLL` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/migrations/safety.js` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_MIGRATION` | `BYTE_IDENTICAL` |
| `packages/hrx/src/overtime.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll-boundary.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/calculation-engine.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/deduction-engine.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/document-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/filing-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/input-snapshot-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/migration-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/money.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/parallel-comparison-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/payment-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/repository.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/run-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/statutory-rule-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/payroll/year-end-service.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/src/provider-receipt-contract.js` | `PAYROLL` | `PRESERVE_SOURCE` | `BYTE_IDENTICAL` |
| `packages/hrx/test/company-policy-manifest.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/golden-fixture.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-accrual-batch-repository.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-accrual-batch-service.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-accrual-period-generator.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-entitlement-command-service.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-entitlement-lifecycle.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-expiration-job.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-expiration-service.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-migration-reconciliation-service.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-occurrence-upload-batch-service.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-promotion-service.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-provider-adapters.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-reporting-service.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-type-economics.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/leave-type-rule-backfill.test.js` | `LEAVE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/migration-safety.test.js` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-calculation-engine.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-deduction-engine.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-document-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-filing-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-input-snapshot-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-migration-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-money.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-parallel-comparison-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-payment-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-readiness-contract.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-repository.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-run-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-statutory-rule-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/payroll-year-end-service.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `packages/hrx/test/provider-receipt-contract.test.js` | `PAYROLL` | `PRESERVE_TEST` | `BYTE_IDENTICAL` |
| `scripts/generate-forest-checkpoint-evidence.mjs` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_QA_TOOL` | `BYTE_IDENTICAL` |
| `scripts/run-leave-management-packaged-qa.mjs` | `LEAVE` | `PRESERVE_QA_TOOL` | `BYTE_IDENTICAL` |
| `scripts/run-payroll-browser-qa.mjs` | `PAYROLL` | `PRESERVE_QA_TOOL` | `BYTE_IDENTICAL` |
| `scripts/run-payroll-packaged-qa.mjs` | `PAYROLL` | `PRESERVE_QA_TOOL` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-001/acceptance.md` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-001/commands.txt` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-001/receipt.json` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-002/acceptance.md` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-002/manifest.tsv` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-002/receipt.json` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-003/acceptance.md` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-003/commands.txt` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-003/security-scan.json` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-004/acceptance.md` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-004/commands.txt` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-004/receipt.json` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/forest-v0.1.17-integration-evidence/FZ-005/precommit-security-scan.json` | `PERSISTENCE_AUTHZ_PACKAGE` | `PRESERVE_CHECKPOINT_EVIDENCE` | `BYTE_IDENTICAL` |
| `workbook/hrx-leave-payroll-tuw-implementation-plan-2026-07-14.md` | `PAYROLL` | `PRESERVE_PLAN` | `BYTE_IDENTICAL` |

## Capability acceptance matrix

| Capability | Forest-only paths | Source anchors | Proof anchors | Acceptance |
|---|---:|---|---|---|
| `HOME` | 6 | `apps/web/src/components/HomeSurface.jsx`<br>`apps/web/src/components/HomeFinanceOperations.jsx` | `apps/web/test/home-dashboard-r1.test.mjs`<br>`apps/web/test/ui-regression.test.mjs` | 승인 대기는 구체 항목을 직접 표시하고 최근 작업은 정렬된 단일 행이며 캘린더와 공존한다. |
| `CLIENT` | 5 | `apps/web/src/components/ClientsSurface.jsx`<br>`apps/web/src/components/ImportDataMappingPanel.jsx` | `apps/web/test/forest-responsive-layout-browser.test.mjs`<br>`apps/web/test/ui-regression.test.mjs` | 현재 Forest 고객 목록·가져오기·enrichment 계약을 유지한다. |
| `MATTER` | 2 | `apps/web/src/components/MattersSurface.jsx`<br>`apps/web/src/components/MatterVaultPanel.jsx` | `apps/web/test/forest-responsive-layout-browser.test.mjs`<br>`apps/web/test/ui-regression.test.mjs` | 현재 Matter 목록과 Vault 연결 상태를 한 줄 정보 계층으로 유지한다. |
| `PEOPLE` | 14 | `apps/web/src/people/PeopleHome.tsx`<br>`apps/web/src/people/employees/EmployeeList.tsx` | `apps/web/test/forest-responsive-layout-browser.test.mjs`<br>`apps/api/test/hrx-runtime-api.test.js` | 구성원 조회와 People 업무 모듈을 유지하고 삭제된 근무일정·직무역할·근로정보 메뉴를 되살리지 않는다. |
| `SEARCH` | 5 | `apps/web/src/components/VaultSurface.jsx`<br>`apps/web/src/App.jsx` | `apps/web/test/forest-responsive-layout-browser.test.mjs`<br>`apps/web/test/ui-regression.test.mjs` | Search 명칭·Vault 통합 검색·현재 Forest hero와 메뉴를 유지하고 문서/OCR 별도 메뉴를 만들지 않는다. |
| `PORTAL` | 2 | `apps/web/src/components/PortalSurface.jsx`<br>`apps/web/src/candidate/CandidatePortal.tsx` | `apps/web/test/forest-responsive-layout-browser.test.mjs`<br>`apps/web/test/ui-regression.test.mjs` | 현재 Portal shell과 candidate collaboration surface를 유지한다. |
| `AUTH_PROFILE` | 5 | `apps/api/src/hrx-role-scope-matrix.js`<br>`apps/web/src/components/UserProfileSurface.jsx` | `apps/api/test/hrx/hrx-role-scope-matrix.test.js`<br>`apps/api/test/profile-api.test.js`<br>`scripts/validate-public-renderer-no-hrx-roster-pii.mjs` | Forest 로그인·권한·계정 연결 프로필을 유지하며 known account가 generic 세션 사용자로 후퇴하지 않는다. |
| `LEAVE` | 46 | `packages/hrx/src/leave/entitlement-command-service.js`<br>`packages/hrx/src/leave/occurrence-upload-batch-service.js`<br>`packages/hrx/src/leave/type-economics.js` | `packages/hrx/test/leave-entitlement-command-service.test.js`<br>`packages/hrx/test/leave-occurrence-upload-batch-service.test.js`<br>`apps/web/test/leave-settings-ui.test.mjs` | 휴가 유형·자동/수동 발생·원장 lifecycle·사용·만료·promotion·provider·privacy 전체를 보존한다. |
| `PAYROLL` | 56 | `packages/hrx/src/payroll/run-service.js`<br>`packages/hrx/src/payroll/deduction-engine.js`<br>`packages/hrx/src/payroll/document-service.js` | `packages/hrx/test/payroll-run-service.test.js`<br>`packages/hrx/test/payroll-deduction-engine.test.js`<br>`apps/web/test/payroll-workspace-ui.test.mjs` | 입력·계산·공제·run·명세서·지급·신고·migration·year-end 전체를 보존한다. |
| `PERSISTENCE_AUTHZ_PACKAGE` | 29 | `packages/hrx/src/store/port.js`<br>`apps/desktop/src/main/aws-runtime.js`<br>`apps/web/src/components/Shell.jsx` | `apps/desktop/test/aws-runtime-client.test.mjs`<br>`apps/desktop/test/renderer-runtime-ui.test.mjs`<br>`apps/web/test/forest-responsive-layout-browser.test.mjs` | durable store·tenant/authz·Desktop runtime·renderer·PII validator·checkpoint/QA 도구를 보존한다. |

## Adjudication

- The 170-path Forest-only set is preserved from the ended-session checkpoint. One test path has the approved FZ-006 stabilization; unexpected checkpoint changes are zero.
- All 76 root contributions are assigned exactly one of PORT_REQUIRED, PORT_TEST_ONLY, SUPERSEDED, or REJECTED.
- Every one of the 31 PORT_REQUIRED paths belongs to exactly one bounded port group. No file-level copy of a differing common file is authorized.
- All 10 governing capability axes have current Forest source anchors and proof anchors. RC-004 changes no product runtime code.
