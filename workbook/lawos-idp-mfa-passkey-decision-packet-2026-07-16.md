# Law Firm OS IdP, MFA, and passkey decision packet

- Prepared: 2026-07-16 KST
- Scope: `RS-IDN-009`, external identity-provider and credential-transition boundary
- External dependency: `EXT-IDP`
- Current external decision state: `PENDING_HUMAN_APPROVAL`
- Provider selected or configured: `false`
- Production authentication cutover authorized: `false`
- Release, deployment, production migration, cutover, and go-live authorized: `false`

## What the source foundation establishes

The source work may establish `IDENTITY_LEDGER_SOURCE_VERIFIED` only after its exact-SHA evidence passes. That claim is limited to:

1. a tenant-scoped PostgreSQL identity ledger for account state, credential revision, active session JTI, expiring password-reset and step-up challenges, break-glass workflow, and append-only security audit;
2. concurrent failed-login accounting and durable account locking without threshold skips;
3. current-account and active-JTI checks that support cross-process session revocation;
4. idempotent server logout that commits revocation before responding, plus desktop logout that always clears local session material and reports server-revocation failure without returning secrets;
5. one-time, expiring, revocable, hash-only challenge state shared by password reset and step-up flows; and
6. a provider-neutral step-up interface and an explicit local/internal test adapter with no operational default proof or default-secret fallback.

It does not establish that an external IdP, MFA service, passkey relying party, directory, or production credential transition has been selected, configured, contracted, tested, deployed, or cut over.

## Current authority boundary

| Surface | Current authority state | Permitted claim |
| --- | --- | --- |
| Existing operational authentication | Existing approved runtime path | No external-provider change |
| PostgreSQL identity ledger | Disposable local source foundation only | Source and synthetic contract verification |
| Provider-neutral step-up interface | Interface and explicit local/internal adapter | Adapter contract verification only |
| External IdP, MFA, or passkey provider | Not selected or configured | None |
| Production user directory and credential migration | Not authorized | None |
| Real tenant, employee, client, or credential data | Not authorized | None |

## Decisions required before provider configuration

| Decision | Required owner | Required receipt content | Current state |
| --- | --- | --- | --- |
| Provider and tenant | product/security/procurement owners | provider, tenant/account reference, service tier, support and exit terms | pending |
| Protocol and trust model | security/identity owner | OIDC or SAML profile, issuer, audience, redirect origins, signing/encryption algorithms, key rotation | pending |
| Stable identity mapping | product/data/identity owners | immutable subject key, tenant mapping, email-change handling, duplicate and merge policy | pending |
| Directory lifecycle | HR/security/identity owners | SCIM or JIT policy, joiner/mover/leaver authority, disable latency, reconciliation owner | pending |
| MFA factor policy | security/legal owners | required cohorts, approved factors, enrollment, replacement, risk exceptions, fallback prohibition | pending |
| Passkey policy | security/product owners | relying-party ID and origins, attestation policy, discoverable credential policy, sync allowance, device-loss handling | pending |
| Privileged and break-glass access | security/operations owners | phishing-resistant factor requirement, segregated emergency identities, approval, expiry, monitoring, revoke procedure | pending |
| Account recovery | security/support/legal owners | proofing standard, dual control, delay, notification, appeal, fraud and abuse handling | pending |
| Password and credential transition | security/product/operations owners | eligible cohort, forced-reset policy, legacy verifier retirement, first-login flow, rollback cutoff | pending |
| Session and revocation policy | security/product owners | session lifetime, refresh policy, provider and local JTI revocation propagation, incident SLA | pending |
| Region and data handling | legal/privacy/security owners | processing region, residency basis, DPA, subprocessors, telemetry and diagnostic-data limits | pending |
| Audit and retention | legal/security/operations owners | event set, export destination, access control, retention, legal hold, deletion and incident review | pending |
| Availability and outage behavior | product/security/operations owners | fail-closed behavior, outage communication, recovery objective, prohibited local-password fallback | pending |
| Rollout and rollback | product/security/operations owners | cohorts, staging window, success/abort thresholds, operator, observer, rollback owner and cutoff | pending |

## Non-negotiable acceptance conditions

Any later provider implementation or configuration must prove all of the following before it may request production cutover approval:

- No password, reset token, session token, MFA proof, passkey assertion, private key, client secret, or reusable provider credential appears in logs, receipts, telemetry, error responses, or audit metadata.
- Every accepted provider assertion is signature-validated and bound to the approved issuer, audience, tenant, redirect origin, nonce/state, time window, and stable subject mapping.
- Application authorization still verifies the current account state, credential revision, and active local session JTI; provider success alone does not authorize a disabled, locked, revoked, or tenant-mismatched account.
- Administrative and break-glass access uses an approved phishing-resistant factor and cannot rely on silent password-only or shared-secret fallback.
- Password reset, factor replacement, passkey recovery, and account recovery use the approved proofing and dual-control rules, expire, are one-time, and remain auditable without storing proof material.
- Joiner, mover, leaver, suspension, reactivation, and tenant transfer events have deterministic ownership, reconciliation, and revocation behavior.
- Provider unavailability fails closed for new authentication unless an explicitly approved emergency procedure is invoked; it never silently returns authority to local passwords.
- Security audit records actions and result categories without raw administrative reasons, user-entered proof, tokens, or secrets.
- Cross-tenant subject collision, email reuse, account merge, replay, stale key, revoked factor, copied assertion, and clock-skew negative tests all fail safely.

