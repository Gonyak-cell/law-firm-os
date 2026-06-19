import assert from "node:assert/strict";
import test from "node:test";
import {
  createPermissionKernelCp108ClaudeReviewPacket,
  createPermissionKernelCp108CloseoutHandoff,
  createPermissionKernelCp108FoundationCatalog,
  createPermissionKernelCp108FoundationManifest,
  createPermissionKernelCp108HermesEvidencePacket,
  createPermissionKernelCp109ClaudeReviewPacket,
  createPermissionKernelCp109CloseoutHandoff,
  createPermissionKernelCp109HermesEvidencePacket,
  createPermissionKernelCp109ModelServiceCatalog,
  createPermissionKernelCp109ModelServiceManifest,
  createPermissionKernelCp109ServicePrecheck,
  createPermissionKernelCp110ClaudeReviewPacket,
  createPermissionKernelCp110CloseoutHandoff,
  createPermissionKernelCp110HermesEvidencePacket,
  createPermissionKernelCp110ServiceWorkflowCatalog,
  createPermissionKernelCp110ServiceWorkflowManifest,
  createPermissionKernelCp111ClaudeReviewPacket,
  createPermissionKernelCp111CloseoutHandoff,
  createPermissionKernelCp111HermesEvidencePacket,
  createPermissionKernelCp111SyntheticFixtureBoundaryCatalog,
  createPermissionKernelCp111SyntheticFixtureBoundaryManifest,
  createPermissionKernelCp111SyntheticFixtureBoundaryMatrix,
  createPermissionKernelCp112ApiInterfaceFixture,
  createPermissionKernelCp112ClaudeReviewPacket,
  createPermissionKernelCp112CloseoutHandoff,
  createPermissionKernelCp112HermesEvidencePacket,
  createPermissionKernelCp112InterfaceCloseoutCatalog,
  createPermissionKernelCp112InterfaceCloseoutManifest,
  createPermissionKernelCp112TerminalFixtureMatrix,
  createPermissionKernelCp113ApiPermissionAuditBindingCatalog,
  createPermissionKernelCp113ApiPermissionAuditBindingFixture,
  createPermissionKernelCp113ApiPermissionAuditBindingFixtureMatrix,
  createPermissionKernelCp113ApiPermissionAuditBindingManifest,
  createPermissionKernelCp113ClaudeReviewPacket,
  createPermissionKernelCp113CloseoutHandoff,
  createPermissionKernelCp113HermesEvidencePacket,
  createPermissionKernelCp114ApiSyntheticFixtureMatrix,
  createPermissionKernelCp114ApiSyntheticFixtureSetCatalog,
  createPermissionKernelCp114ApiSyntheticFixtureSetManifest,
  createPermissionKernelCp114ApiSyntheticFixtureSurface,
  createPermissionKernelCp114ClaudeReviewPacket,
  createPermissionKernelCp114CloseoutHandoff,
  createPermissionKernelCp114HermesEvidencePacket,
  createPermissionKernelCp115ApiFixtureUiReadinessCatalog,
  createPermissionKernelCp115ApiFixtureUiReadinessManifest,
  createPermissionKernelCp115ApiFixtureUiReadinessMatrix,
  createPermissionKernelCp115ClaudeReviewPacket,
  createPermissionKernelCp115CloseoutHandoff,
  createPermissionKernelCp115HermesEvidencePacket,
  createPermissionKernelCp116ClaudeReviewPacket,
  createPermissionKernelCp116CloseoutHandoff,
  createPermissionKernelCp116HermesEvidencePacket,
  createPermissionKernelCp116UiPermissionAuditBindingCatalog,
  createPermissionKernelCp116UiPermissionAuditBindingManifest,
  createPermissionKernelCp116UiPermissionAuditBindingMatrix,
  createPermissionKernelCp116UiPermissionAuditBindingSurface,
  createPermissionKernelCp117ClaudeReviewPacket,
  createPermissionKernelCp117CloseoutHandoff,
  createPermissionKernelCp117HermesEvidencePacket,
  createPermissionKernelCp117UiEvidenceStateSnapshotCatalog,
  createPermissionKernelCp117UiEvidenceStateSnapshotManifest,
  createPermissionKernelCp117UiStateSnapshot,
  createPermissionKernelCp117UiStateSnapshotMatrix,
  createPermissionKernelCp118ClaudeReviewPacket,
  createPermissionKernelCp118CloseoutHandoff,
  createPermissionKernelCp118HermesEvidencePacket,
  createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog,
  createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest,
  createPermissionKernelCp118UiSyntheticFixtureMatrix,
  createPermissionKernelCp119ClaudeReviewPacket,
  createPermissionKernelCp119CloseoutHandoff,
  createPermissionKernelCp119FixtureWorkflowBindingCatalog,
  createPermissionKernelCp119FixtureWorkflowBindingManifest,
  createPermissionKernelCp119FixtureWorkflowMatrix,
  createPermissionKernelCp119HermesEvidencePacket,
  createPermissionKernelCp120ClaudeReviewPacket,
  createPermissionKernelCp120CloseoutHandoff,
  createPermissionKernelCp120FixtureEvidencePermissionMatrix,
  createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog,
  createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest,
  createPermissionKernelCp120HermesEvidencePacket,
  createPermissionKernelCp121ClaudeReviewPacket,
  createPermissionKernelCp121CloseoutHandoff,
  createPermissionKernelCp121HermesEvidencePacket,
  createPermissionKernelCp121PermissionMatrixRiskBoundary,
  createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog,
  createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest,
  createPermissionKernelCp122ClaudeReviewPacket,
  createPermissionKernelCp122CloseoutHandoff,
  createPermissionKernelCp122HermesEvidencePacket,
  createPermissionKernelCp122PermissionMatrixWorkflowBinding,
  createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog,
  createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest,
  createPermissionKernelCp123ClaudeReviewPacket,
  createPermissionKernelCp123CloseoutHandoff,
  createPermissionKernelCp123HermesEvidencePacket,
  createPermissionKernelCp123PermissionAuditTerminalBoundary,
  createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog,
  createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest,
  createPermissionKernelCp124ClaudeReviewPacket,
  createPermissionKernelCp124CloseoutHandoff,
  createPermissionKernelCp124HermesEvidencePacket,
  createPermissionKernelCp124PermissionFixtureFailureTaxonomy,
  createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog,
  createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest,
  createPermissionKernelCp125ClaudeReviewPacket,
  createPermissionKernelCp125CloseoutHandoff,
  createPermissionKernelCp125FailureTaxonomyRiskBoundary,
  createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog,
  createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest,
  createPermissionKernelCp125HermesEvidencePacket,
  createPermissionKernelCp126ClaudeReviewPacket,
  createPermissionKernelCp126CloseoutHandoff,
  createPermissionKernelCp126FailureTaxonomyWorkflowBinding,
  createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog,
  createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest,
  createPermissionKernelCp126HermesEvidencePacket,
  createPermissionKernelCp127ClaudeReviewPacket,
  createPermissionKernelCp127CloseoutHandoff,
  createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary,
  createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog,
  createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest,
  createPermissionKernelCp127HermesEvidencePacket,
  createPermissionKernelCp128ClaudeReviewPacket,
  createPermissionKernelCp128CloseoutHandoff,
  createPermissionKernelCp128FailureTaxonomyEvidenceHarness,
  createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog,
  createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest,
  createPermissionKernelCp128HermesEvidencePacket,
  createPermissionKernelCp129ClaudeReviewPacket,
  createPermissionKernelCp129CloseoutHandoff,
  createPermissionKernelCp129HermesEvidencePacket,
  createPermissionKernelCp129HermesEvidenceWorkflowBinding,
  createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog,
  createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest,
  createPermissionKernelCp130ClaudeReviewPacket,
  createPermissionKernelCp130CloseoutHandoff,
  createPermissionKernelCp130HermesEvidencePacket,
  createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary,
  createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog,
  createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest,
  createPermissionKernelCp131ClaudeReviewPacket,
  createPermissionKernelCp131CloseoutHandoff,
  createPermissionKernelCp131HermesEvidencePacket,
  createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundary,
  createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCatalog,
  createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryManifest,
  createPermissionKernelCp132ClaudeReviewPacket,
  createPermissionKernelCp132CloseoutHandoff,
  createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog,
  createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix,
  createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest,
  createPermissionKernelCp132HermesEvidencePacket,
  createPermissionKernelCp133ClaudeReviewPacket,
  createPermissionKernelCp133CloseoutHandoff,
  createPermissionKernelCp133HermesEvidencePacket,
  createPermissionKernelCp133TerminalReviewQuestionBoundary,
  createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog,
  createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest,
  createPermissionKernelCp134ClaudeReviewPacket,
  createPermissionKernelCp134CloseoutHandoff,
  createPermissionKernelCp134HermesEvidencePacket,
  createPermissionKernelCp134TerminalReviewCloseoutReadiness,
  createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog,
  createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest,
  executePermissionKernelCp110Workflow,
  evaluatePermission,
  runPermissionKernelCp119FixtureWorkflowCase,
  runPermissionKernelCp120PermissionDecisionBinding,
  runPermissionKernelCp121PermissionMatrixBoundaryCase,
  runPermissionKernelCp122PermissionMatrixWorkflowCase,
  runPermissionKernelCp123PermissionAuditTerminalBoundaryCase,
  runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase,
  runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase,
  runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase,
  runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase,
  runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase,
  runPermissionKernelCp129HermesEvidenceWorkflowBindingCase,
  runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase,
  runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase,
  runPermissionKernelCp132FixtureEvidenceReviewReadinessCase,
  runPermissionKernelCp133TerminalReviewQuestionBoundaryCase,
  runPermissionKernelCp134TerminalReviewCloseoutReadinessCase,
  runPermissionKernelCp111SyntheticFixtureProfile,
  trimSearchResults,
  validatePermissionKernelCp108Coverage,
  validatePermissionKernelCp109Coverage,
  validatePermissionKernelCp110Coverage,
  validatePermissionKernelCp111Coverage,
  validatePermissionKernelCp112Coverage,
  validatePermissionKernelCp113Coverage,
  validatePermissionKernelCp114Coverage,
  validatePermissionKernelCp115Coverage,
  validatePermissionKernelCp116Coverage,
  validatePermissionKernelCp117Coverage,
  validatePermissionKernelCp118Coverage,
  validatePermissionKernelCp119Coverage,
  validatePermissionKernelCp120Coverage,
  validatePermissionKernelCp121Coverage,
  validatePermissionKernelCp122Coverage,
  validatePermissionKernelCp123Coverage,
  validatePermissionKernelCp124Coverage,
  validatePermissionKernelCp125Coverage,
  validatePermissionKernelCp126Coverage,
  validatePermissionKernelCp127Coverage,
  validatePermissionKernelCp128Coverage,
  validatePermissionKernelCp129Coverage,
  validatePermissionKernelCp130Coverage,
  validatePermissionKernelCp131Coverage,
  validatePermissionKernelCp132Coverage,
  validatePermissionKernelCp133Coverage,
  validatePermissionKernelCp134Coverage,
} from "../src/index.js";

const principal = { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] };
const documentResource = { resource_id: "d_001", resource_type: "Document", tenant_id: "t_synthetic", matter_id: "m_001" };

