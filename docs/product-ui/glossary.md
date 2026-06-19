# Product UI Glossary

Status: draft_blocked_pending_i18n_policy_decision_and_final_ui_copy_validation
Work package: LT-L4-W05
TUW: LT-L4-W05-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This glossary is a UI/training copy draft. It does not decide the i18n policy,
does not modify `apps/web`, does not claim final glossary approval, and does
not claim LT-L4-W05-T02 completion.

It imports the naming rules already recorded in
`docs/launch/matter-naming-rules.md` and
`workbook/launch-runtime/terminology-glossary.md`. Final UI copy validation
still depends on LT-L4-W05-T01 owner language-policy decision and LT-L4-W05-T03
app copy checks.

## Product Name Layers

| Layer ID | Layer | Canonical usage | Do not use |
| --- | --- | --- | --- |
| NAME-LAYER-01 | Product brand | `matter` | `Matter` as product brand; `Law Firm OS` as user-facing product brand |
| NAME-LAYER-02 | UI brand | `matter by AMIC` | `matter by AMIC Law` in live app source |
| NAME-LAYER-03 | Platform/repository code name | `Law Firm OS` | Renaming governance, repo, closeout, contract, or launch evidence to `matter` |
| NAME-LAYER-04 | Machine identifier | `law-firm-os` | Branding-driven package, script, contract, file, or evidence identifier rename |

## Wave 1 UI Terms

| Term ID | Canonical term | Use in | Avoid or note |
| --- | --- | --- | --- |
| TERM-01 | matter | Product brand and matter object context where unambiguous. | Do not capitalize as `Matter` when naming the product. |
| TERM-02 | matter by AMIC | UI brand and accessibility labels. | Do not use `matter by AMIC Law` in live app source. |
| TERM-03 | Matter Home | Wave 1 screen name. | Do not treat as an admin mutation surface. |
| TERM-04 | Work Queue | Wave 1 screen name for tasks, overdue, review, approval lanes. | Do not include HR task lane in Wave 1. |
| TERM-05 | Document Workspace | Wave 1 screen name for status, version, source, QC, related issue metadata. | Do not imply direct original-file link while MAT-DEC-03 is pending. |
| TERM-06 | Outlook Add-in Pane | Wave 1 screen name for read-mode filing task pane. | Do not claim Smart Alerts or AI summary in Wave 1. |
| TERM-07 | Issue Ledger | Wave 1 screen name for issue lifecycle and resolution source tracking. | Do not use as final enum authority. |
| TERM-08 | Admin Console | Wave 1 screen name for read-oriented users, permissions, policy, and audit surfaces. | Do not imply policy mutation until runtime gates exist. |
| TERM-09 | file_ref | Opaque document-original reference placeholder. | Do not expose raw path, object key, Graph token, or signed URL. |
| TERM-10 | permission denied | User-visible state when access is denied. | Do not reveal inaccessible object names, counts, or source detail. |
| TERM-11 | review_required | User-visible state when review is required before showing content or allowing action. | Do not render underlying restricted data. |
| TERM-12 | approval request | Work Queue lane and workflow item requiring approver action. | Do not let non-approvers see hidden details. |
| TERM-13 | My Tasks | Work Queue lane for current-principal tasks. | Do not include HR-sensitive tasks. |
| TERM-14 | Overdue | Work Queue lane for due/past-due tasks. | Do not expose inaccessible matter detail. |
| TERM-15 | Review Needed | Work Queue lane for review-required workflow items. | Do not equate with final approval. |
| TERM-16 | Critical Deadlines | Matter Home area for signing, closing, court, filing, and client response deadlines. | Do not use for informal reminders without source basis. |
| TERM-17 | Open Issues | Matter Home area for unresolved issues. | Use Issue Ledger for detailed issue work. |
| TERM-18 | Recent Documents | Matter Home area for filed document metadata. | Do not show document bytes. |
| TERM-19 | Recent Emails | Matter Home area for filed email metadata. | Do not expose message body in summary. |
| TERM-20 | Client Pending | Matter Home area for client confirmations and missing inputs. | Avoid client names in unsafe contexts. |
| TERM-21 | Counterparty Pending | Matter Home area for counterparty reply waits and negotiation blockers. | Avoid sensitive counterparty detail in denied state. |
| TERM-22 | AI Candidates | Wave 1 dark/off placeholder only. | No prompt input, generated output, or interactive AI controls. |
| TERM-23 | Knowledge Candidates | Later reuse candidates from approved matter artifacts. | Do not use AI-generated knowledge in Wave 1. |
| TERM-24 | Status | Document or issue lifecycle label. | Use the specific state source when ambiguity matters. |
| TERM-25 | Version | Document version metadata. | Do not equate version metadata with original-file access. |
| TERM-26 | Source | Safe source label or reference. | Do not display raw storage or provider secrets. |
| TERM-27 | QC Result | Quality-control status. | Do not expose extracted text or OCR payload in list rows. |
| TERM-28 | Related Issue | Safe issue link/count. | Do not leak issue text in denied/review_required state. |
| TERM-29 | Candidate inbox | Issue Ledger state for candidate issue triage. | Do not present as final legal conclusion. |
| TERM-30 | Proposed language | Draft language for legal review. | Requires human review and source basis. |
| TERM-31 | Resolution | Final issue outcome summary. | Requires authority/source reference. |
| TERM-32 | Permission view | Admin Console permission read surface. | Not a permission mutation path in Wave 1. |
| TERM-33 | Policy read | Admin Console policy metadata surface. | Policy change remains code/deployment governance. |
| TERM-34 | Audit read | Admin Console audit search/read surface. | Do not expose raw audit payload beyond authorized fields. |
| TERM-35 | break-glass | Time-boxed emergency access procedure. | Not partner override; not convenience access. |
| TERM-36 | permission request | Support/request path for access changes. | No direct DB edit or fixture mutation. |

