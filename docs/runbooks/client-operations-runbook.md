# Client Operations Runbook — CL-P6-W02-T02

Status: `synthetic_local` drills pass; `external_execution: blocked`
Owner lane: Client Operations / API on-call
Scope: bank import, Graph/email/calendar, engagement-to-Intake, and Home dashboard source aggregation
Last reviewed: 2026-07-31

## Boundary and use

Use this runbook when a Client screen reports an import failure, a provider
outage/quarantine, a partially applied engagement decision, or partial dashboard
data. The procedures are fail-closed: preserve the safe user state first, read
the audit and durable records second, and only then perform an explicitly
idempotent recovery.

All receipts in this change are synthetic fixture evidence. They contain no
real client data, tokens, mailbox contents, bank files, or provider identifiers.
`production_ready_claim: false` remains true for every drill. Real Graph/AWS/deploy execution is blocked until the named external owner, approval reference, and
provider receipt exist. A local green test is not production or deployment proof.

### Required access and roles

| Role | Responsibility | Stop condition |
| --- | --- | --- |
| Client Operations | Declare the incident, freeze unsafe retries, capture request IDs, and keep the user-facing state safe. | No write or replay without a request/idempotency key and an audit hint. |
| Finance/API operator | Read bank import, CRM/Intake, and audit records; run the local synthetic checks. | No direct row edits or deletion. |
| M365 owner | Own Graph/Entra consent, mailbox/calendar provider health, and provider request IDs. | No Graph call from this local drill; external_execution: blocked. |
| Security/Privacy | Own quarantine, sensitive evidence access, and token/PII handling. | Never open a quarantined original to “see what failed.” |
| Release/AWS owner | Own deployed Lambda, AWS identity, and rollback authorization. | AWS/deploy commands below are preflight references only. |

### Common safety rules

1. Keep the user in a truthful state: `preview_ready`, `repair_required`,
   `provider_blocked`, `quarantined`, or `partial`; never show “완료” for a
   missing provider/database step.
2. Preserve the original request ID, tenant, permission reference, audit hint,
   expected version, and idempotency key. Do not manufacture a new key to get
   past a conflict.
3. Do not use raw provider tokens, raw MIME, signed URLs, bank source files, or
   unredacted payloads in chat, tickets, or receipts.
4. A retry is allowed only where the drill says the same idempotency key is
   safe. Permission, tenant, version, scope, quarantine, and validation errors
   are not transient errors.
5. Capture the command, exit code, response status/outcome, audit event, and
   durable read-back in the incident record. Link the receipt, not a screenshot
   of a secret-bearing console.

### User-state matrix

| state | user-visible meaning | operator action | retry policy |
| --- | --- | --- | --- |
| `no_data` | The source is healthy and the authorized query returned zero rows. | Record source health, query window, and a zero-row read-back. | One normal refresh is safe. |
| `partial` | At least one source failed while other authorized sources returned data. | Keep failed `source_statuses` and alert visible; do not substitute zero. | One bounded health refresh, then escalate. |
| `permission_denied` | The signed session cannot read the requested tenant/object. | Preserve the safe denial and audit event; do not probe another tenant. | Do not retry without an authorization change. |
| `provider_blocked` | Graph/provider consent, health, or receipt is unavailable. | Keep local draft/state; suppress send/event success claims. | Retry only after owner-approved provider evidence. |
| `error` | Validation, storage, or unexpected runtime failure prevented a truthful read. | Freeze risky writes, capture request/audit IDs, and escalate with the receipt. | Do not blindly retry; use the drill-specific recovery. |

### Local validation commands

Run from the repository root. These commands use synthetic fixtures and do not
call Graph, AWS, a deployed Lambda, or a production database.

