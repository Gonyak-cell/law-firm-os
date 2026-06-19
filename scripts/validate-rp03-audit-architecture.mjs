#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AUDIT_COMPLIANCE_CP135_ENTRY_READINESS_CONTRACT,
  AUDIT_COMPLIANCE_CP135_PACK_BINDING,
  AUDIT_COMPLIANCE_CP136_PACK_BINDING,
  AUDIT_COMPLIANCE_CP136_SERVICE_INTERFACE_READINESS_CONTRACT,
  AUDIT_COMPLIANCE_CP137_PACK_BINDING,
  AUDIT_COMPLIANCE_CP137_SERVICE_INTERFACE_WORKFLOW_EVIDENCE_CONTRACT,
  AUDIT_COMPLIANCE_CP138_CLAUDE_BOUNDARY_CONTRACT,
  AUDIT_COMPLIANCE_CP138_PACK_BINDING,
  AUDIT_COMPLIANCE_CP139_API_UI_REFERENCE_READINESS_CONTRACT,
  AUDIT_COMPLIANCE_CP139_PACK_BINDING,
  AUDIT_COMPLIANCE_CP140_PACK_BINDING,
  AUDIT_COMPLIANCE_CP140_UI_WORKFLOW_CONTINUATION_CONTRACT,
  AUDIT_COMPLIANCE_CP141_PACK_BINDING,
  AUDIT_COMPLIANCE_CP141_UI_PERMISSION_FIXTURE_BINDING_CONTRACT,
  AUDIT_COMPLIANCE_CP142_PACK_BINDING,
  AUDIT_COMPLIANCE_CP142_UI_FIXTURE_EVIDENCE_REFERENCE_CONTRACT,
  AUDIT_COMPLIANCE_CP143_FIXTURE_TERMINAL_BOUNDARY_CONTRACT,
  AUDIT_COMPLIANCE_CP143_PACK_BINDING,
  AUDIT_COMPLIANCE_CP144_FIXTURE_PERMISSION_MATRIX_REFERENCE_CONTRACT,
  AUDIT_COMPLIANCE_CP144_PACK_BINDING,
  AUDIT_COMPLIANCE_CP145_PACK_BINDING,
  AUDIT_COMPLIANCE_CP145_PERMISSION_MATRIX_WORKFLOW_BOUNDARY_CONTRACT,
  AUDIT_COMPLIANCE_CP146_PACK_BINDING,
  AUDIT_COMPLIANCE_CP146_PERMISSION_MATRIX_SECURITY_FIXTURE_BOUNDARY_CONTRACT,
  AUDIT_COMPLIANCE_CP147_PACK_BINDING,
  AUDIT_COMPLIANCE_CP147_PERMISSION_MATRIX_FAILURE_TAXONOMY_REFERENCE_CONTRACT,
  AUDIT_COMPLIANCE_CP148_FAILURE_BOUNDARY_SENSITIVE_CONTRACT,
  AUDIT_COMPLIANCE_CP148_PACK_BINDING,
  AUDIT_COMPLIANCE_CP149_FAILURE_WORKFLOW_CONTINUATION_CONTRACT,
  AUDIT_COMPLIANCE_CP149_PACK_BINDING,
  AUDIT_COMPLIANCE_CP150_FAILURE_FIXTURE_SENSITIVE_BOUNDARY_CONTRACT,
  AUDIT_COMPLIANCE_CP150_PACK_BINDING,
  AUDIT_COMPLIANCE_CP151_FAILURE_EVIDENCE_CONTINUATION_CONTRACT,
  AUDIT_COMPLIANCE_CP151_PACK_BINDING,
  AUDIT_COMPLIANCE_CP152_EVIDENCE_WORKFLOW_FIXTURE_CONTRACT,
  AUDIT_COMPLIANCE_CP152_PACK_BINDING,
  AUDIT_COMPLIANCE_CP153_PACK_BINDING,
  AUDIT_COMPLIANCE_CP153_REVIEW_CLOSEOUT_CONTINUATION_CONTRACT,
  AUDIT_COMPLIANCE_CP154_PACK_BINDING,
  AUDIT_COMPLIANCE_CP154_REVIEW_SENSITIVE_BOUNDARY_CONTRACT,
  AUDIT_COMPLIANCE_CP155_PACK_BINDING,
  AUDIT_COMPLIANCE_CP155_REVIEW_TERMINAL_CLOSEOUT_CONTRACT,
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
} from "../packages/audit/src/index.js";

const architecturePath = path.resolve("docs/rp03-audit-compliance-architecture.md");
const contractPath = path.resolve("contracts/audit-compliance-contract.json");
const detailedPlanPath = path.resolve("docs/rp03-audit-compliance-kernel-detailed-microphases.json");
const fullPlanPath = path.resolve("docs/full-spec-microphase-ledger.json");
const closeoutPackPlanPath = path.resolve("docs/closeout-pack-plan/closeout-pack-plan.json");
const cp135ManifestPath = path.resolve("docs/closeout-packs/cp00-135/manifest.json");
const cp136ManifestPath = path.resolve("docs/closeout-packs/cp00-136/manifest.json");
const cp137ManifestPath = path.resolve("docs/closeout-packs/cp00-137/manifest.json");
const cp138ManifestPath = path.resolve("docs/closeout-packs/cp00-138/manifest.json");
const cp139ManifestPath = path.resolve("docs/closeout-packs/cp00-139/manifest.json");
const cp140ManifestPath = path.resolve("docs/closeout-packs/cp00-140/manifest.json");
const cp141ManifestPath = path.resolve("docs/closeout-packs/cp00-141/manifest.json");
const cp142ManifestPath = path.resolve("docs/closeout-packs/cp00-142/manifest.json");
const cp143ManifestPath = path.resolve("docs/closeout-packs/cp00-143/manifest.json");
const cp144ManifestPath = path.resolve("docs/closeout-packs/cp00-144/manifest.json");
const cp145ManifestPath = path.resolve("docs/closeout-packs/cp00-145/manifest.json");
const cp146ManifestPath = path.resolve("docs/closeout-packs/cp00-146/manifest.json");
const cp147ManifestPath = path.resolve("docs/closeout-packs/cp00-147/manifest.json");
const cp148ManifestPath = path.resolve("docs/closeout-packs/cp00-148/manifest.json");
const cp149ManifestPath = path.resolve("docs/closeout-packs/cp00-149/manifest.json");
const cp150ManifestPath = path.resolve("docs/closeout-packs/cp00-150/manifest.json");
const cp151ManifestPath = path.resolve("docs/closeout-packs/cp00-151/manifest.json");
const cp152ManifestPath = path.resolve("docs/closeout-packs/cp00-152/manifest.json");
const cp153ManifestPath = path.resolve("docs/closeout-packs/cp00-153/manifest.json");
const cp154ManifestPath = path.resolve("docs/closeout-packs/cp00-154/manifest.json");
const cp155ManifestPath = path.resolve("docs/closeout-packs/cp00-155/manifest.json");

const errors = [];

function requireText(haystack, needle, label) {
  if (!haystack.includes(needle)) errors.push(`${label} missing required text: ${needle}`);
}

function requireArrayIncludes(array, value, label) {
  if (!Array.isArray(array) || !array.includes(value)) errors.push(`${label} must include ${value}`);
}

const architecture = await readFile(architecturePath, "utf8");
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const detailedPlan = JSON.parse(await readFile(detailedPlanPath, "utf8"));
const fullPlan = JSON.parse(await readFile(fullPlanPath, "utf8"));
const closeoutPackPlan = JSON.parse(await readFile(closeoutPackPlanPath, "utf8"));
let cp135CloseoutManifest = null;
try {
  cp135CloseoutManifest = JSON.parse(await readFile(cp135ManifestPath, "utf8"));
} catch {
  cp135CloseoutManifest = null;
}
let cp136CloseoutManifest = null;
try {
  cp136CloseoutManifest = JSON.parse(await readFile(cp136ManifestPath, "utf8"));
} catch {
  cp136CloseoutManifest = null;
}
let cp137CloseoutManifest = null;
try {
  cp137CloseoutManifest = JSON.parse(await readFile(cp137ManifestPath, "utf8"));
} catch {
  cp137CloseoutManifest = null;
}
let cp138CloseoutManifest = null;
try {
  cp138CloseoutManifest = JSON.parse(await readFile(cp138ManifestPath, "utf8"));
} catch {
  cp138CloseoutManifest = null;
}
let cp139CloseoutManifest = null;
try {
  cp139CloseoutManifest = JSON.parse(await readFile(cp139ManifestPath, "utf8"));
} catch {
  cp139CloseoutManifest = null;
}
let cp140CloseoutManifest = null;
try {
  cp140CloseoutManifest = JSON.parse(await readFile(cp140ManifestPath, "utf8"));
} catch {
  cp140CloseoutManifest = null;
}
let cp141CloseoutManifest = null;
try {
  cp141CloseoutManifest = JSON.parse(await readFile(cp141ManifestPath, "utf8"));
} catch {
  cp141CloseoutManifest = null;
}
let cp142CloseoutManifest = null;
try {
  cp142CloseoutManifest = JSON.parse(await readFile(cp142ManifestPath, "utf8"));
} catch {
  cp142CloseoutManifest = null;
}
let cp143CloseoutManifest = null;
try {
  cp143CloseoutManifest = JSON.parse(await readFile(cp143ManifestPath, "utf8"));
} catch {
  cp143CloseoutManifest = null;
}
let cp144CloseoutManifest = null;
try {
  cp144CloseoutManifest = JSON.parse(await readFile(cp144ManifestPath, "utf8"));
} catch {
  cp144CloseoutManifest = null;
}
let cp145CloseoutManifest = null;
try {
  cp145CloseoutManifest = JSON.parse(await readFile(cp145ManifestPath, "utf8"));
} catch {
  cp145CloseoutManifest = null;
}
let cp146CloseoutManifest = null;
try {
  cp146CloseoutManifest = JSON.parse(await readFile(cp146ManifestPath, "utf8"));
} catch {
  cp146CloseoutManifest = null;
}
let cp147CloseoutManifest = null;
try {
  cp147CloseoutManifest = JSON.parse(await readFile(cp147ManifestPath, "utf8"));
} catch {
  cp147CloseoutManifest = null;
}
let cp148CloseoutManifest = null;
try {
  cp148CloseoutManifest = JSON.parse(await readFile(cp148ManifestPath, "utf8"));
} catch {
  cp148CloseoutManifest = null;
}
let cp149CloseoutManifest = null;
try {
  cp149CloseoutManifest = JSON.parse(await readFile(cp149ManifestPath, "utf8"));
} catch {
  cp149CloseoutManifest = null;
}
let cp150CloseoutManifest = null;
try {
  cp150CloseoutManifest = JSON.parse(await readFile(cp150ManifestPath, "utf8"));
} catch {
  cp150CloseoutManifest = null;
}
let cp151CloseoutManifest = null;
try {
  cp151CloseoutManifest = JSON.parse(await readFile(cp151ManifestPath, "utf8"));
} catch {
  cp151CloseoutManifest = null;
}
let cp152CloseoutManifest = null;
try {
  cp152CloseoutManifest = JSON.parse(await readFile(cp152ManifestPath, "utf8"));
} catch {
  cp152CloseoutManifest = null;
}
let cp153CloseoutManifest = null;
try {
  cp153CloseoutManifest = JSON.parse(await readFile(cp153ManifestPath, "utf8"));
} catch {
  cp153CloseoutManifest = null;
}
let cp154CloseoutManifest = null;
try {
  cp154CloseoutManifest = JSON.parse(await readFile(cp154ManifestPath, "utf8"));
} catch {
  cp154CloseoutManifest = null;
}
let cp155CloseoutManifest = null;
try {
  cp155CloseoutManifest = JSON.parse(await readFile(cp155ManifestPath, "utf8"));
} catch {
  cp155CloseoutManifest = null;
}
const cp135Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-135") ?? cp135CloseoutManifest?.plan_binding_snapshot;
const cp136Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-136") ?? cp136CloseoutManifest?.plan_binding_snapshot;
const cp137Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-137") ?? cp137CloseoutManifest?.plan_binding_snapshot;
const cp138Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-138") ?? cp138CloseoutManifest?.plan_binding_snapshot;
const cp139Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-139") ?? cp139CloseoutManifest?.plan_binding_snapshot;
const cp140Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-140") ?? cp140CloseoutManifest?.plan_binding_snapshot;
const cp141Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-141") ?? cp141CloseoutManifest?.plan_binding_snapshot;
const cp142Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-142") ?? cp142CloseoutManifest?.plan_binding_snapshot;
const cp143Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-143") ?? cp143CloseoutManifest?.plan_binding_snapshot;
const cp144Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-144") ?? cp144CloseoutManifest?.plan_binding_snapshot;
const cp145Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-145") ?? cp145CloseoutManifest?.plan_binding_snapshot;
const cp146Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-146") ?? cp146CloseoutManifest?.plan_binding_snapshot;
const cp147Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-147") ?? cp147CloseoutManifest?.plan_binding_snapshot;
const cp148Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-148") ?? cp148CloseoutManifest?.plan_binding_snapshot;
const cp149Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-149") ?? cp149CloseoutManifest?.plan_binding_snapshot;
const cp150Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-150") ?? cp150CloseoutManifest?.plan_binding_snapshot;
const cp151Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-151") ?? cp151CloseoutManifest?.plan_binding_snapshot;
const cp152Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-152") ?? cp152CloseoutManifest?.plan_binding_snapshot;
const cp153Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-153") ?? cp153CloseoutManifest?.plan_binding_snapshot;
const cp154Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-154") ?? cp154CloseoutManifest?.plan_binding_snapshot;
const cp155Plan = closeoutPackPlan.packs.find((pack) => pack.pack_id === "CP00-155") ?? cp155CloseoutManifest?.plan_binding_snapshot;

for (const term of [
  "append-only",
  "correction event",
  "tamper-evident",
  "hash chain",
  "sequence_number",
  "WORM",
  "legal hold",
  "retention",
  "trace_id",
  "span_id",
  "request_id",
  "payload_digest",
  "evidence_refs",
  "Privacy",
  "metadata_plus_digest",
  "Compliance export",
  "custody receipt",
  "cross-tenant",
  "Hermes H03",
  "Claude C03",
]) {
  requireText(architecture, term, "RP03 architecture");
}

if (contract.schema_version !== "law-firm-os.audit-compliance-contract.v0.22") {
  errors.push("contract schema_version mismatch");
}
if (contract.program_id !== "RP03") errors.push("contract program_id must be RP03");
if (contract.hermes_gate?.id !== "H03") errors.push("contract Hermes gate must be H03");
if (contract.claude_gate?.id !== "C03") errors.push("contract Claude gate must be C03");
if (contract.event_contract?.append_only !== true) errors.push("event_contract.append_only must be true");
if (contract.event_contract?.correction_event_required !== true) errors.push("event_contract.correction_event_required must be true");
if (contract.immutability?.tamper_evidence !== true) errors.push("immutability.tamper_evidence must be true");
if (contract.retention_and_legal_hold?.worm_storage_supported !== true) errors.push("worm_storage_supported must be true");
if (contract.retention_and_legal_hold?.legal_hold_overrides_retention_expiry !== true) {
  errors.push("legal_hold_overrides_retention_expiry must be true");
}
if (contract.query_policy?.tenant_boundary_required !== true) errors.push("tenant_boundary_required must be true");
if (contract.query_policy?.permission_trimming_required !== true) errors.push("permission_trimming_required must be true");
if (contract.query_policy?.count_leakage_prohibited !== true) errors.push("count_leakage_prohibited must be true");

if (contract.current_pack?.pack_id !== "CP00-155") errors.push("contract current_pack.pack_id must be CP00-155");
if (contract.current_pack?.risk_class !== "C") errors.push("contract current_pack.risk_class must be C");
if (contract.current_pack?.unit_count !== 28) errors.push("contract current_pack.unit_count must be 28");
if (contract.current_pack?.next_pack_id !== "CP00-156") errors.push("contract current_pack.next_pack_id must be CP00-156");
if (contract.current_pack?.next_subphase_id !== "RP04.P00.M00.S01") {
  errors.push("contract current_pack.next_subphase_id must be RP04.P00.M00.S01");
}
if (contract.entry_readiness_pack?.contract_id !== AUDIT_COMPLIANCE_CP135_ENTRY_READINESS_CONTRACT.id) {
  errors.push("entry_readiness_pack.contract_id mismatch");
}
if (contract.entry_readiness_pack?.production_ready_flag !== "audit_compliance_entry_readiness_verified") {
  errors.push("entry_readiness_pack production flag mismatch");
}
if (contract.entry_readiness_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP135_PACK_BINDING.pack_id) {
  errors.push("entry_readiness_pack source pack mismatch");
}
if (contract.entry_readiness_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP135_PACK_BINDING.unit_count) {
  errors.push("entry_readiness_pack included_unit_count mismatch");
}

for (const field of [
  "event_id",
  "tenant_id",
  "sequence_number",
  "actor",
  "action",
  "object",
  "trace_id",
  "span_id",
  "request_id",
  "payload_digest",
  "evidence_refs",
  "previous_event_hash",
  "event_hash",
]) {
  requireArrayIncludes(contract.event_contract?.required_fields, field, "event_contract.required_fields");
}

for (const actorType of ["ai_agent", "hermes", "claude_code", "support_admin", "break_glass_admin"]) {
  requireArrayIncludes(contract.actor_types, actorType, "actor_types");
}

for (const objectType of ["Matter", "DocumentVersion", "AIJob", "AuditExport", "RetentionPolicy", "LegalHold"]) {
  requireArrayIncludes(contract.object_types, objectType, "object_types");
}

for (const action of [
  "document.download",
  "permission.change",
  "settlement.run",
  "ai.retrieve",
  "admin.break_glass",
  "retention.purge.request",
  "legal_hold.release",
  "audit.chain.verify",
]) {
  requireArrayIncludes(contract.action_taxonomy, action, "action_taxonomy");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key"]) {
  requireArrayIncludes(contract.privacy_and_payload_policy?.forbidden_payload_values, forbidden, "forbidden_payload_values");
}

