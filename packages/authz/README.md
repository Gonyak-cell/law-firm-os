# Authorization Package

Permission engine concepts:

- RBAC
- ABAC
- Object ACL
- Deny Rule
- Security trimming

Deny rules always override allow rules.

## G1-A Tenant, Actor, and Permission Context

`packages/authz/src/trust-context.js` opens the Client-Matter OS G1-A slice for
`LFOS-G1-W01-T001` through `LFOS-G1-W01-T003`:

- `validateTenantBoundary()` fails closed when tenant context is missing,
  mismatched, or cross-tenant.
- `createActorContext()` fails closed when actor identity is missing or the
  actor type is not allowed.
- `createPermissionContext()` binds tenant, actor, action, object, request, and
  audit context while marking permission context persistence as required and
  header-only trust as disallowed.

This slice does not close G1. It opens the first trust foundation runtime
interface for later durable audit and permission-control PRs.

## G1-C Permission Controls

`packages/authz/src/permission-controls.js` opens the Client-Matter OS G1-C
slice for `LFOS-G1-W01-T007` through `LFOS-G1-W01-T012`:

- `evaluatePermissionControlRequest()` models the `/permissions/evaluate`
  wrapper and maps `allow`, `deny`, `review_required`, and `approval_required`
  decisions to response receipts with audit binding metadata.
- Deny-over-allow remains fail-closed because control deny rules are evaluated
  before Object ACL and allow rules.
- Object ACL allow and deny entries are normalized into the evaluator without
  letting allow entries override explicit deny rules.
- Ethical wall controls add tenant/matter-scoped deny rules so blocked users
  cannot list or read the protected matter surface.
- Legal hold controls block held document delete/disposal actions even when
  a normal allow rule or object ACL allow exists.
- Break-glass access is only eligible for an allow candidate when reason,
  approval, and audit intent are present; it still cannot bypass deny rules.

This slice does not close G1. Audit hash-chain verification, export, simulator,
and G1 closeout evidence remain in the G1-D slice.

## G1-D Admin Permission Simulator

`packages/authz/src/admin-simulator.js` opens `LFOS-G1-W01-T015`:

- `simulateAdminPermission()` runs the permission-control wrapper as a
  simulation-only receipt.
- The simulator never grants access, never mutates policy, and requires audit
  binding metadata for every simulation.
- Unauthorized admin actor types fail closed before simulation.

This slice does not close G1 by itself. It provides simulator evidence for the
G1-D audit closeout PR.

## CP00-108 Permission Kernel Foundation Catalog

CP00-108 starts RP02 with a generated-plan-aligned foundation catalog over
`RP02.P00.M00.S01-RP02.P01.M05.S20`:

- 150 planned Risk C units are represented by
  `createPermissionKernelCp108FoundationCatalog()`.
- The catalog is synthetic-only and catalog-only.
- It does not mutate permission policy, write audit ledger entries, write product
  state, execute external sharing, execute AI retrieval, or implement LDIP.
- Handoff is fixed to CP00-109 / `RP02.P01.M06.S01`.

## CP00-109 Permission Kernel Model And Service Catalog

CP00-109 continues RP02 over `RP02.P01.M06.S01-RP02.P02.M04.S06`:

- 150 planned Risk C units are represented by
  `createPermissionKernelCp109ModelServiceCatalog()`.
- The model side closes synthetic fixture, test, Hermes evidence, Claude review,
  and closeout handoff catalog references.
- The service side opens metadata-only request, tenant, matter, permission, and
  audit-hint prechecks.
- `createPermissionKernelCp109ServicePrecheck()` fails closed on tenant or matter
  drift before permission evaluation.
- The pack does not mutate policy, write audit events, persist idempotency keys,
  acquire locks, execute rollback/retry, share/export data, run AI, or implement
  LDIP.
- Handoff is fixed to CP00-110 / `RP02.P02.M04.S07`.

## CP00-110 Permission Kernel Service Workflow

CP00-110 closes the planned Risk B workflow range
`RP02.P02.M04.S07-RP02.P02.M06.S02`:

- 40 planned service workflow units are represented by
  `createPermissionKernelCp110ServiceWorkflowCatalog()`.
- Catalog titles intentionally reuse the service workflow template labels across
  micro-phases; the authoritative unit identity remains each `RP02...Sxx` source
  unit id from the generated closeout-pack plan.
- `executePermissionKernelCp110Workflow()` invokes `evaluatePermission()` only
  for synthetic, in-tenant, matter-consistent requests.
