# Matter-Vault PR Plan v1.0

작성 기준일: 2026-06-20

| PR | Branch | Scope | Target Areas | Merge Gate |
|---|---|---|---|---|
| MV-PR-01 | `codex/matter-vault-link-contract` | MatterVaultLink contract, canonical ownership, API boundary | contracts, packages/matter, packages/dms, docs | No runtime claim; link model and tests compile |
| MV-PR-02 | `codex/persistence-and-repository-substrate` | DB repository, migration runner, unit-of-work, idempotency, outbox | packages/platform, apps/api | Migration + rollback + idempotency tests pass |
| MV-PR-03 | `codex/vault-workspace-runtime` | VaultWorkspace/DmsFolder repository and service | packages/dms, apps/api/src/routes/vault.js | Matter-scoped workspace create/list works with DB |
| MV-PR-04 | `codex/matter-opening-vault-transaction` | MatterOpeningOrchestrator creates Matter, ACL, VaultWorkspace, MatterVaultLink | packages/matter, packages/dms, packages/authz, packages/audit | Clearance-gated Matter opening creates exactly one Vault workspace |
| MV-PR-05 | `codex/vault-document-matter-scope` | Document/Version/FileObject storage-backed Matter-scoped upload/versioning | packages/dms/storage, apps/api | Upload persists metadata + bytes + hash lineage |
| MV-PR-06 | `codex/matter-acl-vault-inheritance` | Matter ACL inheritance, object ACL, privilege, legal hold, sensitive read audit | packages/authz, packages/dms, packages/audit | Denied users see no docs and no denied count leak |
| MV-PR-07 | `codex/matter-timeline-vault-events` | Vault event projection into Matter timeline | packages/matter/timeline, packages/dms/events | Upload/version/email/share events appear in timeline safely |
| MV-PR-08 | `codex/vault-search-ai-portal-guards` | Permission-before-search/AI/portal, RAG evidence, projection-only sharing | packages/dms/search, packages/ai-governance, packages/client-portal | Unauthorized source absent from search/AI/portal |
| MV-PR-09 | `codex/matter-vault-ui-panel` | MatterVaultPanel, VaultDocumentTable, DocumentDetail, VersionHistory | apps/web/src/components, apps/web/src/data | Live fetch UI with loading/empty/denied/review/error |
| MV-PR-10 | `codex/vault-global-ui-and-admin-governance` | Vault global UI, connector settings, legal hold/privilege console | apps/web, apps/api/admin | Admin governance UI tests pass |
| MV-PR-11 | `codex/migration-backfill-and-e2e-hardening` | Backfill existing Matter/DMS records, E2E CRM-Intake-Matter-Vault-Billing | scripts/migrations, apps/api/test/e2e | Migration dry-run + E2E + security regression pass |
| MV-PR-12 | `codex/r4-closeout-evidence-pack` | Evidence pack, R4 gate report, UAT scripts, rollout/rollback runbook | docs/reorganization/client-matter-os/matter-vault-r4 | R4 gate can be reviewed without descriptor-only overclaim |

## Merge Rules

- Each PR must cite covered TUW IDs.
- Each PR must include evidence artifact path.
- Runtime PRs must include migration, rollback, permission, audit, idempotency, and negative tests.
- UI PRs must use live fetch client and required UI states.
- No PR may claim R4 unless the R4 evidence checklist passes.