```sh
node --test apps/api/test/client-bank-import-preview-api.test.js apps/api/test/bank-import-confirmation.test.js
node --test apps/api/test/outlook-connection-api.test.js apps/api/test/outlook-inquiry-api.test.js apps/api/test/outlook-consultation-api.test.js packages/email-dms/test/m365-graph-connection.test.js packages/email-dms/test/inquiry-evidence.test.js
node --test apps/api/test/client-engagement-decision-api.test.js apps/api/test/client-inquiry-transition-api.test.js
node --test apps/api/test/home-dashboard-api.test.js
npm run rp08:m365-runtime:validate
node scripts/validate-client-operations-runbook.mjs --capture
node scripts/validate-client-operations-runbook.mjs
node --test scripts/test/client-operations-runbook.test.mjs
```

`--capture` runs only the local synthetic commands, writes separate stdout and
stderr logs under ignored `.omo/evidence/`, computes source/test/output hashes,
and updates the four receipts with timestamps and rollback verification. It
never runs the AWS/Graph commands. The subsequent validator is fail-closed:
local receipts can be `PASS`, the Graph drill is `BLOCKED_EXTERNAL`, and the
overall gate is not complete until the external receipt exists.

The validator checks this document, the command targets, local links, recursive
PII/secret/path denial patterns, and the four receipts:

- [Bank import replay receipt](../../.omo/evidence/cl-p6-w02-t02-bank-import-replay.json)
- [Graph/email/calendar outage receipt](../../.omo/evidence/cl-p6-w02-t02-graph-email-calendar-outage.json)
- [Engagement repair receipt](../../.omo/evidence/cl-p6-w02-t02-engagement-repair.json)
- [Dashboard partial-source receipt](../../.omo/evidence/cl-p6-w02-t02-dashboard-partial-source.json)

Keep the Graph receipt `status=BLOCKED_EXTERNAL` even after the approved
external window. Attach a separate, independently hashed `external_receipt`
object (kind `EXTERNAL_EXECUTION`, exit code `0`, verifier, timestamp, and
artifact) when the M365/Release owner supplies the real provider/deploy proof;
never turn the local synthetic receipt into a self-claimed pass.

## Drill 1 — Bank import preview/confirm failure and replay

Receipt: [cl-p6-w02-t02-bank-import-replay.json](../../.omo/evidence/cl-p6-w02-t02-bank-import-replay.json)

### Trigger

- `POST /api/finance/bank-imports/preview` returns a malformed/misleading-file
  error, or preview cannot produce a confirmation token.
- `POST /api/finance/bank-imports` returns a confirmation-expired, validation,
  permission, or database failure after preview.
- The operator sees a timeout and cannot tell whether confirmation committed.

### Safe user state

- Preview failure: keep the source file out of product records; show `error` or
  `권한 없음`, zero imported rows, and no `BankImportBatch`.
- Confirm failure after a valid preview: show `확인 필요`/`preview_ready` with
  the original preview token bound to the same request; do not claim a partial
  import.
- An accepted confirmation is immutable for replay: `status=200` with
  `outcome=idempotent_replay` is success, not a second import.
- Never ask the user to upload the same file under a new idempotency key until
  an operator has proved that no commit exists.

### Operator checks

| Check | Expected signal | Evidence to capture |
| --- | --- | --- |
| Signed session/tenant | Authorized finance scope and matching tenant; staff denial is `403` with `FINANCE_UNAUTHORIZED_OMISSION`. | Request ID, permission ref, audit hint (no session token). |
| Preview boundary | `product_records_mutated=false`; counts include `total/new/duplicate/error`; confirmation token is present only for a valid preview. | Preview response status/body-safe fields and source SHA-256. |
| Confirm boundary | A new commit is `201`; a replay with the same key is `200`, `outcome=idempotent_replay`; expired token for a new key is `410`. | Confirm request ID, idempotency key hash/reference, outcome. |
| Durable read-back | `BankImportBatch` and `BankTransaction` counts change exactly once; malformed/denied preview leaves both unchanged. | Repository/DB count before/after and transaction fingerprint summary. |

### Exact commands

```sh
node --test apps/api/test/client-bank-import-preview-api.test.js apps/api/test/bank-import-confirmation.test.js
```