- Non-synthetic, cross-tenant, and matter-drift requests are blocked before
  permission evaluation.
- Allow, deny, review-required, and approval-required decisions are routed to
  metadata-only workflow states.
- Idempotency, lock, persistence, rollback, retry, and audit hint outputs are
  receipts only; the pack does not persist keys, acquire locks, write audit
  events, write product state, share/export data, run AI, or implement LDIP.
- Handoff is fixed to CP00-111 / `RP02.P02.M06.S03`.

## CP00-111 Permission Kernel Synthetic Fixture Boundary

CP00-111 closes the planned Risk A fixture-boundary range
`RP02.P02.M06.S03-RP02.P02.M06.S12`:

- 10 planned synthetic fixture units are represented by
  `createPermissionKernelCp111SyntheticFixtureBoundaryCatalog()`.
- `createPermissionKernelCp111SyntheticFixtureBoundaryMatrix()` exercises
  tenant block, matter block, permission allow/deny, object ACL allow, review
  routing, audit hint preview, idempotency, lock, and persistence profiles.
- Tenant and matter drift block before evaluator invocation.
- Deny routes to a blocked claim; allow and object ACL paths complete as
  metadata-only decisions; review-required transitions stay review-routed.
- Idempotency, lock, persistence, and audit hint profile outputs remain
  metadata-only receipts; the pack does not mutate policy, write audit events,
  persist keys, acquire locks, create database rows, write product state,
  share/export data, run AI, or implement LDIP.
- Handoff is fixed to CP00-112 / `RP02.P02.M06.S13`.

## CP00-112 Permission Kernel Interface Closeout

CP00-112 closes the planned Risk C terminal and interface range
`RP02.P02.M06.S13-RP02.P03.M05.S06`:

- 150 planned units are represented by
  `createPermissionKernelCp112InterfaceCloseoutCatalog()`.
- The terminal service side closes synthetic fixture, test, Hermes evidence,
  Claude review, closeout, and handoff catalog references for the CP00-108
  through CP00-111 permission-kernel chain.
- The API interface side opens metadata-only request, response, pagination,
  validation-error, permission/audit annotation, and fixture contracts.
- Unauthorized fields are omitted from response fixtures before display.
- Non-synthetic requests, tenant drift, matter drift, permission denial, and
  invalid pagination map to explicit error-code receipts.
- Terminal profiles and API fixtures remain metadata-only; the pack does not
  mutate policy, write audit events, persist keys, acquire locks, create
  database rows, write product state, share/export data, run AI, or implement
  LDIP.
- Handoff is fixed to CP00-113 / `RP02.P03.M05.S07`.

## CP00-113 Permission Kernel API Permission And Audit Binding

CP00-113 closes the planned Risk A API permission/audit binding range
`RP02.P03.M05.S07-RP02.P03.M05.S16`:

- 10 planned units are represented by
  `createPermissionKernelCp113ApiPermissionAuditBindingCatalog()`.
- `createPermissionKernelCp113ApiPermissionAuditBindingFixture()` invokes the
  permission evaluator only after synthetic, tenant, matter, and pagination
  prechecks pass.
- The allow fixture serializes only the explicit response allowlist and omits
  privileged notes, cross-tenant secrets, internal policy labels, and sealed
  audit hint payloads before response.
- The denied fixture exercises `permission_denied`; invalid fixtures exercise
  non-synthetic, tenant, matter, and pagination error receipts.
- Permission and audit annotations are metadata-only; audit hints remain
  preview-only until RP03 and are not written to the audit ledger.
- The pack does not mutate policy, write audit events, persist keys, acquire
  locks, create database rows, write product state, share/export data, run AI,
  or implement LDIP.
- Handoff is fixed to CP00-114 / `RP02.P03.M05.S17`.

## CP00-114 Permission Kernel API Synthetic Fixture Set

CP00-114 closes the planned Risk A terminal/opening range
`RP02.P03.M05.S17-RP02.P03.M06.S06`:

- 10 planned units are represented by
  `createPermissionKernelCp114ApiSyntheticFixtureSetCatalog()`.
- `createPermissionKernelCp114ApiSyntheticFixtureSurface()` inherits the CP113
  API permission/audit binding fixture and publishes a versioned metadata-only
  request/response surface for downstream consumers.
- The public export map is package-level only; it does not expose runtime API
  routes or persistence adapters.
- The fixture matrix exercises allow, deny, non-synthetic, and invalid
  pagination paths with the CP113 error and safety taxonomy.
