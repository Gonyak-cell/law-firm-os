#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT,
  PERMISSION_KERNEL_CP108_PACK_BINDING,
  PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT,
  PERMISSION_KERNEL_CP109_PACK_BINDING,
  PERMISSION_KERNEL_CP110_PACK_BINDING,
  PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT,
  PERMISSION_KERNEL_CP111_PACK_BINDING,
  PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT,
  PERMISSION_KERNEL_CP112_PACK_BINDING,
  PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT,
  PERMISSION_KERNEL_CP113_PACK_BINDING,
  PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT,
  PERMISSION_KERNEL_CP115_PACK_BINDING,
  PERMISSION_KERNEL_CP116_PACK_BINDING,
  PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT,
  PERMISSION_KERNEL_CP117_PACK_BINDING,
  PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT,
  PERMISSION_KERNEL_CP118_PACK_BINDING,
  PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT,
  PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT,
  PERMISSION_KERNEL_CP119_PACK_BINDING,
  PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT,
  PERMISSION_KERNEL_CP120_PACK_BINDING,
  PERMISSION_KERNEL_CP121_PACK_BINDING,
  PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP122_PACK_BINDING,
  PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT,
  PERMISSION_KERNEL_CP123_PACK_BINDING,
  PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP124_PACK_BINDING,
  PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT,
  PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP125_PACK_BINDING,
  PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT,
  PERMISSION_KERNEL_CP126_PACK_BINDING,
  PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP127_PACK_BINDING,
  PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT,
  PERMISSION_KERNEL_CP128_PACK_BINDING,
  PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT,
  PERMISSION_KERNEL_CP129_PACK_BINDING,
  PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP130_PACK_BINDING,
  PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP131_PACK_BINDING,
  PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT,
  PERMISSION_KERNEL_CP132_PACK_BINDING,
  PERMISSION_KERNEL_CP133_PACK_BINDING,
  PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT,
  PERMISSION_KERNEL_CP134_PACK_BINDING,
  PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT,
  PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT,
  PERMISSION_KERNEL_CP114_PACK_BINDING,
  createPermissionKernelCp108ClaudeReviewPacket,
  createPermissionKernelCp108CloseoutHandoff,
  createPermissionKernelCp108CoveredUnitIds,
  createPermissionKernelCp108FoundationCatalog,
  createPermissionKernelCp108FoundationManifest,
  createPermissionKernelCp108HermesEvidencePacket,
  createPermissionKernelCp109ClaudeReviewPacket,
  createPermissionKernelCp109CloseoutHandoff,
  createPermissionKernelCp109CoveredUnitIds,
  createPermissionKernelCp109HermesEvidencePacket,
  createPermissionKernelCp109ModelServiceCatalog,
  createPermissionKernelCp109ModelServiceManifest,
  createPermissionKernelCp109ServicePrecheck,
  createPermissionKernelCp110ClaudeReviewPacket,
  createPermissionKernelCp110CloseoutHandoff,
  createPermissionKernelCp110CoveredUnitIds,
  createPermissionKernelCp110HermesEvidencePacket,
  createPermissionKernelCp110ServiceWorkflowCatalog,
  createPermissionKernelCp110ServiceWorkflowManifest,
  createPermissionKernelCp111ClaudeReviewPacket,
  createPermissionKernelCp111CloseoutHandoff,
  createPermissionKernelCp111CoveredUnitIds,
  createPermissionKernelCp111HermesEvidencePacket,
  createPermissionKernelCp111SyntheticFixtureBoundaryCatalog,
  createPermissionKernelCp111SyntheticFixtureBoundaryManifest,
  createPermissionKernelCp111SyntheticFixtureBoundaryMatrix,
  createPermissionKernelCp112ApiInterfaceFixture,
  createPermissionKernelCp112ClaudeReviewPacket,
  createPermissionKernelCp112CloseoutHandoff,
  createPermissionKernelCp112CoveredUnitIds,
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
  createPermissionKernelCp113CoveredUnitIds,
  createPermissionKernelCp113HermesEvidencePacket,
  createPermissionKernelCp114ApiSyntheticFixtureMatrix,
  createPermissionKernelCp114ApiSyntheticFixtureSetCatalog,
  createPermissionKernelCp114ApiSyntheticFixtureSetManifest,
  createPermissionKernelCp114ApiSyntheticFixtureSurface,
  createPermissionKernelCp114ClaudeReviewPacket,
  createPermissionKernelCp114CloseoutHandoff,
  createPermissionKernelCp114CoveredUnitIds,
  createPermissionKernelCp114HermesEvidencePacket,
  createPermissionKernelCp115ApiFixtureUiReadinessCatalog,
  createPermissionKernelCp115ApiFixtureUiReadinessManifest,
  createPermissionKernelCp115ApiFixtureUiReadinessMatrix,
  createPermissionKernelCp115ClaudeReviewPacket,
  createPermissionKernelCp115CloseoutHandoff,
  createPermissionKernelCp115CoveredUnitIds,
  createPermissionKernelCp115HermesEvidencePacket,
  createPermissionKernelCp116ClaudeReviewPacket,
  createPermissionKernelCp116CloseoutHandoff,
  createPermissionKernelCp116CoveredUnitIds,
  createPermissionKernelCp116HermesEvidencePacket,
  createPermissionKernelCp116UiPermissionAuditBindingCatalog,
  createPermissionKernelCp116UiPermissionAuditBindingManifest,
  createPermissionKernelCp116UiPermissionAuditBindingMatrix,
  createPermissionKernelCp116UiPermissionAuditBindingSurface,
  createPermissionKernelCp117ClaudeReviewPacket,
  createPermissionKernelCp117CloseoutHandoff,
  createPermissionKernelCp117CoveredUnitIds,
  createPermissionKernelCp117HermesEvidencePacket,
  createPermissionKernelCp117UiEvidenceStateSnapshotCatalog,
  createPermissionKernelCp117UiEvidenceStateSnapshotManifest,
  createPermissionKernelCp117UiStateSnapshot,
  createPermissionKernelCp117UiStateSnapshotMatrix,
  createPermissionKernelCp118ClaudeReviewPacket,
  createPermissionKernelCp118CloseoutHandoff,
  createPermissionKernelCp118CoveredUnitIds,
  createPermissionKernelCp118HermesEvidencePacket,
  createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog,
  createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest,
  createPermissionKernelCp118UiSyntheticFixtureMatrix,
  createPermissionKernelCp119ClaudeReviewPacket,
  createPermissionKernelCp119CloseoutHandoff,
  createPermissionKernelCp119CoveredUnitIds,
  createPermissionKernelCp119FixtureWorkflowBindingCatalog,
  createPermissionKernelCp119FixtureWorkflowBindingManifest,
  createPermissionKernelCp119FixtureWorkflowMatrix,
  createPermissionKernelCp119HermesEvidencePacket,
  createPermissionKernelCp120ClaudeReviewPacket,
  createPermissionKernelCp120CloseoutHandoff,
  createPermissionKernelCp120CoveredUnitIds,
  createPermissionKernelCp120FixtureEvidencePermissionMatrix,
  createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog,
  createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest,
  createPermissionKernelCp120HermesEvidencePacket,
  createPermissionKernelCp121ClaudeReviewPacket,
  createPermissionKernelCp121CloseoutHandoff,
  createPermissionKernelCp121CoveredUnitIds,
  createPermissionKernelCp121HermesEvidencePacket,
  createPermissionKernelCp121PermissionMatrixRiskBoundary,
  createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog,
  createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest,
  createPermissionKernelCp122ClaudeReviewPacket,
  createPermissionKernelCp122CloseoutHandoff,
  createPermissionKernelCp122CoveredUnitIds,
  createPermissionKernelCp122HermesEvidencePacket,
  createPermissionKernelCp122PermissionMatrixWorkflowBinding,
  createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog,
  createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest,
  createPermissionKernelCp123ClaudeReviewPacket,
  createPermissionKernelCp123CloseoutHandoff,
  createPermissionKernelCp123CoveredUnitIds,
  createPermissionKernelCp123HermesEvidencePacket,
  createPermissionKernelCp123PermissionAuditTerminalBoundary,
  createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog,
  createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest,
  createPermissionKernelCp124ClaudeReviewPacket,
  createPermissionKernelCp124CloseoutHandoff,
  createPermissionKernelCp124CoveredUnitIds,
  createPermissionKernelCp124HermesEvidencePacket,
  createPermissionKernelCp124PermissionFixtureFailureTaxonomy,
  createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog,
  createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest,
  createPermissionKernelCp125ClaudeReviewPacket,
  createPermissionKernelCp125CloseoutHandoff,
  createPermissionKernelCp125CoveredUnitIds,
  createPermissionKernelCp125FailureTaxonomyRiskBoundary,
  createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog,
  createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest,
  createPermissionKernelCp125HermesEvidencePacket,
  createPermissionKernelCp126ClaudeReviewPacket,
  createPermissionKernelCp126CloseoutHandoff,
  createPermissionKernelCp126CoveredUnitIds,
  createPermissionKernelCp126FailureTaxonomyWorkflowBinding,
  createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog,
  createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest,
  createPermissionKernelCp126HermesEvidencePacket,
  createPermissionKernelCp127ClaudeReviewPacket,
  createPermissionKernelCp127CloseoutHandoff,
  createPermissionKernelCp127CoveredUnitIds,
  createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary,
  createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog,
  createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest,
  createPermissionKernelCp127HermesEvidencePacket,
  createPermissionKernelCp128ClaudeReviewPacket,
  createPermissionKernelCp128CloseoutHandoff,
  createPermissionKernelCp128CoveredUnitIds,
  createPermissionKernelCp128FailureTaxonomyEvidenceHarness,
  createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog,
  createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest,
  createPermissionKernelCp128HermesEvidencePacket,
  createPermissionKernelCp129ClaudeReviewPacket,
  createPermissionKernelCp129CloseoutHandoff,
  createPermissionKernelCp129CoveredUnitIds,
  createPermissionKernelCp129HermesEvidencePacket,
  createPermissionKernelCp129HermesEvidenceWorkflowBinding,
  createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog,
  createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest,
  createPermissionKernelCp130ClaudeReviewPacket,
  createPermissionKernelCp130CloseoutHandoff,
  createPermissionKernelCp130CoveredUnitIds,
  createPermissionKernelCp130HermesEvidencePacket,
  createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary,
  createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog,
  createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest,
  createPermissionKernelCp131ClaudeReviewPacket,
  createPermissionKernelCp131CloseoutHandoff,
  createPermissionKernelCp131CoveredUnitIds,
  createPermissionKernelCp131HermesEvidencePacket,
  createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundary,
  createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCatalog,
  createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryManifest,
  createPermissionKernelCp132ClaudeReviewPacket,
  createPermissionKernelCp132CloseoutHandoff,
  createPermissionKernelCp132CoveredUnitIds,
  createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog,
  createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix,
  createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest,
  createPermissionKernelCp132HermesEvidencePacket,
  createPermissionKernelCp133ClaudeReviewPacket,
  createPermissionKernelCp133CloseoutHandoff,
  createPermissionKernelCp133CoveredUnitIds,
  createPermissionKernelCp133HermesEvidencePacket,
  createPermissionKernelCp133TerminalReviewQuestionBoundary,
  createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog,
  createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest,
  createPermissionKernelCp134ClaudeReviewPacket,
  createPermissionKernelCp134CloseoutHandoff,
  createPermissionKernelCp134CoveredUnitIds,
  createPermissionKernelCp134HermesEvidencePacket,
  createPermissionKernelCp134TerminalReviewCloseoutReadiness,
  createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog,
  createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest,
  executePermissionKernelCp110Workflow,
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
} from "../packages/authz/src/index.js";

const errors = [];

function requireEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label} must be ${expected}, got ${actual}`);
}

function requireTrue(value, label) {
  if (value !== true) errors.push(`${label} must be true`);
}

function requireFalse(value, label) {
  if (value !== false) errors.push(`${label} must be false`);
}

function requireIncludes(values, expected, label) {
  if (!values.includes(expected)) errors.push(`${label} must include ${expected}`);
}

const contract = JSON.parse(await readFile("contracts/permission-kernel-contract.json", "utf8"));
const closeoutPlan = JSON.parse(await readFile("docs/closeout-pack-plan/closeout-pack-plan.json", "utf8"));
async function readJsonIfExists(relativePath) {
  try {
    return JSON.parse(await readFile(relativePath, "utf8"));
  } catch {
    return null;
  }
}
const cp108CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-108/manifest.json");
const cp109CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-109/manifest.json");
const cp110CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-110/manifest.json");
const cp111CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-111/manifest.json");
const cp112CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-112/manifest.json");
const cp113CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-113/manifest.json");
const cp114CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-114/manifest.json");
const cp115CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-115/manifest.json");
const cp116CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-116/manifest.json");
const cp117CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-117/manifest.json");
const cp118CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-118/manifest.json");
const cp119CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-119/manifest.json");
const cp120CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-120/manifest.json");
const cp121CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-121/manifest.json");
const cp122CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-122/manifest.json");
const cp123CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-123/manifest.json");
const cp124CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-124/manifest.json");
const cp125CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-125/manifest.json");
const cp126CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-126/manifest.json");
const cp127CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-127/manifest.json");
const cp128CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-128/manifest.json");
const cp129CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-129/manifest.json");
const cp130CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-130/manifest.json");
const cp131CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-131/manifest.json");
const cp132CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-132/manifest.json");
const cp133CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-133/manifest.json");
const cp134CloseoutManifest = await readJsonIfExists("docs/closeout-packs/cp00-134/manifest.json");
const catalog = createPermissionKernelCp108FoundationCatalog();
const manifest = createPermissionKernelCp108FoundationManifest();
const hermesPacket = createPermissionKernelCp108HermesEvidencePacket();
const claudePacket = createPermissionKernelCp108ClaudeReviewPacket();
const handoff = createPermissionKernelCp108CloseoutHandoff();
const coverage = validatePermissionKernelCp108Coverage();
const cp109Catalog = createPermissionKernelCp109ModelServiceCatalog();
const cp109Manifest = createPermissionKernelCp109ModelServiceManifest();
const cp109HermesPacket = createPermissionKernelCp109HermesEvidencePacket();
const cp109ClaudePacket = createPermissionKernelCp109ClaudeReviewPacket();
const cp109Handoff = createPermissionKernelCp109CloseoutHandoff();
const cp109Coverage = validatePermissionKernelCp109Coverage();
const cp110Catalog = createPermissionKernelCp110ServiceWorkflowCatalog();
const cp110Manifest = createPermissionKernelCp110ServiceWorkflowManifest();
const cp110HermesPacket = createPermissionKernelCp110HermesEvidencePacket();
const cp110ClaudePacket = createPermissionKernelCp110ClaudeReviewPacket();
const cp110Handoff = createPermissionKernelCp110CloseoutHandoff();
const cp110Coverage = validatePermissionKernelCp110Coverage();
const cp111Catalog = createPermissionKernelCp111SyntheticFixtureBoundaryCatalog();
const cp111Manifest = createPermissionKernelCp111SyntheticFixtureBoundaryManifest();
const cp111Matrix = createPermissionKernelCp111SyntheticFixtureBoundaryMatrix();
const cp111HermesPacket = createPermissionKernelCp111HermesEvidencePacket();
const cp111ClaudePacket = createPermissionKernelCp111ClaudeReviewPacket();
const cp111Handoff = createPermissionKernelCp111CloseoutHandoff();
const cp111Coverage = validatePermissionKernelCp111Coverage();
const cp112Catalog = createPermissionKernelCp112InterfaceCloseoutCatalog();
const cp112Manifest = createPermissionKernelCp112InterfaceCloseoutManifest();
const cp112Matrix = createPermissionKernelCp112TerminalFixtureMatrix();
const cp112HermesPacket = createPermissionKernelCp112HermesEvidencePacket();
const cp112ClaudePacket = createPermissionKernelCp112ClaudeReviewPacket();
const cp112Handoff = createPermissionKernelCp112CloseoutHandoff();
const cp112Coverage = validatePermissionKernelCp112Coverage();
const cp113Catalog = createPermissionKernelCp113ApiPermissionAuditBindingCatalog();
const cp113Manifest = createPermissionKernelCp113ApiPermissionAuditBindingManifest();
const cp113Matrix = createPermissionKernelCp113ApiPermissionAuditBindingFixtureMatrix();
const cp113HermesPacket = createPermissionKernelCp113HermesEvidencePacket();
const cp113ClaudePacket = createPermissionKernelCp113ClaudeReviewPacket();
const cp113Handoff = createPermissionKernelCp113CloseoutHandoff();
const cp113Coverage = validatePermissionKernelCp113Coverage();
const cp114Catalog = createPermissionKernelCp114ApiSyntheticFixtureSetCatalog();
const cp114Manifest = createPermissionKernelCp114ApiSyntheticFixtureSetManifest();
const cp114Matrix = createPermissionKernelCp114ApiSyntheticFixtureMatrix();
const cp114HermesPacket = createPermissionKernelCp114HermesEvidencePacket();
const cp114ClaudePacket = createPermissionKernelCp114ClaudeReviewPacket();
const cp114Handoff = createPermissionKernelCp114CloseoutHandoff();
const cp114Coverage = validatePermissionKernelCp114Coverage();
const cp115Catalog = createPermissionKernelCp115ApiFixtureUiReadinessCatalog();
const cp115Manifest = createPermissionKernelCp115ApiFixtureUiReadinessManifest();
const cp115Matrix = createPermissionKernelCp115ApiFixtureUiReadinessMatrix();
const cp115HermesPacket = createPermissionKernelCp115HermesEvidencePacket();
const cp115ClaudePacket = createPermissionKernelCp115ClaudeReviewPacket();
const cp115Handoff = createPermissionKernelCp115CloseoutHandoff();
const cp115Coverage = validatePermissionKernelCp115Coverage();
const cp116Catalog = createPermissionKernelCp116UiPermissionAuditBindingCatalog();
const cp116Manifest = createPermissionKernelCp116UiPermissionAuditBindingManifest();
const cp116Matrix = createPermissionKernelCp116UiPermissionAuditBindingMatrix();
const cp116HermesPacket = createPermissionKernelCp116HermesEvidencePacket();
const cp116ClaudePacket = createPermissionKernelCp116ClaudeReviewPacket();
const cp116Handoff = createPermissionKernelCp116CloseoutHandoff();
const cp116Coverage = validatePermissionKernelCp116Coverage();
const cp117Catalog = createPermissionKernelCp117UiEvidenceStateSnapshotCatalog();
const cp117Manifest = createPermissionKernelCp117UiEvidenceStateSnapshotManifest();
const cp117Matrix = createPermissionKernelCp117UiStateSnapshotMatrix();
const cp117HermesPacket = createPermissionKernelCp117HermesEvidencePacket();
const cp117ClaudePacket = createPermissionKernelCp117ClaudeReviewPacket();
const cp117Handoff = createPermissionKernelCp117CloseoutHandoff();
const cp117Coverage = validatePermissionKernelCp117Coverage();
const cp118Catalog = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog();
const cp118Manifest = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest();
const cp118Matrix = createPermissionKernelCp118UiSyntheticFixtureMatrix();
const cp118HermesPacket = createPermissionKernelCp118HermesEvidencePacket();
const cp118ClaudePacket = createPermissionKernelCp118ClaudeReviewPacket();
const cp118Handoff = createPermissionKernelCp118CloseoutHandoff();
const cp118Coverage = validatePermissionKernelCp118Coverage();
const cp119Catalog = createPermissionKernelCp119FixtureWorkflowBindingCatalog();
const cp119Manifest = createPermissionKernelCp119FixtureWorkflowBindingManifest();
const cp119Matrix = createPermissionKernelCp119FixtureWorkflowMatrix();
const cp119HermesPacket = createPermissionKernelCp119HermesEvidencePacket();
const cp119ClaudePacket = createPermissionKernelCp119ClaudeReviewPacket();
const cp119Handoff = createPermissionKernelCp119CloseoutHandoff();
const cp119Coverage = validatePermissionKernelCp119Coverage();
const cp120Catalog = createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog();
const cp120Manifest = createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest();
const cp120Matrix = createPermissionKernelCp120FixtureEvidencePermissionMatrix();
const cp120HermesPacket = createPermissionKernelCp120HermesEvidencePacket();
const cp120ClaudePacket = createPermissionKernelCp120ClaudeReviewPacket();
const cp120Handoff = createPermissionKernelCp120CloseoutHandoff();
const cp120Coverage = validatePermissionKernelCp120Coverage();
const cp121Catalog = createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog();
const cp121Manifest = createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest();
const cp121Matrix = createPermissionKernelCp121PermissionMatrixRiskBoundary();
const cp121HermesPacket = createPermissionKernelCp121HermesEvidencePacket();
const cp121ClaudePacket = createPermissionKernelCp121ClaudeReviewPacket();
const cp121Handoff = createPermissionKernelCp121CloseoutHandoff();
const cp121Coverage = validatePermissionKernelCp121Coverage();
const cp122Catalog = createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog();
const cp122Manifest = createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest();
const cp122Matrix = createPermissionKernelCp122PermissionMatrixWorkflowBinding();
const cp122HermesPacket = createPermissionKernelCp122HermesEvidencePacket();
const cp122ClaudePacket = createPermissionKernelCp122ClaudeReviewPacket();
const cp122Handoff = createPermissionKernelCp122CloseoutHandoff();
const cp122Coverage = validatePermissionKernelCp122Coverage();
const cp123Catalog = createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog();
const cp123Manifest = createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest();
const cp123Matrix = createPermissionKernelCp123PermissionAuditTerminalBoundary();
const cp123HermesPacket = createPermissionKernelCp123HermesEvidencePacket();
const cp123ClaudePacket = createPermissionKernelCp123ClaudeReviewPacket();
const cp123Handoff = createPermissionKernelCp123CloseoutHandoff();
const cp123Coverage = validatePermissionKernelCp123Coverage();
const cp124Catalog = createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog();
const cp124Manifest = createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest();
const cp124Matrix = createPermissionKernelCp124PermissionFixtureFailureTaxonomy();
const cp124HermesPacket = createPermissionKernelCp124HermesEvidencePacket();
const cp124ClaudePacket = createPermissionKernelCp124ClaudeReviewPacket();
const cp124Handoff = createPermissionKernelCp124CloseoutHandoff();
const cp124Coverage = validatePermissionKernelCp124Coverage();
const cp125Catalog = createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog();
const cp125Manifest = createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest();
const cp125Matrix = createPermissionKernelCp125FailureTaxonomyRiskBoundary();
const cp125HermesPacket = createPermissionKernelCp125HermesEvidencePacket();
const cp125ClaudePacket = createPermissionKernelCp125ClaudeReviewPacket();
const cp125Handoff = createPermissionKernelCp125CloseoutHandoff();
const cp125Coverage = validatePermissionKernelCp125Coverage();
const cp126Catalog = createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog();
const cp126Manifest = createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest();
const cp126Matrix = createPermissionKernelCp126FailureTaxonomyWorkflowBinding();
const cp126HermesPacket = createPermissionKernelCp126HermesEvidencePacket();
const cp126ClaudePacket = createPermissionKernelCp126ClaudeReviewPacket();
const cp126Handoff = createPermissionKernelCp126CloseoutHandoff();
const cp126Coverage = validatePermissionKernelCp126Coverage();
const cp127Catalog = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog();
const cp127Manifest = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest();
const cp127Matrix = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary();
const cp127HermesPacket = createPermissionKernelCp127HermesEvidencePacket();
const cp127ClaudePacket = createPermissionKernelCp127ClaudeReviewPacket();
const cp127Handoff = createPermissionKernelCp127CloseoutHandoff();
const cp127Coverage = validatePermissionKernelCp127Coverage();
const cp128Catalog = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog();
const cp128Manifest = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest();
const cp128Matrix = createPermissionKernelCp128FailureTaxonomyEvidenceHarness();
const cp128HermesPacket = createPermissionKernelCp128HermesEvidencePacket();
const cp128ClaudePacket = createPermissionKernelCp128ClaudeReviewPacket();
const cp128Handoff = createPermissionKernelCp128CloseoutHandoff();
const cp128Coverage = validatePermissionKernelCp128Coverage();
const cp129Catalog = createPermissionKernelCp129HermesEvidenceWorkflowBindingCatalog();
const cp129Manifest = createPermissionKernelCp129HermesEvidenceWorkflowBindingManifest();
const cp129Matrix = createPermissionKernelCp129HermesEvidenceWorkflowBinding();
const cp129HermesPacket = createPermissionKernelCp129HermesEvidencePacket();
const cp129ClaudePacket = createPermissionKernelCp129ClaudeReviewPacket();
const cp129Handoff = createPermissionKernelCp129CloseoutHandoff();
const cp129Coverage = validatePermissionKernelCp129Coverage();
const cp130Catalog = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCatalog();
const cp130Manifest = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryManifest();
const cp130Matrix = createPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundary();
const cp130HermesPacket = createPermissionKernelCp130HermesEvidencePacket();
const cp130ClaudePacket = createPermissionKernelCp130ClaudeReviewPacket();
const cp130Handoff = createPermissionKernelCp130CloseoutHandoff();
const cp130Coverage = validatePermissionKernelCp130Coverage();
const cp131Catalog = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCatalog();
const cp131Manifest = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryManifest();
const cp131Matrix = createPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundary();
const cp131HermesPacket = createPermissionKernelCp131HermesEvidencePacket();
const cp131ClaudePacket = createPermissionKernelCp131ClaudeReviewPacket();
const cp131Handoff = createPermissionKernelCp131CloseoutHandoff();
const cp131Coverage = validatePermissionKernelCp131Coverage();
const cp132Catalog = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalog();
const cp132Manifest = createPermissionKernelCp132FixtureEvidenceReviewReadinessManifest();
const cp132Matrix = createPermissionKernelCp132FixtureEvidenceReviewReadinessCatalogMatrix();
const cp132HermesPacket = createPermissionKernelCp132HermesEvidencePacket();
const cp132ClaudePacket = createPermissionKernelCp132ClaudeReviewPacket();
const cp132Handoff = createPermissionKernelCp132CloseoutHandoff();
const cp132Coverage = validatePermissionKernelCp132Coverage();
const cp133Catalog = createPermissionKernelCp133TerminalReviewQuestionBoundaryCatalog();
const cp133Manifest = createPermissionKernelCp133TerminalReviewQuestionBoundaryManifest();
const cp133Matrix = createPermissionKernelCp133TerminalReviewQuestionBoundary();
const cp133HermesPacket = createPermissionKernelCp133HermesEvidencePacket();
const cp133ClaudePacket = createPermissionKernelCp133ClaudeReviewPacket();
const cp133Handoff = createPermissionKernelCp133CloseoutHandoff();
const cp133Coverage = validatePermissionKernelCp133Coverage();
const cp134Catalog = createPermissionKernelCp134TerminalReviewCloseoutReadinessCatalog();
const cp134Manifest = createPermissionKernelCp134TerminalReviewCloseoutReadinessManifest();
const cp134Matrix = createPermissionKernelCp134TerminalReviewCloseoutReadiness();
const cp134HermesPacket = createPermissionKernelCp134HermesEvidencePacket();
const cp134ClaudePacket = createPermissionKernelCp134ClaudeReviewPacket();
const cp134Handoff = createPermissionKernelCp134CloseoutHandoff();
const cp134Coverage = validatePermissionKernelCp134Coverage();
const cp109PassPrecheck = createPermissionKernelCp109ServicePrecheck({
  synthetic: true,
  tenant_id: "t_synthetic",
  matter_id: "m_001",
  resource: { tenant_id: "t_synthetic", matter_id: "m_001" },
});
const cp109BlockedPrecheck = createPermissionKernelCp109ServicePrecheck({
  synthetic: true,
  tenant_id: "t_synthetic",
  matter_id: "m_001",
  resource: { tenant_id: "t_other", matter_id: "m_001" },
});
const cp109MatterBlockedPrecheck = createPermissionKernelCp109ServicePrecheck({
  synthetic: true,
  tenant_id: "t_synthetic",
  matter_id: "m_001",
  resource: { tenant_id: "t_synthetic", matter_id: "m_002" },
});
const cp109NonSyntheticBlockedPrecheck = createPermissionKernelCp109ServicePrecheck({
  synthetic: false,
  tenant_id: "t_synthetic",
  matter_id: "m_001",
  resource: { tenant_id: "t_synthetic", matter_id: "m_001" },
});
const cp108PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id) ??
  cp108CloseoutManifest?.plan_binding_snapshot;
const cp109PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id) ??
  cp109CloseoutManifest?.plan_binding_snapshot;
const cp110PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id) ??
  cp110CloseoutManifest?.plan_binding_snapshot;
const cp111PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id) ??
  cp111CloseoutManifest?.plan_binding_snapshot;
const cp112PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id) ??
  cp112CloseoutManifest?.plan_binding_snapshot;
const cp113PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id) ??
  cp113CloseoutManifest?.plan_binding_snapshot;
const cp114PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id) ??
  cp114CloseoutManifest?.plan_binding_snapshot;
const cp115PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id) ??
  cp115CloseoutManifest?.plan_binding_snapshot;
const cp116PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id) ??
  cp116CloseoutManifest?.plan_binding_snapshot;
const cp117PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id) ??
  cp117CloseoutManifest?.plan_binding_snapshot;
const cp118PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id) ??
  cp118CloseoutManifest?.plan_binding_snapshot;
const cp119PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id) ??
  cp119CloseoutManifest?.plan_binding_snapshot;
const cp120PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id) ??
  cp120CloseoutManifest?.plan_binding_snapshot;
const cp121PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id) ??
  cp121CloseoutManifest?.plan_binding_snapshot;
const cp122PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id) ??
  cp122CloseoutManifest?.plan_binding_snapshot;
const cp123PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id) ??
  cp123CloseoutManifest?.plan_binding_snapshot;
const cp124PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id) ??
  cp124CloseoutManifest?.plan_binding_snapshot;
const cp125PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id) ??
  cp125CloseoutManifest?.plan_binding_snapshot;
const cp126PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id) ??
  cp126CloseoutManifest?.plan_binding_snapshot;
const cp127PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id) ??
  cp127CloseoutManifest?.plan_binding_snapshot;
const cp128PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id) ??
  cp128CloseoutManifest?.plan_binding_snapshot;
const cp129PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id) ??
  cp129CloseoutManifest?.plan_binding_snapshot;
const cp130PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id) ??
  cp130CloseoutManifest?.plan_binding_snapshot;
const cp131PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP131_PACK_BINDING.pack_id) ??
  cp131CloseoutManifest?.plan_binding_snapshot;
const cp132PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id) ??
  cp132CloseoutManifest?.plan_binding_snapshot;
const cp133PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id) ??
  cp133CloseoutManifest?.plan_binding_snapshot;
const cp134PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id) ??
  cp134CloseoutManifest?.plan_binding_snapshot;

function requirePlanPackUnitMatch(planPack, unitIds, label, { required = true } = {}) {
  if (!planPack) {
    if (required) errors.push(`${label} must exist in closeout-pack-plan.json`);
    return;
  }
  requireEqual(planPack.unit_count, unitIds.length, `${label} plan unit_count`);
  requireEqual(planPack.range?.first_unit_id, unitIds[0], `${label} plan first_unit_id`);
  requireEqual(planPack.range?.last_unit_id, unitIds.at(-1), `${label} plan last_unit_id`);
  requireEqual(planPack.included_units.map((unit) => unit.id).join(","), unitIds.join(","), `${label} generated unit ids must match plan`);
}

requireEqual(contract.program_id, "RP02", "program_id");
requireEqual(contract.hermes_gate, "H02", "hermes_gate");
requireEqual(contract.claude_gate, "C02", "claude_gate");
requireEqual(contract.current_pack?.pack_id, PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id, "current_pack.pack_id");
requireEqual(contract.current_pack?.unit_count, PERMISSION_KERNEL_CP134_PACK_BINDING.unit_count, "current_pack.unit_count");
requireEqual(contract.current_pack?.risk_class, PERMISSION_KERNEL_CP134_PACK_BINDING.risk_class, "current_pack.risk_class");
requireEqual(contract.current_pack?.range, PERMISSION_KERNEL_CP134_PACK_BINDING.range, "current_pack.range");
requireEqual(
  contract.current_pack?.production_ready_flag,
  "permission_kernel_terminal_review_closeout_readiness_verified",
  "current_pack.production_ready_flag",
);
requireEqual(contract.foundation_pack?.pack_id, PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id, "foundation_pack.pack_id");
requireEqual(contract.foundation_pack?.contract_id, PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT.contract_id, "foundation_pack.contract_id");
requireEqual(contract.foundation_pack?.next_pack_id, "CP00-109", "foundation_pack.next_pack_id");
requireEqual(contract.foundation_pack?.next_subphase_id, "RP02.P01.M06.S01", "foundation_pack.next_subphase_id");
requireTrue(contract.foundation_pack?.catalog_only, "foundation_pack.catalog_only");
requireTrue(contract.foundation_pack?.runtime_evaluator_unchanged, "foundation_pack.runtime_evaluator_unchanged");
requireTrue(contract.foundation_pack?.synthetic_only, "foundation_pack.synthetic_only");

for (const decision of ["allow", "deny", "review_required", "approval_required"]) {
  requireIncludes(contract.required_decisions ?? [], decision, "required_decisions");
}

for (const invariant of [
  "deny_over_allow",
  "cross_tenant_fails_closed",
  "ethical_wall_blocks",
  "object_acl_respected",
  "security_trimming_before_display",
  "permission_decision_can_emit_audit_hint",
]) {
  requireIncludes(contract.invariants ?? [], invariant, "invariants");
}

for (const invariant of PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT.boundary_invariants) {
  requireIncludes(contract.foundation_boundary_invariants ?? [], invariant, "foundation_boundary_invariants");
}

for (const surface of PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT.permission_surfaces) {
  requireIncludes(contract.foundation_permission_surfaces ?? [], surface, "foundation_permission_surfaces");
}

for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source no_write_attestation.${flag}`);
  requireFalse(contract.foundation_no_write_attestation?.[flag], `contract foundation_no_write_attestation.${flag}`);
}

