# LCX-PPL Claim Boundary Register

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`

## Allowed Claim

The target claim for this program is:

```text
LCX-PPL local runtime-ready candidate complete; production, go-live, and enterprise trust claims remain false.
```

This claim is allowed only after all required TUWs from `LCX-PPL-00` through
`LCX-QA-08` have current repo evidence and the final browser QA/evidence
closeout proves the implemented surfaces.

## Disallowed Claims Without External Evidence

| Claim | State |
| --- | --- |
| Production ready | disallowed |
| Go-live approved | disallowed |
| Enterprise trust approved | disallowed |
| External provider ready | disallowed |
| Legal owner approved | disallowed |
| Payroll execution ready | disallowed |
| Benefits/equity/immigration/background provider ready | disallowed |
| AI/automatic review final decision ready | disallowed |

## Runtime Evidence Rules

- UI copy, descriptor packages, screenshots, planning docs, and mock fixtures do
  not prove runtime readiness by themselves.
- Runtime readiness requires route-backed data access, permission behavior,
  audit/receipt evidence, tests or validators, and browser-driven surface
  evidence for the matching user workflow.
- A green validator proves only the coverage it actually checks.
- Browser QA against local Vite/API stacks proves local behavior only.
- Legacy descriptor-only flags must not be used to claim production runtime.

## People Boundary Rules

- People is a first-class Law Firm OS axis, not only HRX.
- HRX remains embedded inside People for employee, document, leave, approval,
  recruiting, lifecycle, policy, audit, analytics, AI, payroll, and admin
  surfaces.
- Legal People must cover internal lawyers, staff, client contacts,
  counterparties, opposing counsel, experts, witnesses, courts, arbitrators,
  regulators, organizations, affiliations, matter roles, relationships,
  conflict review, and ethical-wall membership.
- Missing HR/provider domains may appear in planning or status artifacts only
  when clearly marked as not implemented or externally gated.

## AI And Review Boundary

- AI output is an untrusted claim until reviewed.
- No payroll, evaluation, discipline, termination, conflict, ethical-wall, or
  legal access decision may be final by AI alone.
- Sensitive decisions require reviewer identity, timestamp, decision state,
  notes or reason, and rollback or audit reference.

## Completion Audit Requirements

Before marking the active goal complete, verify each item:

1. Gap ledger entries are resolved or explicitly carried forward.
2. HRO validator passes after label drift repair.
3. Legal People contracts exist and are validated.
4. Relationship ledger APIs are permission-aware and audited.
5. People UI exposes legal relationship directory/detail/relationship/wall
   surfaces without fake-working blocked HR domains.
6. Client/Matter backlinks expose related People records.
7. Browser QA drives the relevant People workflows.
8. Evidence receipts preserve `production`, `go_live`, and
   `enterprise_trust` as false unless separate external receipts exist.