## Future transition sequence after approval

Each stage requires its own exact-SHA receipt and does not authorize the next stage automatically.

1. Validate the decision receipt and exact source SHA without contacting or mutating a provider tenant.
2. Configure an approved isolated sandbox using synthetic identities only; preserve provider, tenant, region, key-authority, and configuration references without secrets.
3. Prove issuer/audience/tenant/subject mapping, key rotation, replay denial, revocation, recovery, audit export, and provider-outage behavior with synthetic identities.
4. Rehearse provider assertions in a non-authoritative shadow path. Shadow success must not create a production session or alter the current authority.
5. Run a separately approved bounded staging cohort with synthetic or specifically authorized non-production accounts.
6. Rehearse credential and factor transition, legacy-verifier retirement, rollback cutoff, and account-recovery procedures in staging.
7. Obtain an owner go/no-go receipt that names the exact source/configuration versions, cohort, window, success and abort thresholds, operators, and incident channel.
8. Request a distinct production-cutover authorization. No sandbox, shadow, staging, or source-verification receipt authorizes production authentication.

## Rollback and forward-repair boundary

- Before any external assertion has created an authoritative production session, rollback is configuration disablement or source rollback under the approved change record.
- After external authentication has been accepted for production authority, the system must not silently fall back to local password verification or an internal test adapter.
- After that cutoff, immediate containment is provider-side and local-JTI revocation, account disablement, cohort pause, or fail-closed service isolation under the approved incident procedure.
- Credential, subject-mapping, or lifecycle events already committed after the cutoff require audited forward repair or a separately approved data rollback. They must not be erased to make evidence appear clean.
- Lost provider keys, stale metadata, mapping ambiguity, incomplete audit export, or inability to revoke all active sessions is a stop condition, not a reason to bypass verification.

## Required approval receipt

`EXT-IDP` is complete only when one immutable owner-approved receipt identifies all of the following:

- the approved values for every decision row above;
- provider, tenant/account, environment, and region references without secret values;
- the protocol, issuer, audience, relying-party ID/origins, stable-subject mapping, and directory-lifecycle policy;
- approved MFA, passkey, privileged-access, recovery, session, and revocation policies;
- DPA, subprocessor, residency, telemetry, audit-export, retention, and legal-hold decisions;
- the exact source SHA and immutable configuration version approved for the next bounded stage;
- the authorized environment, identity cohort, execution window, and action;
- named operator, observer, security approver, rollback owner, support owner, and incident channel;
- success, abort, first-authoritative-session, and rollback cutoffs; and
- an explicit statement that the receipt authorizes only sandbox setup, synthetic validation, shadow rehearsal, staging cohort, or production cutover.

## Stop rules

Stop without provider mutation or authority change if the receipt is incomplete, the source/configuration version differs, the target tenant or region is ambiguous, a secret would enter a log or receipt, issuer/audience/tenant/subject validation is incomplete, privileged access lacks an approved phishing-resistant factor, account recovery is weaker than the approved policy, provider outage causes local-password fallback, audit export or revocation cannot be proven, real data appears without separate authority, or rollback ownership and cutoffs are unclear.

No failure permits enabling the local/internal test adapter in an operational environment. No source claim permits release, tag, AWS deployment, provider-tenant mutation, directory sync, production credential import, production migration, authentication cutover, or go-live.

## Evidence required from a later execution packet

The later bounded execution packet must preserve, at minimum:

1. exact source and configuration identifiers;
2. sanitized provider metadata and signing-key rotation evidence;
3. positive and negative protocol-validation results;
4. tenant and stable-subject mapping reconciliation totals;
5. factor enrollment, replacement, recovery, revoke, and passkey-origin test results;
6. cross-process local-JTI revocation and provider-session revocation results;
7. joiner/mover/leaver and directory-drift reconciliation results;
8. audit-export completeness and secret-scanning results;
9. provider-outage, stale-key, clock-skew, replay, and rollback rehearsals; and
10. approval, operator, incident, first-authoritative-session, and terminal-state receipts.

## Approval slots

| Receipt field | Value |
| --- | --- |
| `EXT-IDP` receipt reference | `PENDING` |
| Provider / tenant / region | `PENDING` |
| Protocol / issuer / audience | `PENDING` |
| Stable-subject and tenant mapping | `PENDING` |
| Directory lifecycle policy | `PENDING` |
| MFA and passkey policy | `PENDING` |
| Recovery and privileged-access policy | `PENDING` |
| Session and revocation policy | `PENDING` |
| Privacy / DPA / telemetry decision | `PENDING` |
| Audit export / retention / legal hold | `PENDING` |
| Approved source SHA / configuration version | `PENDING` |
| Authorized stage / environment / cohort | `PENDING` |
| Operator / observer / rollback / support owners | `PENDING` |
| Success / abort / rollback cutoffs | `PENDING` |
| Approved by | `PENDING` |
| Approved at | `PENDING` |

Until every required field and linked decision is complete, only local source implementation, disposable synthetic PostgreSQL verification, and the explicit local/internal adapter tests are authorized. `EXT-IDP` remains pending.
