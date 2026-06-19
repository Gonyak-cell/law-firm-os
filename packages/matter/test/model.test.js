import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import closeoutPlan from "../../../docs/closeout-pack-plan/closeout-pack-plan.json" with { type: "json" };
import matterContract from "../../../contracts/matter-core-contract.json" with { type: "json" };
import {
  MATTER_CORE_CP177_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP177_PACK_BINDING,
  MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP178_PACK_BINDING,
  MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP179_PACK_BINDING,
  MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP180_PACK_BINDING,
  MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS,
  MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP181_PACK_BINDING,
  MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP182_PACK_BINDING,
  MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS,
  MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP183_PACK_BINDING,
  MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP184_PACK_BINDING,
  MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP185_PACK_BINDING,
  MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS,
  MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP186_PACK_BINDING,
  MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS,
  MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP187_PACK_BINDING,
  MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS,
  MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP188_PACK_BINDING,
  MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS,
  MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP189_PACK_BINDING,
  MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP190_PACK_BINDING,
  MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS,
  MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP191_PACK_BINDING,
  MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP192_PACK_BINDING,
  MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS,
  MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP193_PACK_BINDING,
  MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP194_PACK_BINDING,
  MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP195_PACK_BINDING,
  MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP196_PACK_BINDING,
  MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS,
  MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP197_PACK_BINDING,
  MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS,
  MATTER_CORE_SERVICE_BOUNDARY,
  MATTER_GRAPH_EDGE_TYPES,
  MATTER_GRAPH_NODE_TYPES,
  createMatterCoreCp177ClaudeReviewPacket,
  createMatterCoreCp177CloseoutHandoff,
  createMatterCoreCp177HermesEvidencePacket,
  createMatterCoreCp178ClaudeReviewPacket,
  createMatterCoreCp178CloseoutHandoff,
  createMatterCoreCp178HermesEvidencePacket,
  createMatterCoreCp179ClaudeReviewPacket,
  createMatterCoreCp179CloseoutHandoff,
  createMatterCoreCp179HermesEvidencePacket,
  createMatterCoreCp180ClaudeReviewPacket,
  createMatterCoreCp180CloseoutHandoff,
  createMatterCoreCp180HermesEvidencePacket,
  createMatterCoreCp181ClaudeReviewPacket,
  createMatterCoreCp181CloseoutHandoff,
  createMatterCoreCp181HermesEvidencePacket,
  createMatterCoreCp182ClaudeReviewPacket,
  createMatterCoreCp182CloseoutHandoff,
  createMatterCoreCp182HermesEvidencePacket,
  createMatterCoreCp183ClaudeReviewPacket,
  createMatterCoreCp183CloseoutHandoff,
  createMatterCoreCp183HermesEvidencePacket,
  createMatterCoreCp184ClaudeReviewPacket,
  createMatterCoreCp184CloseoutHandoff,
  createMatterCoreCp184HermesEvidencePacket,
  createMatterCoreCp185ClaudeReviewPacket,
  createMatterCoreCp185CloseoutHandoff,
  createMatterCoreCp185HermesEvidencePacket,
  createMatterCoreCp186ClaudeReviewPacket,
  createMatterCoreCp186CloseoutHandoff,
  createMatterCoreCp186HermesEvidencePacket,
  createMatterCoreCp187ClaudeReviewPacket,
  createMatterCoreCp187CloseoutHandoff,
  createMatterCoreCp187HermesEvidencePacket,
  createMatterCoreCp188ClaudeReviewPacket,
  createMatterCoreCp188CloseoutHandoff,
  createMatterCoreCp188HermesEvidencePacket,
  createMatterCoreCp189ClaudeReviewPacket,
  createMatterCoreCp189CloseoutHandoff,
  createMatterCoreCp189HermesEvidencePacket,
  createMatterCoreCp190ClaudeReviewPacket,
  createMatterCoreCp190CloseoutHandoff,
  createMatterCoreCp190HermesEvidencePacket,
  createMatterCoreCp191ClaudeReviewPacket,
  createMatterCoreCp191CloseoutHandoff,
  createMatterCoreCp191HermesEvidencePacket,
  createMatterCoreCp192ClaudeReviewPacket,
  createMatterCoreCp192CloseoutHandoff,
  createMatterCoreCp192HermesEvidencePacket,
  createMatterCoreCp193ClaudeReviewPacket,
  createMatterCoreCp193CloseoutHandoff,
  createMatterCoreCp193HermesEvidencePacket,
  createMatterCoreCp194ClaudeReviewPacket,
  createMatterCoreCp194CloseoutHandoff,
  createMatterCoreCp194HermesEvidencePacket,
  createMatterCoreCp195ClaudeReviewPacket,
  createMatterCoreCp195CloseoutHandoff,
  createMatterCoreCp195HermesEvidencePacket,
  createMatterCoreCp196ClaudeReviewPacket,
  createMatterCoreCp196CloseoutHandoff,
  createMatterCoreCp196HermesEvidencePacket,
  createMatterCoreCp197ClaudeReviewPacket,
  createMatterCoreCp197CloseoutHandoff,
  createMatterCoreCp197HermesEvidencePacket,
  createMatterCoreFixtureEvidenceTerminalDescriptor,
  createMatterCorePermissionAuditTailFixtureDescriptor,
  createMatterCorePermissionAuditSecurityFixtureDescriptor,
  createMatterCorePermissionSubstrateWorkflowBindingDescriptor,
  createMatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor,
  createMatterCoreFailureReceiptTaxonomyBoundaryDescriptor,
  createMatterCoreFailureFixtureEntryBoundaryDescriptor,
  createMatterCoreFailureFixtureEvidenceReviewBridgeDescriptor,
  createMatterCoreGeneratedFailureRecoveryBindingDescriptor,
  createMatterCorePermissionAuditEvidenceTerminalBridgeDescriptor,
  createMatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor,
  createMatterCoreReviewQuestionSecurityGateDescriptor,
  createMatterCoreTerminalReviewCloseoutHandoffDescriptor,
  createMatterCorePermissionAuditBindingDescriptor,
  createMatterCoreSyntheticFixturePermissionSubstrateDescriptor,
  createMatterCoreSyntheticFixture,
  createMatterCoreSyntheticUiFixtureSet,
  createMatterCoreUiEvidenceDescriptor,
  createMatterCoreUiWorkflowFixture,
  createMatterCoreApiRequestDescriptor,
  createMatterGraphEdge,
  createMatterWikiSection,
  deriveMatterCoreUiState,
  executeMatterCoreApiInterface,
  executeMatterCoreUiWorkflow,
  executeMatterCoreServicePrechecks,
  executeMatterCoreServiceWorkflow,
  executeMatterGraphRelationshipStagingWorkflow,
  executeMatterMemberAssignmentWorkflow,
  executeMatterOpeningWorkflow,
  executeMatterTaskPlanningWorkflow,
  executeMatterWikiSectionStagingWorkflow,
  normalizeMatterCoreServiceRequest,
  listMatterCoreModelTypes,
  serializeMatterCoreServiceResultForApi,
  validateMatterCoreCp177Coverage,
  validateMatterCoreCp177Foundation,
  validateMatterCoreCp178Coverage,
  validateMatterCoreCp178ServiceBoundary,
  validateMatterCoreCp179Coverage,
  validateMatterCoreCp179ServiceEvidence,
  validateMatterCoreCp180Coverage,
  validateMatterCoreCp180SensitiveBoundary,
  validateMatterCoreCp181ApiInterface,
  validateMatterCoreCp181Coverage,
  validateMatterCoreCp182Coverage,
  validateMatterCoreCp182UiWorkflow,
  validateMatterCoreCp183Coverage,
  validateMatterCoreCp183UiEvidencePermissionFixture,
  validateMatterCoreCp184Coverage,
  validateMatterCoreCp184FixtureEvidenceTerminal,
  validateMatterCoreCp185Coverage,
  validateMatterCoreCp185PermissionAuditTail,
  validateMatterCoreCp186Coverage,
  validateMatterCoreCp186SyntheticFixturePermissionSubstrate,
  validateMatterCoreCp187Coverage,
  validateMatterCoreCp187PermissionSubstrateWorkflowBinding,
  validateMatterCoreCp188Coverage,
  validateMatterCoreCp188PermissionAuditSecurityFixture,
  validateMatterCoreCp189Coverage,
  validateMatterCoreCp189SyntheticFixtureFailureEvidence,
  validateMatterCoreCp190Coverage,
  validateMatterCoreCp190FailureReceiptTaxonomyBoundary,
  validateMatterCoreCp191Coverage,
  validateMatterCoreCp191GeneratedFailureRecoveryBinding,
  validateMatterCoreCp192Coverage,
  validateMatterCoreCp192FailureFixtureEntryBoundary,
  validateMatterCoreCp193Coverage,
  validateMatterCoreCp193FailureFixtureEvidenceReviewBridge,
  validateMatterCoreCp194Coverage,
  validateMatterCoreCp194PermissionAuditEvidenceTerminalBridge,
  validateMatterCoreCp195Coverage,
  validateMatterCoreCp195EvidenceReviewHandoffTerminalBridge,
  validateMatterCoreCp196Coverage,
  validateMatterCoreCp196ReviewQuestionSecurityGate,
  validateMatterCoreCp197Coverage,
  validateMatterCoreCp197TerminalReviewCloseoutHandoff,
  validateMatterCoreRecord,
  validateMatterCoreRegistry,
} from "../src/index.js";

const cp177ManifestPath = new URL("../../../docs/closeout-packs/cp00-177/manifest.json", import.meta.url);
const cp177Manifest = existsSync(cp177ManifestPath) ? JSON.parse(readFileSync(cp177ManifestPath, "utf8")) : null;
const cp177PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-177") ?? cp177Manifest?.plan_binding_snapshot;
const cp178ManifestPath = new URL("../../../docs/closeout-packs/cp00-178/manifest.json", import.meta.url);
const cp178Manifest = existsSync(cp178ManifestPath) ? JSON.parse(readFileSync(cp178ManifestPath, "utf8")) : null;
const cp178PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-178") ?? cp178Manifest?.plan_binding_snapshot;
const cp179ManifestPath = new URL("../../../docs/closeout-packs/cp00-179/manifest.json", import.meta.url);
const cp179Manifest = existsSync(cp179ManifestPath) ? JSON.parse(readFileSync(cp179ManifestPath, "utf8")) : null;
const cp179PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-179") ?? cp179Manifest?.plan_binding_snapshot;
const cp180ManifestPath = new URL("../../../docs/closeout-packs/cp00-180/manifest.json", import.meta.url);
const cp180Manifest = existsSync(cp180ManifestPath) ? JSON.parse(readFileSync(cp180ManifestPath, "utf8")) : null;
const cp180PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-180") ?? cp180Manifest?.plan_binding_snapshot;
const cp181ManifestPath = new URL("../../../docs/closeout-packs/cp00-181/manifest.json", import.meta.url);
const cp181Manifest = existsSync(cp181ManifestPath) ? JSON.parse(readFileSync(cp181ManifestPath, "utf8")) : null;
const cp181PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-181") ?? cp181Manifest?.plan_binding_snapshot;
const cp182ManifestPath = new URL("../../../docs/closeout-packs/cp00-182/manifest.json", import.meta.url);
const cp182Manifest = existsSync(cp182ManifestPath) ? JSON.parse(readFileSync(cp182ManifestPath, "utf8")) : null;
const cp182PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-182") ?? cp182Manifest?.plan_binding_snapshot;
const cp183ManifestPath = new URL("../../../docs/closeout-packs/cp00-183/manifest.json", import.meta.url);
const cp183Manifest = existsSync(cp183ManifestPath) ? JSON.parse(readFileSync(cp183ManifestPath, "utf8")) : null;
const cp183PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-183") ?? cp183Manifest?.plan_binding_snapshot;
const cp184ManifestPath = new URL("../../../docs/closeout-packs/cp00-184/manifest.json", import.meta.url);
const cp184Manifest = existsSync(cp184ManifestPath) ? JSON.parse(readFileSync(cp184ManifestPath, "utf8")) : null;
const cp184PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-184") ?? cp184Manifest?.plan_binding_snapshot;
const cp185ManifestPath = new URL("../../../docs/closeout-packs/cp00-185/manifest.json", import.meta.url);
const cp185Manifest = existsSync(cp185ManifestPath) ? JSON.parse(readFileSync(cp185ManifestPath, "utf8")) : null;
const cp185PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-185") ?? cp185Manifest?.plan_binding_snapshot;
const cp186ManifestPath = new URL("../../../docs/closeout-packs/cp00-186/manifest.json", import.meta.url);
const cp186Manifest = existsSync(cp186ManifestPath) ? JSON.parse(readFileSync(cp186ManifestPath, "utf8")) : null;
const cp186PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-186") ?? cp186Manifest?.plan_binding_snapshot;
const cp187ManifestPath = new URL("../../../docs/closeout-packs/cp00-187/manifest.json", import.meta.url);
const cp187Manifest = existsSync(cp187ManifestPath) ? JSON.parse(readFileSync(cp187ManifestPath, "utf8")) : null;
const cp187PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-187") ?? cp187Manifest?.plan_binding_snapshot;
const cp188ManifestPath = new URL("../../../docs/closeout-packs/cp00-188/manifest.json", import.meta.url);
const cp188Manifest = existsSync(cp188ManifestPath) ? JSON.parse(readFileSync(cp188ManifestPath, "utf8")) : null;
const cp188PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-188") ?? cp188Manifest?.plan_binding_snapshot;
const cp189ManifestPath = new URL("../../../docs/closeout-packs/cp00-189/manifest.json", import.meta.url);
const cp189Manifest = existsSync(cp189ManifestPath) ? JSON.parse(readFileSync(cp189ManifestPath, "utf8")) : null;
const cp189PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-189") ?? cp189Manifest?.plan_binding_snapshot;
const cp190ManifestPath = new URL("../../../docs/closeout-packs/cp00-190/manifest.json", import.meta.url);
const cp190Manifest = existsSync(cp190ManifestPath) ? JSON.parse(readFileSync(cp190ManifestPath, "utf8")) : null;
const cp190PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-190") ?? cp190Manifest?.plan_binding_snapshot;
const cp191ManifestPath = new URL("../../../docs/closeout-packs/cp00-191/manifest.json", import.meta.url);
const cp191Manifest = existsSync(cp191ManifestPath) ? JSON.parse(readFileSync(cp191ManifestPath, "utf8")) : null;
const cp191PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-191") ?? cp191Manifest?.plan_binding_snapshot;
const cp192ManifestPath = new URL("../../../docs/closeout-packs/cp00-192/manifest.json", import.meta.url);
const cp192Manifest = existsSync(cp192ManifestPath) ? JSON.parse(readFileSync(cp192ManifestPath, "utf8")) : null;
const cp192PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-192") ?? cp192Manifest?.plan_binding_snapshot;
const cp193ManifestPath = new URL("../../../docs/closeout-packs/cp00-193/manifest.json", import.meta.url);
const cp193Manifest = existsSync(cp193ManifestPath) ? JSON.parse(readFileSync(cp193ManifestPath, "utf8")) : null;
const cp193PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-193") ?? cp193Manifest?.plan_binding_snapshot;
const cp194ManifestPath = new URL("../../../docs/closeout-packs/cp00-194/manifest.json", import.meta.url);
const cp194Manifest = existsSync(cp194ManifestPath) ? JSON.parse(readFileSync(cp194ManifestPath, "utf8")) : null;
const cp194PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-194") ?? cp194Manifest?.plan_binding_snapshot;
const cp195ManifestPath = new URL("../../../docs/closeout-packs/cp00-195/manifest.json", import.meta.url);
const cp195Manifest = existsSync(cp195ManifestPath) ? JSON.parse(readFileSync(cp195ManifestPath, "utf8")) : null;
const cp195PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-195") ?? cp195Manifest?.plan_binding_snapshot;
const cp196ManifestPath = new URL("../../../docs/closeout-packs/cp00-196/manifest.json", import.meta.url);
const cp196Manifest = existsSync(cp196ManifestPath) ? JSON.parse(readFileSync(cp196ManifestPath, "utf8")) : null;
const cp196PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-196") ?? cp196Manifest?.plan_binding_snapshot;
const cp197ManifestPath = new URL("../../../docs/closeout-packs/cp00-197/manifest.json", import.meta.url);
const cp197Manifest = existsSync(cp197ManifestPath) ? JSON.parse(readFileSync(cp197ManifestPath, "utf8")) : null;
const cp197PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-197") ?? cp197Manifest?.plan_binding_snapshot;