## Forbidden Copy Patterns

| Pattern ID | Forbidden or restricted pattern | Rule |
| --- | --- | --- |
| FORBID-01 | `Matter` as product brand | Use lowercase `matter` for product brand copy. |
| FORBID-02 | `matter by AMIC Law` in live app source | Use `matter by AMIC`. |
| FORBID-03 | `Law Firm OS` as user-facing product brand | Reserve Law Firm OS for platform/repo/governance evidence. |
| FORBID-04 | raw file path, object key, Graph token, signed URL | Use opaque `file_ref` until storage/link policy is approved. |
| FORBID-05 | bare `P0`, `P1`, or `P2` without namespace | Use priority, phase, or product-pillar namespace explicitly. |
| FORBID-06 | AI enabled, AI summary, Smart Alerts in Wave 1 | Wave 1 AI is off/dark launch only. |

## L2-W06 Crosswalk

| Crosswalk ID | L2-W06 source item | UI glossary treatment | Mismatch state |
| --- | --- | --- | --- |
| L2-XWALK-01 | product_brand = `matter` | NAME-LAYER-01 and TERM-01 | no_mismatch |
| L2-XWALK-02 | ui_brand = `matter by AMIC` | NAME-LAYER-02 and TERM-02 | no_mismatch |
| L2-XWALK-03 | platform_code_name = `Law Firm OS` | NAME-LAYER-03 and FORBID-03 | no_mismatch |
| L2-XWALK-04 | machine_identifier = `law-firm-os` | NAME-LAYER-04 | no_mismatch |
| L2-XWALK-05 | Homonym rules for Activity, Lead, Contact, Loop, P-symbols | Deferred to runtime/domain copy checks where those terms appear. | no_wave1_ui_mismatch_found_in_this_draft |
| L2-XWALK-06 | Old UI brand phrase exception | Live app source must contain 0 instances of `matter by AMIC Law`. | no_live_source_match_at_last_check |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L4-W05-T01 | Owner language-policy decision is still pending. |
| LT-L4-W05-T03 | App copy checks and source updates are not complete. |
| Final screen validation | Rendered Wave 1 screens must be checked against this glossary. |
