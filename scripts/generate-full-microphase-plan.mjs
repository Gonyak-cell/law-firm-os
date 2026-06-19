#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("docs");
const JSON_PATH = path.join(OUTPUT_DIR, "full-spec-microphase-ledger.json");
const MD_PATH = path.join(OUTPUT_DIR, "full-spec-microphase-ledger.md");
const REQUIREMENT_LEDGER_PATH = path.resolve("docs/spec-requirement-ledger.json");

const programs = [
  ["RP00", "Product Constitution And AI Control Plane", "제품 계약, AI 개발 통제, Hermes H0 연결", "Codex", "H00", "C00"],
  ["RP01", "Core Domain Foundation", "Tenant, User, Role, Client, Matter, Document, AuditEvent", "Codex", "H01", "C01"],
  ["RP02", "Permission Kernel", "RBAC, ABAC, ACL, Deny Rule, Security Trimming", "Codex", "H02", "C02"],
  ["RP03", "Audit And Compliance Kernel", "append-only audit, tamper-evident hash chain, WORM retention, legal hold, trace correlation, privacy-safe evidence, admin access review, compliance export", "Codex", "H03", "C03"],
  ["RP04", "Master Data", "Entity, Person, Organization, Relationship, Client Group", "Codex", "H04", "C04"],
  ["RP05", "Matter Core", "Matter lifecycle, team, task, calendar, checklist, closing", "Codex/Cursor", "H05", "C05"],
  ["RP06", "DMS Core", "Workspace, Folder, Document, Version, FileObject, Rendition", "Codex/Cursor", "H06", "C06"],
  ["RP07", "Search OCR And Index", "keyword, metadata, OCR, clause, semantic index", "Codex", "H07", "C07"],
  ["RP08", "Email And Office Native DMS", "Outlook, Gmail, Office add-in, email filing", "Codex/Cursor", "H08", "C08"],
  ["RP09", "CRM And Business Development", "Lead, Opportunity, Activity, Proposal, Campaign, Referral", "Cursor/Codex", "H09", "C09"],
  ["RP10", "Intake Conflict Engagement", "ConflictCheck, ConflictHit, Waiver, Engagement, Fee Terms", "Codex", "H10", "C10"],
  ["RP11", "Time Expense Disbursement", "TimeEntry, rate card, expense, disbursement, evidence documents", "Codex", "H11", "C11"],
  ["RP12", "Billing And Invoicing", "Proforma, Invoice, TaxInvoice, write-down, write-off", "Codex", "H12", "C12"],
  ["RP13", "Payments AR Accounting Export", "Payment matching, AR aging, journal entry, VAT export", "Codex", "H13", "C13"],
  ["RP14", "Partner Settlement", "Origination, allocation, working credit, settlement run lock", "Codex", "H14", "C14"],
  ["RP15", "Firm Analytics", "Managing partner, partner, Matter P&L, forecast, WIP", "Cursor/Codex", "H15", "C15"],
  ["RP16", "Governance DLP Retention", "DLP, legal hold, retention, break-glass, incident response", "Codex", "H16", "C16"],
  ["RP17", "AI Governance", "Model policy, retrieval scope, audit, citation", "Codex", "H17", "C17"],
  ["RP18", "AI Legal Workflows", "Precedent, clause, markup, DD extraction, drafting, reports", "Codex", "H18", "C18"],
  ["RP19", "Client Portal", "Client users, secure link, client review, Q&A, watermark", "Cursor/Codex", "H19", "C19"],
  ["RP20", "Data Room And VDR", "M&A room, RFI, CP, closing binder, access analytics", "Codex/Cursor", "H20", "C20"],
  ["RP21", "Admin Console", "Taxonomy, templates, workflow, policy, usage, billing plan", "Cursor/Codex", "H21", "C21"],
  ["RP22", "External Integrations I", "Microsoft 365, Google Workspace, Slack/Teams, e-sign", "Codex", "H22", "C22"],
  ["RP23", "External Integrations II", "Bank, card, WEHAGO, 더존, tax export, DART", "Codex", "H23", "C23"],
  ["RP24", "Korean Legal Depth", "HWPX, Korean clauses, litigation, corporate documents", "Codex", "H24", "C24"],
  ["RP25", "Migration Platform", "file server, SharePoint, Drive, iManage import", "Codex", "H25", "C25"],
  ["RP26", "Enterprise SaaS Hardening", "dedicated DB/storage/index/key, SSO, MFA, SCIM", "Codex", "H26", "C26"],
  ["RP27", "Platform Extensibility", "public API, webhooks, workflow builder", "Codex", "H27", "C27"],
  ["RP28", "Marketplace And Custom AI Apps", "app registry, connector SDK, custom AI app review gate", "Codex", "H28", "C28"],
  ["RP29", "Commercial Readiness", "CI/CD, observability, SOC2/ISMS-P reports, release", "Codex", "H29", "C29"],
].map(([id, title, scope, aiOwner, hermesGate, claudeGate]) => ({ id, title, scope, aiOwner, hermesGate, claudeGate }));

