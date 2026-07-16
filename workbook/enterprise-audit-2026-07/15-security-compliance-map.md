# Security Compliance Map

이 파일은 A~U 프레임워크 L과 G-3~G-5를 보완한다. 세부 취약점 exploit 절차나 secret 값은 기록하지 않는다.

## 1. Current high-risk findings

| Finding | Existing evidence | Framework mapping | 현재 판정 | Remediation |
|---|---|---|---|---|
| Hardcoded default session secret | `06-security-summary.md`, `remediation-v3-spec.md` Stage 3 | ASVS V3, SSDF PW, SOC2 CC6 | 구현되어 있으나 운영 부적합 | R Stage 3 |
| Synthetic token login | `08-report.md` critical defect #4 | ASVS V2/V3, SOC2 CC6 | 구현되어 있으나 운영 부적합 | P3 OIDC/SSO |
| STORE_PATH defaults to tmpdir | `05-gaps.md`, `06-security-summary.md` | SSDF PO/PS, SOC2 CC7 | 구현되어 있으나 운영 부적합 | R Stage 4 |
| Matter opening validation block | `08-report.md` critical defect #1 | Product reliability, SOC2 CC7 | 구현되어 있으나 작동 불명 | R Stage 1 |
| Root/API test failures | `08-report.md` critical defect #2 | SSDF RV, SOC2 CC7 | 구현되어 있으나 작동 불명 | R Stage 2 |
| Rate limiting/CSRF/security headers unverified | `06-security-summary.md` | ASVS V5/V14, SOC2 CC6 | 미확인 | hardening stage after R Stage 2 |
| SSO/SCIM/SOC2 absent | `05-gaps.md`, `08-report.md` | SOC2 CC6/CC7, ISO A.5/A.8 | 구현 없음 | P3/P4 |
| External provider receipts missing | `08-report.md` | SSDF RV, SOC2 vendor controls | 미확인 | owner/provider receipts |

## 2. ASVS mapping

| ASVS area | Current evidence | Gap |
|---|---|---|
| V1 Architecture | Runtime contexts and route families exist | Enterprise target architecture not production approved |
| V2 Authentication | Signed session and no-token 401 partially confirmed | Synthetic login and default secret block operations |
| V3 Session Management | `session-auth.js`, step-up token model | operating secret preflight missing |
| V4 Access Control | Tenant/permission tests exist | Full endpoint replay and HRX security green missing |
| V5 Validation | safe errors and route tests exist | Matter opening validation currently blocks core flow |
| V8 Data Protection | Vault projection avoids raw paths in tests | managed DB and storage preflight missing |
| V10 Malicious Code | Not assessed in W7 | 미확인 |
| V11 Business Logic | Matter/Portal/Finance workflows partially tested | core Matter and Portal not green |
| V14 Configuration | CORS headers present; env matrix incomplete | rate limiting/CSRF/security headers unverified |

## 3. SSDF mapping

| SSDF practice | Current evidence | Gap |
|---|---|---|
| PO: Prepare organization | Charter and remediation plan exist | owner approval/production readiness not granted |
| PS: Protect software | synthetic-only and production_ready false rules exist | secrets/env preflight not complete |
| PW: Produce well-secured software | route tests and package tests exist | red root/API tests block confidence |
| RV: Respond to vulnerabilities | remediation v3 exists | fixes not yet committed after audit |

## 4. SOC2/ISO readiness map

| Control theme | Current evidence | Gap |
|---|---|---|
| Access control | signed session, permission tests, HRX step-up | SSO/SCIM/MFA enterprise model absent |
| Change management | git history and workbook evidence | no post-audit remediation commit yet |
| Availability/DR | backup drill tests exist | fixed STORE_PATH/env catalog/drill receipt missing |
| Confidentiality | Vault redaction and no raw storage field tests | external provider and managed DB not proven |
| Monitoring | some health/readiness endpoints | observability baseline missing |
| Vendor management | provider-gated receipts | external receipts missing |

## 5. G-3/G-4/G-5 operational checklist

| Area | 20항 전수표 상태 | Current aggregate |
|---|---|---|
| G-3 운영 | 미작성 전수표를 이 map으로 seed | 구현되어 있으나 운영 부적합 |
| G-4 신뢰성 | root/API fail and restart evidence split | 구현되어 있으나 작동 불명 |
| G-5 제품화 | SSO/SCIM/billing/SOC2 absent | 구현되어 있으나 운영 부적합 |

## 6. L 판정

L mapping is now present at framework level. It is not a security sign-off. Rate limiting, CSRF, and security headers remain `미확인` until a focused hardening pass performs direct middleware/header checks and records results without leaking sensitive implementation details.
