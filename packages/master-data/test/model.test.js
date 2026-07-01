import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  AMIC_CURRENT_CLIENT_CANDIDATES,
  MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS,
  MASTER_DATA_CP156_PACK_BINDING,
  MASTER_DATA_CP156_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP157_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP157_PACK_BINDING,
  MASTER_DATA_CP158_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP158_PACK_BINDING,
  MASTER_DATA_CP159_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP159_PACK_BINDING,
  MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS,
  MASTER_DATA_CP160_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP160_PACK_BINDING,
  MASTER_DATA_CP161_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP161_PACK_BINDING,
  MASTER_DATA_CP162_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP162_PACK_BINDING,
  MASTER_DATA_CP163_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP163_PACK_BINDING,
  MASTER_DATA_CP164_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP164_PACK_BINDING,
  MASTER_DATA_CP165_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP165_PACK_BINDING,
  MASTER_DATA_CP166_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP166_PACK_BINDING,
  MASTER_DATA_CP167_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP167_PACK_BINDING,
  MASTER_DATA_CP168_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP168_PACK_BINDING,
  MASTER_DATA_CP169_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP169_PACK_BINDING,
  MASTER_DATA_CP170_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP170_PACK_BINDING,
  MASTER_DATA_CP171_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP171_PACK_BINDING,
  MASTER_DATA_CP172_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP172_PACK_BINDING,
  MASTER_DATA_CP173_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP173_PACK_BINDING,
  MASTER_DATA_CP174_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP174_PACK_BINDING,
  MASTER_DATA_CP175_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP175_PACK_BINDING,
  MASTER_DATA_CP176_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP176_PACK_BINDING,
  MASTER_DATA_API_REFERENCE_SURFACE,
  MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE,
  MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE,
  MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION,
  MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY,
  MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY,
  MASTER_DATA_MODEL_DEFINITIONS,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS,
  MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY,
  MASTER_DATA_PERMISSION_MATRIX_WORKFLOW,
  MASTER_DATA_PERMISSION_AUDIT_BINDING,
  MASTER_DATA_SERVICE_BOUNDARY,
  MASTER_DATA_SERVICE_TAIL_BOUNDARY,
  MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG,
  MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS,
  MASTER_DATA_UI_INTERACTION_WORKFLOW,
  MASTER_DATA_UI_SURFACE_STATES,
  createMasterDataCp157ClaudeReviewPacket,
  createMasterDataCp157CloseoutHandoff,
  createMasterDataCp157HermesEvidencePacket,
  createMasterDataCp158ClaudeReviewPacket,
  createMasterDataCp158CloseoutHandoff,
  createMasterDataCp158HermesEvidencePacket,
  createMasterDataCp159ClaudeReviewPacket,
  createMasterDataCp159CloseoutHandoff,
  createMasterDataCp159HermesEvidencePacket,
  createMasterDataCp160ClaudeReviewPacket,
  createMasterDataCp160CloseoutHandoff,
  createMasterDataCp160HermesEvidencePacket,
  createMasterDataCp161ClaudeReviewPacket,
  createMasterDataCp161CloseoutHandoff,
  createMasterDataCp161HermesEvidencePacket,
  createMasterDataCp162ClaudeReviewPacket,
  createMasterDataCp162CloseoutHandoff,
  createMasterDataCp162HermesEvidencePacket,
  createMasterDataCp163ClaudeReviewPacket,
  createMasterDataCp163CloseoutHandoff,
  createMasterDataCp163HermesEvidencePacket,
  createMasterDataCp164ClaudeReviewPacket,
  createMasterDataCp164CloseoutHandoff,
  createMasterDataCp164HermesEvidencePacket,
  createMasterDataCp165ClaudeReviewPacket,
  createMasterDataCp165CloseoutHandoff,
  createMasterDataCp165HermesEvidencePacket,
  createMasterDataCp166ClaudeReviewPacket,
  createMasterDataCp166CloseoutHandoff,
  createMasterDataCp166HermesEvidencePacket,
  createMasterDataCp167ClaudeReviewPacket,
  createMasterDataCp167CloseoutHandoff,
  createMasterDataCp167HermesEvidencePacket,
  createMasterDataCp168ClaudeReviewPacket,
  createMasterDataCp168CloseoutHandoff,
  createMasterDataCp168HermesEvidencePacket,
  createMasterDataCp169ClaudeReviewPacket,
  createMasterDataCp169CloseoutHandoff,
  createMasterDataCp169HermesEvidencePacket,
  createMasterDataCp170ClaudeReviewPacket,
  createMasterDataCp170CloseoutHandoff,
  createMasterDataCp170HermesEvidencePacket,
  createMasterDataCp171ClaudeReviewPacket,
  createMasterDataCp171CloseoutHandoff,
  createMasterDataCp171HermesEvidencePacket,
  createMasterDataCp172ClaudeReviewPacket,
  createMasterDataCp172CloseoutHandoff,
  createMasterDataCp172HermesEvidencePacket,
  createMasterDataCp173ClaudeReviewPacket,
  createMasterDataCp173CloseoutHandoff,
  createMasterDataCp173HermesEvidencePacket,
  createMasterDataCp174ClaudeReviewPacket,
  createMasterDataCp174CloseoutHandoff,
  createMasterDataCp174HermesEvidencePacket,
  createMasterDataCp175ClaudeReviewPacket,
  createMasterDataCp175CloseoutHandoff,
  createMasterDataCp175HermesEvidencePacket,
  createMasterDataCp176ClaudeReviewPacket,
  createMasterDataCp176CloseoutHandoff,
  createMasterDataCp176HermesEvidencePacket,
  createMasterDataApiReferenceCatalog,
  createMasterDataApiReferenceFixture,
  createMasterDataBillingProfile,
  createMasterDataClientGroup,
  createMasterDataContactPoint,
  createMasterDataParty,
  createMasterDataPartyAlias,
  createMasterDataPartyIdentifier,
  createMasterDataCp156ClaudeReviewPacket,
  createMasterDataCp156CloseoutHandoff,
  createMasterDataCp156HermesEvidencePacket,
  createMasterDataDuplicateCandidateQueue,
  createMasterDataG2CloseoutDescriptor,
  createMasterDataPartyMergeSplitWorkflowDescriptor,
  createMasterDataPartyProfileUiStateDescriptor,
  createMasterDataPartySearchUiStateDescriptor,
  createMasterDataRelatedPartySearchDescriptor,
  executeMasterDataClientGroupingWorkflow,
  executeMasterDataContactNormalizationWorkflow,
  executeMasterDataDuplicateReviewWorkflow,
  executeMasterDataEntityCreationWorkflow,
  executeMasterDataRelationshipMappingWorkflow,
  executeMasterDataServicePrechecks,
  executeMasterDataServiceWorkflow,
  createMasterDataServiceIntegrationSmokeCase,
  createMasterDataServiceReviewPathCase,
  createMasterDataServiceTailDescriptor,
  createMasterDataPermissionAuditBindingCatalog,
  createMasterDataPermissionAuditBindingDescriptor,
  createMasterDataPermissionAuditDecisionBindingCatalog,
  createMasterDataPermissionAuditDecisionBindingDescriptor,
  createMasterDataPermissionAuditControlInteractionsCatalog,
  createMasterDataPermissionAuditControlInteractionDescriptor,
  createMasterDataPermissionAuditFixtureDecisionTestsCatalog,
  createMasterDataPermissionAuditFixtureDecisionTestDescriptor,
  createMasterDataPermissionAuditWorkflowFailureTaxonomyCatalog,
  createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor,
  createMasterDataFailureTaxonomyEdgeCaseEscalationCatalog,
  createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor,
  createMasterDataFailureTaxonomySensitiveEntryBoundaryCatalog,
  createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor,
  createMasterDataFailureTaxonomyOperationalEdgeBoundaryCatalog,
  createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor,
  createMasterDataFailureEvidenceReviewHandoffBridgeCatalog,
  createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor,
  createMasterDataPermissionAuditSensitiveTailBoundaryCatalog,
  createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor,
  createMasterDataEvidenceReviewUiReadinessBridgeCatalog,
  createMasterDataEvidenceReviewUiReadinessBridgeDescriptor,
  createMasterDataTerminalReviewCloseoutReadinessCatalog,
  createMasterDataTerminalReviewCloseoutReadinessDescriptor,
  createMasterDataSyntheticFixtureEntryCatalog,
  createMasterDataSyntheticFixtureEntryDescriptor,
  createMasterDataSyntheticFixtureSetCase,
  createMasterDataSyntheticFixtureSetCatalog,
  createMasterDataPermissionMatrixDecisionDescriptor,
  createMasterDataPermissionMatrixWorkflowCatalog,
  createMasterDataUiSurfaceStateCatalog,
  createMasterDataUiInteractionFixture,
  createMasterDataUiInteractionWorkflowCatalog,
  normalizeMasterDataServiceRequest,
  createMasterDataEntity,
  createMasterDataOrganization,
  createMasterDataPerson,
  createMasterDataRecord,
  createMasterDataRelationship,
  createMasterDataSyntheticFixture,
  listMasterDataModelTypes,
  validateMasterDataCp157Coverage,
  validateMasterDataCp157ServiceBoundary,
  validateMasterDataCp158Coverage,
  validateMasterDataCp158TailBoundary,
  validateMasterDataCp159Coverage,
  validateMasterDataCp159ServiceEvidence,
  validateMasterDataCp160ApiUiReference,
  validateMasterDataCp160Coverage,
  validateMasterDataCp161Coverage,
  validateMasterDataCp161UiInteractionWorkflow,
  validateMasterDataCp162Coverage,
  validateMasterDataCp162PermissionAuditBinding,
  validateMasterDataCp163Coverage,
  validateMasterDataCp163SyntheticFixtureEntry,
  validateMasterDataCp164Coverage,
  validateMasterDataCp164SyntheticFixtureSet,
  validateMasterDataCp165Coverage,
  validateMasterDataCp165PermissionMatrixWorkflow,
  validateMasterDataCp166Coverage,
  validateMasterDataCp166PermissionAuditDecisionBinding,
  validateMasterDataCp167Coverage,
  validateMasterDataCp167PermissionAuditControlInteractions,
  validateMasterDataCp168Coverage,
  validateMasterDataCp168PermissionAuditFixtureDecisionTests,
  validateMasterDataCp169Coverage,
  validateMasterDataCp169PermissionAuditWorkflowFailureTaxonomy,
  validateMasterDataCp170Coverage,
  validateMasterDataCp170FailureTaxonomyEdgeCaseEscalation,
  validateMasterDataCp171Coverage,
  validateMasterDataCp171FailureTaxonomySensitiveEntryBoundary,
  validateMasterDataCp172Coverage,
  validateMasterDataCp172FailureTaxonomyOperationalEdgeBoundary,
  validateMasterDataCp173Coverage,
  validateMasterDataCp173FailureEvidenceReviewHandoffBridge,
  validateMasterDataCp174Coverage,
  validateMasterDataCp174PermissionAuditSensitiveTailBoundary,
  validateMasterDataCp175Coverage,
  validateMasterDataCp175EvidenceReviewUiReadinessBridge,
  validateMasterDataCp176Coverage,
  validateMasterDataCp176TerminalReviewCloseoutReadiness,
  validateMasterDataCp156Coverage,
  validateMasterDataRecord,
  validateMasterDataRegistry,
} from "../src/index.js";
import closeoutPlan from "../../../docs/closeout-pack-plan/closeout-pack-plan.json" with { type: "json" };
import masterDataContract from "../../../contracts/master-data-contract.json" with { type: "json" };
import cp156Manifest from "../../../docs/closeout-packs/cp00-156/manifest.json" with { type: "json" };
import cp157Manifest from "../../../docs/closeout-packs/cp00-157/manifest.json" with { type: "json" };

const cp156PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-156") ?? cp156Manifest.plan_binding_snapshot;
const cp157PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-157") ?? cp157Manifest.plan_binding_snapshot;
const cp158ManifestPath = new URL("../../../docs/closeout-packs/cp00-158/manifest.json", import.meta.url);
const cp158Manifest = existsSync(cp158ManifestPath) ? JSON.parse(readFileSync(cp158ManifestPath, "utf8")) : null;
const cp158PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-158") ?? cp158Manifest?.plan_binding_snapshot;
const cp159ManifestPath = new URL("../../../docs/closeout-packs/cp00-159/manifest.json", import.meta.url);
const cp159Manifest = existsSync(cp159ManifestPath) ? JSON.parse(readFileSync(cp159ManifestPath, "utf8")) : null;
const cp159PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-159") ?? cp159Manifest?.plan_binding_snapshot;
const cp160ManifestPath = new URL("../../../docs/closeout-packs/cp00-160/manifest.json", import.meta.url);
const cp160Manifest = existsSync(cp160ManifestPath) ? JSON.parse(readFileSync(cp160ManifestPath, "utf8")) : null;
const cp160PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-160") ?? cp160Manifest?.plan_binding_snapshot;
const cp161ManifestPath = new URL("../../../docs/closeout-packs/cp00-161/manifest.json", import.meta.url);
const cp161Manifest = existsSync(cp161ManifestPath) ? JSON.parse(readFileSync(cp161ManifestPath, "utf8")) : null;
const cp161PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-161") ?? cp161Manifest?.plan_binding_snapshot;
const cp162ManifestPath = new URL("../../../docs/closeout-packs/cp00-162/manifest.json", import.meta.url);
const cp162Manifest = existsSync(cp162ManifestPath) ? JSON.parse(readFileSync(cp162ManifestPath, "utf8")) : null;
const cp162PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-162") ?? cp162Manifest?.plan_binding_snapshot;
const cp163ManifestPath = new URL("../../../docs/closeout-packs/cp00-163/manifest.json", import.meta.url);
const cp163Manifest = existsSync(cp163ManifestPath) ? JSON.parse(readFileSync(cp163ManifestPath, "utf8")) : null;
const cp163PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-163") ?? cp163Manifest?.plan_binding_snapshot;
const cp164ManifestPath = new URL("../../../docs/closeout-packs/cp00-164/manifest.json", import.meta.url);
const cp164Manifest = existsSync(cp164ManifestPath) ? JSON.parse(readFileSync(cp164ManifestPath, "utf8")) : null;
const cp164PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-164") ?? cp164Manifest?.plan_binding_snapshot;
const cp165ManifestPath = new URL("../../../docs/closeout-packs/cp00-165/manifest.json", import.meta.url);
const cp165Manifest = existsSync(cp165ManifestPath) ? JSON.parse(readFileSync(cp165ManifestPath, "utf8")) : null;
const cp165PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-165") ?? cp165Manifest?.plan_binding_snapshot;
const cp166ManifestPath = new URL("../../../docs/closeout-packs/cp00-166/manifest.json", import.meta.url);
const cp166Manifest = existsSync(cp166ManifestPath) ? JSON.parse(readFileSync(cp166ManifestPath, "utf8")) : null;
const cp166PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-166") ?? cp166Manifest?.plan_binding_snapshot;
const cp167ManifestPath = new URL("../../../docs/closeout-packs/cp00-167/manifest.json", import.meta.url);
const cp167Manifest = existsSync(cp167ManifestPath) ? JSON.parse(readFileSync(cp167ManifestPath, "utf8")) : null;
const cp167PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-167") ?? cp167Manifest?.plan_binding_snapshot;
const cp168ManifestPath = new URL("../../../docs/closeout-packs/cp00-168/manifest.json", import.meta.url);
const cp168Manifest = existsSync(cp168ManifestPath) ? JSON.parse(readFileSync(cp168ManifestPath, "utf8")) : null;
const cp168PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-168") ?? cp168Manifest?.plan_binding_snapshot;
const cp169ManifestPath = new URL("../../../docs/closeout-packs/cp00-169/manifest.json", import.meta.url);
const cp169Manifest = existsSync(cp169ManifestPath) ? JSON.parse(readFileSync(cp169ManifestPath, "utf8")) : null;
const cp169PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-169") ?? cp169Manifest?.plan_binding_snapshot;
const cp170ManifestPath = new URL("../../../docs/closeout-packs/cp00-170/manifest.json", import.meta.url);
const cp170Manifest = existsSync(cp170ManifestPath) ? JSON.parse(readFileSync(cp170ManifestPath, "utf8")) : null;
const cp170PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-170") ?? cp170Manifest?.plan_binding_snapshot;
const cp171ManifestPath = new URL("../../../docs/closeout-packs/cp00-171/manifest.json", import.meta.url);
const cp171Manifest = existsSync(cp171ManifestPath) ? JSON.parse(readFileSync(cp171ManifestPath, "utf8")) : null;
const cp171PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-171") ?? cp171Manifest?.plan_binding_snapshot;
const cp172ManifestPath = new URL("../../../docs/closeout-packs/cp00-172/manifest.json", import.meta.url);
const cp172Manifest = existsSync(cp172ManifestPath) ? JSON.parse(readFileSync(cp172ManifestPath, "utf8")) : null;
const cp172PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-172") ?? cp172Manifest?.plan_binding_snapshot;
const cp173ManifestPath = new URL("../../../docs/closeout-packs/cp00-173/manifest.json", import.meta.url);
const cp173Manifest = existsSync(cp173ManifestPath) ? JSON.parse(readFileSync(cp173ManifestPath, "utf8")) : null;
const cp173PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-173") ?? cp173Manifest?.plan_binding_snapshot;
const cp174ManifestPath = new URL("../../../docs/closeout-packs/cp00-174/manifest.json", import.meta.url);
const cp174Manifest = existsSync(cp174ManifestPath) ? JSON.parse(readFileSync(cp174ManifestPath, "utf8")) : null;
const cp174PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-174") ?? cp174Manifest?.plan_binding_snapshot;
const cp175ManifestPath = new URL("../../../docs/closeout-packs/cp00-175/manifest.json", import.meta.url);
const cp175Manifest = existsSync(cp175ManifestPath) ? JSON.parse(readFileSync(cp175ManifestPath, "utf8")) : null;
const cp175PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-175") ?? cp175Manifest?.plan_binding_snapshot;
const cp176ManifestPath = new URL("../../../docs/closeout-packs/cp00-176/manifest.json", import.meta.url);
const cp176Manifest = existsSync(cp176ManifestPath) ? JSON.parse(readFileSync(cp176ManifestPath, "utf8")) : null;
const cp176PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-176") ?? cp176Manifest?.plan_binding_snapshot;

test("CP00-156 binds RP04 master data foundation model registry pack", () => {
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.pack_id, "CP00-156");
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.range, "RP04.P00.M00.S01-RP04.P01.M08.S05");
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.upstream_pack_id, "CP00-155");
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.next_pack_id, "CP00-157");
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.hermes_gate, "H04");
  assert.equal(MASTER_DATA_CP156_PACK_BINDING.claude_gate, "C04");
});

test("master data registry exposes ownership lifecycle and conditional Matter trace boundaries", () => {
  const result = validateMasterDataRegistry();
  assert.equal(result.valid, true);
  assert.equal(result.model_count, 10);
  assert.deepEqual(listMasterDataModelTypes(), [
    "Party",
    "Entity",
    "Person",
    "Organization",
    "PartyAlias",
    "PartyIdentifier",
    "ClientGroup",
    "Relationship",
    "ContactPoint",
    "BillingProfile",
  ]);
  for (const definition of Object.values(MASTER_DATA_MODEL_DEFINITIONS)) {
    assert.equal(definition.owner_module, "MasterData");
    assert.equal(definition.tenant_field, "tenant_id");
    assert.ok(definition.lifecycle_statuses.includes("review_required"));
    assert.equal(definition.matter_trace_policy, "required_when_workflow_touches_matter_or_document");
  }
});