requireEqual(catalog.length, 150, "CP00-108 catalog length");
requireEqual(manifest.covered_unit_count, 150, "CP00-108 manifest covered_unit_count");
requireEqual(manifest.first_unit_id, "RP02.P00.M00.S01", "CP00-108 first_unit_id");
requireEqual(manifest.last_unit_id, "RP02.P01.M05.S20", "CP00-108 last_unit_id");
requireEqual(manifest.phase_counts["RP02.P00"], 71, "CP00-108 RP02.P00 count");
requireEqual(manifest.phase_counts["RP02.P01"], 79, "CP00-108 RP02.P01 count");
requireEqual(manifest.deliverable_counts.contract, 6, "CP00-108 contract deliverable count");
requireEqual(manifest.deliverable_counts.security_audit, 10, "CP00-108 security_audit deliverable count");
requireEqual(manifest.deliverable_counts.test, 9, "CP00-108 test deliverable count");
requireEqual(manifest.deliverable_counts.hermes_evidence, 3, "CP00-108 hermes_evidence deliverable count");
requireEqual(manifest.deliverable_counts.claude_review, 3, "CP00-108 claude_review deliverable count");
requireEqual(hermesPacket.hermes_gate, "H02", "Hermes packet gate");
requireEqual(hermesPacket.covered_unit_count, 150, "Hermes packet covered_unit_count");
requireEqual(claudePacket.model, "claude-opus-4-8", "Claude packet model");
requireEqual(claudePacket.effort, "max", "Claude packet effort");
requireTrue(claudePacket.read_only, "Claude packet read_only");
requireTrue(claudePacket.exactly_one_valid_pack_review_required, "Claude packet exactly_one_valid_pack_review_required");
requireEqual(handoff.next_pack_id, "CP00-109", "handoff.next_pack_id");
requireEqual(handoff.next_subphase_id, "RP02.P01.M06.S01", "handoff.next_subphase_id");
requireTrue(coverage.valid, `CP00-108 coverage valid: ${coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp108PlanPack, createPermissionKernelCp108CoveredUnitIds(), "CP00-108", { required: false });
requireEqual(contract.model_service_pack?.pack_id, PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id, "model_service_pack.pack_id");
requireEqual(contract.model_service_pack?.contract_id, PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.contract_id, "model_service_pack.contract_id");
requireEqual(contract.model_service_pack?.upstream_foundation_pack_id, "CP00-108", "model_service_pack.upstream_foundation_pack_id");
requireEqual(contract.model_service_pack?.next_pack_id, "CP00-110", "model_service_pack.next_pack_id");
requireEqual(contract.model_service_pack?.next_subphase_id, "RP02.P02.M04.S07", "model_service_pack.next_subphase_id");
requireTrue(contract.model_service_pack?.catalog_only, "model_service_pack.catalog_only");
requireTrue(contract.model_service_pack?.metadata_precheck_only, "model_service_pack.metadata_precheck_only");
requireTrue(contract.model_service_pack?.synthetic_only, "model_service_pack.synthetic_only");
for (const entrypoint of PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.service_entrypoints) {
  requireIncludes(contract.model_service_entrypoints ?? [], entrypoint, "model_service_entrypoints");
}
for (const precheck of PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.precheck_order) {
  requireIncludes(contract.model_service_precheck_order ?? [], precheck, "model_service_precheck_order");
}
for (const boundary of PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.failure_boundaries) {
  requireIncludes(contract.model_service_failure_boundaries ?? [], boundary, "model_service_failure_boundaries");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source model_service_no_write_attestation.${flag}`);
  requireFalse(contract.model_service_no_write_attestation?.[flag], `contract model_service_no_write_attestation.${flag}`);
}
requireEqual(cp109Catalog.length, 150, "CP00-109 catalog length");
requireEqual(cp109Manifest.covered_unit_count, 150, "CP00-109 manifest covered_unit_count");
requireEqual(cp109Manifest.first_unit_id, "RP02.P01.M06.S01", "CP00-109 first_unit_id");
requireEqual(cp109Manifest.last_unit_id, "RP02.P02.M04.S06", "CP00-109 last_unit_id");
requireEqual(cp109Manifest.area_counts.permission_model, 71, "CP00-109 model area count");
requireEqual(cp109Manifest.area_counts.permission_service, 79, "CP00-109 service area count");
requireEqual(cp109Manifest.deliverable_counts.implementation, 77, "CP00-109 implementation deliverable count");
requireEqual(cp109Manifest.deliverable_counts.ui, 23, "CP00-109 ui deliverable count");
requireEqual(cp109Manifest.deliverable_counts.contract, 5, "CP00-109 contract deliverable count");
requireEqual(cp109Manifest.deliverable_counts.security_audit, 10, "CP00-109 security_audit deliverable count");
requireEqual(cp109Manifest.deliverable_counts.test, 17, "CP00-109 test deliverable count");
requireEqual(cp109Manifest.deliverable_counts.failure_recovery, 6, "CP00-109 failure_recovery deliverable count");
requireEqual(cp109HermesPacket.hermes_gate, "H02", "CP00-109 Hermes packet gate");
requireEqual(cp109HermesPacket.covered_unit_count, 150, "CP00-109 Hermes packet covered_unit_count");
requireEqual(cp109ClaudePacket.model, "claude-opus-4-8", "CP00-109 Claude packet model");
requireEqual(cp109ClaudePacket.effort, "max", "CP00-109 Claude packet effort");
requireTrue(cp109ClaudePacket.read_only, "CP00-109 Claude packet read_only");
requireTrue(cp109ClaudePacket.exactly_one_valid_pack_review_required, "CP00-109 Claude packet exactly_one_valid_pack_review_required");
requireEqual(cp109PassPrecheck.status, "ready_for_permission_evaluator", "CP00-109 pass precheck status");
requireEqual(cp109BlockedPrecheck.status, "blocked_before_permission_evaluation", "CP00-109 blocked precheck status");
requireEqual(cp109MatterBlockedPrecheck.status, "blocked_before_permission_evaluation", "CP00-109 matter drift precheck status");
requireEqual(cp109MatterBlockedPrecheck.reason, "matter_trace_precheck_failed", "CP00-109 matter drift precheck reason");
requireEqual(cp109NonSyntheticBlockedPrecheck.status, "blocked_before_permission_evaluation", "CP00-109 non-synthetic precheck status");
requireEqual(cp109NonSyntheticBlockedPrecheck.reason, "non_synthetic_request_blocked", "CP00-109 non-synthetic precheck reason");
requireFalse(cp109PassPrecheck.writes_product_state, "CP00-109 pass precheck writes_product_state");
requireFalse(cp109PassPrecheck.writes_audit_event, "CP00-109 pass precheck writes_audit_event");
requireFalse(cp109PassPrecheck.mutates_permission_policy, "CP00-109 pass precheck mutates_permission_policy");
requireEqual(cp109Handoff.next_pack_id, "CP00-110", "CP00-109 handoff.next_pack_id");
requireEqual(cp109Handoff.next_subphase_id, "RP02.P02.M04.S07", "CP00-109 handoff.next_subphase_id");
requireTrue(cp109Coverage.valid, `CP00-109 coverage valid: ${cp109Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp109PlanPack, createPermissionKernelCp109CoveredUnitIds(), "CP00-109");
requireEqual(contract.service_workflow_pack?.pack_id, PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id, "service_workflow_pack.pack_id");
requireEqual(contract.service_workflow_pack?.contract_id, PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.contract_id, "service_workflow_pack.contract_id");
requireEqual(contract.service_workflow_pack?.upstream_model_service_pack_id, "CP00-109", "service_workflow_pack.upstream_model_service_pack_id");
requireEqual(contract.service_workflow_pack?.next_pack_id, "CP00-111", "service_workflow_pack.next_pack_id");
requireEqual(contract.service_workflow_pack?.next_subphase_id, "RP02.P02.M06.S03", "service_workflow_pack.next_subphase_id");
requireTrue(contract.service_workflow_pack?.synthetic_only, "service_workflow_pack.synthetic_only");
requireTrue(contract.service_workflow_pack?.service_workflow_execution, "service_workflow_pack.service_workflow_execution");
requireTrue(
  contract.service_workflow_pack?.permission_evaluator_invoked_on_synthetic_inputs,
  "service_workflow_pack.permission_evaluator_invoked_on_synthetic_inputs",
);
for (const entrypoint of PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.workflow_entrypoints) {
  requireIncludes(contract.service_workflow_entrypoints ?? [], entrypoint, "service_workflow_entrypoints");
}
for (const precheck of PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.precheck_order) {
  requireIncludes(contract.service_workflow_precheck_order ?? [], precheck, "service_workflow_precheck_order");
}
for (const state of PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.workflow_states) {
  requireIncludes(contract.service_workflow_states ?? [], state, "service_workflow_states");
}
for (const receipt of PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.metadata_receipts) {
  requireIncludes(contract.service_workflow_metadata_receipts ?? [], receipt, "service_workflow_metadata_receipts");
}
for (const boundary of PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.failure_boundaries) {
  requireIncludes(contract.service_workflow_failure_boundaries ?? [], boundary, "service_workflow_failure_boundaries");
}
for (const [effect, route] of Object.entries(PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.decision_routes)) {
  requireEqual(contract.service_workflow_decision_routes?.[effect], route, `service_workflow_decision_routes.${effect}`);
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP110_SERVICE_WORKFLOW_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source service_workflow_no_write_attestation.${flag}`);
  requireFalse(contract.service_workflow_no_write_attestation?.[flag], `contract service_workflow_no_write_attestation.${flag}`);
}
requireEqual(cp110Catalog.length, 40, "CP00-110 catalog length");
requireEqual(cp110Manifest.covered_unit_count, 40, "CP00-110 manifest covered_unit_count");
requireEqual(cp110Manifest.first_unit_id, "RP02.P02.M04.S07", "CP00-110 first_unit_id");
requireEqual(cp110Manifest.last_unit_id, "RP02.P02.M06.S02", "CP00-110 last_unit_id");
requireEqual(cp110Manifest.phase_counts["RP02.P02.M04"], 16, "CP00-110 RP02.P02.M04 count");
requireEqual(cp110Manifest.phase_counts["RP02.P02.M05"], 22, "CP00-110 RP02.P02.M05 count");
requireEqual(cp110Manifest.phase_counts["RP02.P02.M06"], 2, "CP00-110 RP02.P02.M06 count");
requireEqual(cp110Manifest.deliverable_counts.contract, 2, "CP00-110 contract deliverable count");
requireEqual(cp110Manifest.deliverable_counts.implementation, 16, "CP00-110 implementation deliverable count");
requireEqual(cp110Manifest.deliverable_counts.security_audit, 2, "CP00-110 security_audit deliverable count");
requireEqual(cp110Manifest.deliverable_counts.ui, 6, "CP00-110 ui deliverable count");
requireEqual(cp110Manifest.deliverable_counts.claude_review, 2, "CP00-110 Claude review deliverable count");
requireEqual(cp110Manifest.deliverable_counts.failure_recovery, 4, "CP00-110 failure recovery deliverable count");
requireEqual(cp110Manifest.deliverable_counts.test, 8, "CP00-110 test deliverable count");
requireEqual(cp110HermesPacket.hermes_gate, "H02", "CP00-110 Hermes packet gate");
requireEqual(cp110HermesPacket.covered_unit_count, 40, "CP00-110 Hermes packet covered_unit_count");
requireEqual(cp110ClaudePacket.model, "claude-opus-4-8", "CP00-110 Claude packet model");
requireEqual(cp110ClaudePacket.effort, "max", "CP00-110 Claude packet effort");
requireTrue(cp110ClaudePacket.read_only, "CP00-110 Claude packet read_only");
requireTrue(cp110ClaudePacket.exactly_one_valid_pack_review_required, "CP00-110 Claude packet exactly_one_valid_pack_review_required");

