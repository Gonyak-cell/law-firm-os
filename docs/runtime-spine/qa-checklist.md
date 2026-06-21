# Runtime Spine QA Checklist

Status: G0 checklist
Date: 2026-06-21

## Per-PR Checklist

| Check | Required Evidence |
| --- | --- |
| Scope is TUW-bound | changed TUW IDs recorded in `runtime-spine-ledger.json` |
| Plan-Do-Check-Act loop is visible | TUW `loop_stage` and evidence refs updated |
| Existing validators are not weakened | before/after command list in evidence index |
| Tenant/auth/audit impact is named | RS impact section in PR body or evidence file |
| Negative tests exist | at least one failure-path test per runtime PR |
| No premature launch claim | launch/go-live claim remains false unless external receipts exist |
| Future domains stay locked | Portal/M365/HR/AI/Vault sync guards remain explicit |

## G0 Checklist

| Item | Status |
| --- | --- |
| Charter exists | closed |
| Non-weakening policy exists | closed |
| Boundary map exists | closed |
| Decision register exists | closed |
| Runtime Spine ledger exists | closed |
| Evidence index exists | closed |
| Baseline measurement exists | closed |
| Plan validator exists | closed |
| Readiness validator exists | closed |

## Regression Commands

G0 uses the following minimum regression sweep:

```bash
npm run runtime-spine:plan:validate
npm run runtime-spine:readiness:validate
npm run runtime-readiness:contract:validate
npm run runtime-readiness:validate
npm run client-matter:cmp-v1:validate
npm run matter-vault:r4:validate
```

Broader gates add API, web, build, root test, and domain-specific validators as runtime code opens.
