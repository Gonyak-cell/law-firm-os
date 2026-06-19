#!/usr/bin/env node
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
  MATTER_CORE_CP177_PACK_BINDING,
  MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP178_PACK_BINDING,
  MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP179_PACK_BINDING,
  MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP180_PACK_BINDING,
  MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP181_PACK_BINDING,
  MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP182_PACK_BINDING,
  MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP183_PACK_BINDING,
  MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP184_PACK_BINDING,
  MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP185_PACK_BINDING,
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
  createMatterCoreFixtureEvidenceTerminalDescriptor,
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
  createMatterCoreFailureReceiptTaxonomyBoundaryDescriptor,
  createMatterCoreFailureFixtureEntryBoundaryDescriptor,
  createMatterCoreFailureFixtureEvidenceReviewBridgeDescriptor,
  createMatterCoreGeneratedFailureRecoveryBindingDescriptor,
  createMatterCorePermissionAuditEvidenceTerminalBridgeDescriptor,
  createMatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor,
  createMatterCoreReviewQuestionSecurityGateDescriptor,
  createMatterCoreTerminalReviewCloseoutHandoffDescriptor,
  createMatterCorePermissionAuditTailFixtureDescriptor,
  createMatterCorePermissionAuditSecurityFixtureDescriptor,
  createMatterCorePermissionSubstrateWorkflowBindingDescriptor,
  createMatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor,
  createMatterCoreSyntheticFixturePermissionSubstrateDescriptor,
  createMatterCorePermissionAuditBindingDescriptor,
  createMatterCoreSyntheticUiFixtureSet,
  createMatterCoreUiEvidenceDescriptor,
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
  validateMatterCoreRegistry,
} from "../packages/matter/src/index.js";

