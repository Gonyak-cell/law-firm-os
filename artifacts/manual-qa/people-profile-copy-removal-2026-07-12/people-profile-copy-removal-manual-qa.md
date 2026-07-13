# manualQa: People employee-profile copy removal

Date: 2026-07-12 Asia/Seoul
Overall scoped verdict: **PASS**. The profile-specific behavior passes for attorney, CPA, Deal Advisory, and the two roster members without a professional profile. Compensation step-up and API source metadata remain intact. No public-release or go-live claim.

## surfaceEvidence

| Scenario | Criterion reference | Surface | Exact invocation | Verdict | Artifact refs |
|---|---|---|---|---|---|
| SE-01 | C1 / `출처` | Shared `EmployeeProfile` source and built renderer | `rg -n -S -F -e '출처' apps/web/src/people/employees/EmployeeProfile.tsx`; `npm --workspace apps/web run build`; scan both renderer asset trees for `title="출처"` | PASS | A1, A2 |
| SE-02 | C1 / `비고` | Shared `EmployeeProfile` source and built renderer | `rg -n -S -F -e '비고' apps/web/src/people/employees/EmployeeProfile.tsx`; scan both renderer asset trees for `title="비고"` | PASS | A1, A2 |
| SE-03 | C1 / exact generic sentence | Shared `EmployeeProfile` source and built renderer | `rg -n -S -F -e '권한이 없는 정보는 숨깁니다.' apps/web/src/people/employees/EmployeeProfile.tsx`; scan both renderer asset trees for the exact sentence | PASS | A1, A2 |
| SE-04 | C1 / attorney profiles | Chromium People employee detail panel; 5 attorney roster members | Browser proof invocation: `node scripts/run-people-professional-profile-browser-proof.mjs`; full-panel check is `observed.panelText` and the current receipt records the 10-row Chromium run | PASS | A2, A3 |
| SE-05 | C1 / CPA profiles | Chromium People employee detail panel; 김양태 and 박서영 | Same browser proof invocation; shared renderer mount and current 10-row receipt | PASS | A2, A3 |
| SE-06 | C1 / Deal Advisory profile | Chromium People employee detail panel; 조우상 | Same browser proof invocation; shared renderer mount and current 10-row receipt | PASS | A2, A3 |
| SE-07 | C1 / all remaining roster profiles | Chromium People employee detail panel; all 10 rows, including 윤태리 and 이예진 with no professional profile | All-row smoke invocation: `node scripts/smoke-people-org-chart-no-hierarchy-copy.mjs`; current receipt records the Chromium full-panel traversal | PASS | A2, A3 |
| SE-08 | C2 / source metadata preservation | HRX in-process employee-profile handler | `authorizeHrxApiRequest -> handleHrxApiRequest GET /api/hrx/employees/:employee_id` for all 10 roster members; compare returned `professional_profile.source_refs` and `.source_notes` to roster | PASS | A1, A4 |
| SE-09 | C3-C4 / compensation step-up | HRX in-process compensation handler and `EmployeeProfile` compensation branch | Missing token: `authorizeHrxStepUpRequest`; valid token: `handleHrxApiRequest GET /api/hrx/compensation?employee_id=emp_amic_ytkim` | PASS | A1, A5 |
| SE-10 | C5 / local packaged renderer | `matter.app` renderer bundle | `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app`; scan exact profile literals and generic sentence | PASS | A1, A6 |

## adversarialCases

| Scenario | Criterion reference | Adversarial class | Expected behavior | Verdict | Artifact refs |
|---|---|---|---|---|---|
| AC-01 | C1-C2 | Populated metadata, not empty-data masking | `source_refs` and `source_notes` remain in API payload while none of the forbidden strings render in the profile panel | PASS | A1, A2, A4 |
| AC-02 | C1 | Full-panel scan versus subsection-only scan | The exact three strings are checked against `observed.panelText`, including property fields and compensation/permission states | PASS | A1, A3 |
| AC-03 | C1 | Shared-renderer coverage beyond 김양태 | Attorney, CPA, Deal Advisory, and no-profile rows use the same `EmployeeProfile`; no member-specific condition is present | PASS | A1, A2, A3 |
| AC-04 | C3-C4 | Missing fresh step-up | Compensation request is denied with `403 HRX_STEP_UP_REQUIRED`; no sensitive record is returned | PASS | A1, A5 |
| AC-05 | C3-C4 | Valid step-up and sensitive-field leakage | Valid signed step-up returns only a masked reference and contract linkage; raw amount and encrypted reference remain absent | PASS | A1, A5 |
| AC-06 | Evidence claim boundary | Package-wide raw-word scan for `출처` | Unrelated Client/Matter/Candidate/Attendance surfaces still contain the generic word `출처`; only the profile-specific literals are required to be absent | FAIL (claim correction; scoped goal unaffected) | A1, A7 |
| AC-07 | Runtime environment | Socket-bound API/Electron packaged interaction | If the sandbox forbids localhost/Electron, record the blocker instead of inferring a live PASS | PARTIAL | A1, A8 |

## artifactRefs

| ID | Kind | Description | Path |
|---|---|---|---|
| A1 | verification log | Current read-only commands, runtime checks, limits, and observed results | `artifacts/manual-qa/people-profile-copy-removal-2026-07-12/01-current-read-only-verification.md` |
| A2 | receipt | Current-attempt Chromium receipt stating all 10 roster rows were opened and full panels inspected | `artifacts/manual-qa/people-profile-copy-removal-2026-07-12/receipt.md` |
| A3 | screenshot | Non-empty rendered People detail-panel screenshot inspected during QA | `artifacts/manual-qa/people-profile-copy-removal-2026-07-12/all-members-profile.png` |
| A4 | source/data evidence | HRX roster and in-process handler comparison recorded in A1 | `docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json` |
| A5 | source/test evidence | Compensation handler, step-up middleware, client, and `EmployeeProfile` branch recorded in A1 | `apps/api/src/hrx-runtime-context.js` |
| A6 | packaged artifact | Locally rebuilt and ad-hoc-signed `matter.app` renderer bundle | `apps/desktop/dist/mac/matter.app` |
| A7 | residual scan | Package-wide raw-word finding in unrelated product surfaces | `apps/web/dist/assets/index-XGBcY10a.js` |
| A8 | blocker log | Managed-sandbox listener/Electron/DMG limitations and stale-proof warning | `.omo/evidence/people-profile-copy-removal-gate-review.md` |

## Boundary

The old `docs/lazycodex/evidence/matter-web/artifacts/people-professional-profile-browser-proof-2026-07-07.json` is stale and contains pre-change `출처` expectations; it is not used to support the current PASS. No product files were edited by this QA review.