for (const gate of ["implemented", "tests", "permission_audit", "hermes_validation", "claude_cross_validation", "human_approval", "production_readiness"]) {
  requireArrayIncludes(contract.minimum_completion_gates, gate, "minimum_completion_gates");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP135_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP135_ENTRY_READINESS_CONTRACT",
  "createAuditComplianceCp135CoveredUnitIds",
  "createAuditComplianceCp135EntryReadinessCatalog",
  "createAuditComplianceCp135EntryReadiness",
  "createAuditComplianceCp135EntryReadinessManifest",
  "createAuditComplianceCp135HermesEvidencePacket",
  "createAuditComplianceCp135ClaudeReviewPacket",
  "createAuditComplianceCp135CloseoutHandoff",
  "runAuditComplianceCp135EntryReadinessCase",
  "validateAuditComplianceCp135Coverage",
]) {
  requireArrayIncludes(contract.entry_readiness_public_exports, exportName, "entry_readiness_public_exports");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key"]) {
  requireArrayIncludes(contract.entry_readiness_hidden_source_fields, forbidden, "entry_readiness_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  renders_ui: false,
  executes_claude_review: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.entry_readiness_no_write_attestation?.[field] !== expected) {
    errors.push(`entry_readiness_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.service_interface_readiness_pack?.contract_id !== AUDIT_COMPLIANCE_CP136_SERVICE_INTERFACE_READINESS_CONTRACT.id) {
  errors.push("service_interface_readiness_pack.contract_id mismatch");
}
if (contract.service_interface_readiness_pack?.production_ready_flag !== "audit_compliance_service_interface_readiness_verified") {
  errors.push("service_interface_readiness_pack production flag mismatch");
}
if (contract.service_interface_readiness_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP136_PACK_BINDING.pack_id) {
  errors.push("service_interface_readiness_pack source pack mismatch");
}
if (contract.service_interface_readiness_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP136_PACK_BINDING.unit_count) {
  errors.push("service_interface_readiness_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP136_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP136_SERVICE_INTERFACE_READINESS_CONTRACT",
  "createAuditComplianceCp136CoveredUnitIds",
  "createAuditComplianceCp136ServiceInterfaceReadinessCatalog",
  "createAuditComplianceCp136ServiceInterfaceReadiness",
  "createAuditComplianceCp136ServiceInterfaceReadinessManifest",
  "createAuditComplianceCp136HermesEvidencePacket",
  "createAuditComplianceCp136ClaudeReviewPacket",
  "createAuditComplianceCp136CloseoutHandoff",
  "runAuditComplianceCp136ServiceInterfaceReadinessCase",
  "validateAuditComplianceCp136Coverage",
]) {
  requireArrayIncludes(contract.service_interface_readiness_public_exports, exportName, "service_interface_readiness_public_exports");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key", "lock_token_internal_value"]) {
  requireArrayIncludes(contract.service_interface_readiness_hidden_source_fields, forbidden, "service_interface_readiness_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  executes_claude_review: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.service_interface_readiness_no_write_attestation?.[field] !== expected) {
    errors.push(`service_interface_readiness_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.service_interface_workflow_evidence_pack?.contract_id !== AUDIT_COMPLIANCE_CP137_SERVICE_INTERFACE_WORKFLOW_EVIDENCE_CONTRACT.id) {
  errors.push("service_interface_workflow_evidence_pack.contract_id mismatch");
}
if (contract.service_interface_workflow_evidence_pack?.production_ready_flag !== "audit_compliance_service_interface_workflow_evidence_verified") {
  errors.push("service_interface_workflow_evidence_pack production flag mismatch");
}
if (contract.service_interface_workflow_evidence_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP137_PACK_BINDING.pack_id) {
  errors.push("service_interface_workflow_evidence_pack source pack mismatch");
}
if (contract.service_interface_workflow_evidence_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP137_PACK_BINDING.unit_count) {
  errors.push("service_interface_workflow_evidence_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP137_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP137_SERVICE_INTERFACE_WORKFLOW_EVIDENCE_CONTRACT",
  "createAuditComplianceCp137CoveredUnitIds",
  "createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCatalog",
  "createAuditComplianceCp137ServiceInterfaceWorkflowEvidence",
  "createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceManifest",
  "createAuditComplianceCp137HermesEvidencePacket",
  "createAuditComplianceCp137ClaudeReviewPacket",
  "createAuditComplianceCp137CloseoutHandoff",
  "runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase",
  "validateAuditComplianceCp137Coverage",
]) {
  requireArrayIncludes(contract.service_interface_workflow_evidence_public_exports, exportName, "service_interface_workflow_evidence_public_exports");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key", "golden_case_internal_payload", "hermes_receipt_internal_digest", "claude_prompt_internal_context"]) {
  requireArrayIncludes(contract.service_interface_workflow_evidence_hidden_source_fields, forbidden, "service_interface_workflow_evidence_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  executes_claude_review: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.service_interface_workflow_evidence_no_write_attestation?.[field] !== expected) {
    errors.push(`service_interface_workflow_evidence_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.claude_packet_sensitive_boundary_pack?.contract_id !== AUDIT_COMPLIANCE_CP138_CLAUDE_BOUNDARY_CONTRACT.id) {
  errors.push("claude_packet_sensitive_boundary_pack.contract_id mismatch");
}
if (contract.claude_packet_sensitive_boundary_pack?.production_ready_flag !== "audit_compliance_claude_packet_sensitive_boundary_verified") {
  errors.push("claude_packet_sensitive_boundary_pack production flag mismatch");
}
if (contract.claude_packet_sensitive_boundary_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP138_PACK_BINDING.pack_id) {
  errors.push("claude_packet_sensitive_boundary_pack source pack mismatch");
}
if (contract.claude_packet_sensitive_boundary_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP138_PACK_BINDING.unit_count) {
  errors.push("claude_packet_sensitive_boundary_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP138_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP138_CLAUDE_BOUNDARY_CONTRACT",
  "createAuditComplianceCp138CoveredUnitIds",
  "createAuditComplianceCp138ClaudeBoundaryCatalog",
  "createAuditComplianceCp138ClaudeBoundary",
  "createAuditComplianceCp138ClaudeBoundaryManifest",
  "createAuditComplianceCp138HermesEvidencePacket",
  "createAuditComplianceCp138ClaudeReviewPacket",
  "createAuditComplianceCp138CloseoutHandoff",
  "runAuditComplianceCp138ClaudeBoundaryCase",
  "validateAuditComplianceCp138Coverage",
]) {
  requireArrayIncludes(contract.claude_packet_sensitive_boundary_public_exports, exportName, "claude_packet_sensitive_boundary_public_exports");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key", "claude_prompt_internal_context", "cross_tenant_row_count", "unauthorized_object_name"]) {
  requireArrayIncludes(contract.claude_packet_sensitive_boundary_hidden_source_fields, forbidden, "claude_packet_sensitive_boundary_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.claude_packet_sensitive_boundary_no_write_attestation?.[field] !== expected) {
    errors.push(`claude_packet_sensitive_boundary_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.api_ui_reference_readiness_pack?.contract_id !== AUDIT_COMPLIANCE_CP139_API_UI_REFERENCE_READINESS_CONTRACT.id) {
  errors.push("api_ui_reference_readiness_pack.contract_id mismatch");
}
if (contract.api_ui_reference_readiness_pack?.production_ready_flag !== "audit_compliance_api_ui_reference_readiness_verified") {
  errors.push("api_ui_reference_readiness_pack production flag mismatch");
}
if (contract.api_ui_reference_readiness_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP139_PACK_BINDING.pack_id) {
  errors.push("api_ui_reference_readiness_pack source pack mismatch");
}
if (contract.api_ui_reference_readiness_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP139_PACK_BINDING.unit_count) {
  errors.push("api_ui_reference_readiness_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP139_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP139_API_UI_REFERENCE_READINESS_CONTRACT",
  "createAuditComplianceCp139CoveredUnitIds",
  "createAuditComplianceCp139ApiUiReferenceReadinessCatalog",
  "createAuditComplianceCp139ApiUiReferenceReadiness",
  "createAuditComplianceCp139ApiUiReferenceReadinessManifest",
  "createAuditComplianceCp139HermesEvidencePacket",
  "createAuditComplianceCp139ClaudeReviewPacket",
  "createAuditComplianceCp139CloseoutHandoff",
  "runAuditComplianceCp139ApiUiReferenceReadinessCase",
  "validateAuditComplianceCp139Coverage",
]) {
  requireArrayIncludes(contract.api_ui_reference_readiness_public_exports, exportName, "api_ui_reference_readiness_public_exports");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key", "api_request_internal_payload", "ui_state_internal_payload", "unauthorized_object_name"]) {
  requireArrayIncludes(contract.api_ui_reference_readiness_hidden_source_fields, forbidden, "api_ui_reference_readiness_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.api_ui_reference_readiness_no_write_attestation?.[field] !== expected) {
    errors.push(`api_ui_reference_readiness_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.ui_workflow_continuation_pack?.contract_id !== AUDIT_COMPLIANCE_CP140_UI_WORKFLOW_CONTINUATION_CONTRACT.id) {
  errors.push("ui_workflow_continuation_pack.contract_id mismatch");
}
if (contract.ui_workflow_continuation_pack?.production_ready_flag !== "audit_compliance_ui_workflow_continuation_verified") {
  errors.push("ui_workflow_continuation_pack production flag mismatch");
}
if (contract.ui_workflow_continuation_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP140_PACK_BINDING.pack_id) {
  errors.push("ui_workflow_continuation_pack source pack mismatch");
}
if (contract.ui_workflow_continuation_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP140_PACK_BINDING.unit_count) {
  errors.push("ui_workflow_continuation_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP140_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP140_UI_WORKFLOW_CONTINUATION_CONTRACT",
  "createAuditComplianceCp140CoveredUnitIds",
  "createAuditComplianceCp140UiWorkflowContinuationCatalog",
  "createAuditComplianceCp140UiWorkflowContinuation",
  "createAuditComplianceCp140UiWorkflowContinuationManifest",
  "createAuditComplianceCp140HermesEvidencePacket",
  "createAuditComplianceCp140ClaudeReviewPacket",
  "createAuditComplianceCp140CloseoutHandoff",
  "runAuditComplianceCp140UiWorkflowContinuationCase",
  "validateAuditComplianceCp140Coverage",
]) {
  requireArrayIncludes(contract.ui_workflow_continuation_public_exports, exportName, "ui_workflow_continuation_public_exports");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key", "ui_state_internal_payload", "ui_focus_internal_selector", "ui_screenshot_internal_path", "unauthorized_object_name"]) {
  requireArrayIncludes(contract.ui_workflow_continuation_hidden_source_fields, forbidden, "ui_workflow_continuation_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.ui_workflow_continuation_no_write_attestation?.[field] !== expected) {
    errors.push(`ui_workflow_continuation_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.ui_permission_fixture_binding_pack?.contract_id !== AUDIT_COMPLIANCE_CP141_UI_PERMISSION_FIXTURE_BINDING_CONTRACT.id) {
  errors.push("ui_permission_fixture_binding_pack.contract_id mismatch");
}
if (contract.ui_permission_fixture_binding_pack?.production_ready_flag !== "audit_compliance_ui_permission_fixture_binding_verified") {
  errors.push("ui_permission_fixture_binding_pack production flag mismatch");
}
if (contract.ui_permission_fixture_binding_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP141_PACK_BINDING.pack_id) {
  errors.push("ui_permission_fixture_binding_pack source pack mismatch");
}
if (contract.ui_permission_fixture_binding_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP141_PACK_BINDING.unit_count) {
  errors.push("ui_permission_fixture_binding_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP141_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP141_UI_PERMISSION_FIXTURE_BINDING_CONTRACT",
  "createAuditComplianceCp141CoveredUnitIds",
  "createAuditComplianceCp141UiPermissionFixtureBindingCatalog",
  "createAuditComplianceCp141UiPermissionFixtureBinding",
  "createAuditComplianceCp141UiPermissionFixtureBindingManifest",
  "createAuditComplianceCp141HermesEvidencePacket",
  "createAuditComplianceCp141ClaudeReviewPacket",
  "createAuditComplianceCp141CloseoutHandoff",
  "runAuditComplianceCp141UiPermissionFixtureBindingCase",
  "validateAuditComplianceCp141Coverage",
]) {
  requireArrayIncludes(contract.ui_permission_fixture_binding_public_exports, exportName, "ui_permission_fixture_binding_public_exports");
}

for (const forbidden of ["raw_document_body", "secret", "credential", "access_token", "private_key", "permission_badge_internal_rule", "denied_review_internal_reason", "ui_fixture_internal_body", "unauthorized_object_name"]) {
  requireArrayIncludes(contract.ui_permission_fixture_binding_hidden_source_fields, forbidden, "ui_permission_fixture_binding_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.ui_permission_fixture_binding_no_write_attestation?.[field] !== expected) {
    errors.push(`ui_permission_fixture_binding_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.ui_fixture_evidence_reference_pack?.contract_id !== AUDIT_COMPLIANCE_CP142_UI_FIXTURE_EVIDENCE_REFERENCE_CONTRACT.id) {
  errors.push("ui_fixture_evidence_reference_pack.contract_id mismatch");
}
if (contract.ui_fixture_evidence_reference_pack?.production_ready_flag !== "audit_compliance_ui_fixture_evidence_reference_verified") {
  errors.push("ui_fixture_evidence_reference_pack production flag mismatch");
}
if (contract.ui_fixture_evidence_reference_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP142_PACK_BINDING.pack_id) {
  errors.push("ui_fixture_evidence_reference_pack source pack mismatch");
}
if (contract.ui_fixture_evidence_reference_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP142_PACK_BINDING.unit_count) {
  errors.push("ui_fixture_evidence_reference_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP142_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP142_UI_FIXTURE_EVIDENCE_REFERENCE_CONTRACT",
  "createAuditComplianceCp142CoveredUnitIds",
  "createAuditComplianceCp142UiFixtureEvidenceReferenceCatalog",
  "createAuditComplianceCp142UiFixtureEvidenceReference",
  "createAuditComplianceCp142UiFixtureEvidenceReferenceManifest",
  "createAuditComplianceCp142HermesEvidencePacket",
  "createAuditComplianceCp142ClaudeReviewPacket",
  "createAuditComplianceCp142CloseoutHandoff",
  "runAuditComplianceCp142UiFixtureEvidenceReferenceCase",
  "validateAuditComplianceCp142Coverage",
]) {
  requireArrayIncludes(contract.ui_fixture_evidence_reference_public_exports, exportName, "ui_fixture_evidence_reference_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "fixture_manifest_internal_body",
  "golden_case_internal_payload",
  "replay_command_internal_args",
  "ai_retrieval_internal_prompt",
  "analytics_internal_query",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.ui_fixture_evidence_reference_hidden_source_fields, forbidden, "ui_fixture_evidence_reference_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_golden_case_payload: false,
  executes_replay_command: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.ui_fixture_evidence_reference_no_write_attestation?.[field] !== expected) {
    errors.push(`ui_fixture_evidence_reference_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.fixture_terminal_boundary_pack?.contract_id !== AUDIT_COMPLIANCE_CP143_FIXTURE_TERMINAL_BOUNDARY_CONTRACT.id) {
  errors.push("fixture_terminal_boundary_pack.contract_id mismatch");
}
if (contract.fixture_terminal_boundary_pack?.production_ready_flag !== "audit_compliance_fixture_terminal_boundary_verified") {
  errors.push("fixture_terminal_boundary_pack production flag mismatch");
}
if (contract.fixture_terminal_boundary_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP143_PACK_BINDING.pack_id) {
  errors.push("fixture_terminal_boundary_pack source pack mismatch");
}
if (contract.fixture_terminal_boundary_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP143_PACK_BINDING.unit_count) {
  errors.push("fixture_terminal_boundary_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP143_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP143_FIXTURE_TERMINAL_BOUNDARY_CONTRACT",
  "createAuditComplianceCp143CoveredUnitIds",
  "createAuditComplianceCp143FixtureTerminalBoundaryCatalog",
  "createAuditComplianceCp143FixtureTerminalBoundary",
  "createAuditComplianceCp143FixtureTerminalBoundaryManifest",
  "createAuditComplianceCp143HermesEvidencePacket",
  "createAuditComplianceCp143ClaudeReviewPacket",
  "createAuditComplianceCp143CloseoutHandoff",
  "runAuditComplianceCp143FixtureTerminalBoundaryCase",
  "validateAuditComplianceCp143Coverage",
]) {
  requireArrayIncludes(contract.fixture_terminal_boundary_public_exports, exportName, "fixture_terminal_boundary_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "fixture_manifest_internal_body",
  "golden_case_internal_payload",
  "failure_case_internal_payload",
  "replay_command_internal_args",
  "stable_id_internal_seed",
  "base_tenant_fixture_internal_payload",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.fixture_terminal_boundary_hidden_source_fields, forbidden, "fixture_terminal_boundary_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_golden_case_payload: false,
  materializes_failure_case_payload: false,
  executes_replay_command: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  persists_stable_id: false,
  emits_real_receipt: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.fixture_terminal_boundary_no_write_attestation?.[field] !== expected) {
    errors.push(`fixture_terminal_boundary_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.fixture_permission_matrix_reference_pack?.contract_id !== AUDIT_COMPLIANCE_CP144_FIXTURE_PERMISSION_MATRIX_REFERENCE_CONTRACT.id) {
  errors.push("fixture_permission_matrix_reference_pack.contract_id mismatch");
}
if (contract.fixture_permission_matrix_reference_pack?.production_ready_flag !== "audit_compliance_fixture_permission_matrix_reference_verified") {
  errors.push("fixture_permission_matrix_reference_pack production flag mismatch");
}
if (contract.fixture_permission_matrix_reference_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP144_PACK_BINDING.pack_id) {
  errors.push("fixture_permission_matrix_reference_pack source pack mismatch");
}
if (contract.fixture_permission_matrix_reference_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP144_PACK_BINDING.unit_count) {
  errors.push("fixture_permission_matrix_reference_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP144_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP144_FIXTURE_PERMISSION_MATRIX_REFERENCE_CONTRACT",
  "createAuditComplianceCp144CoveredUnitIds",
  "createAuditComplianceCp144FixturePermissionMatrixReferenceCatalog",
  "createAuditComplianceCp144FixturePermissionMatrixReference",
  "createAuditComplianceCp144FixturePermissionMatrixReferenceManifest",
  "createAuditComplianceCp144HermesEvidencePacket",
  "createAuditComplianceCp144ClaudeReviewPacket",
  "createAuditComplianceCp144CloseoutHandoff",
  "runAuditComplianceCp144FixturePermissionMatrixReferenceCase",
  "validateAuditComplianceCp144Coverage",
]) {
  requireArrayIncludes(contract.fixture_permission_matrix_reference_public_exports, exportName, "fixture_permission_matrix_reference_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "fixture_manifest_internal_body",
  "golden_case_internal_payload",
  "failure_case_internal_payload",
  "replay_command_internal_args",
  "stable_id_internal_seed",
  "permission_matrix_internal_rule",
  "export_download_internal_policy",
  "share_decision_internal_policy",
  "ai_retrieval_internal_policy",
  "legal_hold_internal_state",
  "ethical_wall_internal_rule",
  "object_acl_internal_grant",
  "review_route_internal_reason",
  "approval_route_internal_reason",
  "security_trimming_internal_query",
  "audit_event_internal_payload",
  "permission_fixture_internal_payload",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.fixture_permission_matrix_reference_hidden_source_fields, forbidden, "fixture_permission_matrix_reference_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_golden_case_payload: false,
  materializes_failure_case_payload: false,
  executes_replay_command: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  persists_stable_id: false,
  emits_real_receipt: false,
  evaluates_permission_matrix: false,
  evaluates_view_decision: false,
  evaluates_search_decision: false,
  evaluates_mutation_decision: false,
  evaluates_export_download_decision: false,
  evaluates_share_decision: false,
  evaluates_ai_retrieval_decision: false,
  applies_legal_hold: false,
  applies_ethical_wall: false,
  reads_object_acl: false,
  routes_review_required: false,
  routes_approval_required: false,
  proves_security_trimming: false,
  emits_audit_event_expectation: false,
  writes_permission_fixture: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.fixture_permission_matrix_reference_no_write_attestation?.[field] !== expected) {
    errors.push(`fixture_permission_matrix_reference_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.permission_matrix_workflow_boundary_pack?.contract_id !== AUDIT_COMPLIANCE_CP145_PERMISSION_MATRIX_WORKFLOW_BOUNDARY_CONTRACT.id) {
  errors.push("permission_matrix_workflow_boundary_pack.contract_id mismatch");
}
if (contract.permission_matrix_workflow_boundary_pack?.production_ready_flag !== "audit_compliance_permission_matrix_workflow_boundary_verified") {
  errors.push("permission_matrix_workflow_boundary_pack production flag mismatch");
}
if (contract.permission_matrix_workflow_boundary_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP145_PACK_BINDING.pack_id) {
  errors.push("permission_matrix_workflow_boundary_pack source pack mismatch");
}
if (contract.permission_matrix_workflow_boundary_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP145_PACK_BINDING.unit_count) {
  errors.push("permission_matrix_workflow_boundary_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP145_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP145_PERMISSION_MATRIX_WORKFLOW_BOUNDARY_CONTRACT",
  "createAuditComplianceCp145CoveredUnitIds",
  "createAuditComplianceCp145PermissionMatrixWorkflowBoundaryCatalog",
  "createAuditComplianceCp145PermissionMatrixWorkflowBoundary",
  "createAuditComplianceCp145PermissionMatrixWorkflowBoundaryManifest",
  "createAuditComplianceCp145HermesEvidencePacket",
  "createAuditComplianceCp145ClaudeReviewPacket",
  "createAuditComplianceCp145CloseoutHandoff",
  "runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase",
  "validateAuditComplianceCp145Coverage",
]) {
  requireArrayIncludes(contract.permission_matrix_workflow_boundary_public_exports, exportName, "permission_matrix_workflow_boundary_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "permission_matrix_internal_rule",
  "export_download_internal_policy",
  "share_decision_internal_policy",
  "ai_retrieval_internal_policy",
  "legal_hold_internal_state",
  "ethical_wall_internal_rule",
  "object_acl_internal_grant",
  "review_route_internal_reason",
  "approval_route_internal_reason",
  "security_trimming_internal_query",
  "audit_event_internal_payload",
  "permission_fixture_internal_payload",
  "allowed_test_internal_fixture",
  "denied_test_internal_fixture",
  "cross_tenant_test_internal_fixture",
  "leak_prevention_test_internal_fixture",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.permission_matrix_workflow_boundary_hidden_source_fields, forbidden, "permission_matrix_workflow_boundary_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  evaluates_permission_matrix: false,
  evaluates_view_decision: false,
  evaluates_search_decision: false,
  evaluates_mutation_decision: false,
  evaluates_export_download_decision: false,
  evaluates_share_decision: false,
  evaluates_ai_retrieval_decision: false,
  applies_legal_hold: false,
  applies_ethical_wall: false,
  reads_object_acl: false,
  routes_review_required: false,
  routes_approval_required: false,
  proves_security_trimming: false,
  emits_audit_event_expectation: false,
  writes_permission_fixture: false,
  executes_allowed_test: false,
  executes_denied_test: false,
  executes_cross_tenant_test: false,
  executes_leak_prevention_test: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.permission_matrix_workflow_boundary_no_write_attestation?.[field] !== expected) {
    errors.push(`permission_matrix_workflow_boundary_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.permission_matrix_security_fixture_boundary_pack?.contract_id !== AUDIT_COMPLIANCE_CP146_PERMISSION_MATRIX_SECURITY_FIXTURE_BOUNDARY_CONTRACT.id) {
  errors.push("permission_matrix_security_fixture_boundary_pack.contract_id mismatch");
}
if (contract.permission_matrix_security_fixture_boundary_pack?.production_ready_flag !== "audit_compliance_permission_matrix_security_fixture_boundary_verified") {
  errors.push("permission_matrix_security_fixture_boundary_pack production flag mismatch");
}
if (contract.permission_matrix_security_fixture_boundary_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP146_PACK_BINDING.pack_id) {
  errors.push("permission_matrix_security_fixture_boundary_pack source pack mismatch");
}
if (contract.permission_matrix_security_fixture_boundary_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP146_PACK_BINDING.unit_count) {
  errors.push("permission_matrix_security_fixture_boundary_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP146_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP146_PERMISSION_MATRIX_SECURITY_FIXTURE_BOUNDARY_CONTRACT",
  "createAuditComplianceCp146CoveredUnitIds",
  "createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCatalog",
  "createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundary",
  "createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryManifest",
  "createAuditComplianceCp146HermesEvidencePacket",
  "createAuditComplianceCp146ClaudeReviewPacket",
  "createAuditComplianceCp146CloseoutHandoff",
  "runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase",
  "validateAuditComplianceCp146Coverage",
]) {
  requireArrayIncludes(contract.permission_matrix_security_fixture_boundary_public_exports, exportName, "permission_matrix_security_fixture_boundary_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "permission_matrix_internal_rule",
  "view_decision_internal_predicate",
  "search_decision_internal_predicate",
  "security_trimming_internal_query",
  "audit_event_internal_payload",
  "permission_fixture_internal_payload",
  "allowed_test_internal_fixture",
  "denied_test_internal_fixture",
  "cross_tenant_test_internal_fixture",
  "leak_prevention_test_internal_fixture",
  "fixture_manifest_internal_body",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.permission_matrix_security_fixture_boundary_hidden_source_fields, forbidden, "permission_matrix_security_fixture_boundary_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  evaluates_permission_matrix: false,
  evaluates_view_decision: false,
  evaluates_search_decision: false,
  proves_security_trimming: false,
  emits_audit_event_expectation: false,
  writes_permission_fixture: false,
  executes_allowed_test: false,
  executes_denied_test: false,
  executes_cross_tenant_test: false,
  executes_leak_prevention_test: false,
  materializes_fixture_manifest: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.permission_matrix_security_fixture_boundary_no_write_attestation?.[field] !== expected) {
    errors.push(`permission_matrix_security_fixture_boundary_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.permission_matrix_failure_taxonomy_reference_pack?.contract_id !== AUDIT_COMPLIANCE_CP147_PERMISSION_MATRIX_FAILURE_TAXONOMY_REFERENCE_CONTRACT.id) {
  errors.push("permission_matrix_failure_taxonomy_reference_pack.contract_id mismatch");
}
if (contract.permission_matrix_failure_taxonomy_reference_pack?.production_ready_flag !== "audit_compliance_permission_matrix_failure_taxonomy_reference_verified") {
  errors.push("permission_matrix_failure_taxonomy_reference_pack production flag mismatch");
}
if (contract.permission_matrix_failure_taxonomy_reference_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP147_PACK_BINDING.pack_id) {
  errors.push("permission_matrix_failure_taxonomy_reference_pack source pack mismatch");
}
if (contract.permission_matrix_failure_taxonomy_reference_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP147_PACK_BINDING.unit_count) {
  errors.push("permission_matrix_failure_taxonomy_reference_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP147_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP147_PERMISSION_MATRIX_FAILURE_TAXONOMY_REFERENCE_CONTRACT",
  "createAuditComplianceCp147CoveredUnitIds",
  "createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCatalog",
  "createAuditComplianceCp147PermissionMatrixFailureTaxonomyReference",
  "createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceManifest",
  "createAuditComplianceCp147HermesEvidencePacket",
  "createAuditComplianceCp147ClaudeReviewPacket",
  "createAuditComplianceCp147CloseoutHandoff",
  "runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase",
  "validateAuditComplianceCp147Coverage",
]) {
  requireArrayIncludes(contract.permission_matrix_failure_taxonomy_reference_public_exports, exportName, "permission_matrix_failure_taxonomy_reference_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "permission_matrix_internal_rule",
  "mutation_decision_internal_predicate",
  "export_download_internal_policy",
  "share_decision_internal_policy",
  "ai_retrieval_internal_policy",
  "legal_hold_internal_state",
  "ethical_wall_internal_rule",
  "object_acl_internal_grant",
  "review_route_internal_reason",
  "approval_route_internal_reason",
  "security_trimming_internal_query",
  "audit_event_internal_payload",
  "permission_fixture_internal_payload",
  "failure_taxonomy_internal_rule",
  "failure_fixture_internal_payload",
  "rollback_internal_state",
  "compensation_internal_plan",
  "blocked_claim_internal_receipt",
  "retry_exhaustion_internal_counter",
  "failure_recovery_internal_policy",
  "audit_failure_hint_internal_payload",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.permission_matrix_failure_taxonomy_reference_hidden_source_fields, forbidden, "permission_matrix_failure_taxonomy_reference_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_golden_case_payload: false,
  materializes_failure_case_payload: false,
  executes_replay_command: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  persists_stable_id: false,
  emits_real_receipt: false,
  evaluates_permission_matrix: false,
  evaluates_view_decision: false,
  evaluates_search_decision: false,
  evaluates_mutation_decision: false,
  evaluates_export_download_decision: false,
  evaluates_share_decision: false,
  evaluates_ai_retrieval_decision: false,
  applies_legal_hold: false,
  applies_ethical_wall: false,
  reads_object_acl: false,
  routes_review_required: false,
  routes_approval_required: false,
  proves_security_trimming: false,
  emits_audit_event_expectation: false,
  writes_permission_fixture: false,
  executes_allowed_test: false,
  executes_denied_test: false,
  executes_cross_tenant_test: false,
  executes_leak_prevention_test: false,
  evaluates_failure_taxonomy: false,
  executes_failure_recovery: false,
  throws_failure: false,
  executes_retry_exhaustion: false,
  executes_rollback_expectation: false,
  executes_compensation: false,
  emits_blocked_claim_receipt: false,
  writes_failure_fixture: false,
  executes_failure_unit_test: false,
  executes_failure_integration_smoke: false,
  emits_audit_failure_hint: false,
  emits_hermes_failure_evidence: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.permission_matrix_failure_taxonomy_reference_no_write_attestation?.[field] !== expected) {
    errors.push(`permission_matrix_failure_taxonomy_reference_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.failure_boundary_sensitive_pack?.contract_id !== AUDIT_COMPLIANCE_CP148_FAILURE_BOUNDARY_SENSITIVE_CONTRACT.id) {
  errors.push("failure_boundary_sensitive_pack.contract_id mismatch");
}
if (contract.failure_boundary_sensitive_pack?.production_ready_flag !== "audit_compliance_failure_boundary_sensitive_verified") {
  errors.push("failure_boundary_sensitive_pack production flag mismatch");
}
if (contract.failure_boundary_sensitive_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP148_PACK_BINDING.pack_id) {
  errors.push("failure_boundary_sensitive_pack source pack mismatch");
}
if (contract.failure_boundary_sensitive_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP148_PACK_BINDING.unit_count) {
  errors.push("failure_boundary_sensitive_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP148_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP148_FAILURE_BOUNDARY_SENSITIVE_CONTRACT",
  "createAuditComplianceCp148CoveredUnitIds",
  "createAuditComplianceCp148FailureBoundarySensitiveCatalog",
  "createAuditComplianceCp148FailureBoundarySensitive",
  "createAuditComplianceCp148FailureBoundarySensitiveManifest",
  "createAuditComplianceCp148HermesEvidencePacket",
  "createAuditComplianceCp148ClaudeReviewPacket",
  "createAuditComplianceCp148CloseoutHandoff",
  "runAuditComplianceCp148FailureBoundarySensitiveCase",
  "validateAuditComplianceCp148Coverage",
]) {
  requireArrayIncludes(contract.failure_boundary_sensitive_public_exports, exportName, "failure_boundary_sensitive_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "failure_taxonomy_internal_rule",
  "missing_context_internal_payload",
  "failure_fixture_internal_payload",
  "blocked_claim_internal_receipt",
  "audit_failure_hint_internal_payload",
  "hermes_failure_internal_digest",
  "claude_edge_case_internal_prompt",
  "human_escalation_internal_reason",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.failure_boundary_sensitive_hidden_source_fields, forbidden, "failure_boundary_sensitive_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_failure_case_payload: false,
  evaluates_failure_taxonomy: false,
  executes_failure_recovery: false,
  throws_failure: false,
  executes_retry_exhaustion: false,
  executes_rollback_expectation: false,
  executes_compensation: false,
  emits_blocked_claim_receipt: false,
  writes_failure_fixture: false,
  executes_failure_unit_test: false,
  executes_failure_integration_smoke: false,
  emits_audit_failure_hint: false,
  emits_hermes_failure_evidence: false,
  materializes_claude_edge_case_prompt: false,
  records_human_escalation_note: false,
  executes_human_escalation: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.failure_boundary_sensitive_no_write_attestation?.[field] !== expected) {
    errors.push(`failure_boundary_sensitive_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.failure_workflow_continuation_pack?.contract_id !== AUDIT_COMPLIANCE_CP149_FAILURE_WORKFLOW_CONTINUATION_CONTRACT.id) {
  errors.push("failure_workflow_continuation_pack.contract_id mismatch");
}
if (contract.failure_workflow_continuation_pack?.production_ready_flag !== "audit_compliance_failure_workflow_continuation_verified") {
  errors.push("failure_workflow_continuation_pack production flag mismatch");
}
if (contract.failure_workflow_continuation_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP149_PACK_BINDING.pack_id) {
  errors.push("failure_workflow_continuation_pack source pack mismatch");
}
if (contract.failure_workflow_continuation_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP149_PACK_BINDING.unit_count) {
  errors.push("failure_workflow_continuation_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP149_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP149_FAILURE_WORKFLOW_CONTINUATION_CONTRACT",
  "createAuditComplianceCp149CoveredUnitIds",
  "createAuditComplianceCp149FailureWorkflowContinuationCatalog",
  "createAuditComplianceCp149FailureWorkflowContinuation",
  "createAuditComplianceCp149FailureWorkflowContinuationManifest",
  "createAuditComplianceCp149HermesEvidencePacket",
  "createAuditComplianceCp149ClaudeReviewPacket",
  "createAuditComplianceCp149CloseoutHandoff",
  "runAuditComplianceCp149FailureWorkflowContinuationCase",
  "validateAuditComplianceCp149Coverage",
]) {
  requireArrayIncludes(contract.failure_workflow_continuation_public_exports, exportName, "failure_workflow_continuation_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "permission_binding_internal_rule",
  "failure_taxonomy_internal_rule",
  "missing_context_internal_payload",
  "failure_fixture_internal_payload",
  "lock_conflict_internal_token",
  "blocked_claim_internal_receipt",
  "audit_failure_hint_internal_payload",
  "hermes_failure_internal_digest",
  "claude_edge_case_internal_prompt",
  "human_escalation_internal_reason",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.failure_workflow_continuation_hidden_source_fields, forbidden, "failure_workflow_continuation_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_failure_case_payload: false,
  evaluates_failure_taxonomy: false,
  evaluates_permission_audit_binding: false,
  executes_failure_recovery: false,
  throws_failure: false,
  executes_retry_exhaustion: false,
  executes_rollback_expectation: false,
  executes_compensation: false,
  emits_blocked_claim_receipt: false,
  writes_failure_fixture: false,
  executes_failure_unit_test: false,
  executes_failure_integration_smoke: false,
  emits_audit_failure_hint: false,
  emits_hermes_failure_evidence: false,
  materializes_claude_edge_case_prompt: false,
  records_human_escalation_note: false,
  executes_human_escalation: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.failure_workflow_continuation_no_write_attestation?.[field] !== expected) {
    errors.push(`failure_workflow_continuation_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.failure_fixture_sensitive_boundary_pack?.contract_id !== AUDIT_COMPLIANCE_CP150_FAILURE_FIXTURE_SENSITIVE_BOUNDARY_CONTRACT.id) {
  errors.push("failure_fixture_sensitive_boundary_pack.contract_id mismatch");
}
if (contract.failure_fixture_sensitive_boundary_pack?.production_ready_flag !== "audit_compliance_failure_fixture_sensitive_boundary_verified") {
  errors.push("failure_fixture_sensitive_boundary_pack production flag mismatch");
}
if (contract.failure_fixture_sensitive_boundary_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP150_PACK_BINDING.pack_id) {
  errors.push("failure_fixture_sensitive_boundary_pack source pack mismatch");
}
if (contract.failure_fixture_sensitive_boundary_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP150_PACK_BINDING.unit_count) {
  errors.push("failure_fixture_sensitive_boundary_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP150_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP150_FAILURE_FIXTURE_SENSITIVE_BOUNDARY_CONTRACT",
  "createAuditComplianceCp150CoveredUnitIds",
  "createAuditComplianceCp150FailureFixtureSensitiveBoundaryCatalog",
  "createAuditComplianceCp150FailureFixtureSensitiveBoundary",
  "createAuditComplianceCp150FailureFixtureSensitiveBoundaryManifest",
  "createAuditComplianceCp150HermesEvidencePacket",
  "createAuditComplianceCp150ClaudeReviewPacket",
  "createAuditComplianceCp150CloseoutHandoff",
  "runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase",
  "validateAuditComplianceCp150Coverage",
]) {
  requireArrayIncludes(contract.failure_fixture_sensitive_boundary_public_exports, exportName, "failure_fixture_sensitive_boundary_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "permission_binding_internal_rule",
  "failure_taxonomy_internal_rule",
  "missing_context_internal_payload",
  "synthetic_fixture_internal_payload",
  "fixture_manifest_internal_body",
  "failure_fixture_internal_payload",
  "audit_failure_hint_internal_payload",
  "hermes_failure_internal_digest",
  "claude_edge_case_internal_prompt",
  "human_escalation_internal_reason",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.failure_fixture_sensitive_boundary_hidden_source_fields, forbidden, "failure_fixture_sensitive_boundary_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_failure_case_payload: false,
  evaluates_failure_taxonomy: false,
  evaluates_permission_audit_binding: false,
  executes_failure_recovery: false,
  throws_failure: false,
  executes_retry_exhaustion: false,
  executes_rollback_expectation: false,
  executes_compensation: false,
  emits_blocked_claim_receipt: false,
  writes_failure_fixture: false,
  executes_failure_unit_test: false,
  executes_failure_integration_smoke: false,
  emits_audit_failure_hint: false,
  emits_hermes_failure_evidence: false,
  materializes_claude_edge_case_prompt: false,
  records_human_escalation_note: false,
  executes_human_escalation: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.failure_fixture_sensitive_boundary_no_write_attestation?.[field] !== expected) {
    errors.push(`failure_fixture_sensitive_boundary_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.failure_evidence_continuation_pack?.contract_id !== AUDIT_COMPLIANCE_CP151_FAILURE_EVIDENCE_CONTINUATION_CONTRACT.id) {
  errors.push("failure_evidence_continuation_pack.contract_id mismatch");
}
if (contract.failure_evidence_continuation_pack?.production_ready_flag !== "audit_compliance_failure_evidence_continuation_verified") {
  errors.push("failure_evidence_continuation_pack production flag mismatch");
}
if (contract.failure_evidence_continuation_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP151_PACK_BINDING.pack_id) {
  errors.push("failure_evidence_continuation_pack source pack mismatch");
}
if (contract.failure_evidence_continuation_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP151_PACK_BINDING.unit_count) {
  errors.push("failure_evidence_continuation_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP151_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP151_FAILURE_EVIDENCE_CONTINUATION_CONTRACT",
  "createAuditComplianceCp151CoveredUnitIds",
  "createAuditComplianceCp151FailureEvidenceContinuationCatalog",
  "createAuditComplianceCp151FailureEvidenceContinuation",
  "createAuditComplianceCp151FailureEvidenceContinuationManifest",
  "createAuditComplianceCp151HermesEvidencePacket",
  "createAuditComplianceCp151ClaudeReviewPacket",
  "createAuditComplianceCp151CloseoutHandoff",
  "runAuditComplianceCp151FailureEvidenceContinuationCase",
  "validateAuditComplianceCp151Coverage",
]) {
  requireArrayIncludes(contract.failure_evidence_continuation_public_exports, exportName, "failure_evidence_continuation_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "failure_taxonomy_internal_rule",
  "missing_context_internal_payload",
  "synthetic_fixture_internal_payload",
  "blocked_claim_internal_receipt",
  "hermes_failure_internal_digest",
  "hermes_command_internal_matrix",
  "command_result_internal_payload",
  "changed_file_internal_diff",
  "permission_summary_internal_payload",
  "audit_summary_internal_payload",
  "claude_dependency_internal_marker",
  "human_approval_internal_marker",
  "evidence_template_internal_body",
  "regression_receipt_internal_payload",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.failure_evidence_continuation_hidden_source_fields, forbidden, "failure_evidence_continuation_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  executes_hermes_command: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_failure_case_payload: false,
  materializes_evidence_template: false,
  materializes_claude_edge_case_prompt: false,
  records_human_escalation_note: false,
  records_human_approval_marker: false,
  evaluates_failure_taxonomy: false,
  evaluates_permission_audit_binding: false,
  executes_failure_recovery: false,
  throws_failure: false,
  executes_retry_exhaustion: false,
  executes_rollback_expectation: false,
  executes_compensation: false,
  emits_blocked_claim_receipt: false,
  emits_audit_failure_hint: false,
  emits_hermes_failure_evidence: false,
  emits_command_result_receipt: false,
  emits_changed_file_receipt: false,
  emits_fixture_summary_receipt: false,
  emits_permission_summary_receipt: false,
  emits_audit_summary_receipt: false,
  emits_no_real_data_receipt: false,
  writes_failure_fixture: false,
  executes_failure_unit_test: false,
  executes_failure_integration_smoke: false,
  executes_regression_receipt: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.failure_evidence_continuation_no_write_attestation?.[field] !== expected) {
    errors.push(`failure_evidence_continuation_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.evidence_workflow_fixture_pack?.contract_id !== AUDIT_COMPLIANCE_CP152_EVIDENCE_WORKFLOW_FIXTURE_CONTRACT.id) {
  errors.push("evidence_workflow_fixture_pack.contract_id mismatch");
}
if (contract.evidence_workflow_fixture_pack?.production_ready_flag !== "audit_compliance_evidence_workflow_fixture_verified") {
  errors.push("evidence_workflow_fixture_pack production flag mismatch");
}
if (contract.evidence_workflow_fixture_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP152_PACK_BINDING.pack_id) {
  errors.push("evidence_workflow_fixture_pack source pack mismatch");
}
if (contract.evidence_workflow_fixture_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP152_PACK_BINDING.unit_count) {
  errors.push("evidence_workflow_fixture_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP152_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP152_EVIDENCE_WORKFLOW_FIXTURE_CONTRACT",
  "createAuditComplianceCp152CoveredUnitIds",
  "createAuditComplianceCp152EvidenceWorkflowFixtureCatalog",
  "createAuditComplianceCp152EvidenceWorkflowFixture",
  "createAuditComplianceCp152EvidenceWorkflowFixtureManifest",
  "createAuditComplianceCp152HermesEvidencePacket",
  "createAuditComplianceCp152ClaudeReviewPacket",
  "createAuditComplianceCp152CloseoutHandoff",
  "runAuditComplianceCp152EvidenceWorkflowFixtureCase",
  "validateAuditComplianceCp152Coverage",
]) {
  requireArrayIncludes(contract.evidence_workflow_fixture_public_exports, exportName, "evidence_workflow_fixture_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "synthetic_fixture_internal_payload",
  "fixture_manifest_internal_body",
  "hermes_command_internal_matrix",
  "command_result_internal_payload",
  "changed_file_internal_diff",
  "fixture_summary_internal_payload",
  "permission_summary_internal_payload",
  "audit_summary_internal_payload",
  "claude_dependency_internal_marker",
  "human_approval_internal_marker",
  "evidence_template_internal_body",
  "regression_receipt_internal_payload",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.evidence_workflow_fixture_hidden_source_fields, forbidden, "evidence_workflow_fixture_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  executes_hermes_command: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_evidence_template: false,
  records_human_approval_marker: false,
  evaluates_permission_audit_binding: false,
  emits_command_result_receipt: false,
  emits_changed_file_receipt: false,
  emits_fixture_summary_receipt: false,
  emits_permission_summary_receipt: false,
  emits_audit_summary_receipt: false,
  emits_no_real_data_receipt: false,
  writes_failure_fixture: false,
  executes_regression_receipt: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.evidence_workflow_fixture_no_write_attestation?.[field] !== expected) {
    errors.push(`evidence_workflow_fixture_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.review_closeout_continuation_pack?.contract_id !== AUDIT_COMPLIANCE_CP153_REVIEW_CLOSEOUT_CONTINUATION_CONTRACT.id) {
  errors.push("review_closeout_continuation_pack.contract_id mismatch");
}
if (contract.review_closeout_continuation_pack?.production_ready_flag !== "audit_compliance_review_closeout_continuation_verified") {
  errors.push("review_closeout_continuation_pack production flag mismatch");
}
if (contract.review_closeout_continuation_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP153_PACK_BINDING.pack_id) {
  errors.push("review_closeout_continuation_pack source pack mismatch");
}
if (contract.review_closeout_continuation_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP153_PACK_BINDING.unit_count) {
  errors.push("review_closeout_continuation_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP153_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP153_REVIEW_CLOSEOUT_CONTINUATION_CONTRACT",
  "createAuditComplianceCp153CoveredUnitIds",
  "createAuditComplianceCp153ReviewCloseoutContinuationCatalog",
  "createAuditComplianceCp153ReviewCloseoutContinuation",
  "createAuditComplianceCp153ReviewCloseoutContinuationManifest",
  "createAuditComplianceCp153HermesEvidencePacket",
  "createAuditComplianceCp153ClaudeReviewPacket",
  "createAuditComplianceCp153CloseoutHandoff",
  "runAuditComplianceCp153ReviewCloseoutContinuationCase",
  "validateAuditComplianceCp153Coverage",
]) {
  requireArrayIncludes(contract.review_closeout_continuation_public_exports, exportName, "review_closeout_continuation_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "synthetic_fixture_internal_payload",
  "fixture_manifest_internal_body",
  "hermes_command_internal_matrix",
  "command_result_internal_payload",
  "changed_file_internal_diff",
  "permission_summary_internal_payload",
  "audit_summary_internal_payload",
  "review_question_internal_prompt",
  "permission_bypass_internal_probe",
  "audit_completeness_internal_probe",
  "ui_leak_internal_selector",
  "finding_routing_internal_map",
  "closeout_verdict_internal_note",
  "command_rerun_internal_result",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.review_closeout_continuation_hidden_source_fields, forbidden, "review_closeout_continuation_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_architecture_review: false,
  executes_security_review: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  records_human_approval_marker: false,
  writes_hermes_runtime: false,
  executes_hermes_command: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_evidence_template: false,
  materializes_review_packet: false,
  materializes_closeout_verdict: false,
  evaluates_permission_bypass: false,
  evaluates_audit_completeness: false,
  emits_command_result_receipt: false,
  emits_changed_file_receipt: false,
  emits_fixture_summary_receipt: false,
  emits_permission_summary_receipt: false,
  emits_audit_summary_receipt: false,
  emits_no_real_data_receipt: false,
  emits_hermes_evidence: false,
  executes_regression_receipt: false,
  exposes_ui_leak: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.review_closeout_continuation_no_write_attestation?.[field] !== expected) {
    errors.push(`review_closeout_continuation_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.review_sensitive_boundary_pack?.contract_id !== AUDIT_COMPLIANCE_CP154_REVIEW_SENSITIVE_BOUNDARY_CONTRACT.id) {
  errors.push("review_sensitive_boundary_pack.contract_id mismatch");
}
if (contract.review_sensitive_boundary_pack?.production_ready_flag !== "audit_compliance_review_sensitive_boundary_verified") {
  errors.push("review_sensitive_boundary_pack production flag mismatch");
}
if (contract.review_sensitive_boundary_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP154_PACK_BINDING.pack_id) {
  errors.push("review_sensitive_boundary_pack source pack mismatch");
}
if (contract.review_sensitive_boundary_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP154_PACK_BINDING.unit_count) {
  errors.push("review_sensitive_boundary_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP154_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP154_REVIEW_SENSITIVE_BOUNDARY_CONTRACT",
  "createAuditComplianceCp154CoveredUnitIds",
  "createAuditComplianceCp154ReviewSensitiveBoundaryCatalog",
  "createAuditComplianceCp154ReviewSensitiveBoundary",
  "createAuditComplianceCp154ReviewSensitiveBoundaryManifest",
  "createAuditComplianceCp154HermesEvidencePacket",
  "createAuditComplianceCp154ClaudeReviewPacket",
  "createAuditComplianceCp154CloseoutHandoff",
  "runAuditComplianceCp154ReviewSensitiveBoundaryCase",
  "validateAuditComplianceCp154Coverage",
]) {
  requireArrayIncludes(contract.review_sensitive_boundary_public_exports, exportName, "review_sensitive_boundary_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "review_question_internal_prompt",
  "permission_bypass_internal_probe",
  "audit_completeness_internal_probe",
  "missing_test_internal_gap",
  "ui_leak_internal_selector",
  "downstream_readiness_internal_signal",
  "risk_register_internal_entry",
  "severity_taxonomy_internal_rule",
  "go_no_go_internal_verdict",
  "finding_routing_internal_map",
  "human_approval_internal_summary",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.review_sensitive_boundary_hidden_source_fields, forbidden, "review_sensitive_boundary_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_architecture_review: false,
  executes_security_review: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  records_human_approval_marker: false,
  writes_hermes_runtime: false,
  executes_hermes_command: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_evidence_template: false,
  materializes_review_packet: false,
  materializes_closeout_verdict: false,
  evaluates_permission_bypass: false,
  evaluates_audit_completeness: false,
  evaluates_missing_test_gap: false,
  evaluates_ui_leak: false,
  evaluates_downstream_readiness: false,
  materializes_risk_register: false,
  materializes_severity_taxonomy: false,
  materializes_go_no_go_verdict: false,
  materializes_finding_routing_map: false,
  materializes_human_approval_summary: false,
  emits_command_result_receipt: false,
  emits_changed_file_receipt: false,
  emits_fixture_summary_receipt: false,
  emits_permission_summary_receipt: false,
  emits_audit_summary_receipt: false,
  emits_no_real_data_receipt: false,
  emits_hermes_evidence: false,
  executes_regression_receipt: false,
  exposes_ui_leak: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.review_sensitive_boundary_no_write_attestation?.[field] !== expected) {
    errors.push(`review_sensitive_boundary_no_write_attestation.${field} must be ${expected}`);
  }
}

if (contract.review_terminal_closeout_pack?.contract_id !== AUDIT_COMPLIANCE_CP155_REVIEW_TERMINAL_CLOSEOUT_CONTRACT.id) {
  errors.push("review_terminal_closeout_pack.contract_id mismatch");
}
if (contract.review_terminal_closeout_pack?.production_ready_flag !== "audit_compliance_review_terminal_closeout_verified") {
  errors.push("review_terminal_closeout_pack production flag mismatch");
}
if (contract.review_terminal_closeout_pack?.source_pack_id !== AUDIT_COMPLIANCE_CP155_PACK_BINDING.pack_id) {
  errors.push("review_terminal_closeout_pack source pack mismatch");
}
if (contract.review_terminal_closeout_pack?.included_unit_count !== AUDIT_COMPLIANCE_CP155_PACK_BINDING.unit_count) {
  errors.push("review_terminal_closeout_pack included_unit_count mismatch");
}

for (const exportName of [
  "AUDIT_COMPLIANCE_CP155_PACK_BINDING",
  "AUDIT_COMPLIANCE_CP155_REVIEW_TERMINAL_CLOSEOUT_CONTRACT",
  "createAuditComplianceCp155CoveredUnitIds",
  "createAuditComplianceCp155ReviewTerminalCloseoutCatalog",
  "createAuditComplianceCp155ReviewTerminalCloseout",
  "createAuditComplianceCp155ReviewTerminalCloseoutManifest",
  "createAuditComplianceCp155HermesEvidencePacket",
  "createAuditComplianceCp155ClaudeReviewPacket",
  "createAuditComplianceCp155CloseoutHandoff",
  "runAuditComplianceCp155ReviewTerminalCloseoutCase",
  "validateAuditComplianceCp155Coverage",
]) {
  requireArrayIncludes(contract.review_terminal_closeout_public_exports, exportName, "review_terminal_closeout_public_exports");
}

for (const forbidden of [
  "raw_document_body",
  "secret",
  "credential",
  "access_token",
  "private_key",
  "review_question_internal_prompt",
  "permission_bypass_internal_probe",
  "audit_completeness_internal_probe",
  "risk_register_internal_entry",
  "closeout_criteria_internal_note",
  "pass_closeout_internal_note",
  "pass_with_findings_internal_note",
  "block_closeout_internal_note",
  "next_rp_dependency_internal_map",
  "documentation_update_internal_body",
  "command_rerun_internal_result",
  "unauthorized_object_name",
]) {
  requireArrayIncludes(contract.review_terminal_closeout_hidden_source_fields, forbidden, "review_terminal_closeout_hidden_source_fields");
}

for (const [field, expected] of Object.entries({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_architecture_review: false,
  executes_security_review: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  records_human_approval_marker: false,
  writes_hermes_runtime: false,
  executes_hermes_command: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_evidence_template: false,
  materializes_review_packet: false,
  materializes_closeout_verdict: false,
  evaluates_permission_bypass: false,
  evaluates_audit_completeness: false,
  evaluates_missing_test_gap: false,
  evaluates_ui_leak: false,
  evaluates_downstream_readiness: false,
  materializes_risk_register: false,
  materializes_closeout_criteria: false,
  materializes_pass_closeout_note: false,
  materializes_pass_with_findings_closeout_note: false,
  materializes_block_closeout_note: false,
  materializes_next_rp_dependency: false,
  materializes_documentation_update: false,
  executes_command_rerun: false,
  emits_command_result_receipt: false,
  emits_changed_file_receipt: false,
  emits_fixture_summary_receipt: false,
  emits_permission_summary_receipt: false,
  emits_audit_summary_receipt: false,
  emits_no_real_data_receipt: false,
  emits_hermes_evidence: false,
  executes_regression_receipt: false,
  exposes_ui_leak: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
})) {
  if (contract.review_terminal_closeout_no_write_attestation?.[field] !== expected) {
    errors.push(`review_terminal_closeout_no_write_attestation.${field} must be ${expected}`);
  }
}

if (!cp135Plan) {
  errors.push("closeout pack plan or CP00-135 manifest snapshot must include CP00-135");
} else {
  const coverage = validateAuditComplianceCp135Coverage(cp135Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-135 coverage: ${error}`));
  if (cp135Plan.risk_class !== "C") errors.push("CP00-135 plan risk_class must be C");
  if (cp135Plan.unit_count !== 150) errors.push("CP00-135 plan unit_count must be 150");
}

if (!cp136Plan) {
  errors.push("closeout pack plan or CP00-136 manifest snapshot must include CP00-136");
} else {
  const coverage = validateAuditComplianceCp136Coverage(cp136Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-136 coverage: ${error}`));
  if (cp136Plan.risk_class !== "C") errors.push("CP00-136 plan risk_class must be C");
  if (cp136Plan.unit_count !== 150) errors.push("CP00-136 plan unit_count must be 150");
}

if (!cp137Plan) {
  errors.push("closeout pack plan or CP00-137 manifest snapshot must include CP00-137");
} else {
  const coverage = validateAuditComplianceCp137Coverage(cp137Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-137 coverage: ${error}`));
  if (cp137Plan.risk_class !== "B") errors.push("CP00-137 plan risk_class must be B");
  if (cp137Plan.unit_count !== 40) errors.push("CP00-137 plan unit_count must be 40");
}

if (!cp138Plan) {
  errors.push("closeout pack plan or CP00-138 manifest snapshot must include CP00-138");
} else {
  const coverage = validateAuditComplianceCp138Coverage(cp138Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-138 coverage: ${error}`));
  if (cp138Plan.risk_class !== "A") errors.push("CP00-138 plan risk_class must be A");
  if (cp138Plan.unit_count !== 10) errors.push("CP00-138 plan unit_count must be 10");
}

if (!cp139Plan) {
  errors.push("closeout pack plan or CP00-139 manifest snapshot must include CP00-139");
} else {
  const coverage = validateAuditComplianceCp139Coverage(cp139Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-139 coverage: ${error}`));
  if (cp139Plan.risk_class !== "C") errors.push("CP00-139 plan risk_class must be C");
  if (cp139Plan.unit_count !== 150) errors.push("CP00-139 plan unit_count must be 150");
}

if (!cp140Plan) {
  errors.push("closeout pack plan or CP00-140 manifest snapshot must include CP00-140");
} else {
  const coverage = validateAuditComplianceCp140Coverage(cp140Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-140 coverage: ${error}`));
  if (cp140Plan.risk_class !== "B") errors.push("CP00-140 plan risk_class must be B");
  if (cp140Plan.unit_count !== 40) errors.push("CP00-140 plan unit_count must be 40");
}

if (!cp141Plan) {
  errors.push("closeout pack plan or CP00-141 manifest snapshot must include CP00-141");
} else {
  const coverage = validateAuditComplianceCp141Coverage(cp141Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-141 coverage: ${error}`));
  if (cp141Plan.risk_class !== "B") errors.push("CP00-141 plan risk_class must be B");
  if (cp141Plan.unit_count !== 40) errors.push("CP00-141 plan unit_count must be 40");
}

if (!cp142Plan) {
  errors.push("closeout pack plan or CP00-142 manifest snapshot must include CP00-142");
} else {
  const coverage = validateAuditComplianceCp142Coverage(cp142Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-142 coverage: ${error}`));
  if (cp142Plan.risk_class !== "C") errors.push("CP00-142 plan risk_class must be C");
  if (cp142Plan.unit_count !== 150) errors.push("CP00-142 plan unit_count must be 150");
}

if (!cp143Plan) {
  errors.push("closeout pack plan or CP00-143 manifest snapshot must include CP00-143");
} else {
  const coverage = validateAuditComplianceCp143Coverage(cp143Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-143 coverage: ${error}`));
  if (cp143Plan.risk_class !== "A") errors.push("CP00-143 plan risk_class must be A");
  if (cp143Plan.unit_count !== 10) errors.push("CP00-143 plan unit_count must be 10");
}

if (!cp144Plan) {
  errors.push("closeout pack plan or CP00-144 manifest snapshot must include CP00-144");
} else {
  const coverage = validateAuditComplianceCp144Coverage(cp144Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-144 coverage: ${error}`));
  if (cp144Plan.risk_class !== "C") errors.push("CP00-144 plan risk_class must be C");
  if (cp144Plan.unit_count !== 150) errors.push("CP00-144 plan unit_count must be 150");
}

if (!cp145Plan) {
  errors.push("closeout pack plan or CP00-145 manifest snapshot must include CP00-145");
} else {
  const coverage = validateAuditComplianceCp145Coverage(cp145Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-145 coverage: ${error}`));
  if (cp145Plan.risk_class !== "B") errors.push("CP00-145 plan risk_class must be B");
  if (cp145Plan.unit_count !== 40) errors.push("CP00-145 plan unit_count must be 40");
}

if (!cp146Plan) {
  errors.push("closeout pack plan or CP00-146 manifest snapshot must include CP00-146");
} else {
  const coverage = validateAuditComplianceCp146Coverage(cp146Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-146 coverage: ${error}`));
  if (cp146Plan.risk_class !== "A") errors.push("CP00-146 plan risk_class must be A");
  if (cp146Plan.unit_count !== 10) errors.push("CP00-146 plan unit_count must be 10");
}

if (!cp147Plan) {
  errors.push("closeout pack plan or CP00-147 manifest snapshot must include CP00-147");
} else {
  const coverage = validateAuditComplianceCp147Coverage(cp147Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-147 coverage: ${error}`));
  if (cp147Plan.risk_class !== "C") errors.push("CP00-147 plan risk_class must be C");
  if (cp147Plan.unit_count !== 150) errors.push("CP00-147 plan unit_count must be 150");
}

if (!cp148Plan) {
  errors.push("closeout pack plan or CP00-148 manifest snapshot must include CP00-148");
} else {
  const coverage = validateAuditComplianceCp148Coverage(cp148Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-148 coverage: ${error}`));
  if (cp148Plan.risk_class !== "A") errors.push("CP00-148 plan risk_class must be A");
  if (cp148Plan.unit_count !== 10) errors.push("CP00-148 plan unit_count must be 10");
}

if (!cp149Plan) {
  errors.push("closeout pack plan or CP00-149 manifest snapshot must include CP00-149");
} else {
  const coverage = validateAuditComplianceCp149Coverage(cp149Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-149 coverage: ${error}`));
  if (cp149Plan.risk_class !== "B") errors.push("CP00-149 plan risk_class must be B");
  if (cp149Plan.unit_count !== 40) errors.push("CP00-149 plan unit_count must be 40");
}

if (!cp150Plan) {
  errors.push("closeout pack plan or CP00-150 manifest snapshot must include CP00-150");
} else {
  const coverage = validateAuditComplianceCp150Coverage(cp150Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-150 coverage: ${error}`));
  if (cp150Plan.risk_class !== "A") errors.push("CP00-150 plan risk_class must be A");
  if (cp150Plan.unit_count !== 10) errors.push("CP00-150 plan unit_count must be 10");
}

if (!cp151Plan) {
  errors.push("closeout pack plan or CP00-151 manifest snapshot must include CP00-151");
} else {
  const coverage = validateAuditComplianceCp151Coverage(cp151Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-151 coverage: ${error}`));
  if (cp151Plan.risk_class !== "C") errors.push("CP00-151 plan risk_class must be C");
  if (cp151Plan.unit_count !== 150) errors.push("CP00-151 plan unit_count must be 150");
}

if (!cp152Plan) {
  errors.push("closeout pack plan or CP00-152 manifest snapshot must include CP00-152");
} else {
  const coverage = validateAuditComplianceCp152Coverage(cp152Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-152 coverage: ${error}`));
  if (cp152Plan.risk_class !== "B") errors.push("CP00-152 plan risk_class must be B");
  if (cp152Plan.unit_count !== 40) errors.push("CP00-152 plan unit_count must be 40");
}

if (!cp153Plan) {
  errors.push("closeout pack plan or CP00-153 manifest snapshot must include CP00-153");
} else {
  const coverage = validateAuditComplianceCp153Coverage(cp153Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-153 coverage: ${error}`));
  if (cp153Plan.risk_class !== "C") errors.push("CP00-153 plan risk_class must be C");
  if (cp153Plan.unit_count !== 150) errors.push("CP00-153 plan unit_count must be 150");
}

if (!cp154Plan) {
  errors.push("closeout pack plan or CP00-154 manifest snapshot must include CP00-154");
} else {
  const coverage = validateAuditComplianceCp154Coverage(cp154Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-154 coverage: ${error}`));
  if (cp154Plan.risk_class !== "A") errors.push("CP00-154 plan risk_class must be A");
  if (cp154Plan.unit_count !== 10) errors.push("CP00-154 plan unit_count must be 10");
}

if (!cp155Plan) {
  errors.push("closeout pack plan or CP00-155 manifest snapshot must include CP00-155");
} else {
  const coverage = validateAuditComplianceCp155Coverage(cp155Plan);
  if (!coverage.ok) errors.push(...coverage.errors.map((error) => `CP00-155 coverage: ${error}`));
  if (cp155Plan.risk_class !== "C") errors.push("CP00-155 plan risk_class must be C");
  if (cp155Plan.unit_count !== 28) errors.push("CP00-155 plan unit_count must be 28");
}


const cp135CoveredUnits = createAuditComplianceCp135CoveredUnitIds();
const cp135Catalog = createAuditComplianceCp135EntryReadinessCatalog();
const cp135Readiness = createAuditComplianceCp135EntryReadiness();
const cp135PackageManifest = createAuditComplianceCp135EntryReadinessManifest();
const cp135Hermes = createAuditComplianceCp135HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp135Claude = createAuditComplianceCp135ClaudeReviewPacket();
const cp135Handoff = createAuditComplianceCp135CloseoutHandoff();
const cp135SecurityCase = runAuditComplianceCp135EntryReadinessCase("RP03.P00.M05.S08.permission_baseline_note");
const cp135UiCase = runAuditComplianceCp135EntryReadinessCase("RP03.P01.M03.S10.state_transition_map");
const cp136CoveredUnits = createAuditComplianceCp136CoveredUnitIds();
const cp136Catalog = createAuditComplianceCp136ServiceInterfaceReadinessCatalog();
const cp136Readiness = createAuditComplianceCp136ServiceInterfaceReadiness();
const cp136PackageManifest = createAuditComplianceCp136ServiceInterfaceReadinessManifest();
const cp136Hermes = createAuditComplianceCp136HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp136Claude = createAuditComplianceCp136ClaudeReviewPacket();
const cp136Handoff = createAuditComplianceCp136CloseoutHandoff();
const cp136TenantCase = runAuditComplianceCp136ServiceInterfaceReadinessCase("RP03.P02.M03.S03.tenant_boundary_precheck");
const cp136LockCase = runAuditComplianceCp136ServiceInterfaceReadinessCase("RP03.P02.M04.S11.lock_acquisition_rule");
const cp136RollbackCase = runAuditComplianceCp136ServiceInterfaceReadinessCase("RP03.P02.M06.S17.rollback_behavior");
const cp137CoveredUnits = createAuditComplianceCp137CoveredUnitIds();
const cp137Catalog = createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCatalog();
const cp137Readiness = createAuditComplianceCp137ServiceInterfaceWorkflowEvidence();
const cp137PackageManifest = createAuditComplianceCp137ServiceInterfaceWorkflowEvidenceManifest();
const cp137Hermes = createAuditComplianceCp137HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp137Claude = createAuditComplianceCp137ClaudeReviewPacket();
const cp137Handoff = createAuditComplianceCp137CloseoutHandoff();
const cp137GoldenCase = runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase("RP03.P02.M07.S07.primary_happy_path");
const cp137HermesLockCase = runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase("RP03.P02.M08.S11.lock_acquisition_rule");
const cp137ClaudeCase = runAuditComplianceCp137ServiceInterfaceWorkflowEvidenceCase("RP03.P02.M09.S02.request_normalization");
const cp138CoveredUnits = createAuditComplianceCp138CoveredUnitIds();
const cp138Catalog = createAuditComplianceCp138ClaudeBoundaryCatalog();
const cp138Readiness = createAuditComplianceCp138ClaudeBoundary();
const cp138PackageManifest = createAuditComplianceCp138ClaudeBoundaryManifest();
const cp138Hermes = createAuditComplianceCp138HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp138Claude = createAuditComplianceCp138ClaudeReviewPacket();
const cp138Handoff = createAuditComplianceCp138CloseoutHandoff();
const cp138TenantCase = runAuditComplianceCp138ClaudeBoundaryCase("rp03_p02_m09.tenant_boundary_precheck");
const cp138PermissionCase = runAuditComplianceCp138ClaudeBoundaryCase("RP03.P02.M09.S05.permission_precheck");
const cp138LockCase = runAuditComplianceCp138ClaudeBoundaryCase("rp03_p02_m09.lock_acquisition_rule");
const cp138PersistenceCase = runAuditComplianceCp138ClaudeBoundaryCase("RP03.P02.M09.S12.persistence_boundary");
const cp139CoveredUnits = createAuditComplianceCp139CoveredUnitIds();
const cp139Catalog = createAuditComplianceCp139ApiUiReferenceReadinessCatalog();
const cp139Readiness = createAuditComplianceCp139ApiUiReferenceReadiness();
const cp139PackageManifest = createAuditComplianceCp139ApiUiReferenceReadinessManifest();
const cp139Hermes = createAuditComplianceCp139HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp139Claude = createAuditComplianceCp139ClaudeReviewPacket();
const cp139Handoff = createAuditComplianceCp139CloseoutHandoff();
const cp139ApiContractCase = runAuditComplianceCp139ApiUiReferenceReadinessCase("RP03.P03.M03.S02.request_contract");
const cp139PermissionCase = runAuditComplianceCp139ApiUiReferenceReadinessCase("rp03_p03_m05.permission_annotation");
const cp139UnauthorizedCase = runAuditComplianceCp139ApiUiReferenceReadinessCase("RP03.P03.M05.S09.unauthorized_data_omission");
const cp139UiReviewCase = runAuditComplianceCp139ApiUiReferenceReadinessCase("RP03.P04.M01.S06.review_required_state");
const cp139ServiceRetryCase = runAuditComplianceCp139ApiUiReferenceReadinessCase("rp03_p02_m09.retry_behavior");
const cp140CoveredUnits = createAuditComplianceCp140CoveredUnitIds();
const cp140Catalog = createAuditComplianceCp140UiWorkflowContinuationCatalog();
const cp140Readiness = createAuditComplianceCp140UiWorkflowContinuation();
const cp140PackageManifest = createAuditComplianceCp140UiWorkflowContinuationManifest();
const cp140Hermes = createAuditComplianceCp140HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp140Claude = createAuditComplianceCp140ClaudeReviewPacket();
const cp140Handoff = createAuditComplianceCp140CloseoutHandoff();
const cp140SecondaryInteractionCase = runAuditComplianceCp140UiWorkflowContinuationCase("RP03.P04.M02.S08.secondary_interaction");
const cp140PermissionBadgeCase = runAuditComplianceCp140UiWorkflowContinuationCase("rp03_p04_m03.permission_badge");
const cp140AuditHintCase = runAuditComplianceCp140UiWorkflowContinuationCase("RP03.P04.M04.S10.audit_hint_display");
const cp140FocusCase = runAuditComplianceCp140UiWorkflowContinuationCase("rp03_p04_m03.keyboard_focus_behavior");
const cp140LeakCase = runAuditComplianceCp140UiWorkflowContinuationCase("RP03.P04.M03.S22.no_unauthorized_count_leak");
const cp141CoveredUnits = createAuditComplianceCp141CoveredUnitIds();
const cp141Catalog = createAuditComplianceCp141UiPermissionFixtureBindingCatalog();
const cp141Readiness = createAuditComplianceCp141UiPermissionFixtureBinding();
const cp141PackageManifest = createAuditComplianceCp141UiPermissionFixtureBindingManifest();
const cp141Hermes = createAuditComplianceCp141HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp141Claude = createAuditComplianceCp141ClaudeReviewPacket();
const cp141Handoff = createAuditComplianceCp141CloseoutHandoff();
const cp141HermesEvidenceCase = runAuditComplianceCp141UiPermissionFixtureBindingCase("RP03.P04.M04.S18.hermes_ui_evidence");
const cp141PermissionBadgeCase = runAuditComplianceCp141UiPermissionFixtureBindingCase("rp03_p04_m05.permission_badge");
const cp141AuditHintCase = runAuditComplianceCp141UiPermissionFixtureBindingCase("RP03.P04.M05.S10.audit_hint_display");
const cp141FixtureOpeningCase = runAuditComplianceCp141UiPermissionFixtureBindingCase("rp03_p04_m06.loading_state");
const cp141FocusCase = runAuditComplianceCp141UiPermissionFixtureBindingCase("RP03.P04.M06.S14.keyboard_focus_behavior");
const cp142CoveredUnits = createAuditComplianceCp142CoveredUnitIds();
const cp142Catalog = createAuditComplianceCp142UiFixtureEvidenceReferenceCatalog();
const cp142Readiness = createAuditComplianceCp142UiFixtureEvidenceReference();
const cp142PackageManifest = createAuditComplianceCp142UiFixtureEvidenceReferenceManifest();
const cp142Hermes = createAuditComplianceCp142HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp142Claude = createAuditComplianceCp142ClaudeReviewPacket();
const cp142Handoff = createAuditComplianceCp142CloseoutHandoff();
const cp142SyntheticFixtureCase = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P04.M06.S16.synthetic_fixture_binding");
const cp142PermissionBadgeCase = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("rp03_p04_m07.permission_badge");
const cp142HermesEvidenceCase = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P04.M08.S18.hermes_ui_evidence");
const cp142ClaudePromptCase = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("rp03_p04_m09.claude_ui_leak_prompt");
const cp142CrossTenantCase = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P05.M03.S09.cross_tenant_case");
const cp142AiAnalyticsCase = runAuditComplianceCp142UiFixtureEvidenceReferenceCase("RP03.P05.M05.S13.ai_retrieval_or_analytics_case");
const cp143CoveredUnits = createAuditComplianceCp143CoveredUnitIds();
const cp143Catalog = createAuditComplianceCp143FixtureTerminalBoundaryCatalog();
const cp143Readiness = createAuditComplianceCp143FixtureTerminalBoundary();
const cp143PackageManifest = createAuditComplianceCp143FixtureTerminalBoundaryManifest();
const cp143Hermes = createAuditComplianceCp143HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp143Claude = createAuditComplianceCp143ClaudeReviewPacket();
const cp143Handoff = createAuditComplianceCp143CloseoutHandoff();
const cp143ManifestCase = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M05.S14.fixture_manifest");
const cp143HermesEvidenceCase = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M05.S17.hermes_fixture_evidence");
const cp143ClaudePromptCase = runAuditComplianceCp143FixtureTerminalBoundaryCase("rp03_p05_m05.claude_missing_test_prompt");
const cp143NoRealDataCase = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M05.S20.no_real_data_check");
const cp143ReplayCase = runAuditComplianceCp143FixtureTerminalBoundaryCase("rp03_p05_m05.replay_command");
const cp143BaseTenantCase = runAuditComplianceCp143FixtureTerminalBoundaryCase("RP03.P05.M06.S01.base_tenant_fixture");
const cp144CoveredUnits = createAuditComplianceCp144CoveredUnitIds();
const cp144Catalog = createAuditComplianceCp144FixturePermissionMatrixReferenceCatalog();
const cp144Readiness = createAuditComplianceCp144FixturePermissionMatrixReference();
const cp144PackageManifest = createAuditComplianceCp144FixturePermissionMatrixReferenceManifest();
const cp144Hermes = createAuditComplianceCp144HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp144Claude = createAuditComplianceCp144ClaudeReviewPacket();
const cp144Handoff = createAuditComplianceCp144CloseoutHandoff();
const cp144BaseUserCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M06.S02.base_user_fixture");
const cp144CrossTenantCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M07.S09.cross_tenant_case");
const cp144HermesEvidenceCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M08.S17.hermes_fixture_evidence");
const cp144ClaudeReviewCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P05.M09.S07.review_required_case");
const cp144PermissionMatrixCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M00.S01.permission_matrix_row");
const cp144AiDecisionCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M02.S07.ai_retrieval_decision_binding");
const cp144LegalHoldCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M03.S11.legal_hold_interaction");
const cp144ApprovalRouteCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M03.S15.approval_required_route");
const cp144AllowedTestCase = runAuditComplianceCp144FixturePermissionMatrixReferenceCase("RP03.P06.M03.S19.allowed_test");
const cp145CoveredUnits = createAuditComplianceCp145CoveredUnitIds();
const cp145Catalog = createAuditComplianceCp145PermissionMatrixWorkflowBoundaryCatalog();
const cp145Readiness = createAuditComplianceCp145PermissionMatrixWorkflowBoundary();
const cp145PackageManifest = createAuditComplianceCp145PermissionMatrixWorkflowBoundaryManifest();
const cp145Hermes = createAuditComplianceCp145HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp145Claude = createAuditComplianceCp145ClaudeReviewPacket();
const cp145Handoff = createAuditComplianceCp145CloseoutHandoff();
const cp145DeniedTestCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M03.S20.denied_test");
const cp145CrossTenantTestCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M03.S21.cross_tenant_test");
const cp145LeakTestCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M03.S22.leak_prevention_test");
const cp145PermissionMatrixCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S01.permission_matrix_row");
const cp145ExportDecisionCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S05.export_download_decision_binding");
const cp145AiDecisionCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S07.ai_retrieval_decision_binding");
const cp145LegalHoldCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S11.legal_hold_interaction");
const cp145ReviewRouteCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M04.S14.review_required_route");
const cp145ApprovalRouteCase = runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase("RP03.P06.M05.S15.approval_required_route");
const cp146CoveredUnits = createAuditComplianceCp146CoveredUnitIds();
const cp146Catalog = createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCatalog();
const cp146Readiness = createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundary();
const cp146PackageManifest = createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryManifest();
const cp146Hermes = createAuditComplianceCp146HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp146Claude = createAuditComplianceCp146ClaudeReviewPacket();
const cp146Handoff = createAuditComplianceCp146CloseoutHandoff();
const cp146TrimmingCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S16.security_trimming_proof");
const cp146AuditExpectationCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S17.audit_event_expectation");
const cp146PermissionFixtureCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S18.permission_fixture");
const cp146AllowedTestCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S19.allowed_test");
const cp146DeniedTestCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S20.denied_test");
const cp146CrossTenantTestCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S21.cross_tenant_test");
const cp146LeakTestCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M05.S22.leak_prevention_test");
const cp146PermissionMatrixCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M06.S01.permission_matrix_row");
const cp146ViewDecisionCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M06.S02.view_decision_binding");
const cp146SearchDecisionCase = runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase("RP03.P06.M06.S03.search_decision_binding");
const cp147CoveredUnits = createAuditComplianceCp147CoveredUnitIds();
const cp147Catalog = createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCatalog();
const cp147Readiness = createAuditComplianceCp147PermissionMatrixFailureTaxonomyReference();
const cp147PackageManifest = createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceManifest();
const cp147Hermes = createAuditComplianceCp147HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp147Claude = createAuditComplianceCp147ClaudeReviewPacket();
const cp147Handoff = createAuditComplianceCp147CloseoutHandoff();
const cp147MutationDecisionCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M06.S04.mutation_decision_binding");
const cp147AiDecisionCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M06.S07.ai_retrieval_decision_binding");
const cp147LegalHoldCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M06.S11.legal_hold_interaction");
const cp147ReviewRouteCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M07.S14.review_required_route");
const cp147DeniedTestCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P06.M09.S20.denied_test");
const cp147CrossTenantFailureCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M00.S07.cross_tenant_failure");
const cp147BlockedClaimCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M02.S15.blocked_claim_receipt");
const cp147FailureFixtureCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M02.S16.failure_fixture");
const cp147FailureUnitTestCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M02.S17.failure_unit_test");
const cp147RetryExhaustionCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M03.S12.retry_exhaustion_failure");
const cp147CompensationCase = runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase("RP03.P07.M03.S14.compensation_expectation");
const cp148CoveredUnits = createAuditComplianceCp148CoveredUnitIds();
const cp148Catalog = createAuditComplianceCp148FailureBoundarySensitiveCatalog();
const cp148Readiness = createAuditComplianceCp148FailureBoundarySensitive();
const cp148PackageManifest = createAuditComplianceCp148FailureBoundarySensitiveManifest();
const cp148Hermes = createAuditComplianceCp148HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp148Claude = createAuditComplianceCp148ClaudeReviewPacket();
const cp148Handoff = createAuditComplianceCp148CloseoutHandoff();
const cp148BlockedClaimCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S15.blocked_claim_receipt");
const cp148FailureFixtureCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S16.failure_fixture");
const cp148FailureUnitTestCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S17.failure_unit_test");
const cp148FailureSmokeCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S18.failure_integration_smoke");
const cp148AuditHintCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S19.audit_failure_hint");
const cp148HermesEvidenceCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S20.hermes_failure_evidence");
const cp148ClaudePromptCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S21.claude_edge_case_prompt");
const cp148HumanEscalationCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M03.S22.human_escalation_note");
const cp148FailureTaxonomyCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M04.S01.failure_taxonomy");
const cp148MissingTenantCase = runAuditComplianceCp148FailureBoundarySensitiveCase("RP03.P07.M04.S02.missing_tenant_failure");
const cp149CoveredUnits = createAuditComplianceCp149CoveredUnitIds();
const cp149Catalog = createAuditComplianceCp149FailureWorkflowContinuationCatalog();
const cp149Readiness = createAuditComplianceCp149FailureWorkflowContinuation();
const cp149PackageManifest = createAuditComplianceCp149FailureWorkflowContinuationManifest();
const cp149Hermes = createAuditComplianceCp149HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp149Claude = createAuditComplianceCp149ClaudeReviewPacket();
const cp149Handoff = createAuditComplianceCp149CloseoutHandoff();
const cp149MissingActorCase = runAuditComplianceCp149FailureWorkflowContinuationCase("RP03.P07.M04.S03.missing_actor_failure");
const cp149PermissionDeniedCase = runAuditComplianceCp149FailureWorkflowContinuationCase("RP03.P07.M04.S08.permission_denied_failure");
const cp149LockConflictCase = runAuditComplianceCp149FailureWorkflowContinuationCase("RP03.P07.M04.S11.lock_conflict_failure");
const cp149ClaudePromptCase = runAuditComplianceCp149FailureWorkflowContinuationCase("RP03.P07.M04.S21.claude_edge_case_prompt");
const cp149PermissionAuditTaxonomyCase = runAuditComplianceCp149FailureWorkflowContinuationCase("RP03.P07.M05.S01.failure_taxonomy");
const cp149PermissionAuditHermesCase = runAuditComplianceCp149FailureWorkflowContinuationCase("RP03.P07.M05.S20.hermes_failure_evidence");
const cp150CoveredUnits = createAuditComplianceCp150CoveredUnitIds();
const cp150Catalog = createAuditComplianceCp150FailureFixtureSensitiveBoundaryCatalog();
const cp150Readiness = createAuditComplianceCp150FailureFixtureSensitiveBoundary();
const cp150PackageManifest = createAuditComplianceCp150FailureFixtureSensitiveBoundaryManifest();
const cp150Hermes = createAuditComplianceCp150HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp150Claude = createAuditComplianceCp150ClaudeReviewPacket();
const cp150Handoff = createAuditComplianceCp150CloseoutHandoff();
const cp150ClaudePromptCase = runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase("RP03.P07.M05.S21.claude_edge_case_prompt");
const cp150HumanEscalationCase = runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase("RP03.P07.M05.S22.human_escalation_note");
const cp150FailureTaxonomyCase = runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase("RP03.P07.M06.S01.failure_taxonomy");
const cp150CrossTenantCase = runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase("RP03.P07.M06.S07.cross_tenant_failure");
const cp150PermissionDeniedCase = runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase("RP03.P07.M06.S08.permission_denied_failure");
const cp151CoveredUnits = createAuditComplianceCp151CoveredUnitIds();
const cp151Catalog = createAuditComplianceCp151FailureEvidenceContinuationCatalog();
const cp151Readiness = createAuditComplianceCp151FailureEvidenceContinuation();
const cp151PackageManifest = createAuditComplianceCp151FailureEvidenceContinuationManifest();
const cp151Hermes = createAuditComplianceCp151HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp151Claude = createAuditComplianceCp151ClaudeReviewPacket();
const cp151Handoff = createAuditComplianceCp151CloseoutHandoff();
const cp151AmbiguousRuleCase = runAuditComplianceCp151FailureEvidenceContinuationCase("RP03.P07.M06.S09.ambiguous_rule_failure");
const cp151BlockedClaimCase = runAuditComplianceCp151FailureEvidenceContinuationCase("RP03.P07.M06.S15.blocked_claim_receipt");
const cp151HermesFailureCase = runAuditComplianceCp151FailureEvidenceContinuationCase("RP03.P07.M08.S20.hermes_failure_evidence");
const cp151CommandMatrixCase = runAuditComplianceCp151FailureEvidenceContinuationCase("RP03.P08.M00.S01.hermes_command_matrix");
const cp151PassSemanticsCase = runAuditComplianceCp151FailureEvidenceContinuationCase("RP03.P08.M03.S12.pass_semantics");
const cp151RegressionCase = runAuditComplianceCp151FailureEvidenceContinuationCase("RP03.P08.M04.S19.regression_receipt");
const cp152CoveredUnits = createAuditComplianceCp152CoveredUnitIds();
const cp152Catalog = createAuditComplianceCp152EvidenceWorkflowFixtureCatalog();
const cp152Readiness = createAuditComplianceCp152EvidenceWorkflowFixture();
const cp152PackageManifest = createAuditComplianceCp152EvidenceWorkflowFixtureManifest();
const cp152Hermes = createAuditComplianceCp152HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp152Claude = createAuditComplianceCp152ClaudeReviewPacket();
const cp152Handoff = createAuditComplianceCp152CloseoutHandoff();
const cp152NextGateCase = runAuditComplianceCp152EvidenceWorkflowFixtureCase("RP03.P08.M04.S20.next_gate_readiness");
const cp152PermissionSummaryCase = runAuditComplianceCp152EvidenceWorkflowFixtureCase("RP03.P08.M05.S07.permission_summary_receipt");
const cp152SyntheticCommandCase = runAuditComplianceCp152EvidenceWorkflowFixtureCase("RP03.P08.M06.S01.hermes_command_matrix");
const cp152ValidationCase = runAuditComplianceCp152EvidenceWorkflowFixtureCase("RP03.P08.M06.S16.validation_command_check");
const cp153CoveredUnits = createAuditComplianceCp153CoveredUnitIds();
const cp153Catalog = createAuditComplianceCp153ReviewCloseoutContinuationCatalog();
const cp153Readiness = createAuditComplianceCp153ReviewCloseoutContinuation();
const cp153PackageManifest = createAuditComplianceCp153ReviewCloseoutContinuationManifest();
const cp153Hermes = createAuditComplianceCp153HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp153Claude = createAuditComplianceCp153ClaudeReviewPacket();
const cp153Handoff = createAuditComplianceCp153CloseoutHandoff();
const cp153EvidenceHandoffCase = runAuditComplianceCp153ReviewCloseoutContinuationCase("RP03.P08.M06.S18.closeout_handoff");
const cp153HermesCommandCase = runAuditComplianceCp153ReviewCloseoutContinuationCase("RP03.P08.M07.S01.hermes_command_matrix");
const cp153ReviewArchitectureCase = runAuditComplianceCp153ReviewCloseoutContinuationCase("RP03.P09.M00.S01.architecture_review_questions");
const cp153PermissionBypassCase = runAuditComplianceCp153ReviewCloseoutContinuationCase("RP03.P09.M05.S03.permission_bypass_questions");
const cp153FindingRoutingCase = runAuditComplianceCp153ReviewCloseoutContinuationCase("RP03.P09.M05.S11.finding_routing_map");
const cp153GoldenOpeningCase = runAuditComplianceCp153ReviewCloseoutContinuationCase("RP03.P09.M07.S02.security_review_questions");
const cp154CoveredUnits = createAuditComplianceCp154CoveredUnitIds();
const cp154Catalog = createAuditComplianceCp154ReviewSensitiveBoundaryCatalog();
const cp154Readiness = createAuditComplianceCp154ReviewSensitiveBoundary();
const cp154PackageManifest = createAuditComplianceCp154ReviewSensitiveBoundaryManifest();
const cp154Hermes = createAuditComplianceCp154HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp154Claude = createAuditComplianceCp154ClaudeReviewPacket();
const cp154Handoff = createAuditComplianceCp154CloseoutHandoff();
const cp154PermissionBypassCase = runAuditComplianceCp154ReviewSensitiveBoundaryCase("RP03.P09.M07.S03.permission_bypass_questions");
const cp154AuditCompletenessCase = runAuditComplianceCp154ReviewSensitiveBoundaryCase("RP03.P09.M07.S04.audit_completeness_questions");
const cp154MissingTestCase = runAuditComplianceCp154ReviewSensitiveBoundaryCase("RP03.P09.M07.S05.missing_test_questions");
const cp154UiLeakCase = runAuditComplianceCp154ReviewSensitiveBoundaryCase("RP03.P09.M07.S06.ui_leak_questions");
const cp154RiskRegisterCase = runAuditComplianceCp154ReviewSensitiveBoundaryCase("RP03.P09.M07.S08.risk_register");
const cp154ApprovalCase = runAuditComplianceCp154ReviewSensitiveBoundaryCase("RP03.P09.M07.S12.human_approval_summary");
const cp155CoveredUnits = createAuditComplianceCp155CoveredUnitIds();
const cp155Catalog = createAuditComplianceCp155ReviewTerminalCloseoutCatalog();
const cp155Readiness = createAuditComplianceCp155ReviewTerminalCloseout();
const cp155PackageManifest = createAuditComplianceCp155ReviewTerminalCloseoutManifest();
const cp155Hermes = createAuditComplianceCp155HermesEvidencePacket(["npm run rp03:audit-architecture:validate"]);
const cp155Claude = createAuditComplianceCp155ClaudeReviewPacket();
const cp155Handoff = createAuditComplianceCp155CloseoutHandoff();
const cp155ClaudePacketCase = runAuditComplianceCp155ReviewTerminalCloseoutCase("RP03.P09.M07.S13.claude_review_packet");
const cp155PassFindingCase = runAuditComplianceCp155ReviewTerminalCloseoutCase("RP03.P09.M07.S16.pass_with_findings_closeout_note");
const cp155CommandRerunCase = runAuditComplianceCp155ReviewTerminalCloseoutCase("RP03.P09.M07.S20.command_rerun");
const cp155HermesPermissionCase = runAuditComplianceCp155ReviewTerminalCloseoutCase("RP03.P09.M08.S03.permission_bypass_questions");
const cp155ClaudeAuditCase = runAuditComplianceCp155ReviewTerminalCloseoutCase("RP03.P09.M09.S04.audit_completeness_questions");
const cp155HandoffSecurityCase = runAuditComplianceCp155ReviewTerminalCloseoutCase("RP03.P09.M10.S02.security_review_questions");

if (cp135CoveredUnits.length !== 150) errors.push(`CP00-135 covered unit count must be 150, got ${cp135CoveredUnits.length}`);
if (cp135CoveredUnits[0] !== "RP03.P00.M00.S01") errors.push("CP00-135 first unit mismatch");
if (cp135CoveredUnits.at(-1) !== "RP03.P01.M08.S05") errors.push("CP00-135 last unit mismatch");
if (new Set(cp135CoveredUnits).size !== cp135CoveredUnits.length) errors.push("CP00-135 covered units must be unique");
if (cp135Catalog.length !== 150) errors.push(`CP00-135 catalog length must be 150, got ${cp135Catalog.length}`);
if (cp135Readiness.deliverable_counts?.implementation !== 104) errors.push("CP00-135 implementation count must be 104");
if (cp135Readiness.deliverable_counts?.ui !== 19) errors.push("CP00-135 UI count must be 19");
if (cp135Readiness.deliverable_counts?.test !== 9) errors.push("CP00-135 test count must be 9");
if (cp135Readiness.deliverable_counts?.hermes_evidence !== 3) errors.push("CP00-135 Hermes evidence count must be 3");
if (cp135Readiness.deliverable_counts?.claude_review !== 3) errors.push("CP00-135 Claude review count must be 3");
if (cp135Readiness.append_only_contract_declared !== true) errors.push("CP00-135 append-only contract must be declared");
if (cp135Readiness.tenant_boundary_declared !== true) errors.push("CP00-135 tenant boundary must be declared");
if (cp135Readiness.privacy_payload_policy_declared !== true) errors.push("CP00-135 privacy payload policy must be declared");
if (cp135PackageManifest.production_ready_flag !== "audit_compliance_entry_readiness_verified") errors.push("CP00-135 production flag mismatch");
if (cp135PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-135 manifest must not append audit events");
if (cp135Hermes.evidence_id !== "H03.CP00-135.audit_compliance_entry_readiness") errors.push("CP00-135 Hermes evidence id mismatch");
if (cp135Claude.review_id !== "C03.CP00-135.audit_compliance_entry_readiness") errors.push("CP00-135 Claude review id mismatch");
if (cp135Claude.executes_review !== false) errors.push("CP00-135 Claude packet must not execute review");
if (cp135Handoff.to_pack_id !== "CP00-136") errors.push("CP00-135 handoff target must be CP00-136");
if (cp135Handoff.next_subphase_id !== "RP03.P01.M08.S06") errors.push("CP00-135 handoff next subphase mismatch");
if (cp135SecurityCase.appends_audit_event !== false || cp135SecurityCase.executes_permission_decision !== false) {
  errors.push("CP00-135 security case must be no-write and no permission execution");
}
if (cp135UiCase.renders_ui !== false || cp135UiCase.unauthorized_count_exposed !== false) {
  errors.push("CP00-135 UI case must be non-rendering and count-safe");
}

if (cp136CoveredUnits.length !== 150) errors.push(`CP00-136 covered unit count must be 150, got ${cp136CoveredUnits.length}`);
if (cp136CoveredUnits[0] !== "RP03.P01.M08.S06") errors.push("CP00-136 first unit mismatch");
if (cp136CoveredUnits.at(-1) !== "RP03.P02.M07.S06") errors.push("CP00-136 last unit mismatch");
if (new Set(cp136CoveredUnits).size !== cp136CoveredUnits.length) errors.push("CP00-136 covered units must be unique");
if (cp136Catalog.length !== 150) errors.push(`CP00-136 catalog length must be 150, got ${cp136Catalog.length}`);
if (cp136Readiness.deliverable_counts?.implementation !== 70) errors.push("CP00-136 implementation count must be 70");
if (cp136Readiness.deliverable_counts?.ui !== 23) errors.push("CP00-136 UI count must be 23");
if (cp136Readiness.deliverable_counts?.contract !== 8) errors.push("CP00-136 contract count must be 8");
if (cp136Readiness.deliverable_counts?.security_audit !== 16) errors.push("CP00-136 security audit count must be 16");
if (cp136Readiness.deliverable_counts?.claude_review !== 5) errors.push("CP00-136 Claude review count must be 5");
if (cp136Readiness.deliverable_counts?.failure_recovery !== 10) errors.push("CP00-136 failure recovery count must be 10");
if (cp136Readiness.deliverable_counts?.test !== 18) errors.push("CP00-136 test count must be 18");
if (cp136Readiness.service_entrypoint_contract_declared !== true) errors.push("CP00-136 service entrypoint contract must be declared");
if (cp136Readiness.tenant_boundary_precheck_declared !== true) errors.push("CP00-136 tenant boundary precheck must be declared");
if (cp136Readiness.permission_audit_precheck_declared !== true) errors.push("CP00-136 permission audit precheck must be declared");
if (cp136Readiness.idempotency_lock_persistence_boundaries_declared !== true) {
  errors.push("CP00-136 idempotency lock persistence boundaries must be declared");
}
if (cp136Readiness.rollback_retry_boundaries_declared !== true) errors.push("CP00-136 rollback retry boundaries must be declared");
if (cp136PackageManifest.production_ready_flag !== "audit_compliance_service_interface_readiness_verified") {
  errors.push("CP00-136 production flag mismatch");
}
if (cp136PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-136 manifest must not append audit events");
if (cp136PackageManifest.no_write_attestation?.acquires_locks !== false) errors.push("CP00-136 manifest must not acquire locks");
if (cp136Hermes.evidence_id !== "H03.CP00-136.audit_compliance_service_interface_readiness") errors.push("CP00-136 Hermes evidence id mismatch");
if (cp136Claude.review_id !== "C03.CP00-136.audit_compliance_service_interface_readiness") errors.push("CP00-136 Claude review id mismatch");
if (cp136Claude.executes_review !== false) errors.push("CP00-136 Claude packet must not execute review");
if (cp136Handoff.to_pack_id !== "CP00-137") errors.push("CP00-136 handoff target must be CP00-137");
if (cp136Handoff.next_subphase_id !== "RP03.P02.M07.S07") errors.push("CP00-136 handoff next subphase mismatch");
if (cp136TenantCase.executes_tenant_boundary_check !== false || cp136TenantCase.appends_audit_event !== false) {
  errors.push("CP00-136 tenant case must be no-write and no-execution");
}
if (cp136LockCase.acquires_locks !== false || cp136LockCase.persists_lock_tokens !== false) {
  errors.push("CP00-136 lock case must not acquire or persist locks");
}
if (cp136RollbackCase.executes_rollback !== false || cp136RollbackCase.executes_retry !== false) {
  errors.push("CP00-136 failure recovery case must not execute rollback or retry");
}

if (cp137CoveredUnits.length !== 40) errors.push(`CP00-137 covered unit count must be 40, got ${cp137CoveredUnits.length}`);
if (cp137CoveredUnits[0] !== "RP03.P02.M07.S07") errors.push("CP00-137 first unit mismatch");
if (cp137CoveredUnits.at(-1) !== "RP03.P02.M09.S02") errors.push("CP00-137 last unit mismatch");
if (new Set(cp137CoveredUnits).size !== cp137CoveredUnits.length) errors.push("CP00-137 covered units must be unique");
if (cp137Catalog.length !== 40) errors.push(`CP00-137 catalog length must be 40, got ${cp137Catalog.length}`);
if (cp137Readiness.deliverable_counts?.implementation !== 16) errors.push("CP00-137 implementation count must be 16");
if (cp137Readiness.deliverable_counts?.ui !== 6) errors.push("CP00-137 UI count must be 6");
if (cp137Readiness.deliverable_counts?.contract !== 2) errors.push("CP00-137 contract count must be 2");
if (cp137Readiness.deliverable_counts?.security_audit !== 2) errors.push("CP00-137 security audit count must be 2");
if (cp137Readiness.deliverable_counts?.claude_review !== 2) errors.push("CP00-137 Claude review count must be 2");
if (cp137Readiness.deliverable_counts?.failure_recovery !== 4) errors.push("CP00-137 failure recovery count must be 4");
if (cp137Readiness.deliverable_counts?.test !== 8) errors.push("CP00-137 test count must be 8");
if (cp137Readiness.evidence_mode_counts?.test_golden_case !== 16) errors.push("CP00-137 test/golden mode count must be 16");
if (cp137Readiness.evidence_mode_counts?.hermes_evidence_packet !== 22) errors.push("CP00-137 Hermes evidence mode count must be 22");
if (cp137Readiness.evidence_mode_counts?.claude_review_packet !== 2) errors.push("CP00-137 Claude review packet mode count must be 2");
if (cp137Readiness.golden_case_set_declared !== true) errors.push("CP00-137 golden case set must be declared");
if (cp137Readiness.hermes_evidence_packet_declared !== true) errors.push("CP00-137 Hermes evidence packet must be declared");
if (cp137Readiness.claude_review_packet_declared !== true) errors.push("CP00-137 Claude review packet must be declared");
if (cp137Readiness.permission_audit_precheck_declared !== true) errors.push("CP00-137 permission audit precheck must be declared");
if (cp137Readiness.idempotency_lock_persistence_boundaries_declared !== true) {
  errors.push("CP00-137 idempotency lock persistence boundaries must be declared");
}
if (cp137Readiness.rollback_retry_boundaries_declared !== true) errors.push("CP00-137 rollback retry boundaries must be declared");
if (cp137PackageManifest.production_ready_flag !== "audit_compliance_service_interface_workflow_evidence_verified") {
  errors.push("CP00-137 production flag mismatch");
}
if (cp137PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-137 manifest must not append audit events");
if (cp137PackageManifest.no_write_attestation?.executes_claude_review !== false) errors.push("CP00-137 manifest must not execute Claude review");
if (cp137Hermes.evidence_id !== "H03.CP00-137.audit_compliance_service_interface_workflow_evidence") {
  errors.push("CP00-137 Hermes evidence id mismatch");
}
if (cp137Claude.review_id !== "C03.CP00-137.audit_compliance_service_interface_workflow_evidence") {
  errors.push("CP00-137 Claude review id mismatch");
}
if (cp137Claude.executes_review !== false) errors.push("CP00-137 Claude packet must not execute review");
if (cp137Handoff.to_pack_id !== "CP00-138") errors.push("CP00-137 handoff target must be CP00-138");
if (cp137Handoff.next_subphase_id !== "RP03.P02.M09.S03") errors.push("CP00-137 handoff next subphase mismatch");
if (cp137GoldenCase.appends_audit_event !== false || cp137GoldenCase.writes_product_state !== false) {
  errors.push("CP00-137 golden case must be no-write");
}
if (cp137HermesLockCase.acquires_locks !== false || cp137HermesLockCase.writes_hermes_runtime !== false) {
  errors.push("CP00-137 Hermes lock case must not acquire locks or write Hermes runtime");
}
if (cp137ClaudeCase.executes_claude_review !== false || cp137ClaudeCase.hidden_field_names_exposed !== false) {
  errors.push("CP00-137 Claude packet case must not execute review or expose hidden fields");
}

if (cp138CoveredUnits.length !== 10) errors.push(`CP00-138 covered unit count must be 10, got ${cp138CoveredUnits.length}`);
if (cp138CoveredUnits[0] !== "RP03.P02.M09.S03") errors.push("CP00-138 first unit mismatch");
if (cp138CoveredUnits.at(-1) !== "RP03.P02.M09.S12") errors.push("CP00-138 last unit mismatch");
if (new Set(cp138CoveredUnits).size !== cp138CoveredUnits.length) errors.push("CP00-138 covered units must be unique");
if (cp138Catalog.length !== 10) errors.push(`CP00-138 catalog length must be 10, got ${cp138Catalog.length}`);
if (cp138Readiness.deliverable_counts?.implementation !== 6) errors.push("CP00-138 implementation count must be 6");
if (cp138Readiness.deliverable_counts?.security_audit !== 2) errors.push("CP00-138 security audit count must be 2");
if (cp138Readiness.deliverable_counts?.ui !== 2) errors.push("CP00-138 UI count must be 2");
if (cp138Readiness.claude_review_packet_declared !== true) errors.push("CP00-138 Claude review packet must be declared");
if (cp138Readiness.tenant_boundary_precheck_declared !== true) errors.push("CP00-138 tenant boundary precheck must be declared");
if (cp138Readiness.matter_trace_precheck_declared !== true) errors.push("CP00-138 matter trace precheck must be declared");
if (cp138Readiness.permission_audit_precheck_declared !== true) errors.push("CP00-138 permission audit precheck must be declared");
if (cp138Readiness.idempotency_lock_persistence_boundaries_declared !== true) {
  errors.push("CP00-138 idempotency lock persistence boundaries must be declared");
}
if (cp138Readiness.hidden_field_policy_declared !== true) errors.push("CP00-138 hidden field policy must be declared");
if (cp138PackageManifest.production_ready_flag !== "audit_compliance_claude_packet_sensitive_boundary_verified") {
  errors.push("CP00-138 production flag mismatch");
}
if (cp138PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-138 manifest must not append audit events");
if (cp138PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-138 manifest must not send Claude prompts");
if (cp138Hermes.evidence_id !== "H03.CP00-138.audit_compliance_claude_packet_sensitive_boundary") {
  errors.push("CP00-138 Hermes evidence id mismatch");
}
if (cp138Claude.review_id !== "C03.CP00-138.audit_compliance_claude_packet_sensitive_boundary") {
  errors.push("CP00-138 Claude review id mismatch");
}
if (cp138Claude.executes_review !== false || cp138Claude.sends_claude_prompt !== false) {
  errors.push("CP00-138 Claude packet must not execute or send review");
}
if (cp138Handoff.to_pack_id !== "CP00-139") errors.push("CP00-138 handoff target must be CP00-139");
if (cp138Handoff.next_subphase_id !== "RP03.P02.M09.S13") errors.push("CP00-138 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  tenant: cp138TenantCase,
  permission: cp138PermissionCase,
  lock: cp138LockCase,
  persistence: cp138PersistenceCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-138 ${label} case must be no-write`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-138 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-138 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp139CoveredUnits.length !== 150) errors.push(`CP00-139 covered unit count must be 150, got ${cp139CoveredUnits.length}`);
if (cp139CoveredUnits[0] !== "RP03.P02.M09.S13") errors.push("CP00-139 first unit mismatch");
if (cp139CoveredUnits.at(-1) !== "RP03.P04.M02.S07") errors.push("CP00-139 last unit mismatch");
if (new Set(cp139CoveredUnits).size !== cp139CoveredUnits.length) errors.push("CP00-139 covered units must be unique");
if (cp139Catalog.length !== 150) errors.push(`CP00-139 catalog length must be 150, got ${cp139Catalog.length}`);
if (cp139Readiness.deliverable_counts?.implementation !== 57) errors.push("CP00-139 implementation count must be 57");
if (cp139Readiness.deliverable_counts?.claude_review !== 6) errors.push("CP00-139 Claude review count must be 6");
if (cp139Readiness.deliverable_counts?.ui !== 17) errors.push("CP00-139 UI count must be 17");
if (cp139Readiness.deliverable_counts?.failure_recovery !== 2) errors.push("CP00-139 failure recovery count must be 2");
if (cp139Readiness.deliverable_counts?.test !== 12) errors.push("CP00-139 test count must be 12");
if (cp139Readiness.deliverable_counts?.contract !== 35) errors.push("CP00-139 contract count must be 35");
if (cp139Readiness.deliverable_counts?.security_audit !== 18) errors.push("CP00-139 security audit count must be 18");
if (cp139Readiness.deliverable_counts?.hermes_evidence !== 3) errors.push("CP00-139 Hermes evidence count must be 3");
if (cp139Readiness.evidence_mode_counts?.service_claude_packet_terminal !== 8) {
  errors.push("CP00-139 service Claude packet terminal mode count must be 8");
}
if (cp139Readiness.evidence_mode_counts?.service_closeout_handoff !== 11) {
  errors.push("CP00-139 service closeout handoff mode count must be 11");
}
if (cp139Readiness.evidence_mode_counts?.api_reference_readiness !== 93) {
  errors.push("CP00-139 API reference readiness mode count must be 93");
}
if (cp139Readiness.evidence_mode_counts?.api_hermes_evidence_packet !== 8) {
  errors.push("CP00-139 API Hermes evidence mode count must be 8");
}
if (cp139Readiness.evidence_mode_counts?.api_claude_review_packet !== 8) {
  errors.push("CP00-139 API Claude review mode count must be 8");
}
if (cp139Readiness.evidence_mode_counts?.api_closeout_handoff !== 3) {
  errors.push("CP00-139 API closeout handoff mode count must be 3");
}
if (cp139Readiness.evidence_mode_counts?.ui_reference_readiness !== 19) {
  errors.push("CP00-139 UI reference readiness mode count must be 19");
}
if (cp139Readiness.service_claude_packet_terminal_declared !== true) {
  errors.push("CP00-139 service Claude packet terminal must be declared");
}
if (cp139Readiness.service_closeout_handoff_declared !== true) errors.push("CP00-139 service closeout handoff must be declared");
if (cp139Readiness.api_interface_contract_declared !== true) errors.push("CP00-139 API interface contract must be declared");
if (cp139Readiness.api_permission_audit_binding_declared !== true) {
  errors.push("CP00-139 API permission audit binding must be declared");
}
if (cp139Readiness.api_unauthorized_data_omission_declared !== true) {
  errors.push("CP00-139 API unauthorized data omission must be declared");
}
if (cp139Readiness.ui_reference_opening_declared !== true) errors.push("CP00-139 UI reference opening must be declared");
if (cp139Readiness.hidden_field_policy_declared !== true) errors.push("CP00-139 hidden field policy must be declared");
if (cp139PackageManifest.production_ready_flag !== "audit_compliance_api_ui_reference_readiness_verified") {
  errors.push("CP00-139 production flag mismatch");
}
if (cp139PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-139 manifest must not append audit events");
if (cp139PackageManifest.no_write_attestation?.executes_api_handler !== false) errors.push("CP00-139 manifest must not execute API handlers");
if (cp139PackageManifest.no_write_attestation?.renders_ui !== false) errors.push("CP00-139 manifest must not render UI");
if (cp139PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-139 manifest must not send Claude prompts");
if (cp139Hermes.evidence_id !== "H03.CP00-139.audit_compliance_api_ui_reference_readiness") {
  errors.push("CP00-139 Hermes evidence id mismatch");
}
if (cp139Claude.review_id !== "C03.CP00-139.audit_compliance_api_ui_reference_readiness") {
  errors.push("CP00-139 Claude review id mismatch");
}
if (cp139Claude.executes_review !== false || cp139Claude.sends_claude_prompt !== false) {
  errors.push("CP00-139 Claude packet must not execute or send review");
}
if (cp139Handoff.to_pack_id !== "CP00-140") errors.push("CP00-139 handoff target must be CP00-140");
if (cp139Handoff.next_subphase_id !== "RP03.P04.M02.S08") errors.push("CP00-139 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  api_contract: cp139ApiContractCase,
  permission: cp139PermissionCase,
  unauthorized: cp139UnauthorizedCase,
  ui_review: cp139UiReviewCase,
  service_retry: cp139ServiceRetryCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-139 ${label} case must be no-write`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-139 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-139 ${label} case must not render or interact with UI`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-139 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-139 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp140CoveredUnits.length !== 40) errors.push(`CP00-140 covered unit count must be 40, got ${cp140CoveredUnits.length}`);
if (cp140CoveredUnits[0] !== "RP03.P04.M02.S08") errors.push("CP00-140 first unit mismatch");
if (cp140CoveredUnits.at(-1) !== "RP03.P04.M04.S17") errors.push("CP00-140 last unit mismatch");
if (new Set(cp140CoveredUnits).size !== cp140CoveredUnits.length) errors.push("CP00-140 covered units must be unique");
if (cp140Catalog.length !== 40) errors.push(`CP00-140 catalog length must be 40, got ${cp140Catalog.length}`);
if (cp140Readiness.deliverable_counts?.ui !== 18) errors.push("CP00-140 UI count must be 18");
if (cp140Readiness.deliverable_counts?.implementation !== 10) errors.push("CP00-140 implementation count must be 10");
if (cp140Readiness.deliverable_counts?.claude_review !== 3) errors.push("CP00-140 Claude review count must be 3");
if (cp140Readiness.deliverable_counts?.security_audit !== 4) errors.push("CP00-140 security audit count must be 4");
if (cp140Readiness.deliverable_counts?.fixture !== 2) errors.push("CP00-140 fixture count must be 2");
if (cp140Readiness.deliverable_counts?.test !== 2) errors.push("CP00-140 test count must be 2");
if (cp140Readiness.deliverable_counts?.hermes_evidence !== 1) errors.push("CP00-140 Hermes evidence count must be 1");
if (cp140Readiness.evidence_mode_counts?.ui_type_shape_terminal !== 1) {
  errors.push("CP00-140 UI type-shape terminal mode count must be 1");
}
if (cp140Readiness.evidence_mode_counts?.ui_primary_workflow !== 22) {
  errors.push("CP00-140 UI primary workflow mode count must be 22");
}
if (cp140Readiness.evidence_mode_counts?.ui_secondary_workflow_opening !== 17) {
  errors.push("CP00-140 UI secondary workflow opening mode count must be 17");
}
if (cp140Readiness.ui_surface_workflow_declared !== true) errors.push("CP00-140 UI surface workflow must be declared");
if (cp140Readiness.ui_permission_audit_badges_declared !== true) {
  errors.push("CP00-140 UI permission/audit badges must be declared");
}
if (cp140Readiness.ui_denied_review_states_declared !== true) errors.push("CP00-140 denied/review states must be declared");
if (cp140Readiness.ui_layout_focus_fixture_declared !== true) {
  errors.push("CP00-140 layout/focus/fixture boundary must be declared");
}
if (cp140Readiness.ui_no_unauthorized_count_leak_declared !== true) {
  errors.push("CP00-140 no unauthorized count leak must be declared");
}
if (cp140Readiness.hidden_field_policy_declared !== true) errors.push("CP00-140 hidden field policy must be declared");
if (cp140PackageManifest.production_ready_flag !== "audit_compliance_ui_workflow_continuation_verified") {
  errors.push("CP00-140 production flag mismatch");
}
if (cp140PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-140 manifest must not append audit events");
if (cp140PackageManifest.no_write_attestation?.renders_ui !== false) errors.push("CP00-140 manifest must not render UI");
if (cp140PackageManifest.no_write_attestation?.mutates_dom !== false) errors.push("CP00-140 manifest must not mutate DOM");
if (cp140PackageManifest.no_write_attestation?.opens_browser !== false) errors.push("CP00-140 manifest must not open browser");
if (cp140PackageManifest.no_write_attestation?.captures_screenshot !== false) errors.push("CP00-140 manifest must not capture screenshot");
if (cp140PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-140 manifest must not send Claude prompts");
if (cp140Hermes.evidence_id !== "H03.CP00-140.audit_compliance_ui_workflow_continuation") {
  errors.push("CP00-140 Hermes evidence id mismatch");
}
if (cp140Claude.review_id !== "C03.CP00-140.audit_compliance_ui_workflow_continuation") {
  errors.push("CP00-140 Claude review id mismatch");
}
if (cp140Claude.executes_review !== false || cp140Claude.sends_claude_prompt !== false) {
  errors.push("CP00-140 Claude packet must not execute or send review");
}
if (cp140Handoff.to_pack_id !== "CP00-141") errors.push("CP00-140 handoff target must be CP00-141");
if (cp140Handoff.next_subphase_id !== "RP03.P04.M04.S18") errors.push("CP00-140 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  secondary_interaction: cp140SecondaryInteractionCase,
  permission_badge: cp140PermissionBadgeCase,
  audit_hint: cp140AuditHintCase,
  focus: cp140FocusCase,
  leakage: cp140LeakCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-140 ${label} case must be no-write`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-140 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-140 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.opens_browser !== false || result.captures_screenshot !== false) {
    errors.push(`CP00-140 ${label} case must not open browser or capture screenshots`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-140 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-140 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp141CoveredUnits.length !== 40) errors.push(`CP00-141 covered unit count must be 40, got ${cp141CoveredUnits.length}`);
if (cp141CoveredUnits[0] !== "RP03.P04.M04.S18") errors.push("CP00-141 first unit mismatch");
if (cp141CoveredUnits.at(-1) !== "RP03.P04.M06.S15") errors.push("CP00-141 last unit mismatch");
if (new Set(cp141CoveredUnits).size !== cp141CoveredUnits.length) errors.push("CP00-141 covered units must be unique");
if (cp141Catalog.length !== 40) errors.push(`CP00-141 catalog length must be 40, got ${cp141Catalog.length}`);
if (cp141Readiness.deliverable_counts?.ui !== 17) errors.push("CP00-141 UI count must be 17");
if (cp141Readiness.deliverable_counts?.implementation !== 11) errors.push("CP00-141 implementation count must be 11");
if (cp141Readiness.deliverable_counts?.claude_review !== 4) errors.push("CP00-141 Claude review count must be 4");
if (cp141Readiness.deliverable_counts?.security_audit !== 4) errors.push("CP00-141 security audit count must be 4");
if (cp141Readiness.deliverable_counts?.fixture !== 1) errors.push("CP00-141 fixture count must be 1");
if (cp141Readiness.deliverable_counts?.test !== 1) errors.push("CP00-141 test count must be 1");
if (cp141Readiness.deliverable_counts?.hermes_evidence !== 2) errors.push("CP00-141 Hermes evidence count must be 2");
if (cp141Readiness.evidence_mode_counts?.ui_secondary_workflow_terminal !== 3) {
  errors.push("CP00-141 UI secondary workflow terminal mode count must be 3");
}
if (cp141Readiness.evidence_mode_counts?.ui_permission_audit_binding !== 22) {
  errors.push("CP00-141 UI permission audit binding mode count must be 22");
}
if (cp141Readiness.evidence_mode_counts?.ui_synthetic_fixture_opening !== 15) {
  errors.push("CP00-141 UI synthetic fixture opening mode count must be 15");
}
if (cp141Readiness.ui_permission_audit_binding_declared !== true) {
  errors.push("CP00-141 UI permission/audit binding must be declared");
}
if (cp141Readiness.ui_synthetic_fixture_opening_declared !== true) {
  errors.push("CP00-141 synthetic fixture opening must be declared");
}
if (cp141Readiness.ui_terminal_evidence_review_declared !== true) {
  errors.push("CP00-141 terminal evidence/review must be declared");
}
if (cp141Readiness.ui_no_hidden_field_exposure_declared !== true) {
  errors.push("CP00-141 hidden field exposure guard must be declared");
}
if (cp141PackageManifest.production_ready_flag !== "audit_compliance_ui_permission_fixture_binding_verified") {
  errors.push("CP00-141 production flag mismatch");
}
if (cp141PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-141 manifest must not append audit events");
if (cp141PackageManifest.no_write_attestation?.executes_permission_decision !== false) {
  errors.push("CP00-141 manifest must not execute permission decisions");
}
if (cp141PackageManifest.no_write_attestation?.executes_audit_hint_check !== false) {
  errors.push("CP00-141 manifest must not execute audit hint checks");
}
if (cp141PackageManifest.no_write_attestation?.renders_ui !== false) errors.push("CP00-141 manifest must not render UI");
if (cp141PackageManifest.no_write_attestation?.mutates_dom !== false) errors.push("CP00-141 manifest must not mutate DOM");
if (cp141PackageManifest.no_write_attestation?.opens_browser !== false) errors.push("CP00-141 manifest must not open browser");
if (cp141PackageManifest.no_write_attestation?.captures_screenshot !== false) errors.push("CP00-141 manifest must not capture screenshot");
if (cp141PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-141 manifest must not send Claude prompts");
if (cp141Hermes.evidence_id !== "H03.CP00-141.audit_compliance_ui_permission_fixture_binding") {
  errors.push("CP00-141 Hermes evidence id mismatch");
}
if (cp141Claude.review_id !== "C03.CP00-141.audit_compliance_ui_permission_fixture_binding") {
  errors.push("CP00-141 Claude review id mismatch");
}
if (cp141Claude.executes_review !== false || cp141Claude.sends_claude_prompt !== false) {
  errors.push("CP00-141 Claude packet must not execute or send review");
}
if (cp141Handoff.to_pack_id !== "CP00-142") errors.push("CP00-141 handoff target must be CP00-142");
if (cp141Handoff.next_subphase_id !== "RP03.P04.M06.S16") errors.push("CP00-141 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  hermes_evidence: cp141HermesEvidenceCase,
  permission_badge: cp141PermissionBadgeCase,
  audit_hint: cp141AuditHintCase,
  fixture_opening: cp141FixtureOpeningCase,
  focus: cp141FocusCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-141 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_audit_hint_check !== false) {
    errors.push(`CP00-141 ${label} case must not execute permission or audit hint behavior`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-141 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-141 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.opens_browser !== false || result.captures_screenshot !== false) {
    errors.push(`CP00-141 ${label} case must not open browser or capture screenshots`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-141 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-141 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp142CoveredUnits.length !== 150) errors.push(`CP00-142 covered unit count must be 150, got ${cp142CoveredUnits.length}`);
if (cp142CoveredUnits[0] !== "RP03.P04.M06.S16") errors.push("CP00-142 first unit mismatch");
if (cp142CoveredUnits.at(-1) !== "RP03.P05.M05.S13") errors.push("CP00-142 last unit mismatch");
if (new Set(cp142CoveredUnits).size !== cp142CoveredUnits.length) errors.push("CP00-142 covered units must be unique");
if (cp142Catalog.length !== 150) errors.push(`CP00-142 catalog length must be 150, got ${cp142Catalog.length}`);
if (cp142Readiness.deliverable_counts?.fixture !== 40) errors.push("CP00-142 fixture count must be 40");
if (cp142Readiness.deliverable_counts?.test !== 10) errors.push("CP00-142 test count must be 10");
if (cp142Readiness.deliverable_counts?.hermes_evidence !== 6) errors.push("CP00-142 Hermes evidence count must be 6");
if (cp142Readiness.deliverable_counts?.claude_review !== 13) errors.push("CP00-142 Claude review count must be 13");
if (cp142Readiness.deliverable_counts?.implementation !== 38) errors.push("CP00-142 implementation count must be 38");
if (cp142Readiness.deliverable_counts?.ui !== 31) errors.push("CP00-142 UI count must be 31");
if (cp142Readiness.deliverable_counts?.security_audit !== 12) errors.push("CP00-142 security audit count must be 12");
if (cp142Readiness.evidence_mode_counts?.ui_synthetic_fixture_terminal !== 5) {
  errors.push("CP00-142 UI synthetic fixture terminal mode count must be 5");
}
if (cp142Readiness.evidence_mode_counts?.ui_test_golden_case_reference !== 22) {
  errors.push("CP00-142 UI test/golden mode count must be 22");
}
if (cp142Readiness.evidence_mode_counts?.ui_hermes_evidence_packet_reference !== 20) {
  errors.push("CP00-142 UI Hermes evidence packet mode count must be 20");
}
if (cp142Readiness.evidence_mode_counts?.ui_claude_review_packet_reference !== 20) {
  errors.push("CP00-142 UI Claude review packet mode count must be 20");
}
if (cp142Readiness.evidence_mode_counts?.ui_closeout_handoff_reference !== 8) {
  errors.push("CP00-142 UI closeout handoff mode count must be 8");
}
if (cp142Readiness.evidence_mode_counts?.fixture_scope_inventory_reference !== 4) {
  errors.push("CP00-142 fixture scope inventory mode count must be 4");
}
if (cp142Readiness.evidence_mode_counts?.fixture_contract_draft_reference !== 8) {
  errors.push("CP00-142 fixture contract draft mode count must be 8");
}
if (cp142Readiness.evidence_mode_counts?.fixture_type_shape_reference !== 8) {
  errors.push("CP00-142 fixture type shape mode count must be 8");
}
if (cp142Readiness.evidence_mode_counts?.fixture_primary_workflow_reference !== 22) {
  errors.push("CP00-142 fixture primary workflow mode count must be 22");
}
if (cp142Readiness.evidence_mode_counts?.fixture_secondary_workflow_reference !== 20) {
  errors.push("CP00-142 fixture secondary workflow mode count must be 20");
}
if (cp142Readiness.evidence_mode_counts?.fixture_permission_audit_binding_reference !== 13) {
  errors.push("CP00-142 fixture permission/audit binding mode count must be 13");
}
if (cp142Readiness.ui_fixture_evidence_reference_declared !== true) {
  errors.push("CP00-142 UI fixture/evidence reference must be declared");
}
if (cp142Readiness.p05_fixture_lane_declared !== true) errors.push("CP00-142 P05 fixture lane must be declared");
if (cp142Readiness.fixture_permission_audit_binding_declared !== true) {
  errors.push("CP00-142 fixture permission/audit binding must be declared");
}
if (cp142Readiness.fixture_ai_analytics_reference_declared !== true) {
  errors.push("CP00-142 fixture AI/analytics reference must be declared");
}
if (cp142Readiness.hidden_field_policy_declared !== true) errors.push("CP00-142 hidden field policy must be declared");
if (cp142PackageManifest.production_ready_flag !== "audit_compliance_ui_fixture_evidence_reference_verified") {
  errors.push("CP00-142 production flag mismatch");
}
if (cp142PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-142 manifest must not append audit events");
if (cp142PackageManifest.no_write_attestation?.loads_fixture_payload !== false) errors.push("CP00-142 manifest must not load fixture payloads");
if (cp142PackageManifest.no_write_attestation?.materializes_golden_case_payload !== false) {
  errors.push("CP00-142 manifest must not materialize golden-case payloads");
}
if (cp142PackageManifest.no_write_attestation?.executes_replay_command !== false) {
  errors.push("CP00-142 manifest must not execute replay commands");
}
if (cp142PackageManifest.no_write_attestation?.executes_ai_retrieval !== false) {
  errors.push("CP00-142 manifest must not execute AI retrieval");
}
if (cp142PackageManifest.no_write_attestation?.executes_analytics_query !== false) {
  errors.push("CP00-142 manifest must not execute analytics queries");
}
if (cp142PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-142 manifest must not send Claude prompts");
if (cp142Hermes.evidence_id !== "H03.CP00-142.audit_compliance_ui_fixture_evidence_reference") {
  errors.push("CP00-142 Hermes evidence id mismatch");
}
if (cp142Claude.review_id !== "C03.CP00-142.audit_compliance_ui_fixture_evidence_reference") {
  errors.push("CP00-142 Claude review id mismatch");
}
if (cp142Claude.executes_review !== false || cp142Claude.sends_claude_prompt !== false) {
  errors.push("CP00-142 Claude packet must not execute or send review");
}
if (cp142Handoff.to_pack_id !== "CP00-143") errors.push("CP00-142 handoff target must be CP00-143");
if (cp142Handoff.next_subphase_id !== "RP03.P05.M05.S14") errors.push("CP00-142 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  synthetic_fixture: cp142SyntheticFixtureCase,
  permission_badge: cp142PermissionBadgeCase,
  hermes_evidence: cp142HermesEvidenceCase,
  claude_prompt: cp142ClaudePromptCase,
  cross_tenant: cp142CrossTenantCase,
  ai_analytics: cp142AiAnalyticsCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-142 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-142 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.loads_fixture_payload !== false || result.materializes_golden_case_payload !== false) {
    errors.push(`CP00-142 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.executes_replay_command !== false || result.executes_ai_retrieval !== false || result.executes_analytics_query !== false) {
    errors.push(`CP00-142 ${label} case must not execute replay, AI retrieval, or analytics behavior`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-142 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-142 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.opens_browser !== false || result.captures_screenshot !== false) {
    errors.push(`CP00-142 ${label} case must not open browser or capture screenshots`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-142 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-142 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp143CoveredUnits.length !== 10) errors.push(`CP00-143 covered unit count must be 10, got ${cp143CoveredUnits.length}`);
if (cp143CoveredUnits[0] !== "RP03.P05.M05.S14") errors.push("CP00-143 first unit mismatch");
if (cp143CoveredUnits.at(-1) !== "RP03.P05.M06.S01") errors.push("CP00-143 last unit mismatch");
if (new Set(cp143CoveredUnits).size !== cp143CoveredUnits.length) errors.push("CP00-143 covered units must be unique");
if (cp143Catalog.length !== 10) errors.push(`CP00-143 catalog length must be 10, got ${cp143Catalog.length}`);
if (cp143Readiness.deliverable_counts?.fixture !== 2) errors.push("CP00-143 fixture count must be 2");
if (cp143Readiness.deliverable_counts?.test !== 3) errors.push("CP00-143 test count must be 3");
if (cp143Readiness.deliverable_counts?.hermes_evidence !== 1) errors.push("CP00-143 Hermes evidence count must be 1");
if (cp143Readiness.deliverable_counts?.implementation !== 4) errors.push("CP00-143 implementation count must be 4");
if (cp143Readiness.evidence_mode_counts?.fixture_permission_audit_terminal_boundary !== 9) {
  errors.push("CP00-143 fixture permission/audit terminal mode count must be 9");
}
if (cp143Readiness.evidence_mode_counts?.synthetic_fixture_base_tenant_boundary !== 1) {
  errors.push("CP00-143 synthetic fixture base tenant mode count must be 1");
}
if (cp143Readiness.fixture_terminal_boundary_declared !== true) {
  errors.push("CP00-143 fixture terminal boundary must be declared");
}
if (cp143Readiness.fixture_manifest_boundary_declared !== true) {
  errors.push("CP00-143 fixture manifest boundary must be declared");
}
if (cp143Readiness.golden_failure_test_boundary_declared !== true) {
  errors.push("CP00-143 golden/failure test boundary must be declared");
}
if (cp143Readiness.no_real_data_boundary_declared !== true) {
  errors.push("CP00-143 no-real-data boundary must be declared");
}
if (cp143Readiness.stable_id_replay_boundary_declared !== true) {
  errors.push("CP00-143 stable ID/replay boundary must be declared");
}
if (cp143Readiness.hidden_field_policy_declared !== true) errors.push("CP00-143 hidden field policy must be declared");
if (cp143PackageManifest.production_ready_flag !== "audit_compliance_fixture_terminal_boundary_verified") {
  errors.push("CP00-143 production flag mismatch");
}
if (cp143PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-143 manifest must not append audit events");
if (cp143PackageManifest.no_write_attestation?.loads_fixture_payload !== false) errors.push("CP00-143 manifest must not load fixture payloads");
if (cp143PackageManifest.no_write_attestation?.materializes_fixture_manifest !== false) {
  errors.push("CP00-143 manifest must not materialize fixture manifests");
}
if (cp143PackageManifest.no_write_attestation?.materializes_golden_case_payload !== false) {
  errors.push("CP00-143 manifest must not materialize golden-case payloads");
}
if (cp143PackageManifest.no_write_attestation?.materializes_failure_case_payload !== false) {
  errors.push("CP00-143 manifest must not materialize failure-case payloads");
}
if (cp143PackageManifest.no_write_attestation?.executes_replay_command !== false) {
  errors.push("CP00-143 manifest must not execute replay commands");
}
if (cp143PackageManifest.no_write_attestation?.persists_stable_id !== false) {
  errors.push("CP00-143 manifest must not persist stable IDs");
}
if (cp143PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-143 manifest must not send Claude prompts");
if (cp143Hermes.evidence_id !== "H03.CP00-143.audit_compliance_fixture_terminal_boundary") {
  errors.push("CP00-143 Hermes evidence id mismatch");
}
if (cp143Claude.review_id !== "C03.CP00-143.audit_compliance_fixture_terminal_boundary") {
  errors.push("CP00-143 Claude review id mismatch");
}
if (cp143Claude.executes_review !== false || cp143Claude.sends_claude_prompt !== false) {
  errors.push("CP00-143 Claude packet must not execute or send review");
}
if (cp143Handoff.to_pack_id !== "CP00-144") errors.push("CP00-143 handoff target must be CP00-144");
if (cp143Handoff.next_subphase_id !== "RP03.P05.M06.S02") errors.push("CP00-143 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  manifest: cp143ManifestCase,
  hermes_evidence: cp143HermesEvidenceCase,
  claude_prompt: cp143ClaudePromptCase,
  no_real_data: cp143NoRealDataCase,
  replay: cp143ReplayCase,
  base_tenant: cp143BaseTenantCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-143 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-143 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.loads_fixture_payload !== false || result.reads_fixture_document_body !== false) {
    errors.push(`CP00-143 ${label} case must not load fixture payloads or document bodies`);
  }
  if (result.materializes_fixture_manifest !== false || result.materializes_golden_case_payload !== false || result.materializes_failure_case_payload !== false) {
    errors.push(`CP00-143 ${label} case must not materialize fixture, golden, or failure payloads`);
  }
  if (result.executes_replay_command !== false || result.persists_stable_id !== false || result.emits_real_receipt !== false) {
    errors.push(`CP00-143 ${label} case must not execute replay, persist stable ID, or emit real receipts`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-143 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-143 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-143 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-143 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp144CoveredUnits.length !== 150) errors.push(`CP00-144 covered unit count must be 150, got ${cp144CoveredUnits.length}`);
if (cp144CoveredUnits[0] !== "RP03.P05.M06.S02") errors.push("CP00-144 first unit mismatch");
if (cp144CoveredUnits.at(-1) !== "RP03.P06.M03.S19") errors.push("CP00-144 last unit mismatch");
if (new Set(cp144CoveredUnits).size !== cp144CoveredUnits.length) errors.push("CP00-144 covered units must be unique");
if (cp144Catalog.length !== 150) errors.push(`CP00-144 catalog length must be 150, got ${cp144Catalog.length}`);
if (cp144Readiness.deliverable_counts?.fixture !== 33) errors.push("CP00-144 fixture count must be 33");
if (cp144Readiness.deliverable_counts?.claude_review !== 7) errors.push("CP00-144 Claude review count must be 7");
if (cp144Readiness.deliverable_counts?.implementation !== 59) errors.push("CP00-144 implementation count must be 59");
if (cp144Readiness.deliverable_counts?.security_audit !== 22) errors.push("CP00-144 security audit count must be 22");
if (cp144Readiness.deliverable_counts?.test !== 15) errors.push("CP00-144 test count must be 15");
if (cp144Readiness.deliverable_counts?.hermes_evidence !== 4) errors.push("CP00-144 Hermes evidence count must be 4");
if (cp144Readiness.deliverable_counts?.ui !== 10) errors.push("CP00-144 UI count must be 10");
if (cp144Readiness.evidence_mode_counts?.synthetic_fixture_continuation_reference !== 19) {
  errors.push("CP00-144 synthetic fixture continuation mode count must be 19");
}
if (cp144Readiness.evidence_mode_counts?.fixture_test_golden_case_reference !== 22) {
  errors.push("CP00-144 fixture test/golden mode count must be 22");
}
if (cp144Readiness.evidence_mode_counts?.fixture_hermes_evidence_packet_reference !== 20) {
  errors.push("CP00-144 fixture Hermes evidence packet mode count must be 20");
}
if (cp144Readiness.evidence_mode_counts?.fixture_claude_review_packet_reference !== 20) {
  errors.push("CP00-144 fixture Claude review packet mode count must be 20");
}
if (cp144Readiness.evidence_mode_counts?.fixture_closeout_handoff_reference !== 8) {
  errors.push("CP00-144 fixture closeout handoff mode count must be 8");
}
if (cp144Readiness.evidence_mode_counts?.permission_scope_inventory_reference !== 11) {
  errors.push("CP00-144 permission scope inventory mode count must be 11");
}
if (cp144Readiness.evidence_mode_counts?.permission_contract_draft_reference !== 11) {
  errors.push("CP00-144 permission contract draft mode count must be 11");
}
if (cp144Readiness.evidence_mode_counts?.permission_type_shape_reference !== 20) {
  errors.push("CP00-144 permission type/shape mode count must be 20");
}
if (cp144Readiness.evidence_mode_counts?.permission_primary_implementation_reference !== 19) {
  errors.push("CP00-144 permission primary implementation mode count must be 19");
}
if (cp144Readiness.fixture_continuation_declared !== true) errors.push("CP00-144 fixture continuation must be declared");
if (cp144Readiness.fixture_hermes_packet_declared !== true) errors.push("CP00-144 fixture Hermes packet must be declared");
if (cp144Readiness.fixture_claude_packet_declared !== true) errors.push("CP00-144 fixture Claude packet must be declared");
if (cp144Readiness.permission_matrix_scope_contract_declared !== true) {
  errors.push("CP00-144 permission matrix scope/contract must be declared");
}
if (cp144Readiness.permission_matrix_decision_bindings_declared !== true) {
  errors.push("CP00-144 permission matrix decision bindings must be declared");
}
if (cp144Readiness.permission_matrix_boundary_interactions_declared !== true) {
  errors.push("CP00-144 permission matrix boundary interactions must be declared");
}
if (cp144Readiness.permission_matrix_review_approval_declared !== true) {
  errors.push("CP00-144 permission matrix review/approval routes must be declared");
}
if (cp144Readiness.permission_matrix_audit_security_declared !== true) {
  errors.push("CP00-144 permission matrix audit/security rows must be declared");
}
if (cp144Readiness.hidden_field_policy_declared !== true) errors.push("CP00-144 hidden field policy must be declared");
if (cp144PackageManifest.production_ready_flag !== "audit_compliance_fixture_permission_matrix_reference_verified") {
  errors.push("CP00-144 production flag mismatch");
}
if (cp144PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-144 manifest must not append audit events");
if (cp144PackageManifest.no_write_attestation?.loads_fixture_payload !== false) errors.push("CP00-144 manifest must not load fixture payloads");
if (cp144PackageManifest.no_write_attestation?.materializes_fixture_manifest !== false) {
  errors.push("CP00-144 manifest must not materialize fixture manifests");
}
if (cp144PackageManifest.no_write_attestation?.materializes_golden_case_payload !== false) {
  errors.push("CP00-144 manifest must not materialize golden-case payloads");
}
if (cp144PackageManifest.no_write_attestation?.executes_replay_command !== false) {
  errors.push("CP00-144 manifest must not execute replay commands");
}
if (cp144PackageManifest.no_write_attestation?.persists_stable_id !== false) {
  errors.push("CP00-144 manifest must not persist stable IDs");
}
if (cp144PackageManifest.no_write_attestation?.evaluates_permission_matrix !== false) {
  errors.push("CP00-144 manifest must not evaluate permission matrices");
}
if (cp144PackageManifest.no_write_attestation?.evaluates_ai_retrieval_decision !== false) {
  errors.push("CP00-144 manifest must not evaluate AI retrieval decisions");
}
if (cp144PackageManifest.no_write_attestation?.applies_legal_hold !== false) {
  errors.push("CP00-144 manifest must not apply legal hold");
}
if (cp144PackageManifest.no_write_attestation?.applies_ethical_wall !== false) {
  errors.push("CP00-144 manifest must not apply ethical wall");
}
if (cp144PackageManifest.no_write_attestation?.reads_object_acl !== false) {
  errors.push("CP00-144 manifest must not read object ACLs");
}
if (cp144PackageManifest.no_write_attestation?.routes_review_required !== false) {
  errors.push("CP00-144 manifest must not route review-required work");
}
if (cp144PackageManifest.no_write_attestation?.routes_approval_required !== false) {
  errors.push("CP00-144 manifest must not route approval-required work");
}
if (cp144PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-144 manifest must not send Claude prompts");
if (cp144Hermes.evidence_id !== "H03.CP00-144.audit_compliance_fixture_permission_matrix_reference") {
  errors.push("CP00-144 Hermes evidence id mismatch");
}
if (cp144Claude.review_id !== "C03.CP00-144.audit_compliance_fixture_permission_matrix_reference") {
  errors.push("CP00-144 Claude review id mismatch");
}
if (cp144Claude.executes_review !== false || cp144Claude.sends_claude_prompt !== false) {
  errors.push("CP00-144 Claude packet must not execute or send review");
}
if (cp144Handoff.to_pack_id !== "CP00-145") errors.push("CP00-144 handoff target must be CP00-145");
if (cp144Handoff.next_subphase_id !== "RP03.P06.M03.S20") errors.push("CP00-144 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  base_user: cp144BaseUserCase,
  cross_tenant: cp144CrossTenantCase,
  hermes_evidence: cp144HermesEvidenceCase,
  claude_review: cp144ClaudeReviewCase,
  permission_matrix: cp144PermissionMatrixCase,
  ai_decision: cp144AiDecisionCase,
  legal_hold: cp144LegalHoldCase,
  approval_route: cp144ApprovalRouteCase,
  allowed_test: cp144AllowedTestCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-144 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-144 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.loads_fixture_payload !== false || result.reads_fixture_document_body !== false) {
    errors.push(`CP00-144 ${label} case must not load fixture payloads or document bodies`);
  }
  if (result.materializes_fixture_manifest !== false || result.materializes_golden_case_payload !== false || result.materializes_failure_case_payload !== false) {
    errors.push(`CP00-144 ${label} case must not materialize fixture, golden, or failure payloads`);
  }
  if (result.executes_replay_command !== false || result.persists_stable_id !== false || result.emits_real_receipt !== false) {
    errors.push(`CP00-144 ${label} case must not execute replay, persist stable ID, or emit real receipts`);
  }
  if (result.executes_ai_retrieval !== false || result.executes_analytics_query !== false || result.evaluates_ai_retrieval_decision !== false) {
    errors.push(`CP00-144 ${label} case must not execute AI retrieval, analytics, or AI retrieval decision behavior`);
  }
  if (result.evaluates_permission_matrix !== false || result.evaluates_view_decision !== false || result.evaluates_search_decision !== false) {
    errors.push(`CP00-144 ${label} case must not evaluate permission matrix, view, or search decisions`);
  }
  if (result.evaluates_mutation_decision !== false || result.evaluates_export_download_decision !== false || result.evaluates_share_decision !== false) {
    errors.push(`CP00-144 ${label} case must not evaluate mutation, export/download, or share decisions`);
  }
  if (result.applies_legal_hold !== false || result.applies_ethical_wall !== false || result.reads_object_acl !== false) {
    errors.push(`CP00-144 ${label} case must not apply legal hold, ethical wall, or object ACL behavior`);
  }
  if (result.routes_review_required !== false || result.routes_approval_required !== false) {
    errors.push(`CP00-144 ${label} case must not route review or approval behavior`);
  }
  if (result.proves_security_trimming !== false || result.emits_audit_event_expectation !== false || result.writes_permission_fixture !== false) {
    errors.push(`CP00-144 ${label} case must not prove trimming, emit audit event expectation, or write permission fixtures`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-144 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-144 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-144 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-144 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp145CoveredUnits.length !== 40) errors.push(`CP00-145 covered unit count must be 40, got ${cp145CoveredUnits.length}`);
if (cp145CoveredUnits[0] !== "RP03.P06.M03.S20") errors.push("CP00-145 first unit mismatch");
if (cp145CoveredUnits.at(-1) !== "RP03.P06.M05.S15") errors.push("CP00-145 last unit mismatch");
if (new Set(cp145CoveredUnits).size !== cp145CoveredUnits.length) errors.push("CP00-145 covered units must be unique");
if (cp145Catalog.length !== 40) errors.push(`CP00-145 catalog length must be 40, got ${cp145Catalog.length}`);
if (cp145Readiness.deliverable_counts?.test !== 7) errors.push("CP00-145 test count must be 7");
if (cp145Readiness.deliverable_counts?.security_audit !== 7) errors.push("CP00-145 security audit count must be 7");
if (cp145Readiness.deliverable_counts?.implementation !== 16) errors.push("CP00-145 implementation count must be 16");
if (cp145Readiness.deliverable_counts?.ui !== 8) errors.push("CP00-145 UI count must be 8");
if (cp145Readiness.deliverable_counts?.claude_review !== 2) errors.push("CP00-145 Claude review count must be 2");
if (cp145Readiness.evidence_mode_counts?.permission_primary_test_boundary !== 3) {
  errors.push("CP00-145 permission primary test boundary mode count must be 3");
}
if (cp145Readiness.evidence_mode_counts?.permission_secondary_workflow_boundary !== 22) {
  errors.push("CP00-145 permission secondary workflow mode count must be 22");
}
if (cp145Readiness.evidence_mode_counts?.permission_audit_binding_route_boundary !== 15) {
  errors.push("CP00-145 permission audit binding route mode count must be 15");
}
if (cp145Readiness.permission_primary_test_boundary_declared !== true) {
  errors.push("CP00-145 permission primary test boundary must be declared");
}
if (cp145Readiness.permission_secondary_workflow_declared !== true) {
  errors.push("CP00-145 permission secondary workflow must be declared");
}
if (cp145Readiness.permission_audit_binding_route_declared !== true) {
  errors.push("CP00-145 permission audit binding route must be declared");
}
if (cp145Readiness.permission_matrix_decision_bindings_declared !== true) {
  errors.push("CP00-145 permission matrix decision bindings must be declared");
}
if (cp145Readiness.permission_matrix_boundary_interactions_declared !== true) {
  errors.push("CP00-145 permission matrix boundary interactions must be declared");
}
if (cp145Readiness.permission_matrix_review_approval_declared !== true) {
  errors.push("CP00-145 permission matrix review/approval routes must be declared");
}
if (cp145Readiness.permission_matrix_test_boundary_declared !== true) {
  errors.push("CP00-145 permission matrix test boundary must be declared");
}
if (cp145Readiness.permission_matrix_audit_security_declared !== true) {
  errors.push("CP00-145 permission matrix audit/security rows must be declared");
}
if (cp145Readiness.hidden_field_policy_declared !== true) errors.push("CP00-145 hidden field policy must be declared");
if (cp145PackageManifest.production_ready_flag !== "audit_compliance_permission_matrix_workflow_boundary_verified") {
  errors.push("CP00-145 production flag mismatch");
}
if (cp145PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-145 manifest must not append audit events");
if (cp145PackageManifest.no_write_attestation?.evaluates_permission_matrix !== false) {
  errors.push("CP00-145 manifest must not evaluate permission matrices");
}
if (cp145PackageManifest.no_write_attestation?.evaluates_export_download_decision !== false) {
  errors.push("CP00-145 manifest must not evaluate export/download decisions");
}
if (cp145PackageManifest.no_write_attestation?.evaluates_ai_retrieval_decision !== false) {
  errors.push("CP00-145 manifest must not evaluate AI retrieval decisions");
}
if (cp145PackageManifest.no_write_attestation?.applies_legal_hold !== false) {
  errors.push("CP00-145 manifest must not apply legal hold");
}
if (cp145PackageManifest.no_write_attestation?.applies_ethical_wall !== false) {
  errors.push("CP00-145 manifest must not apply ethical wall");
}
if (cp145PackageManifest.no_write_attestation?.reads_object_acl !== false) {
  errors.push("CP00-145 manifest must not read object ACLs");
}
if (cp145PackageManifest.no_write_attestation?.routes_review_required !== false) {
  errors.push("CP00-145 manifest must not route review-required work");
}
if (cp145PackageManifest.no_write_attestation?.routes_approval_required !== false) {
  errors.push("CP00-145 manifest must not route approval-required work");
}
if (cp145PackageManifest.no_write_attestation?.executes_denied_test !== false) {
  errors.push("CP00-145 manifest must not execute denied tests");
}
if (cp145PackageManifest.no_write_attestation?.executes_cross_tenant_test !== false) {
  errors.push("CP00-145 manifest must not execute cross-tenant tests");
}
if (cp145PackageManifest.no_write_attestation?.executes_leak_prevention_test !== false) {
  errors.push("CP00-145 manifest must not execute leak-prevention tests");
}
if (cp145PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-145 manifest must not send Claude prompts");
if (cp145Hermes.evidence_id !== "H03.CP00-145.audit_compliance_permission_matrix_workflow_boundary") {
  errors.push("CP00-145 Hermes evidence id mismatch");
}
if (cp145Claude.review_id !== "C03.CP00-145.audit_compliance_permission_matrix_workflow_boundary") {
  errors.push("CP00-145 Claude review id mismatch");
}
if (cp145Claude.executes_review !== false || cp145Claude.sends_claude_prompt !== false) {
  errors.push("CP00-145 Claude packet must not execute or send review");
}
if (cp145Handoff.to_pack_id !== "CP00-146") errors.push("CP00-145 handoff target must be CP00-146");
if (cp145Handoff.next_subphase_id !== "RP03.P06.M05.S16") errors.push("CP00-145 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  denied_test: cp145DeniedTestCase,
  cross_tenant_test: cp145CrossTenantTestCase,
  leak_test: cp145LeakTestCase,
  permission_matrix: cp145PermissionMatrixCase,
  export_decision: cp145ExportDecisionCase,
  ai_decision: cp145AiDecisionCase,
  legal_hold: cp145LegalHoldCase,
  review_route: cp145ReviewRouteCase,
  approval_route: cp145ApprovalRouteCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-145 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-145 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.executes_ai_retrieval !== false || result.executes_analytics_query !== false || result.evaluates_ai_retrieval_decision !== false) {
    errors.push(`CP00-145 ${label} case must not execute AI retrieval, analytics, or AI retrieval decision behavior`);
  }
  if (result.evaluates_permission_matrix !== false || result.evaluates_view_decision !== false || result.evaluates_search_decision !== false) {
    errors.push(`CP00-145 ${label} case must not evaluate permission matrix, view, or search decisions`);
  }
  if (result.evaluates_mutation_decision !== false || result.evaluates_export_download_decision !== false || result.evaluates_share_decision !== false) {
    errors.push(`CP00-145 ${label} case must not evaluate mutation, export/download, or share decisions`);
  }
  if (result.applies_legal_hold !== false || result.applies_ethical_wall !== false || result.reads_object_acl !== false) {
    errors.push(`CP00-145 ${label} case must not apply legal hold, ethical wall, or object ACL behavior`);
  }
  if (result.routes_review_required !== false || result.routes_approval_required !== false) {
    errors.push(`CP00-145 ${label} case must not route review or approval behavior`);
  }
  if (result.proves_security_trimming !== false || result.emits_audit_event_expectation !== false || result.writes_permission_fixture !== false) {
    errors.push(`CP00-145 ${label} case must not prove trimming, emit audit event expectation, or write permission fixtures`);
  }
  if (result.executes_allowed_test !== false || result.executes_denied_test !== false || result.executes_cross_tenant_test !== false || result.executes_leak_prevention_test !== false) {
    errors.push(`CP00-145 ${label} case must not execute permission matrix tests`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-145 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-145 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-145 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-145 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp146CoveredUnits.length !== 10) errors.push(`CP00-146 covered unit count must be 10, got ${cp146CoveredUnits.length}`);
if (cp146CoveredUnits[0] !== "RP03.P06.M05.S16") errors.push("CP00-146 first unit mismatch");
if (cp146CoveredUnits.at(-1) !== "RP03.P06.M06.S03") errors.push("CP00-146 last unit mismatch");
if (new Set(cp146CoveredUnits).size !== cp146CoveredUnits.length) errors.push("CP00-146 covered units must be unique");
if (cp146Catalog.length !== 10) errors.push(`CP00-146 catalog length must be 10, got ${cp146Catalog.length}`);
if (cp146Readiness.deliverable_counts?.security_audit !== 4) errors.push("CP00-146 security audit count must be 4");
if (cp146Readiness.deliverable_counts?.test !== 4) errors.push("CP00-146 test count must be 4");
if (cp146Readiness.deliverable_counts?.implementation !== 2) errors.push("CP00-146 implementation count must be 2");
if (cp146Readiness.evidence_mode_counts?.permission_audit_security_test_boundary !== 7) {
  errors.push("CP00-146 permission audit security test boundary mode count must be 7");
}
if (cp146Readiness.evidence_mode_counts?.synthetic_fixture_permission_matrix_boundary !== 3) {
  errors.push("CP00-146 synthetic fixture permission matrix boundary mode count must be 3");
}
if (cp146Readiness.security_trimming_boundary_declared !== true) {
  errors.push("CP00-146 security trimming boundary must be declared");
}
if (cp146Readiness.audit_event_expectation_boundary_declared !== true) {
  errors.push("CP00-146 audit event expectation boundary must be declared");
}
if (cp146Readiness.permission_fixture_boundary_declared !== true) {
  errors.push("CP00-146 permission fixture boundary must be declared");
}
if (cp146Readiness.allowed_denied_cross_tenant_leak_boundary_declared !== true) {
  errors.push("CP00-146 allowed/denied/cross-tenant/leak boundary must be declared");
}
if (cp146Readiness.synthetic_fixture_matrix_row_declared !== true) {
  errors.push("CP00-146 synthetic fixture matrix row must be declared");
}
if (cp146Readiness.synthetic_fixture_view_search_declared !== true) {
  errors.push("CP00-146 synthetic fixture view/search boundary must be declared");
}
if (cp146Readiness.hidden_field_policy_declared !== true) errors.push("CP00-146 hidden field policy must be declared");
if (cp146PackageManifest.production_ready_flag !== "audit_compliance_permission_matrix_security_fixture_boundary_verified") {
  errors.push("CP00-146 production flag mismatch");
}
if (cp146PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-146 manifest must not append audit events");
if (cp146PackageManifest.no_write_attestation?.evaluates_permission_matrix !== false) {
  errors.push("CP00-146 manifest must not evaluate permission matrices");
}
if (cp146PackageManifest.no_write_attestation?.evaluates_view_decision !== false) {
  errors.push("CP00-146 manifest must not evaluate view decisions");
}
if (cp146PackageManifest.no_write_attestation?.evaluates_search_decision !== false) {
  errors.push("CP00-146 manifest must not evaluate search decisions");
}
if (cp146PackageManifest.no_write_attestation?.proves_security_trimming !== false) {
  errors.push("CP00-146 manifest must not prove security trimming");
}
if (cp146PackageManifest.no_write_attestation?.emits_audit_event_expectation !== false) {
  errors.push("CP00-146 manifest must not emit audit event expectations");
}
if (cp146PackageManifest.no_write_attestation?.writes_permission_fixture !== false) {
  errors.push("CP00-146 manifest must not write permission fixtures");
}
if (cp146PackageManifest.no_write_attestation?.executes_allowed_test !== false) {
  errors.push("CP00-146 manifest must not execute allowed tests");
}
if (cp146PackageManifest.no_write_attestation?.executes_denied_test !== false) {
  errors.push("CP00-146 manifest must not execute denied tests");
}
if (cp146PackageManifest.no_write_attestation?.executes_cross_tenant_test !== false) {
  errors.push("CP00-146 manifest must not execute cross-tenant tests");
}
if (cp146PackageManifest.no_write_attestation?.executes_leak_prevention_test !== false) {
  errors.push("CP00-146 manifest must not execute leak-prevention tests");
}
if (cp146PackageManifest.no_write_attestation?.loads_fixture_payload !== false) {
  errors.push("CP00-146 manifest must not load fixture payloads");
}
if (cp146PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-146 manifest must not send Claude prompts");
if (cp146Hermes.evidence_id !== "H03.CP00-146.audit_compliance_permission_matrix_security_fixture_boundary") {
  errors.push("CP00-146 Hermes evidence id mismatch");
}
if (cp146Claude.review_id !== "C03.CP00-146.audit_compliance_permission_matrix_security_fixture_boundary") {
  errors.push("CP00-146 Claude review id mismatch");
}
if (cp146Claude.executes_review !== false || cp146Claude.sends_claude_prompt !== false) {
  errors.push("CP00-146 Claude packet must not execute or send review");
}
if (cp146Handoff.to_pack_id !== "CP00-147") errors.push("CP00-146 handoff target must be CP00-147");
if (cp146Handoff.next_subphase_id !== "RP03.P06.M06.S04") errors.push("CP00-146 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  trimming: cp146TrimmingCase,
  audit_expectation: cp146AuditExpectationCase,
  permission_fixture: cp146PermissionFixtureCase,
  allowed_test: cp146AllowedTestCase,
  denied_test: cp146DeniedTestCase,
  cross_tenant_test: cp146CrossTenantTestCase,
  leak_test: cp146LeakTestCase,
  permission_matrix: cp146PermissionMatrixCase,
  view_decision: cp146ViewDecisionCase,
  search_decision: cp146SearchDecisionCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-146 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-146 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.evaluates_permission_matrix !== false || result.evaluates_view_decision !== false || result.evaluates_search_decision !== false) {
    errors.push(`CP00-146 ${label} case must not evaluate permission matrix, view, or search decisions`);
  }
  if (result.proves_security_trimming !== false || result.emits_audit_event_expectation !== false || result.writes_permission_fixture !== false) {
    errors.push(`CP00-146 ${label} case must not prove trimming, emit audit expectations, or write permission fixtures`);
  }
  if (result.executes_allowed_test !== false || result.executes_denied_test !== false || result.executes_cross_tenant_test !== false || result.executes_leak_prevention_test !== false) {
    errors.push(`CP00-146 ${label} case must not execute permission matrix tests`);
  }
  if (result.loads_fixture_payload !== false || result.reads_fixture_document_body !== false || result.materializes_fixture_manifest !== false) {
    errors.push(`CP00-146 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-146 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-146 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-146 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-146 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp147CoveredUnits.length !== 150) errors.push(`CP00-147 covered unit count must be 150, got ${cp147CoveredUnits.length}`);
if (cp147CoveredUnits[0] !== "RP03.P06.M06.S04") errors.push("CP00-147 first unit mismatch");
if (cp147CoveredUnits.at(-1) !== "RP03.P07.M03.S14") errors.push("CP00-147 last unit mismatch");
if (new Set(cp147CoveredUnits).size !== cp147CoveredUnits.length) errors.push("CP00-147 covered units must be unique");
if (cp147Catalog.length !== 150) errors.push(`CP00-147 catalog length must be 150, got ${cp147Catalog.length}`);
if (cp147Readiness.deliverable_counts?.implementation !== 40) errors.push("CP00-147 implementation count must be 40");
if (cp147Readiness.deliverable_counts?.security_audit !== 26) errors.push("CP00-147 security audit count must be 26");
if (cp147Readiness.deliverable_counts?.ui !== 17) errors.push("CP00-147 UI count must be 17");
if (cp147Readiness.deliverable_counts?.claude_review !== 4) errors.push("CP00-147 Claude review count must be 4");
if (cp147Readiness.deliverable_counts?.test !== 16) errors.push("CP00-147 test count must be 16");
if (cp147Readiness.deliverable_counts?.failure_recovery !== 44) errors.push("CP00-147 failure recovery count must be 44");
if (cp147Readiness.deliverable_counts?.hermes_evidence !== 2) errors.push("CP00-147 Hermes evidence count must be 2");
if (cp147Readiness.deliverable_counts?.fixture !== 1) errors.push("CP00-147 fixture count must be 1");
if (cp147Readiness.evidence_mode_counts?.synthetic_fixture_permission_matrix_continuation_reference !== 19) {
  errors.push("CP00-147 synthetic fixture permission matrix continuation mode count must be 19");
}
if (cp147Readiness.evidence_mode_counts?.permission_test_golden_case_reference !== 22) {
  errors.push("CP00-147 permission test golden case mode count must be 22");
}
if (cp147Readiness.evidence_mode_counts?.permission_hermes_evidence_packet_reference !== 22) {
  errors.push("CP00-147 permission Hermes packet mode count must be 22");
}
if (cp147Readiness.evidence_mode_counts?.permission_claude_review_packet_reference !== 20) {
  errors.push("CP00-147 permission Claude packet mode count must be 20");
}
if (cp147Readiness.evidence_mode_counts?.permission_closeout_handoff_reference !== 11) {
  errors.push("CP00-147 permission closeout handoff mode count must be 11");
}
if (cp147Readiness.evidence_mode_counts?.failure_scope_inventory_reference !== 11) {
  errors.push("CP00-147 failure scope inventory mode count must be 11");
}
if (cp147Readiness.evidence_mode_counts?.failure_contract_draft_reference !== 11) {
  errors.push("CP00-147 failure contract draft mode count must be 11");
}
if (cp147Readiness.evidence_mode_counts?.failure_type_shape_reference !== 20) {
  errors.push("CP00-147 failure type shape mode count must be 20");
}
if (cp147Readiness.evidence_mode_counts?.failure_primary_implementation_reference !== 14) {
  errors.push("CP00-147 failure primary implementation mode count must be 14");
}
if (cp147Readiness.permission_matrix_continuation_declared !== true) errors.push("CP00-147 permission matrix continuation must be declared");
if (cp147Readiness.permission_hermes_packet_declared !== true) errors.push("CP00-147 permission Hermes packet must be declared");
if (cp147Readiness.permission_claude_packet_declared !== true) errors.push("CP00-147 permission Claude packet must be declared");
if (cp147Readiness.failure_scope_contract_declared !== true) errors.push("CP00-147 failure scope/contract must be declared");
if (cp147Readiness.failure_type_shape_declared !== true) errors.push("CP00-147 failure type shape must be declared");
if (cp147Readiness.failure_primary_implementation_declared !== true) errors.push("CP00-147 failure primary implementation must be declared");
if (cp147Readiness.failure_taxonomy_descriptor_declared !== true) errors.push("CP00-147 failure taxonomy descriptors must be declared");
if (cp147Readiness.failure_recovery_boundary_declared !== true) errors.push("CP00-147 failure recovery boundary must be declared");
if (cp147Readiness.failure_fixture_test_boundary_declared !== true) errors.push("CP00-147 failure fixture/test boundary must be declared");
if (cp147Readiness.failure_evidence_boundary_declared !== true) errors.push("CP00-147 failure evidence boundary must be declared");
if (cp147Readiness.hidden_field_policy_declared !== true) errors.push("CP00-147 hidden field policy must be declared");
if (cp147PackageManifest.production_ready_flag !== "audit_compliance_permission_matrix_failure_taxonomy_reference_verified") {
  errors.push("CP00-147 production flag mismatch");
}
if (cp147PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-147 manifest must not append audit events");
if (cp147PackageManifest.no_write_attestation?.evaluates_permission_matrix !== false) {
  errors.push("CP00-147 manifest must not evaluate permission matrices");
}
if (cp147PackageManifest.no_write_attestation?.evaluates_mutation_decision !== false) {
  errors.push("CP00-147 manifest must not evaluate mutation decisions");
}
if (cp147PackageManifest.no_write_attestation?.evaluates_ai_retrieval_decision !== false) {
  errors.push("CP00-147 manifest must not evaluate AI retrieval decisions");
}
if (cp147PackageManifest.no_write_attestation?.applies_legal_hold !== false) {
  errors.push("CP00-147 manifest must not apply legal hold");
}
if (cp147PackageManifest.no_write_attestation?.routes_review_required !== false) {
  errors.push("CP00-147 manifest must not route review-required work");
}
if (cp147PackageManifest.no_write_attestation?.writes_permission_fixture !== false) {
  errors.push("CP00-147 manifest must not write permission fixtures");
}
if (cp147PackageManifest.no_write_attestation?.executes_denied_test !== false) {
  errors.push("CP00-147 manifest must not execute denied tests");
}
if (cp147PackageManifest.no_write_attestation?.evaluates_failure_taxonomy !== false) {
  errors.push("CP00-147 manifest must not evaluate failure taxonomy");
}
if (cp147PackageManifest.no_write_attestation?.executes_failure_recovery !== false) {
  errors.push("CP00-147 manifest must not execute failure recovery");
}
if (cp147PackageManifest.no_write_attestation?.emits_blocked_claim_receipt !== false) {
  errors.push("CP00-147 manifest must not emit blocked-claim receipts");
}
if (cp147PackageManifest.no_write_attestation?.writes_failure_fixture !== false) {
  errors.push("CP00-147 manifest must not write failure fixtures");
}
if (cp147PackageManifest.no_write_attestation?.executes_failure_unit_test !== false) {
  errors.push("CP00-147 manifest must not execute failure unit tests");
}
if (cp147PackageManifest.no_write_attestation?.emits_hermes_failure_evidence !== false) {
  errors.push("CP00-147 manifest must not emit Hermes failure evidence");
}
if (cp147PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-147 manifest must not send Claude prompts");
if (cp147Hermes.evidence_id !== "H03.CP00-147.audit_compliance_permission_matrix_failure_taxonomy_reference") {
  errors.push("CP00-147 Hermes evidence id mismatch");
}
if (cp147Claude.review_id !== "C03.CP00-147.audit_compliance_permission_matrix_failure_taxonomy_reference") {
  errors.push("CP00-147 Claude review id mismatch");
}
if (cp147Claude.executes_review !== false || cp147Claude.sends_claude_prompt !== false) {
  errors.push("CP00-147 Claude packet must not execute or send review");
}
if (cp147Handoff.to_pack_id !== "CP00-148") errors.push("CP00-147 handoff target must be CP00-148");
if (cp147Handoff.next_subphase_id !== "RP03.P07.M03.S15") errors.push("CP00-147 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  mutation_decision: cp147MutationDecisionCase,
  ai_decision: cp147AiDecisionCase,
  legal_hold: cp147LegalHoldCase,
  review_route: cp147ReviewRouteCase,
  denied_test: cp147DeniedTestCase,
  cross_tenant_failure: cp147CrossTenantFailureCase,
  blocked_claim: cp147BlockedClaimCase,
  failure_fixture: cp147FailureFixtureCase,
  failure_unit_test: cp147FailureUnitTestCase,
  retry_exhaustion: cp147RetryExhaustionCase,
  compensation: cp147CompensationCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-147 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-147 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.evaluates_permission_matrix !== false || result.evaluates_mutation_decision !== false || result.evaluates_export_download_decision !== false) {
    errors.push(`CP00-147 ${label} case must not evaluate permission matrix mutation/export decisions`);
  }
  if (result.evaluates_share_decision !== false || result.evaluates_ai_retrieval_decision !== false || result.executes_ai_retrieval !== false) {
    errors.push(`CP00-147 ${label} case must not evaluate share or AI retrieval behavior`);
  }
  if (result.applies_legal_hold !== false || result.applies_ethical_wall !== false || result.reads_object_acl !== false) {
    errors.push(`CP00-147 ${label} case must not apply legal hold, ethical wall, or object ACL behavior`);
  }
  if (result.routes_review_required !== false || result.routes_approval_required !== false) {
    errors.push(`CP00-147 ${label} case must not route review or approval behavior`);
  }
  if (result.proves_security_trimming !== false || result.emits_audit_event_expectation !== false || result.writes_permission_fixture !== false) {
    errors.push(`CP00-147 ${label} case must not prove trimming, emit audit expectations, or write permission fixtures`);
  }
  if (result.executes_denied_test !== false || result.executes_cross_tenant_test !== false || result.executes_leak_prevention_test !== false) {
    errors.push(`CP00-147 ${label} case must not execute permission matrix tests`);
  }
  if (result.evaluates_failure_taxonomy !== false || result.executes_failure_recovery !== false || result.throws_failure !== false) {
    errors.push(`CP00-147 ${label} case must not evaluate taxonomy, execute recovery, or throw failure`);
  }
  if (result.executes_retry_exhaustion !== false || result.executes_rollback_expectation !== false || result.executes_compensation !== false) {
    errors.push(`CP00-147 ${label} case must not execute retry, rollback, or compensation behavior`);
  }
  if (result.emits_blocked_claim_receipt !== false || result.emits_hermes_failure_evidence !== false || result.emits_audit_failure_hint !== false) {
    errors.push(`CP00-147 ${label} case must not emit blocked-claim, Hermes failure, or audit failure evidence`);
  }
  if (result.writes_failure_fixture !== false || result.executes_failure_unit_test !== false || result.executes_failure_integration_smoke !== false) {
    errors.push(`CP00-147 ${label} case must not write failure fixture or execute failure tests`);
  }
  if (result.loads_fixture_payload !== false || result.materializes_failure_case_payload !== false || result.materializes_fixture_manifest !== false) {
    errors.push(`CP00-147 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-147 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-147 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-147 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false) {
    errors.push(`CP00-147 ${label} case must not expose unauthorized counts or object names`);
  }
}

if (cp148CoveredUnits.length !== 10) errors.push(`CP00-148 covered unit count must be 10, got ${cp148CoveredUnits.length}`);
if (cp148CoveredUnits[0] !== "RP03.P07.M03.S15") errors.push("CP00-148 first unit mismatch");
if (cp148CoveredUnits.at(-1) !== "RP03.P07.M04.S02") errors.push("CP00-148 last unit mismatch");
if (new Set(cp148CoveredUnits).size !== cp148CoveredUnits.length) errors.push("CP00-148 covered units must be unique");
if (cp148Catalog.length !== 10) errors.push(`CP00-148 catalog length must be 10, got ${cp148Catalog.length}`);
if (cp148Readiness.deliverable_counts?.hermes_evidence !== 2) errors.push("CP00-148 Hermes evidence count must be 2");
if (cp148Readiness.deliverable_counts?.fixture !== 1) errors.push("CP00-148 fixture count must be 1");
if (cp148Readiness.deliverable_counts?.test !== 2) errors.push("CP00-148 test count must be 2");
if (cp148Readiness.deliverable_counts?.security_audit !== 1) errors.push("CP00-148 security audit count must be 1");
if (cp148Readiness.deliverable_counts?.claude_review !== 1) errors.push("CP00-148 Claude review count must be 1");
if (cp148Readiness.deliverable_counts?.implementation !== 1) errors.push("CP00-148 implementation count must be 1");
if (cp148Readiness.deliverable_counts?.failure_recovery !== 2) errors.push("CP00-148 failure recovery count must be 2");
if (cp148Readiness.evidence_mode_counts?.failure_primary_sensitive_boundary !== 8) {
  errors.push("CP00-148 failure primary sensitive boundary mode count must be 8");
}
if (cp148Readiness.evidence_mode_counts?.failure_secondary_workflow_boundary !== 2) {
  errors.push("CP00-148 failure secondary workflow boundary mode count must be 2");
}
if (cp148Readiness.blocked_claim_receipt_boundary_declared !== true) errors.push("CP00-148 blocked-claim receipt boundary must be declared");
if (cp148Readiness.failure_fixture_boundary_declared !== true) errors.push("CP00-148 failure fixture boundary must be declared");
if (cp148Readiness.failure_test_boundary_declared !== true) errors.push("CP00-148 failure test boundary must be declared");
if (cp148Readiness.audit_failure_hint_boundary_declared !== true) errors.push("CP00-148 audit failure hint boundary must be declared");
if (cp148Readiness.hermes_failure_evidence_boundary_declared !== true) errors.push("CP00-148 Hermes failure evidence boundary must be declared");
if (cp148Readiness.claude_edge_case_prompt_boundary_declared !== true) errors.push("CP00-148 Claude edge-case prompt boundary must be declared");
if (cp148Readiness.human_escalation_note_boundary_declared !== true) errors.push("CP00-148 human escalation note boundary must be declared");
if (cp148Readiness.failure_secondary_workflow_declared !== true) errors.push("CP00-148 failure secondary workflow must be declared");
if (cp148Readiness.hidden_field_policy_declared !== true) errors.push("CP00-148 hidden field policy must be declared");
if (cp148PackageManifest.production_ready_flag !== "audit_compliance_failure_boundary_sensitive_verified") {
  errors.push("CP00-148 production flag mismatch");
}
if (cp148PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-148 manifest must not append audit events");
if (cp148PackageManifest.no_write_attestation?.evaluates_failure_taxonomy !== false) {
  errors.push("CP00-148 manifest must not evaluate failure taxonomy");
}
if (cp148PackageManifest.no_write_attestation?.executes_failure_recovery !== false) {
  errors.push("CP00-148 manifest must not execute failure recovery");
}
if (cp148PackageManifest.no_write_attestation?.emits_blocked_claim_receipt !== false) {
  errors.push("CP00-148 manifest must not emit blocked-claim receipts");
}
if (cp148PackageManifest.no_write_attestation?.writes_failure_fixture !== false) {
  errors.push("CP00-148 manifest must not write failure fixtures");
}
if (cp148PackageManifest.no_write_attestation?.executes_failure_unit_test !== false) {
  errors.push("CP00-148 manifest must not execute failure unit tests");
}
if (cp148PackageManifest.no_write_attestation?.executes_failure_integration_smoke !== false) {
  errors.push("CP00-148 manifest must not execute failure integration smoke tests");
}
if (cp148PackageManifest.no_write_attestation?.emits_audit_failure_hint !== false) {
  errors.push("CP00-148 manifest must not emit audit failure hints");
}
if (cp148PackageManifest.no_write_attestation?.emits_hermes_failure_evidence !== false) {
  errors.push("CP00-148 manifest must not emit Hermes failure evidence");
}
if (cp148PackageManifest.no_write_attestation?.materializes_claude_edge_case_prompt !== false) {
  errors.push("CP00-148 manifest must not materialize Claude edge-case prompts");
}
if (cp148PackageManifest.no_write_attestation?.records_human_escalation_note !== false) {
  errors.push("CP00-148 manifest must not record human escalation notes");
}
if (cp148PackageManifest.no_write_attestation?.executes_human_escalation !== false) {
  errors.push("CP00-148 manifest must not execute human escalation");
}
if (cp148PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-148 manifest must not send Claude prompts");
if (cp148Hermes.evidence_id !== "H03.CP00-148.audit_compliance_failure_boundary_sensitive") {
  errors.push("CP00-148 Hermes evidence id mismatch");
}
if (cp148Claude.review_id !== "C03.CP00-148.audit_compliance_failure_boundary_sensitive") {
  errors.push("CP00-148 Claude review id mismatch");
}
if (cp148Claude.executes_review !== false || cp148Claude.sends_claude_prompt !== false) {
  errors.push("CP00-148 Claude packet must not execute or send review");
}
if (cp148Handoff.to_pack_id !== "CP00-149") errors.push("CP00-148 handoff target must be CP00-149");
if (cp148Handoff.next_subphase_id !== "RP03.P07.M04.S03") errors.push("CP00-148 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  blocked_claim: cp148BlockedClaimCase,
  failure_fixture: cp148FailureFixtureCase,
  failure_unit_test: cp148FailureUnitTestCase,
  failure_smoke: cp148FailureSmokeCase,
  audit_hint: cp148AuditHintCase,
  hermes_evidence: cp148HermesEvidenceCase,
  claude_prompt: cp148ClaudePromptCase,
  human_escalation: cp148HumanEscalationCase,
  failure_taxonomy: cp148FailureTaxonomyCase,
  missing_tenant: cp148MissingTenantCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-148 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-148 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.evaluates_failure_taxonomy !== false || result.executes_failure_recovery !== false || result.throws_failure !== false) {
    errors.push(`CP00-148 ${label} case must not evaluate taxonomy, execute recovery, or throw failure`);
  }
  if (result.executes_retry_exhaustion !== false || result.executes_rollback_expectation !== false || result.executes_compensation !== false) {
    errors.push(`CP00-148 ${label} case must not execute retry, rollback, or compensation behavior`);
  }
  if (result.emits_blocked_claim_receipt !== false || result.emits_hermes_failure_evidence !== false || result.emits_audit_failure_hint !== false) {
    errors.push(`CP00-148 ${label} case must not emit blocked-claim, Hermes failure, or audit failure evidence`);
  }
  if (result.writes_failure_fixture !== false || result.executes_failure_unit_test !== false || result.executes_failure_integration_smoke !== false) {
    errors.push(`CP00-148 ${label} case must not write failure fixture or execute failure tests`);
  }
  if (result.materializes_claude_edge_case_prompt !== false || result.records_human_escalation_note !== false || result.executes_human_escalation !== false) {
    errors.push(`CP00-148 ${label} case must not materialize Claude prompts or execute human escalation`);
  }
  if (result.loads_fixture_payload !== false || result.materializes_failure_case_payload !== false || result.materializes_fixture_manifest !== false) {
    errors.push(`CP00-148 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-148 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-148 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-148 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false || result.hidden_field_names_exposed !== false) {
    errors.push(`CP00-148 ${label} case must not expose unauthorized counts, object names, or hidden field names`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-148 ${label} case must not implement LDIP or split HRX`);
  }
}

if (cp149CoveredUnits.length !== 40) errors.push(`CP00-149 covered unit count must be 40, got ${cp149CoveredUnits.length}`);
if (cp149CoveredUnits[0] !== "RP03.P07.M04.S03") errors.push("CP00-149 first unit mismatch");
if (cp149CoveredUnits.at(-1) !== "RP03.P07.M05.S20") errors.push("CP00-149 last unit mismatch");
if (new Set(cp149CoveredUnits).size !== cp149CoveredUnits.length) errors.push("CP00-149 covered units must be unique");
if (cp149Catalog.length !== 40) errors.push(`CP00-149 catalog length must be 40, got ${cp149Catalog.length}`);
if (cp149Readiness.deliverable_counts?.failure_recovery !== 22) errors.push("CP00-149 failure recovery count must be 22");
if (cp149Readiness.deliverable_counts?.security_audit !== 4) errors.push("CP00-149 security audit count must be 4");
if (cp149Readiness.deliverable_counts?.implementation !== 3) errors.push("CP00-149 implementation count must be 3");
if (cp149Readiness.deliverable_counts?.hermes_evidence !== 4) errors.push("CP00-149 Hermes evidence count must be 4");
if (cp149Readiness.deliverable_counts?.fixture !== 2) errors.push("CP00-149 fixture count must be 2");
if (cp149Readiness.deliverable_counts?.test !== 4) errors.push("CP00-149 test count must be 4");
if (cp149Readiness.deliverable_counts?.claude_review !== 1) errors.push("CP00-149 Claude review count must be 1");
if (cp149Readiness.evidence_mode_counts?.failure_secondary_workflow_continuation !== 20) {
  errors.push("CP00-149 failure secondary workflow continuation mode count must be 20");
}
if (cp149Readiness.evidence_mode_counts?.permission_audit_failure_binding_continuation !== 20) {
  errors.push("CP00-149 permission/audit failure binding continuation mode count must be 20");
}
if (cp149Readiness.failure_secondary_workflow_continuation_declared !== true) {
  errors.push("CP00-149 failure secondary workflow continuation must be declared");
}
if (cp149Readiness.permission_audit_failure_binding_declared !== true) {
  errors.push("CP00-149 permission/audit failure binding must be declared");
}
if (cp149Readiness.blocked_claim_receipt_boundary_declared !== true) errors.push("CP00-149 blocked-claim receipt boundary must be declared");
if (cp149Readiness.failure_fixture_boundary_declared !== true) errors.push("CP00-149 failure fixture boundary must be declared");
if (cp149Readiness.failure_test_boundary_declared !== true) errors.push("CP00-149 failure test boundary must be declared");
if (cp149Readiness.audit_failure_hint_boundary_declared !== true) errors.push("CP00-149 audit failure hint boundary must be declared");
if (cp149Readiness.hermes_failure_evidence_boundary_declared !== true) errors.push("CP00-149 Hermes failure evidence boundary must be declared");
if (cp149Readiness.claude_edge_case_prompt_boundary_declared !== true) errors.push("CP00-149 Claude edge-case prompt boundary must be declared");
if (cp149Readiness.human_escalation_note_boundary_declared !== true) errors.push("CP00-149 human escalation note boundary must be declared");
if (cp149Readiness.hidden_field_policy_declared !== true) errors.push("CP00-149 hidden field policy must be declared");
if (cp149PackageManifest.production_ready_flag !== "audit_compliance_failure_workflow_continuation_verified") {
  errors.push("CP00-149 production flag mismatch");
}
if (cp149PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-149 manifest must not append audit events");
if (cp149PackageManifest.no_write_attestation?.evaluates_failure_taxonomy !== false) {
  errors.push("CP00-149 manifest must not evaluate failure taxonomy");
}
if (cp149PackageManifest.no_write_attestation?.evaluates_permission_audit_binding !== false) {
  errors.push("CP00-149 manifest must not evaluate permission/audit binding");
}
if (cp149PackageManifest.no_write_attestation?.executes_failure_recovery !== false) {
  errors.push("CP00-149 manifest must not execute failure recovery");
}
if (cp149PackageManifest.no_write_attestation?.emits_blocked_claim_receipt !== false) {
  errors.push("CP00-149 manifest must not emit blocked-claim receipts");
}
if (cp149PackageManifest.no_write_attestation?.writes_failure_fixture !== false) {
  errors.push("CP00-149 manifest must not write failure fixtures");
}
if (cp149PackageManifest.no_write_attestation?.executes_failure_unit_test !== false) {
  errors.push("CP00-149 manifest must not execute failure unit tests");
}
if (cp149PackageManifest.no_write_attestation?.executes_failure_integration_smoke !== false) {
  errors.push("CP00-149 manifest must not execute failure integration smoke tests");
}
if (cp149PackageManifest.no_write_attestation?.emits_audit_failure_hint !== false) {
  errors.push("CP00-149 manifest must not emit audit failure hints");
}
if (cp149PackageManifest.no_write_attestation?.emits_hermes_failure_evidence !== false) {
  errors.push("CP00-149 manifest must not emit Hermes failure evidence");
}
if (cp149PackageManifest.no_write_attestation?.materializes_claude_edge_case_prompt !== false) {
  errors.push("CP00-149 manifest must not materialize Claude edge-case prompts");
}
if (cp149PackageManifest.no_write_attestation?.records_human_escalation_note !== false) {
  errors.push("CP00-149 manifest must not record human escalation notes");
}
if (cp149PackageManifest.no_write_attestation?.executes_human_escalation !== false) {
  errors.push("CP00-149 manifest must not execute human escalation");
}
if (cp149PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-149 manifest must not send Claude prompts");
if (cp149Hermes.evidence_id !== "H03.CP00-149.audit_compliance_failure_workflow_continuation") {
  errors.push("CP00-149 Hermes evidence id mismatch");
}
if (cp149Claude.review_id !== "C03.CP00-149.audit_compliance_failure_workflow_continuation") {
  errors.push("CP00-149 Claude review id mismatch");
}
if (cp149Claude.executes_review !== false || cp149Claude.sends_claude_prompt !== false) {
  errors.push("CP00-149 Claude packet must not execute or send review");
}
if (cp149Handoff.to_pack_id !== "CP00-150") errors.push("CP00-149 handoff target must be CP00-150");
if (cp149Handoff.next_subphase_id !== "RP03.P07.M05.S21") errors.push("CP00-149 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  missing_actor: cp149MissingActorCase,
  permission_denied: cp149PermissionDeniedCase,
  lock_conflict: cp149LockConflictCase,
  claude_prompt: cp149ClaudePromptCase,
  permission_audit_taxonomy: cp149PermissionAuditTaxonomyCase,
  permission_audit_hermes: cp149PermissionAuditHermesCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-149 ${label} case must be no-write`);
  }
  if (result.executes_permission_decision !== false || result.executes_tenant_boundary_check !== false) {
    errors.push(`CP00-149 ${label} case must not execute permission or tenant boundary behavior`);
  }
  if (result.evaluates_failure_taxonomy !== false || result.evaluates_permission_audit_binding !== false || result.executes_failure_recovery !== false) {
    errors.push(`CP00-149 ${label} case must not evaluate taxonomy, permission/audit binding, or recovery`);
  }
  if (result.throws_failure !== false || result.executes_retry_exhaustion !== false || result.executes_rollback_expectation !== false || result.executes_compensation !== false) {
    errors.push(`CP00-149 ${label} case must not throw failure, retry, rollback, or compensate`);
  }
  if (result.emits_blocked_claim_receipt !== false || result.emits_hermes_failure_evidence !== false || result.emits_audit_failure_hint !== false) {
    errors.push(`CP00-149 ${label} case must not emit blocked-claim, Hermes failure, or audit failure evidence`);
  }
  if (result.writes_failure_fixture !== false || result.executes_failure_unit_test !== false || result.executes_failure_integration_smoke !== false) {
    errors.push(`CP00-149 ${label} case must not write failure fixture or execute failure tests`);
  }
  if (result.materializes_claude_edge_case_prompt !== false || result.records_human_escalation_note !== false || result.executes_human_escalation !== false) {
    errors.push(`CP00-149 ${label} case must not materialize Claude prompts or execute human escalation`);
  }
  if (result.loads_fixture_payload !== false || result.materializes_failure_case_payload !== false || result.materializes_fixture_manifest !== false) {
    errors.push(`CP00-149 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-149 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-149 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-149 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false || result.hidden_field_names_exposed !== false) {
    errors.push(`CP00-149 ${label} case must not expose unauthorized counts, object names, or hidden field names`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-149 ${label} case must not implement LDIP or split HRX`);
  }
}
for (const row of cp149Catalog) {
  const result = runAuditComplianceCp149FailureWorkflowContinuationCase(row.case_id);
  if (result.appends_audit_event !== false || result.writes_product_state !== false || result.evaluates_failure_taxonomy !== false) {
    errors.push(`CP00-149 catalog row ${row.catalog_id} must be no-write and no taxonomy evaluation`);
  }
  if (result.evaluates_permission_audit_binding !== false || result.executes_failure_recovery !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-149 catalog row ${row.catalog_id} must not evaluate binding, execute recovery, or send Claude prompt`);
  }
  if (result.emits_blocked_claim_receipt !== false || result.emits_hermes_failure_evidence !== false || result.emits_audit_failure_hint !== false) {
    errors.push(`CP00-149 catalog row ${row.catalog_id} must not emit failure evidence`);
  }
}

if (cp150CoveredUnits.length !== 10) errors.push(`CP00-150 covered unit count must be 10, got ${cp150CoveredUnits.length}`);
if (cp150CoveredUnits[0] !== "RP03.P07.M05.S21") errors.push("CP00-150 first unit mismatch");
if (cp150CoveredUnits.at(-1) !== "RP03.P07.M06.S08") errors.push("CP00-150 last unit mismatch");
if (new Set(cp150CoveredUnits).size !== cp150CoveredUnits.length) errors.push("CP00-150 covered units must be unique");
if (cp150Catalog.length !== 10) errors.push(`CP00-150 catalog length must be 10, got ${cp150Catalog.length}`);
if (cp150Readiness.deliverable_counts?.claude_review !== 1) errors.push("CP00-150 Claude review count must be 1");
if (cp150Readiness.deliverable_counts?.implementation !== 1) errors.push("CP00-150 implementation count must be 1");
if (cp150Readiness.deliverable_counts?.failure_recovery !== 7) errors.push("CP00-150 failure recovery count must be 7");
if (cp150Readiness.deliverable_counts?.security_audit !== 1) errors.push("CP00-150 security audit count must be 1");
if (cp150Readiness.evidence_mode_counts?.permission_audit_sensitive_terminal_boundary !== 2) {
  errors.push("CP00-150 permission/audit sensitive terminal mode count must be 2");
}
if (cp150Readiness.evidence_mode_counts?.synthetic_fixture_failure_opening_boundary !== 8) {
  errors.push("CP00-150 synthetic fixture failure opening mode count must be 8");
}
if (cp150Readiness.permission_audit_sensitive_terminal_declared !== true) {
  errors.push("CP00-150 permission/audit sensitive terminal must be declared");
}
if (cp150Readiness.synthetic_fixture_failure_opening_declared !== true) {
  errors.push("CP00-150 synthetic fixture failure opening must be declared");
}
if (cp150Readiness.sensitive_failure_taxonomy_boundary_declared !== true) {
  errors.push("CP00-150 failure taxonomy boundary must be declared");
}
if (cp150Readiness.missing_context_failure_boundaries_declared !== true) {
  errors.push("CP00-150 missing context failure boundaries must be declared");
}
if (cp150Readiness.cross_tenant_permission_denied_boundaries_declared !== true) {
  errors.push("CP00-150 cross-tenant and permission denied boundaries must be declared");
}
if (cp150Readiness.fixture_payload_non_materialization_declared !== true) {
  errors.push("CP00-150 fixture payload non-materialization must be declared");
}
if (cp150Readiness.claude_edge_case_prompt_boundary_declared !== true) {
  errors.push("CP00-150 Claude prompt boundary must be declared");
}
if (cp150Readiness.human_escalation_note_boundary_declared !== true) {
  errors.push("CP00-150 human escalation boundary must be declared");
}
if (cp150Readiness.hidden_field_policy_declared !== true) errors.push("CP00-150 hidden field policy must be declared");
if (cp150PackageManifest.production_ready_flag !== "audit_compliance_failure_fixture_sensitive_boundary_verified") {
  errors.push("CP00-150 production flag mismatch");
}
if (cp150PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-150 manifest must not append audit events");
if (cp150PackageManifest.no_write_attestation?.loads_fixture_payload !== false) errors.push("CP00-150 manifest must not load fixture payloads");
if (cp150PackageManifest.no_write_attestation?.materializes_fixture_manifest !== false) {
  errors.push("CP00-150 manifest must not materialize fixture manifests");
}
if (cp150PackageManifest.no_write_attestation?.materializes_failure_case_payload !== false) {
  errors.push("CP00-150 manifest must not materialize failure case payloads");
}
if (cp150PackageManifest.no_write_attestation?.evaluates_failure_taxonomy !== false) {
  errors.push("CP00-150 manifest must not evaluate failure taxonomy");
}
if (cp150PackageManifest.no_write_attestation?.evaluates_permission_audit_binding !== false) {
  errors.push("CP00-150 manifest must not evaluate permission/audit binding");
}
if (cp150PackageManifest.no_write_attestation?.executes_failure_recovery !== false) {
  errors.push("CP00-150 manifest must not execute failure recovery");
}
if (cp150PackageManifest.no_write_attestation?.materializes_claude_edge_case_prompt !== false) {
  errors.push("CP00-150 manifest must not materialize Claude prompts");
}
if (cp150PackageManifest.no_write_attestation?.records_human_escalation_note !== false) {
  errors.push("CP00-150 manifest must not record human escalation notes");
}
if (cp150PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-150 manifest must not send Claude prompts");
if (cp150Hermes.evidence_id !== "H03.CP00-150.audit_compliance_failure_fixture_sensitive_boundary") {
  errors.push("CP00-150 Hermes evidence id mismatch");
}
if (cp150Claude.review_id !== "C03.CP00-150.audit_compliance_failure_fixture_sensitive_boundary") {
  errors.push("CP00-150 Claude review id mismatch");
}
if (cp150Claude.executes_review !== false || cp150Claude.sends_claude_prompt !== false) {
  errors.push("CP00-150 Claude packet must not execute or send review");
}
if (cp150Handoff.to_pack_id !== "CP00-151") errors.push("CP00-150 handoff target must be CP00-151");
if (cp150Handoff.next_subphase_id !== "RP03.P07.M06.S09") errors.push("CP00-150 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  claude_prompt: cp150ClaudePromptCase,
  human_escalation: cp150HumanEscalationCase,
  failure_taxonomy: cp150FailureTaxonomyCase,
  cross_tenant: cp150CrossTenantCase,
  permission_denied: cp150PermissionDeniedCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-150 ${label} case must be no-write`);
  }
  if (result.loads_fixture_payload !== false || result.materializes_fixture_manifest !== false || result.materializes_failure_case_payload !== false) {
    errors.push(`CP00-150 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.evaluates_failure_taxonomy !== false || result.evaluates_permission_audit_binding !== false || result.executes_failure_recovery !== false) {
    errors.push(`CP00-150 ${label} case must not evaluate taxonomy, binding, or recovery`);
  }
  if (result.materializes_claude_edge_case_prompt !== false || result.records_human_escalation_note !== false || result.executes_human_escalation !== false) {
    errors.push(`CP00-150 ${label} case must not materialize Claude prompts or execute human escalation`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false) {
    errors.push(`CP00-150 ${label} case must not execute API or network behavior`);
  }
  if (result.renders_ui !== false || result.mutates_dom !== false || result.executes_ui_interaction !== false) {
    errors.push(`CP00-150 ${label} case must not render, mutate DOM, or execute UI interactions`);
  }
  if (result.executes_claude_review !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-150 ${label} case must not execute or send Claude prompt`);
  }
  if (result.unauthorized_count_exposed !== false || result.unauthorized_object_name_exposed !== false || result.hidden_field_names_exposed !== false) {
    errors.push(`CP00-150 ${label} case must not expose unauthorized counts, object names, or hidden field names`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-150 ${label} case must not implement LDIP or split HRX`);
  }
}
for (const row of cp150Catalog) {
  const result = runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase(row.case_id);
  if (result.appends_audit_event !== false || result.writes_product_state !== false || result.loads_fixture_payload !== false) {
    errors.push(`CP00-150 catalog row ${row.catalog_id} must be no-write and no fixture payload load`);
  }
  if (result.materializes_fixture_manifest !== false || result.materializes_failure_case_payload !== false) {
    errors.push(`CP00-150 catalog row ${row.catalog_id} must not materialize fixture or failure payloads`);
  }
  if (result.evaluates_failure_taxonomy !== false || result.evaluates_permission_audit_binding !== false || result.executes_failure_recovery !== false) {
    errors.push(`CP00-150 catalog row ${row.catalog_id} must not evaluate taxonomy, binding, or recovery`);
  }
  if (result.materializes_claude_edge_case_prompt !== false || result.records_human_escalation_note !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-150 catalog row ${row.catalog_id} must not materialize prompt, record escalation, or send Claude prompt`);
  }
}

if (cp151CoveredUnits.length !== 150) errors.push(`CP00-151 covered unit count must be 150, got ${cp151CoveredUnits.length}`);
if (cp151CoveredUnits[0] !== "RP03.P07.M06.S09") errors.push("CP00-151 first unit mismatch");
if (cp151CoveredUnits.at(-1) !== "RP03.P08.M04.S19") errors.push("CP00-151 last unit mismatch");
if (new Set(cp151CoveredUnits).size !== cp151CoveredUnits.length) errors.push("CP00-151 covered units must be unique");
if (cp151Catalog.length !== 150) errors.push(`CP00-151 catalog length must be 150, got ${cp151Catalog.length}`);
if (cp151Readiness.deliverable_counts?.failure_recovery !== 51) errors.push("CP00-151 failure recovery count must be 51");
if (cp151Readiness.deliverable_counts?.implementation !== 24) errors.push("CP00-151 implementation count must be 24");
if (cp151Readiness.deliverable_counts?.hermes_evidence !== 48) errors.push("CP00-151 Hermes evidence count must be 48");
if (cp151Readiness.deliverable_counts?.fixture !== 4) errors.push("CP00-151 fixture count must be 4");
if (cp151Readiness.deliverable_counts?.test !== 10) errors.push("CP00-151 test count must be 10");
if (cp151Readiness.deliverable_counts?.security_audit !== 8) errors.push("CP00-151 security audit count must be 8");
if (cp151Readiness.deliverable_counts?.claude_review !== 5) errors.push("CP00-151 Claude review count must be 5");
if (cp151Readiness.evidence_mode_counts?.synthetic_fixture_failure_continuation_reference !== 14) {
  errors.push("CP00-151 synthetic fixture failure continuation count must be 14");
}
if (cp151Readiness.evidence_mode_counts?.failure_test_golden_case_reference !== 22) {
  errors.push("CP00-151 failure test golden case count must be 22");
}
if (cp151Readiness.evidence_mode_counts?.failure_hermes_evidence_packet_reference !== 22) {
  errors.push("CP00-151 failure Hermes evidence packet count must be 22");
}
if (cp151Readiness.evidence_mode_counts?.failure_claude_review_packet_reference !== 20) {
  errors.push("CP00-151 failure Claude review packet count must be 20");
}
if (cp151Readiness.evidence_mode_counts?.failure_closeout_handoff_reference !== 11) {
  errors.push("CP00-151 failure closeout handoff count must be 11");
}
if (cp151Readiness.evidence_mode_counts?.evidence_scope_inventory_reference !== 4) {
  errors.push("CP00-151 evidence scope inventory count must be 4");
}
if (cp151Readiness.evidence_mode_counts?.evidence_contract_draft_reference !== 8) {
  errors.push("CP00-151 evidence contract draft count must be 8");
}
if (cp151Readiness.evidence_mode_counts?.evidence_type_shape_reference !== 8) {
  errors.push("CP00-151 evidence type shape count must be 8");
}
if (cp151Readiness.evidence_mode_counts?.evidence_primary_implementation_reference !== 22) {
  errors.push("CP00-151 evidence primary implementation count must be 22");
}
if (cp151Readiness.evidence_mode_counts?.evidence_secondary_workflow_reference !== 19) {
  errors.push("CP00-151 evidence secondary workflow count must be 19");
}
if (cp151Readiness.failure_continuation_declared !== true) errors.push("CP00-151 failure continuation must be declared");
if (cp151Readiness.failure_review_closeout_declared !== true) errors.push("CP00-151 failure review closeout must be declared");
if (cp151Readiness.hermes_evidence_scope_contract_declared !== true) {
  errors.push("CP00-151 Hermes evidence scope/contract must be declared");
}
if (cp151Readiness.hermes_evidence_primary_secondary_declared !== true) {
  errors.push("CP00-151 Hermes evidence primary/secondary must be declared");
}
if (cp151Readiness.failure_taxonomy_descriptor_declared !== true) errors.push("CP00-151 failure taxonomy descriptors must be declared");
if (cp151Readiness.failure_fixture_test_boundary_declared !== true) errors.push("CP00-151 failure fixture/test boundary must be declared");
if (cp151Readiness.failure_evidence_receipt_boundary_declared !== true) {
  errors.push("CP00-151 failure evidence receipt boundary must be declared");
}
if (cp151Readiness.verdict_semantics_declared !== true) errors.push("CP00-151 verdict semantics must be declared");
if (cp151Readiness.claude_and_human_marker_boundaries_declared !== true) {
  errors.push("CP00-151 Claude and human marker boundaries must be declared");
}
if (cp151Readiness.hidden_field_policy_declared !== true) errors.push("CP00-151 hidden field policy must be declared");
if (cp151PackageManifest.production_ready_flag !== "audit_compliance_failure_evidence_continuation_verified") {
  errors.push("CP00-151 production flag mismatch");
}
if (cp151PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-151 manifest must not append audit events");
if (cp151PackageManifest.no_write_attestation?.executes_hermes_command !== false) errors.push("CP00-151 manifest must not execute Hermes commands");
if (cp151PackageManifest.no_write_attestation?.loads_fixture_payload !== false) errors.push("CP00-151 manifest must not load fixture payloads");
if (cp151PackageManifest.no_write_attestation?.materializes_evidence_template !== false) {
  errors.push("CP00-151 manifest must not materialize evidence templates");
}
if (cp151PackageManifest.no_write_attestation?.evaluates_failure_taxonomy !== false) {
  errors.push("CP00-151 manifest must not evaluate failure taxonomy");
}
if (cp151PackageManifest.no_write_attestation?.executes_failure_recovery !== false) {
  errors.push("CP00-151 manifest must not execute failure recovery");
}
if (cp151PackageManifest.no_write_attestation?.emits_blocked_claim_receipt !== false) {
  errors.push("CP00-151 manifest must not emit blocked claim receipts");
}
if (cp151PackageManifest.no_write_attestation?.emits_hermes_failure_evidence !== false) {
  errors.push("CP00-151 manifest must not emit Hermes failure evidence");
}
if (cp151PackageManifest.no_write_attestation?.emits_command_result_receipt !== false) {
  errors.push("CP00-151 manifest must not emit command result receipts");
}
if (cp151PackageManifest.no_write_attestation?.materializes_claude_edge_case_prompt !== false) {
  errors.push("CP00-151 manifest must not materialize Claude prompts");
}
if (cp151PackageManifest.no_write_attestation?.records_human_approval_marker !== false) {
  errors.push("CP00-151 manifest must not record human approval markers");
}
if (cp151PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-151 manifest must not send Claude prompts");
if (cp151Hermes.evidence_id !== "H03.CP00-151.audit_compliance_failure_evidence_continuation") {
  errors.push("CP00-151 Hermes evidence id mismatch");
}
if (cp151Claude.review_id !== "C03.CP00-151.audit_compliance_failure_evidence_continuation") {
  errors.push("CP00-151 Claude review id mismatch");
}
if (cp151Claude.executes_review !== false || cp151Claude.sends_claude_prompt !== false) {
  errors.push("CP00-151 Claude packet must not execute or send review");
}
if (cp151Handoff.to_pack_id !== "CP00-152") errors.push("CP00-151 handoff target must be CP00-152");
if (cp151Handoff.next_subphase_id !== "RP03.P08.M04.S20") errors.push("CP00-151 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  ambiguous_rule: cp151AmbiguousRuleCase,
  blocked_claim: cp151BlockedClaimCase,
  hermes_failure: cp151HermesFailureCase,
  command_matrix: cp151CommandMatrixCase,
  pass_semantics: cp151PassSemanticsCase,
  regression: cp151RegressionCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-151 ${label} case must be no-write`);
  }
  if (result.executes_hermes_command !== false || result.writes_hermes_runtime !== false) {
    errors.push(`CP00-151 ${label} case must not execute Hermes command/runtime behavior`);
  }
  if (result.evaluates_failure_taxonomy !== false || result.executes_failure_recovery !== false) {
    errors.push(`CP00-151 ${label} case must not evaluate taxonomy or execute recovery`);
  }
  if (result.emits_blocked_claim_receipt !== false || result.emits_hermes_failure_evidence !== false || result.emits_command_result_receipt !== false) {
    errors.push(`CP00-151 ${label} case must not emit receipts or Hermes evidence`);
  }
  if (result.materializes_evidence_template !== false || result.materializes_claude_edge_case_prompt !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-151 ${label} case must not materialize evidence/prompt or send Claude prompt`);
  }
  if (result.loads_fixture_payload !== false || result.materializes_fixture_manifest !== false || result.materializes_failure_case_payload !== false) {
    errors.push(`CP00-151 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false || result.renders_ui !== false) {
    errors.push(`CP00-151 ${label} case must not execute API, network, or UI behavior`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-151 ${label} case must not implement LDIP or split HRX`);
  }
}
for (const row of cp151Catalog) {
  const result = runAuditComplianceCp151FailureEvidenceContinuationCase(row.case_id);
  if (result.appends_audit_event !== false || result.writes_product_state !== false || result.executes_hermes_command !== false) {
    errors.push(`CP00-151 catalog row ${row.catalog_id} must be no-write and no Hermes command execution`);
  }
  if (result.evaluates_failure_taxonomy !== false || result.executes_failure_recovery !== false || result.emits_hermes_failure_evidence !== false) {
    errors.push(`CP00-151 catalog row ${row.catalog_id} must not evaluate failure behavior or emit Hermes evidence`);
  }
  if (result.emits_command_result_receipt !== false || result.materializes_evidence_template !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-151 catalog row ${row.catalog_id} must not emit command receipts, materialize templates, or send Claude prompt`);
  }
}

if (cp152CoveredUnits.length !== 40) errors.push(`CP00-152 covered unit count must be 40, got ${cp152CoveredUnits.length}`);
if (cp152CoveredUnits[0] !== "RP03.P08.M04.S20") errors.push("CP00-152 first unit mismatch");
if (cp152CoveredUnits.at(-1) !== "RP03.P08.M06.S17") errors.push("CP00-152 last unit mismatch");
if (new Set(cp152CoveredUnits).size !== cp152CoveredUnits.length) errors.push("CP00-152 covered units must be unique");
if (cp152Catalog.length !== 40) errors.push(`CP00-152 catalog length must be 40, got ${cp152Catalog.length}`);
if (cp152Readiness.deliverable_counts?.implementation !== 17) errors.push("CP00-152 implementation count must be 17");
if (cp152Readiness.deliverable_counts?.hermes_evidence !== 20) errors.push("CP00-152 Hermes evidence count must be 20");
if (cp152Readiness.deliverable_counts?.claude_review !== 2) errors.push("CP00-152 Claude review count must be 2");
if (cp152Readiness.deliverable_counts?.test !== 1) errors.push("CP00-152 test count must be 1");
if (cp152Readiness.evidence_mode_counts?.evidence_secondary_workflow_terminal_reference !== 1) {
  errors.push("CP00-152 secondary workflow terminal count must be 1");
}
if (cp152Readiness.evidence_mode_counts?.evidence_permission_audit_binding_reference !== 22) {
  errors.push("CP00-152 permission/audit binding count must be 22");
}
if (cp152Readiness.evidence_mode_counts?.evidence_synthetic_fixture_opening_reference !== 17) {
  errors.push("CP00-152 synthetic fixture opening count must be 17");
}
if (cp152Readiness.cp151_handoff_inherited !== true) errors.push("CP00-152 CP151 handoff must be inherited");
if (cp152Readiness.cp153_handoff_declared !== true) errors.push("CP00-152 CP153 handoff must be declared");
if (cp152Readiness.h03_gate_bound !== true) errors.push("CP00-152 H03 gate must be bound");
if (cp152Readiness.c03_gate_bound !== true) errors.push("CP00-152 C03 gate must be bound");
if (cp152Readiness.secondary_workflow_terminal_declared !== true) {
  errors.push("CP00-152 secondary workflow terminal must be declared");
}
if (cp152Readiness.permission_audit_binding_declared !== true) {
  errors.push("CP00-152 permission/audit evidence binding must be declared");
}
if (cp152Readiness.synthetic_fixture_opening_declared !== true) {
  errors.push("CP00-152 synthetic fixture opening must be declared");
}
if (cp152Readiness.hermes_evidence_receipt_boundary_declared !== true) {
  errors.push("CP00-152 Hermes receipt boundary must be declared");
}
if (cp152Readiness.verdict_semantics_declared !== true) errors.push("CP00-152 verdict semantics must be declared");
if (cp152Readiness.validation_and_regression_boundaries_declared !== true) {
  errors.push("CP00-152 validation/regression boundaries must be declared");
}
if (cp152Readiness.claude_and_human_marker_boundaries_declared !== true) {
  errors.push("CP00-152 Claude and human marker boundaries must be declared");
}
if (cp152Readiness.no_fixture_materialization_declared !== true) {
  errors.push("CP00-152 fixture materialization block must be declared");
}
if (cp152Readiness.hidden_field_policy_declared !== true) errors.push("CP00-152 hidden field policy must be declared");
if (cp152PackageManifest.production_ready_flag !== "audit_compliance_evidence_workflow_fixture_verified") {
  errors.push("CP00-152 production flag mismatch");
}
if (cp152PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-152 manifest must not append audit events");
if (cp152PackageManifest.no_write_attestation?.executes_hermes_command !== false) errors.push("CP00-152 manifest must not execute Hermes commands");
if (cp152PackageManifest.no_write_attestation?.loads_fixture_payload !== false) errors.push("CP00-152 manifest must not load fixture payloads");
if (cp152PackageManifest.no_write_attestation?.materializes_evidence_template !== false) {
  errors.push("CP00-152 manifest must not materialize evidence templates");
}
if (cp152PackageManifest.no_write_attestation?.evaluates_permission_audit_binding !== false) {
  errors.push("CP00-152 manifest must not evaluate permission/audit binding");
}
if (cp152PackageManifest.no_write_attestation?.emits_command_result_receipt !== false) {
  errors.push("CP00-152 manifest must not emit command result receipts");
}
if (cp152PackageManifest.no_write_attestation?.records_human_approval_marker !== false) {
  errors.push("CP00-152 manifest must not record human approval markers");
}
if (cp152PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-152 manifest must not send Claude prompts");
if (cp152Hermes.evidence_id !== "H03.CP00-152.audit_compliance_evidence_workflow_fixture") {
  errors.push("CP00-152 Hermes evidence id mismatch");
}
if (cp152Claude.review_id !== "C03.CP00-152.audit_compliance_evidence_workflow_fixture") {
  errors.push("CP00-152 Claude review id mismatch");
}
if (cp152Claude.executes_review !== false || cp152Claude.sends_claude_prompt !== false) {
  errors.push("CP00-152 Claude packet must not execute or send review");
}
if (cp152Handoff.to_pack_id !== "CP00-153") errors.push("CP00-152 handoff target must be CP00-153");
if (cp152Handoff.next_subphase_id !== "RP03.P08.M06.S18") errors.push("CP00-152 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  next_gate: cp152NextGateCase,
  permission_summary: cp152PermissionSummaryCase,
  synthetic_command: cp152SyntheticCommandCase,
  validation: cp152ValidationCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-152 ${label} case must be no-write`);
  }
  if (result.executes_hermes_command !== false || result.writes_hermes_runtime !== false) {
    errors.push(`CP00-152 ${label} case must not execute Hermes command/runtime behavior`);
  }
  if (result.evaluates_permission_audit_binding !== false || result.executes_failure_recovery !== false) {
    errors.push(`CP00-152 ${label} case must not evaluate binding or execute recovery`);
  }
  if (
    result.emits_command_result_receipt !== false ||
    result.emits_changed_file_receipt !== false ||
    result.emits_fixture_summary_receipt !== false ||
    result.emits_permission_summary_receipt !== false ||
    result.emits_audit_summary_receipt !== false
  ) {
    errors.push(`CP00-152 ${label} case must not emit evidence receipts`);
  }
  if (result.materializes_evidence_template !== false || result.records_human_approval_marker !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-152 ${label} case must not materialize evidence, record approval, or send Claude prompt`);
  }
  if (result.loads_fixture_payload !== false || result.materializes_fixture_manifest !== false) {
    errors.push(`CP00-152 ${label} case must not load or materialize fixture payloads`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false || result.renders_ui !== false) {
    errors.push(`CP00-152 ${label} case must not execute API, network, or UI behavior`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-152 ${label} case must not implement LDIP or split HRX`);
  }
}
for (const row of cp152Catalog) {
  const result = runAuditComplianceCp152EvidenceWorkflowFixtureCase(row.case_id);
  if (result.appends_audit_event !== false || result.writes_product_state !== false || result.executes_hermes_command !== false) {
    errors.push(`CP00-152 catalog row ${row.catalog_id} must be no-write and no Hermes command execution`);
  }
  if (result.evaluates_permission_audit_binding !== false || result.emits_command_result_receipt !== false) {
    errors.push(`CP00-152 catalog row ${row.catalog_id} must not evaluate binding or emit command receipts`);
  }
  if (result.materializes_evidence_template !== false || result.loads_fixture_payload !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-152 catalog row ${row.catalog_id} must not materialize evidence, load fixtures, or send Claude prompt`);
  }
}

if (cp153CoveredUnits.length !== 150) errors.push(`CP00-153 covered unit count must be 150, got ${cp153CoveredUnits.length}`);
if (cp153CoveredUnits[0] !== "RP03.P08.M06.S18") errors.push("CP00-153 first unit mismatch");
if (cp153CoveredUnits.at(-1) !== "RP03.P09.M07.S02") errors.push("CP00-153 last unit mismatch");
if (new Set(cp153CoveredUnits).size !== cp153CoveredUnits.length) errors.push("CP00-153 covered units must be unique");
if (cp153Catalog.length !== 150) errors.push(`CP00-153 catalog length must be 150, got ${cp153Catalog.length}`);
if (cp153Readiness.deliverable_counts?.implementation !== 63) errors.push("CP00-153 implementation count must be 63");
if (cp153Readiness.deliverable_counts?.test !== 9) errors.push("CP00-153 test count must be 9");
if (cp153Readiness.deliverable_counts?.hermes_evidence !== 38) errors.push("CP00-153 Hermes evidence count must be 38");
if (cp153Readiness.deliverable_counts?.claude_review !== 21) errors.push("CP00-153 Claude review count must be 21");
if (cp153Readiness.deliverable_counts?.security_audit !== 14) errors.push("CP00-153 security audit count must be 14");
if (cp153Readiness.deliverable_counts?.ui !== 5) errors.push("CP00-153 UI count must be 5");
if (cp153Readiness.evidence_mode_counts?.evidence_synthetic_fixture_terminal_reference !== 3) {
  errors.push("CP00-153 synthetic fixture terminal count must be 3");
}
if (cp153Readiness.evidence_mode_counts?.evidence_test_golden_case_reference !== 22) {
  errors.push("CP00-153 evidence test/golden count must be 22");
}
if (cp153Readiness.evidence_mode_counts?.evidence_hermes_packet_reference !== 20) {
  errors.push("CP00-153 Hermes packet count must be 20");
}
if (cp153Readiness.evidence_mode_counts?.evidence_claude_review_packet_reference !== 20) {
  errors.push("CP00-153 Claude packet count must be 20");
}
if (cp153Readiness.evidence_mode_counts?.evidence_closeout_handoff_reference !== 8) {
  errors.push("CP00-153 evidence closeout handoff count must be 8");
}
if (cp153Readiness.evidence_mode_counts?.review_scope_inventory_reference !== 4) {
  errors.push("CP00-153 review scope inventory count must be 4");
}
if (cp153Readiness.evidence_mode_counts?.review_contract_draft_reference !== 4) {
  errors.push("CP00-153 review contract draft count must be 4");
}
if (cp153Readiness.evidence_mode_counts?.review_type_shape_reference !== 8) {
  errors.push("CP00-153 review type shape count must be 8");
}
if (cp153Readiness.evidence_mode_counts?.review_primary_implementation_reference !== 20) {
  errors.push("CP00-153 review primary implementation count must be 20");
}
if (cp153Readiness.evidence_mode_counts?.review_secondary_workflow_reference !== 11) {
  errors.push("CP00-153 review secondary workflow count must be 11");
}
if (cp153Readiness.evidence_mode_counts?.review_permission_audit_binding_reference !== 20) {
  errors.push("CP00-153 review permission/audit binding count must be 20");
}
if (cp153Readiness.evidence_mode_counts?.review_synthetic_fixture_reference !== 8) {
  errors.push("CP00-153 review synthetic fixture count must be 8");
}
if (cp153Readiness.evidence_mode_counts?.review_test_golden_case_opening_reference !== 2) {
  errors.push("CP00-153 review test/golden opening count must be 2");
}
if (cp153Readiness.cp152_handoff_inherited !== true) errors.push("CP00-153 CP152 handoff must be inherited");
if (cp153Readiness.cp154_handoff_declared !== true) errors.push("CP00-153 CP154 handoff must be declared");
if (cp153Readiness.h03_gate_bound !== true) errors.push("CP00-153 H03 gate must be bound");
if (cp153Readiness.c03_gate_bound !== true) errors.push("CP00-153 C03 gate must be bound");
if (cp153Readiness.p08_evidence_terminal_declared !== true) errors.push("CP00-153 P08 evidence terminal must be declared");
if (cp153Readiness.p09_review_question_opening_declared !== true) errors.push("CP00-153 P09 review opening must be declared");
if (cp153Readiness.deliverable_distribution_declared !== true) errors.push("CP00-153 deliverable distribution must be declared");
if (cp153Readiness.review_question_boundaries_declared !== true) errors.push("CP00-153 review question boundaries must be declared");
if (cp153Readiness.closeout_verdict_boundaries_declared !== true) errors.push("CP00-153 closeout verdict boundaries must be declared");
if (cp153Readiness.no_review_or_evidence_execution_declared !== true) {
  errors.push("CP00-153 no-review/no-evidence execution boundary must be declared");
}
if (cp153Readiness.hidden_field_policy_declared !== true) errors.push("CP00-153 hidden field policy must be declared");
if (cp153PackageManifest.production_ready_flag !== "audit_compliance_review_closeout_continuation_verified") {
  errors.push("CP00-153 production flag mismatch");
}
if (cp153PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-153 manifest must not append audit events");
if (cp153PackageManifest.no_write_attestation?.executes_hermes_command !== false) errors.push("CP00-153 manifest must not execute Hermes commands");
if (cp153PackageManifest.no_write_attestation?.executes_architecture_review !== false) {
  errors.push("CP00-153 manifest must not execute architecture review");
}
if (cp153PackageManifest.no_write_attestation?.executes_security_review !== false) {
  errors.push("CP00-153 manifest must not execute security review");
}
if (cp153PackageManifest.no_write_attestation?.evaluates_permission_bypass !== false) {
  errors.push("CP00-153 manifest must not evaluate permission bypass");
}
if (cp153PackageManifest.no_write_attestation?.evaluates_audit_completeness !== false) {
  errors.push("CP00-153 manifest must not evaluate audit completeness");
}
if (cp153PackageManifest.no_write_attestation?.materializes_review_packet !== false) {
  errors.push("CP00-153 manifest must not materialize review packets");
}
if (cp153PackageManifest.no_write_attestation?.materializes_closeout_verdict !== false) {
  errors.push("CP00-153 manifest must not materialize closeout verdicts");
}
if (cp153PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-153 manifest must not send Claude prompts");
if (cp153Hermes.evidence_id !== "H03.CP00-153.audit_compliance_review_closeout_continuation") {
  errors.push("CP00-153 Hermes evidence id mismatch");
}
if (cp153Claude.review_id !== "C03.CP00-153.audit_compliance_review_closeout_continuation") {
  errors.push("CP00-153 Claude review id mismatch");
}
if (cp153Claude.executes_review !== false || cp153Claude.sends_claude_prompt !== false) {
  errors.push("CP00-153 Claude packet must not execute or send review");
}
if (cp153Handoff.to_pack_id !== "CP00-154") errors.push("CP00-153 handoff target must be CP00-154");
if (cp153Handoff.next_subphase_id !== "RP03.P09.M07.S03") errors.push("CP00-153 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  evidence_handoff: cp153EvidenceHandoffCase,
  hermes_command: cp153HermesCommandCase,
  review_architecture: cp153ReviewArchitectureCase,
  permission_bypass: cp153PermissionBypassCase,
  finding_routing: cp153FindingRoutingCase,
  golden_opening: cp153GoldenOpeningCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-153 ${label} case must be no-write`);
  }
  if (result.executes_hermes_command !== false || result.writes_hermes_runtime !== false || result.emits_hermes_evidence !== false) {
    errors.push(`CP00-153 ${label} case must not execute Hermes command/runtime or emit Hermes evidence`);
  }
  if (result.executes_architecture_review !== false || result.executes_security_review !== false || result.executes_claude_review !== false) {
    errors.push(`CP00-153 ${label} case must not execute review behavior`);
  }
  if (result.evaluates_permission_bypass !== false || result.evaluates_audit_completeness !== false) {
    errors.push(`CP00-153 ${label} case must not evaluate permission bypass or audit completeness`);
  }
  if (result.materializes_review_packet !== false || result.materializes_closeout_verdict !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-153 ${label} case must not materialize review/closeout packets or send Claude prompt`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false || result.renders_ui !== false) {
    errors.push(`CP00-153 ${label} case must not execute API, network, or UI behavior`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-153 ${label} case must not implement LDIP or split HRX`);
  }
}
for (const row of cp153Catalog) {
  const result = runAuditComplianceCp153ReviewCloseoutContinuationCase(row.case_id);
  if (result.appends_audit_event !== false || result.writes_product_state !== false || result.executes_hermes_command !== false) {
    errors.push(`CP00-153 catalog row ${row.catalog_id} must be no-write and no Hermes command execution`);
  }
  if (result.executes_architecture_review !== false || result.executes_security_review !== false || result.executes_claude_review !== false) {
    errors.push(`CP00-153 catalog row ${row.catalog_id} must not execute review behavior`);
  }
  if (result.evaluates_permission_bypass !== false || result.evaluates_audit_completeness !== false || result.emits_hermes_evidence !== false) {
    errors.push(`CP00-153 catalog row ${row.catalog_id} must not evaluate review questions or emit Hermes evidence`);
  }
  if (result.materializes_review_packet !== false || result.materializes_closeout_verdict !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-153 catalog row ${row.catalog_id} must not materialize review/closeout packets or send Claude prompt`);
  }
}

if (cp154CoveredUnits.length !== 10) errors.push(`CP00-154 covered unit count must be 10, got ${cp154CoveredUnits.length}`);
if (cp154CoveredUnits[0] !== "RP03.P09.M07.S03") errors.push("CP00-154 first unit mismatch");
if (cp154CoveredUnits.at(-1) !== "RP03.P09.M07.S12") errors.push("CP00-154 last unit mismatch");
if (new Set(cp154CoveredUnits).size !== cp154CoveredUnits.length) errors.push("CP00-154 covered units must be unique");
if (cp154Catalog.length !== 10) errors.push(`CP00-154 catalog length must be 10, got ${cp154Catalog.length}`);
if (cp154Readiness.deliverable_counts?.security_audit !== 2) errors.push("CP00-154 security audit count must be 2");
if (cp154Readiness.deliverable_counts?.test !== 1) errors.push("CP00-154 test count must be 1");
if (cp154Readiness.deliverable_counts?.ui !== 1) errors.push("CP00-154 UI count must be 1");
if (cp154Readiness.deliverable_counts?.implementation !== 6) errors.push("CP00-154 implementation count must be 6");
if (cp154Readiness.evidence_mode_counts?.review_test_golden_case_sensitive_boundary !== 10) {
  errors.push("CP00-154 sensitive boundary count must be 10");
}
if (cp154Readiness.cp153_handoff_inherited !== true) errors.push("CP00-154 CP153 handoff must be inherited");
if (cp154Readiness.cp155_handoff_declared !== true) errors.push("CP00-154 CP155 handoff must be declared");
if (cp154Readiness.h03_gate_bound !== true) errors.push("CP00-154 H03 gate must be bound");
if (cp154Readiness.c03_gate_bound !== true) errors.push("CP00-154 C03 gate must be bound");
if (cp154Readiness.sensitive_question_boundaries_declared !== true) {
  errors.push("CP00-154 sensitive question boundaries must be declared");
}
if (cp154Readiness.risk_verdict_routing_boundaries_declared !== true) {
  errors.push("CP00-154 risk/verdict/routing boundaries must be declared");
}
if (cp154Readiness.deliverable_distribution_declared !== true) errors.push("CP00-154 deliverable distribution must be declared");
if (cp154Readiness.domain_distribution_declared !== true) errors.push("CP00-154 domain distribution must be declared");
if (cp154Readiness.no_review_or_sensitive_execution_declared !== true) {
  errors.push("CP00-154 no-review/no-sensitive execution boundary must be declared");
}
if (cp154Readiness.hidden_field_policy_declared !== true) errors.push("CP00-154 hidden field policy must be declared");
if (cp154PackageManifest.production_ready_flag !== "audit_compliance_review_sensitive_boundary_verified") {
  errors.push("CP00-154 production flag mismatch");
}
if (cp154PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-154 manifest must not append audit events");
if (cp154PackageManifest.no_write_attestation?.executes_hermes_command !== false) errors.push("CP00-154 manifest must not execute Hermes commands");
if (cp154PackageManifest.no_write_attestation?.executes_architecture_review !== false) {
  errors.push("CP00-154 manifest must not execute architecture review");
}
if (cp154PackageManifest.no_write_attestation?.executes_security_review !== false) {
  errors.push("CP00-154 manifest must not execute security review");
}
if (cp154PackageManifest.no_write_attestation?.evaluates_permission_bypass !== false) {
  errors.push("CP00-154 manifest must not evaluate permission bypass");
}
if (cp154PackageManifest.no_write_attestation?.evaluates_audit_completeness !== false) {
  errors.push("CP00-154 manifest must not evaluate audit completeness");
}
if (cp154PackageManifest.no_write_attestation?.evaluates_missing_test_gap !== false) {
  errors.push("CP00-154 manifest must not evaluate missing test gaps");
}
if (cp154PackageManifest.no_write_attestation?.evaluates_ui_leak !== false) {
  errors.push("CP00-154 manifest must not evaluate UI leaks");
}
if (cp154PackageManifest.no_write_attestation?.materializes_risk_register !== false) {
  errors.push("CP00-154 manifest must not materialize risk registers");
}
if (cp154PackageManifest.no_write_attestation?.materializes_go_no_go_verdict !== false) {
  errors.push("CP00-154 manifest must not materialize go/no-go verdicts");
}
if (cp154PackageManifest.no_write_attestation?.materializes_finding_routing_map !== false) {
  errors.push("CP00-154 manifest must not materialize finding routing maps");
}
if (cp154PackageManifest.no_write_attestation?.materializes_human_approval_summary !== false) {
  errors.push("CP00-154 manifest must not materialize human approval summaries");
}
if (cp154PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-154 manifest must not send Claude prompts");
if (cp154Hermes.evidence_id !== "H03.CP00-154.audit_compliance_review_sensitive_boundary") {
  errors.push("CP00-154 Hermes evidence id mismatch");
}
if (cp154Claude.review_id !== "C03.CP00-154.audit_compliance_review_sensitive_boundary") {
  errors.push("CP00-154 Claude review id mismatch");
}
if (cp154Claude.executes_review !== false || cp154Claude.sends_claude_prompt !== false) {
  errors.push("CP00-154 Claude packet must not execute or send review");
}
if (cp154Handoff.to_pack_id !== "CP00-155") errors.push("CP00-154 handoff target must be CP00-155");
if (cp154Handoff.next_subphase_id !== "RP03.P09.M07.S13") errors.push("CP00-154 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  permission_bypass: cp154PermissionBypassCase,
  audit_completeness: cp154AuditCompletenessCase,
  missing_test: cp154MissingTestCase,
  ui_leak: cp154UiLeakCase,
  risk_register: cp154RiskRegisterCase,
  approval: cp154ApprovalCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-154 ${label} case must be no-write`);
  }
  if (result.executes_hermes_command !== false || result.writes_hermes_runtime !== false || result.emits_hermes_evidence !== false) {
    errors.push(`CP00-154 ${label} case must not execute Hermes command/runtime or emit Hermes evidence`);
  }
  if (result.executes_architecture_review !== false || result.executes_security_review !== false || result.executes_claude_review !== false) {
    errors.push(`CP00-154 ${label} case must not execute review behavior`);
  }
  if (result.evaluates_permission_bypass !== false || result.evaluates_audit_completeness !== false || result.evaluates_missing_test_gap !== false) {
    errors.push(`CP00-154 ${label} case must not evaluate review-sensitive probes`);
  }
  if (result.evaluates_ui_leak !== false || result.evaluates_downstream_readiness !== false) {
    errors.push(`CP00-154 ${label} case must not evaluate UI leak or downstream readiness`);
  }
  if (
    result.materializes_risk_register !== false ||
    result.materializes_severity_taxonomy !== false ||
    result.materializes_go_no_go_verdict !== false ||
    result.materializes_finding_routing_map !== false ||
    result.materializes_human_approval_summary !== false
  ) {
    errors.push(`CP00-154 ${label} case must not materialize risk/verdict/routing/approval descriptors`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false || result.renders_ui !== false) {
    errors.push(`CP00-154 ${label} case must not execute API, network, or UI behavior`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-154 ${label} case must not implement LDIP or split HRX`);
  }
}
for (const row of cp154Catalog) {
  const result = runAuditComplianceCp154ReviewSensitiveBoundaryCase(row.case_id);
  if (result.appends_audit_event !== false || result.writes_product_state !== false || result.executes_hermes_command !== false) {
    errors.push(`CP00-154 catalog row ${row.catalog_id} must be no-write and no Hermes command execution`);
  }
  if (result.executes_architecture_review !== false || result.executes_security_review !== false || result.executes_claude_review !== false) {
    errors.push(`CP00-154 catalog row ${row.catalog_id} must not execute review behavior`);
  }
  if (result.evaluates_permission_bypass !== false || result.evaluates_audit_completeness !== false || result.evaluates_ui_leak !== false) {
    errors.push(`CP00-154 catalog row ${row.catalog_id} must not evaluate sensitive review questions`);
  }
  if (
    result.materializes_risk_register !== false ||
    result.materializes_go_no_go_verdict !== false ||
    result.materializes_finding_routing_map !== false ||
    result.materializes_human_approval_summary !== false ||
    result.sends_claude_prompt !== false
  ) {
    errors.push(`CP00-154 catalog row ${row.catalog_id} must not materialize verdict/routing/approval or send Claude prompt`);
  }
}

if (cp155CoveredUnits.length !== 28) errors.push(`CP00-155 covered unit count must be 28, got ${cp155CoveredUnits.length}`);
if (cp155CoveredUnits[0] !== "RP03.P09.M07.S13") errors.push("CP00-155 first unit mismatch");
if (cp155CoveredUnits.at(-1) !== "RP03.P09.M10.S04") errors.push("CP00-155 last unit mismatch");
if (new Set(cp155CoveredUnits).size !== cp155CoveredUnits.length) errors.push("CP00-155 covered units must be unique");
if (cp155Catalog.length !== 28) errors.push(`CP00-155 catalog length must be 28, got ${cp155Catalog.length}`);
if (cp155Readiness.deliverable_counts?.implementation !== 11) errors.push("CP00-155 implementation count must be 11");
if (cp155Readiness.deliverable_counts?.claude_review !== 7) errors.push("CP00-155 Claude review count must be 7");
if (cp155Readiness.deliverable_counts?.security_audit !== 6) errors.push("CP00-155 security audit count must be 6");
if (cp155Readiness.deliverable_counts?.test !== 2) errors.push("CP00-155 test count must be 2");
if (cp155Readiness.deliverable_counts?.ui !== 2) errors.push("CP00-155 UI count must be 2");
if (cp155Readiness.evidence_mode_counts?.review_test_golden_case_terminal_closeout !== 8) {
  errors.push("CP00-155 test/golden terminal count must be 8");
}
if (cp155Readiness.evidence_mode_counts?.review_hermes_evidence_packet_terminal !== 8) {
  errors.push("CP00-155 Hermes evidence packet terminal count must be 8");
}
if (cp155Readiness.evidence_mode_counts?.review_claude_review_packet_terminal !== 8) {
  errors.push("CP00-155 Claude review packet terminal count must be 8");
}
if (cp155Readiness.evidence_mode_counts?.review_closeout_next_handoff_terminal !== 4) {
  errors.push("CP00-155 closeout handoff terminal count must be 4");
}
if (cp155Readiness.cp154_handoff_inherited !== true) errors.push("CP00-155 CP154 handoff must be inherited");
if (cp155Readiness.cp156_handoff_declared !== true) errors.push("CP00-155 CP156 handoff must be declared");
if (cp155Readiness.h03_gate_bound !== true) errors.push("CP00-155 H03 gate must be bound");
if (cp155Readiness.c03_gate_bound !== true) errors.push("CP00-155 C03 gate must be bound");
if (cp155Readiness.terminal_closeout_rows_declared !== true) errors.push("CP00-155 terminal closeout rows must be declared");
if (cp155Readiness.terminal_review_questions_declared !== true) errors.push("CP00-155 terminal review questions must be declared");
if (cp155Readiness.evidence_mode_distribution_declared !== true) errors.push("CP00-155 evidence mode distribution must be declared");
if (cp155Readiness.deliverable_distribution_declared !== true) errors.push("CP00-155 deliverable distribution must be declared");
if (cp155Readiness.no_review_or_terminal_execution_declared !== true) {
  errors.push("CP00-155 no-review/no-terminal execution boundary must be declared");
}
if (cp155Readiness.hidden_field_policy_declared !== true) errors.push("CP00-155 hidden field policy must be declared");
if (cp155PackageManifest.production_ready_flag !== "audit_compliance_review_terminal_closeout_verified") {
  errors.push("CP00-155 production flag mismatch");
}
if (cp155PackageManifest.no_write_attestation?.appends_audit_event !== false) errors.push("CP00-155 manifest must not append audit events");
if (cp155PackageManifest.no_write_attestation?.executes_hermes_command !== false) errors.push("CP00-155 manifest must not execute Hermes commands");
if (cp155PackageManifest.no_write_attestation?.executes_claude_review !== false) errors.push("CP00-155 manifest must not execute Claude review");
if (cp155PackageManifest.no_write_attestation?.evaluates_permission_bypass !== false) {
  errors.push("CP00-155 manifest must not evaluate permission bypass");
}
if (cp155PackageManifest.no_write_attestation?.evaluates_audit_completeness !== false) {
  errors.push("CP00-155 manifest must not evaluate audit completeness");
}
if (cp155PackageManifest.no_write_attestation?.materializes_review_packet !== false) {
  errors.push("CP00-155 manifest must not materialize review packets");
}
if (cp155PackageManifest.no_write_attestation?.materializes_closeout_verdict !== false) {
  errors.push("CP00-155 manifest must not materialize closeout verdicts");
}
if (cp155PackageManifest.no_write_attestation?.materializes_next_rp_dependency !== false) {
  errors.push("CP00-155 manifest must not materialize next RP dependency maps");
}
if (cp155PackageManifest.no_write_attestation?.executes_command_rerun !== false) {
  errors.push("CP00-155 manifest must not execute command reruns");
}
if (cp155PackageManifest.no_write_attestation?.sends_claude_prompt !== false) errors.push("CP00-155 manifest must not send Claude prompts");
if (cp155Hermes.evidence_id !== "H03.CP00-155.audit_compliance_review_terminal_closeout") {
  errors.push("CP00-155 Hermes evidence id mismatch");
}
if (cp155Claude.review_id !== "C03.CP00-155.audit_compliance_review_terminal_closeout") {
  errors.push("CP00-155 Claude review id mismatch");
}
if (cp155Claude.executes_review !== false || cp155Claude.sends_claude_prompt !== false) {
  errors.push("CP00-155 Claude packet must not execute or send review");
}
if (cp155Handoff.to_pack_id !== "CP00-156") errors.push("CP00-155 handoff target must be CP00-156");
if (cp155Handoff.next_subphase_id !== "RP04.P00.M00.S01") errors.push("CP00-155 handoff next subphase mismatch");
for (const [label, result] of Object.entries({
  claude_packet: cp155ClaudePacketCase,
  pass_with_findings: cp155PassFindingCase,
  command_rerun: cp155CommandRerunCase,
  hermes_permission: cp155HermesPermissionCase,
  claude_audit: cp155ClaudeAuditCase,
  handoff_security: cp155HandoffSecurityCase,
})) {
  if (result.appends_audit_event !== false || result.writes_product_state !== false) {
    errors.push(`CP00-155 ${label} case must be no-write`);
  }
  if (result.executes_hermes_command !== false || result.writes_hermes_runtime !== false || result.emits_hermes_evidence !== false) {
    errors.push(`CP00-155 ${label} case must not execute Hermes command/runtime or emit Hermes evidence`);
  }
  if (result.executes_architecture_review !== false || result.executes_security_review !== false || result.executes_claude_review !== false) {
    errors.push(`CP00-155 ${label} case must not execute review behavior`);
  }
  if (result.evaluates_permission_bypass !== false || result.evaluates_audit_completeness !== false || result.evaluates_missing_test_gap !== false) {
    errors.push(`CP00-155 ${label} case must not evaluate review probes`);
  }
  if (result.materializes_review_packet !== false || result.materializes_closeout_verdict !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-155 ${label} case must not materialize review/closeout packets or send Claude prompt`);
  }
  if (result.materializes_next_rp_dependency !== false || result.executes_command_rerun !== false) {
    errors.push(`CP00-155 ${label} case must not materialize RP handoff maps or rerun commands`);
  }
  if (result.executes_api_handler !== false || result.issues_network_request !== false || result.renders_ui !== false) {
    errors.push(`CP00-155 ${label} case must not execute API, network, or UI behavior`);
  }
  if (result.implements_ldip !== false || result.splits_hrx_product !== false) {
    errors.push(`CP00-155 ${label} case must not implement LDIP or split HRX`);
  }
}
for (const row of cp155Catalog) {
  const result = runAuditComplianceCp155ReviewTerminalCloseoutCase(row.case_id);
  if (result.appends_audit_event !== false || result.writes_product_state !== false || result.executes_hermes_command !== false) {
    errors.push(`CP00-155 catalog row ${row.catalog_id} must be no-write and no Hermes command execution`);
  }
  if (result.executes_architecture_review !== false || result.executes_security_review !== false || result.executes_claude_review !== false) {
    errors.push(`CP00-155 catalog row ${row.catalog_id} must not execute review behavior`);
  }
  if (result.evaluates_permission_bypass !== false || result.evaluates_audit_completeness !== false || result.emits_hermes_evidence !== false) {
    errors.push(`CP00-155 catalog row ${row.catalog_id} must not evaluate review questions or emit Hermes evidence`);
  }
  if (result.materializes_review_packet !== false || result.materializes_closeout_verdict !== false || result.sends_claude_prompt !== false) {
    errors.push(`CP00-155 catalog row ${row.catalog_id} must not materialize review/closeout packets or send Claude prompt`);
  }
}

if (!detailedPlan.program_scope.includes("tamper-evident hash chain")) {
  errors.push("RP03 detailed plan scope must mention tamper-evident hash chain");
}
if (!detailedPlan.program_scope.includes("privacy-safe evidence")) {
  errors.push("RP03 detailed plan scope must mention privacy-safe evidence");
}
const detailedText = JSON.stringify(detailedPlan);
for (const term of ["hash chain verification", "legal hold apply and release", "privacy-safe audit query", "compliance export with custody receipt"]) {
  requireText(detailedText, term, "RP03 detailed plan");
}

const fullRp03Entries = fullPlan.entries.filter((entry) => entry.program_id === "RP03");
if (fullRp03Entries.length !== 110) errors.push(`full plan must contain 110 RP03 entries, got ${fullRp03Entries.length}`);
if (!fullRp03Entries.every((entry) => entry.program_scope.includes("tamper-evident hash chain"))) {
  errors.push("full plan RP03 entries must mention tamper-evident hash chain");
}

if (errors.length > 0) {
  console.error("RP03 audit architecture validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("RP03 audit architecture validation passed.");
console.log(`architecture: ${architecturePath}`);
console.log(`contract: ${contractPath}`);
console.log("required_terms: append-only, hash chain, WORM, legal hold, trace correlation, privacy, custody, H03, C03");
console.log(`current_pack: ${contract.current_pack.pack_id}`);
console.log(`covered_units: ${cp155CoveredUnits.length}`);
console.log(`next_pack: ${cp155Handoff.to_pack_id}`);
