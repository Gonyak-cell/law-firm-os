# Matter-Vault R4 Production Smoke Plan

Status: production-equivalent-desktop-runtime-received
Date: 2026-06-22

This plan defines smoke evidence expected from the operator. Production-equivalent desktop runtime smoke is received, but this plan is not final go-live authority. R4 full business smoke remains required before real production cutover.

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

## Current Receipt

Production-equivalent desktop runtime smoke is received in `launch/external-production-smoke-receipt.json` for the AWS-generated `execute-api` endpoint. The receipt proves operator-token protection, password reset, password login, `jwsuh@amic.kr` system-super-admin access, and general-account admin denial. It does not prove the full R4 business smoke cases above against a real production application runtime.