test("CP00-177 plan binding covers the planned 150 RP05 units", () => {
  const coverage = validateMatterCoreCp177Coverage(cp177PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.first_unit_id, MATTER_CORE_CP177_PACK_BINDING.first_unit_id);
  assert.equal(coverage.summary.last_unit_id, MATTER_CORE_CP177_PACK_BINDING.last_unit_id);
  assert.equal(coverage.summary.by_deliverable.implementation, 104);
  assert.equal(coverage.summary.by_phase["RP05.P00"], 52);
  assert.equal(coverage.summary.by_phase["RP05.P01"], 98);
});

test("Matter Core registry includes MatterWiki and provider-neutral MatterGraph vocabulary", () => {
  const registry = validateMatterCoreRegistry();
  assert.equal(registry.valid, true);
  assert.ok(listMatterCoreModelTypes().includes("MatterWiki"));
  assert.ok(listMatterCoreModelTypes().includes("MatterGraphNode"));
  assert.ok(listMatterCoreModelTypes().includes("MatterGraphEdge"));
  assert.ok(MATTER_GRAPH_NODE_TYPES.includes("Matter"));
  assert.ok(MATTER_GRAPH_NODE_TYPES.includes("AIResult"));
  assert.ok(MATTER_GRAPH_EDGE_TYPES.includes("HAS_CITATION"));
  assert.ok(MATTER_GRAPH_EDGE_TYPES.includes("SIMILAR_TO"));
});

test("CP00-177 synthetic fixture creates MatterWiki shell and graph skeleton without runtime writes", () => {
  const fixture = createMatterCoreSyntheticFixture();
  assert.equal(fixture.synthetic_only, true);
  assert.equal(fixture.writes_product_state, false);
  assert.equal(fixture.wiki_shell.exposes_client_visible_wiki_output, false);
  assert.equal(fixture.wiki_shell.wiki.wiki_id, "matterwiki:tenant_rp05_synthetic:matter_rp05_synthetic_opening");
  assert.equal(fixture.wiki_shell.sections.length, 6);
  assert.equal(fixture.wiki_shell.sections.every((section) => section.source_policy === "uncited_internal_note"), true);
  assert.equal(fixture.graph_skeleton.provider_runtime_selected, false);
  assert.equal(fixture.graph_skeleton.provider_runtime_executed, false);
  assert.equal(fixture.graph_skeleton.edges.length, 0);
});

test("Matter Core validators block missing source links and unreviewed client-visible wiki output", () => {
  const invalidSection = createMatterWikiSection({
    section_id: "section_invalid_source",
    tenant_id: "tenant_rp05_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    wiki_id: "matterwiki:tenant_rp05_synthetic:matter_rp05_synthetic_opening",
    section_type: "facts",
    title: "Facts",
    source_policy: "source_required",
    review_status: "under_review",
    order_index: 1,
    updated_at: "2026-06-09T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    client_visible_candidate: true,
  });
  const validation = validateMatterCoreRecord("MatterWikiSection", invalidSection);
  assert.equal(validation.valid, false);
  assert.ok(validation.blocked_claims.includes("missing_source_link"));
  assert.ok(validation.review_required_claims.includes("client_visible_summary_requires_review"));
});

test("SIMILAR_TO graph edges require similarity and permission metadata", () => {
  const edge = createMatterGraphEdge({
    edge_id: "edge_similar_missing_metadata",
    tenant_id: "tenant_rp05_synthetic",
    matter_id: "matter_rp05_synthetic_opening",
    edge_type: "SIMILAR_TO",
    source_ref: "index:reserved",
    confidence: 0.42,
    created_by: "user_rp05_owner",
    created_at: "2026-06-09T00:00:00.000Z",
    review_status: "under_review",
    permission_envelope_id: "perm_rp05_synthetic_matter",
  });
  const validation = validateMatterCoreRecord("MatterGraphEdge", edge);
  assert.equal(validation.valid, true);
  assert.ok(validation.blocked_claims.includes("similar_to_method_missing"));
  assert.ok(validation.blocked_claims.includes("similar_to_permission_decision_id_missing"));
});

test("CP00-177 contract and evidence packets preserve v2 and Loop stage boundaries", () => {
  const foundation = validateMatterCoreCp177Foundation(matterContract);
  const evidence = createMatterCoreCp177HermesEvidencePacket(cp177PlanPack, matterContract);
  const review = createMatterCoreCp177ClaudeReviewPacket(cp177PlanPack);
  const handoff = createMatterCoreCp177CloseoutHandoff(cp177PlanPack);
  assert.equal(foundation.valid, true);
  assert.equal(evidence.production_ready_candidate, true);
  assert.equal(review.mode, "read_only");
  assert.equal(handoff.to_pack_id, "CP00-178");
  assert.equal(matterContract.no_write_attestation.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP177_NO_WRITE_ATTESTATION.implements_citation_ledger_runtime, false);
});

test("CP00-178 binds the Matter Core service/domain descriptor pack", () => {
  assert.equal(MATTER_CORE_CP178_PACK_BINDING.pack_id, "CP00-178");
  assert.equal(MATTER_CORE_CP178_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP178_PACK_BINDING.unit_count, 150);
  assert.equal(MATTER_CORE_CP178_PACK_BINDING.range, "RP05.P01.M08.S06-RP05.P02.M07.S06");
  assert.equal(MATTER_CORE_CP178_PACK_BINDING.upstream_pack_id, "CP00-177");
  assert.equal(MATTER_CORE_CP178_PACK_BINDING.next_pack_id, "CP00-179");
  assert.equal(MATTER_CORE_SERVICE_BOUNDARY.service_entrypoint, "executeMatterCoreServiceWorkflow");
  assert.deepEqual(MATTER_CORE_SERVICE_BOUNDARY.supported_operations, [
    "matter_opening",
    "member_assignment",
    "task_planning",
    "wiki_section_staging",
    "graph_relationship_staging",
  ]);
});

