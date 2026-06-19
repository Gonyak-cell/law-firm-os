# G7 Enterprise Hardening UAT Production Readiness Entry Plan

Status: Proposed
Gate: `G7 Enterprise Hardening Gate`
Depends on: G1 implementation evidence review, G2 implementation evidence review, G3 implementation evidence review, G4 implementation evidence review, G5 implementation evidence review, G6 implementation evidence review
TUW range: `LFOS-G7-W12-T001` through `LFOS-G7-W15-T012`

## Purpose

G7 opens the final enterprise hardening, operations, migration, HRX, QA,
security, UAT, and release-readiness lane after the G6 Analytics, AI, Portal,
and Data Room closeout handoff. It converts descriptor evidence from Admin,
External Integrations, Migration, Enterprise SaaS, Platform Extensibility,
Commercial Readiness, and HRX People into a final review plan for tenant admin,
observability, release candidates, deployment records, compliance evidence,
people-data separation, connector and migration safety, test baselines,
security regression, DR, UAT, and production readiness review.

This plan opens G7 planning only. It does not claim G7 runtime readiness,
enterprise trust, security approval, UAT signoff, production readiness, or
go-live approval.

This plan does not approve go-live.

Local validation does not claim enterprise trust. G7 can only close after the
stacked G1 through G6 PR evidence is accepted or explicitly waived by a human
reviewer, after G7 implementation slices provide their own evidence, and after
the final production readiness review records a human disposition.

## Existing Evidence

| Surface | Current evidence | G7 treatment |
| --- | --- | --- |
| `contracts/admin-console-contract.json` | RP21 Admin Console descriptor contract for admin settings, policies, templates, usage, billing-plan administration, and admin audit boundaries | Reuse as source contract for tenant settings, admin audit viewer, operations dashboard, and admin permission tests. |
| `contracts/external-integrations-i-contract.json` | RP22 descriptor contract for Microsoft 365, Google Workspace, Slack/Teams, e-sign, and webhook intake boundaries | Reuse as connector, credential reference, sync job, sync cursor, and no-credential-exposure evidence. |
| `contracts/external-integrations-ii-contract.json` | RP23 descriptor contract for bank, card, WEHAGO, Douzone, tax export, and DART integration boundaries | Reuse as accounting connector, export review, reconciliation, and finance integration handoff evidence. |
| `contracts/migration-platform-contract.json` | RP25 Migration Platform descriptor contract for file server, SharePoint, Drive, iManage import, dry-run, mapper, and validation boundaries | Reuse as migration batch, import validation, migration dashboard, and cutover readiness evidence. |
| `contracts/enterprise-saas-hardening-contract.json` | RP26 descriptor contract for SSO, MFA, SCIM, dedicated resources, keys, rate limits, and security telemetry | Reuse as enterprise hardening evidence without opening identity, directory, key, or telemetry runtime. |
| `contracts/platform-extensibility-contract.json` | RP27 descriptor contract for public API, webhooks, workflow builder, API keys, extension permissions, and rate limits | Reuse as platform extension guardrail evidence for release-readiness review. |
| `contracts/marketplace-custom-ai-apps-contract.json` | RP28 descriptor contract for app registry, connector SDK, and custom AI app review gates | Reuse as downstream platform-risk evidence where custom apps affect enterprise release scope. |
| `contracts/commercial-readiness-contract.json` | RP29 Commercial Readiness descriptor contract for CI/CD, observability, SOC2/ISMS-P reports, release evidence, and go/no-go packets | Reuse as source evidence for observability, incident, deployment, compliance, and production-readiness review controls. |
| `contracts/hrx-people-contract.json` | RP30 People HR Evidence descriptor contract for employee, HR document, evaluation, candidate, and HR audit boundaries | Reuse as source evidence for User/Employee separation, HR guardrails, workload denominators, and candidate-data separation. |
| `docs/reorganization/client-matter-os/55-g6-g-portal-data-room-closeout-report.md` | G6-G portal and data-room closeout report | Use as the immediate entry handoff; G7 must not proceed to runtime readiness if G6 evidence is rejected or missing. |
| `docs/reorganization/client-matter-os/12-risk-register.md` | Source risk register including descriptor/runtime confusion and portal/AI/analytics leak risks | Preserve as G7 negative evidence input and extend review focus to enterprise trust and go-live overclaim risk. |
| `scripts/validate-go-live-readiness.mjs` | Go-live readiness validator requiring explicit fixtures | Treat as a later W15 evidence target, not as an entry-plan go-live approval. |

## Runtime Evidence Still Required

