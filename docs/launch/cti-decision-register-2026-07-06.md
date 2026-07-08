# CTI Decision Register - 2026-07-06

Status: owner_ratified_for_cti_g0_s0_only

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

Source plan SHA256: `92b0d9197bc075ce3a61135414458d89a80173ace43ddfb7c57cd70a69e9f197`

Approval ref proposed by plan: `canonical-tenant-injection-decisions-2026-07-06`

This register transcribes D-01 through D-10 from the source plan into a launch decision surface. I4 has been ratified only for CTI G0/S0 probes under `approval_signature_ref=I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06`. I2 has also been recorded as a future S4-T03/CUTOVER access-scope input under `approval_signature_ref=I2-CTI-KYT-ACCESS-SCOPE-OWNER-APPROVAL-2026-07-06`. I3 has also been recorded as a future S2-T03/CUTOVER password-distribution-channel input under `approval_signature_ref=I3-CTI-INITIAL-PASSWORD-DISTRIBUTION-CHANNEL-OWNER-APPROVAL-2026-07-06`. I10 has also been recorded as a future BUILD-stage S3/S4 code-only preparation input under `approval_signature_ref=I10-CTI-BUILD-S3-S4-CODE-PREP-OWNER-APPROVAL-2026-07-06`. These records do not approve S1-S6 execution, production migration, cutover, account password issuance/distribution, Entra ID/OIDC, DB conversion, production_ready, or go-live.

## Ratification Boundary

- Existing governing contract: `contracts/production-data-policy-contract.json`
- Contract SHA256: `3a7af805ca00b42d6bb42e02d1e6121b57b0a7d44d732aec39fcbacba248d874`
- Contract file status: `draft_pending_human_ratification`
- External owner ratification recorded for CTI G0/S0 only: `I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06`
- Ratified G0/S0 effect: production credentials, real-data readback, and the S0-T03 synthetic marker write are allowed only for S0-T01 through S0-T07, with S0-T04 preceding S0-T03.
- Recorded future owner input: I2 conservative Kim Yang Tae access scope receipt at `docs/launch/cti-i2-owner-approval-receipt-2026-07-06.md`.
- Recorded future owner input: I3 in-person initial password distribution channel receipt at `docs/launch/cti-i3-owner-approval-receipt-2026-07-06.md`.
- Recorded future owner input: I10 BUILD-stage S3/S4 code-only preparation receipt at `docs/launch/cti-i10-owner-approval-receipt-2026-07-06.md`.
- Required future owner input: separate approval_ref for S1 or CUTOVER.

## Decisions

| ID | Decision | Ratification state | Execution boundary |
|---|---|---|---|
| D-01 | Canonical tenant is `tenant_amic_matter_vault`; `tenant_rp05_synthetic` remains synthetic-only and client/matter data migrates to canonical only after gates. | owner_decision_recorded_i4_g0_s0_ratified | No migration before later S3/CUTOVER approval. |
| D-02 | Auth A-stage is user random initial password with one-way hash, out-of-band distribution, forced first change, synthetic-token production block, and `verifyToken` rewrite; Entra ID/OIDC remains non-blocking B-stage design. | owner_decision_recorded_i4_g0_s0_ratified | No password issuance or operational cutover in this goal. |
| D-03 | PII separation remains no-phone for registration seed; phone numbers only enter CRM contact store after existing production-data-policy contract is separately effective for S5 contact scope. | owner_decision_recorded_i4_g0_s0_ratified | No contact PII ingestion in this goal. |
| D-04 | QA production accounts are disabled through additive seed fields `production_status=disabled` and `qa_tenant_scope=synthetic_only`. | owner_decision_recorded_i4_g0_s0_ratified | No production account write in this goal. |
| D-05 | Affiliation splits AMIC / PETRA BRIDGE PARTNERS; Kim Yang Tae uses the conservative default access scope approved by I2: M&A/advisory matters and finance dashboard allowed; litigation/dispute records excluded. | owner_input_recorded_i2_future_s4_cutover_input | No permission write or account activation in this goal. |
| D-06 | Blanket grants shrink to canonical tenant only for real users; synthetic tenant QA remains local-dev only and production QA paths must deny. | owner_decision_recorded_i4_g0_s0_ratified | No grant rewrite in this goal. |
| D-07 | The 149th row must be captured and dispositioned only after S0-T04 readback; T04 must precede S0-T03 cold-start probe. | i4_ratified_probe_execution_allowed | S0-T04 readback may run; D-07 final state comes from its receipt. |
| D-08 | Governance uses a goal-closeout goal plus launch-TUW ledger registration, using the existing master schema rules. | active_for_this_goal | Local ledger registration is allowed; no closed-pack rewrite. |
| D-09 | Lead-lawyer mapping uses a 148-row workbook with available evidence-filled fields and owner-filled attorney/status columns. | method_decided_owner_I1_pending | Workbook drafting only; no staffing write. |
| D-10 | Short-term storage is EFS when probe branch supports it; later DB conversion is RS-1 follow-up. Backup/restore drill is required. | i4_ratified_probe_execution_allowed | S1 branch assessment may be produced; no S1 infra change in this goal. |

## Owner Inputs

| ID | Needed before | State | Default |
|---|---|---|---|
| I1 | S5 staffing enrichment | pending | none |
| I2 | CUTOVER access application | approved_future_s4_cutover_input | conservative default approved: M&A/advisory + finance dashboard; litigation/dispute excluded |
| I3 | CUTOVER password distribution | approved_future_s2_cutover_input | in-person distribution approved; plaintext email/messenger/repo/log storage forbidden |
| I4 | G0/S0 risk-A real-data or production-credential probes | approved_for_g0_s0_only | `I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06` |

## Later Stage Approval Receipts

| ID | Applies to | State | Boundary |
|---|---|---|---|
| I10 | BUILD S3/S4 code-only preparation | approved_future_build_code_only_input | Allows S3/S4 code path preparation, validators, dry-run, rollback checks, and PII-safe evidence wiring; does not allow production tenant migration, production account/permission injection, bridge token rotation, password issuance/distribution, CUTOVER, production_ready, or go-live. |

## Current Closeout Position

This register supports G0/S0 kickoff and S0 probe execution only, plus records I2 as a future S4-T03/CUTOVER access-scope input, I3 as a future S2-T03/CUTOVER password-distribution-channel input, and I10 as a future BUILD-stage S3/S4 code-only preparation input. It is not sufficient for S1, S2, S3, S4, S5, S6, CUTOVER, production migration, account password generation or distribution, bridge token rotation, Entra ID/OIDC, DB conversion, production_ready, go-live, or owner approval claims beyond the recorded I4 G0/S0 ratification, I2 access-scope input, I3 distribution-channel input, and I10 code-only preparation input.
