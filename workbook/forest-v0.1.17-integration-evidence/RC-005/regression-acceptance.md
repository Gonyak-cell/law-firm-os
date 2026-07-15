# RC-005-G full regression and port acceptance

- TUW: `RC-005-G`
- status: `DONE`
- entry SHA: `051344d96695855ec1546d6bb5e20b08d8d4e012`
- implementation/validator exit SHA: `cc5f7f873a10662b60092087d615a07314f799e9`
- execution worktree: `/private/tmp/lawos-forest-v016-release`
- preserved root checkout: `/Users/jws/Documents/Codex/Law Firm OS`
- changed files: `scripts/validate-rc005-port-crosswalk.mjs` and this RC-005 evidence packet
- commands: `regression-commands.txt`
- test result: HRX leave/payroll `185/185`, API/authz/profile `322/322`, Web `142 PASS / 1 existing skip / 0 fail`, Desktop smoke `97/97`, migration `19/19`, all named authz/security/PII/migration validators PASS
- port crosswalk: `31/31` unique paths in 6 groups; 26 in-place selective ports, 5 canonical replacements, unimplemented 0
- manual QA: LV03/LV04/LV05 browser receipts, packaged leave `10/10`, signed 서지원 profile projection, and exact Mac/Windows renderer parity remain bound to product source `75f10995`; between that SHA and the validator exit SHA the only `apps/packages/scripts` change is this validator
- evidence hashes: port row crosswalk `52b546dc68e9151333c43561d4089eb116f35c9d6b7da9edb17716523ba7a46e`; packaged renderer `b73aac5c2686e1650d2a7685a8d4b790a45786fe4363029ffbfc5da9899c1a96`; packaged leave receipt `4b4d8a51acf4b7bcb8948f6c0f62f655165941ef2e4ffde910439e1e0ac72967`; packaged profile receipt `6347252b5a78f5009cb0465d58d05dcc3db522e90ef1ed2c8914683de80182c5`
- root preservation: tracked 56, untracked 21, status 77; two consecutive fingerprints equal `7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3`
- AI slop review: pass; product UI was not changed in RC-005-G and the current changed-file scan reports no automatic signals
- known limits: the one Web skip is the pre-existing `Matter profile renders the right contract for every Matter Code family`; formal macOS signing/notarization/Gatekeeper, Windows native install/AuthentiCode, 6-role x 5-viewport final QA, origin/main integration, and external deployment remain later TUWs
- external blockers: none for RC-005; production provider/bank/tax writes and go-live remain approval-gated by the Goal

## Canonical replacements

The five intentionally absent root paths are not missing implementations:

| Root-selected path | Current Forest owner |
|---|---|
| `packages/hrx/src/migrations/011_hrx_payroll_items.sql` | `026_hrx_payroll_catalog_assignments.sql` |
| `packages/hrx/src/migrations/012_hrx_payroll_profiles.sql` | `021_hrx_payroll_runtime.sql`, `023_hrx_payroll_profile_units.sql`, `026_hrx_payroll_catalog_assignments.sql` |
| `packages/hrx/src/migrations/013_hrx_payroll_time_inputs.sql` | `027_hrx_attendance_approval_receipts.sql`, canonical payroll input snapshot service |
| `packages/hrx/src/migrations/015_hrx_leave_accrual_rule_versions.sql` | `028_hrx_leave_accrual_rule_versions.sql`, `029_hrx_leave_accrual_rule_version_index.sql` |
| `packages/hrx/src/leave/manual-adjustment-file.js` | the single accrual service, occurrence upload batch service, and hardened XLSX parser |

The complete path-by-path implementation and test mapping is stored in `port-crosswalk.json`.
