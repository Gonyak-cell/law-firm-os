## TUW Mapping

- Pack:
- PR lane:
- TUW IDs:
- CMP TUW IDs:
- Changed files mapped to TUWs:

## Gate Evidence

- Entry gate evidence:
- Exit gate evidence:
- Commands run:

## CMP-R4 Boundary Check

- [ ] This PR cites the CMP TUW IDs it intends to satisfy.
- [ ] This PR includes an evidence path for every completed CMP TUW.
- [ ] Any R4 runtime-write-ready claim is backed by persistence, write API, permission, audit, state/idempotency tests, and evidence artifacts.
- [ ] Descriptor-only, synthetic-only, API-evidence-only, and durable-persistence-open work is not marked complete.
- [ ] Go-live or production-ready language is blocked unless owner approval and release gates are attached.

## HRX Boundary Check

- [ ] This PR does not claim standalone HRX SaaS readiness.
- [ ] This PR does not claim HRX runtime readiness from descriptor-only evidence.
- [ ] Employee and IAM User remain separate identities.
- [ ] Sensitive HR read/write paths include permission decision and audit evidence.
- [ ] Payroll work stays inside export preview unless a later approved payroll-runtime gate exists.
- [ ] HR AI work does not produce final hire, fire, pay, evaluation, discipline, or termination decisions.

## Release Claim

- Allowed claim:
- Blocked claim:
- Remaining no-go conditions:
