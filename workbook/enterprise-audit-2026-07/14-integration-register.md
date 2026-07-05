# Integration Register

이 파일은 A~U 프레임워크 M의 연동 18종 판정을 보완한다. 외부 provider는 local code/test가 있어도 external receipt 없이는 실행 완료로 보지 않는다.

## 1. 18종 연동 판정

| # | Integration | Evidence anchor | 현재 판정 | Required next proof |
|---:|---|---|---|---|
| 1 | Microsoft Outlook add-in | `apps/addin/src/main.jsx`, `apps/api/src/outlook-addin-runtime-context.js` | 부분 확인됨 | Graph/admin consent receipt + filing 1건 |
| 2 | Microsoft Graph/M365 | Outlook docs/tests, `docs/matter-pack-integration/m365/` | 미확인 | tenant/admin consent + sanitized receipt |
| 3 | Popbill | `scripts/test/upl-b13-withholding.test.mjs`, manual QA receipts | 구현되어 있으나 작동 불명 | approved sandbox issue receipt |
| 4 | Local model gateway | `scripts/test/upl-a12-local-model-gateway.test.mjs` | 부분 확인됨 | model run receipt without production claim |
| 5 | Vault object storage | `apps/api/src/vault-dms-runtime-context.js` | 확인됨 | fixed STORE_PATH restart after Stage 4 |
| 6 | AWS temporary desktop/lambda | `apps/api/src/matter-temp-desktop-runtime-lambda.mjs` | 부분 확인됨 | external smoke/operator receipt |
| 7 | SSO/OIDC | `09-plan-306090.md` P3-01 | 구현 없음 | adapter implementation and login sample |
| 8 | SAML | `00-charter.md` 축 B target | 구현 없음 | enterprise identity provider proof |
| 9 | SCIM | `09-plan-306090.md` P4-01 | 구현 없음 | provisioning/deprovisioning sample |
| 10 | Seat billing/commercial | `packages/commercial/`, `09-plan-306090.md` | 구현되어 있으나 운영 부적합 | seat ledger + billing flow proof |
| 11 | Managed DB | `09-plan-306090.md` P3-05 | 구현 없음 | migration plan + durable DB proof |
| 12 | OneDrive | docs/manual references only | 미확인 | provider connector receipt |
| 13 | Google Drive | no runtime evidence in enterprise audit scope | 구현 없음 | connector requirement decision |
| 14 | Slack/Teams | Salesforce parity plan mentions optional provider boundary | 구현 없음 | provider boundary + owner decision |
| 15 | DocuSign/e-sign | no runtime evidence in enterprise audit scope | 구현 없음 | requirement decision and provider proof |
| 16 | Stripe/Toss payments | packages exist for payments/commercial, no provider proof | 구현되어 있으나 운영 부적합 | sandbox charge/ledger receipt if in scope |
| 17 | Observability provider | `09-plan-306090.md` P3-04 | 구현 없음 | logs/health/error budget dashboard |
| 18 | Security/compliance evidence system | `packages/enterprise/`, enterprise readiness API | 부분 확인됨 | SOC2/ISO control owner/evidence map |

## 2. Provider boundary rule

| Rule | Applies to |
|---|---|
| No credential material in workbook | All external integrations |
| No provider success without external receipt | Outlook/M365, Popbill, AWS, payment, observability |
| No production/go-live/trust claim | SSO/SCIM/SOC2/managed DB lanes |
| Provider-blocked is valid if explicit | Slack/Teams, Data Cloud, email send, Popbill issue |

## 3. M 판정

M is now explicit for 18 integrations. The only `확인됨` row remains local Vault object storage behavior already proven by W7; external provider rows stay `부분 확인됨`, `미확인`, `구현 없음`, or `구현되어 있으나 운영 부적합` until external receipts exist.
