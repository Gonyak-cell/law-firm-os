# CTI S2 AUTHENTICATION Unblock Packet

Status: `I7_OWNER_APPROVAL_RECORDED`

Goal: `cti-s2-authentication-unblock-packet`

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md` Stage 2

Input closeout: `docs/goal-closeout/cti-s1-foundation-execute/`

Input blocker: `BLOCKED_S1_G_AUTHENTICATED_PROBE_REQUIRES_S2_OR_APPROVED_PROBE_PRINCIPAL`

Required approval ref: `I7-CTI-S2-AUTHENTICATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06`

This packet fixes the S2 pre-execute decisions only. It does not implement S2, mutate production, issue or distribute passwords, perform S3 tenant migration, run CUTOVER, implement OIDC, convert DB storage, or claim production_ready/go-live.

## Authority Boundary

| Boundary | State |
| --- | --- |
| S2 code implementation | not executed |
| Lambda configuration mutation | not executed |
| Production credential store write | not executed |
| Password generation, issuance, or distribution | not executed |
| S1-G authenticated production probe | not executed |
| S3 tenant migration | out of scope |
| CUTOVER | out of scope |
| OIDC implementation | out of scope |
| DB conversion | out of scope |
| Production-ready or go-live claim | false |

## Owner Approval Unit

| Field | Value |
| --- | --- |
| approval_ref | `I7-CTI-S2-AUTHENTICATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06` |
| approver_role | Owner / Managing Partner |
| approval_scope | S2 AUTHENTICATION unblock choices only |
| approval_does_not_authorize | S2 implementation, production mutation, password issuance/distribution, S3 migration, CUTOVER, OIDC implementation, DB conversion, production_ready, go-live |
| required_before | Any S2 execute goal, production auth code deployment, credential store write, or S1-G authenticated production probe |
| signature_status | recorded |
| approval_signature_ref | `I7-CTI-S2-AUTHENTICATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06` |
| approval_receipt | `docs/launch/cti-i7-owner-approval-receipt-2026-07-06.md` |
| conditional_probe_approval_ref | `I8-CTI-S2-S1G-AUTHENTICATED-PROBE-OWNER-APPROVAL-2026-07-06` |
| conditional_probe_approval_status | recorded, effective only after S2 AUTHENTICATION execute PASS |
| conditional_probe_approval_receipt | `docs/launch/cti-i8-owner-approval-receipt-2026-07-06.md` |
| s2_execute_approval_ref | `I9-CTI-S2-AUTHENTICATION-EXECUTE-OWNER-APPROVAL-2026-07-06` |
| s2_execute_approval_status | recorded; execution must occur in separate bounded S2 execute goal |
| s2_execute_approval_receipt | `docs/launch/cti-i9-owner-approval-receipt-2026-07-06.md` |

## Input From S1

S1 applied the durable runtime foundation and left one active blocker:

- EFS/AP/Lambda mount and STORE_PATH env are applied.
- `LAWOS_AUDIT_STORE_PATH` and `LAWOS_API_SESSION_SECRET_SECRET_ID` are applied.
- Production `/api/health` returns 200 operational.
- Operational synthetic login returns 403 `AUTH_SYNTHETIC_LOGIN_DISABLED`.
- Unauthenticated security audit returns 401 `AUTH_SESSION_REQUIRED`.
- S1-G authenticated marker/audit/readback cannot be completed without a real production principal or an owner-approved probe principal.

## Selected Auth Provider Choice

| Item | Selected Value |
| --- | --- |
| provider_id | `lawos-internal-password-provider-v1` |
| implementation class | credential-store-backed internal password provider |
| hash algorithm | Node `crypto.scrypt` first, with argon2id reserved for a later dependency-approved upgrade |
| credential store env | `LAWOS_AUTH_CREDENTIAL_STORE_PATH=/mnt/lawos/auth/credential-store.json` |
| credential store schema | `law-firm-os.auth-credential-store.v0.1` |
| record key | `user_id` |
| allowed account source | existing Matter account registry only; no new real user creation in S2 execute |
| states | `must_change`, `active`, `locked`, `disabled` |
| secrets in receipts | none; receipts may include counts, user ids, status counts, hash algorithm names, and SHA256 digests only |
| local-dev behavior | synthetic local-dev provider remains allowed only when `LAWOS_RUNTIME_PROFILE=local-dev` |
| operational behavior | synthetic token login remains denied; operational login requires credential-store provider |
| OIDC | design-only parallel track; not an S2 execute dependency and not implemented by this packet |

Rationale: the repo already has Node crypto primitives and desktop password/reset surfaces. Adding a native argon2id dependency inside this unblock packet would widen the deployment risk. The selected S2A provider uses `scrypt` now and keeps a later argon2id adapter behind the same credential store schema.

## Login And verifyToken Cut Path

| Surface | Current State | S2 Execute Choice |
| --- | --- | --- |
| `POST /api/auth/login` | operational returns 403 because synthetic login is disabled | replace operational branch with `lawos-internal-password-provider-v1` lookup and password verification |
| `GET /api/auth/session` | verifies signed session token | preserve endpoint, but ensure principal derives from signed session payload + role registry + credential status, not synthetic token |
| `verifyToken` | S1 already removed provider-null 401 by using `principalFromSignedSession` when provider is null | harden with credential-store `session_version` or `credential_rev` check for disable/reset/session revocation |
| `/api/desktop/login` | desktop runtime expects email/password | route to the same credential-store provider and return the same safe session envelope |
| `/api/desktop/password-reset/*` | desktop runtime already has reset request/confirm surfaces | bind reset tokens to credential store, `must_change`, expiry, one-time use, and safe email/deep-link receipts |

Required S2 execute tests:

1. operational `/api/auth/login` accepts a credential-store test user and returns a signed session.
2. operational `/api/auth/login` rejects synthetic token credentials with `AUTH_SYNTHETIC_LOGIN_DISABLED`.
3. `verifyToken` accepts signed sessions across cold starts with the S1 fixed secret.
4. `verifyToken` rejects expired sessions, disabled accounts, tenant mismatches, and revoked credential revisions.
5. protected business routes reject missing/non-session bearer tokens and forged permission headers.
6. `/api/desktop/login` and reset flow produce no token/password/secret material in renderer-safe payloads.

## Session Principal Model

| Field | Rule |
| --- | --- |
| `user_id` | from signed session payload, must exist in account registry and credential store |
| `tenant_id` | canonical registered tenant for S2; S3 tenant migration remains separate |
| `session_id` | signed in token payload; no synthetic token fallback |
| `credential_rev` | included in token payload or server-side revocation check; mismatch invalidates session |
| `assurance_level` | `password` after credential login; step-up remains separate HRX flow |
| role/scopes | resolved server-side from `lawos-role-registry.js`, not client supplied |
| tenant_ids expansion | server-owned and unchanged by user payload |
| source refs | account registry + credential store + role registry |

The session token must not contain password hashes, reset tokens, raw role policy documents, or credential material.

## Password Distribution Boundary

S2 execute may implement the credential store, login provider, reset flow, lockout, and tests. It may create synthetic/staging fixture credentials for automated tests. It must not issue or distribute production initial passwords to the 9 real users.

Production password generation and distribution remain cutover-bound:

- approval channel: I3 or later explicit owner approval.
- default channel: in-person distribution unless owner changes it.
- password generation: CSPRNG, at least 16 characters.
- storage: hash only; plaintext immediately discarded after handoff.
- status: `must_change` until first login changes the password.
- receipt: counts and recipient acknowledgment only; no plaintext password, reset token, or credential hash.

## Desktop Dependency

| Item | Required Boundary |
| --- | --- |
| target version | desktop `v0.1.10` |
| required capability | email/password login, must-change handling, password reset request/confirm, deep link route-only reset confirmation |
| existing client surface | `apps/desktop/src/main/aws-runtime.js` calls `/api/desktop/login` and `/api/desktop/password-reset/*` |
| packaging gate | package and smoke before CUTOVER; v0.1.9 must not be used for operational auth cutover |
| drift check | packaged seed/runtime drift diff must be 0 before release |
| non-claim | this packet does not build, sign, notarize, release, or distribute desktop binaries |

## S1-G Authenticated Probe Method

Selected method: no debug endpoint, no secret fetch, no direct token minting.

The first allowed S1-G authenticated production probe must use a real session obtained through the S2 credential provider:

1. S2 execute deploys provider and verifies operational login in a bounded test.
2. A separately approved probe principal or owner-approved existing admin principal obtains a real session through `/api/auth/login` or `/api/desktop/login`.
3. The probe writes a PII-safe marker through an existing protected route and writes/reads a security audit event through existing admin security routes.
4. The probe records only request ids, route names, item counts, event ids, and SHA256 hashes.
5. The probe compares S0-T04 snapshot hash with post-S2/S1 readback hash where the protected readback route is authenticated.

Conditional future approval for the production probe is recorded as `I8-CTI-S2-S1G-AUTHENTICATED-PROBE-OWNER-APPROVAL-2026-07-06` in `docs/launch/cti-i8-owner-approval-receipt-2026-07-06.md`.

I8 is effective only after I7 is recorded, S2 AUTHENTICATION execute PASS is recorded, and the probe uses a real production principal/session model. This packet and I8 receipt do not execute the probe, approve a debug endpoint, approve direct token minting, approve secret value lookup/output, approve a temporary backdoor principal, approve production migration/write, approve CUTOVER, or approve production_ready/go-live.

## S2 Execute Approval

S2 AUTHENTICATION execute approval is recorded as `I9-CTI-S2-AUTHENTICATION-EXECUTE-OWNER-APPROVAL-2026-07-06` in `docs/launch/cti-i9-owner-approval-receipt-2026-07-06.md`.

I9 authorizes a separate bounded `cti-s2-authentication-execute` goal for S2-T01/T02/T04/T06 implementation and verification, login provider implementation, verifyToken replacement, signed session/account registry/credential revision/role registry verification, desktop v0.1.10 password flow implementation and verification, local/staging/synthetic fixture tests, and S1-G authenticated probe only after I8 conditions are satisfied.

I9 does not itself execute implementation, mutate production, write a production credential store, issue or distribute real user passwords, run S3 tenant migration, inject S4 production accounts/permissions, run CUTOVER, implement OIDC, convert DB storage, or claim production_ready/go-live.

## Rollback And Abort Criteria

Abort S2 execute before production deployment if any of these are true:

- credential store path is not durable under `/mnt/lawos/auth/`.
- operational login still accepts synthetic tokens.
- `verifyToken` depends on `local_dev.synthetic_token`.
- signed sessions fail across a cold start with the S1 fixed secret.
- missing/non-session bearer tokens reach protected business routes.
- desktop v0.1.10 password flow is not testable.
- reset flow returns password, reset token, secret, or hash material to renderer payloads.
- S1-G probe is attempted before S2 AUTHENTICATION execute PASS or without the I8 conditions.

Rollback after failed S2 deployment:

1. Restore previous Lambda code/config deployment ref from the S1 execute receipt.
2. Disable S2 provider env wiring without deleting the EFS credential store.
3. Revoke any test/probe credential record by status change, not deletion.
4. Preserve audit and credential receipts as hash/count-only evidence.
5. Do not run production restore unless a separate rollback goal approves it.

## Approval Text To Use

```text
I7 승인합니다.

`docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md`의 S2 AUTHENTICATION unblock choices를 승인합니다.

approval_signature_ref: I7-CTI-S2-AUTHENTICATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06

승인 범위:
- auth provider choice: lawos-internal-password-provider-v1
- credential store path: LAWOS_AUTH_CREDENTIAL_STORE_PATH=/mnt/lawos/auth/credential-store.json
- hash algorithm: Node crypto.scrypt first, argon2id later upgrade reserved
- login cut path: operational /api/auth/login and /api/desktop/login use credential-store provider; local-dev synthetic provider remains local-dev only
- verifyToken cut path: signed session payload + account registry + credential status/revision + role registry; no synthetic token dependency in operational
- session principal model: packet §Session Principal Model
- desktop dependency: desktop v0.1.10 password/must_change/reset flow required before CUTOVER
- S1-G authenticated probe method: no debug endpoint, no secret fetch, real session only; I8 conditional approval recorded but effective only after S2 execute PASS
- rollback/abort criteria: packet §Rollback And Abort Criteria

명시적 비승인:
- S2 implementation
- production mutation
- password generation, issuance, or distribution
- S1-G production probe execution
- S3 tenant migration
- CUTOVER
- OIDC implementation
- DB conversion
- production_ready/go-live claim

이 승인은 S2 AUTHENTICATION execute goal을 열기 위한 unblock choice approval이며, 실제 코드 배포, credential store write, probe principal 사용, 비밀번호 배부, CUTOVER는 별도 승인 없이는 금지합니다.
```

## Packet Verdict

`I7_OWNER_APPROVAL_RECORDED`.

I7 is recorded for the S2 AUTHENTICATION unblock choices. I8 is conditionally recorded for the S1-G authenticated production probe, effective only after S2 AUTHENTICATION execute PASS with a real production principal/session model and no debug endpoint/direct token mint/secret value lookup. I9 is recorded for a separate bounded S2 AUTHENTICATION execute goal. This packet still does not execute S2 implementation, production auth code deployment, credential store write, S3 tenant migration, S4 account/permission injection, password issuance/distribution, S1-G authenticated production probe execution, CUTOVER, OIDC implementation, DB conversion, production_ready, or go-live.