test("deny overrides allow", () => {
  const result = evaluatePermission({
    principal,
    resource: documentResource,
    action: "document.view",
    rules: [
      { id: "allow_attorney_doc", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
      { id: "deny_ethical_wall", effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "ethical_wall" },
    ],
  });

  assert.equal(result.effect, "deny");
  assert.equal(result.reason, "ethical_wall");
  assert.equal(result.audit_hint.effect, "deny");
});

test("cross-tenant access fails closed", () => {
  const result = evaluatePermission({
    principal,
    resource: { ...documentResource, tenant_id: "t_other" },
    action: "document.view",
    rules: [{ effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }],
  });

  assert.equal(result.effect, "deny");
  assert.equal(result.reason, "cross_tenant_deny");
  assert.equal(result.audit_hint.tenant_id, principal.tenant_id);
  assert.equal(result.audit_hint.object_id, "redacted_cross_tenant_object");
});

test("search results are security-trimmed before display", () => {
  const rules = [{ effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" }];
  const results = [
    documentResource,
    { resource_id: "d_002", resource_type: "Document", tenant_id: "t_other", matter_id: "m_999" },
  ];

  assert.deepEqual(trimSearchResults(principal, results, rules).map((row) => row.resource_id), ["d_001"]);
});

test("search trimming respects object ACL denies before display", () => {
  const rules = [{ effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" }];
  const results = [documentResource];
  const objectAcl = [{ effect: "deny", principal_id: principal.user_id, action: "search.view" }];

  assert.deepEqual(trimSearchResults(principal, results, rules, objectAcl), []);
});

test("permission evaluator can emit review and approval decisions", () => {
  const review = evaluatePermission({
    principal,
    resource: documentResource,
    action: "document.download",
    rules: [{ id: "review_download", effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" }],
  });
  const approval = evaluatePermission({
    principal,
    resource: documentResource,
    action: "document.delete.request",
    rules: [{ id: "approval_delete", effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.delete.request" }],
  });

  assert.equal(review.effect, "review_required");
  assert.equal(approval.effect, "approval_required");
});

test("review and approval policies override object ACL allow", () => {
  const result = evaluatePermission({
    principal,
    resource: documentResource,
    action: "document.delete.request",
    rules: [{ id: "approval_delete", effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.delete.request" }],
    objectAcl: [{ effect: "allow", principal_id: principal.user_id, action: "document.delete.request" }],
  });

  assert.equal(result.effect, "approval_required");
});

test("CP00-108 foundation catalog covers the planned RP02 permission units", () => {
  const catalog = createPermissionKernelCp108FoundationCatalog();
  const manifest = createPermissionKernelCp108FoundationManifest();
  const coverage = validatePermissionKernelCp108Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P00.M00.S01");
  assert.equal(manifest.last_unit_id, "RP02.P01.M05.S20");
  assert.equal(manifest.phase_counts["RP02.P00"], 71);
  assert.equal(manifest.phase_counts["RP02.P01"], 79);
  assert.equal(manifest.covered_micro_phase_count, 17);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-108 foundation catalog preserves no-write and no-LDIP boundaries", () => {
  const catalog = createPermissionKernelCp108FoundationCatalog();
  const manifest = createPermissionKernelCp108FoundationManifest();

  assert.equal(manifest.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(manifest.no_write_attestation.mutates_permission_policy, false);
  assert.equal(manifest.no_write_attestation.writes_audit_event, false);
  assert.equal(manifest.no_write_attestation.writes_product_state, false);
  assert.equal(manifest.no_write_attestation.executes_external_share, false);
  assert.equal(manifest.no_write_attestation.implements_ldip, false);
  assert.equal(catalog.every((item) => item.synthetic_only && item.no_real_data && item.catalog_only), true);
  assert.equal(catalog.every((item) => item.boundary_flags === manifest.no_write_attestation), true);
});

test("CP00-108 evidence packets and handoff bind to H02/C02 and CP00-109", () => {
  const hermes = createPermissionKernelCp108HermesEvidencePacket();
  const claude = createPermissionKernelCp108ClaudeReviewPacket();
  const handoff = createPermissionKernelCp108CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-109");
  assert.equal(handoff.next_subphase_id, "RP02.P01.M06.S01");
  assert.equal(handoff.ldip_implemented, false);
});

test("CP00-109 model-service catalog covers the planned RP02 continuation units", () => {
  const catalog = createPermissionKernelCp109ModelServiceCatalog();
  const manifest = createPermissionKernelCp109ModelServiceManifest();
  const coverage = validatePermissionKernelCp109Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P01.M06.S01");
  assert.equal(manifest.last_unit_id, "RP02.P02.M04.S06");
  assert.equal(manifest.area_counts.permission_model, 71);
  assert.equal(manifest.area_counts.permission_service, 79);
  assert.equal(manifest.covered_micro_phase_count, 10);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-109 service precheck blocks tenant drift before permission evaluation", () => {
  const pass = createPermissionKernelCp109ServicePrecheck({
    synthetic: true,
    tenant_id: "t_synthetic",
    matter_id: "m_001",
    resource: { tenant_id: "t_synthetic", matter_id: "m_001" },
  });
  const blocked = createPermissionKernelCp109ServicePrecheck({
    synthetic: true,
    tenant_id: "t_synthetic",
    matter_id: "m_001",
    resource: { tenant_id: "t_other", matter_id: "m_001" },
  });
  const matterBlocked = createPermissionKernelCp109ServicePrecheck({
    synthetic: true,
    tenant_id: "t_synthetic",
    matter_id: "m_001",
    resource: { tenant_id: "t_synthetic", matter_id: "m_002" },
  });
  const nonSyntheticBlocked = createPermissionKernelCp109ServicePrecheck({
    synthetic: false,
    tenant_id: "t_synthetic",
    matter_id: "m_001",
    resource: { tenant_id: "t_synthetic", matter_id: "m_001" },
  });

  assert.equal(pass.status, "ready_for_permission_evaluator");
  assert.equal(pass.permission_precheck, "reference_only");
  assert.equal(blocked.status, "blocked_before_permission_evaluation");
  assert.equal(blocked.permission_precheck, "not_evaluated");
  assert.equal(blocked.reason, "tenant_boundary_precheck_failed");
  assert.equal(matterBlocked.status, "blocked_before_permission_evaluation");
  assert.equal(matterBlocked.reason, "matter_trace_precheck_failed");
  assert.equal(nonSyntheticBlocked.status, "blocked_before_permission_evaluation");
  assert.equal(nonSyntheticBlocked.reason, "non_synthetic_request_blocked");
  assert.equal(pass.writes_product_state, false);
  assert.equal(pass.writes_audit_event, false);
  assert.equal(pass.mutates_permission_policy, false);
});

test("CP00-109 evidence packets and handoff bind to H02/C02 and CP00-110", () => {
  const hermes = createPermissionKernelCp109HermesEvidencePacket();
  const claude = createPermissionKernelCp109ClaudeReviewPacket();
  const handoff = createPermissionKernelCp109CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-110");
  assert.equal(handoff.next_subphase_id, "RP02.P02.M04.S07");
  assert.equal(handoff.ldip_implemented, false);
});

test("CP00-110 service workflow catalog covers the planned RP02 service units", () => {
  const catalog = createPermissionKernelCp110ServiceWorkflowCatalog();
  const manifest = createPermissionKernelCp110ServiceWorkflowManifest();
  const coverage = validatePermissionKernelCp110Coverage();

  assert.equal(catalog.length, 40);
  assert.equal(manifest.covered_unit_count, 40);
  assert.equal(manifest.first_unit_id, "RP02.P02.M04.S07");
  assert.equal(manifest.last_unit_id, "RP02.P02.M06.S02");
  assert.equal(manifest.phase_counts["RP02.P02.M04"], 16);
  assert.equal(manifest.phase_counts["RP02.P02.M05"], 22);
  assert.equal(manifest.phase_counts["RP02.P02.M06"], 2);
  assert.equal(manifest.deliverable_counts.implementation, 16);
  assert.equal(manifest.deliverable_counts.test, 8);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-110 workflow invokes the evaluator only for synthetic in-boundary requests", () => {
  const allowed = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal,
    resource: documentResource,
    matter_id: "m_001",
    action: "document.view",
    rules: [{ id: "allow_attorney_doc", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }],
    idempotency_key: "idem_cp110_allowed",
    lock_token: "lock_cp110_allowed",
  });
  const crossTenant = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal,
    resource: { ...documentResource, tenant_id: "t_other" },
    matter_id: "m_001",
    action: "document.view",
  });
  const nonSynthetic = executePermissionKernelCp110Workflow({
    synthetic: false,
    principal,
    resource: documentResource,
    matter_id: "m_001",
    action: "document.view",
  });
  const matterMissing = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal,
    resource: { resource_id: "d_003", resource_type: "Document", tenant_id: "t_synthetic", matter_id: null },
    matter_id: "m_001",
    action: "document.view",
  });

  assert.equal(allowed.status, "completed_metadata_only");
  assert.equal(allowed.decision.effect, "allow");
  assert.equal(allowed.evaluator_invoked, true);
  assert.equal(allowed.idempotency_receipt.persisted, false);
  assert.equal(allowed.lock_receipt.acquired, false);
  assert.equal(allowed.persistence_boundary.writes_product_state, false);
  assert.equal(allowed.persistence_boundary.writes_audit_event, false);
  assert.equal(crossTenant.status, "blocked_before_permission_evaluation");
  assert.equal(crossTenant.reason, "tenant_boundary_precheck_failed");
  assert.equal(crossTenant.evaluator_invoked, false);
  assert.equal(nonSynthetic.status, "blocked_before_permission_evaluation");
  assert.equal(nonSynthetic.reason, "non_synthetic_request_blocked");
  assert.equal(nonSynthetic.evaluator_invoked, false);
  assert.equal(matterMissing.status, "blocked_before_permission_evaluation");
  assert.equal(matterMissing.reason, "matter_trace_precheck_failed");
  assert.equal(matterMissing.evaluator_invoked, false);
});

test("CP00-110 workflow maps deny review and approval decisions to metadata-only routes", () => {
  const denied = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal,
    resource: documentResource,
    matter_id: "m_001",
    action: "document.view",
    rules: [{ id: "deny_ethical_wall", effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view" }],
  });
  const review = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal,
    resource: documentResource,
    matter_id: "m_001",
    action: "document.download",
    rules: [{ id: "review_download", effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" }],
  });
  const approval = executePermissionKernelCp110Workflow({
    synthetic: true,
    principal,
    resource: documentResource,
    matter_id: "m_001",
    action: "document.delete.request",
    rules: [{ id: "approval_delete", effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.delete.request" }],
  });

  assert.equal(denied.status, "blocked_claim_output");
  assert.equal(denied.decision.effect, "deny");
  assert.equal(review.status, "review_required_routing");
  assert.equal(review.decision.effect, "review_required");
  assert.equal(approval.status, "approval_required_routing");
  assert.equal(approval.decision.effect, "approval_required");
  assert.equal(denied.rollback_behavior.executed, false);
  assert.equal(review.retry_behavior.executed, false);
  assert.equal(approval.audit_hint_preview.emitted_to_audit_ledger, false);
});

test("CP00-110 evidence packets and handoff bind to H02/C02 and CP00-111", () => {
  const hermes = createPermissionKernelCp110HermesEvidencePacket();
  const claude = createPermissionKernelCp110ClaudeReviewPacket();
  const handoff = createPermissionKernelCp110CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 40);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-111");
  assert.equal(handoff.next_subphase_id, "RP02.P02.M06.S03");
  assert.equal(handoff.ldip_implemented, false);
});

test("CP00-111 Risk A synthetic fixture boundary catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp111SyntheticFixtureBoundaryCatalog();
  const manifest = createPermissionKernelCp111SyntheticFixtureBoundaryManifest();
  const coverage = validatePermissionKernelCp111Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P02.M06.S03");
  assert.equal(manifest.last_unit_id, "RP02.P02.M06.S12");
  assert.equal(manifest.deliverable_counts.implementation, 6);
  assert.equal(manifest.deliverable_counts.security_audit, 2);
  assert.equal(manifest.deliverable_counts.ui, 2);
  assert.equal(manifest.fixture_profile_count, 10);
  assert.equal(manifest.metadata_only_profile_count, 10);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-111 fixture profiles fail closed across tenant matter and permission boundaries", () => {
  const tenant = runPermissionKernelCp111SyntheticFixtureProfile("tenant_boundary_block");
  const matter = runPermissionKernelCp111SyntheticFixtureProfile("matter_trace_block");
  const deny = runPermissionKernelCp111SyntheticFixtureProfile("permission_deny");

  assert.equal(tenant.status, "blocked_before_permission_evaluation");
  assert.equal(tenant.evaluator_invoked, false);
  assert.equal(matter.status, "blocked_before_permission_evaluation");
  assert.equal(matter.evaluator_invoked, false);
  assert.equal(deny.status, "blocked_claim_output");
  assert.equal(deny.decision_effect, "deny");
  assert.equal(deny.evaluator_invoked, true);
});

test("CP00-111 fixture profiles exercise allow acl review and metadata-only receipts", () => {
  const allow = runPermissionKernelCp111SyntheticFixtureProfile("permission_allow");
  const audit = runPermissionKernelCp111SyntheticFixtureProfile("audit_hint_preview");
  const acl = runPermissionKernelCp111SyntheticFixtureProfile("secondary_object_acl_allow");
  const review = runPermissionKernelCp111SyntheticFixtureProfile("state_transition_review_required");
  const matrix = createPermissionKernelCp111SyntheticFixtureBoundaryMatrix();

  assert.equal(allow.status, "completed_metadata_only");
  assert.equal(allow.decision_effect, "allow");
  assert.equal(audit.audit_hint_preview_only, true);
  assert.equal(acl.status, "completed_metadata_only");
  assert.equal(acl.decision_reason, "object_acl_allow");
  assert.equal(review.status, "review_required_routing");
  assert.equal(review.decision_effect, "review_required");
  assert.equal(matrix.length, 10);
  assert.equal(matrix.every((profile) => profile.idempotency_persisted === false), true);
  assert.equal(matrix.every((profile) => profile.lock_acquired === false), true);
  assert.equal(matrix.every((profile) => profile.writes_product_state === false), true);
  assert.equal(matrix.every((profile) => profile.writes_audit_event === false), true);
  assert.equal(matrix.every((profile) => profile.creates_database_rows === false), true);
});

test("CP00-111 evidence packets and handoff bind to H02/C02 and CP00-112", () => {
  const hermes = createPermissionKernelCp111HermesEvidencePacket();
  const claude = createPermissionKernelCp111ClaudeReviewPacket();
  const handoff = createPermissionKernelCp111CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-112");
  assert.equal(handoff.next_subphase_id, "RP02.P02.M06.S13");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-112 interface closeout catalog covers the planned terminal and API units", () => {
  const catalog = createPermissionKernelCp112InterfaceCloseoutCatalog();
  const manifest = createPermissionKernelCp112InterfaceCloseoutManifest();
  const coverage = validatePermissionKernelCp112Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P02.M06.S13");
  assert.equal(manifest.last_unit_id, "RP02.P03.M05.S06");
  assert.equal(manifest.area_counts.permission_service_terminal_closeout, 85);
  assert.equal(manifest.area_counts.permission_api_interface, 65);
  assert.equal(manifest.deliverable_counts.implementation, 62);
  assert.equal(manifest.deliverable_counts.contract, 22);
  assert.equal(manifest.deliverable_counts.security_audit, 18);
  assert.equal(manifest.deliverable_counts.test, 20);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-112 API interface fixture omits unauthorized data and maps invalid requests", () => {
  const fixture = createPermissionKernelCp112ApiInterfaceFixture({
    privileged_note: "should never leave the fixture",
    cross_tenant_secret: "should never leave the fixture",
  });
  const nonSynthetic = createPermissionKernelCp112ApiInterfaceFixture({ synthetic: false });
  const crossTenant = createPermissionKernelCp112ApiInterfaceFixture({ tenant_id: "t_interface", resource_tenant_id: "t_other" });
  const matterDrift = createPermissionKernelCp112ApiInterfaceFixture({
    matter_id: "m_request_context",
    resource_matter_id: "m_resource_context",
  });
  const invalidPagination = createPermissionKernelCp112ApiInterfaceFixture({ page_size: 101 });

  assert.equal(fixture.status, "ready_metadata_only_response");
  assert.equal(fixture.unauthorized_data_omitted, true);
  assert.equal(fixture.response_contract.items[0].privileged_note, undefined);
  assert.equal(fixture.response_contract.items[0].cross_tenant_secret, undefined);
  assert.equal(fixture.writes_product_state, false);
  assert.equal(fixture.writes_audit_event, false);
  assert.equal(fixture.creates_database_rows, false);
  assert.equal(nonSynthetic.response_contract.error_codes.includes("non_synthetic_request_blocked"), true);
  assert.equal(crossTenant.response_contract.error_codes.includes("tenant_boundary_precheck_failed"), true);
  assert.equal(matterDrift.response_contract.error_codes.includes("matter_trace_precheck_failed"), true);
  assert.equal(invalidPagination.response_contract.error_codes.includes("invalid_pagination"), true);
});

test("CP00-112 terminal fixture matrix remains metadata-only", () => {
  const matrix = createPermissionKernelCp112TerminalFixtureMatrix();

  assert.equal(matrix.service_profile_count, 7);
  assert.equal(matrix.api_fixture_count, 4);
  assert.equal(matrix.service_profiles.every((profile) => profile.idempotency_persisted === false), true);
  assert.equal(matrix.service_profiles.every((profile) => profile.lock_acquired === false), true);
  assert.equal(matrix.service_profiles.every((profile) => profile.writes_product_state === false), true);
  assert.equal(matrix.service_profiles.every((profile) => profile.writes_audit_event === false), true);
  assert.equal(matrix.api_fixtures.every((fixture) => fixture.executes_export_download === false), true);
  assert.equal(matrix.api_fixtures.every((fixture) => fixture.executes_external_share === false), true);
  assert.equal(matrix.api_fixtures.every((fixture) => fixture.executes_ai_retrieval === false), true);
});

test("CP00-112 evidence packets and handoff bind to H02/C02 and CP00-113", () => {
  const hermes = createPermissionKernelCp112HermesEvidencePacket();
  const claude = createPermissionKernelCp112ClaudeReviewPacket();
  const handoff = createPermissionKernelCp112CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-113");
  assert.equal(handoff.next_subphase_id, "RP02.P03.M05.S07");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-113 Risk A API permission and audit binding covers the planned units", () => {
  const catalog = createPermissionKernelCp113ApiPermissionAuditBindingCatalog();
  const manifest = createPermissionKernelCp113ApiPermissionAuditBindingManifest();
  const coverage = validatePermissionKernelCp113Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P03.M05.S07");
  assert.equal(manifest.last_unit_id, "RP02.P03.M05.S16");
  assert.equal(manifest.deliverable_counts.contract, 2);
  assert.equal(manifest.deliverable_counts.implementation, 3);
  assert.equal(manifest.deliverable_counts.test, 3);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 1);
  assert.equal(manifest.deliverable_counts.claude_review, 1);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-113 API binding serializes allowed responses with permission and audit annotations", () => {
  const fixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture({
    privileged_note: "must not serialize",
    cross_tenant_secret: "must not serialize",
    internal_policy_label: "must not serialize",
    sealed_audit_hint_payload: "must not serialize",
    page: 2,
    page_size: 10,
  });

  assert.equal(fixture.status, "ready_metadata_only_response");
  assert.equal(fixture.evaluator_invoked, true);
  assert.equal(fixture.response_contract.items.length, 1);
  assert.equal(fixture.response_contract.items[0].privileged_note, undefined);
  assert.equal(fixture.response_contract.items[0].cross_tenant_secret, undefined);
  assert.equal(fixture.response_contract.items[0].internal_policy_label, undefined);
  assert.equal(fixture.response_contract.items[0].sealed_audit_hint_payload, undefined);
  assert.equal(fixture.response_contract.safety_codes.includes("unauthorized_data_omitted"), true);
  assert.equal(fixture.pagination_filtering_contract.applied_before_response, true);
  assert.equal(fixture.pagination_filtering_contract.page, 2);
  assert.equal(fixture.pagination_filtering_contract.page_size, 10);
  assert.equal(fixture.serialization_guard.allowlist_enforced, true);
  assert.equal(fixture.permission_annotation.effect, "allow");
  assert.equal(fixture.audit_annotation.preview_only, true);
  assert.equal(fixture.audit_annotation.emitted_to_audit_ledger, false);
  assert.equal(fixture.audit_annotation.hint.privileged_note, undefined);
  assert.equal(fixture.audit_annotation.hint.cross_tenant_secret, undefined);
  assert.equal(fixture.audit_annotation.hint.internal_policy_label, undefined);
  assert.equal(fixture.audit_annotation.hint.sealed_audit_hint_payload, undefined);
  assert.equal(fixture.writes_product_state, false);
  assert.equal(fixture.writes_audit_event, false);
  assert.equal(fixture.mutates_permission_policy, false);
});

test("CP00-113 API binding fails closed for denied and invalid requests", () => {
  const denied = createPermissionKernelCp113ApiPermissionAuditBindingFixture({ decision: "deny" });
  const invalidPagination = createPermissionKernelCp113ApiPermissionAuditBindingFixture({ page_size: 101 });
  const nonSynthetic = createPermissionKernelCp113ApiPermissionAuditBindingFixture({ synthetic: false });
  const crossTenant = createPermissionKernelCp113ApiPermissionAuditBindingFixture({ tenant_id: "t_cp113", resource_tenant_id: "t_other" });
  const matterDrift = createPermissionKernelCp113ApiPermissionAuditBindingFixture({
    matter_id: "m_request_context",
    resource_matter_id: "m_resource_context",
  });

  assert.equal(denied.status, "denied_metadata_only_response");
  assert.equal(denied.evaluator_invoked, true);
  assert.equal(denied.response_contract.items.length, 0);
  assert.equal(denied.response_contract.error_codes.includes("permission_denied"), true);
  assert.equal(denied.response_contract.safety_codes.includes("unauthorized_data_omitted"), true);
  assert.equal(invalidPagination.response_contract.error_codes.includes("invalid_pagination"), true);
  assert.equal(invalidPagination.evaluator_invoked, false);
  assert.equal(nonSynthetic.response_contract.error_codes.includes("non_synthetic_request_blocked"), true);
  assert.equal(nonSynthetic.evaluator_invoked, false);
  assert.equal(crossTenant.response_contract.error_codes.includes("tenant_boundary_precheck_failed"), true);
  assert.equal(matterDrift.response_contract.error_codes.includes("matter_trace_precheck_failed"), true);
});

test("CP00-113 fixtures evidence packets and handoff stay metadata-only", () => {
  const matrix = createPermissionKernelCp113ApiPermissionAuditBindingFixtureMatrix();
  const hermes = createPermissionKernelCp113HermesEvidencePacket();
  const claude = createPermissionKernelCp113ClaudeReviewPacket();
  const handoff = createPermissionKernelCp113CloseoutHandoff();

  assert.equal(matrix.fixture_count, 6);
  assert.equal(matrix.fixtures.every((fixture) => fixture.writes_product_state === false), true);
  assert.equal(matrix.fixtures.every((fixture) => fixture.writes_audit_event === false), true);
  assert.equal(matrix.fixtures.every((fixture) => fixture.creates_database_rows === false), true);
  assert.equal(matrix.fixtures.every((fixture) => fixture.executes_export_download === false), true);
  assert.equal(matrix.fixtures.every((fixture) => fixture.executes_external_share === false), true);
  assert.equal(matrix.fixtures.every((fixture) => fixture.executes_ai_retrieval === false), true);
  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-114");
  assert.equal(handoff.next_subphase_id, "RP02.P03.M05.S17");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-114 Risk A API synthetic fixture set covers the planned units", () => {
  const catalog = createPermissionKernelCp114ApiSyntheticFixtureSetCatalog();
  const manifest = createPermissionKernelCp114ApiSyntheticFixtureSetManifest();
  const coverage = validatePermissionKernelCp114Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P03.M05.S17");
  assert.equal(manifest.last_unit_id, "RP02.P03.M06.S06");
  assert.equal(manifest.phase_counts["RP02.P03.M05"], 4);
  assert.equal(manifest.phase_counts["RP02.P03.M06"], 6);
  assert.equal(manifest.deliverable_counts.implementation, 6);
  assert.equal(manifest.deliverable_counts.contract, 2);
  assert.equal(manifest.deliverable_counts.security_audit, 2);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-114 fixture surface publishes versioned request and response contracts", () => {
  const surface = createPermissionKernelCp114ApiSyntheticFixtureSurface({
    privileged_note: "must not serialize",
    cross_tenant_secret: "must not serialize",
    internal_policy_label: "must not serialize",
    sealed_audit_hint_payload: "must not serialize",
  });

  assert.equal(surface.api_version, "permission_api_binding.v0.1");
  assert.equal(surface.public_export_map.runtime_route_exported, false);
  assert.equal(surface.public_export_map.persistence_adapter_exported, false);
  assert.equal(surface.request_contract.api_version, "permission_api_binding.v0.1");
  assert.equal(surface.response_contract.items.length, 1);
  assert.equal(surface.response_contract.items[0].privileged_note, undefined);
  assert.equal(surface.response_contract.items[0].cross_tenant_secret, undefined);
  assert.equal(surface.response_contract.items[0].internal_policy_label, undefined);
  assert.equal(surface.response_contract.items[0].sealed_audit_hint_payload, undefined);
  assert.equal(surface.response_contract.safety_codes.includes("unauthorized_data_omitted"), true);
  assert.equal(surface.permission_annotation.effect, "allow");
  assert.equal(surface.audit_annotation.preview_only, true);
  assert.equal(surface.audit_annotation.emitted_to_audit_ledger, false);
  assert.equal(surface.audit_annotation.hint.privileged_note, undefined);
});

test("CP00-114 fixture matrix exercises denied invalid and non-synthetic paths", () => {
  const matrix = createPermissionKernelCp114ApiSyntheticFixtureMatrix();
  const denied = matrix.surfaces[1];
  const nonSynthetic = matrix.surfaces[2];
  const invalidPagination = matrix.surfaces[3];

  assert.equal(matrix.fixture_surface_count, 4);
  assert.equal(denied.error_code_taxonomy.permission_denied_exercised, true);
  assert.equal(denied.response_contract.error_codes.includes("permission_denied"), true);
  assert.equal(nonSynthetic.response_contract.error_codes.includes("non_synthetic_request_blocked"), true);
  assert.equal(invalidPagination.error_code_taxonomy.invalid_pagination_exercised, true);
  assert.equal(invalidPagination.response_contract.error_codes.includes("invalid_pagination"), true);
  assert.equal(matrix.surfaces.every((surface) => surface.writes_product_state === false), true);
  assert.equal(matrix.surfaces.every((surface) => surface.writes_audit_event === false), true);
  assert.equal(matrix.surfaces.every((surface) => surface.creates_database_rows === false), true);
  assert.equal(matrix.surfaces.every((surface) => surface.persists_idempotency_keys === false), true);
  assert.equal(matrix.surfaces.every((surface) => surface.acquires_locks === false), true);
  assert.equal(matrix.surfaces.every((surface) => surface.executes_external_share === false), true);
  assert.equal(matrix.surfaces.every((surface) => surface.executes_ai_retrieval === false), true);
});

test("CP00-114 evidence packets and handoff bind to H02/C02 and CP00-115", () => {
  const hermes = createPermissionKernelCp114HermesEvidencePacket();
  const claude = createPermissionKernelCp114ClaudeReviewPacket();
  const handoff = createPermissionKernelCp114CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-115");
  assert.equal(handoff.next_subphase_id, "RP02.P03.M06.S07");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-115 Risk C API fixture and UI readiness catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp115ApiFixtureUiReadinessCatalog();
  const manifest = createPermissionKernelCp115ApiFixtureUiReadinessManifest();
  const coverage = validatePermissionKernelCp115Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P03.M06.S07");
  assert.equal(manifest.last_unit_id, "RP02.P04.M05.S07");
  assert.equal(manifest.area_counts.permission_api_fixture_terminal, 65);
  assert.equal(manifest.area_counts.permission_ui_surface_readiness, 85);
  assert.equal(manifest.covered_micro_phase_count, 11);
  assert.equal(manifest.deliverable_counts.implementation, 48);
  assert.equal(manifest.deliverable_counts.contract, 15);
  assert.equal(manifest.deliverable_counts.security_audit, 12);
  assert.equal(manifest.deliverable_counts.ui, 42);
  assert.equal(manifest.deliverable_counts.fixture, 3);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-115 matrix inherits CP114 API fixtures and keeps UI states metadata-only", () => {
  const matrix = createPermissionKernelCp115ApiFixtureUiReadinessMatrix();

  assert.equal(matrix.api_fixture_surface_count, 4);
  assert.equal(matrix.ui_state_count, 13);
  assert.equal(matrix.inherited_api_version, "permission_api_binding.v0.1");
  assert.equal(matrix.api_fixture_matrix.surfaces.every((surface) => surface.writes_product_state === false), true);
  assert.equal(matrix.api_fixture_matrix.surfaces.every((surface) => surface.writes_audit_event === false), true);
  assert.equal(matrix.api_fixture_matrix.surfaces.every((surface) => surface.creates_database_rows === false), true);
  assert.equal(matrix.api_fixture_matrix.surfaces.every((surface) => surface.executes_external_share === false), true);
  assert.equal(matrix.ui_states.some((state) => state.state_id === "denied_state" && state.permission_effect === "deny"), true);
  assert.equal(
    matrix.ui_states.some((state) => state.state_id === "review_required_state" && state.permission_effect === "review_required"),
    true,
  );
  assert.equal(matrix.ui_states.every((state) => state.unauthorized_count_exposed === false), true);
  assert.equal(matrix.ui_states.every((state) => state.hidden_field_names_exposed === false), true);
  assert.equal(matrix.ui_states.every((state) => state.writes_product_state === false), true);
  assert.equal(matrix.ui_states.every((state) => state.writes_audit_event === false), true);
  assert.equal(matrix.ui_states.every((state) => state.grants_human_approval === false), true);
});

test("CP00-115 catalog rows preserve no-write, no-LDIP, and plan handoff boundaries", () => {
  const catalog = createPermissionKernelCp115ApiFixtureUiReadinessCatalog();
  const handoff = createPermissionKernelCp115CloseoutHandoff();

  assert.equal(catalog.every((row) => row.synthetic_only && row.no_real_data && row.catalog_only), true);
  assert.equal(catalog.every((row) => row.boundary_flags.writes_product_state === false), true);
  assert.equal(catalog.every((row) => row.boundary_flags.writes_audit_event === false), true);
  assert.equal(catalog.every((row) => row.boundary_flags.executes_external_share === false), true);
  assert.equal(catalog.every((row) => row.boundary_flags.executes_ai_retrieval === false), true);
  assert.equal(catalog.every((row) => row.boundary_flags.implements_ldip === false), true);
  assert.equal(handoff.next_pack_id, "CP00-116");
  assert.equal(handoff.next_subphase_id, "RP02.P04.M05.S08");
  assert.equal(handoff.ldip_implemented, false);
});

test("CP00-115 evidence packets and handoff bind to H02/C02 and CP00-116", () => {
  const hermes = createPermissionKernelCp115HermesEvidencePacket();
  const claude = createPermissionKernelCp115ClaudeReviewPacket();
  const handoff = createPermissionKernelCp115CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-116");
  assert.equal(handoff.next_subphase_id, "RP02.P04.M05.S08");
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-116 Risk A UI permission and audit binding covers the planned units", () => {
  const catalog = createPermissionKernelCp116UiPermissionAuditBindingCatalog();
  const manifest = createPermissionKernelCp116UiPermissionAuditBindingManifest();
  const coverage = validatePermissionKernelCp116Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P04.M05.S08");
  assert.equal(manifest.last_unit_id, "RP02.P04.M05.S17");
  assert.equal(manifest.deliverable_counts.ui, 3);
  assert.equal(manifest.deliverable_counts.security_audit, 2);
  assert.equal(manifest.deliverable_counts.implementation, 3);
  assert.equal(manifest.deliverable_counts.fixture, 1);
  assert.equal(manifest.deliverable_counts.test, 1);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-116 UI surfaces keep permission badges and audit hints leak-free", () => {
  const allow = createPermissionKernelCp116UiPermissionAuditBindingSurface({
    audit_hint: {
      privileged_note: "must not expose",
      cross_tenant_secret: "must not expose",
      internal_policy_label: "must not expose",
      sealed_audit_hint_payload: "must not expose",
    },
  });
  const denied = createPermissionKernelCp116UiPermissionAuditBindingSurface({ effect: "deny", reason: "permission_denied" });
  const review = createPermissionKernelCp116UiPermissionAuditBindingSurface({ effect: "review_required", reason: "review_required" });

  assert.equal(allow.permission_badge.grants_access, false);
  assert.equal(denied.secondary_interaction.enabled, false);
  assert.equal(review.secondary_interaction.requires_review, true);
  assert.equal(review.secondary_interaction.grants_access, false);
  assert.equal(allow.audit_hint_display.preview_only, true);
  assert.equal(allow.audit_hint_display.emitted_to_audit_ledger, false);
  assert.equal(allow.error_message_copy.exposes_unauthorized_count, false);
  assert.equal(allow.error_message_copy.exposes_hidden_field_names, false);
  assert.equal(allow.audit_hint_display.hint.privileged_note, undefined);
  assert.equal(allow.audit_hint_display.hint.cross_tenant_secret, undefined);
  assert.equal(allow.audit_hint_display.hint.internal_policy_label, undefined);
  assert.equal(allow.audit_hint_display.hint.sealed_audit_hint_payload, undefined);
  assert.equal(allow.responsive_layout.desktop.permission_badge_visible, true);
  assert.equal(allow.responsive_layout.mobile.permission_badge_visible, true);
  assert.equal(allow.responsive_layout.keyboard_focus_order.includes("permission_badge"), true);
});

test("CP00-116 matrix preserves no-write no-share no-AI and no-approval boundaries", () => {
  const matrix = createPermissionKernelCp116UiPermissionAuditBindingMatrix();

  assert.equal(matrix.surface_count, 3);
  for (const surface of matrix.surfaces) {
    assert.equal(surface.runtime_ui_route_added, false);
    assert.equal(surface.unauthorized_count_exposed, false);
    assert.equal(surface.hidden_field_names_exposed, false);
    assert.equal(surface.mutates_permission_policy, false);
    assert.equal(surface.writes_product_state, false);
    assert.equal(surface.writes_audit_event, false);
    assert.equal(surface.creates_database_rows, false);
    assert.equal(surface.persists_idempotency_keys, false);
    assert.equal(surface.acquires_locks, false);
    assert.equal(surface.executes_export_download, false);
    assert.equal(surface.executes_external_share, false);
    assert.equal(surface.executes_ai_retrieval, false);
    assert.equal(surface.grants_human_approval, false);
  }
});

test("CP00-116 evidence packets and handoff bind to H02/C02 and CP00-117", () => {
  const hermes = createPermissionKernelCp116HermesEvidencePacket();
  const claude = createPermissionKernelCp116ClaudeReviewPacket();
  const handoff = createPermissionKernelCp116CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-117");
  assert.equal(handoff.next_subphase_id, "RP02.P04.M05.S18");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-117 Risk A UI evidence and state snapshot catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp117UiEvidenceStateSnapshotCatalog();
  const manifest = createPermissionKernelCp117UiEvidenceStateSnapshotManifest();
  const coverage = validatePermissionKernelCp117Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P04.M05.S18");
  assert.equal(manifest.last_unit_id, "RP02.P04.M06.S05");
  assert.equal(manifest.covered_micro_phase_count, 2);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 1);
  assert.equal(manifest.deliverable_counts.claude_review, 1);
  assert.equal(manifest.deliverable_counts.implementation, 3);
  assert.equal(manifest.deliverable_counts.ui, 5);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-117 UI snapshots keep evidence state and leak checks metadata-only", () => {
  const loading = createPermissionKernelCp117UiStateSnapshot({
    state_id: "loading_state",
    audit_hint: {
      privileged_note: "must not expose",
      cross_tenant_secret: "must not expose",
      internal_policy_label: "must not expose",
      sealed_audit_hint_payload: "must not expose",
    },
  });
  const empty = createPermissionKernelCp117UiStateSnapshot({ state_id: "empty_state" });
  const denied = createPermissionKernelCp117UiStateSnapshot({ state_id: "denied_state" });

  assert.equal(loading.loading_state.skeleton_only, true);
  assert.equal(empty.empty_state.renders_unauthorized_count, false);
  assert.equal(denied.denied_state.secondary_interaction_enabled, false);
  assert.equal(denied.denied_state.grants_access, false);
  assert.equal(denied.state_snapshot.permission_effect, "deny");
  assert.equal(loading.state_snapshot.permission_badge.grants_access, false);
  assert.equal(loading.state_snapshot.audit_hint_display.preview_only, true);
  assert.equal(loading.state_snapshot.audit_hint_display.emitted_to_audit_ledger, false);
  assert.equal(loading.state_snapshot.audit_hint_display.hint.privileged_note, undefined);
  assert.equal(loading.state_snapshot.audit_hint_display.hint.cross_tenant_secret, undefined);
  assert.equal(loading.state_snapshot.audit_hint_display.hint.internal_policy_label, undefined);
  assert.equal(loading.state_snapshot.audit_hint_display.hint.sealed_audit_hint_payload, undefined);
  assert.equal(loading.no_unauthorized_count_leak.unauthorized_count_collected, false);
  assert.equal(loading.no_unauthorized_count_leak.unauthorized_count_rendered, false);
  assert.equal(loading.data_dependency_map.real_client_data_sources.length, 0);
});

test("CP00-117 matrix preserves no-write no-share no-AI and no-approval boundaries", () => {
  const matrix = createPermissionKernelCp117UiStateSnapshotMatrix();

  assert.equal(matrix.state_count, 3);
  assert.equal(matrix.states.includes("loading_state"), true);
  assert.equal(matrix.states.includes("empty_state"), true);
  assert.equal(matrix.states.includes("denied_state"), true);
  for (const snapshot of matrix.snapshots) {
    assert.equal(snapshot.runtime_ui_route_added, false);
    assert.equal(snapshot.unauthorized_count_exposed, false);
    assert.equal(snapshot.hidden_field_names_exposed, false);
    assert.equal(snapshot.mutates_permission_policy, false);
    assert.equal(snapshot.writes_product_state, false);
    assert.equal(snapshot.writes_audit_event, false);
    assert.equal(snapshot.creates_database_rows, false);
    assert.equal(snapshot.persists_idempotency_keys, false);
    assert.equal(snapshot.acquires_locks, false);
    assert.equal(snapshot.executes_export_download, false);
    assert.equal(snapshot.executes_external_share, false);
    assert.equal(snapshot.executes_ai_retrieval, false);
    assert.equal(snapshot.grants_human_approval, false);
    assert.equal(snapshot.claude_ui_leak_prompt.executes_claude_review, false);
  }
});

test("CP00-117 evidence packets and handoff bind to H02/C02 and CP00-118", () => {
  const hermes = createPermissionKernelCp117HermesEvidencePacket();
  const claude = createPermissionKernelCp117ClaudeReviewPacket();
  const handoff = createPermissionKernelCp117CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-118");
  assert.equal(handoff.next_subphase_id, "RP02.P04.M06.S06");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-118 Risk C UI fixture and golden-case catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog();
  const manifest = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest();
  const coverage = validatePermissionKernelCp118Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P04.M06.S06");
  assert.equal(manifest.last_unit_id, "RP02.P05.M04.S07");
  assert.equal(manifest.area_counts.permission_ui_terminal_fixture_catalog, 85);
  assert.equal(manifest.area_counts.permission_fixture_golden_case_opening, 65);
  assert.equal(manifest.covered_micro_phase_count, 10);
  assert.equal(manifest.deliverable_counts.claude_review, 14);
  assert.equal(manifest.deliverable_counts.ui, 35);
  assert.equal(manifest.deliverable_counts.security_audit, 12);
  assert.equal(manifest.deliverable_counts.implementation, 37);
  assert.equal(manifest.deliverable_counts.fixture, 36);
  assert.equal(manifest.deliverable_counts.test, 10);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 6);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-118 fixture matrix inherits CP117 and keeps golden cases metadata-only", () => {
  const matrix = createPermissionKernelCp118UiSyntheticFixtureMatrix();
  const crossTenant = matrix.golden_cases.find((item) => item.case_id === "cross_tenant_case");
  const aiAnalytics = matrix.golden_cases.find((item) => item.case_id === "ai_retrieval_or_analytics_case");

  assert.equal(matrix.inherited_state_count, 3);
  assert.equal(matrix.ui_terminal_surface_count, 22);
  assert.equal(matrix.golden_case_count, 9);
  assert.equal(matrix.base_fixture_count, 4);
  assert.equal(crossTenant.tenant_drift_blocked, true);
  assert.equal(crossTenant.expected_effect, "deny");
  assert.equal(aiAnalytics.expected_effect, "blocked_reference_only");
  assert.equal(aiAnalytics.executes_ai_retrieval, false);
  assert.equal(aiAnalytics.executes_analytics_query, false);
});

test("CP00-118 matrix preserves no-write no-share no-AI and no-analytics boundaries", () => {
  const matrix = createPermissionKernelCp118UiSyntheticFixtureMatrix();
  const profiles = [...matrix.ui_terminal_surfaces, ...matrix.golden_cases, ...matrix.base_fixtures];

  assert.equal(profiles.length, 35);
  for (const profile of profiles) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.grants_human_approval, false);
  }
});

test("CP00-118 evidence packets and handoff bind to H02/C02 and CP00-119", () => {
  const hermes = createPermissionKernelCp118HermesEvidencePacket();
  const claude = createPermissionKernelCp118ClaudeReviewPacket();
  const handoff = createPermissionKernelCp118CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-119");
  assert.equal(handoff.next_subphase_id, "RP02.P05.M04.S08");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-119 Risk B fixture workflow binding catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp119FixtureWorkflowBindingCatalog();
  const manifest = createPermissionKernelCp119FixtureWorkflowBindingManifest();
  const coverage = validatePermissionKernelCp119Coverage();

  assert.equal(catalog.length, 40);
  assert.equal(manifest.covered_unit_count, 40);
  assert.equal(manifest.first_unit_id, "RP02.P05.M04.S08");
  assert.equal(manifest.last_unit_id, "RP02.P05.M06.S05");
  assert.equal(manifest.covered_micro_phase_count, 3);
  assert.equal(manifest.area_counts.permission_fixture_workflow_edge_cases, 13);
  assert.equal(manifest.area_counts.permission_fixture_permission_audit_binding, 22);
  assert.equal(manifest.area_counts.permission_fixture_synthetic_fixture_opening, 5);
  assert.equal(manifest.deliverable_counts.implementation, 14);
  assert.equal(manifest.deliverable_counts.security_audit, 4);
  assert.equal(manifest.deliverable_counts.fixture, 13);
  assert.equal(manifest.deliverable_counts.test, 6);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 2);
  assert.equal(manifest.deliverable_counts.claude_review, 1);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-119 workflow cases route denied cross-tenant missing-context trim and AI boundaries", () => {
  const matrix = createPermissionKernelCp119FixtureWorkflowMatrix();
  const cases = Object.fromEntries(matrix.workflow_cases.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_golden_case_count, 9);
  assert.equal(matrix.inherited_base_fixture_count, 4);
  assert.equal(matrix.workflow_case_count, 9);
  assert.equal(matrix.base_fixture_binding_count, 4);
  assert.equal(cases.primary_golden_case.status, "completed_metadata_only");
  assert.equal(cases.secondary_golden_case.reason, "object_acl_allow");
  assert.equal(cases.review_required_case.status, "review_required_routing");
  assert.equal(cases.denied_case.status, "blocked_claim_output");
  assert.equal(cases.cross_tenant_case.status, "blocked_before_permission_evaluation");
  assert.equal(cases.cross_tenant_case.reason, "tenant_boundary_precheck_failed");
  assert.equal(cases.missing_context_case.reason, "matter_trace_precheck_failed");
  assert.deepEqual(cases.security_trimming_case.trimmed_result_ids, ["d_cp119_document"]);
  assert.equal(cases.security_trimming_case.unauthorized_count_exposed, false);
  assert.equal(cases.ai_retrieval_or_analytics_case.status, "blocked_ai_analytics_boundary");
  assert.equal(cases.ai_retrieval_or_analytics_case.executes_ai_retrieval, false);
  assert.equal(cases.ai_retrieval_or_analytics_case.executes_analytics_query, false);
});

