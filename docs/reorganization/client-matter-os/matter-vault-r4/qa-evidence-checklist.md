# Matter-Vault QA and Evidence Checklist v1.0

작성 기준일: 2026-06-20

## 1. Required Test Classes

| Test Class | Required Evidence |
|---|---|
| Unit | Model/service functions for MatterVaultLink, VaultWorkspace, DmsDocument, DocumentVersion, FileObject |
| Contract | API request/response schema for Matter opening, Vault upload, search, AI retrieval, portal projection |
| Permission | Matter ACL, object ACL, ethical wall, legal hold, privilege label, external ACL |
| Audit | Every write and sensitive read creates durable audit event with hash chain |
| State Machine | Matter, DocumentVersion, TimeEntry, AIOutput, SecureLink valid/invalid transitions |
| Idempotency | Matter opening, Vault workspace create, document upload, version create, secure link |
| Integration | CRM -> Intake -> Matter opening -> Vault workspace -> document upload -> Matter timeline |
| Security | Tenant leak, raw path leak, denied count leak, AI/search bypass, portal overexposure |
| UI State | Loading, empty, denied, review-required, error for MatterVaultPanel and DocumentDetail |
| Migration | Backfill MatterVaultLink, duplicate workspace detection, rollback |
| Performance Smoke | Matter command center, Vault search, document upload metadata path |
| UAT | Partner, associate, records manager, client user scenarios |

## 2. Evidence Template

```markdown
# TUW Evidence
TUW ID:
PR:
Commit:
Files changed:
Migration:
API routes:
Permission checks:
Audit events:
Tests run:
Result:
Remaining risks:
Reviewer:
```

## 3. R4 Exit Checklist

- [ ] Persistence exists and migrations pass.
- [ ] All write APIs have permission and audit.
- [ ] Sensitive reads have audit.
- [ ] Matter opening creates Vault workspace and link atomically.
- [ ] Document bytes are stored only by Vault storage adapter.
- [ ] MatterTeam uses Employee identity for staffing.
- [ ] Vault search and AI retrieval require permission decision.
- [ ] Portal uses projection only.
- [ ] UI uses live fetch and required states.
- [ ] Security negative tests pass.
