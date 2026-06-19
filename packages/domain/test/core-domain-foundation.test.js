import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING,
  CORE_DOMAIN_PACK_BINDING,
  CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT,
  CORE_DOMAIN_API_PACK_BINDING,
  CORE_DOMAIN_API_CONTRACT,
  CORE_DOMAIN_GOLDEN_CASE_PACK_BINDING,
  CORE_DOMAIN_UI_PACK_BINDING,
  CORE_DOMAIN_UI_STATE_CONTRACT,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT,
  CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT,
  CORE_DOMAIN_WORKFLOW_PACK_BINDING,
  CORE_DOMAIN_WORKFLOW_CONTRACT,
  assertCoreDomainWorkflowTransition,
  MATTER_TRACEABLE_ENTITY_TYPES,
  PRE_MATTER_ENTITY_TYPES,
  assembleCoreDomainServiceIntake,
  buildCoreDomainGoldenCaseSet,
  createCoreDomainApiRequest,
  createCoreDomainClaudeReviewPacket,
  createCoreDomainCloseoutHandoff,
  createCoreDomainHermesEvidencePacket,
  createCoreDomainSyntheticFixtureSet,
  createCoreDomainUiCloseoutHandoff,
  createCoreDomainUiFixtureBinding,
  createCoreDomainHermesUiEvidencePacket,
  createCoreDomainClaudeUiLeakPrompt,
  createCoreDomainPermissionAuditBindingState,
  createCoreDomainPermissionAuditBindingMatrix,
  createCoreDomainPermissionAuditBindingEvidencePacket,
  createCoreDomainPermissionAuditBindingClaudePrompt,
  createCoreDomainPermissionAuditBindingCloseoutHandoff,
  createCoreDomainPermissionAuditFixtureBinding,
  createCoreDomainPermissionAuditFixtureState,
  createCoreDomainPermissionAuditFixtureStateMatrix,
  createCoreDomainPermissionAuditVisualDensityReport,
  createCoreDomainPermissionAuditFixtureEvidencePacket,
  createCoreDomainPermissionAuditFixtureClaudePrompt,
  createCoreDomainPermissionAuditFixtureCloseoutHandoff,
  createCoreDomainCp101UiFixtureState,
  createCoreDomainCp101UiFixtureStateMatrix,
  createCoreDomainCp101FixtureCaseCatalog,
  createCoreDomainCp101FixtureManifest,
  createCoreDomainCp101HermesEvidencePacket,
  createCoreDomainCp101ClaudeReviewPacket,
  createCoreDomainCp101CloseoutHandoff,
  createCoreDomainCp102PermissionMatrixRows,
  createCoreDomainCp102SecurityInteractionSet,
  createCoreDomainCp102PermissionFixtureManifest,
  createCoreDomainCp102HermesEvidencePacket,
  createCoreDomainCp102ClaudeReviewPacket,
  createCoreDomainCp102CloseoutHandoff,
  createCoreDomainCp103AuditPermissionReviewItems,
  createCoreDomainCp103ExportShareDecisionBindings,
  createCoreDomainCp103PermissionReviewManifest,
  createCoreDomainCp103HermesEvidencePacket,
  createCoreDomainCp103ClaudeReviewPacket,
  createCoreDomainCp103CloseoutHandoff,
  createCoreDomainCp104ReviewExtensionBindings,
  createCoreDomainCp104FailureTaxonomy,
  createCoreDomainCp104FailureScenarioMatrix,
  createCoreDomainCp104FailureFixtureSet,
  createCoreDomainCp104FailureEvidenceManifest,
  createCoreDomainCp104HermesEvidencePacket,
  createCoreDomainCp104ClaudeReviewPacket,
  createCoreDomainCp104CloseoutHandoff,
  createCoreDomainCp104CoveredUnitIds,
  createCoreDomainCp105FailureCloseoutEntries,
  createCoreDomainCp105HermesEvidenceMatrix,
  createCoreDomainCp105ReviewQuestionCatalog,
  createCoreDomainCp105EvidenceReviewManifest,
  createCoreDomainCp105HermesEvidencePacket,
  createCoreDomainCp105ClaudeReviewPacket,
  createCoreDomainCp105CloseoutHandoff,
  createCoreDomainCp105CoveredUnitIds,
  createCoreDomainCp106ReviewOutcomeRoutingCatalog,
  createCoreDomainCp106ReviewOutcomeManifest,
  createCoreDomainCp106HermesEvidencePacket,
  createCoreDomainCp106ClaudeReviewPacket,
  createCoreDomainCp106CloseoutHandoff,
  createCoreDomainCp106CoveredUnitIds,
  createCoreDomainCp107ReviewCloseoutReadinessCatalog,
  createCoreDomainCp107ReviewCloseoutManifest,
  createCoreDomainCp107HermesEvidencePacket,
  createCoreDomainCp107ClaudeReviewPacket,
  createCoreDomainCp107CloseoutHandoff,
  createCoreDomainCp107CoveredUnitIds,
  createCoreDomainUiState,
  createCoreDomainUiSurfaceInventory,
  createCoreDomainUiSurfaceStateMatrix,
  createDocumentReference,
  createDocumentVersionReference,
  createMatter,
  createPermissionReference,
  createTenant,
  executeCoreDomainApiContract,
  executeCoreDomainSyntheticFixtureWorkflow,
  executeCoreDomainWorkflow,
  getCoreDomainEntityDefinition,
  getCoreDomainUiSurface,
  getOwnerModule,
  listCoreDomainEntityTypes,
  validateCoreDomainCp100Coverage,
  validateCoreDomainCp101Coverage,
  validateCoreDomainCp102Coverage,
  validateCoreDomainCp103Coverage,
  validateCoreDomainCp104Coverage,
  validateCoreDomainCp105Coverage,
  validateCoreDomainCp106Coverage,
  validateCoreDomainCp107Coverage,
  validateCoreDomainCp099Coverage,
  validateCoreDomainCp098Coverage,
  validateCoreDomainRecord,
  validateCoreDomainCp097Coverage,
  validateCoreDomainRegistry,
} from "../src/index.js";

test("CP00-095 binds RP01 core domain pack to generated Risk C range", () => {
  assert.equal(CORE_DOMAIN_PACK_BINDING.pack_id, "CP00-095");
  assert.equal(CORE_DOMAIN_PACK_BINDING.risk_class, "C");
  assert.equal(CORE_DOMAIN_PACK_BINDING.unit_count, 150);
  assert.equal(CORE_DOMAIN_PACK_BINDING.range, "RP01.P00.M00.S01-RP01.P02.M04.S06");
});

test("core domain registry exposes required ownership and traceability boundaries", () => {
  const entities = listCoreDomainEntityTypes();
  assert.ok(entities.includes("Tenant"));
  assert.ok(entities.includes("Matter"));
  assert.ok(entities.includes("DocumentReference"));
  assert.ok(entities.includes("DocumentVersionReference"));
  assert.ok(entities.includes("AuditEvent"));
  assert.equal(getOwnerModule("DocumentReference"), "DMS");
  assert.equal(getOwnerModule("PermissionReference"), "PermissionKernel");
  assert.equal(getOwnerModule("AuditEvent"), "AuditKernel");
  assert.ok(MATTER_TRACEABLE_ENTITY_TYPES.includes("DocumentReference"));
  assert.ok(!PRE_MATTER_ENTITY_TYPES.includes("DocumentReference"));

  const registryResult = validateCoreDomainRegistry();
  assert.equal(registryResult.valid, true);
  assert.equal(registryResult.entity_count, entities.length);
});