const cp110AllowWorkflow = executePermissionKernelCp110Workflow({
  synthetic: true,
  principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
  resource: { resource_id: "d_001", resource_type: "Document", tenant_id: "t_synthetic", matter_id: "m_001" },
  matter_id: "m_001",
  action: "document.view",
  rules: [{ id: "allow_doc", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }],
});
const cp110DenyWorkflow = executePermissionKernelCp110Workflow({
  synthetic: true,
  principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
  resource: { resource_id: "d_001", resource_type: "Document", tenant_id: "t_synthetic", matter_id: "m_001" },
  matter_id: "m_001",
  action: "document.view",
  rules: [{ id: "deny_doc", effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view" }],
});
const cp110ReviewWorkflow = executePermissionKernelCp110Workflow({
  synthetic: true,
  principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
  resource: { resource_id: "d_001", resource_type: "Document", tenant_id: "t_synthetic", matter_id: "m_001" },
  matter_id: "m_001",
  action: "document.download",
  rules: [{ id: "review_doc", effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" }],
});
const cp110ApprovalWorkflow = executePermissionKernelCp110Workflow({
  synthetic: true,
  principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
  resource: { resource_id: "d_001", resource_type: "Document", tenant_id: "t_synthetic", matter_id: "m_001" },
  matter_id: "m_001",
  action: "document.delete.request",
  rules: [{ id: "approval_doc", effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.delete.request" }],
});
const cp110BlockedWorkflow = executePermissionKernelCp110Workflow({
  synthetic: true,
  principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
  resource: { resource_id: "d_002", resource_type: "Document", tenant_id: "t_other", matter_id: "m_001" },
  matter_id: "m_001",
  action: "document.view",
});
const cp110NonSyntheticWorkflow = executePermissionKernelCp110Workflow({
  synthetic: false,
  principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
  resource: { resource_id: "d_001", resource_type: "Document", tenant_id: "t_synthetic", matter_id: "m_001" },
  matter_id: "m_001",
  action: "document.view",
});
const cp110MatterMissingWorkflow = executePermissionKernelCp110Workflow({
  synthetic: true,
  principal: { user_id: "u_attorney", tenant_id: "t_synthetic", role_ids: ["attorney"] },
  resource: { resource_id: "d_003", resource_type: "Document", tenant_id: "t_synthetic", matter_id: null },
  matter_id: "m_001",
  action: "document.view",
});

requireEqual(cp110AllowWorkflow.status, "completed_metadata_only", "CP00-110 allow workflow status");
requireEqual(cp110AllowWorkflow.decision.effect, "allow", "CP00-110 allow workflow decision");
requireTrue(cp110AllowWorkflow.evaluator_invoked, "CP00-110 allow workflow evaluator_invoked");
requireFalse(cp110AllowWorkflow.idempotency_receipt.persisted, "CP00-110 allow workflow idempotency persisted");
requireFalse(cp110AllowWorkflow.lock_receipt.acquired, "CP00-110 allow workflow lock acquired");
requireFalse(cp110AllowWorkflow.persistence_boundary.writes_product_state, "CP00-110 allow workflow writes_product_state");
requireFalse(cp110AllowWorkflow.persistence_boundary.writes_audit_event, "CP00-110 allow workflow writes_audit_event");
requireEqual(cp110DenyWorkflow.status, "blocked_claim_output", "CP00-110 deny workflow status");
requireEqual(cp110ReviewWorkflow.status, "review_required_routing", "CP00-110 review workflow status");
requireEqual(cp110ApprovalWorkflow.status, "approval_required_routing", "CP00-110 approval workflow status");
requireEqual(cp110BlockedWorkflow.status, "blocked_before_permission_evaluation", "CP00-110 blocked workflow status");
requireEqual(cp110BlockedWorkflow.reason, "tenant_boundary_precheck_failed", "CP00-110 blocked workflow reason");
requireFalse(cp110BlockedWorkflow.evaluator_invoked, "CP00-110 blocked workflow evaluator_invoked");
requireEqual(cp110NonSyntheticWorkflow.status, "blocked_before_permission_evaluation", "CP00-110 non-synthetic workflow status");
requireEqual(cp110NonSyntheticWorkflow.reason, "non_synthetic_request_blocked", "CP00-110 non-synthetic workflow reason");
requireFalse(cp110NonSyntheticWorkflow.evaluator_invoked, "CP00-110 non-synthetic workflow evaluator_invoked");
requireEqual(cp110MatterMissingWorkflow.status, "blocked_before_permission_evaluation", "CP00-110 missing matter workflow status");
requireEqual(cp110MatterMissingWorkflow.reason, "matter_trace_precheck_failed", "CP00-110 missing matter workflow reason");
requireFalse(cp110MatterMissingWorkflow.evaluator_invoked, "CP00-110 missing matter workflow evaluator_invoked");
requireEqual(cp110Handoff.next_pack_id, "CP00-111", "CP00-110 handoff.next_pack_id");
requireEqual(cp110Handoff.next_subphase_id, "RP02.P02.M06.S03", "CP00-110 handoff.next_subphase_id");
requireTrue(cp110Coverage.valid, `CP00-110 coverage valid: ${cp110Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp110PlanPack, createPermissionKernelCp110CoveredUnitIds(), "CP00-110");
requireEqual(
  contract.synthetic_fixture_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
  "synthetic_fixture_boundary_pack.pack_id",
);
requireEqual(
  contract.synthetic_fixture_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.contract_id,
  "synthetic_fixture_boundary_pack.contract_id",
);
requireEqual(
  contract.synthetic_fixture_boundary_pack?.upstream_service_workflow_pack_id,
  "CP00-110",
  "synthetic_fixture_boundary_pack.upstream_service_workflow_pack_id",
);
requireEqual(contract.synthetic_fixture_boundary_pack?.next_pack_id, "CP00-112", "synthetic_fixture_boundary_pack.next_pack_id");
requireEqual(
  contract.synthetic_fixture_boundary_pack?.next_subphase_id,
  "RP02.P02.M06.S13",
  "synthetic_fixture_boundary_pack.next_subphase_id",
);
requireTrue(contract.synthetic_fixture_boundary_pack?.synthetic_only, "synthetic_fixture_boundary_pack.synthetic_only");
requireTrue(contract.synthetic_fixture_boundary_pack?.risk_a_boundary_pack, "synthetic_fixture_boundary_pack.risk_a_boundary_pack");
requireTrue(
  contract.synthetic_fixture_boundary_pack?.fixture_boundary_execution,
  "synthetic_fixture_boundary_pack.fixture_boundary_execution",
);
requireTrue(
  contract.synthetic_fixture_boundary_pack?.permission_evaluator_invoked_only_after_boundary_prechecks,
  "synthetic_fixture_boundary_pack.permission_evaluator_invoked_only_after_boundary_prechecks",
);
for (const profile of PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.required_fixture_profiles) {
  requireIncludes(contract.synthetic_fixture_required_profiles ?? [], profile, "synthetic_fixture_required_profiles");
}
for (const profile of PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.fail_closed_profiles) {
  requireIncludes(contract.synthetic_fixture_fail_closed_profiles ?? [], profile, "synthetic_fixture_fail_closed_profiles");
}
for (const profile of PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.metadata_only_profiles) {
  requireIncludes(contract.synthetic_fixture_metadata_only_profiles ?? [], profile, "synthetic_fixture_metadata_only_profiles");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP111_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source synthetic_fixture_no_write_attestation.${flag}`);
  requireFalse(contract.synthetic_fixture_no_write_attestation?.[flag], `contract synthetic_fixture_no_write_attestation.${flag}`);
}
requireEqual(cp111Catalog.length, 10, "CP00-111 catalog length");
requireEqual(cp111Manifest.covered_unit_count, 10, "CP00-111 manifest covered_unit_count");
requireEqual(cp111Manifest.first_unit_id, "RP02.P02.M06.S03", "CP00-111 first_unit_id");
requireEqual(cp111Manifest.last_unit_id, "RP02.P02.M06.S12", "CP00-111 last_unit_id");
requireEqual(cp111Manifest.deliverable_counts.implementation, 6, "CP00-111 implementation deliverable count");
requireEqual(cp111Manifest.deliverable_counts.security_audit, 2, "CP00-111 security_audit deliverable count");
requireEqual(cp111Manifest.deliverable_counts.ui, 2, "CP00-111 ui deliverable count");
requireEqual(cp111Manifest.fixture_profile_count, 10, "CP00-111 fixture profile count");
requireEqual(cp111Manifest.metadata_only_profile_count, 10, "CP00-111 metadata-only profile count");
requireEqual(cp111HermesPacket.hermes_gate, "H02", "CP00-111 Hermes packet gate");
requireEqual(cp111HermesPacket.covered_unit_count, 10, "CP00-111 Hermes packet covered_unit_count");
requireEqual(cp111ClaudePacket.model, "claude-opus-4-8", "CP00-111 Claude packet model");
requireEqual(cp111ClaudePacket.effort, "max", "CP00-111 Claude packet effort");
requireTrue(cp111ClaudePacket.read_only, "CP00-111 Claude packet read_only");
requireTrue(cp111ClaudePacket.exactly_one_valid_pack_review_required, "CP00-111 Claude packet exactly_one_valid_pack_review_required");

const cp111TenantBoundary = runPermissionKernelCp111SyntheticFixtureProfile("tenant_boundary_block");
const cp111MatterBoundary = runPermissionKernelCp111SyntheticFixtureProfile("matter_trace_block");
const cp111Allow = runPermissionKernelCp111SyntheticFixtureProfile("permission_allow");
const cp111Deny = runPermissionKernelCp111SyntheticFixtureProfile("permission_deny");
const cp111Audit = runPermissionKernelCp111SyntheticFixtureProfile("audit_hint_preview");
const cp111Acl = runPermissionKernelCp111SyntheticFixtureProfile("secondary_object_acl_allow");
const cp111Review = runPermissionKernelCp111SyntheticFixtureProfile("state_transition_review_required");
requireEqual(cp111TenantBoundary.status, "blocked_before_permission_evaluation", "CP00-111 tenant boundary status");
requireFalse(cp111TenantBoundary.evaluator_invoked, "CP00-111 tenant boundary evaluator_invoked");
requireEqual(cp111MatterBoundary.status, "blocked_before_permission_evaluation", "CP00-111 matter boundary status");
requireFalse(cp111MatterBoundary.evaluator_invoked, "CP00-111 matter boundary evaluator_invoked");
requireEqual(cp111Allow.status, "completed_metadata_only", "CP00-111 allow fixture status");
requireEqual(cp111Allow.decision_effect, "allow", "CP00-111 allow fixture decision");
requireEqual(cp111Deny.status, "blocked_claim_output", "CP00-111 deny fixture status");
requireEqual(cp111Deny.decision_effect, "deny", "CP00-111 deny fixture decision");
requireTrue(cp111Audit.audit_hint_preview_only, "CP00-111 audit fixture preview-only");
requireEqual(cp111Acl.decision_reason, "object_acl_allow", "CP00-111 ACL fixture decision reason");
requireEqual(cp111Review.status, "review_required_routing", "CP00-111 review fixture status");
for (const profile of cp111Matrix) {
  requireFalse(profile.idempotency_persisted, `CP00-111 ${profile.profile_name} idempotency persisted`);
  requireFalse(profile.lock_acquired, `CP00-111 ${profile.profile_name} lock acquired`);
  requireFalse(profile.writes_product_state, `CP00-111 ${profile.profile_name} writes_product_state`);
  requireFalse(profile.writes_audit_event, `CP00-111 ${profile.profile_name} writes_audit_event`);
  requireFalse(profile.creates_database_rows, `CP00-111 ${profile.profile_name} creates_database_rows`);
}
requireEqual(cp111Handoff.next_pack_id, "CP00-112", "CP00-111 handoff.next_pack_id");
requireEqual(cp111Handoff.next_subphase_id, "RP02.P02.M06.S13", "CP00-111 handoff.next_subphase_id");
requireEqual(
  cp111Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-111 handoff.hrx_embedded_boundary",
);
requireTrue(cp111Coverage.valid, `CP00-111 coverage valid: ${cp111Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp111PlanPack, createPermissionKernelCp111CoveredUnitIds(), "CP00-111");
requireEqual(contract.interface_closeout_pack?.pack_id, PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id, "interface_closeout_pack.pack_id");
requireEqual(
  contract.interface_closeout_pack?.contract_id,
  PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT.contract_id,
  "interface_closeout_pack.contract_id",
);
requireEqual(
  contract.interface_closeout_pack?.upstream_synthetic_fixture_boundary_pack_id,
  "CP00-111",
  "interface_closeout_pack.upstream_synthetic_fixture_boundary_pack_id",
);
requireTrue(contract.interface_closeout_pack?.synthetic_only, "interface_closeout_pack.synthetic_only");
requireTrue(contract.interface_closeout_pack?.catalog_only, "interface_closeout_pack.catalog_only");
requireTrue(contract.interface_closeout_pack?.api_interface_scaffold_only, "interface_closeout_pack.api_interface_scaffold_only");
requireEqual(contract.interface_closeout_pack?.next_pack_id, "CP00-113", "interface_closeout_pack.next_pack_id");
requireEqual(contract.interface_closeout_pack?.next_subphase_id, "RP02.P03.M05.S07", "interface_closeout_pack.next_subphase_id");
for (const surface of PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT.terminal_service_surfaces) {
  requireIncludes(contract.interface_closeout_terminal_surfaces ?? [], surface, "interface_closeout_terminal_surfaces");
}
for (const surface of PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT.api_interface_surfaces) {
  requireIncludes(contract.interface_closeout_api_surfaces ?? [], surface, "interface_closeout_api_surfaces");
}
for (const code of PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT.error_codes) {
  requireIncludes(contract.interface_closeout_error_codes ?? [], code, "interface_closeout_error_codes");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source interface_closeout_no_write_attestation.${flag}`);
  requireFalse(contract.interface_closeout_no_write_attestation?.[flag], `contract interface_closeout_no_write_attestation.${flag}`);
}
requireEqual(cp112Catalog.length, 150, "CP00-112 catalog length");
requireEqual(cp112Manifest.covered_unit_count, 150, "CP00-112 manifest covered_unit_count");
requireEqual(cp112Manifest.first_unit_id, "RP02.P02.M06.S13", "CP00-112 first_unit_id");
requireEqual(cp112Manifest.last_unit_id, "RP02.P03.M05.S06", "CP00-112 last_unit_id");
requireEqual(cp112Manifest.area_counts.permission_service_terminal_closeout, 85, "CP00-112 service terminal area count");
requireEqual(cp112Manifest.area_counts.permission_api_interface, 65, "CP00-112 API interface area count");
requireEqual(cp112Manifest.covered_micro_phase_count, 11, "CP00-112 covered micro phase count");
requireEqual(cp112Manifest.deliverable_counts.implementation, 62, "CP00-112 implementation deliverable count");
requireEqual(cp112Manifest.deliverable_counts.contract, 22, "CP00-112 contract deliverable count");
requireEqual(cp112Manifest.deliverable_counts.security_audit, 18, "CP00-112 security_audit deliverable count");
requireEqual(cp112Manifest.deliverable_counts.ui, 12, "CP00-112 ui deliverable count");
requireEqual(cp112Manifest.deliverable_counts.claude_review, 6, "CP00-112 Claude review deliverable count");
requireEqual(cp112Manifest.deliverable_counts.failure_recovery, 8, "CP00-112 failure recovery deliverable count");
requireEqual(cp112Manifest.deliverable_counts.test, 20, "CP00-112 test deliverable count");
requireEqual(cp112Manifest.deliverable_counts.hermes_evidence, 2, "CP00-112 Hermes evidence deliverable count");
requireEqual(cp112HermesPacket.hermes_gate, "H02", "CP00-112 Hermes packet gate");
requireEqual(cp112HermesPacket.covered_unit_count, 150, "CP00-112 Hermes packet covered_unit_count");
requireEqual(cp112ClaudePacket.model, "claude-opus-4-8", "CP00-112 Claude packet model");
requireEqual(cp112ClaudePacket.effort, "max", "CP00-112 Claude packet effort");
requireTrue(cp112ClaudePacket.read_only, "CP00-112 Claude packet read_only");
requireTrue(cp112ClaudePacket.exactly_one_valid_pack_review_required, "CP00-112 Claude packet exactly_one_valid_pack_review_required");

const cp112ApiFixture = createPermissionKernelCp112ApiInterfaceFixture({
  privileged_note: "validator should not expose this",
  cross_tenant_secret: "validator should not expose this",
});
const cp112InvalidFixture = createPermissionKernelCp112ApiInterfaceFixture({ synthetic: false });
const cp112CrossTenantFixture = createPermissionKernelCp112ApiInterfaceFixture({
  tenant_id: "t_interface",
  resource_tenant_id: "t_other",
});
const cp112MatterDriftFixture = createPermissionKernelCp112ApiInterfaceFixture({
  matter_id: "m_request_context",
  resource_matter_id: "m_resource_context",
});
requireTrue(cp112ApiFixture.unauthorized_data_omitted, "CP00-112 API fixture unauthorized_data_omitted");
requireEqual(cp112ApiFixture.response_contract.items[0]?.privileged_note, undefined, "CP00-112 API fixture privileged_note omission");
requireEqual(cp112ApiFixture.response_contract.items[0]?.cross_tenant_secret, undefined, "CP00-112 API fixture cross_tenant_secret omission");
requireFalse(cp112ApiFixture.writes_product_state, "CP00-112 API fixture writes_product_state");
requireFalse(cp112ApiFixture.writes_audit_event, "CP00-112 API fixture writes_audit_event");
requireFalse(cp112ApiFixture.creates_database_rows, "CP00-112 API fixture creates_database_rows");
requireIncludes(cp112InvalidFixture.response_contract.error_codes, "non_synthetic_request_blocked", "CP00-112 invalid fixture error_codes");
requireIncludes(cp112CrossTenantFixture.response_contract.error_codes, "tenant_boundary_precheck_failed", "CP00-112 cross tenant fixture error_codes");
requireIncludes(cp112MatterDriftFixture.response_contract.error_codes, "matter_trace_precheck_failed", "CP00-112 matter drift fixture error_codes");
for (const profile of cp112Matrix.service_profiles) {
  requireFalse(profile.idempotency_persisted, `CP00-112 ${profile.profile_name} idempotency persisted`);
  requireFalse(profile.lock_acquired, `CP00-112 ${profile.profile_name} lock acquired`);
  requireFalse(profile.writes_product_state, `CP00-112 ${profile.profile_name} writes_product_state`);
  requireFalse(profile.writes_audit_event, `CP00-112 ${profile.profile_name} writes_audit_event`);
}
for (const fixture of cp112Matrix.api_fixtures) {
  requireFalse(fixture.executes_export_download, "CP00-112 API fixture executes_export_download");
  requireFalse(fixture.executes_external_share, "CP00-112 API fixture executes_external_share");
  requireFalse(fixture.executes_ai_retrieval, "CP00-112 API fixture executes_ai_retrieval");
}
requireEqual(cp112Handoff.next_pack_id, "CP00-113", "CP00-112 handoff.next_pack_id");
requireEqual(cp112Handoff.next_subphase_id, "RP02.P03.M05.S07", "CP00-112 handoff.next_subphase_id");
requireEqual(
  cp112Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-112 handoff.hrx_embedded_boundary",
);
requireTrue(cp112Coverage.valid, `CP00-112 coverage valid: ${cp112Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp112PlanPack, createPermissionKernelCp112CoveredUnitIds(), "CP00-112");
requireEqual(
  contract.api_permission_audit_binding_pack?.pack_id,
  PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
  "api_permission_audit_binding_pack.pack_id",
);
requireEqual(
  contract.api_permission_audit_binding_pack?.contract_id,
  PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id,
  "api_permission_audit_binding_pack.contract_id",
);
requireEqual(
  contract.api_permission_audit_binding_pack?.upstream_interface_closeout_pack_id,
  "CP00-112",
  "api_permission_audit_binding_pack.upstream_interface_closeout_pack_id",
);
requireTrue(contract.api_permission_audit_binding_pack?.synthetic_only, "api_permission_audit_binding_pack.synthetic_only");
requireTrue(contract.api_permission_audit_binding_pack?.risk_a_boundary_pack, "api_permission_audit_binding_pack.risk_a_boundary_pack");
requireTrue(
  contract.api_permission_audit_binding_pack?.metadata_only_api_binding,
  "api_permission_audit_binding_pack.metadata_only_api_binding",
);
requireTrue(
  contract.api_permission_audit_binding_pack?.permission_evaluator_invoked_on_synthetic_inputs,
  "api_permission_audit_binding_pack.permission_evaluator_invoked_on_synthetic_inputs",
);
requireTrue(contract.api_permission_audit_binding_pack?.audit_write_deferred_to_rp03, "api_permission_audit_binding_pack.audit_write_deferred_to_rp03");
requireEqual(contract.api_permission_audit_binding_pack?.next_pack_id, "CP00-114", "api_permission_audit_binding_pack.next_pack_id");
requireEqual(
  contract.api_permission_audit_binding_pack?.next_subphase_id,
  "RP02.P03.M05.S17",
  "api_permission_audit_binding_pack.next_subphase_id",
);
for (const surface of PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.api_binding_surfaces) {
  requireIncludes(contract.api_permission_audit_binding_surfaces ?? [], surface, "api_permission_audit_binding_surfaces");
}
for (const code of PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.error_codes) {
  requireIncludes(contract.api_permission_audit_binding_error_codes ?? [], code, "api_permission_audit_binding_error_codes");
}
for (const code of PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.safety_codes) {
  requireIncludes(contract.api_permission_audit_binding_safety_codes ?? [], code, "api_permission_audit_binding_safety_codes");
}
for (const field of PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.serialized_response_allowlist) {
  requireIncludes(
    contract.api_permission_audit_binding_serialized_response_allowlist ?? [],
    field,
    "api_permission_audit_binding_serialized_response_allowlist",
  );
}
for (const field of PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.api_permission_audit_binding_hidden_source_fields ?? [], field, "api_permission_audit_binding_hidden_source_fields");
}
requireEqual(contract.api_permission_audit_binding_pagination_contract?.page_min, 1, "api_permission_audit_binding_pagination_contract.page_min");
requireEqual(
  contract.api_permission_audit_binding_pagination_contract?.page_size_max,
  100,
  "api_permission_audit_binding_pagination_contract.page_size_max",
);
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source api_permission_audit_binding_no_write_attestation.${flag}`);
  requireFalse(contract.api_permission_audit_binding_no_write_attestation?.[flag], `contract api_permission_audit_binding_no_write_attestation.${flag}`);
}
requireEqual(cp113Catalog.length, 10, "CP00-113 catalog length");
requireEqual(cp113Manifest.covered_unit_count, 10, "CP00-113 manifest covered_unit_count");
requireEqual(cp113Manifest.first_unit_id, "RP02.P03.M05.S07", "CP00-113 first_unit_id");
requireEqual(cp113Manifest.last_unit_id, "RP02.P03.M05.S16", "CP00-113 last_unit_id");
requireEqual(cp113Manifest.deliverable_counts.contract, 2, "CP00-113 contract deliverable count");
requireEqual(cp113Manifest.deliverable_counts.implementation, 3, "CP00-113 implementation deliverable count");
requireEqual(cp113Manifest.deliverable_counts.test, 3, "CP00-113 test deliverable count");
requireEqual(cp113Manifest.deliverable_counts.hermes_evidence, 1, "CP00-113 Hermes evidence deliverable count");
requireEqual(cp113Manifest.deliverable_counts.claude_review, 1, "CP00-113 Claude review deliverable count");
requireEqual(cp113HermesPacket.hermes_gate, "H02", "CP00-113 Hermes packet gate");
requireEqual(cp113HermesPacket.covered_unit_count, 10, "CP00-113 Hermes packet covered_unit_count");
requireEqual(cp113ClaudePacket.model, "claude-opus-4-8", "CP00-113 Claude packet model");
requireEqual(cp113ClaudePacket.effort, "max", "CP00-113 Claude packet effort");
requireTrue(cp113ClaudePacket.read_only, "CP00-113 Claude packet read_only");
requireTrue(cp113ClaudePacket.exactly_one_valid_pack_review_required, "CP00-113 Claude packet exactly_one_valid_pack_review_required");

const cp113AllowFixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture({
  privileged_note: "validator should not expose this",
  cross_tenant_secret: "validator should not expose this",
  internal_policy_label: "validator should not expose this",
  sealed_audit_hint_payload: "validator should not expose this",
  page: 2,
  page_size: 10,
});
const cp113DeniedFixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture({ decision: "deny" });
const cp113InvalidPaginationFixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture({ page_size: 101 });
const cp113NonSyntheticFixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture({ synthetic: false });
const cp113CrossTenantFixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture({
  tenant_id: "t_cp113",
  resource_tenant_id: "t_other",
});
const cp113MatterDriftFixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture({
  matter_id: "m_request_context",
  resource_matter_id: "m_resource_context",
});
requireEqual(cp113AllowFixture.status, "ready_metadata_only_response", "CP00-113 allow fixture status");
requireTrue(cp113AllowFixture.evaluator_invoked, "CP00-113 allow fixture evaluator_invoked");
requireEqual(cp113AllowFixture.permission_annotation.effect, "allow", "CP00-113 allow permission annotation");
requireTrue(cp113AllowFixture.audit_annotation.preview_only, "CP00-113 audit annotation preview_only");
requireFalse(cp113AllowFixture.audit_annotation.emitted_to_audit_ledger, "CP00-113 audit annotation emitted_to_audit_ledger");
requireEqual(cp113AllowFixture.audit_annotation.hint?.privileged_note, undefined, "CP00-113 audit hint privileged_note omission");
requireEqual(cp113AllowFixture.audit_annotation.hint?.cross_tenant_secret, undefined, "CP00-113 audit hint cross_tenant_secret omission");
requireEqual(cp113AllowFixture.audit_annotation.hint?.internal_policy_label, undefined, "CP00-113 audit hint internal_policy_label omission");
requireEqual(cp113AllowFixture.audit_annotation.hint?.sealed_audit_hint_payload, undefined, "CP00-113 audit hint sealed_audit_hint_payload omission");
requireTrue(cp113AllowFixture.serialization_guard.allowlist_enforced, "CP00-113 serialization allowlist");
requireTrue(cp113AllowFixture.serialization_guard.unauthorized_data_omitted, "CP00-113 serialization unauthorized data omitted");
requireIncludes(cp113AllowFixture.response_contract.safety_codes, "unauthorized_data_omitted", "CP00-113 safety codes");
requireEqual(cp113AllowFixture.response_contract.items[0]?.privileged_note, undefined, "CP00-113 privileged_note omission");
requireEqual(cp113AllowFixture.response_contract.items[0]?.cross_tenant_secret, undefined, "CP00-113 cross_tenant_secret omission");
requireEqual(cp113AllowFixture.response_contract.items[0]?.internal_policy_label, undefined, "CP00-113 internal_policy_label omission");
requireEqual(cp113AllowFixture.response_contract.items[0]?.sealed_audit_hint_payload, undefined, "CP00-113 sealed_audit_hint_payload omission");
requireEqual(cp113DeniedFixture.status, "denied_metadata_only_response", "CP00-113 denied fixture status");
requireIncludes(cp113DeniedFixture.response_contract.error_codes, "permission_denied", "CP00-113 denied fixture error_codes");
requireEqual(cp113DeniedFixture.response_contract.items.length, 0, "CP00-113 denied fixture items");
requireIncludes(cp113InvalidPaginationFixture.response_contract.error_codes, "invalid_pagination", "CP00-113 invalid pagination error_codes");
requireFalse(cp113InvalidPaginationFixture.evaluator_invoked, "CP00-113 invalid pagination evaluator_invoked");
requireIncludes(cp113NonSyntheticFixture.response_contract.error_codes, "non_synthetic_request_blocked", "CP00-113 non synthetic error_codes");
requireFalse(cp113NonSyntheticFixture.evaluator_invoked, "CP00-113 non synthetic evaluator_invoked");
requireIncludes(cp113CrossTenantFixture.response_contract.error_codes, "tenant_boundary_precheck_failed", "CP00-113 cross tenant error_codes");
requireIncludes(cp113MatterDriftFixture.response_contract.error_codes, "matter_trace_precheck_failed", "CP00-113 matter drift error_codes");
for (const fixture of cp113Matrix.fixtures) {
  requireFalse(fixture.mutates_permission_policy, "CP00-113 fixture mutates_permission_policy");
  requireFalse(fixture.writes_product_state, "CP00-113 fixture writes_product_state");
  requireFalse(fixture.writes_audit_event, "CP00-113 fixture writes_audit_event");
  requireFalse(fixture.creates_database_rows, "CP00-113 fixture creates_database_rows");
  requireFalse(fixture.executes_export_download, "CP00-113 fixture executes_export_download");
  requireFalse(fixture.executes_external_share, "CP00-113 fixture executes_external_share");
  requireFalse(fixture.executes_ai_retrieval, "CP00-113 fixture executes_ai_retrieval");
}
requireEqual(cp113Handoff.next_pack_id, "CP00-114", "CP00-113 handoff.next_pack_id");
requireEqual(cp113Handoff.next_subphase_id, "RP02.P03.M05.S17", "CP00-113 handoff.next_subphase_id");
requireEqual(
  cp113Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-113 handoff.hrx_embedded_boundary",
);
requireTrue(cp113Coverage.valid, `CP00-113 coverage valid: ${cp113Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp113PlanPack, createPermissionKernelCp113CoveredUnitIds(), "CP00-113");
requireEqual(
  contract.api_synthetic_fixture_set_pack?.pack_id,
  PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
  "api_synthetic_fixture_set_pack.pack_id",
);
requireEqual(
  contract.api_synthetic_fixture_set_pack?.contract_id,
  PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.contract_id,
  "api_synthetic_fixture_set_pack.contract_id",
);
requireEqual(
  contract.api_synthetic_fixture_set_pack?.upstream_api_permission_audit_binding_pack_id,
  "CP00-113",
  "api_synthetic_fixture_set_pack.upstream_api_permission_audit_binding_pack_id",
);
requireTrue(contract.api_synthetic_fixture_set_pack?.synthetic_only, "api_synthetic_fixture_set_pack.synthetic_only");
requireTrue(contract.api_synthetic_fixture_set_pack?.risk_a_boundary_pack, "api_synthetic_fixture_set_pack.risk_a_boundary_pack");
requireTrue(
  contract.api_synthetic_fixture_set_pack?.metadata_only_fixture_set,
  "api_synthetic_fixture_set_pack.metadata_only_fixture_set",
);
requireEqual(contract.api_synthetic_fixture_set_pack?.version, "permission_api_binding.v0.1", "api_synthetic_fixture_set_pack.version");
requireEqual(contract.api_synthetic_fixture_set_pack?.next_pack_id, "CP00-115", "api_synthetic_fixture_set_pack.next_pack_id");
requireEqual(
  contract.api_synthetic_fixture_set_pack?.next_subphase_id,
  "RP02.P03.M06.S07",
  "api_synthetic_fixture_set_pack.next_subphase_id",
);
for (const surface of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.fixture_surfaces) {
  requireIncludes(contract.api_synthetic_fixture_set_surfaces ?? [], surface, "api_synthetic_fixture_set_surfaces");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.public_exports) {
  requireIncludes(contract.api_synthetic_fixture_set_public_exports ?? [], exportedSymbol, "api_synthetic_fixture_set_public_exports");
}
for (const field of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.request_contract_fields) {
  requireIncludes(contract.api_synthetic_fixture_set_request_contract_fields ?? [], field, "api_synthetic_fixture_set_request_contract_fields");
}
for (const field of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.response_contract_fields) {
  requireIncludes(contract.api_synthetic_fixture_set_response_contract_fields ?? [], field, "api_synthetic_fixture_set_response_contract_fields");
}
for (const code of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.error_codes) {
  requireIncludes(contract.api_synthetic_fixture_set_error_codes ?? [], code, "api_synthetic_fixture_set_error_codes");
}
for (const code of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.safety_codes) {
  requireIncludes(contract.api_synthetic_fixture_set_safety_codes ?? [], code, "api_synthetic_fixture_set_safety_codes");
}
for (const field of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.permission_annotation_shape) {
  requireIncludes(contract.api_synthetic_fixture_set_permission_annotation_shape ?? [], field, "api_synthetic_fixture_set_permission_annotation_shape");
}
for (const field of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.audit_annotation_shape) {
  requireIncludes(contract.api_synthetic_fixture_set_audit_annotation_shape ?? [], field, "api_synthetic_fixture_set_audit_annotation_shape");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source api_synthetic_fixture_set_no_write_attestation.${flag}`);
  requireFalse(contract.api_synthetic_fixture_set_no_write_attestation?.[flag], `contract api_synthetic_fixture_set_no_write_attestation.${flag}`);
}
requireEqual(cp114Catalog.length, 10, "CP00-114 catalog length");
requireEqual(cp114Manifest.covered_unit_count, 10, "CP00-114 manifest covered_unit_count");
requireEqual(cp114Manifest.first_unit_id, "RP02.P03.M05.S17", "CP00-114 first_unit_id");
requireEqual(cp114Manifest.last_unit_id, "RP02.P03.M06.S06", "CP00-114 last_unit_id");
requireEqual(cp114Manifest.phase_counts["RP02.P03.M05"], 4, "CP00-114 RP02.P03.M05 count");
requireEqual(cp114Manifest.phase_counts["RP02.P03.M06"], 6, "CP00-114 RP02.P03.M06 count");
requireEqual(cp114Manifest.deliverable_counts.implementation, 6, "CP00-114 implementation deliverable count");
requireEqual(cp114Manifest.deliverable_counts.contract, 2, "CP00-114 contract deliverable count");
requireEqual(cp114Manifest.deliverable_counts.security_audit, 2, "CP00-114 security_audit deliverable count");
requireEqual(cp114Matrix.fixture_surface_count, 4, "CP00-114 fixture surface count");
requireEqual(cp114HermesPacket.hermes_gate, "H02", "CP00-114 Hermes packet gate");
requireEqual(cp114HermesPacket.covered_unit_count, 10, "CP00-114 Hermes packet covered_unit_count");
requireEqual(cp114ClaudePacket.model, "claude-opus-4-8", "CP00-114 Claude packet model");
requireEqual(cp114ClaudePacket.effort, "max", "CP00-114 Claude packet effort");
requireTrue(cp114ClaudePacket.read_only, "CP00-114 Claude packet read_only");
requireTrue(cp114ClaudePacket.exactly_one_valid_pack_review_required, "CP00-114 Claude packet exactly_one_valid_pack_review_required");

const cp114AllowSurface = createPermissionKernelCp114ApiSyntheticFixtureSurface({
  privileged_note: "validator should not expose this",
  cross_tenant_secret: "validator should not expose this",
  internal_policy_label: "validator should not expose this",
  sealed_audit_hint_payload: "validator should not expose this",
});
const cp114DeniedSurface = createPermissionKernelCp114ApiSyntheticFixtureSurface({ decision: "deny" });
const cp114NonSyntheticSurface = createPermissionKernelCp114ApiSyntheticFixtureSurface({ synthetic: false });
const cp114InvalidPaginationSurface = createPermissionKernelCp114ApiSyntheticFixtureSurface({ page_size: 101 });
requireEqual(cp114AllowSurface.api_version, "permission_api_binding.v0.1", "CP00-114 allow surface api_version");
requireEqual(cp114AllowSurface.request_contract.api_version, "permission_api_binding.v0.1", "CP00-114 request contract api_version");
requireEqual(cp114AllowSurface.public_export_map.runtime_route_exported, false, "CP00-114 runtime route export");
requireEqual(cp114AllowSurface.public_export_map.persistence_adapter_exported, false, "CP00-114 persistence adapter export");
requireEqual(cp114AllowSurface.response_contract.items[0]?.privileged_note, undefined, "CP00-114 privileged_note omission");
requireEqual(cp114AllowSurface.response_contract.items[0]?.cross_tenant_secret, undefined, "CP00-114 cross_tenant_secret omission");
requireEqual(cp114AllowSurface.response_contract.items[0]?.internal_policy_label, undefined, "CP00-114 internal_policy_label omission");
requireEqual(cp114AllowSurface.response_contract.items[0]?.sealed_audit_hint_payload, undefined, "CP00-114 sealed_audit_hint_payload omission");
requireEqual(cp114AllowSurface.audit_annotation.hint?.privileged_note, undefined, "CP00-114 audit hint privileged_note omission");
requireEqual(cp114AllowSurface.permission_annotation.effect, "allow", "CP00-114 permission annotation effect");
requireTrue(cp114AllowSurface.audit_annotation.preview_only, "CP00-114 audit annotation preview-only");
requireFalse(cp114AllowSurface.audit_annotation.emitted_to_audit_ledger, "CP00-114 audit annotation emitted_to_audit_ledger");
requireIncludes(cp114DeniedSurface.response_contract.error_codes, "permission_denied", "CP00-114 denied surface error_codes");
requireIncludes(cp114NonSyntheticSurface.response_contract.error_codes, "non_synthetic_request_blocked", "CP00-114 non synthetic surface error_codes");
requireIncludes(cp114InvalidPaginationSurface.response_contract.error_codes, "invalid_pagination", "CP00-114 invalid pagination surface error_codes");
for (const surface of cp114Matrix.surfaces) {
  requireFalse(surface.mutates_permission_policy, "CP00-114 surface mutates_permission_policy");
  requireFalse(surface.writes_product_state, "CP00-114 surface writes_product_state");
  requireFalse(surface.writes_audit_event, "CP00-114 surface writes_audit_event");
  requireFalse(surface.creates_database_rows, "CP00-114 surface creates_database_rows");
  requireFalse(surface.persists_idempotency_keys, "CP00-114 surface persists_idempotency_keys");
  requireFalse(surface.acquires_locks, "CP00-114 surface acquires_locks");
  requireFalse(surface.executes_export_download, "CP00-114 surface executes_export_download");
  requireFalse(surface.executes_external_share, "CP00-114 surface executes_external_share");
  requireFalse(surface.executes_ai_retrieval, "CP00-114 surface executes_ai_retrieval");
}
requireEqual(cp114Handoff.next_pack_id, "CP00-115", "CP00-114 handoff.next_pack_id");
requireEqual(cp114Handoff.next_subphase_id, "RP02.P03.M06.S07", "CP00-114 handoff.next_subphase_id");
requireEqual(
  cp114Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-114 handoff.hrx_embedded_boundary",
);
requireTrue(cp114Coverage.valid, `CP00-114 coverage valid: ${cp114Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp114PlanPack, createPermissionKernelCp114CoveredUnitIds(), "CP00-114");
requireEqual(
  contract.api_fixture_ui_readiness_pack?.pack_id,
  PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
  "api_fixture_ui_readiness_pack.pack_id",
);
requireEqual(
  contract.api_fixture_ui_readiness_pack?.contract_id,
  PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.contract_id,
  "api_fixture_ui_readiness_pack.contract_id",
);
requireEqual(
  contract.api_fixture_ui_readiness_pack?.upstream_api_synthetic_fixture_set_pack_id,
  "CP00-114",
  "api_fixture_ui_readiness_pack.upstream_api_synthetic_fixture_set_pack_id",
);
requireTrue(contract.api_fixture_ui_readiness_pack?.synthetic_only, "api_fixture_ui_readiness_pack.synthetic_only");
requireTrue(contract.api_fixture_ui_readiness_pack?.catalog_only, "api_fixture_ui_readiness_pack.catalog_only");
requireTrue(contract.api_fixture_ui_readiness_pack?.metadata_only_fixture_set, "api_fixture_ui_readiness_pack.metadata_only_fixture_set");
requireTrue(contract.api_fixture_ui_readiness_pack?.ui_readiness_catalog_only, "api_fixture_ui_readiness_pack.ui_readiness_catalog_only");
requireEqual(contract.api_fixture_ui_readiness_pack?.api_fixture_terminal_unit_count, 65, "api_fixture_ui_readiness_pack.api_fixture_terminal_unit_count");
requireEqual(contract.api_fixture_ui_readiness_pack?.ui_readiness_unit_count, 85, "api_fixture_ui_readiness_pack.ui_readiness_unit_count");
requireEqual(contract.api_fixture_ui_readiness_pack?.next_pack_id, "CP00-116", "api_fixture_ui_readiness_pack.next_pack_id");
requireEqual(
  contract.api_fixture_ui_readiness_pack?.next_subphase_id,
  "RP02.P04.M05.S08",
  "api_fixture_ui_readiness_pack.next_subphase_id",
);
for (const surface of PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.api_fixture_terminal_surfaces) {
  requireIncludes(contract.api_fixture_ui_readiness_api_surfaces ?? [], surface, "api_fixture_ui_readiness_api_surfaces");
}
for (const surface of PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.ui_readiness_surfaces) {
  requireIncludes(contract.api_fixture_ui_readiness_ui_surfaces ?? [], surface, "api_fixture_ui_readiness_ui_surfaces");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.public_exports) {
  requireIncludes(contract.api_fixture_ui_readiness_public_exports ?? [], exportedSymbol, "api_fixture_ui_readiness_public_exports");
}
for (const field of PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.api_fixture_ui_readiness_hidden_source_fields ?? [], field, "api_fixture_ui_readiness_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source api_fixture_ui_readiness_no_write_attestation.${flag}`);
  requireFalse(contract.api_fixture_ui_readiness_no_write_attestation?.[flag], `contract api_fixture_ui_readiness_no_write_attestation.${flag}`);
}
requireEqual(cp115Catalog.length, 150, "CP00-115 catalog length");
requireEqual(cp115Manifest.covered_unit_count, 150, "CP00-115 manifest covered_unit_count");
requireEqual(cp115Manifest.first_unit_id, "RP02.P03.M06.S07", "CP00-115 first_unit_id");
requireEqual(cp115Manifest.last_unit_id, "RP02.P04.M05.S07", "CP00-115 last_unit_id");
requireEqual(cp115Manifest.area_counts.permission_api_fixture_terminal, 65, "CP00-115 API terminal area count");
requireEqual(cp115Manifest.area_counts.permission_ui_surface_readiness, 85, "CP00-115 UI readiness area count");
requireEqual(cp115Manifest.covered_micro_phase_count, 11, "CP00-115 covered micro phase count");
requireEqual(cp115Manifest.deliverable_counts.implementation, 48, "CP00-115 implementation deliverable count");
requireEqual(cp115Manifest.deliverable_counts.contract, 15, "CP00-115 contract deliverable count");
requireEqual(cp115Manifest.deliverable_counts.security_audit, 12, "CP00-115 security_audit deliverable count");
requireEqual(cp115Manifest.deliverable_counts.test, 12, "CP00-115 test deliverable count");
requireEqual(cp115Manifest.deliverable_counts.hermes_evidence, 6, "CP00-115 Hermes evidence deliverable count");
requireEqual(cp115Manifest.deliverable_counts.claude_review, 12, "CP00-115 Claude review deliverable count");
requireEqual(cp115Manifest.deliverable_counts.ui, 42, "CP00-115 ui deliverable count");
requireEqual(cp115Manifest.deliverable_counts.fixture, 3, "CP00-115 fixture deliverable count");
requireEqual(cp115Matrix.api_fixture_surface_count, 4, "CP00-115 API fixture surface count");
requireEqual(cp115Matrix.ui_state_count, 13, "CP00-115 UI state count");
requireEqual(cp115HermesPacket.hermes_gate, "H02", "CP00-115 Hermes packet gate");
requireEqual(cp115HermesPacket.covered_unit_count, 150, "CP00-115 Hermes packet covered_unit_count");
requireEqual(cp115ClaudePacket.model, "claude-opus-4-8", "CP00-115 Claude packet model");
requireEqual(cp115ClaudePacket.effort, "max", "CP00-115 Claude packet effort");
requireTrue(cp115ClaudePacket.read_only, "CP00-115 Claude packet read_only");
requireTrue(cp115ClaudePacket.exactly_one_valid_pack_review_required, "CP00-115 Claude packet exactly_one_valid_pack_review_required");
requireTrue(
  cp115Matrix.ui_states.some((state) => state.state_id === "denied_state" && state.permission_effect === "deny"),
  "CP00-115 denied UI state present",
);
requireTrue(
  cp115Matrix.ui_states.some((state) => state.state_id === "review_required_state" && state.permission_effect === "review_required"),
  "CP00-115 review-required UI state present",
);
requireTrue(
  cp115Matrix.ui_states.some((state) => state.state_id === "no_unauthorized_count_leak" && state.unauthorized_count_exposed === false),
  "CP00-115 no unauthorized count leak state present",
);
for (const surface of cp115Matrix.api_fixture_matrix.surfaces) {
  requireFalse(surface.mutates_permission_policy, "CP00-115 inherited API surface mutates_permission_policy");
  requireFalse(surface.writes_product_state, "CP00-115 inherited API surface writes_product_state");
  requireFalse(surface.writes_audit_event, "CP00-115 inherited API surface writes_audit_event");
  requireFalse(surface.creates_database_rows, "CP00-115 inherited API surface creates_database_rows");
  requireFalse(surface.persists_idempotency_keys, "CP00-115 inherited API surface persists_idempotency_keys");
  requireFalse(surface.acquires_locks, "CP00-115 inherited API surface acquires_locks");
  requireFalse(surface.executes_export_download, "CP00-115 inherited API surface executes_export_download");
  requireFalse(surface.executes_external_share, "CP00-115 inherited API surface executes_external_share");
  requireFalse(surface.executes_ai_retrieval, "CP00-115 inherited API surface executes_ai_retrieval");
}
for (const state of cp115Matrix.ui_states) {
  requireFalse(state.unauthorized_count_exposed, `CP00-115 ${state.state_id} unauthorized_count_exposed`);
  requireFalse(state.hidden_field_names_exposed, `CP00-115 ${state.state_id} hidden_field_names_exposed`);
  requireFalse(state.writes_product_state, `CP00-115 ${state.state_id} writes_product_state`);
  requireFalse(state.writes_audit_event, `CP00-115 ${state.state_id} writes_audit_event`);
  requireFalse(state.creates_database_rows, `CP00-115 ${state.state_id} creates_database_rows`);
  requireFalse(state.persists_idempotency_keys, `CP00-115 ${state.state_id} persists_idempotency_keys`);
  requireFalse(state.acquires_locks, `CP00-115 ${state.state_id} acquires_locks`);
  requireFalse(state.executes_export_download, `CP00-115 ${state.state_id} executes_export_download`);
  requireFalse(state.executes_external_share, `CP00-115 ${state.state_id} executes_external_share`);
  requireFalse(state.executes_ai_retrieval, `CP00-115 ${state.state_id} executes_ai_retrieval`);
  requireFalse(state.grants_human_approval, `CP00-115 ${state.state_id} grants_human_approval`);
}
requireEqual(cp115Handoff.next_pack_id, "CP00-116", "CP00-115 handoff.next_pack_id");
requireEqual(cp115Handoff.next_subphase_id, "RP02.P04.M05.S08", "CP00-115 handoff.next_subphase_id");
requireEqual(
  cp115Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-115 handoff.hrx_embedded_boundary",
);
requireTrue(cp115Coverage.valid, `CP00-115 coverage valid: ${cp115Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp115PlanPack, createPermissionKernelCp115CoveredUnitIds(), "CP00-115");
requireEqual(
  contract.ui_permission_audit_binding_pack?.pack_id,
  PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
  "ui_permission_audit_binding_pack.pack_id",
);
requireEqual(
  contract.ui_permission_audit_binding_pack?.contract_id,
  PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id,
  "ui_permission_audit_binding_pack.contract_id",
);
requireEqual(
  contract.ui_permission_audit_binding_pack?.upstream_api_fixture_ui_readiness_pack_id,
  "CP00-115",
  "ui_permission_audit_binding_pack.upstream_api_fixture_ui_readiness_pack_id",
);
requireTrue(contract.ui_permission_audit_binding_pack?.synthetic_only, "ui_permission_audit_binding_pack.synthetic_only");
requireTrue(contract.ui_permission_audit_binding_pack?.risk_a_boundary_pack, "ui_permission_audit_binding_pack.risk_a_boundary_pack");
requireTrue(
  contract.ui_permission_audit_binding_pack?.metadata_only_ui_binding,
  "ui_permission_audit_binding_pack.metadata_only_ui_binding",
);
requireFalse(contract.ui_permission_audit_binding_pack?.ui_runtime_route_added, "ui_permission_audit_binding_pack.ui_runtime_route_added");
requireEqual(
  contract.ui_permission_audit_binding_pack?.inherited_ui_readiness_contract_id,
  PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.contract_id,
  "ui_permission_audit_binding_pack.inherited_ui_readiness_contract_id",
);
requireEqual(contract.ui_permission_audit_binding_pack?.next_pack_id, "CP00-117", "ui_permission_audit_binding_pack.next_pack_id");
requireEqual(
  contract.ui_permission_audit_binding_pack?.next_subphase_id,
  "RP02.P04.M05.S18",
  "ui_permission_audit_binding_pack.next_subphase_id",
);
for (const surface of PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.binding_surfaces) {
  requireIncludes(contract.ui_permission_audit_binding_surfaces ?? [], surface, "ui_permission_audit_binding_surfaces");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.public_exports) {
  requireIncludes(contract.ui_permission_audit_binding_public_exports ?? [], exportedSymbol, "ui_permission_audit_binding_public_exports");
}
for (const field of PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.permission_badge_shape) {
  requireIncludes(contract.ui_permission_audit_binding_permission_badge_shape ?? [], field, "ui_permission_audit_binding_permission_badge_shape");
}
for (const field of PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.audit_hint_shape) {
  requireIncludes(contract.ui_permission_audit_binding_audit_hint_shape ?? [], field, "ui_permission_audit_binding_audit_hint_shape");
}
for (const code of PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.error_copy_codes) {
  requireIncludes(contract.ui_permission_audit_binding_error_copy_codes ?? [], code, "ui_permission_audit_binding_error_copy_codes");
}
for (const field of PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.ui_permission_audit_binding_hidden_source_fields ?? [], field, "ui_permission_audit_binding_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source ui_permission_audit_binding_no_write_attestation.${flag}`);
  requireFalse(contract.ui_permission_audit_binding_no_write_attestation?.[flag], `contract ui_permission_audit_binding_no_write_attestation.${flag}`);
}
requireEqual(cp116Catalog.length, 10, "CP00-116 catalog length");
requireEqual(cp116Manifest.covered_unit_count, 10, "CP00-116 manifest covered_unit_count");
requireEqual(cp116Manifest.first_unit_id, "RP02.P04.M05.S08", "CP00-116 first_unit_id");
requireEqual(cp116Manifest.last_unit_id, "RP02.P04.M05.S17", "CP00-116 last_unit_id");
requireEqual(cp116Manifest.deliverable_counts.ui, 3, "CP00-116 ui deliverable count");
requireEqual(cp116Manifest.deliverable_counts.security_audit, 2, "CP00-116 security_audit deliverable count");
requireEqual(cp116Manifest.deliverable_counts.implementation, 3, "CP00-116 implementation deliverable count");
requireEqual(cp116Manifest.deliverable_counts.fixture, 1, "CP00-116 fixture deliverable count");
requireEqual(cp116Manifest.deliverable_counts.test, 1, "CP00-116 test deliverable count");
requireEqual(cp116Matrix.surface_count, 3, "CP00-116 binding surface count");
requireEqual(cp116HermesPacket.hermes_gate, "H02", "CP00-116 Hermes packet gate");
requireEqual(cp116HermesPacket.covered_unit_count, 10, "CP00-116 Hermes packet covered_unit_count");
requireEqual(cp116ClaudePacket.model, "claude-opus-4-8", "CP00-116 Claude packet model");
requireEqual(cp116ClaudePacket.effort, "max", "CP00-116 Claude packet effort");
requireTrue(cp116ClaudePacket.read_only, "CP00-116 Claude packet read_only");
requireTrue(cp116ClaudePacket.exactly_one_valid_pack_review_required, "CP00-116 Claude packet exactly_one_valid_pack_review_required");

const cp116AllowSurface = createPermissionKernelCp116UiPermissionAuditBindingSurface({
  audit_hint: {
    privileged_note: "validator should not expose this",
    cross_tenant_secret: "validator should not expose this",
    internal_policy_label: "validator should not expose this",
    sealed_audit_hint_payload: "validator should not expose this",
  },
});
const cp116DeniedSurface = createPermissionKernelCp116UiPermissionAuditBindingSurface({ effect: "deny", reason: "permission_denied" });
const cp116ReviewSurface = createPermissionKernelCp116UiPermissionAuditBindingSurface({
  effect: "review_required",
  reason: "review_required",
});
requireFalse(cp116AllowSurface.permission_badge.grants_access, "CP00-116 allow badge grants_access");
requireTrue(cp116AllowSurface.audit_hint_display.preview_only, "CP00-116 allow audit hint preview_only");
requireFalse(cp116AllowSurface.audit_hint_display.emitted_to_audit_ledger, "CP00-116 allow audit hint emitted_to_audit_ledger");
requireEqual(cp116AllowSurface.audit_hint_display.hint?.privileged_note, undefined, "CP00-116 audit hint privileged_note omission");
requireEqual(cp116AllowSurface.audit_hint_display.hint?.cross_tenant_secret, undefined, "CP00-116 audit hint cross_tenant_secret omission");
requireEqual(cp116AllowSurface.audit_hint_display.hint?.internal_policy_label, undefined, "CP00-116 audit hint internal_policy_label omission");
requireEqual(cp116AllowSurface.audit_hint_display.hint?.sealed_audit_hint_payload, undefined, "CP00-116 audit hint sealed_audit_hint_payload omission");
requireFalse(cp116DeniedSurface.secondary_interaction.enabled, "CP00-116 denied secondary interaction enabled");
requireTrue(cp116ReviewSurface.secondary_interaction.requires_review, "CP00-116 review secondary interaction requires_review");
requireFalse(cp116ReviewSurface.secondary_interaction.grants_access, "CP00-116 review secondary interaction grants_access");
for (const surface of cp116Matrix.surfaces) {
  requireFalse(surface.runtime_ui_route_added, "CP00-116 surface runtime_ui_route_added");
  requireFalse(surface.unauthorized_count_exposed, "CP00-116 surface unauthorized_count_exposed");
  requireFalse(surface.hidden_field_names_exposed, "CP00-116 surface hidden_field_names_exposed");
  requireFalse(surface.mutates_permission_policy, "CP00-116 surface mutates_permission_policy");
  requireFalse(surface.writes_product_state, "CP00-116 surface writes_product_state");
  requireFalse(surface.writes_audit_event, "CP00-116 surface writes_audit_event");
  requireFalse(surface.creates_database_rows, "CP00-116 surface creates_database_rows");
  requireFalse(surface.persists_idempotency_keys, "CP00-116 surface persists_idempotency_keys");
  requireFalse(surface.acquires_locks, "CP00-116 surface acquires_locks");
  requireFalse(surface.executes_export_download, "CP00-116 surface executes_export_download");
  requireFalse(surface.executes_external_share, "CP00-116 surface executes_external_share");
  requireFalse(surface.executes_ai_retrieval, "CP00-116 surface executes_ai_retrieval");
  requireFalse(surface.grants_human_approval, "CP00-116 surface grants_human_approval");
}
requireEqual(cp116Handoff.next_pack_id, "CP00-117", "CP00-116 handoff.next_pack_id");
requireEqual(cp116Handoff.next_subphase_id, "RP02.P04.M05.S18", "CP00-116 handoff.next_subphase_id");
requireEqual(
  cp116Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-116 handoff.hrx_embedded_boundary",
);
requireTrue(cp116Coverage.valid, `CP00-116 coverage valid: ${cp116Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp116PlanPack, createPermissionKernelCp116CoveredUnitIds(), "CP00-116");
requireEqual(
  contract.ui_evidence_state_snapshot_pack?.pack_id,
  PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
  "ui_evidence_state_snapshot_pack.pack_id",
);
requireEqual(
  contract.ui_evidence_state_snapshot_pack?.contract_id,
  PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.contract_id,
  "ui_evidence_state_snapshot_pack.contract_id",
);
requireEqual(
  contract.ui_evidence_state_snapshot_pack?.upstream_ui_permission_audit_binding_pack_id,
  "CP00-116",
  "ui_evidence_state_snapshot_pack.upstream_ui_permission_audit_binding_pack_id",
);
requireTrue(contract.ui_evidence_state_snapshot_pack?.synthetic_only, "ui_evidence_state_snapshot_pack.synthetic_only");
requireTrue(contract.ui_evidence_state_snapshot_pack?.risk_a_boundary_pack, "ui_evidence_state_snapshot_pack.risk_a_boundary_pack");
requireTrue(
  contract.ui_evidence_state_snapshot_pack?.metadata_only_ui_state_snapshot,
  "ui_evidence_state_snapshot_pack.metadata_only_ui_state_snapshot",
);
requireFalse(contract.ui_evidence_state_snapshot_pack?.ui_runtime_route_added, "ui_evidence_state_snapshot_pack.ui_runtime_route_added");
requireEqual(
  contract.ui_evidence_state_snapshot_pack?.inherited_ui_permission_audit_contract_id,
  PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id,
  "ui_evidence_state_snapshot_pack.inherited_ui_permission_audit_contract_id",
);
requireEqual(contract.ui_evidence_state_snapshot_pack?.next_pack_id, "CP00-118", "ui_evidence_state_snapshot_pack.next_pack_id");
requireEqual(
  contract.ui_evidence_state_snapshot_pack?.next_subphase_id,
  "RP02.P04.M06.S06",
  "ui_evidence_state_snapshot_pack.next_subphase_id",
);
for (const surface of PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.evidence_surfaces) {
  requireIncludes(contract.ui_evidence_state_snapshot_surfaces ?? [], surface, "ui_evidence_state_snapshot_surfaces");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.public_exports) {
  requireIncludes(contract.ui_evidence_state_snapshot_public_exports ?? [], exportedSymbol, "ui_evidence_state_snapshot_public_exports");
}
for (const stateId of PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.ui_state_ids) {
  requireIncludes(contract.ui_evidence_state_snapshot_state_ids ?? [], stateId, "ui_evidence_state_snapshot_state_ids");
}
for (const field of PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.state_snapshot_shape) {
  requireIncludes(contract.ui_evidence_state_snapshot_shape ?? [], field, "ui_evidence_state_snapshot_shape");
}
for (const source of PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.data_dependency_sources) {
  requireIncludes(contract.ui_evidence_state_snapshot_data_dependency_sources ?? [], source, "ui_evidence_state_snapshot_data_dependency_sources");
}
for (const field of PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.ui_evidence_state_snapshot_hidden_source_fields ?? [], field, "ui_evidence_state_snapshot_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source ui_evidence_state_snapshot_no_write_attestation.${flag}`);
  requireFalse(contract.ui_evidence_state_snapshot_no_write_attestation?.[flag], `contract ui_evidence_state_snapshot_no_write_attestation.${flag}`);
}
requireEqual(cp117Catalog.length, 10, "CP00-117 catalog length");
requireEqual(cp117Manifest.covered_unit_count, 10, "CP00-117 manifest covered_unit_count");
requireEqual(cp117Manifest.first_unit_id, "RP02.P04.M05.S18", "CP00-117 first_unit_id");
requireEqual(cp117Manifest.last_unit_id, "RP02.P04.M06.S05", "CP00-117 last_unit_id");
requireEqual(cp117Manifest.covered_micro_phase_count, 2, "CP00-117 covered micro phase count");
requireEqual(cp117Manifest.deliverable_counts.hermes_evidence, 1, "CP00-117 Hermes evidence deliverable count");
requireEqual(cp117Manifest.deliverable_counts.claude_review, 1, "CP00-117 Claude review deliverable count");
requireEqual(cp117Manifest.deliverable_counts.implementation, 3, "CP00-117 implementation deliverable count");
requireEqual(cp117Manifest.deliverable_counts.ui, 5, "CP00-117 ui deliverable count");
requireEqual(cp117Matrix.state_count, 3, "CP00-117 state snapshot count");
requireEqual(cp117HermesPacket.hermes_gate, "H02", "CP00-117 Hermes packet gate");
requireEqual(cp117HermesPacket.covered_unit_count, 10, "CP00-117 Hermes packet covered_unit_count");
requireEqual(cp117ClaudePacket.model, "claude-opus-4-8", "CP00-117 Claude packet model");
requireEqual(cp117ClaudePacket.effort, "max", "CP00-117 Claude packet effort");
requireTrue(cp117ClaudePacket.read_only, "CP00-117 Claude packet read_only");
requireTrue(cp117ClaudePacket.exactly_one_valid_pack_review_required, "CP00-117 Claude packet exactly_one_valid_pack_review_required");

