# Runtime Spine QA Checklist

Status: G0 checklist
Date: 2026-06-21

## Per-PR Checklist

| Check | Required Evidence |
| --- | --- |
| Scope is TUW-bound | changed TUW IDs recorded in `runtime-spine-ledger.json` |
| Plan-Do-Check-Act loop is visible | TUW `loop_stage` and evidence refs updated |
| Existing validators are not weakened | before/after command list in evidence index |
| Tenant/auth/audit impact is named | RS impact section in PR body or evidence file |
| Negative tests exist | at least one failure-path test per runtime PR |
| No premature launch claim | launch/go-live claim remains false unless external receipts exist |
| Future domains stay locked | Portal/M365/HR/AI/Vault sync guards remain explicit |

## G0 Checklist

| Item | Status |
| --- | --- |
| Charter exists | closed |
| Non-weakening policy exists | closed |
| Boundary map exists | closed |
| Decision register exists | closed |
| Runtime Spine ledger exists | closed |
| Evidence index exists | closed |
| Baseline measurement exists | closed |
| Plan validator exists | closed |
| Readiness validator exists | closed |

## G1 Checklist

| Item | Status |
| --- | --- |
| Synthetic persistence package exists | closed |
| Production DB and inline credentials are blocked | closed |
| Tenant base schema and migration history exist | closed |
| Tenant-scoped runtime repository exists | closed |
| Stable IDs, idempotency, transaction, outbox, and lifecycle fields exist | closed |
| Data residency metadata exists | closed |
| Synthetic backup/restore smoke harness exists | closed |
| Tenant isolation negative suite exists | closed |
| G1 persistence evidence packet exists | closed |
| Runtime-ready and actual launch/go-live claims remain false | closed |

## G2 Checklist

| Item | Status |
| --- | --- |
| Runtime auth package exists | closed |
| Session schema rejects credential material | closed |
| OIDC/SAML provider interface remains descriptor-only | closed |
| Local dev provider is synthetic-only | closed |
| Principal is server-derived | closed |
| Caller-supplied tenant/role/user context fails closed | closed |
| Tenant membership and role/group resolver exist | closed |
| MFA/session assurance model exists | closed |
| Existing authz evaluator integration exists | closed |
| Privilege and HR-sensitive policy hooks exist | closed |
| Break-glass remains locked before owner gate | closed |
| Auth audit hook writes tenant-scoped synthetic outbox events | closed |
| Runtime-ready and actual launch/go-live claims remain false | closed |

## G3 Checklist

| Item | Status |
| --- | --- |
| Runtime audit writer exists | closed |
| Audit event taxonomy exists | closed |
| Hash-chain append and verification are tested | closed |
| Read/write/permission/export middleware exists | closed |
| Middleware requires permission context before append | closed |
| Tenant-scoped audit reader/export exists | closed |
| Raw payload export remains blocked | closed |
| Retention requires human approval and verified chain | closed |
| Audit immutability guard exists | closed |
| Route audit coverage scanner exists | closed |
| Runtime-ready and actual launch/go-live claims remain false | closed |

## G4 Checklist

| Item | Status |
| --- | --- |
| Canonical object glossary exists | closed |
| Tenant/User/Employee schemas exist | closed |
| Tenant membership and role schemas exist | closed |
| Person/Organization and Client/ClientGroup schemas exist | closed |
| ExternalUser remains separate from Employee/User identity | closed |
| Matter and MatterMember schemas exist | closed |
| Party/ContactRole schemas exist | closed |
| Document/DocumentVersion and Email schemas exist | closed |
| Task/Deadline/Event, Issue, MatterWiki, and VaultSnapshot schemas exist | closed |
| Classification envelope covers classification, privilege, legal hold, retention, and permission envelope | closed |
| Relationship registry validates source and target object refs | closed |
| Canonical seed fixture validates all object types without runtime write claims | closed |
| Migration compatibility projection covers master-data, matter, HRX, and DMS records | closed |
| Runtime-ready and actual launch/go-live claims remain false | closed |

## Regression Commands

G0 uses the following minimum regression sweep:

```bash
npm run runtime-spine:plan:validate
npm run runtime-spine:readiness:validate
npm run runtime-readiness:contract:validate
npm run runtime-readiness:validate
npm run client-matter:cmp-v1:validate
npm run matter-vault:r4:validate
```

Broader gates add API, web, build, root test, and domain-specific validators as runtime code opens.
