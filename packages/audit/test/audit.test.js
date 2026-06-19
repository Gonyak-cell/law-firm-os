import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AUDIT_COMPLIANCE_CP135_PACK_BINDING,
  AUDIT_COMPLIANCE_CP136_PACK_BINDING,
  AUDIT_COMPLIANCE_CP137_PACK_BINDING,
  AUDIT_COMPLIANCE_CP138_PACK_BINDING,
  AUDIT_COMPLIANCE_CP139_PACK_BINDING,
  AUDIT_COMPLIANCE_CP140_PACK_BINDING,
  AUDIT_COMPLIANCE_CP141_PACK_BINDING,
  AUDIT_COMPLIANCE_CP142_PACK_BINDING,
  AUDIT_COMPLIANCE_CP143_PACK_BINDING,
  AUDIT_COMPLIANCE_CP144_PACK_BINDING,
  AUDIT_COMPLIANCE_CP145_PACK_BINDING,
  AUDIT_COMPLIANCE_CP146_PACK_BINDING,
  AUDIT_COMPLIANCE_CP147_PACK_BINDING,
  AUDIT_COMPLIANCE_CP148_PACK_BINDING,
  AUDIT_COMPLIANCE_CP149_PACK_BINDING,
  AUDIT_COMPLIANCE_CP150_PACK_BINDING,
  AUDIT_COMPLIANCE_CP151_PACK_BINDING,
  AUDIT_COMPLIANCE_CP152_PACK_BINDING,
  AUDIT_COMPLIANCE_CP153_PACK_BINDING,
  AUDIT_COMPLIANCE_CP154_PACK_BINDING,
  AUDIT_COMPLIANCE_CP155_PACK_BINDING,
  canPurgeAuditEvent,
  createAuditComplianceCp135ClaudeReviewPacket,
  createAuditComplianceCp135CloseoutHandoff,
  createAuditComplianceCp135CoveredUnitIds,
  createAuditComplianceCp135EntryReadiness,
  createAuditComplianceCp135EntryReadinessCatalog,
  createAuditComplianceCp135EntryReadinessManifest,
  createAuditComplianceCp135HermesEvidencePacket,
  createAuditComplianceCp136ClaudeReviewPacket,
  createAuditComplianceCp136CloseoutHandoff,
  createAuditComplianceCp136CoveredUnitIds,
  createAuditComplianceCp136HermesEvidencePacket,
  createAuditComplianceCp136ServiceInterfaceReadiness,
  createAuditComplianceCp136ServiceInterfaceReadinessCatalog,
  createAuditComplianceCp136ServiceInterfaceReadinessManifest,
  createAuditComplianceCp137ClaudeReviewPacket,
  createAuditComplianceCp137CloseoutHandoff,
  createAuditComplianceCp137CoveredUnitIds,
  createAuditComplianceCp137HermesEvidencePacket,
  createAuditComplianceCp137ServiceInterfaceWorkflowEvidence,
  createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCatalog,
  createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceManifest,
  createAuditComplianceCp138ClaudeBoundary,
  createAuditComplianceCp138ClaudeBoundaryCatalog,
  createAuditComplianceCp138ClaudeBoundaryManifest,
  createAuditComplianceCp138ClaudeReviewPacket,
  createAuditComplianceCp138CloseoutHandoff,
  createAuditComplianceCp138CoveredUnitIds,
  createAuditComplianceCp138HermesEvidencePacket,
  createAuditComplianceCp139ApiUiReferenceReadiness,
  createAuditComplianceCp139ApiUiReferenceReadinessCatalog,
  createAuditComplianceCp139ApiUiReferenceReadinessManifest,
  createAuditComplianceCp139ClaudeReviewPacket,
  createAuditComplianceCp139CloseoutHandoff,
  createAuditComplianceCp139CoveredUnitIds,
  createAuditComplianceCp139HermesEvidencePacket,
  createAuditComplianceCp140ClaudeReviewPacket,
  createAuditComplianceCp140CloseoutHandoff,
  createAuditComplianceCp140CoveredUnitIds,
  createAuditComplianceCp140HermesEvidencePacket,
  createAuditComplianceCp140UiWorkflowContinuation,
  createAuditComplianceCp140UiWorkflowContinuationCatalog,
  createAuditComplianceCp140UiWorkflowContinuationManifest,
  createAuditComplianceCp141ClaudeReviewPacket,
  createAuditComplianceCp141CloseoutHandoff,
  createAuditComplianceCp141CoveredUnitIds,
  createAuditComplianceCp141HermesEvidencePacket,
  createAuditComplianceCp141UiPermissionFixtureBinding,
  createAuditComplianceCp141UiPermissionFixtureBindingCatalog,
  createAuditComplianceCp141UiPermissionFixtureBindingManifest,
  createAuditComplianceCp142ClaudeReviewPacket,
  createAuditComplianceCp142CloseoutHandoff,
  createAuditComplianceCp142CoveredUnitIds,
  createAuditComplianceCp142HermesEvidencePacket,
  createAuditComplianceCp142UiFixtureEvidenceReference,
  createAuditComplianceCp142UiFixtureEvidenceReferenceCatalog,
  createAuditComplianceCp142UiFixtureEvidenceReferenceManifest,
  createAuditComplianceCp143ClaudeReviewPacket,
  createAuditComplianceCp143CloseoutHandoff,
  createAuditComplianceCp143CoveredUnitIds,
  createAuditComplianceCp143FixtureTerminalBoundary,
  createAuditComplianceCp143FixtureTerminalBoundaryCatalog,
  createAuditComplianceCp143FixtureTerminalBoundaryManifest,
  createAuditComplianceCp143HermesEvidencePacket,
  createAuditComplianceCp144ClaudeReviewPacket,
  createAuditComplianceCp144CloseoutHandoff,
  createAuditComplianceCp144CoveredUnitIds,
  createAuditComplianceCp144FixturePermissionMatrixReference,
  createAuditComplianceCp144FixturePermissionMatrixReferenceCatalog,
  createAuditComplianceCp144FixturePermissionMatrixReferenceManifest,
  createAuditComplianceCp144HermesEvidencePacket,
  createAuditComplianceCp145ClaudeReviewPacket,
  createAuditComplianceCp145CloseoutHandoff,
  createAuditComplianceCp145CoveredUnitIds,
  createAuditComplianceCp145HermesEvidencePacket,
  createAuditComplianceCp145PermissionMatrixWorkflowBoundary,
  createAuditComplianceCp145PermissionMatrixWorkflowBoundaryCatalog,
  createAuditComplianceCp145PermissionMatrixWorkflowBoundaryManifest,
  createAuditComplianceCp146ClaudeReviewPacket,
  createAuditComplianceCp146CloseoutHandoff,
  createAuditComplianceCp146CoveredUnitIds,
  createAuditComplianceCp146HermesEvidencePacket,
  createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundary,
  createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCatalog,
  createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryManifest,
  createAuditComplianceCp147ClaudeReviewPacket,
  createAuditComplianceCp147CloseoutHandoff,
  createAuditComplianceCp147CoveredUnitIds,
  createAuditComplianceCp147HermesEvidencePacket,
  createAuditComplianceCp147PermissionMatrixFailureTaxonomyReference,
  createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCatalog,
  createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceManifest,
  createAuditComplianceCp148ClaudeReviewPacket,
  createAuditComplianceCp148CloseoutHandoff,
  createAuditComplianceCp148CoveredUnitIds,
  createAuditComplianceCp148FailureBoundarySensitive,
  createAuditComplianceCp148FailureBoundarySensitiveCatalog,
  createAuditComplianceCp148FailureBoundarySensitiveManifest,
  createAuditComplianceCp148HermesEvidencePacket,
  createAuditComplianceCp149ClaudeReviewPacket,
  createAuditComplianceCp149CloseoutHandoff,
  createAuditComplianceCp149CoveredUnitIds,
  createAuditComplianceCp149FailureWorkflowContinuation,
  createAuditComplianceCp149FailureWorkflowContinuationCatalog,
  createAuditComplianceCp149FailureWorkflowContinuationManifest,
  createAuditComplianceCp149HermesEvidencePacket,
  createAuditComplianceCp150ClaudeReviewPacket,
  createAuditComplianceCp150CloseoutHandoff,
  createAuditComplianceCp150CoveredUnitIds,
  createAuditComplianceCp150FailureFixtureSensitiveBoundary,
  createAuditComplianceCp150FailureFixtureSensitiveBoundaryCatalog,
  createAuditComplianceCp150FailureFixtureSensitiveBoundaryManifest,
  createAuditComplianceCp150HermesEvidencePacket,
  createAuditComplianceCp151ClaudeReviewPacket,
  createAuditComplianceCp151CloseoutHandoff,
  createAuditComplianceCp151CoveredUnitIds,
  createAuditComplianceCp151FailureEvidenceContinuation,
  createAuditComplianceCp151FailureEvidenceContinuationCatalog,
  createAuditComplianceCp151FailureEvidenceContinuationManifest,
  createAuditComplianceCp151HermesEvidencePacket,
  createAuditComplianceCp152ClaudeReviewPacket,
  createAuditComplianceCp152CloseoutHandoff,
  createAuditComplianceCp152CoveredUnitIds,
  createAuditComplianceCp152EvidenceWorkflowFixture,
  createAuditComplianceCp152EvidenceWorkflowFixtureCatalog,
  createAuditComplianceCp152EvidenceWorkflowFixtureManifest,
  createAuditComplianceCp152HermesEvidencePacket,
  createAuditComplianceCp153ClaudeReviewPacket,
  createAuditComplianceCp153CloseoutHandoff,
  createAuditComplianceCp153CoveredUnitIds,
  createAuditComplianceCp153HermesEvidencePacket,
  createAuditComplianceCp153ReviewCloseoutContinuation,
  createAuditComplianceCp153ReviewCloseoutContinuationCatalog,
  createAuditComplianceCp153ReviewCloseoutContinuationManifest,
  createAuditComplianceCp154ClaudeReviewPacket,
  createAuditComplianceCp154CloseoutHandoff,
  createAuditComplianceCp154CoveredUnitIds,
  createAuditComplianceCp154HermesEvidencePacket,
  createAuditComplianceCp154ReviewSensitiveBoundary,
  createAuditComplianceCp154ReviewSensitiveBoundaryCatalog,
  createAuditComplianceCp154ReviewSensitiveBoundaryManifest,
  createAuditComplianceCp155ClaudeReviewPacket,
  createAuditComplianceCp155CloseoutHandoff,
  createAuditComplianceCp155CoveredUnitIds,
  createAuditComplianceCp155HermesEvidencePacket,
  createAuditComplianceCp155ReviewTerminalCloseout,
  createAuditComplianceCp155ReviewTerminalCloseoutCatalog,
  createAuditComplianceCp155ReviewTerminalCloseoutManifest,
  createAuditLedger,
  runAuditComplianceCp135EntryReadinessCase,
  runAuditComplianceCp136ServiceInterfaceReadinessCase,
  runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase,
  runAuditComplianceCp138ClaudeBoundaryCase,
  runAuditComplianceCp139ApiUiReferenceReadinessCase,
  runAuditComplianceCp140UiWorkflowContinuationCase,
  runAuditComplianceCp141UiPermissionFixtureBindingCase,
  runAuditComplianceCp142UiFixtureEvidenceReferenceCase,
  runAuditComplianceCp143FixtureTerminalBoundaryCase,
  runAuditComplianceCp144FixturePermissionMatrixReferenceCase,
  runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase,
  runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase,
  runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase,
  runAuditComplianceCp148FailureBoundarySensitiveCase,
  runAuditComplianceCp149FailureWorkflowContinuationCase,
  runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase,
  runAuditComplianceCp151FailureEvidenceContinuationCase,
  runAuditComplianceCp152EvidenceWorkflowFixtureCase,
  runAuditComplianceCp153ReviewCloseoutContinuationCase,
  runAuditComplianceCp154ReviewSensitiveBoundaryCase,
  runAuditComplianceCp155ReviewTerminalCloseoutCase,
  validateAuditComplianceCp135Coverage,
  validateAuditComplianceCp136Coverage,
  validateAuditComplianceCp137Coverage,
  validateAuditComplianceCp138Coverage,
  validateAuditComplianceCp139Coverage,
  validateAuditComplianceCp140Coverage,
  validateAuditComplianceCp141Coverage,
  validateAuditComplianceCp142Coverage,
  validateAuditComplianceCp143Coverage,
  validateAuditComplianceCp144Coverage,
  validateAuditComplianceCp145Coverage,
  validateAuditComplianceCp146Coverage,
  validateAuditComplianceCp147Coverage,
  validateAuditComplianceCp148Coverage,
  validateAuditComplianceCp149Coverage,
  validateAuditComplianceCp150Coverage,
  validateAuditComplianceCp151Coverage,
  validateAuditComplianceCp152Coverage,
  validateAuditComplianceCp153Coverage,
  validateAuditComplianceCp154Coverage,
  validateAuditComplianceCp155Coverage,
  verifyHashChain,
} from "../src/index.js";

function auditEvent(overrides = {}) {
  return {
    event_id: "evt_default",
    schema_version: "law-firm-os.audit-event.v0.1",
    tenant_id: "t_synthetic",
    occurred_at: "2026-06-03T00:00:00.000Z",
    received_at: "2026-06-03T00:00:01.000Z",
    actor: { actor_id: "u_attorney", actor_type: "user" },
    action: "document.view",
    object: { object_id: "d_001", object_type: "Document" },
    outcome: "allow",
    decision: "allow",
    reason_code: "fixture",
    source_service: "audit-test",
    request_id: "req_001",
    trace_id: "trace_001",
    span_id: "span_001",
    idempotency_key: "idem_001",
    payload_classification: "metadata_plus_digest",
    payload_digest: "sha256:fixture",
    evidence_refs: [],
    matter_id: "m_001",
    document_version_id: "dv_001",
    permission_decision_id: "pd_001",
    ...overrides,
  };
}

test("append-only ledger creates tamper-evident hash chain", () => {
  const ledger = createAuditLedger();
  const first = ledger.append(auditEvent({
    event_id: "evt_001",
    action: "document.view",
    idempotency_key: "idem_001",
  }));
  const second = ledger.append(auditEvent({
    event_id: "evt_002",
    action: "document.download",
    occurred_at: "2026-06-03T00:01:00.000Z",
    received_at: "2026-06-03T00:01:01.000Z",
    idempotency_key: "idem_002",
  }));

  assert.equal(second.previous_event_hash, first.event_hash);
  assert.deepEqual(ledger.verify(), { ok: true, checked: 2 });
});

test("AuditEvent requires contract baseline fields", () => {
  const ledger = createAuditLedger();

  assert.throws(
    () => ledger.append(auditEvent({ request_id: "" })),
    /AuditEvent missing required fields: request_id/,
  );
  assert.throws(
    () => ledger.append(auditEvent({ actor: {} })),
    /AuditEvent actor missing required fields: actor_id, actor_type/,
  );
  assert.throws(
    () => ledger.append(auditEvent({ object: {} })),
    /AuditEvent object missing required fields: object_id, object_type/,
  );
});

test("AuditEvent canonicalization is recursive and immutable", () => {
  const ledger = createAuditLedger();
  const event = ledger.append(auditEvent({
    event_id: "evt_nested",
    idempotency_key: "idem_nested",
    object: { object_type: "Document", object_id: "d_nested" },
    evidence_refs: [{ ref_type: "document_version", ref_id: "dv_001" }],
  }));

  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.evidence_refs), true);
  assert.equal(Object.isFrozen(event.evidence_refs[0]), true);
  assert.throws(() => event.evidence_refs.push("mutate"), TypeError);
});

