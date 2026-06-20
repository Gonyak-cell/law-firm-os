# HRX TUW Governance

Status: accepted
Date: 2026-06-20
TUW: HRX-L0-007

## Required Mapping

Every HRX change must be mapped to all of the following:

- Source TUW ID.
- Roadmap layer.
- PR sequence.
- Changed file path.
- Entry gate.
- Exit gate.
- Validation command or human review gate.
- Allowed claim and blocked claim.
- Current status.
- Evidence link or explicit gap.

## Imported Backlog

The canonical backlog for this roadmap is `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv`.

| Count | Value |
| --- | --- |
| Total TUWs | 127 |
| P0 TUWs | 63 |
| P1 TUWs | 64 |
| PR sequence | PR-00 through PR-15 |
| Current boundary | `runtime_api_evidence_only__durable_persistence_open` |
| Target state | `runtime_write_ready__durable_persistence_guarded` |

## Sequential Rule

PR sequences execute in order. A later PR may be drafted for planning, but implementation does not begin until the previous PR exit gate has current repo evidence or an explicit owner decision changes the sequence.

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
| PR-00 | Roadmap governance and claim boundary in place | Runtime-ready or production-ready |
| PR-01 to PR-02 | Durable persistence slice by scope | Full runtime-write-ready |
| PR-03 to PR-05 | Trust boundary slice by scope | Enterprise HRIS readiness |
| PR-06 to PR-11 | Core HRIS, workflows, portal/API slices by gate | Full product readiness |
| PR-12 to PR-14 | AI, analytics, and hardening by gate | AI final decisions or payroll calculation runtime |
| PR-15 | Release decision package ready for human review | Go-live without human receipt |

## Validator Separation

The RP30 HRX People validator proves descriptor and closeout-contract continuity. It does not prove runtime readiness.

The HRX runtime readiness validator proves runtime evidence only when the required DB, repository, service, API, authz, audit, UI/e2e, observability, and release evidence exists.

The HRX no-premature-claim validator blocks docs or contracts from presenting the target state as current state before the PR-15 owner decision gate.

## No-Go Conditions

- Employee and IAM User are treated as the same identity.
- Sensitive HR read/write lacks both permission decision and audit evidence.
- Payroll calculation or disbursement is implemented before a later approved payroll runtime gate.
- HR AI emits final employment, compensation, evaluation, discipline, or termination decisions.
- Static UI fixtures are accepted as API-backed evidence.
- Descriptor validation is used as runtime readiness evidence.