- Permission annotations and audit annotations remain preview metadata; audit
  hints do not write to the audit ledger or expose hidden source fields.
- The pack does not mutate policy, write audit events, persist keys, acquire
  locks, create database rows, write product state, share/export data, run AI,
  or implement LDIP.
- Handoff is fixed to CP00-115 / `RP02.P03.M06.S07`.

## CP00-115 Permission Kernel API Fixture And UI Readiness Catalog

CP00-115 closes the planned Risk C API fixture terminal and UI readiness range
`RP02.P03.M06.S07-RP02.P04.M05.S07`:

- 150 planned units are represented by
  `createPermissionKernelCp115ApiFixtureUiReadinessCatalog()`.
- The API terminal side inherits the CP114 synthetic fixture matrix and closes
  pagination, serialization, unauthorized-data omission, fixture tests, Hermes
  evidence, Claude packet, documentation, versioning, and handoff references.
- The UI readiness side catalogs loading, empty, denied, review-required,
  interaction, permission badge, audit hint, responsive layout, keyboard/focus,
  state snapshot, and no-unauthorized-count-leak surfaces.
- These UI entries are catalog-only readiness records, not runtime UI routes or
  product-state implementations.
- Denied and review-required states cannot grant approval, expose hidden source
  fields, leak unauthorized counts, write audit events, or trigger external
  sharing/export/AI retrieval.
- The pack does not mutate policy, write audit events, persist keys, acquire
  locks, create database rows, write product state, share/export data, run AI,
  or implement LDIP.
- Handoff is fixed to CP00-116 / `RP02.P04.M05.S08`.

## CP00-116 Permission Kernel UI Permission And Audit Binding

CP00-116 closes the planned Risk A UI permission/audit binding range
`RP02.P04.M05.S08-RP02.P04.M05.S17`:

- 10 planned units are represented by
  `createPermissionKernelCp116UiPermissionAuditBindingCatalog()`.
- `createPermissionKernelCp116UiPermissionAuditBindingSurface()` binds CP115 UI
  readiness into secondary interaction, permission badge, audit hint, error
  copy, responsive layout, keyboard/focus, visual density, fixture binding, and
  build-smoke metadata.
- Permission badges are visible but cannot grant access; denied secondary
  interactions are disabled, and review-required interactions require review
  without granting approval.
- Audit hints remain preview-only, are not emitted to the audit ledger, and omit
  hidden source fields before UI display.
- Error copy and UI layout surfaces do not expose hidden source fields or
  unauthorized counts.
- The pack does not add runtime UI routes, mutate policy, write audit events,
  persist keys, acquire locks, create database rows, write product state,
  share/export data, run AI, or implement LDIP.
- Handoff is fixed to CP00-117 / `RP02.P04.M05.S18`.

## CP00-117 Permission Kernel UI Evidence And State Snapshot

CP00-117 closes the planned Risk A UI evidence/state snapshot range
`RP02.P04.M05.S18-RP02.P04.M06.S05`:

- 10 planned units are represented by
  `createPermissionKernelCp117UiEvidenceStateSnapshotCatalog()`.
- `createPermissionKernelCp117UiStateSnapshot()` inherits the CP116
  permission badge, audit hint, error copy, and responsive binding surfaces as
  metadata-only snapshots.
- Hermes UI evidence and Claude UI leak prompt entries are reference records;
  they do not execute validation or Claude review by themselves.
- Loading, empty, and denied states are represented as synthetic fixture
  snapshots. Denied state disables secondary interaction and cannot grant
  access.
- The data dependency map allowlists only sanitized CP116 metadata and records
  hidden source fields as denied dependencies.
- Unauthorized counts are not collected or rendered, and hidden source fields
  are omitted from audit hints, error copy, data maps, and state snapshots.
- The pack does not add runtime UI routes, mutate policy, write audit events,
  persist keys, acquire locks, create database rows, write product state,
  share/export data, run AI, or implement LDIP.
- Handoff is fixed to CP00-118 / `RP02.P04.M06.S06`.

## CP00-118 Permission Kernel UI Synthetic Fixture And Golden Case Catalog

CP00-118 closes the planned Risk C UI terminal fixture and fixture/golden-case
opening range `RP02.P04.M06.S06-RP02.P05.M04.S07`:

- 150 planned units are represented by
  `createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog()`.
- The pack covers 85 UI terminal fixture units and 65 fixture/golden-case
  opening units.
