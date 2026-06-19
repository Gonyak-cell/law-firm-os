#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hrxProgram, standardPhases } from "./hrx-program-catalog.mjs";

const outputDir = "docs";

function commandListFor(phaseId) {
  const commands = ["npm run validate", "npm run fullplan:validate", "npm run hrx:requirements:validate"];
  if (!["P00", "P01"].includes(phaseId)) commands.push("npm test");
  return commands;
}

function phaseObjects(phaseId) {
  const map = {
    P00: ["scope", "admission", "non-goal", "decision", "review", "closeout"],
    P01: ["Employee", "EmploymentProfile", "HRDocument", "EmploymentContract", "CompensationRecord", "PeopleGraph"],
    P02: ["RuleEngine", "LeaveWorkflow", "AttendanceWorkflow", "RecruitmentWorkflow", "RiskWorkflow", "ApprovalWorkflow"],
    P03: ["HRApi", "EmployeeApi", "LeaveApi", "CandidateApi", "EvidenceApi", "ErrorModel"],
    P04: ["HROperations", "EmployeePortal", "CandidatePortal", "AIReviewQueue", "AdminPolicy", "DeniedState"],
    P05: ["SyntheticTenant", "EmployeeFixture", "CandidateFixture", "LeaveFixture", "RiskFixture", "AuditFixture"],
    P06: ["HRPermission", "SensitiveGuard", "PayrollRestriction", "EvaluationRestriction", "CandidatePrivacy", "AuditHint"],
    P07: ["MissingUserLink", "PayrollRuntimeAttempt", "AIScoringAttempt", "CrossTenantAccess", "StorageDecisionGap", "Recovery"],
    P08: ["H30CommandMatrix", "EvidenceTemplate", "NoRealData", "BlockedClaims", "ClaudeDependency", "HumanApproval"],
    P09: ["ArchitectureReview", "SecurityReview", "BypassReview", "MissingTests", "RiskRegister", "HumanSummary"],
  };
  return map[phaseId];
}

function buildPlan() {
  const entries = [];
  for (const phase of standardPhases) {
    const objects = phaseObjects(phase.id);
    for (let index = 0; index < 11; index += 1) {
      const microId = `M${String(index).padStart(2, "0")}`;
      const object = objects[index % objects.length];
      entries.push({
        id: `${hrxProgram.id}.${phase.id}.${microId}`,
        program_id: hrxProgram.id,
        program_title: hrxProgram.title,
        program_scope: hrxProgram.scope,
        phase_id: `${hrxProgram.id}.${phase.id}`,
        phase_title: phase.title,
        phase_theme: phase.theme,
        micro_id: microId,
        micro_title: `${object} HRX slice`,
        objective: `Define the ${object} slice for embedded HRX People/HR Evidence while preserving Law Firm OS boundaries, HR sensitive guards, audit evidence, and the no separate HRX product rule.`,
        ai_owner: hrxProgram.aiOwner,
        hermes_gate: hrxProgram.hermesGate,
        claude_gate: hrxProgram.claudeGate,
        target_files: [
          `docs/hrx-integration/${phase.id.toLowerCase()}-${microId.toLowerCase()}-notes.md`,
          "docs/hrx-requirement-ledger.json",
          "docs/hrx-weighted-implementation-ledger.json"
        ],
        target_tests: [
          "npm run hrx:requirements:validate",
          "npm run hrx:weighted:validate"
        ],
        commands: commandListFor(phase.id),
        acceptance: [
          "No real employee, candidate, payroll, client, matter, document, credential, or secret data is used.",
          "HRX remains embedded inside Law Firm OS and does not split into a separate product.",
          "User and Employee remain separate with Employee.user_id as the reverse link.",
          "Payroll calculation runtime remains deferred unless a later approved pack opens it.",
          "Hermes H30 and Claude C30 evidence can review the slice without owning product authority."
        ],
        status: "planned",
        hrx_embedded: true,
      });
    }
  }
  return {
    schema_version: "law-firm-os.rp-detailed-microphase-plan.v1",
    generated_from: "scripts/generate-hrx-detailed-plan.mjs",
    program_id: hrxProgram.id,
    program_title: hrxProgram.title,
    program_scope: hrxProgram.scope,
    ai_owner: hrxProgram.aiOwner,
    hermes_gate: hrxProgram.hermesGate,
    claude_gate: hrxProgram.claudeGate,
    primary_files: hrxProgram.primaryFiles,
    entities: hrxProgram.entities,
    workflows: hrxProgram.workflows,
    ui_surfaces: hrxProgram.uiSurfaces,
    golden_cases: hrxProgram.goldenCases,
    risks: hrxProgram.risks,
    standard_phase_count: standardPhases.length,
    micro_phase_per_standard_phase: 11,
    micro_phase_count: entries.length,
    hrx_embedded: true,
    entries,
  };
}

function markdownFor(plan) {
  const lines = [
    `# ${plan.program_id} ${plan.program_title} Detailed Micro Phases`,
    "",
    "Status: HRX embedded planning source. This is separate from the main RP00-RP29 catalog and does not alter scripts/rp-detailed-plan-catalog.mjs.",
    "",
    `- Micro phases: ${plan.micro_phase_count}`,
    `- Hermes gate: ${plan.hermes_gate}`,
    `- Claude gate: ${plan.claude_gate}`,
    `- HRX embedded: ${plan.hrx_embedded}`,
    "",
  ];
  for (const phase of standardPhases) {
    lines.push(`## ${plan.program_id}.${phase.id}: ${phase.title}`, "");
    for (const entry of plan.entries.filter((row) => row.phase_id === `${plan.program_id}.${phase.id}`)) {
      lines.push(`- ${entry.id} | ${entry.micro_title} | ${entry.objective}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

const plan = buildPlan();
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, `${hrxProgram.fileBase}.json`), `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(path.join(outputDir, `${hrxProgram.fileBase}.md`), markdownFor(plan));
console.log(`Generated ${hrxProgram.id} detailed micro phases: ${plan.micro_phase_count}`);
