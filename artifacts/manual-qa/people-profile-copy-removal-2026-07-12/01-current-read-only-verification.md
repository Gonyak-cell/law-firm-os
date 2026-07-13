# Current read-only verification

Date: 2026-07-12 Asia/Seoul
Scope: `apps/web/src/people/employees/EmployeeProfile.tsx` and the listed QA hunks only.

## Fresh invocations and observed results

- `npm --workspace apps/web run typecheck` -> exit 0.
- `node --test apps/web/test/ui-regression.test.mjs` -> `1..28`, `# pass 28`, `# fail 0`.
- `node scripts/validate-hrx-ui-api-backed.mjs` -> `HRX UI API-backed validation passed.`
- `node scripts/validate-people-professional-profile.mjs` -> `verdict: PASS`.
- `node --check` on all four listed `.mjs` scripts plus `git diff --check` on all six listed files -> exit 0.
- `npm --workspace apps/web run build` -> exit 0.
- Exact profile literals scanned in both `apps/web/dist` and `apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web/assets`: `title="출처"`, `title="비고"`, and `권한이 없는 정보는 숨깁니다.` each returned `ZERO_FILES`.
- `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app` -> exit 0, valid on disk and satisfies its Designated Requirement.

## In-process runtime checks

Surface: HRX employee-profile handler. Invocation: `authorizeHrxApiRequest -> handleHrxApiRequest GET /api/hrx/employees/:employee_id` for all roster members. Result: 10 members returned; `source_refs`/`source_notes` matched the roster payload for every member with metadata. Kinds observed: attorney 5, cpa 2, deal_advisor 1, no professional profile 2.

Surface: HRX compensation handler. Invocation: `authorizeHrxApiRequest -> authorizeHrxStepUpRequest -> handleHrxApiRequest GET /api/hrx/compensation?employee_id=emp_amic_ytkim`. Missing step-up returned `403 HRX_STEP_UP_REQUIRED`; valid signed step-up returned `200`, one record, `raw_amount_included=false`, no `encrypted_amount_ref`, `employment_contract_id=contract-doc-003`, and `contract_document_ref=DMS:employment-contract-003`.

## Rendered evidence review

The current-attempt `receipt.md` states that Chromium opened all 10 roster rows and scanned the full People detail panel with populated source/note payloads; the non-empty `all-members-profile.png` was visually inspected and contains none of the three forbidden strings. The updated browser-proof source checks `observed.panelText` (the full panel) at lines 237-243 and 271-277. The older checked-in July 7 browser JSON is stale and still contains pre-change assertions that `출처` should be present; it was not used as current proof.

## Limits and residual observations

- Socket-bound API tests and the broader workspace UI command cannot bind localhost in this managed sandbox (`listen EPERM`); the focused 28-test UI slice and direct in-process checks ran successfully.
- Electron Playwright and DMG creation remain sandbox-blocked per the current receipt.
- A package-wide raw-word scan still finds `출처` in unrelated Client/Matter/Candidate/Attendance surfaces. This does not violate the profile-specific criterion. The exact profile literals and the exact generic sentence are absent from both rebuilt renderer bundles.