- `createPermissionKernelCp118UiSyntheticFixtureMatrix()` inherits the CP117
  three-state snapshot matrix and publishes metadata-only UI terminal surfaces,
  base fixtures, and golden-case profiles.
- Cross-tenant and missing-context cases are blocked reference fixtures; AI
  retrieval or analytics cases are explicitly blocked and do not execute.
- Base tenant, user, matter, and document fixtures are synthetic stable-id
  records only, not database rows.
- Permission badges cannot grant access, unauthorized counts are not exposed,
  hidden source fields are not surfaced, and all audit hints remain preview
  metadata until RP03.
- The pack does not add runtime UI routes, mutate policy, write audit events,
  persist keys, acquire locks, create database rows, write product state,
  share/export data, run AI or analytics, or implement LDIP.
- Handoff is fixed to CP00-119 / `RP02.P05.M04.S08`.

## CP00-119 Permission Kernel Fixture Workflow Binding

CP00-119 closes the planned Risk B fixture workflow binding range
`RP02.P05.M04.S08-RP02.P05.M06.S05`:

- 40 planned units are represented by
  `createPermissionKernelCp119FixtureWorkflowBindingCatalog()`.
- `createPermissionKernelCp119FixtureWorkflowMatrix()` inherits the CP118
  synthetic fixture/golden-case matrix and binds nine workflow cases plus four
  base fixture bindings as metadata-only receipts.
- `runPermissionKernelCp119FixtureWorkflowCase()` routes primary and secondary
  golden cases, review-required cases, denied cases, cross-tenant prechecks,
  missing-context prechecks, security trimming, and AI/analytics boundary
  blocks using synthetic inputs only.
- Security trimming omits unauthorized resources before display without
  exposing unauthorized counts; audit hints remain preview-only and are not
  emitted to the audit ledger.
- Stable IDs and replay commands are deterministic reference records; they do
  not persist idempotency keys, acquire locks, execute rollback/retry, or write
  product state.
- The pack does not add runtime UI/API routes, mutate policy, write audit
  events, create database rows, share/export data, run AI or analytics, or
  implement LDIP.
- Handoff is fixed to CP00-120 / `RP02.P05.M06.S06`.

## CP00-120 Permission Kernel Fixture Evidence And Permission Matrix

CP00-120 closes the planned Risk C fixture evidence and permission matrix
opening range `RP02.P05.M06.S06-RP02.P06.M03.S14`:

- 150 planned units are represented by
  `createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog()`.
- The pack covers 85 fixture/evidence/review/closeout units and 65 permission
  matrix opening units across scope inventory, contract draft, type/shape
  definition, and primary implementation opening.
- `createPermissionKernelCp120FixtureEvidencePermissionMatrix()` inherits the
  CP119 fixture workflow matrix and publishes metadata-only fixture evidence
  records plus permission decision bindings.
- `runPermissionKernelCp120PermissionDecisionBinding()` covers view, search,
  mutation, export/download, share, AI retrieval, audit hint, matched-rule,
  deny-over-allow, legal hold, Ethical Wall, object ACL, review-required,
  approval-required, security-trimming, audit expectation, fixture, allowed,
  and denied paths using synthetic inputs only.
- Export/download and external share bindings route to review or approval
  without executing exports or shares; AI retrieval is blocked at the boundary.
- Audit event expectations are preview-only and do not write the audit ledger.
- The pack does not add runtime UI/API routes, mutate policy, write audit
  events, create database rows, persist keys, acquire locks, share/export data,
  run AI or analytics, or implement LDIP.
- Handoff is fixed to CP00-121 / `RP02.P06.M03.S15`.

## CP00-121 Permission Kernel Risk A Permission Matrix Boundary

CP00-121 closes the planned Risk A permission matrix boundary range
`RP02.P06.M03.S15-RP02.P06.M04.S02`:

- 10 planned units are represented by
  `createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog()`.
- `createPermissionKernelCp121PermissionMatrixRiskBoundary()` inherits the
  CP120 permission decision matrix and narrows the active gate to
  approval-required routing, security trimming, audit event expectation,
  permission fixture, allowed/denied/cross-tenant/leak-prevention tests,
  permission matrix row, and view decision binding.
- Approval-required routing can only return metadata for review/approval flow;
  it cannot grant human approval or mutate policy.
- Security trimming renders only authorized result IDs, omits unauthorized
  resources before display, and does not expose unauthorized counts or hidden
  source field names.
- Audit event expectations are preview-only and do not write the audit ledger;
  permission fixtures and matrix rows are synthetic metadata and are not
  persisted.
