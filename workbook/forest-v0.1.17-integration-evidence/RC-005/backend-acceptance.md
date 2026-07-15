# RC-005 A/B/C/F backend acceptance

- entry SHA: `931ae4c42ae88f4c9551d4e6377df63fd73d4c82`
- execution worktree: `/private/tmp/lawos-forest-v016-release`
- preserved root checkout: `/Users/jws/Documents/Codex/Law Firm OS`
- preserved root fingerprint: `7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3`
- payroll failure-first: new canonical runtime tests initially 0/3 PASS
- leave failure-first: new rule/XLSX tests initially 9 PASS, 2 FAIL
- targeted acceptance: 102/102 PASS
- migration acceptance: 001-029 fresh, checkpoint upgrades, rerun, rollback, restore, integrity and foreign-key gates PASS
- HTTP acceptance: leave rule write and payroll catalog reject missing or mismatched signed step-up and accept matching purpose/tenant/actor
- privacy acceptance: raw payroll amount and encrypted amount reference absent from API/audit output; upload memo and source document absent from batch view
- lineage acceptance: no root `011~016` restoration and no standalone payroll time snapshot table
- backend checkpoint SHA: `b053fd8ae967c75653dce8b883d40eda69e3d07d`

## Boundaries

- This receipt proves local implementation and targeted runtime/API/migration behavior only.
- It does not claim external payroll provider, bank, tax production write, AWS production traffic, public release or go-live.
