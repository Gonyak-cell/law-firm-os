# MR-000 source-merge gate split acceptance

- Status: `DONE`
- Decision time: `2026-07-16T04:33:04Z`
- Owner decision: source merge and deployment approval are separate gates
- Integration branch at decision: `codex/integration/forest-v0.1.17`
- Integration HEAD at decision: `9b40b843e9e004ae63f7336556add99cd70acf3c`
- Product source SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
- Remote main at decision: `fdd1e34a42ee11ad1e5049647048471be772f381`

## Allowed now

- Open a PR from `codex/integration/forest-v0.1.17` to `main`.
- Require the protected-branch `HRX rollout validation` check to pass.
- Merge source using the repository-supported merge-commit method.
- Record PR and exact remote main merge SHA as source-integration evidence.

## Still blocked

- Treating either unsigned Windows artifact as a distributable or released artifact.
- `MR-003~006` exact-main release packaging, tag, artifact publication, or release receipt.
- `DP-001~007` internal distribution, AWS staging/production, provider write, migration, public release, go-live, or post-deploy observation.
- Any claim that source merge implies Authenticode, release, deployment, production, or go-live PASS.

QA-006 remains `BLOCKED_AUTHENTICODE`: native Windows behavior is PASS, while the installer and executable remain `NotSigned`. No product source, package, tag, AWS resource, provider, or production data was changed by this decision.