For an approved staging read-only check, set a short-lived `REQUEST_ID` and use
the schema-approved audit/finance view (never paste row bodies):

```sh
psql "$LAWOS_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT action, object_type, request_id, outcome FROM audit_events WHERE request_id = '$REQUEST_ID' ORDER BY created_at;"
psql "$LAWOS_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT model_type, count(*) FROM finance_records WHERE tenant_id = '$TENANT_ID' AND import_request_id = '$REQUEST_ID' GROUP BY model_type ORDER BY model_type;"
```

The `psql` commands are a staging/operator template. Do not run them against a
production database without an approved window and schema owner.

### Audit/DB/provider evidence

- Audit must show preview read, confirm attempt, and either one commit or one
  explicit failure. The receipt must not contain `content_base64`, workbook
  rows, account numbers, or session material.
- DB evidence is the before/after count plus the import batch/source hash; a
  replay has the same batch/fingerprint and no new row count.
- There is no external provider call in this drill. A bank source file is an
  input artifact only; its SHA-256 and parser outcome are enough for synthetic
  evidence.

### Rollback/recovery

1. Freeze the affected `account_ref` import action and retain the original
   request ID.
2. If no commit exists, correct the source/permission and rerun preview. The
   confirmation token must be the one returned by that preview.
3. If commit status is unknown, read the batch and audit records before any
   retry. If the batch exists, replay the exact confirm body and same key; the
   expected result is `idempotent_replay`.
4. If an import is proven incorrect, use the approved finance reversal/review
   workflow; do not delete rows or edit the ledger directly.
5. Attach the receipt and close only after count, hash, and audit read-back
   agree.

### Escalation

Escalate to Finance/API on-call for a count/hash mismatch; to Security for a
tenant or permission mismatch; and to the data owner for a source-file mapping
or account classification issue. A suspected duplicate financial commit is
S1 until the durable read-back proves otherwise.

### Do not retry

- `403` tenant/permission failures, malformed/misleading MIME, validation
  failures, expired confirmation tokens for a new request, or idempotency-key
  conflicts.
- A confirm request after a successful commit when the key/body has changed.
- Any request that would expose or re-upload the original source file merely to
  diagnose an audit or DB mismatch.

## Drill 2 — Graph/email/calendar outage and quarantine

Receipt: [cl-p6-w02-t02-graph-email-calendar-outage.json](../../.omo/evidence/cl-p6-w02-t02-graph-email-calendar-outage.json)

### Trigger

- Graph connection, mail capture, or calendar create returns
  `M365_GRAPH_FEATURE_DISABLED`, `M365_PROVIDER_RUNTIME_DISABLED`, a provider
  response error, or a tenant/subject/scope mismatch.
- Email evidence scanning returns `scan_status=quarantined`; sensitive original
  read returns `423 INQUIRY_EVIDENCE_QUARANTINED`.
- Calendar provider health is unknown, so an event could be duplicated if the
  operator retries without the original transaction/idempotency key.

### Safe user state

- Keep the inquiry/consultation draft and local audit visible as
  `provider_blocked`; do not claim a sent message, filed email, or external
  calendar event.
- Keep quarantined original MIME inaccessible. A clean display copy may remain
  absent; show `검토 필요`/`격리됨` without sender/body leakage.
- Preserve the local consultation/activity and its schedule hash. Automatic
  calendar sync stays off; user may continue with an internal note or a manual
  follow-up task.

### Operator checks

| Check | Expected signal | Evidence to capture |
| --- | --- | --- |
| Connection identity | Delegated `/me`, signed Entra subject, tenant, mailbox scope `me`, and required scopes reconcile. | `GET /api/outlook/connection` safe projection and audit event. |
| Provider state | Disabled/unavailable provider returns a safe `503` and zero provider calls; no raw token or Graph payload is returned. | Safe error code, provider-call count, request ID. |
| Quarantine state | Original object has `scan_status=quarantined`; sensitive read is `423`; display/original content is not in response. | Evidence row, scanner result, quarantine audit event. |
| Calendar idempotency | A successful synthetic event has one transaction ID; a replay returns the existing event; changed schedule is `update_required`. | Schedule hash, transaction ID, provider receipt reference (synthetic only). |

