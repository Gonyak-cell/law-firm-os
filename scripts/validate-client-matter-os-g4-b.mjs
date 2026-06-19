#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMatterCalendarDeadlineChangeDescriptor,
  createMatterClientReportProjectionDescriptor,
  createMatterCoreRecord,
  createMatterCriticalDeadlineDualControlDescriptor,
  createMatterG4BExecutionWorkflowCloseoutDescriptor,
  createMatterG4Member,
  createMatterStatusHistoryDescriptor,
  createMatterTaskTransitionDescriptor,
  createMatterTeamUiStateDescriptor,
  MATTER_G4B_CLIENT_REPORT_HIDDEN_FIELDS,
} from "../packages/matter/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G4-W05-T005",
  "LFOS-G4-W05-T006",
  "LFOS-G4-W05-T007",
  "LFOS-G4-W05-T008",
  "LFOS-G4-W05-T009",
  "LFOS-G4-W05-T010",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "34-g4-matter-dms-entry-plan.md"),
  path.join(ROOT, "35-g4-a-matter-opening-foundation-report.md"),
  path.join(ROOT, "36-g4-b-matter-execution-workflow-report.md"),
  path.resolve("packages/matter/src/client-matter-g4.js"),
  path.resolve("packages/matter/test/client-matter-g4-execution.test.js"),
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

function member(tenant_id, matter_id) {
  return createMatterG4Member({
    member_id: "member_g4b_validator",
    tenant_id,
    matter_id,
    user_id: "user_g4b_owner",
    role: "responsible_attorney",
    status: "active",
    permission_envelope_id: "perm_g4b_member",
    audit_trace_id: "audit_g4b_member",
  });
}

function task(tenant_id, matter_id, status = "todo") {
  return createMatterCoreRecord("MatterTask", {
    task_id: "task_g4b_validator",
    tenant_id,
    matter_id,
    title: "Prepare execution checklist",
    status,
    created_by: "actor_g4b_validator",
    permission_envelope_id: "perm_g4b_task",
    audit_trace_id: "audit_g4b_task",
  });
}

