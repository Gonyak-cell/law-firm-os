# People roster contact-column manualQa

> Release hardening update (2026-07-13): the packaged-contact observations below are historical local QA evidence. They are not claims about the formal release artifacts, which exclude the private contact source and use an explicit runtime-only configuration boundary.

Overall verdict: **PARTIAL**

The source contract, workbook matching receipt, no-listener runtime projection, preserved reporting-line data, packaged markers, dependency boundary, and privacy boundary pass. The real HTTP suite cannot bind loopback in this sandbox, and no fresh packaged GUI/browser screenshot or action log was available. Those environment evidence gaps remain failures; the workbook case is no longer blocked.

## surfaceEvidence

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| S-01 | C-UI-HEADER-FALLBACK | Web source contract and UI regression assertions | `node apps/web/test/ui-regression.test.mjs` | PASS | A01 |
| S-02 | C-RUNTIME-CONTACT-PROJECTION | Direct HRX runtime handler, data-shaped | `node --input-type=module` driver using `createFileHrxStore`, migrations, roster reconciliation, `createHrxRuntimeContext`, and `handleHrxApiRequest` for `/api/hrx/employees` | PASS | A02 |
| S-03 | C-REPORTING-LINE-PRESERVED | Direct HRX org-chart handler and source contract | Same no-listener driver for `/api/hrx/org-chart`; `node scripts/validate-lcx-hrx-sft-roster-source.mjs` | PASS | A01, A02 |
| S-04 | C-PACKAGED-SOURCE-CURRENT | Packaged Electron renderer/runtime bundle | Node marker/phone-literal scan under `apps/desktop/dist/mac/matter.app/Contents/Resources/app`; `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app` | PASS — API-only contact source, 9 packaged contacts, 1 missing relative to 10 roster members, renderer phone-literal scan 0 | A04, A12 |
| S-05 | C-WORKBOOK-STABLE-MATCH | User-provided AMIC/PETRA contact workbook | Inspect `artifacts/manual-qa/people-roster-contact-2026-07-12/receipt.md`; corroborate with the checked-in roster structural audit | PASS — fresh receipt records import/render, source hash/range, unique email/name matching for 9 rows, and one missing contact | A05, A07, A10, A11 |
| S-06 | C-RENDERED-PEOPLE-TABLE | Packaged Matter app People current-employees table | Fresh GUI/browser action and screenshot were attempted via available local evidence paths; `stat` freshness check was run on the only candidate screenshot | FAIL — no fresh GUI artifact; Computer Use approval/callable browser was unavailable | A06 |
| S-07 | C-HTTP-TRANSPORT | HTTP HRX API suite | `node --test apps/api/test/hrx-runtime-api.test.js` | FAIL — test setup blocked by `listen EPERM` on `127.0.0.1`; 27 tests did not execute | A03 |
| S-08 | C-TYPE-SYNTAX | Web/compiler and changed JS modules | `npm --workspace apps/web run typecheck`; four `node --check` invocations for changed API/test/validator modules | PASS | A01 |
| S-09 | C-NO-NEW-DEPENDENCY | Repository package manifests and lockfiles | `git diff --name-only -- package.json apps/web/package.json apps/api/package.json pnpm-lock.yaml package-lock.json yarn.lock` | PASS | A09 |
| S-10 | C-REVIEW-PII-BOUNDARY | Fresh QA artifacts | `rg -n -P '010[- .]?\\d{4}[- .]?\\d{4}|\\b\\d{3}[- .]?\\d{3,4}[- .]?\\d{4}\\b' artifacts/manual-qa/people-roster-contact-2026-07-12` | PASS | A08 |