test("CP00-119 workflow helper preserves stable replay and no-write boundaries", () => {
  const denied = runPermissionKernelCp119FixtureWorkflowCase("denied_case");
  const unknown = runPermissionKernelCp119FixtureWorkflowCase("unknown_case");
  const profiles = [
    ...createPermissionKernelCp119FixtureWorkflowMatrix().workflow_cases,
    ...createPermissionKernelCp119FixtureWorkflowMatrix().base_fixture_bindings,
    denied,
    unknown,
  ];

  assert.equal(denied.stable_id, "cp119.denied_case");
  assert.equal(denied.stable_id_check.deterministic, true);
  assert.equal(denied.replay_persists_state, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  for (const profile of profiles) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-119 evidence packets and handoff bind to H02/C02 and CP00-120", () => {
  const hermes = createPermissionKernelCp119HermesEvidencePacket();
  const claude = createPermissionKernelCp119ClaudeReviewPacket();
  const handoff = createPermissionKernelCp119CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 40);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-120");
  assert.equal(handoff.next_subphase_id, "RP02.P05.M06.S06");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-120 Risk C fixture evidence and permission matrix catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog();
  const manifest = createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest();
  const coverage = validatePermissionKernelCp120Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P05.M06.S06");
  assert.equal(manifest.last_unit_id, "RP02.P06.M03.S14");
  assert.equal(manifest.covered_micro_phase_count, 9);
  assert.equal(manifest.area_counts.permission_fixture_evidence_review_closeout, 85);
  assert.equal(manifest.area_counts.permission_matrix_scope_inventory, 11);
  assert.equal(manifest.area_counts.permission_matrix_contract_draft, 20);
  assert.equal(manifest.area_counts.permission_matrix_type_shape_definition, 20);
  assert.equal(manifest.area_counts.permission_matrix_primary_implementation_opening, 14);
  assert.equal(manifest.deliverable_counts.fixture, 29);
  assert.equal(manifest.deliverable_counts.claude_review, 8);
  assert.equal(manifest.deliverable_counts.implementation, 59);
  assert.equal(manifest.deliverable_counts.security_audit, 22);
  assert.equal(manifest.deliverable_counts.test, 16);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 4);
  assert.equal(manifest.deliverable_counts.ui, 12);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-120 permission matrix routes sensitive decisions without unsafe execution", () => {
  const matrix = createPermissionKernelCp120FixtureEvidencePermissionMatrix();
  const bindings = Object.fromEntries(matrix.permission_decision_bindings.map((item) => [item.binding_id, item]));

  assert.equal(matrix.inherited_workflow_case_count, 9);
  assert.equal(matrix.inherited_base_fixture_binding_count, 4);
  assert.equal(matrix.fixture_evidence_record_count, 5);
  assert.equal(matrix.permission_decision_binding_count, 19);
  assert.equal(bindings.view_decision_binding.status, "completed_metadata_only");
  assert.deepEqual(bindings.search_decision_binding.trimmed_result_ids, ["d_cp120_document"]);
  assert.equal(bindings.mutation_decision_binding.status, "approval_required_routing");
  assert.equal(bindings.export_download_decision_binding.status, "review_required_routing");
  assert.equal(bindings.share_decision_binding.status, "approval_required_routing");
  assert.equal(bindings.ai_retrieval_decision_binding.status, "blocked_ai_retrieval_boundary");
  assert.equal(bindings.legal_hold_interaction.reason, "legal_hold");
  assert.equal(bindings.ethical_wall_interaction.reason, "ethical_wall");
  assert.equal(bindings.object_acl_interaction.reason, "object_acl_deny");
  assert.equal(bindings.review_required_route.status, "review_required_routing");
  assert.equal(bindings.approval_required_route.status, "approval_required_routing");
  assert.equal(bindings.deny_over_allow_check.decision.effect, "deny");
  assert.equal(bindings.audit_event_expectation.audit_event_expectation.emitted_to_audit_ledger, false);
  assert.equal(bindings.permission_fixture.permission_fixture.persisted, false);
});

