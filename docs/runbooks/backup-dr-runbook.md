# Backup And DR Runbook

Status: draft_blocked_pending_rpo_rto_approval_and_restore_rehearsal
Work package: LT-L3-W05
TUW: LT-L3-W05-T04
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This runbook is an operational draft only. It does not approve RPO/RTO values,
does not prove backup automation, does not execute a restore rehearsal, does
not create production infrastructure, and does not authorize production or
real-client data use.

The approved numeric targets must come from
`docs/launch/l3/rpo-rto-decision.md` after owner approval and launch decision
register cross-reference. Current candidate numbers in that decision brief are
not pass/fail criteria.

## Target Source Control

| Control | Required source | Current state |
| --- | --- | --- |
| Approved DB RPO/RTO | LT-L3-W05-T01 owner-approved row | pending_owner_approval |
| Approved audit-store RPO/RTO | LT-L3-W05-T01 owner-approved row | pending_owner_approval |
| Approved index recovery target | LT-L3-W05-T01 owner-approved row | proposal_only |
| Document-original recovery boundary | LT-PRE-W03 MAT-DEC-03 storage decision | blocked_pending_mat_dec_03 |
| Restore rehearsal source log | LT-L3-W05-T03 `docs/launch/l3/dr-rehearsal-report.md` | pending_rehearsal |

## Recovery Roles

Named people are not assigned here. These are role placeholders until staffing,
on-call, and approval governance are owner-approved.

| Role | Responsibility | Current owner state |
| --- | --- | --- |
| DR commander | Owns incident classification, recovery authorization, timeline, and final go/no-go. | pending_human_assignment |
| Database operator | Restores DB backup into the approved target environment and preserves command evidence. | pending_human_assignment |
| Audit-store operator | Restores audit store, verifies chain continuity, and records tamper-evidence checks. | pending_human_assignment |
| Search/index operator | Rebuilds or resyncs derived search/vector indexes from approved source stores. | pending_human_assignment |
| M365/storage operator | Owns SharePoint/OneDrive or object-store original recovery boundary after MAT-DEC-03. | pending_mat_dec_03 |
| Security/approval owner | Approves sensitive access, break-glass use, rollback, and production recovery actions. | pending_human_assignment |

## DR Trigger Classification

| Trigger | Initial severity | Required action |
| --- | --- | --- |
| DB unavailable or corrupted | S1/S2 | Freeze risky writes, preserve logs, and start restore authorization. |
| Audit chain verify failure | S1 | Preserve audit evidence, stop destructive actions, and route to security owner. |
| Backup job missing or failed | S2/S3 | Determine whether RPO could be missed and escalate if launch criteria are at risk. |
| Search/vector index unavailable | S2/S3 | Confirm source stores are intact, then run resync path. |
| Document original unavailable | S1/S2 | Apply MAT-DEC-03 storage-owner procedure once decided; do not invent storage ownership. |

## Restore Procedure Draft

The steps below must be replayed in LT-L3-W05-T03 before this runbook can be
treated as executable evidence. Each step needs timestamped command/manual
evidence in the rehearsal report.

| Step ID | Procedure | Required evidence |
| --- | --- | --- |
| DR-STEP-01 | Declare recovery event, severity, affected stores, and evidence-preservation owner. | incident or rehearsal record timestamp |
| DR-STEP-02 | Confirm authorization to restore and record whether environment is synthetic, staging, or production. | approval or rehearsal authorization reference |
| DR-STEP-03 | Freeze risky writes or place the affected environment in read-only/maintenance mode when available. | command output or operator attestation |
| DR-STEP-04 | Select backup set and record backup timestamp, storage location, checksum or manifest, and encryption state. | backup manifest excerpt |
| DR-STEP-05 | Calculate provisional RPO window from failure timestamp minus selected backup timestamp. | RPO calculation row |
| DR-STEP-06 | Provision isolated restore target and verify it cannot mutate the damaged source environment. | environment identifier and isolation note |
| DR-STEP-07 | Restore relational DB and record start/end timestamps, schema version, and row-count checks. | DB restore log |
| DR-STEP-08 | Restore WORM/audit store or audit-chain replica and record immutable-store behavior. | audit restore log |
| DR-STEP-09 | Run audit chain verification against restored audit records. | verify command exit code and record count |
| DR-STEP-10 | Reconcile document records and file_ref pointers against the approved MAT-DEC-03 storage boundary. | file_ref reconciliation table |
| DR-STEP-11 | Rebuild or resync search/vector indexes from approved source stores. | index resync log |
| DR-STEP-12 | Run post-restore smoke checks, calculate measured RTO/RPO, and record pass/fail against approved targets only. | G4 candidate comparison table |

