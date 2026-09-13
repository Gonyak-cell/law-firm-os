# Canonical person onboarding and profiles: local synthetic R&D

This branch implements a complete web flow for synthetic local testing. It is not production ready. The onboarding mutation is enabled only when the API uses the `local-dev` runtime profile with `file-current` persistence. Operational and PostgreSQL runtime requests fail closed with `ONBOARDING_LOCAL_SYNTHETIC_ONLY`.

## Web flow

An authorized security or tenant administrator opens **사용자 운영**, chooses **내부 구성원** or **외부 사용자**, fills the profile and role fields, and submits once. The browser keeps one idempotency key while an unchanged submission is retried.

The server owns the full command at `POST /api/admin/security/person-invitations`:

1. Validate the signed admin session, tenant, allowlisted fields, idempotency key, email, and role-specific input.
2. Reject an existing account, canonical Person email/account link, role link, or conflicting replay. Email is a collision check only; it never authorizes a Person merge or link.
3. Create exactly one Master Data Entity and Person linked by `Person.account_user_id` to the new account ID.
4. For an internal member, create an HRX Employee and EmploymentProfile with `person_id`, then create the EmployeeUserLink with the account `user_id`.
5. For an external user, create a Portal ExternalUser with explicit `person_id`, `user_id`, and `client_group_id`. The ClientGroup must be active in the same tenant. No Employee is created.
6. Read the Person and role link back, then create the local synthetic account invitation.
7. Record the safe audit and idempotency receipt. The setup URL is returned only by the first successful response.

`GET /api/admin/security/person-invitations` returns same-tenant active ClientGroups for the external-user selector. When the local synthetic tenant has none, server composition seeds one clearly labeled synthetic ClientGroup so the default fixture flow remains usable. It does not return invitation tokens or identity records.

External onboarding does not create an ExternalAcl, PortalProjection, Matter grant, secure link, or magic link. Its response and UI state `matter_access` as `denied_until_explicit_acl` and tell the administrator to grant a specific Matter separately.

## Setup invitation

The first local response contains a test-only URL in `invitation.setup_url`. The URL opens the existing login password form with an `invitation_token`. The form removes the token from the browser address bar and submits it to `POST /api/auth/invitations/accept` with a new password.

The existing password reset store hashes the token with SHA-256, sets its expiry, revokes superseded challenges, and consumes it once. The credential store hashes the password with the existing scrypt parameters. Acceptance activates the synthetic directory entry; the new email and password can then obtain an ordinary signed API session. Used, expired, forged, cross-tenant, or mismatched challenges fail closed. Audit events include only account IDs, role type, expiry, and credential revision; they never include token or password material.

The local invitation directory lives for the API process lifetime. Optional credential and challenge file stores do not make that directory operationally durable. A restart therefore ends this R&D invitation/account runtime. This limitation is part of the production gate below, rather than a hidden recovery claim.

## Ownership and profile behavior

| Owner | Authoritative fields |
| --- | --- |
| Identity Account | Login email, account and credential status, role IDs, scopes, sessions, setup challenge. |
| Master Data Person | Display/legal/English name, mobile, contact email, professional profile/bio, private photo metadata. |
| HRX Employee and EmploymentProfile | Employment lifecycle, type, title, organization and effective dates; linked to Person by `person_id`. Legacy common fields remain readable for records without a Person. |
| Portal ExternalUser | Client Portal account and ClientGroup extension, linked by `person_id` and `user_id`. Matter access remains a separate explicit ACL. |

New linked Employees do not copy the Person's name, email, mobile or professional profile into HRX. The legacy-required Employee `display_name` contains the non-personal sentinel `Canonical Person`; composed People reads replace it from the authoritative Person. Existing legacy common fields remain only for backward-compatible records.

The ordinary HRX Employee create/update API cannot assign or change `person_id`. Canonical links are created only by the integrated onboarding command. Repository composition also rejects a missing Person or an EmployeeUserLink whose account does not own the linked Person.

`GET/PATCH /api/profile/me` and `GET/PATCH /api/profile/users/:user_id` read and write the canonical Person. The onboarding Person is reused; profile saving cannot create a second Person. Self-service accepts only mobile/contact details and professional profile fields. Legal names, login email, employment, access, roles and scopes are server-rejected. Admin profile routes additionally allow canonical name fields but still reject identity, HR and portal access fields.