- The pack does not add runtime UI/API routes, mutate policy, write audit
  events, create database rows, persist keys, acquire locks, share/export data,
  run AI or analytics, or implement LDIP.
- Handoff is fixed to CP00-122 / `RP02.P06.M04.S03`.

## CP00-122 Permission Kernel Permission Matrix Workflow Binding

CP00-122 closes the planned Risk B permission matrix workflow range
`RP02.P06.M04.S03-RP02.P06.M05.S20`:

- 40 planned units are represented by
  `createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog()`.
- The pack covers the terminal secondary workflow slice and the opening
  permission/audit binding slice, each as 20 synthetic metadata-only workflow
  cases.
- `createPermissionKernelCp122PermissionMatrixWorkflowBinding()` inherits the
  CP121 Risk A boundary matrix and binds search, mutation, export/download,
  share, AI retrieval, audit hint, matched-rule, deny-over-allow, legal hold,
  Ethical Wall, object ACL, review-required, approval-required, security
  trimming, audit expectation, permission fixture, allowed, denied,
  cross-tenant, and leak-prevention cases.
- Export/download routes to review without executing exports; external share
  and mutation routes require approval without granting approval; AI retrieval
  is blocked at the boundary.
- Security trimming renders only authorized result IDs and omits hidden source
  fields and unauthorized counts. Audit expectations remain preview-only and
  permission fixtures/matrix rows are not persisted.
- The pack does not add runtime UI/API routes, mutate policy, write audit
  events, create database rows, persist keys, acquire locks, share/export data,
  run AI or analytics, or implement LDIP.
- Handoff is fixed to CP00-123 / `RP02.P06.M05.S21`.

## CP00-123 Permission Kernel Permission Audit Terminal Boundary

CP00-123 closes the planned Risk A permission/audit terminal boundary range
`RP02.P06.M05.S21-RP02.P06.M06.S08`:

- 10 planned units are represented by
  `createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog()`.
- `createPermissionKernelCp123PermissionAuditTerminalBoundary()` inherits the
  CP122 workflow binding and narrows the active gate to cross-tenant and
  leak-prevention tests plus synthetic fixture opening bindings.
- Cross-tenant access fails closed with a redacted audit object. Leak
  prevention and search trimming render only authorized result IDs, without
  exposing unauthorized counts or hidden field names.
- Mutation and share bindings require approval without granting approval.
  Export/download requires review without executing export, and AI retrieval
  is blocked at the boundary.
- Audit hints are preview-only and not emitted to the audit ledger; permission
  matrix rows remain synthetic metadata and are not persisted.
- The pack does not add runtime UI/API routes, mutate policy, write audit
  events, create database rows, persist keys, acquire locks, share/export data,
  run AI or analytics, or implement LDIP.
- Handoff is fixed to CP00-124 / `RP02.P06.M06.S09`.

## CP00-124 Permission Kernel Permission Fixture And Failure Taxonomy

CP00-124 closes the planned Risk C permission matrix terminal and failure
taxonomy opening range `RP02.P06.M06.S09-RP02.P07.M03.S10`:

- 150 planned units are represented by
  `createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog()`.
- The pack covers 89 permission matrix terminal units and 61 failure taxonomy
  opening units across scope inventory, contract draft, type/shape definition,
  and primary implementation opening.
- `createPermissionKernelCp124PermissionFixtureFailureTaxonomy()` inherits the
  CP123 permission/audit terminal boundary and publishes metadata-only
  permission matrix cases plus fail-closed failure taxonomy records.
- Permission matrix cases preserve tenant redaction, security trimming,
  approval/review routing, preview-only audit hints, non-persisted fixtures,
  and blocked AI retrieval without executing export/share/AI actions.
- Failure taxonomy cases fail closed for missing tenant, missing actor, missing
  Matter, missing resource, unknown action, cross-tenant, permission denied,
  ambiguous rule, stale reference, lock conflict, retry exhaustion, rollback,
  compensation, blocked-claim receipt, fixture, test, audit hint, and Hermes
  evidence boundaries.
- Lock, retry, rollback, compensation, audit, Hermes, export/share, AI, and
  analytics surfaces are reference-only; no runtime route, policy mutation,
  audit/product/database write, idempotency persistence, or LDIP implementation
  is added.
- Handoff is fixed to CP00-125 / `RP02.P07.M03.S11`.

## CP00-125 Permission Kernel Failure Taxonomy Risk Boundary

