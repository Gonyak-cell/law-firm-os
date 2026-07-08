# Store Env Catalog

Generated for enterprise audit remediation v3, C4/C8.

## Runtime Store Paths

| Env | Context | required-for-operational | Notes |
| --- | --- | --- | --- |
| LAWOS_HRX_STORE_PATH | hrx | yes | Absolute durable JSON store path. |
| LAWOS_MASTER_DATA_STORE_PATH | master-data | yes | Absolute durable JSON store path. |
| LAWOS_MATTER_STORE_PATH | matter | yes | Absolute durable JSON store path. |
| LAWOS_DMS_STORE_PATH | vault-dms | yes | Absolute durable JSON store path. |
| LAWOS_CRM_STORE_PATH | crm | yes | Absolute durable JSON store path. |
| LAWOS_INTAKE_STORE_PATH | intake | yes | Absolute durable JSON store path. |
| LAWOS_CRM_MASTER_DATA_STORE_PATH | crm-master-data | yes | Absolute durable JSON store path. |
| LAWOS_FINANCE_STORE_PATH | finance | yes | Absolute durable JSON store path. |
| LAWOS_ANALYTICS_STORE_PATH | analytics | yes | Absolute durable JSON store path. |
| LAWOS_AI_STORE_PATH | ai-governance | yes | Absolute durable JSON store path. |
| LAWOS_PORTAL_STORE_PATH | client-portal | yes | Absolute durable JSON store path. |
| LAWOS_UI_READINESS_STORE_PATH | ui-readiness | yes | Absolute durable JSON store path. |
| LAWOS_ENTERPRISE_READINESS_STORE_PATH | enterprise-readiness | yes | Absolute durable JSON store path. |
| LAWOS_AUDIT_STORE_PATH | api-security-audit | yes | Absolute durable NDJSON append/read store path for admin security audit events. |
| LAWOS_AUTH_CREDENTIAL_STORE_PATH | api-auth-credentials | yes | Absolute durable JSON credential store path for `lawos-internal-password-provider-v1`; receipts must stay hash/count-only. |
| LAWOS_AUTH_PASSWORD_RESET_STORE_PATH | api-auth-password-reset | yes | Absolute durable JSON password reset token store path; stores token hashes only, never token values or reset URLs. |
| LAWOS_DMS_OBJECT_STORE_PATH | vault-dms | derived | Optional explicit object-byte root. Defaults to `LAWOS_DMS_STORE_PATH + ".objects"` when omitted. |

Operational profile refuses to listen when a required store path is missing, relative, or under `os.tmpdir()`. `startApiServer` treats function parameters and env vars as equivalent, so packaged desktop userData paths satisfy the preflight without env mutation.

## Session And Step-Up

| Env | required-for-operational | Notes |
| --- | --- | --- |
| LAWOS_RUNTIME_PROFILE | yes | `operational` or `local-dev`; aliases `dev`, `test`, and `desktop` resolve to `local-dev`. |
| LAWOS_API_SESSION_SECRET | yes | At least 32 characters in `operational`; local-dev uses a per-instance random secret when omitted. |
| LAWOS_API_SESSION_SECRET_SECRET_ID | lambda | Secrets Manager secret id used by Lambda runtime bootstrap to fetch `LAWOS_API_SESSION_SECRET` without committing or logging the value. |
| LAWOS_API_SESSION_TTL_MS | tunable | Signed API session TTL. |
| LAWOS_API_MAX_FAILED_LOGINS | tunable | Login lock threshold. |
| LAWOS_API_LOGIN_LOCK_MS | tunable | Login lock duration. |
| LAWOS_AUTH_PASSWORD_RESET_TTL_MS | tunable | Email reset token TTL. |
| LAWOS_AUTH_PASSWORD_RESET_MIN_LENGTH | tunable | Minimum accepted password length for reset confirmation. |
| LAWOS_HRX_STEP_UP_SECRET | conditional | Required for coordinated operational HRX step-up issuance. |
| LAWOS_HRX_STEP_UP_TOTP_SECRET | conditional | Required for coordinated operational HRX step-up TOTP checks. |
| LAWOS_HRX_STEP_UP_TTL_MS | tunable | Step-up token TTL. |

## Bridge, Network, And CORS