### Exact commands

```sh
node --test apps/api/test/outlook-connection-api.test.js apps/api/test/outlook-inquiry-api.test.js apps/api/test/outlook-consultation-api.test.js packages/email-dms/test/m365-graph-connection.test.js packages/email-dms/test/inquiry-evidence.test.js
npm run rp08:m365-runtime:validate
```

The following are external readiness references only. They must remain
`external_execution: blocked` in this local drill; do not use them to perform a
Graph call, deploy, or production mutation:

```sh
aws sts get-caller-identity --profile matter-prod-deploy-admin --no-cli-pager
AWS_PROFILE=matter-prod-deploy-admin aws lambda get-function-configuration --function-name matter-lawos-api-prod --region ap-northeast-2 --query '{FunctionName:FunctionName,LastModified:LastModified,State:State,LastUpdateStatus:LastUpdateStatus,CodeSha256:CodeSha256,DeploymentCommit:Environment.Variables.LAWOS_DEPLOYMENT_COMMIT}' --output json --no-cli-pager
```

### Audit/DB/provider evidence

- Audit events must record connection/read/capture/quarantine decisions with
  tenant, permission, request ID, and a provider request reference only as a
  hash or safe identifier. Tokens, raw MIME, and Graph bodies are forbidden.
- DB evidence is the `M365Connection` state, inquiry evidence `scan_status`,
  local consultation schedule hash, and idempotency/transaction record. A
  provider outage must not create a local “sent” or “event created” claim.
- The local tests prove the provider boundary and quarantine behavior. They do
  not prove Graph availability, Entra consent, AWS identity, Lambda revision,
  deployment, or deliverability.

### Rollback/recovery

1. Leave the connection revoked/blocked and quarantine locked. Do not “repair”
   by copying MIME or tokens into another store.
2. After the M365 owner records approved consent/health and a provider receipt,
   retry only the original capture/calendar transaction with its same
   idempotency key. Reconcile provider request ID to the local audit event.
3. For a scanner false positive, Security must approve a new scan of the stored
   object; the original remains quarantined until a clean result is persisted.
4. If the provider created an event but the response was lost, query by the
   transaction ID/receipt before attempting any create.

### Escalation

Escalate Graph/Entra/scope issues to the M365 owner; scanner/quarantine issues
to Security/Privacy; and deployment/Lambda identity issues to Release/AWS. A
provider receipt or AWS/deploy evidence is an external gate, not something this
runbook can synthesize.

### Do not retry

- Tenant mismatch, subject mismatch, missing scope, invalid redirect, disabled
  feature/runtime, `423` quarantine, invalid provider response, or permission
  denial.
- Email/calendar create after a timeout until the transaction ID/provider
  request is reconciled.
- Any command that prints tokens, raw MIME, mailbox contents, or signed links.
- `aws`/Graph/deploy commands from this local receipt path; they are externally
  blocked until owner approval.

## Drill 3 — Engagement decision/Intake handoff partial failure and idempotent recovery

Receipt: [cl-p6-w02-t02-engagement-repair.json](../../.omo/evidence/cl-p6-w02-t02-engagement-repair.json)

### Trigger

- A decision records but the Finance fee-commitment step fails, returning
  `202`, `outcome=repair_required`, and `failed_step=fee_commitment_created`.
- An Intake handoff is requested before an accepted decision, or the response
  is lost after the handoff may have committed.
- A stale expected version, cross-tenant request, direct Matter shortcut, or
  idempotency conflict is reported.

### Safe user state

- Keep the inquiry `반영 확인 필요`/`repair_required` until all completed steps
  and the failed step are read back. Do not show “수임 확정” until the decision
  and workflow state agree.
- Never auto-create a Matter. A valid handoff remains
  `waiting_for_intake_clearance` with conflict check required.
