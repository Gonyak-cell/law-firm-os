# ADR-G0-004: G1/G2 Sequencing

Status: Proposed
Date: 2026-06-19
Gate: `G0 Reorganization Gate`
TUW: `LFOS-G0-W00-T010`

## Context

The G0 roadmap places `G1 Trust Foundation` and `G2 Party & Relationship
Master` in the same broad execution phase because Party Master runtime work
needs tenant, actor, permission, and durable audit foundations.

The G0 closeout report left open whether G1 and G2 should run sequentially or
as two separate PRs. The answer needs to preserve two constraints at the same
time:

- Party Master should not claim runtime readiness before tenant, permission,
  and audit controls exist.
- G2 planning should not be blocked from starting while G1 runtime details are
  being reviewed.

## Decision

Run G1 and G2 as separate Vault-style PR lanes, but keep runtime gate acceptance
sequential.

G1 is the first runtime gate. G2 may begin as a draft planning, schema, or
contract PR lane while G1 is under review, but G2 must not claim runtime write
readiness until the required G1 trust interfaces are accepted or explicitly
stubbed behind fail-closed tests.

The runtime gate acceptance sequential rule is mandatory: G2 must not claim
runtime write readiness before the required G1 evidence exists.

G2 must not claim runtime write readiness before G1 evidence exists.

## Sequencing Rule

| Lane | Allowed before G1 accepted | Requires G1 evidence before claiming runtime readiness |
| --- | --- | --- |
| G1 Trust Foundation | Tenant, actor, permission, durable audit design and runtime PRs | Yes, for G1 closeout |
| G2 Party Master planning | Object model, API shape, duplicate-review design, migration plan | No runtime claim allowed |
| G2 Party Master runtime | Party persistence, relationship APIs, BillingProfile reference tests | Yes |
| G3 CRM/Intake | Design notes only | Yes, requires G1 and G2 evidence |

## Required G1 Evidence Before G2 Runtime Claim

1. Tenant boundary rejects missing or mismatched tenant context.
2. Actor context rejects missing actor identity.
3. Permission evaluator has allow, deny, review, and approval outcomes.
4. Durable audit event write path exists for Party read/write operations.
5. Deny-over-allow behavior is covered by regression tests.
6. Object ACL or equivalent permission subject can be attached to Party records.

## Required G2 Runtime Evidence

1. Party, Person, Organization, ClientGroup, Relationship, and BillingProfile
   canonical persistence exists.
2. Duplicate review or merge-required behavior prevents silent duplicate
   canonical clients.
3. Legal client versus billing client references are test-covered.
4. Party reads and writes pass through G1 permission and audit controls.
5. G2 closeout cites the accepted G1 evidence or a human-approved fail-closed
   temporary stub.

## Consequences

- The next implementation PR should start with G1 Trust Foundation.
- A G2 planning PR may be opened separately, but must remain planning-only until
  G1 evidence is accepted.
- G3 CRM/Intake remains blocked from runtime readiness until both G1 and G2 have
  sufficient evidence.
- The overall G0-G7 goal remains intact while the PR flow stays reviewable in
  small slices.

## Status Boundary

This ADR is proposed by the G0 planning lane. It does not approve G0, G1, or G2
by itself, and it does not open any runtime write path. Human review still needs
to accept or amend the decision before G0 closeout.

Human review still needs to accept or amend the decision before G0 closeout.