test("AuditEvent enforces conditional fields for document and permission decisions", () => {
  const ledger = createAuditLedger();

  assert.throws(
    () => ledger.append(auditEvent({ matter_id: "" })),
    /conditionally required field: matter_id/,
  );
  assert.throws(
    () => ledger.append(auditEvent({ document_version_id: "" })),
    /conditionally required field: document_version_id/,
  );
  assert.throws(
    () => ledger.append(auditEvent({ permission_decision_id: "" })),
    /conditionally required field: permission_decision_id/,
  );
  assert.throws(
    () => ledger.append(auditEvent({
      object: { object_id: "pay_001", object_type: "Payment" },
      matter_id: "",
      document_version_id: null,
    })),
    /conditionally required field: matter_id/,
  );
  assert.throws(
    () => ledger.append(auditEvent({
      object: { object_id: "dr_001", object_type: "DataRoom" },
      document_version_id: "",
    })),
    /conditionally required field: document_version_id/,
  );
});

test("corrections are new events rather than in-place mutation", () => {
  const ledger = createAuditLedger();
  const original = ledger.append(auditEvent({
    event_id: "evt_original",
    action: "permission.change",
    object: { object_id: "policy_001", object_type: "Policy" },
    matter_id: null,
    document_version_id: null,
    idempotency_key: "idem_original",
  }));
  const correction = ledger.correction(original, auditEvent({
    event_id: "evt_correction",
    actor: { actor_id: "u_auditor", actor_type: "user" },
    object: { object_id: "policy_001", object_type: "Policy" },
    matter_id: null,
    document_version_id: null,
    outcome: "corrected",
    occurred_at: "2026-06-03T00:02:00.000Z",
    received_at: "2026-06-03T00:02:01.000Z",
    reason_code: "audit_correction",
    idempotency_key: "idem_correction",
  }));

  assert.equal(correction.correction_of_event_id, original.event_id);
  assert.equal(correction.action, "audit.correction.append");
  assert.equal(ledger.list({ tenant_id: "t_synthetic" }).length, 2);
});

test("hash chain detects clock skew and correction relinking", () => {
  const ledger = createAuditLedger();
  const original = ledger.append(auditEvent({ event_id: "evt_original", idempotency_key: "idem_original" }));
  const correction = ledger.correction(original, auditEvent({
    event_id: "evt_correction",
    actor: { actor_id: "u_auditor", actor_type: "user" },
    object: { object_id: "policy_001", object_type: "Policy" },
    matter_id: null,
    document_version_id: null,
    outcome: "corrected",
    occurred_at: "2026-06-03T00:02:00.000Z",
    received_at: "2026-06-03T00:02:01.000Z",
    reason_code: "audit_correction",
    idempotency_key: "idem_correction",
  }));
  const skewed = { ...original, received_at: "2026-06-03T01:00:00.000Z" };
  const relinkedCorrection = { ...correction, correction_of_event_id: "evt_other" };

  assert.deepEqual(verifyHashChain([skewed]), { ok: false, reason: "clock_skew_out_of_policy", event_id: original.event_id });
  assert.deepEqual(verifyHashChain([original, relinkedCorrection]), {
    ok: false,
    reason: "event_hash_mismatch",
    event_id: correction.event_id,
  });
});

test("ledger sequences and reads are tenant-scoped", () => {
  const ledger = createAuditLedger();
  const tenantOne = ledger.append(auditEvent({ event_id: "evt_t1_001", tenant_id: "t_one", idempotency_key: "idem_t1_001" }));
  const tenantTwo = ledger.append(auditEvent({ event_id: "evt_t2_001", tenant_id: "t_two", idempotency_key: "idem_t2_001" }));
  const tenantOneSecond = ledger.append(auditEvent({ event_id: "evt_t1_002", tenant_id: "t_one", idempotency_key: "idem_t1_002" }));

  assert.equal(tenantOne.sequence_number, 1);
  assert.equal(tenantTwo.sequence_number, 1);
  assert.equal(tenantOneSecond.sequence_number, 2);
  assert.equal(tenantOneSecond.previous_event_hash, tenantOne.event_hash);
  assert.deepEqual(ledger.list({ tenant_id: "t_two" }).map((event) => event.event_id), ["evt_t2_001"]);
  assert.throws(() => ledger.list(), /requires tenant_id/);
  assert.deepEqual(ledger.verify({ tenant_id: "t_one" }), { ok: true, checked: 2 });
});

test("ledger enforces tenant-scoped idempotency keys", () => {
  const ledger = createAuditLedger();
  const first = ledger.append(auditEvent({ event_id: "evt_once", tenant_id: "t_one", idempotency_key: "idem_once" }));
  const duplicate = ledger.append(auditEvent({ event_id: "evt_duplicate", tenant_id: "t_one", idempotency_key: "idem_once" }));
  const otherTenant = ledger.append(auditEvent({ event_id: "evt_other_tenant", tenant_id: "t_two", idempotency_key: "idem_once" }));

  assert.equal(duplicate, first);
  assert.equal(otherTenant.event_id, "evt_other_tenant");
  assert.deepEqual(ledger.list({ tenant_id: "t_one" }).map((event) => event.event_id), ["evt_once"]);
});

test("legal hold blocks purge even when retention expired", () => {
  assert.deepEqual(
    canPurgeAuditEvent({ retention_expired: true, active_legal_hold: true, chain_verified: true, human_approval: true }),
    { allowed: false, reason: "legal_hold_blocks_purge" },
  );
});

test("purge requires custody receipt when required by export policy", () => {
  assert.deepEqual(
    canPurgeAuditEvent({
      retention_expired: true,
      active_legal_hold: false,
      chain_verified: true,
      human_approval: true,
      export_custody_receipt_required: true,
      export_custody_receipt_present: false,
    }),
    { allowed: false, reason: "export_custody_receipt_required" },
  );
  assert.deepEqual(
    canPurgeAuditEvent({
      retention_expired: true,
      active_legal_hold: false,
      chain_verified: true,
      human_approval: true,
      export_custody_receipt_required: true,
      export_custody_receipt_present: true,
    }),
    { allowed: true, reason: "purge_allowed" },
  );
});

test("CP00-135 Risk C audit compliance entry readiness catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-135/manifest.json", import.meta.url), "utf8"));
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-135") ?? manifest.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp135CoveredUnitIds();
  const catalog = createAuditComplianceCp135EntryReadinessCatalog();
  const coverage = validateAuditComplianceCp135Coverage(plannedPack);

  assert.equal(manifest.pack_id, "CP00-135");
  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP135_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP135_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P00.M00.S01");
  assert.equal(coveredUnitIds.at(-1), "RP03.P01.M08.S05");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P00.M00.S01",
    last_unit_id: "RP03.P01.M08.S05",
  });
});

test("CP00-135 catalog binds audit entry contract and domain model distributions", () => {
  const readiness = createAuditComplianceCp135EntryReadiness();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 104,
    contract: 3,
    security_audit: 6,
    ui: 19,
    fixture: 3,
    test: 9,
    hermes_evidence: 3,
    claude_review: 3,
  });
  assert.equal(readiness.cp134_handoff_inherited, true);
  assert.equal(readiness.cp136_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.append_only_contract_declared, true);
  assert.equal(readiness.tenant_boundary_declared, true);
  assert.equal(readiness.privacy_payload_policy_declared, true);
  assert.deepEqual(readiness.requirement_refs, [
    "AUD-001",
    "AUD-002",
    "AUD-003",
    "AUD-004",
    "AUD-005",
    "AUD-006",
    "AUD-007",
    "AUD-008",
    "NARR-009",
  ]);
});

test("CP00-135 cases are no-write reference-only readiness checks", () => {
  const permissionCase = runAuditComplianceCp135EntryReadinessCase("RP03.P00.M05.S08.permission_baseline_note");
  const uiCase = runAuditComplianceCp135EntryReadinessCase("RP03.P01.M03.S10.state_transition_map");
  const claudeCase = runAuditComplianceCp135EntryReadinessCase("RP03.P01.M07.S19.claude_model_review_prompt");

  for (const result of [permissionCase, uiCase, claudeCase]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(permissionCase.domain, "security_audit_boundary");
  assert.equal(uiCase.domain, "domain_model_ui_reference_boundary");
  assert.equal(claudeCase.domain, "claude_review_boundary");
});

test("CP00-135 manifest evidence review and handoff packets bind H03 C03 and CP00-136", () => {
  const manifest = createAuditComplianceCp135EntryReadinessManifest();
  const hermes = createAuditComplianceCp135HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp135ClaudeReviewPacket();
  const handoff = createAuditComplianceCp135CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-135");
  assert.equal(manifest.production_ready_flag, "audit_compliance_entry_readiness_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(hermes.evidence_id, "H03.CP00-135.audit_compliance_entry_readiness");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(hermes.commands[0].status, "passed");
  assert.equal(claude.review_id, "C03.CP00-135.audit_compliance_entry_readiness");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(handoff.from_pack_id, "CP00-135");
  assert.equal(handoff.to_pack_id, "CP00-136");
  assert.equal(handoff.next_subphase_id, "RP03.P01.M08.S06");
});

test("CP00-136 Risk C audit service interface readiness catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-136/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-136") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp136CoveredUnitIds();
  const catalog = createAuditComplianceCp136ServiceInterfaceReadinessCatalog();
  const coverage = validateAuditComplianceCp136Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP136_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP136_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P01.M08.S06");
  assert.equal(coveredUnitIds.at(-1), "RP03.P02.M07.S06");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P01.M08.S06",
    last_unit_id: "RP03.P02.M07.S06",
  });
});

test("CP00-136 catalog binds service interface distributions and sensitive boundaries", () => {
  const readiness = createAuditComplianceCp136ServiceInterfaceReadiness();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 70,
    ui: 23,
    contract: 8,
    security_audit: 16,
    claude_review: 5,
    failure_recovery: 10,
    test: 18,
  });
  assert.equal(readiness.cp135_handoff_inherited, true);
  assert.equal(readiness.cp137_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.service_entrypoint_contract_declared, true);
  assert.equal(readiness.tenant_boundary_precheck_declared, true);
  assert.equal(readiness.matter_trace_precheck_declared, true);
  assert.equal(readiness.permission_audit_precheck_declared, true);
  assert.equal(readiness.idempotency_lock_persistence_boundaries_declared, true);
  assert.equal(readiness.rollback_retry_boundaries_declared, true);
});

test("CP00-136 cases keep service prechecks failure recovery and UI as no-write references", () => {
  const tenantCase = runAuditComplianceCp136ServiceInterfaceReadinessCase("RP03.P02.M03.S03.tenant_boundary_precheck");
  const lockCase = runAuditComplianceCp136ServiceInterfaceReadinessCase("RP03.P02.M04.S11.lock_acquisition_rule");
  const rollbackCase = runAuditComplianceCp136ServiceInterfaceReadinessCase("RP03.P02.M06.S17.rollback_behavior");
  const reviewCase = runAuditComplianceCp136ServiceInterfaceReadinessCase("RP03.P02.M05.S14.review_required_routing");

  for (const result of [tenantCase, lockCase, rollbackCase, reviewCase]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.acquires_locks, false);
    assert.equal(result.persists_lock_tokens, false);
    assert.equal(result.persists_idempotency_keys, false);
    assert.equal(result.executes_rollback, false);
    assert.equal(result.executes_retry, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(tenantCase.domain, "tenant_boundary_precheck");
  assert.equal(lockCase.domain, "state_boundary_precheck");
  assert.equal(rollbackCase.domain, "failure_recovery_precheck");
  assert.equal(reviewCase.domain, "review_routing_boundary");
});

test("CP00-136 manifest evidence review and handoff packets bind H03 C03 and CP00-137", () => {
  const manifest = createAuditComplianceCp136ServiceInterfaceReadinessManifest();
  const hermes = createAuditComplianceCp136HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp136ClaudeReviewPacket();
  const handoff = createAuditComplianceCp136CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-136");
  assert.equal(manifest.production_ready_flag, "audit_compliance_service_interface_readiness_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.acquires_locks, false);
  assert.equal(manifest.no_write_attestation.executes_rollback, false);
  assert.equal(hermes.evidence_id, "H03.CP00-136.audit_compliance_service_interface_readiness");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(claude.review_id, "C03.CP00-136.audit_compliance_service_interface_readiness");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(handoff.from_pack_id, "CP00-136");
  assert.equal(handoff.to_pack_id, "CP00-137");
  assert.equal(handoff.next_subphase_id, "RP03.P02.M07.S07");
});

test("CP00-137 Risk B audit service interface workflow evidence catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-137/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-137") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp137CoveredUnitIds();
  const catalog = createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCatalog();
  const coverage = validateAuditComplianceCp137Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 40);
  assert.equal(AUDIT_COMPLIANCE_CP137_PACK_BINDING.risk_class, "B");
  assert.equal(AUDIT_COMPLIANCE_CP137_PACK_BINDING.unit_count, 40);
  assert.equal(coveredUnitIds.length, 40);
  assert.equal(catalog.length, 40);
  assert.equal(coveredUnitIds[0], "RP03.P02.M07.S07");
  assert.equal(coveredUnitIds.at(-1), "RP03.P02.M09.S02");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 40,
    first_unit_id: "RP03.P02.M07.S07",
    last_unit_id: "RP03.P02.M09.S02",
  });
});

test("CP00-137 catalog binds workflow evidence distributions and review packet modes", () => {
  const readiness = createAuditComplianceCp137ServiceInterfaceWorkflowEvidence();

  assert.equal(readiness.covered_unit_count, 40);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 16,
    ui: 6,
    claude_review: 2,
    failure_recovery: 4,
    test: 8,
    contract: 2,
    security_audit: 2,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    test_golden_case: 16,
    hermes_evidence_packet: 22,
    claude_review_packet: 2,
  });
  assert.equal(readiness.cp136_handoff_inherited, true);
  assert.equal(readiness.cp138_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.golden_case_set_declared, true);
  assert.equal(readiness.hermes_evidence_packet_declared, true);
  assert.equal(readiness.claude_review_packet_declared, true);
  assert.equal(readiness.service_entrypoint_contract_declared, true);
  assert.equal(readiness.permission_audit_precheck_declared, true);
  assert.equal(readiness.idempotency_lock_persistence_boundaries_declared, true);
  assert.equal(readiness.rollback_retry_boundaries_declared, true);
});

