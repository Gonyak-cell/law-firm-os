# LT-L3-W10 SSO/MFA And User-Employee Mapping Blocker Survey

Work package: LT-L3-W10
Phase: L3
Gate binding: G5, L3-EXIT
Survey timestamp: 2026-06-18T13:29:40Z

## Scope

LT-L3-W10 requires all of the following before it can close:

- Entra Conditional Access policy export for the matter app with MFA required.
- MFA unregistered account login attempt evidence.
- Entra SSO E2E report proving protected API 200, unauthenticated 401/403,
  expired-token 401, and cross-tenant rejection.
- User-to-Employee mapping bootstrap and reconciliation report with mismatch 0.
- Mapping load write count equal to audit event count.
- R13 SSO/MFA mapping assembled into the goal closeout package.

## Current Evidence

The current repository does not contain the required W10 launch evidence files:

- `docs/launch/l3/conditional-access-policy-export.json`
- `docs/launch/l3/conditional-access-policy-export.md`
- `docs/launch/l3/sso-e2e-report.md`
- `docs/launch/l3/user-employee-mapping-report.md`
- `docs/launch/l3/r13-sso-mfa-mapping.md`

The only SSO implementation candidate found is
`packages/enterprise/src/sso.js`, which is explicitly descriptor-only:

- `dispatches_sso_runtime: false`
- `consumes_sso_assertion: false`
- `stores_idp_secret: false`
- `descriptor_only: true`

The HR/User separation track remains descriptor and guardrail evidence, not a
W10 mapping bootstrap. Existing launch risk audit records User/Employee
separation as partial and says the Employee API runtime remains closed.

## Blocking Conditions

| TUW | Required Result | Current State |
| --- | --- | --- |
| LT-L3-W10-T01 | Conditional Access MFA policy export for the matter app | blocked by LT-L3-W07 and absent policy export |
| LT-L3-W10-T02 | Entra SSO login E2E against staging protected API | blocked by T01 and LT-L2-W02; no SSO runtime or report |
| LT-L3-W10-T03 | User-to-Employee mapping bootstrap and reconciliation | blocked by T02 and LT-L2-W04; no mapping report or audit count evidence |
| LT-L3-W10-T04 | R13/G5 evidence assembly | blocked by missing T01-T03 evidence |

## Non-Claims

This survey does not configure Entra Conditional Access, does not access a real
tenant, does not run SSO, does not load Employee mapping data, does not write
audit events, and does not satisfy G5 or L3-EXIT.
