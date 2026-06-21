# Matter-Vault R4 Production Smoke Plan

Status: external-receipt-required
Date: 2026-06-20

This plan defines smoke evidence expected from the operator. It is not an external production receipt.

## Smoke Cases

| Case | Expected Proof |
| --- | --- |
| Matter opening orchestration | MatterVaultLink exists and Vault workspace is created once |
| Vault summary | Summary omits denied count and raw storage paths |
| Document upload facade | Matter route creates Vault/DMS metadata only |
| Version/detail panel | Version history renders without exposing storage internals |
| Legal hold | Download/export blocked while held |
| Ethical wall | Unauthorized actor receives safe denial without count leak |
| Search/AI retrieval | Permission is checked before source retrieval |
| Portal projection | Projection-only payload excludes internal memo and bytes |
| Timeline | Vault events appear as Matter timeline projections only |
| Audit | Permission and document actions are audit-linked |

## Receipt Rule

The operator must attach environment, commit SHA, timestamp, actor, tenant, command/API evidence, and pass/fail result. Pending smoke cases do not authorize launch.
