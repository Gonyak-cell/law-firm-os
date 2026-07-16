# CTI Password Reset Remediation Crosswalk

Goal: `cti-password-reset-remediation`

Status: `BLOCKED`

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

| CTI Area | Remediation Evidence |
| --- | --- |
| S2 AUTHENTICATION | Production auth request/confirm reset routes and signed-session operational auth tests |
| S4 ACCOUNT AND PERMISSION INJECTION | Reset-required credential boundary and QA disabled rejection tests |
| CUTOVER POST-PASS REMEDIATION | Temporary password handoff superseded by email reset-first-login boundary |

Boundary: no production code deploy, env mutation, credential mutation, reset email send, S5, S6, OIDC, DB conversion, production-ready claim, or go-live claim.

Next approval: `I23` for production reset store path, SES sender/base URL, and scoped `ses:SendEmail` IAM/env mutation.

Validator: `scripts/validate-cti-password-reset-remediation.mjs`
