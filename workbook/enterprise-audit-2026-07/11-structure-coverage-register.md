# Structure Coverage Register

이 파일은 A~U 프레임워크 중 H 엔티티 21종과 구조 감사 일부를 보완한다. 정적 스캔 범위는 `apps/`, `packages/`, `scripts/`, 기존 enterprise workbook이며, `apps/desktop/dist`, `docs/closeout-packs`, `artifacts/closeout-pack-claude-review`는 기존 헌장처럼 제외했다.

## 1. Runtime family map

| Family | Primary code surface | Tests/evidence anchor | 판정 |
|---|---|---|---|
| Auth/session | `apps/api/src/session-auth.js` | `apps/api/test/session-auth-api.test.js` | 구현되어 있으나 운영 부적합 |
| Master Data | `apps/api/src/master-data-context.js`, `packages/master-data/` | `apps/api/test/master-data-api.test.js`, `packages/master-data/test/model.test.js` | 부분 확인됨 |
| Matter | `apps/api/src/matter-runtime-context.js`, `apps/api/src/routes/matters.js`, `packages/matter/` | `apps/api/test/cmp-r4-g4-matter.test.js` | 구현되어 있으나 작동 불명 |
| Vault/DMS | `apps/api/src/vault-dms-runtime-context.js`, `apps/api/src/routes/vault.js`, `packages/dms/` | `apps/api/test/cmp-r4-g5-vault.test.js` | 확인됨 |
| CRM/Intake | `apps/api/src/crm-intake-runtime-context.js`, `apps/api/src/routes/crm.js`, `packages/crm/`, `packages/intake/` | `apps/api/test/cmp-r4-g6-crm-intake.test.js` | 부분 확인됨 |
| Finance | `apps/api/src/finance-runtime-context.js`, `packages/billing/`, `packages/payments/`, `packages/settlement/` | `apps/api/test/cmp-r4-g7-finance.test.js` | 부분 확인됨 |
| Analytics/Reports | `apps/api/src/analytics-runtime-context.js`, `apps/api/src/routes/reports.js`, `packages/analytics/`, `packages/reports/` | `apps/api/test/cmp-r4-g8-analytics.test.js`, `apps/api/test/sf-b-w08-report-builder-client-profitability.test.js` | 부분 확인됨 |
| AI | `apps/api/src/ai-runtime-context.js`, `packages/ai-governance/`, `packages/ai-legal-workflows/` | `apps/api/test/cmp-r4-g9-ai.test.js` | 구현되어 있으나 운영 부적합 |
| Portal/Data Room | `apps/api/src/portal-runtime-context.js`, `packages/client-portal/`, `packages/data-room/` | `apps/api/test/cmp-r4-g10-portal.test.js` | 구현되어 있으나 작동 불명 |
| Enterprise readiness | `apps/api/src/enterprise-readiness-context.js`, `packages/enterprise/` | `apps/api/test/cmp-r4-g12-enterprise-readiness.test.js` | 부분 확인됨 |
| HRX/People | `apps/api/src/hrx-runtime-context.js`, `packages/hrx/`, `apps/web/src/people/` | `apps/api/test/hrx-runtime-api.test.js`, `apps/api/test/hrx/**` | 부분 확인됨 |
| Outlook add-in | `apps/api/src/outlook-addin-runtime-context.js`, `apps/addin/src/main.jsx` | `apps/api/test/outlook-addin-api.test.js` | 부분 확인됨 |

## 2. 엔티티 21종 매핑

