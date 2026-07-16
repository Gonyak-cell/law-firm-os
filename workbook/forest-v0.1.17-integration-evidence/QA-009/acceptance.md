# QA-009 final QA report acceptance

- Status: `DONE`
- Report verdict: `SOURCE_MERGE_ELIGIBLE_RELEASE_BLOCKED`
- Product source SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
- Product source tree: `42bb94f745b329053cc14325ef1251fc7d8475cd`
- Product source dirty at build: `false`
- Final renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
- Renderer files: `28`
- Evidence links checked: `20/20`
- Missing evidence links: `0`

QA-001 through QA-005, QA-007, and QA-008 are complete and PASS. QA-006 proves native Windows install, launch, login, leave, payroll, restart, and uninstall, but remains BLOCKED because the installer and unpacked executable are both `NotSigned`. Under the 2026-07-16 owner gate split, the integration branch is eligible for a PR and `main` source merge; Windows distribution, package release, deployment, production, and go-live remain blocked.

The complete counts, commands, artifact hashes, limitations, and blocker adjudication are recorded in `final-qa-report.md` and `receipt.json`.