test("CP00-137 cases keep golden Hermes and Claude packet rows as no-write references", () => {
  const goldenHappy = runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase("RP03.P02.M07.S07.primary_happy_path");
  const hermesLock = runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase("RP03.P02.M08.S11.lock_acquisition_rule");
  const hermesRetry = runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase("RP03.P02.M08.S18.retry_behavior");
  const claudeRequest = runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase("RP03.P02.M09.S02.request_normalization");

  for (const result of [goldenHappy, hermesLock, hermesRetry, claudeRequest]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.acquires_locks, false);
    assert.equal(result.persists_lock_tokens, false);
    assert.equal(result.persists_idempotency_keys, false);
    assert.equal(result.executes_rollback, false);
    assert.equal(result.executes_retry, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(goldenHappy.evidence_mode, "test_golden_case");
  assert.equal(hermesLock.domain, "state_boundary_evidence_case");
  assert.equal(hermesRetry.domain, "failure_recovery_evidence_case");
  assert.equal(claudeRequest.domain, "claude_review_packet_boundary");
});

test("CP00-137 manifest evidence review and handoff packets bind H03 C03 and CP00-138", () => {
  const manifest = createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceManifest();
  const hermes = createAuditComplianceCp137HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp137ClaudeReviewPacket();
  const handoff = createAuditComplianceCp137CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-137");
  assert.equal(manifest.production_ready_flag, "audit_compliance_service_interface_workflow_evidence_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.acquires_locks, false);
  assert.equal(manifest.no_write_attestation.executes_claude_review, false);
  assert.equal(hermes.evidence_id, "H03.CP00-137.audit_compliance_service_interface_workflow_evidence");
  assert.equal(hermes.covered_units.length, 40);
  assert.equal(claude.review_id, "C03.CP00-137.audit_compliance_service_interface_workflow_evidence");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(handoff.from_pack_id, "CP00-137");
  assert.equal(handoff.to_pack_id, "CP00-138");
  assert.equal(handoff.next_subphase_id, "RP03.P02.M09.S03");
});

test("CP00-138 Risk A audit Claude packet boundary catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-138/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-138") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp138CoveredUnitIds();
  const catalog = createAuditComplianceCp138ClaudeBoundaryCatalog();
  const coverage = validateAuditComplianceCp138Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 10);
  assert.equal(AUDIT_COMPLIANCE_CP138_PACK_BINDING.risk_class, "A");
  assert.equal(AUDIT_COMPLIANCE_CP138_PACK_BINDING.unit_count, 10);
  assert.equal(coveredUnitIds.length, 10);
  assert.equal(catalog.length, 10);
  assert.equal(coveredUnitIds[0], "RP03.P02.M09.S03");
  assert.equal(coveredUnitIds.at(-1), "RP03.P02.M09.S12");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 10,
    first_unit_id: "RP03.P02.M09.S03",
    last_unit_id: "RP03.P02.M09.S12",
  });
});

test("CP00-138 catalog binds sensitive Claude packet distributions and boundaries", () => {
  const readiness = createAuditComplianceCp138ClaudeBoundary();

  assert.equal(readiness.covered_unit_count, 10);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 6,
    security_audit: 2,
    ui: 2,
  });
  assert.equal(readiness.cp137_handoff_inherited, true);
  assert.equal(readiness.cp139_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.claude_review_packet_declared, true);
  assert.equal(readiness.tenant_boundary_precheck_declared, true);
  assert.equal(readiness.matter_trace_precheck_declared, true);
  assert.equal(readiness.permission_audit_precheck_declared, true);
  assert.equal(readiness.idempotency_lock_persistence_boundaries_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-138 cases keep sensitive Claude packet rows as no-write references", () => {
  const tenantCase = runAuditComplianceCp138ClaudeBoundaryCase("rp03_p02_m09.tenant_boundary_precheck");
  const permissionCase = runAuditComplianceCp138ClaudeBoundaryCase("RP03.P02.M09.S05.permission_precheck");
  const lockCase = runAuditComplianceCp138ClaudeBoundaryCase("rp03_p02_m09.lock_acquisition_rule");
  const persistenceCase = runAuditComplianceCp138ClaudeBoundaryCase("RP03.P02.M09.S12.persistence_boundary");

  for (const result of [tenantCase, permissionCase, lockCase, persistenceCase]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.acquires_locks, false);
    assert.equal(result.persists_lock_tokens, false);
    assert.equal(result.persists_idempotency_keys, false);
    assert.equal(result.executes_rollback, false);
    assert.equal(result.executes_retry, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(tenantCase.domain, "tenant_boundary_claude_packet_boundary");
  assert.equal(permissionCase.domain, "permission_audit_claude_packet_boundary");
  assert.equal(lockCase.domain, "state_persistence_claude_packet_boundary");
  assert.equal(persistenceCase.domain, "state_persistence_claude_packet_boundary");
});

test("CP00-138 manifest evidence review and handoff packets bind H03 C03 and CP00-139", () => {
  const manifest = createAuditComplianceCp138ClaudeBoundaryManifest();
  const hermes = createAuditComplianceCp138HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp138ClaudeReviewPacket();
  const handoff = createAuditComplianceCp138CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-138");
  assert.equal(manifest.production_ready_flag, "audit_compliance_claude_packet_sensitive_boundary_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.acquires_locks, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-138.audit_compliance_claude_packet_sensitive_boundary");
  assert.equal(hermes.covered_units.length, 10);
  assert.equal(claude.review_id, "C03.CP00-138.audit_compliance_claude_packet_sensitive_boundary");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-138");
  assert.equal(handoff.to_pack_id, "CP00-139");
  assert.equal(handoff.next_subphase_id, "RP03.P02.M09.S13");
});

test("CP00-139 Risk C audit API/UI reference readiness catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-139/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-139") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp139CoveredUnitIds();
  const catalog = createAuditComplianceCp139ApiUiReferenceReadinessCatalog();
  const coverage = validateAuditComplianceCp139Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP139_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP139_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P02.M09.S13");
  assert.equal(coveredUnitIds.at(-1), "RP03.P04.M02.S07");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P02.M09.S13",
    last_unit_id: "RP03.P04.M02.S07",
  });
});

test("CP00-139 catalog binds API UI reference distributions and readiness modes", () => {
  const readiness = createAuditComplianceCp139ApiUiReferenceReadiness();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 57,
    claude_review: 6,
    ui: 17,
    failure_recovery: 2,
    test: 12,
    contract: 35,
    security_audit: 18,
    hermes_evidence: 3,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    service_claude_packet_terminal: 8,
    service_closeout_handoff: 11,
    api_reference_readiness: 93,
    api_hermes_evidence_packet: 8,
    api_claude_review_packet: 8,
    api_closeout_handoff: 3,
    ui_reference_readiness: 19,
  });
  assert.equal(readiness.cp138_handoff_inherited, true);
  assert.equal(readiness.cp140_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.service_claude_packet_terminal_declared, true);
  assert.equal(readiness.service_closeout_handoff_declared, true);
  assert.equal(readiness.api_interface_contract_declared, true);
  assert.equal(readiness.api_permission_audit_binding_declared, true);
  assert.equal(readiness.api_unauthorized_data_omission_declared, true);
  assert.equal(readiness.ui_reference_opening_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-139 cases keep API UI and terminal rows as no-write references", () => {
  const apiContract = runAuditComplianceCp139ApiUiReferenceReadinessCase("RP03.P03.M03.S02.request_contract");
  const permissionAudit = runAuditComplianceCp139ApiUiReferenceReadinessCase("rp03_p03_m05.permission_annotation");
  const unauthorized = runAuditComplianceCp139ApiUiReferenceReadinessCase("RP03.P03.M05.S09.unauthorized_data_omission");
  const uiReview = runAuditComplianceCp139ApiUiReferenceReadinessCase("RP03.P04.M01.S06.review_required_state");
  const serviceRetry = runAuditComplianceCp139ApiUiReferenceReadinessCase("rp03_p02_m09.retry_behavior");

  for (const result of [apiContract, permissionAudit, unauthorized, uiReview, serviceRetry]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.acquires_locks, false);
    assert.equal(result.executes_rollback, false);
    assert.equal(result.executes_retry, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(apiContract.domain, "api_contract_reference");
  assert.equal(permissionAudit.domain, "api_permission_audit_reference");
  assert.equal(unauthorized.domain, "api_unauthorized_data_reference");
  assert.equal(uiReview.domain, "ui_review_state_reference");
  assert.equal(serviceRetry.domain, "service_failure_recovery_terminal_reference");
});

test("CP00-139 manifest evidence review and handoff packets bind H03 C03 and CP00-140", () => {
  const manifest = createAuditComplianceCp139ApiUiReferenceReadinessManifest();
  const hermes = createAuditComplianceCp139HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp139ClaudeReviewPacket();
  const handoff = createAuditComplianceCp139CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-139");
  assert.equal(manifest.production_ready_flag, "audit_compliance_api_ui_reference_readiness_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.executes_api_handler, false);
  assert.equal(manifest.no_write_attestation.renders_ui, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-139.audit_compliance_api_ui_reference_readiness");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(claude.review_id, "C03.CP00-139.audit_compliance_api_ui_reference_readiness");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-139");
  assert.equal(handoff.to_pack_id, "CP00-140");
  assert.equal(handoff.next_subphase_id, "RP03.P04.M02.S08");
});

test("CP00-140 Risk B audit UI workflow continuation catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-140/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-140") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp140CoveredUnitIds();
  const catalog = createAuditComplianceCp140UiWorkflowContinuationCatalog();
  const coverage = validateAuditComplianceCp140Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 40);
  assert.equal(AUDIT_COMPLIANCE_CP140_PACK_BINDING.risk_class, "B");
  assert.equal(AUDIT_COMPLIANCE_CP140_PACK_BINDING.unit_count, 40);
  assert.equal(coveredUnitIds.length, 40);
  assert.equal(catalog.length, 40);
  assert.equal(coveredUnitIds[0], "RP03.P04.M02.S08");
  assert.equal(coveredUnitIds.at(-1), "RP03.P04.M04.S17");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 40,
    first_unit_id: "RP03.P04.M02.S08",
    last_unit_id: "RP03.P04.M04.S17",
  });
});

test("CP00-140 catalog binds UI workflow distributions and modes", () => {
  const readiness = createAuditComplianceCp140UiWorkflowContinuation();

  assert.equal(readiness.covered_unit_count, 40);
  assert.deepEqual(readiness.deliverable_counts, {
    ui: 18,
    implementation: 10,
    claude_review: 3,
    security_audit: 4,
    fixture: 2,
    test: 2,
    hermes_evidence: 1,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    ui_type_shape_terminal: 1,
    ui_primary_workflow: 22,
    ui_secondary_workflow_opening: 17,
  });
  assert.equal(readiness.cp139_handoff_inherited, true);
  assert.equal(readiness.cp141_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.ui_surface_workflow_declared, true);
  assert.equal(readiness.ui_permission_audit_badges_declared, true);
  assert.equal(readiness.ui_denied_review_states_declared, true);
  assert.equal(readiness.ui_layout_focus_fixture_declared, true);
  assert.equal(readiness.ui_no_unauthorized_count_leak_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-140 cases keep UI workflow rows as no-write non-rendering references", () => {
  const secondaryInteraction = runAuditComplianceCp140UiWorkflowContinuationCase("RP03.P04.M02.S08.secondary_interaction");
  const permissionBadge = runAuditComplianceCp140UiWorkflowContinuationCase("rp03_p04_m03.permission_badge");
  const auditHint = runAuditComplianceCp140UiWorkflowContinuationCase("RP03.P04.M04.S10.audit_hint_display");
  const focusCase = runAuditComplianceCp140UiWorkflowContinuationCase("rp03_p04_m03.keyboard_focus_behavior");
  const leakCase = runAuditComplianceCp140UiWorkflowContinuationCase("RP03.P04.M03.S22.no_unauthorized_count_leak");

  for (const result of [secondaryInteraction, permissionBadge, auditHint, focusCase, leakCase]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.opens_browser, false);
    assert.equal(result.captures_screenshot, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(secondaryInteraction.domain, "ui_interaction_reference");
  assert.equal(permissionBadge.domain, "ui_permission_audit_reference");
  assert.equal(auditHint.domain, "ui_permission_audit_reference");
  assert.equal(focusCase.domain, "ui_interaction_reference");
  assert.equal(leakCase.domain, "ui_leakage_guard_reference");
});

test("CP00-140 manifest evidence review and handoff packets bind H03 C03 and CP00-141", () => {
  const manifest = createAuditComplianceCp140UiWorkflowContinuationManifest();
  const hermes = createAuditComplianceCp140HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp140ClaudeReviewPacket();
  const handoff = createAuditComplianceCp140CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-140");
  assert.equal(manifest.production_ready_flag, "audit_compliance_ui_workflow_continuation_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.renders_ui, false);
  assert.equal(manifest.no_write_attestation.mutates_dom, false);
  assert.equal(manifest.no_write_attestation.opens_browser, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-140.audit_compliance_ui_workflow_continuation");
  assert.equal(hermes.covered_units.length, 40);
  assert.equal(claude.review_id, "C03.CP00-140.audit_compliance_ui_workflow_continuation");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-140");
  assert.equal(handoff.to_pack_id, "CP00-141");
  assert.equal(handoff.next_subphase_id, "RP03.P04.M04.S18");
});

test("CP00-141 Risk B audit UI permission fixture binding catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-141/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-141") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp141CoveredUnitIds();
  const catalog = createAuditComplianceCp141UiPermissionFixtureBindingCatalog();
  const coverage = validateAuditComplianceCp141Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 40);
  assert.equal(AUDIT_COMPLIANCE_CP141_PACK_BINDING.risk_class, "B");
  assert.equal(AUDIT_COMPLIANCE_CP141_PACK_BINDING.unit_count, 40);
  assert.equal(coveredUnitIds.length, 40);
  assert.equal(catalog.length, 40);
  assert.equal(coveredUnitIds[0], "RP03.P04.M04.S18");
  assert.equal(coveredUnitIds.at(-1), "RP03.P04.M06.S15");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 40,
    first_unit_id: "RP03.P04.M04.S18",
    last_unit_id: "RP03.P04.M06.S15",
  });
});

test("CP00-141 catalog binds permission fixture distributions and modes", () => {
  const readiness = createAuditComplianceCp141UiPermissionFixtureBinding();

  assert.equal(readiness.covered_unit_count, 40);
  assert.deepEqual(readiness.deliverable_counts, {
    hermes_evidence: 2,
    claude_review: 4,
    implementation: 11,
    ui: 17,
    security_audit: 4,
    fixture: 1,
    test: 1,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    ui_secondary_workflow_terminal: 3,
    ui_permission_audit_binding: 22,
    ui_synthetic_fixture_opening: 15,
  });
  assert.equal(readiness.cp140_handoff_inherited, true);
  assert.equal(readiness.cp142_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.ui_permission_audit_binding_declared, true);
  assert.equal(readiness.ui_synthetic_fixture_opening_declared, true);
  assert.equal(readiness.ui_terminal_evidence_review_declared, true);
  assert.equal(readiness.ui_denied_review_states_declared, true);
  assert.equal(readiness.ui_layout_focus_declared, true);
  assert.equal(readiness.ui_no_hidden_field_exposure_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-141 cases keep permission fixture rows as no-write non-rendering references", () => {
  const hermesEvidence = runAuditComplianceCp141UiPermissionFixtureBindingCase("RP03.P04.M04.S18.hermes_ui_evidence");
  const permissionBadge = runAuditComplianceCp141UiPermissionFixtureBindingCase("rp03_p04_m05.permission_badge");
  const auditHint = runAuditComplianceCp141UiPermissionFixtureBindingCase("RP03.P04.M05.S10.audit_hint_display");
  const fixtureOpening = runAuditComplianceCp141UiPermissionFixtureBindingCase("rp03_p04_m06.loading_state");
  const focusCase = runAuditComplianceCp141UiPermissionFixtureBindingCase("RP03.P04.M06.S14.keyboard_focus_behavior");

  for (const result of [hermesEvidence, permissionBadge, auditHint, fixtureOpening, focusCase]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.opens_browser, false);
    assert.equal(result.captures_screenshot, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(hermesEvidence.domain, "ui_terminal_evidence_review_reference");
  assert.equal(permissionBadge.domain, "ui_permission_audit_binding_reference");
  assert.equal(auditHint.domain, "ui_permission_audit_binding_reference");
  assert.equal(fixtureOpening.domain, "ui_synthetic_fixture_reference");
  assert.equal(focusCase.domain, "ui_synthetic_fixture_reference");
});

test("CP00-141 manifest evidence review and handoff packets bind H03 C03 and CP00-142", () => {
  const manifest = createAuditComplianceCp141UiPermissionFixtureBindingManifest();
  const hermes = createAuditComplianceCp141HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp141ClaudeReviewPacket();
  const handoff = createAuditComplianceCp141CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-141");
  assert.equal(manifest.production_ready_flag, "audit_compliance_ui_permission_fixture_binding_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.executes_permission_decision, false);
  assert.equal(manifest.no_write_attestation.executes_audit_hint_check, false);
  assert.equal(manifest.no_write_attestation.renders_ui, false);
  assert.equal(manifest.no_write_attestation.mutates_dom, false);
  assert.equal(manifest.no_write_attestation.opens_browser, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-141.audit_compliance_ui_permission_fixture_binding");
  assert.equal(hermes.covered_units.length, 40);
  assert.equal(claude.review_id, "C03.CP00-141.audit_compliance_ui_permission_fixture_binding");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-141");
  assert.equal(handoff.to_pack_id, "CP00-142");
  assert.equal(handoff.next_subphase_id, "RP03.P04.M06.S16");
});

test("CP00-142 Risk C audit UI fixture evidence reference catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-142/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-142") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp142CoveredUnitIds();
  const catalog = createAuditComplianceCp142UiFixtureEvidenceReferenceCatalog();
  const coverage = validateAuditComplianceCp142Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP142_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP142_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P04.M06.S16");
  assert.equal(coveredUnitIds.at(-1), "RP03.P05.M05.S13");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P04.M06.S16",
    last_unit_id: "RP03.P05.M05.S13",
  });
});