test("entity factories cover tenant, matter, document version, and permission references", () => {
  const tenant = createTenant({ tenant_id: "t_rp01", name: "RP01 Synthetic Firm", plan: "enterprise" });
  const matter = createMatter({
    matter_id: "m_rp01",
    tenant_id: tenant.tenant_id,
    client_id: "c_rp01",
    owner_user_id: "u_owner",
    status: "open",
    confidentiality: "restricted",
  });
  const document = createDocumentReference({ document_id: "d_rp01", tenant_id: tenant.tenant_id, matter_id: matter.matter_id });
  const version = createDocumentVersionReference({
    document_version_id: "dv_rp01_v1",
    document_id: document.document_id,
    tenant_id: tenant.tenant_id,
    matter_id: matter.matter_id,
    version: 1,
  });
  const permission = createPermissionReference({
    permission_id: "perm_rp01_read",
    tenant_id: tenant.tenant_id,
    principal_type: "user",
    object_type: "Matter",
    action: "read",
    effect: "allow",
  });

  assert.equal(tenant.data_residency, "KR");
  assert.equal(version.dms_owned, true);
  assert.equal(permission.effect, "allow");
  assert.throws(
    () => createMatter({ matter_id: "m_bad", tenant_id: tenant.tenant_id, client_id: "c_rp01", owner_user_id: "u_owner", status: "invalid", confidentiality: "restricted" }),
    /Matter status must be one of/,
  );
});

test("core domain validators block missing matter trace and owner drift", () => {
  const missingTrace = validateCoreDomainRecord("DocumentReference", {
    document_id: "d_missing",
    tenant_id: "t_rp01",
    dms_owned: true,
  });
  assert.equal(missingTrace.valid, false);
  assert.ok(missingTrace.blocked_claims.includes("missing_required_fields"));
  assert.ok(missingTrace.blocked_claims.includes("missing_matter_trace"));

  const ownerDrift = validateCoreDomainRecord(
    "DocumentReference",
    { document_id: "d_rp01", tenant_id: "t_rp01", matter_id: "m_rp01", dms_owned: true },
    { owner_module: "Billing" },
  );
  assert.equal(ownerDrift.valid, false);
  assert.ok(ownerDrift.blocked_claims.includes("owner_module_drift"));

  const definition = getCoreDomainEntityDefinition("Matter");
  assert.equal(definition.primary_id, "matter_id");
});

test("metadata-only service intake normalizes requests without permission or audit writes", () => {
  assert.equal(CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT.writes_product_state, false);
  assert.equal(CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT.writes_audit_event, false);

  const result = assembleCoreDomainServiceIntake(
    {
      request_id: "req_rp01",
      tenant_id: "t_rp01",
      actor_user_id: "u_owner",
      matter_id: "m_rp01",
      entity_type: "DocumentReference",
      operation: "reference",
      requested_at: "2026-06-08T06:20:00.000Z",
    },
    {
      record: { document_id: "d_rp01", tenant_id: "t_rp01", matter_id: "m_rp01", dms_owned: true },
      records: [{ tenant_id: "t_rp01" }],
      permission_ref: { permission_id: "perm_rp01_read", tenant_id: "t_rp01", action: "read", effect: "allow" },
    },
  );

  assert.equal(result.entrypoint_id, "core_domain_service_intake");
  assert.equal(result.permission_precheck.evaluated, false);
  assert.equal(result.audit_hint.writes_audit_event, false);
  assert.equal(result.writes_product_state, false);
  assert.deepEqual(result.blocked_claims, []);
});

test("metadata-only service intake fails closed on tenant and matter drift", () => {
  assert.throws(
    () =>
      assembleCoreDomainServiceIntake(
        {
          tenant_id: "t_rp01",
          actor_user_id: "u_owner",
          matter_id: "m_rp01",
          entity_type: "DocumentReference",
          operation: "reference",
          requested_at: "2026-06-08T06:20:00.000Z",
        },
        {
          record: { document_id: "d_rp01", tenant_id: "t_other", matter_id: "m_rp01", dms_owned: true },
          records: [{ tenant_id: "t_other" }],
          permission_ref: { permission_id: "perm_rp01_read", tenant_id: "t_rp01", action: "read", effect: "allow" },
        },
      ),
    /Cross-tenant relationship is forbidden/,
  );

  assert.throws(
    () =>
      assembleCoreDomainServiceIntake(
        {
          tenant_id: "t_rp01",
          actor_user_id: "u_owner",
          entity_type: "DocumentReference",
          operation: "reference",
          requested_at: "2026-06-08T06:20:00.000Z",
        },
        {
          record: { document_id: "d_rp01", tenant_id: "t_rp01", dms_owned: true },
          records: [{ tenant_id: "t_rp01" }],
          permission_ref: { permission_id: "perm_rp01_read", tenant_id: "t_rp01", action: "read", effect: "allow" },
        },
      ),
    /DocumentReference requires matter_id before service intake/,
  );

  assert.throws(
    () =>
      assembleCoreDomainServiceIntake(
        {
          tenant_id: "t_rp01",
          actor_user_id: "u_owner",
          matter_id: "m_rp01",
          entity_type: "DocumentReference",
          operation: "reference",
          requested_at: "2026-06-08T06:20:00.000Z",
          synthetic_only: false,
        },
        {
          record: { document_id: "d_rp01", tenant_id: "t_rp01", matter_id: "m_rp01", dms_owned: true },
          records: [{ tenant_id: "t_rp01" }],
          permission_ref: { permission_id: "perm_rp01_read", tenant_id: "t_rp01", action: "read", effect: "allow" },
        },
      ),
    /must remain synthetic-only/,
  );
});

test("CP00-096 binds RP01 core domain workflow pack to generated Risk B range", () => {
  assert.equal(CORE_DOMAIN_WORKFLOW_PACK_BINDING.pack_id, "CP00-096");
  assert.equal(CORE_DOMAIN_WORKFLOW_PACK_BINDING.risk_class, "B");
  assert.equal(CORE_DOMAIN_WORKFLOW_PACK_BINDING.unit_count, 40);
  assert.equal(CORE_DOMAIN_WORKFLOW_PACK_BINDING.range, "RP01.P02.M04.S07-RP01.P02.M06.S06");
  assert.equal(CORE_DOMAIN_WORKFLOW_CONTRACT.writes_product_state, false);
  assert.equal(CORE_DOMAIN_WORKFLOW_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_WORKFLOW_CONTRACT.writes_audit_event, false);
});

test("core domain workflow completes synthetic happy path with no product writes", () => {
  const { fixtures, result } = executeCoreDomainSyntheticFixtureWorkflow();

  assert.equal(fixtures.synthetic_only, true);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.state_path, ["requested", "normalized", "prechecked", "routed", "completed"]);
  assert.equal(result.route.route, "ready");
  assert.equal(result.idempotency.key, "idem_rp01_cp096");
  assert.equal(result.idempotency.replayed, false);
  assert.equal(result.lock.acquired, true);
  assert.equal(result.persistence.target, "synthetic_fixture_store");
  assert.equal(result.persistence.writes_product_state, false);
  assert.equal(result.permission_precheck?.evaluated, undefined);
  assert.equal(result.intake.permission_precheck.evaluated, false);
  assert.equal(result.intake.audit_hint.writes_audit_event, false);
  assert.equal(result.writes_product_state, false);
});

test("core domain workflow supports review and approval routing without kernel writes", () => {
  const fixtures = createCoreDomainSyntheticFixtureSet();
  const review = executeCoreDomainWorkflow(fixtures.request, {
    ...fixtures.context,
    review_required: true,
  });
  const approval = executeCoreDomainWorkflow({ ...fixtures.request, operation: "archive" }, {
    ...fixtures.context,
    approval_required: true,
  });

  assert.equal(review.status, "completed");
  assert.equal(review.route.route, "review_required");
  assert.equal(review.route.review_required, true);
  assert.equal(review.route.permission_evaluated, false);
  assert.equal(approval.status, "completed");
  assert.equal(approval.route.route, "approval_required");
  assert.equal(approval.route.approval_required, true);
  assert.equal(approval.writes_audit_event, false);
});

test("core domain workflow maps denied permission references to blocked rollback and retry", () => {
  const { fixtures } = executeCoreDomainSyntheticFixtureWorkflow({ permission_effect: "deny" });
  const result = executeCoreDomainWorkflow(fixtures.request, fixtures.context);

  assert.equal(result.status, "blocked");
  assert.equal(result.route.route, "blocked");
  assert.ok(result.blocked_claims.includes("permission_reference_denies_operation"));
  assert.ok(result.rollback_actions.includes("discard_synthetic_fixture_snapshot"));
  assert.equal(result.retry_policy.retryable, false);
  assert.deepEqual(result.state_path, ["requested", "normalized", "prechecked", "routed", "blocked", "rolled_back"]);
  assert.equal(result.evaluates_runtime_permission, false);
});