test("G2-A party schema binds party person organization alias and identifier tenant keys", () => {
  const tenant_id = "tenant_g2_party";
  const owner_user_id = "user_g2_owner";
  const party = createMasterDataParty({
    party_id: "party_g2_amic",
    tenant_id,
    party_type: "organization",
    display_name: "AMIC G2 Client",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2_amic",
  });
  const personParty = createMasterDataParty({
    party_id: "party_g2_lee",
    tenant_id,
    party_type: "person",
    display_name: "Lee G2 Contact",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2_lee",
  });
  const organization = createMasterDataOrganization({
    organization_id: "org_g2_amic",
    party_id: party.party_id,
    tenant_id,
    entity_id: "entity_g2_amic",
    display_name: "AMIC G2 Client",
    status: "active",
    owner_user_id,
    registration_number: "123-45-67890",
  });
  const person = createMasterDataPerson({
    person_id: "person_g2_lee",
    party_id: personParty.party_id,
    tenant_id,
    entity_id: "entity_g2_lee",
    display_name: "Lee G2 Contact",
    status: "active",
    owner_user_id,
    email: "lee.g2@example.invalid",
  });
  const koreanAlias = createMasterDataPartyAlias({
    party_alias_id: "alias_g2_amic_ko",
    tenant_id,
    party_id: party.party_id,
    alias_value: "에이엠아이씨",
    alias_type: "localized_name",
    locale: "ko-KR",
    status: "active",
    owner_user_id,
  });
  const englishFormerAlias = createMasterDataPartyAlias({
    party_alias_id: "alias_g2_amic_former",
    tenant_id,
    party_id: party.party_id,
    alias_value: "AMIC Former LLP",
    alias_type: "former_name",
    locale: "en-US",
    status: "archived",
    owner_user_id,
  });
  const businessNumber = createMasterDataPartyIdentifier({
    party_identifier_id: "identifier_g2_business",
    tenant_id,
    party_id: party.party_id,
    identifier_type: "business_number",
    identifier_value: "123-45-67890",
    jurisdiction: "KR",
    verified: true,
    status: "active",
    owner_user_id,
  });
  const lei = createMasterDataPartyIdentifier({
    party_identifier_id: "identifier_g2_lei",
    tenant_id,
    party_id: party.party_id,
    identifier_type: "lei",
    identifier_value: "549300G2AMICCLIENT01",
    jurisdiction: "GLOBAL",
    verified: false,
    status: "review_required",
    owner_user_id,
  });
  const registrationId = createMasterDataPartyIdentifier({
    party_identifier_id: "identifier_g2_registration",
    tenant_id,
    party_id: party.party_id,
    identifier_type: "registration_id",
    identifier_value: "REG-G2-AMIC",
    jurisdiction: "KR",
    verified: true,
    status: "active",
    owner_user_id,
  });

  assert.equal(party.identity_key, "tenant_g2_party:party:organization:amic g2 client");
  assert.equal(personParty.identity_key, "tenant_g2_party:party:person:lee g2 contact");
  assert.equal(organization.party_id, party.party_id);
  assert.equal(person.party_id, personParty.party_id);
  assert.equal(koreanAlias.normalized_alias_key, "tenant_g2_party:party-alias:party_g2_amic:ko-KR:에이엠아이씨");
  assert.equal(englishFormerAlias.normalized_alias_key, "tenant_g2_party:party-alias:party_g2_amic:en-US:amic former llp");
  assert.equal(businessNumber.normalized_identifier_key, "tenant_g2_party:party-identifier:business_number:123-45-67890");
  assert.equal(lei.normalized_identifier_key, "tenant_g2_party:party-identifier:lei:549300g2amicclient01");
  assert.equal(registrationId.normalized_identifier_key, "tenant_g2_party:party-identifier:registration_id:reg-g2-amic");

  assert.equal(validateMasterDataRecord("Party", party).valid, true);
  assert.equal(validateMasterDataRecord("PartyAlias", koreanAlias).valid, true);
  assert.equal(validateMasterDataRecord("PartyIdentifier", businessNumber).valid, true);

  const duplicateAlias = validateMasterDataRecord("PartyAlias", koreanAlias, {
    known_alias_keys: [koreanAlias.normalized_alias_key],
  });
  assert.equal(duplicateAlias.valid, true);
  assert.ok(duplicateAlias.review_required_claims.includes("duplicate_alias_review_required"));

  const duplicateIdentifier = validateMasterDataRecord("PartyIdentifier", businessNumber, {
    known_identifier_keys: [businessNumber.normalized_identifier_key],
  });
  assert.equal(duplicateIdentifier.valid, true);
  assert.ok(duplicateIdentifier.review_required_claims.includes("duplicate_identifier_review_required"));

  assert.throws(
    () => createMasterDataParty({ ...party, party_id: "party_bad", party_type: "court" }),
    /Party type must be one of/,
  );
  assert.throws(
    () => createMasterDataPartyAlias({ ...koreanAlias, party_alias_id: "alias_bad", alias_type: "nickname" }),
    /PartyAlias type must be one of/,
  );
  assert.throws(
    () =>
      createMasterDataPartyIdentifier({
        ...businessNumber,
        party_identifier_id: "identifier_bad",
        identifier_type: "tax_id",
      }),
    /PartyIdentifier type must be one of/,
  );
});

test("G2-B relationship and billing profile schema binds group contact and client references", () => {
  const tenant_id = "tenant_g2_relationship";
  const owner_user_id = "user_g2_owner";
  const legalClient = createMasterDataParty({
    party_id: "party_g2_legal_client",
    tenant_id,
    party_type: "organization",
    display_name: "G2 Legal Client",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2_legal_client",
  });
  const billingClient = createMasterDataParty({
    party_id: "party_g2_billing_client",
    tenant_id,
    party_type: "organization",
    display_name: "G2 Billing Client",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2_billing_client",
  });
  const contactParty = createMasterDataParty({
    party_id: "party_g2_contact",
    tenant_id,
    party_type: "person",
    display_name: "G2 Billing Contact",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2_contact",
  });
  const clientGroup = createMasterDataClientGroup({
    client_group_id: "client_group_g2_family",
    tenant_id,
    display_name: "G2 Client Family",
    status: "active",
    owner_user_id,
    member_party_ids: [legalClient.party_id, billingClient.party_id, contactParty.party_id],
    primary_party_id: legalClient.party_id,
    member_entity_ids: [legalClient.canonical_entity_id, billingClient.canonical_entity_id, contactParty.canonical_entity_id],
  });
  const relationship = createMasterDataRelationship({
    relationship_id: "relationship_g2_billing_contact",
    tenant_id,
    from_entity_id: contactParty.canonical_entity_id,
    to_entity_id: legalClient.canonical_entity_id,
    from_party_id: contactParty.party_id,
    to_party_id: legalClient.party_id,
    relationship_type: "billing_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id,
  });
  const contactPoint = createMasterDataContactPoint({
    contact_point_id: "contact_g2_billing_email",
    tenant_id,
    owner_entity_id: contactParty.canonical_entity_id,
    owner_party_id: contactParty.party_id,
    contact_type: "billing_email",
    value: "billing.g2@example.invalid",
    is_primary: true,
    verified: true,
    status: "active",
    owner_user_id,
  });
  const billingProfile = createMasterDataBillingProfile({
    billing_profile_id: "billing_profile_g2",
    tenant_id,
    billing_entity_id: billingClient.canonical_entity_id,
    legal_client_party_id: legalClient.party_id,
    billing_client_party_id: billingClient.party_id,
    billing_contact_point_id: contactPoint.contact_point_id,
    display_name: "G2 Billing Profile",
    status: "active",
    owner_user_id,
    client_group_id: clientGroup.client_group_id,
  });

  assert.deepEqual(clientGroup.member_party_ids, [legalClient.party_id, billingClient.party_id, contactParty.party_id]);
  assert.equal(clientGroup.primary_party_id, legalClient.party_id);
  assert.equal(relationship.from_party_id, contactParty.party_id);
  assert.equal(relationship.to_party_id, legalClient.party_id);
  assert.equal(contactPoint.is_primary, true);
  assert.equal(contactPoint.verified, true);
  assert.equal(contactPoint.verification_status, "verified");
  assert.equal(billingProfile.legal_client_party_id, legalClient.party_id);
  assert.equal(billingProfile.billing_client_party_id, billingClient.party_id);
  assert.equal(billingProfile.billing_contact_point_id, contactPoint.contact_point_id);

  assert.equal(validateMasterDataRecord("ClientGroup", clientGroup, { member_tenant_ids: [tenant_id, tenant_id, tenant_id] }).valid, true);
  assert.equal(
    validateMasterDataRecord("Relationship", relationship, {
      party_types_by_id: {
        [contactParty.party_id]: contactParty.party_type,
        [legalClient.party_id]: legalClient.party_type,
      },
    }).valid,
    true,
  );
  assert.equal(validateMasterDataRecord("ContactPoint", contactPoint).valid, true);
  assert.equal(
    validateMasterDataRecord("BillingProfile", billingProfile, {
      require_legal_and_billing_client_refs: true,
      require_distinct_billing_client: true,
    }).valid,
    true,
  );

  const missingPrimary = validateMasterDataRecord("ClientGroup", {
    ...clientGroup,
    client_group_id: "client_group_g2_bad_primary",
    member_party_ids: [billingClient.party_id],
    primary_party_id: legalClient.party_id,
  });
  assert.equal(missingPrimary.valid, false);
  assert.ok(missingPrimary.blocked_claims.includes("client_group_primary_party_missing"));

  const wrongDirection = validateMasterDataRecord("Relationship", relationship, {
    party_types_by_id: {
      [contactParty.party_id]: "organization",
      [legalClient.party_id]: "person",
    },
  });
  assert.equal(wrongDirection.valid, false);
  assert.ok(wrongDirection.blocked_claims.includes("relationship_direction_error"));

  const samePartyRelationship = validateMasterDataRecord("Relationship", {
    ...relationship,
    relationship_id: "relationship_g2_same_party",
    to_party_id: contactParty.party_id,
  });
  assert.equal(samePartyRelationship.valid, false);
  assert.ok(samePartyRelationship.blocked_claims.includes("relationship_party_endpoint_error"));

  const sameBillingClient = validateMasterDataRecord(
    "BillingProfile",
    {
      ...billingProfile,
      billing_profile_id: "billing_profile_g2_same_client",
      billing_client_party_id: legalClient.party_id,
    },
    {
      require_legal_and_billing_client_refs: true,
      require_distinct_billing_client: true,
    },
  );
  assert.equal(sameBillingClient.valid, false);
  assert.ok(sameBillingClient.blocked_claims.includes("billing_profile_client_reference_error"));
});

test("G2-C duplicate search and merge descriptors preserve review audit and rollback evidence", () => {
  const tenant_id = "tenant_g2_duplicate";
  const legalClient = createMasterDataParty({
    party_id: "party_g2_dup_source",
    tenant_id,
    party_type: "organization",
    display_name: "AMIC Client Korea",
    status: "active",
    owner_user_id: "user_owner",
    canonical_entity_id: "entity_g2_dup_source",
  });
  const duplicateCandidate = createMasterDataParty({
    party_id: "party_g2_dup_candidate",
    tenant_id,
    party_type: "organization",
    display_name: "AMIC Client Korea Ltd",
    status: "review_required",
    owner_user_id: "user_owner",
    canonical_entity_id: "entity_g2_dup_candidate",
  });
  const relatedContact = createMasterDataParty({
    party_id: "party_g2_related_contact",
    tenant_id,
    party_type: "person",
    display_name: "G2 Related Contact",
    status: "active",
    owner_user_id: "user_owner",
    canonical_entity_id: "entity_g2_related_contact",
  });
  const duplicateQueue = createMasterDataDuplicateCandidateQueue({
    tenant_id,
    source_party_id: legalClient.party_id,
    source_display_name: legalClient.display_name,
    review_threshold: 0.5,
    candidates: [
      {
        party_id: duplicateCandidate.party_id,
        tenant_id,
        display_name: duplicateCandidate.display_name,
        identity_key: duplicateCandidate.identity_key,
        alias_keys: ["tenant_g2_duplicate:party-alias:party_g2_dup_candidate:en-US:amic client korea ltd"],
      },
      {
        party_id: "party_other_tenant",
        tenant_id: "tenant_other",
        display_name: "AMIC Client Korea",
      },
    ],
  });
  assert.equal(duplicateQueue.g2_descriptor, "master_data_g2_duplicate_candidate_queue");
  assert.equal(duplicateQueue.outcome, "review_required");
  assert.equal(duplicateQueue.candidate_count, 1);
  assert.equal(duplicateQueue.duplicate_candidates[0].party_id, duplicateCandidate.party_id);
  assert.ok(duplicateQueue.review_required_claims.includes("duplicate_candidate_review_required"));
  assert.equal(duplicateQueue.writes_product_state, false);

  const relationship = createMasterDataRelationship({
    relationship_id: "relationship_g2_related_contact",
    tenant_id,
    from_entity_id: relatedContact.canonical_entity_id,
    to_entity_id: legalClient.canonical_entity_id,
    from_party_id: relatedContact.party_id,
    to_party_id: legalClient.party_id,
    relationship_type: "primary_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id: "user_owner",
  });
  const relatedSearch = createMasterDataRelatedPartySearchDescriptor({
    tenant_id,
    query_party_id: legalClient.party_id,
    relationships: [
      relationship,
      {
        relationship_id: "relationship_other_tenant",
        tenant_id: "tenant_other",
        from_party_id: "party_other_a",
        to_party_id: legalClient.party_id,
        relationship_type: "blocked",
        direction: "organization_to_organization",
      },
    ],
    parties_by_id: {
      [relatedContact.party_id]: relatedContact,
      [legalClient.party_id]: legalClient,
    },
  });
  assert.equal(relatedSearch.g2_descriptor, "master_data_g2_related_party_search_descriptor");
  assert.equal(relatedSearch.result_count, 1);
  assert.equal(relatedSearch.related_parties[0].related_party_id, relatedContact.party_id);
  assert.equal(relatedSearch.unauthorized_result_count, 0);
  assert.equal(relatedSearch.hidden_unauthorized_candidate_count, 1);
  assert.equal(relatedSearch.executes_api_handler, false);

  const mergeDescriptor = createMasterDataPartyMergeSplitWorkflowDescriptor({
    tenant_id,
    workflow_type: "merge",
    source_party_ids: [legalClient.party_id, duplicateCandidate.party_id],
    target_party_id: legalClient.party_id,
    audit_hint_ref: "audit_hint_g2_merge",
    rollback_ref: "rollback_ref_g2_merge",
  });
  assert.equal(mergeDescriptor.g2_descriptor, "master_data_g2_party_merge_split_workflow_descriptor");
  assert.equal(mergeDescriptor.outcome, "review_required");
  assert.equal(mergeDescriptor.audit_event_descriptor.action, "party_merge");
  assert.equal(mergeDescriptor.audit_event_descriptor.writes_audit_event, false);
  assert.equal(mergeDescriptor.rollback_plan.rollback_available, true);
  assert.equal(mergeDescriptor.rollback_plan.executed, false);
  assert.ok(mergeDescriptor.review_required_claims.includes("party_merge_split_review_required"));

  const blockedMerge = createMasterDataPartyMergeSplitWorkflowDescriptor({
    tenant_id,
    workflow_type: "merge",
    source_party_ids: [legalClient.party_id, duplicateCandidate.party_id],
    target_party_id: legalClient.party_id,
  });
  assert.equal(blockedMerge.outcome, "blocked");
  assert.ok(blockedMerge.blocked_claims.includes("merge_split_audit_rollback_required"));
});

test("G2-D UI states and closeout descriptors preserve denied review and handoff evidence", () => {
  const tenant_id = "tenant_g2_ui_closeout";
  const reviewParty = createMasterDataParty({
    party_id: "party_g2_ui_review",
    tenant_id,
    party_type: "organization",
    display_name: "G2 Review Client",
    status: "review_required",
    owner_user_id: "user_owner",
    canonical_entity_id: "entity_g2_ui_review",
  });

  const deniedSearch = createMasterDataPartySearchUiStateDescriptor({
    tenant_id,
    query: "restricted client",
    permission_outcome: "denied",
    denied_results: [
      {
        party_id: "party_g2_hidden",
        tenant_id,
        display_name: "Hidden Client",
        raw_permission_decision: "deny_by_ethical_wall",
      },
    ],
    hidden_fields: ["raw_permission_decision", "ethical_wall_rule_id"],
  });
  assert.equal(deniedSearch.g2_descriptor, "master_data_g2_party_search_ui_state_descriptor");
  assert.equal(deniedSearch.tuw_id, "LFOS-G2-W02-T013");
  assert.equal(deniedSearch.ui_state, "denied");
  assert.equal(deniedSearch.customer_visible_search_state.result_count, 0);
  assert.equal(deniedSearch.internal_ui_evidence.denied_candidate_count, 1);
  assert.equal(deniedSearch.customer_visible_search_state.unauthorized_count_visible, false);
  assert.equal(Object.hasOwn(deniedSearch.customer_visible_search_state, "denied_candidate_count"), false);
  assert.equal(JSON.stringify(deniedSearch.customer_visible_search_state).includes("raw_permission_decision"), false);
  assert.equal(deniedSearch.renders_ui, false);
  assert.equal(deniedSearch.mutates_dom, false);

  const reviewSearch = createMasterDataPartySearchUiStateDescriptor({
    tenant_id,
    query: "G2 Review",
    visible_results: [reviewParty],
  });
  assert.equal(reviewSearch.ui_state, "review_required");
  assert.equal(reviewSearch.customer_visible_search_state.review_badge_visible, true);
  assert.ok(reviewSearch.review_required_claims.includes("party_search_review_state_required"));

  const deniedProfile = createMasterDataPartyProfileUiStateDescriptor({
    tenant_id,
    party_id: "party_g2_denied_profile",
    permission_outcome: "denied",
    hidden_fields: ["raw_permission_decision", "audit_payload"],
  });
  assert.equal(deniedProfile.g2_descriptor, "master_data_g2_party_profile_ui_state_descriptor");
  assert.equal(deniedProfile.ui_state, "denied");
  assert.equal(deniedProfile.customer_visible_profile_state.profile, null);
  assert.equal(deniedProfile.customer_visible_profile_state.hidden_fields_visible, false);
  assert.equal(JSON.stringify(deniedProfile.customer_visible_profile_state).includes("audit_payload"), false);

  const reviewProfile = createMasterDataPartyProfileUiStateDescriptor({
    tenant_id,
    party: reviewParty,
    review_required_reasons: ["duplicate_candidate_review_required"],
    hidden_fields: ["permission_rule_id"],
  });
  assert.equal(reviewProfile.ui_state, "review_required");
  assert.equal(reviewProfile.customer_visible_profile_state.profile.display_name, reviewParty.display_name);
  assert.equal(reviewProfile.customer_visible_profile_state.review_badge_visible, true);
  assert.equal(Object.hasOwn(reviewProfile.customer_visible_profile_state, "review_required_reasons"), false);
  assert.ok(reviewProfile.review_required_claims.includes("party_profile_review_state_required"));

  const closeout = createMasterDataG2CloseoutDescriptor({
    crm_reference_evidence: ["G3 CRM intake must reference Party.party_id before Matter conversion"],
    matter_reference_evidence: ["G4 Matter/DMS runtime must use Matter.party_id references from Party Master"],
    billing_reference_evidence: ["G5 Billing must treat BillingProfile identity as Party Master owned"],
    command_evidence: [
      "npm run client-matter:g2d:validate",
      "npm run rp04:master-data:validate",
      "npm --workspace @law-firm-os/master-data run test",
    ],
    pr_state: {
      branch: "codex/lawos-g2-ui-closeout",
      base_branch: "codex/lawos-g2-duplicate-search-merge",
      draft: true,
      merge_authority: "human_only",
      clean: true,
    },
    g1_evidence_disposition: "draft_stack_pending_human_review",
    human_review_disposition: "pending",
    runtime_write_readiness_claim: "open",
  });
  assert.equal(closeout.g2_descriptor, "master_data_g2_closeout_descriptor");
  assert.equal(closeout.tuw_id, "LFOS-G2-W02-T014");
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.missing_evidence.length, 0);
  assert.equal(closeout.g2_runtime_write_readiness_claim, "open");
  assert.equal(closeout.pr_state.merge_authority, "human_only");
  assert.equal(closeout.renders_ui, false);
  assert.equal(closeout.writes_product_state, false);
  assert.ok(closeout.review_required_claims.includes("g2_closeout_human_review_pending"));

  const blockedCloseout = createMasterDataG2CloseoutDescriptor({
    runtime_write_readiness_claim: "open",
  });
  assert.equal(blockedCloseout.outcome, "blocked");
  assert.ok(blockedCloseout.blocked_claims.includes("g2_closeout_evidence_missing"));
});

