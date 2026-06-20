# CMP R4 Runtime Readiness Standard

Status: source-intake-baseline

| Level | Meaning | Allowed Claim | Blocked Claim |
| --- | --- | --- | --- |
| R0 | Source intake and architecture baseline | Plan/source captured | Runtime or pilot readiness |
| R1 | Contracts, ownership, folder and PR discipline | Implementation can start | Runtime write readiness |
| R2 | Fixture or descriptor evidence | Design coverage | Customer use readiness |
| R3 | API-read or UI evidence skeleton | Internal evidence only | Durable runtime readiness |
| R4 | Durable persistence + write API + permission + audit + state/idempotency tests | Limited pilot after gate review | Enterprise go-live |
| R5 | Enterprise security, migration, DR, observability, UAT evidence | Owner-decision-ready | Automatic production approval |
| R6 | Release evidence, owner approval, monitoring, rollback and compliance package | Approved release package when signed | Self-approved launch |

## Hard Rule

R4 requires all of these together: durable persistence, write API, tenant/actor permission decision, durable audit, state transition tests, idempotency tests, and evidence artifact.
