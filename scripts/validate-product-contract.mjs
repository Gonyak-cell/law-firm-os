#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const contractPath = path.resolve("contracts/law-firm-os.product-contract.json");
const projectPath = path.resolve("hermes/project.json");

const requiredPrinciples = [
  "matter_first",
  "dms_as_knowledge_layer",
  "master_data_unification",
  "permission_unified",
  "audit_everything",
  "version_safe_dms",
  "ai_grounded",
  "tenant_isolated",
  "modular_but_integrated"
];

const requiredModules = [
  "core-platform",
  "master-data",
  "matter-core",
  "legal-workspace-dms",
  "billing-finance",
  "client-growth-crm",
  "intake-engagement",
  "partner-settlement",
  "legal-knowledge-ai"
];

const requiredInvariants = [
  "matter_first_required",
  "single_client_matter_identity",
  "dms_independent_layer",
  "deny_over_allow",
  "audit_required",
  "ai_grounded_in_versions",
  "human_review_for_ai_final_outputs"
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function ids(rows) {
  return new Set(rows.map((row) => row.id));
}

const errors = [];
const contract = await readJson(contractPath);
const project = await readJson(projectPath);

assert(contract.product?.id === "law-firm-os", "product.id must be law-firm-os", errors);
assert(contract.architecture?.style === "modular_monolith_first", "architecture.style must be modular_monolith_first", errors);
assert(project.project_type === "product_codebase", "Hermes project_type must be product_codebase", errors);
assert(project.spec_source?.kind === "pre_development_specification", "Hermes spec source must be pre_development_specification", errors);

const principles = new Set(contract.principles ?? []);
for (const principle of requiredPrinciples) {
  assert(principles.has(principle), `missing principle: ${principle}`, errors);
}

const moduleIds = ids(contract.modules ?? []);
for (const moduleId of requiredModules) {
  assert(moduleIds.has(moduleId), `missing module: ${moduleId}`, errors);
}

const invariantRows = contract.invariants ?? [];
const invariantIds = ids(invariantRows);
for (const invariantId of requiredInvariants) {
  assert(invariantIds.has(invariantId), `missing invariant: ${invariantId}`, errors);
}
for (const invariant of invariantRows) {
  assert(invariant.required === true, `invariant must be required: ${invariant.id}`, errors);
}

const dms = contract.modules.find((module) => module.id === "legal-workspace-dms");
assert(dms?.owns?.includes("Document"), "DMS must own Document", errors);
assert(dms?.owns?.includes("DocumentVersion"), "DMS must own DocumentVersion", errors);
assert(dms?.owns?.includes("Email"), "DMS must own Email", errors);

const matter = contract.modules.find((module) => module.id === "matter-core");
assert(matter?.owns?.includes("Matter"), "Matter Core must own Matter", errors);
assert(matter?.owns?.includes("MatterMember"), "Matter Core must own MatterMember", errors);

const core = contract.modules.find((module) => module.id === "core-platform");
assert(core?.owns?.includes("Permission"), "Core Platform must own Permission", errors);
assert(core?.owns?.includes("AuditEvent"), "Core Platform must own AuditEvent", errors);

const gates = new Set(project.initial_gates ?? []);
for (const invariantId of requiredInvariants) {
  assert(gates.has(invariantId), `Hermes initial gate missing invariant: ${invariantId}`, errors);
}

if (errors.length > 0) {
  console.error("Law Firm OS product contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Law Firm OS product contract validation passed.");
console.log(`modules: ${requiredModules.length}/${requiredModules.length}`);
console.log(`principles: ${requiredPrinciples.length}/${requiredPrinciples.length}`);
console.log(`invariants: ${requiredInvariants.length}/${requiredInvariants.length}`);
console.log("hermes_project_type: product_codebase");