test("CP00-178 service normalizes requests and keeps descriptor-only boundaries", () => {
  const normalized = normalizeMatterCoreServiceRequest({
    request_id: "req_cp178_opening",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp178_opening",
      client_id: "client_rp05_amic",
      title: "CP178 synthetic matter opening",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });

  assert.equal(normalized.normalized, true);
  assert.equal(normalized.model_type, "Matter");
  assert.equal(normalized.idempotency_key, "tenant_rp05_synthetic:matter_opening:req_cp178_opening");
  assert.match(normalized.lock_key, /^matter-core:tenant_rp05_synthetic:matter_opening:/);
  assert.equal(normalized.no_write_attestation.writes_product_state, false);
  assert.equal(normalized.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(normalized.no_write_attestation.writes_audit_event, false);
  assert.equal(normalized.no_write_attestation.acquires_runtime_lock, false);

  const precheck = executeMatterCoreServicePrechecks(normalized);
  assert.equal(precheck.outcome, "passed");
  assert.equal(precheck.valid, true);
  assert.deepEqual(precheck.blocked_claims, []);
  assert.deepEqual(precheck.declared_prechecks, MATTER_CORE_SERVICE_BOUNDARY.prechecks);
});

test("CP00-178 service produces happy, review, approval, and blocked descriptors", () => {
  const happy = executeMatterOpeningWorkflow({
    request_id: "req_cp178_happy",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp178_happy",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP178 Happy Matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(happy.outcome, "passed");
  assert.equal(happy.action_preview.writes_product_state, false);
  assert.equal(happy.action_preview.dispatches_review_route, false);
  assert.equal(happy.no_write_attestation.executes_api_handler, false);

  const review = executeMatterWikiSectionStagingWorkflow({
    request_id: "req_cp178_wiki_review",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      section_id: "section_cp178_review",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp178_happy",
      wiki_id: "matterwiki:tenant_rp05_synthetic:matter_cp178_happy",
      section_type: "client_visible_summary",
      title: "Client visible candidate",
      source_policy: "uncited_internal_note",
      review_status: "under_review",
      order_index: 1,
      updated_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      client_visible_candidate: true,
    },
  });
  assert.equal(review.outcome, "review_required");
  assert.ok(review.review_required_claims.includes("client_visible_summary_requires_review"));

  const approval = executeMatterOpeningWorkflow({
    request_id: "req_cp178_approval",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp178_approval",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP178 Approval Matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      requires_approval: true,
    },
  });
  assert.equal(approval.outcome, "approval_required");
  assert.ok(approval.approval_required_claims.includes("matter_opening_requires_partner_approval"));

  const blocked = executeMatterGraphRelationshipStagingWorkflow({
    request_id: "req_cp178_similar_blocked",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      edge_id: "edge_cp178_similar",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp178_happy",
      edge_type: "SIMILAR_TO",
      source_ref: "index:reserved",
      confidence: 0.42,
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      review_status: "under_review",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("similar_to_permission_decision_id_missing"));
});

test("CP00-178 service blocks tenant leakage missing descriptors and unsupported routes", () => {
  const missingMatter = executeMatterMemberAssignmentWorkflow({
    request_id: "req_cp178_missing_matter",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      member_id: "member_cp178_missing_matter",
      tenant_id: "tenant_rp05_synthetic",
      user_id: "user_rp05_member",
      role: "associate",
      status: "active",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(missingMatter.outcome, "blocked");
  assert.ok(missingMatter.blocked_claims.includes("missing_matter_trace"));

  const tenantMismatch = executeMatterOpeningWorkflow({
    request_id: "req_cp178_tenant_mismatch",
    tenant_id: "tenant_rp05_synthetic",
    expected_tenant_id: "tenant_expected",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp178_tenant_mismatch",
      tenant_id: "tenant_other",
      client_id: "client_rp05_amic",
      title: "CP178 Tenant Mismatch",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(tenantMismatch.outcome, "blocked");
  assert.ok(tenantMismatch.blocked_claims.includes("tenant_boundary_mismatch"));

  const missingDescriptors = executeMatterOpeningWorkflow({
    request_id: "req_cp178_missing_descriptors",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    payload: {
      matter_id: "matter_cp178_missing_descriptors",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP178 Missing Descriptors",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(missingDescriptors.outcome, "blocked");
  assert.ok(missingDescriptors.blocked_claims.includes("permission_precheck_required"));
  assert.ok(missingDescriptors.blocked_claims.includes("audit_hint_precheck_required"));

  const unsupported = executeMatterCoreServiceWorkflow({
    request_id: "req_cp178_unsupported",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "unsupported_operation",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      tenant_id: "tenant_rp05_synthetic",
    },
  });
  assert.equal(unsupported.outcome, "blocked");
  assert.ok(unsupported.blocked_claims.includes("unsupported_service_operation"));
});

test("CP00-178 service descriptors are deterministic for retry and rollback evidence", () => {
  const request = {
    request_id: "req_cp178_retry_stable",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      task_id: "task_cp178_retry",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp178_retry",
      title: "Retry stable task",
      status: "todo",
      created_by: "user_rp05_owner",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  };
  const first = executeMatterTaskPlanningWorkflow(request);
  const second = executeMatterTaskPlanningWorkflow(request);
  assert.deepEqual(first, second);
  assert.equal(first.idempotency_key, "tenant_rp05_synthetic:task_planning:req_cp178_retry_stable");
  assert.equal(first.lock_key, second.lock_key);
  assert.equal(first.rollback_behavior, "no_mutation_so_rollback_is_descriptor_noop");
  assert.equal(first.retry_behavior, "same_idempotency_key_returns_same_descriptor_shape");
});

test("CP00-178 coverage, service boundary, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMatterCoreCp178Coverage(cp178PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.implementation, 70);
  assert.equal(coverage.summary.by_deliverable.ui, 23);
  assert.equal(coverage.summary.by_deliverable.contract, 8);
  assert.equal(coverage.summary.by_deliverable.security_audit, 16);
  assert.equal(coverage.summary.by_deliverable.claude_review, 5);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 10);
  assert.equal(coverage.summary.by_deliverable.test, 18);

  const boundary = validateMatterCoreCp178ServiceBoundary(matterContract);
  assert.equal(boundary.valid, true);
  assert.equal(boundary.operation_count, 5);
  assert.equal(MATTER_CORE_CP178_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
  assert.equal(MATTER_CORE_CP178_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP178_NO_WRITE_ATTESTATION.implements_loop_engine, false);

  const hermes = createMatterCoreCp178HermesEvidencePacket(cp178PlanPack, matterContract);
  const claude = createMatterCoreCp178ClaudeReviewPacket(cp178PlanPack);
  const handoff = createMatterCoreCp178CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H05.CP00-178.matter_core_service_domain_descriptor_boundary");
  assert.equal(claude.review_packet, "C05.CP00-178.matter_core_service_domain_descriptor_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-179");
  assert.equal(handoff.next_subphase_id, "RP05.P02.M07.S07");
});

test("CP00-179 binds the Matter Core service evidence review bridge pack", () => {
  const coverage = validateMatterCoreCp179Coverage(cp179PlanPack);
  assert.equal(MATTER_CORE_CP179_PACK_BINDING.pack_id, "CP00-179");
  assert.equal(MATTER_CORE_CP179_PACK_BINDING.risk_class, "B");
  assert.equal(MATTER_CORE_CP179_PACK_BINDING.unit_count, 40);
  assert.equal(MATTER_CORE_CP179_PACK_BINDING.range, "RP05.P02.M07.S07-RP05.P02.M09.S02");
  assert.equal(MATTER_CORE_CP179_PACK_BINDING.upstream_pack_id, "CP00-178");
  assert.equal(MATTER_CORE_CP179_PACK_BINDING.next_pack_id, "CP00-180");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_deliverable.implementation, 16);
  assert.equal(coverage.summary.by_deliverable.ui, 6);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 4);
  assert.equal(coverage.summary.by_deliverable.test, 8);
  assert.equal(coverage.summary.by_deliverable.contract, 2);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.claude_review, 2);
  assert.equal(coverage.summary.by_micro_phase["RP05.P02.M07"], 16);
  assert.equal(coverage.summary.by_micro_phase["RP05.P02.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP05.P02.M09"], 2);
});

test("CP00-179 golden service cases prove descriptor outcomes without runtime mutation", () => {
  const happy = executeMatterOpeningWorkflow({
    request_id: "req_cp179_happy",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp179_happy",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP179 Happy Matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(happy.outcome, "passed");
  assert.equal(happy.writes_product_state, false);
  assert.equal(happy.action_preview.creates_database_rows, false);
  assert.equal(happy.lock_status, "not_acquired_descriptor_only");
  assert.equal(happy.persistence_boundary, "never_write_descriptor_only");

  const review = executeMatterWikiSectionStagingWorkflow({
    request_id: "req_cp179_review",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      section_id: "section_cp179_review",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp179_happy",
      wiki_id: "matterwiki:tenant_rp05_synthetic:matter_cp179_happy",
      section_type: "client_visible_summary",
      title: "CP179 client visible candidate",
      source_policy: "uncited_internal_note",
      review_status: "under_review",
      order_index: 1,
      updated_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      client_visible_candidate: true,
    },
  });
  assert.equal(review.outcome, "review_required");
  assert.ok(review.review_required_claims.includes("client_visible_summary_requires_review"));
  assert.equal(review.action_preview.dispatches_review_route, false);

  const approval = executeMatterOpeningWorkflow({
    request_id: "req_cp179_approval",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp179_approval",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP179 approval matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      requires_approval: true,
    },
  });
  assert.equal(approval.outcome, "approval_required");
  assert.equal(approval.action_preview.dispatches_approval_route, false);

  const blocked = executeMatterGraphRelationshipStagingWorkflow({
    request_id: "req_cp179_blocked",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      edge_id: "edge_cp179_blocked",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp179_happy",
      edge_type: "SIMILAR_TO",
      source_ref: "index:reserved",
      confidence: 0.42,
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      review_status: "under_review",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("similar_to_permission_decision_id_missing"));
  assert.equal(blocked.executes_api_handler, false);
});

test("CP00-179 negative cases keep safe errors idempotency and rollback as descriptors", () => {
  const missingDescriptors = executeMatterOpeningWorkflow({
    request_id: "req_cp179_missing_descriptors",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    payload: {
      matter_id: "matter_cp179_missing_descriptors",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP179 missing descriptors",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(missingDescriptors.outcome, "blocked");
  assert.ok(missingDescriptors.blocked_claims.includes("permission_precheck_required"));
  assert.ok(missingDescriptors.blocked_claims.includes("audit_hint_precheck_required"));
  assert.ok(missingDescriptors.customer_safe_error_codes.includes("MATTER_CORE_PERMISSION_REQUIRED"));
  assert.ok(missingDescriptors.customer_safe_error_codes.includes("MATTER_CORE_AUDIT_HINT_REQUIRED"));

  const unsupported = executeMatterCoreServiceWorkflow({
    request_id: "req_cp179_unsupported",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "unsupported_operation",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      tenant_id: "tenant_rp05_synthetic",
    },
  });
  assert.equal(unsupported.outcome, "blocked");
  assert.ok(unsupported.blocked_claims.includes("unsupported_service_operation"));
  assert.equal(unsupported.rollback_behavior, "no_mutation_so_rollback_is_descriptor_noop");
  assert.equal(unsupported.retry_behavior, "same_idempotency_key_returns_same_descriptor_shape");

  const request = {
    request_id: "req_cp179_retry_stable",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      task_id: "task_cp179_retry",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp179_retry",
      title: "CP179 retry stable task",
      status: "todo",
      created_by: "user_rp05_owner",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  };
  const first = executeMatterTaskPlanningWorkflow(request);
  const second = executeMatterTaskPlanningWorkflow(request);
  assert.deepEqual(first, second);
  assert.equal(first.idempotency_key, "tenant_rp05_synthetic:task_planning:req_cp179_retry_stable");
  assert.equal(first.lock_key, second.lock_key);
});

test("CP00-179 Hermes and Claude packets preserve hardened review boundaries", () => {
  const serviceEvidence = validateMatterCoreCp179ServiceEvidence(matterContract);
  const hermes = createMatterCoreCp179HermesEvidencePacket(cp179PlanPack, matterContract);
  const claude = createMatterCoreCp179ClaudeReviewPacket(cp179PlanPack);
  const handoff = createMatterCoreCp179CloseoutHandoff();

  assert.equal(serviceEvidence.valid, true);
  assert.deepEqual(serviceEvidence.required_outcomes, ["passed", "review_required", "approval_required", "blocked"]);
  assert.deepEqual(MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.ok(MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence.includes("auth_failure"));
  assert.ok(MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence.includes("tool_call_shaped_output"));
  assert.equal(MATTER_CORE_CP179_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP179_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-179.matter_core_service_tail_evidence_review_bridge");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-179.matter_core_service_tail_evidence_review_bridge");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-180");
  assert.equal(handoff.next_subphase_id, "RP05.P02.M09.S03");
});

test("CP00-180 binds the sensitive service precheck boundary pack", () => {
  const coverage = validateMatterCoreCp180Coverage(cp180PlanPack);
  assert.equal(MATTER_CORE_CP180_PACK_BINDING.pack_id, "CP00-180");
  assert.equal(MATTER_CORE_CP180_PACK_BINDING.risk_class, "A");
  assert.equal(MATTER_CORE_CP180_PACK_BINDING.unit_count, 10);
  assert.equal(MATTER_CORE_CP180_PACK_BINDING.range, "RP05.P02.M09.S03-RP05.P02.M09.S12");
  assert.equal(MATTER_CORE_CP180_PACK_BINDING.upstream_pack_id, "CP00-179");
  assert.equal(MATTER_CORE_CP180_PACK_BINDING.next_pack_id, "CP00-181");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.implementation, 6);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.ui, 2);
  assert.equal(coverage.summary.by_micro_phase["RP05.P02.M09"], 10);
});

test("CP00-180 sensitive prechecks fail closed with customer-safe errors", () => {
  const tenantMismatch = executeMatterOpeningWorkflow({
    request_id: "req_cp180_tenant_mismatch",
    tenant_id: "tenant_rp05_synthetic",
    expected_tenant_id: "tenant_expected",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp180_tenant_mismatch",
      tenant_id: "tenant_other",
      client_id: "client_rp05_amic",
      title: "CP180 tenant mismatch",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(tenantMismatch.outcome, "blocked");
  assert.ok(tenantMismatch.blocked_claims.includes("tenant_boundary_mismatch"));
  assert.ok(tenantMismatch.customer_safe_error_codes.includes("MATTER_CORE_TENANT_BOUNDARY_MISMATCH"));

  const missingMatter = executeMatterMemberAssignmentWorkflow({
    request_id: "req_cp180_missing_matter",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      member_id: "member_cp180_missing_matter",
      tenant_id: "tenant_rp05_synthetic",
      user_id: "user_rp05_member",
      role: "associate",
      status: "active",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(missingMatter.outcome, "blocked");
  assert.ok(missingMatter.blocked_claims.includes("missing_matter_trace"));
  assert.ok(missingMatter.customer_safe_error_codes.includes("MATTER_CORE_MATTER_TRACE_REQUIRED"));

  const missingPermissionAudit = executeMatterOpeningWorkflow({
    request_id: "req_cp180_missing_permission_audit",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    payload: {
      matter_id: "matter_cp180_missing_permission_audit",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP180 missing permission and audit",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(missingPermissionAudit.outcome, "blocked");
  assert.ok(missingPermissionAudit.blocked_claims.includes("permission_precheck_required"));
  assert.ok(missingPermissionAudit.blocked_claims.includes("audit_hint_precheck_required"));
  assert.equal(missingPermissionAudit.evaluates_runtime_permission, false);
  assert.equal(missingPermissionAudit.writes_audit_event, false);
});

test("CP00-180 primary and secondary workflows preserve idempotency lock and persistence descriptors", () => {
  const primary = executeMatterOpeningWorkflow({
    request_id: "req_cp180_primary",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp180_primary",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP180 primary matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(primary.outcome, "passed");
  assert.equal(primary.idempotency_key, "tenant_rp05_synthetic:matter_opening:req_cp180_primary");
  assert.equal(primary.lock_status, "not_acquired_descriptor_only");
  assert.equal(primary.persistence_boundary, "never_write_descriptor_only");
  assert.equal(primary.action_preview.writes_product_state, false);

  const secondaryRequest = {
    request_id: "req_cp180_secondary",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      task_id: "task_cp180_secondary",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp180_primary",
      title: "CP180 secondary task",
      status: "todo",
      created_by: "user_rp05_owner",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  };
  const secondary = executeMatterTaskPlanningWorkflow(secondaryRequest);
  const replay = executeMatterTaskPlanningWorkflow(secondaryRequest);
  assert.equal(secondary.outcome, "passed");
  assert.deepEqual(secondary, replay);
  assert.equal(secondary.lock_key, replay.lock_key);
  assert.equal(secondary.creates_database_rows, false);
  assert.equal(secondary.updates_database_rows, false);
});

test("CP00-180 Hermes and Claude packets preserve Risk A authority boundaries", () => {
  const sensitiveBoundary = validateMatterCoreCp180SensitiveBoundary(matterContract);
  const hermes = createMatterCoreCp180HermesEvidencePacket(cp180PlanPack, matterContract);
  const claude = createMatterCoreCp180ClaudeReviewPacket(cp180PlanPack);
  const handoff = createMatterCoreCp180CloseoutHandoff();

  assert.equal(sensitiveBoundary.valid, true);
  assert.deepEqual(MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS.required_success_paths, ["matter_opening", "task_planning"]);
  assert.ok(MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS.required_failure_claims.includes("permission_precheck_required"));
  assert.ok(MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS.required_failure_claims.includes("audit_hint_precheck_required"));
  assert.equal(MATTER_CORE_CP180_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
  assert.equal(MATTER_CORE_CP180_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP180_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-180.matter_core_sensitive_service_precheck_boundary");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-180.matter_core_sensitive_service_precheck_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.equal(handoff.to_pack_id, "CP00-181");
  assert.equal(handoff.next_subphase_id, "RP05.P02.M09.S13");
});

test("CP00-181 plan binding covers API interface and early UI bridge units", () => {
  const coverage = validateMatterCoreCp181Coverage(cp181PlanPack);
  assert.equal(MATTER_CORE_CP181_PACK_BINDING.pack_id, "CP00-181");
  assert.equal(MATTER_CORE_CP181_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP181_PACK_BINDING.unit_count, 150);
  assert.equal(MATTER_CORE_CP181_PACK_BINDING.range, "RP05.P02.M09.S13-RP05.P04.M02.S07");
  assert.equal(MATTER_CORE_CP181_PACK_BINDING.upstream_pack_id, "CP00-180");
  assert.equal(MATTER_CORE_CP181_PACK_BINDING.next_pack_id, "CP00-182");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP05.P02"], 19);
  assert.equal(coverage.summary.by_phase["RP05.P03"], 112);
  assert.equal(coverage.summary.by_phase["RP05.P04"], 19);
  assert.equal(coverage.summary.by_deliverable.implementation, 57);
  assert.equal(coverage.summary.by_deliverable.contract, 35);
  assert.equal(coverage.summary.by_deliverable.security_audit, 18);
  assert.equal(coverage.summary.by_deliverable.ui, 17);
  assert.equal(coverage.summary.by_deliverable.test, 12);
});

test("CP00-181 API request and response descriptors preserve safe serialization", () => {
  const request = createMatterCoreApiRequestDescriptor({
    request_id: "req_cp181_descriptor",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    pagination: { limit: 200, cursor: "cursor:synthetic" },
    payload: {
      matter_id: "matter_cp181_descriptor",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP181 descriptor matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(request.pack_id, "CP00-181");
  assert.equal(request.pagination.limit, 100);
  assert.equal(request.permission_ref_present, true);
  assert.equal(request.audit_hint_ref_present, true);
  assert.equal(request.raw_payload_included, false);
  assert.equal(request.executes_api_handler, false);
  assert.equal(request.writes_product_state, false);

  const api = executeMatterCoreApiInterface({
    request_id: "req_cp181_passed",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp181_passed",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP181 passed matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(api.response.outcome, "passed");
  assert.equal(api.response.status_code, "MATTER_CORE_DESCRIPTOR_READY");
  assert.equal(api.response.descriptor_ref, "Matter:matter_cp181_passed");
  assert.equal(api.response.raw_payload_included, false);
  assert.equal(api.response.normalized_request_included, false);
  assert.equal(api.response.descriptor_body_included, false);
  assert.equal("normalized_request" in api.response, false);
  assert.equal("descriptor" in api.response, false);
  assert.equal(api.ui.ui_state, "ready");
  assert.equal(api.executes_api_handler, false);
  assert.equal(api.runtime_dispatch_enabled, false);
});

test("CP00-181 maps blocked review and approval paths to UI state descriptors", () => {
  const blocked = executeMatterCoreApiInterface({
    request_id: "req_cp181_blocked",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    payload: {
      matter_id: "matter_cp181_blocked",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP181 blocked matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(blocked.response.outcome, "blocked");
  assert.equal(blocked.ui.ui_state, "denied");
  assert.ok(blocked.response.customer_safe_error_codes.includes("MATTER_CORE_PERMISSION_REQUIRED"));
  assert.ok(blocked.response.customer_safe_error_codes.includes("MATTER_CORE_AUDIT_HINT_REQUIRED"));
  assert.equal(blocked.ui.denied_state, true);
  assert.equal(blocked.ui.raw_payload_included, false);

  const review = executeMatterCoreApiInterface({
    request_id: "req_cp181_review",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "wiki_section_staging",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      section_id: "section_cp181_review",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp181_review",
      wiki_id: "matterwiki:tenant_rp05_synthetic:matter_cp181_review",
      section_type: "client_visible_summary",
      title: "CP181 review candidate",
      source_policy: "uncited_internal_note",
      review_status: "under_review",
      order_index: 1,
      updated_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      client_visible_candidate: true,
    },
  });
  assert.equal(review.response.outcome, "review_required");
  assert.equal(review.response.descriptor_ref, "MatterWikiSection:section_cp181_review");
  assert.equal(review.ui.ui_state, "review_required");
  assert.equal(review.ui.review_required_state, true);
  assert.equal(review.dispatches_review_route, false);

  const approval = executeMatterCoreApiInterface({
    request_id: "req_cp181_approval",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp181_approval",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP181 approval matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      requires_approval: true,
    },
  });
  assert.equal(approval.response.outcome, "approval_required");
  assert.equal(approval.ui.ui_state, "approval_required");
  assert.equal(approval.ui.approval_required_state, true);
  assert.equal(approval.dispatches_approval_route, false);

  const loading = deriveMatterCoreUiState(approval.response, { loading: true, surface: "matter_opening_panel" });
  const empty = deriveMatterCoreUiState(approval.response, { empty: true, surface: "matter_task_planning_panel" });
  assert.equal(loading.ui_state, "loading");
  assert.equal(empty.ui_state, "empty");
  assert.deepEqual(MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.ui_states, [
    "loading",
    "empty",
    "denied",
    "review_required",
    "approval_required",
    "ready",
  ]);
});

test("CP00-181 Hermes and Claude packets preserve descriptor-only authority boundaries", () => {
  const apiInterface = validateMatterCoreCp181ApiInterface(matterContract);
  const hermes = createMatterCoreCp181HermesEvidencePacket(cp181PlanPack, matterContract);
  const claude = createMatterCoreCp181ClaudeReviewPacket(cp181PlanPack);
  const handoff = createMatterCoreCp181CloseoutHandoff();

  assert.equal(apiInterface.valid, true);
  assert.equal(MATTER_CORE_CP181_NO_WRITE_ATTESTATION.exposes_raw_payload, false);
  assert.equal(MATTER_CORE_CP181_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP181_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP181_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP181_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-181.matter_core_api_interface_ui_state_bridge");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-181.matter_core_api_interface_ui_state_bridge");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-182");
  assert.equal(handoff.next_subphase_id, "RP05.P04.M02.S08");
});

test("CP00-182 plan binding covers the Matter Core UI interaction workflow pack", () => {
  const coverage = validateMatterCoreCp182Coverage(cp182PlanPack);
  assert.equal(MATTER_CORE_CP182_PACK_BINDING.pack_id, "CP00-182");
  assert.equal(MATTER_CORE_CP182_PACK_BINDING.risk_class, "B");
  assert.equal(MATTER_CORE_CP182_PACK_BINDING.unit_count, 40);
  assert.equal(MATTER_CORE_CP182_PACK_BINDING.range, "RP05.P04.M02.S08-RP05.P04.M04.S17");
  assert.equal(MATTER_CORE_CP182_PACK_BINDING.upstream_pack_id, "CP00-181");
  assert.equal(MATTER_CORE_CP182_PACK_BINDING.next_pack_id, "CP00-183");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP05.P04"], 40);
  assert.equal(coverage.summary.by_deliverable.ui, 18);
  assert.equal(coverage.summary.by_deliverable.implementation, 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_deliverable.test, 2);
});

test("CP00-182 UI workflow descriptors keep badges copy layout and focus customer-safe", () => {
  const fixture = createMatterCoreUiWorkflowFixture({ operation: "task_planning" });
  assert.equal(fixture.pack_id, "CP00-182");
  assert.equal(fixture.surface, "matter_task_planning_panel");
  assert.equal(fixture.renders_live_dom, false);
  assert.equal(fixture.build_smoke, "descriptor_shape_only");
  assert.deepEqual(fixture.responsive_layouts, ["desktop_dense", "mobile_single_column"]);

  const denied = executeMatterCoreUiWorkflow({
    request_id: "req_cp182_denied",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    payload: {
      matter_id: "matter_cp182_denied",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP182 denied matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(denied.state, "denied");
  assert.equal(denied.permission_badge.mode, "ref_only");
  assert.equal(denied.permission_badge.leaks_decision_detail, false);
  assert.equal(denied.audit_hint_display.mode, "ref_only");
  assert.equal(denied.audit_hint_display.writes_audit_event, false);
  assert.ok(denied.error_message_copy.some((item) => item.code === "MATTER_CORE_PERMISSION_REQUIRED"));
  assert.ok(denied.error_message_copy.some((item) => item.copy.includes("Permission is required")));
  assert.equal(denied.responsive_layout.desktop, "desktop_dense");
  assert.equal(denied.responsive_layout.mobile, "mobile_single_column");
  assert.deepEqual(denied.keyboard_focus_behavior, [
    "primary_action",
    "secondary_action",
    "permission_badge",
    "audit_hint",
    "safe_error_summary",
  ]);
  assert.equal(denied.state_snapshot.unauthorized_count, null);
  assert.equal(denied.state_snapshot.unauthorized_count_leaked, false);
  assert.equal(denied.build_smoke.status, "passed");
  assert.equal(denied.renders_live_dom, false);
  assert.equal(denied.executes_api_handler, false);
  assert.equal(denied.leaks_unauthorized_counts, false);
});

test("CP00-182 UI workflow maps review approval and ready states without dispatch", () => {
  const review = executeMatterCoreUiWorkflow({
    request_id: "req_cp182_review",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "wiki_section_staging",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      section_id: "section_cp182_review",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp182_review",
      wiki_id: "matterwiki:tenant_rp05_synthetic:matter_cp182_review",
      section_type: "client_visible_summary",
      title: "CP182 review candidate",
      source_policy: "uncited_internal_note",
      review_status: "under_review",
      order_index: 1,
      updated_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      client_visible_candidate: true,
    },
  });
  assert.equal(review.state, "review_required");
  assert.equal(review.primary_interaction, "open_review_queue_descriptor");
  assert.equal(review.secondary_interaction, "refresh_descriptor_without_mutation");
  assert.equal(review.dispatches_review_route, false);
  assert.equal(review.api_response.descriptor_ref, "MatterWikiSection:section_cp182_review");

  const approval = executeMatterCoreUiWorkflow({
    request_id: "req_cp182_approval",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp182_approval",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP182 approval matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      requires_approval: true,
    },
  });
  assert.equal(approval.state, "approval_required");
  assert.equal(approval.primary_interaction, "open_approval_route_descriptor");
  assert.equal(approval.dispatches_approval_route, false);

  const ready = executeMatterCoreUiWorkflow({
    request_id: "req_cp182_ready",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp182_ready",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP182 ready matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  assert.equal(ready.state, "ready");
  assert.equal(ready.primary_interaction, "open_descriptor_preview");
  assert.equal(ready.writes_product_state, false);
});

test("CP00-182 Hermes and Claude packets preserve UI workflow authority boundaries", () => {
  const uiWorkflow = validateMatterCoreCp182UiWorkflow(matterContract);
  const hermes = createMatterCoreCp182HermesEvidencePacket(cp182PlanPack, matterContract);
  const claude = createMatterCoreCp182ClaudeReviewPacket(cp182PlanPack);
  const handoff = createMatterCoreCp182CloseoutHandoff();

  assert.equal(uiWorkflow.valid, true);
  assert.equal(MATTER_CORE_CP182_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP182_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP182_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
  assert.equal(MATTER_CORE_CP182_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.deepEqual(MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.required_states, [
    "loading",
    "empty",
    "denied",
    "review_required",
    "approval_required",
    "ready",
  ]);
  assert.equal(hermes.evidence_packet, "H05.CP00-182.matter_core_ui_interaction_workflow_descriptor");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-182.matter_core_ui_interaction_workflow_descriptor");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-183");
  assert.equal(handoff.next_subphase_id, "RP05.P04.M04.S18");
});

test("CP00-183 plan binding covers UI evidence permission and fixture units", () => {
  const coverage = validateMatterCoreCp183Coverage(cp183PlanPack);
  assert.equal(MATTER_CORE_CP183_PACK_BINDING.pack_id, "CP00-183");
  assert.equal(MATTER_CORE_CP183_PACK_BINDING.risk_class, "B");
  assert.equal(MATTER_CORE_CP183_PACK_BINDING.unit_count, 40);
  assert.equal(MATTER_CORE_CP183_PACK_BINDING.range, "RP05.P04.M04.S18-RP05.P04.M06.S15");
  assert.equal(MATTER_CORE_CP183_PACK_BINDING.upstream_pack_id, "CP00-182");
  assert.equal(MATTER_CORE_CP183_PACK_BINDING.next_pack_id, "CP00-184");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP05.P04"], 40);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 2);
  assert.equal(coverage.summary.by_deliverable.claude_review, 4);
  assert.equal(coverage.summary.by_deliverable.implementation, 11);
  assert.equal(coverage.summary.by_deliverable.ui, 17);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_deliverable.test, 1);
});

test("CP00-183 permission and audit binding never exposes sensitive decision bodies", () => {
  const denied = createMatterCorePermissionAuditBindingDescriptor({
    request_id: "req_cp183_denied",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    payload: {
      matter_id: "matter_cp183_denied",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP183 denied matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });

  assert.equal(denied.pack_id, "CP00-183");
  assert.equal(denied.permission_badge_ref_only, true);
  assert.equal(denied.audit_hint_ref_only, true);
  assert.equal(denied.permission_badge.decision_detail, null);
  assert.equal(denied.permission_badge.decision_detail_included, false);
  assert.equal(denied.permission_badge.leaks_decision_detail, false);
  assert.equal(denied.audit_hint_display.audit_event_body, null);
  assert.equal(denied.audit_hint_display.audit_event_body_included, false);
  assert.equal(denied.audit_hint_display.leaks_audit_event_body, false);
  assert.equal(denied.guard_results.no_permission_decision_detail_leak, true);
  assert.equal(denied.guard_results.no_audit_event_body_leak, true);
  assert.equal(denied.guard_results.no_unauthorized_count_leak, true);
  assert.equal(denied.no_write_attestation.leaks_permission_decision_detail, false);
  assert.equal(denied.no_write_attestation.leaks_audit_event_body, false);
});

test("CP00-183 synthetic UI fixture set covers all required surfaces and states", () => {
  const fixtureSet = createMatterCoreSyntheticUiFixtureSet();
  const expectedCount =
    MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_surfaces.length
    * MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_states.length;

  assert.equal(fixtureSet.pack_id, "CP00-183");
  assert.equal(fixtureSet.fixture_count, expectedCount);
  assert.equal(fixtureSet.surface_count, 5);
  assert.equal(fixtureSet.state_count, 6);
  assert.equal(fixtureSet.leak_guards.no_raw_payload, true);
  assert.equal(fixtureSet.leak_guards.no_permission_decision_detail, true);
  assert.equal(fixtureSet.leak_guards.no_audit_event_body, true);
  assert.equal(fixtureSet.leak_guards.no_unauthorized_count, true);
  assert.equal(fixtureSet.build_smoke_descriptor.status, "passed");
  for (const surface of MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_surfaces) {
    assert.ok(fixtureSet.fixtures.some((fixture) => fixture.surface === surface));
  }
  for (const state of MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_states) {
    assert.ok(fixtureSet.fixtures.some((fixture) => fixture.state === state));
  }
});

test("CP00-183 UI evidence descriptor binds Hermes evidence and Claude leak prompt boundaries", () => {
  const evidence = createMatterCoreUiEvidenceDescriptor({
    request_id: "req_cp183_review",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "wiki_section_staging",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      section_id: "section_cp183_review",
      tenant_id: "tenant_rp05_synthetic",
      matter_id: "matter_cp183_review",
      wiki_id: "matterwiki:tenant_rp05_synthetic:matter_cp183_review",
      section_type: "client_visible_summary",
      title: "CP183 review candidate",
      source_policy: "uncited_internal_note",
      review_status: "under_review",
      order_index: 1,
      updated_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
      client_visible_candidate: true,
    },
  });

  assert.equal(evidence.pack_id, "CP00-183");
  assert.equal(evidence.evidence_descriptor, "MatterCoreUiEvidencePermissionFixtureDescriptor");
  assert.deepEqual(evidence.required_evidence_sections, [
    "hermes_ui_evidence",
    "claude_ui_leak_prompt",
    "closeout_handoff",
    "permission_audit_binding",
    "synthetic_fixture_set",
  ]);
  assert.equal(evidence.hermes_ui_evidence.evidence_packet, "H05.CP00-183.matter_core_ui_evidence_permission_fixture");
  assert.equal(evidence.hermes_ui_evidence.synthetic_fixture_binding, true);
  assert.equal(evidence.hermes_ui_evidence.permission_badge_ref_only, true);
  assert.equal(evidence.hermes_ui_evidence.audit_hint_ref_only, true);
  assert.equal(evidence.hermes_ui_evidence.state_snapshot_without_unauthorized_count, true);
  assert.equal(evidence.claude_ui_leak_prompt.review_packet, "C05.CP00-183.matter_core_ui_evidence_permission_fixture");
  assert.equal(evidence.claude_ui_leak_prompt.read_only, true);
  assert.equal(evidence.claude_ui_leak_prompt.source_inspection_basis, "read_tools_used");
  assert.deepEqual(evidence.claude_ui_leak_prompt.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(evidence.claude_ui_leak_prompt.claude_is_final_approval, false);
  assert.equal(evidence.claude_ui_leak_prompt.production_or_enterprise_trust_claim, false);
  assert.equal(evidence.leak_guards.no_raw_payload, true);
  assert.equal(evidence.leak_guards.no_permission_decision_detail, true);
  assert.equal(evidence.leak_guards.no_audit_event_body, true);
  assert.equal(evidence.leak_guards.no_unauthorized_count, true);
  assert.equal(evidence.leak_guards.no_client_visible_wiki_output, true);
  assert.equal(evidence.closeout_handoff.to_pack_id, "CP00-184");
});

test("CP00-183 Hermes and Claude packets preserve UI evidence authority boundaries", () => {
  const uiEvidence = validateMatterCoreCp183UiEvidencePermissionFixture(matterContract);
  const hermes = createMatterCoreCp183HermesEvidencePacket(cp183PlanPack, matterContract);
  const claude = createMatterCoreCp183ClaudeReviewPacket(cp183PlanPack);
  const handoff = createMatterCoreCp183CloseoutHandoff();

  assert.equal(uiEvidence.valid, true);
  assert.ok(
    ["CP00-183", "CP00-184", "CP00-185", "CP00-186", "CP00-187", "CP00-188", "CP00-189", "CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(
      matterContract.current_pack.pack_id,
    ),
  );
  assert.equal(matterContract.ui_evidence_permission_fixture.pack_id, "CP00-183");
  assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
  assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-183.matter_core_ui_evidence_permission_fixture");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-183.matter_core_ui_evidence_permission_fixture");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-184");
  assert.equal(handoff.next_subphase_id, "RP05.P04.M06.S16");
});

test("CP00-184 plan binding covers fixture evidence terminal and P05 entry units", () => {
  const coverage = validateMatterCoreCp184Coverage(cp184PlanPack);
  assert.equal(MATTER_CORE_CP184_PACK_BINDING.pack_id, "CP00-184");
  assert.equal(MATTER_CORE_CP184_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP184_PACK_BINDING.unit_count, 150);
  assert.equal(MATTER_CORE_CP184_PACK_BINDING.range, "RP05.P04.M06.S16-RP05.P05.M05.S13");
  assert.equal(MATTER_CORE_CP184_PACK_BINDING.upstream_pack_id, "CP00-183");
  assert.equal(MATTER_CORE_CP184_PACK_BINDING.next_pack_id, "CP00-185");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP05.P04"], 75);
  assert.equal(coverage.summary.by_phase["RP05.P05"], 75);
  assert.equal(coverage.summary.by_deliverable.fixture, 40);
  assert.equal(coverage.summary.by_deliverable.test, 10);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 6);
  assert.equal(coverage.summary.by_deliverable.claude_review, 13);
  assert.equal(coverage.summary.by_deliverable.implementation, 38);
  assert.equal(coverage.summary.by_deliverable.ui, 31);
  assert.equal(coverage.summary.by_deliverable.security_audit, 12);
});

test("CP00-184 terminal descriptor covers P04 terminal and P05 entry case sets", () => {
  const descriptor = createMatterCoreFixtureEvidenceTerminalDescriptor({
    request_id: "req_cp184_terminal",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp184_terminal",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP184 terminal matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const expectedCaseCount =
    MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS.required_p05_entry_surfaces.length
    * MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS.required_case_types.length;

  assert.equal(descriptor.pack_id, "CP00-184");
  assert.equal(descriptor.descriptor, "MatterCoreFixtureEvidenceTerminalEntryDescriptor");
  assert.equal(descriptor.synthetic_fixture_binding.bound_to_pack_id, "CP00-184");
  assert.equal(descriptor.synthetic_fixture_binding.fixture_count, 30);
  assert.equal(descriptor.build_smoke.status, "passed");
  assert.equal(descriptor.build_smoke.real_document_loaded, false);
  assert.equal(descriptor.p05_permission_audit_entry.case_count, expectedCaseCount);
  assert.equal(descriptor.golden_case_set.length, 12);
  assert.equal(descriptor.failure_case_set.length, 24);
  assert.ok(descriptor.failure_case_set.some((item) => item.case_type === "failure_test" && item.outcome === "blocked"));
  for (const surface of MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS.required_p05_entry_surfaces) {
    assert.ok(descriptor.p05_permission_audit_entry.cases.some((item) => item.micro_phase === surface));
  }
  for (const caseType of MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS.required_case_types) {
    assert.ok(descriptor.p05_permission_audit_entry.cases.some((item) => item.case_type === caseType));
  }
});

test("CP00-184 terminal descriptor keeps fixture evidence and permission audit entry leak-safe", () => {
  const descriptor = createMatterCoreFixtureEvidenceTerminalDescriptor();
  assert.equal(descriptor.leak_guards.no_raw_payload, true);
  assert.equal(descriptor.leak_guards.no_real_document_content, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_unauthorized_count, true);
  assert.equal(descriptor.leak_guards.no_client_visible_wiki_output, true);
  assert.equal(descriptor.hermes_ui_evidence.evidence_packet, "H05.CP00-184.matter_core_fixture_evidence_terminal_entry");
  assert.equal(descriptor.claude_ui_leak_prompt.review_packet, "C05.CP00-184.matter_core_fixture_evidence_terminal_entry");
  assert.equal(descriptor.claude_ui_leak_prompt.read_only, true);
  assert.deepEqual(descriptor.claude_ui_leak_prompt.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(descriptor.closeout_handoff.to_pack_id, "CP00-185");
  assert.equal(descriptor.renders_live_dom, false);
  assert.equal(descriptor.executes_api_handler, false);
  assert.equal(descriptor.uses_real_client_data, false);
  assert.equal(descriptor.uses_real_document_data, false);
});

test("CP00-184 Hermes and Claude packets preserve terminal authority boundaries", () => {
  const fixtureEvidence = validateMatterCoreCp184FixtureEvidenceTerminal(matterContract);
  const hermes = createMatterCoreCp184HermesEvidencePacket(cp184PlanPack, matterContract);
  const claude = createMatterCoreCp184ClaudeReviewPacket(cp184PlanPack);
  const handoff = createMatterCoreCp184CloseoutHandoff();

  assert.equal(fixtureEvidence.valid, true);
  assert.ok(
    ["CP00-184", "CP00-185", "CP00-186", "CP00-187", "CP00-188", "CP00-189", "CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(
      matterContract.current_pack.pack_id,
    ),
  );
  assert.equal(matterContract.fixture_evidence_terminal_entry.pack_id, "CP00-184");
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.uses_real_client_data, false);
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.uses_real_document_data, false);
  assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-184.matter_core_fixture_evidence_terminal_entry");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-184.matter_core_fixture_evidence_terminal_entry");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-185");
  assert.equal(handoff.next_subphase_id, "RP05.P05.M05.S14");
});

test("CP00-185 plan binding covers permission audit tail fixture units", () => {
  const coverage = validateMatterCoreCp185Coverage(cp185PlanPack);
  assert.equal(MATTER_CORE_CP185_PACK_BINDING.pack_id, "CP00-185");
  assert.equal(MATTER_CORE_CP185_PACK_BINDING.risk_class, "A");
  assert.equal(MATTER_CORE_CP185_PACK_BINDING.unit_count, 10);
  assert.equal(MATTER_CORE_CP185_PACK_BINDING.range, "RP05.P05.M05.S14-RP05.P05.M06.S01");
  assert.equal(MATTER_CORE_CP185_PACK_BINDING.upstream_pack_id, "CP00-184");
  assert.equal(MATTER_CORE_CP185_PACK_BINDING.next_pack_id, "CP00-186");
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP05.P05"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP05.P05.M05"], 9);
  assert.equal(coverage.summary.by_micro_phase["RP05.P05.M06"], 1);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_deliverable.test, 3);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 4);
});

test("CP00-185 permission audit tail descriptor keeps Risk A boundaries small and fail-closed", () => {
  const descriptor = createMatterCorePermissionAuditTailFixtureDescriptor({
    request_id: "req_cp185_tail",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp185_tail",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP185 tail matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp185PermissionAuditTail(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-185");
  assert.equal(descriptor.descriptor, "MatterCorePermissionAuditTailFixtureDescriptor");
  assert.equal(descriptor.tail_row_count, MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS.required_units.length);
  assert.equal(descriptor.failure_test.outcome, "blocked");
  assert.equal(descriptor.claude_missing_test_prompt.outcome, "review_required");
  assert.equal(descriptor.golden_test.outcome, "passed");
  assert.equal(descriptor.base_tenant_fixture.tenant_id, "tenant_rp05_synthetic");
  assert.equal(descriptor.base_tenant_fixture.contains_real_client_data, false);
  assert.equal(descriptor.base_tenant_fixture.contains_real_document_content, false);
  assert.equal(validation.valid, true);
});

test("CP00-185 leak guards and review packets preserve authority boundaries", () => {
  const descriptor = createMatterCorePermissionAuditTailFixtureDescriptor();
  const tail = validateMatterCoreCp185PermissionAuditTail(matterContract, descriptor);
  const hermes = createMatterCoreCp185HermesEvidencePacket(cp185PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp185ClaudeReviewPacket(cp185PlanPack);
  const handoff = createMatterCoreCp185CloseoutHandoff();

  assert.equal(tail.valid, true);
  assert.ok(
    ["CP00-185", "CP00-186", "CP00-187", "CP00-188", "CP00-189", "CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(
      matterContract.current_pack.pack_id,
    ),
  );
  assert.equal(matterContract.permission_audit_tail_fixture.pack_id, "CP00-185");
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.persists_idempotency_key, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.uses_real_client_data, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.uses_real_document_data, false);
  assert.equal(MATTER_CORE_CP185_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_unauthorized_count, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(hermes.evidence_packet, "H05.CP00-185.matter_core_permission_audit_tail_fixture");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-185.matter_core_permission_audit_tail_fixture");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-186");
  assert.equal(handoff.next_subphase_id, "RP05.P05.M06.S02");
});

test("CP00-186 plan binding covers fixture continuation and P06 permission substrate units", () => {
  const coverage = validateMatterCoreCp186Coverage(cp186PlanPack);
  assert.equal(MATTER_CORE_CP186_PACK_BINDING.pack_id, "CP00-186");
  assert.equal(MATTER_CORE_CP186_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP186_PACK_BINDING.unit_count, 150);
  assert.equal(MATTER_CORE_CP186_PACK_BINDING.range, "RP05.P05.M06.S02-RP05.P06.M03.S19");
  assert.equal(MATTER_CORE_CP186_PACK_BINDING.upstream_pack_id, "CP00-185");
  assert.equal(MATTER_CORE_CP186_PACK_BINDING.next_pack_id, "CP00-187");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP05.P05"], 89);
  assert.equal(coverage.summary.by_phase["RP05.P06"], 61);
  assert.equal(coverage.summary.by_deliverable.fixture, 33);
  assert.equal(coverage.summary.by_deliverable.implementation, 59);
  assert.equal(coverage.summary.by_deliverable.security_audit, 22);
  assert.equal(coverage.summary.by_deliverable.test, 15);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 4);
  assert.equal(coverage.summary.by_deliverable.claude_review, 7);
  assert.equal(coverage.summary.by_deliverable.ui, 10);
});

test("CP00-186 synthetic fixture permission substrate descriptor remains leak-safe", () => {
  const descriptor = createMatterCoreSyntheticFixturePermissionSubstrateDescriptor({
    request_id: "req_cp186_substrate",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp186_substrate",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP186 substrate matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp186SyntheticFixturePermissionSubstrate(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-186");
  assert.equal(descriptor.descriptor, "MatterCoreSyntheticFixturePermissionSubstrateDescriptor");
  assert.equal(descriptor.source_permission_audit_tail_pack_id, "CP00-185");
  assert.equal(descriptor.fixture_row_count, MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.required_fixture_controls.length * 5);
  assert.equal(descriptor.permission_substrate_row_count, MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.required_permission_controls.length * 4);
  assert.ok(descriptor.denied_test_rows.some((row) => row.outcome === "blocked"));
  assert.ok(descriptor.allowed_test_rows.some((row) => row.outcome === "passed"));
  assert.ok(descriptor.review_required_rows.some((row) => row.control === "review_required_route"));
  assert.ok(descriptor.approval_required_rows.some((row) => row.control === "approval_required_route"));
  assert.equal(descriptor.inherited_tail_descriptor.pack_id, "CP00-185");
  assert.equal(descriptor.inherited_tail_descriptor.leak_safe, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-186 Hermes, Claude, and handoff packets preserve authority boundaries", () => {
  const descriptor = createMatterCoreSyntheticFixturePermissionSubstrateDescriptor();
  const substrate = validateMatterCoreCp186SyntheticFixturePermissionSubstrate(matterContract, descriptor);
  const hermes = createMatterCoreCp186HermesEvidencePacket(cp186PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp186ClaudeReviewPacket(cp186PlanPack);
  const handoff = createMatterCoreCp186CloseoutHandoff();

  assert.equal(substrate.valid, true, substrate.errors.join("; "));
  assert.ok(
    ["CP00-186", "CP00-187", "CP00-188", "CP00-189", "CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(
      matterContract.current_pack.pack_id,
    ),
  );
  assert.equal(matterContract.synthetic_fixture_permission_substrate.pack_id, "CP00-186");
  assert.equal(matterContract.permission_audit_tail_fixture.pack_id, "CP00-185");
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_unauthorized_count, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(hermes.evidence_packet, "H05.CP00-186.matter_core_synthetic_fixture_permission_substrate");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-186.matter_core_synthetic_fixture_permission_substrate");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-187");
  assert.equal(handoff.next_subphase_id, "RP05.P06.M03.S20");
});

test("CP00-187 plan binding covers permission substrate workflow binding units", () => {
  const coverage = validateMatterCoreCp187Coverage(cp187PlanPack);
  assert.equal(MATTER_CORE_CP187_PACK_BINDING.pack_id, "CP00-187");
  assert.equal(MATTER_CORE_CP187_PACK_BINDING.risk_class, "B");
  assert.equal(MATTER_CORE_CP187_PACK_BINDING.unit_count, 40);
  assert.equal(MATTER_CORE_CP187_PACK_BINDING.range, "RP05.P06.M03.S20-RP05.P06.M05.S15");
  assert.equal(MATTER_CORE_CP187_PACK_BINDING.upstream_pack_id, "CP00-186");
  assert.equal(MATTER_CORE_CP187_PACK_BINDING.next_pack_id, "CP00-188");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP05.P06"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP05.P06.M03"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP05.P06.M04"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP05.P06.M05"], 15);
  assert.equal(coverage.summary.by_deliverable.test, 7);
  assert.equal(coverage.summary.by_deliverable.security_audit, 7);
  assert.equal(coverage.summary.by_deliverable.implementation, 16);
  assert.equal(coverage.summary.by_deliverable.ui, 8);
  assert.equal(coverage.summary.by_deliverable.claude_review, 2);
});

test("CP00-187 permission substrate workflow binding descriptor remains no-write and no-leak", () => {
  const descriptor = createMatterCorePermissionSubstrateWorkflowBindingDescriptor({
    request_id: "req_cp187_workflow_binding",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp187_workflow_binding",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP187 workflow binding matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp187PermissionSubstrateWorkflowBinding(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-187");
  assert.equal(descriptor.descriptor, "MatterCorePermissionSubstrateWorkflowBindingDescriptor");
  assert.equal(descriptor.source_synthetic_fixture_permission_substrate_pack_id, "CP00-186");
  assert.equal(descriptor.workflow_binding_row_count, 40);
  assert.equal(descriptor.primary_tail_test_rows.length, MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.primary_tail_tests.length);
  assert.equal(
    descriptor.secondary_workflow_rows.length,
    MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.secondary_workflow_controls.length,
  );
  assert.equal(
    descriptor.permission_audit_binding_rows.length,
    MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.permission_audit_binding_controls.length,
  );
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "denied_test"));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_test"));
  assert.ok(descriptor.workflow_binding_rows.some((row) => row.control === "leak_prevention_test" && row.security_trimming_proof_ref));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "review_required_route"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "approval_required_route"));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_unauthorized_count, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-187 Hermes, Claude, and handoff packets preserve permission/audit authority boundaries", () => {
  const descriptor = createMatterCorePermissionSubstrateWorkflowBindingDescriptor();
  const workflowBinding = validateMatterCoreCp187PermissionSubstrateWorkflowBinding(matterContract, descriptor);
  const hermes = createMatterCoreCp187HermesEvidencePacket(cp187PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp187ClaudeReviewPacket(cp187PlanPack);
  const handoff = createMatterCoreCp187CloseoutHandoff();

  assert.equal(workflowBinding.valid, true, workflowBinding.errors.join("; "));
  assert.ok(
    ["CP00-187", "CP00-188", "CP00-189", "CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id),
  );
  assert.equal(matterContract.permission_substrate_workflow_binding.pack_id, "CP00-187");
  assert.equal(matterContract.synthetic_fixture_permission_substrate.pack_id, "CP00-186");
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-187.matter_core_permission_substrate_workflow_binding");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-187.matter_core_permission_substrate_workflow_binding");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-188");
  assert.equal(handoff.next_subphase_id, "RP05.P06.M05.S16");
});

test("CP00-188 plan binding covers permission/audit security fixture boundary units", () => {
  const coverage = validateMatterCoreCp188Coverage(cp188PlanPack);
  assert.equal(MATTER_CORE_CP188_PACK_BINDING.pack_id, "CP00-188");
  assert.equal(MATTER_CORE_CP188_PACK_BINDING.risk_class, "A");
  assert.equal(MATTER_CORE_CP188_PACK_BINDING.unit_count, 10);
  assert.equal(MATTER_CORE_CP188_PACK_BINDING.range, "RP05.P06.M05.S16-RP05.P06.M06.S03");
  assert.equal(MATTER_CORE_CP188_PACK_BINDING.upstream_pack_id, "CP00-187");
  assert.equal(MATTER_CORE_CP188_PACK_BINDING.next_pack_id, "CP00-189");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP05.P06"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP05.P06.M05"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP05.P06.M06"], 3);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_deliverable.implementation, 2);
});

test("CP00-188 permission audit security fixture descriptor remains no-write and fail-closed", () => {
  const descriptor = createMatterCorePermissionAuditSecurityFixtureDescriptor({
    request_id: "req_cp188_security_fixture",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp188_security_fixture",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP188 security fixture matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp188PermissionAuditSecurityFixture(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-188");
  assert.equal(descriptor.descriptor, "MatterCorePermissionAuditSecurityFixtureDescriptor");
  assert.equal(descriptor.source_permission_substrate_workflow_binding_pack_id, "CP00-187");
  assert.equal(descriptor.security_fixture_row_count, 10);
  assert.equal(
    descriptor.permission_audit_tail_rows.length,
    MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.permission_audit_binding_tail_controls.length,
  );
  assert.equal(
    descriptor.synthetic_fixture_entry_rows.length,
    MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.synthetic_fixture_entry_controls.length,
  );
  assert.ok(descriptor.rows_by_outcome.passed.some((row) => row.control === "allowed_test"));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "denied_test"));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_test"));
  assert.ok(descriptor.security_fixture_rows.some((row) => row.control === "leak_prevention_test" && row.security_trimming_proof_ref));
  assert.ok(descriptor.security_fixture_rows.some((row) => row.control === "audit_event_expectation" && row.audit_event_expectation_ref));
  assert.ok(descriptor.security_fixture_rows.some((row) => row.control === "permission_fixture" && row.permission_fixture_ref));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_unauthorized_count, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-188 Hermes, Claude, and handoff packets preserve Risk A authority boundaries", () => {
  const descriptor = createMatterCorePermissionAuditSecurityFixtureDescriptor();
  const securityFixture = validateMatterCoreCp188PermissionAuditSecurityFixture(matterContract, descriptor);
  const hermes = createMatterCoreCp188HermesEvidencePacket(cp188PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp188ClaudeReviewPacket(cp188PlanPack);
  const handoff = createMatterCoreCp188CloseoutHandoff();

  assert.equal(securityFixture.valid, true, securityFixture.errors.join("; "));
  assert.ok(["CP00-188", "CP00-189", "CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id));
  assert.equal(matterContract.permission_audit_security_fixture_boundary.pack_id, "CP00-188");
  assert.equal(matterContract.permission_substrate_workflow_binding.pack_id, "CP00-187");
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-188.matter_core_permission_audit_security_fixture_boundary");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-188.matter_core_permission_audit_security_fixture_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-189");
  assert.equal(handoff.next_subphase_id, "RP05.P06.M06.S04");
});

test("CP00-189 plan binding covers synthetic fixture and failure evidence continuation units", () => {
  const coverage = validateMatterCoreCp189Coverage(cp189PlanPack);
  assert.equal(MATTER_CORE_CP189_PACK_BINDING.pack_id, "CP00-189");
  assert.equal(MATTER_CORE_CP189_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP189_PACK_BINDING.unit_count, 150);
  assert.equal(MATTER_CORE_CP189_PACK_BINDING.range, "RP05.P06.M06.S04-RP05.P07.M03.S14");
  assert.equal(MATTER_CORE_CP189_PACK_BINDING.upstream_pack_id, "CP00-188");
  assert.equal(MATTER_CORE_CP189_PACK_BINDING.next_pack_id, "CP00-190");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP05.P06"], 94);
  assert.equal(coverage.summary.by_phase["RP05.P07"], 56);
  assert.equal(coverage.summary.by_deliverable.implementation, 40);
  assert.equal(coverage.summary.by_deliverable.security_audit, 26);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 44);
  assert.equal(coverage.summary.by_deliverable.test, 16);
  assert.equal(coverage.summary.by_micro_phase["RP05.P06.M06"], 19);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M02"], 20);
  assert.equal(coverage.summary.by_micro_title["Hermes Evidence Packet"], 22);
  assert.equal(coverage.summary.by_micro_title["Type And Shape Definition"], 20);
});

test("CP00-189 synthetic fixture failure evidence descriptor remains no-write and customer-safe", () => {
  const descriptor = createMatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor({
    request_id: "req_cp189_failure_evidence",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp189_failure_evidence",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP189 failure evidence matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp189SyntheticFixtureFailureEvidence(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-189");
  assert.equal(descriptor.descriptor, "MatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor");
  assert.equal(descriptor.source_permission_audit_security_fixture_boundary_pack_id, "CP00-188");
  assert.equal(descriptor.continuation_row_count, 150);
  assert.equal(descriptor.synthetic_rows.length, 94);
  assert.equal(descriptor.failure_rows.length, 56);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P06.M06"], 19);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P06.M08"], 22);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M02"], 20);
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_failure"));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "review_required_route"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "approval_required_route"));
  assert.ok(descriptor.failure_rows.some((row) => row.control === "blocked_claim_receipt" && row.blocked_claim_receipt_ref));
  assert.ok(descriptor.failure_rows.some((row) => row.control === "hermes_failure_evidence" && row.hermes_failure_evidence_ref));
  assert.ok(descriptor.synthetic_rows.some((row) => row.control === "leak_prevention_test" && row.security_trimming_proof_ref));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_unauthorized_count, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-189 Hermes, Claude, and handoff packets preserve Risk C authority boundaries", () => {
  const descriptor = createMatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor();
  const continuation = validateMatterCoreCp189SyntheticFixtureFailureEvidence(matterContract, descriptor);
  const hermes = createMatterCoreCp189HermesEvidencePacket(cp189PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp189ClaudeReviewPacket(cp189PlanPack);
  const handoff = createMatterCoreCp189CloseoutHandoff();

  assert.equal(continuation.valid, true, continuation.errors.join("; "));
  assert.ok(["CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id));
  assert.equal(matterContract.synthetic_fixture_failure_evidence_continuation.pack_id, "CP00-189");
  assert.equal(matterContract.permission_audit_security_fixture_boundary.pack_id, "CP00-188");
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-189.matter_core_synthetic_fixture_failure_evidence_continuation");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-189.matter_core_synthetic_fixture_failure_evidence_continuation");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-190");
  assert.equal(handoff.next_subphase_id, "RP05.P07.M03.S15");
});

test("CP00-190 plan binding covers failure receipt and taxonomy boundary units", () => {
  const coverage = validateMatterCoreCp190Coverage(cp190PlanPack);
  assert.equal(MATTER_CORE_CP190_PACK_BINDING.pack_id, "CP00-190");
  assert.equal(MATTER_CORE_CP190_PACK_BINDING.risk_class, "A");
  assert.equal(MATTER_CORE_CP190_PACK_BINDING.unit_count, 10);
  assert.equal(MATTER_CORE_CP190_PACK_BINDING.range, "RP05.P07.M03.S15-RP05.P07.M04.S02");
  assert.equal(MATTER_CORE_CP190_PACK_BINDING.upstream_pack_id, "CP00-189");
  assert.equal(MATTER_CORE_CP190_PACK_BINDING.next_pack_id, "CP00-191");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP05.P07"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M03"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M04"], 2);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 2);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_deliverable.test, 2);
  assert.equal(coverage.summary.by_deliverable.security_audit, 1);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 2);
});

test("CP00-190 failure receipt taxonomy descriptor remains no-write and fail-closed", () => {
  const descriptor = createMatterCoreFailureReceiptTaxonomyBoundaryDescriptor({
    request_id: "req_cp190_failure_boundary",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp190_failure_boundary",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP190 failure boundary matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp190FailureReceiptTaxonomyBoundary(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-190");
  assert.equal(descriptor.descriptor, "MatterCoreFailureReceiptTaxonomyBoundaryDescriptor");
  assert.equal(descriptor.source_synthetic_fixture_failure_evidence_continuation_pack_id, "CP00-189");
  assert.equal(descriptor.failure_boundary_row_count, 10);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M03"], 8);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M04"], 2);
  assert.ok(descriptor.failure_boundary_rows.some((row) => row.control === "blocked_claim_receipt" && row.blocked_claim_receipt_ref));
  assert.ok(descriptor.failure_boundary_rows.some((row) => row.control === "failure_fixture" && row.failure_fixture_ref));
  assert.ok(descriptor.failure_boundary_rows.some((row) => row.control === "failure_unit_test" && row.failure_unit_test_ref));
  assert.ok(descriptor.failure_boundary_rows.some((row) => row.control === "failure_integration_smoke" && row.failure_integration_smoke_ref));
  assert.ok(descriptor.failure_boundary_rows.some((row) => row.control === "audit_failure_hint" && row.audit_failure_hint_ref));
  assert.ok(descriptor.failure_boundary_rows.some((row) => row.control === "hermes_failure_evidence" && row.hermes_failure_evidence_ref));
  assert.ok(descriptor.failure_boundary_rows.some((row) => row.control === "failure_taxonomy" && row.failure_taxonomy_ref));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "missing_tenant_failure"));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_edge_case_prompt"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_escalation_note"));
  assert.ok(
    descriptor.failure_boundary_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_MISSING_TENANT")),
  );
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-190 Hermes, Claude, and handoff packets preserve Risk A authority boundaries", () => {
  const descriptor = createMatterCoreFailureReceiptTaxonomyBoundaryDescriptor();
  const boundary = validateMatterCoreCp190FailureReceiptTaxonomyBoundary(matterContract, descriptor);
  const hermes = createMatterCoreCp190HermesEvidencePacket(cp190PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp190ClaudeReviewPacket(cp190PlanPack);
  const handoff = createMatterCoreCp190CloseoutHandoff();

  assert.equal(boundary.valid, true, boundary.errors.join("; "));
  assert.ok(["CP00-190", "CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id));
  assert.equal(matterContract.failure_receipt_taxonomy_boundary.pack_id, "CP00-190");
  assert.equal(matterContract.synthetic_fixture_failure_evidence_continuation.pack_id, "CP00-189");
  assert.deepEqual(MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-190.matter_core_failure_receipt_taxonomy_boundary");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-190.matter_core_failure_receipt_taxonomy_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-191");
  assert.equal(handoff.next_subphase_id, "RP05.P07.M04.S03");
});

test("CP00-191 plan binding covers generated failure recovery and permission audit binding units", () => {
  const coverage = validateMatterCoreCp191Coverage(cp191PlanPack);
  assert.equal(MATTER_CORE_CP191_PACK_BINDING.pack_id, "CP00-191");
  assert.equal(MATTER_CORE_CP191_PACK_BINDING.risk_class, "B");
  assert.equal(MATTER_CORE_CP191_PACK_BINDING.unit_count, 40);
  assert.equal(MATTER_CORE_CP191_PACK_BINDING.range, "RP05.P07.M04.S03-RP05.P07.M05.S20");
  assert.equal(MATTER_CORE_CP191_PACK_BINDING.upstream_pack_id, "CP00-190");
  assert.equal(MATTER_CORE_CP191_PACK_BINDING.next_pack_id, "CP00-192");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP05.P07"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M05"], 20);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 22);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 4);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
});

test("CP00-191 generated failure recovery binding descriptor remains no-write and fail-closed", () => {
  const descriptor = createMatterCoreGeneratedFailureRecoveryBindingDescriptor({
    request_id: "req_cp191_generated_failure_binding",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp191_generated_failure_binding",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP191 generated failure binding matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp191GeneratedFailureRecoveryBinding(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-191");
  assert.equal(descriptor.descriptor, "MatterCoreGeneratedFailureRecoveryBindingDescriptor");
  assert.equal(descriptor.source_failure_receipt_taxonomy_boundary_pack_id, "CP00-190");
  assert.equal(descriptor.generated_failure_row_count, 40);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M04"], 20);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M05"], 20);
  assert.equal(descriptor.rows_by_group["secondary-workflow"], 20);
  assert.equal(descriptor.rows_by_group["permission-audit-binding"], 20);
  assert.ok(descriptor.generated_failure_rows.some((row) => row.control === "permission_denied_failure" && row.permission_denied_failure_ref));
  assert.ok(descriptor.generated_failure_rows.some((row) => row.control === "missing_actor_failure" && row.missing_actor_failure_ref));
  assert.ok(descriptor.generated_failure_rows.some((row) => row.control === "rollback_expectation" && row.rollback_expectation_ref));
  assert.ok(descriptor.generated_failure_rows.some((row) => row.control === "compensation_expectation" && row.compensation_expectation_ref));
  assert.ok(descriptor.generated_failure_rows.some((row) => row.control === "failure_taxonomy" && row.failure_taxonomy_ref));
  assert.ok(descriptor.permission_audit_binding_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_failure"));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_edge_case_prompt"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_escalation_note"));
  assert.ok(descriptor.generated_failure_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_PERMISSION_DENIED")));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-191 Hermes, Claude, and handoff packets preserve Risk B authority boundaries", () => {
  const descriptor = createMatterCoreGeneratedFailureRecoveryBindingDescriptor();
  const binding = validateMatterCoreCp191GeneratedFailureRecoveryBinding(matterContract, descriptor);
  const hermes = createMatterCoreCp191HermesEvidencePacket(cp191PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp191ClaudeReviewPacket(cp191PlanPack);
  const handoff = createMatterCoreCp191CloseoutHandoff();

  assert.equal(binding.valid, true, binding.errors.join("; "));
  assert.ok(["CP00-191", "CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id));
  assert.equal(matterContract.generated_failure_recovery_binding.pack_id, "CP00-191");
  assert.equal(matterContract.failure_receipt_taxonomy_boundary.pack_id, "CP00-190");
  assert.deepEqual(MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-191.matter_core_generated_failure_recovery_binding");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-191.matter_core_generated_failure_recovery_binding");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-192");
  assert.equal(handoff.next_subphase_id, "RP05.P07.M05.S21");
});

test("CP00-192 plan binding covers failure fixture entry boundary units", () => {
  const coverage = validateMatterCoreCp192Coverage(cp192PlanPack);
  assert.equal(MATTER_CORE_CP192_PACK_BINDING.pack_id, "CP00-192");
  assert.equal(MATTER_CORE_CP192_PACK_BINDING.risk_class, "A");
  assert.equal(MATTER_CORE_CP192_PACK_BINDING.unit_count, 10);
  assert.equal(MATTER_CORE_CP192_PACK_BINDING.range, "RP05.P07.M05.S21-RP05.P07.M06.S08");
  assert.equal(MATTER_CORE_CP192_PACK_BINDING.upstream_pack_id, "CP00-191");
  assert.equal(MATTER_CORE_CP192_PACK_BINDING.next_pack_id, "CP00-193");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP05.P07"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M05"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M06"], 8);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 7);
  assert.equal(coverage.summary.by_deliverable.security_audit, 1);
});

test("CP00-192 failure fixture entry boundary descriptor remains no-write and fail-closed", () => {
  const descriptor = createMatterCoreFailureFixtureEntryBoundaryDescriptor({
    request_id: "req_cp192_failure_fixture_entry",
    tenant_id: "tenant_rp05_synthetic",
    actor_user_id: "user_rp05_owner",
    operation: "matter_opening",
    permission_ref: "perm_rp05_synthetic_matter",
    audit_hint_ref: "audit_rp05_synthetic_matter",
    payload: {
      matter_id: "matter_cp192_failure_fixture_entry",
      tenant_id: "tenant_rp05_synthetic",
      client_id: "client_rp05_amic",
      title: "CP192 failure fixture entry matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-06-10T00:00:00.000Z",
      permission_envelope_id: "perm_rp05_synthetic_matter",
      audit_trace_id: "audit_rp05_synthetic_matter",
    },
  });
  const validation = validateMatterCoreCp192FailureFixtureEntryBoundary(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-192");
  assert.equal(descriptor.descriptor, "MatterCoreFailureFixtureEntryBoundaryDescriptor");
  assert.equal(descriptor.source_generated_failure_recovery_binding_pack_id, "CP00-191");
  assert.equal(descriptor.failure_fixture_entry_row_count, 10);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M05"], 2);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M06"], 8);
  assert.equal(descriptor.rows_by_group["review-escalation-tail"], 2);
  assert.equal(descriptor.rows_by_group["failure-fixture-entry"], 8);
  assert.ok(descriptor.failure_fixture_entry_rows.some((row) => row.control === "failure_taxonomy" && row.failure_taxonomy_ref));
  assert.ok(descriptor.failure_fixture_entry_rows.some((row) => row.control === "missing_tenant_failure" && row.missing_tenant_failure_ref));
  assert.ok(descriptor.failure_fixture_entry_rows.some((row) => row.control === "permission_denied_failure" && row.permission_denied_failure_ref));
  assert.ok(descriptor.fixture_entry_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_failure"));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_edge_case_prompt"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_escalation_note"));
  assert.ok(descriptor.failure_fixture_entry_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_PERMISSION_DENIED")));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-192 Hermes, Claude, and handoff packets preserve Risk A authority boundaries", () => {
  const descriptor = createMatterCoreFailureFixtureEntryBoundaryDescriptor();
  const boundary = validateMatterCoreCp192FailureFixtureEntryBoundary(matterContract, descriptor);
  const hermes = createMatterCoreCp192HermesEvidencePacket(cp192PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp192ClaudeReviewPacket(cp192PlanPack);
  const handoff = createMatterCoreCp192CloseoutHandoff();

  assert.equal(boundary.valid, true, boundary.errors.join("; "));
  assert.ok(["CP00-192", "CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id));
  assert.equal(matterContract.failure_fixture_entry_boundary.pack_id, "CP00-192");
  assert.equal(matterContract.generated_failure_recovery_binding.pack_id, "CP00-191");
  assert.deepEqual(MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-192.matter_core_failure_fixture_entry_boundary");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-192.matter_core_failure_fixture_entry_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-193");
  assert.equal(handoff.next_subphase_id, "RP05.P07.M06.S09");
});

test("CP00-193 plan binding covers failure fixture evidence review bridge units", () => {
  const coverage = validateMatterCoreCp193Coverage(cp193PlanPack);
  assert.equal(MATTER_CORE_CP193_PACK_BINDING.pack_id, "CP00-193");
  assert.equal(MATTER_CORE_CP193_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP193_PACK_BINDING.unit_count, 150);
  assert.equal(MATTER_CORE_CP193_PACK_BINDING.range, "RP05.P07.M06.S09-RP05.P08.M04.S19");
  assert.equal(MATTER_CORE_CP193_PACK_BINDING.upstream_pack_id, "CP00-192");
  assert.equal(MATTER_CORE_CP193_PACK_BINDING.next_pack_id, "CP00-194");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP05.P07"], 89);
  assert.equal(coverage.summary.by_phase["RP05.P08"], 61);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M06"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M08"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP05.P07.M10"], 11);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M00"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M01"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M02"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M03"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M04"], 19);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 51);
  assert.equal(coverage.summary.by_deliverable.implementation, 24);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 48);
  assert.equal(coverage.summary.by_deliverable.fixture, 4);
  assert.equal(coverage.summary.by_deliverable.test, 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 8);
  assert.equal(coverage.summary.by_deliverable.claude_review, 5);
});

test("CP00-193 failure fixture evidence review bridge remains no-write and fail-closed", () => {
  const descriptor = createMatterCoreFailureFixtureEvidenceReviewBridgeDescriptor();
  const validation = validateMatterCoreCp193FailureFixtureEvidenceReviewBridge(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-193");
  assert.equal(descriptor.descriptor, "MatterCoreFailureFixtureEvidenceReviewBridgeDescriptor");
  assert.equal(descriptor.source_failure_fixture_entry_boundary_pack_id, "CP00-192");
  assert.equal(descriptor.source_generated_failure_recovery_binding_pack_id, "CP00-191");
  assert.equal(descriptor.failure_fixture_evidence_review_row_count, 150);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M06"], 14);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M07"], 22);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M08"], 22);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M09"], 20);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P07.M10"], 11);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M00"], 4);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M01"], 8);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M02"], 8);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M03"], 22);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M04"], 19);
  assert.equal(descriptor.rows_by_group["synthetic-fixture-tail"], 14);
  assert.equal(descriptor.rows_by_group["test-and-golden-case-set"], 22);
  assert.equal(descriptor.rows_by_group["hermes-evidence-packet"], 22);
  assert.equal(descriptor.rows_by_group["claude-review-packet"], 20);
  assert.equal(descriptor.rows_by_group["closeout-and-next-handoff"], 11);
  assert.ok(descriptor.failure_fixture_evidence_review_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
  assert.ok(descriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "permission_denied_failure" && row.permission_denied_failure_ref));
  assert.ok(descriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "block_semantics" && row.block_semantics_ref));
  assert.ok(descriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "claude_dependency_marker" && row.claude_dependency_marker_ref));
  assert.ok(descriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "human_approval_marker" && row.human_approval_marker_ref));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "block_semantics"));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_dependency_marker"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_approval_marker"));
  assert.ok(descriptor.failure_fixture_evidence_review_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_BLOCKED_SEMANTICS")));
  assert.ok(descriptor.failure_fixture_evidence_review_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_REVIEW_DEPENDENCY")));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-193 Hermes, Claude, and handoff packets preserve Risk C authority boundaries", () => {
  const descriptor = createMatterCoreFailureFixtureEvidenceReviewBridgeDescriptor();
  const bridge = validateMatterCoreCp193FailureFixtureEvidenceReviewBridge(matterContract, descriptor);
  const hermes = createMatterCoreCp193HermesEvidencePacket(cp193PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp193ClaudeReviewPacket(cp193PlanPack);
  const handoff = createMatterCoreCp193CloseoutHandoff();

  assert.equal(bridge.valid, true, bridge.errors.join("; "));
  assert.ok(["CP00-193", "CP00-194", "CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id));
  assert.equal(matterContract.failure_fixture_evidence_review_bridge.pack_id, "CP00-193");
  assert.equal(matterContract.failure_fixture_entry_boundary.pack_id, "CP00-192");
  assert.deepEqual(MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-193.matter_core_failure_fixture_evidence_review_bridge");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-193.matter_core_failure_fixture_evidence_review_bridge");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-194");
  assert.equal(handoff.next_subphase_id, "RP05.P08.M04.S20");
});

test("CP00-194 plan binding covers permission audit evidence terminal bridge units", () => {
  const coverage = validateMatterCoreCp194Coverage(cp194PlanPack);
  assert.equal(MATTER_CORE_CP194_PACK_BINDING.pack_id, "CP00-194");
  assert.equal(MATTER_CORE_CP194_PACK_BINDING.risk_class, "B");
  assert.equal(MATTER_CORE_CP194_PACK_BINDING.unit_count, 40);
  assert.equal(MATTER_CORE_CP194_PACK_BINDING.range, "RP05.P08.M04.S20-RP05.P08.M06.S17");
  assert.equal(MATTER_CORE_CP194_PACK_BINDING.upstream_pack_id, "CP00-193");
  assert.equal(MATTER_CORE_CP194_PACK_BINDING.next_pack_id, "CP00-195");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_phase["RP05.P08"], 40);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M04"], 1);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M05"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M06"], 17);
  assert.equal(coverage.summary.by_micro_title["Secondary Workflow Slice"], 1);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 17);
  assert.equal(coverage.summary.by_deliverable.implementation, 17);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 20);
  assert.equal(coverage.summary.by_deliverable.claude_review, 2);
  assert.equal(coverage.summary.by_deliverable.test, 1);
});

test("CP00-194 permission audit evidence terminal bridge remains no-write and fail-closed", () => {
  const descriptor = createMatterCorePermissionAuditEvidenceTerminalBridgeDescriptor();
  const validation = validateMatterCoreCp194PermissionAuditEvidenceTerminalBridge(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-194");
  assert.equal(descriptor.descriptor, "MatterCorePermissionAuditEvidenceTerminalBridgeDescriptor");
  assert.equal(descriptor.source_failure_fixture_evidence_review_bridge_pack_id, "CP00-193");
  assert.equal(descriptor.source_permission_substrate_workflow_binding_pack_id, "CP00-187");
  assert.equal(descriptor.permission_audit_evidence_terminal_row_count, 40);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M04"], 1);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M05"], 22);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M06"], 17);
  assert.equal(descriptor.rows_by_group["secondary-workflow-terminal"], 1);
  assert.equal(descriptor.rows_by_group["permission-audit-binding"], 22);
  assert.equal(descriptor.rows_by_group["synthetic-fixture-set-entry"], 17);
  assert.equal(descriptor.rows_by_deliverable.implementation, 17);
  assert.equal(descriptor.rows_by_deliverable.hermes_evidence, 20);
  assert.equal(descriptor.rows_by_deliverable.claude_review, 2);
  assert.equal(descriptor.rows_by_deliverable.test, 1);
  assert.ok(descriptor.permission_audit_evidence_terminal_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
  assert.ok(descriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "next_gate_readiness" && row.next_gate_readiness_ref));
  assert.ok(descriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "block_semantics" && row.block_semantics_ref));
  assert.ok(descriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "claude_dependency_marker" && row.claude_dependency_marker_ref));
  assert.ok(descriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "human_approval_marker" && row.human_approval_marker_ref));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "block_semantics"));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_dependency_marker"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_approval_marker"));
  assert.ok(descriptor.permission_audit_evidence_terminal_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_CLOSEOUT_HANDOFF")));
  assert.ok(descriptor.permission_audit_evidence_terminal_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_REVIEW_DEPENDENCY")));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-194 Hermes, Claude, and handoff packets preserve Risk B authority boundaries", () => {
  const descriptor = createMatterCorePermissionAuditEvidenceTerminalBridgeDescriptor();
  const bridge = validateMatterCoreCp194PermissionAuditEvidenceTerminalBridge(matterContract, descriptor);
  const hermes = createMatterCoreCp194HermesEvidencePacket(cp194PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp194ClaudeReviewPacket(cp194PlanPack);
  const handoff = createMatterCoreCp194CloseoutHandoff();

  assert.equal(bridge.valid, true, bridge.errors.join("; "));
  assert.ok(["CP00-195", "CP00-196", "CP00-197"].includes(matterContract.current_pack.pack_id));
  assert.equal(matterContract.permission_audit_evidence_terminal_bridge.pack_id, "CP00-194");
  assert.equal(matterContract.failure_fixture_evidence_review_bridge.pack_id, "CP00-193");
  assert.deepEqual(MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-194.matter_core_permission_audit_evidence_terminal_bridge");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-194.matter_core_permission_audit_evidence_terminal_bridge");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-195");
  assert.equal(handoff.next_subphase_id, "RP05.P08.M06.S18");
});

test("CP00-195 plan binding covers evidence review handoff terminal bridge units", () => {
  const coverage = validateMatterCoreCp195Coverage(cp195PlanPack);
  assert.equal(MATTER_CORE_CP195_PACK_BINDING.pack_id, "CP00-195");
  assert.equal(MATTER_CORE_CP195_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP195_PACK_BINDING.unit_count, 150);
  assert.equal(MATTER_CORE_CP195_PACK_BINDING.range, "RP05.P08.M06.S18-RP05.P09.M07.S02");
  assert.equal(MATTER_CORE_CP195_PACK_BINDING.upstream_pack_id, "CP00-194");
  assert.equal(MATTER_CORE_CP195_PACK_BINDING.next_pack_id, "CP00-196");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_phase["RP05.P08"], 73);
  assert.equal(coverage.summary.by_phase["RP05.P09"], 77);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M06"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M07"], 22);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M09"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP05.P08.M10"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP05.P09.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP05.P09.M05"], 20);
  assert.equal(coverage.summary.by_micro_title["Synthetic Fixture Set"], 11);
  assert.equal(coverage.summary.by_micro_title["Test And Golden Case Set"], 24);
  assert.equal(coverage.summary.by_micro_title["Permission And Audit Binding"], 20);
  assert.equal(coverage.summary.by_deliverable.implementation, 63);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 38);
  assert.equal(coverage.summary.by_deliverable.claude_review, 21);
  assert.equal(coverage.summary.by_deliverable.security_audit, 14);
  assert.equal(coverage.summary.by_deliverable.test, 9);
  assert.equal(coverage.summary.by_deliverable.ui, 5);
});

