# Test Taxonomy Register

이 파일은 A~U 프레임워크 K의 테스트 20종 taxonomy를 보완한다.

## 1. 현재 정적 수치

| 항목 | 값 |
|---|---:|
| test files with `test(` | 312 |
| test cases with `test(` | 4576 |
| web UI test files | 11 |
| api test files | 69 |
| package test roots in `npm test` | 36+ |

## 2. Test taxonomy 20종

| # | Taxonomy | Current anchors | 현재 판정 | Missing/gate |
|---:|---|---|---|---|
| 1 | Source model/unit | `packages/*/test/model.test.js` | 확인됨 | 일부 descriptor-only가 runtime proof로 오인되지 않게 라벨 유지 |
| 2 | Domain service unit | `packages/matter/test/runtime-services.test.js`, `packages/dms/test/runtime-services.test.js` | 부분 확인됨 | Matter opening 직접 실패와 분리 |
| 3 | API route contract | `apps/api/test/cmp-r4-*.test.js` | 구현되어 있으나 작동 불명 | R Stage 2 |
| 4 | Auth/session negative | `apps/api/test/session-auth-api.test.js` | 부분 확인됨 | R Stage 3 |
| 5 | Tenant isolation | `apps/api/test/hrx/tenant-isolation.test.js`, vault security tests | 부분 확인됨 | HRX fail 재정렬 |
| 6 | Permission denial/count leak | `packages/authz/test/authz.test.js`, API route tests | 부분 확인됨 | endpoint 전수 replay |
| 7 | Sensitive read audit | `apps/api/src/middleware/sensitive-read-audit.js`, finance/vault tests | 부분 확인됨 | L mapping에서 표본 확대 |
| 8 | Idempotency/replay | `apps/api/test/idempotency/matter-vault-idempotency.test.js` | 부분 확인됨 | Matter opening replay after Stage 1 |
| 9 | Persistence/restart | `apps/api/test/*persistence*`, HRX durable tests | 부분 확인됨 | fixed STORE_PATH preflight |
| 10 | Backup/restore drill | `scripts/test/matter-vault-backup-restore.test.mjs` | 부분 확인됨 | R Stage 8 receipt |
| 11 | Browser/UI regression | `apps/web/test/ui-regression.test.mjs` | 부분 확인됨 | R Stage 7 after dead surface decision |
| 12 | Accessibility/static UI | `apps/web/test/matter-vault-a11y.test.mjs` | 부분 확인됨 | route별 UX 24항 수동 확인 |
| 13 | Desktop shell smoke | `apps/desktop/test/shell-smoke.test.mjs` | 부분 확인됨 | packaged desktop restart receipt review |
| 14 | Add-in/API integration | `apps/api/test/outlook-addin-api.test.js`, `apps/addin/src/main.jsx` | 부분 확인됨 | M365 external receipt |
| 15 | External receipt validator | `scripts/test/wave1-external-receipt-readiness.test.mjs`, Popbill tests | 구현되어 있으나 작동 불명 | owner/provider approval |
| 16 | Security regression | `apps/api/test/security/**`, `apps/api/test/hrx/security-regression.test.js` | 부분 확인됨 | R Stage 6 |
| 17 | Performance/smoke | `apps/api/test/perf/matter-vault-smoke.test.js` | 부분 확인됨 | stage replay under fixed store |
| 18 | Validator/script gate | `scripts/validate-*.mjs` | 부분 확인됨 | no single enterprise audit validator yet |
| 19 | Build/type/lint | `npm --workspace apps/web run build`; lint/typecheck missing per W7 | 미확인 | web tsconfig/lint script absent in W7 |
| 20 | Manual QA/evidence receipt | `artifacts/manual-qa/*` | 부분 확인됨 | existing 13 dirty files remain out of scope |

## 3. Highest-volume anchors

| File | Test count | Use in audit |
|---|---:|---|
| `packages/control-plane/test/service.test.js` | 841 | Descriptor/control-plane breadth, not runtime proof alone |
| `packages/hrx/test/model.test.js` | 195 | HRX model breadth |
| `packages/authz/test/authz.test.js` | 122 | Permission kernel |
| `packages/dms/test/model.test.js` | 117 | DMS model breadth |
| `apps/api/test/hrx-runtime-api.test.js` | 26 | HRX API runtime |
| `apps/api/test/cmp-r4-g4-matter.test.js` | 13 | Matter API runtime |
| `apps/web/test/ui-regression.test.mjs` | 17 | Product UI source checks |

## 4. Taxonomy warnings

| Warning | Impact |
|---|---|
| Descriptor-only package tests are numerous | They prove contracts, not live product execution |
| Root/API tests were red in W7 | Any taxonomy row depending on full API green remains `구현되어 있으나 작동 불명` |
| Manual QA receipts are dirty before this work | Do not normalize them inside coverage docs |
| External receipt tests are owner/provider gated | Local green alone cannot become provider execution proof |

## 5. K 판정

K taxonomy is now documented. It is not a replacement for `npm test`, `npm run api:test`, web build, UI tests, or manual/browser replay. It is a routing map for V Track.