test("master data factories create synthetic no-write records", () => {
  const entity = createMasterDataEntity({
    entity_id: "entity_rp04_org",
    tenant_id: "tenant_rp04",
    entity_kind: "organization",
    display_name: "RP04 Synthetic Organization",
    status: "active",
    owner_user_id: "user_owner",
  });
  const organization = createMasterDataOrganization({
    organization_id: "org_rp04",
    tenant_id: entity.tenant_id,
    entity_id: entity.entity_id,
    display_name: entity.display_name,
    status: "active",
    owner_user_id: "user_owner",
  });
  const person = createMasterDataPerson({
    person_id: "person_rp04",
    tenant_id: entity.tenant_id,
    entity_id: "entity_rp04_person",
    display_name: "RP04 Synthetic Person",
    status: "active",
    owner_user_id: "user_owner",
  });
  const relationship = createMasterDataRelationship({
    relationship_id: "relationship_rp04",
    tenant_id: entity.tenant_id,
    from_entity_id: person.entity_id,
    to_entity_id: organization.entity_id,
    relationship_type: "primary_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id: "user_owner",
  });
  const clientGroup = createMasterDataClientGroup({
    client_group_id: "client_group_rp04",
    tenant_id: entity.tenant_id,
    display_name: "RP04 Synthetic Group",
    status: "review_required",
    owner_user_id: "user_owner",
    member_entity_ids: [entity.entity_id, person.entity_id],
  });
  const billingProfile = createMasterDataBillingProfile({
    billing_profile_id: "billing_rp04",
    billing_entity_id: entity.entity_id,
    tenant_id: entity.tenant_id,
    display_name: "RP04 Synthetic Billing",
    status: "draft",
    owner_user_id: "user_owner",
    client_group_id: clientGroup.client_group_id,
  });

  assert.equal(relationship.direction, "person_to_organization");
  assert.equal(billingProfile.writes_product_state, false);
  assert.equal(createMasterDataRecord("Entity", entity).writes_audit_event, false);
  const hiddenInput = createMasterDataEntity({
    ...entity,
    entity_id: "entity_rp04_hidden",
    raw_document_body: "must not leak",
    secret: "must not leak",
    access_token: "must not leak",
  });
  for (const hiddenField of MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS) {
    assert.equal(Object.hasOwn(hiddenInput, hiddenField), false, `${hiddenField} must not be exposed`);
  }
  assert.throws(
    () => createMasterDataEntity({ ...entity, entity_id: "bad", entity_kind: "invalid" }),
    /Entity kind must be one of/,
  );
});

test("master data validators block dangerous RP04 acceptance risks", () => {
  const duplicate = validateMasterDataRecord(
    "Entity",
    {
      entity_id: "entity_dup",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Duplicate",
      status: "active",
      owner_user_id: "user_owner",
      identity_key: "tenant_rp04:organization:duplicate",
    },
    { known_identity_keys: ["tenant_rp04:organization:duplicate"] },
  );
  assert.equal(duplicate.valid, true);
  assert.ok(duplicate.review_required_claims.includes("duplicate_identity_review_required"));

  const badDirection = validateMasterDataRecord("Relationship", {
    relationship_id: "relationship_bad",
    tenant_id: "tenant_rp04",
    from_entity_id: "entity_same",
    to_entity_id: "entity_same",
    relationship_type: "self",
    direction: "person_to_person",
    status: "active",
    owner_user_id: "user_owner",
  });
  assert.equal(badDirection.valid, false);
  assert.ok(badDirection.blocked_claims.includes("relationship_direction_error"));

  const leakage = validateMasterDataRecord(
    "ClientGroup",
    {
      client_group_id: "group_bad",
      tenant_id: "tenant_rp04",
      display_name: "Cross Tenant Group",
      status: "active",
      owner_user_id: "user_owner",
    },
    { member_tenant_ids: ["tenant_rp04", "tenant_other"] },
  );
  assert.equal(leakage.valid, false);
  assert.ok(leakage.blocked_claims.includes("client_group_leakage"));

  const ownerDrift = validateMasterDataRecord(
    "Organization",
    {
      organization_id: "org_owner_drift",
      tenant_id: "tenant_rp04",
      entity_id: "entity_org_owner_drift",
      display_name: "Owner Drift",
      status: "active",
      owner_user_id: "user_owner",
    },
    { owner_module: "DMS" },
  );
  assert.equal(ownerDrift.valid, false);
  assert.ok(ownerDrift.blocked_claims.includes("ownership_drift"));

  const invalidDirection = validateMasterDataRecord("Relationship", {
    relationship_id: "relationship_invalid_direction",
    tenant_id: "tenant_rp04",
    from_entity_id: "entity_a",
    to_entity_id: "entity_b",
    relationship_type: "related",
    direction: "invalid_direction",
    status: "active",
    owner_user_id: "user_owner",
  });
  assert.equal(invalidDirection.valid, false);
  assert.ok(invalidDirection.blocked_claims.includes("relationship_direction_error"));

  const missingEndpoints = validateMasterDataRecord("Relationship", {
    relationship_id: "relationship_missing_endpoints",
    tenant_id: "tenant_rp04",
    relationship_type: "related",
    direction: "person_to_person",
    status: "active",
    owner_user_id: "user_owner",
  });
  assert.equal(missingEndpoints.valid, false);
  assert.ok(missingEndpoints.blocked_claims.includes("missing_required_fields"));
  assert.ok(!missingEndpoints.blocked_claims.includes("relationship_direction_error"));

  const missingMatterTrace = validateMasterDataRecord(
    "Person",
    {
      person_id: "person_missing_matter",
      tenant_id: "tenant_rp04",
      entity_id: "entity_person",
      display_name: "Matter Touch",
      status: "active",
      owner_user_id: "user_owner",
    },
    { touches_matter_or_document: true },
  );
  assert.equal(missingMatterTrace.valid, false);
  assert.ok(missingMatterTrace.blocked_claims.includes("missing_matter_trace"));
});

test("CP00-156 coverage, Hermes packet, Claude packet, and handoff remain production-gated", () => {
  const coverage = validateMasterDataCp156Coverage(cp156PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.implementation, 104);
  assert.equal(coverage.summary.by_deliverable.contract, 3);
  assert.equal(coverage.summary.by_deliverable.security_audit, 6);
  assert.equal(coverage.summary.by_deliverable.ui, 19);
  assert.equal(coverage.summary.by_deliverable.fixture, 3);
  assert.equal(coverage.summary.by_deliverable.test, 9);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 3);
  assert.equal(coverage.summary.by_deliverable.claude_review, 3);

  const fixture = createMasterDataSyntheticFixture();
  assert.equal(fixture.synthetic_only, false);
  assert.equal(fixture.uses_real_client_data, true);
  assert.equal(fixture.records.length, AMIC_CURRENT_CLIENT_CANDIDATES.length * 3 + 8);
  assert.equal(AMIC_CURRENT_CLIENT_CANDIDATES.length, 102);
  assert.equal(AMIC_CURRENT_CLIENT_CANDIDATES.some((candidate) => candidate.source_lanes.some((lane) => lane.startsWith("999_"))), false);
  const candidateNames = AMIC_CURRENT_CLIENT_CANDIDATES.map((candidate) => candidate.display_name);
  assert.equal(candidateNames.some((name) => /선생님|원장님|회장님|교수님|작가|강제집행면탈|조세범|^Pjt\.|^Project\b/.test(name)), false);
  for (const expectedName of ["송수연", "한승민", "허유지", "장정도", "강영권", "임인홍", "황진수"]) {
    assert.ok(candidateNames.includes(expectedName));
  }
  for (const expectedName of [
    "홀딩핸즈앤코 외 12명",
    "한흥수 외 3명",
    "노윤현 외 19명",
    "최재헌 외 2명",
    "이강명 외 1명",
    "강상도",
    "박민규 외 5명",
    "권도균 외 11명",
    "펜타스톤-오라이언-온앤업 신기술투자조합",
    "봉경환 외 4명",
    "박태오",
    "K Enter Holdings Inc.",
    "롯데에너지머티리얼즈",
    "김정환",
    "오윤록 외 2명",
    "유진이엔티",
    "ATU Partners",
    "B&M Holdings",
    "바이포엠스튜디오",
  ]) {
    assert.ok(candidateNames.includes(expectedName));
  }
  for (const removedProjectSellerName of [
    "코오롱글로텍",
    "Katelynn Yun-Yu Owyang",
    "SMEJ Holdings, INC.",
    "에스엠스튜디오스",
    "고구려푸드",
    "고기깡패",
    "부산광역시",
    "아론",
    "ATU",
    "K-PLUS",
    "TAKE Foundation",
    "Titan",
    "오윤록 외 1명",
    "에이치엘엘중앙",
    "SMEJ Holdings, INC. 외 1명",
    "한흥수 외 6명",
    "강상도 외 16명",
  ]) {
    assert.equal(candidateNames.includes(removedProjectSellerName), false);
  }
  const guihan = fixture.records.find((record) => record.model_type === "ClientGroup" && record.display_name === "귀한사람들");
  assert.equal(guihan?.canonical_display_name, "귀한사람들");
  assert.equal(guihan?.legal_form, null);
  const lotteEnergyMaterials = fixture.records.find((record) => record.model_type === "ClientGroup" && record.display_name === "롯데에너지머티리얼즈");
  assert.equal(lotteEnergyMaterials?.canonical_display_name, "롯데에너지머티리얼즈 주식회사");
  assert.equal(lotteEnergyMaterials?.legal_form, "주식회사");
  const yujinEnt = fixture.records.find((record) => record.model_type === "ClientGroup" && record.display_name === "유진이엔티");
  assert.equal(yujinEnt?.canonical_display_name, "유진이엔티");
  assert.equal(yujinEnt?.legal_form, null);

  const hermes = createMasterDataCp156HermesEvidencePacket(cp156PlanPack);
  const claude = createMasterDataCp156ClaudeReviewPacket(cp156PlanPack);
  const handoff = createMasterDataCp156CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-156.master_data_foundation_model_registry");
  assert.equal(claude.review_packet, "C04.CP00-156.master_data_foundation_model_registry");
  assert.equal(handoff.to_pack_id, "CP00-157");
  assert.equal(MASTER_DATA_CP156_NO_WRITE_ATTESTATION.writes_product_state, false);
  assert.equal(hermes.no_write_attestation.executes_hermes_command, false);
  assert.equal(claude.read_only, true);
});

test("CP00-157 binds RP04 master data service logic boundary pack", () => {
  assert.equal(MASTER_DATA_CP157_PACK_BINDING.pack_id, "CP00-157");
  assert.equal(MASTER_DATA_CP157_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP157_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP157_PACK_BINDING.range, "RP04.P01.M08.S06-RP04.P02.M07.S10");
  assert.equal(MASTER_DATA_CP157_PACK_BINDING.upstream_pack_id, "CP00-156");
  assert.equal(MASTER_DATA_CP157_PACK_BINDING.next_pack_id, "CP00-158");
  assert.equal(MASTER_DATA_CP157_PACK_BINDING.next_subphase_id, "RP04.P02.M07.S11");
  assert.equal(MASTER_DATA_SERVICE_BOUNDARY.service_entrypoint, "executeMasterDataServiceWorkflow");
  assert.deepEqual(MASTER_DATA_SERVICE_BOUNDARY.supported_operations, [
    "entity_creation",
    "client_grouping",
    "relationship_mapping",
    "contact_normalization",
    "duplicate_review",
  ]);
});

test("CP00-157 service normalizes requests and keeps descriptor-only no-write boundaries", () => {
  const normalized = normalizeMasterDataServiceRequest({
    request_id: "req_cp157_entity",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "CP157 Synthetic Entity",
      status: "active",
      owner_user_id: "user_owner",
    },
  });

  assert.equal(normalized.normalized, true);
  assert.equal(normalized.model_type, "Entity");
  assert.equal(normalized.idempotency_key, "tenant_rp04:entity_creation:req_cp157_entity");
  assert.match(normalized.lock_key, /^master-data:tenant_rp04:entity_creation:/);
  assert.equal(normalized.no_write_attestation.writes_product_state, false);
  assert.equal(normalized.no_write_attestation.evaluates_runtime_permission, false);
  assert.equal(normalized.no_write_attestation.writes_audit_event, false);
  assert.equal(normalized.no_write_attestation.creates_database_rows, false);

  const precheck = executeMasterDataServicePrechecks(normalized);
  assert.equal(precheck.outcome, "passed");
  assert.equal(precheck.valid, true);
  assert.deepEqual(precheck.blocked_claims, []);
  assert.deepEqual(precheck.checked, [
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_precheck",
    "audit_hint_precheck",
    "idempotency_key_handling",
    "state_transition_enforcement",
  ]);
  assert.deepEqual(precheck.declared_prechecks, MASTER_DATA_SERVICE_BOUNDARY.prechecks);
});

