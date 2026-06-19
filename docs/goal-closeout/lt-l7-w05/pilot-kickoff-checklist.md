# Pilot Kickoff Checklist

Status: draft_blocked_pending_l7_w03_l7_w04_l3_w09_m365_admin_pilot_team_owner_approval_and_production_evidence
Work package: LT-L7-W05
TUW: LT-L7-W05-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a pilot kickoff readiness checklist only. It does not deploy the
Outlook Add-in, does not change Microsoft 365 admin center settings, does not
grant access, does not confirm AI-off runtime state, does not approve pilot
scope, does not send launch communications, and does not claim
LT-L7-W05-T01 or LT-L7-W05 completion.

Production pilot kickoff requires external M365 admin evidence, a real pilot
roster, completed L7 training evidence, Add-in deployment pipeline evidence,
owner-approved pilot matter scope, and support-channel communication records.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| KICKOFF-SRC-01 | `../../launch/pilot-roster-draft.md` | Role-slot roster input only |
| KICKOFF-SRC-02 | `../lt-l1-w10/command-evidence.json` | Confirms real pilot roster is pending |
| KICKOFF-SRC-03 | `../lt-l7-w04/command-evidence.json` | Training package status |
| KICKOFF-SRC-04 | `../../launch/support/faq-onboarding.md` | Support and onboarding route |
| KICKOFF-SRC-05 | `../../../contracts/email-dms-m365-runtime-contract.json` | M365 Add-in runtime boundary |
| KICKOFF-SRC-06 | `../../../workbook/matter_dev_docs/08_Microsoft_365_Outlook_Addin_Spec.md` | Outlook Add-in product source |
| KICKOFF-SRC-07 | `../../launch/kpi/kpi-definitions.md` | Pilot KPI definitions |
| KICKOFF-SRC-08 | `../../launch/runbooks/incident-response-runbook.md` | Incident route during pilot |

## Prerequisite State

| Prerequisite ID | Requirement | Current state | Kickoff effect |
| --- | --- | --- | --- |
| KICKOFF-PREREQ-01 | LT-L7-W03-T05 production migration success/permission evidence | no evidence directory found in this checkout | blocks production pilot scope |
| KICKOFF-PREREQ-02 | WP:LT-L7-W04 training before pilot | draft/templates only; no sessions or 100 percent completion | blocks pilot start |
| KICKOFF-PREREQ-03 | WP:LT-L3-W09 Add-in pilot deployment pipeline | no evidence directory found in this checkout | blocks Add-in deployment proof |
| KICKOFF-PREREQ-04 | EXT-M365-ADMIN admin center access and export | pending external admin action | blocks deployment target validation |
| KICKOFF-PREREQ-05 | EXT-PILOT-TEAM availability and owner approval | pending real roster and owner acceptance | blocks production work start |

## Add-In Deployment Target Reconciliation

| Check ID | Required evidence | Current state |
| --- | --- | --- |
| KICKOFF-DEPLOY-01 | Final LT-L1-W10-T02 pilot roster with real users and approved time allocation. | pending_final_roster |
| KICKOFF-DEPLOY-02 | Microsoft 365 admin center export showing Add-in deployment limited to pilot group. | pending_m365_admin_export |
| KICKOFF-DEPLOY-03 | Target list vs final pilot roster diff with missing/extra count 0. | pending_roster_and_export |
| KICKOFF-DEPLOY-04 | One pilot mailbox confirms Add-in visible. | pending_mailbox_capture |
| KICKOFF-DEPLOY-05 | One non-pilot mailbox confirms Add-in not visible. | pending_non_pilot_negative_check |

## AI-Off Verification

| Check ID | Required evidence | Current state |
| --- | --- | --- |
| KICKOFF-AI-01 | Admin Console or equivalent operations screen shows AI feature flags off for Wave 1 pilot. | pending_runtime_screen |
| KICKOFF-AI-02 | Settings/config dump shows AI summary, Smart Alerts, drafting, and prompt/output controls disabled. | pending_config_dump |
| KICKOFF-AI-03 | Pilot UI check confirms no AI prompt input, generated summary, or Smart Alert action is usable. | pending_ui_capture |
| KICKOFF-AI-04 | Disable/rollback authority is documented for accidental AI exposure. | pending_owner_approved_disable_route |

## Pilot Matter Scope Approval

| Check ID | Required evidence | Current state |
| --- | --- | --- |
| KICKOFF-SCOPE-01 | Pilot matter list splits new matters and active matters with safe identifiers. | pending_owner_scope |
| KICKOFF-SCOPE-02 | Pilot owner written approval includes signer, date, and accepted scope. | pending_owner_signature |
| KICKOFF-SCOPE-03 | Scope excludes AI, HR-sensitive workflows, portal work, Vault export/import, and billing automation unless separately approved. | pending_owner_scope |
| KICKOFF-SCOPE-04 | Production-data handling path is tied to approved launch policy and support/incident routes. | pending_policy_and_support_confirmation |

## Kickoff Communications And Support

| Check ID | Required evidence | Current state |
| --- | --- | --- |
| KICKOFF-COMMS-01 | Launch notice draft names scope, AI-off boundary, support route, incident route, and misfiling procedure. | pending_notice_draft |
| KICKOFF-COMMS-02 | Support channel is open and can receive one safe pilot support request. | pending_support_channel_roundtrip |
| KICKOFF-COMMS-03 | Notice sent to every final pilot participant with timestamp and recipient list. | pending_send_log |
| KICKOFF-COMMS-04 | Pilot participants acknowledge training, support route, and AI-off boundary. | pending_acknowledgement |

## Evidence Completion Matrix

| Evidence ID | T01 completion criterion | Required proof | Current state |
| --- | --- | --- | --- |
| KICKOFF-EVIDENCE-01 | Deployment target matches pilot roster and non-pilot Add-in is hidden. | Roster/export diff plus pilot and non-pilot mailbox captures | not_available |
| KICKOFF-EVIDENCE-02 | AI feature flags are off in screen and config dump. | Admin/runtime screen proof plus config dump | not_available |
| KICKOFF-EVIDENCE-03 | Pilot new/active matter scope has owner approval. | Signed/date owner approval artifact | not_available |
| KICKOFF-EVIDENCE-04 | Kickoff and support notice sent to pilot group. | Sent message log and support channel guide | not_available |

## Non-Weakening Rationale

This checklist does not weaken the launch boundary because it does not perform
deployment or access changes. It requires pilot-only deployment, non-pilot
negative proof, no new Graph scopes beyond approved consent, AI-off validation
through both UI and config evidence, owner-approved scope, and auditable support
and incident routes before any production pilot work starts.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L7-W03-T05 | Production migration/delta path and permission evidence must exist before production pilot use. |
| WP:LT-L7-W04 | Training completion must be proven with final roster and sessions. |
| WP:LT-L3-W09 | Add-in pilot deployment pipeline and admin-center evidence must exist. |
| EXT-M365-ADMIN | M365 admin export and mailbox visibility checks require external admin access. |
| EXT-PILOT-TEAM | Pilot roster, owner approval, and user availability require human/external commitment. |
