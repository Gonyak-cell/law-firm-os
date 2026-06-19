#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createCrmCoreCRMActivity,
  createCrmCoreCampaign,
  createCrmCoreLead,
  createCrmCoreOpportunity,
  createCrmCoreProposal,
  createCrmCoreRecord,
  createCrmCoreReferral,
  listCrmCoreModelTypes,
  validateCrmCoreRecord,
} from "../packages/crm/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G3-W03-T001",
  "LFOS-G3-W03-T002",
  "LFOS-G3-W03-T003",
  "LFOS-G3-W03-T004",
  "LFOS-G3-W03-T005",
  "LFOS-G3-W03-T006",
];
const REQUIRED_FILES = [
  "11-full-tuw-catalog.md",
  "28-g3-crm-intake-entry-plan.md",
  "29-g3-a-crm-schema-report.md",
  "../../..//packages/crm/src/model.js",
  "../../..//packages/crm/src/index.js",
  "../../..//packages/crm/test/client-matter-g3-schema.test.js",
  "../../..//contracts/crm-core-contract.json",
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
  if (!(await exists(filePath))) addFinding("MISSING_FILE", "Missing G3-A validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "28-g3-crm-intake-entry-plan.md"));
  const report = await readText(path.join(ROOT, "29-g3-a-crm-schema-report.md"));
  const modelSource = await readText(path.resolve("packages/crm/src/model.js"));
  const indexSource = await readText(path.resolve("packages/crm/src/index.js"));
  const testSource = await readText(path.resolve("packages/crm/test/client-matter-g3-schema.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/crm-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G3-A TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G3-A TUW missing from G3 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G3-A TUW missing from G3-A report.");
  }

  for (const phrase of [
    "G3-A CRM Schema Report",
    "This slice does not claim G3 runtime readiness",
    "Lead, Opportunity, CRMActivity, Proposal, Referral, and Campaign",
    "no-direct-Matter shortcut boundary",
    "Opportunity conversion limited to IntakeRequest",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G3-A report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createCrmCoreLead",
    "createCrmCoreOpportunity",
    "createCrmCoreCRMActivity",
    "createCrmCoreProposal",
    "createCrmCoreReferral",
    "createCrmCoreCampaign",
    "validateCrmCoreRecord",
    "listCrmCoreModelTypes",
  ]) {
    requireIncludes(modelSource, `export function ${symbol}`, "MISSING_MODEL_EXPORT", "G3-A model export missing.");
    requireIncludes(testSource, symbol, "MISSING_MODEL_TEST", "G3-A model export missing test coverage.");
  }

  requireIncludes(indexSource, `export * from "./model.js";`, "MISSING_INDEX_EXPORT", "CRM package must export G3-A model layer.");

  for (const marker of [
    "CRM_CORE_MODEL_DEFINITIONS",
    "CRM_CORE_DIRECT_MATTER_REFERENCE_FIELDS",
    "CRM_CORE_CAMPAIGN_CONTACT_CONSENT_STATUSES",
    "opportunity_to_matter_shortcut_blocked",
    "g3_runtime_readiness_claim",
  ]) {
    requireIncludes(modelSource, marker, "MISSING_MODEL_MARKER", "G3-A model source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g3a:validate"] !== "node scripts/validate-client-matter-os-g3-a.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g3a:validate.");
  }

  if (contract.program?.program_id !== "RP09" || contract.program?.descriptor_only !== true) {
    addFinding("CRM_CONTRACT_BOUNDARY", "CRM contract must remain RP09 descriptor-only evidence.");
  }

  const modelTypes = listCrmCoreModelTypes();
  for (const modelType of ["Lead", "Opportunity", "CRMActivity", "Proposal", "Referral", "Campaign"]) {
    if (!modelTypes.includes(modelType)) {
      addFinding("MODEL_TYPE_LIST", "CRM model type list missing G3-A model.", { modelType });
    }
  }

  const tenant_id = "tenant_g3_validator";
  const owner_user_id = "user_g3_validator";
  const party_id = "party_g3_client";
  const lead = createCrmCoreLead({
    lead_id: "lead_g3_validator",
    tenant_id,
    party_id,
    display_name: "Validator Lead",
    status: "active",
    owner_user_id,
  });
  const opportunity = createCrmCoreOpportunity({
    opportunity_id: "opportunity_g3_validator",
    tenant_id,
    party_id,
    display_name: "Validator Opportunity",
    stage: "intake_requested",
    status: "active",
    owner_user_id,
    intake_request_id: "intake_g3_validator",
  });
  const activity = createCrmCoreCRMActivity({
    crm_activity_id: "activity_g3_validator",
    tenant_id,
    party_id,
    opportunity_id: opportunity.opportunity_id,
    activity_type: "meeting",
    subject: "Confidential validator activity",
    confidential: true,
    status: "active",
    owner_user_id,
  });
  const proposal = createCrmCoreProposal({
    proposal_id: "proposal_g3_validator",
    tenant_id,
    opportunity_id: opportunity.opportunity_id,
    party_id,
    fee_estimate_ref: "fee_estimate_g3_validator",
    display_name: "Validator Proposal",
    status: "active",
    proposal_status: "sent",
    owner_user_id,
  });
  const referral = createCrmCoreReferral({
    referral_id: "referral_g3_validator",
    tenant_id,
    source_party_id: "party_g3_referrer",
    target_party_id: party_id,
    display_name: "Validator Referral",
    status: "active",
    owner_user_id,
  });
  const campaign = createCrmCoreCampaign({
    campaign_id: "campaign_g3_validator",
    tenant_id,
    display_name: "Validator Campaign",
    contact_party_ids: [party_id, "party_g3_opt_out"],
    contact_consent_by_party_id: {
      [party_id]: "opted_in",
      party_g3_opt_out: "opted_out",
    },
    status: "active",
    owner_user_id,
  });

  const records = [
    ["Lead", lead],
    ["Opportunity", opportunity],
    ["CRMActivity", activity],
    ["Proposal", proposal],
    ["Referral", referral],
    ["Campaign", campaign],
  ];

  for (const [modelType, record] of records) {
    const validation = validateCrmCoreRecord(modelType, record);
    if (!validation.valid) addFinding("MODEL_VALIDATION", "G3-A record must validate.", { modelType, errors: validation.errors });
    if (record.tenant_id !== tenant_id) addFinding("TENANT_SCOPE", "G3-A record must preserve tenant_id.", { modelType });
    if (record.writes_product_state !== false) addFinding("WRITE_BOUNDARY", "G3-A record must remain no-write.", { modelType });
    if (record.dispatches_crm_runtime !== false) addFinding("RUNTIME_BOUNDARY", "G3-A record must not claim CRM runtime.", { modelType });
    if (record.g3_runtime_readiness_claim !== "open") addFinding("G3_READINESS_BOUNDARY", "G3 readiness must remain open.", { modelType });
  }

  try {
    createCrmCoreOpportunity({
      opportunity_id: "opportunity_g3_shortcut",
      tenant_id,
      party_id,
      display_name: "Shortcut Opportunity",
      stage: "qualified",
      status: "active",
      owner_user_id,
      matter_id: "matter_forbidden",
    });
    addFinding("MATTER_SHORTCUT", "Opportunity factory must reject direct Matter references.");
  } catch (error) {
    if (!String(error.message).includes("direct Matter reference")) {
      addFinding("MATTER_SHORTCUT_ERROR", "Opportunity direct-Matter rejection must be explicit.", { message: error.message });
    }
  }

  const factoryLead = createCrmCoreRecord("Lead", {
    lead_id: "lead_g3_factory",
    tenant_id,
    party_id,
    display_name: "Factory Lead",
    status: "active",
    owner_user_id,
  });
  if (factoryLead.model_type !== "Lead") addFinding("FACTORY_DISPATCH", "createCrmCoreRecord must dispatch Lead records.");

  const activityValidation = validateCrmCoreRecord("CRMActivity", activity);
  if (!activityValidation.review_required_claims.includes("confidential_crm_activity_permission_trim_required")) {
    addFinding("CONFIDENTIAL_ACTIVITY", "Confidential CRMActivity must require permission trimming review.");
  }

  const campaignValidation = validateCrmCoreRecord("Campaign", campaign);
  if (!campaignValidation.review_required_claims.includes("campaign_contact_opt_out_present")) {
    addFinding("CAMPAIGN_CONSENT", "Campaign with opted-out contact must preserve review claim.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G3-A validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G3-A validation passed.");
console.log("g3a_tuws: LFOS-G3-W03-T001/LFOS-G3-W03-T002/LFOS-G3-W03-T003/LFOS-G3-W03-T004/LFOS-G3-W03-T005/LFOS-G3-W03-T006");
console.log("crm_schema_models: Lead/Opportunity/CRMActivity/Proposal/Referral/Campaign");
console.log("party_references: lead/opportunity/referral/campaign");
console.log("shortcut_boundary: opportunity_direct_matter_reference_blocked");
console.log("g3_runtime_readiness_claim: open");