test("CP00-157 service produces happy, review, approval, and blocked descriptors", () => {
  const happy = executeMasterDataEntityCreationWorkflow({
    request_id: "req_cp157_happy",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157_happy",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "CP157 Happy Entity",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(happy.outcome, "passed");
  assert.equal(happy.action_preview.writes_product_state, false);
  assert.equal(happy.action_preview.writes_audit_event, false);
  assert.equal(happy.no_write_attestation.executes_api_handler, false);

  const review = executeMasterDataDuplicateReviewWorkflow({
    request_id: "req_cp157_duplicate",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    known_identity_keys: ["tenant_rp04:organization:duplicate"],
    payload: {
      entity_id: "entity_cp157_duplicate",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Duplicate",
      status: "active",
      owner_user_id: "user_owner",
      identity_key: "tenant_rp04:organization:duplicate",
    },
  });
  assert.equal(review.outcome, "review_required");
  assert.ok(review.review_required_claims.includes("duplicate_identity_review_required"));

  const approval = executeMasterDataServiceWorkflow({
    request_id: "req_cp157_approval",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157_approval",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Approval Entity",
      status: "active",
      owner_user_id: "user_owner",
      requires_approval: true,
    },
  });
  assert.equal(approval.outcome, "approval_required");
  assert.ok(approval.approval_required_claims.includes("master_data_approval_required"));

  const blocked = executeMasterDataRelationshipMappingWorkflow({
    request_id: "req_cp157_blocked",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      relationship_id: "relationship_cp157_blocked",
      tenant_id: "tenant_rp04",
      from_entity_id: "entity_same",
      to_entity_id: "entity_same",
      relationship_type: "self",
      direction: "person_to_person",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("relationship_direction_error"));
});

test("CP00-157 service blocks tenant leakage, missing Matter trace, and missing permission or audit descriptors", () => {
  const clientLeakage = executeMasterDataClientGroupingWorkflow({
    request_id: "req_cp157_group_leakage",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    member_tenant_ids: ["tenant_rp04", "tenant_other"],
    payload: {
      client_group_id: "group_cp157_leakage",
      tenant_id: "tenant_rp04",
      display_name: "Leakage Group",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(clientLeakage.outcome, "blocked");
  assert.ok(clientLeakage.blocked_claims.includes("client_group_leakage"));

  const missingMatter = executeMasterDataContactNormalizationWorkflow({
    request_id: "req_cp157_missing_matter",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    touches_matter_or_document: true,
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      contact_point_id: "contact_cp157",
      tenant_id: "tenant_rp04",
      owner_entity_id: "entity_cp157",
      contact_type: "email",
      value: "cp157@example.invalid",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(missingMatter.outcome, "blocked");
  assert.ok(missingMatter.blocked_claims.includes("missing_matter_trace"));

  const missingDescriptors = executeMasterDataEntityCreationWorkflow({
    request_id: "req_cp157_missing_descriptors",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    payload: {
      entity_id: "entity_cp157_missing_descriptors",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Missing Descriptors",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(missingDescriptors.outcome, "blocked");
  assert.ok(missingDescriptors.blocked_claims.includes("permission_precheck_required"));
  assert.ok(missingDescriptors.blocked_claims.includes("audit_hint_precheck_required"));
});

test("CP00-157 service covers unsupported operation tenant mismatch and idempotency blocked routes", () => {
  const unsupported = executeMasterDataServiceWorkflow({
    request_id: "req_cp157_unsupported",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "unsupported_operation",
    model_type: "Entity",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157_unsupported",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Unsupported Entity",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(unsupported.outcome, "blocked");
  assert.ok(unsupported.blocked_claims.includes("unsupported_service_operation"));
  assert.ok(!unsupported.precheck.checked.includes("state_transition_enforcement"));
  assert.deepEqual(unsupported.precheck.declared_prechecks, MASTER_DATA_SERVICE_BOUNDARY.prechecks);

  const missingTenant = executeMasterDataEntityCreationWorkflow({
    request_id: "req_cp157_missing_tenant",
    actor_user_id: "user_owner",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157_missing_tenant",
      entity_kind: "organization",
      display_name: "Missing Tenant",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(missingTenant.outcome, "blocked");
  assert.ok(missingTenant.blocked_claims.includes("tenant_scope_missing"));

  const tenantMismatch = executeMasterDataEntityCreationWorkflow({
    request_id: "req_cp157_tenant_mismatch",
    tenant_id: "tenant_rp04",
    expected_tenant_id: "tenant_expected",
    actor_user_id: "user_owner",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157_tenant_mismatch",
      tenant_id: "tenant_other",
      entity_kind: "organization",
      display_name: "Tenant Mismatch",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(tenantMismatch.outcome, "blocked");
  assert.ok(tenantMismatch.blocked_claims.includes("tenant_boundary_mismatch"));

  const missingIdempotency = executeMasterDataEntityCreationWorkflow({
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157_missing_idempotency",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Missing Idempotency",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(missingIdempotency.outcome, "blocked");
  assert.ok(missingIdempotency.blocked_claims.includes("idempotency_key_required"));
});

test("CP00-157 service descriptors are deterministic for retry and rollback evidence", () => {
  const request = {
    request_id: "req_cp157_retry_stable",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp157",
    audit_hint_ref: "audit_hint_cp157",
    payload: {
      entity_id: "entity_cp157_retry_stable",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Retry Stable",
      status: "active",
      owner_user_id: "user_owner",
    },
  };
  const first = executeMasterDataServiceWorkflow(request);
  const second = executeMasterDataServiceWorkflow(request);
  assert.deepEqual(first, second);
  assert.equal(first.idempotency_key, "tenant_rp04:entity_creation:req_cp157_retry_stable");
  assert.equal(first.lock_key, second.lock_key);
  assert.equal(first.rollback_behavior, "no_mutation_so_rollback_is_descriptor_noop");
  assert.equal(first.retry_behavior, "same_idempotency_key_returns_same_descriptor_shape");
});

test("CP00-157 coverage, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp157Coverage(cp157PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.implementation, 73);
  assert.equal(coverage.summary.by_deliverable.ui, 24);
  assert.equal(coverage.summary.by_deliverable.contract, 8);
  assert.equal(coverage.summary.by_deliverable.security_audit, 16);
  assert.equal(coverage.summary.by_deliverable.claude_review, 5);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 10);
  assert.equal(coverage.summary.by_deliverable.test, 14);

  const boundary = validateMasterDataCp157ServiceBoundary();
  assert.equal(boundary.valid, true);
  assert.equal(boundary.operation_count, 5);
  assert.equal(MASTER_DATA_CP157_NO_WRITE_ATTESTATION.builds_service_descriptor, true);
  assert.equal(MASTER_DATA_CP157_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
  assert.equal(MASTER_DATA_CP157_NO_WRITE_ATTESTATION.dispatches_approval_route, false);

  const hermes = createMasterDataCp157HermesEvidencePacket(cp157PlanPack);
  const claude = createMasterDataCp157ClaudeReviewPacket(cp157PlanPack);
  const handoff = createMasterDataCp157CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-157.master_data_service_logic_boundary");
  assert.equal(claude.review_packet, "C04.CP00-157.master_data_service_logic_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-158");
  assert.equal(handoff.next_subphase_id, "RP04.P02.M07.S11");
});

test("CP00-158 binds RP04 master data service tail boundary pack", () => {
  assert.equal(MASTER_DATA_CP158_PACK_BINDING.pack_id, "CP00-158");
  assert.equal(MASTER_DATA_CP158_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP158_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP158_PACK_BINDING.range, "RP04.P02.M07.S11-RP04.P02.M07.S20");
  assert.equal(MASTER_DATA_CP158_PACK_BINDING.upstream_pack_id, "CP00-157");
  assert.equal(MASTER_DATA_CP158_PACK_BINDING.next_pack_id, "CP00-159");
  assert.equal(MASTER_DATA_CP158_PACK_BINDING.next_subphase_id, "RP04.P02.M07.S21");
  assert.equal(MASTER_DATA_SERVICE_TAIL_BOUNDARY.tail_entrypoint, "createMasterDataServiceTailDescriptor");
  assert.equal(MASTER_DATA_SERVICE_TAIL_BOUNDARY.lock_status, "not_acquired_descriptor_only");
});

test("CP00-158 tail descriptor keeps happy path lock and persistence no-op", () => {
  const tail = createMasterDataServiceTailDescriptor({
    request_id: "req_cp158_tail_happy",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp158",
    audit_hint_ref: "audit_hint_cp158",
    payload: {
      entity_id: "entity_cp158_tail_happy",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "CP158 Tail Happy",
      status: "active",
      owner_user_id: "user_owner",
    },
  });
  assert.equal(tail.pack_id, "CP00-158");
  assert.equal(tail.outcome, "passed");
  assert.equal(tail.lock.acquired, false);
  assert.equal(tail.lock.lock_status, "not_acquired_descriptor_only");
  assert.equal(tail.persistence.creates_database_rows, false);
  assert.equal(tail.persistence.writes_product_state, false);
  assert.deepEqual(tail.validation_error_mapping, []);
  assert.equal(tail.route.route_type, "passed");
  assert.equal(tail.route.dispatches_route, false);
  assert.equal(tail.no_write_attestation.acquires_runtime_lock, false);
  assert.equal(tail.no_write_attestation.writes_persistence_boundary, false);
});

test("CP00-158 tail descriptor maps denied review and approval routes without dispatch", () => {
  const denied = createMasterDataServiceTailDescriptor({
    request_id: "req_cp158_tail_denied",
    tenant_id: "tenant_rp04",
    expected_tenant_id: "tenant_expected",
    actor_user_id: "user_owner",
    operation: "relationship_mapping",
    model_type: "Relationship",
    audit_hint_ref: "audit_hint_cp158",
    payload: {
      relationship_id: "relationship_cp158_denied",
      tenant_id: "tenant_other",
      from_entity_id: "entity_same",
      to_entity_id: "entity_same",
      relationship_type: "self",
      direction: "person_to_person",
      status: "active",
      owner_user_id: "user_owner",
      secret: "must not leak",
    },
  });
  assert.equal(denied.outcome, "blocked");
  assert.equal(denied.route.route_type, "blocked");
  assert.ok(denied.blocked_output.safe_error_codes.includes("MASTER_DATA_TENANT_MISMATCH"));
  assert.ok(denied.blocked_output.safe_error_codes.includes("MASTER_DATA_PERMISSION_DESCRIPTOR_REQUIRED"));
  assert.ok(denied.blocked_output.safe_error_codes.includes("MASTER_DATA_RELATIONSHIP_DIRECTION_INVALID"));
  assert.equal(denied.blocked_output.exposes_sensitive_values, false);
  assert.ok(denied.blocked_output.hidden_output_fields.includes("secret"));
  assert.ok(denied.internal_blocked_claim_refs.includes("tenant_boundary_mismatch"));
  assert.ok(denied.internal_blocked_claim_refs.includes("permission_precheck_required"));
  assert.ok(denied.internal_blocked_claim_refs.includes("relationship_direction_error"));
  assert.equal(Object.hasOwn(denied.blocked_output, "blocked_claims"), false);
  assert.equal(JSON.stringify(denied.blocked_output).includes("must not leak"), false);
  assert.equal(JSON.stringify(denied).includes("must not leak"), false);

  const review = createMasterDataServiceTailDescriptor({
    request_id: "req_cp158_tail_review",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "duplicate_review",
    permission_ref: "permission_ref_cp158",
    audit_hint_ref: "audit_hint_cp158",
    known_identity_keys: ["tenant_rp04:organization:duplicate"],
    payload: {
      entity_id: "entity_cp158_tail_review",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Duplicate",
      status: "active",
      owner_user_id: "user_owner",
      identity_key: "tenant_rp04:organization:duplicate",
    },
  });
  assert.equal(review.outcome, "review_required");
  assert.equal(review.route.route_type, "review_required");
  assert.ok(review.route.route_refs.includes("route_to_master_data_duplicate_review_queue"));
  assert.equal(review.route.dispatches_route, false);

  const approval = createMasterDataServiceTailDescriptor({
    request_id: "req_cp158_tail_approval",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp158",
    audit_hint_ref: "audit_hint_cp158",
    payload: {
      entity_id: "entity_cp158_tail_approval",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Approval",
      status: "active",
      owner_user_id: "user_owner",
      requires_approval: true,
    },
  });
  assert.equal(approval.outcome, "approval_required");
  assert.equal(approval.route.route_type, "approval_required");
  assert.ok(approval.route.route_refs.includes("route_to_master_data_steward_approval_queue"));
  assert.equal(approval.route.dispatches_route, false);

  const reviewWithoutClaims = createMasterDataServiceTailDescriptor({
    workflow_descriptor: "master_data_claimless_review_descriptor",
    outcome: "review_required",
    operation: "duplicate_review",
    model_type: "Entity",
    request_id: "req_cp158_claimless_review",
    idempotency_key: "tenant_rp04:duplicate_review:req_cp158_claimless_review",
  });
  assert.deepEqual(reviewWithoutClaims.route.route_refs, []);

  const approvalWithoutClaims = createMasterDataServiceTailDescriptor({
    workflow_descriptor: "master_data_claimless_approval_descriptor",
    outcome: "approval_required",
    operation: "entity_creation",
    model_type: "Entity",
    request_id: "req_cp158_claimless_approval",
    idempotency_key: "tenant_rp04:entity_creation:req_cp158_claimless_approval",
  });
  assert.deepEqual(approvalWithoutClaims.route.route_refs, []);
});

test("CP00-158 tail descriptor rollback and retry are deterministic no-ops", () => {
  const request = {
    request_id: "req_cp158_tail_retry",
    tenant_id: "tenant_rp04",
    actor_user_id: "user_owner",
    operation: "entity_creation",
    permission_ref: "permission_ref_cp158",
    audit_hint_ref: "audit_hint_cp158",
    payload: {
      entity_id: "entity_cp158_tail_retry",
      tenant_id: "tenant_rp04",
      entity_kind: "organization",
      display_name: "Retry Tail",
      status: "active",
      owner_user_id: "user_owner",
    },
  };
  const first = createMasterDataServiceTailDescriptor(request);
  const second = createMasterDataServiceTailDescriptor(request);
  assert.deepEqual(first, second);
  assert.equal(first.rollback.executed, false);
  assert.equal(first.retry.executed, false);
  assert.equal(first.retry.stable_replay_key, "tenant_rp04:entity_creation:req_cp158_tail_retry");
  assert.equal(first.no_write_attestation.executes_rollback, false);
  assert.equal(first.no_write_attestation.executes_retry, false);
});

test("CP00-158 coverage, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp158Coverage(cp158PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.ui, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 2);
  assert.equal(coverage.summary.by_deliverable.test, 2);

  const boundary = validateMasterDataCp158TailBoundary();
  assert.equal(boundary.valid, true);
  assert.equal(MASTER_DATA_CP158_NO_WRITE_ATTESTATION.builds_tail_descriptor, true);
  assert.equal(MASTER_DATA_CP158_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MASTER_DATA_CP158_NO_WRITE_ATTESTATION.dispatches_approval_route, false);

  const hermes = createMasterDataCp158HermesEvidencePacket(cp158PlanPack);
  const claude = createMasterDataCp158ClaudeReviewPacket(cp158PlanPack);
  const handoff = createMasterDataCp158CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-158.master_data_service_tail_boundary");
  assert.equal(claude.review_packet, "C04.CP00-158.master_data_service_tail_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-159");
  assert.equal(handoff.next_subphase_id, "RP04.P02.M07.S21");
});

test("CP00-159 binds RP04 master data service evidence review packet", () => {
  assert.equal(MASTER_DATA_CP159_PACK_BINDING.pack_id, "CP00-159");
  assert.equal(MASTER_DATA_CP159_PACK_BINDING.risk_class, "B");
  assert.equal(MASTER_DATA_CP159_PACK_BINDING.unit_count, 40);
  assert.equal(MASTER_DATA_CP159_PACK_BINDING.range, "RP04.P02.M07.S21-RP04.P02.M09.S18");
  assert.equal(MASTER_DATA_CP159_PACK_BINDING.upstream_pack_id, "CP00-158");
  assert.equal(MASTER_DATA_CP159_PACK_BINDING.next_pack_id, "CP00-160");
  assert.equal(MASTER_DATA_CP159_PACK_BINDING.next_subphase_id, "RP04.P02.M09.S19");
  assert.equal(MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes.length, 4);
  assert.equal(MASTER_DATA_CP159_NO_WRITE_ATTESTATION.builds_service_evidence_packet, true);
  assert.equal(MASTER_DATA_CP159_NO_WRITE_ATTESTATION.executes_hermes_command, false);
  assert.equal(MASTER_DATA_CP159_NO_WRITE_ATTESTATION.executes_claude_review, false);
});

test("CP00-159 review path case stays descriptor-only and routes to duplicate review", () => {
  const reviewCase = createMasterDataServiceReviewPathCase({
    request_id: "req_cp159_test_review_path",
  });

  assert.equal(reviewCase.pack_id, "CP00-159");
  assert.equal(reviewCase.outcome, "review_required");
  assert.equal(reviewCase.route_type, "review_required");
  assert.ok(reviewCase.route_refs.includes("route_to_master_data_duplicate_review_queue"));
  assert.equal(reviewCase.dispatches_route, false);
  assert.equal(reviewCase.review_tail.route.dispatches_route, false);
  assert.equal(reviewCase.review_tail.writes_product_state, false);
  assert.equal(reviewCase.no_write_attestation.dispatches_review_route, false);
});

test("CP00-159 integration smoke covers happy review approval and blocked outcomes without writes", () => {
  const smoke = createMasterDataServiceIntegrationSmokeCase();

  assert.equal(smoke.pack_id, "CP00-159");
  assert.deepEqual(smoke.outcomes, {
    happy: "passed",
    review: "review_required",
    approval: "approval_required",
    blocked: "blocked",
  });
  assert.equal(smoke.outcome_count, 4);
  assert.equal(smoke.all_no_write, true);
  assert.equal(smoke.all_routes_descriptor_only, true);
  assert.equal(smoke.all_hidden_fields_sanitized, true);
  for (const value of smoke.hidden_source_probe_values) {
    assert.equal(JSON.stringify(smoke.cases.blocked).includes(value), false);
  }
  assert.ok(smoke.safe_blocked_output_codes.includes("MASTER_DATA_TENANT_MISMATCH"));
  assert.ok(smoke.safe_blocked_output_codes.includes("MASTER_DATA_RELATIONSHIP_DIRECTION_INVALID"));
  assert.equal(smoke.cases.blocked.persistence.writes_product_state, false);
  assert.equal(Object.hasOwn(smoke.cases.blocked.blocked_output, "blocked_claims"), false);
});

test("CP00-159 coverage, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp159Coverage(cp159PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_deliverable.contract, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 18);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.ui, 6);
  assert.equal(coverage.summary.by_deliverable.claude_review, 2);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 4);
  assert.equal(coverage.summary.by_micro_phase["RP04.P02.M07"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP04.P02.M08"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP04.P02.M09"], 18);

  const serviceEvidence = validateMasterDataCp159ServiceEvidence(cp159PlanPack, masterDataContract.service_evidence);
  assert.equal(serviceEvidence.valid, true);
  assert.equal(serviceEvidence.requirements.review_packet_mode, "read_only_claude_opus_4_8_max");
  assert.ok(serviceEvidence.requirements.required_service_evidence_fields.includes("permission_precheck"));
  assert.ok(serviceEvidence.requirements.required_service_evidence_fields.includes("retry_behavior"));

  const hermes = createMasterDataCp159HermesEvidencePacket(cp159PlanPack);
  const claude = createMasterDataCp159ClaudeReviewPacket(cp159PlanPack);
  const handoff = createMasterDataCp159CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-159.master_data_service_evidence_review_packet");
  assert.equal(hermes.service_evidence_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-159.master_data_service_evidence_review_packet");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-160");
  assert.equal(handoff.next_subphase_id, "RP04.P02.M09.S19");
});

test("CP00-160 binds RP04 master data API and UI reference catalog pack", () => {
  assert.equal(MASTER_DATA_CP160_PACK_BINDING.pack_id, "CP00-160");
  assert.equal(MASTER_DATA_CP160_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP160_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP160_PACK_BINDING.range, "RP04.P02.M09.S19-RP04.P04.M03.S05");
  assert.equal(MASTER_DATA_CP160_PACK_BINDING.upstream_pack_id, "CP00-159");
  assert.equal(MASTER_DATA_CP160_PACK_BINDING.next_pack_id, "CP00-161");
  assert.equal(MASTER_DATA_CP160_PACK_BINDING.next_subphase_id, "RP04.P04.M03.S06");
  assert.equal(MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id, "master_data_api_reference_descriptor_catalog");
  assert.equal(MASTER_DATA_UI_SURFACE_STATES.surface_id, "master_data_api_reference_ui_surface_state_catalog");
  assert.equal(MASTER_DATA_CP160_NO_WRITE_ATTESTATION.builds_api_reference_catalog, true);
  assert.equal(MASTER_DATA_CP160_NO_WRITE_ATTESTATION.executes_api_handler, false);
  assert.equal(MASTER_DATA_CP160_NO_WRITE_ATTESTATION.renders_ui, false);
});

test("CP00-160 API reference fixtures cover happy invalid and denied descriptor outcomes", () => {
  const happy = createMasterDataApiReferenceFixture({
    scenario: "happy_search",
    tenant_id: "tenant_rp04",
    permission_ref: "permission_ref_cp160",
    audit_hint_ref: "audit_hint_cp160",
    limit: 250,
  });
  assert.equal(happy.pack_id, "CP00-160");
  assert.equal(happy.response.outcome, "passed");
  assert.equal(happy.response.page_info.limit, 100);
  assert.equal(happy.executes_api_handler, false);
  assert.equal(happy.writes_product_state, false);
  assert.equal(JSON.stringify(happy).includes("cp160_hidden_value_secret"), false);
  assert.equal(JSON.stringify(happy.response.items).includes("internal_blocked_claim_refs"), false);

  const invalid = createMasterDataApiReferenceFixture({
    scenario: "invalid_request",
    filters: { unsupported_filter: true },
  });
  assert.equal(invalid.response.outcome, "blocked");
  assert.ok(invalid.response.safe_error_codes.includes("MASTER_DATA_API_TENANT_REQUIRED"));
  assert.ok(invalid.response.safe_error_codes.includes("MASTER_DATA_API_PERMISSION_REF_REQUIRED"));
  assert.ok(invalid.response.safe_error_codes.includes("MASTER_DATA_API_AUDIT_HINT_REQUIRED"));
  assert.ok(invalid.response.safe_error_codes.includes("MASTER_DATA_API_UNSUPPORTED_FILTER"));

  const denied = createMasterDataApiReferenceFixture({
    scenario: "denied_response",
    tenant_id: "tenant_rp04",
    permission_ref: "permission_ref_cp160",
    audit_hint_ref: "audit_hint_cp160",
  });
  assert.equal(denied.response.outcome, "blocked");
  assert.deepEqual(denied.response.items, []);
  assert.ok(denied.response.safe_error_codes.includes("MASTER_DATA_API_UNAUTHORIZED_OMISSION"));
  assert.ok(denied.response.omitted_fields.includes("internal_blocked_claim_refs"));
});

test("CP00-160 API and UI catalogs stay descriptor-only", () => {
  const apiCatalog = createMasterDataApiReferenceCatalog();
  assert.equal(apiCatalog.catalog_id, "cp160_master_data_api_reference_catalog");
  assert.deepEqual(apiCatalog.fixture_ids, [
    "cp160_api_fixture_happy_search",
    "cp160_api_fixture_invalid_request",
    "cp160_api_fixture_denied_response",
  ]);
  assert.equal(apiCatalog.all_no_write, true);
  assert.equal(apiCatalog.all_serialized_without_hidden_values, true);
  assert.equal(apiCatalog.denied_omits_items, true);
  assert.ok(apiCatalog.invalid_request_codes.includes("MASTER_DATA_API_UNSUPPORTED_FILTER"));

  const uiCatalog = createMasterDataUiSurfaceStateCatalog();
  assert.equal(uiCatalog.catalog_id, MASTER_DATA_UI_SURFACE_STATES.surface_id);
  assert.equal(uiCatalog.state_count, 6);
  assert.ok(uiCatalog.surfaces.includes("master_data_records_table"));
  assert.ok(uiCatalog.data_dependencies.includes("api_reference_fixture_id"));
  assert.equal(uiCatalog.loading_state, "show_skeleton_without_fetching_real_data");
  assert.equal(uiCatalog.denied_state, "show_permission_denied_state_with_safe_error_code");
  assert.equal(uiCatalog.review_required_state, "show_review_required_badge_without_dispatch");
  assert.equal(uiCatalog.renders_ui, false);
  assert.equal(uiCatalog.mutates_dom, false);
});

test("CP00-160 coverage, API/UI validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp160Coverage(cp160PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.test, 12);
  assert.equal(coverage.summary.by_deliverable.contract, 35);
  assert.equal(coverage.summary.by_deliverable.implementation, 56);
  assert.equal(coverage.summary.by_deliverable.security_audit, 18);
  assert.equal(coverage.summary.by_deliverable.ui, 21);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 3);
  assert.equal(coverage.summary.by_deliverable.claude_review, 5);
  assert.equal(coverage.summary.by_micro_phase["RP04.P02.M09"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP04.P03.M03"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP04.P04.M03"], 5);

  const apiUiReference = validateMasterDataCp160ApiUiReference(masterDataContract);
  assert.equal(apiUiReference.valid, true);
  assert.equal(apiUiReference.api_surface.api_fixture_ids.length, 3);
  assert.equal(apiUiReference.no_write_attestation.builds_ui_surface_state_catalog, true);

  const hermes = createMasterDataCp160HermesEvidencePacket(cp160PlanPack);
  const claude = createMasterDataCp160ClaudeReviewPacket(cp160PlanPack);
  const handoff = createMasterDataCp160CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-160.master_data_api_ui_reference_catalog");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.api_ui_reference_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-160.master_data_api_ui_reference_catalog");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-161");
  assert.equal(handoff.next_subphase_id, "RP04.P04.M03.S06");
});

test("CP00-161 binds RP04 master data UI interaction workflow pack", () => {
  assert.equal(MASTER_DATA_CP161_PACK_BINDING.pack_id, "CP00-161");
  assert.equal(MASTER_DATA_CP161_PACK_BINDING.risk_class, "B");
  assert.equal(MASTER_DATA_CP161_PACK_BINDING.unit_count, 40);
  assert.equal(MASTER_DATA_CP161_PACK_BINDING.range, "RP04.P04.M03.S06-RP04.P04.M05.S05");
  assert.equal(MASTER_DATA_CP161_PACK_BINDING.upstream_pack_id, "CP00-160");
  assert.equal(MASTER_DATA_CP161_PACK_BINDING.next_pack_id, "CP00-162");
  assert.equal(MASTER_DATA_CP161_PACK_BINDING.next_subphase_id, "RP04.P04.M05.S06");
  assert.equal(MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id, "master_data_ui_interaction_workflow_catalog");
  assert.equal(MASTER_DATA_CP161_NO_WRITE_ATTESTATION.builds_ui_interaction_workflow, true);
  assert.equal(MASTER_DATA_CP161_NO_WRITE_ATTESTATION.renders_ui, false);
  assert.equal(MASTER_DATA_CP161_NO_WRITE_ATTESTATION.mutates_dom, false);
});

test("CP00-161 UI interaction fixtures model review denied and permission audit states without effects", () => {
  const review = createMasterDataUiInteractionFixture({
    fixture_id: "cp161_test_primary_review",
    slice: "primary_implementation_slice",
    scenario: "review_required",
  });
  assert.equal(review.pack_id, "CP00-161");
  assert.equal(review.state.review_required, true);
  assert.equal(review.interactions.dispatches_review_route, false);
  assert.equal(review.permission_badge.evaluates_runtime_permission, false);
  assert.equal(review.audit_hint_display.appends_audit_event, false);
  assert.equal(review.renders_ui, false);
  assert.equal(review.mutates_dom, false);

  const denied = createMasterDataUiInteractionFixture({
    fixture_id: "cp161_test_secondary_denied",
    slice: "secondary_workflow_slice",
    scenario: "denied",
    safe_error_code: "MASTER_DATA_API_UNAUTHORIZED_OMISSION",
  });
  assert.equal(denied.state.denied, true);
  assert.equal(denied.error_message_copy.safe_error_code, "MASTER_DATA_API_UNAUTHORIZED_OMISSION");
  assert.equal(denied.error_message_copy.exposes_internal_claims, false);
  assert.equal(denied.responsive_layout.text_overlap_allowed, false);

  const permissionAudit = createMasterDataUiInteractionFixture({
    fixture_id: "cp161_test_permission_audit_empty",
    slice: "permission_audit_binding_entry",
    scenario: "empty",
  });
  assert.equal(permissionAudit.state.empty, true);
  assert.equal(permissionAudit.build_smoke.expected_status, "passed");
  assert.equal(permissionAudit.hermes_ui_evidence.emitted_by_package_code, false);
  assert.equal(permissionAudit.claude_ui_leak_prompt.sent_by_package_code, false);
});

test("CP00-161 UI interaction catalog covers workflow slices and display boundaries", () => {
  const catalog = createMasterDataUiInteractionWorkflowCatalog();
  assert.equal(catalog.catalog_id, MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id);
  assert.deepEqual(catalog.fixture_ids, [
    "cp161_ui_fixture_primary_review_required",
    "cp161_ui_fixture_secondary_denied",
    "cp161_ui_fixture_permission_audit_empty",
  ]);
  assert.deepEqual(catalog.covered_slices, [
    "primary_implementation_slice",
    "secondary_workflow_slice",
    "permission_audit_binding_entry",
  ]);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_security_displays_descriptor_only, true);
  assert.equal(catalog.all_required_interactions_present, true);
  assert.equal(catalog.prohibited_output_absent, true);
  assert.equal(catalog.build_smoke_descriptor_id, "cp161_ui_build_smoke_descriptor");
  assert.equal(catalog.hermes_ui_evidence_packet, "H04.CP00-161.master_data_ui_interaction_workflow");
  assert.equal(catalog.claude_ui_leak_prompt, "C04.CP00-161.master_data_ui_interaction_workflow");
});

test("CP00-161 coverage, workflow validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp161Coverage(cp161PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_deliverable.claude_review, 4);
  assert.equal(coverage.summary.by_deliverable.ui, 16);
  assert.equal(coverage.summary.by_deliverable.security_audit, 4);
  assert.equal(coverage.summary.by_deliverable.implementation, 10);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_deliverable.test, 2);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 2);
  assert.equal(coverage.summary.by_micro_phase["RP04.P04.M03"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP04.P04.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP04.P04.M05"], 5);

  const workflow = validateMasterDataCp161UiInteractionWorkflow(masterDataContract);
  assert.equal(workflow.valid, true);
  assert.equal(workflow.workflow.fixture_ids.length, 3);
  assert.equal(workflow.no_write_attestation.builds_ui_fixture_binding, true);

  const hermes = createMasterDataCp161HermesEvidencePacket(cp161PlanPack);
  const claude = createMasterDataCp161ClaudeReviewPacket(cp161PlanPack);
  const handoff = createMasterDataCp161CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-161.master_data_ui_interaction_workflow");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.ui_interaction_workflow_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-161.master_data_ui_interaction_workflow");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-162");
  assert.equal(handoff.next_subphase_id, "RP04.P04.M05.S06");
});

test("CP00-162 binds RP04 master data permission and audit binding pack", () => {
  assert.equal(MASTER_DATA_CP162_PACK_BINDING.pack_id, "CP00-162");
  assert.equal(MASTER_DATA_CP162_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP162_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP162_PACK_BINDING.range, "RP04.P04.M05.S06-RP04.P04.M05.S15");
  assert.equal(MASTER_DATA_CP162_PACK_BINDING.upstream_pack_id, "CP00-161");
  assert.equal(MASTER_DATA_CP162_PACK_BINDING.next_pack_id, "CP00-163");
  assert.equal(MASTER_DATA_CP162_PACK_BINDING.next_subphase_id, "RP04.P04.M05.S16");
  assert.equal(MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id, "master_data_permission_audit_binding_descriptor");
  assert.equal(MASTER_DATA_CP162_NO_WRITE_ATTESTATION.builds_permission_audit_binding_descriptor, true);
  assert.equal(MASTER_DATA_CP162_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP162_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-162 permission and audit binding descriptors expose only safe display data", () => {
  const review = createMasterDataPermissionAuditBindingDescriptor({
    fixture_id: "cp162_test_review",
    scenario: "review_required",
    safe_error_code: "MASTER_DATA_REVIEW_REQUIRED",
  });
  assert.equal(review.pack_id, "CP00-162");
  assert.equal(review.renderable_surface, "customer_facing_descriptor_only");
  assert.equal(review.state.review_required, true);
  assert.equal(review.permission_badge.evaluates_runtime_permission, false);
  assert.equal(review.audit_hint_display.appends_audit_event, false);
  assert.equal(review.interactions.executes_api_handler, false);
  assert.equal(review.error_message_copy.exposes_internal_claims, false);

  const permissionMissing = createMasterDataPermissionAuditBindingDescriptor({
    fixture_id: "cp162_test_permission_missing",
    scenario: "permission_missing",
  });
  assert.equal(permissionMissing.permission_badge.permission_ref, null);
  assert.equal(permissionMissing.error_message_copy.safe_error_code, "MASTER_DATA_PERMISSION_DESCRIPTOR_REQUIRED");
  assert.equal(permissionMissing.prohibited_outputs_absent, true);

  const auditMissing = createMasterDataPermissionAuditBindingDescriptor({
    fixture_id: "cp162_test_audit_missing",
    scenario: "audit_missing",
  });
  assert.equal(auditMissing.audit_hint_display.audit_hint_ref, null);
  assert.equal(auditMissing.error_message_copy.safe_error_code, "MASTER_DATA_AUDIT_HINT_REQUIRED");
  assert.equal(auditMissing.responsive_layout.text_overlap_allowed, false);

  const catalog = createMasterDataPermissionAuditBindingCatalog();
  assert.equal(catalog.renderable_surface, "customer_facing_descriptor_only");
  assert.deepEqual(catalog.fixture_ids, [
    "cp162_binding_fixture_review_required",
    "cp162_binding_fixture_permission_missing",
    "cp162_binding_fixture_audit_missing",
    "cp162_binding_fixture_denied",
  ]);
  assert.equal(catalog.all_descriptor_refs_checked, true);
  assert.equal(catalog.no_runtime_permission_decisions, true);
  assert.equal(catalog.no_audit_events_appended, true);
  assert.equal(catalog.safe_error_copy_only, true);
  assert.equal(catalog.layout_boundaries_stable, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-162 coverage, binding validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp162Coverage(cp162PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.ui, 4);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_micro_phase["RP04.P04.M05"], 10);

  const binding = validateMasterDataCp162PermissionAuditBinding(masterDataContract);
  assert.equal(binding.valid, true);
  assert.equal(binding.binding.fixture_ids.length, 4);
  assert.equal(binding.no_write_attestation.builds_permission_badge_descriptor, true);

  const hermes = createMasterDataCp162HermesEvidencePacket(cp162PlanPack);
  const claude = createMasterDataCp162ClaudeReviewPacket(cp162PlanPack);
  const handoff = createMasterDataCp162CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-162.master_data_permission_audit_binding");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.permission_audit_binding_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-162.master_data_permission_audit_binding");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-163");
  assert.equal(handoff.next_subphase_id, "RP04.P04.M05.S16");
});

test("CP00-163 binds RP04 master data synthetic fixture entry pack", () => {
  assert.equal(MASTER_DATA_CP163_PACK_BINDING.pack_id, "CP00-163");
  assert.equal(MASTER_DATA_CP163_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP163_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP163_PACK_BINDING.range, "RP04.P04.M05.S16-RP04.P04.M06.S05");
  assert.equal(MASTER_DATA_CP163_PACK_BINDING.upstream_pack_id, "CP00-162");
  assert.equal(MASTER_DATA_CP163_PACK_BINDING.next_pack_id, "CP00-164");
  assert.equal(MASTER_DATA_CP163_PACK_BINDING.next_subphase_id, "RP04.P04.M06.S06");
  assert.equal(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id, "master_data_synthetic_fixture_entry_descriptor");
  assert.equal(MASTER_DATA_CP163_NO_WRITE_ATTESTATION.builds_synthetic_fixture_entry_descriptor, true);
  assert.equal(MASTER_DATA_CP163_NO_WRITE_ATTESTATION.loads_real_client_data, false);
  assert.equal(MASTER_DATA_CP163_NO_WRITE_ATTESTATION.renders_ui, false);
});

test("CP00-163 synthetic fixture entry descriptors cover loading empty and denied states without effects", () => {
  const loading = createMasterDataSyntheticFixtureEntryDescriptor({
    fixture_id: "cp163_test_loading",
    scenario: "loading",
  });
  assert.equal(loading.pack_id, "CP00-163");
  assert.equal(loading.ui_state.loading, true);
  assert.equal(loading.renderable_surface, "customer_facing_fixture_descriptor_only");
  assert.equal(loading.renders_ui, false);
  assert.equal(loading.issues_network_request, false);

  const denied = createMasterDataSyntheticFixtureEntryDescriptor({
    fixture_id: "cp163_test_denied",
    scenario: "denied",
    safe_error_code: "MASTER_DATA_API_UNAUTHORIZED_OMISSION",
  });
  assert.equal(denied.ui_state.denied, true);
  assert.equal(denied.descriptor_refs.safe_error_code, "MASTER_DATA_API_UNAUTHORIZED_OMISSION");
  assert.equal(denied.hermes_ui_evidence.emitted_by_package_code, false);
  assert.equal(denied.claude_ui_leak_prompt.sent_by_package_code, false);
  assert.equal(denied.prohibited_output_absent, true);

  const catalog = createMasterDataSyntheticFixtureEntryCatalog();
  assert.deepEqual(catalog.fixture_ids, [
    "cp163_fixture_entry_loading",
    "cp163_fixture_entry_empty",
    "cp163_fixture_entry_denied",
  ]);
  assert.equal(catalog.all_descriptor_refs_checked, true);
  assert.equal(catalog.ui_surface_inventory_complete, true);
  assert.equal(catalog.loading_empty_denied_states_present, true);
  assert.equal(catalog.no_runtime_or_rendering_side_effects, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-163 coverage, fixture validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp163Coverage(cp163PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_deliverable.test, 1);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 2);
  assert.equal(coverage.summary.by_deliverable.ui, 4);
  assert.equal(coverage.summary.by_micro_phase["RP04.P04.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP04.P04.M06"], 5);

  const fixtureEntry = validateMasterDataCp163SyntheticFixtureEntry(masterDataContract);
  assert.equal(fixtureEntry.valid, true);
  assert.equal(fixtureEntry.fixture_entry.fixture_ids.length, 3);
  assert.equal(fixtureEntry.no_write_attestation.builds_fixture_ui_state_inventory, true);

  const hermes = createMasterDataCp163HermesEvidencePacket(cp163PlanPack);
  const claude = createMasterDataCp163ClaudeReviewPacket(cp163PlanPack);
  const handoff = createMasterDataCp163CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-163.master_data_synthetic_fixture_entry");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.synthetic_fixture_entry_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-163.master_data_synthetic_fixture_entry");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-164");
  assert.equal(handoff.next_subphase_id, "RP04.P04.M06.S06");
});

test("CP00-164 binds RP04 master data synthetic fixture set pack", () => {
  assert.equal(MASTER_DATA_CP164_PACK_BINDING.pack_id, "CP00-164");
  assert.equal(MASTER_DATA_CP164_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP164_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP164_PACK_BINDING.range, "RP04.P04.M06.S06-RP04.P05.M06.S03");
  assert.equal(MASTER_DATA_CP164_PACK_BINDING.upstream_pack_id, "CP00-163");
  assert.equal(MASTER_DATA_CP164_PACK_BINDING.next_pack_id, "CP00-165");
  assert.equal(MASTER_DATA_CP164_PACK_BINDING.next_subphase_id, "RP04.P05.M06.S04");
  assert.equal(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.catalog_id, "master_data_synthetic_fixture_set_catalog");
  assert.equal(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.source_fixture_entry_id, MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id);
  assert.equal(MASTER_DATA_CP164_NO_WRITE_ATTESTATION.builds_synthetic_fixture_set_catalog, true);
  assert.equal(MASTER_DATA_CP164_NO_WRITE_ATTESTATION.loads_real_client_data, false);
  assert.equal(MASTER_DATA_CP164_NO_WRITE_ATTESTATION.executes_ai_retrieval, false);
});

test("CP00-164 synthetic fixture set descriptors cover golden failure and no-real-data cases without effects", () => {
  const golden = createMasterDataSyntheticFixtureSetCase({ case_type: "primary_golden_case" });
  assert.equal(golden.pack_id, "CP00-164");
  assert.equal(golden.outcome, "passed");
  assert.equal(golden.golden_test_descriptor, true);
  assert.equal(golden.renders_ui, false);
  assert.equal(golden.executes_api_handler, false);
  assert.equal(golden.no_real_data_check.generated_from_real_client_data, false);

  const crossTenant = createMasterDataSyntheticFixtureSetCase({ case_type: "cross_tenant_case" });
  assert.equal(crossTenant.outcome, "blocked");
  assert.equal(crossTenant.safe_error_code, "MASTER_DATA_CROSS_TENANT_REFERENCE");
  assert.equal(crossTenant.failure_test_descriptor, true);
  assert.equal(crossTenant.security_trimming.exposes_internal_claims, false);
  assert.equal(crossTenant.prohibited_output_absent, true);

  const aiAnalytics = createMasterDataSyntheticFixtureSetCase({ case_type: "ai_retrieval_or_analytics_case" });
  assert.equal(aiAnalytics.ai_retrieval_or_analytics.descriptor_present, true);
  assert.equal(aiAnalytics.ai_retrieval_or_analytics.executes_ai_retrieval, false);
  assert.equal(aiAnalytics.ai_retrieval_or_analytics.executes_analytics_query, false);

  const catalog = createMasterDataSyntheticFixtureSetCatalog();
  assert.equal(catalog.case_count, 9);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_base_fixture_refs_present, true);
  assert.equal(catalog.all_customer_facing_descriptors_trimmed, true);
  assert.equal(catalog.review_required_case_outcome, "review_required");
  assert.equal(catalog.denied_case_safe_error_code, "MASTER_DATA_API_UNAUTHORIZED_OMISSION");
  assert.equal(catalog.security_trimming_case_trims_unauthorized_data, true);
  assert.equal(catalog.ai_retrieval_or_analytics_descriptor_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-164 coverage, fixture-set validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp164Coverage(cp164PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.claude_review, 12);
  assert.equal(coverage.summary.by_deliverable.ui, 29);
  assert.equal(coverage.summary.by_deliverable.security_audit, 12);
  assert.equal(coverage.summary.by_deliverable.implementation, 36);
  assert.equal(coverage.summary.by_deliverable.fixture, 43);
  assert.equal(coverage.summary.by_deliverable.test, 12);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 6);
  assert.equal(coverage.summary.by_phase["RP04.P04"], 67);
  assert.equal(coverage.summary.by_phase["RP04.P05"], 83);

  const fixtureSet = validateMasterDataCp164SyntheticFixtureSet(masterDataContract);
  assert.equal(fixtureSet.valid, true);
  assert.equal(fixtureSet.fixture_set.fixture_case_types.length, 9);
  assert.equal(fixtureSet.no_write_attestation.builds_no_real_data_attestation, true);

  const hermes = createMasterDataCp164HermesEvidencePacket(cp164PlanPack);
  const claude = createMasterDataCp164ClaudeReviewPacket(cp164PlanPack);
  const handoff = createMasterDataCp164CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-164.master_data_synthetic_fixture_set");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.synthetic_fixture_set_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-164.master_data_synthetic_fixture_set");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-165");
  assert.equal(handoff.next_subphase_id, "RP04.P05.M06.S04");
});

test("CP00-165 binds RP04 master data permission matrix workflow pack", () => {
  assert.equal(MASTER_DATA_CP165_PACK_BINDING.pack_id, "CP00-165");
  assert.equal(MASTER_DATA_CP165_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP165_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP165_PACK_BINDING.range, "RP04.P05.M06.S04-RP04.P06.M04.S17");
  assert.equal(MASTER_DATA_CP165_PACK_BINDING.upstream_pack_id, "CP00-164");
  assert.equal(MASTER_DATA_CP165_PACK_BINDING.next_pack_id, "CP00-166");
  assert.equal(MASTER_DATA_CP165_PACK_BINDING.next_subphase_id, "RP04.P06.M04.S18");
  assert.equal(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id, "master_data_permission_matrix_workflow_catalog");
  assert.equal(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.source_fixture_set_catalog_id, MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.catalog_id);
  assert.equal(MASTER_DATA_CP165_NO_WRITE_ATTESTATION.builds_permission_matrix_workflow, true);
  assert.equal(MASTER_DATA_CP165_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP165_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-165 permission matrix descriptors cover decisions and security interactions without effects", () => {
  const denied = createMasterDataPermissionMatrixDecisionDescriptor({
    fixture_id: "cp165_test_denied_export",
    scenario: "denied",
    action: "export_download",
  });
  assert.equal(denied.pack_id, "CP00-165");
  assert.equal(denied.decision_outcome, "denied");
  assert.equal(denied.safe_error_code, "MASTER_DATA_PERMISSION_DENIED");
  assert.equal(denied.evaluates_runtime_permission, false);
  assert.equal(denied.audit_event_expectation.appends_audit_event, false);
  assert.equal(denied.route.dispatches_review_route, false);
  assert.equal(denied.prohibited_output_absent, true);

  const legalHold = createMasterDataPermissionMatrixDecisionDescriptor({
    fixture_id: "cp165_test_legal_hold_share",
    scenario: "legal_hold",
    action: "share",
  });
  assert.equal(legalHold.security_interactions.legal_hold, MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls.legal_hold_interaction);
  assert.equal(legalHold.safe_error_code, "MASTER_DATA_LEGAL_HOLD_BLOCKED");

  const review = createMasterDataPermissionMatrixDecisionDescriptor({
    fixture_id: "cp165_test_review_required",
    scenario: "review_required",
    action: "mutation",
  });
  assert.equal(review.decision_outcome, "review_required");
  assert.equal(review.route.review_required, true);
  assert.equal(review.route.dispatches_review_route, false);

  const catalog = createMasterDataPermissionMatrixWorkflowCatalog();
  assert.equal(catalog.fixture_ids.length, 8);
  assert.equal(catalog.all_fixture_ids_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_routes_descriptor_only, true);
  assert.equal(catalog.all_audit_expectations_descriptor_only, true);
  assert.equal(catalog.all_matched_rules_reference_only, true);
  assert.equal(catalog.deny_over_allow_covered, true);
  assert.equal(catalog.legal_hold_covered, true);
  assert.equal(catalog.ethical_wall_covered, true);
  assert.equal(catalog.object_acl_covered, true);
  assert.equal(catalog.security_trimming_covered, true);
  assert.equal(catalog.review_and_approval_routes_present, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-165 coverage, permission matrix validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp165Coverage(cp165PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.fixture, 28);
  assert.equal(coverage.summary.by_deliverable.claude_review, 7);
  assert.equal(coverage.summary.by_deliverable.implementation, 59);
  assert.equal(coverage.summary.by_deliverable.security_audit, 24);
  assert.equal(coverage.summary.by_deliverable.test, 15);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 3);
  assert.equal(coverage.summary.by_deliverable.ui, 14);
  assert.equal(coverage.summary.by_phase["RP04.P05"], 69);
  assert.equal(coverage.summary.by_phase["RP04.P06"], 81);

  const workflow = validateMasterDataCp165PermissionMatrixWorkflow(masterDataContract);
  assert.equal(workflow.valid, true);
  assert.equal(workflow.permission_matrix_workflow.permission_fixture_ids.length, 8);
  assert.equal(workflow.no_write_attestation.builds_permission_decision_descriptors, true);

  const hermes = createMasterDataCp165HermesEvidencePacket(cp165PlanPack);
  const claude = createMasterDataCp165ClaudeReviewPacket(cp165PlanPack);
  const handoff = createMasterDataCp165CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-165.master_data_permission_matrix_workflow");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.permission_matrix_workflow_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-165.master_data_permission_matrix_workflow");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-166");
  assert.equal(handoff.next_subphase_id, "RP04.P06.M04.S18");
});

test("CP00-166 binds RP04 master data permission audit decision binding pack", () => {
  assert.equal(MASTER_DATA_CP166_PACK_BINDING.pack_id, "CP00-166");
  assert.equal(MASTER_DATA_CP166_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP166_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP166_PACK_BINDING.range, "RP04.P06.M04.S18-RP04.P06.M05.S07");
  assert.equal(MASTER_DATA_CP166_PACK_BINDING.upstream_pack_id, "CP00-165");
  assert.equal(MASTER_DATA_CP166_PACK_BINDING.next_pack_id, "CP00-167");
  assert.equal(MASTER_DATA_CP166_PACK_BINDING.next_subphase_id, "RP04.P06.M05.S08");
  assert.equal(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.source_matrix_workflow_id, MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id);
  assert.equal(MASTER_DATA_CP166_NO_WRITE_ATTESTATION.builds_permission_audit_decision_binding, true);
  assert.equal(MASTER_DATA_CP166_NO_WRITE_ATTESTATION.separates_customer_facing_outcome_from_internal_refs, true);
  assert.equal(MASTER_DATA_CP166_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP166_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-166 permission audit decision descriptors separate customer output from internal refs", () => {
  const denied = createMasterDataPermissionAuditDecisionBindingDescriptor({
    action: "export_download",
    scenario: "denied",
  });
  assert.equal(denied.pack_id, "CP00-166");
  assert.equal(denied.matrix_decision.pack_id, "CP00-165");
  assert.equal(denied.customer_facing_decision.decision_outcome, "denied");
  assert.equal(denied.customer_facing_decision.safe_error_code, "MASTER_DATA_PERMISSION_DENIED");
  assert.equal(Object.hasOwn(denied.customer_facing_decision, "permission_ref"), false);
  assert.equal(Object.hasOwn(denied.customer_facing_decision, "audit_hint_ref"), false);
  assert.equal(Object.hasOwn(denied.customer_facing_decision, "matched_rule_ref"), false);
  assert.equal(denied.internal_evidence_binding.permission_ref.includes("cp166"), true);
  assert.equal(denied.internal_evidence_binding.exposes_customer_surface, false);
  assert.equal(denied.evaluates_runtime_permission, false);
  assert.equal(denied.audit_event_expectation.appends_audit_event, false);
  assert.equal(denied.route.dispatches_review_route, false);
  assert.equal(denied.customer_surface_excludes_internal_refs, true);
  assert.equal(denied.prohibited_output_absent, true);

  const catalog = createMasterDataPermissionAuditDecisionBindingCatalog();
  assert.equal(catalog.action_rows.length, 6);
  assert.equal(catalog.all_actions_bound, true);
  assert.equal(catalog.fixture_tests.allowed_covered, true);
  assert.equal(catalog.fixture_tests.denied_covered, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.all_audit_expectations_descriptor_only, true);
  assert.equal(catalog.review_and_approval_routes_descriptor_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-166 coverage, permission audit decision validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp166Coverage(cp166PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.test, 2);
  assert.equal(coverage.summary.by_deliverable.implementation, 6);
  assert.equal(coverage.summary.by_micro_phase["RP04.P06.M04"], 3);
  assert.equal(coverage.summary.by_micro_phase["RP04.P06.M05"], 7);

  const binding = validateMasterDataCp166PermissionAuditDecisionBinding(masterDataContract);
  assert.equal(binding.valid, true);
  assert.equal(binding.permission_audit_decision_binding.binding_id, MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id);
  assert.equal(binding.no_write_attestation.builds_permission_matrix_row_descriptor, true);

  const hermes = createMasterDataCp166HermesEvidencePacket(cp166PlanPack);
  const claude = createMasterDataCp166ClaudeReviewPacket(cp166PlanPack);
  const handoff = createMasterDataCp166CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-166.master_data_permission_audit_decision_binding");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.permission_audit_decision_binding_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-166.master_data_permission_audit_decision_binding");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-167");
  assert.equal(handoff.next_subphase_id, "RP04.P06.M05.S08");
});

test("CP00-167 binds RP04 master data permission audit control interactions pack", () => {
  assert.equal(MASTER_DATA_CP167_PACK_BINDING.pack_id, "CP00-167");
  assert.equal(MASTER_DATA_CP167_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP167_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP167_PACK_BINDING.range, "RP04.P06.M05.S08-RP04.P06.M05.S17");
  assert.equal(MASTER_DATA_CP167_PACK_BINDING.upstream_pack_id, "CP00-166");
  assert.equal(MASTER_DATA_CP167_PACK_BINDING.next_pack_id, "CP00-168");
  assert.equal(MASTER_DATA_CP167_PACK_BINDING.next_subphase_id, "RP04.P06.M05.S18");
  assert.equal(
    MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.source_decision_binding_id,
    MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id,
  );
  assert.equal(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.source_matrix_workflow_id, MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id);
  assert.equal(MASTER_DATA_CP167_NO_WRITE_ATTESTATION.builds_permission_audit_control_interactions, true);
  assert.equal(MASTER_DATA_CP167_NO_WRITE_ATTESTATION.builds_audit_hint_field_descriptors, true);
  assert.equal(MASTER_DATA_CP167_NO_WRITE_ATTESTATION.builds_security_trimming_proof_descriptors, true);
  assert.equal(MASTER_DATA_CP167_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP167_NO_WRITE_ATTESTATION.appends_audit_event, false);
  assert.equal(MASTER_DATA_CP167_NO_WRITE_ATTESTATION.dispatches_review_route, false);
  assert.equal(MASTER_DATA_CP167_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
});

test("CP00-167 permission audit control descriptors protect customer output and internal refs", () => {
  const legalHold = createMasterDataPermissionAuditControlInteractionDescriptor({
    control_key: "legal_hold_interaction",
  });
  assert.equal(legalHold.pack_id, "CP00-167");
  assert.equal(legalHold.decision_binding.pack_id, "CP00-166");
  assert.equal(legalHold.customer_facing_control_outcome.control_key, "legal_hold_interaction");
  assert.equal(Object.hasOwn(legalHold.customer_facing_control_outcome, "permission_ref"), false);
  assert.equal(Object.hasOwn(legalHold.customer_facing_control_outcome, "audit_hint_ref"), false);
  assert.equal(Object.hasOwn(legalHold.customer_facing_control_outcome, "matched_rule_ref"), false);
  assert.equal(Object.hasOwn(legalHold.customer_facing_control_outcome, "wall_membership"), false);
  assert.equal(legalHold.internal_control_evidence.exposes_customer_surface, false);
  assert.equal(legalHold.internal_control_evidence.exposes_raw_rule, false);
  assert.equal(legalHold.internal_control_evidence.exposes_audit_internal_payload, false);
  assert.equal(legalHold.internal_control_evidence.exposes_denied_items, false);
  assert.equal(legalHold.evaluates_runtime_permission, false);
  assert.equal(legalHold.audit_event_expectation.appends_audit_event, false);
  assert.equal(legalHold.route.dispatches_review_route, false);
  assert.equal(legalHold.legal_hold_interaction_descriptor.mutates_hold_state, false);
  assert.equal(legalHold.customer_surface_excludes_internal_refs, true);
  assert.equal(legalHold.prohibited_output_absent, true);

  const catalog = createMasterDataPermissionAuditControlInteractionsCatalog();
  assert.equal(catalog.control_rows.length, 10);
  assert.equal(catalog.all_controls_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.audit_hint_fields_covered, true);
  assert.equal(catalog.matched_rule_capture_reference_only, true);
  assert.equal(catalog.deny_over_allow_covered, true);
  assert.equal(catalog.legal_hold_covered, true);
  assert.equal(catalog.ethical_wall_covered, true);
  assert.equal(catalog.object_acl_covered, true);
  assert.equal(catalog.review_route_descriptor_only, true);
  assert.equal(catalog.approval_route_descriptor_only, true);
  assert.equal(catalog.security_trimming_safe_counts_only, true);
  assert.equal(catalog.audit_event_expectation_descriptor_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-167 coverage, permission audit control validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp167Coverage(cp167PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 3);
  assert.equal(coverage.summary.by_deliverable.implementation, 2);
  assert.equal(coverage.summary.by_deliverable.ui, 4);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_micro_phase["RP04.P06.M05"], 10);

  const interactions = validateMasterDataCp167PermissionAuditControlInteractions(masterDataContract);
  assert.equal(interactions.valid, true);
  assert.equal(interactions.permission_audit_control_interactions.control_id, MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id);
  assert.equal(interactions.no_write_attestation.builds_permission_audit_control_interactions, true);

  const hermes = createMasterDataCp167HermesEvidencePacket(cp167PlanPack);
  const claude = createMasterDataCp167ClaudeReviewPacket(cp167PlanPack);
  const handoff = createMasterDataCp167CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-167.master_data_permission_audit_control_interactions");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.permission_audit_control_interactions_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-167.master_data_permission_audit_control_interactions");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-168");
  assert.equal(handoff.next_subphase_id, "RP04.P06.M05.S18");
});

test("CP00-168 binds RP04 master data permission audit fixture decision tests pack", () => {
  assert.equal(MASTER_DATA_CP168_PACK_BINDING.pack_id, "CP00-168");
  assert.equal(MASTER_DATA_CP168_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP168_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP168_PACK_BINDING.range, "RP04.P06.M05.S18-RP04.P06.M06.S05");
  assert.equal(MASTER_DATA_CP168_PACK_BINDING.upstream_pack_id, "CP00-167");
  assert.equal(MASTER_DATA_CP168_PACK_BINDING.next_pack_id, "CP00-169");
  assert.equal(MASTER_DATA_CP168_PACK_BINDING.next_subphase_id, "RP04.P06.M06.S06");
  assert.equal(
    MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_control_interactions_id,
    MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id,
  );
  assert.equal(
    MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_decision_binding_id,
    MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id,
  );
  assert.equal(MASTER_DATA_CP168_NO_WRITE_ATTESTATION.builds_permission_audit_fixture_decision_tests, true);
  assert.equal(MASTER_DATA_CP168_NO_WRITE_ATTESTATION.builds_cross_tenant_test_descriptor, true);
  assert.equal(MASTER_DATA_CP168_NO_WRITE_ATTESTATION.builds_leak_prevention_test_descriptor, true);
  assert.equal(MASTER_DATA_CP168_NO_WRITE_ATTESTATION.loads_real_client_data, false);
  assert.equal(MASTER_DATA_CP168_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP168_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-168 permission audit fixture decision tests keep tenant and leak details internal", () => {
  const crossTenant = createMasterDataPermissionAuditFixtureDecisionTestDescriptor({
    test_key: "cross_tenant_test",
  });
  assert.equal(crossTenant.pack_id, "CP00-168");
  assert.equal(crossTenant.control_interaction.pack_id, "CP00-167");
  assert.equal(crossTenant.customer_facing_test_outcome.test_key, "cross_tenant_test");
  assert.equal(crossTenant.customer_facing_test_outcome.expected_outcome, "denied");
  assert.equal(Object.hasOwn(crossTenant.customer_facing_test_outcome, "permission_ref"), false);
  assert.equal(Object.hasOwn(crossTenant.customer_facing_test_outcome, "audit_hint_ref"), false);
  assert.equal(Object.hasOwn(crossTenant.customer_facing_test_outcome, "matched_rule_ref"), false);
  assert.equal(Object.hasOwn(crossTenant.customer_facing_test_outcome, "foreign_tenant_id"), false);
  assert.equal(Object.hasOwn(crossTenant.customer_facing_test_outcome, "hidden_source_values"), false);
  assert.equal(crossTenant.internal_fixture_evidence.exposes_customer_surface, false);
  assert.equal(crossTenant.internal_fixture_evidence.exposes_raw_rule, false);
  assert.equal(crossTenant.internal_fixture_evidence.exposes_foreign_tenant_id, false);
  assert.equal(crossTenant.internal_fixture_evidence.exposes_hidden_source_values, false);
  assert.equal(crossTenant.evaluates_runtime_permission, false);
  assert.equal(crossTenant.appends_audit_event, false);
  assert.equal(crossTenant.customer_surface_excludes_internal_refs, true);
  assert.equal(crossTenant.prohibited_output_absent, true);

  const leakPrevention = createMasterDataPermissionAuditFixtureDecisionTestDescriptor({
    test_key: "leak_prevention_test",
  });
  assert.equal(leakPrevention.customer_facing_test_outcome.scenario, "leak_prevention");
  assert.equal(leakPrevention.customer_facing_test_outcome.expected_outcome, "denied");
  assert.equal(leakPrevention.leak_prevention_test_descriptor.exposes_hidden_source_values, false);
  assert.equal(leakPrevention.leak_prevention_test_descriptor.exposes_unauthorized_payload, false);
  assert.equal(leakPrevention.internal_fixture_evidence.exposes_denied_item_payload, false);

  const catalog = createMasterDataPermissionAuditFixtureDecisionTestsCatalog();
  assert.equal(catalog.test_rows.length, 10);
  assert.equal(catalog.all_fixture_tests_declared, true);
  assert.equal(catalog.all_decision_bindings_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.permission_fixture_covered, true);
  assert.equal(catalog.allowed_test_covered, true);
  assert.equal(catalog.denied_test_covered, true);
  assert.equal(catalog.cross_tenant_test_covered, true);
  assert.equal(catalog.leak_prevention_test_covered, true);
  assert.equal(catalog.permission_matrix_row_covered, true);
  assert.equal(catalog.view_decision_binding_covered, true);
  assert.equal(catalog.search_decision_binding_covered, true);
  assert.equal(catalog.mutation_decision_binding_covered, true);
  assert.equal(catalog.export_download_decision_binding_covered, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-168 coverage, fixture decision validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp168Coverage(cp168PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 2);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_deliverable.implementation, 4);
  assert.equal(coverage.summary.by_micro_phase["RP04.P06.M05"], 5);
  assert.equal(coverage.summary.by_micro_phase["RP04.P06.M06"], 5);

  const fixtureTests = validateMasterDataCp168PermissionAuditFixtureDecisionTests(masterDataContract);
  assert.equal(fixtureTests.valid, true);
  assert.equal(
    fixtureTests.permission_audit_fixture_decision_tests.test_matrix_id,
    MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id,
  );
  assert.equal(fixtureTests.no_write_attestation.builds_permission_audit_fixture_decision_tests, true);

  const hermes = createMasterDataCp168HermesEvidencePacket(cp168PlanPack);
  const claude = createMasterDataCp168ClaudeReviewPacket(cp168PlanPack);
  const handoff = createMasterDataCp168CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-168.master_data_permission_audit_fixture_decision_tests");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.permission_audit_fixture_decision_tests_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-168.master_data_permission_audit_fixture_decision_tests");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-169");
  assert.equal(handoff.next_subphase_id, "RP04.P06.M06.S06");
});

test("CP00-169 binds RP04 master data permission audit workflow failure taxonomy pack", () => {
  assert.equal(MASTER_DATA_CP169_PACK_BINDING.pack_id, "CP00-169");
  assert.equal(MASTER_DATA_CP169_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP169_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP169_PACK_BINDING.range, "RP04.P06.M06.S06-RP04.P07.M03.S20");
  assert.equal(MASTER_DATA_CP169_PACK_BINDING.upstream_pack_id, "CP00-168");
  assert.equal(MASTER_DATA_CP169_PACK_BINDING.next_pack_id, "CP00-170");
  assert.equal(MASTER_DATA_CP169_PACK_BINDING.next_subphase_id, "RP04.P07.M03.S21");
  assert.equal(
    MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_fixture_decision_tests_id,
    MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id,
  );
  assert.equal(
    MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_control_interactions_id,
    MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id,
  );
  assert.equal(MASTER_DATA_CP169_NO_WRITE_ATTESTATION.builds_permission_audit_workflow_failure_taxonomy, true);
  assert.equal(MASTER_DATA_CP169_NO_WRITE_ATTESTATION.builds_share_decision_binding_descriptor, true);
  assert.equal(MASTER_DATA_CP169_NO_WRITE_ATTESTATION.builds_ai_retrieval_decision_binding_descriptor, true);
  assert.equal(MASTER_DATA_CP169_NO_WRITE_ATTESTATION.builds_failure_taxonomy_descriptors, true);
  assert.equal(MASTER_DATA_CP169_NO_WRITE_ATTESTATION.loads_real_client_data, false);
  assert.equal(MASTER_DATA_CP169_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP169_NO_WRITE_ATTESTATION.emits_hermes_evidence, false);
});

test("CP00-169 workflow failure taxonomy keeps customer summaries separate from internal evidence", () => {
  const share = createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor({
    descriptor_key: "share_decision_binding",
  });
  assert.equal(share.pack_id, "CP00-169");
  assert.equal(share.source_fixture_test.pack_id, "CP00-168");
  assert.equal(share.customer_facing_failure_summary.descriptor_key, "share_decision_binding");
  assert.equal(share.customer_facing_failure_summary.outcome_descriptor, "approval_required");
  assert.equal(share.continuation_descriptor.dispatches_approval_route, false);
  assert.equal(Object.hasOwn(share.customer_facing_failure_summary, "permission_ref"), false);
  assert.equal(Object.hasOwn(share.customer_facing_failure_summary, "audit_hint_ref"), false);
  assert.equal(Object.hasOwn(share.customer_facing_failure_summary, "blocked_claim"), false);
  assert.equal(share.internal_failure_evidence.exposes_customer_surface, false);
  assert.equal(share.customer_surface_excludes_internal_refs, true);
  assert.equal(share.prohibited_output_absent, true);

  const crossTenant = createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor({
    descriptor_key: "cross_tenant_failure",
  });
  assert.equal(crossTenant.customer_facing_failure_summary.safe_error_code, "MASTER_DATA_TENANT_MISMATCH");
  assert.equal(crossTenant.failure_descriptor.exposes_foreign_tenant_id, false);
  assert.equal(Object.hasOwn(crossTenant.customer_facing_failure_summary, "foreign_tenant_id"), false);
  assert.equal(crossTenant.internal_failure_evidence.exposes_foreign_tenant_id, false);

  const catalog = createMasterDataPermissionAuditWorkflowFailureTaxonomyCatalog();
  assert.equal(catalog.all_continuation_descriptors_declared, true);
  assert.equal(catalog.all_failure_taxonomy_descriptors_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.share_decision_binding_covered, true);
  assert.equal(catalog.ai_retrieval_decision_binding_covered, true);
  assert.equal(catalog.missing_tenant_failure_covered, true);
  assert.equal(catalog.missing_actor_failure_covered, true);
  assert.equal(catalog.missing_matter_failure_covered, true);
  assert.equal(catalog.cross_tenant_failure_covered, true);
  assert.equal(catalog.permission_denied_failure_covered, true);
  assert.equal(catalog.ambiguous_rule_failure_covered, true);
  assert.equal(catalog.stale_reference_failure_covered, true);
  assert.equal(catalog.lock_conflict_failure_covered, true);
  assert.equal(catalog.retry_and_rollback_descriptor_only, true);
  assert.equal(catalog.blocked_claim_receipt_covered, true);
  assert.equal(catalog.failure_fixture_covered, true);
  assert.equal(catalog.failure_tests_covered, true);
  assert.equal(catalog.hermes_and_claude_packets_descriptor_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
  assert.equal(
    catalog.descriptor_rows.find((row) => row.descriptor_key === "hermes_evidence_packet")?.source_fixture_test.test_key,
    "permission_fixture",
  );
  assert.equal(
    catalog.descriptor_rows.find((row) => row.descriptor_key === "claude_review_packet")?.source_fixture_test.test_key,
    "permission_fixture",
  );
  assert.equal(
    catalog.descriptor_rows.find((row) => row.descriptor_key === "closeout_handoff")?.source_fixture_test.test_key,
    "permission_fixture",
  );
});

test("CP00-169 coverage, workflow failure taxonomy validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp169Coverage(cp169PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.implementation, 38);
  assert.equal(coverage.summary.by_deliverable.security_audit, 27);
  assert.equal(coverage.summary.by_deliverable.ui, 17);
  assert.equal(coverage.summary.by_deliverable.claude_review, 4);
  assert.equal(coverage.summary.by_deliverable.test, 14);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 44);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 4);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_micro_phase["RP04.P06.M06"], 15);
  assert.equal(coverage.summary.by_micro_phase["RP04.P07.M03"], 20);

  const taxonomy = validateMasterDataCp169PermissionAuditWorkflowFailureTaxonomy(masterDataContract);
  assert.equal(taxonomy.valid, true);
  assert.equal(
    taxonomy.permission_audit_workflow_failure_taxonomy.catalog_id,
    MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
  );
  assert.equal(taxonomy.no_write_attestation.builds_permission_audit_workflow_failure_taxonomy, true);

  const hermes = createMasterDataCp169HermesEvidencePacket(cp169PlanPack);
  const claude = createMasterDataCp169ClaudeReviewPacket(cp169PlanPack);
  const handoff = createMasterDataCp169CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-169.master_data_permission_audit_workflow_failure_taxonomy");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.permission_audit_workflow_failure_taxonomy_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-169.master_data_permission_audit_workflow_failure_taxonomy");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-170");
  assert.equal(handoff.next_subphase_id, "RP04.P07.M03.S21");
});

test("CP00-170 binds RP04 master data failure taxonomy edge-case escalation pack", () => {
  assert.equal(MASTER_DATA_CP170_PACK_BINDING.pack_id, "CP00-170");
  assert.equal(MASTER_DATA_CP170_PACK_BINDING.risk_class, "B");
  assert.equal(MASTER_DATA_CP170_PACK_BINDING.unit_count, 40);
  assert.equal(MASTER_DATA_CP170_PACK_BINDING.range, "RP04.P07.M03.S21-RP04.P07.M05.S18");
  assert.equal(MASTER_DATA_CP170_PACK_BINDING.upstream_pack_id, "CP00-169");
  assert.equal(MASTER_DATA_CP170_PACK_BINDING.next_pack_id, "CP00-171");
  assert.equal(MASTER_DATA_CP170_PACK_BINDING.next_subphase_id, "RP04.P07.M05.S19");
  assert.equal(
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.source_failure_taxonomy_catalog_id,
    MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
  );
  assert.equal(
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.source_fixture_decision_tests_id,
    MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id,
  );
  assert.equal(MASTER_DATA_CP170_NO_WRITE_ATTESTATION.builds_failure_taxonomy_edge_case_escalation, true);
  assert.equal(MASTER_DATA_CP170_NO_WRITE_ATTESTATION.builds_claude_edge_case_prompt_descriptor, true);
  assert.equal(MASTER_DATA_CP170_NO_WRITE_ATTESTATION.builds_human_escalation_note_descriptor, true);
  assert.equal(MASTER_DATA_CP170_NO_WRITE_ATTESTATION.loads_real_client_data, false);
  assert.equal(MASTER_DATA_CP170_NO_WRITE_ATTESTATION.sends_claude_prompt, false);
  assert.equal(MASTER_DATA_CP170_NO_WRITE_ATTESTATION.writes_case_note, false);
});

test("CP00-170 edge-case escalation keeps prompts and human notes descriptor-only", () => {
  const claudePrompt = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
    descriptor_key: "claude_edge_case_prompt",
  });
  assert.equal(claudePrompt.pack_id, "CP00-170");
  assert.equal(claudePrompt.edge_case_descriptor.read_only, true);
  assert.equal(claudePrompt.edge_case_descriptor.sends_claude_prompt, false);
  assert.equal(claudePrompt.executes_claude_review, false);
  assert.equal(claudePrompt.customer_surface_excludes_internal_refs, true);
  assert.equal(claudePrompt.prohibited_output_absent, true);

  const humanNote = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
    descriptor_key: "human_escalation_note",
  });
  assert.equal(humanNote.edge_case_descriptor.dispatches_review_route, false);
  assert.equal(humanNote.edge_case_descriptor.writes_case_note, false);
  assert.equal(humanNote.internal_edge_case_evidence.exposes_internal_note, false);

  const crossTenant = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
    descriptor_key: "cross_tenant_failure",
  });
  assert.equal(crossTenant.source_failure_taxonomy_descriptor.pack_id, "CP00-169");
  assert.equal(crossTenant.customer_facing_edge_case_summary.safe_error_code, "MASTER_DATA_TENANT_MISMATCH");
  assert.equal(crossTenant.failure_recovery_binding.exposes_foreign_tenant_id, false);
  assert.equal(Object.hasOwn(crossTenant.customer_facing_edge_case_summary, "foreign_tenant_id"), false);
  assert.equal(crossTenant.internal_edge_case_evidence.exposes_foreign_tenant_id, false);

  const catalog = createMasterDataFailureTaxonomyEdgeCaseEscalationCatalog();
  assert.equal(catalog.all_edge_case_descriptors_declared, true);
  assert.equal(catalog.all_failure_recovery_bindings_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.claude_edge_case_prompt_descriptor_only, true);
  assert.equal(catalog.human_escalation_note_descriptor_only, true);
  assert.equal(catalog.missing_tenant_failure_escalates, true);
  assert.equal(catalog.cross_tenant_failure_trimmed, true);
  assert.equal(catalog.permission_denied_failure_trimmed, true);
  assert.equal(catalog.ambiguous_rule_failure_trimmed, true);
  assert.equal(catalog.stale_reference_failure_trimmed, true);
  assert.equal(catalog.lock_retry_rollback_descriptor_only, true);
  assert.equal(catalog.blocked_claim_receipt_descriptor_only, true);
  assert.equal(catalog.failure_fixture_synthetic_only, true);
  assert.equal(catalog.failure_tests_descriptor_only, true);
  assert.equal(catalog.audit_and_hermes_descriptors_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-170 coverage, edge-case escalation validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp170Coverage(cp170PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 40);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 3);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 24);
  assert.equal(coverage.summary.by_deliverable.security_audit, 3);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 3);
  assert.equal(coverage.summary.by_deliverable.fixture, 2);
  assert.equal(coverage.summary.by_deliverable.test, 4);
  assert.equal(coverage.summary.by_micro_phase["RP04.P07.M03"], 2);
  assert.equal(coverage.summary.by_micro_phase["RP04.P07.M04"], 20);
  assert.equal(coverage.summary.by_micro_phase["RP04.P07.M05"], 18);

  const edgeCaseEscalation = validateMasterDataCp170FailureTaxonomyEdgeCaseEscalation(masterDataContract);
  assert.equal(edgeCaseEscalation.valid, true);
  assert.equal(
    edgeCaseEscalation.failure_taxonomy_edge_case_escalation.catalog_id,
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id,
  );
  assert.equal(edgeCaseEscalation.no_write_attestation.builds_failure_taxonomy_edge_case_escalation, true);

  const hermes = createMasterDataCp170HermesEvidencePacket(cp170PlanPack);
  const claude = createMasterDataCp170ClaudeReviewPacket(cp170PlanPack);
  const handoff = createMasterDataCp170CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-170.master_data_failure_taxonomy_edge_case_escalation");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.failure_taxonomy_edge_case_escalation_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-170.master_data_failure_taxonomy_edge_case_escalation");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-171");
  assert.equal(handoff.next_subphase_id, "RP04.P07.M05.S19");
});

