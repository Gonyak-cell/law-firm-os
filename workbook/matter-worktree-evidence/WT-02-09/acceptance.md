# WT-02-09 acceptance

- Result: PASS (desktop client tests, manual runtime-client QA)
- Desktop writes allow only the seven explicit Worktree POST/PATCH/DELETE route shapes.
- Unknown Worktree subpaths, wrong methods, and generic Matter PATCH remain blocked before fetch.
- Every allowed write still requires a signed desktop session and a valid JSON object body.
- Existing profile/stakeholder allowlist behavior remains unchanged.
- No wildcard path or method grant was introduced.
- Canonical evidence commit: `a448da8c9`; the historical `.git/index.lock` wait is resolved.