test("CP00-142 catalog binds fixture evidence distributions and modes", () => {
  const readiness = createAuditComplianceCp142UiFixtureEvidenceReference();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    fixture: 40,
    test: 10,
    hermes_evidence: 6,
    claude_review: 13,
    implementation: 38,
    ui: 31,
    security_audit: 12,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    ui_synthetic_fixture_terminal: 5,
    ui_test_golden_case_reference: 22,
    ui_hermes_evidence_packet_reference: 20,
    ui_claude_review_packet_reference: 20,
    ui_closeout_handoff_reference: 8,
    fixture_scope_inventory_reference: 4,
    fixture_contract_draft_reference: 8,
    fixture_type_shape_reference: 8,
    fixture_primary_workflow_reference: 22,
    fixture_secondary_workflow_reference: 20,
    fixture_permission_audit_binding_reference: 13,
  });
  assert.equal(readiness.cp141_handoff_inherited, true);
  assert.equal(readiness.cp143_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.ui_fixture_evidence_reference_declared, true);
  assert.equal(readiness.p05_fixture_lane_declared, true);
  assert.equal(readiness.fixture_permission_audit_binding_declared, true);
  assert.equal(readiness.fixture_ai_analytics_reference_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-142 cases keep fixture evidence rows as no-write non-executing references", () => {
  const syntheticFixture = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P04.M06.S16.synthetic_fixture_binding");
  const permissionBadge = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("rp03_p04_m07.permission_badge");
  const hermesEvidence = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P04.M08.S18.hermes_ui_evidence");
  const claudePrompt = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("rp03_p04_m09.claude_ui_leak_prompt");
  const crossTenant = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P05.M03.S09.cross_tenant_case");
  const aiAnalytics = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P05.M05.S13.ai_retrieval_or_analytics_case");

  for (const result of [syntheticFixture, permissionBadge, hermesEvidence, claudePrompt, crossTenant, aiAnalytics]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.opens_browser, false);
    assert.equal(result.captures_screenshot, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_golden_case_payload, false);
    assert.equal(result.executes_replay_command, false);
    assert.equal(result.executes_ai_retrieval, false);
    assert.equal(result.executes_analytics_query, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(syntheticFixture.domain, "ui_fixture_evidence_reference");
  assert.equal(permissionBadge.domain, "ui_permission_audit_reference");
  assert.equal(hermesEvidence.domain, "ui_hermes_evidence_packet_reference");
  assert.equal(claudePrompt.domain, "ui_claude_review_packet_reference");
  assert.equal(crossTenant.domain, "fixture_permission_audit_guard_reference");
  assert.equal(aiAnalytics.domain, "fixture_ai_analytics_reference");
});

test("CP00-142 manifest evidence review and handoff packets bind H03 C03 and CP00-143", () => {
  const manifest = createAuditComplianceCp142UiFixtureEvidenceReferenceManifest();
  const hermes = createAuditComplianceCp142HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp142ClaudeReviewPacket();
  const handoff = createAuditComplianceCp142CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-142");
  assert.equal(manifest.production_ready_flag, "audit_compliance_ui_fixture_evidence_reference_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.loads_fixture_payload, false);
  assert.equal(manifest.no_write_attestation.materializes_golden_case_payload, false);
  assert.equal(manifest.no_write_attestation.executes_replay_command, false);
  assert.equal(manifest.no_write_attestation.executes_ai_retrieval, false);
  assert.equal(manifest.no_write_attestation.executes_analytics_query, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-142.audit_compliance_ui_fixture_evidence_reference");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(claude.review_id, "C03.CP00-142.audit_compliance_ui_fixture_evidence_reference");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-142");
  assert.equal(handoff.to_pack_id, "CP00-143");
  assert.equal(handoff.next_subphase_id, "RP03.P05.M05.S14");
});

test("CP00-143 Risk A audit fixture terminal boundary catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-143/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-143") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp143CoveredUnitIds();
  const catalog = createAuditComplianceCp143FixtureTerminalBoundaryCatalog();
  const coverage = validateAuditComplianceCp143Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 10);
  assert.equal(AUDIT_COMPLIANCE_CP143_PACK_BINDING.risk_class, "A");
  assert.equal(AUDIT_COMPLIANCE_CP143_PACK_BINDING.unit_count, 10);
  assert.equal(coveredUnitIds.length, 10);
  assert.equal(catalog.length, 10);
  assert.equal(coveredUnitIds[0], "RP03.P05.M05.S14");
  assert.equal(coveredUnitIds.at(-1), "RP03.P05.M06.S01");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 10,
    first_unit_id: "RP03.P05.M05.S14",
    last_unit_id: "RP03.P05.M06.S01",
  });
});

test("CP00-143 catalog binds terminal boundary distributions and modes", () => {
  const readiness = createAuditComplianceCp143FixtureTerminalBoundary();

  assert.equal(readiness.covered_unit_count, 10);
  assert.deepEqual(readiness.deliverable_counts, {
    fixture: 2,
    test: 3,
    hermes_evidence: 1,
    implementation: 4,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    fixture_permission_audit_terminal_boundary: 9,
    synthetic_fixture_base_tenant_boundary: 1,
  });
  assert.equal(readiness.cp142_handoff_inherited, true);
  assert.equal(readiness.cp144_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.fixture_terminal_boundary_declared, true);
  assert.equal(readiness.fixture_manifest_boundary_declared, true);
  assert.equal(readiness.golden_failure_test_boundary_declared, true);
  assert.equal(readiness.no_real_data_boundary_declared, true);
  assert.equal(readiness.stable_id_replay_boundary_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-143 cases keep terminal fixture boundaries no-write and non-executing", () => {
  const manifestCase = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M05.S14.fixture_manifest");
  const hermesEvidence = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M05.S17.hermes_fixture_evidence");
  const claudePrompt = runAuditComplianceCp143FixtureTerminalBoundaryCase("rp03_p05_m05.claude_missing_test_prompt");
  const noRealData = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M05.S20.no_real_data_check");
  const replay = runAuditComplianceCp143FixtureTerminalBoundaryCase("rp03_p05_m05.replay_command");
  const baseTenant = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M06.S01.base_tenant_fixture");

  for (const result of [manifestCase, hermesEvidence, claudePrompt, noRealData, replay, baseTenant]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.opens_browser, false);
    assert.equal(result.captures_screenshot, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_golden_case_payload, false);
    assert.equal(result.materializes_failure_case_payload, false);
    assert.equal(result.executes_replay_command, false);
    assert.equal(result.persists_stable_id, false);
    assert.equal(result.emits_real_receipt, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(manifestCase.domain, "fixture_manifest_boundary_reference");
  assert.equal(hermesEvidence.domain, "fixture_hermes_evidence_boundary_reference");
  assert.equal(claudePrompt.domain, "fixture_claude_prompt_boundary_reference");
  assert.equal(noRealData.domain, "fixture_no_real_data_boundary_reference");
  assert.equal(replay.domain, "fixture_replay_command_boundary_reference");
  assert.equal(baseTenant.domain, "fixture_base_tenant_boundary_reference");
});

test("CP00-143 manifest evidence review and handoff packets bind H03 C03 and CP00-144", () => {
  const manifest = createAuditComplianceCp143FixtureTerminalBoundaryManifest();
  const hermes = createAuditComplianceCp143HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp143ClaudeReviewPacket();
  const handoff = createAuditComplianceCp143CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-143");
  assert.equal(manifest.production_ready_flag, "audit_compliance_fixture_terminal_boundary_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.loads_fixture_payload, false);
  assert.equal(manifest.no_write_attestation.materializes_fixture_manifest, false);
  assert.equal(manifest.no_write_attestation.materializes_golden_case_payload, false);
  assert.equal(manifest.no_write_attestation.materializes_failure_case_payload, false);
  assert.equal(manifest.no_write_attestation.executes_replay_command, false);
  assert.equal(manifest.no_write_attestation.persists_stable_id, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-143.audit_compliance_fixture_terminal_boundary");
  assert.equal(hermes.covered_units.length, 10);
  assert.equal(claude.review_id, "C03.CP00-143.audit_compliance_fixture_terminal_boundary");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-143");
  assert.equal(handoff.to_pack_id, "CP00-144");
  assert.equal(handoff.next_subphase_id, "RP03.P05.M06.S02");
});

test("CP00-144 Risk C audit fixture permission matrix reference catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-144/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-144") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp144CoveredUnitIds();
  const catalog = createAuditComplianceCp144FixturePermissionMatrixReferenceCatalog();
  const coverage = validateAuditComplianceCp144Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP144_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP144_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P05.M06.S02");
  assert.equal(coveredUnitIds.at(-1), "RP03.P06.M03.S19");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P05.M06.S02",
    last_unit_id: "RP03.P06.M03.S19",
  });
});

test("CP00-144 catalog binds fixture and permission matrix distributions", () => {
  const readiness = createAuditComplianceCp144FixturePermissionMatrixReference();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    fixture: 33,
    claude_review: 7,
    implementation: 59,
    security_audit: 22,
    test: 15,
    hermes_evidence: 4,
    ui: 10,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    synthetic_fixture_continuation_reference: 19,
    fixture_test_golden_case_reference: 22,
    fixture_hermes_evidence_packet_reference: 20,
    fixture_claude_review_packet_reference: 20,
    fixture_closeout_handoff_reference: 8,
    permission_scope_inventory_reference: 11,
    permission_contract_draft_reference: 11,
    permission_type_shape_reference: 20,
    permission_primary_implementation_reference: 19,
  });
  assert.equal(readiness.cp143_handoff_inherited, true);
  assert.equal(readiness.cp145_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.fixture_continuation_declared, true);
  assert.equal(readiness.fixture_hermes_packet_declared, true);
  assert.equal(readiness.fixture_claude_packet_declared, true);
  assert.equal(readiness.permission_matrix_scope_contract_declared, true);
  assert.equal(readiness.permission_matrix_decision_bindings_declared, true);
  assert.equal(readiness.permission_matrix_boundary_interactions_declared, true);
  assert.equal(readiness.permission_matrix_review_approval_declared, true);
  assert.equal(readiness.permission_matrix_audit_security_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-144 cases keep fixture and permission matrix rows no-write and non-executing", () => {
  const baseUser = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M06.S02.base_user_fixture");
  const crossTenant = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M07.S09.cross_tenant_case");
  const hermesEvidence = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M08.S17.hermes_fixture_evidence");
  const claudeReview = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M09.S07.review_required_case");
  const permissionMatrix = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M00.S01.permission_matrix_row");
  const aiDecision = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M02.S07.ai_retrieval_decision_binding");
  const legalHold = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M03.S11.legal_hold_interaction");
  const approvalRoute = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M03.S15.approval_required_route");
  const allowedTest = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M03.S19.allowed_test");

  for (const result of [baseUser, crossTenant, hermesEvidence, claudeReview, permissionMatrix, aiDecision, legalHold, approvalRoute, allowedTest]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_golden_case_payload, false);
    assert.equal(result.materializes_failure_case_payload, false);
    assert.equal(result.executes_replay_command, false);
    assert.equal(result.executes_ai_retrieval, false);
    assert.equal(result.executes_analytics_query, false);
    assert.equal(result.persists_stable_id, false);
    assert.equal(result.emits_real_receipt, false);
    assert.equal(result.evaluates_permission_matrix, false);
    assert.equal(result.evaluates_view_decision, false);
    assert.equal(result.evaluates_search_decision, false);
    assert.equal(result.evaluates_mutation_decision, false);
    assert.equal(result.evaluates_export_download_decision, false);
    assert.equal(result.evaluates_share_decision, false);
    assert.equal(result.evaluates_ai_retrieval_decision, false);
    assert.equal(result.applies_legal_hold, false);
    assert.equal(result.applies_ethical_wall, false);
    assert.equal(result.reads_object_acl, false);
    assert.equal(result.routes_review_required, false);
    assert.equal(result.routes_approval_required, false);
    assert.equal(result.proves_security_trimming, false);
    assert.equal(result.emits_audit_event_expectation, false);
    assert.equal(result.writes_permission_fixture, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(baseUser.domain, "fixture_identity_object_reference");
  assert.equal(crossTenant.domain, "fixture_permission_audit_guard_reference");
  assert.equal(hermesEvidence.domain, "fixture_evidence_review_reference");
  assert.equal(claudeReview.domain, "fixture_evidence_review_reference");
  assert.equal(permissionMatrix.domain, "permission_matrix_security_reference");
  assert.equal(aiDecision.domain, "permission_matrix_ai_reference");
  assert.equal(legalHold.domain, "permission_matrix_boundary_reference");
  assert.equal(approvalRoute.domain, "permission_matrix_review_approval_reference");
  assert.equal(allowedTest.domain, "permission_matrix_test_reference");
});

