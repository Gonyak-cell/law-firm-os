# Runtime Readiness Standard

Status: Proposed
Gate: `G0`
TUW: `LFOS-G0-W00-T008`

## Badge Levels

| Badge | Name | Meaning | Customer use |
| --- | --- | --- | --- |
| R0 | Planning-only | Documented plan only. | Not allowed. |
| R1 | Contract-ready | Contract, schema, descriptor, or registry exists. | Not allowed. |
| R2 | Fixture-ready | Synthetic fixture and golden case evidence exists. | Not allowed. |
| R3 | API-read-ready | Read API exists; persistence may still be limited or synthetic. | Internal validation only. |
| R4 | Runtime-write-ready | Persistence, write API, permission, audit, state, and idempotency exist. | Limited pilot. |
| R5 | Enterprise-ready | Durable audit, security, recovery, UAT, and operating evidence exist. | Customer onboarding possible. |
| R6 | Production-certified | Release gate, monitoring, SLA, DR, compliance, and launch evidence exist. | Production use. |

## Required Evidence by Badge

| Evidence | R0 | R1 | R2 | R3 | R4 | R5 | R6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product/module plan | yes | yes | yes | yes | yes | yes | yes |
| Contract/schema | no | yes | yes | yes | yes | yes | yes |
| Synthetic fixture/golden case | no | optional | yes | yes | yes | yes | yes |
| API read route | no | no | optional | yes | yes | yes | yes |
| Durable persistence | no | no | no | optional | yes | yes | yes |
| Write command/API | no | no | no | no | yes | yes | yes |
| Permission negative tests | no | no | no | partial | yes | yes | yes |
| Durable audit | no | no | no | partial | yes | yes | yes |
| State machine tests | no | no | no | partial | yes | yes | yes |
| Idempotency tests | no | no | no | partial | yes | yes | yes |
| UAT/security/performance | no | no | no | no | optional | yes | yes |
| DR/rollback/compliance evidence | no | no | no | no | no | partial | yes |

## Current G0 Readiness Claims

| Surface | Claim |
| --- | --- |
| Product contract | R1. |
| Most module packages | R1/R2. |
| Master Data through `apps/api` | R3 read surface with synthetic data. |
| CRM / Intake / Matter / DMS / Billing / Finance | Not runtime-write-ready until later gates prove R4. |
| Production readiness | Not claimed by this lane. |

## Claim Rule

No report may say "runtime-ready", "pilot-ready", "enterprise-ready", or
"production-ready" without naming the badge and the evidence file that proves
the badge.
