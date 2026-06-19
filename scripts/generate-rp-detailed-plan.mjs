#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalProgramId, programById, programs, standardPhases } from "./rp-detailed-plan-catalog.mjs";

const OUTPUT_DIR = path.resolve("docs");
const handAuthoredProgramIds = new Set(programs.filter((program) => program.handAuthored).map((program) => program.id));

function usage() {
  console.error("Usage: node scripts/generate-rp-detailed-plan.mjs RP03|all");
  process.exit(1);
}

function commandListFor(phaseId) {
  const commands = ["npm run validate", "npm run fullplan:validate"];
  if (!["P00", "P01"].includes(phaseId)) commands.push("npm test");
  if (["P04", "P08", "P09"].includes(phaseId)) commands.push("npm run build");
  return commands;
}

function filesFor(program, phase) {
  if (phase.id === "P00") return [`contracts/${program.packageName}-contract.json`, `packages/${program.packageName}/README.md`, ...program.primaryFiles.slice(0, 1)];
  if (phase.id === "P01") return [`packages/${program.packageName}/src/model.js`, `packages/${program.packageName}/src/states.js`, `packages/${program.packageName}/src/registry.js`];
  if (phase.id === "P02") return [`packages/${program.packageName}/src/service.js`, `packages/${program.packageName}/src/policies.js`, `packages/${program.packageName}/src/validators.js`];
  if (phase.id === "P03") return [`packages/${program.packageName}/src/index.js`, `packages/${program.packageName}/src/api-contract.js`, `packages/${program.packageName}/src/errors.js`];
  if (phase.id === "P04") return ["apps/web/src/main.jsx", "apps/web/src/styles.css", `docs/${program.id.toLowerCase()}-ui-surface.md`];
  if (phase.id === "P05") return [`packages/${program.packageName}/src/fixtures.js`, `packages/${program.packageName}/fixtures/golden-cases.json`];
  if (phase.id === "P06") return [`packages/${program.packageName}/src/security-contract.js`, `packages/${program.packageName}/src/audit-hints.js`, "packages/audit/README.md"];
  if (phase.id === "P07") return [`packages/${program.packageName}/test/failure-cases.test.js`, `docs/${program.id.toLowerCase()}-recovery-notes.md`];
  if (phase.id === "P08") return ["hermes/project.json", "docs/hermes-connection.md", `docs/${program.id.toLowerCase()}-hermes-evidence-template.md`];
  return [`docs/${program.id.toLowerCase()}-claude-cross-validation-brief.md`, `docs/${program.id.toLowerCase()}-human-approval-summary.md`];
}

function testsFor(program, phase) {
  if (phase.id === "P00") return ["scripts/validate-product-contract.mjs"];
  if (phase.id === "P01") return [`packages/${program.packageName}/test/model.test.js`];
  if (phase.id === "P02") return [`packages/${program.packageName}/test/service.test.js`];
  if (phase.id === "P03") return [`packages/${program.packageName}/test/interface.test.js`];
  if (phase.id === "P04") return ["npm run build"];
  if (phase.id === "P05") return [`packages/${program.packageName}/test/golden-cases.test.js`];
  if (phase.id === "P06") return [`packages/${program.packageName}/test/security-audit.test.js`];
  if (phase.id === "P07") return [`packages/${program.packageName}/test/failure-cases.test.js`];
  return ["npm run validate", "npm run fullplan:validate", "npm test"];
}