test("CP00-120 decision binding helper preserves no-write, no-share, no-AI, and stable replay", () => {
  const exportDecision = runPermissionKernelCp120PermissionDecisionBinding("export_download_decision_binding");
  const unknown = runPermissionKernelCp120PermissionDecisionBinding("unknown_binding");
  const profiles = [
    ...createPermissionKernelCp120FixtureEvidencePermissionMatrix().fixture_evidence_records,
    ...createPermissionKernelCp120FixtureEvidencePermissionMatrix().permission_decision_bindings,
    exportDecision,
    unknown,
  ];

  assert.equal(exportDecision.stable_id, "cp120.export_download_decision_binding");
  assert.equal(exportDecision.stable_id_check.deterministic, true);
  assert.equal(exportDecision.executes_export_download, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  for (const profile of profiles) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-120 evidence packets and handoff bind to H02/C02 and CP00-121", () => {
  const hermes = createPermissionKernelCp120HermesEvidencePacket();
  const claude = createPermissionKernelCp120ClaudeReviewPacket();
  const handoff = createPermissionKernelCp120CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-121");
  assert.equal(handoff.next_subphase_id, "RP02.P06.M03.S15");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-121 Risk A permission matrix boundary catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog();
  const manifest = createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest();
  const coverage = validatePermissionKernelCp121Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P06.M03.S15");
  assert.equal(manifest.last_unit_id, "RP02.P06.M04.S02");
  assert.equal(manifest.covered_micro_phase_count, 2);
  assert.equal(manifest.phase_counts["RP02.P06.M03"], 8);
  assert.equal(manifest.phase_counts["RP02.P06.M04"], 2);
  assert.equal(manifest.deliverable_counts.ui, 1);
  assert.equal(manifest.deliverable_counts.security_audit, 4);
  assert.equal(manifest.deliverable_counts.test, 4);
  assert.equal(manifest.deliverable_counts.implementation, 1);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-121 boundary cases enforce approval trim audit fixture and decision routes", () => {
  const matrix = createPermissionKernelCp121PermissionMatrixRiskBoundary();
  const cases = Object.fromEntries(matrix.boundary_case_results.map((item) => [item.boundary_case_id, item]));

  assert.equal(matrix.inherited_permission_decision_binding_count, 19);
  assert.equal(matrix.inherited_approval_route_status, "approval_required_routing");
  assert.equal(matrix.boundary_case_count, 10);
  assert.equal(cases.approval_required_route.status, "approval_required_routing");
  assert.equal(cases.approval_required_route.grants_human_approval, false);
  assert.deepEqual(cases.security_trimming_proof.trimmed_result_ids, ["d_cp121_document"]);
  assert.equal(cases.security_trimming_proof.rendered_result_count, 1);
  assert.equal(cases.security_trimming_proof.hidden_fields_rendered, false);
  assert.equal(cases.audit_event_expectation.audit_event_expectation.emitted_to_audit_ledger, false);
  assert.equal(cases.permission_fixture.permission_fixture.persisted, false);
  assert.equal(cases.allowed_test.decision.effect, "allow");
  assert.equal(cases.denied_test.decision.effect, "deny");
  assert.equal(cases.cross_tenant_test.reason, "cross_tenant_deny");
  assert.equal(cases.cross_tenant_test.decision.audit_hint.object_id, "redacted_cross_tenant_object");
  assert.equal(cases.leak_prevention_test.unauthorized_count_exposed, false);
  assert.equal(cases.leak_prevention_test.hidden_field_names_exposed, false);
  assert.equal(cases.permission_matrix_row.matrix_row.persisted, false);
  assert.equal(cases.view_decision_binding.status, "completed_metadata_only");
  assert.equal(cases.view_decision_binding.matched_rule_id, "cp121_allow_view");
});

test("CP00-121 helper preserves no-write no-leak stable replay boundaries", () => {
  const approval = runPermissionKernelCp121PermissionMatrixBoundaryCase("approval_required_route");
  const unknown = runPermissionKernelCp121PermissionMatrixBoundaryCase("unknown_boundary");
  const profiles = [
    ...createPermissionKernelCp121PermissionMatrixRiskBoundary().boundary_case_results,
    approval,
    unknown,
  ];

  assert.equal(approval.stable_id, "cp121.approval_required_route");
  assert.equal(approval.stable_id_check.deterministic, true);
  assert.equal(approval.grants_human_approval, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  for (const profile of profiles) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-121 evidence packets and handoff bind to H02/C02 and CP00-122", () => {
  const hermes = createPermissionKernelCp121HermesEvidencePacket();
  const claude = createPermissionKernelCp121ClaudeReviewPacket();
  const handoff = createPermissionKernelCp121CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-122");
  assert.equal(handoff.next_subphase_id, "RP02.P06.M04.S03");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-122 Risk B permission matrix workflow catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog();
  const manifest = createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest();
  const coverage = validatePermissionKernelCp122Coverage();

  assert.equal(catalog.length, 40);
  assert.equal(manifest.covered_unit_count, 40);
  assert.equal(manifest.first_unit_id, "RP02.P06.M04.S03");
  assert.equal(manifest.last_unit_id, "RP02.P06.M05.S20");
  assert.equal(manifest.covered_micro_phase_count, 2);
  assert.equal(manifest.phase_counts["RP02.P06.M04"], 20);
  assert.equal(manifest.phase_counts["RP02.P06.M05"], 20);
  assert.equal(manifest.area_counts.permission_matrix_secondary_workflow, 20);
  assert.equal(manifest.area_counts.permission_matrix_permission_audit_binding, 20);
  assert.equal(manifest.deliverable_counts.implementation, 15);
  assert.equal(manifest.deliverable_counts.security_audit, 9);
  assert.equal(manifest.deliverable_counts.ui, 8);
  assert.equal(manifest.deliverable_counts.claude_review, 2);
  assert.equal(manifest.deliverable_counts.test, 6);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-122 workflow routes sensitive permission matrix decisions without execution", () => {
  const matrix = createPermissionKernelCp122PermissionMatrixWorkflowBinding();
  const cases = Object.fromEntries(matrix.workflow_case_results.map((item) => [item.workflow_case_id, item]));

  assert.equal(matrix.inherited_boundary_case_count, 10);
  assert.equal(matrix.inherited_approval_route_status, "approval_required_routing");
  assert.equal(matrix.workflow_case_count, 40);
  assert.equal(matrix.phase_result_counts.secondary_workflow, 20);
  assert.equal(matrix.phase_result_counts.permission_audit_binding, 20);
  for (const prefix of ["secondary_workflow", "permission_audit_binding"]) {
    assert.deepEqual(cases[`${prefix}.search_decision_binding`].trimmed_result_ids, ["d_cp122_document"]);
    assert.equal(cases[`${prefix}.mutation_decision_binding`].status, "approval_required_routing");
    assert.equal(cases[`${prefix}.export_download_decision_binding`].status, "review_required_routing");
    assert.equal(cases[`${prefix}.share_decision_binding`].status, "approval_required_routing");
    assert.equal(cases[`${prefix}.ai_retrieval_decision_binding`].status, "blocked_ai_retrieval_boundary");
    assert.equal(cases[`${prefix}.audit_hint_fields`].audit_event_expectation.emitted_to_audit_ledger, false);
    assert.equal(cases[`${prefix}.matched_rule_capture`].decision.effect, "allow");
    assert.equal(cases[`${prefix}.deny_over_allow_check`].decision.effect, "deny");
    assert.equal(cases[`${prefix}.legal_hold_interaction`].reason, "legal_hold");
    assert.equal(cases[`${prefix}.ethical_wall_interaction`].reason, "ethical_wall");
    assert.equal(cases[`${prefix}.object_acl_interaction`].reason, "object_acl_deny");
    assert.equal(cases[`${prefix}.review_required_route`].status, "review_required_routing");
    assert.equal(cases[`${prefix}.approval_required_route`].status, "approval_required_routing");
    assert.deepEqual(cases[`${prefix}.security_trimming_proof`].trimmed_result_ids, ["d_cp122_document"]);
    assert.equal(cases[`${prefix}.audit_event_expectation`].audit_event_expectation.emitted_to_audit_ledger, false);
    assert.equal(cases[`${prefix}.permission_fixture`].permission_fixture.persisted, false);
    assert.equal(cases[`${prefix}.allowed_test`].decision.effect, "allow");
    assert.equal(cases[`${prefix}.denied_test`].decision.effect, "deny");
  }
  assert.equal(cases["secondary_workflow.cross_tenant_test"].reason, "cross_tenant_deny");
  assert.equal(cases["secondary_workflow.leak_prevention_test"].hidden_field_names_exposed, false);
});

test("CP00-122 helper preserves no-write no-leak stable replay boundaries", () => {
  const exportCase = runPermissionKernelCp122PermissionMatrixWorkflowCase("secondary_workflow.export_download_decision_binding");
  const unknown = runPermissionKernelCp122PermissionMatrixWorkflowCase("unknown_workflow");
  const profiles = [
    ...createPermissionKernelCp122PermissionMatrixWorkflowBinding().workflow_case_results,
    exportCase,
    unknown,
  ];

  assert.equal(exportCase.stable_id, "cp122.secondary_workflow.export_download_decision_binding");
  assert.equal(exportCase.stable_id_check.deterministic, true);
  assert.equal(exportCase.executes_export_download, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  for (const profile of profiles) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-122 evidence packets and handoff bind to H02/C02 and CP00-123", () => {
  const hermes = createPermissionKernelCp122HermesEvidencePacket();
  const claude = createPermissionKernelCp122ClaudeReviewPacket();
  const handoff = createPermissionKernelCp122CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 40);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-123");
  assert.equal(handoff.next_subphase_id, "RP02.P06.M05.S21");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-123 Risk A permission audit terminal catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog();
  const manifest = createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest();
  const coverage = validatePermissionKernelCp123Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P06.M05.S21");
  assert.equal(manifest.last_unit_id, "RP02.P06.M06.S08");
  assert.equal(manifest.covered_micro_phase_count, 2);
  assert.equal(manifest.phase_counts["RP02.P06.M05"], 2);
  assert.equal(manifest.phase_counts["RP02.P06.M06"], 8);
  assert.equal(manifest.area_counts.permission_matrix_permission_audit_terminal, 2);
  assert.equal(manifest.area_counts.permission_matrix_synthetic_fixture_opening, 8);
  assert.equal(manifest.deliverable_counts.test, 2);
  assert.equal(manifest.deliverable_counts.security_audit, 2);
  assert.equal(manifest.deliverable_counts.implementation, 6);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-123 terminal cases enforce cross-tenant leak and fixture opening routes", () => {
  const matrix = createPermissionKernelCp123PermissionAuditTerminalBoundary();
  const cases = Object.fromEntries(matrix.boundary_case_results.map((item) => [item.boundary_case_id, item]));

  assert.equal(matrix.inherited_workflow_case_count, 40);
  assert.equal(matrix.inherited_leak_prevention_status, "security_trimmed_before_display");
  assert.equal(matrix.boundary_case_count, 10);
  assert.equal(cases.permission_audit_cross_tenant_test.reason, "cross_tenant_deny");
  assert.equal(cases.permission_audit_cross_tenant_test.decision.audit_hint.object_id, "redacted_cross_tenant_object");
  assert.deepEqual(cases.permission_audit_leak_prevention_test.trimmed_result_ids, ["d_cp123_document"]);
  assert.equal(cases.permission_audit_leak_prevention_test.hidden_fields_rendered, false);
  assert.equal(cases.permission_audit_leak_prevention_test.unauthorized_count_exposed, false);
  assert.equal(cases.synthetic_fixture_permission_matrix_row.matrix_row.persisted, false);
  assert.equal(cases.synthetic_fixture_view_decision_binding.status, "completed_metadata_only");
  assert.deepEqual(cases.synthetic_fixture_search_decision_binding.trimmed_result_ids, ["d_cp123_document"]);
  assert.equal(cases.synthetic_fixture_mutation_decision_binding.status, "approval_required_routing");
  assert.equal(cases.synthetic_fixture_mutation_decision_binding.grants_human_approval, false);
  assert.equal(cases.synthetic_fixture_export_download_decision_binding.status, "review_required_routing");
  assert.equal(cases.synthetic_fixture_export_download_decision_binding.executes_export_download, false);
  assert.equal(cases.synthetic_fixture_share_decision_binding.status, "approval_required_routing");
  assert.equal(cases.synthetic_fixture_share_decision_binding.executes_external_share, false);
  assert.equal(cases.synthetic_fixture_ai_retrieval_decision_binding.status, "blocked_ai_retrieval_boundary");
  assert.equal(cases.synthetic_fixture_ai_retrieval_decision_binding.executes_ai_retrieval, false);
  assert.equal(cases.synthetic_fixture_audit_hint_fields.audit_event_expectation.emitted_to_audit_ledger, false);
});

test("CP00-123 helper preserves no-write no-leak stable replay boundaries", () => {
  const exportCase = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_export_download_decision_binding");
  const unknown = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("unknown_boundary");
  const profiles = [
    ...createPermissionKernelCp123PermissionAuditTerminalBoundary().boundary_case_results,
    exportCase,
    unknown,
  ];

  assert.equal(exportCase.stable_id, "cp123.synthetic_fixture_export_download_decision_binding");
  assert.equal(exportCase.stable_id_check.deterministic, true);
  assert.equal(exportCase.executes_export_download, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  for (const profile of profiles) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-123 evidence packets and handoff bind to H02/C02 and CP00-124", () => {
  const hermes = createPermissionKernelCp123HermesEvidencePacket();
  const claude = createPermissionKernelCp123ClaudeReviewPacket();
  const handoff = createPermissionKernelCp123CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-124");
  assert.equal(handoff.next_subphase_id, "RP02.P06.M06.S09");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-124 Risk C permission fixture and failure taxonomy catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog();
  const manifest = createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest();
  const coverage = validatePermissionKernelCp124Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P06.M06.S09");
  assert.equal(manifest.last_unit_id, "RP02.P07.M03.S10");
  assert.equal(manifest.covered_micro_phase_count, 9);
  assert.equal(manifest.domain_counts.permission_matrix, 89);
  assert.equal(manifest.domain_counts.failure_taxonomy, 61);
  assert.equal(manifest.phase_counts["RP02.P06.M06"], 14);
  assert.equal(manifest.phase_counts["RP02.P06.M07"], 22);
  assert.equal(manifest.phase_counts["RP02.P06.M08"], 22);
  assert.equal(manifest.phase_counts["RP02.P06.M09"], 20);
  assert.equal(manifest.phase_counts["RP02.P06.M10"], 11);
  assert.equal(manifest.phase_counts["RP02.P07.M00"], 11);
  assert.equal(manifest.phase_counts["RP02.P07.M01"], 20);
  assert.equal(manifest.phase_counts["RP02.P07.M02"], 20);
  assert.equal(manifest.phase_counts["RP02.P07.M03"], 10);
  assert.equal(manifest.deliverable_counts.implementation, 36);
  assert.equal(manifest.deliverable_counts.ui, 17);
  assert.equal(manifest.deliverable_counts.claude_review, 4);
  assert.equal(manifest.deliverable_counts.security_audit, 26);
  assert.equal(manifest.deliverable_counts.test, 18);
  assert.equal(manifest.deliverable_counts.failure_recovery, 43);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 4);
  assert.equal(manifest.deliverable_counts.fixture, 2);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-124 permission matrix terminal cases route without unsafe execution", () => {
  const matrix = createPermissionKernelCp124PermissionFixtureFailureTaxonomy();
  const cases = Object.fromEntries(matrix.permission_matrix_case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_terminal_boundary_case_count, 10);
  assert.equal(matrix.inherited_cross_tenant_reason, "cross_tenant_deny");
  assert.equal(matrix.permission_matrix_case_count, 89);
  assert.equal(cases["synthetic_fixture_terminal.matched_rule_capture"].decision.effect, "allow");
  assert.equal(cases["synthetic_fixture_terminal.deny_over_allow_check"].decision.effect, "deny");
  assert.equal(cases["synthetic_fixture_terminal.legal_hold_interaction"].reason, "legal_hold");
  assert.equal(cases["test_golden_case_set.cross_tenant_test"].decision.audit_hint.object_id, "redacted_cross_tenant_object");
  assert.deepEqual(cases["test_golden_case_set.leak_prevention_test"].trimmed_result_ids, ["d_cp124_document"]);
  assert.equal(cases["hermes_evidence_packet.security_trimming_proof"].hidden_fields_rendered, false);
  assert.equal(cases["claude_review_packet.review_required_route"].status, "review_required_routing");
  assert.equal(cases["claude_review_packet.review_required_route"].executes_claude_review, false);
  assert.equal(cases["claude_review_packet.approval_required_route"].status, "approval_required_routing");
  assert.equal(cases["claude_review_packet.approval_required_route"].grants_human_approval, false);
  assert.equal(cases["hermes_evidence_packet.ai_retrieval_decision_binding"].status, "blocked_ai_retrieval_boundary");
  assert.equal(cases["hermes_evidence_packet.ai_retrieval_decision_binding"].executes_ai_retrieval, false);
  assert.equal(cases["hermes_evidence_packet.export_download_decision_binding"].executes_export_download, false);
  assert.equal(cases["hermes_evidence_packet.share_decision_binding"].executes_external_share, false);
  assert.equal(cases["closeout_next_handoff.audit_hint_fields"].audit_event_expectation.emitted_to_audit_ledger, false);
});

test("CP00-124 failure taxonomy cases fail closed without locks retry rollback or audit writes", () => {
  const matrix = createPermissionKernelCp124PermissionFixtureFailureTaxonomy();
  const cases = Object.fromEntries(matrix.failure_taxonomy_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.failure_taxonomy_result_count, 61);
  assert.equal(cases["failure_scope_inventory.missing_tenant_failure"].status, "blocked_missing_tenant");
  assert.equal(cases["failure_scope_inventory.cross_tenant_failure"].blocked_claim_receipt.preview_only, true);
  assert.equal(cases["failure_contract_draft.retry_exhaustion_failure"].retry_policy.retry_executed, false);
  assert.equal(cases["failure_contract_draft.retry_exhaustion_failure"].executes_retry, false);
  assert.equal(cases["failure_contract_draft.rollback_expectation"].rollback_policy.rollback_executed, false);
  assert.equal(cases["failure_contract_draft.rollback_expectation"].executes_rollback, false);
  assert.equal(cases["failure_type_shape_definition.lock_conflict_failure"].lock_policy.lock_acquired, false);
  assert.equal(cases["failure_type_shape_definition.lock_conflict_failure"].acquires_locks, false);
  assert.equal(cases["failure_type_shape_definition.blocked_claim_receipt"].blocked_claim_receipt.preview_only, true);
  assert.equal(cases["failure_type_shape_definition.audit_failure_hint"].audit_failure_hint.emitted_to_audit_ledger, false);
  assert.equal(cases["failure_type_shape_definition.hermes_failure_evidence"].hermes_failure_evidence.reference_only, true);
  for (const profile of matrix.failure_taxonomy_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-124 evidence packets and handoff bind to H02/C02 and CP00-125", () => {
  const unknown = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("unknown_case");
  const hermes = createPermissionKernelCp124HermesEvidencePacket();
  const claude = createPermissionKernelCp124ClaudeReviewPacket();
  const handoff = createPermissionKernelCp124CloseoutHandoff();

  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-125");
  assert.equal(handoff.next_subphase_id, "RP02.P07.M03.S11");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-125 Risk A failure taxonomy boundary catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog();
  const manifest = createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest();
  const coverage = validatePermissionKernelCp125Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P07.M03.S11");
  assert.equal(manifest.last_unit_id, "RP02.P07.M03.S20");
  assert.equal(manifest.covered_micro_phase_count, 1);
  assert.equal(manifest.domain_counts.failure_taxonomy, 10);
  assert.equal(manifest.phase_counts["RP02.P07.M03"], 10);
  assert.equal(manifest.deliverable_counts.failure_recovery, 3);
  assert.equal(manifest.deliverable_counts.implementation, 1);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 2);
  assert.equal(manifest.deliverable_counts.fixture, 1);
  assert.equal(manifest.deliverable_counts.test, 2);
  assert.equal(manifest.deliverable_counts.security_audit, 1);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-125 terminal failure taxonomy cases block lock retry rollback and compensation execution", () => {
  const matrix = createPermissionKernelCp125FailureTaxonomyRiskBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_failure_taxonomy_result_count, 61);
  assert.equal(matrix.inherited_lock_conflict_status, "blocked_lock_conflict");
  assert.equal(matrix.inherited_retry_exhaustion_status, "retry_exhausted_no_retry_execution");
  assert.equal(matrix.result_count, 10);
  assert.equal(cases["failure_taxonomy_risk_boundary.lock_conflict_failure"].status, "blocked_lock_conflict");
  assert.equal(cases["failure_taxonomy_risk_boundary.lock_conflict_failure"].lock_policy.lock_acquired, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.lock_conflict_failure"].lock_policy.lock_token_persisted, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.lock_conflict_failure"].acquires_locks, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.lock_conflict_failure"].persists_lock_tokens, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.retry_exhaustion_failure"].status, "retry_exhausted_no_retry_execution");
  assert.equal(cases["failure_taxonomy_risk_boundary.retry_exhaustion_failure"].retry_policy.retry_executed, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.retry_exhaustion_failure"].executes_retry, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.rollback_expectation"].rollback_policy.rollback_expected, true);
  assert.equal(cases["failure_taxonomy_risk_boundary.rollback_expectation"].rollback_policy.rollback_executed, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.rollback_expectation"].executes_rollback, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.compensation_expectation"].compensation_policy.compensation_expected, true);
  assert.equal(cases["failure_taxonomy_risk_boundary.compensation_expectation"].compensation_policy.compensation_executed, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.compensation_expectation"].executes_compensation, false);
});