const closeoutPlan = JSON.parse(await readFile(new URL("../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url), "utf8"));
const matterContract = JSON.parse(await readFile(new URL("../contracts/matter-core-contract.json", import.meta.url), "utf8"));
const cp177ManifestUrl = new URL("../docs/closeout-packs/cp00-177/manifest.json", import.meta.url);
let cp177Manifest = null;
try {
  await access(cp177ManifestUrl);
  cp177Manifest = JSON.parse(await readFile(cp177ManifestUrl, "utf8"));
} catch {}
const cp177PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-177") ?? cp177Manifest?.plan_binding_snapshot;
const cp178ManifestUrl = new URL("../docs/closeout-packs/cp00-178/manifest.json", import.meta.url);
let cp178Manifest = null;
try {
  await access(cp178ManifestUrl);
  cp178Manifest = JSON.parse(await readFile(cp178ManifestUrl, "utf8"));
} catch {}
const cp178PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-178") ?? cp178Manifest?.plan_binding_snapshot;
const cp179ManifestUrl = new URL("../docs/closeout-packs/cp00-179/manifest.json", import.meta.url);
let cp179Manifest = null;
try {
  await access(cp179ManifestUrl);
  cp179Manifest = JSON.parse(await readFile(cp179ManifestUrl, "utf8"));
} catch {}
const cp179PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-179") ?? cp179Manifest?.plan_binding_snapshot;
const cp180ManifestUrl = new URL("../docs/closeout-packs/cp00-180/manifest.json", import.meta.url);
let cp180Manifest = null;
try {
  await access(cp180ManifestUrl);
  cp180Manifest = JSON.parse(await readFile(cp180ManifestUrl, "utf8"));
} catch {}
const cp180PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-180") ?? cp180Manifest?.plan_binding_snapshot;
const cp181ManifestUrl = new URL("../docs/closeout-packs/cp00-181/manifest.json", import.meta.url);
let cp181Manifest = null;
try {
  await access(cp181ManifestUrl);
  cp181Manifest = JSON.parse(await readFile(cp181ManifestUrl, "utf8"));
} catch {}
const cp181PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-181") ?? cp181Manifest?.plan_binding_snapshot;
const cp182ManifestUrl = new URL("../docs/closeout-packs/cp00-182/manifest.json", import.meta.url);
let cp182Manifest = null;
try {
  await access(cp182ManifestUrl);
  cp182Manifest = JSON.parse(await readFile(cp182ManifestUrl, "utf8"));
} catch {}
const cp182PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-182") ?? cp182Manifest?.plan_binding_snapshot;
const cp183ManifestUrl = new URL("../docs/closeout-packs/cp00-183/manifest.json", import.meta.url);
let cp183Manifest = null;
try {
  await access(cp183ManifestUrl);
  cp183Manifest = JSON.parse(await readFile(cp183ManifestUrl, "utf8"));
} catch {}
const cp183PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-183") ?? cp183Manifest?.plan_binding_snapshot;
const cp184ManifestUrl = new URL("../docs/closeout-packs/cp00-184/manifest.json", import.meta.url);
let cp184Manifest = null;
try {
  await access(cp184ManifestUrl);
  cp184Manifest = JSON.parse(await readFile(cp184ManifestUrl, "utf8"));
} catch {}
const cp184PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-184") ?? cp184Manifest?.plan_binding_snapshot;
const cp185ManifestUrl = new URL("../docs/closeout-packs/cp00-185/manifest.json", import.meta.url);
let cp185Manifest = null;
try {
  await access(cp185ManifestUrl);
  cp185Manifest = JSON.parse(await readFile(cp185ManifestUrl, "utf8"));
} catch {}
const cp185PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-185") ?? cp185Manifest?.plan_binding_snapshot;
const cp186ManifestUrl = new URL("../docs/closeout-packs/cp00-186/manifest.json", import.meta.url);
let cp186Manifest = null;
try {
  await access(cp186ManifestUrl);
  cp186Manifest = JSON.parse(await readFile(cp186ManifestUrl, "utf8"));
} catch {}
const cp186PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-186") ?? cp186Manifest?.plan_binding_snapshot;
const cp187ManifestUrl = new URL("../docs/closeout-packs/cp00-187/manifest.json", import.meta.url);
let cp187Manifest = null;
try {
  await access(cp187ManifestUrl);
  cp187Manifest = JSON.parse(await readFile(cp187ManifestUrl, "utf8"));
} catch {}
const cp187PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-187") ?? cp187Manifest?.plan_binding_snapshot;
const cp188ManifestUrl = new URL("../docs/closeout-packs/cp00-188/manifest.json", import.meta.url);
let cp188Manifest = null;
try {
  await access(cp188ManifestUrl);
  cp188Manifest = JSON.parse(await readFile(cp188ManifestUrl, "utf8"));
} catch {}
const cp188PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-188") ?? cp188Manifest?.plan_binding_snapshot;
const cp189ManifestUrl = new URL("../docs/closeout-packs/cp00-189/manifest.json", import.meta.url);
let cp189Manifest = null;
try {
  await access(cp189ManifestUrl);
  cp189Manifest = JSON.parse(await readFile(cp189ManifestUrl, "utf8"));
} catch {}
const cp189PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-189") ?? cp189Manifest?.plan_binding_snapshot;
const cp190ManifestUrl = new URL("../docs/closeout-packs/cp00-190/manifest.json", import.meta.url);
let cp190Manifest = null;
try {
  await access(cp190ManifestUrl);
  cp190Manifest = JSON.parse(await readFile(cp190ManifestUrl, "utf8"));
} catch {}
const cp190PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-190") ?? cp190Manifest?.plan_binding_snapshot;
const cp191ManifestUrl = new URL("../docs/closeout-packs/cp00-191/manifest.json", import.meta.url);
let cp191Manifest = null;
try {
  await access(cp191ManifestUrl);
  cp191Manifest = JSON.parse(await readFile(cp191ManifestUrl, "utf8"));
} catch {}
const cp191PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-191") ?? cp191Manifest?.plan_binding_snapshot;
const cp192ManifestUrl = new URL("../docs/closeout-packs/cp00-192/manifest.json", import.meta.url);
let cp192Manifest = null;
try {
  await access(cp192ManifestUrl);
  cp192Manifest = JSON.parse(await readFile(cp192ManifestUrl, "utf8"));
} catch {}
const cp192PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-192") ?? cp192Manifest?.plan_binding_snapshot;
const cp193ManifestUrl = new URL("../docs/closeout-packs/cp00-193/manifest.json", import.meta.url);
let cp193Manifest = null;
try {
  await access(cp193ManifestUrl);
  cp193Manifest = JSON.parse(await readFile(cp193ManifestUrl, "utf8"));
} catch {}
const cp193PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-193") ?? cp193Manifest?.plan_binding_snapshot;
const cp194ManifestUrl = new URL("../docs/closeout-packs/cp00-194/manifest.json", import.meta.url);
let cp194Manifest = null;
try {
  await access(cp194ManifestUrl);
  cp194Manifest = JSON.parse(await readFile(cp194ManifestUrl, "utf8"));
} catch {}
const cp194PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-194") ?? cp194Manifest?.plan_binding_snapshot;
const cp195ManifestUrl = new URL("../docs/closeout-packs/cp00-195/manifest.json", import.meta.url);
let cp195Manifest = null;
try {
  await access(cp195ManifestUrl);
  cp195Manifest = JSON.parse(await readFile(cp195ManifestUrl, "utf8"));
} catch {}
const cp195PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-195") ?? cp195Manifest?.plan_binding_snapshot;
const cp196ManifestUrl = new URL("../docs/closeout-packs/cp00-196/manifest.json", import.meta.url);
let cp196Manifest = null;
try {
  await access(cp196ManifestUrl);
  cp196Manifest = JSON.parse(await readFile(cp196ManifestUrl, "utf8"));
} catch {}
const cp196PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-196") ?? cp196Manifest?.plan_binding_snapshot;
const cp197ManifestUrl = new URL("../docs/closeout-packs/cp00-197/manifest.json", import.meta.url);
let cp197Manifest = null;
try {
  await access(cp197ManifestUrl);
  cp197Manifest = JSON.parse(await readFile(cp197ManifestUrl, "utf8"));
} catch {}
const cp197PlanPack = closeoutPlan.packs.find((pack) => pack.pack_id === "CP00-197") ?? cp197Manifest?.plan_binding_snapshot;

assert.ok(cp177PlanPack, "CP00-177 must exist in closeout-pack-plan.json");
assert.equal(cp177PlanPack.unit_count, MATTER_CORE_CP177_PACK_BINDING.unit_count, "CP00-177 unit count drift");
assert.ok(cp178PlanPack, "CP00-178 must exist in closeout-pack-plan.json");
assert.equal(cp178PlanPack.unit_count, MATTER_CORE_CP178_PACK_BINDING.unit_count, "CP00-178 unit count drift");
assert.ok(cp179PlanPack, "CP00-179 must exist in closeout-pack-plan.json");
assert.equal(cp179PlanPack.unit_count, MATTER_CORE_CP179_PACK_BINDING.unit_count, "CP00-179 unit count drift");
assert.ok(cp180PlanPack, "CP00-180 must exist in closeout-pack-plan.json");
assert.equal(cp180PlanPack.unit_count, MATTER_CORE_CP180_PACK_BINDING.unit_count, "CP00-180 unit count drift");
assert.ok(cp181PlanPack, "CP00-181 must exist in closeout-pack-plan.json");
assert.equal(cp181PlanPack.unit_count, MATTER_CORE_CP181_PACK_BINDING.unit_count, "CP00-181 unit count drift");
assert.ok(cp182PlanPack, "CP00-182 must exist in closeout-pack-plan.json");
assert.equal(cp182PlanPack.unit_count, MATTER_CORE_CP182_PACK_BINDING.unit_count, "CP00-182 unit count drift");
assert.ok(cp183PlanPack, "CP00-183 must exist in closeout-pack-plan.json");
assert.equal(cp183PlanPack.unit_count, MATTER_CORE_CP183_PACK_BINDING.unit_count, "CP00-183 unit count drift");
assert.ok(cp184PlanPack, "CP00-184 must exist in closeout-pack-plan.json");
assert.equal(cp184PlanPack.unit_count, MATTER_CORE_CP184_PACK_BINDING.unit_count, "CP00-184 unit count drift");
assert.ok(cp185PlanPack, "CP00-185 must exist in closeout-pack-plan.json");
assert.equal(cp185PlanPack.unit_count, MATTER_CORE_CP185_PACK_BINDING.unit_count, "CP00-185 unit count drift");
assert.ok(cp186PlanPack, "CP00-186 must exist in closeout-pack-plan.json");
assert.equal(cp186PlanPack.unit_count, MATTER_CORE_CP186_PACK_BINDING.unit_count, "CP00-186 unit count drift");
assert.ok(cp187PlanPack, "CP00-187 must exist in closeout-pack-plan.json");
assert.equal(cp187PlanPack.unit_count, MATTER_CORE_CP187_PACK_BINDING.unit_count, "CP00-187 unit count drift");
assert.ok(cp188PlanPack, "CP00-188 must exist in closeout-pack-plan.json");
assert.equal(cp188PlanPack.unit_count, MATTER_CORE_CP188_PACK_BINDING.unit_count, "CP00-188 unit count drift");
assert.ok(cp189PlanPack, "CP00-189 must exist in closeout-pack-plan.json");
assert.equal(cp189PlanPack.unit_count, MATTER_CORE_CP189_PACK_BINDING.unit_count, "CP00-189 unit count drift");
assert.ok(cp190PlanPack, "CP00-190 must exist in closeout-pack-plan.json");
assert.equal(cp190PlanPack.unit_count, MATTER_CORE_CP190_PACK_BINDING.unit_count, "CP00-190 unit count drift");
assert.ok(cp191PlanPack, "CP00-191 must exist in closeout-pack-plan.json");
assert.equal(cp191PlanPack.unit_count, MATTER_CORE_CP191_PACK_BINDING.unit_count, "CP00-191 unit count drift");
assert.ok(cp192PlanPack, "CP00-192 must exist in closeout-pack-plan.json");
assert.equal(cp192PlanPack.unit_count, MATTER_CORE_CP192_PACK_BINDING.unit_count, "CP00-192 unit count drift");
assert.ok(cp193PlanPack, "CP00-193 must exist in closeout-pack-plan.json");
assert.equal(cp193PlanPack.unit_count, MATTER_CORE_CP193_PACK_BINDING.unit_count, "CP00-193 unit count drift");
assert.ok(cp194PlanPack, "CP00-194 must exist in closeout-pack-plan.json");
assert.equal(cp194PlanPack.unit_count, MATTER_CORE_CP194_PACK_BINDING.unit_count, "CP00-194 unit count drift");
assert.ok(cp195PlanPack, "CP00-195 must exist in closeout-pack-plan.json");
assert.equal(cp195PlanPack.unit_count, MATTER_CORE_CP195_PACK_BINDING.unit_count, "CP00-195 unit count drift");
assert.ok(cp196PlanPack, "CP00-196 must exist in closeout-pack-plan.json");
assert.equal(cp196PlanPack.unit_count, MATTER_CORE_CP196_PACK_BINDING.unit_count, "CP00-196 unit count drift");
assert.ok(cp197PlanPack, "CP00-197 must exist in closeout-pack-plan.json");
assert.equal(cp197PlanPack.unit_count, MATTER_CORE_CP197_PACK_BINDING.unit_count, "CP00-197 unit count drift");
assert.equal(matterContract.schema_version, "law-firm-os.matter-core-contract.v0.1");
assert.equal(matterContract.current_pack.pack_id, "CP00-197");
assert.equal(matterContract.program.program_id, "RP05");
assert.equal(matterContract.program.owner_module, "MatterCore");

const cp177Coverage = validateMatterCoreCp177Coverage(cp177PlanPack);
const registry = validateMatterCoreRegistry();
const foundation = validateMatterCoreCp177Foundation(matterContract);
const cp177HermesEvidence = createMatterCoreCp177HermesEvidencePacket(cp177PlanPack, matterContract);
const cp177ClaudePacket = createMatterCoreCp177ClaudeReviewPacket(cp177PlanPack);
const cp177Handoff = createMatterCoreCp177CloseoutHandoff(cp177PlanPack);
const cp178Coverage = validateMatterCoreCp178Coverage(cp178PlanPack);
const cp178ServiceBoundary = validateMatterCoreCp178ServiceBoundary(matterContract);
const cp178HermesEvidence = createMatterCoreCp178HermesEvidencePacket(cp178PlanPack, matterContract);
const cp178ClaudePacket = createMatterCoreCp178ClaudeReviewPacket(cp178PlanPack);
const cp178Handoff = createMatterCoreCp178CloseoutHandoff();
const cp179Coverage = validateMatterCoreCp179Coverage(cp179PlanPack);
const cp179ServiceEvidence = validateMatterCoreCp179ServiceEvidence(matterContract);
const cp179HermesEvidence = createMatterCoreCp179HermesEvidencePacket(cp179PlanPack, matterContract);
const cp179ClaudePacket = createMatterCoreCp179ClaudeReviewPacket(cp179PlanPack);
const cp179Handoff = createMatterCoreCp179CloseoutHandoff();
const cp180Coverage = validateMatterCoreCp180Coverage(cp180PlanPack);
const cp180SensitiveBoundary = validateMatterCoreCp180SensitiveBoundary(matterContract);
const cp180HermesEvidence = createMatterCoreCp180HermesEvidencePacket(cp180PlanPack, matterContract);
const cp180ClaudePacket = createMatterCoreCp180ClaudeReviewPacket(cp180PlanPack);
const cp180Handoff = createMatterCoreCp180CloseoutHandoff();
const cp181Coverage = validateMatterCoreCp181Coverage(cp181PlanPack);
const cp181ApiInterface = validateMatterCoreCp181ApiInterface(matterContract);
const cp181HermesEvidence = createMatterCoreCp181HermesEvidencePacket(cp181PlanPack, matterContract);
const cp181ClaudePacket = createMatterCoreCp181ClaudeReviewPacket(cp181PlanPack);
const cp181Handoff = createMatterCoreCp181CloseoutHandoff();
const cp182Coverage = validateMatterCoreCp182Coverage(cp182PlanPack);
const cp182UiWorkflow = validateMatterCoreCp182UiWorkflow(matterContract);
const cp182HermesEvidence = createMatterCoreCp182HermesEvidencePacket(cp182PlanPack, matterContract);
const cp182ClaudePacket = createMatterCoreCp182ClaudeReviewPacket(cp182PlanPack);
const cp182Handoff = createMatterCoreCp182CloseoutHandoff();
const cp183Coverage = validateMatterCoreCp183Coverage(cp183PlanPack);
const cp183UiEvidence = validateMatterCoreCp183UiEvidencePermissionFixture(matterContract);
const cp183HermesEvidence = createMatterCoreCp183HermesEvidencePacket(cp183PlanPack, matterContract);
const cp183ClaudePacket = createMatterCoreCp183ClaudeReviewPacket(cp183PlanPack);
const cp183Handoff = createMatterCoreCp183CloseoutHandoff();
const cp183PermissionAuditBinding = createMatterCorePermissionAuditBindingDescriptor({
  request_id: "req_cp183_validator_denied",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  payload: {
    matter_id: "matter_cp183_validator_denied",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP183 validator denied matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp183FixtureSet = createMatterCoreSyntheticUiFixtureSet();
const cp183UiEvidenceDescriptor = createMatterCoreUiEvidenceDescriptor({
  request_id: "req_cp183_validator_review",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "wiki_section_staging",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    section_id: "section_cp183_validator_review",
    tenant_id: "tenant_rp05_synthetic",
    matter_id: "matter_cp183_validator_review",
    wiki_id: "matterwiki:tenant_rp05_synthetic:matter_cp183_validator_review",
    section_type: "client_visible_summary",
    title: "CP183 validator review candidate",
    source_policy: "uncited_internal_note",
    review_status: "under_review",
    order_index: 1,
    updated_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
    client_visible_candidate: true,
  },
});
const cp184Coverage = validateMatterCoreCp184Coverage(cp184PlanPack);
const cp184FixtureEvidence = validateMatterCoreCp184FixtureEvidenceTerminal(matterContract);
const cp184HermesEvidence = createMatterCoreCp184HermesEvidencePacket(cp184PlanPack, matterContract);
const cp184ClaudePacket = createMatterCoreCp184ClaudeReviewPacket(cp184PlanPack);
const cp184Handoff = createMatterCoreCp184CloseoutHandoff();
const cp184TerminalDescriptor = createMatterCoreFixtureEvidenceTerminalDescriptor({
  request_id: "req_cp184_validator_terminal",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp184_validator_terminal",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP184 validator terminal matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp185Coverage = validateMatterCoreCp185Coverage(cp185PlanPack);
const cp185TailDescriptor = createMatterCorePermissionAuditTailFixtureDescriptor({
  request_id: "req_cp185_validator_tail",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp185_validator_tail",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP185 validator tail matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp185PermissionAuditTail = validateMatterCoreCp185PermissionAuditTail(matterContract, cp185TailDescriptor);
const cp185HermesEvidence = createMatterCoreCp185HermesEvidencePacket(cp185PlanPack, matterContract, cp185TailDescriptor);
const cp185ClaudePacket = createMatterCoreCp185ClaudeReviewPacket(cp185PlanPack);
const cp185Handoff = createMatterCoreCp185CloseoutHandoff();
const cp186Coverage = validateMatterCoreCp186Coverage(cp186PlanPack);
const cp186SubstrateDescriptor = createMatterCoreSyntheticFixturePermissionSubstrateDescriptor({
  request_id: "req_cp186_validator_substrate",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp186_validator_substrate",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP186 validator substrate matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp186Substrate = validateMatterCoreCp186SyntheticFixturePermissionSubstrate(matterContract, cp186SubstrateDescriptor);
const cp186HermesEvidence = createMatterCoreCp186HermesEvidencePacket(cp186PlanPack, matterContract, cp186SubstrateDescriptor);
const cp186ClaudePacket = createMatterCoreCp186ClaudeReviewPacket(cp186PlanPack);
const cp186Handoff = createMatterCoreCp186CloseoutHandoff();
const cp187Coverage = validateMatterCoreCp187Coverage(cp187PlanPack);
const cp187WorkflowBindingDescriptor = createMatterCorePermissionSubstrateWorkflowBindingDescriptor({
  request_id: "req_cp187_validator_workflow_binding",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp187_validator_workflow_binding",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP187 validator workflow binding matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp187WorkflowBinding = validateMatterCoreCp187PermissionSubstrateWorkflowBinding(matterContract, cp187WorkflowBindingDescriptor);
const cp187HermesEvidence = createMatterCoreCp187HermesEvidencePacket(cp187PlanPack, matterContract, cp187WorkflowBindingDescriptor);
const cp187ClaudePacket = createMatterCoreCp187ClaudeReviewPacket(cp187PlanPack);
const cp187Handoff = createMatterCoreCp187CloseoutHandoff();
const cp188Coverage = validateMatterCoreCp188Coverage(cp188PlanPack);
const cp188SecurityFixtureDescriptor = createMatterCorePermissionAuditSecurityFixtureDescriptor({
  request_id: "req_cp188_validator_security_fixture",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp188_validator_security_fixture",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP188 validator security fixture matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp188SecurityFixture = validateMatterCoreCp188PermissionAuditSecurityFixture(matterContract, cp188SecurityFixtureDescriptor);
const cp188HermesEvidence = createMatterCoreCp188HermesEvidencePacket(cp188PlanPack, matterContract, cp188SecurityFixtureDescriptor);
const cp188ClaudePacket = createMatterCoreCp188ClaudeReviewPacket(cp188PlanPack);
const cp188Handoff = createMatterCoreCp188CloseoutHandoff();
const cp189Coverage = validateMatterCoreCp189Coverage(cp189PlanPack);
const cp189ContinuationDescriptor = createMatterCoreSyntheticFixtureFailureEvidenceContinuationDescriptor({
  request_id: "req_cp189_validator_failure_evidence",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp189_validator_failure_evidence",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP189 validator failure evidence matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp189Continuation = validateMatterCoreCp189SyntheticFixtureFailureEvidence(matterContract, cp189ContinuationDescriptor);
const cp189HermesEvidence = createMatterCoreCp189HermesEvidencePacket(cp189PlanPack, matterContract, cp189ContinuationDescriptor);
const cp189ClaudePacket = createMatterCoreCp189ClaudeReviewPacket(cp189PlanPack);
const cp189Handoff = createMatterCoreCp189CloseoutHandoff();
const cp190Coverage = validateMatterCoreCp190Coverage(cp190PlanPack);
const cp190BoundaryDescriptor = createMatterCoreFailureReceiptTaxonomyBoundaryDescriptor({
  request_id: "req_cp190_validator_failure_boundary",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp190_validator_failure_boundary",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP190 validator failure boundary matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp190Boundary = validateMatterCoreCp190FailureReceiptTaxonomyBoundary(matterContract, cp190BoundaryDescriptor);
const cp190HermesEvidence = createMatterCoreCp190HermesEvidencePacket(cp190PlanPack, matterContract, cp190BoundaryDescriptor);
const cp190ClaudePacket = createMatterCoreCp190ClaudeReviewPacket(cp190PlanPack);
const cp190Handoff = createMatterCoreCp190CloseoutHandoff();
const cp191Coverage = validateMatterCoreCp191Coverage(cp191PlanPack);
const cp191GeneratedFailureDescriptor = createMatterCoreGeneratedFailureRecoveryBindingDescriptor({
  request_id: "req_cp191_validator_generated_failure_binding",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp191_validator_generated_failure_binding",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP191 validator generated failure binding matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp191GeneratedFailureBinding = validateMatterCoreCp191GeneratedFailureRecoveryBinding(
  matterContract,
  cp191GeneratedFailureDescriptor,
);
const cp191HermesEvidence = createMatterCoreCp191HermesEvidencePacket(
  cp191PlanPack,
  matterContract,
  cp191GeneratedFailureDescriptor,
);
const cp191ClaudePacket = createMatterCoreCp191ClaudeReviewPacket(cp191PlanPack);
const cp191Handoff = createMatterCoreCp191CloseoutHandoff();
const cp192Coverage = validateMatterCoreCp192Coverage(cp192PlanPack);
const cp192FailureFixtureEntryDescriptor = createMatterCoreFailureFixtureEntryBoundaryDescriptor({
  request_id: "req_cp192_validator_failure_fixture_entry",
  tenant_id: "tenant_rp05_synthetic",
  actor_user_id: "user_rp05_owner",
  operation: "matter_opening",
  permission_ref: "perm_rp05_synthetic_matter",
  audit_hint_ref: "audit_rp05_synthetic_matter",
  payload: {
    matter_id: "matter_cp192_validator_failure_fixture_entry",
    tenant_id: "tenant_rp05_synthetic",
    client_id: "client_rp05_amic",
    title: "CP192 validator failure fixture entry matter",
    status: "opening",
    created_by: "user_rp05_owner",
    created_at: "2026-06-10T00:00:00.000Z",
    permission_envelope_id: "perm_rp05_synthetic_matter",
    audit_trace_id: "audit_rp05_synthetic_matter",
  },
});
const cp192FailureFixtureEntryBoundary = validateMatterCoreCp192FailureFixtureEntryBoundary(
  matterContract,
  cp192FailureFixtureEntryDescriptor,
);
const cp192HermesEvidence = createMatterCoreCp192HermesEvidencePacket(
  cp192PlanPack,
  matterContract,
  cp192FailureFixtureEntryDescriptor,
);
const cp192ClaudePacket = createMatterCoreCp192ClaudeReviewPacket(cp192PlanPack);
const cp192Handoff = createMatterCoreCp192CloseoutHandoff();
const cp193Coverage = validateMatterCoreCp193Coverage(cp193PlanPack);
const cp193FailureFixtureEvidenceReviewBridgeDescriptor = createMatterCoreFailureFixtureEvidenceReviewBridgeDescriptor();
const cp193FailureFixtureEvidenceReviewBridge = validateMatterCoreCp193FailureFixtureEvidenceReviewBridge(
  matterContract,
  cp193FailureFixtureEvidenceReviewBridgeDescriptor,
);
const cp193HermesEvidence = createMatterCoreCp193HermesEvidencePacket(
  cp193PlanPack,
  matterContract,
  cp193FailureFixtureEvidenceReviewBridgeDescriptor,
);
const cp193ClaudePacket = createMatterCoreCp193ClaudeReviewPacket(cp193PlanPack);
const cp193Handoff = createMatterCoreCp193CloseoutHandoff();
const cp194Coverage = validateMatterCoreCp194Coverage(cp194PlanPack);
const cp194PermissionAuditEvidenceTerminalBridgeDescriptor = createMatterCorePermissionAuditEvidenceTerminalBridgeDescriptor();
const cp194PermissionAuditEvidenceTerminalBridge = validateMatterCoreCp194PermissionAuditEvidenceTerminalBridge(
  matterContract,
  cp194PermissionAuditEvidenceTerminalBridgeDescriptor,
);
const cp194HermesEvidence = createMatterCoreCp194HermesEvidencePacket(
  cp194PlanPack,
  matterContract,
  cp194PermissionAuditEvidenceTerminalBridgeDescriptor,
);
const cp194ClaudePacket = createMatterCoreCp194ClaudeReviewPacket(cp194PlanPack);
const cp194Handoff = createMatterCoreCp194CloseoutHandoff();
const cp195Coverage = validateMatterCoreCp195Coverage(cp195PlanPack);
const cp195EvidenceReviewHandoffTerminalBridgeDescriptor = createMatterCoreEvidenceReviewHandoffTerminalBridgeDescriptor();
const cp195EvidenceReviewHandoffTerminalBridge = validateMatterCoreCp195EvidenceReviewHandoffTerminalBridge(
  matterContract,
  cp195EvidenceReviewHandoffTerminalBridgeDescriptor,
);
const cp195HermesEvidence = createMatterCoreCp195HermesEvidencePacket(
  cp195PlanPack,
  matterContract,
  cp195EvidenceReviewHandoffTerminalBridgeDescriptor,
);
const cp195ClaudePacket = createMatterCoreCp195ClaudeReviewPacket(cp195PlanPack);
const cp195Handoff = createMatterCoreCp195CloseoutHandoff();
const cp196Coverage = validateMatterCoreCp196Coverage(cp196PlanPack);
const cp196ReviewQuestionSecurityGateDescriptor = createMatterCoreReviewQuestionSecurityGateDescriptor();
const cp196ReviewQuestionSecurityGate = validateMatterCoreCp196ReviewQuestionSecurityGate(
  matterContract,
  cp196ReviewQuestionSecurityGateDescriptor,
);
const cp196HermesEvidence = createMatterCoreCp196HermesEvidencePacket(
  cp196PlanPack,
  matterContract,
  cp196ReviewQuestionSecurityGateDescriptor,
);
const cp196ClaudePacket = createMatterCoreCp196ClaudeReviewPacket(cp196PlanPack);
const cp196Handoff = createMatterCoreCp196CloseoutHandoff();
const cp197Coverage = validateMatterCoreCp197Coverage(cp197PlanPack);
const cp197TerminalReviewCloseoutHandoffDescriptor = createMatterCoreTerminalReviewCloseoutHandoffDescriptor();
const cp197TerminalReviewCloseoutHandoff = validateMatterCoreCp197TerminalReviewCloseoutHandoff(
  matterContract,
  cp197TerminalReviewCloseoutHandoffDescriptor,
);
const cp197HermesEvidence = createMatterCoreCp197HermesEvidencePacket(
  cp197PlanPack,
  matterContract,
  cp197TerminalReviewCloseoutHandoffDescriptor,
);
const cp197ClaudePacket = createMatterCoreCp197ClaudeReviewPacket(cp197PlanPack);
const cp197Handoff = createMatterCoreCp197CloseoutHandoff();

assert.equal(cp177Coverage.valid, true, cp177Coverage.errors.join("; "));
assert.equal(registry.valid, true, registry.errors.join("; "));
assert.equal(foundation.valid, true, foundation.errors.join("; "));
assert.equal(cp177HermesEvidence.production_ready_candidate, true);
assert.equal(cp177ClaudePacket.model, "claude-opus-4-8");
assert.equal(cp177ClaudePacket.mode, "read_only");
assert.equal(cp177Handoff.to_pack_id, "CP00-178");
assert.equal(cp178Coverage.valid, true, cp178Coverage.errors.join("; "));
assert.equal(cp178ServiceBoundary.valid, true, cp178ServiceBoundary.errors.join("; "));
assert.equal(cp178HermesEvidence.production_ready_candidate, true);
assert.equal(cp178ClaudePacket.review_packet, "C05.CP00-178.matter_core_service_domain_descriptor_boundary");
assert.equal(cp178ClaudePacket.read_only, true);
assert.equal(cp178Handoff.to_pack_id, "CP00-179");
assert.equal(cp179Coverage.valid, true, cp179Coverage.errors.join("; "));
assert.equal(cp179ServiceEvidence.valid, true, cp179ServiceEvidence.errors.join("; "));
assert.equal(cp179HermesEvidence.production_ready_candidate, true);
assert.equal(cp179ClaudePacket.review_packet, "C05.CP00-179.matter_core_service_tail_evidence_review_bridge");
assert.equal(cp179ClaudePacket.read_only, true);
assert.equal(cp179ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp179ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp179Handoff.to_pack_id, "CP00-180");
assert.equal(cp180Coverage.valid, true, cp180Coverage.errors.join("; "));
assert.equal(cp180SensitiveBoundary.valid, true, cp180SensitiveBoundary.errors.join("; "));
assert.equal(cp180HermesEvidence.production_ready_candidate, true);
assert.equal(cp180ClaudePacket.review_packet, "C05.CP00-180.matter_core_sensitive_service_precheck_boundary");
assert.equal(cp180ClaudePacket.read_only, true);
assert.equal(cp180ClaudePacket.source_inspection_basis, "read_tools_used");
assert.equal(cp180Handoff.to_pack_id, "CP00-181");
assert.equal(cp181Coverage.valid, true, cp181Coverage.errors.join("; "));
assert.equal(cp181ApiInterface.valid, true, cp181ApiInterface.errors.join("; "));
assert.equal(cp181HermesEvidence.production_ready_candidate, true);
assert.equal(cp181ClaudePacket.review_packet, "C05.CP00-181.matter_core_api_interface_ui_state_bridge");
assert.equal(cp181ClaudePacket.read_only, true);
assert.equal(cp181ClaudePacket.source_inspection_basis, "read_tools_used");
assert.equal(cp181Handoff.to_pack_id, "CP00-182");
assert.equal(cp182Coverage.valid, true, cp182Coverage.errors.join("; "));
assert.equal(cp182UiWorkflow.valid, true, cp182UiWorkflow.errors.join("; "));
assert.equal(cp182HermesEvidence.production_ready_candidate, true);
assert.equal(cp182ClaudePacket.review_packet, "C05.CP00-182.matter_core_ui_interaction_workflow_descriptor");
assert.equal(cp182ClaudePacket.read_only, true);
assert.equal(cp182ClaudePacket.source_inspection_basis, "read_tools_used");
assert.equal(cp182Handoff.to_pack_id, "CP00-183");
assert.equal(cp183Coverage.valid, true, cp183Coverage.errors.join("; "));
assert.equal(cp183UiEvidence.valid, true, cp183UiEvidence.errors.join("; "));
assert.equal(cp183HermesEvidence.production_ready_candidate, true);
assert.equal(cp183ClaudePacket.review_packet, "C05.CP00-183.matter_core_ui_evidence_permission_fixture");
assert.equal(cp183ClaudePacket.read_only, true);
assert.equal(cp183ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp183ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp183Handoff.to_pack_id, "CP00-184");
assert.equal(cp183PermissionAuditBinding.permission_badge_ref_only, true);
assert.equal(cp183PermissionAuditBinding.audit_hint_ref_only, true);
assert.equal(cp183PermissionAuditBinding.guard_results.no_permission_decision_detail_leak, true);
assert.equal(cp183PermissionAuditBinding.guard_results.no_audit_event_body_leak, true);
assert.equal(cp183FixtureSet.fixture_count, 30);
assert.equal(cp183FixtureSet.leak_guards.no_raw_payload, true);
assert.equal(cp183FixtureSet.leak_guards.no_permission_decision_detail, true);
assert.equal(cp183FixtureSet.leak_guards.no_audit_event_body, true);
assert.equal(cp183FixtureSet.leak_guards.no_unauthorized_count, true);
assert.equal(cp183UiEvidenceDescriptor.hermes_ui_evidence.synthetic_fixture_binding, true);
assert.equal(cp183UiEvidenceDescriptor.claude_ui_leak_prompt.read_only, true);
assert.equal(cp183UiEvidenceDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp183UiEvidenceDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp184Coverage.valid, true, cp184Coverage.errors.join("; "));
assert.equal(cp184FixtureEvidence.valid, true, cp184FixtureEvidence.errors.join("; "));
assert.equal(cp184HermesEvidence.production_ready_candidate, true);
assert.equal(cp184ClaudePacket.review_packet, "C05.CP00-184.matter_core_fixture_evidence_terminal_entry");
assert.equal(cp184ClaudePacket.read_only, true);
assert.equal(cp184ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp184ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp184Handoff.to_pack_id, "CP00-185");
assert.equal(cp184TerminalDescriptor.synthetic_fixture_binding.bound_to_pack_id, "CP00-184");
assert.equal(cp184TerminalDescriptor.p05_permission_audit_entry.case_count, 132);
assert.equal(cp184TerminalDescriptor.golden_case_set.length, 12);
assert.equal(cp184TerminalDescriptor.failure_case_set.length, 24);
assert.equal(cp184TerminalDescriptor.leak_guards.no_raw_payload, true);
assert.equal(cp184TerminalDescriptor.leak_guards.no_real_document_content, true);
assert.equal(cp184TerminalDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp184TerminalDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp184TerminalDescriptor.leak_guards.no_unauthorized_count, true);
assert.equal(cp185Coverage.valid, true, cp185Coverage.errors.join("; "));
assert.equal(cp185PermissionAuditTail.valid, true, cp185PermissionAuditTail.errors.join("; "));
assert.equal(cp185HermesEvidence.production_ready_candidate, true);
assert.equal(cp185ClaudePacket.review_packet, "C05.CP00-185.matter_core_permission_audit_tail_fixture");
assert.equal(cp185ClaudePacket.read_only, true);
assert.equal(cp185ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp185ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp185Handoff.to_pack_id, "CP00-186");
assert.equal(cp185Handoff.next_subphase_id, "RP05.P05.M06.S02");
assert.equal(cp185TailDescriptor.tail_row_count, 10);
assert.equal(cp185TailDescriptor.failure_test.outcome, "blocked");
assert.equal(cp185TailDescriptor.claude_missing_test_prompt.outcome, "review_required");
assert.equal(cp185TailDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp185TailDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp185TailDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp185TailDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp185TailDescriptor.leak_guards.no_unauthorized_count, true);
assert.equal(cp185TailDescriptor.leak_guards.replay_commands_inert, true);
assert.equal(cp186Coverage.valid, true, cp186Coverage.errors.join("; "));
assert.equal(cp186Coverage.summary.unit_count, 150);
assert.equal(cp186Coverage.summary.by_phase["RP05.P05"], 89);
assert.equal(cp186Coverage.summary.by_phase["RP05.P06"], 61);
assert.equal(cp186Substrate.valid, true, cp186Substrate.errors.join("; "));
assert.equal(cp186SubstrateDescriptor.pack_id, "CP00-186");
assert.equal(cp186SubstrateDescriptor.source_permission_audit_tail_pack_id, "CP00-185");
assert.equal(
  cp186SubstrateDescriptor.fixture_row_count,
  MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.required_fixture_controls.length * 5,
);
assert.equal(
  cp186SubstrateDescriptor.permission_substrate_row_count,
  MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.required_permission_controls.length * 4,
);
assert.equal(cp186SubstrateDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp186SubstrateDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp186SubstrateDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp186SubstrateDescriptor.leak_guards.no_unauthorized_count, true);
assert.equal(cp186SubstrateDescriptor.leak_guards.replay_commands_inert, true);
assert.equal(cp186HermesEvidence.production_ready_candidate, true);
assert.equal(cp186ClaudePacket.review_packet, "C05.CP00-186.matter_core_synthetic_fixture_permission_substrate");
assert.equal(cp186ClaudePacket.read_only, true);
assert.equal(cp186ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp186ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp186Handoff.to_pack_id, "CP00-187");
assert.equal(cp186Handoff.next_subphase_id, "RP05.P06.M03.S20");
assert.equal(cp187Coverage.valid, true, cp187Coverage.errors.join("; "));
assert.equal(cp187Coverage.summary.unit_count, 40);
assert.equal(cp187Coverage.summary.by_phase["RP05.P06"], 40);
assert.equal(cp187Coverage.summary.by_micro_phase["RP05.P06.M03"], 3);
assert.equal(cp187Coverage.summary.by_micro_phase["RP05.P06.M04"], 22);
assert.equal(cp187Coverage.summary.by_micro_phase["RP05.P06.M05"], 15);
assert.equal(cp187Coverage.summary.by_deliverable.test, 7);
assert.equal(cp187Coverage.summary.by_deliverable.security_audit, 7);
assert.equal(cp187Coverage.summary.by_deliverable.implementation, 16);
assert.equal(cp187Coverage.summary.by_deliverable.ui, 8);
assert.equal(cp187Coverage.summary.by_deliverable.claude_review, 2);
assert.equal(cp187WorkflowBinding.valid, true, cp187WorkflowBinding.errors.join("; "));
assert.equal(cp187WorkflowBindingDescriptor.pack_id, "CP00-187");
assert.equal(cp187WorkflowBindingDescriptor.source_synthetic_fixture_permission_substrate_pack_id, "CP00-186");
assert.equal(cp187WorkflowBindingDescriptor.workflow_binding_row_count, 40);
assert.equal(
  cp187WorkflowBindingDescriptor.primary_tail_test_rows.length,
  MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.primary_tail_tests.length,
);
assert.equal(
  cp187WorkflowBindingDescriptor.secondary_workflow_rows.length,
  MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.secondary_workflow_controls.length,
);
assert.equal(
  cp187WorkflowBindingDescriptor.permission_audit_binding_rows.length,
  MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.permission_audit_binding_controls.length,
);
assert.ok(cp187WorkflowBindingDescriptor.rows_by_outcome.blocked.some((row) => row.control === "denied_test"));
assert.ok(cp187WorkflowBindingDescriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_test"));
assert.ok(cp187WorkflowBindingDescriptor.workflow_binding_rows.some((row) => row.control === "leak_prevention_test"));
assert.equal(cp187WorkflowBindingDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp187WorkflowBindingDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp187WorkflowBindingDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp187WorkflowBindingDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp187HermesEvidence.production_ready_candidate, true);
assert.equal(cp187ClaudePacket.review_packet, "C05.CP00-187.matter_core_permission_substrate_workflow_binding");
assert.equal(cp187ClaudePacket.read_only, true);
assert.equal(cp187ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp187ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp187Handoff.to_pack_id, "CP00-188");
assert.equal(cp187Handoff.next_subphase_id, "RP05.P06.M05.S16");
assert.equal(cp188Coverage.valid, true, cp188Coverage.errors.join("; "));
assert.equal(cp188Coverage.summary.unit_count, 10);
assert.equal(cp188Coverage.summary.by_phase["RP05.P06"], 10);
assert.equal(cp188Coverage.summary.by_micro_phase["RP05.P06.M05"], 7);
assert.equal(cp188Coverage.summary.by_micro_phase["RP05.P06.M06"], 3);
assert.equal(cp188Coverage.summary.by_deliverable.security_audit, 4);
assert.equal(cp188Coverage.summary.by_deliverable.test, 4);
assert.equal(cp188Coverage.summary.by_deliverable.implementation, 2);
assert.equal(cp188SecurityFixture.valid, true, cp188SecurityFixture.errors.join("; "));
assert.equal(cp188SecurityFixtureDescriptor.pack_id, "CP00-188");
assert.equal(cp188SecurityFixtureDescriptor.source_permission_substrate_workflow_binding_pack_id, "CP00-187");
assert.equal(cp188SecurityFixtureDescriptor.security_fixture_row_count, 10);
assert.equal(
  cp188SecurityFixtureDescriptor.permission_audit_tail_rows.length,
  MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.permission_audit_binding_tail_controls.length,
);
assert.equal(
  cp188SecurityFixtureDescriptor.synthetic_fixture_entry_rows.length,
  MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.synthetic_fixture_entry_controls.length,
);
assert.ok(cp188SecurityFixtureDescriptor.rows_by_outcome.passed.some((row) => row.control === "allowed_test"));
assert.ok(cp188SecurityFixtureDescriptor.rows_by_outcome.blocked.some((row) => row.control === "denied_test"));
assert.ok(cp188SecurityFixtureDescriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_test"));
assert.ok(cp188SecurityFixtureDescriptor.security_fixture_rows.some((row) => row.control === "leak_prevention_test"));
assert.equal(cp188SecurityFixtureDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp188SecurityFixtureDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp188SecurityFixtureDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp188SecurityFixtureDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp188SecurityFixtureDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp188HermesEvidence.production_ready_candidate, true);
assert.equal(cp188ClaudePacket.review_packet, "C05.CP00-188.matter_core_permission_audit_security_fixture_boundary");
assert.equal(cp188ClaudePacket.read_only, true);
assert.equal(cp188ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp188ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp188Handoff.to_pack_id, "CP00-189");
assert.equal(cp188Handoff.next_subphase_id, "RP05.P06.M06.S04");
assert.equal(cp189Coverage.valid, true, cp189Coverage.errors.join("; "));
assert.equal(cp189Coverage.summary.unit_count, 150);
assert.equal(cp189Coverage.summary.by_phase["RP05.P06"], 94);
assert.equal(cp189Coverage.summary.by_phase["RP05.P07"], 56);
assert.equal(cp189Coverage.summary.by_deliverable.implementation, 40);
assert.equal(cp189Coverage.summary.by_deliverable.security_audit, 26);
assert.equal(cp189Coverage.summary.by_deliverable.failure_recovery, 44);
assert.equal(cp189Coverage.summary.by_deliverable.test, 16);
assert.equal(cp189Coverage.summary.by_micro_phase["RP05.P06.M06"], 19);
assert.equal(cp189Coverage.summary.by_micro_phase["RP05.P07.M02"], 20);
assert.equal(cp189Continuation.valid, true, cp189Continuation.errors.join("; "));
assert.equal(cp189ContinuationDescriptor.pack_id, "CP00-189");
assert.equal(cp189ContinuationDescriptor.source_permission_audit_security_fixture_boundary_pack_id, "CP00-188");
assert.equal(cp189ContinuationDescriptor.continuation_row_count, 150);
assert.equal(cp189ContinuationDescriptor.synthetic_rows.length, 94);
assert.equal(cp189ContinuationDescriptor.failure_rows.length, 56);
assert.equal(cp189ContinuationDescriptor.rows_by_micro_phase["RP05.P06.M08"], 22);
assert.equal(cp189ContinuationDescriptor.rows_by_micro_phase["RP05.P07.M03"], 14);
assert.ok(cp189ContinuationDescriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
assert.ok(cp189ContinuationDescriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_failure"));
assert.ok(cp189ContinuationDescriptor.rows_by_outcome.review_required.some((row) => row.control === "review_required_route"));
assert.ok(cp189ContinuationDescriptor.rows_by_outcome.approval_required.some((row) => row.control === "approval_required_route"));
assert.ok(cp189ContinuationDescriptor.failure_rows.some((row) => row.control === "blocked_claim_receipt" && row.blocked_claim_receipt_ref));
assert.ok(cp189ContinuationDescriptor.failure_rows.some((row) => row.control === "hermes_failure_evidence" && row.hermes_failure_evidence_ref));
assert.ok(cp189ContinuationDescriptor.synthetic_rows.some((row) => row.control === "leak_prevention_test" && row.security_trimming_proof_ref));
assert.equal(cp189ContinuationDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp189ContinuationDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp189ContinuationDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp189ContinuationDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp189ContinuationDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp189ContinuationDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp189HermesEvidence.production_ready_candidate, true);
assert.equal(cp189ClaudePacket.review_packet, "C05.CP00-189.matter_core_synthetic_fixture_failure_evidence_continuation");
assert.equal(cp189ClaudePacket.read_only, true);
assert.equal(cp189ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp189ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp189Handoff.to_pack_id, "CP00-190");
assert.equal(cp189Handoff.next_subphase_id, "RP05.P07.M03.S15");
assert.equal(cp190Coverage.valid, true, cp190Coverage.errors.join("; "));
assert.equal(cp190Coverage.summary.unit_count, 10);
assert.equal(cp190Coverage.summary.by_phase["RP05.P07"], 10);
assert.equal(cp190Coverage.summary.by_micro_phase["RP05.P07.M03"], 8);
assert.equal(cp190Coverage.summary.by_micro_phase["RP05.P07.M04"], 2);
assert.equal(cp190Coverage.summary.by_deliverable.hermes_evidence, 2);
assert.equal(cp190Coverage.summary.by_deliverable.fixture, 1);
assert.equal(cp190Coverage.summary.by_deliverable.test, 2);
assert.equal(cp190Coverage.summary.by_deliverable.security_audit, 1);
assert.equal(cp190Coverage.summary.by_deliverable.claude_review, 1);
assert.equal(cp190Coverage.summary.by_deliverable.implementation, 1);
assert.equal(cp190Coverage.summary.by_deliverable.failure_recovery, 2);
assert.equal(cp190Boundary.valid, true, cp190Boundary.errors.join("; "));
assert.equal(cp190BoundaryDescriptor.pack_id, "CP00-190");
assert.equal(cp190BoundaryDescriptor.source_synthetic_fixture_failure_evidence_continuation_pack_id, "CP00-189");
assert.equal(cp190BoundaryDescriptor.failure_boundary_row_count, 10);
assert.equal(cp190BoundaryDescriptor.rows_by_micro_phase["RP05.P07.M03"], 8);
assert.equal(cp190BoundaryDescriptor.rows_by_micro_phase["RP05.P07.M04"], 2);
assert.ok(cp190BoundaryDescriptor.failure_boundary_rows.some((row) => row.control === "blocked_claim_receipt" && row.blocked_claim_receipt_ref));
assert.ok(cp190BoundaryDescriptor.failure_boundary_rows.some((row) => row.control === "hermes_failure_evidence" && row.hermes_failure_evidence_ref));
assert.ok(cp190BoundaryDescriptor.rows_by_outcome.blocked.some((row) => row.control === "missing_tenant_failure"));
assert.ok(cp190BoundaryDescriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_edge_case_prompt"));
assert.ok(cp190BoundaryDescriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_escalation_note"));
assert.equal(cp190BoundaryDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp190BoundaryDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp190BoundaryDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp190BoundaryDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp190BoundaryDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp190BoundaryDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp190HermesEvidence.production_ready_candidate, true);
assert.equal(cp190ClaudePacket.review_packet, "C05.CP00-190.matter_core_failure_receipt_taxonomy_boundary");
assert.equal(cp190ClaudePacket.read_only, true);
assert.equal(cp190ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp190ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp190Handoff.to_pack_id, "CP00-191");
assert.equal(cp190Handoff.next_subphase_id, "RP05.P07.M04.S03");
assert.equal(cp191Coverage.valid, true, cp191Coverage.errors.join("; "));
assert.equal(cp191Coverage.summary.unit_count, 40);
assert.equal(cp191Coverage.summary.by_phase["RP05.P07"], 40);
assert.equal(cp191Coverage.summary.by_micro_phase["RP05.P07.M04"], 20);
assert.equal(cp191Coverage.summary.by_micro_phase["RP05.P07.M05"], 20);
assert.equal(cp191Coverage.summary.by_deliverable.failure_recovery, 22);
assert.equal(cp191Coverage.summary.by_deliverable.security_audit, 4);
assert.equal(cp191Coverage.summary.by_deliverable.implementation, 3);
assert.equal(cp191Coverage.summary.by_deliverable.hermes_evidence, 4);
assert.equal(cp191Coverage.summary.by_deliverable.fixture, 2);
assert.equal(cp191Coverage.summary.by_deliverable.test, 4);
assert.equal(cp191Coverage.summary.by_deliverable.claude_review, 1);
assert.equal(cp191GeneratedFailureBinding.valid, true, cp191GeneratedFailureBinding.errors.join("; "));
assert.equal(cp191GeneratedFailureDescriptor.pack_id, "CP00-191");
assert.equal(cp191GeneratedFailureDescriptor.source_failure_receipt_taxonomy_boundary_pack_id, "CP00-190");
assert.equal(cp191GeneratedFailureDescriptor.generated_failure_row_count, 40);
assert.equal(cp191GeneratedFailureDescriptor.rows_by_micro_phase["RP05.P07.M04"], 20);
assert.equal(cp191GeneratedFailureDescriptor.rows_by_micro_phase["RP05.P07.M05"], 20);
assert.equal(cp191GeneratedFailureDescriptor.rows_by_group["secondary-workflow"], 20);
assert.equal(cp191GeneratedFailureDescriptor.rows_by_group["permission-audit-binding"], 20);
assert.ok(cp191GeneratedFailureDescriptor.generated_failure_rows.some((row) => row.control === "permission_denied_failure" && row.permission_denied_failure_ref));
assert.ok(cp191GeneratedFailureDescriptor.generated_failure_rows.some((row) => row.control === "cross_tenant_failure" && row.cross_tenant_failure_ref));
assert.ok(cp191GeneratedFailureDescriptor.generated_failure_rows.some((row) => row.control === "rollback_expectation" && row.rollback_expectation_ref));
assert.ok(cp191GeneratedFailureDescriptor.generated_failure_rows.some((row) => row.control === "compensation_expectation" && row.compensation_expectation_ref));
assert.ok(cp191GeneratedFailureDescriptor.permission_audit_binding_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
assert.ok(cp191GeneratedFailureDescriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
assert.ok(cp191GeneratedFailureDescriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_edge_case_prompt"));
assert.ok(cp191GeneratedFailureDescriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_escalation_note"));
assert.equal(cp191GeneratedFailureDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp191GeneratedFailureDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp191GeneratedFailureDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp191GeneratedFailureDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp191GeneratedFailureDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp191GeneratedFailureDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp191HermesEvidence.production_ready_candidate, true);
assert.equal(cp191ClaudePacket.review_packet, "C05.CP00-191.matter_core_generated_failure_recovery_binding");
assert.equal(cp191ClaudePacket.read_only, true);
assert.equal(cp191ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp191ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp191Handoff.to_pack_id, "CP00-192");
assert.equal(cp191Handoff.next_subphase_id, "RP05.P07.M05.S21");
assert.equal(cp192Coverage.valid, true, cp192Coverage.errors.join("; "));
assert.equal(cp192Coverage.summary.unit_count, 10);
assert.equal(cp192Coverage.summary.by_phase["RP05.P07"], 10);
assert.equal(cp192Coverage.summary.by_micro_phase["RP05.P07.M05"], 2);
assert.equal(cp192Coverage.summary.by_micro_phase["RP05.P07.M06"], 8);
assert.equal(cp192Coverage.summary.by_deliverable.claude_review, 1);
assert.equal(cp192Coverage.summary.by_deliverable.implementation, 1);
assert.equal(cp192Coverage.summary.by_deliverable.failure_recovery, 7);
assert.equal(cp192Coverage.summary.by_deliverable.security_audit, 1);
assert.equal(cp192FailureFixtureEntryBoundary.valid, true, cp192FailureFixtureEntryBoundary.errors.join("; "));
assert.equal(cp192FailureFixtureEntryDescriptor.pack_id, "CP00-192");
assert.equal(cp192FailureFixtureEntryDescriptor.source_generated_failure_recovery_binding_pack_id, "CP00-191");
assert.equal(cp192FailureFixtureEntryDescriptor.failure_fixture_entry_row_count, 10);
assert.equal(cp192FailureFixtureEntryDescriptor.rows_by_micro_phase["RP05.P07.M05"], 2);
assert.equal(cp192FailureFixtureEntryDescriptor.rows_by_micro_phase["RP05.P07.M06"], 8);
assert.equal(cp192FailureFixtureEntryDescriptor.rows_by_group["review-escalation-tail"], 2);
assert.equal(cp192FailureFixtureEntryDescriptor.rows_by_group["failure-fixture-entry"], 8);
assert.ok(cp192FailureFixtureEntryDescriptor.failure_fixture_entry_rows.some((row) => row.control === "failure_taxonomy" && row.failure_taxonomy_ref));
assert.ok(cp192FailureFixtureEntryDescriptor.failure_fixture_entry_rows.some((row) => row.control === "missing_tenant_failure" && row.missing_tenant_failure_ref));
assert.ok(cp192FailureFixtureEntryDescriptor.failure_fixture_entry_rows.some((row) => row.control === "permission_denied_failure" && row.permission_denied_failure_ref));
assert.ok(cp192FailureFixtureEntryDescriptor.rows_by_outcome.blocked.some((row) => row.control === "cross_tenant_failure"));
assert.ok(cp192FailureFixtureEntryDescriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
assert.ok(cp192FailureFixtureEntryDescriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_edge_case_prompt"));
assert.ok(cp192FailureFixtureEntryDescriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_escalation_note"));
assert.equal(cp192FailureFixtureEntryDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp192FailureFixtureEntryDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp192FailureFixtureEntryDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp192FailureFixtureEntryDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp192FailureFixtureEntryDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp192FailureFixtureEntryDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp192HermesEvidence.production_ready_candidate, true);
assert.equal(cp192ClaudePacket.review_packet, "C05.CP00-192.matter_core_failure_fixture_entry_boundary");
assert.equal(cp192ClaudePacket.read_only, true);
assert.equal(cp192ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp192ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp192Handoff.to_pack_id, "CP00-193");
assert.equal(cp192Handoff.next_subphase_id, "RP05.P07.M06.S09");
assert.equal(cp193Coverage.valid, true, cp193Coverage.errors.join("; "));
assert.equal(cp193Coverage.summary.unit_count, 150);
assert.equal(cp193Coverage.summary.by_phase["RP05.P07"], 89);
assert.equal(cp193Coverage.summary.by_phase["RP05.P08"], 61);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P07.M06"], 14);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P07.M07"], 22);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P07.M08"], 22);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P07.M09"], 20);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P07.M10"], 11);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P08.M00"], 4);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P08.M01"], 8);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P08.M02"], 8);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P08.M03"], 22);
assert.equal(cp193Coverage.summary.by_micro_phase["RP05.P08.M04"], 19);
assert.equal(cp193Coverage.summary.by_deliverable.failure_recovery, 51);
assert.equal(cp193Coverage.summary.by_deliverable.implementation, 24);
assert.equal(cp193Coverage.summary.by_deliverable.hermes_evidence, 48);
assert.equal(cp193Coverage.summary.by_deliverable.fixture, 4);
assert.equal(cp193Coverage.summary.by_deliverable.test, 10);
assert.equal(cp193Coverage.summary.by_deliverable.security_audit, 8);
assert.equal(cp193Coverage.summary.by_deliverable.claude_review, 5);
assert.equal(cp193FailureFixtureEvidenceReviewBridge.valid, true, cp193FailureFixtureEvidenceReviewBridge.errors.join("; "));
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.pack_id, "CP00-193");
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.source_failure_fixture_entry_boundary_pack_id, "CP00-192");
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.source_generated_failure_recovery_binding_pack_id, "CP00-191");
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.failure_fixture_evidence_review_row_count, 150);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P07.M06"], 14);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P07.M07"], 22);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P07.M08"], 22);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P07.M09"], 20);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P07.M10"], 11);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P08.M00"], 4);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P08.M01"], 8);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P08.M02"], 8);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P08.M03"], 22);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_micro_phase["RP05.P08.M04"], 19);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_deliverable.failure_recovery, 51);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_deliverable.implementation, 24);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_deliverable.hermes_evidence, 48);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_deliverable.fixture, 4);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_deliverable.test, 10);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_deliverable.security_audit, 8);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_deliverable.claude_review, 5);
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.failure_fixture_evidence_review_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "permission_denied_failure" && row.permission_denied_failure_ref));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "block_semantics" && row.block_semantics_ref));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "claude_dependency_marker" && row.claude_dependency_marker_ref));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.failure_fixture_evidence_review_rows.some((row) => row.control === "human_approval_marker" && row.human_approval_marker_ref));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_denied_failure"));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_outcome.blocked.some((row) => row.control === "block_semantics"));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_dependency_marker"));
assert.ok(cp193FailureFixtureEvidenceReviewBridgeDescriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_approval_marker"));
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp193FailureFixtureEvidenceReviewBridgeDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp193HermesEvidence.production_ready_candidate, true);
assert.equal(cp193ClaudePacket.review_packet, "C05.CP00-193.matter_core_failure_fixture_evidence_review_bridge");
assert.equal(cp193ClaudePacket.read_only, true);
assert.equal(cp193ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp193ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp193Handoff.to_pack_id, "CP00-194");
assert.equal(cp193Handoff.next_subphase_id, "RP05.P08.M04.S20");
assert.equal(cp194Coverage.valid, true, cp194Coverage.errors.join("; "));
assert.equal(cp194Coverage.summary.unit_count, 40);
assert.equal(cp194Coverage.summary.by_phase["RP05.P08"], 40);
assert.equal(cp194Coverage.summary.by_micro_phase["RP05.P08.M04"], 1);
assert.equal(cp194Coverage.summary.by_micro_phase["RP05.P08.M05"], 22);
assert.equal(cp194Coverage.summary.by_micro_phase["RP05.P08.M06"], 17);
assert.equal(cp194Coverage.summary.by_micro_title["Secondary Workflow Slice"], 1);
assert.equal(cp194Coverage.summary.by_micro_title["Permission And Audit Binding"], 22);
assert.equal(cp194Coverage.summary.by_micro_title["Synthetic Fixture Set"], 17);
assert.equal(cp194Coverage.summary.by_deliverable.implementation, 17);
assert.equal(cp194Coverage.summary.by_deliverable.hermes_evidence, 20);
assert.equal(cp194Coverage.summary.by_deliverable.claude_review, 2);
assert.equal(cp194Coverage.summary.by_deliverable.test, 1);
assert.equal(
  cp194PermissionAuditEvidenceTerminalBridge.valid,
  true,
  cp194PermissionAuditEvidenceTerminalBridge.errors.join("; "),
);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.pack_id, "CP00-194");
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.source_failure_fixture_evidence_review_bridge_pack_id, "CP00-193");
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.source_permission_substrate_workflow_binding_pack_id, "CP00-187");
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.permission_audit_evidence_terminal_row_count, 40);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_micro_phase["RP05.P08.M04"], 1);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_micro_phase["RP05.P08.M05"], 22);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_micro_phase["RP05.P08.M06"], 17);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_group["secondary-workflow-terminal"], 1);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_group["permission-audit-binding"], 22);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_group["synthetic-fixture-set-entry"], 17);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_deliverable.implementation, 17);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_deliverable.hermes_evidence, 20);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_deliverable.claude_review, 2);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_deliverable.test, 1);
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.permission_audit_evidence_terminal_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "next_gate_readiness" && row.next_gate_readiness_ref));
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "block_semantics" && row.block_semantics_ref));
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "claude_dependency_marker" && row.claude_dependency_marker_ref));
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.permission_audit_evidence_terminal_rows.some((row) => row.control === "human_approval_marker" && row.human_approval_marker_ref));
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_outcome.blocked.some((row) => row.control === "block_semantics"));
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_outcome.review_required.some((row) => row.control === "claude_dependency_marker"));
assert.ok(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_approval_marker"));
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp194PermissionAuditEvidenceTerminalBridgeDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp194HermesEvidence.production_ready_candidate, true);
assert.equal(cp194ClaudePacket.review_packet, "C05.CP00-194.matter_core_permission_audit_evidence_terminal_bridge");
assert.equal(cp194ClaudePacket.read_only, true);
assert.equal(cp194ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp194ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp194Handoff.to_pack_id, "CP00-195");
assert.equal(cp194Handoff.next_subphase_id, "RP05.P08.M06.S18");
assert.equal(cp195Coverage.valid, true, cp195Coverage.errors.join("; "));
assert.equal(cp195Coverage.summary.unit_count, 150);
assert.equal(cp195Coverage.summary.by_phase["RP05.P08"], 73);
assert.equal(cp195Coverage.summary.by_phase["RP05.P09"], 77);
assert.equal(cp195Coverage.summary.by_micro_phase["RP05.P08.M06"], 3);
assert.equal(cp195Coverage.summary.by_micro_phase["RP05.P08.M07"], 22);
assert.equal(cp195Coverage.summary.by_micro_phase["RP05.P08.M08"], 20);
assert.equal(cp195Coverage.summary.by_micro_phase["RP05.P08.M09"], 20);
assert.equal(cp195Coverage.summary.by_micro_phase["RP05.P08.M10"], 8);
assert.equal(cp195Coverage.summary.by_micro_phase["RP05.P09.M03"], 20);
assert.equal(cp195Coverage.summary.by_micro_phase["RP05.P09.M05"], 20);
assert.equal(cp195Coverage.summary.by_deliverable.implementation, 63);
assert.equal(cp195Coverage.summary.by_deliverable.hermes_evidence, 38);
assert.equal(cp195Coverage.summary.by_deliverable.claude_review, 21);
assert.equal(cp195Coverage.summary.by_deliverable.security_audit, 14);
assert.equal(cp195Coverage.summary.by_deliverable.test, 9);
assert.equal(cp195Coverage.summary.by_deliverable.ui, 5);
assert.equal(cp195EvidenceReviewHandoffTerminalBridge.valid, true, cp195EvidenceReviewHandoffTerminalBridge.errors.join("; "));
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.pack_id, "CP00-195");
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.source_permission_audit_evidence_terminal_bridge_pack_id, "CP00-194");
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.source_failure_fixture_evidence_review_bridge_pack_id, "CP00-193");
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.evidence_review_handoff_terminal_row_count, 150);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_phase["RP05.P08"], 73);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_phase["RP05.P09"], 77);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_micro_phase["RP05.P08.M06"], 3);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_micro_phase["RP05.P08.M07"], 22);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_micro_phase["RP05.P09.M03"], 20);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_micro_phase["RP05.P09.M05"], 20);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_deliverable.security_audit, 14);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_deliverable.ui, 5);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.security_audit_rows.length, 14);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.ui_leak_rows.length, 5);
assert.ok(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.evidence_review_handoff_terminal_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
assert.ok(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_outcome.blocked.some((row) => row.control === "permission_bypass_questions"));
assert.ok(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_outcome.review_required.some((row) => row.control === "architecture_review_questions"));
assert.ok(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.rows_by_outcome.approval_required.some((row) => row.control === "human_approval_summary"));
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp195EvidenceReviewHandoffTerminalBridgeDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp195HermesEvidence.production_ready_candidate, true);
assert.equal(cp195ClaudePacket.review_packet, "C05.CP00-195.matter_core_evidence_review_handoff_terminal_bridge");
assert.equal(cp195ClaudePacket.read_only, true);
assert.equal(cp195ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp195ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp195Handoff.to_pack_id, "CP00-196");
assert.equal(cp195Handoff.next_subphase_id, "RP05.P09.M07.S03");
assert.equal(cp196Coverage.valid, true, cp196Coverage.errors.join("; "));
assert.equal(cp196Coverage.summary.unit_count, 10);
assert.equal(cp196Coverage.summary.by_phase["RP05.P09"], 10);
assert.equal(cp196Coverage.summary.by_micro_phase["RP05.P09.M07"], 10);
assert.equal(cp196Coverage.summary.by_micro_title["Test And Golden Case Set"], 10);
assert.equal(cp196Coverage.summary.by_deliverable.security_audit, 2);
assert.equal(cp196Coverage.summary.by_deliverable.test, 1);
assert.equal(cp196Coverage.summary.by_deliverable.ui, 1);
assert.equal(cp196Coverage.summary.by_deliverable.implementation, 6);
assert.equal(cp196ReviewQuestionSecurityGate.valid, true, cp196ReviewQuestionSecurityGate.errors.join("; "));
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.pack_id, "CP00-196");
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.source_evidence_review_handoff_terminal_bridge_pack_id, "CP00-195");
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.review_question_security_gate_row_count, 10);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.rows_by_deliverable.security_audit, 2);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.rows_by_deliverable.test, 1);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.rows_by_deliverable.ui, 1);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.blocked_question_rows.length, 2);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.test_question_rows.length, 1);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.ui_leak_rows.length, 1);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.human_approval_rows.length, 1);
assert.ok(cp196ReviewQuestionSecurityGateDescriptor.review_question_security_gate_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
assert.ok(cp196ReviewQuestionSecurityGateDescriptor.review_question_security_gate_rows.every((row) => row.question_ref));
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp196ReviewQuestionSecurityGateDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp196HermesEvidence.production_ready_candidate, true);
assert.equal(cp196ClaudePacket.review_packet, "C05.CP00-196.matter_core_review_question_security_gate");
assert.equal(cp196ClaudePacket.read_only, true);
assert.equal(cp196ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp196ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp196Handoff.to_pack_id, "CP00-197");
assert.equal(cp196Handoff.next_subphase_id, "RP05.P09.M07.S13");
assert.equal(cp197Coverage.valid, true, cp197Coverage.errors.join("; "));
assert.equal(cp197Coverage.summary.unit_count, 28);
assert.equal(cp197Coverage.summary.by_phase["RP05.P09"], 28);
assert.equal(cp197Coverage.summary.by_micro_phase["RP05.P09.M07"], 8);
assert.equal(cp197Coverage.summary.by_micro_phase["RP05.P09.M08"], 8);
assert.equal(cp197Coverage.summary.by_micro_phase["RP05.P09.M09"], 8);
assert.equal(cp197Coverage.summary.by_micro_phase["RP05.P09.M10"], 4);
assert.equal(cp197Coverage.summary.by_micro_title["Test And Golden Case Set"], 8);
assert.equal(cp197Coverage.summary.by_micro_title["Hermes Evidence Packet"], 8);
assert.equal(cp197Coverage.summary.by_micro_title["Claude Review Packet"], 8);
assert.equal(cp197Coverage.summary.by_micro_title["Closeout And Next Handoff"], 4);
assert.equal(cp197Coverage.summary.by_deliverable.claude_review, 7);
assert.equal(cp197Coverage.summary.by_deliverable.implementation, 11);
assert.equal(cp197Coverage.summary.by_deliverable.security_audit, 6);
assert.equal(cp197Coverage.summary.by_deliverable.test, 2);
assert.equal(cp197Coverage.summary.by_deliverable.ui, 2);
assert.equal(cp197TerminalReviewCloseoutHandoff.valid, true, cp197TerminalReviewCloseoutHandoff.errors.join("; "));
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.pack_id, "CP00-197");
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.source_review_question_security_gate_pack_id, "CP00-196");
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.source_evidence_review_handoff_terminal_bridge_pack_id, "CP00-195");
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.terminal_review_closeout_handoff_row_count, 28);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.rows_by_deliverable.claude_review, 7);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.rows_by_deliverable.implementation, 11);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.rows_by_deliverable.security_audit, 6);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.rows_by_deliverable.test, 2);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.rows_by_deliverable.ui, 2);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.blocked_question_rows.length, 7);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.review_required_rows.length, 7);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.test_question_rows.length, 2);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.ui_leak_rows.length, 2);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.handoff_rows.length, 4);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.closeout_note_rows.length, 3);
assert.ok(cp197TerminalReviewCloseoutHandoffDescriptor.terminal_review_closeout_handoff_rows.every((row) => row.permission_badge_ref && row.audit_hint_ref));
assert.ok(cp197TerminalReviewCloseoutHandoffDescriptor.terminal_review_closeout_handoff_rows.every((row) => row.question_ref));
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.leak_guards.no_runtime_permission_evaluation, true);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.leak_guards.no_audit_event_write, true);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.leak_guards.no_permission_decision_detail, true);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.leak_guards.no_audit_event_body, true);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.leak_guards.no_route_dispatch, true);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.leak_guards.no_failure_recovery_execution, true);
assert.equal(cp197TerminalReviewCloseoutHandoffDescriptor.leak_guards.no_rp06_runtime_implementation, true);
assert.equal(cp197HermesEvidence.production_ready_candidate, true);
assert.equal(cp197HermesEvidence.rp06_runtime_implemented, false);
assert.equal(cp197ClaudePacket.review_packet, "C05.CP00-197.matter_core_terminal_review_closeout_handoff");
assert.equal(cp197ClaudePacket.read_only, true);
assert.equal(cp197ClaudePacket.source_inspection_basis, "read_tools_used");
assert.deepEqual(cp197ClaudePacket.allowed_tools, ["Read", "Grep", "Glob"]);
assert.deepEqual(MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS.allowed_claude_tools, ["Read", "Grep", "Glob"]);
assert.equal(cp197Handoff.to_pack_id, "CP00-198");
assert.equal(cp197Handoff.next_subphase_id, "RP06.P00.M00.S01");
assert.equal(cp197Handoff.rp06_runtime_implemented, false);
assert.equal(MATTER_CORE_SERVICE_BOUNDARY.service_entrypoint, "executeMatterCoreServiceWorkflow");
assert.equal(matterContract.no_write_attestation.writes_product_state, false);
assert.equal(matterContract.no_write_attestation.implements_graph_provider_runtime, false);
assert.equal(matterContract.no_write_attestation.implements_loop_engine, false);
assert.equal(MATTER_CORE_CP178_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
assert.equal(MATTER_CORE_CP179_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP180_NO_WRITE_ATTESTATION.acquires_runtime_lock, false);
assert.equal(MATTER_CORE_CP180_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP181_NO_WRITE_ATTESTATION.exposes_raw_payload, false);
assert.equal(MATTER_CORE_CP181_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP182_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP182_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP184_NO_WRITE_ATTESTATION.uses_real_document_data, false);
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
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP186_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP187_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP188_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP189_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP190_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP191_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP192_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.implements_loop_engine, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP193_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.implements_loop_engine, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP194_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.implements_loop_engine, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP195_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.evaluates_runtime_permission, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.writes_audit_event, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.dispatches_review_route, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.dispatches_approval_route, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.executes_rollback, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.executes_retry, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.renders_live_dom, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.executes_api_handler, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.leaks_unauthorized_counts, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.leaks_permission_decision_detail, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.leaks_audit_event_body, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.implements_loop_engine, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP196_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);
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
assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.uses_real_client_data, false);
assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.uses_real_document_data, false);
assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.implements_loop_engine, false);
assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.implements_rp06_dms_runtime, false);
assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval, false);
assert.equal(MATTER_CORE_CP197_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "rp05:matter-core:validate",
      pack_id: matterContract.current_pack.pack_id,
      foundation_pack_id: cp177Handoff.from_pack_id,
      service_pack_id: cp178Handoff.from_pack_id,
      service_evidence_pack_id: cp179Handoff.from_pack_id,
      sensitive_boundary_pack_id: cp180Handoff.from_pack_id,
      api_interface_pack_id: cp181Handoff.from_pack_id,
      ui_workflow_pack_id: cp182Handoff.from_pack_id,
      ui_evidence_permission_fixture_pack_id: cp183Handoff.from_pack_id,
      fixture_evidence_terminal_entry_pack_id: cp184Handoff.from_pack_id,
      permission_audit_tail_fixture_pack_id: cp185Handoff.from_pack_id,
      synthetic_fixture_permission_substrate_pack_id: cp186Handoff.from_pack_id,
      permission_substrate_workflow_binding_pack_id: cp187Handoff.from_pack_id,
      permission_audit_security_fixture_boundary_pack_id: cp188Handoff.from_pack_id,
      synthetic_fixture_failure_evidence_continuation_pack_id: cp189Handoff.from_pack_id,
      failure_receipt_taxonomy_boundary_pack_id: cp190Handoff.from_pack_id,
      generated_failure_recovery_binding_pack_id: cp191Handoff.from_pack_id,
      failure_fixture_entry_boundary_pack_id: cp192Handoff.from_pack_id,
      failure_fixture_evidence_review_bridge_pack_id: cp193Handoff.from_pack_id,
      permission_audit_evidence_terminal_bridge_pack_id: cp194Handoff.from_pack_id,
      evidence_review_handoff_terminal_bridge_pack_id: cp195Handoff.from_pack_id,
      review_question_security_gate_pack_id: cp196Handoff.from_pack_id,
      terminal_review_closeout_handoff_pack_id: cp197Handoff.from_pack_id,
      covered_units: cp197Coverage.summary.unit_count,
      model_count: registry.model_count,
      hermes_gate: cp197HermesEvidence.gate,
      claude_gate: matterContract.current_pack.claude_gate,
      next_pack_id: cp197Handoff.to_pack_id,
      production_ready_candidate: cp197HermesEvidence.production_ready_candidate,
    },
    null,
    2,
  ),
);
