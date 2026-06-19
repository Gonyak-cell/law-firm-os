#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createBillingG5AdjustmentWorkflowDescriptor,
  createBillingG5BWipPrebillAdjustmentCloseoutDescriptor,
  createBillingG5PreBillDescriptor,
  createBillingG5WipGenerationDescriptor,
  createBillingG5WipLockSnapshotDescriptor,
} from "../packages/billing/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G5-W07-T007",
  "LFOS-G5-W07-T008",
  "LFOS-G5-W07-T009",
  "LFOS-G5-W07-T010",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "41-g5-billing-finance-entry-plan.md"),
  path.join(ROOT, "42-g5-a-time-expense-foundation-report.md"),
  path.join(ROOT, "43-g5-b-wip-prebill-adjustment-report.md"),
  path.resolve("contracts/billing-core-contract.json"),
  path.resolve("packages/billing/src/client-matter-g5.js"),
  path.resolve("packages/billing/test/client-matter-g5-wip-prebill-adjustment.test.js"),
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

const tenant_id = "tenant_g5b_validator";
const matter_id = "matter_g5b_validator";

function approvedTime(overrides = {}) {
  return {
    time_entry_id: "time_g5b_validator",
    tenant_id,
    matter_id,
    status: "approved",
    billable: true,
    amount: 900,
    ...overrides,
  };
}

function wipItem(overrides = {}) {
  return {
    wip_item_id: "wip_g5b_validator",
    tenant_id,
    matter_id,
    source_ref: "time_g5b_validator",
    amount: 900,
    status: "open",
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    snapshot_id: "snapshot_g5b_validator",
    tenant_id,
    matter_id,
    locked_at: "2026-06-19T07:00:00Z",
    item_refs: ["wip_g5b_validator"],
    checksum: "sha256:g5b",
    ...overrides,
  };
}

function prebill(overrides = {}) {
  return {
    prebill_id: "prebill_g5b_validator",
    tenant_id,
    matter_id,
    snapshot_id: "snapshot_g5b_validator",
    review_status: "partner_review_required",
    partner_reviewer_id: "partner_g5b_validator",
    ...overrides,
  };
}