test("CP00-125 receipts fixtures tests audit hints and Hermes evidence remain preview-only", () => {
  const matrix = createPermissionKernelCp125FailureTaxonomyRiskBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("unknown_case");

  assert.equal(cases["failure_taxonomy_risk_boundary.blocked_claim_receipt"].blocked_claim_receipt.preview_only, true);
  assert.equal(cases["failure_taxonomy_risk_boundary.blocked_claim_receipt"].blocked_claim_receipt.emitted_to_hermes_runtime, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.failure_fixture"].failure_fixture.contains_real_data, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.failure_unit_test"].failure_test_binding.deterministic, true);
  assert.equal(cases["failure_taxonomy_risk_boundary.failure_integration_smoke"].failure_test_binding.integration_smoke_bound, true);
  assert.equal(cases["failure_taxonomy_risk_boundary.audit_failure_hint"].audit_failure_hint.emitted_to_audit_ledger, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.audit_failure_hint"].audit_failure_hint.hidden_fields_rendered, false);
  assert.equal(cases["failure_taxonomy_risk_boundary.hermes_failure_evidence"].hermes_failure_evidence.reference_only, true);
  assert.equal(cases["failure_taxonomy_risk_boundary.hermes_failure_evidence"].hermes_failure_evidence.writes_hermes_runtime, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-125 evidence packets and handoff bind to H02/C02 and CP00-126", () => {
  const hermes = createPermissionKernelCp125HermesEvidencePacket();
  const claude = createPermissionKernelCp125ClaudeReviewPacket();
  const handoff = createPermissionKernelCp125CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-126");
  assert.equal(handoff.next_subphase_id, "RP02.P07.M03.S21");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-126 Risk B failure taxonomy workflow binding catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog();
  const manifest = createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest();
  const coverage = validatePermissionKernelCp126Coverage();

  assert.equal(catalog.length, 40);
  assert.equal(manifest.covered_unit_count, 40);
  assert.equal(manifest.first_unit_id, "RP02.P07.M03.S21");
  assert.equal(manifest.last_unit_id, "RP02.P07.M05.S16");
  assert.equal(manifest.covered_micro_phase_count, 3);
  assert.equal(manifest.phase_counts["RP02.P07.M03"], 2);
  assert.equal(manifest.phase_counts["RP02.P07.M04"], 22);
  assert.equal(manifest.phase_counts["RP02.P07.M05"], 16);
  assert.equal(manifest.domain_counts.review_escalation, 2);
  assert.equal(manifest.domain_counts.failure_taxonomy, 22);
  assert.equal(manifest.domain_counts.permission_audit_binding, 16);
  assert.equal(manifest.deliverable_counts.failure_recovery, 24);
  assert.equal(manifest.deliverable_counts.implementation, 4);
  assert.equal(manifest.deliverable_counts.security_audit, 3);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 3);
  assert.equal(manifest.deliverable_counts.fixture, 2);
  assert.equal(manifest.deliverable_counts.test, 2);
  assert.equal(manifest.deliverable_counts.claude_review, 2);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-126 workflow cases bind prompts escalation and failures without execution", () => {
  const matrix = createPermissionKernelCp126FailureTaxonomyWorkflowBinding();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_failure_boundary_result_count, 10);
  assert.equal(matrix.inherited_lock_conflict_status, "blocked_lock_conflict");
  assert.equal(matrix.inherited_hermes_failure_reference_only, true);
  assert.equal(matrix.result_count, 40);
  assert.equal(matrix.review_escalation_result_count, 2);
  assert.equal(matrix.secondary_workflow_result_count, 22);
  assert.equal(matrix.permission_audit_binding_result_count, 16);
  assert.equal(cases["primary_review_escalation.claude_edge_case_prompt"].status, "claude_edge_case_prompt_bound");
  assert.equal(cases["primary_review_escalation.claude_edge_case_prompt"].claude_edge_case_prompt.read_only, true);
  assert.equal(cases["primary_review_escalation.claude_edge_case_prompt"].claude_edge_case_prompt.executes_claude_review, false);
  assert.equal(cases["primary_review_escalation.human_escalation_note"].status, "human_escalation_note_bound");
  assert.equal(cases["primary_review_escalation.human_escalation_note"].human_escalation_note.grants_human_approval, false);
  assert.equal(cases["secondary_workflow.missing_tenant_failure"].status, "blocked_missing_tenant");
  assert.equal(cases["secondary_workflow.cross_tenant_failure"].permission_audit_binding.cross_tenant_denied, true);
  assert.equal(cases["secondary_workflow.lock_conflict_failure"].lock_policy.lock_acquired, false);
  assert.equal(cases["secondary_workflow.retry_exhaustion_failure"].retry_policy.retry_executed, false);
  assert.equal(cases["secondary_workflow.rollback_expectation"].rollback_policy.rollback_executed, false);
  assert.equal(cases["secondary_workflow.compensation_expectation"].compensation_policy.compensation_executed, false);
  assert.equal(cases["secondary_workflow.blocked_claim_receipt"].blocked_claim_receipt.preview_only, true);
});