test("CP00-144 manifest evidence review and handoff packets bind H03 C03 and CP00-145", () => {
  const manifest = createAuditComplianceCp144FixturePermissionMatrixReferenceManifest();
  const hermes = createAuditComplianceCp144HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp144ClaudeReviewPacket();
  const handoff = createAuditComplianceCp144CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-144");
  assert.equal(manifest.production_ready_flag, "audit_compliance_fixture_permission_matrix_reference_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.loads_fixture_payload, false);
  assert.equal(manifest.no_write_attestation.materializes_fixture_manifest, false);
  assert.equal(manifest.no_write_attestation.materializes_golden_case_payload, false);
  assert.equal(manifest.no_write_attestation.executes_replay_command, false);
  assert.equal(manifest.no_write_attestation.persists_stable_id, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_matrix, false);
  assert.equal(manifest.no_write_attestation.evaluates_ai_retrieval_decision, false);
  assert.equal(manifest.no_write_attestation.applies_legal_hold, false);
  assert.equal(manifest.no_write_attestation.applies_ethical_wall, false);
  assert.equal(manifest.no_write_attestation.reads_object_acl, false);
  assert.equal(manifest.no_write_attestation.routes_review_required, false);
  assert.equal(manifest.no_write_attestation.routes_approval_required, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-144.audit_compliance_fixture_permission_matrix_reference");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(claude.review_id, "C03.CP00-144.audit_compliance_fixture_permission_matrix_reference");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-144");
  assert.equal(handoff.to_pack_id, "CP00-145");
  assert.equal(handoff.next_subphase_id, "RP03.P06.M03.S20");
});

test("CP00-145 Risk B audit permission matrix workflow boundary catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-145/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-145") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp145CoveredUnitIds();
  const catalog = createAuditComplianceCp145PermissionMatrixWorkflowBoundaryCatalog();
  const coverage = validateAuditComplianceCp145Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 40);
  assert.equal(AUDIT_COMPLIANCE_CP145_PACK_BINDING.risk_class, "B");
  assert.equal(AUDIT_COMPLIANCE_CP145_PACK_BINDING.unit_count, 40);
  assert.equal(coveredUnitIds.length, 40);
  assert.equal(catalog.length, 40);
  assert.equal(coveredUnitIds[0], "RP03.P06.M03.S20");
  assert.equal(coveredUnitIds.at(-1), "RP03.P06.M05.S15");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 40,
    first_unit_id: "RP03.P06.M03.S20",
    last_unit_id: "RP03.P06.M05.S15",
  });
});

test("CP00-145 catalog binds permission matrix workflow distributions", () => {
  const readiness = createAuditComplianceCp145PermissionMatrixWorkflowBoundary();

  assert.equal(readiness.covered_unit_count, 40);
  assert.deepEqual(readiness.deliverable_counts, {
    test: 7,
    security_audit: 7,
    implementation: 16,
    ui: 8,
    claude_review: 2,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    permission_primary_test_boundary: 3,
    permission_secondary_workflow_boundary: 22,
    permission_audit_binding_route_boundary: 15,
  });
  assert.equal(readiness.cp144_handoff_inherited, true);
  assert.equal(readiness.cp146_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.permission_primary_test_boundary_declared, true);
  assert.equal(readiness.permission_secondary_workflow_declared, true);
  assert.equal(readiness.permission_audit_binding_route_declared, true);
  assert.equal(readiness.permission_matrix_decision_bindings_declared, true);
  assert.equal(readiness.permission_matrix_boundary_interactions_declared, true);
  assert.equal(readiness.permission_matrix_review_approval_declared, true);
  assert.equal(readiness.permission_matrix_test_boundary_declared, true);
  assert.equal(readiness.permission_matrix_audit_security_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-145 cases keep permission matrix workflow rows no-write and non-executing", () => {
  const deniedTest = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M03.S20.denied_test");
  const crossTenantTest = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M03.S21.cross_tenant_test");
  const leakTest = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M03.S22.leak_prevention_test");
  const permissionMatrix = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S01.permission_matrix_row");
  const exportDecision = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S05.export_download_decision_binding");
  const aiDecision = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S07.ai_retrieval_decision_binding");
  const legalHold = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S11.legal_hold_interaction");
  const reviewRoute = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S14.review_required_route");
  const approvalRoute = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M05.S15.approval_required_route");

  for (const result of [deniedTest, crossTenantTest, leakTest, permissionMatrix, exportDecision, aiDecision, legalHold, reviewRoute, approvalRoute]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.executes_ai_retrieval, false);
    assert.equal(result.executes_analytics_query, false);
    assert.equal(result.evaluates_permission_matrix, false);
    assert.equal(result.evaluates_view_decision, false);
    assert.equal(result.evaluates_search_decision, false);
    assert.equal(result.evaluates_mutation_decision, false);
    assert.equal(result.evaluates_export_download_decision, false);
    assert.equal(result.evaluates_share_decision, false);
    assert.equal(result.evaluates_ai_retrieval_decision, false);
    assert.equal(result.applies_legal_hold, false);
    assert.equal(result.applies_ethical_wall, false);
    assert.equal(result.reads_object_acl, false);
    assert.equal(result.routes_review_required, false);
    assert.equal(result.routes_approval_required, false);
    assert.equal(result.proves_security_trimming, false);
    assert.equal(result.emits_audit_event_expectation, false);
    assert.equal(result.writes_permission_fixture, false);
    assert.equal(result.executes_allowed_test, false);
    assert.equal(result.executes_denied_test, false);
    assert.equal(result.executes_cross_tenant_test, false);
    assert.equal(result.executes_leak_prevention_test, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(deniedTest.domain, "permission_matrix_test_reference");
  assert.equal(crossTenantTest.domain, "permission_matrix_test_reference");
  assert.equal(leakTest.domain, "permission_matrix_test_reference");
  assert.equal(permissionMatrix.domain, "permission_matrix_security_reference");
  assert.equal(exportDecision.domain, "permission_matrix_externalization_reference");
  assert.equal(aiDecision.domain, "permission_matrix_ai_reference");
  assert.equal(legalHold.domain, "permission_matrix_boundary_reference");
  assert.equal(reviewRoute.domain, "permission_matrix_review_approval_reference");
  assert.equal(approvalRoute.domain, "permission_matrix_review_approval_reference");
});

test("CP00-145 manifest evidence review and handoff packets bind H03 C03 and CP00-146", () => {
  const manifest = createAuditComplianceCp145PermissionMatrixWorkflowBoundaryManifest();
  const hermes = createAuditComplianceCp145HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp145ClaudeReviewPacket();
  const handoff = createAuditComplianceCp145CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-145");
  assert.equal(manifest.production_ready_flag, "audit_compliance_permission_matrix_workflow_boundary_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_matrix, false);
  assert.equal(manifest.no_write_attestation.evaluates_export_download_decision, false);
  assert.equal(manifest.no_write_attestation.evaluates_ai_retrieval_decision, false);
  assert.equal(manifest.no_write_attestation.applies_legal_hold, false);
  assert.equal(manifest.no_write_attestation.applies_ethical_wall, false);
  assert.equal(manifest.no_write_attestation.reads_object_acl, false);
  assert.equal(manifest.no_write_attestation.routes_review_required, false);
  assert.equal(manifest.no_write_attestation.routes_approval_required, false);
  assert.equal(manifest.no_write_attestation.executes_denied_test, false);
  assert.equal(manifest.no_write_attestation.executes_cross_tenant_test, false);
  assert.equal(manifest.no_write_attestation.executes_leak_prevention_test, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-145.audit_compliance_permission_matrix_workflow_boundary");
  assert.equal(hermes.covered_units.length, 40);
  assert.equal(claude.review_id, "C03.CP00-145.audit_compliance_permission_matrix_workflow_boundary");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-145");
  assert.equal(handoff.to_pack_id, "CP00-146");
  assert.equal(handoff.next_subphase_id, "RP03.P06.M05.S16");
});

test("CP00-146 Risk A audit permission matrix security fixture boundary catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-146/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-146") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp146CoveredUnitIds();
  const catalog = createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCatalog();
  const coverage = validateAuditComplianceCp146Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 10);
  assert.equal(AUDIT_COMPLIANCE_CP146_PACK_BINDING.risk_class, "A");
  assert.equal(AUDIT_COMPLIANCE_CP146_PACK_BINDING.unit_count, 10);
  assert.equal(coveredUnitIds.length, 10);
  assert.equal(catalog.length, 10);
  assert.equal(coveredUnitIds[0], "RP03.P06.M05.S16");
  assert.equal(coveredUnitIds.at(-1), "RP03.P06.M06.S03");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 10,
    first_unit_id: "RP03.P06.M05.S16",
    last_unit_id: "RP03.P06.M06.S03",
  });
});

test("CP00-146 catalog binds security fixture distributions and modes", () => {
  const readiness = createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundary();

  assert.equal(readiness.covered_unit_count, 10);
  assert.deepEqual(readiness.deliverable_counts, {
    security_audit: 4,
    test: 4,
    implementation: 2,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    permission_audit_security_test_boundary: 7,
    synthetic_fixture_permission_matrix_boundary: 3,
  });
  assert.equal(readiness.cp145_handoff_inherited, true);
  assert.equal(readiness.cp147_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.security_trimming_boundary_declared, true);
  assert.equal(readiness.audit_event_expectation_boundary_declared, true);
  assert.equal(readiness.permission_fixture_boundary_declared, true);
  assert.equal(readiness.allowed_denied_cross_tenant_leak_boundary_declared, true);
  assert.equal(readiness.synthetic_fixture_matrix_row_declared, true);
  assert.equal(readiness.synthetic_fixture_view_search_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-146 cases keep security fixture rows no-write and non-executing", () => {
  const trimming = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S16.security_trimming_proof");
  const auditExpectation = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S17.audit_event_expectation");
  const permissionFixture = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S18.permission_fixture");
  const allowedTest = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S19.allowed_test");
  const deniedTest = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S20.denied_test");
  const crossTenantTest = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S21.cross_tenant_test");
  const leakTest = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S22.leak_prevention_test");
  const permissionMatrix = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M06.S01.permission_matrix_row");
  const viewDecision = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M06.S02.view_decision_binding");
  const searchDecision = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M06.S03.search_decision_binding");

  for (const result of [trimming, auditExpectation, permissionFixture, allowedTest, deniedTest, crossTenantTest, leakTest, permissionMatrix, viewDecision, searchDecision]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.executes_ai_retrieval, false);
    assert.equal(result.executes_analytics_query, false);
    assert.equal(result.evaluates_permission_matrix, false);
    assert.equal(result.evaluates_view_decision, false);
    assert.equal(result.evaluates_search_decision, false);
    assert.equal(result.proves_security_trimming, false);
    assert.equal(result.emits_audit_event_expectation, false);
    assert.equal(result.writes_permission_fixture, false);
    assert.equal(result.executes_allowed_test, false);
    assert.equal(result.executes_denied_test, false);
    assert.equal(result.executes_cross_tenant_test, false);
    assert.equal(result.executes_leak_prevention_test, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(trimming.domain, "permission_matrix_security_trimming_reference");
  assert.equal(auditExpectation.domain, "permission_matrix_audit_event_expectation_reference");
  assert.equal(permissionFixture.domain, "permission_matrix_permission_fixture_reference");
  assert.equal(allowedTest.domain, "permission_matrix_allowed_test_reference");
  assert.equal(deniedTest.domain, "permission_matrix_denied_test_reference");
  assert.equal(crossTenantTest.domain, "permission_matrix_cross_tenant_test_reference");
  assert.equal(leakTest.domain, "permission_matrix_leak_prevention_test_reference");
  assert.equal(permissionMatrix.domain, "synthetic_fixture_permission_matrix_row_reference");
  assert.equal(viewDecision.domain, "synthetic_fixture_view_decision_reference");
  assert.equal(searchDecision.domain, "synthetic_fixture_search_decision_reference");
});

test("CP00-146 manifest evidence review and handoff packets bind H03 C03 and CP00-147", () => {
  const manifest = createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryManifest();
  const hermes = createAuditComplianceCp146HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp146ClaudeReviewPacket();
  const handoff = createAuditComplianceCp146CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-146");
  assert.equal(manifest.production_ready_flag, "audit_compliance_permission_matrix_security_fixture_boundary_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_matrix, false);
  assert.equal(manifest.no_write_attestation.evaluates_view_decision, false);
  assert.equal(manifest.no_write_attestation.evaluates_search_decision, false);
  assert.equal(manifest.no_write_attestation.proves_security_trimming, false);
  assert.equal(manifest.no_write_attestation.emits_audit_event_expectation, false);
  assert.equal(manifest.no_write_attestation.writes_permission_fixture, false);
  assert.equal(manifest.no_write_attestation.executes_allowed_test, false);
  assert.equal(manifest.no_write_attestation.executes_denied_test, false);
  assert.equal(manifest.no_write_attestation.executes_cross_tenant_test, false);
  assert.equal(manifest.no_write_attestation.executes_leak_prevention_test, false);
  assert.equal(manifest.no_write_attestation.loads_fixture_payload, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-146.audit_compliance_permission_matrix_security_fixture_boundary");
  assert.equal(hermes.covered_units.length, 10);
  assert.equal(claude.review_id, "C03.CP00-146.audit_compliance_permission_matrix_security_fixture_boundary");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-146");
  assert.equal(handoff.to_pack_id, "CP00-147");
  assert.equal(handoff.next_subphase_id, "RP03.P06.M06.S04");
});

test("CP00-147 Risk C audit permission matrix failure taxonomy reference catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-147/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-147") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp147CoveredUnitIds();
  const catalog = createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCatalog();
  const coverage = validateAuditComplianceCp147Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP147_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP147_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P06.M06.S04");
  assert.equal(coveredUnitIds.at(-1), "RP03.P07.M03.S14");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P06.M06.S04",
    last_unit_id: "RP03.P07.M03.S14",
  });
});