- The user can safely refresh/read the inquiry; no duplicate ClientGroup,
  FeeCommitment, or IntakeRequest may be created.

### Operator checks

| Check | Expected signal | Evidence to capture |
| --- | --- | --- |
| Decision state | `202 repair_required`, completed steps are `decision_recorded` and `client_group_resolved`, failed step is `fee_commitment_created`. | Workflow version, request ID, safe processing state. |
| Repair state | `POST .../engagement-repair` with expected workflow version returns `200 completed`; steps are unique and complete. | Repair request/outcome and audit event. |
| Handoff state | Accepted opportunity creates one IntakeRequest with conflict check required and `waiting_for_intake_clearance`; replay returns `idempotent_replay`. | Intake row count, source inquiry/opportunity IDs, audit event. |
| Durable read-back | Exactly one ClientGroup and one FeeCommitment per opportunity; no automatic Matter. | Model counts and workflow versions. |

### Exact commands

```sh
node --test apps/api/test/client-engagement-decision-api.test.js apps/api/test/client-inquiry-transition-api.test.js
```

For an approved staging read-only check:

```sh
psql "$LAWOS_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT action, object_type, request_id, outcome FROM audit_events WHERE request_id IN ('$DECISION_REQUEST_ID', '$REPAIR_REQUEST_ID', '$HANDOFF_REQUEST_ID') ORDER BY created_at;"
psql "$LAWOS_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT model_type, count(*) FROM crm_intake_records WHERE tenant_id = '$TENANT_ID' AND opportunity_id = '$OPPORTUNITY_ID' GROUP BY model_type ORDER BY model_type;"
```

### Audit/DB/provider evidence

- Audit must distinguish decision, repair, and handoff actions and include the
  workflow version/expected version without storing the free-text reason or
  idempotency key in a response.
- DB evidence must show one accepted decision, one ClientGroup, one
  FeeCommitment, one IntakeRequest after recovery, and zero automatic Matter
  rows. Handoff replay must not increment any count.
- This flow has no external provider dependency in the synthetic repair test;
  an Outlook calendar link, if present, remains provider-gated and is not
  evidence that Intake is cleared.

### Rollback/recovery

1. Freeze new decision/handoff writes for the affected inquiry and capture the
   failed workflow version.
2. Read the inquiry/opportunity and all completed steps. If only Finance failed,
   call `engagement-repair` with that expected workflow version and a new repair
   idempotency key.
3. Replay the same repair request only after a lost response; expect
   `idempotent_replay` and unchanged FeeCommitment count.
4. Once the decision is complete, submit one handoff key. Reconcile the Intake
   row before any conflict/clearance action. Do not bypass clearance by sending
   a Matter ID.

### Escalation

Escalate Finance transaction failures to Finance/API on-call; stale/version or
tenant failures to Security/API; and conflict/clearance state to Intake owner.
Any duplicate ClientGroup, FeeCommitment, or IntakeRequest is S1 data-integrity
triage and requires an owner-approved repair plan.

### Do not retry

- Stale version, tenant/permission mismatch, direct Matter shortcut,
  validation error, or idempotency-key conflict.
- A full engagement decision after the decision step already committed; repair
  the failed step instead.
- Handoff before an accepted decision or any retry that changes the original
  intake/opportunity identity.

## Drill 4 — Dashboard partial-source metrics and alerts

Receipt: [cl-p6-w02-t02-dashboard-partial-source.json](../../.omo/evidence/cl-p6-w02-t02-dashboard-partial-source.json)

### Trigger

- Home action inbox, agenda, or feed returns `outcome=partial` with one or more
  `source_statuses[].status=failed`.
- A source timeout causes a metric count to look lower than normal, or a news
  source failure emits `HOME_NEWS_SOURCE_FAILED` while other sources remain
  available.
- An alert fires for a source failure, stale cache, or missing audit/usage
  event—not merely because one widget is empty.

### Safe user state

- Render available items and mark the failed source as unavailable/stale; never
  substitute zero for an unknown count or hide the failure.
