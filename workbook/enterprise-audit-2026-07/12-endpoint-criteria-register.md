# Endpoint Criteria Register

이 파일은 A~U 프레임워크 I의 per-endpoint 감사를 위한 기준표다. 현재 턴에서는 source literal 기반으로 route family와 표본 endpoint를 전수 추출했고, 실제 request/response 재실행은 R Stage 이후 V Track에서 수행한다.

## 1. 추출 범위와 수치

| 항목 | 값 |
|---|---:|
| endpoint literal total | 297 |
| API family | 18 |
| 제외 | `apps/desktop/dist`, `docs/closeout-packs`, `artifacts/closeout-pack-claude-review` |
| 추출 방식 | `apps/`, `packages/`, `scripts/`의 `/api` 및 `/master-data` literal 정적 스캔 |

## 2. 22기준 압축 필드

전수표는 아래 22기준을 8개 열로 압축한다.

| 압축 열 | 포함 기준 |
|---|---|
| Route identity | method, path, family |
| Auth/session | signed session, no-token behavior, actor binding |
| Tenant/permission | tenant scope, permission check, count leak 방지 |
| Validation/idempotency | input validation, idempotency/replay, safe error |
| Mutation/persistence | read/write class, restart readback, rollback |
| Audit/provenance | audit event, request id, source/provenance label |
| Data safety | raw secret/identifier/storage path omission, redaction |
| Tests/evidence | source test, browser/UI test, external receipt requirement |

## 3. Family register

| Family | Endpoint literal count | Representative paths | 현재 판정 | 재검증 gate |
|---|---:|---|---|---|
| Auth | 4 | `/api/auth/login`, `/api/auth/session`, `/api/auth/step-up` | 구현되어 있으나 운영 부적합 | R Stage 2~3 |
| MasterData | 6 | `/master-data/records`, `/master-data/relationships`, `/master-data/client-groups/:client_group_id` | 부분 확인됨 | V Stage readback |
| Matter | 19 | `/api/matters`, `/api/matters/openings`, `/api/matters/vault-bridge/status` | 구현되어 있으나 작동 불명 | R Stage 1 |
| Vault/DMS | 6 | `/api/vault/documents`, `/api/vault/documents/upload`, `/api/vault/search` | 확인됨 | V Stage 1 restart |
| CRM/Intake | 34 | `/api/crm/accounts`, `/api/crm/contacts`, `/api/intake/clearance-tokens` | 부분 확인됨 | R Stage 1 |
| RecordActions | 8 | `/api/record-actions/matter/fields`, `/api/record-actions/matter/bulk-updates` | 부분 확인됨 | R Stage 7 after UI routing |
| ImportMapping | 3 | `/api/import-jobs`, `/api/import-targets` | 부분 확인됨 | CA-4 after Stage 7 |
| Admin | 13 | `/api/admin/security`, `/api/admin/permission-sets`, `/api/admin/connected-apps` | 부분 확인됨 | R Stage 6~7 |
| DataCloud | 9 | `/api/data-cloud/providers`, `/api/data-cloud/enrichment-jobs`, `/api/data-cloud/identity-resolution` | 구현되어 있으나 운영 부적합 | provider receipt |
| Reports | 2 | `/api/reports`, `/api/reports/audit` | 부분 확인됨 | CA-3 reports sample |
| Finance | 22 | `/api/finance/time-entries`, `/api/finance/invoices`, `/api/finance/accounting-export.csv` | 부분 확인됨 | CA-3 billing finish sample |
| Analytics | 10 | `/api/analytics/client-profitability`, `/api/analytics/dashboards`, `/api/analytics/refresh` | 부분 확인됨 | CA-3 reports sample |
| AI | 7 | `/api/ai/retrieval`, `/api/ai/outputs`, `/api/ai/review-queue` | 구현되어 있으나 운영 부적합 | provider/model receipt |
| Portal/DataRoom | 20 | `/api/portal/invites`, `/api/portal/rfi`, `/api/data-room/rooms` | 구현되어 있으나 작동 불명 | R Stage 5 |
| Outlook | 8 | `/api/outlook/email/file`, `/api/outlook/attachments/save`, `/api/outlook/smart-alerts/evaluate` | 부분 확인됨 | external M365 receipt |
| UIReadiness | 6 | `/api/ui/readiness`, `/api/ui/checks`, `/api/ui/critical-path-runs` | 부분 확인됨 | R Stage 7 |
| EnterpriseReadiness | 6 | `/api/enterprise/readiness`, `/api/enterprise/go-no-go`, `/api/enterprise/release-candidates` | 부분 확인됨 | V final decision |
| Other/runtime | 32 | `/api/health`, `/api/desktop/login`, `/api/runtime/clients` | 부분 확인됨 | scope split review |

## 4. Per-endpoint row template

다음 실행자는 family별 endpoint literal을 아래 양식으로 채운다. 이 파일에서는 family register를 정본 큐로 두고, 직접 request 재실행 전까지 endpoint별 PASS를 부여하지 않는다.

| Method | Path | Auth/session | Tenant/permission | Validation/idempotency | Mutation/persistence | Audit/provenance | Data safety | Tests/evidence | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| TBD | TBD | signed session required | tenant scoped | safe error/idempotency TBD | restart TBD | audit TBD | no raw secret/path TBD | source + direct replay TBD | 미확인 |

## 5. Immediate endpoint risks

| Risk | Path family | Reason |
|---|---|---|
| Matter creation block | Matter | `/api/matters/openings` is the core P0 failure from W7 |
| Test contract drift | All protected API | signed session introduced but tests are not fully realigned |
| Portal false-positive risk | Portal/DataRoom | endpoint count is broad but existing W7 says G10 not green |
| Enterprise overclaim risk | EnterpriseReadiness | readiness endpoints exist, but `production_ready_claim` must remain false |
| External provider overclaim | Outlook/DataCloud/Finance/AI | provider routes must not be treated as provider execution without external receipts |