test("CP00-171 binds RP04 master data failure taxonomy sensitive entry boundary pack", () => {
  assert.equal(MASTER_DATA_CP171_PACK_BINDING.pack_id, "CP00-171");
  assert.equal(MASTER_DATA_CP171_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP171_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP171_PACK_BINDING.range, "RP04.P07.M05.S19-RP04.P07.M06.S06");
  assert.equal(MASTER_DATA_CP171_PACK_BINDING.upstream_pack_id, "CP00-170");
  assert.equal(MASTER_DATA_CP171_PACK_BINDING.next_pack_id, "CP00-172");
  assert.equal(MASTER_DATA_CP171_PACK_BINDING.next_subphase_id, "RP04.P07.M06.S07");
  assert.equal(
    MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.source_edge_case_escalation_catalog_id,
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id,
  );
  assert.equal(
    MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.source_failure_taxonomy_catalog_id,
    MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
  );
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.builds_failure_taxonomy_sensitive_entry_boundary, true);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.builds_sensitive_audit_failure_hint_descriptor, true);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.builds_sensitive_hermes_failure_evidence_descriptor, true);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.builds_sensitive_claude_edge_case_prompt_descriptor, true);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.builds_sensitive_human_escalation_note_descriptor, true);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.loads_real_client_data, false);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.sends_claude_prompt, false);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.executes_hermes_command, false);
  assert.equal(MASTER_DATA_CP171_NO_WRITE_ATTESTATION.writes_case_note, false);
});