function microTemplatesFor(program, phase) {
  const [entityA, entityB, entityC, entityD, entityE] = program.entities;
  const [workflowA, workflowB, workflowC, workflowD, workflowE] = program.workflows;
  const [surfaceA, surfaceB, surfaceC, surfaceD] = program.uiSurfaces;
  const [caseA, caseB, caseC, caseD] = program.goldenCases;
  const [riskA, riskB, riskC, riskD, riskE] = program.risks;

  const phaseTemplates = {
    P00: [
      ["M00", "Inventory spec and acceptance source", `Extract ${program.scope} requirements and identify ${riskA}, ${riskB}, and ${riskC} as explicit acceptance risks.`],
      ["M01", "Draft contract shell", `Create the future ${program.title} contract shape for ${program.entities.join(", ")}.`],
      ["M02", "Define ownership boundary", `Record which module owns ${entityA}, ${entityB}, and ${entityC}, and which modules may only reference them.`],
      ["M03", "Define lifecycle gates", `Lock entry, review, approval, blocked, and closeout states for ${workflowA}, ${workflowB}, and ${workflowC}.`],
      ["M04", "Define Matter-first trace rules", `State how ${program.title} records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.`],
      ["M05", "Define permission and audit baseline", `Record the minimum permission decision and audit evidence required before ${program.title} behavior can run.`],
      ["M06", "Define synthetic-only fixture policy", `State that ${program.title} examples use fake tenants, users, matters, documents, and financial values only.`],
      ["M07", "Define validation command matrix", `List the product commands required to verify ${program.title} planning and later implementation.`],
      ["M08", `Prepare ${program.hermesGate} preflight`, `Define the fields Hermes records before ${program.title} implementation starts.`],
      ["M09", `Prepare ${program.claudeGate} design brief`, `Prepare Claude Code questions around ${riskA}, ${riskB}, ${riskC}, and missing tests.`],
      ["M10", `Close ${program.id}.P00 handoff`, `Hand off a contract-first ${program.title} implementation scope to AI.`],
    ],
    P01: [
      ["M00", "Create package structure", `Create src, test, fixture, and README layout for packages/${program.packageName}.`],
      ["M01", `Implement ${entityA} model`, `Define identifiers, tenant scope, Matter references, status fields, and audit metadata for ${entityA}.`],
      ["M02", `Implement ${entityB} model`, `Define required fields, references, ownership metadata, and state constraints for ${entityB}.`],
      ["M03", `Implement ${entityC} model`, `Define required fields, relationship references, allowed states, and security attributes for ${entityC}.`],
      ["M04", `Implement ${entityD} model`, `Define required fields, lifecycle states, ownership boundaries, and audit references for ${entityD}.`],
      ["M05", `Implement ${entityE} model`, `Define required fields, state transitions, permission attributes, and reporting references for ${entityE}.`],
      ["M06", "Implement relationship map", `Map relationships among ${program.entities.join(", ")} and their Core/Matter/DMS dependencies.`],
      ["M07", "Implement state enum registry", `Create stable status, type, effect, and outcome enums for ${program.title}.`],
      ["M08", "Implement validation registry", `Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.`],
      ["M09", "Export model registry", `Export ${program.title} model definitions through a stable package interface.`],
      ["M10", "Close domain model phase", `Confirm the ${program.title} model surface is implementation-ready and does not require new scope decisions.`],
    ],
    P02: [
      ["M00", "Define service entrypoints", `Create deterministic service entrypoints for ${workflowA}, ${workflowB}, and ${workflowC}.`],
      ["M01", `Implement ${workflowA}`, `Implement validation, permission precheck, audit hint, and state transition logic for ${workflowA}.`],
      ["M02", `Implement ${workflowB}`, `Implement validation, permission precheck, audit hint, and state transition logic for ${workflowB}.`],
      ["M03", `Implement ${workflowC}`, `Implement validation, permission precheck, audit hint, and state transition logic for ${workflowC}.`],
      ["M04", `Implement ${workflowD}`, `Implement validation, permission precheck, audit hint, and state transition logic for ${workflowD}.`],
      ["M05", `Implement ${workflowE}`, `Implement validation, permission precheck, audit hint, and state transition logic for ${workflowE}.`],
      ["M06", "Implement blocked-claim handling", `Return explicit blocked claims for ${riskA}, ${riskB}, and ${riskC}.`],
      ["M07", "Implement idempotency and locking", `Define idempotency, duplicate handling, and lock behavior for risky ${program.title} operations.`],
      ["M08", "Implement validation summary", `Return pass/fail, checked rules, warning count, and blocked claims for Hermes ${program.hermesGate}.`],
      ["M09", "Implement review-required routing", `Route high-risk or ambiguous ${program.title} outcomes to attorney or admin review instead of direct mutation.`],
      ["M10", "Close service logic phase", `Confirm ${program.title} services are deterministic, auditable, and fail closed where required.`],
    ],
    P03: [
      ["M00", "Define public exports", `Expose ${program.title} models, services, fixtures, validators, and error codes from package index.`],
      ["M01", `Define ${workflowA} API`, `Lock request, response, permission, audit, and error shape for ${workflowA}.`],
      ["M02", `Define ${workflowB} API`, `Lock request, response, permission, audit, and error shape for ${workflowB}.`],
      ["M03", `Define ${workflowC} API`, `Lock request, response, permission, audit, and error shape for ${workflowC}.`],
      ["M04", `Define ${workflowD} API`, `Lock request, response, permission, audit, and error shape for ${workflowD}.`],
      ["M05", `Define ${workflowE} API`, `Lock request, response, permission, audit, and error shape for ${workflowE}.`],
      ["M06", "Define serialization contract", `Ensure ${program.title} API responses serialize without leaking hidden policy internals or unauthorized data.`],
      ["M07", "Define stable error codes", `Add error codes for ${riskA}, ${riskB}, ${riskC}, ${riskD}, and review_required.`],
      ["M08", "Define Hermes consumption shape", `Expose enough result metadata for ${program.hermesGate} evidence without making Hermes product authority.`],
      ["M09", "Define Claude review summary", `Expose enough interface summary for ${program.claudeGate} cross-validation.`],
      ["M10", "Close API interface phase", `Freeze ${program.title} public interface until a later RP explicitly extends it.`],
    ],
    P04: [
      ["M00", "Inventory UI surfaces", `Identify ${surfaceA}, ${surfaceB}, ${surfaceC}, and ${surfaceD} in the Jira-like Law Firm OS UI.`],
      ["M01", `Plan ${surfaceA}`, `Map data, loading state, empty state, denied state, and audit hints for ${surfaceA}.`],
      ["M02", `Plan ${surfaceB}`, `Map data, loading state, empty state, denied state, and audit hints for ${surfaceB}.`],
      ["M03", `Plan ${surfaceC}`, `Map data, loading state, empty state, denied state, and audit hints for ${surfaceC}.`],
      ["M04", `Plan ${surfaceD}`, `Map data, loading state, empty state, denied state, and audit hints for ${surfaceD}.`],
      ["M05", "Plan review-required UI", `Show high-risk ${program.title} outcomes as review queue items, not silent successes.`],
      ["M06", "Plan permission-trimmed UI", `Ensure unauthorized ${program.title} rows, counts, snippets, and citations are hidden before display.`],
      ["M07", "Plan responsive density", `Keep ${program.title} context readable on desktop and mobile without marketing-page layout.`],
      ["M08", "Prepare Hermes UI evidence", `Record that UI is presentation-only and cannot override ${program.title} service decisions.`],
      ["M09", "Prepare Claude UI review", `Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for ${program.title}.`],
      ["M10", "Close UI operator phase", `Confirm UI scope is ready for implementation without inventing extra product behavior.`],
    ],
    P05: [
      ["M00", "Define base tenant fixture", `Create a fake tenant, users, roles, matters, and documents for ${program.title}.`],
      ["M01", `Define ${caseA} golden case`, `Create a synthetic golden case proving ${caseA}.`],
      ["M02", `Define ${caseB} golden case`, `Create a synthetic golden case proving ${caseB}.`],
      ["M03", `Define ${caseC} golden case`, `Create a synthetic golden case proving ${caseC}.`],
      ["M04", `Define ${caseD} golden case`, `Create a synthetic golden case proving ${caseD}.`],
      ["M05", `Define ${riskA} failure fixture`, `Create a synthetic failing case that proves ${riskA} is blocked or reviewed.`],
      ["M06", `Define ${riskB} failure fixture`, `Create a synthetic failing case that proves ${riskB} is blocked or reviewed.`],
      ["M07", `Define ${riskC} failure fixture`, `Create a synthetic failing case that proves ${riskC} is blocked or reviewed.`],
      ["M08", "Define replayable fixture manifest", `Serialize ${program.title} fixtures with expected decisions, audit hints, and Hermes evidence labels.`],
      ["M09", "Define AI retrieval/report fixture", `If ${program.title} appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.`],
      ["M10", "Close fixtures phase", `Confirm ${program.title} fixtures are synthetic, deterministic, and reusable by tests and Hermes.`],
    ],
    P06: [
      ["M00", "Define permission contract", `Specify required permission checks for ${workflowA}, ${workflowB}, ${workflowC}, and ${workflowD}.`],
      ["M01", "Bind view/search permission", `Return permission decisions and trimming metadata for ${program.title} view and search surfaces.`],
      ["M02", "Bind mutation permission", `Return permission decisions, approval requirements, and blocked claims for ${program.title} mutations.`],
      ["M03", "Bind export/download permission", `Return stronger audit hints for ${program.title} export, download, or external-share actions.`],
      ["M04", "Bind audit event hints", `Return actor, action, object, decision, reason, and matched-rule hints for ${program.title}.`],
      ["M05", "Bind retention/governance hints", `Record legal hold, retention, DLP, or governance implications for ${program.title} where applicable.`],
      ["M06", "Bind analytics and AI trimming", `Ensure analytics rows and AI retrieval scopes for ${program.title} obey security trimming.`],
      ["M07", "Test permission-audit matrix", `Cover allowed, denied, review_required, approval_required, and blocked outcomes for ${program.title}.`],
      ["M08", `Prepare ${program.hermesGate} audit evidence`, `Record which ${program.title} decisions require downstream audit event persistence.`],
      ["M09", "Prepare Claude audit review", `Ask Claude to find missing audit hints or permission bypasses for ${program.title}.`],
      ["M10", "Close permission audit integration", `Confirm ${program.title} cannot ship without permission and audit evidence coverage.`],
    ],
    P07: [
      ["M00", `Define ${riskA} failure`, `Fail closed or require review when ${riskA} appears in ${program.title}.`],
      ["M01", `Define ${riskB} failure`, `Fail closed or require review when ${riskB} appears in ${program.title}.`],
      ["M02", `Define ${riskC} failure`, `Fail closed or require review when ${riskC} appears in ${program.title}.`],
      ["M03", `Define ${riskD} failure`, `Fail closed or require review when ${riskD} appears in ${program.title}.`],
      ["M04", `Define ${riskE} failure`, `Fail closed or require review when ${riskE} appears in ${program.title}.`],
      ["M05", "Define missing context failure", `Fail closed when tenant, Matter, actor, resource, or action context is missing for ${program.title}.`],
      ["M06", "Define cross-tenant failure", `Deny or block any ${program.title} operation where actor and resource tenant IDs differ.`],
      ["M07", "Define retry and rollback behavior", `Define retry, idempotency, rollback, and compensation behavior for failed ${program.title} operations.`],
      ["M08", "Define recovery handoff", `Document how a failed ${program.title} micro phase is corrected before advancing.`],
      ["M09", "Prepare Claude edge review", `Ask Claude to find missing failure cases, bypasses, and brittle assumptions for ${program.title}.`],
      ["M10", "Close failure phase", `Confirm dangerous ${program.title} ambiguity fails closed or requires review.`],
    ],
    P08: [
      ["M00", `Define ${program.hermesGate} command matrix`, `Record exact product commands Hermes should run for ${program.title}.`],
      ["M01", `Define ${program.hermesGate} evidence fields`, `Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.`],
      ["M02", `Define ${program.hermesGate} domain evidence`, `Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for ${program.title}.`],
      ["M03", `Define ${program.hermesGate} no-real-data evidence`, `Record that ${program.title} fixtures and examples contain only synthetic data.`],
      ["M04", `Define ${program.hermesGate} blocked-claim evidence`, `Record unsafe ${program.title} claims rejected by validators or tests.`],
      ["M05", `Define ${program.hermesGate} Claude dependency`, `Mark ${program.claudeGate} review mandatory before ${program.title} closeout.`],
      ["M06", `Define ${program.hermesGate} human approval note`, `Record what the human must approve for ${program.title}.`],
      ["M07", `Test ${program.hermesGate} command availability`, `Ensure npm scripts required by ${program.hermesGate} exist before handoff.`],
      ["M08", `Prepare ${program.hermesGate} evidence packet template`, `Create the evidence template Hermes will fill during ${program.title} implementation closeout.`],
      ["M09", `Prepare ${program.hermesGate} closeout criteria`, `Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for ${program.hermesGate}.`],
      ["M10", "Close Hermes binding phase", `Confirm Hermes validates ${program.title} behavior without owning product code.`],
    ],
    P09: [
      ["M00", `Prepare ${program.id} architecture review questions`, `Ask whether ${program.title} module boundaries, model shapes, and workflows match the specification.`],
      ["M01", `Prepare ${program.id} security review questions`, `Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for ${program.title}.`],
      ["M02", `Prepare ${program.id} bypass review questions`, `Ask Claude to find ${riskA}, ${riskB}, ${riskC}, ${riskD}, and ${riskE} bypasses.`],
      ["M03", `Prepare ${program.id} missing test questions`, `Ask what golden cases, failure cases, UI states, and contract tests are missing for ${program.title}.`],
      ["M04", `Prepare ${program.id} downstream readiness questions`, `Ask whether ${program.title} is ready for dependent modules and later enterprise hardening.`],
      ["M05", `Prepare ${program.id} risk register`, `List unresolved ${program.title} risks and route them to future RP corrections.`],
      ["M06", "Define Claude finding severity", `Use P0/P1/P2/P3 severity for ${program.title} findings.`],
      ["M07", "Define go/no-go verdict format", `Require PASS, PASS_WITH_FINDINGS, or BLOCK for ${program.title} closeout.`],
      ["M08", "Define finding-to-microphase routing", `Route each Claude finding to a concrete ${program.id}.Pxx.Mxx correction or later RP dependency.`],
      ["M09", "Prepare human approval summary", `Summarize what the user must approve before ${program.title} can be considered ready.`],
      ["M10", `Close ${program.id} detailed plan`, `Confirm ${program.title} is detailed enough for AI implementation without more planning decisions.`],
    ],
  };

  return phaseTemplates[phase.id];
}