test("CP00-126 permission audit bindings and evidence references stay no-write", () => {
  const matrix = createPermissionKernelCp126FailureTaxonomyWorkflowBinding();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("unknown_case");

  assert.equal(cases["secondary_workflow.audit_failure_hint"].audit_failure_hint.emitted_to_audit_ledger, false);
  assert.equal(cases["secondary_workflow.hermes_failure_evidence"].hermes_failure_evidence.writes_hermes_runtime, false);
  assert.equal(cases["permission_audit_binding.permission_denied_failure"].permission_audit_binding.permission_denied, true);
  assert.equal(cases["permission_audit_binding.permission_denied_failure"].permission_audit_binding.emitted_to_audit_ledger, false);
  assert.equal(cases["permission_audit_binding.failure_fixture"].failure_fixture.contains_real_data, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-126 evidence packets and handoff bind to H02/C02 and CP00-127", () => {
  const hermes = createPermissionKernelCp126HermesEvidencePacket();
  const claude = createPermissionKernelCp126ClaudeReviewPacket();
  const handoff = createPermissionKernelCp126CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 40);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-127");
  assert.equal(handoff.next_subphase_id, "RP02.P07.M05.S17");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-127 Risk A failure taxonomy test fixture boundary catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog();
  const manifest = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest();
  const coverage = validatePermissionKernelCp127Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P07.M05.S17");
  assert.equal(manifest.last_unit_id, "RP02.P07.M06.S04");
  assert.equal(manifest.covered_micro_phase_count, 2);
  assert.equal(manifest.phase_counts["RP02.P07.M05"], 6);
  assert.equal(manifest.phase_counts["RP02.P07.M06"], 4);
  assert.equal(manifest.domain_counts.permission_audit_test_evidence, 6);
  assert.equal(manifest.domain_counts.synthetic_fixture_boundary, 4);
  assert.equal(manifest.deliverable_counts.test, 2);
  assert.equal(manifest.deliverable_counts.security_audit, 1);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 1);
  assert.equal(manifest.deliverable_counts.claude_review, 1);
  assert.equal(manifest.deliverable_counts.implementation, 1);
  assert.equal(manifest.deliverable_counts.failure_recovery, 4);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-127 inherits CP126 and binds permission audit tests and evidence references", () => {
  const matrix = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_workflow_result_count, 40);
  assert.equal(matrix.inherited_permission_audit_unit_test_bound, true);
  assert.equal(matrix.inherited_hermes_failure_reference_only, true);
  assert.equal(matrix.result_count, 10);
  assert.equal(matrix.permission_audit_test_evidence_result_count, 6);
  assert.equal(matrix.synthetic_fixture_boundary_result_count, 4);
  assert.equal(cases["permission_audit_test_evidence.failure_unit_test"].permission_audit_test_evidence.unit_test_bound, true);
  assert.equal(cases["permission_audit_test_evidence.failure_unit_test"].permission_audit_test_evidence.deterministic, true);
  assert.equal(cases["permission_audit_test_evidence.failure_unit_test"].permission_audit_test_evidence.persisted, false);
  assert.equal(
    cases["permission_audit_test_evidence.failure_integration_smoke"].permission_audit_test_evidence.integration_smoke_bound,
    true,
  );
  assert.equal(cases["permission_audit_test_evidence.audit_failure_hint"].audit_failure_hint.emitted_to_audit_ledger, false);
  assert.equal(cases["permission_audit_test_evidence.hermes_failure_evidence"].hermes_failure_evidence.reference_only, true);
  assert.equal(cases["permission_audit_test_evidence.hermes_failure_evidence"].hermes_failure_evidence.writes_hermes_runtime, false);
  assert.equal(cases["permission_audit_test_evidence.claude_edge_case_prompt"].claude_edge_case_prompt.executes_claude_review, false);
  assert.equal(cases["permission_audit_test_evidence.human_escalation_note"].human_escalation_note.grants_human_approval, false);
});

