# Production Data Policy Non-Weakening Argument

Status: draft_pending_human_ratification
Work package: LT-L1-W04
Created for: LT-L1-W04-T02
Recorded at: 2026-06-18T10:43:08Z

This document argues that `contracts/production-data-policy-contract.json` is additive. It does not authorize real data, production credentials, product-state writes, or any L7 ingest by itself. Human ratification is still required at `launch-decision-register:L1-4`, and the contract is not effective until L7 entry conditions are met.

## Requirement 1: 닫힌 팩 미수정

Claim: the contract does not edit closed CP evidence, manifests, or historical readiness claims.

Contract field basis:

| Field path | Value | Non-weakening effect |
|---|---|---|
| `scope.closed_cp_evidence_rewrite` | `forbidden` | Existing CP evidence remains historical-only and cannot be rewritten to justify live data. |
| `non_weakening_constraints[0]` | Closed CP evidence and manifests are not edited by this contract. | The contract is an L1 additive artifact, not a CP evidence mutation. |
| `unratified_contract_effect.permits_real_data_contact` | `false` | Draft existence creates no operational permission. |

## Requirement 2: 소급 클레임 차단

Claim: the contract blocks retroactive approval, audit, and readiness claims.

Contract field basis:

| Field path | Value | Non-weakening effect |
|---|---|---|
| `effective_state` | `not_effective_until_l7_entry_and_owner_ratification` | L1 drafting is separated from L7 effectiveness. |
| `effective_condition.requires_l1_ratification` | `launch-decision-register:L1-4 status decided with approval signature` | A human decision remains mandatory. |
| `audit_obligation.retroactive_audit_creation` | `forbidden` | Audit cannot be reconstructed after real data contact. |
| `non_weakening_constraints[1]` | No readiness or approval claim is created retroactively. | Existing gate semantics remain intact. |

## Requirement 3: 하위 게이트 함의·대체 금지

Claim: the contract does not replace RTG-004, Hermes restrictions, L5 security acceptance, L6 operational readiness, or L7 entry approval.

Contract field basis:

| Field path | Value | Non-weakening effect |
|---|---|---|
| `effective_condition.requires_l5_security_acceptance` | `true` | Security acceptance remains a predecessor. |
| `effective_condition.requires_l6_operational_readiness` | `true` | Operational readiness remains a predecessor. |
| `effective_condition.requires_l7_entry_approval` | `true` | L7 remains the real-data entry point. |
| `preserved_prohibitions.rtg_004.immutable_for_pre_l7_and_non_live_goals` | `true` | RTG-004 is preserved for pre-L7 and non-live goals. |
| `preserved_prohibitions.hermes.immutable_for_agents` | `true` | Hermes/agent restrictions remain in force. |

## RTG-004 / Hermes Contrast Table

| Baseline | Source quote | Contract relationship |
|---|---|---|
| RTG-004 security attestation | Runtime evidence runs in synthetic sandbox with no real data, credentials, or product writes. | Preserved in `preserved_prohibitions.rtg_004`; this draft does not alter runtime evidence requirements. |
| Hermes production data prohibition | Third-party autonomous agents remain blocked from production repo writes, production secrets, and real client/matter data. | Preserved in `preserved_prohibitions.hermes`; agents cannot approve or perform live data work. |
| Launch plan L7 data ingest | 실데이터 투입 전 audit 경로·ID 체계·권한 모델의 실환경 작동 선확인. | Captured in `effective_condition.requires_runtime_audit_path_verified_before_data_ingest` and `audit_obligation.missing_audit_path_effect`. |

## Remaining Human Gate

The contract can be ratified only by a real `L1-4` decision row in `docs/launch/launch-decision-register.md`. Until then:

| Item | Status |
|---|---|
| Contract ratified | no |
| L7 entry approved | no |
| Real data permitted | no |
| Production credentials permitted | no |
| Product-state writes permitted | no |

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` in closeout evidence and is not valid review evidence.
