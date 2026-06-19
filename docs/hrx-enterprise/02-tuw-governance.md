# HRX TUW Governance

Status: accepted
Date: 2026-06-19
TUW: HRX-ENT-L1-W01-T01

## Required Mapping

Every HRX change must be mapped to all of the following:

- Source TUW ID.
- Execution pack ID.
- PR lane.
- Changed file path.
- Entry gate.
- Exit gate.
- Validation command or human review gate.
- Allowed claim and blocked claim.

## Sequential Rule

Packs execute in order. A later pack may be drafted for planning, but implementation does not begin until the previous pack exit gate has current repo evidence.

## Evidence Rule

Descriptor-only, synthetic fixture, static UI, and local unit-only evidence may support planning or guardrails. They cannot close HRX runtime readiness or production readiness.

## Pull Request Rule

Each HRX pull request must include:

- A TUW mapping table in the PR body.
- A list of changed files mapped to TUWs.
- Commands run with pass/fail results.
- Explicit no-go conditions that remain blocked.
- A claim statement that distinguishes descriptor, runtime, production, and enterprise readiness.

## Claim Ladder

| Pack Range | Allowed Claim | Blocked Claim |
| --- | --- | --- |
| HRX-P01 to HRX-P02 | Boundary and governance in place | Runtime-ready or production-ready |
| HRX-P03 to HRX-P06 | Runtime foundation or trust slice by scope | API/UI/e2e or enterprise HRIS readiness |
| HRX-P07 to HRX-P13 | Specific API, UI, and workflow slices by gate | Full enterprise HRIS readiness |
| HRX-P14 to HRX-P17 | AI, analytics, and hardening by gate | AI final decisions or payroll calculation runtime |
| HRX-P18 | Release package ready for human decision | Go-live without human receipt |

## Validator Separation

The RP30 HRX People validator proves descriptor and closeout-contract continuity. It does not prove runtime readiness.

The HRX runtime readiness validator proves runtime evidence only when the required DB, repository, service, API, authz, audit, UI/e2e, observability, and release evidence exists.

## No-Go Conditions

- Employee and IAM User are treated as the same identity.
- Sensitive HR read/write lacks both permission decision and audit evidence.
- Payroll calculation or disbursement is implemented before a later approved payroll runtime gate.
- HR AI emits final employment, compensation, evaluation, discipline, or termination decisions.
- Static UI fixtures are accepted as API-backed evidence.
- Descriptor validation is used as runtime readiness evidence.
