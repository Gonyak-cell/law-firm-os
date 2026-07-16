# QA-008 screenshot manifest acceptance

- Status: `DONE`
- Verdict: `PASS`
- Manifested screenshots: `48`
- QA-004 role/viewport and leave regression screenshots: `39`
- Final formal macOS screenshots: `5`
- Final native Windows screenshots: `4`
- Broken images: `0`
- Overflow findings: `0`
- Legacy UI regressions: `0`
- Stale windows: `0`

QA-004 remains valid because its candidate and the final exact SHA have the same `apps/web` tree and renderer digest. QA-005 and QA-006 were captured directly from final SHA `39ed9571b0e841e1a6480e6875fe7b6658f83465`. The final nine package screenshots were manually inspected after the final builds; both restart screenshots show an authenticated payroll surface rather than a login fallback.