G7 cannot close until the following evidence exists in implementation PRs:

1. Tenant admin settings enforce admin permission tests and tenant scoping.
2. Plan and usage changes emit audit evidence and never alter billing state
   without a reviewed billing workflow.
3. Observability baseline records metrics, logs, route latency, and customer
   data redaction boundaries.
4. Incident runbook model records lifecycle ownership, escalation, and customer
   safe communications.
5. Release candidate records require approval before deployment or readiness
   claims.
6. Deployment run records include rollback evidence and do not mask failed
   deploys.
7. Compliance report generation produces evidence checklists without claiming
   SOC2, ISMS-P, or enterprise approval from local validation alone.
8. Admin audit viewer and operations dashboard are tenant scoped and do not leak
   customer data, hidden policy internals, or unauthorized counts.
9. User and Employee are separated; HRX capacity, workload, HR documents,
   evaluation, and candidate data remain guarded from CRM, Party, and Matter
   contamination.
10. Connector registry, credential references, sync jobs, cursors,
    reconciliation runs, migration batches, import validation, accounting
    export, and migration dashboards block credential exposure and require
    human review before export or cutover.
11. Unit, integration, permission-negative, audit-completeness, idempotency,
    state-transition, and security-regression suites pass with documented
    coverage boundaries.
12. Performance smoke, backup/restore drill, UAT scripts, and production
    readiness review record real evidence and human disposition.
13. G7 closeout records command output, PR state, G1 through G6 evidence
    disposition, G7 implementation evidence, unresolved findings, waivers, and
    final human review disposition.

## PR Slice Plan

| Slice | TUWs | Target branch | Scope | Exit evidence |
| --- | --- | --- | --- | --- |
| G7-A | `LFOS-G7-W12-T001`-`LFOS-G7-W12-T005` | `codex/lawos-g7-admin-ops-foundation` | Tenant admin settings, plan/usage model, observability baseline, incident runbook model, release candidate model | Admin permission, plan-change audit, route latency dashboard, incident lifecycle, approval-required release candidate tests. |
| G7-B | `LFOS-G7-W12-T006`-`LFOS-G7-W12-T010` | `codex/lawos-g7-ops-commercial-closeout` | Deployment run record, compliance report generator, admin audit viewer, operations dashboard, G7 Ops closeout | Rollback record, SOC2/ISMS-P checklist, tenant-scoped audit query, no customer data leak, release-readiness evidence. |
| G7-C | `LFOS-G7-W13-T001`-`LFOS-G7-W13-T008` | `codex/lawos-g7-hrx-people-guardrails` | User/Employee separation, Employee, CapacityProfile, workload read model, HR document guardrail, evaluation access, candidate separation, HRX closeout | No conflation, optional controlled User ref, utilization denominator, matter/time aggregation, HR ACL, audit-on-read, CRM/Party contamination block, HR guardrail evidence. |
| G7-D | `LFOS-G7-W14-T001`-`LFOS-G7-W14-T005` | `codex/lawos-g7-integrations-migration-foundation` | Connector registry, credential reference model, sync job model, sync cursor model, reconciliation run | No credential exposure, secret not returned, retry/idempotency, resumable sync, mismatch report tests. |
| G7-E | `LFOS-G7-W14-T006`-`LFOS-G7-W14-T010` | `codex/lawos-g7-migration-cutover-closeout` | Migration batch, import validation framework, accounting connector export, migration dashboard, migration closeout | Import audit, duplicate Party detection, human review before export, failed row review, cutover readiness evidence. |
| G7-F | `LFOS-G7-W15-T001`-`LFOS-G7-W15-T006` | `codex/lawos-g7-qa-security-baseline` | Test strategy, unit baseline, integration baseline, permission negative tests, audit completeness tests, idempotency tests | PM/QA approval marker, coverage threshold, key workflow pass, unauthorized access blocked, every write has event, duplicate commands safe. |
| G7-G | `LFOS-G7-W15-T007`-`LFOS-G7-W15-T012` | `codex/lawos-g7-release-readiness-closeout` | State transition tests, security regression, performance smoke, backup/restore drill, UAT scripts, production readiness review | Invalid transitions blocked, tenant leak absent, latency threshold, restore verified, user signoff, G7 approval human disposition. |

## TUW Coverage