CP00-125 closes the planned Risk A failure taxonomy boundary
`RP02.P07.M03.S11-RP02.P07.M03.S20`:

- 10 planned units are represented by
  `createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog()`.
- The pack inherits CP124 failure taxonomy behavior and narrows the terminal
  primary implementation boundary for lock conflict, retry exhaustion,
  rollback expectation, compensation expectation, blocked-claim receipt,
  failure fixture, failure unit test, failure integration smoke, audit failure
  hint, and Hermes failure evidence.
- Lock conflicts are blocked without acquiring locks or persisting lock tokens.
  Retry exhaustion records no retry execution. Rollback and compensation
  expectations are bound without rollback, compensation, product-state, audit,
  database, or idempotency writes.
- Blocked-claim receipts, audit failure hints, and Hermes failure evidence are
  preview/reference-only. Fixture, unit-test, and smoke bindings remain
  deterministic synthetic metadata.
- The pack adds no runtime UI/API route, policy mutation, external share/export,
  AI/analytics execution, LDIP implementation, or HRX split.
- Handoff is fixed to CP00-126 / `RP02.P07.M03.S21`.

## CP00-126 Permission Kernel Failure Taxonomy Workflow Binding

CP00-126 closes the planned Risk B failure taxonomy workflow and
permission/audit binding range `RP02.P07.M03.S21-RP02.P07.M05.S16`:

- 40 planned units are represented by
  `createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog()`.
- The pack inherits CP125 failure boundary behavior and covers primary
  review/escalation references, the full secondary workflow slice, and the
  opening permission/audit binding slice.
- Claude edge-case prompts are read-only references and do not execute Claude
  review. Human escalation notes do not grant approval and remain manual
  escalation references only.
- Secondary workflow and permission/audit binding cases fail closed for missing
  context, cross-tenant access, permission denial, ambiguous/stale references,
  lock conflict, retry exhaustion, rollback, compensation, blocked-claim
  receipt, fixture, tests, audit hint, and Hermes evidence.
- Permission/audit bindings are preview/reference-only; no audit ledger event,
  runtime route, policy mutation, product/database write, idempotency
  persistence, lock acquisition, retry, rollback, compensation, export/share,
  AI/analytics, LDIP implementation, or HRX split is added.
- Handoff is fixed to CP00-127 / `RP02.P07.M05.S17`.

## CP00-127 Permission Kernel Failure Taxonomy Test Fixture Boundary

CP00-127 closes the planned Risk A failure taxonomy permission/audit test
evidence and synthetic fixture opening range
`RP02.P07.M05.S17-RP02.P07.M06.S04`:

- 10 planned units are represented by
  `createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog()`.
- The pack inherits CP126 failure taxonomy workflow binding behavior and binds
  deterministic reference-only unit-test and integration-smoke rows for the
  permission/audit terminal slice.
- Audit failure hints and Hermes failure evidence remain preview/reference-only
  and do not write audit ledgers or Hermes runtime receipts.
- Claude edge-case prompts are bound as review prompts only and do not execute
  Claude. Human escalation notes remain manual references and do not grant
  approval.
- The synthetic fixture opening fails closed for missing tenant, actor, and
  Matter cases without real data, persistence, runtime UI/API routes, permission
  policy mutation, product/database writes, idempotency persistence, locks,
  retries, rollback, compensation, export/share, AI/analytics execution, LDIP
  implementation, or HRX split.
- Handoff is fixed to CP00-128 / `RP02.P07.M06.S05`.

## CP00-128 Permission Kernel Failure Taxonomy Evidence Harness

CP00-128 closes the planned Risk C failure taxonomy evidence harness range
`RP02.P07.M06.S05-RP02.P08.M03.S21`:

- 150 planned units are represented by
  `createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog()`.
- The pack inherits CP127 test fixture boundary behavior and covers the
  terminal synthetic fixture set, test/golden cases, Hermes evidence packet,
  Claude review packet, closeout handoff rows, and the opening RP02.P08 Hermes
  evidence inventory/type/shape/primary implementation slice.
- Failure taxonomy and fixture rows fail closed for missing resource, unknown
  action, cross-tenant access, permission denial, ambiguous and stale
  references, lock conflict, retry exhaustion, rollback, and compensation.
- Test/golden rows are deterministic references and do not persist state. Hermes
  evidence rows are preview/reference-only and do not write Hermes runtime or
  audit ledgers.
- Claude packet rows remain read-only references and do not execute Claude.
  Human approval markers do not grant approval. Closeout handoff rows do not
  commit, approve, or mark production_ready.
