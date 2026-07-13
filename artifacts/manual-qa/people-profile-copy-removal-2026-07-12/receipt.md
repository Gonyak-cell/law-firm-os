# People Profile Copy Removal QA

- Date: 2026-07-12
- Surface: packaged web renderer used by `matter.app`
- Scope: shared `EmployeeProfile` for every roster member
- Profiles checked: 10 synthetic QA members
- Profile kinds covered: attorney, CPA, Deal Advisory

## Result

- `출처` matches: 0
- `비고` matches: 0
- `권한이 없는 정보는 숨깁니다.` matches: 0
- Verdict: PASS

The Chromium run opened each roster row and inspected the rendered People detail panel. Source and note fields remained present in the mocked API payload to prove the UI omitted them rather than relying on absent data.

## Debugging Hypotheses

1. **Only Kim Yang-tae might change.** Rejected: the removed copy lived in the shared `EmployeeProfile` renderer, and all ten rendered profiles excluded it.
2. **The headings might disappear only when source data is empty.** Rejected: every QA profile carried populated `source_refs` and `source_notes`, while the rendered panels still excluded all three texts.
3. **The packaged renderer might still contain stale copy.** Rejected: the rebuilt package asset scan found zero matching files, and the packaged CSS/JS-backed Chromium run found zero rendered matches.

## Boundaries

- Compensation step-up behavior remains intact; only the generic explanatory copy was removed.
- The API source metadata remains intact and is no longer displayed in this profile surface.
- `matter.app` was rebuilt and ad-hoc signed for local QA.
- DMG creation remains blocked by the managed sandbox's `hdiutil` device restriction.
- No public-release, notarization, or go-live claim is made.