test("CP00-171 sensitive entry boundary keeps audit Hermes Claude human and missing-scope rows descriptor-only", () => {
  const claudePrompt = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
    descriptor_key: "claude_edge_case_prompt",
  });
  assert.equal(claudePrompt.pack_id, "CP00-171");
  assert.equal(claudePrompt.boundary_descriptor.read_only, true);
  assert.equal(claudePrompt.boundary_descriptor.sends_claude_prompt, false);
  assert.equal(claudePrompt.executes_claude_review, false);
  assert.equal(claudePrompt.customer_surface_excludes_internal_refs, true);
  assert.equal(claudePrompt.prohibited_output_absent, true);
  assert.equal(Object.hasOwn(claudePrompt.customer_facing_sensitive_summary, "source_descriptor_key"), false);

  const humanNote = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
    descriptor_key: "human_escalation_note",
  });
  assert.equal(humanNote.boundary_descriptor.dispatches_review_route, false);
  assert.equal(humanNote.boundary_descriptor.dispatches_approval_route, false);
  assert.equal(humanNote.boundary_descriptor.writes_case_note, false);
  assert.equal(humanNote.internal_sensitive_evidence.exposes_internal_note, false);

  const matterFailure = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
    descriptor_key: "missing_matter_failure",
  });
  assert.equal(matterFailure.customer_facing_sensitive_summary.safe_error_code, "MASTER_DATA_MATTER_TRACE_REQUIRED");
  assert.equal(matterFailure.entry_failure_binding.exposes_matter_payload, false);
  assert.equal(Object.hasOwn(matterFailure.customer_facing_sensitive_summary, "matter_payload"), false);
  assert.equal(matterFailure.internal_sensitive_evidence.exposes_matter_payload, false);

  const resourceFailure = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
    descriptor_key: "missing_resource_failure",
  });
  assert.equal(resourceFailure.customer_facing_sensitive_summary.safe_error_code, "MASTER_DATA_RESOURCE_REQUIRED");
  assert.equal(resourceFailure.entry_failure_binding.exposes_resource_payload, false);
  assert.equal(Object.hasOwn(resourceFailure.customer_facing_sensitive_summary, "resource_payload"), false);
  assert.equal(resourceFailure.internal_sensitive_evidence.exposes_resource_payload, false);

  const catalog = createMasterDataFailureTaxonomySensitiveEntryBoundaryCatalog();
  assert.equal(catalog.all_boundary_descriptors_declared, true);
  assert.equal(catalog.all_entry_failure_bindings_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.audit_failure_hint_descriptor_only, true);
  assert.equal(catalog.hermes_failure_evidence_descriptor_only, true);
  assert.equal(catalog.claude_edge_case_prompt_descriptor_only, true);
  assert.equal(catalog.human_escalation_note_descriptor_only, true);
  assert.equal(catalog.missing_scope_failures_covered, true);
  assert.equal(catalog.missing_matter_resource_payloads_trimmed, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-171 coverage, sensitive entry validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp171Coverage(cp171PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 1);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
  assert.equal(coverage.summary.by_deliverable.claude_review, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 1);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 6);
  assert.equal(coverage.summary.by_micro_phase["RP04.P07.M05"], 4);
  assert.equal(coverage.summary.by_micro_phase["RP04.P07.M06"], 6);

  const sensitiveEntry = validateMasterDataCp171FailureTaxonomySensitiveEntryBoundary(masterDataContract);
  assert.equal(sensitiveEntry.valid, true);
  assert.equal(
    sensitiveEntry.failure_taxonomy_sensitive_entry_boundary.catalog_id,
    MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id,
  );
  assert.equal(sensitiveEntry.no_write_attestation.builds_failure_taxonomy_sensitive_entry_boundary, true);

  const hermes = createMasterDataCp171HermesEvidencePacket(cp171PlanPack);
  const claude = createMasterDataCp171ClaudeReviewPacket(cp171PlanPack);
  const handoff = createMasterDataCp171CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-171.master_data_failure_taxonomy_sensitive_entry_boundary");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.failure_taxonomy_sensitive_entry_boundary_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-171.master_data_failure_taxonomy_sensitive_entry_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-172");
  assert.equal(handoff.next_subphase_id, "RP04.P07.M06.S07");
});