const cp117LoadingSnapshot = createPermissionKernelCp117UiStateSnapshot({
  state_id: "loading_state",
  audit_hint: {
    privileged_note: "validator should not expose this",
    cross_tenant_secret: "validator should not expose this",
    internal_policy_label: "validator should not expose this",
    sealed_audit_hint_payload: "validator should not expose this",
  },
});
const cp117DeniedSnapshot = createPermissionKernelCp117UiStateSnapshot({ state_id: "denied_state" });
requireTrue(cp117LoadingSnapshot.loading_state.skeleton_only, "CP00-117 loading state skeleton_only");
requireFalse(cp117LoadingSnapshot.no_unauthorized_count_leak.unauthorized_count_collected, "CP00-117 unauthorized_count_collected");
requireFalse(cp117LoadingSnapshot.no_unauthorized_count_leak.unauthorized_count_rendered, "CP00-117 unauthorized_count_rendered");
requireFalse(cp117LoadingSnapshot.state_snapshot.permission_badge.grants_access, "CP00-117 state permission badge grants_access");
requireTrue(cp117LoadingSnapshot.state_snapshot.audit_hint_display.preview_only, "CP00-117 audit hint preview_only");
requireFalse(cp117LoadingSnapshot.state_snapshot.audit_hint_display.emitted_to_audit_ledger, "CP00-117 audit hint emitted_to_audit_ledger");
requireEqual(cp117LoadingSnapshot.state_snapshot.audit_hint_display.hint?.privileged_note, undefined, "CP00-117 audit hint privileged_note omission");
requireEqual(cp117LoadingSnapshot.state_snapshot.audit_hint_display.hint?.cross_tenant_secret, undefined, "CP00-117 audit hint cross_tenant_secret omission");
requireEqual(cp117LoadingSnapshot.state_snapshot.audit_hint_display.hint?.internal_policy_label, undefined, "CP00-117 audit hint internal_policy_label omission");
requireEqual(
  cp117LoadingSnapshot.state_snapshot.audit_hint_display.hint?.sealed_audit_hint_payload,
  undefined,
  "CP00-117 audit hint sealed_audit_hint_payload omission",
);
requireEqual(cp117LoadingSnapshot.data_dependency_map.real_client_data_sources.length, 0, "CP00-117 real client data sources");
requireEqual(cp117DeniedSnapshot.state_snapshot.permission_effect, "deny", "CP00-117 denied state permission effect");
requireFalse(cp117DeniedSnapshot.denied_state.secondary_interaction_enabled, "CP00-117 denied secondary interaction enabled");
requireFalse(cp117DeniedSnapshot.denied_state.grants_access, "CP00-117 denied state grants_access");
for (const snapshot of cp117Matrix.snapshots) {
  requireFalse(snapshot.runtime_ui_route_added, "CP00-117 snapshot runtime_ui_route_added");
  requireFalse(snapshot.unauthorized_count_exposed, "CP00-117 snapshot unauthorized_count_exposed");
  requireFalse(snapshot.hidden_field_names_exposed, "CP00-117 snapshot hidden_field_names_exposed");
  requireFalse(snapshot.mutates_permission_policy, "CP00-117 snapshot mutates_permission_policy");
  requireFalse(snapshot.writes_product_state, "CP00-117 snapshot writes_product_state");
  requireFalse(snapshot.writes_audit_event, "CP00-117 snapshot writes_audit_event");
  requireFalse(snapshot.creates_database_rows, "CP00-117 snapshot creates_database_rows");
  requireFalse(snapshot.persists_idempotency_keys, "CP00-117 snapshot persists_idempotency_keys");
  requireFalse(snapshot.acquires_locks, "CP00-117 snapshot acquires_locks");
  requireFalse(snapshot.executes_export_download, "CP00-117 snapshot executes_export_download");
  requireFalse(snapshot.executes_external_share, "CP00-117 snapshot executes_external_share");
  requireFalse(snapshot.executes_ai_retrieval, "CP00-117 snapshot executes_ai_retrieval");
  requireFalse(snapshot.grants_human_approval, "CP00-117 snapshot grants_human_approval");
  requireFalse(snapshot.claude_ui_leak_prompt.executes_claude_review, "CP00-117 snapshot executes_claude_review");
}
requireEqual(cp117Handoff.next_pack_id, "CP00-118", "CP00-117 handoff.next_pack_id");
requireEqual(cp117Handoff.next_subphase_id, "RP02.P04.M06.S06", "CP00-117 handoff.next_subphase_id");
requireEqual(
  cp117Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-117 handoff.hrx_embedded_boundary",
);
requireTrue(cp117Coverage.valid, `CP00-117 coverage valid: ${cp117Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp117PlanPack, createPermissionKernelCp117CoveredUnitIds(), "CP00-117");
requireEqual(
  contract.ui_synthetic_fixture_golden_case_pack?.pack_id,
  PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
  "ui_synthetic_fixture_golden_case_pack.pack_id",
);
requireEqual(
  contract.ui_synthetic_fixture_golden_case_pack?.contract_id,
  PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.contract_id,
  "ui_synthetic_fixture_golden_case_pack.contract_id",
);
requireEqual(
  contract.ui_synthetic_fixture_golden_case_pack?.upstream_ui_evidence_state_snapshot_pack_id,
  "CP00-117",
  "ui_synthetic_fixture_golden_case_pack.upstream_ui_evidence_state_snapshot_pack_id",
);
requireTrue(contract.ui_synthetic_fixture_golden_case_pack?.synthetic_only, "ui_synthetic_fixture_golden_case_pack.synthetic_only");
requireTrue(contract.ui_synthetic_fixture_golden_case_pack?.catalog_only, "ui_synthetic_fixture_golden_case_pack.catalog_only");
requireTrue(
  contract.ui_synthetic_fixture_golden_case_pack?.metadata_only_fixture_set,
  "ui_synthetic_fixture_golden_case_pack.metadata_only_fixture_set",
);
requireFalse(contract.ui_synthetic_fixture_golden_case_pack?.ui_runtime_route_added, "ui_synthetic_fixture_golden_case_pack.ui_runtime_route_added");
requireEqual(contract.ui_synthetic_fixture_golden_case_pack?.ui_terminal_unit_count, 85, "ui_synthetic_fixture_golden_case_pack.ui_terminal_unit_count");
requireEqual(
  contract.ui_synthetic_fixture_golden_case_pack?.fixture_golden_case_unit_count,
  65,
  "ui_synthetic_fixture_golden_case_pack.fixture_golden_case_unit_count",
);
requireEqual(
  contract.ui_synthetic_fixture_golden_case_pack?.inherited_ui_evidence_state_snapshot_contract_id,
  PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.contract_id,
  "ui_synthetic_fixture_golden_case_pack.inherited_ui_evidence_state_snapshot_contract_id",
);
requireEqual(contract.ui_synthetic_fixture_golden_case_pack?.next_pack_id, "CP00-119", "ui_synthetic_fixture_golden_case_pack.next_pack_id");
requireEqual(
  contract.ui_synthetic_fixture_golden_case_pack?.next_subphase_id,
  "RP02.P05.M04.S08",
  "ui_synthetic_fixture_golden_case_pack.next_subphase_id",
);
for (const surface of PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.ui_terminal_surfaces) {
  requireIncludes(contract.ui_synthetic_fixture_golden_case_ui_terminal_surfaces ?? [], surface, "ui_synthetic_fixture_golden_case_ui_terminal_surfaces");
}
for (const surface of PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.fixture_golden_case_surfaces) {
  requireIncludes(contract.ui_synthetic_fixture_golden_case_fixture_surfaces ?? [], surface, "ui_synthetic_fixture_golden_case_fixture_surfaces");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.public_exports) {
  requireIncludes(contract.ui_synthetic_fixture_golden_case_public_exports ?? [], exportedSymbol, "ui_synthetic_fixture_golden_case_public_exports");
}
for (const field of PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.ui_synthetic_fixture_golden_case_hidden_source_fields ?? [], field, "ui_synthetic_fixture_golden_case_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source ui_synthetic_fixture_golden_case_no_write_attestation.${flag}`);
  requireFalse(contract.ui_synthetic_fixture_golden_case_no_write_attestation?.[flag], `contract ui_synthetic_fixture_golden_case_no_write_attestation.${flag}`);
}
requireEqual(cp118Catalog.length, 150, "CP00-118 catalog length");
requireEqual(cp118Manifest.covered_unit_count, 150, "CP00-118 manifest covered_unit_count");
requireEqual(cp118Manifest.first_unit_id, "RP02.P04.M06.S06", "CP00-118 first_unit_id");
requireEqual(cp118Manifest.last_unit_id, "RP02.P05.M04.S07", "CP00-118 last_unit_id");
requireEqual(cp118Manifest.area_counts.permission_ui_terminal_fixture_catalog, 85, "CP00-118 UI terminal area count");
requireEqual(cp118Manifest.area_counts.permission_fixture_golden_case_opening, 65, "CP00-118 fixture/golden area count");
requireEqual(cp118Manifest.covered_micro_phase_count, 10, "CP00-118 covered micro phase count");
requireEqual(cp118Manifest.deliverable_counts.claude_review, 14, "CP00-118 claude_review deliverable count");
requireEqual(cp118Manifest.deliverable_counts.ui, 35, "CP00-118 ui deliverable count");
requireEqual(cp118Manifest.deliverable_counts.security_audit, 12, "CP00-118 security_audit deliverable count");
requireEqual(cp118Manifest.deliverable_counts.implementation, 37, "CP00-118 implementation deliverable count");
requireEqual(cp118Manifest.deliverable_counts.fixture, 36, "CP00-118 fixture deliverable count");
requireEqual(cp118Manifest.deliverable_counts.test, 10, "CP00-118 test deliverable count");
requireEqual(cp118Manifest.deliverable_counts.hermes_evidence, 6, "CP00-118 hermes_evidence deliverable count");
requireEqual(cp118Matrix.inherited_state_count, 3, "CP00-118 inherited state count");
requireEqual(cp118Matrix.ui_terminal_surface_count, 22, "CP00-118 UI terminal surface count");
requireEqual(cp118Matrix.golden_case_count, 9, "CP00-118 golden case count");
requireEqual(cp118Matrix.base_fixture_count, 4, "CP00-118 base fixture count");
requireEqual(cp118HermesPacket.hermes_gate, "H02", "CP00-118 Hermes packet gate");
requireEqual(cp118HermesPacket.covered_unit_count, 150, "CP00-118 Hermes packet covered_unit_count");
requireEqual(cp118ClaudePacket.model, "claude-opus-4-8", "CP00-118 Claude packet model");
requireEqual(cp118ClaudePacket.effort, "max", "CP00-118 Claude packet effort");
requireTrue(cp118ClaudePacket.read_only, "CP00-118 Claude packet read_only");
requireTrue(cp118ClaudePacket.exactly_one_valid_pack_review_required, "CP00-118 Claude packet exactly_one_valid_pack_review_required");

const cp118CrossTenantCase = cp118Matrix.golden_cases.find((item) => item.case_id === "cross_tenant_case");
const cp118AiAnalyticsCase = cp118Matrix.golden_cases.find((item) => item.case_id === "ai_retrieval_or_analytics_case");
requireTrue(cp118CrossTenantCase?.tenant_drift_blocked, "CP00-118 cross tenant case tenant_drift_blocked");
requireEqual(cp118CrossTenantCase?.expected_effect, "deny", "CP00-118 cross tenant case expected effect");
requireEqual(cp118AiAnalyticsCase?.expected_effect, "blocked_reference_only", "CP00-118 AI analytics expected effect");
requireFalse(cp118AiAnalyticsCase?.executes_ai_retrieval, "CP00-118 AI analytics executes_ai_retrieval");
requireFalse(cp118AiAnalyticsCase?.executes_analytics_query, "CP00-118 AI analytics executes_analytics_query");
for (const profile of [...cp118Matrix.ui_terminal_surfaces, ...cp118Matrix.golden_cases, ...cp118Matrix.base_fixtures]) {
  requireTrue(profile.synthetic_only, "CP00-118 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-118 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-118 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-118 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-118 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-118 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-118 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-118 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-118 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-118 profile acquires_locks");
  requireFalse(profile.executes_export_download, "CP00-118 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-118 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-118 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-118 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-118 profile grants_human_approval");
}
requireEqual(cp118Handoff.next_pack_id, "CP00-119", "CP00-118 handoff.next_pack_id");
requireEqual(cp118Handoff.next_subphase_id, "RP02.P05.M04.S08", "CP00-118 handoff.next_subphase_id");
requireEqual(
  cp118Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-118 handoff.hrx_embedded_boundary",
);
requireTrue(cp118Coverage.valid, `CP00-118 coverage valid: ${cp118Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp118PlanPack, createPermissionKernelCp118CoveredUnitIds(), "CP00-118");
requireEqual(
  contract.fixture_workflow_binding_pack?.pack_id,
  PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
  "fixture_workflow_binding_pack.pack_id",
);
requireEqual(
  contract.fixture_workflow_binding_pack?.contract_id,
  PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.contract_id,
  "fixture_workflow_binding_pack.contract_id",
);
requireEqual(
  contract.fixture_workflow_binding_pack?.upstream_ui_synthetic_fixture_golden_case_pack_id,
  "CP00-118",
  "fixture_workflow_binding_pack.upstream_ui_synthetic_fixture_golden_case_pack_id",
);
requireTrue(contract.fixture_workflow_binding_pack?.synthetic_only, "fixture_workflow_binding_pack.synthetic_only");
requireTrue(contract.fixture_workflow_binding_pack?.risk_b_workflow_binding, "fixture_workflow_binding_pack.risk_b_workflow_binding");
requireTrue(
  contract.fixture_workflow_binding_pack?.metadata_only_fixture_workflow,
  "fixture_workflow_binding_pack.metadata_only_fixture_workflow",
);
requireFalse(contract.fixture_workflow_binding_pack?.runtime_ui_route_added, "fixture_workflow_binding_pack.runtime_ui_route_added");
requireFalse(contract.fixture_workflow_binding_pack?.runtime_api_route_added, "fixture_workflow_binding_pack.runtime_api_route_added");
requireEqual(
  contract.fixture_workflow_binding_pack?.edge_case_unit_count,
  13,
  "fixture_workflow_binding_pack.edge_case_unit_count",
);
requireEqual(
  contract.fixture_workflow_binding_pack?.permission_audit_binding_unit_count,
  22,
  "fixture_workflow_binding_pack.permission_audit_binding_unit_count",
);
requireEqual(
  contract.fixture_workflow_binding_pack?.synthetic_fixture_opening_unit_count,
  5,
  "fixture_workflow_binding_pack.synthetic_fixture_opening_unit_count",
);
requireEqual(
  contract.fixture_workflow_binding_pack?.inherited_ui_synthetic_fixture_golden_case_contract_id,
  PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.contract_id,
  "fixture_workflow_binding_pack.inherited_ui_synthetic_fixture_golden_case_contract_id",
);
requireEqual(contract.fixture_workflow_binding_pack?.next_pack_id, "CP00-120", "fixture_workflow_binding_pack.next_pack_id");
requireEqual(
  contract.fixture_workflow_binding_pack?.next_subphase_id,
  "RP02.P05.M06.S06",
  "fixture_workflow_binding_pack.next_subphase_id",
);
for (const caseId of PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.workflow_case_ids) {
  requireIncludes(contract.fixture_workflow_binding_case_ids ?? [], caseId, "fixture_workflow_binding_case_ids");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.public_exports) {
  requireIncludes(contract.fixture_workflow_binding_public_exports ?? [], exportedSymbol, "fixture_workflow_binding_public_exports");
}
for (const field of PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.fixture_workflow_binding_hidden_source_fields ?? [], field, "fixture_workflow_binding_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source fixture_workflow_binding_no_write_attestation.${flag}`);
  requireFalse(contract.fixture_workflow_binding_no_write_attestation?.[flag], `contract fixture_workflow_binding_no_write_attestation.${flag}`);
}
requireEqual(cp119Catalog.length, 40, "CP00-119 catalog length");
requireEqual(cp119Manifest.covered_unit_count, 40, "CP00-119 manifest covered_unit_count");
requireEqual(cp119Manifest.first_unit_id, "RP02.P05.M04.S08", "CP00-119 first_unit_id");
requireEqual(cp119Manifest.last_unit_id, "RP02.P05.M06.S05", "CP00-119 last_unit_id");
requireEqual(cp119Manifest.covered_micro_phase_count, 3, "CP00-119 covered micro phase count");
requireEqual(cp119Manifest.area_counts.permission_fixture_workflow_edge_cases, 13, "CP00-119 edge-case area count");
requireEqual(
  cp119Manifest.area_counts.permission_fixture_permission_audit_binding,
  22,
  "CP00-119 permission audit binding area count",
);
requireEqual(cp119Manifest.area_counts.permission_fixture_synthetic_fixture_opening, 5, "CP00-119 synthetic opening area count");
requireEqual(cp119Manifest.deliverable_counts.implementation, 14, "CP00-119 implementation deliverable count");
requireEqual(cp119Manifest.deliverable_counts.security_audit, 4, "CP00-119 security_audit deliverable count");
requireEqual(cp119Manifest.deliverable_counts.fixture, 13, "CP00-119 fixture deliverable count");
requireEqual(cp119Manifest.deliverable_counts.test, 6, "CP00-119 test deliverable count");
requireEqual(cp119Manifest.deliverable_counts.hermes_evidence, 2, "CP00-119 hermes_evidence deliverable count");
requireEqual(cp119Manifest.deliverable_counts.claude_review, 1, "CP00-119 claude_review deliverable count");
requireEqual(cp119Matrix.inherited_golden_case_count, 9, "CP00-119 inherited golden case count");
requireEqual(cp119Matrix.inherited_base_fixture_count, 4, "CP00-119 inherited base fixture count");
requireEqual(cp119Matrix.workflow_case_count, 9, "CP00-119 workflow case count");
requireEqual(cp119Matrix.base_fixture_binding_count, 4, "CP00-119 base fixture binding count");
requireEqual(cp119HermesPacket.hermes_gate, "H02", "CP00-119 Hermes packet gate");
requireEqual(cp119HermesPacket.covered_unit_count, 40, "CP00-119 Hermes packet covered_unit_count");
requireEqual(cp119ClaudePacket.model, "claude-opus-4-8", "CP00-119 Claude packet model");
requireEqual(cp119ClaudePacket.effort, "max", "CP00-119 Claude packet effort");
requireTrue(cp119ClaudePacket.read_only, "CP00-119 Claude packet read_only");
requireTrue(cp119ClaudePacket.exactly_one_valid_pack_review_required, "CP00-119 Claude packet exactly_one_valid_pack_review_required");

const cp119PrimaryCase = runPermissionKernelCp119FixtureWorkflowCase("primary_golden_case");
const cp119SecondaryCase = runPermissionKernelCp119FixtureWorkflowCase("secondary_golden_case");
const cp119ReviewCase = runPermissionKernelCp119FixtureWorkflowCase("review_required_case");
const cp119DeniedCase = runPermissionKernelCp119FixtureWorkflowCase("denied_case");
const cp119CrossTenantCase = runPermissionKernelCp119FixtureWorkflowCase("cross_tenant_case");
const cp119MissingContextCase = runPermissionKernelCp119FixtureWorkflowCase("missing_context_case");
const cp119SecurityTrimCase = runPermissionKernelCp119FixtureWorkflowCase("security_trimming_case");
const cp119AiAnalyticsCase = runPermissionKernelCp119FixtureWorkflowCase("ai_retrieval_or_analytics_case");
requireEqual(cp119PrimaryCase.status, "completed_metadata_only", "CP00-119 primary case status");
requireEqual(cp119SecondaryCase.reason, "object_acl_allow", "CP00-119 secondary case reason");
requireEqual(cp119ReviewCase.status, "review_required_routing", "CP00-119 review case status");
requireEqual(cp119DeniedCase.status, "blocked_claim_output", "CP00-119 denied case status");
requireEqual(cp119CrossTenantCase.reason, "tenant_boundary_precheck_failed", "CP00-119 cross-tenant case reason");
requireFalse(cp119CrossTenantCase.evaluator_invoked, "CP00-119 cross-tenant evaluator_invoked");
requireEqual(cp119MissingContextCase.reason, "matter_trace_precheck_failed", "CP00-119 missing-context case reason");
requireEqual(cp119SecurityTrimCase.trimmed_result_ids?.join(","), "d_cp119_document", "CP00-119 security trim ids");
requireFalse(cp119SecurityTrimCase.unauthorized_count_exposed, "CP00-119 security trim unauthorized_count_exposed");
requireEqual(cp119AiAnalyticsCase.status, "blocked_ai_analytics_boundary", "CP00-119 AI analytics status");
requireFalse(cp119AiAnalyticsCase.executes_ai_retrieval, "CP00-119 AI analytics executes_ai_retrieval");
requireFalse(cp119AiAnalyticsCase.executes_analytics_query, "CP00-119 AI analytics executes_analytics_query");
for (const profile of [...cp119Matrix.workflow_cases, ...cp119Matrix.base_fixture_bindings]) {
  requireTrue(profile.synthetic_only, "CP00-119 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-119 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-119 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-119 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-119 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-119 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-119 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-119 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-119 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-119 profile acquires_locks");
  requireFalse(profile.executes_rollback, "CP00-119 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-119 profile executes_retry");
  requireFalse(profile.executes_export_download, "CP00-119 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-119 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-119 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-119 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-119 profile grants_human_approval");
  requireFalse(profile.implements_ldip, "CP00-119 profile implements_ldip");
}
requireEqual(cp119Handoff.next_pack_id, "CP00-120", "CP00-119 handoff.next_pack_id");
requireEqual(cp119Handoff.next_subphase_id, "RP02.P05.M06.S06", "CP00-119 handoff.next_subphase_id");
requireEqual(
  cp119Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-119 handoff.hrx_embedded_boundary",
);
requireTrue(cp119Coverage.valid, `CP00-119 coverage valid: ${cp119Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp119PlanPack, createPermissionKernelCp119CoveredUnitIds(), "CP00-119");
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.pack_id,
  PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
  "fixture_evidence_permission_matrix_pack.pack_id",
);
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.contract_id,
  PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.contract_id,
  "fixture_evidence_permission_matrix_pack.contract_id",
);
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.upstream_fixture_workflow_binding_pack_id,
  "CP00-119",
  "fixture_evidence_permission_matrix_pack.upstream_fixture_workflow_binding_pack_id",
);
requireTrue(
  contract.fixture_evidence_permission_matrix_pack?.synthetic_only,
  "fixture_evidence_permission_matrix_pack.synthetic_only",
);
requireTrue(
  contract.fixture_evidence_permission_matrix_pack?.risk_c_fixture_evidence_permission_matrix,
  "fixture_evidence_permission_matrix_pack.risk_c_fixture_evidence_permission_matrix",
);
requireTrue(
  contract.fixture_evidence_permission_matrix_pack?.metadata_only_permission_fixture_matrix,
  "fixture_evidence_permission_matrix_pack.metadata_only_permission_fixture_matrix",
);
requireFalse(
  contract.fixture_evidence_permission_matrix_pack?.runtime_ui_route_added,
  "fixture_evidence_permission_matrix_pack.runtime_ui_route_added",
);
requireFalse(
  contract.fixture_evidence_permission_matrix_pack?.runtime_api_route_added,
  "fixture_evidence_permission_matrix_pack.runtime_api_route_added",
);
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.fixture_evidence_unit_count,
  85,
  "fixture_evidence_permission_matrix_pack.fixture_evidence_unit_count",
);
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.permission_matrix_unit_count,
  65,
  "fixture_evidence_permission_matrix_pack.permission_matrix_unit_count",
);
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.inherited_fixture_workflow_binding_contract_id,
  PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.contract_id,
  "fixture_evidence_permission_matrix_pack.inherited_fixture_workflow_binding_contract_id",
);
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.next_pack_id,
  "CP00-121",
  "fixture_evidence_permission_matrix_pack.next_pack_id",
);
requireEqual(
  contract.fixture_evidence_permission_matrix_pack?.next_subphase_id,
  "RP02.P06.M03.S15",
  "fixture_evidence_permission_matrix_pack.next_subphase_id",
);
for (const bindingId of PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.decision_binding_ids) {
  requireIncludes(contract.fixture_evidence_permission_matrix_decision_binding_ids ?? [], bindingId, "fixture_evidence_permission_matrix_decision_binding_ids");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.public_exports) {
  requireIncludes(contract.fixture_evidence_permission_matrix_public_exports ?? [], exportedSymbol, "fixture_evidence_permission_matrix_public_exports");
}
for (const field of PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.fixture_evidence_permission_matrix_hidden_source_fields ?? [], field, "fixture_evidence_permission_matrix_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source fixture_evidence_permission_matrix_no_write_attestation.${flag}`);
  requireFalse(
    contract.fixture_evidence_permission_matrix_no_write_attestation?.[flag],
    `contract fixture_evidence_permission_matrix_no_write_attestation.${flag}`,
  );
}
requireEqual(cp120Catalog.length, 150, "CP00-120 catalog length");
requireEqual(cp120Manifest.covered_unit_count, 150, "CP00-120 manifest covered_unit_count");
requireEqual(cp120Manifest.first_unit_id, "RP02.P05.M06.S06", "CP00-120 first_unit_id");
requireEqual(cp120Manifest.last_unit_id, "RP02.P06.M03.S14", "CP00-120 last_unit_id");
requireEqual(cp120Manifest.covered_micro_phase_count, 9, "CP00-120 covered micro phase count");
requireEqual(cp120Manifest.area_counts.permission_fixture_evidence_review_closeout, 85, "CP00-120 fixture evidence area count");
requireEqual(cp120Manifest.area_counts.permission_matrix_scope_inventory, 11, "CP00-120 matrix scope area count");
requireEqual(cp120Manifest.area_counts.permission_matrix_contract_draft, 20, "CP00-120 matrix contract area count");
requireEqual(cp120Manifest.area_counts.permission_matrix_type_shape_definition, 20, "CP00-120 matrix type area count");
requireEqual(
  cp120Manifest.area_counts.permission_matrix_primary_implementation_opening,
  14,
  "CP00-120 matrix implementation area count",
);
requireEqual(cp120Manifest.deliverable_counts.fixture, 29, "CP00-120 fixture deliverable count");
requireEqual(cp120Manifest.deliverable_counts.claude_review, 8, "CP00-120 claude_review deliverable count");
requireEqual(cp120Manifest.deliverable_counts.implementation, 59, "CP00-120 implementation deliverable count");
requireEqual(cp120Manifest.deliverable_counts.security_audit, 22, "CP00-120 security_audit deliverable count");
requireEqual(cp120Manifest.deliverable_counts.test, 16, "CP00-120 test deliverable count");
requireEqual(cp120Manifest.deliverable_counts.hermes_evidence, 4, "CP00-120 hermes_evidence deliverable count");
requireEqual(cp120Manifest.deliverable_counts.ui, 12, "CP00-120 ui deliverable count");
requireEqual(cp120Matrix.inherited_workflow_case_count, 9, "CP00-120 inherited workflow case count");
requireEqual(cp120Matrix.inherited_base_fixture_binding_count, 4, "CP00-120 inherited base fixture binding count");
requireEqual(cp120Matrix.fixture_evidence_record_count, 5, "CP00-120 fixture evidence record count");
requireEqual(cp120Matrix.permission_decision_binding_count, 19, "CP00-120 permission decision binding count");
requireEqual(cp120HermesPacket.hermes_gate, "H02", "CP00-120 Hermes packet gate");
requireEqual(cp120HermesPacket.covered_unit_count, 150, "CP00-120 Hermes packet covered_unit_count");
requireEqual(cp120ClaudePacket.model, "claude-opus-4-8", "CP00-120 Claude packet model");
requireEqual(cp120ClaudePacket.effort, "max", "CP00-120 Claude packet effort");
requireTrue(cp120ClaudePacket.read_only, "CP00-120 Claude packet read_only");
requireTrue(cp120ClaudePacket.exactly_one_valid_pack_review_required, "CP00-120 Claude packet exactly_one_valid_pack_review_required");

const cp120ViewBinding = runPermissionKernelCp120PermissionDecisionBinding("view_decision_binding");
const cp120SearchBinding = runPermissionKernelCp120PermissionDecisionBinding("search_decision_binding");
const cp120MutationBinding = runPermissionKernelCp120PermissionDecisionBinding("mutation_decision_binding");
const cp120ExportBinding = runPermissionKernelCp120PermissionDecisionBinding("export_download_decision_binding");
const cp120ShareBinding = runPermissionKernelCp120PermissionDecisionBinding("share_decision_binding");
const cp120AiBinding = runPermissionKernelCp120PermissionDecisionBinding("ai_retrieval_decision_binding");
const cp120LegalHoldBinding = runPermissionKernelCp120PermissionDecisionBinding("legal_hold_interaction");
const cp120EthicalWallBinding = runPermissionKernelCp120PermissionDecisionBinding("ethical_wall_interaction");
const cp120ObjectAclBinding = runPermissionKernelCp120PermissionDecisionBinding("object_acl_interaction");
const cp120ReviewBinding = runPermissionKernelCp120PermissionDecisionBinding("review_required_route");
const cp120ApprovalBinding = runPermissionKernelCp120PermissionDecisionBinding("approval_required_route");
const cp120DenyOverAllowBinding = runPermissionKernelCp120PermissionDecisionBinding("deny_over_allow_check");
const cp120AuditExpectationBinding = runPermissionKernelCp120PermissionDecisionBinding("audit_event_expectation");
const cp120PermissionFixtureBinding = runPermissionKernelCp120PermissionDecisionBinding("permission_fixture");
requireEqual(cp120ViewBinding.status, "completed_metadata_only", "CP00-120 view binding status");
requireEqual(cp120SearchBinding.trimmed_result_ids?.join(","), "d_cp120_document", "CP00-120 search trim ids");
requireEqual(cp120MutationBinding.status, "approval_required_routing", "CP00-120 mutation binding status");
requireEqual(cp120ExportBinding.status, "review_required_routing", "CP00-120 export binding status");
requireFalse(cp120ExportBinding.executes_export_download, "CP00-120 export binding executes_export_download");
requireEqual(cp120ShareBinding.status, "approval_required_routing", "CP00-120 share binding status");
requireFalse(cp120ShareBinding.executes_external_share, "CP00-120 share binding executes_external_share");
requireEqual(cp120AiBinding.status, "blocked_ai_retrieval_boundary", "CP00-120 AI binding status");
requireFalse(cp120AiBinding.executes_ai_retrieval, "CP00-120 AI binding executes_ai_retrieval");
requireEqual(cp120LegalHoldBinding.reason, "legal_hold", "CP00-120 legal hold reason");
requireEqual(cp120EthicalWallBinding.reason, "ethical_wall", "CP00-120 ethical wall reason");
requireEqual(cp120ObjectAclBinding.reason, "object_acl_deny", "CP00-120 object ACL reason");
requireEqual(cp120ReviewBinding.status, "review_required_routing", "CP00-120 review binding status");
requireEqual(cp120ApprovalBinding.status, "approval_required_routing", "CP00-120 approval binding status");
requireEqual(cp120DenyOverAllowBinding.decision?.effect, "deny", "CP00-120 deny-over-allow effect");
requireFalse(cp120AuditExpectationBinding.audit_event_expectation?.emitted_to_audit_ledger, "CP00-120 audit expectation emitted");
requireFalse(cp120PermissionFixtureBinding.permission_fixture?.persisted, "CP00-120 permission fixture persisted");
for (const profile of [...cp120Matrix.fixture_evidence_records, ...cp120Matrix.permission_decision_bindings]) {
  requireTrue(profile.synthetic_only, "CP00-120 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-120 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-120 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-120 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-120 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-120 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-120 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-120 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-120 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-120 profile acquires_locks");
  requireFalse(profile.executes_rollback, "CP00-120 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-120 profile executes_retry");
  requireFalse(profile.executes_export_download, "CP00-120 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-120 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-120 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-120 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-120 profile grants_human_approval");
  requireFalse(profile.implements_ldip, "CP00-120 profile implements_ldip");
}
requireEqual(cp120Handoff.next_pack_id, "CP00-121", "CP00-120 handoff.next_pack_id");
requireEqual(cp120Handoff.next_subphase_id, "RP02.P06.M03.S15", "CP00-120 handoff.next_subphase_id");
requireEqual(
  cp120Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-120 handoff.hrx_embedded_boundary",
);
requireTrue(cp120Coverage.valid, `CP00-120 coverage valid: ${cp120Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp120PlanPack, createPermissionKernelCp120CoveredUnitIds(), "CP00-120");

requireEqual(
  contract.permission_matrix_risk_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
  "permission_matrix_risk_boundary_pack.pack_id",
);
requireEqual(
  contract.permission_matrix_risk_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.contract_id,
  "permission_matrix_risk_boundary_pack.contract_id",
);
requireEqual(
  contract.permission_matrix_risk_boundary_pack?.upstream_fixture_evidence_permission_matrix_pack_id,
  "CP00-120",
  "permission_matrix_risk_boundary_pack.upstream_fixture_evidence_permission_matrix_pack_id",
);
requireEqual(
  contract.permission_matrix_risk_boundary_pack?.inherited_fixture_evidence_permission_matrix_contract_id,
  PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.contract_id,
  "permission_matrix_risk_boundary_pack.inherited_fixture_evidence_permission_matrix_contract_id",
);
requireTrue(contract.permission_matrix_risk_boundary_pack?.synthetic_only, "permission_matrix_risk_boundary_pack.synthetic_only");
requireTrue(
  contract.permission_matrix_risk_boundary_pack?.risk_a_permission_boundary,
  "permission_matrix_risk_boundary_pack.risk_a_permission_boundary",
);
requireFalse(
  contract.permission_matrix_risk_boundary_pack?.runtime_ui_route_added,
  "permission_matrix_risk_boundary_pack.runtime_ui_route_added",
);
requireFalse(
  contract.permission_matrix_risk_boundary_pack?.runtime_api_route_added,
  "permission_matrix_risk_boundary_pack.runtime_api_route_added",
);
requireEqual(
  contract.permission_matrix_risk_boundary_pack?.next_pack_id,
  "CP00-122",
  "permission_matrix_risk_boundary_pack.next_pack_id",
);
requireEqual(
  contract.permission_matrix_risk_boundary_pack?.next_subphase_id,
  "RP02.P06.M04.S03",
  "permission_matrix_risk_boundary_pack.next_subphase_id",
);
for (const caseId of PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.boundary_case_ids) {
  requireIncludes(contract.permission_matrix_risk_boundary_case_ids ?? [], caseId, "permission_matrix_risk_boundary_case_ids");
}
for (const exportedSymbol of PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.public_exports) {
  requireIncludes(contract.permission_matrix_risk_boundary_public_exports ?? [], exportedSymbol, "permission_matrix_risk_boundary_public_exports");
}
for (const field of PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.permission_matrix_risk_boundary_hidden_source_fields ?? [], field, "permission_matrix_risk_boundary_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source permission_matrix_risk_boundary_no_write_attestation.${flag}`);
  requireFalse(
    contract.permission_matrix_risk_boundary_no_write_attestation?.[flag],
    `contract permission_matrix_risk_boundary_no_write_attestation.${flag}`,
  );
}
requireEqual(cp121Catalog.length, 10, "CP00-121 catalog length");
requireEqual(cp121Manifest.covered_unit_count, 10, "CP00-121 manifest covered_unit_count");
requireEqual(cp121Manifest.first_unit_id, "RP02.P06.M03.S15", "CP00-121 first_unit_id");
requireEqual(cp121Manifest.last_unit_id, "RP02.P06.M04.S02", "CP00-121 last_unit_id");
requireEqual(cp121Manifest.covered_micro_phase_count, 2, "CP00-121 covered micro phase count");
requireEqual(cp121Manifest.phase_counts["RP02.P06.M03"], 8, "CP00-121 RP02.P06.M03 count");
requireEqual(cp121Manifest.phase_counts["RP02.P06.M04"], 2, "CP00-121 RP02.P06.M04 count");
requireEqual(cp121Manifest.deliverable_counts.ui, 1, "CP00-121 ui deliverable count");
requireEqual(cp121Manifest.deliverable_counts.security_audit, 4, "CP00-121 security_audit deliverable count");
requireEqual(cp121Manifest.deliverable_counts.test, 4, "CP00-121 test deliverable count");
requireEqual(cp121Manifest.deliverable_counts.implementation, 1, "CP00-121 implementation deliverable count");
requireEqual(cp121Matrix.inherited_permission_decision_binding_count, 19, "CP00-121 inherited decision binding count");
requireEqual(cp121Matrix.inherited_approval_route_status, "approval_required_routing", "CP00-121 inherited approval route status");
requireEqual(cp121Matrix.boundary_case_count, 10, "CP00-121 boundary case count");
requireEqual(cp121HermesPacket.hermes_gate, "H02", "CP00-121 Hermes packet gate");
requireEqual(cp121HermesPacket.covered_unit_count, 10, "CP00-121 Hermes packet covered_unit_count");
requireEqual(cp121ClaudePacket.model, "claude-opus-4-8", "CP00-121 Claude packet model");
requireEqual(cp121ClaudePacket.effort, "max", "CP00-121 Claude packet effort");
requireTrue(cp121ClaudePacket.read_only, "CP00-121 Claude packet read_only");
requireTrue(cp121ClaudePacket.exactly_one_valid_pack_review_required, "CP00-121 Claude packet exactly_one_valid_pack_review_required");