- Keep `count_leak_prevented=true`, safe error codes, source status, and
  `production_ready_claim=false`. A partial dashboard is read-only; do not
  mutate source records from a widget refresh.
- Actions remain disabled for missing/failed records. The operator may refresh
  after the source health check; repeated refreshes must not flood a provider.

### Operator checks

| Check | Expected signal | Evidence to capture |
| --- | --- | --- |
| Source isolation | HTTP `200`, `outcome=partial`, available items remain, and failed source is named in `source_statuses`. | Request ID, source statuses, safe error codes. |
| Metric integrity | Counts only include allowed records; unavailable sources are not counted as zero. | Before/after synthetic counts and source status snapshot. |
| Alert/audit path | `home.action_inbox.read`, `home.agenda.read`, or `home.feed.read` audit exists; usage event records the widget view. | Audit event ID and usage event ID. |
| Cache/recovery | A cached response is marked `cached=true`; a later healthy read clears the failure without duplicating items. | Two request IDs and response outcome sequence. |

### Exact commands

```sh
node --test apps/api/test/home-dashboard-api.test.js
```

For an approved staging read-only check:

```sh
psql "$LAWOS_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT action, object_type, request_id, outcome FROM audit_events WHERE action LIKE 'home.%' AND tenant_id = '$TENANT_ID' ORDER BY created_at DESC LIMIT 50;"
psql "$LAWOS_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "SELECT event_type, widget_id, route, tenant_id FROM usage_events WHERE tenant_id = '$TENANT_ID' ORDER BY created_at DESC LIMIT 50;"
```

### Audit/DB/provider evidence

- The synthetic dashboard receipt records the exact scenario, test invocation,
  exit code, `outcome=partial`, failed source, safe metric behavior, and the
  alert/audit observable.
- DB evidence is the audit and usage event read-back; dashboard reads do not
  write business records. If the implementation stores alert state, compare
  alert key/source/request ID and ensure one alert per failure window.
- Provider evidence is limited to source status/cache metadata. No RSS,
  Graph, AWS, or deployed dashboard provider is called by this drill.

### Rollback/recovery

1. Keep the partial response and failed-source status; do not clear the alert by
   deleting a source record or forcing a zero metric.
2. Check source health and cache age, then perform one bounded refresh. Preserve
   the same tenant/permission/audit context.
3. If the source recovers, verify `outcome=passed`, source status `ok`, stable
   counts, and no duplicate records. If it remains failed, leave the alert open
   and serve the safe partial state.
4. Roll back only an offending dashboard configuration/read-model change using
   the release owner’s approved artifact; never patch production metrics by
   hand.

### Escalation

Escalate a shared source failure to the owning runtime team; an alert/read-model
or count mismatch to Analytics/API; and a permission/tenant leak to Security.
If three consecutive bounded refreshes fail, open an incident rather than
retrying in the UI.

### Do not retry

- Permission/tenant failures, malformed query, source records that are denied,
  or a persistent `source_statuses` failure without a health change.
- Refresh loops that would amplify a provider outage or turn an unknown count
  into zero.
- Any dashboard action against a record whose source status is failed or stale;
  route the user to the owning workflow after recovery.

## Closeout and external gate

The local closeout command is:

```sh
node scripts/validate-client-operations-runbook.mjs
```

The resulting validator artifact is written to
`.omo/evidence/client-operations-runbook-validator.json`. With the current
external boundary it reports `contract_verdict=PASS`,
`gate_status=BLOCKED_EXTERNAL`, `complete=false`, and exits `2`; that is an
intentional no-go, not a completed operations gate. A `PASS` gate requires every
required external receipt in addition to internally consistent runbook links,
commands, hashes, and synthetic receipts. Real Graph/AWS/deploy drills remain blocked until:

1. the M365 owner supplies an approved Graph/Entra scope and provider receipt;
2. the AWS/release owner supplies a fresh role-chain, Lambda revision, and
   deployment/read-back receipt; and
3. the data/security owners approve any staging database read-back containing
   client or financial records.
