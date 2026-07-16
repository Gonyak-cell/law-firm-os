# FZ-006 Test Results

| Surface | Result | Fail | Notes |
|---|---:|---:|---|
| Leave, migration, route authz, leave Web | 193/193 PASS | 0 | Reproducible single command |
| Isolated HRX runtime API | 27/27 PASS | 0 | Fresh file store per test process |
| Unique leave/runtime total | 220/220 PASS | 0 | No double-counting |
| Payroll domain | 54/54 PASS | 0 | `packages/hrx/test/payroll-*.test.js` |
| Payroll API and role matrix | 7/7 PASS | 0 | Runtime API 3 plus matrix 4 |
| Payroll Web UI | 3/3 PASS | 0 | Forest workspace contract |
| Desktop runtime | 26/26 PASS | 0 | AWS bridge 23 plus renderer 3 |
| Desktop shell smoke | 18/18 PASS | 0 | Additional coverage, not folded into 26 |
| Global UI regression | 31/31 PASS | 0 | Source-level UI invariants |
| Web TypeScript | PASS | 0 | `npm run typecheck:web` |
| Renderer preparation | PASS | 0 | Vite build and desktop renderer copy |
| Public renderer PII | PASS | 0 | 54 files, 30 protected values, 5 protected photos, values not printed |
| Renderer parity | PASS | 0 | Current and historical SHA-256 identical |
| AI slop changed-file lint | PASS | 0 | No auto-detectable signal |

Historical `340/340` is not used as a current acceptance count because the ended session did not retain an exact, de-duplicated command manifest. The current acceptance number is the auditable unique `220/220` scope above.
