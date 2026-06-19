# App Copy Audit

Status: audit_blocked_pending_owner_i18n_policy_wave1_scope_and_source_copy_cleanup
Work package: LT-L4-W05
TUW: LT-L4-W05-T03
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a source-copy audit only. It does not modify `apps/web`, does not choose
the i18n policy, does not certify rendered UI compliance, and does not claim
LT-L4-W05-T03 or LT-L4-W05 completion.

The audit intentionally separates confirmed mechanical checks from candidate
user-facing strings that need owner policy and Wave 1 screen-scope decisions.

## Scan Summary

| Scan ID | Check | Result | State |
| --- | --- | --- | --- |
| COPY-SCAN-01 | `matter by AMIC Law` in `apps/web/src` | 0 matches | pass_for_old_ui_brand_phrase |
| COPY-SCAN-02 | `MatterLogo` aria-label | `matter by AMIC` present | pass_for_aria_label |
| COPY-SCAN-03 | i18n locale key counts | `ko=58`, `en=58` | policy_pending |
| COPY-SCAN-04 | String candidates containing Matter/AMIC Law/Project Atlas/Raw Event/Billing/AI/storage-risk terms | 79 strings across 16 files | review_queue_pending |
| COPY-SCAN-05 | `Law Firm OS` in `apps/web/src` | 2 raw matches | review_queue_pending |
| COPY-SCAN-06 | storage-risk terms `signed URL`, `object key`, `file path` in string candidates | 0 matches | pass_for_storage_terms |
| COPY-SCAN-07 | App source files modified by this audit | 0 files | pass_no_code_change |

## Candidate Review Queue

These rows are not all confirmed violations. They are the copy surfaces that
need T01 policy, T02 glossary, and Wave 1 screen-scope decisions before code
cleanup.

| Candidate ID | Source | Candidate text or pattern | Required disposition |
| --- | --- | --- | --- |
| COPY-CAND-01 | `apps/web/src/i18n.js` | `Matter 프로필`, `Matter Profiles`, `Matter Analytics` | Decide whether uppercase `Matter` is a screen/domain label or product-brand misuse. |
| COPY-CAND-02 | `apps/web/src/i18n.js` | `AMIC Law`, `Project Atlas`, `Raw Event`, `Raw 이벤트` | Decide whether demo/product analytics copy stays in Wave 1 or is replaced by matter-domain copy. |
| COPY-CAND-03 | `apps/web/src/components/MatterLogo.jsx` | image alt `AMIC Law` | Confirm whether firm-logo alt text is allowed while UI brand remains `matter by AMIC`. |
| COPY-CAND-04 | `apps/web/src/components/ProfilesSurface.jsx` | `Law Firm OS API` in visible copy | Replace or classify because glossary forbids `Law Firm OS` as user-facing product brand. |
| COPY-CAND-05 | `apps/web/src/components/MatterModal.jsx` | `Generate Chart with AI` and other AI copy | Confirm Wave 1 AI-off treatment or remove/hide from Wave 1 user path. |
| COPY-CAND-06 | `apps/web/src/components/Shell.jsx` and `docs/data` backed surfaces | `Billing`, `Project Atlas`, `[Matter]` event labels | Classify as demo analytics copy, Wave 1 domain copy, or cleanup target. |
| COPY-CAND-07 | `apps/web/src/styles.css` | font-family names `Pretendard Matter`, `SUITE Matter` | Likely technical font-family naming, but should be excluded explicitly from user-facing product copy checks. |

## Mechanical Passes

| Pass ID | Evidence |
| --- | --- |
| COPY-PASS-01 | Old UI brand phrase `matter by AMIC Law` is absent from `apps/web/src`. |
| COPY-PASS-02 | `MatterLogo` aria-label already uses `matter by AMIC`. |
| COPY-PASS-03 | No `signed URL`, `object key`, or `file path` strings were found in the copy-candidate set. |
| COPY-PASS-04 | This audit did not modify app source files. |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L4-W05-T01 | Owner must choose Korean-only or bilingual policy. |
| Wave 1 screen scope | Decide which current analytics/demo surfaces are in Wave 1 user path. |
| Copy cleanup | Apply approved glossary decisions to `apps/web/src`. |
| Rendered UI validation | Run actual UI/render checks after copy cleanup. |
| Final evidence package | Re-run grep/audit, capture outputs, and update closeout only after source changes are approved. |
