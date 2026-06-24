# LCX-PPL Current Evidence Baseline

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`  
Captured at HEAD: `1600e88e9`

## Working Tree Boundary

Branch: `codex/lcx-ppl-tuw-plan`

Pre-existing unrelated working tree changes observed before this baseline:

- `docs/desktop/matter-internal-cloudfront-desktop-production-plan.md`
- `docs/desktop/matter-internal-cloudfront-desktop-tuw-breakdown.md`

Those files are not part of `LCX-PPL-00/01` unless a later TUW explicitly pulls
the desktop lane into scope.

## Validator Baseline

### `npm run sf:client-matter-parity:validate`

Status: `pass`

Observed output:

```text
SF Client/Matter parity validation passed.
salesforce_atlas_png_count: >=894
salesforce_screenshot_inventory: 883 source + 11 derived PNG assets verified
objective_completion_audit: 8 requirements evidence-mapped, completion claim false
current_validation_receipt: 18 commands passed, local evidence only
browser_qa_receipt: 13 routes and 147 checks driven, local claims false
surface_connection_ledger: 14 connected rows verified
track_a_ui_entrypoints: verified
track_b_route_contract_gates: verified
production_or_trust_claim: false
```

### `npm run hro:deel-parity:validate`

Status: `fail`

Observed output:

```text
HRO Deel parity crosswalk validation failed:
- Shell missing People menu label: AI 검토
```

## Evidence Interpretation

| Area | Current Evidence | Baseline State |
| --- | --- | --- |
| Client | SF evidence proves route-backed Client list, account/contact, intake, opportunity, data, report, and import surfaces. | reflected for current LCX-PPL intake |
| Matter | SF evidence proves route-backed Matter list, command, vault, activity, calendar, channel, opening, team, billing, analytics, and guarded actions. | reflected for current LCX-PPL intake |
| People HRX | HRO crosswalk and People UI expose HRX sections for members, documents, leave, approvals, recruiting, lifecycle, policy, audit, analytics, AI, payroll, admin. | partial, validator drift present |
| People legal relationship | Legal people taxonomy, relationship ledger, conflict/ethical-wall UI, and Client/Matter backlinks are not yet proven. | open |
| Claim boundary | SF and HRO evidence keep production/go-live/enterprise trust claims false. | must be preserved |

## Next Required Movement

- `LCX-PPL-01.01`: decide canonical People AI review label.
- `LCX-PPL-01.02`: repair HRO validator drift.
- `LCX-PPL-01.03`: keep future menu/crosswalk drift guarded by validator coverage.