test("CP00-147 catalog binds permission matrix failure taxonomy distributions and modes", () => {
  const readiness = createAuditComplianceCp147PermissionMatrixFailureTaxonomyReference();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 40,
    security_audit: 26,
    ui: 17,
    claude_review: 4,
    test: 16,
    failure_recovery: 44,
    hermes_evidence: 2,
    fixture: 1,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    synthetic_fixture_permission_matrix_continuation_reference: 19,
    permission_test_golden_case_reference: 22,
    permission_hermes_evidence_packet_reference: 22,
    permission_claude_review_packet_reference: 20,
    permission_closeout_handoff_reference: 11,
    failure_scope_inventory_reference: 11,
    failure_contract_draft_reference: 11,
    failure_type_shape_reference: 20,
    failure_primary_implementation_reference: 14,
  });
  assert.equal(readiness.cp146_handoff_inherited, true);
  assert.equal(readiness.cp148_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.permission_matrix_continuation_declared, true);
  assert.equal(readiness.permission_hermes_packet_declared, true);
  assert.equal(readiness.permission_claude_packet_declared, true);
  assert.equal(readiness.permission_closeout_handoff_declared, true);
  assert.equal(readiness.failure_scope_contract_declared, true);
  assert.equal(readiness.failure_type_shape_declared, true);
  assert.equal(readiness.failure_primary_implementation_declared, true);
  assert.equal(readiness.failure_taxonomy_descriptor_declared, true);
  assert.equal(readiness.failure_recovery_boundary_declared, true);
  assert.equal(readiness.failure_fixture_test_boundary_declared, true);
  assert.equal(readiness.failure_evidence_boundary_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-147 cases keep permission matrix and failure taxonomy rows no-write and non-executing", () => {
  const mutationDecision = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M06.S04.mutation_decision_binding");
  const aiDecision = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M06.S07.ai_retrieval_decision_binding");
  const legalHold = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M06.S11.legal_hold_interaction");
  const reviewRoute = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M07.S14.review_required_route");
  const deniedTest = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M09.S20.denied_test");
  const crossTenantFailure = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M00.S07.cross_tenant_failure");
  const blockedClaimReceipt = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M02.S15.blocked_claim_receipt");
  const failureFixture = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M02.S16.failure_fixture");
  const failureUnitTest = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M02.S17.failure_unit_test");
  const retryExhaustion = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M03.S12.retry_exhaustion_failure");
  const compensation = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M03.S14.compensation_expectation");

  for (const result of [mutationDecision, aiDecision, legalHold, reviewRoute, deniedTest, crossTenantFailure, blockedClaimReceipt, failureFixture, failureUnitTest, retryExhaustion, compensation]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_failure_case_payload, false);
    assert.equal(result.executes_ai_retrieval, false);
    assert.equal(result.executes_analytics_query, false);
    assert.equal(result.evaluates_permission_matrix, false);
    assert.equal(result.evaluates_mutation_decision, false);
    assert.equal(result.evaluates_export_download_decision, false);
    assert.equal(result.evaluates_share_decision, false);
    assert.equal(result.evaluates_ai_retrieval_decision, false);
    assert.equal(result.applies_legal_hold, false);
    assert.equal(result.applies_ethical_wall, false);
    assert.equal(result.reads_object_acl, false);
    assert.equal(result.routes_review_required, false);
    assert.equal(result.routes_approval_required, false);
    assert.equal(result.proves_security_trimming, false);
    assert.equal(result.emits_audit_event_expectation, false);
    assert.equal(result.writes_permission_fixture, false);
    assert.equal(result.executes_allowed_test, false);
    assert.equal(result.executes_denied_test, false);
    assert.equal(result.executes_cross_tenant_test, false);
    assert.equal(result.executes_leak_prevention_test, false);
    assert.equal(result.evaluates_failure_taxonomy, false);
    assert.equal(result.executes_failure_recovery, false);
    assert.equal(result.throws_failure, false);
    assert.equal(result.executes_retry_exhaustion, false);
    assert.equal(result.executes_rollback_expectation, false);
    assert.equal(result.executes_compensation, false);
    assert.equal(result.emits_blocked_claim_receipt, false);
    assert.equal(result.writes_failure_fixture, false);
    assert.equal(result.executes_failure_unit_test, false);
    assert.equal(result.executes_failure_integration_smoke, false);
    assert.equal(result.emits_audit_failure_hint, false);
    assert.equal(result.emits_hermes_failure_evidence, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(mutationDecision.domain, "permission_matrix_decision_reference");
  assert.equal(aiDecision.domain, "permission_matrix_ai_reference");
  assert.equal(legalHold.domain, "permission_matrix_boundary_reference");
  assert.equal(reviewRoute.domain, "permission_matrix_review_approval_reference");
  assert.equal(deniedTest.domain, "permission_matrix_test_reference");
  assert.equal(crossTenantFailure.domain, "failure_taxonomy_tenant_boundary_reference");
  assert.equal(blockedClaimReceipt.domain, "failure_taxonomy_evidence_reference");
  assert.equal(failureFixture.domain, "failure_taxonomy_fixture_test_reference");
  assert.equal(failureUnitTest.domain, "failure_taxonomy_fixture_test_reference");
  assert.equal(retryExhaustion.domain, "failure_taxonomy_recovery_boundary_reference");
  assert.equal(compensation.domain, "failure_taxonomy_recovery_boundary_reference");
});

test("CP00-147 manifest evidence review and handoff packets bind H03 C03 and CP00-148", () => {
  const manifest = createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceManifest();
  const hermes = createAuditComplianceCp147HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp147ClaudeReviewPacket();
  const handoff = createAuditComplianceCp147CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-147");
  assert.equal(manifest.production_ready_flag, "audit_compliance_permission_matrix_failure_taxonomy_reference_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_matrix, false);
  assert.equal(manifest.no_write_attestation.evaluates_mutation_decision, false);
  assert.equal(manifest.no_write_attestation.evaluates_ai_retrieval_decision, false);
  assert.equal(manifest.no_write_attestation.applies_legal_hold, false);
  assert.equal(manifest.no_write_attestation.routes_review_required, false);
  assert.equal(manifest.no_write_attestation.writes_permission_fixture, false);
  assert.equal(manifest.no_write_attestation.executes_denied_test, false);
  assert.equal(manifest.no_write_attestation.evaluates_failure_taxonomy, false);
  assert.equal(manifest.no_write_attestation.executes_failure_recovery, false);
  assert.equal(manifest.no_write_attestation.emits_blocked_claim_receipt, false);
  assert.equal(manifest.no_write_attestation.writes_failure_fixture, false);
  assert.equal(manifest.no_write_attestation.executes_failure_unit_test, false);
  assert.equal(manifest.no_write_attestation.emits_hermes_failure_evidence, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-147.audit_compliance_permission_matrix_failure_taxonomy_reference");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(claude.review_id, "C03.CP00-147.audit_compliance_permission_matrix_failure_taxonomy_reference");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-147");
  assert.equal(handoff.to_pack_id, "CP00-148");
  assert.equal(handoff.next_subphase_id, "RP03.P07.M03.S15");
});

test("CP00-148 Risk A audit failure boundary sensitive catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-148/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-148") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp148CoveredUnitIds();
  const catalog = createAuditComplianceCp148FailureBoundarySensitiveCatalog();
  const coverage = validateAuditComplianceCp148Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 10);
  assert.equal(AUDIT_COMPLIANCE_CP148_PACK_BINDING.risk_class, "A");
  assert.equal(AUDIT_COMPLIANCE_CP148_PACK_BINDING.unit_count, 10);
  assert.equal(coveredUnitIds.length, 10);
  assert.equal(catalog.length, 10);
  assert.equal(coveredUnitIds[0], "RP03.P07.M03.S15");
  assert.equal(coveredUnitIds.at(-1), "RP03.P07.M04.S02");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 10,
    first_unit_id: "RP03.P07.M03.S15",
    last_unit_id: "RP03.P07.M04.S02",
  });
});

test("CP00-148 catalog binds failure boundary sensitive distributions and modes", () => {
  const readiness = createAuditComplianceCp148FailureBoundarySensitive();

  assert.equal(readiness.covered_unit_count, 10);
  assert.deepEqual(readiness.deliverable_counts, {
    hermes_evidence: 2,
    fixture: 1,
    test: 2,
    security_audit: 1,
    claude_review: 1,
    implementation: 1,
    failure_recovery: 2,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    failure_primary_sensitive_boundary: 8,
    failure_secondary_workflow_boundary: 2,
  });
  assert.equal(readiness.cp147_handoff_inherited, true);
  assert.equal(readiness.cp149_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.blocked_claim_receipt_boundary_declared, true);
  assert.equal(readiness.failure_fixture_boundary_declared, true);
  assert.equal(readiness.failure_test_boundary_declared, true);
  assert.equal(readiness.audit_failure_hint_boundary_declared, true);
  assert.equal(readiness.hermes_failure_evidence_boundary_declared, true);
  assert.equal(readiness.claude_edge_case_prompt_boundary_declared, true);
  assert.equal(readiness.human_escalation_note_boundary_declared, true);
  assert.equal(readiness.failure_secondary_workflow_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-148 cases keep sensitive failure boundary rows no-write and non-executing", () => {
  const blockedClaim = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S15.blocked_claim_receipt");
  const failureFixture = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S16.failure_fixture");
  const failureUnitTest = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S17.failure_unit_test");
  const failureSmoke = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S18.failure_integration_smoke");
  const auditHint = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S19.audit_failure_hint");
  const hermesEvidence = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S20.hermes_failure_evidence");
  const claudePrompt = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S21.claude_edge_case_prompt");
  const humanEscalation = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S22.human_escalation_note");
  const failureTaxonomy = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M04.S01.failure_taxonomy");
  const missingTenant = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M04.S02.missing_tenant_failure");

  for (const result of [blockedClaim, failureFixture, failureUnitTest, failureSmoke, auditHint, hermesEvidence, claudePrompt, humanEscalation, failureTaxonomy, missingTenant]) {
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_failure_case_payload, false);
    assert.equal(result.evaluates_failure_taxonomy, false);
    assert.equal(result.executes_failure_recovery, false);
    assert.equal(result.throws_failure, false);
    assert.equal(result.executes_retry_exhaustion, false);
    assert.equal(result.executes_rollback_expectation, false);
    assert.equal(result.executes_compensation, false);
    assert.equal(result.emits_blocked_claim_receipt, false);
    assert.equal(result.writes_failure_fixture, false);
    assert.equal(result.executes_failure_unit_test, false);
    assert.equal(result.executes_failure_integration_smoke, false);
    assert.equal(result.emits_audit_failure_hint, false);
    assert.equal(result.emits_hermes_failure_evidence, false);
    assert.equal(result.materializes_claude_edge_case_prompt, false);
    assert.equal(result.records_human_escalation_note, false);
    assert.equal(result.executes_human_escalation, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }

  assert.equal(blockedClaim.domain, "failure_boundary_blocked_claim_receipt_reference");
  assert.equal(failureFixture.domain, "failure_boundary_fixture_reference");
  assert.equal(failureUnitTest.domain, "failure_boundary_test_reference");
  assert.equal(failureSmoke.domain, "failure_boundary_test_reference");
  assert.equal(auditHint.domain, "failure_boundary_audit_hint_reference");
  assert.equal(hermesEvidence.domain, "failure_boundary_hermes_evidence_reference");
  assert.equal(claudePrompt.domain, "failure_boundary_claude_prompt_reference");
  assert.equal(humanEscalation.domain, "failure_boundary_human_escalation_reference");
  assert.equal(failureTaxonomy.domain, "failure_boundary_taxonomy_reference");
  assert.equal(missingTenant.domain, "failure_boundary_missing_context_reference");
});

test("CP00-148 manifest evidence review and handoff packets bind H03 C03 and CP00-149", () => {
  const manifest = createAuditComplianceCp148FailureBoundarySensitiveManifest();
  const hermes = createAuditComplianceCp148HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp148ClaudeReviewPacket();
  const handoff = createAuditComplianceCp148CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-148");
  assert.equal(manifest.production_ready_flag, "audit_compliance_failure_boundary_sensitive_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.evaluates_failure_taxonomy, false);
  assert.equal(manifest.no_write_attestation.executes_failure_recovery, false);
  assert.equal(manifest.no_write_attestation.emits_blocked_claim_receipt, false);
  assert.equal(manifest.no_write_attestation.writes_failure_fixture, false);
  assert.equal(manifest.no_write_attestation.executes_failure_unit_test, false);
  assert.equal(manifest.no_write_attestation.executes_failure_integration_smoke, false);
  assert.equal(manifest.no_write_attestation.emits_audit_failure_hint, false);
  assert.equal(manifest.no_write_attestation.emits_hermes_failure_evidence, false);
  assert.equal(manifest.no_write_attestation.materializes_claude_edge_case_prompt, false);
  assert.equal(manifest.no_write_attestation.records_human_escalation_note, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-148.audit_compliance_failure_boundary_sensitive");
  assert.equal(hermes.covered_units.length, 10);
  assert.equal(claude.review_id, "C03.CP00-148.audit_compliance_failure_boundary_sensitive");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-148");
  assert.equal(handoff.to_pack_id, "CP00-149");
  assert.equal(handoff.next_subphase_id, "RP03.P07.M04.S03");
});

test("CP00-149 Risk B audit failure workflow continuation catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-149/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-149") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp149CoveredUnitIds();
  const catalog = createAuditComplianceCp149FailureWorkflowContinuationCatalog();
  const coverage = validateAuditComplianceCp149Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 40);
  assert.equal(AUDIT_COMPLIANCE_CP149_PACK_BINDING.risk_class, "B");
  assert.equal(AUDIT_COMPLIANCE_CP149_PACK_BINDING.unit_count, 40);
  assert.equal(coveredUnitIds.length, 40);
  assert.equal(catalog.length, 40);
  assert.equal(coveredUnitIds[0], "RP03.P07.M04.S03");
  assert.equal(coveredUnitIds.at(-1), "RP03.P07.M05.S20");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 40,
    first_unit_id: "RP03.P07.M04.S03",
    last_unit_id: "RP03.P07.M05.S20",
  });
});

test("CP00-149 catalog binds failure workflow distributions and modes", () => {
  const readiness = createAuditComplianceCp149FailureWorkflowContinuation();

  assert.equal(readiness.covered_unit_count, 40);
  assert.deepEqual(readiness.deliverable_counts, {
    failure_recovery: 22,
    security_audit: 4,
    implementation: 3,
    hermes_evidence: 4,
    fixture: 2,
    test: 4,
    claude_review: 1,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    failure_secondary_workflow_continuation: 20,
    permission_audit_failure_binding_continuation: 20,
  });
  assert.equal(readiness.cp148_handoff_inherited, true);
  assert.equal(readiness.cp150_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.failure_secondary_workflow_continuation_declared, true);
  assert.equal(readiness.permission_audit_failure_binding_declared, true);
  assert.equal(readiness.blocked_claim_receipt_boundary_declared, true);
  assert.equal(readiness.failure_fixture_boundary_declared, true);
  assert.equal(readiness.failure_test_boundary_declared, true);
  assert.equal(readiness.audit_failure_hint_boundary_declared, true);
  assert.equal(readiness.hermes_failure_evidence_boundary_declared, true);
  assert.equal(readiness.claude_edge_case_prompt_boundary_declared, true);
  assert.equal(readiness.human_escalation_note_boundary_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-149 cases keep failure workflow rows no-write and non-executing", () => {
  const catalog = createAuditComplianceCp149FailureWorkflowContinuationCatalog();

  for (const row of catalog) {
    const result = runAuditComplianceCp149FailureWorkflowContinuationCase(row.case_id);
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_failure_case_payload, false);
    assert.equal(result.evaluates_failure_taxonomy, false);
    assert.equal(result.evaluates_permission_audit_binding, false);
    assert.equal(result.executes_failure_recovery, false);
    assert.equal(result.throws_failure, false);
    assert.equal(result.executes_retry_exhaustion, false);
    assert.equal(result.executes_rollback_expectation, false);
    assert.equal(result.executes_compensation, false);
    assert.equal(result.emits_blocked_claim_receipt, false);
    assert.equal(result.writes_failure_fixture, false);
    assert.equal(result.executes_failure_unit_test, false);
    assert.equal(result.executes_failure_integration_smoke, false);
    assert.equal(result.emits_audit_failure_hint, false);
    assert.equal(result.emits_hermes_failure_evidence, false);
    assert.equal(result.materializes_claude_edge_case_prompt, false);
    assert.equal(result.records_human_escalation_note, false);
    assert.equal(result.executes_human_escalation, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }
});

test("CP00-149 manifest evidence review and handoff packets bind H03 C03 and CP00-150", () => {
  const manifest = createAuditComplianceCp149FailureWorkflowContinuationManifest();
  const hermes = createAuditComplianceCp149HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp149ClaudeReviewPacket();
  const handoff = createAuditComplianceCp149CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-149");
  assert.equal(manifest.production_ready_flag, "audit_compliance_failure_workflow_continuation_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.evaluates_failure_taxonomy, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_audit_binding, false);
  assert.equal(manifest.no_write_attestation.executes_failure_recovery, false);
  assert.equal(manifest.no_write_attestation.emits_blocked_claim_receipt, false);
  assert.equal(manifest.no_write_attestation.writes_failure_fixture, false);
  assert.equal(manifest.no_write_attestation.executes_failure_unit_test, false);
  assert.equal(manifest.no_write_attestation.executes_failure_integration_smoke, false);
  assert.equal(manifest.no_write_attestation.emits_audit_failure_hint, false);
  assert.equal(manifest.no_write_attestation.emits_hermes_failure_evidence, false);
  assert.equal(manifest.no_write_attestation.materializes_claude_edge_case_prompt, false);
  assert.equal(manifest.no_write_attestation.records_human_escalation_note, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-149.audit_compliance_failure_workflow_continuation");
  assert.equal(hermes.covered_units.length, 40);
  assert.equal(claude.review_id, "C03.CP00-149.audit_compliance_failure_workflow_continuation");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-149");
  assert.equal(handoff.to_pack_id, "CP00-150");
  assert.equal(handoff.next_subphase_id, "RP03.P07.M05.S21");
});

test("CP00-150 Risk A audit failure fixture sensitive boundary catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-150/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-150") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp150CoveredUnitIds();
  const catalog = createAuditComplianceCp150FailureFixtureSensitiveBoundaryCatalog();
  const coverage = validateAuditComplianceCp150Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 10);
  assert.equal(AUDIT_COMPLIANCE_CP150_PACK_BINDING.risk_class, "A");
  assert.equal(AUDIT_COMPLIANCE_CP150_PACK_BINDING.unit_count, 10);
  assert.equal(coveredUnitIds.length, 10);
  assert.equal(catalog.length, 10);
  assert.equal(coveredUnitIds[0], "RP03.P07.M05.S21");
  assert.equal(coveredUnitIds.at(-1), "RP03.P07.M06.S08");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 10,
    first_unit_id: "RP03.P07.M05.S21",
    last_unit_id: "RP03.P07.M06.S08",
  });
});

