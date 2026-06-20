# CMP R4 G6 Closeout

Gate: CMP-G6 CRM to Intake to Matter Conversion Runtime.

Scope implemented:
- CRM Lead, Opportunity, Activity, Proposal, Referral, and Campaign runtime write services.
- Opportunity-to-Intake handoff command that forbids direct Matter conversion.
- IntakeRequest, ConflictCheck, ConflictHit, conflict search, decision, waiver, engagement, fee terms, risk approval, clearance token, and conflict memo ACL runtime.
- File-backed persistence, idempotency, audit events, permission-gated API handlers, safe projections, live web surface, validator, tests, and TUW evidence.

Verification targets:
- `node --test packages/intake/test/runtime-services.test.js`
- `node --test apps/api/test/cmp-r4-g6-crm-intake.test.js`
- `npm --workspace apps/web run test:ui`
- `npm run client-matter:cmp-v1:g6:validate`

Claim boundary:
- G6 can claim R4 runtime-write-ready and R5/R6 owner-decision-ready evidence.
- G6 must not claim go-live, production-ready, or final release readiness before owner approval and release gate pass.
