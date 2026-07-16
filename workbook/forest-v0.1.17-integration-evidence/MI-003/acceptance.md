# MI-003 Acceptance

- TUW: MI-003
- status: DONE
- entry_sha: `903835f762502b32539a891532d26a842157f078`
- product_exit_sha: `903835f762502b32539a891532d26a842157f078` (decision-only TUW)
- selected method: create `codex/integration/forest-v0.1.17` from the accepted candidate lineage, open a new PR to `main`, and use a normal merge commit only after MI-004~MI-007 and QA gates pass
- rejected method: PR #168 is not reused because it targets `codex/leave-search-release-20260713`, not `main`, and its remote head is the older `7717d5cee158fc97056510e8aebc9e0854d34196`
- history boundary: squash and rebase are rejected because they rewrite the commit SHAs bound into the accumulated receipts; force-push, default-branch replacement, and main-next cutover are prohibited
- branch protection: `main` is strict/up-to-date, admin-enforced, and requires `HRX rollout validation`; no merge may bypass this check
- main advance rule: if `origin/main` moves before merge, merge the new `origin/main` into the integration branch without rewriting history, then rerun MI-002 and every affected QA gate
- current graph: MI-002 proved the accepted product candidate is a clean descendant of exact `origin/main` with zero conflicts; no main-next cutover or blanket path resolution is justified
- mutation boundary: no local/remote branch, PR, `main`, release, AWS deployment, or application process was changed in MI-003
- manual_qa: GitHub PR metadata, repository merge policy, and main protection JSON were read through `gh` and checked against the decision receipt
- commands: see `commands.txt`
- tests: see `tests.txt`
- known_limits: this decision does not create the integration branch or PR and does not authorize merge; those remain MI-004 and MR gates
- external_blockers: AWS SSO sign-in is still required for MI-001 live Lambda configuration truth, but it does not alter this Git integration decision
- AI slop review: pass; no product UI or user-facing copy changed