| # | Entity | Evidence path | API/UI anchor | 판정 |
|---:|---|---|---|---|
| 1 | Organization | `packages/master-data/`, `apps/api/src/crm-intake-runtime-context.js` | CRM account/master-data sync | 부분 확인됨 |
| 2 | Client | `packages/master-data/`, `apps/web/src/components/ClientsSurface.jsx` | `/api/crm/accounts`, Client surface | 부분 확인됨 |
| 3 | Person | `packages/master-data/`, `packages/hrx/` | CRM contacts, HRX employees | 부분 확인됨 |
| 4 | ContactPoint | `packages/master-data/`, `packages/crm/` | CRM contact/account panels | 부분 확인됨 |
| 5 | Matter | `apps/api/src/matter-runtime-context.js` | `/api/matters`, `/api/matters/openings` | 구현되어 있으나 작동 불명 |
| 6 | Party | `apps/api/src/party-runtime-context.js` | `apps/api/test/cmp-r4-g2-party.test.js` | 부분 확인됨 |
| 7 | ConflictCheck | `apps/api/src/crm-intake-runtime-context.js` | Client intake/conflict buttons | 부분 확인됨 |
| 8 | ClearanceToken | `apps/api/src/crm-intake-runtime-context.js`, `apps/api/src/matter-runtime-context.js` | `/api/intake/clearance-tokens`, `/api/matters/openings` | 구현되어 있으나 작동 불명 |
| 9 | Engagement | `apps/api/src/crm-intake-runtime-context.js` | Client intake engagement approval | 부분 확인됨 |
| 10 | VaultDocument | `apps/api/src/vault-dms-runtime-context.js` | `/api/vault/documents`, upload/download tests | 확인됨 |
| 11 | EmailThread | `apps/api/src/outlook-addin-runtime-context.js` | `/api/outlook/email/file` | 부분 확인됨 |
| 12 | Task/Activity | `apps/api/src/routes/matters.js`, `apps/web/src/components/MattersSurface.jsx` | Matter activity/timeline | 부분 확인됨 |
| 13 | CalendarEvent | `apps/api/src/routes/matters.js` | Matter calendar/deadline tests | 부분 확인됨 |
| 14 | TimeEntry | `apps/api/src/finance-runtime-context.js` | `/api/finance/time-entries` | 부분 확인됨 |
| 15 | Expense/Disbursement | `apps/api/src/finance-runtime-context.js` | `/api/finance/expenses`, `/api/finance/disbursements` | 부분 확인됨 |
| 16 | Invoice/Prebill | `apps/api/src/finance-runtime-context.js` | `/api/finance/prebills`, `/api/finance/invoices` | 부분 확인됨 |
| 17 | Payment/TrustLedger | `apps/api/src/finance-runtime-context.js` | `/api/finance/payments`, trust routes | 부분 확인됨 |
| 18 | PortalInvite/RFI/SecureLink | `apps/api/src/portal-runtime-context.js` | `/api/portal/invites`, `/api/portal/rfi`, `/api/portal/secure-links` | 구현되어 있으나 작동 불명 |
| 19 | User/Role/PermissionSet | `apps/api/src/session-auth.js`, `apps/api/src/routes/admin-permission.js` | `/api/admin/security`, `/api/admin/permission-sets` | 부분 확인됨 |
| 20 | Employee/Leave/Payroll | `apps/api/src/hrx-runtime-context.js`, `apps/web/src/people/` | `/api/hrx/employees`, leave, payroll | 부분 확인됨 |
| 21 | AIEmbedding/AIOutput | `apps/api/src/ai-runtime-context.js`, `packages/ai-legal-workflows/` | `/api/ai/retrieval`, `/api/ai/outputs` | 구현되어 있으나 운영 부적합 |

## 3. 구조 갭

| Gap | 근거 | 다음 조치 |
|---|---|---|
| Matter opening이 구조상 CRM clearance와 Matter opening 사이에 묶여 있음 | 기존 W7 보고서와 Stage 1 지시서가 validation block을 기록 | R Stage 1에서 수직 표본 복구 후 H table 재판정 |
| HRX는 폭이 넓지만 보안 regression이 분리됨 | `apps/api/test/hrx/**`가 별도 security/tenant/step-up 테스트를 가짐 | R Stage 6 후 HRX row 재판정 |
| Portal/Data Room은 endpoint와 package가 있으나 green 판정 아님 | `cmp-r4-g10-portal.test.js`가 기존 실패군에 포함 | R Stage 5 후 Portal row 재판정 |
| AI는 route와 review queue가 있으나 실 LLM/provider evidence가 분리됨 | `/api/ai/*`, local model gateway proof는 synthetic/provider-gated | provider receipt 전까지 운영 부적합 유지 |

## 4. CA-1 판정

H 엔티티 21종 매핑은 이 파일로 보완됐다. 단, 이 보완은 정적 구조 register이며 기능 성공 판정이 아니다. Matter/Portal/HRX/AI/Finance의 최종 판정은 R Track과 V Track의 직접 재실행 표본에 종속된다.