test("core domain workflow enforces state transitions, idempotency, lock, and persistence boundary", () => {
  const fixtures = createCoreDomainSyntheticFixtureSet();
  const lockKey = `${fixtures.request.tenant_id}:${fixtures.request.entity_type}:${fixtures.request.matter_id}:${fixtures.request.operation}`;

  assert.equal(assertCoreDomainWorkflowTransition("routed", "completed"), true);
  assert.throws(() => assertCoreDomainWorkflowTransition("completed", "routed"), /Invalid core domain workflow transition/);

  const replayed = executeCoreDomainWorkflow(fixtures.request, {
    ...fixtures.context,
    existing_idempotency_keys: ["idem_rp01_cp096"],
  });
  assert.equal(replayed.status, "replayed");
  assert.equal(replayed.idempotency.duplicate, true);
  assert.equal(replayed.writes_product_state, false);

  const locked = executeCoreDomainWorkflow(fixtures.request, {
    ...fixtures.context,
    active_locks: [lockKey],
  });
  assert.equal(locked.status, "blocked");
  assert.ok(locked.blocked_claims.includes("lock_unavailable"));
  assert.equal(locked.retry_policy.retryable, true);
  assert.ok(locked.state_path.includes("retry_scheduled"));

  const badPersistence = executeCoreDomainWorkflow(fixtures.request, {
    ...fixtures.context,
    persistence_target: "database",
  });
  assert.equal(badPersistence.status, "blocked");
  assert.ok(badPersistence.blocked_claims.includes("persistence_boundary_violation"));
  assert.ok(badPersistence.validation_errors[0].includes("persistence target must be one of"));
});

test("CP00-097 binds RP01 core domain API, golden-case, and UI surface pack", () => {
  assert.equal(CORE_DOMAIN_API_PACK_BINDING.pack_id, "CP00-097");
  assert.equal(CORE_DOMAIN_GOLDEN_CASE_PACK_BINDING.pack_id, "CP00-097");
  assert.equal(CORE_DOMAIN_API_PACK_BINDING.risk_class, "C");
  assert.equal(CORE_DOMAIN_API_PACK_BINDING.unit_count, 150);
  assert.equal(CORE_DOMAIN_API_PACK_BINDING.range, "RP01.P02.M06.S07-RP01.P04.M02.S03");
  assert.equal(CORE_DOMAIN_API_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_API_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_API_CONTRACT.writes_product_state, false);
});

test("CP00-097 golden cases cover workflow, denial, replay, lock, persistence, and API omission", () => {
  const cases = buildCoreDomainGoldenCaseSet();
  const byId = Object.fromEntries(cases.map((item) => [item.id, item]));

  assert.equal(cases.length, 8);
  assert.equal(byId.workflow_happy_path.result.status, "completed");
  assert.equal(byId.workflow_review_required.result.route.route, "review_required");
  assert.equal(byId.workflow_approval_required.result.route.route, "approval_required");
  assert.ok(byId.permission_reference_denied.result.blocked_claims.includes("permission_reference_denies_operation"));
  assert.ok(byId.lock_retry.result.state_path.includes("retry_scheduled"));
  assert.equal(byId.idempotency_replay.result.status, "replayed");
  assert.ok(byId.persistence_boundary_violation.result.blocked_claims.includes("persistence_boundary_violation"));
  assert.equal(byId.api_unauthorized_data_omission.result.unauthorized_data_omitted, true);
  assert.equal(byId.api_unauthorized_data_omission.result.data[0].document_id, "d_rp01_cp096");
  assert.equal(byId.api_unauthorized_data_omission.result.data[0].tenant_id, undefined);
});

test("CP00-097 API contract is synthetic-only, paginated, and fail-closed", () => {
  const fixtures = createCoreDomainSyntheticFixtureSet();
  const request = createCoreDomainApiRequest({
    endpoint_id: "core_domain.documents.list",
    tenant_id: fixtures.tenant.tenant_id,
    actor_user_id: fixtures.actor.user_id,
    matter_id: fixtures.matter.matter_id,
    requested_at: "2026-06-08T07:10:00.000Z",
    pagination: { limit: 10 },
    visibility: {
      entity_type: "DocumentReference",
      visible_fields: ["document_id"],
      allowed_record_ids: [fixtures.document.document_id],
    },
  });
  const result = executeCoreDomainApiContract(request, { records: [fixtures.document], entity_type: "DocumentReference" });

  assert.equal(request.synthetic_only, true);
  assert.equal(result.status, "completed");
  assert.equal(result.pagination.limit, 10);
  assert.deepEqual(result.data[0], { document_id: fixtures.document.document_id });
  assert.equal(result.permission_evaluated, false);
  assert.equal(result.audit_written, false);
  assert.equal(result.writes_product_state, false);

  const failClosedProjection = executeCoreDomainApiContract(
    {
      endpoint_id: "core_domain.documents.list",
      tenant_id: fixtures.tenant.tenant_id,
      actor_user_id: fixtures.actor.user_id,
      matter_id: fixtures.matter.matter_id,
      requested_at: "2026-06-08T07:10:00.000Z",
    },
    { records: [fixtures.document], entity_type: "DocumentReference" },
  );
  assert.deepEqual(failClosedProjection.data, []);
  assert.equal(failClosedProjection.pagination.total_count, 1);
  assert.equal(failClosedProjection.unauthorized_data_omitted, true);

  const workflowProjection = executeCoreDomainApiContract(
    {
      endpoint_id: "core_domain.workflow.execute",
      tenant_id: fixtures.tenant.tenant_id,
      actor_user_id: fixtures.actor.user_id,
      requested_at: "2026-06-08T07:10:00.000Z",
    },
    { workflow_request: fixtures.request, workflow_context: fixtures.context },
  );
  assert.equal(workflowProjection.data[0].intake, undefined);
  assert.equal(workflowProjection.unauthorized_data_omitted, true);

  const blocked = executeCoreDomainApiContract({
    endpoint_id: "core_domain.documents.list",
    tenant_id: fixtures.tenant.tenant_id,
    actor_user_id: fixtures.actor.user_id,
    requested_at: "2026-06-08T07:10:00.000Z",
    synthetic_only: false,
  });
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.errors[0], /synthetic-only/);
});

test("CP00-097 evidence, Claude review, closeout handoff, and UI inventory stay no-write", () => {
  const evidence = createCoreDomainHermesEvidencePacket();
  const review = createCoreDomainClaudeReviewPacket();
  const handoff = createCoreDomainCloseoutHandoff();
  const ui = createCoreDomainUiSurfaceInventory();
  const coverage = validateCoreDomainCp097Coverage();

  assert.equal(evidence.no_write_attestation.writes_product_state, false);
  assert.equal(evidence.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.read_only, true);
  assert.equal(handoff.next_subphase_id, "RP01.P04.M02.S04");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(ui.length, 3);
  assert.equal(ui.every((surface) => surface.writes_product_state === false), true);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.golden_case_count, 8);
});

test("CP00-098 binds RP01 UI state surface pack to generated Risk B range", () => {
  assert.equal(CORE_DOMAIN_UI_PACK_BINDING.pack_id, "CP00-098");
  assert.equal(CORE_DOMAIN_UI_PACK_BINDING.risk_class, "B");
  assert.equal(CORE_DOMAIN_UI_PACK_BINDING.unit_count, 40);
  assert.equal(CORE_DOMAIN_UI_PACK_BINDING.range, "RP01.P04.M02.S04-RP01.P04.M05.S04");
  assert.equal(CORE_DOMAIN_UI_STATE_CONTRACT.contract_id, "core_domain_ui_state_contract");
  assert.equal(CORE_DOMAIN_UI_STATE_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_UI_STATE_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_UI_STATE_CONTRACT.writes_product_state, false);
  assert.deepEqual(CORE_DOMAIN_UI_STATE_CONTRACT.state_matrix_required_states, ["loading", "empty", "denied", "review_required", "ready"]);
});

