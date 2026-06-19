# Launch KPI Definitions

Status: draft_blocked_pending_l2_w03_events_and_l6_w06_t02_targets
Work package: LT-L6-W06
TUW: LT-L6-W06-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This KPI definition document is a schema and measurement draft. It does not
implement KPI collection, does not publish a dashboard, does not set target
thresholds, and does not claim LT-L6-W06 or LT-L6-W06-T01 completion.

Runtime collection depends on `LT-L2-W03` write/event paths and later
`LT-L6-W06-T03` implementation. KPI targets are a human decision in
`LT-L6-W06-T02`; all targets below are `target_pending_lt_l6_w06_t02`.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/01_제품_사양명세서_PRD_SRS.md` section 7 | Source list of seven success criteria. |
| `workbook/matter-post-cp-launch-plan.md` L6-6 and L9-2 | KPI collection infrastructure and later baseline report. |
| `workbook/matter_dev_docs/06_권한_보안_감사_거버넌스.md` sections 6 and 9 | Audit event and security verification source for security/HR KPIs. |
| `contracts/email-dms-m365-runtime-contract.json` | Filing event descriptors; runtime dispatch remains false. |
| `docs/launch/runtime-gap-report.md` | Current runtime gap evidence: write paths, audit events, and Outlook filing runtime are partial or absent. |

## KPI Definition Table

| ID | PRD criterion | Formula | Numerator | Denominator | Event/source point | Cadence | Existing schema fit | New fields required | Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KPI-DEF-01 | Matter status visibility | visible_required_matter_home_signals / required_matter_home_signals | Count of required signals rendered for open issue, task, deadline, document, and email | 5 required signals per sampled matter | Matter Home read model snapshot and screen telemetry | daily during pilot, weekly after launch | partial: Matter Home IA defines fields but runtime read model is pending | matter_home_signal_rendered, matter_id, signal_type, visibility_state | target_pending_lt_l6_w06_t02 |
| KPI-DEF-02 | Filing usage rate | filed_outlook_emails / eligible_outlook_emails | Outlook emails filed to a matter | Outlook emails eligible for filing during measurement window | Outlook Add-in filing events and filing history | daily during pilot, weekly after launch | partial: email filing descriptors exist; runtime dispatch false | eligible_email_count, filed_email_count, filing_mode | target_pending_lt_l6_w06_t02 |
| KPI-DEF-03 | Document integrity | qc_errors_fixed / qc_errors_detected | QC findings resolved before final/send state | QC findings detected in measured documents | Document QC result and issue/task resolution events | weekly | partial: QC appears in IA/specs, but QC gate runtime pending | qc_finding_id, severity, detected_at, fixed_at, final_send_blocked | target_pending_lt_l6_w06_t02 |
| KPI-DEF-04 | AI reliability | source_linked_ai_outputs / total_ai_outputs; hallucination_incidents as count | AI outputs with source links and human review disposition | All AI outputs generated in allowed scope | AI Review Queue and AI audit events; Wave 1 should produce zero interactive AI outputs | weekly after AI gate, zero-check during Wave 1 | partial: AI governance descriptors exist; Wave 1 AI is off | source_linked, review_decision, hallucination_flag, disabled_state | target_pending_lt_l6_w06_t02 |
| KPI-DEF-05 | Security | blocked_unauthorized_attempts / unauthorized_attempts and audit_events_present / expected_audit_events | Blocked unauthorized attempts; present audit events | Unauthorized attempts; expected auditable events | Permission denial events and audit completeness checks | daily | partial: audit/permission descriptors exist; durable audit runtime pending | expected_audit_event_id, observed_audit_event_id, denial_reason, leak_check_result | target_pending_lt_l6_w06_t02 |
| KPI-DEF-06 | HR stability | blocked_hr_sensitive_attempts / hr_sensitive_attempts and rule_engine_separation_passes / rule_engine_separation_checks | Blocked HR sensitive attempts; deterministic/AI separation passes | HR sensitive attempts; separation checks | HR permission events and deterministic rule-engine validation | weekly, and before HR pilot | partial: HRX descriptors exist; HR real data remains excluded | hr_data_category, blocked_state, rule_engine_check_id, ai_role_boundary_result | target_pending_lt_l6_w06_t02 |
| KPI-DEF-07 | Knowledge conversion | knowledge_packs_created / closed_matters | Closed matters with Knowledge Pack or approved knowledge candidate | Matters closed in measurement window | Matter closing events and knowledge candidate handoff | monthly | partial: knowledge candidate IA exists; runtime pending | matter_closed_at, knowledge_candidate_id, knowledge_pack_created_at, approval_state | target_pending_lt_l6_w06_t02 |

## Synthetic Sample Calculation

The sample below is synthetic and only proves that each formula can be computed
from aggregate counts. It is not a target and not a baseline.

| ID | Synthetic inputs | Calculation | Result |
| --- | --- | --- | --- |
| KPI-SAMPLE-01 | visible signals 45; required signals 50 | 45 / 50 | 90.00% |
| KPI-SAMPLE-02 | filed Outlook emails 72; eligible Outlook emails 120 | 72 / 120 | 60.00% |
| KPI-SAMPLE-03 | QC errors fixed 18; QC errors detected 20 | 18 / 20 | 90.00% |
| KPI-SAMPLE-04 | source-linked AI outputs 0; total AI outputs 0; hallucination incidents 0 | Wave 1 zero-output check; ratio not applicable until AI gate | pass_zero_output |
| KPI-SAMPLE-05 | blocked unauthorized attempts 12; unauthorized attempts 12; present audit events 240; expected audit events 240 | 12 / 12 and 240 / 240 | 100.00%; 100.00% |
| KPI-SAMPLE-06 | blocked HR sensitive attempts 8; HR sensitive attempts 8; separation passes 10; checks 10 | 8 / 8 and 10 / 10 | 100.00%; 100.00% |
| KPI-SAMPLE-07 | knowledge packs created 6; closed matters 10 | 6 / 10 | 60.00% |

## Runtime Gaps and Field Needs

| Gap | Impact |
| --- | --- |
| LT-L2-W03 write/event paths are not complete | KPI collection cannot be automated from runtime events. |
| Durable audit store is pending | Audit completeness and security KPI can only be specified, not proven. |
| Outlook filing runtime is descriptor-only | Filing usage rate cannot be live-measured yet. |
| Wave 1 AI is off | AI reliability remains a zero-output/off-state check until a later AI release gate. |
| HR real data is excluded | HR stability uses synthetic checks until HR gates allow real data. |

## PRD Traceability

| PRD section 7 row | KPI ID |
| --- | --- |
| Matter 상태 가시성 | KPI-DEF-01 |
| Filing 사용률 | KPI-DEF-02 |
| 문서정합성 | KPI-DEF-03 |
| AI 신뢰성 | KPI-DEF-04 |
| 보안성 | KPI-DEF-05 |
| HR 안정성 | KPI-DEF-06 |
| 지식화 | KPI-DEF-07 |