## adversarialCases

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| A-01 | C-MISSING-CONTACT | Missing source contact | Preserve the missing value as null/empty at runtime and render `미등록`; do not invent a phone value | PASS for the verified source/runtime/UI mapping contract | A01, A02 |
| A-02 | C-MANAGER-SEPARATION | Column substitution must not erase reporting lines | Main table uses `연락처`; org chart/detail surfaces retain manager IDs/names and the org-chart `상사` annotation | PASS | A01, A02, A04 |
| A-03 | C-STABLE-KEY-MATCH | Duplicate or ambiguous email/name match | Reject or surface ambiguity; never merge a workbook row into the wrong employee | PASS — receipt records unique work-email/name matching for all 9 imported rows; checked-in roster audit also has zero duplicate stable keys | A05, A07, A10, A11 |
| A-04 | C-PACKAGE-STALE-DATA | Stale packaged renderer/runtime or renderer PII leakage | Current package must contain contact field/header markers, retain manager markers, use API-only contact data, and ship zero renderer phone literals | PASS | A04, A12 |
| A-05 | C-EMPTY-CONTACT-NONINVENTION | Empty/whitespace contact value | Map empty contact to `미등록` and keep the underlying runtime value missing | PASS for source/runtime mapping; rendered screen remains covered by S-06 | A01, A02 |
| A-06 | C-PII-REVIEW-SAFETY | Raw phone/email leakage in QA evidence | Review artifacts and messages contain counts/booleans only, never raw contact values | PASS | A08 |
| A-07 | C-CJK-RENDERING | Korean header/wrapping in the actual rendered table | `연락처` is visible, aligned, and not clipped or replaced by `상사` | FAIL — no fresh rendered screenshot/action log available | A06 |
| A-08 | C-HTTP-READ-PATH | Real HTTP GET transport | `/api/hrx/employees` returns HTTP 200 with the contact field and missing-contact row | FAIL — loopback listener denied before request execution | A03 |

## artifactRefs

| id | kind | description | path |
|---|---|---|---|
| A01 | test-log | Fresh UI regression, typecheck, roster validator, and syntax-check results plus static source observations | `artifacts/manual-qa/people-roster-contact-2026-07-12/01-static-contracts.md` |
| A02 | runtime-json | Fresh no-listener HRX employee/org-chart handler result with sanitized counts | `artifacts/manual-qa/people-roster-contact-2026-07-12/02-direct-runtime.json` |
| A03 | blocker-log | Fresh HTTP suite failure showing loopback `EPERM` setup blocker | `artifacts/manual-qa/people-roster-contact-2026-07-12/03-http-suite-blocker.md` |
| A04 | package-inspection | Fresh packaged marker scan and strict local code-sign verification | `artifacts/manual-qa/people-roster-contact-2026-07-12/04-packaged-marker-inspection.json` |
| A05 | workbook-reassessment | Fresh receipt-based reassessment of workbook import and stable-key matching | `artifacts/manual-qa/people-roster-contact-2026-07-12/05-workbook-prerequisite.md` |
| A06 | blocker-log | Fresh rendered-UI availability/freshness evidence | `artifacts/manual-qa/people-roster-contact-2026-07-12/06-rendered-ui-availability.md` |
| A07 | structural-json | Fresh source-roster uniqueness/contact/manager count audit | `artifacts/manual-qa/people-roster-contact-2026-07-12/07-structural-roster-audit.json` |
| A08 | privacy-scan | Fresh scan confirming no phone-like values in QA artifacts | `artifacts/manual-qa/people-roster-contact-2026-07-12/08-qa-artifact-privacy-scan.md` |
| A09 | dependency-check | Fresh package-manifest/lockfile diff check | `artifacts/manual-qa/people-roster-contact-2026-07-12/09-dependency-check.md` |
| A10 | prior-receipt | Prior executor receipt inspected and claims independently rechecked where artifacts were available | `artifacts/manual-qa/people-roster-contact-2026-07-12/receipt.md` |
| A11 | reassessment | Fresh reassessment resolving the workbook evidence-location blocker | `artifacts/manual-qa/people-roster-contact-2026-07-12/10-workbook-reassessment.md` |
| A12 | package-rebuild-scan | Independent corroboration of API-only packaged contact source, counts, and renderer phone-literal scan | `artifacts/manual-qa/people-roster-contact-2026-07-12/12-packaged-api-only-rebuild.md` |

No product files were edited. Unrelated pre-existing worktree changes were left untouched.