test("CP00-098 UI state matrix covers surface states without permission or audit side effects", () => {
  const matrix = createCoreDomainUiSurfaceStateMatrix();
  const states = new Set(matrix.map((item) => item.state));

  assert.equal(matrix.length, 15);
  assert.deepEqual([...states].sort(), ["denied", "empty", "loading", "ready", "review_required"]);
  assert.equal(matrix.every((item) => item.writes_product_state === false), true);
  assert.equal(matrix.every((item) => item.evaluates_runtime_permission === false), true);
  assert.equal(matrix.every((item) => item.writes_audit_event === false), true);
  assert.equal(matrix.every((item) => item.permission_badge.evaluated === false), true);
  assert.equal(matrix.every((item) => item.audit_hint.writes_audit_event === false), true);
  assert.equal(matrix.every((item) => item.focus_order.includes("inspect_permission_badge")), true);
});

test("CP00-098 UI states model denied, review, and responsive behavior as references only", () => {
  const surface = getCoreDomainUiSurface("permission_audit_binding_panel");
  const denied = createCoreDomainUiState("permission_audit_binding_panel", "denied");
  const review = createCoreDomainUiState("permission_audit_binding_panel", "review_required");
  const error = createCoreDomainUiState("permission_audit_binding_panel", "error");
  const mobile = createCoreDomainUiState("matter_trace_panel", "ready", { responsive_mode: "mobile_single_column" });

  assert.equal(surface.source_micro_phase_id, "RP01.P04.M05");
  assert.equal(denied.permission_badge.effect, "deny");
  assert.deepEqual(denied.actions, ["inspect_permission_badge"]);
  assert.equal(review.permission_badge.effect, "review");
  assert.deepEqual(review.actions, ["open_review_reference", "inspect_audit_hint"]);
  assert.match(error.error_message_copy, /display-only error/);
  assert.equal(mobile.layout.responsive_mode, "mobile_single_column");
  assert.equal(mobile.layout.min_touch_target_px, 44);
  assert.equal(mobile.layout.max_columns, 1);
  assert.equal(mobile.writes_product_state, false);
  assert.equal(mobile.evaluates_runtime_permission, false);
});

test("CP00-098 fixture, evidence, review prompt, and handoff remain synthetic and no-write", () => {
  const fixture = createCoreDomainUiFixtureBinding();
  const evidence = createCoreDomainHermesUiEvidencePacket();
  const review = createCoreDomainClaudeUiLeakPrompt();
  const handoff = createCoreDomainUiCloseoutHandoff();
  const coverage = validateCoreDomainCp098Coverage();

  assert.equal(fixture.synthetic_only, true);
  assert.equal(fixture.uses_real_client_data, false);
  assert.equal(fixture.state_count, 15);
  assert.equal(evidence.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(evidence.no_write_attestation.writes_audit_event, false);
  assert.equal(evidence.no_write_attestation.writes_product_state, false);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.read_only, true);
  assert.equal(handoff.next_pack_id, "CP00-099");
  assert.equal(handoff.next_subphase_id, "RP01.P04.M05.S05");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.state_count, 15);
});

test("CP00-099 binds Risk A permission/audit binding states to the planned range", () => {
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id, "CP00-099");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.risk_class, "A");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.unit_count, 10);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.range, "RP01.P04.M05.S05-RP01.P04.M05.S14");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id, "core_domain_permission_audit_binding_contract");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.surface_id, "permission_audit_binding_panel");
  assert.deepEqual(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.states, ["denied", "review_required"]);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.writes_product_state, false);
});

test("CP00-099 permission/audit binding denied and review states are reference-only", () => {
  const denied = createCoreDomainPermissionAuditBindingState("denied");
  const review = createCoreDomainPermissionAuditBindingState("review_required");

  assert.equal(denied.pack_id, "CP00-099");
  assert.equal(denied.upstream_ui_pack_id, "CP00-098");
  assert.deepEqual(denied.actions, ["inspect_permission_badge", "inspect_audit_hint"]);
  assert.equal(denied.permission_badge.effect, "deny");
  assert.equal(denied.permission_badge.evaluated, false);
  assert.equal(denied.permission_badge.approval_implied, false);
  assert.equal(denied.audit_hint.display_only, true);
  assert.equal(denied.audit_hint.ledger_event_created, false);
  assert.equal(review.permission_badge.effect, "review");
  assert.deepEqual(review.actions, ["open_review_reference", "inspect_permission_badge", "inspect_audit_hint"]);
  assert.equal(review.evaluates_runtime_permission, false);
  assert.equal(review.writes_audit_event, false);
  assert.equal(review.writes_product_state, false);
});

test("CP00-099 permission/audit binding matrix covers responsive layout and keyboard focus", () => {
  const matrix = createCoreDomainPermissionAuditBindingMatrix();
  const responsiveModes = new Set(matrix.map((item) => item.layout.responsive_mode));
  const states = new Set(matrix.map((item) => item.state));
  const mobile = matrix.find((item) => item.layout.responsive_mode === "mobile_single_column");

  assert.equal(matrix.length, 4);
  assert.deepEqual([...states].sort(), ["denied", "review_required"]);
  assert.deepEqual([...responsiveModes].sort(), ["desktop_dense", "mobile_single_column"]);
  assert.equal(mobile.layout.min_touch_target_px, 44);
  assert.equal(mobile.layout.max_columns, 1);
  assert.equal(matrix.filter((item) => item.state === "denied").every((item) => item.focus_order[0] === "inspect_permission_badge"), true);
  assert.equal(matrix.every((item) => item.focus_order.includes("inspect_audit_hint")), true);
  assert.equal(
    matrix.every((item) => item.focus_order.indexOf("inspect_permission_badge") < item.focus_order.indexOf("inspect_audit_hint")),
    true,
  );
  assert.equal(matrix.filter((item) => item.state === "denied").every((item) => !item.focus_order.includes("open_review_reference")), true);
  assert.equal(matrix.every((item) => item.keyboard_behavior === CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.keyboard_policy), true);
});

test("CP00-099 evidence, Claude prompt, handoff, and coverage stay no-write", () => {
  const evidence = createCoreDomainPermissionAuditBindingEvidencePacket();
  const review = createCoreDomainPermissionAuditBindingClaudePrompt();
  const handoff = createCoreDomainPermissionAuditBindingCloseoutHandoff();
  const coverage = validateCoreDomainCp099Coverage();

  assert.equal(evidence.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(evidence.no_write_attestation.writes_audit_event, false);
  assert.equal(evidence.no_write_attestation.writes_product_state, false);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.read_only, true);
  assert.equal(handoff.next_pack_id, "CP00-100");
  assert.equal(handoff.next_subphase_id, "RP01.P04.M05.S15");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.matrix_count, 4);
});

test("CP00-100 binds Risk A permission/audit fixture evidence pack to the planned range", () => {
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id, "CP00-100");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.risk_class, "A");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.unit_count, 10);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.range, "RP01.P04.M05.S15-RP01.P04.M06.S04");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.contract_id, "core_domain_permission_audit_fixture_contract");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.surface_id, "permission_audit_synthetic_fixture_panel");
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.source_micro_phase_id, "RP01.P04.M06");
  assert.deepEqual(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.states, ["loading", "empty"]);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.writes_product_state, false);
});

test("CP00-100 fixture binding and fixture states stay synthetic and reference-only", () => {
  const fixture = createCoreDomainPermissionAuditFixtureBinding();
  const loading = createCoreDomainPermissionAuditFixtureState("loading");
  const empty = createCoreDomainPermissionAuditFixtureState("empty");

  assert.equal(fixture.pack_id, "CP00-100");
  assert.equal(fixture.request_id, "req_rp01_cp100");
  assert.equal(fixture.synthetic_only, true);
  assert.equal(fixture.uses_real_client_data, false);
  assert.equal(fixture.permission_id, "perm_rp01_cp100_reference");
  assert.equal(fixture.audit_event_id, "audit_ref_rp01_cp100_display");
  assert.deepEqual(loading.actions, ["inspect_fixture_summary"]);
  assert.deepEqual(empty.actions, ["inspect_fixture_summary", "inspect_permission_badge", "inspect_audit_hint"]);
  assert.equal(empty.permission_badge.evaluated, false);
  assert.equal(empty.permission_badge.approval_implied, false);
  assert.equal(empty.audit_hint.display_only, true);
  assert.equal(empty.audit_hint.ledger_event_created, false);
  assert.equal(empty.writes_product_state, false);
  assert.equal(empty.evaluates_runtime_permission, false);
});