function acceptanceFor(program) {
  return [
    "Deliverable is specific enough for AI implementation without choosing scope.",
    "No real client, matter, document, billing, settlement, credential, or secret data is used.",
    "Matter-first, DMS ownership, permission, audit, and tenant isolation invariants are preserved where applicable.",
    `Hermes ${program.hermesGate} evidence or blocked reason can be recorded.`,
    `Claude ${program.claudeGate} can independently review architecture, security, missing tests, and go/no-go status.`,
  ];
}

export function buildDetailedPlan(program) {
  const entries = [];
  for (const phase of standardPhases) {
    for (const [microId, microTitle, objective] of microTemplatesFor(program, phase)) {
      entries.push({
        id: `${program.id}.${phase.id}.${microId}`,
        program_id: program.id,
        program_title: program.title,
        program_scope: program.scope,
        phase_id: `${program.id}.${phase.id}`,
        phase_title: phase.title,
        phase_theme: phase.theme,
        micro_id: microId,
        micro_title: microTitle,
        objective,
        ai_owner: program.aiOwner,
        hermes_gate: program.hermesGate,
        claude_gate: program.claudeGate,
        target_files: filesFor(program, phase),
        target_tests: testsFor(program, phase),
        commands: commandListFor(phase.id),
        acceptance: acceptanceFor(program),
        status: "planned",
      });
    }
  }

  return {
    schema_version: "law-firm-os.rp-detailed-microphase-plan.v1",
    generated_from: "scripts/generate-rp-detailed-plan.mjs",
    program_id: program.id,
    program_title: program.title,
    program_scope: program.scope,
    ai_owner: program.aiOwner,
    hermes_gate: program.hermesGate,
    claude_gate: program.claudeGate,
    primary_files: program.primaryFiles,
    entities: program.entities,
    workflows: program.workflows,
    ui_surfaces: program.uiSurfaces,
    golden_cases: program.goldenCases,
    risks: program.risks,
    standard_phase_count: standardPhases.length,
    micro_phase_per_standard_phase: 11,
    micro_phase_count: entries.length,
    entries,
  };
}