const cp121ApprovalRoute = runPermissionKernelCp121PermissionMatrixBoundaryCase("approval_required_route");
const cp121SecurityTrim = runPermissionKernelCp121PermissionMatrixBoundaryCase("security_trimming_proof");
const cp121AuditExpectation = runPermissionKernelCp121PermissionMatrixBoundaryCase("audit_event_expectation");
const cp121PermissionFixture = runPermissionKernelCp121PermissionMatrixBoundaryCase("permission_fixture");
const cp121AllowedTest = runPermissionKernelCp121PermissionMatrixBoundaryCase("allowed_test");
const cp121DeniedTest = runPermissionKernelCp121PermissionMatrixBoundaryCase("denied_test");
const cp121CrossTenantTest = runPermissionKernelCp121PermissionMatrixBoundaryCase("cross_tenant_test");
const cp121LeakPrevention = runPermissionKernelCp121PermissionMatrixBoundaryCase("leak_prevention_test");
const cp121MatrixRow = runPermissionKernelCp121PermissionMatrixBoundaryCase("permission_matrix_row");
const cp121ViewBinding = runPermissionKernelCp121PermissionMatrixBoundaryCase("view_decision_binding");
requireEqual(cp121ApprovalRoute.status, "approval_required_routing", "CP00-121 approval route status");
requireFalse(cp121ApprovalRoute.grants_human_approval, "CP00-121 approval route grants_human_approval");
requireEqual(cp121SecurityTrim.trimmed_result_ids?.join(","), "d_cp121_document", "CP00-121 security trim ids");
requireEqual(cp121SecurityTrim.rendered_result_count, 1, "CP00-121 security trim rendered_result_count");
requireFalse(cp121SecurityTrim.hidden_fields_rendered, "CP00-121 security trim hidden_fields_rendered");
requireFalse(cp121AuditExpectation.audit_event_expectation?.emitted_to_audit_ledger, "CP00-121 audit expectation emitted");
requireFalse(cp121PermissionFixture.permission_fixture?.persisted, "CP00-121 permission fixture persisted");
requireEqual(cp121AllowedTest.decision?.effect, "allow", "CP00-121 allowed test effect");
requireEqual(cp121DeniedTest.decision?.effect, "deny", "CP00-121 denied test effect");
requireEqual(cp121CrossTenantTest.reason, "cross_tenant_deny", "CP00-121 cross-tenant reason");
requireEqual(
  cp121CrossTenantTest.decision?.audit_hint?.object_id,
  "redacted_cross_tenant_object",
  "CP00-121 cross-tenant redacted object",
);
requireFalse(cp121LeakPrevention.unauthorized_count_exposed, "CP00-121 leak prevention unauthorized_count_exposed");
requireFalse(cp121LeakPrevention.hidden_field_names_exposed, "CP00-121 leak prevention hidden_field_names_exposed");
requireFalse(cp121MatrixRow.matrix_row?.persisted, "CP00-121 matrix row persisted");
requireEqual(cp121ViewBinding.status, "completed_metadata_only", "CP00-121 view binding status");
requireEqual(cp121ViewBinding.matched_rule_id, "cp121_allow_view", "CP00-121 view matched_rule_id");
for (const profile of cp121Matrix.boundary_case_results) {
  requireTrue(profile.synthetic_only, "CP00-121 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-121 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-121 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-121 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-121 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-121 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-121 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-121 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-121 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-121 profile acquires_locks");
  requireFalse(profile.executes_rollback, "CP00-121 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-121 profile executes_retry");
  requireFalse(profile.executes_export_download, "CP00-121 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-121 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-121 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-121 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-121 profile grants_human_approval");
  requireFalse(profile.implements_ldip, "CP00-121 profile implements_ldip");
}
requireEqual(cp121Handoff.next_pack_id, "CP00-122", "CP00-121 handoff.next_pack_id");
requireEqual(cp121Handoff.next_subphase_id, "RP02.P06.M04.S03", "CP00-121 handoff.next_subphase_id");
requireEqual(
  cp121Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-121 handoff.hrx_embedded_boundary",
);
requireTrue(cp121Coverage.valid, `CP00-121 coverage valid: ${cp121Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp121PlanPack, createPermissionKernelCp121CoveredUnitIds(), "CP00-121");

requireEqual(
  contract.permission_matrix_workflow_binding_pack?.pack_id,
  PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
  "permission_matrix_workflow_binding_pack.pack_id",
);
requireEqual(
  contract.permission_matrix_workflow_binding_pack?.contract_id,
  PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT.contract_id,
  "permission_matrix_workflow_binding_pack.contract_id",
);
requireEqual(
  contract.permission_matrix_workflow_binding_pack?.upstream_permission_matrix_risk_boundary_pack_id,
  "CP00-121",
  "permission_matrix_workflow_binding_pack.upstream_permission_matrix_risk_boundary_pack_id",
);
requireEqual(
  contract.permission_matrix_workflow_binding_pack?.inherited_permission_matrix_risk_boundary_contract_id,
  PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.contract_id,
  "permission_matrix_workflow_binding_pack.inherited_permission_matrix_risk_boundary_contract_id",
);
requireTrue(contract.permission_matrix_workflow_binding_pack?.synthetic_only, "permission_matrix_workflow_binding_pack.synthetic_only");
requireTrue(
  contract.permission_matrix_workflow_binding_pack?.risk_b_permission_matrix_workflow,
  "permission_matrix_workflow_binding_pack.risk_b_permission_matrix_workflow",
);
requireFalse(
  contract.permission_matrix_workflow_binding_pack?.runtime_ui_route_added,
  "permission_matrix_workflow_binding_pack.runtime_ui_route_added",
);
requireFalse(
  contract.permission_matrix_workflow_binding_pack?.runtime_api_route_added,
  "permission_matrix_workflow_binding_pack.runtime_api_route_added",
);
requireEqual(
  contract.permission_matrix_workflow_binding_pack?.next_pack_id,
  "CP00-123",
  "permission_matrix_workflow_binding_pack.next_pack_id",
);
requireEqual(
  contract.permission_matrix_workflow_binding_pack?.next_subphase_id,
  "RP02.P06.M05.S21",
  "permission_matrix_workflow_binding_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT.public_exports) {
  requireIncludes(contract.permission_matrix_workflow_binding_public_exports ?? [], exportedSymbol, "permission_matrix_workflow_binding_public_exports");
}
for (const field of PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.permission_matrix_workflow_binding_hidden_source_fields ?? [], field, "permission_matrix_workflow_binding_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source permission_matrix_workflow_binding_no_write_attestation.${flag}`);
  requireFalse(
    contract.permission_matrix_workflow_binding_no_write_attestation?.[flag],
    `contract permission_matrix_workflow_binding_no_write_attestation.${flag}`,
  );
}
requireEqual(cp122Catalog.length, 40, "CP00-122 catalog length");
requireEqual(cp122Manifest.covered_unit_count, 40, "CP00-122 manifest covered_unit_count");
requireEqual(cp122Manifest.first_unit_id, "RP02.P06.M04.S03", "CP00-122 first_unit_id");
requireEqual(cp122Manifest.last_unit_id, "RP02.P06.M05.S20", "CP00-122 last_unit_id");
requireEqual(cp122Manifest.covered_micro_phase_count, 2, "CP00-122 covered micro phase count");
requireEqual(cp122Manifest.phase_counts["RP02.P06.M04"], 20, "CP00-122 RP02.P06.M04 count");
requireEqual(cp122Manifest.phase_counts["RP02.P06.M05"], 20, "CP00-122 RP02.P06.M05 count");
requireEqual(cp122Manifest.area_counts.permission_matrix_secondary_workflow, 20, "CP00-122 secondary workflow area count");
requireEqual(cp122Manifest.area_counts.permission_matrix_permission_audit_binding, 20, "CP00-122 permission audit area count");
requireEqual(cp122Manifest.deliverable_counts.implementation, 15, "CP00-122 implementation deliverable count");
requireEqual(cp122Manifest.deliverable_counts.security_audit, 9, "CP00-122 security_audit deliverable count");
requireEqual(cp122Manifest.deliverable_counts.ui, 8, "CP00-122 ui deliverable count");
requireEqual(cp122Manifest.deliverable_counts.claude_review, 2, "CP00-122 claude_review deliverable count");
requireEqual(cp122Manifest.deliverable_counts.test, 6, "CP00-122 test deliverable count");
requireEqual(cp122Matrix.inherited_boundary_case_count, 10, "CP00-122 inherited boundary case count");
requireEqual(cp122Matrix.inherited_approval_route_status, "approval_required_routing", "CP00-122 inherited approval route status");
requireEqual(cp122Matrix.workflow_case_count, 40, "CP00-122 workflow case count");
requireEqual(cp122Matrix.phase_result_counts.secondary_workflow, 20, "CP00-122 secondary workflow result count");
requireEqual(cp122Matrix.phase_result_counts.permission_audit_binding, 20, "CP00-122 permission audit result count");
requireEqual(cp122HermesPacket.hermes_gate, "H02", "CP00-122 Hermes packet gate");
requireEqual(cp122HermesPacket.covered_unit_count, 40, "CP00-122 Hermes packet covered_unit_count");
requireEqual(cp122ClaudePacket.model, "claude-opus-4-8", "CP00-122 Claude packet model");
requireEqual(cp122ClaudePacket.effort, "max", "CP00-122 Claude packet effort");
requireTrue(cp122ClaudePacket.read_only, "CP00-122 Claude packet read_only");
requireTrue(cp122ClaudePacket.exactly_one_valid_pack_review_required, "CP00-122 Claude packet exactly_one_valid_pack_review_required");

for (const prefix of ["secondary_workflow", "permission_audit_binding"]) {
  const search = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.search_decision_binding`);
  const mutation = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.mutation_decision_binding`);
  const exportDownload = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.export_download_decision_binding`);
  const share = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.share_decision_binding`);
  const ai = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.ai_retrieval_decision_binding`);
  const auditHint = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.audit_hint_fields`);
  const matchedRule = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.matched_rule_capture`);
  const denyOverAllow = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.deny_over_allow_check`);
  const legalHold = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.legal_hold_interaction`);
  const ethicalWall = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.ethical_wall_interaction`);
  const objectAcl = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.object_acl_interaction`);
  const review = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.review_required_route`);
  const approval = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.approval_required_route`);
  const trim = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.security_trimming_proof`);
  const auditExpectation = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.audit_event_expectation`);
  const fixture = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.permission_fixture`);
  const allowed = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.allowed_test`);
  const denied = runPermissionKernelCp122PermissionMatrixWorkflowCase(`${prefix}.denied_test`);
  requireEqual(search.trimmed_result_ids?.join(","), "d_cp122_document", `CP00-122 ${prefix} search trim ids`);
  requireFalse(search.hidden_fields_rendered, `CP00-122 ${prefix} search hidden_fields_rendered`);
  requireEqual(mutation.status, "approval_required_routing", `CP00-122 ${prefix} mutation status`);
  requireEqual(exportDownload.status, "review_required_routing", `CP00-122 ${prefix} export status`);
  requireFalse(exportDownload.executes_export_download, `CP00-122 ${prefix} export executes_export_download`);
  requireEqual(share.status, "approval_required_routing", `CP00-122 ${prefix} share status`);
  requireFalse(share.executes_external_share, `CP00-122 ${prefix} share executes_external_share`);
  requireEqual(ai.status, "blocked_ai_retrieval_boundary", `CP00-122 ${prefix} AI status`);
  requireFalse(ai.executes_ai_retrieval, `CP00-122 ${prefix} AI executes_ai_retrieval`);
  requireFalse(auditHint.audit_event_expectation?.emitted_to_audit_ledger, `CP00-122 ${prefix} audit hint emitted`);
  requireEqual(matchedRule.decision?.effect, "allow", `CP00-122 ${prefix} matched rule effect`);
  requireEqual(denyOverAllow.decision?.effect, "deny", `CP00-122 ${prefix} deny-over-allow effect`);
  requireEqual(legalHold.reason, "legal_hold", `CP00-122 ${prefix} legal hold reason`);
  requireEqual(ethicalWall.reason, "ethical_wall", `CP00-122 ${prefix} ethical wall reason`);
  requireEqual(objectAcl.reason, "object_acl_deny", `CP00-122 ${prefix} object ACL reason`);
  requireEqual(review.status, "review_required_routing", `CP00-122 ${prefix} review status`);
  requireEqual(approval.status, "approval_required_routing", `CP00-122 ${prefix} approval status`);
  requireEqual(trim.trimmed_result_ids?.join(","), "d_cp122_document", `CP00-122 ${prefix} trim proof ids`);
  requireFalse(auditExpectation.audit_event_expectation?.emitted_to_audit_ledger, `CP00-122 ${prefix} audit expectation emitted`);
  requireFalse(fixture.permission_fixture?.persisted, `CP00-122 ${prefix} fixture persisted`);
  requireEqual(allowed.decision?.effect, "allow", `CP00-122 ${prefix} allowed effect`);
  requireEqual(denied.decision?.effect, "deny", `CP00-122 ${prefix} denied effect`);
}
const cp122CrossTenant = runPermissionKernelCp122PermissionMatrixWorkflowCase("secondary_workflow.cross_tenant_test");
const cp122Leak = runPermissionKernelCp122PermissionMatrixWorkflowCase("secondary_workflow.leak_prevention_test");
requireEqual(cp122CrossTenant.reason, "cross_tenant_deny", "CP00-122 cross-tenant reason");
requireEqual(
  cp122CrossTenant.decision?.audit_hint?.object_id,
  "redacted_cross_tenant_object",
  "CP00-122 cross-tenant redacted object",
);
requireFalse(cp122Leak.unauthorized_count_exposed, "CP00-122 leak prevention unauthorized_count_exposed");
requireFalse(cp122Leak.hidden_field_names_exposed, "CP00-122 leak prevention hidden_field_names_exposed");
for (const profile of cp122Matrix.workflow_case_results) {
  requireTrue(profile.synthetic_only, "CP00-122 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-122 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-122 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-122 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-122 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-122 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-122 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-122 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-122 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-122 profile acquires_locks");
  requireFalse(profile.executes_rollback, "CP00-122 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-122 profile executes_retry");
  requireFalse(profile.executes_export_download, "CP00-122 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-122 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-122 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-122 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-122 profile grants_human_approval");
  requireFalse(profile.implements_ldip, "CP00-122 profile implements_ldip");
}
requireEqual(cp122Handoff.next_pack_id, "CP00-123", "CP00-122 handoff.next_pack_id");
requireEqual(cp122Handoff.next_subphase_id, "RP02.P06.M05.S21", "CP00-122 handoff.next_subphase_id");
requireEqual(
  cp122Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-122 handoff.hrx_embedded_boundary",
);
requireTrue(cp122Coverage.valid, `CP00-122 coverage valid: ${cp122Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp122PlanPack, createPermissionKernelCp122CoveredUnitIds(), "CP00-122");

requireEqual(
  contract.permission_audit_terminal_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
  "permission_audit_terminal_boundary_pack.pack_id",
);
requireEqual(
  contract.permission_audit_terminal_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT.contract_id,
  "permission_audit_terminal_boundary_pack.contract_id",
);
requireEqual(
  contract.permission_audit_terminal_boundary_pack?.upstream_permission_matrix_workflow_binding_pack_id,
  "CP00-122",
  "permission_audit_terminal_boundary_pack.upstream_permission_matrix_workflow_binding_pack_id",
);
requireEqual(
  contract.permission_audit_terminal_boundary_pack?.inherited_permission_matrix_workflow_binding_contract_id,
  PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT.contract_id,
  "permission_audit_terminal_boundary_pack.inherited_permission_matrix_workflow_binding_contract_id",
);
requireTrue(contract.permission_audit_terminal_boundary_pack?.synthetic_only, "permission_audit_terminal_boundary_pack.synthetic_only");
requireTrue(
  contract.permission_audit_terminal_boundary_pack?.risk_a_permission_audit_terminal_boundary,
  "permission_audit_terminal_boundary_pack.risk_a_permission_audit_terminal_boundary",
);
requireFalse(
  contract.permission_audit_terminal_boundary_pack?.runtime_ui_route_added,
  "permission_audit_terminal_boundary_pack.runtime_ui_route_added",
);
requireFalse(
  contract.permission_audit_terminal_boundary_pack?.runtime_api_route_added,
  "permission_audit_terminal_boundary_pack.runtime_api_route_added",
);
requireEqual(
  contract.permission_audit_terminal_boundary_pack?.next_pack_id,
  "CP00-124",
  "permission_audit_terminal_boundary_pack.next_pack_id",
);
requireEqual(
  contract.permission_audit_terminal_boundary_pack?.next_subphase_id,
  "RP02.P06.M06.S09",
  "permission_audit_terminal_boundary_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT.public_exports) {
  requireIncludes(contract.permission_audit_terminal_boundary_public_exports ?? [], exportedSymbol, "permission_audit_terminal_boundary_public_exports");
}
for (const field of PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.permission_audit_terminal_boundary_hidden_source_fields ?? [], field, "permission_audit_terminal_boundary_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source permission_audit_terminal_boundary_no_write_attestation.${flag}`);
  requireFalse(
    contract.permission_audit_terminal_boundary_no_write_attestation?.[flag],
    `contract permission_audit_terminal_boundary_no_write_attestation.${flag}`,
  );
}
requireEqual(cp123Catalog.length, 10, "CP00-123 catalog length");
requireEqual(cp123Manifest.covered_unit_count, 10, "CP00-123 manifest covered_unit_count");
requireEqual(cp123Manifest.first_unit_id, "RP02.P06.M05.S21", "CP00-123 first_unit_id");
requireEqual(cp123Manifest.last_unit_id, "RP02.P06.M06.S08", "CP00-123 last_unit_id");
requireEqual(cp123Manifest.covered_micro_phase_count, 2, "CP00-123 covered micro phase count");
requireEqual(cp123Manifest.phase_counts["RP02.P06.M05"], 2, "CP00-123 RP02.P06.M05 count");
requireEqual(cp123Manifest.phase_counts["RP02.P06.M06"], 8, "CP00-123 RP02.P06.M06 count");
requireEqual(
  cp123Manifest.area_counts.permission_matrix_permission_audit_terminal,
  2,
  "CP00-123 permission/audit terminal area count",
);
requireEqual(
  cp123Manifest.area_counts.permission_matrix_synthetic_fixture_opening,
  8,
  "CP00-123 synthetic fixture opening area count",
);
requireEqual(cp123Manifest.deliverable_counts.test, 2, "CP00-123 test deliverable count");
requireEqual(cp123Manifest.deliverable_counts.security_audit, 2, "CP00-123 security_audit deliverable count");
requireEqual(cp123Manifest.deliverable_counts.implementation, 6, "CP00-123 implementation deliverable count");
requireEqual(cp123Matrix.inherited_workflow_case_count, 40, "CP00-123 inherited workflow case count");
requireEqual(cp123Matrix.inherited_leak_prevention_status, "security_trimmed_before_display", "CP00-123 inherited leak status");
requireEqual(cp123Matrix.boundary_case_count, 10, "CP00-123 boundary case count");
requireEqual(cp123HermesPacket.hermes_gate, "H02", "CP00-123 Hermes packet gate");
requireEqual(cp123HermesPacket.covered_unit_count, 10, "CP00-123 Hermes packet covered_unit_count");
requireEqual(cp123ClaudePacket.model, "claude-opus-4-8", "CP00-123 Claude packet model");
requireEqual(cp123ClaudePacket.effort, "max", "CP00-123 Claude packet effort");
requireTrue(cp123ClaudePacket.read_only, "CP00-123 Claude packet read_only");
requireTrue(cp123ClaudePacket.exactly_one_valid_pack_review_required, "CP00-123 Claude packet exactly_one_valid_pack_review_required");

const cp123CrossTenant = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("permission_audit_cross_tenant_test");
const cp123Leak = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("permission_audit_leak_prevention_test");
const cp123MatrixRow = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_permission_matrix_row");
const cp123View = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_view_decision_binding");
const cp123Search = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_search_decision_binding");
const cp123Mutation = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_mutation_decision_binding");
const cp123Export = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_export_download_decision_binding");
const cp123Share = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_share_decision_binding");
const cp123Ai = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_ai_retrieval_decision_binding");
const cp123AuditHint = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("synthetic_fixture_audit_hint_fields");
requireEqual(cp123CrossTenant.reason, "cross_tenant_deny", "CP00-123 cross-tenant reason");
requireEqual(
  cp123CrossTenant.decision?.audit_hint?.object_id,
  "redacted_cross_tenant_object",
  "CP00-123 cross-tenant redacted object",
);
requireEqual(cp123Leak.trimmed_result_ids?.join(","), "d_cp123_document", "CP00-123 leak prevention trim ids");
requireFalse(cp123Leak.unauthorized_count_exposed, "CP00-123 leak prevention unauthorized_count_exposed");
requireFalse(cp123Leak.hidden_field_names_exposed, "CP00-123 leak prevention hidden_field_names_exposed");
requireFalse(cp123Leak.hidden_fields_rendered, "CP00-123 leak prevention hidden_fields_rendered");
requireFalse(cp123MatrixRow.matrix_row?.persisted, "CP00-123 matrix row persisted");
requireEqual(cp123View.status, "completed_metadata_only", "CP00-123 view status");
requireEqual(cp123Search.trimmed_result_ids?.join(","), "d_cp123_document", "CP00-123 search trim ids");
requireEqual(cp123Mutation.status, "approval_required_routing", "CP00-123 mutation status");
requireFalse(cp123Mutation.grants_human_approval, "CP00-123 mutation grants_human_approval");
requireEqual(cp123Export.status, "review_required_routing", "CP00-123 export status");
requireFalse(cp123Export.executes_export_download, "CP00-123 export executes_export_download");
requireEqual(cp123Share.status, "approval_required_routing", "CP00-123 share status");
requireFalse(cp123Share.executes_external_share, "CP00-123 share executes_external_share");
requireEqual(cp123Ai.status, "blocked_ai_retrieval_boundary", "CP00-123 AI status");
requireFalse(cp123Ai.executes_ai_retrieval, "CP00-123 AI executes_ai_retrieval");
requireFalse(cp123AuditHint.audit_event_expectation?.emitted_to_audit_ledger, "CP00-123 audit hint emitted");
for (const profile of cp123Matrix.boundary_case_results) {
  requireTrue(profile.synthetic_only, "CP00-123 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-123 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-123 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-123 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-123 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-123 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-123 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-123 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-123 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-123 profile acquires_locks");
  requireFalse(profile.executes_rollback, "CP00-123 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-123 profile executes_retry");
  requireFalse(profile.executes_export_download, "CP00-123 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-123 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-123 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-123 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-123 profile grants_human_approval");
  requireFalse(profile.implements_ldip, "CP00-123 profile implements_ldip");
}
requireEqual(cp123Handoff.next_pack_id, "CP00-124", "CP00-123 handoff.next_pack_id");
requireEqual(cp123Handoff.next_subphase_id, "RP02.P06.M06.S09", "CP00-123 handoff.next_subphase_id");
requireEqual(
  cp123Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-123 handoff.hrx_embedded_boundary",
);
requireTrue(cp123Coverage.valid, `CP00-123 coverage valid: ${cp123Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp123PlanPack, createPermissionKernelCp123CoveredUnitIds(), "CP00-123");

requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.pack_id,
  PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
  "permission_fixture_failure_taxonomy_pack.pack_id",
);
requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.contract_id,
  PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT.contract_id,
  "permission_fixture_failure_taxonomy_pack.contract_id",
);
requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.upstream_permission_audit_terminal_boundary_pack_id,
  "CP00-123",
  "permission_fixture_failure_taxonomy_pack.upstream_permission_audit_terminal_boundary_pack_id",
);
requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.inherited_permission_audit_terminal_boundary_contract_id,
  PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT.contract_id,
  "permission_fixture_failure_taxonomy_pack.inherited_permission_audit_terminal_boundary_contract_id",
);
requireTrue(contract.permission_fixture_failure_taxonomy_pack?.synthetic_only, "permission_fixture_failure_taxonomy_pack.synthetic_only");
requireTrue(
  contract.permission_fixture_failure_taxonomy_pack?.risk_c_permission_fixture_failure_taxonomy,
  "permission_fixture_failure_taxonomy_pack.risk_c_permission_fixture_failure_taxonomy",
);
requireFalse(
  contract.permission_fixture_failure_taxonomy_pack?.runtime_ui_route_added,
  "permission_fixture_failure_taxonomy_pack.runtime_ui_route_added",
);
requireFalse(
  contract.permission_fixture_failure_taxonomy_pack?.runtime_api_route_added,
  "permission_fixture_failure_taxonomy_pack.runtime_api_route_added",
);
requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.permission_matrix_unit_count,
  89,
  "permission_fixture_failure_taxonomy_pack.permission_matrix_unit_count",
);
requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.failure_taxonomy_unit_count,
  61,
  "permission_fixture_failure_taxonomy_pack.failure_taxonomy_unit_count",
);
requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.next_pack_id,
  "CP00-125",
  "permission_fixture_failure_taxonomy_pack.next_pack_id",
);
requireEqual(
  contract.permission_fixture_failure_taxonomy_pack?.next_subphase_id,
  "RP02.P07.M03.S11",
  "permission_fixture_failure_taxonomy_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT.public_exports) {
  requireIncludes(contract.permission_fixture_failure_taxonomy_public_exports ?? [], exportedSymbol, "permission_fixture_failure_taxonomy_public_exports");
}
for (const field of PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.permission_fixture_failure_taxonomy_hidden_source_fields ?? [], field, "permission_fixture_failure_taxonomy_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source permission_fixture_failure_taxonomy_no_write_attestation.${flag}`);
  requireFalse(
    contract.permission_fixture_failure_taxonomy_no_write_attestation?.[flag],
    `contract permission_fixture_failure_taxonomy_no_write_attestation.${flag}`,
  );
}
requireEqual(cp124Catalog.length, 150, "CP00-124 catalog length");
requireEqual(cp124Manifest.covered_unit_count, 150, "CP00-124 manifest covered_unit_count");
requireEqual(cp124Manifest.first_unit_id, "RP02.P06.M06.S09", "CP00-124 first_unit_id");
requireEqual(cp124Manifest.last_unit_id, "RP02.P07.M03.S10", "CP00-124 last_unit_id");
requireEqual(cp124Manifest.covered_micro_phase_count, 9, "CP00-124 covered micro phase count");
requireEqual(cp124Manifest.domain_counts.permission_matrix, 89, "CP00-124 permission matrix domain count");
requireEqual(cp124Manifest.domain_counts.failure_taxonomy, 61, "CP00-124 failure taxonomy domain count");
requireEqual(cp124Manifest.deliverable_counts.implementation, 36, "CP00-124 implementation deliverable count");
requireEqual(cp124Manifest.deliverable_counts.ui, 17, "CP00-124 ui deliverable count");
requireEqual(cp124Manifest.deliverable_counts.claude_review, 4, "CP00-124 claude_review deliverable count");
requireEqual(cp124Manifest.deliverable_counts.security_audit, 26, "CP00-124 security_audit deliverable count");
requireEqual(cp124Manifest.deliverable_counts.test, 18, "CP00-124 test deliverable count");
requireEqual(cp124Manifest.deliverable_counts.failure_recovery, 43, "CP00-124 failure_recovery deliverable count");
requireEqual(cp124Manifest.deliverable_counts.hermes_evidence, 4, "CP00-124 hermes_evidence deliverable count");
requireEqual(cp124Manifest.deliverable_counts.fixture, 2, "CP00-124 fixture deliverable count");
requireEqual(cp124Matrix.inherited_terminal_boundary_case_count, 10, "CP00-124 inherited terminal boundary count");
requireEqual(cp124Matrix.inherited_cross_tenant_reason, "cross_tenant_deny", "CP00-124 inherited cross-tenant reason");
requireEqual(cp124Matrix.permission_matrix_case_count, 89, "CP00-124 permission matrix case count");
requireEqual(cp124Matrix.failure_taxonomy_result_count, 61, "CP00-124 failure taxonomy result count");
requireEqual(cp124HermesPacket.hermes_gate, "H02", "CP00-124 Hermes packet gate");
requireEqual(cp124HermesPacket.covered_unit_count, 150, "CP00-124 Hermes packet covered_unit_count");
requireEqual(cp124ClaudePacket.model, "claude-opus-4-8", "CP00-124 Claude packet model");
requireEqual(cp124ClaudePacket.effort, "max", "CP00-124 Claude packet effort");
requireTrue(cp124ClaudePacket.read_only, "CP00-124 Claude packet read_only");
requireTrue(cp124ClaudePacket.exactly_one_valid_pack_review_required, "CP00-124 Claude packet exactly_one_valid_pack_review_required");