test("CP00-172 binds RP04 master data failure taxonomy operational edge boundary pack", () => {
  assert.equal(MASTER_DATA_CP172_PACK_BINDING.pack_id, "CP00-172");
  assert.equal(MASTER_DATA_CP172_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP172_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP172_PACK_BINDING.range, "RP04.P07.M06.S07-RP04.P07.M06.S16");
  assert.equal(MASTER_DATA_CP172_PACK_BINDING.upstream_pack_id, "CP00-171");
  assert.equal(MASTER_DATA_CP172_PACK_BINDING.next_pack_id, "CP00-173");
  assert.equal(MASTER_DATA_CP172_PACK_BINDING.next_subphase_id, "RP04.P07.M06.S17");
  assert.equal(
    MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_sensitive_entry_boundary_catalog_id,
    MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id,
  );
  assert.equal(
    MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.source_edge_case_escalation_catalog_id,
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id,
  );
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.builds_failure_taxonomy_operational_edge_boundary, true);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.builds_cross_tenant_failure_descriptor, true);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.builds_permission_denied_failure_descriptor, true);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.builds_blocked_claim_receipt_descriptor, true);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.builds_failure_fixture_descriptor, true);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.loads_real_client_data, false);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.executes_retry, false);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.executes_rollback, false);
  assert.equal(MASTER_DATA_CP172_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
});

test("CP00-172 operational edge boundary keeps failure rows descriptor-only and customer-safe", () => {
  const crossTenant = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
    descriptor_key: "cross_tenant_failure",
  });
  assert.equal(crossTenant.pack_id, "CP00-172");
  assert.equal(crossTenant.customer_facing_operational_summary.safe_error_code, "MASTER_DATA_TENANT_MISMATCH");
  assert.equal(Object.hasOwn(crossTenant.customer_facing_operational_summary, "source_descriptor_key"), false);
  assert.equal(Object.hasOwn(crossTenant.customer_facing_operational_summary, "foreign_tenant_id"), false);
  assert.equal(crossTenant.operational_binding.exposes_foreign_tenant_id, false);
  assert.equal(crossTenant.internal_operational_evidence.exposes_foreign_tenant_id, false);
  assert.equal(crossTenant.customer_surface_excludes_internal_refs, true);

  const permissionDenied = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
    descriptor_key: "permission_denied_failure",
  });
  assert.equal(permissionDenied.operational_binding.exposes_permission_rule, false);
  assert.equal(permissionDenied.operational_binding.exposes_denied_item_payload, false);
  assert.equal(permissionDenied.internal_operational_evidence.exposes_permission_rule, false);

  const retry = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
    descriptor_key: "retry_exhaustion_failure",
  });
  assert.equal(retry.operational_binding.executes_retry, false);
  assert.equal(retry.internal_operational_evidence.executes_retry, false);
  assert.equal(retry.internal_operational_evidence.exposes_retry_backoff, false);

  const rollback = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
    descriptor_key: "rollback_expectation",
  });
  assert.equal(rollback.operational_binding.executes_rollback, false);
  assert.equal(rollback.internal_operational_evidence.executes_rollback, false);
  assert.equal(rollback.internal_operational_evidence.writes_product_state, false);

  const blockedClaim = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
    descriptor_key: "blocked_claim_receipt",
  });
  assert.equal(blockedClaim.operational_binding.emits_hermes_evidence, false);
  assert.equal(blockedClaim.operational_binding.executes_hermes_command, false);
  assert.equal(blockedClaim.internal_operational_evidence.exposes_blocked_claim, false);

  const fixture = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
    descriptor_key: "failure_fixture",
  });
  assert.equal(fixture.operational_binding.synthetic_fixture_only, true);
  assert.equal(fixture.operational_binding.loads_real_client_data, false);
  assert.equal(fixture.internal_operational_evidence.exposes_fixture_payload, false);

  const catalog = createMasterDataFailureTaxonomyOperationalEdgeBoundaryCatalog();
  assert.equal(catalog.all_operational_bindings_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.cross_tenant_failure_trimmed, true);
  assert.equal(catalog.permission_denied_failure_trimmed, true);
  assert.equal(catalog.ambiguous_rule_failure_trimmed, true);
  assert.equal(catalog.stale_reference_failure_trimmed, true);
  assert.equal(catalog.lock_retry_rollback_descriptor_only, true);
  assert.equal(catalog.compensation_descriptor_only, true);
  assert.equal(catalog.blocked_claim_receipt_descriptor_only, true);
  assert.equal(catalog.failure_fixture_synthetic_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-172 coverage, operational edge validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp172Coverage(cp172PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 6);
  assert.equal(coverage.summary.by_deliverable.security_audit, 1);
  assert.equal(coverage.summary.by_deliverable.implementation, 1);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 1);
  assert.equal(coverage.summary.by_deliverable.fixture, 1);
  assert.equal(coverage.summary.by_micro_phase["RP04.P07.M06"], 10);

  const operationalEdge = validateMasterDataCp172FailureTaxonomyOperationalEdgeBoundary(masterDataContract);
  assert.equal(operationalEdge.valid, true);
  assert.equal(
    operationalEdge.failure_taxonomy_operational_edge_boundary.catalog_id,
    MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id,
  );
  assert.equal(operationalEdge.no_write_attestation.builds_failure_taxonomy_operational_edge_boundary, true);

  const hermes = createMasterDataCp172HermesEvidencePacket(cp172PlanPack);
  const claude = createMasterDataCp172ClaudeReviewPacket(cp172PlanPack);
  const handoff = createMasterDataCp172CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-172.master_data_failure_taxonomy_operational_edge_boundary");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.failure_taxonomy_operational_edge_boundary_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-172.master_data_failure_taxonomy_operational_edge_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-173");
  assert.equal(handoff.next_subphase_id, "RP04.P07.M06.S17");
});

test("CP00-173 binds RP04 master data failure evidence review handoff bridge pack", () => {
  assert.equal(MASTER_DATA_CP173_PACK_BINDING.pack_id, "CP00-173");
  assert.equal(MASTER_DATA_CP173_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP173_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP173_PACK_BINDING.range, "RP04.P07.M06.S17-RP04.P08.M05.S13");
  assert.equal(MASTER_DATA_CP173_PACK_BINDING.upstream_pack_id, "CP00-172");
  assert.equal(MASTER_DATA_CP173_PACK_BINDING.next_pack_id, "CP00-174");
  assert.equal(MASTER_DATA_CP173_PACK_BINDING.next_subphase_id, "RP04.P08.M05.S14");
  assert.equal(
    MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.source_operational_edge_boundary_catalog_id,
    MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id,
  );
  assert.equal(MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.unit_scope_summary.planned_unit_count, 150);
  assert.equal(MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.unit_scope_summary.phase_distribution["RP04.P07"], 77);
  assert.equal(MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.unit_scope_summary.phase_distribution["RP04.P08"], 73);
  assert.equal(MASTER_DATA_CP173_NO_WRITE_ATTESTATION.builds_failure_evidence_review_handoff_bridge, true);
  assert.equal(MASTER_DATA_CP173_NO_WRITE_ATTESTATION.executes_hermes_command, false);
  assert.equal(MASTER_DATA_CP173_NO_WRITE_ATTESTATION.executes_claude_review, false);
  assert.equal(MASTER_DATA_CP173_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP173_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-173 bridge descriptors keep evidence review and handoff sections descriptor-only", () => {
  const hermesSection = createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor({
    section_key: "hermes_evidence_packet",
  });
  assert.equal(hermesSection.pack_id, "CP00-173");
  assert.equal(hermesSection.bridge_section.emits_hermes_evidence, false);
  assert.equal(hermesSection.bridge_section.executes_hermes_command, false);
  assert.equal(hermesSection.internal_bridge_evidence.exposes_hermes_command_payload, false);
  assert.equal(hermesSection.customer_surface_excludes_internal_refs, true);
  assert.equal(hermesSection.prohibited_output_absent, true);
  assert.equal(Object.hasOwn(hermesSection.customer_facing_bridge_summary, "hermes_command_payload"), false);

  const claudeSection = createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor({
    section_key: "claude_review_packet",
  });
  assert.equal(claudeSection.bridge_section.read_only, true);
  assert.equal(claudeSection.bridge_section.sends_claude_prompt, false);
  assert.equal(claudeSection.bridge_section.executes_claude_review, false);
  assert.equal(claudeSection.internal_bridge_evidence.exposes_claude_prompt_payload, false);

  const permissionAuditEntry = createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor({
    section_key: "rp08_permission_audit_entry_boundary",
  });
  assert.equal(permissionAuditEntry.bridge_section.next_sensitive_pack_id, "CP00-174");
  assert.equal(permissionAuditEntry.bridge_section.evaluates_runtime_permission, false);
  assert.equal(permissionAuditEntry.bridge_section.appends_audit_event, false);
  assert.equal(permissionAuditEntry.internal_bridge_evidence.exposes_permission_rule, false);
  assert.equal(permissionAuditEntry.internal_bridge_evidence.exposes_audit_payload, false);

  const catalog = createMasterDataFailureEvidenceReviewHandoffBridgeCatalog();
  assert.equal(catalog.all_bridge_sections_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.hermes_packet_descriptor_only, true);
  assert.equal(catalog.claude_packet_descriptor_only, true);
  assert.equal(catalog.permission_audit_entry_deferred_to_cp174, true);
  assert.equal(catalog.rp08_workflow_receipts_descriptor_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-173 coverage, bridge validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp173Coverage(cp173PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.test, 10);
  assert.equal(coverage.summary.by_deliverable.security_audit, 8);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 56);
  assert.equal(coverage.summary.by_deliverable.failure_recovery, 46);
  assert.equal(coverage.summary.by_deliverable.implementation, 23);
  assert.equal(coverage.summary.by_deliverable.fixture, 3);
  assert.equal(coverage.summary.by_deliverable.claude_review, 4);
  assert.equal(coverage.summary.by_phase["RP04.P07"], 77);
  assert.equal(coverage.summary.by_phase["RP04.P08"], 73);
  assert.equal(coverage.summary.by_micro_phase["RP04.P08.M05"], 13);

  const bridge = validateMasterDataCp173FailureEvidenceReviewHandoffBridge(masterDataContract);
  assert.equal(bridge.valid, true);
  assert.equal(
    bridge.failure_evidence_review_handoff_bridge.catalog_id,
    MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
  );
  assert.equal(bridge.no_write_attestation.builds_failure_evidence_review_handoff_bridge, true);

  const hermes = createMasterDataCp173HermesEvidencePacket(cp173PlanPack);
  const claude = createMasterDataCp173ClaudeReviewPacket(cp173PlanPack);
  const handoff = createMasterDataCp173CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-173.master_data_failure_evidence_review_handoff_bridge");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.failure_evidence_review_handoff_bridge_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-173.master_data_failure_evidence_review_handoff_bridge");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-174");
  assert.equal(handoff.next_subphase_id, "RP04.P08.M05.S14");
});