| TUW | Work | Required evidence |
| --- | --- | --- |
| `LFOS-G7-W12-T001` | tenant admin settings | admin permission test. |
| `LFOS-G7-W12-T002` | plan/usage model | plan change audit test. |
| `LFOS-G7-W12-T003` | observability baseline | route latency dashboard. |
| `LFOS-G7-W12-T004` | incident runbook model | incident lifecycle test. |
| `LFOS-G7-W12-T005` | release candidate model | approval required test. |
| `LFOS-G7-W12-T006` | deployment run record | rollback record test. |
| `LFOS-G7-W12-T007` | compliance report generator | SOC2/ISMS-P evidence checklist. |
| `LFOS-G7-W12-T008` | admin audit viewer | tenant-scoped query test. |
| `LFOS-G7-W12-T009` | operations dashboard | no customer data leak test. |
| `LFOS-G7-W12-T010` | G7 Ops closeout | release readiness evidence. |
| `LFOS-G7-W13-T001` | User/Employee separation spec | no conflation review. |
| `LFOS-G7-W13-T002` | Employee schema | User ref optional/controlled. |
| `LFOS-G7-W13-T003` | capacity profile | utilization denominator test. |
| `LFOS-G7-W13-T004` | workload read model | matter/time aggregation test. |
| `LFOS-G7-W13-T005` | HR document guardrail | non-HR denied test. |
| `LFOS-G7-W13-T006` | evaluation access control | audit on read test. |
| `LFOS-G7-W13-T007` | candidate data separation | CRM/Party contamination test. |
| `LFOS-G7-W13-T008` | HRX closeout | HR guardrail evidence. |
| `LFOS-G7-W14-T001` | connector registry | no credential exposure test. |
| `LFOS-G7-W14-T002` | credential reference model | secret not returned test. |
| `LFOS-G7-W14-T003` | sync job model | retry/idempotency test. |
| `LFOS-G7-W14-T004` | sync cursor model | resumable sync test. |
| `LFOS-G7-W14-T005` | reconciliation run | mismatch report test. |
| `LFOS-G7-W14-T006` | migration batch model | import audit test. |
| `LFOS-G7-W14-T007` | import validation framework | duplicate Party detection. |
| `LFOS-G7-W14-T008` | accounting connector export | human review before export. |
| `LFOS-G7-W14-T009` | migration dashboard | failed row review test. |
| `LFOS-G7-W14-T010` | migration closeout | cutover readiness evidence. |
| `LFOS-G7-W15-T001` | test strategy | PM/QA approval. |
| `LFOS-G7-W15-T002` | unit test baseline | coverage threshold. |
| `LFOS-G7-W15-T003` | integration test baseline | key workflows pass. |
| `LFOS-G7-W15-T004` | permission negative tests | unauthorized access blocked. |
| `LFOS-G7-W15-T005` | audit completeness tests | every write has event. |
| `LFOS-G7-W15-T006` | idempotency tests | duplicate commands safe. |
| `LFOS-G7-W15-T007` | state transition tests | invalid transition blocked. |
| `LFOS-G7-W15-T008` | security regression suite | tenant leak absent. |
| `LFOS-G7-W15-T009` | performance smoke | agreed latency threshold. |
| `LFOS-G7-W15-T010` | backup/restore drill | restore verified. |
| `LFOS-G7-W15-T011` | UAT script package | user signoff. |
| `LFOS-G7-W15-T012` | production readiness review | G7 approval. |

## Entry Validation

```sh
npm run client-matter:g6g:validate
npm run client-matter:g7:plan:validate
npm run rp21:admin-console:validate
npm run rp22:external-integrations-i:validate
npm run rp23:external-integrations-ii:validate
npm run rp25:migration-platform:validate
npm run rp26:enterprise-saas:validate
npm run rp27:platform-extensibility:validate
npm run rp28:marketplace:validate
npm run rp29:commercial:validate
npm run rp30:hrx:validate
npm run validate
```

The G7 plan validator confirms that all 40 G7 TUWs are represented, that W12
through W15 coverage matches the catalog, that Admin, Integrations, Migration,
Enterprise SaaS, Platform, Marketplace, Commercial, and HRX descriptor evidence
exists, that G6-G is the entry handoff, that final go-live approval is not
claimed by local validation, and that the G7 slice plan remains stacked and
reviewable.

## Gate Boundary

G7 remains open. Planning artifacts, descriptor catalogs, generated RP21/RP22/
RP23/RP25/RP26/RP27/RP28/RP29/RP30 evidence, and contract validators are entry
evidence only.

G7 must not claim enterprise readiness, UAT completion, security approval,
production readiness, customer launch readiness, or go-live approval before the
full G1 through G7 stack is reviewed, unresolved findings are closed or waived,
and a human final readiness disposition is recorded.
