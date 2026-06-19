#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMatterClosingChecklistDescriptor,
  createMatterCoreRecord,
  createMatterDashboardUiStateDescriptor,
  createMatterG4ClosingChecklist,
  createMatterG4CMatterCloseoutDescriptor,
  createMatterSilentMatterVisibilityDescriptor,
} from "../packages/matter/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G4-W05-T011",
  "LFOS-G4-W05-T012",
  "LFOS-G4-W05-T013",
  "LFOS-G4-W05-T014",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "34-g4-matter-dms-entry-plan.md"),
  path.join(ROOT, "35-g4-a-matter-opening-foundation-report.md"),
  path.join(ROOT, "36-g4-b-matter-execution-workflow-report.md"),
  path.join(ROOT, "37-g4-c-matter-closeout-ui-report.md"),
  path.resolve("packages/matter/src/client-matter-g4.js"),
  path.resolve("packages/matter/test/client-matter-g4-closeout-ui.test.js"),
  path.resolve("contracts/matter-core-contract.json"),
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

function matter(tenant_id, matter_id, status = "open") {
  return createMatterCoreRecord("Matter", {
    matter_id,
    tenant_id,
    client_id: "party_g4c_validator",
    title: "G4-C validator matter",
    status,
    created_by: "actor_g4c_validator",
    created_at: "2026-06-19T00:00:00.000Z",
    permission_envelope_id: "perm_g4c_matter",
    audit_trace_id: "audit_g4c_matter",
  });
}

function checklist(tenant_id, matter_id, status = "active") {
  return createMatterG4ClosingChecklist({
    checklist_id: "checklist_g4c_validator",
    tenant_id,
    matter_id,
    title: "Matter closing checklist",
    status,
    item_ids: ["wip", "ar", "holds", "retention", "tasks"],
    permission_envelope_id: "perm_g4c_checklist",
    audit_trace_id: "audit_g4c_checklist",
  });
}