test("CP00-100 visual density covers desktop and mobile fixture states", () => {
  const matrix = createCoreDomainPermissionAuditFixtureStateMatrix();
  const density = createCoreDomainPermissionAuditVisualDensityReport();
  const responsiveModes = new Set(matrix.map((item) => item.layout.responsive_mode));
  const mobile = matrix.find((item) => item.layout.responsive_mode === "mobile_single_column");

  assert.equal(matrix.length, 4);
  assert.deepEqual([...responsiveModes].sort(), ["desktop_dense", "mobile_single_column"]);
  assert.equal(density.density_policy, "compact_operational_console");
  assert.equal(density.focus_order_matches_actions, true);
  assert.equal(density.no_layout_claims_write_state, true);
  assert.equal(mobile.layout.min_touch_target_px, 44);
  assert.equal(mobile.layout.max_columns, 1);
  assert.equal(mobile.layout.max_visible_rows, 4);
});

test("CP00-100 evidence, Claude prompt, handoff, and coverage stay no-write", () => {
  const evidence = createCoreDomainPermissionAuditFixtureEvidencePacket();
  const review = createCoreDomainPermissionAuditFixtureClaudePrompt();
  const handoff = createCoreDomainPermissionAuditFixtureCloseoutHandoff();
  const coverage = validateCoreDomainCp100Coverage();

  assert.equal(evidence.fixture_id, "req_rp01_cp100");
  assert.equal(evidence.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(evidence.no_write_attestation.writes_audit_event, false);
  assert.equal(evidence.no_write_attestation.writes_product_state, false);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.read_only, true);
  assert.equal(handoff.next_pack_id, "CP00-101");
  assert.equal(handoff.next_subphase_id, "RP01.P04.M06.S05");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.matrix_count, 4);
});

test("CP00-101 binds Risk C synthetic fixture catalog to the planned range", () => {
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id, "CP00-101");
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.risk_class, "C");
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.unit_count, 150);
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.range, "RP01.P04.M06.S05-RP01.P05.M09.S03");
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.upstream_permission_audit_fixture_pack_id, "CP00-100");
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.accepts_real_client_data, false);
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.writes_product_state, false);
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.creates_database_rows, false);
  assert.equal(CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.ldip_implemented, false);
});

test("CP00-101 denied and review fixture UI states stay reference-only", () => {
  const denied = createCoreDomainCp101UiFixtureState("denied");
  const review = createCoreDomainCp101UiFixtureState("review_required", { responsive_mode: "mobile_single_column" });
  const matrix = createCoreDomainCp101UiFixtureStateMatrix();

  assert.equal(matrix.length, 4);
  assert.equal(denied.permission_badge.effect, "deny");
  assert.equal(denied.permission_badge.evaluated, false);
  assert.equal(denied.permission_badge.approval_implied, false);
  assert.equal(denied.audit_hint.display_only, true);
  assert.equal(denied.audit_hint.writes_audit_event, false);
  assert.deepEqual(denied.focus_order, ["inspect_permission_badge", "inspect_audit_hint"]);
  assert.equal(review.permission_badge.effect, "review");
  assert.equal(review.layout.min_touch_target_px, 44);
  assert.equal(review.uses_real_client_data, false);
  assert.equal(review.ldip_implemented, false);
});

test("CP00-101 fixture catalog manifest covers P04/P05 cases without writes", () => {
  const catalog = createCoreDomainCp101FixtureCaseCatalog();
  const manifest = createCoreDomainCp101FixtureManifest();

  assert.equal(catalog.length, CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.fixture_case_ids.length);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.covered_micro_phase_ids.length, 15);
  assert.equal(manifest.fixture_case_count, 20);
  assert.equal(manifest.ui_state_count, 4);
  assert.equal(manifest.golden_case_count, 8);
  assert.equal(manifest.no_write_attestation.writes_product_state, false);
  assert.ok(catalog.some((item) => item.case_id === "cross_tenant_case" && item.expected_status === "blocked"));
  assert.ok(catalog.every((item) => item.writes_product_state === false));
});

test("CP00-101 evidence, review packet, handoff, and coverage stay synthetic", () => {
  const evidence = createCoreDomainCp101HermesEvidencePacket();
  const review = createCoreDomainCp101ClaudeReviewPacket();
  const handoff = createCoreDomainCp101CloseoutHandoff();
  const coverage = validateCoreDomainCp101Coverage();

  assert.equal(evidence.pack_id, "CP00-101");
  assert.equal(evidence.hermes_gate, "H01");
  assert.equal(evidence.covered_unit_count, 150);
  assert.equal(evidence.no_write_attestation.creates_database_rows, false);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.read_only, true);
  assert.equal(handoff.next_pack_id, "CP00-102");
  assert.equal(handoff.next_subphase_id, "RP01.P05.M09.S04");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.fixture_case_count, 20);
  assert.equal(coverage.ui_state_count, 4);
});

test("CP00-102 binds Risk C permission matrix catalog to the planned range", () => {
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id, "CP00-102");
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.risk_class, "C");
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.unit_count, 150);
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.range, "RP01.P05.M09.S04-RP01.P06.M08.S16");
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.upstream_fixture_catalog_pack_id, "CP00-101");
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.contract_id, "core_domain_cp102_permission_matrix_contract");
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.upstream_fixture_catalog_contract_id, "core_domain_cp101_synthetic_fixture_catalog_contract");
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.accepts_real_client_data, false);
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.writes_product_state, false);
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.creates_database_rows, false);
  assert.equal(CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.ldip_implemented, false);
});

test("CP00-102 permission matrix covers actions without runtime permission or audit writes", () => {
  const rows = createCoreDomainCp102PermissionMatrixRows();
  const actions = new Set(rows.map((row) => row.action));

  assert.equal(rows.length, 7);
  for (const action of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.action_bindings) {
    assert.equal(actions.has(action), true);
  }
  assert.equal(rows.every((row) => Object.isFrozen(row)), true);
  assert.equal(rows.every((row) => row.synthetic_only === true), true);
  assert.equal(rows.every((row) => row.uses_real_client_data === false), true);
  assert.equal(rows.every((row) => row.evaluates_runtime_permission === false), true);
  assert.equal(rows.every((row) => row.writes_audit_event === false), true);
  assert.equal(rows.every((row) => row.writes_product_state === false), true);
  assert.equal(rows.every((row) => row.creates_database_rows === false), true);
  assert.ok(rows.some((row) => row.decision_binding === "deny_reference_overrides_allow" && row.route === "blocked"));
  assert.ok(rows.some((row) => row.action === "search" && row.security_trimmed === true));
  assert.ok(rows.some((row) => row.action === "ai_retrieval" && row.ldip_implemented === false));
});

test("CP00-102 security interactions cover holds, walls, ACLs, routing, trimming, and test expectations", () => {
  const interactions = createCoreDomainCp102SecurityInteractionSet();
  const byId = Object.fromEntries(interactions.map((item) => [item.interaction_id, item]));

  assert.equal(interactions.length, 10);
  for (const interaction of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.interaction_bindings) {
    assert.ok(byId[interaction]);
  }
  assert.equal(byId.legal_hold.route, "blocked");
  assert.equal(byId.ethical_wall.route, "blocked");
  assert.equal(byId.object_acl.route, "blocked");
  assert.equal(byId.review_required_route.route, "review_required");
  assert.equal(byId.approval_required_route.route, "approval_required");
  assert.equal(byId.security_trimming.omitted_record_count, 1);
  assert.equal(byId.audit_event_expectation.audit_expectation_only, true);
  assert.equal(byId.allowed_test.expected_status, "allowed_reference");
  assert.equal(byId.denied_test.expected_status, "denied_reference");
  assert.equal(interactions.every((item) => item.evaluates_runtime_permission === false), true);
  assert.equal(interactions.every((item) => item.writes_audit_event === false), true);
  assert.equal(interactions.every((item) => item.writes_product_state === false), true);
  assert.equal(interactions.every((item) => item.ldip_implemented === false), true);
});

