# matter Desktop Pilot Risk Adjudication

Status: P7 risk-active
Source ledger: `docs/desktop/matter-desktop-loop-tuw-ledger.json`
Scope: `MDT-P7-W02-T01`

## Risk Register

| Risk ID | QA item | owner | severity | mitigation | go/no-go impact |
| --- | --- | --- | --- | --- | --- |
| R-01 | QA-08 Windows native install smoke not run on Darwin | Product/Release owner | Medium | Run Windows native install smoke on a Windows host before external pilot. Current receipt is internal detached-signature manifest only. | No-go for Windows external pilot; no impact to repo-ready internal evidence. |
| R-02 | QA-11 GUI screenshot receipt missing | Product/QA owner | Medium | Capture install, launch, login, logout, tenant switch, cache wipe, file bridge, deep link, and notification screenshots in a supervised pilot session. | No-go for owner-approved pilot evidence. |
| R-03 | QA-12 owner public release decision missing | Product owner | High | Record explicit owner decision packet before public release, production go-live, external pilot, or store publication. | No-go for public release and production go-live. |
| R-04 | Full SBOM not expanded because dependencies are not installed in worktree | Engineering owner | Low | Rerun license audit after dependency install and attach generated SBOM before public release. | No-go for public release; acceptable for repo-ready branch evidence. |

## Summary

No failed automated desktop validator remains open. The residual risks are owner/manual receipt risks and platform-specific pilot risks, not public release approval.
