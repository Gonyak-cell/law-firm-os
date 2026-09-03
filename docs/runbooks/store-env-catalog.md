# Store Env Catalog

Generated for enterprise audit remediation v3, C4/C8.

## Local Development File Stores

| Env | Context | local-dev/file-current | Notes |
| --- | --- | --- | --- |
| LAWOS_HRX_STORE_PATH | hrx | yes | Local-development durable JSON store path. |
| LAWOS_MASTER_DATA_STORE_PATH | master-data | yes | Local-development durable JSON store path. |
| LAWOS_MATTER_STORE_PATH | matter | yes | Local-development durable JSON store path. |
| LAWOS_DMS_STORE_PATH | vault-dms | yes | Local-development durable JSON metadata path. |
| LAWOS_CRM_STORE_PATH | crm | yes | Local-development durable JSON store path. |
| LAWOS_INTAKE_STORE_PATH | intake | yes | Local-development durable JSON store path. |
| LAWOS_CRM_MASTER_DATA_STORE_PATH | crm-master-data | yes | Local-development durable JSON store path. |
| LAWOS_FINANCE_STORE_PATH | finance | yes | Local-development durable JSON store path. |
| LAWOS_ANALYTICS_STORE_PATH | analytics | yes | Local-development durable JSON store path. |
| LAWOS_AI_STORE_PATH | ai-governance | yes | Local-development durable JSON store path. |
| LAWOS_PORTAL_STORE_PATH | client-portal | yes | Local-development durable JSON store path. |
| LAWOS_UI_READINESS_STORE_PATH | ui-readiness | yes | Local-development durable JSON store path. |
| LAWOS_ENTERPRISE_READINESS_STORE_PATH | enterprise-readiness | yes | Local-development durable JSON store path. |
| LAWOS_AUDIT_STORE_PATH | api-security-audit | yes | Local-development NDJSON audit path. |
| LAWOS_AUTH_CREDENTIAL_STORE_PATH | api-auth-credentials | yes | Legacy local-development credential path; disabled in operational. |
| LAWOS_AUTH_PASSWORD_RESET_STORE_PATH | api-auth-password-reset | yes | Legacy local-development reset-token path; disabled in operational. |
| LAWOS_OBJECT_ACL_STORE_PATH | api-auth-object-acl | yes | Canonical local-development `ObjectAcl` trust-store path used by signed-session authorization. |
| LAWOS_DMS_OBJECT_STORE_PATH | vault-dms | derived | Optional explicit object-byte root. Defaults to `LAWOS_DMS_STORE_PATH + ".objects"` when omitted. |

These paths are never an operational authority. `LAWOS_RUNTIME_PROFILE=operational` requires `postgres-v2` and rejects `file-current`, including explicit file paths. PostgreSQL initialization failure is fail-closed and does not fall back to these files.

Bare `node apps/api/src/server.js`, `npm run api:start`, desktop development, and isolated packaged QA may use `local-dev` with `~/Library/Application Support/LawFirmOS/runtime-stores/`. Formal desktop packages disable the embedded local API by default; operational clients must use the externally configured PostgreSQL-backed API.

## Operational PostgreSQL Authority

| Env | Required | Notes |
| --- | --- | --- |
| LAWOS_PERSISTENCE_AUTHORITY | yes | Must resolve to `postgres-v2`; `file-current` is rejected. |
| LAWOS_POSTGRES_URL_SECRET_ID | yes | AWS Secrets Manager reference for the PostgreSQL URL. Direct operational URL material is rejected. |
| LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID | yes | Secret reference used to authenticate tenant RLS context. |
| LAWOS_POSTGRES_SSL_MODE | yes | `verify-full` in operational. |
| LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID | yes | Secret reference for payroll artifact encryption material. |

All operational domains use the PostgreSQL RepositoryPortV2 path with transaction, tenant RLS, optimistic version, idempotency, audit, and outbox capabilities. JSON fallback, dual-write, offline mutation, and legacy JSON maintenance writers are disabled.

Signed-session object ACLs use tenant-RLS records in the PostgreSQL
`authz` domain with record type `ObjectAcl`. An authoritative empty result is
valid; query failure or tenant mismatch makes fixed Client reports unavailable
instead of falling back to caller headers or local files.

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
| LAWOS_AMIC_VAULT_EGRESS_BROKER_ENABLED | conditional | Routes Hosted Vault provider HTTP through the private Lambda interface endpoint when the API subnets have no public egress. |
| LAWOS_AMIC_VAULT_PROVIDER_ORIGIN | broker | Exact HTTPS Hosted Vault origin constructed by the egress broker; callers cannot override it. |
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

## Local Development Durability

- Durable home: `~/Library/Application Support/LawFirmOS/runtime-stores/`.
- RPO decision: write-immediate local durability plus S3 upload queue target (`RPO≈0`), owner-approved 2026-07-09.
- RTO decision: single-command restore rehearsal target `<=30 minutes`, owner-approved 2026-07-09.
- These files are local-development compatibility data only and are not an operational source of truth.
- Local generations: JSON store writes keep pre-write snapshots under `~/lawos-backups/data/<store-file>/`, with recent 200 generations retained locally; S3 retention remains indefinite after Stage 3 bucket policy is active.
