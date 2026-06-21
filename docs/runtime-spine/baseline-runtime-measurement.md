# Baseline Runtime Measurement

Date: 2026-06-21
Baseline: PR #73 merge commit `41268c4becac7d06948d10c173d30635e108c5e1`

## Measurement Method

Commands used for the G0 baseline:

```bash
git status --short --branch
git log --oneline -8 --decorate
find apps/api/src/routes -maxdepth 3 -type f | sort
find apps/api/test -maxdepth 3 -type f | sort
rg --files docs contracts scripts packages apps tests | rg 'runtime|readiness|matter-vault|cmp-v1|hrx|audit|auth|master-data'
```

## Current State

| Check | Result |
| --- | --- |
| Baseline branch | `codex/hrx-release-go-no-go-package` |
| Baseline HEAD | `41268c4becac7d06948d10c173d30635e108c5e1` |
| Runtime-readiness contract | present |
| Runtime Spine lane | newly opened by G0 plan |
| API route files | 13 route files under `apps/api/src/routes` |
| Matter-Vault R4 launch claim | false |
| Runtime-ready candidate claim | false |

## Interpretation

The repo already contains several mixed runtime lanes, especially HRX and Matter-Vault R4. G0 does not flatten those lanes into a single runtime-ready claim. Instead, it introduces a Runtime Spine ledger so RS-1 through RS-6 can be implemented and verified without weakening existing lane-specific validators.

## Baseline Risks

| Risk | G0 Control |
| --- | --- |
| descriptor evidence mistaken for runtime proof | non-weakening policy and ledger status |
| route count drift | route inventory captured in boundary map |
| owner decision gaps hidden by implementation | decision register uses timed deferral or owner-required status |
| launch/go-live claim confusion | evidence index keeps launch claim false |