test("CP00-102 manifest, evidence, Claude packet, handoff, and coverage stay production-gated", () => {
  const manifest = createCoreDomainCp102PermissionFixtureManifest();
  const evidence = createCoreDomainCp102HermesEvidencePacket();
  const review = createCoreDomainCp102ClaudeReviewPacket();
  const handoff = createCoreDomainCp102CloseoutHandoff();
  const coverage = validateCoreDomainCp102Coverage();

  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.covered_micro_phase_ids.length, 11);
  assert.equal(manifest.matrix_row_count, 7);
  assert.equal(manifest.interaction_count, 10);
  assert.equal(manifest.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(evidence.hermes_gate, "H01");
  assert.equal(evidence.status, "ready_for_command_evidence");
  assert.equal(evidence.command_anchors.includes("npm run closeout-pack:validate CP00-102"), true);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.effort, "max");
  assert.equal(review.read_only, true);
  assert.equal(review.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-103");
  assert.equal(handoff.next_subphase_id, "RP01.P06.M08.S17");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.matrix_row_count, 7);
  assert.equal(coverage.interaction_count, 10);
  assert.equal(coverage.covered_unit_count, 150);
});

test("CP00-103 binds Risk A audit, permission, export, and share review packet to the planned range", () => {
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id, "CP00-103");
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.risk_class, "A");
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.unit_count, 10);
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.range, "RP01.P06.M08.S17-RP01.P06.M09.S06");
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.upstream_permission_matrix_pack_id, "CP00-102");
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.contract_id, "core_domain_cp103_permission_review_packet_contract");
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.upstream_permission_matrix_contract_id, "core_domain_cp102_permission_matrix_contract");
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.accepts_real_client_data, false);
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.writes_product_state, false);
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.executes_export_download, false);
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.executes_external_share, false);
  assert.equal(CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.ldip_implemented, false);
});

test("CP00-103 audit and permission review items are expected-outcome references only", () => {
  const reviewItems = createCoreDomainCp103AuditPermissionReviewItems();
  const byId = Object.fromEntries(reviewItems.map((item) => [item.item_id, item]));

  assert.equal(reviewItems.length, 4);
  for (const binding of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.evidence_bindings) {
    assert.ok(byId[binding]);
  }
  assert.equal(byId.audit_event_expectation.audit_expectation_only, true);
  assert.equal(byId.permission_fixture.permission_fixture_only, true);
  assert.equal(byId.allowed_test.expected_status, "allowed_reference");
  assert.equal(byId.allowed_test.expected_route, "ready");
  assert.equal(byId.denied_test.expected_status, "denied_reference");
  assert.equal(byId.denied_test.expected_route, "blocked");
  assert.ok(byId.denied_test.blocked_claims.includes("deny_reference_blocks_access"));
  assert.equal(reviewItems.every((item) => Object.isFrozen(item)), true);
  assert.equal(reviewItems.every((item) => item.synthetic_only === true), true);
  assert.equal(reviewItems.every((item) => item.evaluates_runtime_permission === false), true);
  assert.equal(reviewItems.every((item) => item.writes_audit_event === false), true);
  assert.equal(reviewItems.every((item) => item.writes_product_state === false), true);
});

test("CP00-103 export and share decision bindings require approval without execution", () => {
  const decisions = createCoreDomainCp103ExportShareDecisionBindings();
  const byAction = Object.fromEntries(decisions.map((item) => [item.action, item]));

  assert.equal(decisions.length, 2);
  assert.equal(byAction.export_download.route, "approval_required");
  assert.equal(byAction.export_download.decision_binding, "approval_required_reference");
  assert.equal(byAction.export_download.download_generated, false);
  assert.equal(byAction.share.route, "approval_required");
  assert.equal(byAction.share.decision_binding, "approval_required_external_share_reference");
  assert.equal(byAction.share.external_party_ref, "external_party_reference_only");
  assert.equal(decisions.every((item) => item.approval_required === true), true);
  assert.equal(decisions.every((item) => item.audit_event_expected === true), true);
  assert.equal(decisions.every((item) => item.executes_export_download === false), true);
  assert.equal(decisions.every((item) => item.executes_external_share === false), true);
  assert.equal(decisions.every((item) => item.evaluates_runtime_permission === false), true);
  assert.equal(decisions.every((item) => item.writes_audit_event === false), true);
  assert.equal(decisions.every((item) => item.ldip_implemented === false), true);
});

test("CP00-103 manifest, evidence, Claude packet, handoff, and coverage stay production-gated", () => {
  const manifest = createCoreDomainCp103PermissionReviewManifest();
  const evidence = createCoreDomainCp103HermesEvidencePacket();
  const review = createCoreDomainCp103ClaudeReviewPacket();
  const handoff = createCoreDomainCp103CloseoutHandoff();
  const coverage = validateCoreDomainCp103Coverage();

  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.covered_unit_ids.length, 10);
  assert.equal(manifest.evidence_binding_count, 4);
  assert.equal(manifest.decision_binding_count, 2);
  assert.equal(manifest.no_write_attestation.executes_export_download, false);
  assert.equal(manifest.no_write_attestation.executes_external_share, false);
  assert.equal(evidence.hermes_gate, "H01");
  assert.equal(evidence.command_anchors.includes("npm run closeout-pack:validate CP00-103"), true);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.effort, "max");
  assert.equal(review.read_only, true);
  assert.equal(review.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-104");
  assert.equal(handoff.next_subphase_id, "RP01.P06.M09.S07");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.review_item_count, 4);
  assert.equal(coverage.decision_binding_count, 2);
  assert.equal(coverage.covered_unit_count, 10);
});

test("CP00-104 binds Risk C failure taxonomy catalog to the planned range", () => {
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id, "CP00-104");
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.risk_class, "C");
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.unit_count, 150);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.range, "RP01.P06.M09.S07-RP01.P07.M08.S17");
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.upstream_permission_review_packet_pack_id, "CP00-103");
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.contract_id, "core_domain_cp104_failure_taxonomy_contract");
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.upstream_permission_review_packet_contract_id, "core_domain_cp103_permission_review_packet_contract");
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.covered_unit_count, 150);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.writes_product_state, false);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.executes_ai_retrieval, false);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.performs_rollback, false);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.performs_compensation, false);
  assert.equal(CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.ldip_implemented, false);
});

test("CP00-104 review extension bindings close P06 without executing AI or legal-hold behavior", () => {
  const bindings = createCoreDomainCp104ReviewExtensionBindings();
  const byId = Object.fromEntries(bindings.map((item) => [item.item_id, item]));

  assert.equal(bindings.length, 8);
  assert.equal(byId.ai_retrieval_decision_binding.route, "review_required");
  assert.equal(byId.ai_retrieval_decision_binding.executes_ai_retrieval, false);
  assert.equal(byId.audit_hint_fields.writes_audit_event, false);
  assert.equal(byId.matched_rule_capture.expected_status, "matched_rule_reference");
  assert.equal(byId.deny_over_allow_check.route, "blocked");
  assert.equal(byId.legal_hold_interaction.route, "blocked");
  assert.equal(byId.view_decision_binding.decision_binding, "allow_reference");
  assert.equal(byId.search_decision_binding.decision_binding, "allow_with_security_trimming_reference");
  assert.equal(bindings.every((item) => Object.isFrozen(item)), true);
  assert.equal(bindings.every((item) => item.synthetic_only === true), true);
  assert.equal(bindings.every((item) => item.evaluates_runtime_permission === false), true);
});

test("CP00-104 failure taxonomy and scenario matrix cover expected failure modes", () => {
  const taxonomy = createCoreDomainCp104FailureTaxonomy();
  const scenarios = createCoreDomainCp104FailureScenarioMatrix();
  const coveredUnitIds = createCoreDomainCp104CoveredUnitIds();

  assert.equal(taxonomy.length, 20);
  assert.equal(scenarios.length, 142);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(new Set(coveredUnitIds).size, 150);
  assert.ok(coveredUnitIds.includes("RP01.P06.M09.S07"));
  assert.ok(coveredUnitIds.includes("RP01.P07.M03.S20"));
  assert.ok(coveredUnitIds.includes("RP01.P07.M08.S17"));
  assert.ok(taxonomy.some((item) => item.category_id === "permission_denied" && item.expected_status === "blocked"));
  assert.ok(taxonomy.some((item) => item.category_id === "lock_conflict" && item.expected_status === "retry_required"));
  assert.ok(scenarios.some((item) => item.category_id === "cross_tenant" && item.expected_status === "blocked"));
  assert.ok(scenarios.some((item) => item.category_id === "rollback_expectation" && item.recovery_expectations.includes("rollback_expectation_reference")));
  assert.ok(scenarios.some((item) => item.category_id === "compensation_expectation" && item.recovery_expectations.includes("compensation_expectation_reference")));
  assert.equal(scenarios.every((item) => item.synthetic_only === true), true);
  assert.equal(scenarios.every((item) => item.uses_real_client_data === false), true);
  assert.equal(scenarios.every((item) => item.writes_product_state === false), true);
  assert.equal(scenarios.every((item) => item.writes_audit_event === false), true);
});

