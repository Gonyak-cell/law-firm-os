# CMP R4 PR Policy

Status: source-intake-baseline

## Required PR Fields

- CMP TUW IDs.
- Target R level.
- Evidence path.
- Test commands and results.
- Permission/audit/state/idempotency impact.
- Explicit allowed and blocked readiness claims.

## Merge Rules

1. No PR may claim CMP R4 completion from descriptor, synthetic, or API evidence alone.
2. R4 claims require persistence, write API, permission, audit, state/idempotency, tests, and evidence.
3. G6 CRM/Intake clearance must be implemented before G4 Matter opening can claim R4 completion.
4. Production-ready and go-live claims require owner approval and release gates.