function closingMetrics(overrides = {}) {
  return {
    open_wip_amount: 0,
    open_ar_amount: 0,
    open_hold_count: 0,
    unresolved_task_count: 0,
    retention_acknowledged: true,
    final_invoice_reviewed: true,
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G4-C validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "34-g4-matter-dms-entry-plan.md"));
  const g4aReport = await readText(path.join(ROOT, "35-g4-a-matter-opening-foundation-report.md"));
  const g4bReport = await readText(path.join(ROOT, "36-g4-b-matter-execution-workflow-report.md"));
  const report = await readText(path.join(ROOT, "37-g4-c-matter-closeout-ui-report.md"));
  const source = await readText(path.resolve("packages/matter/src/client-matter-g4.js"));
  const testSource = await readText(path.resolve("packages/matter/test/client-matter-g4-closeout-ui.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/matter-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G4-C TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G4-C TUW missing from G4 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G4-C TUW missing from G4-C report.");
  }

  requireIncludes(g4aReport, "G4-A Matter Opening Foundation Report", "G4A_DEPENDENCY", "G4-C must build on G4-A opening evidence.");
  requireIncludes(g4bReport, "G4-B Matter Execution Workflow Report", "G4B_DEPENDENCY", "G4-C must build on G4-B execution evidence.");

  for (const phrase of [
    "G4-C Matter Closeout UI Report",
    "This slice does not claim G4 runtime readiness",
    "Matter closing checklist controls",
    "silent matter visibility support",
    "Matter dashboard UI ACL trimming",
    "WIP, AR, holds, unresolved tasks, retention acknowledgment, or final invoice review",
    "unauthorized and silent matters",
    "descriptor-only Matter closeout evidence",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G4-C report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createMatterG4ClosingChecklist",
    "createMatterClosingChecklistDescriptor",
    "createMatterSilentMatterVisibilityDescriptor",
    "createMatterDashboardUiStateDescriptor",
    "createMatterG4CMatterCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G4-C descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G4-C descriptor export missing test coverage.");
  }

  for (const marker of [
    "MATTER_G4C_DASHBOARD_HIDDEN_FIELDS",
    "matter_closing_wip_open",
    "matter_closing_ar_open",
    "silent_matter_unauthorized_count_leak_blocked",
    "matter_dashboard_hidden_field_leak_blocked",
    "trim_hidden_fields_before_dashboard_projection",
    "descriptor_evidence_only",
    "renders_live_dom",
    "g4_runtime_readiness_claim",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G4-C source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g4c:validate"] !== "node scripts/validate-client-matter-os-g4-c.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g4c:validate.");
  }

  if (contract.program?.program_id !== "RP05" || contract.service_boundary?.descriptor_only !== true) {
    addFinding("MATTER_CONTRACT_BOUNDARY", "Matter contract must remain RP05 descriptor-only evidence.");
  }

  const tenant_id = "tenant_g4c_validator";
  const matter_id = "matter_g4c_validator";
  const actor_id = "actor_g4c_validator";
  const blockedClosing = createMatterClosingChecklistDescriptor({
    tenant_id,
    actor_id,
    matter: matter(tenant_id, matter_id),
    checklist: checklist(tenant_id, matter_id),
    closing_metrics: closingMetrics({ open_wip_amount: 100, open_ar_amount: 25 }),
  });
  const closing = createMatterClosingChecklistDescriptor({
    tenant_id,
    actor_id,
    matter: matter(tenant_id, matter_id, "closing"),
    checklist: checklist(tenant_id, matter_id, "completed"),
    closing_metrics: closingMetrics(),
  });
  const visibility = createMatterSilentMatterVisibilityDescriptor({
    tenant_id,
    actor_id,
    matters: [
      { matter_id: "matter_visible", title: "Visible", status: "open", actor_can_view: true },
      { matter_id: "matter_silent", title: "Silent", status: "open", silent_matter: true, actor_can_view: false },
    ],
  });
  const dashboard = createMatterDashboardUiStateDescriptor({
    tenant_id,
    actor_id,
    selected_matter_id: "matter_silent",
    matters: [
      { matter_id: "matter_visible", title: "Visible", status: "open", actor_can_view: true, conflict_memo: "Hidden" },
      { matter_id: "matter_silent", title: "Silent", status: "open", silent_matter: true, actor_can_view: false },
    ],
  });
  const closeout = createMatterG4CMatterCloseoutDescriptor({
    tenant_id,
    descriptors: [closing, visibility, dashboard],
  });

  if (
    blockedClosing.outcome !== "blocked" ||
    !blockedClosing.blocked_claims.includes("matter_closing_wip_open") ||
    !blockedClosing.blocked_claims.includes("matter_closing_ar_open") ||
    blockedClosing.closing_receipt.closing_persisted !== false
  ) {
    addFinding("CLOSING_BLOCKERS", "Closing checklist must block WIP and AR without persistence.");
  }
  if (closing.outcome !== "review_required" || closing.closing_receipt.wip_ar_block_tested !== true) {
    addFinding("CLOSING_READY", "Clear closing checklist must produce review-required descriptor evidence.");
  }
  if (
    visibility.outcome !== "review_required" ||
    visibility.visible_matters.length !== 1 ||
    visibility.omitted_matter_count_exposed !== null ||
    visibility.silent_matter_presence_leaked !== false ||
    visibility.unauthorized_count_leaked !== false
  ) {
    addFinding("SILENT_VISIBILITY", "Silent matter descriptor must omit unauthorized matters and hidden counts.");
  }
  if (
    dashboard.outcome !== "review_required" ||
    dashboard.visible_matter_cards.length !== 1 ||
    !dashboard.visible_matter_cards[0].removed_fields.includes("conflict_memo") ||
    dashboard.detail_panel.state !== "not_found_or_not_authorized" ||
    dashboard.dashboard_receipt.live_dom_rendered !== false
  ) {
    addFinding("DASHBOARD_ACL", "Dashboard descriptor must trim ACL-hidden fields and deny unauthorized detail.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 4 ||
    closeout.matter_closing_checklist_tested !== true ||
    closeout.silent_matter_omission_tested !== true ||
    closeout.dashboard_acl_trimming_tested !== true ||
    closeout.matter_runtime_evidence_status !== "descriptor_evidence_only" ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G4C_CLOSEOUT", "G4-C closeout must summarize Matter closeout UI evidence and keep readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G4-C validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G4-C validation passed.");
console.log("g4c_tuws: LFOS-G4-W05-T011/LFOS-G4-W05-T012/LFOS-G4-W05-T013/LFOS-G4-W05-T014");
console.log("closing_checklist: wip_ar_hold_task_retention_blocks");
console.log("silent_matter: unauthorized_omission_without_count_leak");
console.log("dashboard_ui: acl_trimming_and_hidden_field_removal");
console.log("matter_closeout: descriptor_evidence_only");
console.log("g4_runtime_readiness_claim: open");
