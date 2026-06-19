# L3 CI/CD And Deployment Pipeline Blocker Survey

Status: blocked_pending_remote_repo_ci_container_staging_and_rollback_evidence

Work package: LT-L3-W02

Terminal TUW: LT-L3-W02-T04

Gate binding: G4, L3-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T13:15:44Z

## Boundary

This survey records why LT-L3-W02 cannot close from current repo evidence. It
does not create a remote repository, does not create CI/CD, does not build or
push containers, does not deploy staging or production, and does not execute a
rollback.

## Dependency State

| Dependency | Current audit status | Impact on W02 |
| --- | --- | --- |
| LT-L1-W06 | `decision_brief_blocked_pending_owner_hosting_decision` / `command_evidence_only_blocked` | Hosting/topology is not owner-approved. |
| LT-L3-W01 | `blocked_pending_human_signature` / `command_evidence_only_blocked` | Remote repo provisioning and branch protection cannot be claimed. |
| LT-L3-W03 | `missing` / `missing_evidence` | Production rollback path depends on network, TLS, CORS, and secret boundary work. |

## Current Repo Survey

| Check | Result | Evidence |
| --- | --- | --- |
| Git remote | absent | `git remote -v \| wc -l` returned `0` |
| CI workflow files | absent | `find .github/workflows -maxdepth 1 -type f 2>/dev/null \| wc -l` returned `0` |
| Infra files | absent | `find infra -maxdepth 4 -type f 2>/dev/null \| wc -l` returned `0` |
| Docker or compose files | absent | `find . -maxdepth 4 -type f ... Dockerfile/compose ... \| wc -l` returned `0` |
| Deployment topology | absent | `docs/launch/l3/deployment-topology.md` is missing |
| Production deploy rollback runbook | absent at required path | `docs/runbooks/deploy-rollback-runbook.md` is missing |
| Rollback operating draft | present but blocked | `docs/launch/runbooks/rollback-runbook.md` exists and states LT-L3-W02 is not complete |
| Required local gate scripts | present locally only | package scripts include `test`, `validate`, `weighted:validate`, `closeout-pack:validate`, and `build` |

## G4 Basis

LT-L3-W02 contributes the G4 deployment/rollback proof. Current evidence has no
remote PR gate, no CI run log, no container build, no staging health check, and
no production deploy-to-rollback round trip. L6 change-management drafts also
state that real change and rollback evidence depends on LT-L3-W02.

## TUW Blocker Matrix

| TUW | Required outcome | Current blocker | Closeout state |
| --- | --- | --- | --- |
| LT-L3-W02-T01 | Five deterministic npm gates run as remote PR blocking checks | No remote, branch protection, or CI workflow exists | blocked |
| LT-L3-W02-T02 | API/web container images and staging auto-deploy succeed | No container definitions, infra files, staging pipeline, or topology doc exists | blocked |
| LT-L3-W02-T03 | Production deploy and rollback round trip succeeds | No production pipeline, required runbook path, network boundary, or rollback execution exists | blocked |
| LT-L3-W02-T04 | G4 evidence bundle maps CI, staging, deploy, and rollback logs | T01-T03 evidence is absent | blocked |

## Next Required Actions

1. Close L1-W06 and L3-W01 with owner-approved hosting, remote, and branch-protection decisions.
2. Add the selected remote CI workflow after the remote platform is approved.
3. Add container definitions and staging deployment topology after hosting is approved.
4. Record staging health and production deploy-to-rollback evidence before claiming G4.