test("CP00-127 synthetic fixture opening fails closed and remains no-write", () => {
  const matrix = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase("unknown_case");

  assert.equal(cases["synthetic_fixture_opening.failure_taxonomy"].status, "failure_taxonomy_synthetic_fixture_bound");
  assert.equal(cases["synthetic_fixture_opening.failure_taxonomy"].synthetic_fixture_boundary.fixture_contains_real_data, false);
  assert.equal(cases["synthetic_fixture_opening.failure_taxonomy"].synthetic_fixture_boundary.fixture_persisted, false);
  assert.equal(cases["synthetic_fixture_opening.missing_tenant_failure"].synthetic_fixture_boundary.missing_tenant_denied, true);
  assert.equal(cases["synthetic_fixture_opening.missing_actor_failure"].synthetic_fixture_boundary.missing_actor_denied, true);
  assert.equal(cases["synthetic_fixture_opening.missing_matter_failure"].synthetic_fixture_boundary.missing_matter_denied, true);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-127 evidence packets and handoff bind to H02/C02 and CP00-128", () => {
  const hermes = createPermissionKernelCp127HermesEvidencePacket();
  const claude = createPermissionKernelCp127ClaudeReviewPacket();
  const handoff = createPermissionKernelCp127CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-128");
  assert.equal(handoff.next_subphase_id, "RP02.P07.M06.S05");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-128 Risk C failure taxonomy evidence harness catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog();
  const manifest = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest();
  const coverage = validatePermissionKernelCp128Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P07.M06.S05");
  assert.equal(manifest.last_unit_id, "RP02.P08.M03.S21");
  assert.equal(manifest.covered_micro_phase_count, 9);
  assert.equal(manifest.phase_counts["RP02.P07.M06"], 18);
  assert.equal(manifest.phase_counts["RP02.P07.M07"], 22);
  assert.equal(manifest.phase_counts["RP02.P07.M08"], 22);
  assert.equal(manifest.phase_counts["RP02.P07.M09"], 20);
  assert.equal(manifest.phase_counts["RP02.P07.M10"], 11);
  assert.equal(manifest.phase_counts["RP02.P08.M00"], 8);
  assert.equal(manifest.phase_counts["RP02.P08.M01"], 8);
  assert.equal(manifest.phase_counts["RP02.P08.M02"], 20);
  assert.equal(manifest.phase_counts["RP02.P08.M03"], 21);
  assert.equal(manifest.deliverable_counts.failure_recovery, 54);
  assert.equal(manifest.deliverable_counts.security_audit, 9);
  assert.equal(manifest.deliverable_counts.implementation, 24);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 44);
  assert.equal(manifest.deliverable_counts.fixture, 4);
  assert.equal(manifest.deliverable_counts.test, 10);
  assert.equal(manifest.deliverable_counts.claude_review, 5);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-128 inherits CP127 and binds failure taxonomy and test golden rows", () => {
  const matrix = createPermissionKernelCp128FailureTaxonomyEvidenceHarness();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_test_fixture_result_count, 10);
  assert.equal(matrix.inherited_missing_tenant_denied, true);
  assert.equal(matrix.inherited_claude_prompt_not_executed, true);
  assert.equal(matrix.inherited_hermes_failure_reference_only, true);
  assert.equal(matrix.result_count, 150);
  assert.equal(matrix.synthetic_fixture_terminal_result_count, 18);
  assert.equal(matrix.test_golden_case_result_count, 22);
  assert.equal(cases["synthetic_fixture_terminal.missing_resource_failure"].failure_taxonomy_profile.missing_resource_denied, true);
  assert.equal(cases["synthetic_fixture_terminal.cross_tenant_failure"].failure_taxonomy_profile.cross_tenant_denied, true);
  assert.equal(cases["synthetic_fixture_terminal.lock_conflict_failure"].acquires_locks, false);
  assert.equal(cases["synthetic_fixture_terminal.retry_exhaustion_failure"].executes_retry, false);
  assert.equal(cases["test_golden_case_set.failure_unit_test"].test_golden_case.failure_unit_test_bound, true);
  assert.equal(cases["test_golden_case_set.failure_unit_test"].test_golden_case.deterministic, true);
  assert.equal(cases["test_golden_case_set.failure_unit_test"].test_golden_case.persisted, false);
  assert.equal(cases["test_golden_case_set.failure_integration_smoke"].test_golden_case.integration_smoke_bound, true);
});

test("CP00-128 Hermes Claude and closeout harness rows stay reference-only", () => {
  const matrix = createPermissionKernelCp128FailureTaxonomyEvidenceHarness();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("unknown_case");

  assert.equal(matrix.hermes_evidence_packet_result_count, 22);
  assert.equal(matrix.claude_review_packet_result_count, 20);
  assert.equal(matrix.closeout_next_handoff_result_count, 11);
  assert.equal(matrix.p08_evidence_result_count, 57);
  assert.equal(cases["hermes_evidence_packet.hermes_failure_evidence"].hermes_evidence_packet.reference_only, true);
  assert.equal(cases["hermes_evidence_packet.hermes_failure_evidence"].hermes_evidence_packet.writes_hermes_runtime, false);
  assert.equal(cases["type_shape_definition.claude_dependency_marker"].claude_review_packet.dependency_marker_bound, true);
  assert.equal(cases["type_shape_definition.claude_dependency_marker"].claude_review_packet.executes_claude_review, false);
  assert.equal(cases["closeout_next_handoff.lock_conflict_failure"].acquires_locks, false);
  assert.equal(cases["scope_inventory.hermes_command_matrix"].hermes_evidence_packet.command_matrix_bound, true);
  assert.equal(cases["contract_draft.evidence_field_list"].hermes_evidence_packet.evidence_field_list_bound, true);
  assert.equal(cases["type_shape_definition.pass_semantics"].verdict_semantics.pass_bound, true);
  assert.equal(cases["type_shape_definition.block_semantics"].verdict_semantics.block_prevents_production_ready, true);
  assert.equal(cases["type_shape_definition.regression_receipt"].test_golden_case.regression_receipt_bound, true);
  assert.equal(cases["primary_implementation_slice.documentation_update"].closeout_handoff.documentation_update_bound, true);
  assert.equal(cases["primary_implementation_slice.next_gate_readiness"].closeout_handoff.next_gate_readiness_bound, true);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-128 evidence packets and handoff bind to H02/C02 and CP00-129", () => {
  const hermes = createPermissionKernelCp128HermesEvidencePacket();
  const claude = createPermissionKernelCp128ClaudeReviewPacket();
  const handoff = createPermissionKernelCp128CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-129");
  assert.equal(handoff.next_subphase_id, "RP02.P08.M03.S22");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-129 Risk B Hermes evidence workflow binding catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog();
  const manifest = createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest();
  const coverage = validatePermissionKernelCp129Coverage();

  assert.equal(catalog.length, 40);
  assert.equal(manifest.covered_unit_count, 40);
  assert.equal(manifest.first_unit_id, "RP02.P08.M03.S22");
  assert.equal(manifest.last_unit_id, "RP02.P08.M05.S19");
  assert.equal(manifest.covered_micro_phase_count, 3);
  assert.equal(manifest.phase_counts["RP02.P08.M03"], 1);
  assert.equal(manifest.phase_counts["RP02.P08.M04"], 20);
  assert.equal(manifest.phase_counts["RP02.P08.M05"], 19);
  assert.equal(manifest.domain_counts.operator_summary, 1);
  assert.equal(manifest.domain_counts.secondary_workflow_evidence, 20);
  assert.equal(manifest.domain_counts.permission_audit_evidence_binding, 19);
  assert.equal(manifest.deliverable_counts.implementation, 16);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 20);
  assert.equal(manifest.deliverable_counts.claude_review, 2);
  assert.equal(manifest.deliverable_counts.test, 2);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-129 inherits CP128 and binds operator summary without leaking fields", () => {
  const matrix = createPermissionKernelCp129HermesEvidenceWorkflowBinding();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_evidence_harness_result_count, 150);
  assert.equal(matrix.inherited_next_gate_ready, true);
  assert.equal(matrix.inherited_claude_dependency_not_executed, true);
  assert.equal(matrix.inherited_audit_summary_reference_only, true);
  assert.equal(matrix.result_count, 40);
  assert.equal(matrix.operator_summary_result_count, 1);
  assert.equal(matrix.secondary_workflow_evidence_result_count, 20);
  assert.equal(matrix.permission_audit_evidence_binding_result_count, 19);
  assert.equal(cases["operator_summary.operator_summary"].operator_summary.summary_bound, true);
  assert.equal(cases["operator_summary.operator_summary"].operator_summary.includes_command_rollup, true);
  assert.equal(cases["operator_summary.operator_summary"].operator_summary.hidden_fields_rendered, false);
  assert.equal(cases["operator_summary.operator_summary"].operator_summary.contains_real_data, false);
});

test("CP00-129 evidence workflow and permission audit binding rows stay no-write", () => {
  const matrix = createPermissionKernelCp129HermesEvidenceWorkflowBinding();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase("unknown_case");

  assert.equal(cases["secondary_workflow_evidence.hermes_command_matrix"].hermes_evidence_binding.command_matrix_bound, true);
  assert.equal(cases["secondary_workflow_evidence.command_result_receipt"].hermes_evidence_binding.command_result_discloses_raw_output, false);
  assert.equal(cases["secondary_workflow_evidence.claude_dependency_marker"].claude_dependency_marker.executes_claude_review, false);
  assert.equal(cases["secondary_workflow_evidence.human_approval_marker"].human_approval_marker.grants_human_approval, false);
  assert.equal(cases["secondary_workflow_evidence.block_semantics"].verdict_semantics.block_prevents_production_ready, true);
  assert.equal(cases["permission_audit_evidence_binding.permission_summary_receipt"].permission_audit_binding.permission_summary_reference_only, true);
  assert.equal(cases["permission_audit_evidence_binding.audit_summary_receipt"].permission_audit_binding.emitted_to_audit_ledger, false);
  assert.equal(cases["permission_audit_evidence_binding.changed_file_receipt"].hermes_evidence_binding.changed_files_disclose_raw_diff, false);
  assert.equal(cases["permission_audit_evidence_binding.regression_receipt"].regression_receipt.bound, true);
  assert.equal(cases["permission_audit_evidence_binding.closeout_handoff"].closeout_handoff.commits_pack, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-129 evidence packets and handoff bind to H02/C02 and CP00-130", () => {
  const hermes = createPermissionKernelCp129HermesEvidencePacket();
  const claude = createPermissionKernelCp129ClaudeReviewPacket();
  const handoff = createPermissionKernelCp129CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 40);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-130");
  assert.equal(handoff.next_subphase_id, "RP02.P08.M05.S20");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-130 Risk A Hermes evidence synthetic fixture boundary catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog();
  const manifest = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest();
  const coverage = validatePermissionKernelCp130Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P08.M05.S20");
  assert.equal(manifest.last_unit_id, "RP02.P08.M06.S07");
  assert.equal(manifest.covered_micro_phase_count, 2);
  assert.equal(manifest.phase_counts["RP02.P08.M05"], 3);
  assert.equal(manifest.phase_counts["RP02.P08.M06"], 7);
  assert.equal(manifest.domain_counts.permission_audit_terminal_boundary, 3);
  assert.equal(manifest.domain_counts.synthetic_fixture_evidence_boundary, 7);
  assert.equal(manifest.deliverable_counts.implementation, 3);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 7);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-130 inherits CP129 and binds permission audit terminal rows", () => {
  const matrix = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_hermes_evidence_workflow_result_count, 40);
  assert.equal(matrix.inherited_closeout_handoff_no_commit, true);
  assert.equal(matrix.inherited_permission_summary_reference_only, true);
  assert.equal(matrix.result_count, 10);
  assert.equal(matrix.permission_audit_terminal_result_count, 3);
  assert.equal(matrix.synthetic_fixture_evidence_result_count, 7);
  assert.equal(cases["permission_audit_terminal.next_gate_readiness"].permission_audit_terminal.next_gate_readiness_bound, true);
  assert.equal(cases["permission_audit_terminal.documentation_update"].permission_audit_terminal.documentation_update_bound, true);
  assert.equal(cases["permission_audit_terminal.documentation_update"].permission_audit_terminal.documentation_published, false);
  assert.equal(cases["permission_audit_terminal.operator_summary"].operator_summary.bound, true);
  assert.equal(cases["permission_audit_terminal.operator_summary"].operator_summary.hidden_fields_rendered, false);
  assert.equal(cases["permission_audit_terminal.operator_summary"].operator_summary.contains_real_data, false);
});

test("CP00-130 synthetic fixture evidence rows stay no-write and reference-only", () => {
  const matrix = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase("unknown_case");

  assert.equal(cases["synthetic_fixture_opening.hermes_command_matrix"].synthetic_fixture_evidence.command_matrix_bound, true);
  assert.equal(cases["synthetic_fixture_opening.evidence_field_list"].synthetic_fixture_evidence.evidence_field_list_bound, true);
  assert.equal(cases["synthetic_fixture_opening.changed_file_receipt"].synthetic_fixture_evidence.changed_files_disclose_raw_diff, false);
  assert.equal(cases["synthetic_fixture_opening.command_result_receipt"].synthetic_fixture_evidence.command_result_discloses_raw_output, false);
  assert.equal(cases["synthetic_fixture_opening.fixture_summary_receipt"].synthetic_fixture_evidence.fixture_contains_real_data, false);
  assert.equal(cases["synthetic_fixture_opening.fixture_summary_receipt"].synthetic_fixture_evidence.fixture_persisted, false);
  assert.equal(cases["synthetic_fixture_opening.blocked_claim_receipt"].synthetic_fixture_evidence.blocked_claim_preview_only, true);
  assert.equal(cases["synthetic_fixture_opening.blocked_claim_receipt"].synthetic_fixture_evidence.blocked_claim_persisted, false);
  assert.equal(cases["synthetic_fixture_opening.permission_summary_receipt"].synthetic_fixture_evidence.permission_summary_reference_only, true);
  assert.equal(cases["synthetic_fixture_opening.permission_summary_receipt"].synthetic_fixture_evidence.permission_policy_mutated, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-130 evidence packets and handoff bind to H02/C02 and CP00-131", () => {
  const hermes = createPermissionKernelCp130HermesEvidencePacket();
  const claude = createPermissionKernelCp130ClaudeReviewPacket();
  const handoff = createPermissionKernelCp130CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-131");
  assert.equal(handoff.next_subphase_id, "RP02.P08.M06.S08");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-131 Risk A Hermes evidence synthetic fixture verdict boundary catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCatalog();
  const manifest = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryManifest();
  const coverage = validatePermissionKernelCp131Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P08.M06.S08");
  assert.equal(manifest.last_unit_id, "RP02.P08.M06.S17");
  assert.equal(manifest.covered_micro_phase_count, 1);
  assert.equal(manifest.phase_counts["RP02.P08.M06"], 10);
  assert.equal(manifest.domain_counts.synthetic_fixture_evidence_receipt_boundary, 3);
  assert.equal(manifest.domain_counts.synthetic_fixture_review_dependency_boundary, 1);
  assert.equal(manifest.domain_counts.synthetic_fixture_verdict_boundary, 6);
  assert.equal(manifest.deliverable_counts.implementation, 6);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 3);
  assert.equal(manifest.deliverable_counts.claude_review, 1);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-131 inherits CP130 and binds evidence receipts plus Claude marker", () => {
  const matrix = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_hermes_evidence_synthetic_fixture_boundary_result_count, 10);
  assert.equal(matrix.inherited_permission_summary_reference_only, true);
  assert.equal(matrix.inherited_command_result_no_raw_output, true);
  assert.equal(matrix.inherited_next_gate_handoff_to_cp131, true);
  assert.equal(matrix.result_count, 10);
  assert.equal(matrix.synthetic_fixture_evidence_receipt_result_count, 3);
  assert.equal(matrix.synthetic_fixture_review_dependency_result_count, 1);
  assert.equal(matrix.synthetic_fixture_verdict_result_count, 6);
  assert.equal(
    cases["synthetic_fixture_evidence_receipt.audit_summary_receipt"].synthetic_fixture_evidence_receipt
      .audit_summary_reference_only,
    true,
  );
  assert.equal(
    cases["synthetic_fixture_evidence_receipt.audit_summary_receipt"].synthetic_fixture_evidence_receipt
      .audit_summary_emitted_to_audit_ledger,
    false,
  );
  assert.equal(
    cases["synthetic_fixture_evidence_receipt.no_real_data_receipt"].synthetic_fixture_evidence_receipt
      .fixture_contains_real_data,
    false,
  );
  assert.equal(
    cases["synthetic_fixture_review_dependency.claude_dependency_marker"].claude_dependency_marker.executes_claude_review,
    false,
  );
});