const phaseTemplates = [
  ["P00", "Contract And Acceptance Baseline", "lock contracts, acceptance criteria, ownership, and explicit non-goals"],
  ["P01", "Domain Model", "define entities, fields, relationships, lifecycle states, and ownership"],
  ["P02", "Service Logic", "implement deterministic services, policies, state transitions, and validations"],
  ["P03", "API And Interface", "define API shape, request/response contracts, permissions, and errors"],
  ["P04", "UI And Operator Surface", "build screens, navigation, states, review queues, and operator actions"],
  ["P05", "Fixtures And Golden Cases", "create synthetic fixtures, golden cases, and replayable examples"],
  ["P06", "Permission Audit Integration", "bind permissions, deny rules, audit events, and security trimming"],
  ["P07", "Failure Edge And Recovery", "cover edge cases, rollback, lock states, retries, and blocked actions"],
  ["P08", "Hermes Validation Binding", "attach Hermes evidence, gate rows, command checks, and blocked claims"],
  ["P09", "Claude Cross Validation Closeout", "run independent Claude Code review and close findings"],
].map(([id, title, scope]) => ({ id, title, scope }));

const microTemplates = [
  ["M00", "Scope Inventory", "inventory requirements, entities, workflows, and open risks for this phase"],
  ["M01", "Contract Draft", "write or refresh contract rows, schema expectations, and acceptance gates"],
  ["M02", "Type And Shape Definition", "define fields, enums, identifiers, references, and ownership metadata"],
  ["M03", "Primary Implementation Slice", "implement the smallest useful product behavior for this phase"],
  ["M04", "Secondary Workflow Slice", "implement the supporting workflow, UI state, or integration seam"],
  ["M05", "Permission And Audit Binding", "bind role checks, deny checks, security trimming, and audit events"],
  ["M06", "Synthetic Fixture Set", "create synthetic fixtures and examples with no real client or matter data"],
  ["M07", "Test And Golden Case Set", "add unit, contract, integration, golden, or UI tests as appropriate"],
  ["M08", "Hermes Evidence Packet", "record commands, evidence summary, blocked claims, and gate outcome"],
  ["M09", "Claude Review Packet", "prepare architecture, security, missing-test, and go/no-go review packet"],
  ["M10", "Closeout And Next Handoff", "close findings, update ledger, and define the next micro phase handoff"],
].map(([id, title, action]) => ({ id, title, action }));

function titleCaseId(id) {
  return id.toLowerCase().replace(/\./g, "-");
}

function commandsFor(phaseId) {
  const base = ["npm run validate"];
  if (!["P00", "P01"].includes(phaseId)) base.push("npm test");
  if (["P04", "P08", "P09"].includes(phaseId)) base.push("npm run build");
  return base;
}

function acceptanceFor(program, phase, micro) {
  const checks = [
    `${program.id} ${phase.id} ${micro.id} has a concrete deliverable in the Law Firm OS repo or an explicit BLOCK record.`,
    "Only synthetic fixtures are used.",
    "Matter-first, DMS ownership, permission, and audit invariants remain intact where applicable.",
  ];
  if (micro.id === "M08") checks.push(`${program.hermesGate} evidence row is ready or a blocked reason is recorded.`);
  if (micro.id === "M09") checks.push(`${program.claudeGate} cross-validation packet is ready.`);
  if (micro.id === "M10") checks.push("Next micro phase handoff is unambiguous.");
  return checks;
}

function buildEntries() {
  const entries = [];
  for (const program of programs) {
    for (const phase of phaseTemplates) {
      for (const micro of microTemplates) {
        const id = `${program.id}.${phase.id}.${micro.id}`;
        entries.push({
          id,
          slug: titleCaseId(id),
          program_id: program.id,
          program_title: program.title,
          program_scope: program.scope,
          phase_id: `${program.id}.${phase.id}`,
          phase_title: phase.title,
          phase_scope: phase.scope,
          micro_id: micro.id,
          micro_title: micro.title,
          objective: `${micro.action} for ${program.title}: ${phase.title}.`,
          ai_owner: program.aiOwner,
          hermes_gate: program.hermesGate,
          claude_gate: program.claudeGate,
          law_firm_os_work: `Build or verify ${program.scope} inside the Law Firm OS product repo for ${phase.title}.`,
          hermes_work: `Record ${program.hermesGate} evidence, command result, blocked claims, and next gate readiness when this micro phase reaches validation.`,
          claude_code_work: `Cross-check ${program.title} for architecture, security, domain correctness, and missing tests when this micro phase is a review or closeout point.`,
          commands: commandsFor(phase.id),
          acceptance: acceptanceFor(program, phase, micro),
          status: "planned",
        });
      }
    }
  }
  return entries;
}