test("CP00-174 binds RP04 master data permission audit sensitive tail boundary pack", () => {
  assert.equal(MASTER_DATA_CP174_PACK_BINDING.pack_id, "CP00-174");
  assert.equal(MASTER_DATA_CP174_PACK_BINDING.risk_class, "A");
  assert.equal(MASTER_DATA_CP174_PACK_BINDING.unit_count, 10);
  assert.equal(MASTER_DATA_CP174_PACK_BINDING.range, "RP04.P08.M05.S14-RP04.P08.M06.S03");
  assert.equal(MASTER_DATA_CP174_PACK_BINDING.upstream_pack_id, "CP00-173");
  assert.equal(MASTER_DATA_CP174_PACK_BINDING.next_pack_id, "CP00-175");
  assert.equal(MASTER_DATA_CP174_PACK_BINDING.next_subphase_id, "RP04.P08.M06.S04");
  assert.equal(
    MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_failure_evidence_review_handoff_bridge_catalog_id,
    MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
  );
  assert.equal(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.source_permission_audit_binding_id, MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id);
  assert.equal(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.unit_scope_summary.planned_unit_count, 10);
  assert.equal(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.unit_scope_summary.micro_phase_distribution["RP04.P08.M05"], 7);
  assert.equal(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.unit_scope_summary.micro_phase_distribution["RP04.P08.M06"], 3);
  assert.equal(MASTER_DATA_CP174_NO_WRITE_ATTESTATION.builds_permission_audit_sensitive_tail_boundary, true);
  assert.equal(MASTER_DATA_CP174_NO_WRITE_ATTESTATION.executes_hermes_command, false);
  assert.equal(MASTER_DATA_CP174_NO_WRITE_ATTESTATION.executes_claude_review, false);
  assert.equal(MASTER_DATA_CP174_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
  assert.equal(MASTER_DATA_CP174_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-174 sensitive tail descriptors keep block semantics and evidence fields customer-safe", () => {
  const blockSemantics = createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor({
    section_key: "block_semantics",
  });
  assert.equal(blockSemantics.pack_id, "CP00-174");
  assert.equal(blockSemantics.boundary_section.verdict, "BLOCK");
  assert.equal(blockSemantics.boundary_section.evaluates_runtime_permission, false);
  assert.equal(blockSemantics.boundary_section.appends_audit_event, false);
  assert.equal(blockSemantics.internal_boundary_evidence.exposes_permission_rule, false);
  assert.equal(blockSemantics.internal_boundary_evidence.exposes_audit_payload, false);
  assert.equal(blockSemantics.customer_surface_excludes_internal_refs, true);
  assert.equal(blockSemantics.prohibited_output_absent, true);

  const evidenceFieldList = createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor({
    section_key: "evidence_field_list",
  });
  assert.equal(evidenceFieldList.boundary_section.exposes_internal_only_fields, false);
  assert.equal(evidenceFieldList.internal_boundary_evidence.exposes_runtime_permission_result, false);
  assert.equal(evidenceFieldList.internal_boundary_evidence.exposes_hermes_command_payload, false);

  const changedFileReceipt = createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor({
    section_key: "changed_file_receipt",
  });
  assert.equal(changedFileReceipt.boundary_section.records_diff_summary_only, true);
  assert.equal(changedFileReceipt.boundary_section.embeds_diff_content, false);
  assert.equal(changedFileReceipt.boundary_section.embeds_secret_or_real_data, false);

  const catalog = createMasterDataPermissionAuditSensitiveTailBoundaryCatalog();
  assert.equal(catalog.all_boundary_sections_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.block_semantics_descriptor_only, true);
  assert.equal(catalog.hermes_command_matrix_descriptor_only, true);
  assert.equal(catalog.evidence_field_list_customer_safe, true);
  assert.equal(catalog.changed_file_receipt_summary_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-174 coverage, sensitive tail validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp174Coverage(cp174PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 10);
  assert.equal(coverage.summary.by_deliverable.implementation, 5);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 4);
  assert.equal(coverage.summary.by_deliverable.test, 1);
  assert.equal(coverage.summary.by_phase["RP04.P08"], 10);
  assert.equal(coverage.summary.by_micro_phase["RP04.P08.M05"], 7);
  assert.equal(coverage.summary.by_micro_phase["RP04.P08.M06"], 3);

  const boundary = validateMasterDataCp174PermissionAuditSensitiveTailBoundary(masterDataContract);
  assert.equal(boundary.valid, true);
  assert.equal(
    boundary.permission_audit_sensitive_tail_boundary.catalog_id,
    MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
  );
  assert.equal(boundary.no_write_attestation.builds_permission_audit_sensitive_tail_boundary, true);

  const hermes = createMasterDataCp174HermesEvidencePacket(cp174PlanPack);
  const claude = createMasterDataCp174ClaudeReviewPacket(cp174PlanPack);
  const handoff = createMasterDataCp174CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-174.master_data_permission_audit_sensitive_tail_boundary");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.permission_audit_sensitive_tail_boundary_valid, true);
  assert.equal(claude.review_packet, "C04.CP00-174.master_data_permission_audit_sensitive_tail_boundary");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-175");
  assert.equal(handoff.next_subphase_id, "RP04.P08.M06.S04");
});

test("CP00-175 binds RP04 master data evidence review UI readiness bridge pack", () => {
  assert.equal(MASTER_DATA_CP175_PACK_BINDING.pack_id, "CP00-175");
  assert.equal(MASTER_DATA_CP175_PACK_BINDING.risk_class, "C");
  assert.equal(MASTER_DATA_CP175_PACK_BINDING.unit_count, 150);
  assert.equal(MASTER_DATA_CP175_PACK_BINDING.range, "RP04.P08.M06.S04-RP04.P09.M07.S06");
  assert.equal(MASTER_DATA_CP175_PACK_BINDING.upstream_pack_id, "CP00-174");
  assert.equal(MASTER_DATA_CP175_PACK_BINDING.next_pack_id, "CP00-176");
  assert.equal(MASTER_DATA_CP175_PACK_BINDING.next_subphase_id, "RP04.P09.M07.S07");
  assert.equal(
    MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_sensitive_tail_boundary_catalog_id,
    MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
  );
  assert.equal(
    MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_failure_evidence_review_handoff_bridge_catalog_id,
    MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
  );
  assert.equal(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.source_permission_audit_binding_id, MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id);
  assert.equal(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.unit_scope_summary.planned_unit_count, 150);
  assert.equal(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.unit_scope_summary.phase_distribution["RP04.P08"], 69);
  assert.equal(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.unit_scope_summary.phase_distribution["RP04.P09"], 81);
  assert.equal(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.unit_scope_summary.deliverable_distribution.hermes_evidence, 39);
  assert.equal(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.unit_scope_summary.deliverable_distribution.claude_review, 21);
  assert.equal(MASTER_DATA_CP175_NO_WRITE_ATTESTATION.builds_evidence_review_ui_readiness_bridge, true);
  assert.equal(MASTER_DATA_CP175_NO_WRITE_ATTESTATION.executes_hermes_command, false);
  assert.equal(MASTER_DATA_CP175_NO_WRITE_ATTESTATION.executes_claude_review, false);
  assert.equal(MASTER_DATA_CP175_NO_WRITE_ATTESTATION.renders_ui, false);
  assert.equal(MASTER_DATA_CP175_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-175 evidence review UI readiness descriptors stay customer-safe and descriptor-only", () => {
  const hermesPacket = createMasterDataEvidenceReviewUiReadinessBridgeDescriptor({
    section_key: "rp08_hermes_evidence_packet",
  });
  assert.equal(hermesPacket.pack_id, "CP00-175");
  assert.equal(hermesPacket.bridge_section.evidence_packet, "H04.CP00-175.master_data_evidence_review_ui_readiness_bridge");
  assert.equal(hermesPacket.bridge_section.executes_hermes_command, false);
  assert.equal(hermesPacket.bridge_section.emits_hermes_evidence, false);
  assert.equal(hermesPacket.internal_readiness_evidence.exposes_hermes_command_payload, false);
  assert.equal(hermesPacket.customer_surface_excludes_internal_refs, true);
  assert.equal(hermesPacket.prohibited_output_absent, true);

  const claudePacket = createMasterDataEvidenceReviewUiReadinessBridgeDescriptor({
    section_key: "rp08_review_closeout_tail",
  });
  assert.equal(claudePacket.bridge_section.sends_claude_prompt, false);
  assert.equal(claudePacket.bridge_section.executes_claude_review, false);
  assert.equal(claudePacket.internal_readiness_evidence.exposes_claude_prompt_payload, false);

  const uiLeakQuestions = createMasterDataEvidenceReviewUiReadinessBridgeDescriptor({
    section_key: "rp09_fixture_review_questions",
  });
  assert.equal(uiLeakQuestions.bridge_section.includes_ui_leak_questions, true);
  assert.equal(uiLeakQuestions.bridge_section.renders_ui, false);
  assert.equal(uiLeakQuestions.bridge_section.exposes_ui_leak_payload, false);
  assert.equal(uiLeakQuestions.internal_readiness_evidence.exposes_ui_leak_payload, false);

  const catalog = createMasterDataEvidenceReviewUiReadinessBridgeCatalog();
  assert.equal(catalog.section_unit_total, 150);
  assert.equal(catalog.all_bridge_sections_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.hermes_packet_descriptor_only, true);
  assert.equal(catalog.claude_packet_descriptor_only, true);
  assert.equal(catalog.permission_audit_binding_descriptor_only, true);
  assert.equal(catalog.ui_leak_questions_descriptor_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-175 coverage, bridge validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp175Coverage(cp175PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 150);
  assert.equal(coverage.summary.by_deliverable.hermes_evidence, 39);
  assert.equal(coverage.summary.by_deliverable.claude_review, 21);
  assert.equal(coverage.summary.by_deliverable.implementation, 59);
  assert.equal(coverage.summary.by_deliverable.test, 9);
  assert.equal(coverage.summary.by_deliverable.security_audit, 16);
  assert.equal(coverage.summary.by_deliverable.ui, 6);
  assert.equal(coverage.summary.by_phase["RP04.P08"], 69);
  assert.equal(coverage.summary.by_phase["RP04.P09"], 81);
  assert.equal(coverage.summary.section_unit_total, 150);

  const bridge = validateMasterDataCp175EvidenceReviewUiReadinessBridge(masterDataContract);
  assert.equal(bridge.valid, true);
  assert.equal(
    bridge.evidence_review_ui_readiness_bridge.catalog_id,
    MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id,
  );
  assert.equal(bridge.no_write_attestation.builds_evidence_review_ui_readiness_bridge, true);

  const hermes = createMasterDataCp175HermesEvidencePacket(cp175PlanPack);
  const claude = createMasterDataCp175ClaudeReviewPacket(cp175PlanPack);
  const handoff = createMasterDataCp175CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-175.master_data_evidence_review_ui_readiness_bridge");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.evidence_review_ui_readiness_bridge_valid, true);
  assert.equal(hermes.section_unit_total, 150);
  assert.equal(claude.review_packet, "C04.CP00-175.master_data_evidence_review_ui_readiness_bridge");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-176");
  assert.equal(handoff.next_subphase_id, "RP04.P09.M07.S07");
});

test("CP00-176 binds RP04 master data terminal review closeout readiness pack", () => {
  assert.equal(MASTER_DATA_CP176_PACK_BINDING.pack_id, "CP00-176");
  assert.equal(MASTER_DATA_CP176_PACK_BINDING.risk_class, "B");
  assert.equal(MASTER_DATA_CP176_PACK_BINDING.unit_count, 34);
  assert.equal(MASTER_DATA_CP176_PACK_BINDING.range, "RP04.P09.M07.S07-RP04.P09.M10.S04");
  assert.equal(MASTER_DATA_CP176_PACK_BINDING.upstream_pack_id, "CP00-175");
  assert.equal(MASTER_DATA_CP176_PACK_BINDING.next_pack_id, "CP00-177");
  assert.equal(MASTER_DATA_CP176_PACK_BINDING.next_subphase_id, "RP05.P00.M00.S01");
  assert.equal(
    MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_evidence_review_ui_readiness_bridge_catalog_id,
    MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id,
  );
  assert.equal(
    MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_sensitive_tail_boundary_catalog_id,
    MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
  );
  assert.equal(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.source_permission_audit_binding_id, MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id);
  assert.equal(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.unit_scope_summary.planned_unit_count, 34);
  assert.equal(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.unit_scope_summary.phase_distribution["RP04.P09"], 34);
  assert.equal(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.unit_scope_summary.deliverable_distribution.implementation, 17);
  assert.equal(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.unit_scope_summary.deliverable_distribution.claude_review, 7);
  assert.equal(MASTER_DATA_CP176_NO_WRITE_ATTESTATION.builds_terminal_review_closeout_readiness, true);
  assert.equal(MASTER_DATA_CP176_NO_WRITE_ATTESTATION.executes_hermes_command, false);
  assert.equal(MASTER_DATA_CP176_NO_WRITE_ATTESTATION.executes_claude_review, false);
  assert.equal(MASTER_DATA_CP176_NO_WRITE_ATTESTATION.renders_ui, false);
  assert.equal(MASTER_DATA_CP176_NO_WRITE_ATTESTATION.appends_audit_event, false);
});

test("CP00-176 terminal review closeout descriptors keep RP04 handoff customer-safe and descriptor-only", () => {
  const terminalTail = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
    section_key: "rp09_test_golden_closeout_tail",
  });
  assert.equal(terminalTail.pack_id, "CP00-176");
  assert.equal(terminalTail.terminal_section.includes_go_no_go_verdict_format, true);
  assert.equal(terminalTail.terminal_section.includes_finding_routing_map, true);
  assert.equal(terminalTail.terminal_section.sends_claude_prompt, false);
  assert.equal(terminalTail.terminal_section.writes_case_note, false);
  assert.equal(terminalTail.internal_terminal_evidence.exposes_finding_route_payload, false);
  assert.equal(terminalTail.customer_surface_excludes_internal_refs, true);
  assert.equal(terminalTail.prohibited_output_absent, true);

  const hermesQuestions = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
    section_key: "rp09_hermes_review_questions",
  });
  assert.equal(hermesQuestions.terminal_section.evidence_packet, "H04.CP00-176.master_data_terminal_review_closeout_readiness");
  assert.equal(hermesQuestions.terminal_section.executes_hermes_command, false);
  assert.equal(hermesQuestions.terminal_section.emits_hermes_evidence, false);
  assert.equal(hermesQuestions.terminal_section.exposes_ui_leak_payload, false);

  const claudeQuestions = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
    section_key: "rp09_claude_review_questions",
  });
  assert.equal(claudeQuestions.terminal_section.review_packet, "C04.CP00-176.master_data_terminal_review_closeout_readiness");
  assert.equal(claudeQuestions.terminal_section.sends_claude_prompt, false);
  assert.equal(claudeQuestions.terminal_section.executes_claude_review, false);

  const handoffQuestions = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
    section_key: "rp09_closeout_handoff_questions",
  });
  assert.equal(handoffQuestions.terminal_section.to_pack_id, "CP00-177");
  assert.equal(handoffQuestions.terminal_section.next_subphase_id, "RP05.P00.M00.S01");
  assert.equal(handoffQuestions.terminal_section.next_program_id, "RP05");
  assert.equal(handoffQuestions.terminal_section.closes_current_program, true);
  assert.equal(handoffQuestions.terminal_section.evaluates_runtime_permission, false);
  assert.equal(handoffQuestions.terminal_section.appends_audit_event, false);

  const catalog = createMasterDataTerminalReviewCloseoutReadinessCatalog();
  assert.equal(catalog.section_unit_total, 34);
  assert.equal(catalog.all_terminal_sections_declared, true);
  assert.equal(catalog.all_no_write, true);
  assert.equal(catalog.all_customer_surfaces_trimmed, true);
  assert.equal(catalog.all_internal_refs_evidence_only, true);
  assert.equal(catalog.terminal_closeout_descriptor_only, true);
  assert.equal(catalog.hermes_terminal_questions_descriptor_only, true);
  assert.equal(catalog.claude_terminal_questions_descriptor_only, true);
  assert.equal(catalog.rp05_handoff_descriptor_only, true);
  assert.equal(catalog.prohibited_output_absent, true);
});

test("CP00-176 coverage, terminal readiness validation, Hermes packet, Claude packet, and handoff are production-gated", () => {
  const coverage = validateMasterDataCp176Coverage(cp176PlanPack);
  assert.equal(coverage.valid, true);
  assert.equal(coverage.summary.unit_count, 34);
  assert.equal(coverage.summary.by_deliverable.implementation, 17);
  assert.equal(coverage.summary.by_deliverable.claude_review, 7);
  assert.equal(coverage.summary.by_deliverable.security_audit, 6);
  assert.equal(coverage.summary.by_deliverable.test, 2);
  assert.equal(coverage.summary.by_deliverable.ui, 2);
  assert.equal(coverage.summary.by_phase["RP04.P09"], 34);
  assert.equal(coverage.summary.by_micro_phase["RP04.P09.M07"], 14);
  assert.equal(coverage.summary.by_micro_phase["RP04.P09.M08"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP04.P09.M09"], 8);
  assert.equal(coverage.summary.by_micro_phase["RP04.P09.M10"], 4);
  assert.equal(coverage.summary.section_unit_total, 34);
  assert.equal(coverage.summary.section_unit_ids.length, 34);
  assert.equal(coverage.summary.section_unit_ids_match_plan, true);
  assert.deepEqual(coverage.summary.section_unit_ids_missing_from_plan, []);
  assert.deepEqual(coverage.summary.plan_unit_ids_missing_from_sections, []);

  const readiness = validateMasterDataCp176TerminalReviewCloseoutReadiness(masterDataContract);
  assert.equal(readiness.valid, true);
  assert.equal(
    readiness.terminal_review_closeout_readiness.catalog_id,
    MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.catalog_id,
  );
  assert.equal(readiness.no_write_attestation.builds_terminal_review_closeout_readiness, true);

  const hermes = createMasterDataCp176HermesEvidencePacket(cp176PlanPack);
  const claude = createMasterDataCp176ClaudeReviewPacket(cp176PlanPack);
  const handoff = createMasterDataCp176CloseoutHandoff();
  assert.equal(hermes.evidence_packet, "H04.CP00-176.master_data_terminal_review_closeout_readiness");
  assert.equal(hermes.coverage_valid, true);
  assert.equal(hermes.terminal_review_closeout_readiness_valid, true);
  assert.equal(hermes.section_unit_total, 34);
  assert.equal(claude.review_packet, "C04.CP00-176.master_data_terminal_review_closeout_readiness");
  assert.equal(claude.read_only, true);
  assert.equal(handoff.to_pack_id, "CP00-177");
  assert.equal(handoff.next_subphase_id, "RP05.P00.M00.S01");
});
