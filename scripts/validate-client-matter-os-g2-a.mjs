#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMasterDataOrganization,
  createMasterDataParty,
  createMasterDataPartyAlias,
  createMasterDataPartyIdentifier,
  createMasterDataPerson,
  listMasterDataModelTypes,
  validateMasterDataRecord,
  validateMasterDataRegistry,
} from "../packages/master-data/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G2-W02-T001",
  "LFOS-G2-W02-T002",
  "LFOS-G2-W02-T003",
  "LFOS-G2-W02-T004",
  "LFOS-G2-W02-T005",
];
const REQUIRED_FILES = [
  "11-full-tuw-catalog.md",
  "23-g2-party-master-entry-plan.md",
  "24-g2-a-party-schema-report.md",
  "../../..//packages/master-data/src/model.js",
  "../../..//packages/master-data/src/registry.js",
  "../../..//packages/master-data/src/validators.js",
  "../../..//packages/master-data/test/model.test.js",
  "../../..//contracts/master-data-contract.json",
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

for (const file of REQUIRED_FILES) {
  const filePath = file.startsWith("../") ? path.resolve(ROOT, file) : path.join(ROOT, file);
  if (!(await exists(filePath))) addFinding("MISSING_FILE", "Missing G2-A validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "23-g2-party-master-entry-plan.md"));
  const report = await readText(path.join(ROOT, "24-g2-a-party-schema-report.md"));
  const modelSource = await readText(path.resolve("packages/master-data/src/model.js"));
  const registrySource = await readText(path.resolve("packages/master-data/src/registry.js"));
  const testSource = await readText(path.resolve("packages/master-data/test/model.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/master-data-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G2-A TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G2-A TUW missing from G2 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G2-A TUW missing from G2-A report.");
  }

  for (const phrase of [
    "G2-A Party Schema Report",
    "This slice does not claim G2 runtime write readiness",
    "Party, Person, Organization, PartyAlias, and PartyIdentifier",
    "tenant-scoped identity keys",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G2-A report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createMasterDataParty",
    "createMasterDataPerson",
    "createMasterDataOrganization",
    "createMasterDataPartyAlias",
    "createMasterDataPartyIdentifier",
  ]) {
    requireIncludes(modelSource, `export function ${symbol}`, "MISSING_FACTORY", "G2-A model factory missing.");
    requireIncludes(testSource, symbol, "MISSING_FACTORY_TEST", "G2-A model factory missing test coverage.");
  }

  for (const marker of [
    "MASTER_DATA_PARTY_TYPES",
    "MASTER_DATA_PARTY_ALIAS_TYPES",
    "MASTER_DATA_PARTY_IDENTIFIER_TYPES",
    "PartyAlias",
    "PartyIdentifier",
  ]) {
    requireIncludes(registrySource, marker, "MISSING_REGISTRY_MARKER", "G2-A registry marker missing.");
  }

  if (pkg.scripts?.["client-matter:g2a:validate"] !== "node scripts/validate-client-matter-os-g2-a.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g2a:validate.");
  }

  if (contract.model_registry?.model_count !== 10) {
    addFinding("CONTRACT_MODEL_COUNT", "Master Data contract model_count must include Party, PartyAlias, and PartyIdentifier.", {
      actual: contract.model_registry?.model_count,
    });
  }
  for (const modelType of ["Party", "PartyAlias", "PartyIdentifier"]) {
    if (!contract.scope?.includes(modelType)) {
      addFinding("CONTRACT_SCOPE", "Master Data contract scope missing G2-A model.", { modelType });
    }
  }

  const registry = validateMasterDataRegistry();
  if (!registry.valid || registry.model_count !== 10) {
    addFinding("REGISTRY_VALIDATION", "Master Data registry must validate with 10 model types.", {
      valid: registry.valid,
      model_count: registry.model_count,
    });
  }
  for (const modelType of ["Party", "PartyAlias", "PartyIdentifier"]) {
    if (!listMasterDataModelTypes().includes(modelType)) {
      addFinding("REGISTRY_MODEL_TYPES", "Master Data registry must list G2-A model type.", { modelType });
    }
  }

  const tenant_id = "tenant_g2_validator";
  const owner_user_id = "user_g2_validator";
  const party = createMasterDataParty({
    party_id: "party_g2_validator_org",
    tenant_id,
    party_type: "organization",
    display_name: "Validator Client",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2_validator_org",
  });
  const personParty = createMasterDataParty({
    party_id: "party_g2_validator_person",
    tenant_id,
    party_type: "person",
    display_name: "Validator Contact",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2_validator_person",
  });
  const organization = createMasterDataOrganization({
    organization_id: "org_g2_validator",
    party_id: party.party_id,
    tenant_id,
    entity_id: "entity_g2_validator_org",
    display_name: "Validator Client",
    registration_number: "123-45-67890",
    status: "active",
    owner_user_id,
  });
  const person = createMasterDataPerson({
    person_id: "person_g2_validator",
    party_id: personParty.party_id,
    tenant_id,
    entity_id: "entity_g2_validator_person",
    display_name: "Validator Contact",
    email: "validator@example.invalid",
    status: "active",
    owner_user_id,
  });
  const alias = createMasterDataPartyAlias({
    party_alias_id: "alias_g2_validator_ko",
    tenant_id,
    party_id: party.party_id,
    alias_value: "검증 클라이언트",
    alias_type: "localized_name",
    locale: "ko-KR",
    status: "active",
    owner_user_id,
  });
  const identifier = createMasterDataPartyIdentifier({
    party_identifier_id: "identifier_g2_validator_business",
    tenant_id,
    party_id: party.party_id,
    identifier_type: "business_number",
    identifier_value: "123-45-67890",
    jurisdiction: "KR",
    verified: true,
    status: "active",
    owner_user_id,
  });

  const records = [party, personParty, organization, person, alias, identifier];
  for (const record of records) {
    if (record.tenant_id !== tenant_id) addFinding("TENANT_SCOPE", "G2-A record must preserve tenant_id.", { model_type: record.model_type });
    if (record.writes_product_state !== false) addFinding("WRITE_BOUNDARY", "G2-A record must remain descriptor-only.", { model_type: record.model_type });
    if (record.writes_audit_event !== false) addFinding("AUDIT_WRITE_BOUNDARY", "G2-A record must not claim audit writes.", { model_type: record.model_type });
  }

  if (organization.party_id !== party.party_id || person.party_id !== personParty.party_id) {
    addFinding("PARTY_BRIDGE", "Person and Organization records must preserve Party bridge IDs.");
  }
  if (alias.normalized_alias_key !== "tenant_g2_validator:party-alias:party_g2_validator_org:ko-KR:검증 클라이언트") {
    addFinding("ALIAS_KEY", "PartyAlias normalized key must be tenant and party scoped.", { actual: alias.normalized_alias_key });
  }
  if (identifier.normalized_identifier_key !== "tenant_g2_validator:party-identifier:business_number:123-45-67890") {
    addFinding("IDENTIFIER_KEY", "PartyIdentifier normalized key must be tenant and type scoped.", {
      actual: identifier.normalized_identifier_key,
    });
  }

  for (const [modelType, record] of [
    ["Party", party],
    ["Organization", organization],
    ["Person", person],
    ["PartyAlias", alias],
    ["PartyIdentifier", identifier],
  ]) {
    const validation = validateMasterDataRecord(modelType, record);
    if (!validation.valid) addFinding("MODEL_VALIDATION", "G2-A record must validate.", { modelType, errors: validation.errors });
  }

  const duplicateAlias = validateMasterDataRecord("PartyAlias", alias, {
    known_alias_keys: [alias.normalized_alias_key],
  });
  if (!duplicateAlias.review_required_claims.includes("duplicate_alias_review_required")) {
    addFinding("DUPLICATE_ALIAS_REVIEW", "PartyAlias duplicate key must require review.");
  }

  const duplicateIdentifier = validateMasterDataRecord("PartyIdentifier", identifier, {
    known_identifier_keys: [identifier.normalized_identifier_key],
  });
  if (!duplicateIdentifier.review_required_claims.includes("duplicate_identifier_review_required")) {
    addFinding("DUPLICATE_IDENTIFIER_REVIEW", "PartyIdentifier duplicate key must require review.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G2-A validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G2-A validation passed.");
console.log("g2a_tuws: LFOS-G2-W02-T001/LFOS-G2-W02-T002/LFOS-G2-W02-T003/LFOS-G2-W02-T004/LFOS-G2-W02-T005");
console.log("party_schema_models: Party/Person/Organization/PartyAlias/PartyIdentifier");
console.log("tenant_identity_keys: party/alias/identifier");
console.log("duplicate_review_claims: alias/identifier");
console.log("g2_runtime_write_readiness_claim: open");