const cp124Matched = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("synthetic_fixture_terminal.matched_rule_capture");
const cp124CrossTenant = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("test_golden_case_set.cross_tenant_test");
const cp124Leak = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("test_golden_case_set.leak_prevention_test");
const cp124Review = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("claude_review_packet.review_required_route");
const cp124Approval = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("claude_review_packet.approval_required_route");
const cp124Ai = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("hermes_evidence_packet.ai_retrieval_decision_binding");
const cp124AuditHint = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("closeout_next_handoff.audit_hint_fields");
const cp124MissingTenant = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("failure_scope_inventory.missing_tenant_failure");
const cp124Retry = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("failure_contract_draft.retry_exhaustion_failure");
const cp124Rollback = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("failure_contract_draft.rollback_expectation");
const cp124Lock = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("failure_type_shape_definition.lock_conflict_failure");
const cp124BlockedClaim = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("failure_type_shape_definition.blocked_claim_receipt");
const cp124AuditFailure = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("failure_type_shape_definition.audit_failure_hint");
const cp124HermesFailure = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase("failure_type_shape_definition.hermes_failure_evidence");
requireEqual(cp124Matched.decision?.effect, "allow", "CP00-124 matched rule effect");
requireEqual(cp124CrossTenant.decision?.audit_hint?.object_id, "redacted_cross_tenant_object", "CP00-124 cross-tenant redacted object");
requireEqual(cp124Leak.trimmed_result_ids?.join(","), "d_cp124_document", "CP00-124 leak prevention trim ids");
requireEqual(cp124Review.status, "review_required_routing", "CP00-124 review status");
requireFalse(cp124Review.executes_claude_review, "CP00-124 review executes_claude_review");
requireEqual(cp124Approval.status, "approval_required_routing", "CP00-124 approval status");
requireFalse(cp124Approval.grants_human_approval, "CP00-124 approval grants_human_approval");
requireEqual(cp124Ai.status, "blocked_ai_retrieval_boundary", "CP00-124 AI status");
requireFalse(cp124Ai.executes_ai_retrieval, "CP00-124 AI executes_ai_retrieval");
requireFalse(cp124AuditHint.audit_event_expectation?.emitted_to_audit_ledger, "CP00-124 audit hint emitted");
requireEqual(cp124MissingTenant.status, "blocked_missing_tenant", "CP00-124 missing tenant status");
requireFalse(cp124Retry.executes_retry, "CP00-124 retry executes_retry");
requireFalse(cp124Rollback.executes_rollback, "CP00-124 rollback executes_rollback");
requireFalse(cp124Lock.acquires_locks, "CP00-124 lock acquires_locks");
requireTrue(cp124BlockedClaim.blocked_claim_receipt?.preview_only, "CP00-124 blocked claim preview_only");
requireFalse(cp124AuditFailure.audit_failure_hint?.emitted_to_audit_ledger, "CP00-124 audit failure hint emitted");
requireTrue(cp124HermesFailure.hermes_failure_evidence?.reference_only, "CP00-124 Hermes failure evidence reference_only");
for (const profile of [...cp124Matrix.permission_matrix_case_results, ...cp124Matrix.failure_taxonomy_results]) {
  requireTrue(profile.synthetic_only, "CP00-124 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-124 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-124 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-124 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-124 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-124 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-124 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-124 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-124 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-124 profile acquires_locks");
  requireFalse(profile.executes_rollback, "CP00-124 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-124 profile executes_retry");
  requireFalse(profile.executes_export_download, "CP00-124 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-124 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-124 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-124 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-124 profile grants_human_approval");
  requireFalse(profile.implements_ldip, "CP00-124 profile implements_ldip");
}
requireEqual(cp124Handoff.next_pack_id, "CP00-125", "CP00-124 handoff.next_pack_id");
requireEqual(cp124Handoff.next_subphase_id, "RP02.P07.M03.S11", "CP00-124 handoff.next_subphase_id");
requireEqual(
  cp124Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-124 handoff.hrx_embedded_boundary",
);
requireTrue(cp124Coverage.valid, `CP00-124 coverage valid: ${cp124Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp124PlanPack, createPermissionKernelCp124CoveredUnitIds(), "CP00-124");

requireEqual(
  contract.failure_taxonomy_risk_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
  "failure_taxonomy_risk_boundary_pack.pack_id",
);
requireEqual(
  contract.failure_taxonomy_risk_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT.contract_id,
  "failure_taxonomy_risk_boundary_pack.contract_id",
);
requireEqual(
  contract.failure_taxonomy_risk_boundary_pack?.upstream_permission_fixture_failure_taxonomy_pack_id,
  "CP00-124",
  "failure_taxonomy_risk_boundary_pack.upstream_permission_fixture_failure_taxonomy_pack_id",
);
requireEqual(
  contract.failure_taxonomy_risk_boundary_pack?.inherited_permission_fixture_failure_taxonomy_contract_id,
  PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT.contract_id,
  "failure_taxonomy_risk_boundary_pack.inherited_permission_fixture_failure_taxonomy_contract_id",
);
requireTrue(contract.failure_taxonomy_risk_boundary_pack?.synthetic_only, "failure_taxonomy_risk_boundary_pack.synthetic_only");
requireTrue(
  contract.failure_taxonomy_risk_boundary_pack?.risk_a_failure_taxonomy_boundary,
  "failure_taxonomy_risk_boundary_pack.risk_a_failure_taxonomy_boundary",
);
requireFalse(
  contract.failure_taxonomy_risk_boundary_pack?.runtime_ui_route_added,
  "failure_taxonomy_risk_boundary_pack.runtime_ui_route_added",
);
requireFalse(
  contract.failure_taxonomy_risk_boundary_pack?.runtime_api_route_added,
  "failure_taxonomy_risk_boundary_pack.runtime_api_route_added",
);
requireEqual(
  contract.failure_taxonomy_risk_boundary_pack?.next_pack_id,
  "CP00-126",
  "failure_taxonomy_risk_boundary_pack.next_pack_id",
);
requireEqual(
  contract.failure_taxonomy_risk_boundary_pack?.next_subphase_id,
  "RP02.P07.M03.S21",
  "failure_taxonomy_risk_boundary_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT.public_exports) {
  requireIncludes(contract.failure_taxonomy_risk_boundary_public_exports ?? [], exportedSymbol, "failure_taxonomy_risk_boundary_public_exports");
}
for (const field of PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT.hidden_source_fields) {
  requireIncludes(contract.failure_taxonomy_risk_boundary_hidden_source_fields ?? [], field, "failure_taxonomy_risk_boundary_hidden_source_fields");
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source failure_taxonomy_risk_boundary_no_write_attestation.${flag}`);
  requireFalse(
    contract.failure_taxonomy_risk_boundary_no_write_attestation?.[flag],
    `contract failure_taxonomy_risk_boundary_no_write_attestation.${flag}`,
  );
}
requireEqual(cp125Catalog.length, 10, "CP00-125 catalog length");
requireEqual(cp125Manifest.covered_unit_count, 10, "CP00-125 manifest covered_unit_count");
requireEqual(cp125Manifest.first_unit_id, "RP02.P07.M03.S11", "CP00-125 first_unit_id");
requireEqual(cp125Manifest.last_unit_id, "RP02.P07.M03.S20", "CP00-125 last_unit_id");
requireEqual(cp125Manifest.covered_micro_phase_count, 1, "CP00-125 covered micro phase count");
requireEqual(cp125Manifest.domain_counts.failure_taxonomy, 10, "CP00-125 failure taxonomy domain count");
requireEqual(cp125Manifest.deliverable_counts.failure_recovery, 3, "CP00-125 failure_recovery deliverable count");
requireEqual(cp125Manifest.deliverable_counts.implementation, 1, "CP00-125 implementation deliverable count");
requireEqual(cp125Manifest.deliverable_counts.hermes_evidence, 2, "CP00-125 hermes_evidence deliverable count");
requireEqual(cp125Manifest.deliverable_counts.fixture, 1, "CP00-125 fixture deliverable count");
requireEqual(cp125Manifest.deliverable_counts.test, 2, "CP00-125 test deliverable count");
requireEqual(cp125Manifest.deliverable_counts.security_audit, 1, "CP00-125 security_audit deliverable count");
requireEqual(cp125Matrix.inherited_failure_taxonomy_result_count, 61, "CP00-125 inherited failure taxonomy count");
requireEqual(cp125Matrix.inherited_lock_conflict_status, "blocked_lock_conflict", "CP00-125 inherited lock status");
requireEqual(
  cp125Matrix.inherited_retry_exhaustion_status,
  "retry_exhausted_no_retry_execution",
  "CP00-125 inherited retry status",
);
requireEqual(cp125Matrix.result_count, 10, "CP00-125 result count");
requireEqual(cp125HermesPacket.hermes_gate, "H02", "CP00-125 Hermes packet gate");
requireEqual(cp125HermesPacket.covered_unit_count, 10, "CP00-125 Hermes packet covered_unit_count");
requireEqual(cp125ClaudePacket.model, "claude-opus-4-8", "CP00-125 Claude packet model");
requireEqual(cp125ClaudePacket.effort, "max", "CP00-125 Claude packet effort");
requireTrue(cp125ClaudePacket.read_only, "CP00-125 Claude packet read_only");
requireTrue(cp125ClaudePacket.exactly_one_valid_pack_review_required, "CP00-125 Claude packet exactly_one_valid_pack_review_required");

const cp125Lock = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.lock_conflict_failure");
const cp125Retry = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.retry_exhaustion_failure");
const cp125Rollback = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.rollback_expectation");
const cp125Compensation = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase(
  "failure_taxonomy_risk_boundary.compensation_expectation",
);
const cp125BlockedClaim = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.blocked_claim_receipt");
const cp125Fixture = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.failure_fixture");
const cp125UnitTest = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.failure_unit_test");
const cp125Smoke = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.failure_integration_smoke");
const cp125AuditFailure = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("failure_taxonomy_risk_boundary.audit_failure_hint");
const cp125HermesFailure = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase(
  "failure_taxonomy_risk_boundary.hermes_failure_evidence",
);
const cp125Unknown = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase("unknown_case");
requireEqual(cp125Lock.status, "blocked_lock_conflict", "CP00-125 lock status");
requireFalse(cp125Lock.acquires_locks, "CP00-125 lock acquires_locks");
requireFalse(cp125Lock.lock_policy.lock_token_persisted, "CP00-125 lock token persisted");
requireEqual(cp125Retry.status, "retry_exhausted_no_retry_execution", "CP00-125 retry status");
requireFalse(cp125Retry.executes_retry, "CP00-125 retry executes_retry");
requireTrue(cp125Rollback.rollback_policy.rollback_expected, "CP00-125 rollback expected");
requireFalse(cp125Rollback.executes_rollback, "CP00-125 rollback executes_rollback");
requireTrue(cp125Compensation.compensation_policy.compensation_expected, "CP00-125 compensation expected");
requireFalse(cp125Compensation.executes_compensation, "CP00-125 compensation executes_compensation");
requireTrue(cp125BlockedClaim.blocked_claim_receipt.preview_only, "CP00-125 blocked claim preview_only");
requireFalse(cp125BlockedClaim.blocked_claim_receipt.emitted_to_hermes_runtime, "CP00-125 blocked claim Hermes runtime");
requireFalse(cp125Fixture.failure_fixture.contains_real_data, "CP00-125 fixture contains real data");
requireTrue(cp125UnitTest.failure_test_binding.deterministic, "CP00-125 failure unit test deterministic");
requireTrue(cp125Smoke.failure_test_binding.integration_smoke_bound, "CP00-125 failure smoke bound");
requireFalse(cp125AuditFailure.audit_failure_hint.emitted_to_audit_ledger, "CP00-125 audit failure hint emitted");
requireTrue(cp125HermesFailure.hermes_failure_evidence.reference_only, "CP00-125 Hermes failure evidence reference_only");
requireFalse(cp125HermesFailure.hermes_failure_evidence.writes_hermes_runtime, "CP00-125 Hermes failure writes runtime");
requireEqual(cp125Unknown.status, "blocked_before_permission_evaluation", "CP00-125 unknown status");
for (const profile of cp125Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-125 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-125 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-125 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-125 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-125 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-125 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-125 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-125 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-125 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-125 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-125 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-125 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-125 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-125 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-125 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-125 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-125 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-125 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-125 profile grants_human_approval");
  requireFalse(profile.writes_hermes_runtime, "CP00-125 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-125 profile implements_ldip");
}
requireEqual(cp125Handoff.next_pack_id, "CP00-126", "CP00-125 handoff.next_pack_id");
requireEqual(cp125Handoff.next_subphase_id, "RP02.P07.M03.S21", "CP00-125 handoff.next_subphase_id");
requireEqual(
  cp125Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-125 handoff.hrx_embedded_boundary",
);
requireTrue(cp125Coverage.valid, `CP00-125 coverage valid: ${cp125Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp125PlanPack, createPermissionKernelCp125CoveredUnitIds(), "CP00-125");

requireEqual(
  contract.failure_taxonomy_workflow_binding_pack?.pack_id,
  PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
  "failure_taxonomy_workflow_binding_pack.pack_id",
);
requireEqual(
  contract.failure_taxonomy_workflow_binding_pack?.contract_id,
  PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT.contract_id,
  "failure_taxonomy_workflow_binding_pack.contract_id",
);
requireEqual(
  contract.failure_taxonomy_workflow_binding_pack?.upstream_failure_taxonomy_risk_boundary_pack_id,
  "CP00-125",
  "failure_taxonomy_workflow_binding_pack.upstream_failure_taxonomy_risk_boundary_pack_id",
);
requireEqual(
  contract.failure_taxonomy_workflow_binding_pack?.inherited_failure_taxonomy_risk_boundary_contract_id,
  PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT.contract_id,
  "failure_taxonomy_workflow_binding_pack.inherited_failure_taxonomy_risk_boundary_contract_id",
);
requireTrue(contract.failure_taxonomy_workflow_binding_pack?.synthetic_only, "failure_taxonomy_workflow_binding_pack.synthetic_only");
requireTrue(
  contract.failure_taxonomy_workflow_binding_pack?.risk_b_failure_taxonomy_workflow_binding,
  "failure_taxonomy_workflow_binding_pack.risk_b_failure_taxonomy_workflow_binding",
);
requireTrue(
  contract.failure_taxonomy_workflow_binding_pack?.workflow_binding_reference_only,
  "failure_taxonomy_workflow_binding_pack.workflow_binding_reference_only",
);
requireTrue(
  contract.failure_taxonomy_workflow_binding_pack?.permission_audit_binding_reference_only,
  "failure_taxonomy_workflow_binding_pack.permission_audit_binding_reference_only",
);
requireFalse(
  contract.failure_taxonomy_workflow_binding_pack?.runtime_ui_route_added,
  "failure_taxonomy_workflow_binding_pack.runtime_ui_route_added",
);
requireFalse(
  contract.failure_taxonomy_workflow_binding_pack?.runtime_api_route_added,
  "failure_taxonomy_workflow_binding_pack.runtime_api_route_added",
);
requireEqual(
  contract.failure_taxonomy_workflow_binding_pack?.next_pack_id,
  "CP00-127",
  "failure_taxonomy_workflow_binding_pack.next_pack_id",
);
requireEqual(
  contract.failure_taxonomy_workflow_binding_pack?.next_subphase_id,
  "RP02.P07.M05.S17",
  "failure_taxonomy_workflow_binding_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT.public_exports) {
  requireIncludes(
    contract.failure_taxonomy_workflow_binding_public_exports ?? [],
    exportedSymbol,
    "failure_taxonomy_workflow_binding_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.failure_taxonomy_workflow_binding_hidden_source_fields ?? [],
    field,
    "failure_taxonomy_workflow_binding_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source failure_taxonomy_workflow_binding_no_write_attestation.${flag}`);
  requireFalse(
    contract.failure_taxonomy_workflow_binding_no_write_attestation?.[flag],
    `contract failure_taxonomy_workflow_binding_no_write_attestation.${flag}`,
  );
}
requireEqual(cp126Catalog.length, 40, "CP00-126 catalog length");
requireEqual(cp126Manifest.covered_unit_count, 40, "CP00-126 manifest covered_unit_count");
requireEqual(cp126Manifest.first_unit_id, "RP02.P07.M03.S21", "CP00-126 first_unit_id");
requireEqual(cp126Manifest.last_unit_id, "RP02.P07.M05.S16", "CP00-126 last_unit_id");
requireEqual(cp126Manifest.covered_micro_phase_count, 3, "CP00-126 covered micro phase count");
requireEqual(cp126Manifest.phase_counts["RP02.P07.M03"], 2, "CP00-126 RP02.P07.M03 count");
requireEqual(cp126Manifest.phase_counts["RP02.P07.M04"], 22, "CP00-126 RP02.P07.M04 count");
requireEqual(cp126Manifest.phase_counts["RP02.P07.M05"], 16, "CP00-126 RP02.P07.M05 count");
requireEqual(cp126Manifest.domain_counts.review_escalation, 2, "CP00-126 review escalation domain count");
requireEqual(cp126Manifest.domain_counts.failure_taxonomy, 22, "CP00-126 failure taxonomy domain count");
requireEqual(cp126Manifest.domain_counts.permission_audit_binding, 16, "CP00-126 permission audit binding domain count");
requireEqual(cp126Manifest.deliverable_counts.failure_recovery, 24, "CP00-126 failure_recovery deliverable count");
requireEqual(cp126Manifest.deliverable_counts.implementation, 4, "CP00-126 implementation deliverable count");
requireEqual(cp126Manifest.deliverable_counts.security_audit, 3, "CP00-126 security_audit deliverable count");
requireEqual(cp126Manifest.deliverable_counts.hermes_evidence, 3, "CP00-126 hermes_evidence deliverable count");
requireEqual(cp126Manifest.deliverable_counts.fixture, 2, "CP00-126 fixture deliverable count");
requireEqual(cp126Manifest.deliverable_counts.test, 2, "CP00-126 test deliverable count");
requireEqual(cp126Manifest.deliverable_counts.claude_review, 2, "CP00-126 claude_review deliverable count");
requireEqual(cp126Matrix.inherited_failure_boundary_result_count, 10, "CP00-126 inherited failure boundary count");
requireEqual(cp126Matrix.inherited_lock_conflict_status, "blocked_lock_conflict", "CP00-126 inherited lock status");
requireTrue(cp126Matrix.inherited_hermes_failure_reference_only, "CP00-126 inherited Hermes reference-only");
requireEqual(cp126Matrix.result_count, 40, "CP00-126 result count");
requireEqual(cp126Matrix.review_escalation_result_count, 2, "CP00-126 review escalation result count");
requireEqual(cp126Matrix.secondary_workflow_result_count, 22, "CP00-126 secondary workflow result count");
requireEqual(cp126Matrix.permission_audit_binding_result_count, 16, "CP00-126 permission audit binding result count");
requireEqual(cp126HermesPacket.hermes_gate, "H02", "CP00-126 Hermes packet gate");
requireEqual(cp126HermesPacket.covered_unit_count, 40, "CP00-126 Hermes packet covered_unit_count");
requireEqual(cp126ClaudePacket.model, "claude-opus-4-8", "CP00-126 Claude packet model");
requireEqual(cp126ClaudePacket.effort, "max", "CP00-126 Claude packet effort");
requireTrue(cp126ClaudePacket.read_only, "CP00-126 Claude packet read_only");
requireTrue(cp126ClaudePacket.exactly_one_valid_pack_review_required, "CP00-126 Claude packet exactly_one_valid_pack_review_required");

