# Hardening Coverage Matrix

Status: blocked_pending_owner_ratification_and_cell_evidence

Work package: LT-L0-W05

Terminal TUW: LT-L0-W05-T02

Gate binding: G1, L0-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T12:56:50Z

## Boundary

This document records the matrix contract and closeout blocker for
LT-L0-W05. It does not claim that the 272 cells are evidenced. It does not
ratify the critical RP list, approve unmet-cell dispositions, or satisfy G1.

The user waived full Claude review for future work. That waiver is recorded as
`review_waived_by_user` and is not valid review evidence.

## Contract Shape

Source contract:
`contracts/critical-rp-saas-hardening-contract.json`

| Contract element | Count |
| --- | ---: |
| Critical RP IDs | 16 |
| Universal SaaS controls | 17 |
| Required matrix cells | 272 |

Critical RP IDs:
`RP00`, `RP01`, `RP02`, `RP03`, `RP04`, `RP05`, `RP06`, `RP07`, `RP10`,
`RP12`, `RP14`, `RP16`, `RP17`, `RP25`, `RP26`, `RP29`

Universal SaaS controls:
`tenant_isolation`, `object_level_authorization`, `deny_over_allow`,
`matter_first_traceability`, `append_only_audit_or_evidence`,
`privacy_minimization`, `secure_secret_handling`,
`idempotency_and_replay_protection`, `data_retention_and_legal_hold`,
`observability_trace_log_metric`, `synthetic_fixture_only`, `contract_tests`,
`threat_model`, `migration_or_release_rollback`, `hermes_gate`,
`claude_cross_validation`, `human_approval`

## Matrix Scaffold

The executable matrix must contain one row per RP/control pair and use only
these cell statuses:

- `satisfied`
- `unmet`
- `n/a`

The current scaffold is blocked before cell population because PRE-W01 owner
ratification and cell-level evidence extraction are not complete.

| Required field | Current state |
| --- | --- |
| RP ID | contract list known |
| Control ID | contract list known |
| Status (`satisfied`, `unmet`, `n/a`) | pending evidence extraction |
| Evidence reference | pending closed-pack evidence link |
| Evidence command | pending command capture |
| Disposition for unmet cells | pending owner disposition |
| Approval record | pending owner approval |

## Current Summary

| TUW | Required outcome | Current state | Closeout state |
| --- | --- | --- | --- |
| LT-L0-W05-T01 | Build 16 RP x 17 control matrix from closed-pack evidence, with all 272 cells classified and at least 20 sample links | Contract shape recorded only; 272 cell evidence not populated | blocked |
| LT-L0-W05-T02 | Finalize disposition column, completion summary, and approval record | No owner approval or unmet disposition count exists | blocked |

## Blocking Referral

LT-L0-W05 remains blocked until the critical RP list is ratified, each of the
272 cells is linked to real closed-pack evidence or marked `n/a` with rationale,
and every unmet cell has an owner-approved disposition.
