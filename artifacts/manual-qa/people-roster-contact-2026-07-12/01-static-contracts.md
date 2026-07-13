# People roster contact-column static QA evidence

Date: 2026-07-12
Scope: read-only verification of the completed contact-column change.

## Exact invocations and results

- `node apps/web/test/ui-regression.test.mjs` — exit 0; 28/28 tests passed. The test process also emitted a non-fatal Vite WebSocket `listen EPERM` diagnostic; the assertions still completed and reported zero failures.
- `npm --workspace apps/web run typecheck` — exit 0.
- `node scripts/validate-lcx-hrx-sft-roster-source.mjs` — exit 0; validator verdict `PASS`; roster count 10.
- `node --check apps/api/src/hrx-member-roster-registry.js` — exit 0.
- `node --check apps/api/src/hrx-runtime-context.js` — exit 0.
- `node --check apps/api/test/hrx-runtime-api.test.js` — exit 0.
- `node --check scripts/validate-lcx-hrx-sft-roster-source.mjs` — exit 0.

## Source contract observations

- `PeopleWorkforceDirectory.tsx` renders the current-employees header as `연락처` with the phone icon.
- The table row projection reads `mobile_phone` and falls back to `미등록` when empty.
- The main roster no longer renders the old manager table header/class.
- Manager fields remain in the org-chart projection and org-chart rendering (`manager_employee_id`, `manager_display_name`, and the org-chart `상사` annotation).
- `hrxLocalRoster.ts`, `hrx-member-roster-registry.js`, and `hrx-runtime-context.js` all carry the contact field through the roster/API path.

This artifact contains no raw contact values.