test("CP00-195 evidence review handoff terminal bridge remains descriptor-only", () => {
  const descriptor = createMatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor();
  const validation = validateMatterCoreCp195EvidenceReviewHandoffTerminalBridge(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-195");
  assert.equal(descriptor.descriptor, "MatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor");
  assert.equal(descriptor.source_permission_audit_evidence_terminal_bridge_pack_id, "CP00-194");
  assert.equal(descriptor.source_failure_fixture_evidence_review_bridge_pack_id, "CP00-193");
  assert.equal(descriptor.evidence_review_handoff_terminal_row_count, 150);
  assert.equal(descriptor.rows_by_phase["RP05.P08"], 73);
  assert.equal(descriptor.rows_by_phase["RP05.P09"], 77);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M06"], 3);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P08.M07"], 22);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P09.M03"], 20);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P09.M05"], 20);
  assert.equal(descriptor.rows_by_deliverable.security_audit, 14);
  assert.equal(descriptor.rows_by_deliverable.ui, 5);
  assert.equal(descriptor.security_audit_rows.length, 14);
  assert.equal(descriptor.ui_leak_rows.length, 5);
  assert.ok(descriptor.evidence_review_handoff_terminal_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
  assert.ok(descriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_bypass_questions"));
  assert.ok(descriptor.rows_by_outcome.review_required.some((row) => row.control === "architecture_review_questions"));
  assert.ok(descriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_approval_summary"));
  assert.ok(descriptor.evidence_review_handoff_terminal_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_SECURITY_AUDIT_QUESTION")));
  assert.ok(descriptor.evidence_review_handoff_terminal_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_UI_LEAK_REVIEW")));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-195 Hermes, Claude, and handoff packets preserve Risk C authority boundaries", () => {
  const descriptor = createMatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor();
  const bridge = validateMatterCoreCp195EvidenceReviewHandoffTerminalBridge(matterContract, descriptor);
  const hermes = createMatterCoreCp195HermesEvidencePacket(cp195PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp195ClaudeReviewPacket(cp195PlanPack);
  const handoff = createMatterCoreCp195CloseoutHandoff();

  assert.equal(bridge.valid, true, bridge.errors.join("; "));
  assert.equal(matterContract.current_pack.pack_id, "CP00-197");
  assert.equal(matterContract.evidence_review_handoff_terminal_bridge.pack_id, "CP00-195");
  assert.equal(matterContract.permission_audit_evidence_terminal_bridge.pack_id, "CP00-194");
  assert.deepEqual(MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-195.matter_core_evidence_review_handoff_terminal_bridge");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-195.matter_core_evidence_review_handoff_terminal_bridge");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-196");
  assert.equal(handoff.next_subphase_id, "RP05.P09.M07.S03");
});

test("CP00-196 plan binding covers Risk A review question security gate units", () => {
  const coverage = validateMatterCoreCp196Coverage(cp196PlanPack);
  assert.equal(MATTER_CORE_CP196_PACK_BINDING.pack_id, "CP00-196");
  assert.equal(MATTER_CORE_CP196_PACK_BINDING.risk_class, "A");
  assert.equal(MATTER_CORE_CP196_PACK_BINDING.unit_count, 10);
  assert.equal(MATTER_CORE_CP196_PACK_BINDING.range, "RP05.P09.M07.S03-RP05.P09.M07.S12");
  assert.equal(MATTER_CORE_CP196_PACK_BINDING.upstream_pack_id, "CP00-195");
  assert.equal(MATTER_CORE_CP196_PACK_BINDING.next_pack_id, "CP00-197");
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_phase["RP05.P09"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP05.P09.M07"], 10);
  assert.equal(coverage.summary.by_micro_title["Test And Golden Case Set"], 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.test, 1);
  assert.equal(coverage.summary.by_deliverable.ui, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 6);
});

test("CP00-196 review question security gate remains descriptor-only", () => {
  const descriptor = createMatterCoreReviewQuestionSecurityGateDescriptor();
  const validation = validateMatterCoreCp196ReviewQuestionSecurityGate(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-196");
  assert.equal(descriptor.descriptor, "MatterCoreReviewQuestionSecurityGateDescriptor");
  assert.equal(descriptor.source_evidence_review_handoff_terminal_bridge_pack_id, "CP00-195");
  assert.equal(descriptor.review_question_security_gate_row_count, 10);
  assert.equal(descriptor.rows_by_phase["RP05.P09"], 10);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P09.M07"], 10);
  assert.equal(descriptor.rows_by_deliverable.security_audit, 2);
  assert.equal(descriptor.rows_by_deliverable.test, 1);
  assert.equal(descriptor.rows_by_deliverable.ui, 1);
  assert.equal(descriptor.rows_by_deliverable.implementation, 6);
  assert.equal(descriptor.blocked_question_rows.length, 2);
  assert.equal(descriptor.test_question_rows.length, 1);
  assert.equal(descriptor.ui_leak_rows.length, 1);
  assert.equal(descriptor.risk_register_rows.length, 3);
  assert.equal(descriptor.human_approval_rows.length, 1);
  assert.ok(descriptor.review_question_security_gate_rows.every((row) => row.question_ref));
  assert.ok(descriptor.review_question_security_gate_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
  assert.ok(descriptor.review_question_security_gate_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_SECURITY_AUDIT_QUESTION")));
  assert.ok(descriptor.review_question_security_gate_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_HUMAN_APPROVAL_REQUIRED")));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.replay_commands_inert, true);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-196 Hermes, Claude, and handoff packets preserve Risk A authority boundaries", () => {
  const descriptor = createMatterCoreReviewQuestionSecurityGateDescriptor();
  const gate = validateMatterCoreCp196ReviewQuestionSecurityGate(matterContract, descriptor);
  const hermes = createMatterCoreCp196HermesEvidencePacket(cp196PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp196ClaudeReviewPacket(cp196PlanPack);
  const handoff = createMatterCoreCp196CloseoutHandoff();

  assert.equal(gate.valid, true, gate.errors.join("; "));
  assert.equal(matterContract.current_pack.pack_id, "CP00-197");
  assert.equal(matterContract.review_question_security_gate.pack_id, "CP00-196");
  assert.equal(matterContract.evidence_review_handoff_terminal_bridge.pack_id, "CP00-195");
  assert.deepEqual(MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-196.matter_core_review_question_security_gate");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(claude.review_packet, "C05.CP00-196.matter_core_review_question_security_gate");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(handoff.to_pack_id, "CP00-197");
  assert.equal(handoff.next_subphase_id, "RP05.P09.M07.S13");
});

test("CP00-197 plan binding covers terminal review closeout handoff units", () => {
  const coverage = validateMatterCoreCp197Coverage(cp197PlanPack);

  assert.equal(MATTER_CORE_CP197_PACK_BINDING.pack_id, "CP00-197");
  assert.equal(MATTER_CORE_CP197_PACK_BINDING.risk_class, "C");
  assert.equal(MATTER_CORE_CP197_PACK_BINDING.unit_count, 28);
  assert.equal(MATTER_CORE_CP197_PACK_BINDING.range, "RP05.P09.M07.S13-RP05.P09.M10.S04");
  assert.equal(MATTER_CORE_CP197_PACK_BINDING.upstream_pack_id, "CP00-196");
  assert.equal(MATTER_CORE_CP197_PACK_BINDING.next_pack_id, "CP00-198");
  assert.ok(MATTER_CORE_CP197_PACK_BINDING.override_reason.includes("28 units"));
  assert.equal(coverage.valid, true, coverage.errors.join("; "));
  assert.equal(coverage.summary.unit_count, 28);
  assert.equal(coverage.summary.by_phase["RP05.P09"], 28);
  assert.equal(coverage.summary.by_micro_phase["RP05.P09.M07"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP05.P09.M08"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP05.P09.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP05.P09.M10"], 4);
  assert.equal(coverage.summary.by_micro_title["Test And Golden Case Set"], 8);
  assert.equal(coverage.summary.by_micro_title["Hermes Evidence Packet"], 8);
  assert.equal(coverage.summary.by_micro_title["Claude Review Packet"], 8);
  assert.equal(coverage.summary.by_micro_title["Closeout And Next Handoff"], 4);
  assert.equal(coverage.summary.by_deliverable.claude_review, 7);
  assert.equal(coverage.summary.by_deliverable.implementation, 11);
  assert.equal(coverage.summary.by_deliverable.security_audit, 6);
  assert.equal(coverage.summary.by_deliverable.test, 2);
  assert.equal(coverage.summary.by_deliverable.ui, 2);
});

test("CP00-197 terminal review closeout handoff remains descriptor-only", () => {
  const descriptor = createMatterCoreTerminalReviewCloseoutHandoffDescriptor();
  const validation = validateMatterCoreCp197TerminalReviewCloseoutHandoff(matterContract, descriptor);

  assert.equal(descriptor.pack_id, "CP00-197");
  assert.equal(descriptor.descriptor, "MatterCoreTerminalReviewCloseoutHandoffDescriptor");
  assert.equal(descriptor.source_review_question_security_gate_pack_id, "CP00-196");
  assert.equal(descriptor.source_evidence_review_handoff_terminal_bridge_pack_id, "CP00-195");
  assert.equal(descriptor.terminal_review_closeout_handoff_row_count, 28);
  assert.equal(descriptor.rows_by_phase["RP05.P09"], 28);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P09.M07"], 8);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P09.M08"], 8);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P09.M09"], 8);
  assert.equal(descriptor.rows_by_micro_phase["RP05.P09.M10"], 4);
  assert.equal(descriptor.rows_by_deliverable.claude_review, 7);
  assert.equal(descriptor.rows_by_deliverable.implementation, 11);
  assert.equal(descriptor.rows_by_deliverable.security_audit, 6);
  assert.equal(descriptor.rows_by_deliverable.test, 2);
  assert.equal(descriptor.rows_by_deliverable.ui, 2);
  assert.equal(descriptor.blocked_question_rows.length, 7);
  assert.equal(descriptor.review_required_rows.length, 7);
  assert.equal(descriptor.test_question_rows.length, 2);
  assert.equal(descriptor.ui_leak_rows.length, 2);
  assert.equal(descriptor.handoff_rows.length, 4);
  assert.equal(descriptor.closeout_note_rows.length, 3);
  assert.ok(descriptor.terminal_review_closeout_handoff_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
  assert.ok(descriptor.terminal_review_closeout_handoff_rows.every((row) => row.question_ref));
  assert.ok(descriptor.terminal_review_closeout_handoff_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_SECURITY_AUDIT_QUESTION")));
  assert.ok(descriptor.terminal_review_closeout_handoff_rows.some((row) => row.customer_safe_error_codes.includes("MATTER_CORE_UI_LEAK_REVIEW")));
  assert.equal(descriptor.leak_guards.no_runtime_permission_evaluation, true);
  assert.equal(descriptor.leak_guards.no_audit_event_write, true);
  assert.equal(descriptor.leak_guards.no_permission_decision_detail, true);
  assert.equal(descriptor.leak_guards.no_audit_event_body, true);
  assert.equal(descriptor.leak_guards.no_route_dispatch, true);
  assert.equal(descriptor.leak_guards.no_failure_recovery_execution, true);
  assert.equal(descriptor.leak_guards.no_rp06_runtime_implementation, true);
  assert.equal(descriptor.closeout_handoff.to_pack_id, "CP00-198");
  assert.equal(descriptor.closeout_handoff.next_subphase_id, "RP06.P00.M00.S01");
  assert.equal(descriptor.closeout_handoff.next_program_runtime_implemented, false);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("CP00-197 Hermes, Claude, and handoff packets preserve terminal authority boundaries", () => {
  const descriptor = createMatterCoreTerminalReviewCloseoutHandoffDescriptor();
  const terminalHandoff = validateMatterCoreCp197TerminalReviewCloseoutHandoff(matterContract, descriptor);
  const hermes = createMatterCoreCp197HermesEvidencePacket(cp197PlanPack, matterContract, descriptor);
  const claude = createMatterCoreCp197ClaudeReviewPacket(cp197PlanPack);
  const handoff = createMatterCoreCp197CloseoutHandoff();

  assert.equal(terminalHandoff.valid, true, terminalHandoff.errors.join("; "));
  assert.equal(matterContract.current_pack.pack_id, "CP00-197");
  assert.equal(matterContract.terminal_review_closeout_handoff.pack_id, "CP00-197");
  assert.equal(matterContract.review_question_security_gate.pack_id, "CP00-196");
  assert.deepEqual(MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.writes_audit_event, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.renders_live_dom, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.implements_loop_engine, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.implements_rp06_dms_runtime, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
  assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
  assert.equal(hermes.evidence_packet, "H05.CP00-197.matter_core_terminal_review_closeout_handoff");
  assert.equal(hermes.production_ready_candidate, true);
  assert.equal(hermes.rp06_runtime_implemented, false);
  assert.equal(claude.review_packet, "C05.CP00-197.matter_core_terminal_review_closeout_handoff");
  assert.equal(claude.read_only, true);
  assert.equal(claude.source_inspection_basis, "read_tools_used");
  assert.deepEqual(claude.allowed_tools, ["Read", "Grep", "Glob"]);
  assert.equal(claude.next_pack_id, "CP00-198");
  assert.equal(handoff.to_pack_id, "CP00-198");
  assert.equal(handoff.next_subphase_id, "RP06.P00.M00.S01");
  assert.equal(handoff.rp06_runtime_implemented, false);
});