test("CP00-150 catalog binds sensitive fixture distributions and modes", () => {
  const readiness = createAuditComplianceCp150FailureFixtureSensitiveBoundary();

  assert.equal(readiness.covered_unit_count, 10);
  assert.deepEqual(readiness.deliverable_counts, {
    claude_review: 1,
    implementation: 1,
    failure_recovery: 7,
    security_audit: 1,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    permission_audit_sensitive_terminal_boundary: 2,
    synthetic_fixture_failure_opening_boundary: 8,
  });
  assert.equal(readiness.cp149_handoff_inherited, true);
  assert.equal(readiness.cp151_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.permission_audit_sensitive_terminal_declared, true);
  assert.equal(readiness.synthetic_fixture_failure_opening_declared, true);
  assert.equal(readiness.sensitive_failure_taxonomy_boundary_declared, true);
  assert.equal(readiness.missing_context_failure_boundaries_declared, true);
  assert.equal(readiness.cross_tenant_permission_denied_boundaries_declared, true);
  assert.equal(readiness.fixture_payload_non_materialization_declared, true);
  assert.equal(readiness.claude_edge_case_prompt_boundary_declared, true);
  assert.equal(readiness.human_escalation_note_boundary_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-150 cases keep sensitive fixture rows no-write and non-executing", () => {
  const catalog = createAuditComplianceCp150FailureFixtureSensitiveBoundaryCatalog();

  for (const row of catalog) {
    const result = runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase(row.case_id);
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_failure_case_payload, false);
    assert.equal(result.evaluates_failure_taxonomy, false);
    assert.equal(result.evaluates_permission_audit_binding, false);
    assert.equal(result.executes_failure_recovery, false);
    assert.equal(result.throws_failure, false);
    assert.equal(result.executes_retry_exhaustion, false);
    assert.equal(result.executes_rollback_expectation, false);
    assert.equal(result.executes_compensation, false);
    assert.equal(result.emits_blocked_claim_receipt, false);
    assert.equal(result.writes_failure_fixture, false);
    assert.equal(result.executes_failure_unit_test, false);
    assert.equal(result.executes_failure_integration_smoke, false);
    assert.equal(result.emits_audit_failure_hint, false);
    assert.equal(result.emits_hermes_failure_evidence, false);
    assert.equal(result.materializes_claude_edge_case_prompt, false);
    assert.equal(result.records_human_escalation_note, false);
    assert.equal(result.executes_human_escalation, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }
});

test("CP00-150 manifest evidence review and handoff packets bind H03 C03 and CP00-151", () => {
  const manifest = createAuditComplianceCp150FailureFixtureSensitiveBoundaryManifest();
  const hermes = createAuditComplianceCp150HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp150ClaudeReviewPacket();
  const handoff = createAuditComplianceCp150CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-150");
  assert.equal(manifest.production_ready_flag, "audit_compliance_failure_fixture_sensitive_boundary_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.loads_fixture_payload, false);
  assert.equal(manifest.no_write_attestation.materializes_fixture_manifest, false);
  assert.equal(manifest.no_write_attestation.materializes_failure_case_payload, false);
  assert.equal(manifest.no_write_attestation.evaluates_failure_taxonomy, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_audit_binding, false);
  assert.equal(manifest.no_write_attestation.executes_failure_recovery, false);
  assert.equal(manifest.no_write_attestation.materializes_claude_edge_case_prompt, false);
  assert.equal(manifest.no_write_attestation.records_human_escalation_note, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-150.audit_compliance_failure_fixture_sensitive_boundary");
  assert.equal(hermes.covered_units.length, 10);
  assert.equal(claude.review_id, "C03.CP00-150.audit_compliance_failure_fixture_sensitive_boundary");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-150");
  assert.equal(handoff.to_pack_id, "CP00-151");
  assert.equal(handoff.next_subphase_id, "RP03.P07.M06.S09");
});

test("CP00-151 Risk C audit failure evidence continuation catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-151/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-151") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp151CoveredUnitIds();
  const catalog = createAuditComplianceCp151FailureEvidenceContinuationCatalog();
  const coverage = validateAuditComplianceCp151Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP151_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP151_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P07.M06.S09");
  assert.equal(coveredUnitIds.at(-1), "RP03.P08.M04.S19");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P07.M06.S09",
    last_unit_id: "RP03.P08.M04.S19",
  });
});

test("CP00-151 catalog binds failure continuation and Hermes evidence distributions", () => {
  const readiness = createAuditComplianceCp151FailureEvidenceContinuation();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    failure_recovery: 51,
    implementation: 24,
    hermes_evidence: 48,
    fixture: 4,
    test: 10,
    security_audit: 8,
    claude_review: 5,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    synthetic_fixture_failure_continuation_reference: 14,
    failure_test_golden_case_reference: 22,
    failure_hermes_evidence_packet_reference: 22,
    failure_claude_review_packet_reference: 20,
    failure_closeout_handoff_reference: 11,
    evidence_scope_inventory_reference: 4,
    evidence_contract_draft_reference: 8,
    evidence_type_shape_reference: 8,
    evidence_primary_implementation_reference: 22,
    evidence_secondary_workflow_reference: 19,
  });
  assert.equal(readiness.cp150_handoff_inherited, true);
  assert.equal(readiness.cp152_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.failure_continuation_declared, true);
  assert.equal(readiness.failure_review_closeout_declared, true);
  assert.equal(readiness.hermes_evidence_scope_contract_declared, true);
  assert.equal(readiness.hermes_evidence_primary_secondary_declared, true);
  assert.equal(readiness.failure_taxonomy_descriptor_declared, true);
  assert.equal(readiness.failure_fixture_test_boundary_declared, true);
  assert.equal(readiness.failure_evidence_receipt_boundary_declared, true);
  assert.equal(readiness.verdict_semantics_declared, true);
  assert.equal(readiness.claude_and_human_marker_boundaries_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-151 cases keep failure evidence rows no-write and non-executing", () => {
  const catalog = createAuditComplianceCp151FailureEvidenceContinuationCatalog();

  for (const row of catalog) {
    const result = runAuditComplianceCp151FailureEvidenceContinuationCase(row.case_id);
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.executes_hermes_command, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_failure_case_payload, false);
    assert.equal(result.materializes_evidence_template, false);
    assert.equal(result.materializes_claude_edge_case_prompt, false);
    assert.equal(result.records_human_escalation_note, false);
    assert.equal(result.records_human_approval_marker, false);
    assert.equal(result.evaluates_failure_taxonomy, false);
    assert.equal(result.evaluates_permission_audit_binding, false);
    assert.equal(result.executes_failure_recovery, false);
    assert.equal(result.throws_failure, false);
    assert.equal(result.executes_retry_exhaustion, false);
    assert.equal(result.executes_rollback_expectation, false);
    assert.equal(result.executes_compensation, false);
    assert.equal(result.emits_blocked_claim_receipt, false);
    assert.equal(result.emits_audit_failure_hint, false);
    assert.equal(result.emits_hermes_failure_evidence, false);
    assert.equal(result.emits_command_result_receipt, false);
    assert.equal(result.emits_changed_file_receipt, false);
    assert.equal(result.emits_fixture_summary_receipt, false);
    assert.equal(result.emits_permission_summary_receipt, false);
    assert.equal(result.emits_audit_summary_receipt, false);
    assert.equal(result.emits_no_real_data_receipt, false);
    assert.equal(result.writes_failure_fixture, false);
    assert.equal(result.executes_failure_unit_test, false);
    assert.equal(result.executes_failure_integration_smoke, false);
    assert.equal(result.executes_regression_receipt, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }
});

test("CP00-151 manifest evidence review and handoff packets bind H03 C03 and CP00-152", () => {
  const manifest = createAuditComplianceCp151FailureEvidenceContinuationManifest();
  const hermes = createAuditComplianceCp151HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp151ClaudeReviewPacket();
  const handoff = createAuditComplianceCp151CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-151");
  assert.equal(manifest.production_ready_flag, "audit_compliance_failure_evidence_continuation_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.executes_hermes_command, false);
  assert.equal(manifest.no_write_attestation.loads_fixture_payload, false);
  assert.equal(manifest.no_write_attestation.materializes_evidence_template, false);
  assert.equal(manifest.no_write_attestation.evaluates_failure_taxonomy, false);
  assert.equal(manifest.no_write_attestation.executes_failure_recovery, false);
  assert.equal(manifest.no_write_attestation.emits_blocked_claim_receipt, false);
  assert.equal(manifest.no_write_attestation.emits_hermes_failure_evidence, false);
  assert.equal(manifest.no_write_attestation.emits_command_result_receipt, false);
  assert.equal(manifest.no_write_attestation.materializes_claude_edge_case_prompt, false);
  assert.equal(manifest.no_write_attestation.records_human_approval_marker, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-151.audit_compliance_failure_evidence_continuation");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(claude.review_id, "C03.CP00-151.audit_compliance_failure_evidence_continuation");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-151");
  assert.equal(handoff.to_pack_id, "CP00-152");
  assert.equal(handoff.next_subphase_id, "RP03.P08.M04.S20");
});

test("CP00-152 Risk B audit evidence workflow fixture catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-152/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-152") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp152CoveredUnitIds();
  const catalog = createAuditComplianceCp152EvidenceWorkflowFixtureCatalog();
  const coverage = validateAuditComplianceCp152Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 40);
  assert.equal(AUDIT_COMPLIANCE_CP152_PACK_BINDING.risk_class, "B");
  assert.equal(AUDIT_COMPLIANCE_CP152_PACK_BINDING.unit_count, 40);
  assert.equal(coveredUnitIds.length, 40);
  assert.equal(catalog.length, 40);
  assert.equal(coveredUnitIds[0], "RP03.P08.M04.S20");
  assert.equal(coveredUnitIds.at(-1), "RP03.P08.M06.S17");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 40,
    first_unit_id: "RP03.P08.M04.S20",
    last_unit_id: "RP03.P08.M06.S17",
  });
});

test("CP00-152 catalog binds evidence workflow and fixture distributions", () => {
  const readiness = createAuditComplianceCp152EvidenceWorkflowFixture();

  assert.equal(readiness.covered_unit_count, 40);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 17,
    hermes_evidence: 20,
    claude_review: 2,
    test: 1,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    evidence_secondary_workflow_terminal_reference: 1,
    evidence_permission_audit_binding_reference: 22,
    evidence_synthetic_fixture_opening_reference: 17,
  });
  assert.equal(readiness.cp151_handoff_inherited, true);
  assert.equal(readiness.cp153_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.secondary_workflow_terminal_declared, true);
  assert.equal(readiness.permission_audit_binding_declared, true);
  assert.equal(readiness.synthetic_fixture_opening_declared, true);
  assert.equal(readiness.hermes_evidence_receipt_boundary_declared, true);
  assert.equal(readiness.verdict_semantics_declared, true);
  assert.equal(readiness.validation_and_regression_boundaries_declared, true);
  assert.equal(readiness.claude_and_human_marker_boundaries_declared, true);
  assert.equal(readiness.no_fixture_materialization_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-152 cases keep evidence workflow fixture rows no-write and non-executing", () => {
  const catalog = createAuditComplianceCp152EvidenceWorkflowFixtureCatalog();

  for (const row of catalog) {
    const result = runAuditComplianceCp152EvidenceWorkflowFixtureCase(row.case_id);
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.risk_b_evidence_workflow_fixture, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.executes_hermes_command, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.reads_fixture_document_body, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_evidence_template, false);
    assert.equal(result.records_human_approval_marker, false);
    assert.equal(result.evaluates_permission_audit_binding, false);
    assert.equal(result.emits_command_result_receipt, false);
    assert.equal(result.emits_changed_file_receipt, false);
    assert.equal(result.emits_fixture_summary_receipt, false);
    assert.equal(result.emits_permission_summary_receipt, false);
    assert.equal(result.emits_audit_summary_receipt, false);
    assert.equal(result.emits_no_real_data_receipt, false);
    assert.equal(result.executes_regression_receipt, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }
});

test("CP00-152 manifest evidence review and handoff packets bind H03 C03 and CP00-153", () => {
  const manifest = createAuditComplianceCp152EvidenceWorkflowFixtureManifest();
  const hermes = createAuditComplianceCp152HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp152ClaudeReviewPacket();
  const handoff = createAuditComplianceCp152CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-152");
  assert.equal(manifest.production_ready_flag, "audit_compliance_evidence_workflow_fixture_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.executes_hermes_command, false);
  assert.equal(manifest.no_write_attestation.loads_fixture_payload, false);
  assert.equal(manifest.no_write_attestation.materializes_evidence_template, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_audit_binding, false);
  assert.equal(manifest.no_write_attestation.emits_command_result_receipt, false);
  assert.equal(manifest.no_write_attestation.records_human_approval_marker, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-152.audit_compliance_evidence_workflow_fixture");
  assert.equal(hermes.covered_units.length, 40);
  assert.equal(claude.review_id, "C03.CP00-152.audit_compliance_evidence_workflow_fixture");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-152");
  assert.equal(handoff.to_pack_id, "CP00-153");
  assert.equal(handoff.next_subphase_id, "RP03.P08.M06.S18");
});

test("CP00-153 Risk C audit review closeout continuation catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-153/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-153") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp153CoveredUnitIds();
  const catalog = createAuditComplianceCp153ReviewCloseoutContinuationCatalog();
  const coverage = validateAuditComplianceCp153Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 150);
  assert.equal(AUDIT_COMPLIANCE_CP153_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP153_PACK_BINDING.unit_count, 150);
  assert.equal(coveredUnitIds.length, 150);
  assert.equal(catalog.length, 150);
  assert.equal(coveredUnitIds[0], "RP03.P08.M06.S18");
  assert.equal(coveredUnitIds.at(-1), "RP03.P09.M07.S02");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 150,
    first_unit_id: "RP03.P08.M06.S18",
    last_unit_id: "RP03.P09.M07.S02",
  });
});