test("CP00-131 verdict, approval, validation, and harness rows stay no-write and reference-only", () => {
  const matrix = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase("unknown_case");

  assert.equal(cases["synthetic_fixture_verdict.human_approval_marker"].human_approval_marker.grants_human_approval, false);
  assert.equal(cases["synthetic_fixture_verdict.pass_semantics"].verdict_semantics.pass_semantics_bound, true);
  assert.equal(
    cases["synthetic_fixture_verdict.pass_with_findings_semantics"].verdict_semantics
      .pass_with_findings_requires_adjudication,
    true,
  );
  assert.equal(cases["synthetic_fixture_verdict.block_semantics"].verdict_semantics.block_prevents_production_ready, true);
  assert.equal(
    cases["synthetic_fixture_evidence_receipt.evidence_template"].synthetic_fixture_evidence_receipt
      .evidence_template_reference_only,
    true,
  );
  assert.equal(
    cases["synthetic_fixture_verdict.validation_command_check"].validation_command_check.command_executed_by_runtime,
    false,
  );
  assert.equal(cases["synthetic_fixture_verdict.harness_boundary_note"].harness_boundary_note.harness_runtime_invoked, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-131 evidence packets and handoff bind to H02/C02 and CP00-132", () => {
  const hermes = createPermissionKernelCp131HermesEvidencePacket();
  const claude = createPermissionKernelCp131ClaudeReviewPacket();
  const handoff = createPermissionKernelCp131CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-132");
  assert.equal(handoff.next_subphase_id, "RP02.P08.M06.S18");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-132 Risk C fixture evidence review readiness catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog();
  const manifest = createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest();
  const coverage = validatePermissionKernelCp132Coverage();

  assert.equal(catalog.length, 150);
  assert.equal(manifest.covered_unit_count, 150);
  assert.equal(manifest.first_unit_id, "RP02.P08.M06.S18");
  assert.equal(manifest.last_unit_id, "RP02.P09.M05.S17");
  assert.equal(manifest.covered_micro_phase_count, 11);
  assert.equal(manifest.phase_counts["RP02.P08.M06"], 3);
  assert.equal(manifest.phase_counts["RP02.P08.M07"], 22);
  assert.equal(manifest.phase_counts["RP02.P08.M08"], 20);
  assert.equal(manifest.phase_counts["RP02.P08.M09"], 20);
  assert.equal(manifest.phase_counts["RP02.P08.M10"], 8);
  assert.equal(manifest.phase_counts["RP02.P09.M05"], 17);
  assert.equal(manifest.deliverable_counts.implementation, 68);
  assert.equal(manifest.deliverable_counts.test, 9);
  assert.equal(manifest.deliverable_counts.hermes_evidence, 38);
  assert.equal(manifest.deliverable_counts.claude_review, 18);
  assert.equal(manifest.deliverable_counts.security_audit, 12);
  assert.equal(manifest.deliverable_counts.ui, 5);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-132 inherits CP131 and binds fixture evidence readiness rows", () => {
  const matrix = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_hermes_evidence_synthetic_fixture_verdict_boundary_result_count, 10);
  assert.equal(matrix.inherited_claude_dependency_not_executed, true);
  assert.equal(matrix.inherited_pass_with_findings_requires_adjudication, true);
  assert.equal(matrix.inherited_block_prevents_production_ready, true);
  assert.equal(matrix.result_count, 150);
  assert.equal(matrix.fixture_evidence_result_count, 38);
  assert.equal(matrix.fixture_verdict_validation_result_count, 18);
  assert.equal(matrix.claude_review_packet_result_count, 6);
  assert.equal(matrix.review_question_result_count, 44);
  assert.equal(matrix.fixture_closeout_readiness_result_count, 14);
  assert.equal(matrix.review_closeout_readiness_result_count, 30);
  assert.equal(cases["rp02_p08_m07.hermes_command_matrix"].fixture_evidence.command_matrix_bound, true);
  assert.equal(cases["rp02_p08_m07.changed_file_receipt"].fixture_evidence.changed_files_disclose_raw_diff, false);
  assert.equal(cases["rp02_p08_m07.block_semantics"].verdict_validation.block_prevents_production_ready, true);
  assert.equal(cases["rp02_p08_m08.evidence_template"].fixture_evidence.evidence_template_reference_only, true);
  assert.equal(cases["rp02_p08_m09.claude_dependency_marker"].claude_review_packet.executes_claude_review, false);
  assert.equal(cases["rp02_p08_m10.audit_summary_receipt"].fixture_evidence.audit_summary_emitted_to_audit_ledger, false);
});

test("CP00-132 review security UI and closeout rows stay no-write and reference-only", () => {
  const matrix = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("unknown_case");

  assert.equal(cases["rp02_p09_m00.permission_bypass_questions"].review_questions.executes_permission_bypass, false);
  assert.equal(cases["rp02_p09_m01.ui_leak_questions"].review_questions.renders_ui, false);
  assert.equal(cases["rp02_p09_m03.finding_routing_map"].closeout_readiness.finding_routing_map_bound, true);
  assert.equal(cases["rp02_p09_m05.block_closeout_note"].closeout_readiness.marks_production_ready, false);
  assert.equal(cases["rp02_p09_m04.command_rerun"].closeout_readiness.command_rerun_executed, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-132 evidence packets and handoff bind to H02/C02 and CP00-133", () => {
  const hermes = createPermissionKernelCp132HermesEvidencePacket();
  const claude = createPermissionKernelCp132ClaudeReviewPacket();
  const handoff = createPermissionKernelCp132CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 150);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-133");
  assert.equal(handoff.next_subphase_id, "RP02.P09.M05.S18");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-133 Risk A terminal review question boundary covers the planned units", () => {
  const catalog = createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog();
  const manifest = createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest();
  const coverage = validatePermissionKernelCp133Coverage();

  assert.equal(catalog.length, 10);
  assert.equal(manifest.covered_unit_count, 10);
  assert.equal(manifest.first_unit_id, "RP02.P09.M05.S18");
  assert.equal(manifest.last_unit_id, "RP02.P09.M06.S07");
  assert.equal(manifest.covered_micro_phase_count, 2);
  assert.equal(manifest.phase_counts["RP02.P09.M05"], 3);
  assert.equal(manifest.phase_counts["RP02.P09.M06"], 7);
  assert.equal(manifest.deliverable_counts.implementation, 4);
  assert.equal(manifest.deliverable_counts.claude_review, 2);
  assert.equal(manifest.deliverable_counts.security_audit, 2);
  assert.equal(manifest.deliverable_counts.test, 1);
  assert.equal(manifest.deliverable_counts.ui, 1);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-133 inherits CP132 and binds terminal handoff review question rows", () => {
  const matrix = createPermissionKernelCp133TerminalReviewQuestionBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_fixture_evidence_review_readiness_result_count, 150);
  assert.equal(matrix.inherited_handoff_to_cp133, true);
  assert.equal(matrix.inherited_permission_bypass_no_execution, true);
  assert.equal(matrix.inherited_command_rerun_reference_only, true);
  assert.equal(matrix.result_count, 10);
  assert.equal(matrix.terminal_handoff_result_count, 3);
  assert.equal(matrix.review_question_result_count, 3);
  assert.equal(matrix.security_audit_question_result_count, 2);
  assert.equal(matrix.test_question_result_count, 1);
  assert.equal(matrix.ui_leak_question_result_count, 1);
  assert.equal(cases["rp02_p09_m05.next_rp_dependency"].terminal_handoff.next_rp_dependency_bound, true);
  assert.equal(cases["rp02_p09_m05.documentation_update"].terminal_handoff.documentation_published, false);
  assert.equal(cases["rp02_p09_m05.command_rerun"].terminal_handoff.command_rerun_executed, false);
  assert.equal(cases["rp02_p09_m06.architecture_review_questions"].review_questions.executes_claude_review, false);
});

test("CP00-133 security test UI and downstream questions stay no-write reference-only", () => {
  const matrix = createPermissionKernelCp133TerminalReviewQuestionBoundary();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase("unknown_case");

  assert.equal(cases["rp02_p09_m06.permission_bypass_questions"].security_audit_questions.executes_permission_bypass, false);
  assert.equal(cases["rp02_p09_m06.audit_completeness_questions"].security_audit_questions.emits_audit_event, false);
  assert.equal(cases["rp02_p09_m06.missing_test_questions"].test_questions.executes_tests, false);
  assert.equal(cases["rp02_p09_m06.ui_leak_questions"].ui_leak_questions.renders_ui, false);
  assert.equal(cases["rp02_p09_m06.downstream_readiness_questions"].review_questions.grants_approval, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-133 evidence packets and handoff bind to H02/C02 and CP00-134", () => {
  const hermes = createPermissionKernelCp133HermesEvidencePacket();
  const claude = createPermissionKernelCp133ClaudeReviewPacket();
  const handoff = createPermissionKernelCp133CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 10);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-134");
  assert.equal(handoff.next_subphase_id, "RP02.P09.M06.S08");
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});

test("CP00-134 Risk C terminal review closeout readiness catalog covers the planned units", () => {
  const catalog = createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog();
  const manifest = createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest();
  const coverage = validatePermissionKernelCp134Coverage();

  assert.equal(catalog.length, 65);
  assert.equal(manifest.covered_unit_count, 65);
  assert.equal(manifest.first_unit_id, "RP02.P09.M06.S08");
  assert.equal(manifest.last_unit_id, "RP02.P09.M10.S04");
  assert.equal(manifest.covered_micro_phase_count, 5);
  assert.equal(manifest.phase_counts["RP02.P09.M06"], 13);
  assert.equal(manifest.phase_counts["RP02.P09.M07"], 20);
  assert.equal(manifest.phase_counts["RP02.P09.M08"], 20);
  assert.equal(manifest.phase_counts["RP02.P09.M09"], 8);
  assert.equal(manifest.phase_counts["RP02.P09.M10"], 4);
  assert.equal(manifest.deliverable_counts.implementation, 40);
  assert.equal(manifest.deliverable_counts.claude_review, 11);
  assert.equal(manifest.deliverable_counts.security_audit, 8);
  assert.equal(manifest.deliverable_counts.test, 3);
  assert.equal(manifest.deliverable_counts.ui, 3);
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
});

test("CP00-134 inherits CP133 and binds RP02 terminal closeout rows", () => {
  const matrix = createPermissionKernelCp134TerminalReviewCloseoutReadiness();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));

  assert.equal(matrix.inherited_terminal_review_question_result_count, 10);
  assert.equal(matrix.inherited_handoff_to_cp134, true);
  assert.equal(matrix.inherited_permission_bypass_no_execution, true);
  assert.equal(matrix.inherited_ui_leak_not_rendered, true);
  assert.equal(matrix.result_count, 65);
  assert.equal(matrix.review_question_result_count, 15);
  assert.equal(matrix.security_audit_question_result_count, 8);
  assert.equal(matrix.test_question_result_count, 3);
  assert.equal(matrix.ui_leak_question_result_count, 3);
  assert.equal(matrix.claude_review_packet_result_count, 3);
  assert.equal(matrix.closeout_decision_result_count, 24);
  assert.equal(matrix.terminal_handoff_result_count, 9);
  assert.equal(cases["rp02_p09_m06.risk_register"].review_questions.writes_risk_register, false);
  assert.equal(cases["rp02_p09_m07.finding_routing_map"].closeout_decisions.routing_executes, false);
  assert.equal(cases["rp02_p09_m07.pass_with_findings_closeout_note"].closeout_decisions.pass_with_findings_requires_adjudication, true);
  assert.equal(cases["rp02_p09_m08.block_closeout_note"].closeout_decisions.block_prevents_production_ready, true);
});

test("CP00-134 review packets security tests UI and handoff stay no-write reference-only", () => {
  const matrix = createPermissionKernelCp134TerminalReviewCloseoutReadiness();
  const cases = Object.fromEntries(matrix.case_results.map((item) => [item.case_id, item]));
  const unknown = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase("unknown_case");

  assert.equal(cases["rp02_p09_m08.claude_review_packet"].claude_review_packet.executes_claude_review, false);
  assert.equal(cases["rp02_p09_m08.command_rerun"].terminal_handoff.command_rerun_executed, false);
  assert.equal(cases["rp02_p09_m09.permission_bypass_questions"].security_audit_questions.executes_permission_bypass, false);
  assert.equal(cases["rp02_p09_m09.ui_leak_questions"].ui_leak_questions.renders_ui, false);
  assert.equal(cases["rp02_p09_m10.audit_completeness_questions"].security_audit_questions.emits_audit_event, false);
  assert.equal(unknown.status, "blocked_before_permission_evaluation");
  assert.equal(unknown.writes_product_state, false);
  for (const profile of matrix.case_results) {
    assert.equal(profile.synthetic_only, true);
    assert.equal(profile.no_real_data, true);
    assert.equal(profile.unauthorized_count_exposed, false);
    assert.equal(profile.hidden_field_names_exposed, false);
    assert.equal(profile.mutates_permission_policy, false);
    assert.equal(profile.writes_product_state, false);
    assert.equal(profile.writes_audit_event, false);
    assert.equal(profile.creates_database_rows, false);
    assert.equal(profile.persists_idempotency_keys, false);
    assert.equal(profile.acquires_locks, false);
    assert.equal(profile.persists_lock_tokens, false);
    assert.equal(profile.executes_retry, false);
    assert.equal(profile.executes_rollback, false);
    assert.equal(profile.executes_compensation, false);
    assert.equal(profile.executes_export_download, false);
    assert.equal(profile.executes_external_share, false);
    assert.equal(profile.executes_ai_retrieval, false);
    assert.equal(profile.executes_analytics_query, false);
    assert.equal(profile.executes_claude_review, false);
    assert.equal(profile.writes_hermes_runtime, false);
    assert.equal(profile.grants_human_approval, false);
    assert.equal(profile.implements_ldip, false);
  }
});

test("CP00-134 evidence packets and handoff bind to H02/C02 and CP00-135", () => {
  const hermes = createPermissionKernelCp134HermesEvidencePacket();
  const claude = createPermissionKernelCp134ClaudeReviewPacket();
  const handoff = createPermissionKernelCp134CloseoutHandoff();

  assert.equal(hermes.hermes_gate, "H02");
  assert.equal(hermes.covered_unit_count, 65);
  assert.equal(claude.model, "claude-opus-4-8");
  assert.equal(claude.effort, "max");
  assert.equal(claude.read_only, true);
  assert.equal(claude.exactly_one_valid_pack_review_required, true);
  assert.equal(handoff.next_pack_id, "CP00-135");
  assert.equal(handoff.next_subphase_id, "RP03.P00.M00.S01");
  assert.equal(handoff.rp02_terminal_pack, true);
  assert.equal(handoff.ldip_implemented, false);
  assert.equal(handoff.hrx_embedded_boundary, "embedded_people_hr_evidence_module_inside_law_firm_os");
});