const cp126ClaudePrompt = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("primary_review_escalation.claude_edge_case_prompt");
const cp126HumanEscalation = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("primary_review_escalation.human_escalation_note");
const cp126MissingTenant = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.missing_tenant_failure");
const cp126CrossTenant = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.cross_tenant_failure");
const cp126Lock = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.lock_conflict_failure");
const cp126Retry = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.retry_exhaustion_failure");
const cp126Rollback = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.rollback_expectation");
const cp126Compensation = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.compensation_expectation");
const cp126BlockedClaim = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.blocked_claim_receipt");
const cp126AuditFailure = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.audit_failure_hint");
const cp126HermesFailure = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("secondary_workflow.hermes_failure_evidence");
const cp126DeniedBinding = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase(
  "permission_audit_binding.permission_denied_failure",
);
const cp126Fixture = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("permission_audit_binding.failure_fixture");
const cp126Unknown = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase("unknown_case");
requireFalse(cp126ClaudePrompt.claude_edge_case_prompt.executes_claude_review, "CP00-126 Claude prompt executes review");
requireFalse(cp126HumanEscalation.human_escalation_note.grants_human_approval, "CP00-126 human escalation grants approval");
requireEqual(cp126MissingTenant.status, "blocked_missing_tenant", "CP00-126 missing tenant status");
requireTrue(cp126CrossTenant.permission_audit_binding.cross_tenant_denied, "CP00-126 cross tenant denied reference");
requireFalse(cp126Lock.lock_policy.lock_acquired, "CP00-126 lock acquired");
requireFalse(cp126Retry.retry_policy.retry_executed, "CP00-126 retry executed");
requireFalse(cp126Rollback.rollback_policy.rollback_executed, "CP00-126 rollback executed");
requireFalse(cp126Compensation.compensation_policy.compensation_executed, "CP00-126 compensation executed");
requireTrue(cp126BlockedClaim.blocked_claim_receipt.preview_only, "CP00-126 blocked claim preview_only");
requireFalse(cp126AuditFailure.audit_failure_hint.emitted_to_audit_ledger, "CP00-126 audit failure emitted");
requireTrue(cp126HermesFailure.hermes_failure_evidence.reference_only, "CP00-126 Hermes failure reference_only");
requireFalse(cp126HermesFailure.hermes_failure_evidence.writes_hermes_runtime, "CP00-126 Hermes failure writes runtime");
requireTrue(cp126DeniedBinding.permission_audit_binding.permission_denied, "CP00-126 permission denied binding");
requireFalse(cp126DeniedBinding.permission_audit_binding.emitted_to_audit_ledger, "CP00-126 permission audit emitted");
requireFalse(cp126Fixture.failure_fixture.contains_real_data, "CP00-126 fixture contains real data");
requireEqual(cp126Unknown.status, "blocked_before_permission_evaluation", "CP00-126 unknown status");
for (const profile of cp126Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-126 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-126 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-126 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-126 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-126 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-126 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-126 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-126 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-126 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-126 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-126 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-126 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-126 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-126 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-126 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-126 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-126 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-126 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-126 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-126 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-126 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-126 profile implements_ldip");
}
requireEqual(cp126Handoff.next_pack_id, "CP00-127", "CP00-126 handoff.next_pack_id");
requireEqual(cp126Handoff.next_subphase_id, "RP02.P07.M05.S17", "CP00-126 handoff.next_subphase_id");
requireEqual(
  cp126Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-126 handoff.hrx_embedded_boundary",
);
requireTrue(cp126Coverage.valid, `CP00-126 coverage valid: ${cp126Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp126PlanPack, createPermissionKernelCp126CoveredUnitIds(), "CP00-126");

requireEqual(
  contract.failure_taxonomy_test_fixture_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
  "failure_taxonomy_test_fixture_boundary_pack.pack_id",
);
requireEqual(
  contract.failure_taxonomy_test_fixture_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT.contract_id,
  "failure_taxonomy_test_fixture_boundary_pack.contract_id",
);
requireEqual(
  contract.failure_taxonomy_test_fixture_boundary_pack?.upstream_failure_taxonomy_workflow_binding_pack_id,
  "CP00-126",
  "failure_taxonomy_test_fixture_boundary_pack.upstream_failure_taxonomy_workflow_binding_pack_id",
);
requireEqual(
  contract.failure_taxonomy_test_fixture_boundary_pack?.inherited_failure_taxonomy_workflow_binding_contract_id,
  PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT.contract_id,
  "failure_taxonomy_test_fixture_boundary_pack.inherited_failure_taxonomy_workflow_binding_contract_id",
);
requireTrue(
  contract.failure_taxonomy_test_fixture_boundary_pack?.synthetic_only,
  "failure_taxonomy_test_fixture_boundary_pack.synthetic_only",
);
requireTrue(
  contract.failure_taxonomy_test_fixture_boundary_pack?.risk_a_failure_taxonomy_test_fixture_boundary,
  "failure_taxonomy_test_fixture_boundary_pack.risk_a_failure_taxonomy_test_fixture_boundary",
);
requireTrue(
  contract.failure_taxonomy_test_fixture_boundary_pack?.permission_audit_tests_reference_only,
  "failure_taxonomy_test_fixture_boundary_pack.permission_audit_tests_reference_only",
);
requireTrue(
  contract.failure_taxonomy_test_fixture_boundary_pack?.synthetic_fixture_opening_reference_only,
  "failure_taxonomy_test_fixture_boundary_pack.synthetic_fixture_opening_reference_only",
);
requireFalse(
  contract.failure_taxonomy_test_fixture_boundary_pack?.runtime_ui_route_added,
  "failure_taxonomy_test_fixture_boundary_pack.runtime_ui_route_added",
);
requireFalse(
  contract.failure_taxonomy_test_fixture_boundary_pack?.runtime_api_route_added,
  "failure_taxonomy_test_fixture_boundary_pack.runtime_api_route_added",
);
requireEqual(
  contract.failure_taxonomy_test_fixture_boundary_pack?.next_pack_id,
  "CP00-128",
  "failure_taxonomy_test_fixture_boundary_pack.next_pack_id",
);
requireEqual(
  contract.failure_taxonomy_test_fixture_boundary_pack?.next_subphase_id,
  "RP02.P07.M06.S05",
  "failure_taxonomy_test_fixture_boundary_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT.public_exports) {
  requireIncludes(
    contract.failure_taxonomy_test_fixture_boundary_public_exports ?? [],
    exportedSymbol,
    "failure_taxonomy_test_fixture_boundary_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.failure_taxonomy_test_fixture_boundary_hidden_source_fields ?? [],
    field,
    "failure_taxonomy_test_fixture_boundary_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(
  PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT.no_write_attestation,
)) {
  requireFalse(value, `source failure_taxonomy_test_fixture_boundary_no_write_attestation.${flag}`);
  requireFalse(
    contract.failure_taxonomy_test_fixture_boundary_no_write_attestation?.[flag],
    `contract failure_taxonomy_test_fixture_boundary_no_write_attestation.${flag}`,
  );
}
requireEqual(cp127Catalog.length, 10, "CP00-127 catalog length");
requireEqual(cp127Manifest.covered_unit_count, 10, "CP00-127 manifest covered_unit_count");
requireEqual(cp127Manifest.first_unit_id, "RP02.P07.M05.S17", "CP00-127 first_unit_id");
requireEqual(cp127Manifest.last_unit_id, "RP02.P07.M06.S04", "CP00-127 last_unit_id");
requireEqual(cp127Manifest.covered_micro_phase_count, 2, "CP00-127 covered micro phase count");
requireEqual(cp127Manifest.phase_counts["RP02.P07.M05"], 6, "CP00-127 RP02.P07.M05 count");
requireEqual(cp127Manifest.phase_counts["RP02.P07.M06"], 4, "CP00-127 RP02.P07.M06 count");
requireEqual(cp127Manifest.domain_counts.permission_audit_test_evidence, 6, "CP00-127 permission audit test evidence count");
requireEqual(cp127Manifest.domain_counts.synthetic_fixture_boundary, 4, "CP00-127 synthetic fixture boundary count");
requireEqual(cp127Manifest.deliverable_counts.test, 2, "CP00-127 test deliverable count");
requireEqual(cp127Manifest.deliverable_counts.security_audit, 1, "CP00-127 security_audit deliverable count");
requireEqual(cp127Manifest.deliverable_counts.hermes_evidence, 1, "CP00-127 hermes_evidence deliverable count");
requireEqual(cp127Manifest.deliverable_counts.claude_review, 1, "CP00-127 claude_review deliverable count");
requireEqual(cp127Manifest.deliverable_counts.implementation, 1, "CP00-127 implementation deliverable count");
requireEqual(cp127Manifest.deliverable_counts.failure_recovery, 4, "CP00-127 failure_recovery deliverable count");
requireEqual(cp127Matrix.inherited_workflow_result_count, 40, "CP00-127 inherited workflow count");
requireTrue(cp127Matrix.inherited_permission_audit_unit_test_bound, "CP00-127 inherited permission audit unit test binding");
requireTrue(cp127Matrix.inherited_hermes_failure_reference_only, "CP00-127 inherited Hermes reference-only");
requireEqual(cp127Matrix.result_count, 10, "CP00-127 result count");
requireEqual(cp127Matrix.permission_audit_test_evidence_result_count, 6, "CP00-127 permission audit test evidence result count");
requireEqual(cp127Matrix.synthetic_fixture_boundary_result_count, 4, "CP00-127 synthetic fixture boundary result count");
requireEqual(cp127HermesPacket.hermes_gate, "H02", "CP00-127 Hermes packet gate");
requireEqual(cp127HermesPacket.covered_unit_count, 10, "CP00-127 Hermes packet covered_unit_count");
requireEqual(cp127ClaudePacket.model, "claude-opus-4-8", "CP00-127 Claude packet model");
requireEqual(cp127ClaudePacket.effort, "max", "CP00-127 Claude packet effort");
requireTrue(cp127ClaudePacket.read_only, "CP00-127 Claude packet read_only");
requireTrue(cp127ClaudePacket.exactly_one_valid_pack_review_required, "CP00-127 Claude packet exactly_one_valid_pack_review_required");

const cp127FailureUnitTest = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "permission_audit_test_evidence.failure_unit_test",
);
const cp127Smoke = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "permission_audit_test_evidence.failure_integration_smoke",
);
const cp127AuditFailure = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "permission_audit_test_evidence.audit_failure_hint",
);
const cp127HermesFailure = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "permission_audit_test_evidence.hermes_failure_evidence",
);
const cp127ClaudePrompt = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "permission_audit_test_evidence.claude_edge_case_prompt",
);
const cp127HumanEscalation = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "permission_audit_test_evidence.human_escalation_note",
);
const cp127FailureTaxonomy = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "synthetic_fixture_opening.failure_taxonomy",
);
const cp127MissingTenant = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "synthetic_fixture_opening.missing_tenant_failure",
);
const cp127MissingActor = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "synthetic_fixture_opening.missing_actor_failure",
);
const cp127MissingMatter = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
  "synthetic_fixture_opening.missing_matter_failure",
);
const cp127Unknown = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase("unknown_case");
requireTrue(cp127FailureUnitTest.permission_audit_test_evidence.unit_test_bound, "CP00-127 failure unit test bound");
requireTrue(cp127FailureUnitTest.permission_audit_test_evidence.deterministic, "CP00-127 failure unit test deterministic");
requireFalse(cp127FailureUnitTest.permission_audit_test_evidence.persisted, "CP00-127 failure unit test persisted");
requireTrue(cp127Smoke.permission_audit_test_evidence.integration_smoke_bound, "CP00-127 integration smoke bound");
requireFalse(cp127AuditFailure.audit_failure_hint.emitted_to_audit_ledger, "CP00-127 audit failure emitted");
requireTrue(cp127HermesFailure.hermes_failure_evidence.reference_only, "CP00-127 Hermes failure reference_only");
requireFalse(cp127HermesFailure.hermes_failure_evidence.writes_hermes_runtime, "CP00-127 Hermes failure writes runtime");
requireFalse(cp127ClaudePrompt.claude_edge_case_prompt.executes_claude_review, "CP00-127 Claude prompt executes review");
requireFalse(cp127HumanEscalation.human_escalation_note.grants_human_approval, "CP00-127 human escalation grants approval");
requireEqual(cp127FailureTaxonomy.status, "failure_taxonomy_synthetic_fixture_bound", "CP00-127 failure taxonomy status");
requireFalse(cp127FailureTaxonomy.synthetic_fixture_boundary.fixture_contains_real_data, "CP00-127 fixture contains real data");
requireFalse(cp127FailureTaxonomy.synthetic_fixture_boundary.fixture_persisted, "CP00-127 fixture persisted");
requireTrue(cp127MissingTenant.synthetic_fixture_boundary.missing_tenant_denied, "CP00-127 missing tenant denied");
requireTrue(cp127MissingActor.synthetic_fixture_boundary.missing_actor_denied, "CP00-127 missing actor denied");
requireTrue(cp127MissingMatter.synthetic_fixture_boundary.missing_matter_denied, "CP00-127 missing Matter denied");
requireEqual(cp127Unknown.status, "blocked_before_permission_evaluation", "CP00-127 unknown status");
for (const profile of cp127Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-127 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-127 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-127 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-127 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-127 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-127 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-127 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-127 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-127 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-127 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-127 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-127 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-127 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-127 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-127 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-127 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-127 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-127 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-127 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-127 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-127 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-127 profile implements_ldip");
}
requireEqual(cp127Handoff.next_pack_id, "CP00-128", "CP00-127 handoff.next_pack_id");
requireEqual(cp127Handoff.next_subphase_id, "RP02.P07.M06.S05", "CP00-127 handoff.next_subphase_id");
requireEqual(
  cp127Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-127 handoff.hrx_embedded_boundary",
);
requireTrue(cp127Coverage.valid, `CP00-127 coverage valid: ${cp127Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp127PlanPack, createPermissionKernelCp127CoveredUnitIds(), "CP00-127");

requireEqual(
  contract.failure_taxonomy_evidence_harness_pack?.pack_id,
  PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
  "failure_taxonomy_evidence_harness_pack.pack_id",
);
requireEqual(
  contract.failure_taxonomy_evidence_harness_pack?.contract_id,
  PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT.contract_id,
  "failure_taxonomy_evidence_harness_pack.contract_id",
);
requireEqual(
  contract.failure_taxonomy_evidence_harness_pack?.upstream_failure_taxonomy_test_fixture_boundary_pack_id,
  "CP00-127",
  "failure_taxonomy_evidence_harness_pack.upstream_failure_taxonomy_test_fixture_boundary_pack_id",
);
requireEqual(
  contract.failure_taxonomy_evidence_harness_pack?.inherited_failure_taxonomy_test_fixture_boundary_contract_id,
  PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT.contract_id,
  "failure_taxonomy_evidence_harness_pack.inherited_failure_taxonomy_test_fixture_boundary_contract_id",
);
requireTrue(contract.failure_taxonomy_evidence_harness_pack?.synthetic_only, "failure_taxonomy_evidence_harness_pack.synthetic_only");
requireTrue(
  contract.failure_taxonomy_evidence_harness_pack?.risk_c_evidence_harness_pack,
  "failure_taxonomy_evidence_harness_pack.risk_c_evidence_harness_pack",
);
requireTrue(
  contract.failure_taxonomy_evidence_harness_pack?.hermes_packet_reference_only,
  "failure_taxonomy_evidence_harness_pack.hermes_packet_reference_only",
);
requireTrue(
  contract.failure_taxonomy_evidence_harness_pack?.claude_packet_reference_only,
  "failure_taxonomy_evidence_harness_pack.claude_packet_reference_only",
);
requireTrue(
  contract.failure_taxonomy_evidence_harness_pack?.closeout_handoff_reference_only,
  "failure_taxonomy_evidence_harness_pack.closeout_handoff_reference_only",
);
requireFalse(
  contract.failure_taxonomy_evidence_harness_pack?.runtime_ui_route_added,
  "failure_taxonomy_evidence_harness_pack.runtime_ui_route_added",
);
requireFalse(
  contract.failure_taxonomy_evidence_harness_pack?.runtime_api_route_added,
  "failure_taxonomy_evidence_harness_pack.runtime_api_route_added",
);
requireEqual(contract.failure_taxonomy_evidence_harness_pack?.next_pack_id, "CP00-129", "failure_taxonomy_evidence_harness_pack.next_pack_id");
requireEqual(
  contract.failure_taxonomy_evidence_harness_pack?.next_subphase_id,
  "RP02.P08.M03.S22",
  "failure_taxonomy_evidence_harness_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT.public_exports) {
  requireIncludes(
    contract.failure_taxonomy_evidence_harness_public_exports ?? [],
    exportedSymbol,
    "failure_taxonomy_evidence_harness_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.failure_taxonomy_evidence_harness_hidden_source_fields ?? [],
    field,
    "failure_taxonomy_evidence_harness_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source failure_taxonomy_evidence_harness_no_write_attestation.${flag}`);
  requireFalse(
    contract.failure_taxonomy_evidence_harness_no_write_attestation?.[flag],
    `contract failure_taxonomy_evidence_harness_no_write_attestation.${flag}`,
  );
}
requireEqual(cp128Catalog.length, 150, "CP00-128 catalog length");
requireEqual(cp128Manifest.covered_unit_count, 150, "CP00-128 manifest covered_unit_count");
requireEqual(cp128Manifest.first_unit_id, "RP02.P07.M06.S05", "CP00-128 first_unit_id");
requireEqual(cp128Manifest.last_unit_id, "RP02.P08.M03.S21", "CP00-128 last_unit_id");
requireEqual(cp128Manifest.covered_micro_phase_count, 9, "CP00-128 covered micro phase count");
for (const [microPhaseId, count] of Object.entries({
  "RP02.P07.M06": 18,
  "RP02.P07.M07": 22,
  "RP02.P07.M08": 22,
  "RP02.P07.M09": 20,
  "RP02.P07.M10": 11,
  "RP02.P08.M00": 8,
  "RP02.P08.M01": 8,
  "RP02.P08.M02": 20,
  "RP02.P08.M03": 21,
})) {
  requireEqual(cp128Manifest.phase_counts[microPhaseId], count, `CP00-128 ${microPhaseId} count`);
}
for (const [deliverableType, count] of Object.entries({
  failure_recovery: 54,
  security_audit: 9,
  implementation: 24,
  hermes_evidence: 44,
  fixture: 4,
  test: 10,
  claude_review: 5,
})) {
  requireEqual(cp128Manifest.deliverable_counts[deliverableType], count, `CP00-128 ${deliverableType} deliverable count`);
}
requireEqual(cp128Matrix.inherited_test_fixture_result_count, 10, "CP00-128 inherited test fixture count");
requireTrue(cp128Matrix.inherited_missing_tenant_denied, "CP00-128 inherited missing tenant denied");
requireTrue(cp128Matrix.inherited_claude_prompt_not_executed, "CP00-128 inherited Claude prompt no-execution");
requireTrue(cp128Matrix.inherited_hermes_failure_reference_only, "CP00-128 inherited Hermes reference-only");
requireEqual(cp128Matrix.result_count, 150, "CP00-128 result count");
requireEqual(cp128Matrix.synthetic_fixture_terminal_result_count, 18, "CP00-128 synthetic fixture terminal result count");
requireEqual(cp128Matrix.test_golden_case_result_count, 22, "CP00-128 test golden case result count");
requireEqual(cp128Matrix.hermes_evidence_packet_result_count, 22, "CP00-128 Hermes evidence packet result count");
requireEqual(cp128Matrix.claude_review_packet_result_count, 20, "CP00-128 Claude review packet result count");
requireEqual(cp128Matrix.closeout_next_handoff_result_count, 11, "CP00-128 closeout handoff result count");
requireEqual(cp128Matrix.p08_evidence_result_count, 57, "CP00-128 P08 evidence result count");
requireEqual(cp128HermesPacket.hermes_gate, "H02", "CP00-128 Hermes packet gate");
requireEqual(cp128HermesPacket.covered_unit_count, 150, "CP00-128 Hermes packet covered_unit_count");
requireEqual(cp128ClaudePacket.model, "claude-opus-4-8", "CP00-128 Claude packet model");
requireEqual(cp128ClaudePacket.effort, "max", "CP00-128 Claude packet effort");
requireTrue(cp128ClaudePacket.read_only, "CP00-128 Claude packet read_only");
requireTrue(cp128ClaudePacket.exactly_one_valid_pack_review_required, "CP00-128 Claude packet exactly_one_valid_pack_review_required");

const cp128MissingResource = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase(
  "synthetic_fixture_terminal.missing_resource_failure",
);
const cp128CrossTenant = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("synthetic_fixture_terminal.cross_tenant_failure");
const cp128Lock = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("synthetic_fixture_terminal.lock_conflict_failure");
const cp128Retry = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("synthetic_fixture_terminal.retry_exhaustion_failure");
const cp128UnitTest = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("test_golden_case_set.failure_unit_test");
const cp128Smoke = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("test_golden_case_set.failure_integration_smoke");
const cp128HermesFailure = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("hermes_evidence_packet.hermes_failure_evidence");
const cp128ClaudeDependency = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase(
  "type_shape_definition.claude_dependency_marker",
);
const cp128ScopeCommandMatrix = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("scope_inventory.hermes_command_matrix");
const cp128ContractFieldList = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("contract_draft.evidence_field_list");
const cp128Pass = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("type_shape_definition.pass_semantics");
const cp128Block = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("type_shape_definition.block_semantics");
const cp128Regression = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("type_shape_definition.regression_receipt");
const cp128Documentation = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("primary_implementation_slice.documentation_update");
const cp128NextGate = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("primary_implementation_slice.next_gate_readiness");
const cp128Unknown = runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase("unknown_case");
requireTrue(cp128MissingResource.failure_taxonomy_profile.missing_resource_denied, "CP00-128 missing resource denied");
requireTrue(cp128CrossTenant.failure_taxonomy_profile.cross_tenant_denied, "CP00-128 cross tenant denied");
requireFalse(cp128Lock.acquires_locks, "CP00-128 lock acquired");
requireFalse(cp128Retry.executes_retry, "CP00-128 retry executed");
requireTrue(cp128UnitTest.test_golden_case.failure_unit_test_bound, "CP00-128 failure unit test bound");
requireTrue(cp128UnitTest.test_golden_case.deterministic, "CP00-128 failure unit test deterministic");
requireFalse(cp128UnitTest.test_golden_case.persisted, "CP00-128 failure unit test persisted");
requireTrue(cp128Smoke.test_golden_case.integration_smoke_bound, "CP00-128 integration smoke bound");
requireTrue(cp128HermesFailure.hermes_evidence_packet.reference_only, "CP00-128 Hermes failure reference_only");
requireFalse(cp128HermesFailure.hermes_evidence_packet.writes_hermes_runtime, "CP00-128 Hermes failure writes runtime");
requireTrue(cp128ClaudeDependency.claude_review_packet.dependency_marker_bound, "CP00-128 Claude dependency marker bound");
requireFalse(cp128ClaudeDependency.claude_review_packet.executes_claude_review, "CP00-128 Claude dependency executes review");
requireTrue(cp128ScopeCommandMatrix.hermes_evidence_packet.command_matrix_bound, "CP00-128 scope command matrix bound");
requireTrue(cp128ContractFieldList.hermes_evidence_packet.evidence_field_list_bound, "CP00-128 contract field list bound");
requireTrue(cp128Pass.verdict_semantics.pass_bound, "CP00-128 PASS semantics bound");
requireTrue(cp128Block.verdict_semantics.block_prevents_production_ready, "CP00-128 BLOCK semantics prevents ready");
requireTrue(cp128Regression.test_golden_case.regression_receipt_bound, "CP00-128 regression receipt bound");
requireTrue(cp128Documentation.closeout_handoff.documentation_update_bound, "CP00-128 documentation update bound");
requireTrue(cp128NextGate.closeout_handoff.next_gate_readiness_bound, "CP00-128 next gate readiness bound");
requireEqual(cp128Unknown.status, "blocked_before_permission_evaluation", "CP00-128 unknown status");
for (const profile of cp128Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-128 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-128 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-128 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-128 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-128 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-128 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-128 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-128 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-128 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-128 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-128 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-128 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-128 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-128 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-128 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-128 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-128 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-128 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-128 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-128 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-128 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-128 profile implements_ldip");
}
requireEqual(cp128Handoff.next_pack_id, "CP00-129", "CP00-128 handoff.next_pack_id");
requireEqual(cp128Handoff.next_subphase_id, "RP02.P08.M03.S22", "CP00-128 handoff.next_subphase_id");
requireEqual(
  cp128Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-128 handoff.hrx_embedded_boundary",
);
requireTrue(cp128Coverage.valid, `CP00-128 coverage valid: ${cp128Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp128PlanPack, createPermissionKernelCp128CoveredUnitIds(), "CP00-128");

requireEqual(
  contract.hermes_evidence_workflow_binding_pack?.pack_id,
  PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
  "hermes_evidence_workflow_binding_pack.pack_id",
);
requireEqual(
  contract.hermes_evidence_workflow_binding_pack?.contract_id,
  PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT.contract_id,
  "hermes_evidence_workflow_binding_pack.contract_id",
);
requireEqual(
  contract.hermes_evidence_workflow_binding_pack?.upstream_failure_taxonomy_evidence_harness_pack_id,
  "CP00-128",
  "hermes_evidence_workflow_binding_pack.upstream_failure_taxonomy_evidence_harness_pack_id",
);
requireEqual(
  contract.hermes_evidence_workflow_binding_pack?.inherited_failure_taxonomy_evidence_harness_contract_id,
  PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT.contract_id,
  "hermes_evidence_workflow_binding_pack.inherited_failure_taxonomy_evidence_harness_contract_id",
);
requireTrue(contract.hermes_evidence_workflow_binding_pack?.synthetic_only, "hermes_evidence_workflow_binding_pack.synthetic_only");
requireTrue(
  contract.hermes_evidence_workflow_binding_pack?.risk_b_hermes_evidence_workflow_binding,
  "hermes_evidence_workflow_binding_pack.risk_b_hermes_evidence_workflow_binding",
);
requireTrue(
  contract.hermes_evidence_workflow_binding_pack?.metadata_only_evidence_workflow,
  "hermes_evidence_workflow_binding_pack.metadata_only_evidence_workflow",
);
requireTrue(
  contract.hermes_evidence_workflow_binding_pack?.operator_summary_reference_only,
  "hermes_evidence_workflow_binding_pack.operator_summary_reference_only",
);
requireTrue(
  contract.hermes_evidence_workflow_binding_pack?.secondary_workflow_evidence_reference_only,
  "hermes_evidence_workflow_binding_pack.secondary_workflow_evidence_reference_only",
);
requireTrue(
  contract.hermes_evidence_workflow_binding_pack?.permission_audit_binding_reference_only,
  "hermes_evidence_workflow_binding_pack.permission_audit_binding_reference_only",
);
requireFalse(
  contract.hermes_evidence_workflow_binding_pack?.runtime_ui_route_added,
  "hermes_evidence_workflow_binding_pack.runtime_ui_route_added",
);
requireFalse(
  contract.hermes_evidence_workflow_binding_pack?.runtime_api_route_added,
  "hermes_evidence_workflow_binding_pack.runtime_api_route_added",
);
requireEqual(contract.hermes_evidence_workflow_binding_pack?.next_pack_id, "CP00-130", "hermes_evidence_workflow_binding_pack.next_pack_id");
requireEqual(
  contract.hermes_evidence_workflow_binding_pack?.next_subphase_id,
  "RP02.P08.M05.S20",
  "hermes_evidence_workflow_binding_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT.public_exports) {
  requireIncludes(
    contract.hermes_evidence_workflow_binding_public_exports ?? [],
    exportedSymbol,
    "hermes_evidence_workflow_binding_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.hermes_evidence_workflow_binding_hidden_source_fields ?? [],
    field,
    "hermes_evidence_workflow_binding_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT.no_write_attestation)) {
  requireFalse(value, `source hermes_evidence_workflow_binding_no_write_attestation.${flag}`);
  requireFalse(
    contract.hermes_evidence_workflow_binding_no_write_attestation?.[flag],
    `contract hermes_evidence_workflow_binding_no_write_attestation.${flag}`,
  );
}
requireEqual(cp129Catalog.length, 40, "CP00-129 catalog length");
requireEqual(cp129Manifest.covered_unit_count, 40, "CP00-129 manifest covered_unit_count");
requireEqual(cp129Manifest.first_unit_id, "RP02.P08.M03.S22", "CP00-129 first_unit_id");
requireEqual(cp129Manifest.last_unit_id, "RP02.P08.M05.S19", "CP00-129 last_unit_id");
requireEqual(cp129Manifest.covered_micro_phase_count, 3, "CP00-129 covered micro phase count");
for (const [microPhaseId, count] of Object.entries({
  "RP02.P08.M03": 1,
  "RP02.P08.M04": 20,
  "RP02.P08.M05": 19,
})) {
  requireEqual(cp129Manifest.phase_counts[microPhaseId], count, `CP00-129 ${microPhaseId} count`);
}
for (const [domain, count] of Object.entries({
  operator_summary: 1,
  secondary_workflow_evidence: 20,
  permission_audit_evidence_binding: 19,
})) {
  requireEqual(cp129Manifest.domain_counts[domain], count, `CP00-129 ${domain} count`);
}
for (const [deliverableType, count] of Object.entries({
  implementation: 16,
  hermes_evidence: 20,
  claude_review: 2,
  test: 2,
})) {
  requireEqual(cp129Manifest.deliverable_counts[deliverableType], count, `CP00-129 ${deliverableType} deliverable count`);
}
requireEqual(cp129Matrix.inherited_evidence_harness_result_count, 150, "CP00-129 inherited evidence harness count");
requireTrue(cp129Matrix.inherited_next_gate_ready, "CP00-129 inherited next gate readiness");
requireTrue(cp129Matrix.inherited_claude_dependency_not_executed, "CP00-129 inherited Claude dependency no-execution");
requireTrue(cp129Matrix.inherited_audit_summary_reference_only, "CP00-129 inherited audit summary reference-only");
requireEqual(cp129Matrix.result_count, 40, "CP00-129 result count");
requireEqual(cp129Matrix.operator_summary_result_count, 1, "CP00-129 operator summary result count");
requireEqual(cp129Matrix.secondary_workflow_evidence_result_count, 20, "CP00-129 secondary workflow evidence result count");
requireEqual(cp129Matrix.permission_audit_evidence_binding_result_count, 19, "CP00-129 permission audit evidence binding result count");
requireEqual(cp129HermesPacket.hermes_gate, "H02", "CP00-129 Hermes packet gate");
requireEqual(cp129HermesPacket.covered_unit_count, 40, "CP00-129 Hermes packet covered_unit_count");
requireEqual(cp129ClaudePacket.model, "claude-opus-4-8", "CP00-129 Claude packet model");
requireEqual(cp129ClaudePacket.effort, "max", "CP00-129 Claude packet effort");
requireTrue(cp129ClaudePacket.read_only, "CP00-129 Claude packet read_only");
requireTrue(cp129ClaudePacket.exactly_one_valid_pack_review_required, "CP00-129 Claude packet exactly_one_valid_pack_review_required");

const cp129OperatorSummary = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase("operator_summary.operator_summary");
const cp129CommandMatrix = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "secondary_workflow_evidence.hermes_command_matrix",
);
const cp129CommandResult = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "secondary_workflow_evidence.command_result_receipt",
);
const cp129ClaudeDependency = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "secondary_workflow_evidence.claude_dependency_marker",
);
const cp129HumanApproval = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "secondary_workflow_evidence.human_approval_marker",
);
const cp129Block = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase("secondary_workflow_evidence.block_semantics");
const cp129PermissionSummary = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "permission_audit_evidence_binding.permission_summary_receipt",
);
const cp129AuditSummary = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "permission_audit_evidence_binding.audit_summary_receipt",
);
const cp129ChangedFile = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "permission_audit_evidence_binding.changed_file_receipt",
);
const cp129Regression = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "permission_audit_evidence_binding.regression_receipt",
);
const cp129Closeout = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase(
  "permission_audit_evidence_binding.closeout_handoff",
);
const cp129Unknown = runPermissionKernelCp129HermesEvidenceWorkflowBindingCase("unknown_case");
requireTrue(cp129OperatorSummary.operator_summary.summary_bound, "CP00-129 operator summary bound");
requireFalse(cp129OperatorSummary.operator_summary.hidden_fields_rendered, "CP00-129 operator summary hidden fields rendered");
requireFalse(cp129OperatorSummary.operator_summary.contains_real_data, "CP00-129 operator summary contains real data");
requireTrue(cp129CommandMatrix.hermes_evidence_binding.command_matrix_bound, "CP00-129 command matrix bound");
requireFalse(
  cp129CommandResult.hermes_evidence_binding.command_result_discloses_raw_output,
  "CP00-129 command result discloses raw output",
);
requireFalse(cp129ClaudeDependency.claude_dependency_marker.executes_claude_review, "CP00-129 Claude dependency executes review");
requireFalse(cp129HumanApproval.human_approval_marker.grants_human_approval, "CP00-129 human approval grants approval");
requireTrue(cp129Block.verdict_semantics.block_prevents_production_ready, "CP00-129 BLOCK prevents production ready");
requireTrue(cp129PermissionSummary.permission_audit_binding.permission_summary_reference_only, "CP00-129 permission summary reference-only");
requireFalse(cp129AuditSummary.permission_audit_binding.emitted_to_audit_ledger, "CP00-129 audit summary emitted to audit ledger");
requireFalse(cp129ChangedFile.hermes_evidence_binding.changed_files_disclose_raw_diff, "CP00-129 changed-file discloses raw diff");
requireTrue(cp129Regression.regression_receipt.bound, "CP00-129 regression receipt bound");
requireFalse(cp129Closeout.closeout_handoff.commits_pack, "CP00-129 closeout handoff commits pack");
requireEqual(cp129Unknown.status, "blocked_before_permission_evaluation", "CP00-129 unknown status");
for (const profile of cp129Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-129 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-129 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-129 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-129 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-129 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-129 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-129 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-129 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-129 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-129 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-129 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-129 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-129 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-129 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-129 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-129 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-129 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-129 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-129 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-129 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-129 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-129 profile implements_ldip");
}
requireEqual(cp129Handoff.next_pack_id, "CP00-130", "CP00-129 handoff.next_pack_id");
requireEqual(cp129Handoff.next_subphase_id, "RP02.P08.M05.S20", "CP00-129 handoff.next_subphase_id");
requireEqual(
  cp129Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-129 handoff.hrx_embedded_boundary",
);
requireTrue(cp129Coverage.valid, `CP00-129 coverage valid: ${cp129Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp129PlanPack, createPermissionKernelCp129CoveredUnitIds(), "CP00-129");

requireEqual(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
  "hermes_evidence_synthetic_fixture_boundary_pack.pack_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.contract_id,
  "hermes_evidence_synthetic_fixture_boundary_pack.contract_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.upstream_hermes_evidence_workflow_binding_pack_id,
  "CP00-129",
  "hermes_evidence_synthetic_fixture_boundary_pack.upstream_hermes_evidence_workflow_binding_pack_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.inherited_hermes_evidence_workflow_binding_contract_id,
  PERMISSION_KERNEL_CP129_HERMES_EVIDENCE_WORKFLOW_BINDING_CONTRACT.contract_id,
  "hermes_evidence_synthetic_fixture_boundary_pack.inherited_hermes_evidence_workflow_binding_contract_id",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.synthetic_only,
  "hermes_evidence_synthetic_fixture_boundary_pack.synthetic_only",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.risk_a_hermes_evidence_synthetic_fixture_boundary,
  "hermes_evidence_synthetic_fixture_boundary_pack.risk_a_hermes_evidence_synthetic_fixture_boundary",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.permission_audit_terminal_reference_only,
  "hermes_evidence_synthetic_fixture_boundary_pack.permission_audit_terminal_reference_only",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.synthetic_fixture_evidence_reference_only,
  "hermes_evidence_synthetic_fixture_boundary_pack.synthetic_fixture_evidence_reference_only",
);
requireFalse(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.runtime_ui_route_added,
  "hermes_evidence_synthetic_fixture_boundary_pack.runtime_ui_route_added",
);
requireFalse(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.runtime_api_route_added,
  "hermes_evidence_synthetic_fixture_boundary_pack.runtime_api_route_added",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.next_pack_id,
  "CP00-131",
  "hermes_evidence_synthetic_fixture_boundary_pack.next_pack_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_boundary_pack?.next_subphase_id,
  "RP02.P08.M06.S08",
  "hermes_evidence_synthetic_fixture_boundary_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.public_exports) {
  requireIncludes(
    contract.hermes_evidence_synthetic_fixture_boundary_public_exports ?? [],
    exportedSymbol,
    "hermes_evidence_synthetic_fixture_boundary_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.hermes_evidence_synthetic_fixture_boundary_hidden_source_fields ?? [],
    field,
    "hermes_evidence_synthetic_fixture_boundary_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(
  PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.no_write_attestation,
)) {
  requireFalse(value, `source hermes_evidence_synthetic_fixture_boundary_no_write_attestation.${flag}`);
  requireFalse(
    contract.hermes_evidence_synthetic_fixture_boundary_no_write_attestation?.[flag],
    `contract hermes_evidence_synthetic_fixture_boundary_no_write_attestation.${flag}`,
  );
}
requireEqual(cp130Catalog.length, 10, "CP00-130 catalog length");
requireEqual(cp130Manifest.covered_unit_count, 10, "CP00-130 manifest covered_unit_count");
requireEqual(cp130Manifest.first_unit_id, "RP02.P08.M05.S20", "CP00-130 first_unit_id");
requireEqual(cp130Manifest.last_unit_id, "RP02.P08.M06.S07", "CP00-130 last_unit_id");
requireEqual(cp130Manifest.covered_micro_phase_count, 2, "CP00-130 covered micro phase count");
requireEqual(cp130Manifest.phase_counts["RP02.P08.M05"], 3, "CP00-130 RP02.P08.M05 count");
requireEqual(cp130Manifest.phase_counts["RP02.P08.M06"], 7, "CP00-130 RP02.P08.M06 count");
requireEqual(cp130Manifest.domain_counts.permission_audit_terminal_boundary, 3, "CP00-130 permission audit terminal domain count");
requireEqual(cp130Manifest.domain_counts.synthetic_fixture_evidence_boundary, 7, "CP00-130 synthetic fixture evidence domain count");
requireEqual(cp130Manifest.deliverable_counts.implementation, 3, "CP00-130 implementation deliverable count");
requireEqual(cp130Manifest.deliverable_counts.hermes_evidence, 7, "CP00-130 Hermes evidence deliverable count");
requireEqual(cp130Matrix.inherited_hermes_evidence_workflow_result_count, 40, "CP00-130 inherited CP129 result count");
requireTrue(cp130Matrix.inherited_closeout_handoff_no_commit, "CP00-130 inherited closeout no-commit");
requireTrue(cp130Matrix.inherited_permission_summary_reference_only, "CP00-130 inherited permission summary reference-only");
requireEqual(cp130Matrix.result_count, 10, "CP00-130 result count");
requireEqual(cp130Matrix.permission_audit_terminal_result_count, 3, "CP00-130 permission audit terminal result count");
requireEqual(cp130Matrix.synthetic_fixture_evidence_result_count, 7, "CP00-130 synthetic fixture evidence result count");
requireEqual(cp130HermesPacket.hermes_gate, "H02", "CP00-130 Hermes packet gate");
requireEqual(cp130HermesPacket.covered_unit_count, 10, "CP00-130 Hermes packet covered_unit_count");
requireEqual(cp130ClaudePacket.model, "claude-opus-4-8", "CP00-130 Claude packet model");
requireEqual(cp130ClaudePacket.effort, "max", "CP00-130 Claude packet effort");
requireTrue(cp130ClaudePacket.read_only, "CP00-130 Claude packet read_only");
requireTrue(cp130ClaudePacket.exactly_one_valid_pack_review_required, "CP00-130 Claude packet exactly_one_valid_pack_review_required");

const cp130NextGate = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "permission_audit_terminal.next_gate_readiness",
);
const cp130Documentation = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "permission_audit_terminal.documentation_update",
);
const cp130OperatorSummary = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "permission_audit_terminal.operator_summary",
);
const cp130CommandMatrix = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "synthetic_fixture_opening.hermes_command_matrix",
);
const cp130FieldList = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "synthetic_fixture_opening.evidence_field_list",
);
const cp130ChangedFile = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "synthetic_fixture_opening.changed_file_receipt",
);
const cp130CommandResult = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "synthetic_fixture_opening.command_result_receipt",
);
const cp130FixtureSummary = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "synthetic_fixture_opening.fixture_summary_receipt",
);
const cp130BlockedClaim = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "synthetic_fixture_opening.blocked_claim_receipt",
);
const cp130PermissionSummary = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase(
  "synthetic_fixture_opening.permission_summary_receipt",
);
const cp130Unknown = runPermissionKernelCp130HermesEvidenceSyntheticFixtureBoundaryCase("unknown_case");
requireTrue(cp130NextGate.permission_audit_terminal.next_gate_readiness_bound, "CP00-130 next gate readiness bound");
requireEqual(cp130NextGate.permission_audit_terminal.next_pack_id, "CP00-131", "CP00-130 next gate next_pack_id");
requireTrue(cp130Documentation.permission_audit_terminal.documentation_update_bound, "CP00-130 documentation update bound");
requireFalse(cp130Documentation.permission_audit_terminal.documentation_published, "CP00-130 documentation published");
requireTrue(cp130OperatorSummary.operator_summary.bound, "CP00-130 operator summary bound");
requireFalse(cp130OperatorSummary.operator_summary.hidden_fields_rendered, "CP00-130 operator summary hidden fields rendered");
requireFalse(cp130OperatorSummary.operator_summary.contains_real_data, "CP00-130 operator summary contains real data");
requireTrue(cp130CommandMatrix.synthetic_fixture_evidence.command_matrix_bound, "CP00-130 command matrix bound");
requireTrue(cp130FieldList.synthetic_fixture_evidence.evidence_field_list_bound, "CP00-130 evidence field list bound");
requireFalse(cp130ChangedFile.synthetic_fixture_evidence.changed_files_disclose_raw_diff, "CP00-130 changed-file raw diff disclosed");
requireFalse(cp130CommandResult.synthetic_fixture_evidence.command_result_discloses_raw_output, "CP00-130 command raw output disclosed");
requireFalse(cp130FixtureSummary.synthetic_fixture_evidence.fixture_contains_real_data, "CP00-130 fixture contains real data");
requireFalse(cp130FixtureSummary.synthetic_fixture_evidence.fixture_persisted, "CP00-130 fixture persisted");
requireTrue(cp130BlockedClaim.synthetic_fixture_evidence.blocked_claim_preview_only, "CP00-130 blocked claim preview only");
requireFalse(cp130BlockedClaim.synthetic_fixture_evidence.blocked_claim_persisted, "CP00-130 blocked claim persisted");
requireTrue(cp130PermissionSummary.synthetic_fixture_evidence.permission_summary_reference_only, "CP00-130 permission summary reference-only");
requireFalse(cp130PermissionSummary.synthetic_fixture_evidence.permission_policy_mutated, "CP00-130 permission policy mutated");
requireEqual(cp130Unknown.status, "blocked_before_permission_evaluation", "CP00-130 unknown status");
for (const profile of cp130Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-130 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-130 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-130 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-130 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-130 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-130 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-130 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-130 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-130 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-130 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-130 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-130 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-130 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-130 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-130 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-130 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-130 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-130 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-130 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-130 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-130 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-130 profile implements_ldip");
}
requireEqual(cp130Handoff.next_pack_id, "CP00-131", "CP00-130 handoff.next_pack_id");
requireEqual(cp130Handoff.next_subphase_id, "RP02.P08.M06.S08", "CP00-130 handoff.next_subphase_id");
requireEqual(
  cp130Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-130 handoff.hrx_embedded_boundary",
);
requireTrue(cp130Coverage.valid, `CP00-130 coverage valid: ${cp130Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp130PlanPack, createPermissionKernelCp130CoveredUnitIds(), "CP00-130");

requireEqual(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP131_PACK_BINDING.pack_id,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.pack_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT.contract_id,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.contract_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack
    ?.upstream_hermes_evidence_synthetic_fixture_boundary_pack_id,
  "CP00-130",
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.upstream_hermes_evidence_synthetic_fixture_boundary_pack_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack
    ?.inherited_hermes_evidence_synthetic_fixture_boundary_contract_id,
  PERMISSION_KERNEL_CP130_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_BOUNDARY_CONTRACT.contract_id,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.inherited_hermes_evidence_synthetic_fixture_boundary_contract_id",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.synthetic_only,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.synthetic_only",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack
    ?.risk_a_hermes_evidence_synthetic_fixture_verdict_boundary,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.risk_a_hermes_evidence_synthetic_fixture_verdict_boundary",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.evidence_receipts_reference_only,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.evidence_receipts_reference_only",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.claude_dependency_marker_reference_only,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.claude_dependency_marker_reference_only",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.human_approval_marker_reference_only,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.human_approval_marker_reference_only",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.verdict_semantics_reference_only,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.verdict_semantics_reference_only",
);
requireTrue(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.validation_harness_reference_only,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.validation_harness_reference_only",
);
requireFalse(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.runtime_ui_route_added,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.runtime_ui_route_added",
);
requireFalse(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.runtime_api_route_added,
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.runtime_api_route_added",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.next_pack_id,
  "CP00-132",
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.next_pack_id",
);
requireEqual(
  contract.hermes_evidence_synthetic_fixture_verdict_boundary_pack?.next_subphase_id,
  "RP02.P08.M06.S18",
  "hermes_evidence_synthetic_fixture_verdict_boundary_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT.public_exports) {
  requireIncludes(
    contract.hermes_evidence_synthetic_fixture_verdict_boundary_public_exports ?? [],
    exportedSymbol,
    "hermes_evidence_synthetic_fixture_verdict_boundary_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.hermes_evidence_synthetic_fixture_verdict_boundary_hidden_source_fields ?? [],
    field,
    "hermes_evidence_synthetic_fixture_verdict_boundary_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(
  PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT.no_write_attestation,
)) {
  requireFalse(value, `source hermes_evidence_synthetic_fixture_verdict_boundary_no_write_attestation.${flag}`);
  requireFalse(
    contract.hermes_evidence_synthetic_fixture_verdict_boundary_no_write_attestation?.[flag],
    `contract hermes_evidence_synthetic_fixture_verdict_boundary_no_write_attestation.${flag}`,
  );
}
requireEqual(cp131Catalog.length, 10, "CP00-131 catalog length");
requireEqual(cp131Manifest.covered_unit_count, 10, "CP00-131 manifest covered_unit_count");
requireEqual(cp131Manifest.first_unit_id, "RP02.P08.M06.S08", "CP00-131 first_unit_id");
requireEqual(cp131Manifest.last_unit_id, "RP02.P08.M06.S17", "CP00-131 last_unit_id");
requireEqual(cp131Manifest.covered_micro_phase_count, 1, "CP00-131 covered micro phase count");
requireEqual(cp131Manifest.phase_counts["RP02.P08.M06"], 10, "CP00-131 RP02.P08.M06 count");
requireEqual(
  cp131Manifest.domain_counts.synthetic_fixture_evidence_receipt_boundary,
  3,
  "CP00-131 evidence receipt domain count",
);
requireEqual(
  cp131Manifest.domain_counts.synthetic_fixture_review_dependency_boundary,
  1,
  "CP00-131 review dependency domain count",
);
requireEqual(cp131Manifest.domain_counts.synthetic_fixture_verdict_boundary, 6, "CP00-131 verdict domain count");
requireEqual(cp131Manifest.deliverable_counts.implementation, 6, "CP00-131 implementation deliverable count");
requireEqual(cp131Manifest.deliverable_counts.hermes_evidence, 3, "CP00-131 Hermes evidence deliverable count");
requireEqual(cp131Manifest.deliverable_counts.claude_review, 1, "CP00-131 Claude review deliverable count");
requireEqual(
  cp131Matrix.inherited_hermes_evidence_synthetic_fixture_boundary_result_count,
  10,
  "CP00-131 inherited CP130 result count",
);
requireTrue(cp131Matrix.inherited_permission_summary_reference_only, "CP00-131 inherited permission summary reference-only");
requireTrue(cp131Matrix.inherited_command_result_no_raw_output, "CP00-131 inherited command result no raw output");
requireTrue(cp131Matrix.inherited_next_gate_handoff_to_cp131, "CP00-131 inherited next gate handoff");
requireEqual(cp131Matrix.result_count, 10, "CP00-131 result count");
requireEqual(cp131Matrix.synthetic_fixture_evidence_receipt_result_count, 3, "CP00-131 evidence receipt result count");
requireEqual(cp131Matrix.synthetic_fixture_review_dependency_result_count, 1, "CP00-131 review dependency result count");
requireEqual(cp131Matrix.synthetic_fixture_verdict_result_count, 6, "CP00-131 verdict result count");
requireEqual(cp131HermesPacket.hermes_gate, "H02", "CP00-131 Hermes packet gate");
requireEqual(cp131HermesPacket.covered_unit_count, 10, "CP00-131 Hermes packet covered_unit_count");
requireEqual(cp131ClaudePacket.model, "claude-opus-4-8", "CP00-131 Claude packet model");
requireEqual(cp131ClaudePacket.effort, "max", "CP00-131 Claude packet effort");
requireTrue(cp131ClaudePacket.read_only, "CP00-131 Claude packet read_only");
requireTrue(cp131ClaudePacket.exactly_one_valid_pack_review_required, "CP00-131 Claude packet exactly_one_valid_pack_review_required");

const cp131AuditSummary = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_evidence_receipt.audit_summary_receipt",
);
const cp131NoRealData = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_evidence_receipt.no_real_data_receipt",
);
const cp131ClaudeDependency = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_review_dependency.claude_dependency_marker",
);
const cp131HumanApproval = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_verdict.human_approval_marker",
);
const cp131Pass = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_verdict.pass_semantics",
);
const cp131PassWithFindings = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_verdict.pass_with_findings_semantics",
);
const cp131Block = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_verdict.block_semantics",
);
const cp131EvidenceTemplate = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_evidence_receipt.evidence_template",
);
const cp131Validation = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_verdict.validation_command_check",
);
const cp131Harness = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase(
  "synthetic_fixture_verdict.harness_boundary_note",
);
const cp131Unknown = runPermissionKernelCp131HermesEvidenceSyntheticFixtureVerdictBoundaryCase("unknown_case");
requireTrue(
  cp131AuditSummary.synthetic_fixture_evidence_receipt.audit_summary_reference_only,
  "CP00-131 audit summary reference-only",
);
requireFalse(
  cp131AuditSummary.synthetic_fixture_evidence_receipt.audit_summary_emitted_to_audit_ledger,
  "CP00-131 audit summary emitted to audit ledger",
);
requireFalse(
  cp131NoRealData.synthetic_fixture_evidence_receipt.fixture_contains_real_data,
  "CP00-131 no-real-data contains real data",
);
requireFalse(cp131NoRealData.synthetic_fixture_evidence_receipt.fixture_persisted, "CP00-131 no-real-data persisted");
requireFalse(cp131ClaudeDependency.claude_dependency_marker.executes_claude_review, "CP00-131 Claude marker executes review");
requireFalse(cp131HumanApproval.human_approval_marker.grants_human_approval, "CP00-131 human marker grants approval");
requireTrue(cp131Pass.verdict_semantics.pass_semantics_bound, "CP00-131 PASS semantics bound");
requireTrue(
  cp131PassWithFindings.verdict_semantics.pass_with_findings_requires_adjudication,
  "CP00-131 PASS_WITH_FINDINGS requires adjudication",
);
requireTrue(cp131Block.verdict_semantics.block_prevents_production_ready, "CP00-131 BLOCK prevents production_ready");
requireTrue(cp131EvidenceTemplate.synthetic_fixture_evidence_receipt.evidence_template_reference_only, "CP00-131 evidence template reference-only");
requireFalse(
  cp131Validation.validation_command_check.command_executed_by_runtime,
  "CP00-131 validation command executed by runtime",
);
requireFalse(cp131Validation.validation_command_check.raw_output_disclosed, "CP00-131 validation command raw output disclosed");
requireFalse(cp131Harness.harness_boundary_note.harness_runtime_invoked, "CP00-131 harness runtime invoked");
requireEqual(cp131Unknown.status, "blocked_before_permission_evaluation", "CP00-131 unknown status");
for (const profile of cp131Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-131 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-131 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-131 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-131 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-131 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-131 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-131 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-131 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-131 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-131 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-131 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-131 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-131 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-131 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-131 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-131 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-131 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-131 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-131 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-131 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-131 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-131 profile implements_ldip");
}
requireEqual(cp131Handoff.next_pack_id, "CP00-132", "CP00-131 handoff.next_pack_id");
requireEqual(cp131Handoff.next_subphase_id, "RP02.P08.M06.S18", "CP00-131 handoff.next_subphase_id");
requireEqual(
  cp131Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-131 handoff.hrx_embedded_boundary",
);
requireTrue(cp131Coverage.valid, `CP00-131 coverage valid: ${cp131Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp131PlanPack, createPermissionKernelCp131CoveredUnitIds(), "CP00-131");

requireEqual(
  contract.fixture_evidence_review_readiness_catalog_pack?.pack_id,
  PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
  "fixture_evidence_review_readiness_catalog_pack.pack_id",
);
requireEqual(
  contract.fixture_evidence_review_readiness_catalog_pack?.contract_id,
  PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT.contract_id,
  "fixture_evidence_review_readiness_catalog_pack.contract_id",
);
requireEqual(
  contract.fixture_evidence_review_readiness_catalog_pack?.upstream_hermes_evidence_synthetic_fixture_verdict_boundary_pack_id,
  "CP00-131",
  "fixture_evidence_review_readiness_catalog_pack.upstream_hermes_evidence_synthetic_fixture_verdict_boundary_pack_id",
);
requireEqual(
  contract.fixture_evidence_review_readiness_catalog_pack
    ?.inherited_hermes_evidence_synthetic_fixture_verdict_boundary_contract_id,
  PERMISSION_KERNEL_CP131_HERMES_EVIDENCE_SYNTHETIC_FIXTURE_VERDICT_BOUNDARY_CONTRACT.contract_id,
  "fixture_evidence_review_readiness_catalog_pack.inherited_hermes_evidence_synthetic_fixture_verdict_boundary_contract_id",
);
requireTrue(
  contract.fixture_evidence_review_readiness_catalog_pack?.synthetic_only,
  "fixture_evidence_review_readiness_catalog_pack.synthetic_only",
);
requireTrue(
  contract.fixture_evidence_review_readiness_catalog_pack?.risk_c_fixture_evidence_review_readiness_catalog,
  "fixture_evidence_review_readiness_catalog_pack.risk_c_fixture_evidence_review_readiness_catalog",
);
requireTrue(
  contract.fixture_evidence_review_readiness_catalog_pack?.fixture_evidence_reference_only,
  "fixture_evidence_review_readiness_catalog_pack.fixture_evidence_reference_only",
);
requireTrue(
  contract.fixture_evidence_review_readiness_catalog_pack?.review_questions_reference_only,
  "fixture_evidence_review_readiness_catalog_pack.review_questions_reference_only",
);
requireTrue(
  contract.fixture_evidence_review_readiness_catalog_pack?.closeout_readiness_reference_only,
  "fixture_evidence_review_readiness_catalog_pack.closeout_readiness_reference_only",
);
requireFalse(
  contract.fixture_evidence_review_readiness_catalog_pack?.runtime_ui_route_added,
  "fixture_evidence_review_readiness_catalog_pack.runtime_ui_route_added",
);
requireFalse(
  contract.fixture_evidence_review_readiness_catalog_pack?.runtime_api_route_added,
  "fixture_evidence_review_readiness_catalog_pack.runtime_api_route_added",
);
requireEqual(
  contract.fixture_evidence_review_readiness_catalog_pack?.next_pack_id,
  "CP00-133",
  "fixture_evidence_review_readiness_catalog_pack.next_pack_id",
);
requireEqual(
  contract.fixture_evidence_review_readiness_catalog_pack?.next_subphase_id,
  "RP02.P09.M05.S18",
  "fixture_evidence_review_readiness_catalog_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT.public_exports) {
  requireIncludes(
    contract.fixture_evidence_review_readiness_catalog_public_exports ?? [],
    exportedSymbol,
    "fixture_evidence_review_readiness_catalog_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.fixture_evidence_review_readiness_catalog_hidden_source_fields ?? [],
    field,
    "fixture_evidence_review_readiness_catalog_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(
  PERMISSION_KERNEL_CP132_FIXTURE_EVIDENCE_REVIEW_READINESS_CATALOG_CONTRACT.no_write_attestation,
)) {
  requireFalse(value, `source fixture_evidence_review_readiness_catalog_no_write_attestation.${flag}`);
  requireFalse(
    contract.fixture_evidence_review_readiness_catalog_no_write_attestation?.[flag],
    `contract fixture_evidence_review_readiness_catalog_no_write_attestation.${flag}`,
  );
}
requireEqual(cp132Catalog.length, 150, "CP00-132 catalog length");
requireEqual(cp132Manifest.covered_unit_count, 150, "CP00-132 manifest covered_unit_count");
requireEqual(cp132Manifest.first_unit_id, "RP02.P08.M06.S18", "CP00-132 first_unit_id");
requireEqual(cp132Manifest.last_unit_id, "RP02.P09.M05.S17", "CP00-132 last_unit_id");
requireEqual(cp132Manifest.covered_micro_phase_count, 11, "CP00-132 covered micro phase count");
for (const [microPhaseId, count] of Object.entries({
  "RP02.P08.M06": 3,
  "RP02.P08.M07": 22,
  "RP02.P08.M08": 20,
  "RP02.P08.M09": 20,
  "RP02.P08.M10": 8,
  "RP02.P09.M00": 4,
  "RP02.P09.M01": 8,
  "RP02.P09.M02": 8,
  "RP02.P09.M03": 20,
  "RP02.P09.M04": 20,
  "RP02.P09.M05": 17,
})) {
  requireEqual(cp132Manifest.phase_counts[microPhaseId], count, `CP00-132 ${microPhaseId} count`);
}
for (const [deliverableType, count] of Object.entries({
  implementation: 68,
  test: 9,
  hermes_evidence: 38,
  claude_review: 18,
  security_audit: 12,
  ui: 5,
})) {
  requireEqual(cp132Manifest.deliverable_counts[deliverableType], count, `CP00-132 ${deliverableType} deliverable count`);
}
requireEqual(
  cp132Matrix.inherited_hermes_evidence_synthetic_fixture_verdict_boundary_result_count,
  10,
  "CP00-132 inherited CP131 result count",
);
requireTrue(cp132Matrix.inherited_claude_dependency_not_executed, "CP00-132 inherited Claude dependency no-execution");
requireTrue(
  cp132Matrix.inherited_pass_with_findings_requires_adjudication,
  "CP00-132 inherited PASS_WITH_FINDINGS adjudication",
);
requireTrue(cp132Matrix.inherited_block_prevents_production_ready, "CP00-132 inherited BLOCK production_ready prevention");
requireEqual(cp132Matrix.result_count, 150, "CP00-132 result count");
requireEqual(cp132Matrix.fixture_evidence_result_count, 38, "CP00-132 fixture evidence result count");
requireEqual(cp132Matrix.fixture_verdict_validation_result_count, 18, "CP00-132 fixture verdict validation result count");
requireEqual(cp132Matrix.claude_review_packet_result_count, 6, "CP00-132 Claude review packet result count");
requireEqual(cp132Matrix.review_question_result_count, 44, "CP00-132 review question result count");
requireEqual(cp132Matrix.fixture_closeout_readiness_result_count, 14, "CP00-132 fixture closeout readiness result count");
requireEqual(cp132Matrix.review_closeout_readiness_result_count, 30, "CP00-132 review closeout readiness result count");
requireEqual(cp132HermesPacket.hermes_gate, "H02", "CP00-132 Hermes packet gate");
requireEqual(cp132HermesPacket.covered_unit_count, 150, "CP00-132 Hermes packet covered_unit_count");
requireEqual(cp132ClaudePacket.model, "claude-opus-4-8", "CP00-132 Claude packet model");
requireEqual(cp132ClaudePacket.effort, "max", "CP00-132 Claude packet effort");
requireTrue(cp132ClaudePacket.read_only, "CP00-132 Claude packet read_only");
requireTrue(cp132ClaudePacket.exactly_one_valid_pack_review_required, "CP00-132 Claude packet exactly_one_valid_pack_review_required");

const cp132HermesCommand = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p08_m07.hermes_command_matrix");
const cp132ChangedFile = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p08_m07.changed_file_receipt");
const cp132Block = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p08_m07.block_semantics");
const cp132EvidenceTemplate = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p08_m08.evidence_template");
const cp132ClaudeDependency = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p08_m09.claude_dependency_marker");
const cp132AuditSummary = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p08_m10.audit_summary_receipt");
const cp132PermissionBypass = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p09_m00.permission_bypass_questions");
const cp132UiLeak = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p09_m01.ui_leak_questions");
const cp132FindingRouting = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p09_m03.finding_routing_map");
const cp132BlockCloseout = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("rp02_p09_m05.block_closeout_note");
const cp132Unknown = runPermissionKernelCp132FixtureEvidenceReviewReadinessCase("unknown_case");
requireTrue(cp132HermesCommand.fixture_evidence.command_matrix_bound, "CP00-132 Hermes command matrix bound");
requireFalse(cp132ChangedFile.fixture_evidence.changed_files_disclose_raw_diff, "CP00-132 changed-file raw diff disclosed");
requireTrue(cp132Block.verdict_validation.block_prevents_production_ready, "CP00-132 BLOCK prevents production_ready");
requireTrue(cp132EvidenceTemplate.fixture_evidence.evidence_template_reference_only, "CP00-132 evidence template reference-only");
requireFalse(cp132ClaudeDependency.claude_review_packet.executes_claude_review, "CP00-132 Claude dependency executes review");
requireFalse(cp132AuditSummary.fixture_evidence.audit_summary_emitted_to_audit_ledger, "CP00-132 audit summary emitted to audit ledger");
requireFalse(cp132PermissionBypass.review_questions.executes_permission_bypass, "CP00-132 permission bypass executes bypass");
requireFalse(cp132UiLeak.review_questions.renders_ui, "CP00-132 UI leak question renders UI");
requireTrue(cp132FindingRouting.closeout_readiness.finding_routing_map_bound, "CP00-132 finding routing map bound");
requireFalse(cp132BlockCloseout.closeout_readiness.marks_production_ready, "CP00-132 BLOCK closeout marks production_ready");
requireEqual(cp132Unknown.status, "blocked_before_permission_evaluation", "CP00-132 unknown status");
for (const profile of cp132Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-132 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-132 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-132 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-132 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-132 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-132 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-132 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-132 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-132 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-132 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-132 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-132 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-132 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-132 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-132 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-132 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-132 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-132 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-132 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-132 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-132 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-132 profile implements_ldip");
}
requireEqual(cp132Handoff.next_pack_id, "CP00-133", "CP00-132 handoff.next_pack_id");
requireEqual(cp132Handoff.next_subphase_id, "RP02.P09.M05.S18", "CP00-132 handoff.next_subphase_id");
requireEqual(
  cp132Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-132 handoff.hrx_embedded_boundary",
);
requireTrue(cp132Coverage.valid, `CP00-132 coverage valid: ${cp132Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp132PlanPack, createPermissionKernelCp132CoveredUnitIds(), "CP00-132");

requireEqual(
  contract.terminal_review_question_boundary_pack?.pack_id,
  PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
  "terminal_review_question_boundary_pack.pack_id",
);
requireEqual(
  contract.terminal_review_question_boundary_pack?.contract_id,
  PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT.contract_id,
  "terminal_review_question_boundary_pack.contract_id",
);
requireEqual(
  contract.terminal_review_question_boundary_pack?.upstream_fixture_evidence_review_readiness_catalog_pack_id,
  PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT
    .upstream_fixture_evidence_review_readiness_catalog_pack_id,
  "terminal_review_question_boundary_pack.upstream_fixture_evidence_review_readiness_catalog_pack_id",
);
requireEqual(
  contract.terminal_review_question_boundary_pack?.inherited_fixture_evidence_review_readiness_catalog_contract_id,
  PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT
    .inherited_fixture_evidence_review_readiness_catalog_contract_id,
  "terminal_review_question_boundary_pack.inherited_fixture_evidence_review_readiness_catalog_contract_id",
);
requireTrue(
  contract.terminal_review_question_boundary_pack?.synthetic_only,
  "terminal_review_question_boundary_pack.synthetic_only",
);
requireTrue(
  contract.terminal_review_question_boundary_pack?.risk_a_terminal_review_question_boundary,
  "terminal_review_question_boundary_pack.risk_a_terminal_review_question_boundary",
);
requireTrue(
  contract.terminal_review_question_boundary_pack?.terminal_handoff_reference_only,
  "terminal_review_question_boundary_pack.terminal_handoff_reference_only",
);
requireTrue(
  contract.terminal_review_question_boundary_pack?.review_questions_reference_only,
  "terminal_review_question_boundary_pack.review_questions_reference_only",
);
requireTrue(
  contract.terminal_review_question_boundary_pack?.security_audit_questions_reference_only,
  "terminal_review_question_boundary_pack.security_audit_questions_reference_only",
);
requireTrue(
  contract.terminal_review_question_boundary_pack?.test_questions_reference_only,
  "terminal_review_question_boundary_pack.test_questions_reference_only",
);
requireTrue(
  contract.terminal_review_question_boundary_pack?.ui_leak_questions_reference_only,
  "terminal_review_question_boundary_pack.ui_leak_questions_reference_only",
);
requireFalse(
  contract.terminal_review_question_boundary_pack?.runtime_ui_route_added,
  "terminal_review_question_boundary_pack.runtime_ui_route_added",
);
requireFalse(
  contract.terminal_review_question_boundary_pack?.runtime_api_route_added,
  "terminal_review_question_boundary_pack.runtime_api_route_added",
);
requireEqual(
  contract.terminal_review_question_boundary_pack?.next_pack_id,
  "CP00-134",
  "terminal_review_question_boundary_pack.next_pack_id",
);
requireEqual(
  contract.terminal_review_question_boundary_pack?.next_subphase_id,
  "RP02.P09.M06.S08",
  "terminal_review_question_boundary_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT.public_exports) {
  requireIncludes(
    contract.terminal_review_question_boundary_public_exports ?? [],
    exportedSymbol,
    "terminal_review_question_boundary_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.terminal_review_question_boundary_hidden_source_fields ?? [],
    field,
    "terminal_review_question_boundary_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(
  PERMISSION_KERNEL_CP133_TERMINAL_REVIEW_QUESTION_BOUNDARY_CONTRACT.no_write_attestation,
)) {
  requireFalse(value, `source terminal_review_question_boundary_no_write_attestation.${flag}`);
  requireFalse(
    contract.terminal_review_question_boundary_no_write_attestation?.[flag],
    `contract terminal_review_question_boundary_no_write_attestation.${flag}`,
  );
}
requireEqual(cp133Catalog.length, 10, "CP00-133 catalog length");
requireEqual(cp133Manifest.covered_unit_count, 10, "CP00-133 manifest covered_unit_count");
requireEqual(cp133Manifest.first_unit_id, "RP02.P09.M05.S18", "CP00-133 first_unit_id");
requireEqual(cp133Manifest.last_unit_id, "RP02.P09.M06.S07", "CP00-133 last_unit_id");
requireEqual(cp133Manifest.covered_micro_phase_count, 2, "CP00-133 covered micro phase count");
requireEqual(cp133Manifest.phase_counts["RP02.P09.M05"], 3, "CP00-133 RP02.P09.M05 count");
requireEqual(cp133Manifest.phase_counts["RP02.P09.M06"], 7, "CP00-133 RP02.P09.M06 count");
for (const [deliverableType, count] of Object.entries({
  implementation: 4,
  claude_review: 2,
  security_audit: 2,
  test: 1,
  ui: 1,
})) {
  requireEqual(cp133Manifest.deliverable_counts[deliverableType], count, `CP00-133 ${deliverableType} deliverable count`);
}
requireEqual(
  cp133Matrix.inherited_fixture_evidence_review_readiness_result_count,
  150,
  "CP00-133 inherited CP132 result count",
);
requireTrue(cp133Matrix.inherited_handoff_to_cp133, "CP00-133 inherited CP132 handoff");
requireTrue(cp133Matrix.inherited_permission_bypass_no_execution, "CP00-133 inherited permission bypass no-execution");
requireTrue(cp133Matrix.inherited_command_rerun_reference_only, "CP00-133 inherited command rerun reference-only");
requireEqual(cp133Matrix.result_count, 10, "CP00-133 result count");
requireEqual(cp133Matrix.terminal_handoff_result_count, 3, "CP00-133 terminal handoff result count");
requireEqual(cp133Matrix.review_question_result_count, 3, "CP00-133 review question result count");
requireEqual(cp133Matrix.security_audit_question_result_count, 2, "CP00-133 security audit question result count");
requireEqual(cp133Matrix.test_question_result_count, 1, "CP00-133 test question result count");
requireEqual(cp133Matrix.ui_leak_question_result_count, 1, "CP00-133 UI leak question result count");
requireEqual(cp133HermesPacket.hermes_gate, "H02", "CP00-133 Hermes packet gate");
requireEqual(cp133HermesPacket.covered_unit_count, 10, "CP00-133 Hermes packet covered_unit_count");
requireEqual(cp133ClaudePacket.model, "claude-opus-4-8", "CP00-133 Claude packet model");
requireEqual(cp133ClaudePacket.effort, "max", "CP00-133 Claude packet effort");
requireTrue(cp133ClaudePacket.read_only, "CP00-133 Claude packet read_only");
requireTrue(cp133ClaudePacket.exactly_one_valid_pack_review_required, "CP00-133 Claude packet exactly_one_valid_pack_review_required");

const cp133NextDependency = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
  "rp02_p09_m05.next_rp_dependency",
);
const cp133Documentation = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
  "rp02_p09_m05.documentation_update",
);
const cp133CommandRerun = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase("rp02_p09_m05.command_rerun");
const cp133Architecture = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
  "rp02_p09_m06.architecture_review_questions",
);
const cp133PermissionBypass = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
  "rp02_p09_m06.permission_bypass_questions",
);
const cp133AuditCompleteness = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
  "rp02_p09_m06.audit_completeness_questions",
);
const cp133MissingTest = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
  "rp02_p09_m06.missing_test_questions",
);
const cp133UiLeak = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase("rp02_p09_m06.ui_leak_questions");
const cp133DownstreamReadiness = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase(
  "rp02_p09_m06.downstream_readiness_questions",
);
const cp133Unknown = runPermissionKernelCp133TerminalReviewQuestionBoundaryCase("unknown_case");
requireTrue(cp133NextDependency.terminal_handoff.next_rp_dependency_bound, "CP00-133 next dependency bound");
requireFalse(cp133Documentation.terminal_handoff.documentation_published, "CP00-133 documentation published");
requireFalse(cp133CommandRerun.terminal_handoff.command_rerun_executed, "CP00-133 command rerun executed");
requireFalse(cp133Architecture.review_questions.executes_claude_review, "CP00-133 architecture executes Claude");
requireFalse(cp133PermissionBypass.security_audit_questions.executes_permission_bypass, "CP00-133 permission bypass executes");
requireFalse(cp133AuditCompleteness.security_audit_questions.emits_audit_event, "CP00-133 audit completeness emits audit");
requireFalse(cp133MissingTest.test_questions.executes_tests, "CP00-133 missing test executes tests");
requireFalse(cp133UiLeak.ui_leak_questions.renders_ui, "CP00-133 UI leak renders UI");
requireFalse(cp133DownstreamReadiness.review_questions.grants_approval, "CP00-133 downstream readiness grants approval");
requireEqual(cp133Unknown.status, "blocked_before_permission_evaluation", "CP00-133 unknown status");
for (const profile of cp133Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-133 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-133 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-133 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-133 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-133 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-133 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-133 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-133 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-133 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-133 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-133 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-133 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-133 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-133 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-133 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-133 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-133 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-133 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-133 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-133 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-133 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-133 profile implements_ldip");
}
requireEqual(cp133Handoff.next_pack_id, "CP00-134", "CP00-133 handoff.next_pack_id");
requireEqual(cp133Handoff.next_subphase_id, "RP02.P09.M06.S08", "CP00-133 handoff.next_subphase_id");
requireEqual(
  cp133Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-133 handoff.hrx_embedded_boundary",
);
requireTrue(cp133Coverage.valid, `CP00-133 coverage valid: ${cp133Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp133PlanPack, createPermissionKernelCp133CoveredUnitIds(), "CP00-133");

requireEqual(
  contract.terminal_review_closeout_readiness_pack?.pack_id,
  PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
  "terminal_review_closeout_readiness_pack.pack_id",
);
requireEqual(
  contract.terminal_review_closeout_readiness_pack?.contract_id,
  PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT.contract_id,
  "terminal_review_closeout_readiness_pack.contract_id",
);
requireEqual(
  contract.terminal_review_closeout_readiness_pack?.upstream_terminal_review_question_boundary_pack_id,
  PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT
    .upstream_terminal_review_question_boundary_pack_id,
  "terminal_review_closeout_readiness_pack.upstream_terminal_review_question_boundary_pack_id",
);
requireEqual(
  contract.terminal_review_closeout_readiness_pack?.inherited_terminal_review_question_boundary_contract_id,
  PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT
    .inherited_terminal_review_question_boundary_contract_id,
  "terminal_review_closeout_readiness_pack.inherited_terminal_review_question_boundary_contract_id",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.synthetic_only,
  "terminal_review_closeout_readiness_pack.synthetic_only",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.risk_c_terminal_review_closeout_readiness,
  "terminal_review_closeout_readiness_pack.risk_c_terminal_review_closeout_readiness",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.review_questions_reference_only,
  "terminal_review_closeout_readiness_pack.review_questions_reference_only",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.security_audit_questions_reference_only,
  "terminal_review_closeout_readiness_pack.security_audit_questions_reference_only",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.test_questions_reference_only,
  "terminal_review_closeout_readiness_pack.test_questions_reference_only",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.ui_leak_questions_reference_only,
  "terminal_review_closeout_readiness_pack.ui_leak_questions_reference_only",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.claude_review_packet_reference_only,
  "terminal_review_closeout_readiness_pack.claude_review_packet_reference_only",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.closeout_decisions_reference_only,
  "terminal_review_closeout_readiness_pack.closeout_decisions_reference_only",
);
requireTrue(
  contract.terminal_review_closeout_readiness_pack?.terminal_handoff_reference_only,
  "terminal_review_closeout_readiness_pack.terminal_handoff_reference_only",
);
requireFalse(
  contract.terminal_review_closeout_readiness_pack?.runtime_ui_route_added,
  "terminal_review_closeout_readiness_pack.runtime_ui_route_added",
);
requireFalse(
  contract.terminal_review_closeout_readiness_pack?.runtime_api_route_added,
  "terminal_review_closeout_readiness_pack.runtime_api_route_added",
);
requireEqual(
  contract.terminal_review_closeout_readiness_pack?.next_pack_id,
  "CP00-135",
  "terminal_review_closeout_readiness_pack.next_pack_id",
);
requireEqual(
  contract.terminal_review_closeout_readiness_pack?.next_subphase_id,
  "RP03.P00.M00.S01",
  "terminal_review_closeout_readiness_pack.next_subphase_id",
);
for (const exportedSymbol of PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT.public_exports) {
  requireIncludes(
    contract.terminal_review_closeout_readiness_public_exports ?? [],
    exportedSymbol,
    "terminal_review_closeout_readiness_public_exports",
  );
}
for (const field of PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT.hidden_source_fields) {
  requireIncludes(
    contract.terminal_review_closeout_readiness_hidden_source_fields ?? [],
    field,
    "terminal_review_closeout_readiness_hidden_source_fields",
  );
}
for (const [flag, value] of Object.entries(
  PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT.no_write_attestation,
)) {
  requireFalse(value, `source terminal_review_closeout_readiness_no_write_attestation.${flag}`);
  requireFalse(
    contract.terminal_review_closeout_readiness_no_write_attestation?.[flag],
    `contract terminal_review_closeout_readiness_no_write_attestation.${flag}`,
  );
}
requireEqual(cp134Catalog.length, 65, "CP00-134 catalog length");
requireEqual(cp134Manifest.covered_unit_count, 65, "CP00-134 manifest covered_unit_count");
requireEqual(cp134Manifest.first_unit_id, "RP02.P09.M06.S08", "CP00-134 first_unit_id");
requireEqual(cp134Manifest.last_unit_id, "RP02.P09.M10.S04", "CP00-134 last_unit_id");
requireEqual(cp134Manifest.covered_micro_phase_count, 5, "CP00-134 covered micro phase count");
for (const [microPhaseId, count] of Object.entries({
  "RP02.P09.M06": 13,
  "RP02.P09.M07": 20,
  "RP02.P09.M08": 20,
  "RP02.P09.M09": 8,
  "RP02.P09.M10": 4,
})) {
  requireEqual(cp134Manifest.phase_counts[microPhaseId], count, `CP00-134 ${microPhaseId} count`);
}
for (const [deliverableType, count] of Object.entries({
  implementation: 40,
  claude_review: 11,
  security_audit: 8,
  test: 3,
  ui: 3,
})) {
  requireEqual(cp134Manifest.deliverable_counts[deliverableType], count, `CP00-134 ${deliverableType} deliverable count`);
}
requireEqual(
  cp134Matrix.inherited_terminal_review_question_result_count,
  10,
  "CP00-134 inherited CP133 result count",
);
requireTrue(cp134Matrix.inherited_handoff_to_cp134, "CP00-134 inherited CP133 handoff");
requireTrue(cp134Matrix.inherited_permission_bypass_no_execution, "CP00-134 inherited permission bypass no-execution");
requireTrue(cp134Matrix.inherited_ui_leak_not_rendered, "CP00-134 inherited UI leak no-rendering");
requireEqual(cp134Matrix.result_count, 65, "CP00-134 result count");
requireEqual(cp134Matrix.review_question_result_count, 15, "CP00-134 review question result count");
requireEqual(cp134Matrix.security_audit_question_result_count, 8, "CP00-134 security audit question result count");
requireEqual(cp134Matrix.test_question_result_count, 3, "CP00-134 test question result count");
requireEqual(cp134Matrix.ui_leak_question_result_count, 3, "CP00-134 UI leak question result count");
requireEqual(cp134Matrix.claude_review_packet_result_count, 3, "CP00-134 Claude review packet result count");
requireEqual(cp134Matrix.closeout_decision_result_count, 24, "CP00-134 closeout decision result count");
requireEqual(cp134Matrix.terminal_handoff_result_count, 9, "CP00-134 terminal handoff result count");
requireEqual(cp134HermesPacket.hermes_gate, "H02", "CP00-134 Hermes packet gate");
requireEqual(cp134HermesPacket.covered_unit_count, 65, "CP00-134 Hermes packet covered_unit_count");
requireEqual(cp134ClaudePacket.model, "claude-opus-4-8", "CP00-134 Claude packet model");
requireEqual(cp134ClaudePacket.effort, "max", "CP00-134 Claude packet effort");
requireTrue(cp134ClaudePacket.read_only, "CP00-134 Claude packet read_only");
requireTrue(cp134ClaudePacket.exactly_one_valid_pack_review_required, "CP00-134 Claude packet exactly_one_valid_pack_review_required");

const cp134RiskRegister = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase("rp02_p09_m06.risk_register");
const cp134FindingRouting = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase(
  "rp02_p09_m07.finding_routing_map",
);
const cp134PassWithFindings = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase(
  "rp02_p09_m07.pass_with_findings_closeout_note",
);
const cp134Block = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase("rp02_p09_m08.block_closeout_note");
const cp134ClaudeReviewPacket = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase(
  "rp02_p09_m08.claude_review_packet",
);
const cp134CommandRerun = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase("rp02_p09_m08.command_rerun");
const cp134PermissionBypass = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase(
  "rp02_p09_m09.permission_bypass_questions",
);
const cp134UiLeak = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase("rp02_p09_m09.ui_leak_questions");
const cp134AuditCompleteness = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase(
  "rp02_p09_m10.audit_completeness_questions",
);
const cp134Unknown = runPermissionKernelCp134TerminalReviewCloseoutReadinessCase("unknown_case");
requireFalse(cp134RiskRegister.review_questions.writes_risk_register, "CP00-134 risk register writes");
requireFalse(cp134FindingRouting.closeout_decisions.routing_executes, "CP00-134 finding routing executes");
requireTrue(
  cp134PassWithFindings.closeout_decisions.pass_with_findings_requires_adjudication,
  "CP00-134 PASS_WITH_FINDINGS requires adjudication",
);
requireTrue(cp134Block.closeout_decisions.block_prevents_production_ready, "CP00-134 BLOCK prevents production_ready");
requireFalse(cp134ClaudeReviewPacket.claude_review_packet.executes_claude_review, "CP00-134 Claude packet executes");
requireFalse(cp134CommandRerun.terminal_handoff.command_rerun_executed, "CP00-134 command rerun executed");
requireFalse(cp134PermissionBypass.security_audit_questions.executes_permission_bypass, "CP00-134 permission bypass executes");
requireFalse(cp134UiLeak.ui_leak_questions.renders_ui, "CP00-134 UI leak renders");
requireFalse(cp134AuditCompleteness.security_audit_questions.emits_audit_event, "CP00-134 audit completeness emits audit");
requireEqual(cp134Unknown.status, "blocked_before_permission_evaluation", "CP00-134 unknown status");
for (const profile of cp134Matrix.case_results) {
  requireTrue(profile.synthetic_only, "CP00-134 profile synthetic_only");
  requireTrue(profile.no_real_data, "CP00-134 profile no_real_data");
  requireFalse(profile.unauthorized_count_exposed, "CP00-134 profile unauthorized_count_exposed");
  requireFalse(profile.hidden_field_names_exposed, "CP00-134 profile hidden_field_names_exposed");
  requireFalse(profile.mutates_permission_policy, "CP00-134 profile mutates_permission_policy");
  requireFalse(profile.writes_product_state, "CP00-134 profile writes_product_state");
  requireFalse(profile.writes_audit_event, "CP00-134 profile writes_audit_event");
  requireFalse(profile.creates_database_rows, "CP00-134 profile creates_database_rows");
  requireFalse(profile.persists_idempotency_keys, "CP00-134 profile persists_idempotency_keys");
  requireFalse(profile.acquires_locks, "CP00-134 profile acquires_locks");
  requireFalse(profile.persists_lock_tokens, "CP00-134 profile persists_lock_tokens");
  requireFalse(profile.executes_rollback, "CP00-134 profile executes_rollback");
  requireFalse(profile.executes_retry, "CP00-134 profile executes_retry");
  requireFalse(profile.executes_compensation, "CP00-134 profile executes_compensation");
  requireFalse(profile.executes_export_download, "CP00-134 profile executes_export_download");
  requireFalse(profile.executes_external_share, "CP00-134 profile executes_external_share");
  requireFalse(profile.executes_ai_retrieval, "CP00-134 profile executes_ai_retrieval");
  requireFalse(profile.executes_analytics_query, "CP00-134 profile executes_analytics_query");
  requireFalse(profile.grants_human_approval, "CP00-134 profile grants_human_approval");
  requireFalse(profile.executes_claude_review, "CP00-134 profile executes_claude_review");
  requireFalse(profile.writes_hermes_runtime, "CP00-134 profile writes_hermes_runtime");
  requireFalse(profile.implements_ldip, "CP00-134 profile implements_ldip");
}
requireEqual(cp134Handoff.next_pack_id, "CP00-135", "CP00-134 handoff.next_pack_id");
requireEqual(cp134Handoff.next_subphase_id, "RP03.P00.M00.S01", "CP00-134 handoff.next_subphase_id");
requireTrue(cp134Handoff.rp02_terminal_pack, "CP00-134 handoff.rp02_terminal_pack");
requireEqual(
  cp134Handoff.hrx_embedded_boundary,
  "embedded_people_hr_evidence_module_inside_law_firm_os",
  "CP00-134 handoff.hrx_embedded_boundary",
);
requireTrue(cp134Coverage.valid, `CP00-134 coverage valid: ${cp134Coverage.errors.join("; ")}`);
requirePlanPackUnitMatch(cp134PlanPack, createPermissionKernelCp134CoveredUnitIds(), "CP00-134");

if (errors.length > 0) {
  console.error("RP02 Permission Kernel contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("RP02 Permission Kernel contract validation passed.");
console.log(
  JSON.stringify(
    {
      foundation_pack: PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id,
      model_service_pack: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
      service_workflow_pack: PERMISSION_KERNEL_CP110_PACK_BINDING.pack_id,
      synthetic_fixture_boundary_pack: PERMISSION_KERNEL_CP111_PACK_BINDING.pack_id,
      interface_closeout_pack: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
      api_permission_audit_binding_pack: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
      api_synthetic_fixture_set_pack: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
      api_fixture_ui_readiness_pack: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
      ui_permission_audit_binding_pack: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
      ui_evidence_state_snapshot_pack: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
      ui_synthetic_fixture_golden_case_pack: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
      fixture_workflow_binding_pack: PERMISSION_KERNEL_CP119_PACK_BINDING.pack_id,
      fixture_evidence_permission_matrix_pack: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
      permission_matrix_risk_boundary_pack: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
      permission_matrix_workflow_binding_pack: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
      permission_audit_terminal_boundary_pack: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
      permission_fixture_failure_taxonomy_pack: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
      failure_taxonomy_risk_boundary_pack: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
      failure_taxonomy_workflow_binding_pack: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
      failure_taxonomy_test_fixture_boundary_pack: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
      failure_taxonomy_evidence_harness_pack: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
      hermes_evidence_workflow_binding_pack: PERMISSION_KERNEL_CP129_PACK_BINDING.pack_id,
      hermes_evidence_synthetic_fixture_boundary_pack: PERMISSION_KERNEL_CP130_PACK_BINDING.pack_id,
      hermes_evidence_synthetic_fixture_verdict_boundary_pack: PERMISSION_KERNEL_CP131_PACK_BINDING.pack_id,
      fixture_evidence_review_readiness_catalog_pack: PERMISSION_KERNEL_CP132_PACK_BINDING.pack_id,
      terminal_review_question_boundary_pack: PERMISSION_KERNEL_CP133_PACK_BINDING.pack_id,
      terminal_review_closeout_readiness_pack: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
      current_pack: PERMISSION_KERNEL_CP134_PACK_BINDING.pack_id,
      cp108_units: manifest.covered_unit_count,
      cp109_units: cp109Manifest.covered_unit_count,
      cp110_units: cp110Manifest.covered_unit_count,
      cp111_units: cp111Manifest.covered_unit_count,
      cp112_units: cp112Manifest.covered_unit_count,
      cp113_units: cp113Manifest.covered_unit_count,
      cp114_units: cp114Manifest.covered_unit_count,
      cp115_units: cp115Manifest.covered_unit_count,
      cp116_units: cp116Manifest.covered_unit_count,
      cp117_units: cp117Manifest.covered_unit_count,
      cp118_units: cp118Manifest.covered_unit_count,
      cp119_units: cp119Manifest.covered_unit_count,
      cp120_units: cp120Manifest.covered_unit_count,
      cp121_units: cp121Manifest.covered_unit_count,
      cp122_units: cp122Manifest.covered_unit_count,
      cp123_units: cp123Manifest.covered_unit_count,
      cp124_units: cp124Manifest.covered_unit_count,
      cp125_units: cp125Manifest.covered_unit_count,
      cp126_units: cp126Manifest.covered_unit_count,
      cp127_units: cp127Manifest.covered_unit_count,
      cp128_units: cp128Manifest.covered_unit_count,
      cp129_units: cp129Manifest.covered_unit_count,
      cp130_units: cp130Manifest.covered_unit_count,
      cp131_units: cp131Manifest.covered_unit_count,
      cp132_units: cp132Manifest.covered_unit_count,
      cp133_units: cp133Manifest.covered_unit_count,
      cp134_units: cp134Manifest.covered_unit_count,
      first_unit_id: cp134Manifest.first_unit_id,
      last_unit_id: cp134Manifest.last_unit_id,
      contract_id: PERMISSION_KERNEL_CP134_TERMINAL_REVIEW_CLOSEOUT_READINESS_CONTRACT.contract_id,
      next_pack_id: cp134Handoff.next_pack_id,
      next_subphase_id: cp134Handoff.next_subphase_id,
    },
    null,
    2,
  ),
);