- The harness adds no runtime UI/API routes, permission policy mutation,
  product/database writes, idempotency persistence, locks, retries, rollback,
  compensation, export/share, AI/analytics execution, LDIP implementation, or
  HRX split.
- Handoff is fixed to CP00-129 / `RP02.P08.M03.S22`.

## CP00-129 Permission Kernel Hermes Evidence Workflow Binding

CP00-129 closes the planned Risk B Hermes evidence workflow binding range
`RP02.P08.M03.S22-RP02.P08.M05.S19`:

- 40 planned units are represented by
  `createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog()`.
- The pack inherits CP128 failure taxonomy evidence harness behavior and binds
  the terminal operator summary, secondary workflow evidence rows, and opening
  permission/audit evidence binding rows.
- Operator summaries are reference-only and do not render hidden source fields
  or real client data. Hermes evidence rows bind command matrices, field lists,
  changed-file receipts, command-result receipts, fixture summaries, blocked
  claims, no-real-data receipts, validation checks, harness notes, and handoff
  rows without writing Hermes runtime receipts or audit ledger entries.
- Permission and audit summaries remain reference-only. Changed-file and
  command-result receipts do not disclose raw diffs or raw command output.
- Claude dependency markers do not execute Claude review, and human approval
  markers do not grant approval. PASS, PASS_WITH_FINDINGS, and BLOCK semantics
  are represented as metadata-only evidence rows, with BLOCK preventing
  production_ready.
- Regression receipts are deterministic and non-persistent. Closeout handoff
  rows do not commit the pack or mark production_ready by themselves.
- The binding adds no runtime UI/API routes, permission policy mutation,
  product/database writes, idempotency persistence, locks, retries, rollback,
  compensation, export/share, AI/analytics execution, LDIP implementation, or
  HRX split.
- Handoff is fixed to CP00-130 / `RP02.P08.M05.S20`.

## CP00-130 Permission Kernel Hermes Evidence Synthetic Fixture Boundary

CP00-130 closes the planned Risk A Hermes evidence terminal and synthetic
fixture opening range `RP02.P08.M05.S20-RP02.P08.M06.S07`:

- 10 planned units are represented by
  `createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog()`.
- The pack inherits CP129 Hermes evidence workflow binding behavior and narrows
  the active boundary to permission/audit terminal rows plus the opening
  synthetic fixture evidence rows.
- Next-gate readiness, documentation update, and operator summary rows are
  reference-only. They do not publish documentation, commit the pack, mark
  production_ready by themselves, render hidden source fields, or use real
  client data.
- Synthetic fixture evidence rows bind the Hermes command matrix, evidence
  field list, changed-file receipt, command-result receipt, fixture summary,
  blocked-claim receipt, and permission summary receipt.
- Changed-file and command-result receipts do not disclose raw diffs or raw
  command output. Fixture summaries contain no real data and are not persisted.
  Blocked-claim receipts remain preview-only, and permission summaries remain
  reference-only without mutating policy.
- The boundary adds no runtime UI/API routes, permission policy mutation,
  audit/product/database writes, idempotency persistence, locks, retries,
  rollback, compensation, export/share, AI/analytics execution, LDIP
  implementation, or HRX split.
- Handoff is fixed to CP00-131 / `RP02.P08.M06.S08`.

## CP00-131 Permission Kernel Hermes Evidence Synthetic Fixture Verdict Boundary

CP00-131 closes the planned Risk A Hermes evidence synthetic fixture verdict
range `RP02.P08.M06.S08-RP02.P08.M06.S17`:

- 10 planned units are represented by
  `createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCatalog()`.
- The pack inherits CP130 synthetic fixture evidence behavior and narrows the
  active boundary to audit/no-real-data receipts, Claude dependency marker,
  human approval marker, PASS/PASS_WITH_FINDINGS/BLOCK semantics, evidence
  template, validation command check, and harness boundary note.
- Audit summary and no-real-data receipts are reference-only. They do not emit
  audit ledger entries, persist fixture data, render hidden template fields, or
  mutate permission policy.
- Claude dependency markers require exactly one read-only pack review but do
  not execute Claude from product runtime. Human approval markers do not grant
  approval or mark production_ready by themselves.
- PASS, PASS_WITH_FINDINGS, and BLOCK semantics are metadata-only. BLOCK
  prevents production_ready, and PASS_WITH_FINDINGS requires adjudication.