test("CP00-153 catalog binds evidence terminal and review closeout distributions", () => {
  const readiness = createAuditComplianceCp153ReviewCloseoutContinuation();

  assert.equal(readiness.covered_unit_count, 150);
  assert.deepEqual(readiness.deliverable_counts, {
    implementation: 63,
    test: 9,
    hermes_evidence: 38,
    claude_review: 21,
    security_audit: 14,
    ui: 5,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    evidence_synthetic_fixture_terminal_reference: 3,
    evidence_test_golden_case_reference: 22,
    evidence_hermes_packet_reference: 20,
    evidence_claude_review_packet_reference: 20,
    evidence_closeout_handoff_reference: 8,
    review_scope_inventory_reference: 4,
    review_contract_draft_reference: 4,
    review_type_shape_reference: 8,
    review_primary_implementation_reference: 20,
    review_secondary_workflow_reference: 11,
    review_permission_audit_binding_reference: 20,
    review_synthetic_fixture_reference: 8,
    review_test_golden_case_opening_reference: 2,
  });
  assert.equal(readiness.cp152_handoff_inherited, true);
  assert.equal(readiness.cp154_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.p08_evidence_terminal_declared, true);
  assert.equal(readiness.p09_review_question_opening_declared, true);
  assert.equal(readiness.deliverable_distribution_declared, true);
  assert.equal(readiness.review_question_boundaries_declared, true);
  assert.equal(readiness.closeout_verdict_boundaries_declared, true);
  assert.equal(readiness.no_review_or_evidence_execution_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-153 cases keep evidence and review closeout rows no-write and non-executing", () => {
  const catalog = createAuditComplianceCp153ReviewCloseoutContinuationCatalog();

  for (const row of catalog) {
    const result = runAuditComplianceCp153ReviewCloseoutContinuationCase(row.case_id);
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.risk_c_review_closeout_continuation, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_architecture_review, false);
    assert.equal(result.executes_security_review, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.executes_hermes_command, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_evidence_template, false);
    assert.equal(result.materializes_review_packet, false);
    assert.equal(result.materializes_closeout_verdict, false);
    assert.equal(result.evaluates_permission_bypass, false);
    assert.equal(result.evaluates_audit_completeness, false);
    assert.equal(result.emits_hermes_evidence, false);
    assert.equal(result.emits_command_result_receipt, false);
    assert.equal(result.emits_changed_file_receipt, false);
    assert.equal(result.emits_permission_summary_receipt, false);
    assert.equal(result.emits_audit_summary_receipt, false);
    assert.equal(result.exposes_ui_leak, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }
});

test("CP00-153 manifest evidence review and handoff packets bind H03 C03 and CP00-154", () => {
  const manifest = createAuditComplianceCp153ReviewCloseoutContinuationManifest();
  const hermes = createAuditComplianceCp153HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp153ClaudeReviewPacket();
  const handoff = createAuditComplianceCp153CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-153");
  assert.equal(manifest.production_ready_flag, "audit_compliance_review_closeout_continuation_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.executes_hermes_command, false);
  assert.equal(manifest.no_write_attestation.executes_architecture_review, false);
  assert.equal(manifest.no_write_attestation.executes_security_review, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_bypass, false);
  assert.equal(manifest.no_write_attestation.evaluates_audit_completeness, false);
  assert.equal(manifest.no_write_attestation.materializes_review_packet, false);
  assert.equal(manifest.no_write_attestation.materializes_closeout_verdict, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-153.audit_compliance_review_closeout_continuation");
  assert.equal(hermes.covered_units.length, 150);
  assert.equal(claude.review_id, "C03.CP00-153.audit_compliance_review_closeout_continuation");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-153");
  assert.equal(handoff.to_pack_id, "CP00-154");
  assert.equal(handoff.next_subphase_id, "RP03.P09.M07.S03");
});

test("CP00-154 Risk A audit review sensitive boundary catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-154/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-154") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp154CoveredUnitIds();
  const catalog = createAuditComplianceCp154ReviewSensitiveBoundaryCatalog();
  const coverage = validateAuditComplianceCp154Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 10);
  assert.equal(AUDIT_COMPLIANCE_CP154_PACK_BINDING.risk_class, "A");
  assert.equal(AUDIT_COMPLIANCE_CP154_PACK_BINDING.unit_count, 10);
  assert.equal(coveredUnitIds.length, 10);
  assert.equal(catalog.length, 10);
  assert.equal(coveredUnitIds[0], "RP03.P09.M07.S03");
  assert.equal(coveredUnitIds.at(-1), "RP03.P09.M07.S12");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 10,
    first_unit_id: "RP03.P09.M07.S03",
    last_unit_id: "RP03.P09.M07.S12",
  });
});

test("CP00-154 catalog binds sensitive review distributions", () => {
  const readiness = createAuditComplianceCp154ReviewSensitiveBoundary();

  assert.equal(readiness.covered_unit_count, 10);
  assert.deepEqual(readiness.deliverable_counts, {
    security_audit: 2,
    test: 1,
    ui: 1,
    implementation: 6,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    review_test_golden_case_sensitive_boundary: 10,
  });
  assert.equal(readiness.cp153_handoff_inherited, true);
  assert.equal(readiness.cp155_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.sensitive_question_boundaries_declared, true);
  assert.equal(readiness.risk_verdict_routing_boundaries_declared, true);
  assert.equal(readiness.deliverable_distribution_declared, true);
  assert.equal(readiness.domain_distribution_declared, true);
  assert.equal(readiness.no_review_or_sensitive_execution_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-154 cases keep review-sensitive rows no-write and non-executing", () => {
  const catalog = createAuditComplianceCp154ReviewSensitiveBoundaryCatalog();

  for (const row of catalog) {
    const result = runAuditComplianceCp154ReviewSensitiveBoundaryCase(row.case_id);
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.risk_a_review_sensitive_boundary, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_architecture_review, false);
    assert.equal(result.executes_security_review, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.executes_hermes_command, false);
    assert.equal(result.loads_fixture_payload, false);
    assert.equal(result.materializes_fixture_manifest, false);
    assert.equal(result.materializes_evidence_template, false);
    assert.equal(result.materializes_review_packet, false);
    assert.equal(result.materializes_closeout_verdict, false);
    assert.equal(result.evaluates_permission_bypass, false);
    assert.equal(result.evaluates_audit_completeness, false);
    assert.equal(result.evaluates_missing_test_gap, false);
    assert.equal(result.evaluates_ui_leak, false);
    assert.equal(result.evaluates_downstream_readiness, false);
    assert.equal(result.materializes_risk_register, false);
    assert.equal(result.materializes_severity_taxonomy, false);
    assert.equal(result.materializes_go_no_go_verdict, false);
    assert.equal(result.materializes_finding_routing_map, false);
    assert.equal(result.materializes_human_approval_summary, false);
    assert.equal(result.emits_hermes_evidence, false);
    assert.equal(result.exposes_ui_leak, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }
});

test("CP00-154 manifest evidence review and handoff packets bind H03 C03 and CP00-155", () => {
  const manifest = createAuditComplianceCp154ReviewSensitiveBoundaryManifest();
  const hermes = createAuditComplianceCp154HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp154ClaudeReviewPacket();
  const handoff = createAuditComplianceCp154CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-154");
  assert.equal(manifest.production_ready_flag, "audit_compliance_review_sensitive_boundary_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.executes_hermes_command, false);
  assert.equal(manifest.no_write_attestation.executes_architecture_review, false);
  assert.equal(manifest.no_write_attestation.executes_security_review, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_bypass, false);
  assert.equal(manifest.no_write_attestation.evaluates_audit_completeness, false);
  assert.equal(manifest.no_write_attestation.evaluates_missing_test_gap, false);
  assert.equal(manifest.no_write_attestation.evaluates_ui_leak, false);
  assert.equal(manifest.no_write_attestation.materializes_risk_register, false);
  assert.equal(manifest.no_write_attestation.materializes_go_no_go_verdict, false);
  assert.equal(manifest.no_write_attestation.materializes_finding_routing_map, false);
  assert.equal(manifest.no_write_attestation.materializes_human_approval_summary, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-154.audit_compliance_review_sensitive_boundary");
  assert.equal(hermes.covered_units.length, 10);
  assert.equal(claude.review_id, "C03.CP00-154.audit_compliance_review_sensitive_boundary");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-154");
  assert.equal(handoff.to_pack_id, "CP00-155");
  assert.equal(handoff.next_subphase_id, "RP03.P09.M07.S13");
});

test("CP00-155 Risk C audit review terminal closeout catalog covers the planned units", () => {
  const plan = JSON.parse(readFileSync(new URL("../../../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(new URL("../../../docs/closeout-packs/cp00-155/manifest.json", import.meta.url), "utf8"));
  } catch {
    manifest = null;
  }
  const plannedPack = plan.packs.find((pack) => pack.pack_id === "CP00-155") ?? manifest?.plan_binding_snapshot;
  const coveredUnitIds = createAuditComplianceCp155CoveredUnitIds();
  const catalog = createAuditComplianceCp155ReviewTerminalCloseoutCatalog();
  const coverage = validateAuditComplianceCp155Coverage(plannedPack);

  assert.ok(plannedPack);
  assert.equal(plannedPack.included_units.length, 28);
  assert.equal(AUDIT_COMPLIANCE_CP155_PACK_BINDING.risk_class, "C");
  assert.equal(AUDIT_COMPLIANCE_CP155_PACK_BINDING.unit_count, 28);
  assert.equal(coveredUnitIds.length, 28);
  assert.equal(catalog.length, 28);
  assert.equal(coveredUnitIds[0], "RP03.P09.M07.S13");
  assert.equal(coveredUnitIds.at(-1), "RP03.P09.M10.S04");
  assert.deepEqual(coverage, {
    ok: true,
    errors: [],
    covered_unit_count: 28,
    first_unit_id: "RP03.P09.M07.S13",
    last_unit_id: "RP03.P09.M10.S04",
  });
});

test("CP00-155 catalog binds review terminal closeout distributions", () => {
  const readiness = createAuditComplianceCp155ReviewTerminalCloseout();

  assert.equal(readiness.covered_unit_count, 28);
  assert.deepEqual(readiness.deliverable_counts, {
    claude_review: 7,
    implementation: 11,
    security_audit: 6,
    test: 2,
    ui: 2,
  });
  assert.deepEqual(readiness.evidence_mode_counts, {
    review_test_golden_case_terminal_closeout: 8,
    review_hermes_evidence_packet_terminal: 8,
    review_claude_review_packet_terminal: 8,
    review_closeout_next_handoff_terminal: 4,
  });
  assert.equal(readiness.cp154_handoff_inherited, true);
  assert.equal(readiness.cp156_handoff_declared, true);
  assert.equal(readiness.h03_gate_bound, true);
  assert.equal(readiness.c03_gate_bound, true);
  assert.equal(readiness.terminal_closeout_rows_declared, true);
  assert.equal(readiness.terminal_review_questions_declared, true);
  assert.equal(readiness.evidence_mode_distribution_declared, true);
  assert.equal(readiness.deliverable_distribution_declared, true);
  assert.equal(readiness.no_review_or_terminal_execution_declared, true);
  assert.equal(readiness.hidden_field_policy_declared, true);
});

test("CP00-155 cases keep review terminal closeout rows no-write and non-executing", () => {
  const catalog = createAuditComplianceCp155ReviewTerminalCloseoutCatalog();

  for (const row of catalog) {
    const result = runAuditComplianceCp155ReviewTerminalCloseoutCase(row.case_id);
    assert.equal(result.synthetic_only, true);
    assert.equal(result.no_real_data, true);
    assert.equal(result.risk_c_review_terminal_closeout, true);
    assert.equal(result.writes_product_state, false);
    assert.equal(result.appends_audit_event, false);
    assert.equal(result.writes_audit_event, false);
    assert.equal(result.executes_permission_decision, false);
    assert.equal(result.executes_tenant_boundary_check, false);
    assert.equal(result.executes_matter_trace_check, false);
    assert.equal(result.executes_audit_hint_check, false);
    assert.equal(result.executes_audit_query, false);
    assert.equal(result.executes_compliance_export, false);
    assert.equal(result.executes_api_handler, false);
    assert.equal(result.issues_network_request, false);
    assert.equal(result.renders_ui, false);
    assert.equal(result.mutates_dom, false);
    assert.equal(result.executes_ui_interaction, false);
    assert.equal(result.executes_architecture_review, false);
    assert.equal(result.executes_security_review, false);
    assert.equal(result.executes_claude_review, false);
    assert.equal(result.sends_claude_prompt, false);
    assert.equal(result.writes_hermes_runtime, false);
    assert.equal(result.executes_hermes_command, false);
    assert.equal(result.materializes_evidence_template, false);
    assert.equal(result.materializes_review_packet, false);
    assert.equal(result.materializes_closeout_verdict, false);
    assert.equal(result.evaluates_permission_bypass, false);
    assert.equal(result.evaluates_audit_completeness, false);
    assert.equal(result.evaluates_missing_test_gap, false);
    assert.equal(result.evaluates_ui_leak, false);
    assert.equal(result.evaluates_downstream_readiness, false);
    assert.equal(result.materializes_risk_register, false);
    assert.equal(result.materializes_closeout_criteria, false);
    assert.equal(result.materializes_pass_closeout_note, false);
    assert.equal(result.materializes_pass_with_findings_closeout_note, false);
    assert.equal(result.materializes_block_closeout_note, false);
    assert.equal(result.materializes_next_rp_dependency, false);
    assert.equal(result.materializes_documentation_update, false);
    assert.equal(result.executes_command_rerun, false);
    assert.equal(result.emits_hermes_evidence, false);
    assert.equal(result.exposes_ui_leak, false);
    assert.equal(result.implements_ldip, false);
    assert.equal(result.splits_hrx_product, false);
    assert.equal(result.unauthorized_count_exposed, false);
    assert.equal(result.unauthorized_object_name_exposed, false);
    assert.equal(result.hidden_field_names_exposed, false);
  }
});

test("CP00-155 manifest evidence review and handoff packets bind H03 C03 and CP00-156", () => {
  const manifest = createAuditComplianceCp155ReviewTerminalCloseoutManifest();
  const hermes = createAuditComplianceCp155HermesEvidencePacket(["npm run rp03:audit:validate"]);
  const claude = createAuditComplianceCp155ClaudeReviewPacket();
  const handoff = createAuditComplianceCp155CloseoutHandoff();

  assert.equal(manifest.pack_binding.pack_id, "CP00-155");
  assert.equal(manifest.production_ready_flag, "audit_compliance_review_terminal_closeout_verified");
  assert.equal(manifest.no_write_attestation.appends_audit_event, false);
  assert.equal(manifest.no_write_attestation.executes_hermes_command, false);
  assert.equal(manifest.no_write_attestation.executes_claude_review, false);
  assert.equal(manifest.no_write_attestation.evaluates_permission_bypass, false);
  assert.equal(manifest.no_write_attestation.evaluates_audit_completeness, false);
  assert.equal(manifest.no_write_attestation.materializes_review_packet, false);
  assert.equal(manifest.no_write_attestation.materializes_closeout_verdict, false);
  assert.equal(manifest.no_write_attestation.materializes_next_rp_dependency, false);
  assert.equal(manifest.no_write_attestation.executes_command_rerun, false);
  assert.equal(manifest.no_write_attestation.sends_claude_prompt, false);
  assert.equal(hermes.evidence_id, "H03.CP00-155.audit_compliance_review_terminal_closeout");
  assert.equal(hermes.covered_units.length, 28);
  assert.equal(claude.review_id, "C03.CP00-155.audit_compliance_review_terminal_closeout");
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.read_only, true);
  assert.equal(claude.executes_review, false);
  assert.equal(claude.sends_claude_prompt, false);
  assert.equal(handoff.from_pack_id, "CP00-155");
  assert.equal(handoff.to_pack_id, "CP00-156");
  assert.equal(handoff.next_subphase_id, "RP04.P00.M00.S01");
});