function adjustment(overrides = {}) {
  return {
    adjustment_id: "adjustment_g5b_validator",
    tenant_id,
    matter_id,
    prebill_id: "prebill_g5b_validator",
    adjustment_type: "write_down",
    amount: 100,
    reason_code: "client_discount",
    approval_status: "approved",
    approver_id: "partner_g5b_validator",
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G5-B validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "41-g5-billing-finance-entry-plan.md"));
  const g5aReport = await readText(path.join(ROOT, "42-g5-a-time-expense-foundation-report.md"));
  const report = await readText(path.join(ROOT, "43-g5-b-wip-prebill-adjustment-report.md"));
  const source = await readText(path.resolve("packages/billing/src/client-matter-g5.js"));
  const indexSource = await readText(path.resolve("packages/billing/src/index.js"));
  const testSource = await readText(path.resolve("packages/billing/test/client-matter-g5-wip-prebill-adjustment.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const billingContract = await readJson(path.resolve("contracts/billing-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G5-B TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G5-B TUW missing from G5 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G5-B TUW missing from G5-B report.");
  }

  requireIncludes(g5aReport, "G5-A Time Expense Foundation Report", "G5A_DEPENDENCY", "G5-B must build on G5-A evidence.");
  requireIncludes(riskRegister, "R-006", "R006_DEPENDENCY", "G5-B must preserve billing-profile ownership control.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G5-B must preserve descriptor/runtime confusion control.");

  for (const phrase of [
    "G5-B WIP PreBill Adjustment Report",
    "This slice does not claim G5 runtime readiness",
    "approved time creates WIP",
    "PreBill snapshot immutable",
    "partner review",
    "write-down/write-off approval",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G5-B report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createBillingG5WipGenerationDescriptor",
    "createBillingG5WipLockSnapshotDescriptor",
    "createBillingG5PreBillDescriptor",
    "createBillingG5AdjustmentWorkflowDescriptor",
    "createBillingG5BWipPrebillAdjustmentCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G5-B descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G5-B descriptor export missing test coverage.");
  }

  requireIncludes(indexSource, "client-matter-g5.js", "MISSING_INDEX_EXPORT", "billing index must export G5 Client-Matter descriptors.");

  for (const marker of [
    "wip_generation_unapproved_source_blocked",
    "wip_lock_snapshot_immutable_required",
    "prebill_partner_review_required",
    "adjustment_approval_required",
    "adjustment_issued_invoice_mutation_blocked",
    "g5_billing_closeout_evidence_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G5-B source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g5b:validate"] !== "node scripts/validate-client-matter-os-g5-b.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g5b:validate.");
  }

  if (
    billingContract.program?.program_id !== "RP12" ||
    billingContract.program?.descriptor_only !== true ||
    billingContract.no_write_attestation?.dispatches_billing_runtime !== false ||
    billingContract.no_write_attestation?.dispatches_proforma_runtime !== false ||
    billingContract.no_write_attestation?.dispatches_write_down_runtime !== false ||
    billingContract.no_write_attestation?.dispatches_invoice_runtime !== false
  ) {
    addFinding("BILLING_CONTRACT_BOUNDARY", "RP12 Billing contract must remain descriptor-only no-runtime evidence.");
  }

  const wip = createBillingG5WipGenerationDescriptor({
    tenant_id,
    matter_id,
    source_items: [approvedTime()],
  });
  const blockedWip = createBillingG5WipGenerationDescriptor({
    tenant_id,
    matter_id,
    source_items: [approvedTime({ status: "draft" })],
  });
  const locked = createBillingG5WipLockSnapshotDescriptor({
    tenant_id,
    matter_id,
    wip_items: [wipItem()],
    snapshot: snapshot(),
  });
  const blockedLocked = createBillingG5WipLockSnapshotDescriptor({
    tenant_id,
    matter_id,
    wip_items: [wipItem()],
    snapshot: snapshot({ item_refs: [], mutates_source_items: true }),
  });
  const review = createBillingG5PreBillDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    snapshot: snapshot(),
  });
  const blockedReview = createBillingG5PreBillDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill({ review_status: "draft", partner_reviewer_id: "" }),
    snapshot: snapshot(),
  });
  const approvedAdjustment = createBillingG5AdjustmentWorkflowDescriptor({
    tenant_id,
    matter_id,
    adjustment: adjustment(),
    prebill: prebill(),
  });
  const blockedAdjustment = createBillingG5AdjustmentWorkflowDescriptor({
    tenant_id,
    matter_id,
    adjustment: adjustment({ approval_status: "pending", approver_id: "", mutates_issued_invoice: true }),
    prebill: prebill(),
  });
  const closeout = createBillingG5BWipPrebillAdjustmentCloseoutDescriptor({
    tenant_id,
    descriptors: [wip, locked, review, approvedAdjustment],
  });

  if (
    wip.outcome !== "review_required" ||
    wip.approved_billable_item_count !== 1 ||
    blockedWip.outcome !== "blocked" ||
    !blockedWip.blocked_claims.includes("wip_generation_unapproved_source_blocked")
  ) {
    addFinding("WIP_GENERATION", "WIP generation must only consume approved billable sources.");
  }
  if (
    locked.outcome !== "review_required" ||
    locked.snapshot_receipt.prebill_snapshot_immutable_tested !== true ||
    blockedLocked.outcome !== "blocked" ||
    !blockedLocked.blocked_claims.includes("wip_lock_snapshot_immutable_required")
  ) {
    addFinding("WIP_LOCK_SNAPSHOT", "WIP lock snapshot must prove immutable PreBill snapshot evidence.");
  }
  if (
    review.outcome !== "review_required" ||
    review.prebill_receipt.partner_review_tested !== true ||
    blockedReview.outcome !== "blocked" ||
    !blockedReview.blocked_claims.includes("prebill_partner_review_required")
  ) {
    addFinding("PREBILL_REVIEW", "PreBill descriptor must require partner review evidence.");
  }
  if (
    approvedAdjustment.outcome !== "review_required" ||
    approvedAdjustment.adjustment_receipt.approval_required_tested !== true ||
    blockedAdjustment.outcome !== "blocked" ||
    !blockedAdjustment.blocked_claims.includes("adjustment_approval_required") ||
    !blockedAdjustment.blocked_claims.includes("adjustment_issued_invoice_mutation_blocked")
  ) {
    addFinding("ADJUSTMENT_WORKFLOW", "Adjustment workflow must require approval and block issued invoice mutation.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 4 ||
    closeout.g5_runtime_evidence_recorded !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G5B_CLOSEOUT", "G5-B closeout must summarize four TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G5-B validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G5-B validation passed.");
console.log("g5b_tuws: LFOS-G5-W07-T007/LFOS-G5-W07-T008/LFOS-G5-W07-T009/LFOS-G5-W07-T010");
console.log("wip_generation: approved_billable_sources_only");
console.log("prebill: immutable_snapshot_partner_review");
console.log("adjustment: write_down_write_off_approval_required");
console.log("g5_runtime_readiness_claim: open");
