# LT-L3-W01-T01 License Audit Report

Checked at: 2026-06-18
Status: audit_completed_push_blocked_pending_human_signature
Review policy: review_waived_by_user

## Scope

This report covers the push-precondition license audit for `docs/ui-reference`
image assets and the shipped local font binaries under `apps/web/public/fonts`.
It does not approve a push to any shared or public remote.

Authoritative local rules:

- `docs/ui-workstream-conventions.md` requires third-party logos, screenshots,
  and crops to be license-checked before commit or push.
- `docs/ui-workstream-conventions.md` and `docs/ui-reference/README.md` require
  Mobbin-derived reference imagery to remain private-repo-only and to be
  re-reviewed before any push to a shared or public remote.
- Pretendard and SUITE font binaries must ship with license text next to the
  OTF files.

## Push Verdict

| Item | Verdict |
| --- | --- |
| Current push allowance | blocked_pending_human_signature |
| Shared/public remote push | prohibited_until_owner_or_legal_signature |
| Private remote push | conditionally_allowed_only_after_private_remote_confirmation_and_owner_or_legal_signature |
| Required adjudicator | owner/legal reviewer |
| Adjudicator date | not_signed_as_of_2026-06-18 |
| Reason | Mobbin-derived Amplitude reference images are third-party reference screenshots; local rules require re-review before shared/public push. |

No asset row below has an undecided disposition. Rows requiring approval are
explicitly marked `private-repo-only_pending_human_signature`.

## Inventory Summary

Image inventory command:

```bash
find docs/ui-reference -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' \) | wc -l
```

Measured output: `90`

| Directory | Count | Disposition |
| --- | ---: | --- |
| `docs/ui-reference/amplitude-feb-2025/contact-sheets` | 8 | private-repo-only_pending_human_signature |
| `docs/ui-reference/amplitude-feb-2025/visual-parity` | 78 | private-repo-only_pending_human_signature |
| `docs/ui-reference/brand` | 4 | private-repo-only_pending_human_signature |
| Total | 90 | push_blocked_pending_human_signature |

## Font License Placement

| Font | Local OTF directory | Local license file | Upstream license basis | Checked at |
| --- | --- | --- | --- | --- |
| Pretendard | `apps/web/public/fonts/pretendard` | `apps/web/public/fonts/pretendard/OFL.txt` | `https://github.com/orioncactus/pretendard/blob/main/LICENSE` states SIL Open Font License 1.1 and Reserved Font Name `Pretendard`. | 2026-06-18 |
| SUITE | `apps/web/public/fonts/suite` | `apps/web/public/fonts/suite/OFL.txt` | `https://github.com/sun-typeface/SUIT/blob/main/LICENSE` states SIL Open Font License 1.1 and Reserved Font Name `SUIT`. | 2026-06-18 |

Local placement command:

```bash
find apps/web/public/fonts -type f \( -iname 'OFL*' -o -iname 'LICENSE*' \) | sort
```

Measured output:

```text
apps/web/public/fonts/pretendard/OFL.txt
apps/web/public/fonts/suite/OFL.txt
```

## Image Inventory

| Row | Path | Source class | Disposition |
| --- | --- | --- | --- |
| IMG-001 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-01.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-002 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-02.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-003 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-03.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-004 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-04.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-005 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-05.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-006 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-06.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-007 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-07.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-008 | `docs/ui-reference/amplitude-feb-2025/contact-sheets/amplitude-contact-08.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-009 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-00-render-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-010 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-00-render-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-011 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-00-render-mobile-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-012 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-00-render-mobile-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-013 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p1-global-search-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-014 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p1-loading-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-015 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p10-dark-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-016 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p10-dark-templates-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-017 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p10-theme-preferences-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-018 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p2-auth-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-019 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p2-login-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-020 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p2-onboarding-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-021 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p2-signup-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-022 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p2-verify-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-023 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p3-annotation-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-024 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p3-home-tour-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-025 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p3-new-navigation-tour-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-026 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p4-content-archive-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-027 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p4-content-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-028 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p4-visual-labeling-launch-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-029 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p5-profiles-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-030 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p5-save-cohort-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-031 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p5-user-profiles-list-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-032 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-analytics-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-033 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-chart-type-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-034 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-data-table-empty-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-035 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-data-table-picker-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-036 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-metric-named-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-037 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-metric-picker-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-038 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-metric-preview-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-039 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-metric-untitled-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-040 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-save-chart-card-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-041 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-save-chart-report-dropdown-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-042 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-save-chart-report-selected-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-043 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-save-chart-suggest-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-044 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-save-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-045 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-share-history-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-046 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-share-invite-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-047 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-share-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-048 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p6-share-toast-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-049 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p7-create-dashboard-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-050 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p7-dashboard-subscribe-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-051 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p7-dashboard-subscribe-success-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-052 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p7-dashboard-template-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-053 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p7-dashboards-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-054 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p7-generate-chart-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-055 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-ask-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-056 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-ask-feedback-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-057 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-ask-retention-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-058 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-cohorts-replay-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-059 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-action-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-060 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-adding-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-061 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-builder-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-062 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-detail-activity-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-063 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-detail-settings-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-064 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-overview-cards-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-065 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-setup-delivery-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-066 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-setup-goals-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-067 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-setup-site-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-068 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-setup-variants-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-069 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-start-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-070 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiment-visual-editor-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-071 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-experiments-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-072 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-new-experiment-advanced-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-073 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-new-experiment-blank-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-074 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-new-experiment-filled-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-075 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-new-experiment-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-076 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-opening-tab-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-077 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p8-session-replay-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-078 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-admin-desktop-ko.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-079 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-feedback-comment-widget-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-080 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-feedback-filled-widget-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-081 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-feedback-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-082 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-feedback-rating-widget-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-083 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-feedback-thanks-widget-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-084 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-profile-picture-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-085 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-profile-settings-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-086 | `docs/ui-reference/amplitude-feb-2025/visual-parity/phase-p9-remove-member-modal-desktop-en.png` | Mobbin-derived Amplitude reference | private-repo-only_pending_human_signature |
| IMG-087 | `docs/ui-reference/brand/matter-by-amic-after-login-dock.png` | own-brand matter/AMIC asset | private-repo-only_pending_human_signature |
| IMG-088 | `docs/ui-reference/brand/matter-by-amic-initial-login-flow.png` | own-brand matter/AMIC asset | private-repo-only_pending_human_signature |
| IMG-089 | `docs/ui-reference/brand/matter-by-amic-logo.png` | own-brand matter/AMIC asset | private-repo-only_pending_human_signature |
| IMG-090 | `docs/ui-reference/brand/matter-logo-only.png` | own-brand matter/AMIC asset | private-repo-only_pending_human_signature |

## Open Items

| Item | Owner | Required before push |
| --- | --- | --- |
| Private remote confirmation | repo owner | confirm target remote is private and access-controlled |
| Third-party reference image re-review | owner/legal reviewer | sign off on Mobbin-derived Amplitude reference handling |
| Shared/public push decision | owner/legal reviewer | explicit written approval or removal/exclusion plan |

Until those items are complete, LT-L3-W01-T01 remains
`blocked_pending_human_signature`.