test("CP00-104 fixtures, evidence, Claude packet, handoff, and coverage stay production-gated", () => {
  const fixtureSet = createCoreDomainCp104FailureFixtureSet();
  const manifest = createCoreDomainCp104FailureEvidenceManifest();
  const evidence = createCoreDomainCp104HermesEvidencePacket();
  const review = createCoreDomainCp104ClaudeReviewPacket();
  const handoff = createCoreDomainCp104CloseoutHandoff();
  const coverage = validateCoreDomainCp104Coverage();

  assert.equal(fixtureSet.fixture_count, 6);
  assert.equal(fixtureSet.unit_test_count, 6);
  assert.equal(fixtureSet.integration_smoke_count, 5);
  assert.equal(fixtureSet.no_write_attestation.performs_rollback, false);
  assert.equal(fixtureSet.no_write_attestation.performs_compensation, false);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.review_extension_count, 8);
  assert.equal(manifest.taxonomy_count, 20);
  assert.equal(manifest.failure_scenario_count, 142);
  assert.equal(manifest.no_write_attestation.executes_ai_retrieval, false);
  assert.equal(evidence.hermes_gate, "H01");
  assert.equal(evidence.command_anchors.includes("npm run closeout-pack:validate CP00-104"), true);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.effort, "max");
  assert.equal(review.read_only, true);
  assert.equal(handoff.next_pack_id, "CP00-105");
  assert.equal(handoff.next_subphase_id, "RP01.P07.M08.S18");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.review_extension_count, 8);
  assert.equal(coverage.taxonomy_count, 20);
  assert.equal(coverage.failure_scenario_count, 142);
  assert.equal(coverage.covered_unit_count, 150);
});

test("CP00-105 binds Risk C evidence review catalog to the planned range", () => {
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id, "CP00-105");
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.risk_class, "C");
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.unit_count, 150);
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.range, "RP01.P07.M08.S18-RP01.P09.M03.S09");
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.upstream_failure_taxonomy_pack_id, "CP00-104");
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.contract_id, "core_domain_cp105_evidence_review_catalog_contract");
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.upstream_failure_taxonomy_contract_id, "core_domain_cp104_failure_taxonomy_contract");
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.covered_unit_count, 150);
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.writes_product_state, false);
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.executes_ai_retrieval, false);
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.executes_external_share, false);
  assert.equal(CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.ldip_implemented, false);
});

test("CP00-105 failure closeout and Hermes evidence matrix cover the planned receipt boundary", () => {
  const failureCloseout = createCoreDomainCp105FailureCloseoutEntries();
  const hermesEvidence = createCoreDomainCp105HermesEvidenceMatrix();
  const coveredUnitIds = createCoreDomainCp105CoveredUnitIds();

  assert.equal(failureCloseout.length, 17);
  assert.equal(hermesEvidence.length, 115);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(new Set(coveredUnitIds).size, 150);
  assert.ok(coveredUnitIds.includes("RP01.P07.M08.S18"));
  assert.ok(coveredUnitIds.includes("RP01.P07.M09.S11"));
  assert.ok(coveredUnitIds.includes("RP01.P08.M03.S20"));
  assert.ok(coveredUnitIds.includes("RP01.P08.M10.S04"));
  assert.ok(failureCloseout.some((item) => item.category_id === "hermes_failure_evidence"));
  assert.equal(hermesEvidence.filter((item) => item.receipt_type === "hermes_command_matrix").length, 11);
  assert.equal(hermesEvidence.filter((item) => item.receipt_type === "no_real_data_receipt").length, 4);
  assert.equal(hermesEvidence.filter((item) => item.receipt_type === "pass_semantics").length, 3);
  assert.ok(hermesEvidence.some((item) => item.receipt_type === "block_semantics" && item.blocked_claims.includes("block_must_not_be_reported_as_pass")));
  assert.equal(hermesEvidence.every((item) => item.synthetic_only === true), true);
  assert.equal(hermesEvidence.every((item) => item.uses_real_client_data === false), true);
  assert.equal(hermesEvidence.every((item) => item.writes_audit_event === false), true);
  assert.equal(hermesEvidence.every((item) => item.writes_product_state === false), true);
});

test("CP00-105 review question catalog stays read-only and cannot approve pack state", () => {
  const reviewQuestions = createCoreDomainCp105ReviewQuestionCatalog();
  const byArea = reviewQuestions.reduce((groups, item) => {
    groups[item.review_area] ??= [];
    groups[item.review_area].push(item);
    return groups;
  }, {});

  assert.equal(reviewQuestions.length, 18);
  assert.equal(byArea.architecture.length, 4);
  assert.equal(byArea.security.length, 3);
  assert.equal(byArea.permission_boundary.length, 3);
  assert.equal(byArea.audit_boundary.length, 3);
  assert.equal(byArea.ui_data_leak.length, 1);
  assert.equal(byArea.finding_severity.length, 1);
  assert.ok(reviewQuestions.every((item) => item.review_questions.length === 2));
  assert.ok(reviewQuestions.every((item) => item.blocked_claims.includes("review_question_cannot_approve_pack")));
  assert.equal(reviewQuestions.every((item) => item.executes_claude_review === false), true);
  assert.equal(reviewQuestions.every((item) => item.grants_human_approval === false), true);
  assert.equal(reviewQuestions.every((item) => item.ldip_implemented === false), true);
});

test("CP00-105 evidence, Claude packet, handoff, and coverage stay production-gated", () => {
  const manifest = createCoreDomainCp105EvidenceReviewManifest();
  const evidence = createCoreDomainCp105HermesEvidencePacket();
  const review = createCoreDomainCp105ClaudeReviewPacket();
  const handoff = createCoreDomainCp105CloseoutHandoff();
  const coverage = validateCoreDomainCp105Coverage();

  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.failure_closeout_count, 17);
  assert.equal(manifest.hermes_evidence_receipt_count, 115);
  assert.equal(manifest.review_question_count, 18);
  assert.equal(manifest.command_matrix_count, 11);
  assert.equal(manifest.no_write_attestation.executes_claude_review, false);
  assert.equal(manifest.no_write_attestation.grants_human_approval, false);
  assert.equal(evidence.hermes_gate, "H01");
  assert.equal(evidence.command_anchors.includes("npm run closeout-pack:validate CP00-105"), true);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.effort, "max");
  assert.equal(review.read_only, true);
  assert.equal(review.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-106");
  assert.equal(handoff.next_subphase_id, "RP01.P09.M03.S10");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.failure_closeout_count, 17);
  assert.equal(coverage.hermes_evidence_receipt_count, 115);
  assert.equal(coverage.review_question_count, 18);
  assert.equal(coverage.covered_unit_count, 150);
});

test("CP00-106 binds Risk B review outcome routing catalog to the planned range", () => {
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id, "CP00-106");
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.risk_class, "B");
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.unit_count, 40);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.range, "RP01.P09.M03.S10-RP01.P09.M07.S08");
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.upstream_evidence_review_catalog_pack_id, "CP00-105");
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.contract_id, "core_domain_cp106_review_outcome_routing_contract");
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.upstream_evidence_review_catalog_contract_id, "core_domain_cp105_evidence_review_catalog_contract");
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.covered_unit_count, 40);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.allowed_verdicts.includes("PASS_WITH_FINDINGS"), true);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.routing_targets.includes("block_pack_for_p0_p1"), true);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.evaluates_runtime_permission, false);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.writes_audit_event, false);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.executes_claude_review, false);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.grants_human_approval, false);
  assert.equal(CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.ldip_implemented, false);
});