`PUT/GET /api/profile/me/photo` works for internal and external accounts through the Person photo namespace and existing secure object storage adapter. It accepts PNG only, at most 5 MiB. Signature, IHDR dimensions, tenant and subject IDs, MIME, byte size, SHA-256 and immutable version metadata are verified. Reads are private/no-store and nosniff. JSON and audit output omit raw object keys, paths and bytes. External photos never enter HRX.

Legacy Employees and ExternalUsers without `person_id` remain readable. Explicit mismatches, duplicate account/person role links, an external account with an Employee link, and cross-tenant targets fail closed.

## Idempotency and recovery

The Master Data idempotency receipt stores the normalized request fingerprint and safe linked IDs. It never stores the setup token. A same-key/same-payload replay returns the original safe result with `invitation.setup_url: null`; a changed payload returns `ONBOARDING_IDEMPOTENCY_CONFLICT`.

Each repository write uses its existing transaction. The orchestrator verifies readback before account provisioning. If a later stage fails, it compensates in reverse order: revoke the pending invitation, remove EmployeeUserLink/EmploymentProfile/Employee or ExternalUser and its subordinate idempotency receipt, then remove Person/Entity. Focused recovery tests inject identity provisioning failure and retry the same command successfully. This is a local compensation boundary, not a distributed production transaction claim.

Invitation acceptance also treats its security audit as mandatory. If that append fails after password hashing, the local runtime restores `invited` state, removes the new credential, and restores the same challenge for its remaining TTL. The account cannot log in until a retry completes with audit evidence.

## Production gate

Operational onboarding stays disabled until all of the following are reviewed and implemented together:

- provision the account and invitation through the PostgreSQL identity ledger/outbox, including durable tenant memberships and delivery receipts;
- make Master Data Person, HRX role extension, Portal ExternalUser and identity provisioning participate in one durable unit of work or a persisted, restart-safe saga with reconciliation;
- register and review `packages/hrx/src/migrations-pending/050_hrx_canonical_person_links.sql` in the cryptographically reviewed PostgreSQL migration catalog, add the corresponding Master Data/Portal durable link constraints, and validate upgrade/rollback behavior;
- add database uniqueness for one active Employee per Person/account and one active ExternalUser per Person/account, plus explicit legacy reconciliation;
- provide an operational invitation delivery channel and recovery policy without returning token material to ordinary API clients;
- run PostgreSQL, browser, accessibility, deployment-gate and operational security validation.

The pending HRX SQL is intentionally outside the active migration catalog. Registering it would change the reviewed production authority chain; this branch does not approve that production change.

## Verification commands

```sh
node --test apps/api/test/person-onboarding-service.test.js apps/api/test/session-auth-invitation.test.js apps/web/test/person-onboarding-ui.test.mjs
LAWOS_LOCAL_BACKUP_ROOT=/private/tmp/lawos-person-onboarding-test-backups node scripts/test/with-synthetic-runtime.mjs node --test apps/api/test/person-onboarding-api.test.js apps/api/test/person-profile-api.test.js
LAWOS_LOCAL_BACKUP_ROOT=/private/tmp/lawos-person-onboarding-test-backups node --test packages/master-data/test/model.test.js packages/master-data/test/repository.test.js packages/master-data/test/runtime-services.test.js packages/master-data/test/person-profile-service.test.js packages/master-data/test/person-photo-storage.test.js packages/hrx/test/schema.test.js packages/hrx/test/repository.test.js packages/hrx/test/repository-sql.test.js packages/hrx/test/migration.test.js packages/hrx/test/migration-fresh-db.test.js packages/hrx/test/migration-upgrade.test.js packages/client-portal/test/runtime-services.test.js apps/api/test/canonical-person-hrx.test.js apps/api/test/person-profile-context.test.js apps/web/test/profile-save.test.mjs apps/web/test/api-client-profile-photo.test.mjs apps/web/test/matter-profile-ui.test.mjs
npm --workspace apps/web run typecheck
npm --workspace apps/web run build
git diff --check
```

The PostgreSQL integration tests require a localhost database and cannot run in a sandbox that rejects `listen`. Rendered browser QA also requires an available browser runtime. The repository-configured AI slop taxonomy and lint script path is absent in this environment, so that automated review cannot be claimed.