function markdownFor(plan) {
  const lines = [];
  lines.push(`# ${plan.program_id} ${plan.program_title} Detailed Micro Phases v1`);
  lines.push("");
  lines.push(`Purpose: expand ${plan.program_id} from the 3,300-phase master ledger into implementation-ready micro phases.`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Program: ${plan.program_id} ${plan.program_title}`);
  lines.push(`- Scope: ${plan.program_scope}`);
  lines.push(`- Micro phases: ${plan.micro_phase_count}`);
  lines.push(`- AI owner: ${plan.ai_owner}`);
  lines.push(`- Hermes gate: ${plan.hermes_gate}`);
  lines.push(`- Claude Code gate: ${plan.claude_gate}`);
  lines.push(`- Immediate next implementation target: ${plan.program_id}.P00.M00`);
  lines.push(`- Primary files: ${plan.primary_files.join(", ")}`);
  lines.push(`- Entities: ${plan.entities.join(", ")}`);
  lines.push(`- Workflows: ${plan.workflows.join(", ")}`);
  lines.push(`- Golden cases: ${plan.golden_cases.join(", ")}`);
  lines.push(`- Risks: ${plan.risks.join(", ")}`);
  lines.push("");
  for (const phase of standardPhases) {
    const phaseEntries = plan.entries.filter((entry) => entry.phase_id === `${plan.program_id}.${phase.id}`);
    const firstEntry = phaseEntries[0];
    lines.push(`## ${plan.program_id}.${phase.id}: ${phase.title}`);
    lines.push("");
    lines.push(`Theme: ${phase.theme}`);
    lines.push("");
    lines.push(`Target files: ${firstEntry.target_files.join(", ")}`);
    lines.push("");
    lines.push(`Target tests: ${firstEntry.target_tests.join(", ")}`);
    lines.push("");
    for (const entry of phaseEntries) {
      lines.push(`- ${entry.id} | ${entry.micro_title} | ${entry.objective}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function writePlan(program) {
  const plan = buildDetailedPlan(program);
  const jsonPath = path.join(OUTPUT_DIR, `${program.fileBase}.json`);
  const mdPath = path.join(OUTPUT_DIR, `${program.fileBase}.md`);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(mdPath, markdownFor(plan));
  return { program, plan, jsonPath, mdPath };
}

const rawArg = process.argv[2];
if (!rawArg) usage();

const programId = canonicalProgramId(rawArg);
const requestedPrograms = programId === "ALL"
  ? programs.filter((program) => !handAuthoredProgramIds.has(program.id))
  : [programById(programId)].filter(Boolean);

if (requestedPrograms.length === 0) {
  console.error(`Unknown release program: ${rawArg}`);
  usage();
}

if (requestedPrograms.length === 1 && handAuthoredProgramIds.has(requestedPrograms[0].id)) {
  console.error(`${requestedPrograms[0].id} is hand-authored. Use its dedicated generator script.`);
  process.exit(1);
}

for (const program of requestedPrograms) {
  const result = await writePlan(program);
  console.log(`Generated ${result.program.id} detailed micro phases: ${result.plan.micro_phase_count}`);
  console.log(result.jsonPath);
  console.log(result.mdPath);
}
