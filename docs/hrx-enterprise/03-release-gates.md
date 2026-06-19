# HRX 30/60/90 Release Gates

Status: accepted
Date: 2026-06-19
TUW: HRX-ENT-L1-W01-T04

## Gate Model

The HRX plan uses 30/60/90 day windows as execution planning windows, not readiness claims.

| Window | Packs | Allowed Claim | Required Proof |
| --- | --- | --- | --- |
| 30 day | HRX-P01 to HRX-P04 | Boundary, governance, and runtime foundation by slice | Current repo files, tests, and validator evidence for each pack |
| 60 day | HRX-P05 to HRX-P13 | Trust, core HRIS, workflows, and portal/API slices by gate | Permission, audit, API-backed UI, and e2e evidence |
| 90 day | HRX-P14 to HRX-P18 | AI, analytics, hardening, and release package readiness | Security, observability, UAT, rollback, and human release receipt |

## P0 Zero Rule

A P0 item cannot be owner-deferred if it blocks the current pack exit gate. The pack remains open until the P0 gate passes or the plan is explicitly changed.

## Owner-Deferred Rule

An owner-deferred item must include:

- Owner name or role.
- Deferral reason.
- Blocked readiness claim.
- Follow-up TUW or pack.
- Expiration condition.

Owner-deferred status does not convert a blocked runtime, production, security, or release gate into a pass.

## No-Go Conditions

HRX cannot claim production or enterprise readiness while any of these conditions are true:

- Runtime validator fails in normal mode.
- Sensitive HR read/write lacks permission and audit evidence.
- Tenant isolation, SSO/MFA, SCIM, or negative security gates are incomplete.
- Backup/restore, observability, UAT, rollback, or go-live checklist is incomplete.
- Human release authority has not signed the final release receipt.

## Human Release Gate

HRX-P18 can produce a release package ready for human decision. It cannot self-authorize go-live.