test("CP00-106 review outcome rows cover verdict, severity, and finding routing references", () => {
  const rows = createCoreDomainCp106ReviewOutcomeRoutingCatalog();
  const coveredUnitIds = createCoreDomainCp106CoveredUnitIds();
  const verdictRows = rows.filter((item) => item.kind === "verdict_format");
  const routingRows = rows.filter((item) => item.kind === "finding_routing_map");
  const riskRows = rows.filter((item) => item.kind === "risk_register");
  const severityRows = rows.filter((item) => item.kind === "severity_taxonomy");

  assert.equal(rows.length, 40);
  assert.equal(coveredUnitIds.length, 40);
  assert.equal(new Set(coveredUnitIds).size, 40);
  assert.ok(coveredUnitIds.includes("RP01.P09.M03.S10"));
  assert.ok(coveredUnitIds.includes("RP01.P09.M03.S11"));
  assert.ok(coveredUnitIds.includes("RP01.P09.M07.S08"));
  assert.equal(verdictRows.length, 3);
  assert.equal(routingRows.length, 3);
  assert.equal(riskRows.length, 4);
  assert.equal(severityRows.length, 2);
  assert.equal(verdictRows.every((item) => item.allowed_verdicts.includes("BLOCK")), true);
  assert.equal(routingRows.every((item) => item.routing_targets.includes("fix_or_defer_p2")), true);
  assert.equal(routingRows.every((item) => item.routing_targets.includes("document_p3")), true);
  assert.equal(severityRows.every((item) => item.severity_levels.includes("P0") && item.severity_levels.includes("P3")), true);
  assert.equal(riskRows.every((item) => item.blocked_claims.includes("risk_register_cannot_mutate_priority")), true);
  assert.equal(severityRows.every((item) => item.blocked_claims.includes("severity_taxonomy_cannot_mutate_priority")), true);
  assert.equal(rows.every((item) => item.synthetic_only === true), true);
  assert.equal(rows.every((item) => item.uses_real_client_data === false), true);
  assert.equal(rows.every((item) => item.writes_audit_event === false), true);
  assert.equal(rows.every((item) => item.writes_product_state === false), true);
});

test("CP00-106 evidence, Claude packet, handoff, and coverage stay production-gated", () => {
  const manifest = createCoreDomainCp106ReviewOutcomeManifest();
  const evidence = createCoreDomainCp106HermesEvidencePacket();
  const review = createCoreDomainCp106ClaudeReviewPacket();
  const handoff = createCoreDomainCp106CloseoutHandoff();
  const coverage = validateCoreDomainCp106Coverage();

  assert.equal(manifest.covered_unit_count, 40);
  assert.equal(manifest.review_question_count, 28);
  assert.equal(manifest.verdict_format_count, 3);
  assert.equal(manifest.finding_routing_map_count, 3);
  assert.equal(manifest.risk_register_count, 4);
  assert.equal(manifest.no_write_attestation.executes_claude_review, false);
  assert.equal(manifest.no_write_attestation.grants_human_approval, false);
  assert.equal(manifest.no_write_attestation.mutates_issue_routing, false);
  assert.equal(evidence.hermes_gate, "H01");
  assert.equal(evidence.command_anchors.includes("npm run closeout-pack:validate CP00-106"), true);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.effort, "max");
  assert.equal(review.read_only, true);
  assert.equal(review.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-107");
  assert.equal(handoff.next_subphase_id, "RP01.P09.M07.S09");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.review_outcome_count, 40);
  assert.equal(coverage.review_question_count, 28);
  assert.equal(coverage.covered_unit_count, 40);
});

test("CP00-107 binds Risk B review closeout readiness catalog to the RP01 terminal range", () => {
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id, "CP00-107");
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.risk_class, "B");
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.unit_count, 16);
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.range, "RP01.P09.M07.S09-RP01.P09.M10.S01");
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.upstream_review_outcome_routing_pack_id, "CP00-106");
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.contract_id, "core_domain_cp107_review_closeout_readiness_contract");
  assert.equal(
    CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.upstream_review_outcome_routing_contract_id,
    "core_domain_cp106_review_outcome_routing_contract",
  );
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.covered_unit_count, 16);
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.routing_targets.includes("handoff_to_rp02"), true);
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.executes_claude_review, false);
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.grants_human_approval, false);
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.mutates_issue_routing, false);
  assert.equal(CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.ldip_implemented, false);
});

test("CP00-107 readiness rows cover Hermes evidence, Claude review, closeout, and terminal routing references", () => {
  const rows = createCoreDomainCp107ReviewCloseoutReadinessCatalog();
  const coveredUnitIds = createCoreDomainCp107CoveredUnitIds();
  const verdictRows = rows.filter((item) => item.kind === "verdict_format");
  const routingRows = rows.filter((item) => item.kind === "finding_routing_map");
  const hermesRows = rows.filter((item) => item.phase_role === "hermes_evidence_packet_reference");
  const claudeRows = rows.filter((item) => item.phase_role === "claude_review_packet_reference");
  const closeoutRows = rows.filter((item) => item.phase_role === "closeout_handoff_reference");

  assert.equal(rows.length, 16);
  assert.equal(coveredUnitIds.length, 16);
  assert.equal(new Set(coveredUnitIds).size, 16);
  assert.ok(coveredUnitIds.includes("RP01.P09.M07.S09"));
  assert.ok(coveredUnitIds.includes("RP01.P09.M08.S08"));
  assert.ok(coveredUnitIds.includes("RP01.P09.M09.S04"));
  assert.ok(coveredUnitIds.includes("RP01.P09.M10.S01"));
  assert.equal(verdictRows.length, 1);
  assert.equal(routingRows.length, 1);
  assert.equal(hermesRows.length, 8);
  assert.equal(claudeRows.length, 4);
  assert.equal(closeoutRows.length, 1);
  assert.equal(verdictRows[0].allowed_verdicts.includes("PASS_WITH_FINDINGS"), true);
  assert.equal(routingRows[0].routing_targets.includes("handoff_to_rp02"), true);
  assert.equal(rows.every((item) => item.synthetic_only === true), true);
  assert.equal(rows.every((item) => item.uses_real_client_data === false), true);
  assert.equal(rows.every((item) => item.writes_audit_event === false), true);
  assert.equal(rows.every((item) => item.writes_product_state === false), true);
  assert.equal(rows.every((item) => item.executes_claude_review === false), true);
  assert.equal(rows.every((item) => item.mutates_issue_routing === false), true);
});

test("CP00-107 evidence, Claude packet, handoff, and coverage close RP01 without runtime authority", () => {
  const manifest = createCoreDomainCp107ReviewCloseoutManifest();
  const evidence = createCoreDomainCp107HermesEvidencePacket();
  const review = createCoreDomainCp107ClaudeReviewPacket();
  const handoff = createCoreDomainCp107CloseoutHandoff();
  const coverage = validateCoreDomainCp107Coverage();

  assert.equal(manifest.covered_unit_count, 16);
  assert.equal(manifest.review_question_count, 12);
  assert.equal(manifest.hermes_evidence_reference_count, 8);
  assert.equal(manifest.claude_review_reference_count, 4);
  assert.equal(manifest.closeout_handoff_reference_count, 1);
  assert.equal(manifest.rp01_terminal, true);
  assert.equal(manifest.next_program_id, "RP02");
  assert.equal(manifest.no_write_attestation.executes_claude_review, false);
  assert.equal(manifest.no_write_attestation.grants_human_approval, false);
  assert.equal(manifest.no_write_attestation.mutates_issue_routing, false);
  assert.equal(evidence.hermes_gate, "H01");
  assert.equal(evidence.command_anchors.includes("npm run closeout-pack:validate CP00-107"), true);
  assert.equal(review.model, "claude-opus-4-8");
  assert.equal(review.effort, "max");
  assert.equal(review.read_only, true);
  assert.equal(review.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-108");
  assert.equal(handoff.next_subphase_id, "RP02.P00.M00.S01");
  assert.equal(handoff.rp01_terminal, true);
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.review_closeout_count, 16);
  assert.equal(coverage.covered_unit_count, 16);
  assert.equal(coverage.next_pack_id, "CP00-108");
});
