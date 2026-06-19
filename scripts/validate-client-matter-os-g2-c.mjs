#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMasterDataDuplicateCandidateQueue,
  createMasterDataParty,
  createMasterDataPartyMergeSplitWorkflowDescriptor,
  createMasterDataRelatedPartySearchDescriptor,
  createMasterDataRelationship,
} from "../packages/master-data/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G2-W02-T010", "LFOS-G2-W02-T011", "LFOS-G2-W02-T012"];
const REQUIRED_FILES = [
  "11-full-tuw-catalog.md",
  "23-g2-party-master-entry-plan.md",
  "26-g2-c-duplicate-search-merge-report.md",
  "../../..//packages/master-data/src/service.js",
  "../../..//packages/master-data/src/registry.js",
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
  if (!(await exists(filePath))) addFinding("MISSING_FILE", "Missing G2-C validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "23-g2-party-master-entry-plan.md"));
  const report = await readText(path.join(ROOT, "26-g2-c-duplicate-search-merge-report.md"));
  const serviceSource = await readText(path.resolve("packages/master-data/src/service.js"));
  const testSource = await readText(path.resolve("packages/master-data/test/model.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/master-data-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G2-C TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G2-C TUW missing from G2 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G2-C TUW missing from G2-C report.");
  }

  for (const phrase of [
    "G2-C Duplicate Search and Merge Report",
    "This slice does not claim G2 runtime write readiness",
    "duplicate candidate queue",
    "related-party search",
    "audit-event and rollback evidence",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G2-C report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createMasterDataDuplicateCandidateQueue",
    "createMasterDataRelatedPartySearchDescriptor",
    "createMasterDataPartyMergeSplitWorkflowDescriptor",
  ]) {
    requireIncludes(serviceSource, `export function ${symbol}`, "MISSING_SERVICE_EXPORT", "G2-C service helper missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G2-C service helper missing test coverage.");
    if (!contract.public_exports?.includes(symbol)) addFinding("CONTRACT_PUBLIC_EXPORT", "Contract missing G2-C public export.", { symbol });
  }

  for (const risk of [
    "duplicate_candidate_review_required",
    "relationship_search_unauthorized_result",
    "merge_split_audit_rollback_required",
  ]) {
    if (!contract.acceptance_risks?.includes(risk)) addFinding("CONTRACT_RISK", "Master Data contract missing G2-C risk.", { risk });
  }

  if (pkg.scripts?.["client-matter:g2c:validate"] !== "node scripts/validate-client-matter-os-g2-c.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g2c:validate.");
  }

  const tenant_id = "tenant_g2c_validator";
  const owner_user_id = "user_g2c_validator";
  const sourceParty = createMasterDataParty({
    party_id: "party_g2c_source",
    tenant_id,
    party_type: "organization",
    display_name: "Validator Client Korea",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2c_source",
  });
  const candidateParty = createMasterDataParty({
    party_id: "party_g2c_candidate",
    tenant_id,
    party_type: "organization",
    display_name: "Validator Client Korea Ltd",
    status: "review_required",
    owner_user_id,
    canonical_entity_id: "entity_g2c_candidate",
  });
  const contactParty = createMasterDataParty({
    party_id: "party_g2c_contact",
    tenant_id,
    party_type: "person",
    display_name: "Validator Contact",
    status: "active",
    owner_user_id,
    canonical_entity_id: "entity_g2c_contact",
  });
  const duplicateQueue = createMasterDataDuplicateCandidateQueue({
    tenant_id,
    source_party_id: sourceParty.party_id,
    source_display_name: sourceParty.display_name,
    candidates: [
      {
        party_id: candidateParty.party_id,
        tenant_id,
        display_name: candidateParty.display_name,
        identity_key: candidateParty.identity_key,
      },
      {
        party_id: "party_cross_tenant",
        tenant_id: "tenant_other",
        display_name: sourceParty.display_name,
      },
    ],
  });
  if (duplicateQueue.outcome !== "review_required" || duplicateQueue.candidate_count !== 1) {
    addFinding("DUPLICATE_QUEUE", "Duplicate candidate queue must require review for one tenant-scoped similar name.", {
      outcome: duplicateQueue.outcome,
      candidate_count: duplicateQueue.candidate_count,
    });
  }
  if (duplicateQueue.writes_product_state !== false || duplicateQueue.executes_search !== false) {
    addFinding("DUPLICATE_QUEUE_BOUNDARY", "Duplicate candidate queue must remain descriptor-only.");
  }

  const relationship = createMasterDataRelationship({
    relationship_id: "relationship_g2c_contact",
    tenant_id,
    from_entity_id: contactParty.canonical_entity_id,
    to_entity_id: sourceParty.canonical_entity_id,
    from_party_id: contactParty.party_id,
    to_party_id: sourceParty.party_id,
    relationship_type: "primary_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id,
  });
  const relatedSearch = createMasterDataRelatedPartySearchDescriptor({
    tenant_id,
    query_party_id: sourceParty.party_id,
    relationships: [
      relationship,
      {
        relationship_id: "relationship_g2c_other_tenant",
        tenant_id: "tenant_other",
        from_party_id: "party_other",
        to_party_id: sourceParty.party_id,
        relationship_type: "blocked",
        direction: "organization_to_organization",
      },
    ],
    parties_by_id: {
      [contactParty.party_id]: contactParty,
      [sourceParty.party_id]: sourceParty,
    },
  });
  if (relatedSearch.result_count !== 1 || relatedSearch.unauthorized_result_count !== 0 || relatedSearch.hidden_unauthorized_candidate_count !== 1) {
    addFinding("RELATED_SEARCH", "Related-party descriptor must return tenant-scoped results and hide unauthorized candidates.", {
      result_count: relatedSearch.result_count,
      unauthorized_result_count: relatedSearch.unauthorized_result_count,
      hidden_unauthorized_candidate_count: relatedSearch.hidden_unauthorized_candidate_count,
    });
  }

  const mergeDescriptor = createMasterDataPartyMergeSplitWorkflowDescriptor({
    tenant_id,
    workflow_type: "merge",
    source_party_ids: [sourceParty.party_id, candidateParty.party_id],
    target_party_id: sourceParty.party_id,
    audit_hint_ref: "audit_hint_g2c",
    rollback_ref: "rollback_ref_g2c",
  });
  if (
    mergeDescriptor.outcome !== "review_required" ||
    mergeDescriptor.audit_event_descriptor?.writes_audit_event !== false ||
    mergeDescriptor.rollback_plan?.rollback_available !== true ||
    mergeDescriptor.rollback_plan?.executed !== false
  ) {
    addFinding("MERGE_DESCRIPTOR", "Merge descriptor must preserve review, audit, and rollback evidence without executing writes.", {
      outcome: mergeDescriptor.outcome,
    });
  }

  const blockedMerge = createMasterDataPartyMergeSplitWorkflowDescriptor({
    tenant_id,
    workflow_type: "merge",
    source_party_ids: [sourceParty.party_id, candidateParty.party_id],
    target_party_id: sourceParty.party_id,
  });
  if (!blockedMerge.blocked_claims.includes("merge_split_audit_rollback_required")) {
    addFinding("MERGE_DESCRIPTOR_NEGATIVE", "Merge descriptor must block without audit and rollback refs.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G2-C validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G2-C validation passed.");
console.log("g2c_tuws: LFOS-G2-W02-T010/LFOS-G2-W02-T011/LFOS-G2-W02-T012");
console.log("duplicate_detection: review_required_candidate_queue");
console.log("relationship_search: tenant_scoped_related_party_lookup");
console.log("merge_split: audit_descriptor_and_rollback_plan");
console.log("g2_runtime_write_readiness_claim: open");
