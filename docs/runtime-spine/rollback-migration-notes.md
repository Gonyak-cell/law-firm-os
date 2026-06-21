# Runtime Spine Rollback and Migration Notes

Status: G0 placeholder for future runtime migrations
Date: 2026-06-21

## G0

G0 adds planning, decision, ledger, evidence, and validator files only. It does not add product DB migrations, production credentials, external network calls, or real data writes.

Rollback for G0 is a normal Git revert of the Runtime Spine G0 PR. No runtime data rollback is required.

## Future Migration Rules

| Rule | Applies To |
| --- | --- |
| Every schema change must have a migration ID | RS-1, RS-4 |
| Every migration must state up/down or rollback plan | RS-1, RS-4, RS-6 |
| Synthetic tenant first | all runtime migrations |
| No production credentials in repo | all spines |
| Idempotent writes required | RS-1, RS-5 |
| Audit coverage required before mutation routes | RS-3, RS-5 |

## Future Evidence Required

Runtime migration PRs must record:

- migration command
- rollback or reset command
- synthetic fixture hash or record count
- tenant isolation negative test
- audit event verification when mutation routes are involved

## Launch Boundary

Migration evidence can support a repo-side runtime-ready candidate. It cannot prove actual production launch without external operator receipts.