| Env | required-for-operational | Notes |
| --- | --- | --- |
| LAWOS_VAULT_BRIDGE_TOKEN | conditional | Dedicated Matter-Vault bridge token; never use `Authorization` for the bridge. |
| LAWOS_VAULT_BRIDGE_TOKEN_AUTO_FETCH | optional | Operator helper flag for bridge token retrieval. |
| LAWOS_VAULT_BRIDGE_TOKEN_AWS_PROFILE | optional | AWS profile for bridge token retrieval. |
| LAWOS_VAULT_BRIDGE_TOKEN_SSO_LOGIN_PROFILE | optional | AWS SSO profile for bridge token retrieval. |
| LAWOS_API_PORT | tunable | API listener port. |
| LAWOS_API_ALLOWED_ORIGINS | tunable | CORS allowlist. |
| LAWOS_WEB_API_PROXY_TARGET | dev/proxy | Web dev proxy target. |

## Backup And Desktop Runtime

| Env | required-for-operational | Notes |
| --- | --- | --- |
| MATTER_VAULT_BACKUP_ROOT | yes-for-backup | Backup drill root for runtime stores and DMS object bytes. |
| MATTER_DESKTOP_RUNTIME_STORE_DIR | desktop | Desktop runtime store root. |
| MATTER_DESKTOP_LOCAL_API_DISABLED | desktop | Disable embedded local API. |
| MATTER_DESKTOP_API_BASE_URL | desktop | External API endpoint when local API is disabled. |
| MATTER_DESKTOP_RENDERER_URL | desktop | Renderer URL override. |
| MATTER_DESKTOP_ENV_FILE | desktop | Desktop env file. |
| MATTER_DESKTOP_RELEASE_CHANNEL | desktop | Desktop release channel metadata. |

## Model Gateway

| Env | required-for-operational | Notes |
| --- | --- | --- |
| LAWOS_MODEL_GATEWAY_PROVIDER | optional | Local/model gateway provider selector. |
| LAWOS_MODEL_GATEWAY_MODEL | optional | Model name. |
| LAWOS_MODEL_GATEWAY_NUM_PREDICT | optional | Generation budget. |
| LAWOS_OLLAMA_URL | optional | Ollama endpoint. |
| LAWOS_OLLAMA_MODEL | optional | Ollama model. |

## Cloud And Lambda Deploy Only

These are not required for local operational preflight, but are required by their deployment lanes: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_PROFILE`, `AWS_REGION`, `LAWOS_AWS_REGION`, `LAWOS_API_LAMBDA_FUNCTION_NAME`, `OPERATOR_TOKEN_SHA256`, `AUTH_STATE_SECRET_NAME`, `MATTER_DESKTOP_AUTH_STATE_SECRET_NAME`, `LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY`, `LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM`, `LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM_NAME`, `LAWOS_AUTH_PASSWORD_RESET_EMAIL_REPLY_TO`, `LAWOS_AUTH_PASSWORD_RESET_EMAIL_REGION`, `LAWOS_AUTH_PASSWORD_RESET_BASE_URL`, `MATTER_PASSWORD_RESET_BASE_URL`, `MATTER_PASSWORD_RESET_SECRET`, `MATTER_PASSWORD_RESET_TTL_MS`, `MATTER_DESKTOP_PASSWORD_RESET_BASE_URL`, `MATTER_DESKTOP_PASSWORD_RESET_SECRET`, and `MATTER_DESKTOP_PASSWORD_RESET_TTL_MS`.

## Dev, QA, And Proof Only

아래 값은 검증 스크립트가 읽는 입력이다. 운영 preflight 필수값은 아니다.

`MATTER_UI_URL`, `LAWOS_API_BASE_URL`, `LAWOS_API_URL`, `LAWOS_API_HEALTH_URL`, `LAWOS_PRODUCTION_BASE_URL`, `MATTER_VAULT_R4_PRODUCTION_BASE_URL`, `LCX_PPL_API_BASE_URL`, `LCX_PPL_UI_URL`, `KO_SAAS_UI_URL`, `UPL_C09_RECEIPT_PATH`, `UPL_C09_OUTLOOK_BASE_URL`, `UPL_C09_OUTLOOK_TENANT_ID`, `UPL_C09_OUTLOOK_CLIENT_ID`, `LAWOS_HRX_PRODUCTION_SMOKE_RECEIPT_PATH`, `LAWOS_HRX_PRODUCTION_BASE_URL`, `LAWOS_HRX_PRODUCTION_TENANT_ID`, `LAWOS_HRX_EXPECTED_TENANT_ID`, `LAWOS_HRX_EXPECTED_ACTOR_ID`, `LCX8_VERIFICATION_SUMMARY`, `CMP_R4_SOURCE_DIR`, `MATTER_DESKTOP_SCREEN_QA_TARGET`, `MATTER_DESKTOP_QA_EMAIL`, `LAWOS_UI_ARCHIVE_DIR`, `LAWOS_PROGRESS_PORT`, `LAWOS_DEPLOYMENT_COMMIT`, `LAWOS_CURRENT_MATTER_CODE_TENANT`, `TZ`.