function event(tenant_id, matter_id) {
  return createMatterCoreRecord("MatterCalendarEvent", {
    event_id: "event_g4b_validator",
    tenant_id,
    matter_id,
    title: "Filing deadline",
    status: "scheduled",
    starts_at: "2026-07-01T00:00:00.000Z",
    ends_at: "2026-07-01T01:00:00.000Z",
    permission_envelope_id: "perm_g4b_event",
    audit_trace_id: "audit_g4b_event",
  });
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G4-B validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "34-g4-matter-dms-entry-plan.md"));
  const g4aReport = await readText(path.join(ROOT, "35-g4-a-matter-opening-foundation-report.md"));
  const report = await readText(path.join(ROOT, "36-g4-b-matter-execution-workflow-report.md"));
  const source = await readText(path.resolve("packages/matter/src/client-matter-g4.js"));
  const testSource = await readText(path.resolve("packages/matter/test/client-matter-g4-execution.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/matter-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G4-B TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G4-B TUW missing from G4 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G4-B TUW missing from G4-B report.");
  }

  requireIncludes(g4aReport, "G4-A Matter Opening Foundation Report", "G4A_DEPENDENCY", "G4-B must build on G4-A opening evidence.");

  for (const phrase of [
    "G4-B Matter Execution Workflow Report",
    "This slice does not claim G4 runtime readiness",
    "Matter team UI",
    "MatterTask status transitions",
    "deadline-change audit evidence",
    "two-person confirmation",
    "immutable, audit-bound status history",
    "client-safe report projection",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G4-B report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createMatterTeamUiStateDescriptor",
    "createMatterTaskTransitionDescriptor",
    "createMatterCalendarDeadlineChangeDescriptor",
    "createMatterCriticalDeadlineDualControlDescriptor",
    "createMatterStatusHistoryDescriptor",
    "createMatterClientReportProjectionDescriptor",
    "createMatterG4BExecutionWorkflowCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G4-B descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G4-B descriptor export missing test coverage.");
  }

  for (const marker of [
    "MATTER_G4B_TASK_STATUS_TRANSITIONS",
    "matter_team_add_remove_audit_required",
    "matter_task_status_transition_invalid",
    "matter_deadline_change_noop",
    "critical_deadline_two_person_confirmation_required",
    "immutable_history_required",
    "portal_projection_safe",
    "g4_runtime_readiness_claim",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G4-B source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g4b:validate"] !== "node scripts/validate-client-matter-os-g4-b.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g4b:validate.");
  }

  if (contract.program?.program_id !== "RP05" || contract.service_boundary?.descriptor_only !== true) {
    addFinding("MATTER_CONTRACT_BOUNDARY", "Matter contract must remain RP05 descriptor-only evidence.");
  }

  const tenant_id = "tenant_g4b_validator";
  const matter_id = "matter_g4b_validator";
  const actor_id = "actor_g4b_validator";
  const team = createMatterTeamUiStateDescriptor({
    tenant_id,
    actor_id,
    matter_id,
    action: "add_member",
    members: [member(tenant_id, matter_id), { ...member(tenant_id, matter_id), member_id: "hidden", hidden_from_actor: true }],
    audit_ref: "audit:g4b:team-add",
  });
  const taskTransition = createMatterTaskTransitionDescriptor({
    tenant_id,
    actor_id,
    task: task(tenant_id, matter_id),
    to_status: "in_progress",
    transition_reason: "Work started.",
    audit_ref: "audit:g4b:task-transition",
  });
  const invalidTaskTransition = createMatterTaskTransitionDescriptor({
    tenant_id,
    actor_id,
    task: task(tenant_id, matter_id, "done"),
    to_status: "todo",
    transition_reason: "Invalid reopen.",
    audit_ref: "audit:g4b:task-invalid",
  });
  const deadline = createMatterCalendarDeadlineChangeDescriptor({
    tenant_id,
    actor_id,
    event: event(tenant_id, matter_id),
    new_starts_at: "2026-07-02T00:00:00.000Z",
    change_reason: "Court deadline moved.",
    audit_ref: "audit:g4b:deadline-change",
  });
  const dualControl = createMatterCriticalDeadlineDualControlDescriptor({
    tenant_id,
    matter_id,
    event_id: "event_g4b_validator",
    requester_user_id: "user_g4b_owner",
    confirmer_user_id: "user_g4b_partner",
    confirmation_audit_ref: "audit:g4b:dual-control",
  });
  const history = createMatterStatusHistoryDescriptor({
    tenant_id,
    matter_id,
    from_status: "opening",
    to_status: "open",
    actor_id,
    reason: "Opening reviewed.",
    audit_ref: "audit:g4b:history",
  });
  const reportProjection = createMatterClientReportProjectionDescriptor({
    tenant_id,
    matter_id,
    client_report_id: "client_report_g4b_validator",
    source_report: {
      conflict_memo: "Hidden",
      sections: [
        { section_id: "summary", body: "Safe", client_visible: true, billing_detail: "Hidden" },
        { section_id: "strategy", body: "Privileged", privileged: true, client_visible: false },
      ],
    },
  });
  const closeout = createMatterG4BExecutionWorkflowCloseoutDescriptor({
    tenant_id,
    descriptors: [team, taskTransition, deadline, dualControl, history, reportProjection],
  });

  if (
    team.outcome !== "review_required" ||
    team.visible_members.length !== 1 ||
    team.unauthorized_count_leaked !== false ||
    team.ui_receipt.member_write_persisted !== false
  ) {
    addFinding("TEAM_UI", "Team UI descriptor must trim hidden members and avoid writes/leaks.");
  }
  if (
    taskTransition.outcome !== "review_required" ||
    invalidTaskTransition.outcome !== "blocked" ||
    !invalidTaskTransition.blocked_claims.includes("matter_task_status_transition_invalid")
  ) {
    addFinding("TASK_TRANSITION", "MatterTask descriptor must enforce allowed transitions.");
  }
  if (deadline.outcome !== "review_required" || deadline.deadline_receipt.deadline_change_persisted !== false) {
    addFinding("DEADLINE_CHANGE", "Deadline change descriptor must require audit evidence without persistence.");
  }
  if (dualControl.outcome !== "review_required" || dualControl.dual_control_receipt.two_person_confirmation_required !== true) {
    addFinding("DUAL_CONTROL", "Critical deadline descriptor must require two-person confirmation.");
  }
  if (
    history.outcome !== "review_required" ||
    history.history_record.immutable_history !== true ||
    Object.isFrozen(history.history_record) !== true
  ) {
    addFinding("STATUS_HISTORY", "MatterStatusHistory descriptor must be immutable and audit-bound.");
  }
  if (
    !MATTER_G4B_CLIENT_REPORT_HIDDEN_FIELDS.includes("conflict_memo") ||
    reportProjection.outcome !== "review_required" ||
    reportProjection.portal_projection_safe !== true ||
    !reportProjection.removed_fields.includes("billing_detail") ||
    reportProjection.projection_receipt.portal_published !== false
  ) {
    addFinding("CLIENT_REPORT", "Client report projection must strip hidden fields and avoid portal publishing.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 6 ||
    closeout.matter_team_ui_audit_tested !== true ||
    closeout.matter_task_transition_tested !== true ||
    closeout.deadline_change_audit_tested !== true ||
    closeout.critical_deadline_dual_control_tested !== true ||
    closeout.matter_status_history_tested !== true ||
    closeout.client_report_projection_tested !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G4B_CLOSEOUT", "G4-B closeout must summarize all execution workflow evidence and keep readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G4-B validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G4-B validation passed.");
console.log("g4b_tuws: LFOS-G4-W05-T005/LFOS-G4-W05-T006/LFOS-G4-W05-T007/LFOS-G4-W05-T008/LFOS-G4-W05-T009/LFOS-G4-W05-T010");
console.log("team_ui: add_remove_audit_and_hidden_member_trim");
console.log("task_calendar: status_transition_and_deadline_audit");
console.log("critical_deadline: two_person_confirmation_required");
console.log("status_history: immutable_audit_bound");
console.log("client_report: portal_projection_safe");
console.log("g4_runtime_readiness_claim: open");
