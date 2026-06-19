#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMasterDataG2CloseoutDescriptor,
  createMasterDataParty,
  createMasterDataPartyProfileUiStateDescriptor,
  createMasterDataPartySearchUiStateDescriptor,
} from "../packages/master-data/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G2-W02-T013", "LFOS-G2-W02-T014"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "23-g2-party-master-entry-plan.md"),
  path.join(ROOT, "27-g2-d-ui-closeout-report.md"),
  path.resolve("packages/master-data/src/service.js"),
  path.resolve("packages/master-data/src/registry.js"),
  path.resolve("packages/master-data/test/model.test.js"),
  path.resolve("contracts/master-data-contract.json"),
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
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G2-D validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "23-g2-party-master-entry-plan.md"));
  const report = await readText(path.join(ROOT, "27-g2-d-ui-closeout-report.md"));
  const serviceSource = await readText(path.resolve("packages/master-data/src/service.js"));
  const testSource = await readText(path.resolve("packages/master-data/test/model.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/master-data-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G2-D TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G2-D TUW missing from G2 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G2-D TUW missing from G2-D report.");
  }

  for (const phrase of [
    "G2-D UI Closeout Report",
    "This slice does not claim G2 runtime write readiness",
    "denied and review-required Party search/profile states",
    "CRM, Matter, and Billing reference evidence",
    "human review disposition",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G2-D report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createMasterDataPartySearchUiStateDescriptor",
    "createMasterDataPartyProfileUiStateDescriptor",
    "createMasterDataG2CloseoutDescriptor",
  ]) {
    requireIncludes(serviceSource, `export function ${symbol}`, "MISSING_SERVICE_EXPORT", "G2-D service helper missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G2-D service helper missing test coverage.");
    if (!contract.public_exports?.includes(symbol)) addFinding("CONTRACT_PUBLIC_EXPORT", "Contract missing G2-D public export.", { symbol });
  }

  for (const risk of [
    "party_search_denied_state_leakage",
    "party_profile_hidden_field_leakage",
    "g2_closeout_evidence_missing",
  ]) {
    if (!contract.acceptance_risks?.includes(risk)) addFinding("CONTRACT_RISK", "Master Data contract missing G2-D risk.", { risk });
  }

  if (pkg.scripts?.["client-matter:g2d:validate"] !== "node scripts/validate-client-matter-os-g2-d.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g2d:validate.");
  }

  const tenant_id = "tenant_g2d_validator";
  const reviewParty = createMasterDataParty({
    party_id: "party_g2d_review",
    tenant_id,
    party_type: "organization",
    display_name: "Validator Review Client",
    status: "review_required",
    owner_user_id: "user_g2d_validator",
    canonical_entity_id: "entity_g2d_review",
  });

  const deniedSearch = createMasterDataPartySearchUiStateDescriptor({
    tenant_id,
    query: "restricted",
    permission_outcome: "denied",
    denied_results: [
      {
        party_id: "party_g2d_hidden",
        tenant_id,
        display_name: "Hidden Client",
        raw_permission_decision: "deny",
      },
    ],
    hidden_fields: ["raw_permission_decision"],
  });
  if (
    deniedSearch.ui_state !== "denied" ||
    deniedSearch.customer_visible_search_state?.result_count !== 0 ||
    deniedSearch.internal_ui_evidence?.denied_candidate_count !== 1 ||
    deniedSearch.renders_ui !== false ||
    JSON.stringify(deniedSearch.customer_visible_search_state).includes("raw_permission_decision")
  ) {
    addFinding("SEARCH_UI_STATE", "Denied search UI state must hide denied result details and remain descriptor-only.", {
      ui_state: deniedSearch.ui_state,
      result_count: deniedSearch.customer_visible_search_state?.result_count,
      denied_candidate_count: deniedSearch.internal_ui_evidence?.denied_candidate_count,
    });
  }

  const reviewSearch = createMasterDataPartySearchUiStateDescriptor({
    tenant_id,
    query: "review",
    visible_results: [reviewParty],
  });
  if (reviewSearch.ui_state !== "review_required" || !reviewSearch.review_required_claims.includes("party_search_review_state_required")) {
    addFinding("SEARCH_REVIEW_STATE", "Review-required search UI state must surface a review badge without opening runtime writes.", {
      ui_state: reviewSearch.ui_state,
    });
  }

  const deniedProfile = createMasterDataPartyProfileUiStateDescriptor({
    tenant_id,
    party_id: "party_g2d_denied",
    permission_outcome: "denied",
    hidden_fields: ["audit_payload"],
  });
  if (
    deniedProfile.ui_state !== "denied" ||
    deniedProfile.customer_visible_profile_state?.profile !== null ||
    JSON.stringify(deniedProfile.customer_visible_profile_state).includes("audit_payload")
  ) {
    addFinding("PROFILE_DENIED_STATE", "Denied profile UI state must hide profile details and audit payloads.");
  }

  const reviewProfile = createMasterDataPartyProfileUiStateDescriptor({
    tenant_id,
    party: reviewParty,
    review_required_reasons: ["duplicate_candidate_review_required"],
    hidden_fields: ["permission_rule_id"],
  });
  if (
    reviewProfile.ui_state !== "review_required" ||
    reviewProfile.customer_visible_profile_state?.review_badge_visible !== true ||
    Object.hasOwn(reviewProfile.customer_visible_profile_state ?? {}, "review_required_reasons")
  ) {
    addFinding("PROFILE_REVIEW_STATE", "Review-required profile UI state must show only safe review state.", {
      ui_state: reviewProfile.ui_state,
    });
  }

  const closeout = createMasterDataG2CloseoutDescriptor({
    crm_reference_evidence: ["G3 CRM intake consumes Party.party_id only after G2 acceptance"],
    matter_reference_evidence: ["G4 Matter/DMS runtime references Party Master identity"],
    billing_reference_evidence: ["G5 Billing references Party Master BillingProfile identity"],
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
  if (
    closeout.outcome !== "review_required" ||
    closeout.missing_evidence.length !== 0 ||
    closeout.g2_runtime_write_readiness_claim !== "open" ||
    closeout.pr_state?.merge_authority !== "human_only" ||
    closeout.writes_product_state !== false
  ) {
    addFinding("G2_CLOSEOUT_DESCRIPTOR", "G2 closeout descriptor must retain references, command evidence, PR state, and open runtime readiness.", {
      outcome: closeout.outcome,
      missing_evidence: closeout.missing_evidence,
      readiness: closeout.g2_runtime_write_readiness_claim,
    });
  }

  const blockedCloseout = createMasterDataG2CloseoutDescriptor({
    runtime_write_readiness_claim: "open",
  });
  if (!blockedCloseout.blocked_claims.includes("g2_closeout_evidence_missing")) {
    addFinding("G2_CLOSEOUT_NEGATIVE", "G2 closeout descriptor must block when required evidence is missing.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G2-D validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G2-D validation passed.");
console.log("g2d_tuws: LFOS-G2-W02-T013/LFOS-G2-W02-T014");
console.log("ui_states: party_search_profile_denied_and_review_required");
console.log("closeout: crm_matter_billing_references_command_pr_human_review");
console.log("g2_runtime_write_readiness_claim: open");
