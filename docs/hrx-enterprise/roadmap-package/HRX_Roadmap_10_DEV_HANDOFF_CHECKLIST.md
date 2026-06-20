# HRX Dev Handoff Checklist

## Before implementation

- [ ] Confirm base branch: `codex/lawos-current-work-snapshot`
- [ ] Confirm no direct R4/go-live/enterprise-ready claim
- [ ] Confirm current readiness boundary remains documented
- [ ] Create feature branch according to `04_PR_SEQUENCE.md`
- [ ] Link target TUWs from `03_TUW_BACKLOG.csv`

## During implementation

- [ ] Add/modify source files listed in TUW target files
- [ ] Add unit tests
- [ ] Add API negative tests for authz/tenant/step-up where relevant
- [ ] Add audit assertions for sensitive routes
- [ ] Update validator scripts
- [ ] Update traceability matrix

## Before PR

- [ ] `npm test`
- [ ] relevant `hrx:*:validate` command
- [ ] `git diff --check`
- [ ] No raw secrets, no real HR data, no external provider call
- [ ] No R4/go-live language unless final release gate explicitly permits it
