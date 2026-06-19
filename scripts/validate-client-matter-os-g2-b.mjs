#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMasterDataBillingProfile,
  createMasterDataClientGroup,
  createMasterDataContactPoint,
  createMasterDataParty,
  createMasterDataRelationship,
  validateMasterDataRecord,
} from "../packages/master-data/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G2-W02-T006", "LFOS-G2-W02-T007", "LFOS-G2-W02-T008", "LFOS-G2-W02-T009"];
const REQUIRED_FILES = [
  "11-full-tuw-catalog.md",
  "23-g2-party-master-entry-plan.md",
  "25-g2-b-relationship-billing-profile-report.md",
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
  if (!(await exists(filePath))) addFinding("MISSING_FILE", "Missing G2-B validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "23-g2-party-master-entry-plan.md"));
  const report = await readText(path.join(ROOT, "25-g2-b-relationship-billing-profile-report.md"));
  const modelSource = await readText(path.resolve("packages/master-data/src/model.js"));
  const registrySource = await readText(path.resolve("packages/master-data/src/registry.js"));
  const validatorSource = await readText(path.resolve("packages/master-data/src/validators.js"));
  const testSource = await readText(path.resolve("packages/master-data/test/model.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/master-data-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G2-B TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G2-B TUW missing from G2 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G2-B TUW missing from G2-B report.");
  }

  for (const phrase of [
    "G2-B Relationship and Billing Profile Report",
    "This slice does not claim G2 runtime write readiness",
    "ClientGroup, Relationship, ContactPoint, and BillingProfile",
    "legal-client versus billing-client",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G2-B report missing required boundary or scope phrase.");
  }

  for (const marker of [
    "member_party_ids",
    "primary_party_id",
    "from_party_id",
    "to_party_id",
    "owner_party_id",
    "is_primary",
    "verified",
    "legal_client_party_id",
    "billing_client_party_id",
  ]) {
    requireIncludes(modelSource, marker, "MISSING_MODEL_MARKER", "G2-B model marker missing.");
    requireIncludes(testSource, marker, "MISSING_TEST_MARKER", "G2-B test marker missing.");
  }

  for (const marker of [
    "MASTER_DATA_CONTACT_POINT_TYPES",
    "client_group_primary_party_missing",
    "relationship_party_endpoint_error",
    "contact_point_type_error",
    "billing_profile_client_reference_error",
  ]) {
    requireIncludes(registrySource + validatorSource + JSON.stringify(contract), marker, "MISSING_CONTROL_MARKER", "G2-B control marker missing.");
  }

  if (pkg.scripts?.["client-matter:g2b:validate"] !== "node scripts/validate-client-matter-os-g2-b.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g2b:validate.");
  }

  for (const risk of [
    "client_group_primary_party_missing",
    "relationship_party_endpoint_error",
    "contact_point_type_error",
    "billing_profile_client_reference_error",
  ]) {
    if (!contract.acceptance_risks?.includes(risk)) addFinding("CONTRACT_RISK", "Master Data contract missing G2-B risk.", { risk });
  }
  if (!contract.public_exports?.includes("MASTER_DATA_CONTACT_POINT_TYPES")) {
    addFinding("CONTRACT_PUBLIC_EXPORT", "Master Data contract missing contact point type export.");
  }

  const tenant_id = "tenant_g2b_validator";
  const owner_user_id = "user_g2b_validator";
  const legalClient = createMasterDataParty({
    party_id: "party_g2b_legal",
    tenant_id,
    party_type: "organization",
    display_name: "G2B Legal Client",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2b_legal",
  });
  const billingClient = createMasterDataParty({
    party_id: "party_g2b_billing",
    tenant_id,
    party_type: "organization",
    display_name: "G2B Billing Client",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2b_billing",
  });
  const contactParty = createMasterDataParty({
    party_id: "party_g2b_contact",
    tenant_id,
    party_type: "person",
    display_name: "G2B Contact",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2b_contact",
  });
  const clientGroup = createMasterDataClientGroup({
    client_group_id: "client_group_g2b",
    tenant_id,
    display_name: "G2B Group",
    status: "active",
    owner_user_id,
    member_party_ids: [legalClient.party_id, billingClient.party_id, contactParty.party_id],
    primary_party_id: legalClient.party_id,
    member_entity_ids: [legalClient.canonical_entity_id, billingClient.canonical_entity_id, contactParty.canonical_entity_id],
  });
  const relationship = createMasterDataRelationship({
    relationship_id: "relationship_g2b",
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
    contact_point_id: "contact_g2b",
    tenant_id,
    owner_entity_id: contactParty.canonical_entity_id,
    owner_party_id: contactParty.party_id,
    contact_type: "billing_email",
    value: "g2b.billing@example.invalid",
    is_primary: true,
    verified: true,
    status: "active",
    owner_user_id,
  });
  const billingProfile = createMasterDataBillingProfile({
    billing_profile_id: "billing_profile_g2b",
    tenant_id,
    billing_entity_id: billingClient.canonical_entity_id,
    legal_client_party_id: legalClient.party_id,
    billing_client_party_id: billingClient.party_id,
    billing_contact_point_id: contactPoint.contact_point_id,
    display_name: "G2B Billing",
    status: "active",
    owner_user_id,
    client_group_id: clientGroup.client_group_id,
  });

  const groupValidation = validateMasterDataRecord("ClientGroup", clientGroup, { member_tenant_ids: [tenant_id, tenant_id, tenant_id] });
  if (!groupValidation.valid) addFinding("CLIENT_GROUP_VALIDATION", "G2-B ClientGroup must validate.", { errors: groupValidation.errors });

  const relationshipValidation = validateMasterDataRecord("Relationship", relationship, {
    party_types_by_id: {
      [contactParty.party_id]: contactParty.party_type,
      [legalClient.party_id]: legalClient.party_type,
    },
  });
  if (!relationshipValidation.valid) addFinding("RELATIONSHIP_VALIDATION", "G2-B Relationship must validate.", { errors: relationshipValidation.errors });

  const contactValidation = validateMasterDataRecord("ContactPoint", contactPoint);
  if (!contactValidation.valid || contactPoint.is_primary !== true || contactPoint.verified !== true) {
    addFinding("CONTACT_POINT_VALIDATION", "G2-B ContactPoint must validate primary verified contact evidence.", {
      errors: contactValidation.errors,
      is_primary: contactPoint.is_primary,
      verified: contactPoint.verified,
    });
  }

  const billingValidation = validateMasterDataRecord("BillingProfile", billingProfile, {
    require_legal_and_billing_client_refs: true,
    require_distinct_billing_client: true,
  });
  if (!billingValidation.valid || billingProfile.legal_client_party_id === billingProfile.billing_client_party_id) {
    addFinding("BILLING_PROFILE_VALIDATION", "G2-B BillingProfile must distinguish legal and billing client references.", {
      errors: billingValidation.errors,
    });
  }

  const missingPrimary = validateMasterDataRecord("ClientGroup", {
    ...clientGroup,
    client_group_id: "client_group_g2b_missing_primary",
    member_party_ids: [billingClient.party_id],
  });
  if (!missingPrimary.blocked_claims.includes("client_group_primary_party_missing")) {
    addFinding("CLIENT_GROUP_NEGATIVE", "ClientGroup must block primary party outside member list.");
  }

  const samePartyRelationship = validateMasterDataRecord("Relationship", {
    ...relationship,
    relationship_id: "relationship_g2b_same_party",
    to_party_id: contactParty.party_id,
  });
  if (!samePartyRelationship.blocked_claims.includes("relationship_party_endpoint_error")) {
    addFinding("RELATIONSHIP_NEGATIVE", "Relationship must block same Party endpoint.");
  }

  const sameBillingClient = validateMasterDataRecord(
    "BillingProfile",
    {
      ...billingProfile,
      billing_profile_id: "billing_profile_g2b_same_client",
      billing_client_party_id: legalClient.party_id,
    },
    {
      require_legal_and_billing_client_refs: true,
      require_distinct_billing_client: true,
    },
  );
  if (!sameBillingClient.blocked_claims.includes("billing_profile_client_reference_error")) {
    addFinding("BILLING_PROFILE_NEGATIVE", "BillingProfile must block same billing client when distinct client evidence is required.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G2-B validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G2-B validation passed.");
console.log("g2b_tuws: LFOS-G2-W02-T006/LFOS-G2-W02-T007/LFOS-G2-W02-T008/LFOS-G2-W02-T009");
console.log("relationship_billing_models: ClientGroup/Relationship/ContactPoint/BillingProfile");
console.log("party_references: group_membership/relationship_endpoints/contact_owner/billing_clients");
console.log("billing_profile_client_refs: legal_client_vs_billing_client");
console.log("g2_runtime_write_readiness_claim: open");