async function readRequirementLedger() {
  try {
    await access(REQUIREMENT_LEDGER_PATH);
    return JSON.parse(await readFile(REQUIREMENT_LEDGER_PATH, "utf8"));
  } catch {
    return { requirements: [] };
  }
}

function requirementRefsByMicroPhase(requirements) {
  const map = new Map();
  const fields = [
    ["primary_micro_phase_id", "primary_implementation"],
    ["contract_micro_phase_id", "contract"],
    ["test_micro_phase_id", "test"],
    ["hermes_micro_phase_id", "hermes_evidence"],
    ["claude_micro_phase_id", "claude_review"],
  ];
  for (const requirement of requirements) {
    for (const [field, role] of fields) {
      const microPhaseId = requirement[field];
      if (!microPhaseId) continue;
      const ref = {
        requirement_id: requirement.id,
        requirement_name: requirement.name,
        requirement_type: requirement.type,
        priority: requirement.priority,
        anchor_role: role,
      };
      map.set(microPhaseId, [...(map.get(microPhaseId) ?? []), ref]);
    }
  }
  return map;
}

function attachRequirementRefs(entries, requirementLedger) {
  const refsByMicro = requirementRefsByMicroPhase(requirementLedger.requirements ?? []);
  return entries.map((entry) => {
    const refs = refsByMicro.get(entry.id) ?? [];
    return {
      ...entry,
      requirement_refs: refs,
      requirement_ref_count: refs.length,
    };
  });
}

function buildMarkdown(entries) {
  const lines = [];
  lines.push("# Law Firm OS Full Spec Micro Phase Ledger v1");
  lines.push("");
  lines.push("Generated from the full-spec SaaS implementation plan.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Release Programs: ${programs.length}`);
  lines.push(`- Standard Phases per Program: ${phaseTemplates.length}`);
  lines.push(`- Micro Phases per Standard Phase: ${microTemplates.length}`);
  lines.push(`- Total Micro Phases: ${entries.length}`);
  lines.push("- Development model: AI-led implementation, Hermes validation, Claude Code cross-validation, human final approval.");
  lines.push("");
  lines.push("## Release Programs");
  lines.push("");
  for (const program of programs) {
    lines.push(`- ${program.id}: ${program.title} - ${program.scope} / AI: ${program.aiOwner} / Hermes: ${program.hermesGate} / Claude: ${program.claudeGate}`);
  }
  lines.push("");
  lines.push("## Micro Phase Ledger");
  for (const program of programs) {
    lines.push("");
    lines.push(`### ${program.id}: ${program.title}`);
    lines.push("");
    lines.push(`Scope: ${program.scope}`);
    lines.push("");
    for (const phase of phaseTemplates) {
      lines.push(`#### ${program.id}.${phase.id}: ${phase.title}`);
      lines.push("");
      for (const entry of entries.filter((row) => row.program_id === program.id && row.phase_id === `${program.id}.${phase.id}`)) {
        const reqs = entry.requirement_ref_count > 0 ? ` | Reqs: ${entry.requirement_refs.map((ref) => `${ref.requirement_id}:${ref.anchor_role}`).join(", ")}` : "";
        lines.push(`- ${entry.id} | ${entry.micro_title} | ${entry.objective} | Commands: ${entry.commands.join(", ")} | Hermes: ${entry.hermes_gate} | Claude: ${entry.claude_gate}${reqs}`);
      }
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

const requirementLedger = await readRequirementLedger();
const entries = attachRequirementRefs(buildEntries(), requirementLedger);
const duplicateIds = entries.length - new Set(entries.map((entry) => entry.id)).size;
if (duplicateIds !== 0) {
  throw new Error(`Duplicate micro phase IDs detected: ${duplicateIds}`);
}

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_PATH, `${JSON.stringify({
  schema_version: "law-firm-os.full-spec-microphase-ledger.v1",
  generated_from: "scripts/generate-full-microphase-plan.mjs",
  release_program_count: programs.length,
  standard_phase_count: phaseTemplates.length,
  micro_phase_per_standard_phase: microTemplates.length,
  micro_phase_count: entries.length,
  requirement_count: requirementLedger.requirements?.length ?? 0,
  requirement_ref_count: entries.reduce((sum, entry) => sum + entry.requirement_ref_count, 0),
  entries,
}, null, 2)}\n`);
await writeFile(MD_PATH, buildMarkdown(entries));

console.log(`Generated ${entries.length} micro phases.`);
console.log(JSON_PATH);
console.log(MD_PATH);