## Index Resync Procedure Draft

| Step ID | Procedure | Required evidence |
| --- | --- | --- |
| IDX-STEP-01 | Confirm DB, audit store, and document metadata restore status before index work starts. | source-store readiness table |
| IDX-STEP-02 | Clear or isolate stale derived index state without deleting source stores. | index isolation command output |
| IDX-STEP-03 | Run full-text index rebuild from restored matter/document/task/issue metadata. | rebuild log |
| IDX-STEP-04 | Run vector index rebuild only for approved synthetic or staging corpus until production-data gate opens. | vector rebuild log |
| IDX-STEP-05 | Run permission-trimmed search smoke checks for at least admin, matter member, and denied user contexts. | search smoke output |
| IDX-STEP-06 | Record index rebuild duration separately from DB/audit RTO and compare only after owner-approved index target exists. | index timing row |

## Document Original Responsibility Boundary

| Boundary ID | Storage outcome | Recovery owner | Runbook treatment |
| --- | --- | --- | --- |
| RESP-BND-01 | SharePoint/OneDrive selected by MAT-DEC-03 | M365/storage operator plus Law Firm OS evidence owner | Verify Graph/file_ref pointers and rely on approved M365 retention/restore policy for originals. |
| RESP-BND-02 | Object storage selected by MAT-DEC-03 | Law Firm OS storage operator | Restore object originals, verify digest/version metadata, and reconcile Document rows. |
| RESP-BND-03 | Hybrid selected by MAT-DEC-03 | Split according to approved boundary table | Restore each source under its owner and reconcile pointers before app smoke checks. |
| RESP-BND-04 | MAT-DEC-03 still pending | No executable original recovery owner | Stop at planning; do not claim document-original recovery coverage. |

## Evidence Capture Slots

| Evidence ID | Required field | Source |
| --- | --- | --- |
| EV-DR-01 | failure or rehearsal start timestamp | incident or rehearsal record |
| EV-DR-02 | selected backup timestamp | backup manifest |
| EV-DR-03 | DB restore start/end timestamps | DB restore log |
| EV-DR-04 | audit restore start/end timestamps | audit restore log |
| EV-DR-05 | audit chain verify exit code and record count | verify command output |
| EV-DR-06 | index rebuild start/end timestamps | index rebuild log |
| EV-DR-07 | measured RPO/RTO comparison against approved targets | G4 evidence table |

## Rehearsal Mapping Placeholder

| LT-L3-W05-T03 rehearsal item | Runbook step coverage | Current state |
| --- | --- | --- |
| Restore duration <= approved RTO | DR-STEP-07 through DR-STEP-12 | pending_rehearsal |
| Data-loss window <= approved RPO | DR-STEP-04 through DR-STEP-05 | pending_rehearsal |
| Restored audit hash chain verify exit 0 | DR-STEP-08 through DR-STEP-09 | pending_rehearsal |
| Step timestamp log complete | DR-STEP-01 through DR-STEP-12 | pending_rehearsal |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L3-W05-T01 approval | Owner-approved RPO/RTO values and launch decision register cross-reference. |
| LT-L3-W05-T02 backup automation | Backup schedule, encryption, offsite storage, and success log evidence. |
| LT-L3-W05-T03 restore rehearsal | Measured restore, RPO/RTO comparison, audit chain verify, and step timestamp log. |
| LT-PRE-W03 MAT-DEC-03 | Document-original storage ownership and retention/restore responsibility. |
| LT-L3-W06 monitoring/SLO | Backup success and restore-readiness alert routing. |

## Non-Weakening Rule

Any execution of this runbook that relaxes approved RPO/RTO values, bypasses
audit-chain verification, skips permission-trimmed search smoke checks, or
changes document-original ownership requires owner approval and non-weakening
rationale before G4 evidence can pass.