- Evidence templates, validation command checks, and harness boundary notes are
  inert/reference-only and do not execute commands, disclose raw output, invoke
  the Hermes runtime, or write runtime receipts.
- The boundary adds no runtime UI/API routes, permission policy mutation,
  audit/product/database writes, idempotency persistence, locks, retries,
  rollback, compensation, export/share, AI/analytics execution, LDIP
  implementation, or HRX split.
- Handoff is fixed to CP00-132 / `RP02.P08.M06.S18`.

## CP00-132 Permission Kernel Fixture Evidence Review Readiness Catalog

CP00-132 closes the planned Risk C fixture/evidence/review readiness range
`RP02.P08.M06.S18-RP02.P09.M05.S17`:

- 150 planned units are represented by
  `createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog()`.
- The pack inherits CP131 verdict-boundary behavior and expands the catalog to
  synthetic fixture tail rows, test/golden-case rows, Hermes evidence packet
  rows, Claude review packet rows, closeout/handoff evidence receipts, and P09
  review question/readiness slices.
- Fixture and evidence receipts remain reference-only. Changed-file and
  command-result receipts do not disclose raw diffs or raw output; audit
  summaries do not emit audit ledger entries; no-real-data receipts do not
  hold real client data.
- Review questions, security audit questions, UI leak questions, finding
  routing maps, closeout criteria, closeout notes, and command rerun rows are
  inert metadata. They do not execute permission bypass checks, render UI,
  execute commands, commit the pack, or mark production_ready by themselves.
- Claude review packet rows require one read-only pack review but do not
  execute Claude from product runtime.
- The catalog adds no runtime UI/API routes, permission policy mutation,
  audit/product/database writes, idempotency persistence, locks, retries,
  rollback, compensation, export/share, AI/analytics execution, LDIP
  implementation, or HRX split.
- Handoff is fixed to CP00-133 / `RP02.P09.M05.S18`.

## CP00-133 Permission Kernel Terminal Review Question Boundary

CP00-133 closes the planned Risk A terminal handoff and synthetic fixture
review-question boundary range `RP02.P09.M05.S18-RP02.P09.M06.S07`:

- 10 planned units are represented by
  `createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog()`.
- The pack inherits CP132 fixture/evidence/review readiness behavior and
  binds the terminal next-RP dependency, documentation update, command rerun,
  architecture/security review questions, permission-bypass questions, audit
  completeness questions, missing-test questions, UI-leak questions, and
  downstream-readiness questions.
- Terminal handoff rows are reference-only. Documentation updates do not
  publish docs, command reruns do not execute commands, and next dependency
  rows do not commit the pack or mark production_ready.
- Review, security-audit, test, and UI questions remain inert metadata. They
  do not execute Claude, permission bypass probes, audit writes, tests, or UI
  rendering from product runtime.
- The boundary adds no runtime UI/API routes, permission policy mutation,
  audit/product/database writes, idempotency persistence, locks, retries,
  rollback, compensation, export/share, AI/analytics execution, LDIP
  implementation, or HRX split.
- Handoff is fixed to CP00-134 / `RP02.P09.M06.S08`.

## CP00-134 Permission Kernel Terminal Review Closeout Readiness

CP00-134 closes the planned Risk C RP02 terminal review and closeout readiness
range `RP02.P09.M06.S08-RP02.P09.M10.S04`:

- 65 planned units are represented by
  `createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog()`.
- The pack inherits CP133 terminal review-question behavior and covers the
  remaining RP02 review/closeout rows: risk registers, severity taxonomy,
  go/no-go verdict formats, finding routing maps, human approval summaries,
  Claude review packets, closeout criteria, PASS/PASS_WITH_FINDINGS/BLOCK
  notes, next dependencies, documentation updates, command reruns, review
  questions, security-audit questions, missing-test questions, and UI-leak
  questions.
- Closeout decisions are reference-only. Finding routing does not execute,
  PASS_WITH_FINDINGS requires adjudication, BLOCK prevents production_ready,
  and human approval summaries do not grant approval.
- Claude review packets, command reruns, security-audit questions, missing-test
  questions, UI-leak questions, and risk registers remain inert metadata and
  do not execute runtime actions or write product state.
- The catalog adds no runtime UI/API routes, permission policy mutation,
  audit/product/database writes, idempotency persistence, locks, retries,
  rollback, compensation, export/share, AI/analytics execution, LDIP
  implementation, or HRX split.
- Handoff is fixed to CP00-135 / `RP03.P00.M00.S01`.
