#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("docs");
const JSON_PATH = path.join(OUTPUT_DIR, "rp01-core-domain-detailed-microphases.json");
const MD_PATH = path.join(OUTPUT_DIR, "rp01-core-domain-detailed-microphases.md");

const phases = [
  {
    id: "P00",
    title: "Contract And Acceptance Baseline",
    files: ["contracts/core-domain-contract.json", "packages/domain/README.md"],
    tests: ["scripts/validate-product-contract.mjs"],
    theme: "사양명세서의 core domain을 계약과 acceptance gate로 고정",
    micros: [
      ["M00", "Inventory spec sections 5 and 6", "Extract Tenant, User, Role, Entity, Client, Matter, Document reference, and AuditEvent requirements into a core-domain inventory."],
      ["M01", "Draft core domain contract shell", "Create the future contract shape for core entities, ownership, identifiers, and required invariants."],
      ["M02", "Define ID naming rules", "Lock tenant_id, user_id, role_id, entity_id, client_id, matter_id, document_id, version_id, event_id naming rules."],
      ["M03", "Define ownership rules", "Specify Core owns Tenant/User/Role/Permission/AuditEvent, Master Data owns Entity/Client, Matter Core owns Matter, DMS owns Document."],
      ["M04", "Define pre-Matter exceptions", "Record that Lead and Opportunity may exist before Matter while Document, Time, Billing, Settlement, and AI must be Matter-traceable."],
      ["M05", "Define acceptance gates", "Write H01 acceptance gates for Matter-first, DMS ownership, Permission core ownership, and Audit core ownership."],
      ["M06", "Define synthetic-only fixture policy", "State that RP01 fixtures use fake tenants, users, clients, matters, and documents only."],
      ["M07", "Plan contract validation checks", "List validation checks that will fail if core required entities or invariants disappear."],
      ["M08", "Prepare Hermes H01 preflight rows", "Define what Hermes records before running RP01 implementation checks."],
      ["M09", "Prepare Claude C01 review brief", "Prepare review questions for Claude Code around missing entities, ownership drift, and inadequate tests."],
      ["M10", "Close RP01.P00 handoff", "Produce a handoff that tells AI to implement entity definitions next, not UI or API."],
    ],
  },
  {
    id: "P01",
    title: "Domain Model",
    files: ["packages/domain/src/entities.js", "packages/domain/src/ownership.js", "packages/domain/src/index.js"],
    tests: ["packages/domain/test/domain-entities.test.js"],
    theme: "핵심 entity shape와 소유 모듈을 코드로 선언",
    micros: [
      ["M00", "Create domain package structure", "Create src and test layout for package-level domain definitions."],
      ["M01", "Implement Tenant shape", "Define Tenant required fields: tenant_id, name, plan, region, security_policy, data_residency."],
      ["M02", "Implement User Group Role shapes", "Define User, Group, Role required fields and role permission_set reference."],
      ["M03", "Implement Permission Policy shapes", "Define Permission and Policy shape references without implementing authz evaluation yet."],
      ["M04", "Implement Entity Person Organization shapes", "Define master-data entity base shapes for company/person/organization identity."],
      ["M05", "Implement Client BillingEntity ContactPoint shapes", "Define ClientProfile, BillingEntity, ContactPoint, and Relationship references."],
      ["M06", "Implement Matter shapes", "Define Matter, MatterMember, MatterTask, MatterCalendarEvent, Checklist, and MatterStatusHistory shapes."],
      ["M07", "Implement DMS reference shapes", "Define Document and DocumentVersion references owned by DMS but visible to core domain checks."],
      ["M08", "Implement AuditEvent shape", "Define AuditEvent core fields for actor, action, object, timestamp, and IP metadata."],
      ["M09", "Export domain registry", "Export a registry of entity names, owning modules, required fields, and relationship references."],
      ["M10", "Close domain model phase", "Confirm all RP01 core entities are represented and ready for invariant validation."],
    ],
  },
  {
    id: "P02",
    title: "Service Logic",
    files: ["packages/domain/src/invariants.js", "packages/domain/src/validators.js"],
    tests: ["packages/domain/test/domain-invariants.test.js"],
    theme: "도메인 불변조건과 검증 함수를 구현",
    micros: [
      ["M00", "Define invariant registry", "Create a registry for Matter-first, DMS ownership, core ownership, and required field invariants."],
      ["M01", "Implement required field validator", "Validate required fields by entity type using the domain registry."],
      ["M02", "Implement Matter required invariant", "Enforce tenant_id, client_id, owner_user_id, status, and confidentiality on Matter."],
      ["M03", "Implement DMS Matter trace invariant", "Require Document and DocumentVersion references to remain traceable to matter_id."],
      ["M04", "Implement pre-Matter exception invariant", "Allow Opportunity and Lead to exist before Matter conversion without weakening post-Matter rules."],
      ["M05", "Implement ownership invariant", "Fail if Document is treated as CRM/Billing/Matter-owned instead of DMS-owned."],
      ["M06", "Implement Core ownership invariant", "Fail if Permission, Policy, or AuditEvent are moved outside Core ownership."],
      ["M07", "Implement module dependency check", "Check allowed reference direction between Core, Master Data, Matter, DMS, Billing, CRM, Settlement, and AI."],
      ["M08", "Implement validation summary", "Return pass/fail, errors, warnings, and checked invariant IDs for Hermes evidence."],
      ["M09", "Add blocked-claim output", "Expose blocked claims when a requested structure violates Matter-first or ownership rules."],
      ["M10", "Close service logic phase", "Confirm validators can be consumed by tests and future Hermes product checks."],
    ],
  },
  {
    id: "P03",
    title: "API And Interface",
    files: ["packages/domain/src/index.js", "packages/domain/src/domain-contract.js"],
    tests: ["packages/domain/test/domain-interface.test.js"],
    theme: "다른 패키지와 Hermes가 사용할 public interface 고정",
    micros: [
      ["M00", "Define package public exports", "Expose entities, ownership registry, invariants, validators, and fixture helpers through a stable index."],
      ["M01", "Define validateDomainContract API", "Create a single function contract for validating entity registries and fixtures."],
      ["M02", "Define getEntityDefinition API", "Expose entity definitions by name for future API/DB generators."],
      ["M03", "Define getOwnerModule API", "Expose owning module by entity name for cross-module checks."],
      ["M04", "Define listMatterTraceableEntities API", "Expose entities that must be traceable to Matter."],
      ["M05", "Define listPreMatterEntities API", "Expose Lead and Opportunity as explicit pre-Matter exceptions."],
      ["M06", "Define validation result shape", "Lock result fields: valid, errors, warnings, checked, blocked_claims."],
      ["M07", "Define error code taxonomy", "Add stable error codes for missing field, ownership drift, matter trace failure, and pre-Matter misuse."],
      ["M08", "Define Hermes consumption shape", "Ensure validation result can be serialized into Hermes evidence without hidden state."],
      ["M09", "Define Claude review packet input", "Expose enough contract summary for Claude Code cross-validation prompts."],
      ["M10", "Close interface phase", "Freeze RP01 package interface until RP02 explicitly extends it."],
    ],
  },
  {
    id: "P04",
    title: "UI And Operator Surface",
    files: ["apps/web/src/main.jsx", "apps/web/src/styles.css"],
    tests: ["npm run build"],
    theme: "UI에는 도메인 상태를 표시하되 아직 도메인 로직을 UI에 섞지 않음",
    micros: [
      ["M00", "Inventory existing Jira-like UI", "Identify current Matter UI spots that should later consume domain fixtures."],
      ["M01", "Plan domain fixture injection", "Define how UI will read synthetic Matters without direct coupling to validators."],
      ["M02", "Define Matter row required fields display", "Map matter_id, client name, owner, status, confidentiality, and due data to existing table layout."],
      ["M03", "Define audit panel domain fields", "Map AuditEvent shape to the existing right-side recent audit event panel."],
      ["M04", "Define permission signal display", "Map deny-rule and attorney-review state into a compact Jira-like warning/approval panel."],
      ["M05", "Define no-real-data UI marker", "Ensure UI seed data is visibly synthetic in developer fixtures, not client-like hidden test data."],
      ["M06", "Plan responsive domain density", "Keep Matter and Audit fields readable on mobile without losing required context."],
      ["M07", "Plan UI build validation", "Keep `npm run build` as RP01 UI smoke even if no UI code changes are required."],
      ["M08", "Prepare Hermes UI evidence", "Record that RP01 UI is display-only and not a domain authority."],
      ["M09", "Prepare Claude UI review prompt", "Ask Claude to check whether UI suggests unsafe final authority or hides key security context."],
      ["M10", "Close UI operator phase", "Defer deeper UI implementation to RP05/RP06 while preserving RP01 display assumptions."],
    ],
  },
  {
    id: "P05",
    title: "Fixtures And Golden Cases",
    files: ["packages/domain/src/fixtures.js", "packages/domain/fixtures/core-domain-fixtures.json"],
    tests: ["packages/domain/test/domain-fixtures.test.js"],
    theme: "합성 fixture와 golden case를 만들어 테스트와 Hermes 검증의 입력으로 사용",
    micros: [
      ["M00", "Define synthetic tenant fixture", "Create fake tenant with security policy and data residency."],
      ["M01", "Define synthetic users and roles", "Create fake owner, partner, attorney, finance, security admin, and auditor users."],
      ["M02", "Define synthetic entity and client", "Create fake organization/person/entity relationship and client profile."],
      ["M03", "Define synthetic matter", "Create fake active Matter with owner, client, team, status, type, confidentiality."],
      ["M04", "Define synthetic document references", "Create fake Document and DocumentVersion references tied to matter_id."],
      ["M05", "Define synthetic audit events", "Create fake view/download/permission-change audit events."],
      ["M06", "Define valid golden case", "Create a complete valid case that passes all RP01 invariants."],
      ["M07", "Define invalid no-matter document case", "Create a failing case where Document lacks matter_id."],
      ["M08", "Define invalid ownership drift case", "Create a failing case where Document is assigned to Billing or CRM ownership."],
      ["M09", "Define invalid matter required fields case", "Create failing cases for missing tenant/client/owner/status/confidentiality."],
      ["M10", "Close fixtures phase", "Confirm fixtures are synthetic, serializable, and reusable by Hermes H01."],
    ],
  },
  {
    id: "P06",
    title: "Permission Audit Integration",
    files: ["packages/domain/src/security-contract.js", "packages/domain/src/audit-contract.js"],
    tests: ["packages/domain/test/security-audit-contract.test.js"],
    theme: "RP02/RP03 구현 전, Permission/Audit가 core domain에 어떻게 연결되는지 계약화",
    micros: [
      ["M00", "Define Permission reference contract", "Specify Permission fields and relationship to principal/object/action/effect."],
      ["M01", "Define Policy reference contract", "Specify Policy fields and policy_type/config ownership."],
      ["M02", "Define AuditEvent action taxonomy seed", "Seed actions for login, view, download, upload, permission_change, billing_change, AI_access."],
      ["M03", "Define audited object reference shape", "Specify object_type and object_id rules for audit events."],
      ["M04", "Define security trimming contract seed", "Record that search/AI/report visibility must be trimmed before display."],
      ["M05", "Define deny-rule precedence seed", "Record deny-over-allow as RP02 implementation input."],
      ["M06", "Define ethical wall placeholder", "Represent ethical wall as future deny-rule source without implementing logic in RP01."],
      ["M07", "Test audit event object references", "Ensure synthetic audit events point to known core/DMS object references."],
      ["M08", "Prepare Hermes H01 security notes", "Record what RP01 checks now and what must wait for RP02/RP03."],
      ["M09", "Prepare Claude security review brief", "Ask Claude to identify security assumptions that are only placeholders."],
      ["M10", "Close permission audit integration", "Hand off explicit TODOs to RP02 and RP03 without creating hidden logic gaps."],
    ],
  },
  {
    id: "P07",
    title: "Failure Edge And Recovery",
    files: ["packages/domain/test/domain-failure-cases.test.js"],
    tests: ["packages/domain/test/domain-failure-cases.test.js"],
    theme: "실패 케이스, blocked claim, 복구 기준을 RP01에서 먼저 명확히 함",
    micros: [
      ["M00", "Define missing identifier failures", "Test missing tenant_id, user_id, client_id, matter_id, document_id, event_id where required."],
      ["M01", "Define invalid reference failures", "Test references to unknown tenant, client, matter, document, or user."],
      ["M02", "Define ownership mismatch failures", "Test mismatched owner module claims and ensure validators return blocked_claims for unsafe module drift."],
      ["M03", "Define status enum failures", "Test invalid Matter status and user status values."],
      ["M04", "Define confidentiality failures", "Test missing or invalid confidentiality level."],
      ["M05", "Define pre-Matter misuse failures", "Test Document/Time/Billing-style records incorrectly treated as pre-Matter."],
      ["M06", "Define audit object mismatch failures", "Test AuditEvent object_type/object_id mismatch."],
      ["M07", "Define blocked claim assertions", "Ensure validators return blocked_claims instead of silently accepting unsafe shapes."],
      ["M08", "Define recovery handoff", "Document how a failing micro phase should be corrected before advancing."],
      ["M09", "Prepare Claude edge-case review", "Ask Claude to find missing failure cases and weak assumptions."],
      ["M10", "Close failure phase", "Confirm failure cases fail for the intended reason and not due to test brittleness."],
    ],
  },
  {
    id: "P08",
    title: "Hermes Validation Binding",
    files: ["hermes/project.json", "docs/hermes-connection.md", "scripts/validate-product-contract.mjs"],
    tests: ["npm run validate", "npm test", "npm run fullplan:validate"],
    theme: "RP01 결과를 Hermes H01이 읽을 수 있는 증거 구조로 연결",
    micros: [
      ["M00", "Define H01 command matrix", "Record exact product commands Hermes should run for RP01."],
      ["M01", "Define H01 evidence fields", "Define phase_id, command_result, changed_files, invariant_summary, blocked_claims, next_gate."],
      ["M02", "Define H01 domain summary", "Serialize entity count, invariant count, fixture count, and failed case count."],
      ["M03", "Define H01 no-real-data evidence", "Record that fixtures are synthetic and contain no client data."],
      ["M04", "Define H01 blocked claim evidence", "Record unsafe domain shapes rejected by validators."],
      ["M05", "Define H01 Claude dependency", "Mark C01 cross-validation required before RP02 opens."],
      ["M06", "Define H01 human approval note", "Record what the human must approve: domain ownership and phase transition."],
      ["M07", "Test H01 command availability", "Ensure npm scripts required by H01 exist before handoff."],
      ["M08", "Prepare H01 evidence packet template", "Create a future template for Hermes to fill during implementation closeout."],
      ["M09", "Prepare H01 closeout criteria", "Define PASS/BLOCK semantics for the RP01 gate."],
      ["M10", "Close Hermes binding phase", "Confirm Hermes is attached as verifier, not product code owner."],
    ],
  },
  {
    id: "P09",
    title: "Claude Cross Validation Closeout",
    files: ["docs/rp01-claude-cross-validation-brief.md"],
    tests: ["npm run validate", "npm test", "npm run fullplan:validate"],
    theme: "Claude Code가 RP01 결과를 독립적으로 검토할 수 있는 review packet 준비",
    micros: [
      ["M00", "Prepare RP01 architecture review questions", "Ask whether entity ownership and module boundaries match the spec."],
      ["M01", "Prepare RP01 security review questions", "Ask whether Matter-first, DMS ownership, and Permission/Audit placeholders are sufficiently constrained."],
      ["M02", "Prepare RP01 missing test questions", "Ask what core domain failure cases are missing."],
      ["M03", "Prepare RP01 data model drift questions", "Ask whether names/fields drift from the Law Firm OS specification."],
      ["M04", "Prepare RP01 SaaS readiness questions", "Ask whether tenant isolation assumptions are ready for RP26 later."],
      ["M05", "Prepare RP01 blocked risk register", "List unresolved risks that must move to RP02/RP03/RP04."],
      ["M06", "Define Claude finding severity", "Use P0/P1/P2/P3 severity for Claude findings."],
      ["M07", "Define go/no-go verdict format", "Require PASS, PASS_WITH_FINDINGS, or BLOCK for RP01 closeout."],
      ["M08", "Define finding-to-microphase routing", "Route each Claude finding to a future RPxx.Pyy.Mzz or create a correction micro phase."],
      ["M09", "Prepare human approval summary", "Summarize what the user must approve before RP02 begins."],
      ["M10", "Close RP01 detailed plan", "Confirm RP01 is detailed enough for AI implementation without further planning decisions."],
    ],
  },
];

function commandsFor(phaseId) {
  const commands = ["npm run validate", "npm run fullplan:validate"];
  if (!["P00", "P01"].includes(phaseId)) commands.push("npm test");
  if (["P04", "P08", "P09"].includes(phaseId)) commands.push("npm run build");
  return commands;
}

function entryFor(phase, micro) {
  const [microId, title, objective] = micro;
  return {
    id: `RP01.${phase.id}.${microId}`,
    program_id: "RP01",
    program_title: "Core Domain Foundation",
    phase_id: `RP01.${phase.id}`,
    phase_title: phase.title,
    micro_id: microId,
    micro_title: title,
    objective,
    ai_owner: "Codex",
    hermes_gate: "H01",
    claude_gate: "C01",
    target_files: phase.files,
    target_tests: phase.tests,
    commands: commandsFor(phase.id),
    acceptance: [
      "Deliverable is specific enough for AI implementation without choosing scope.",
      "No real client, matter, document, billing, settlement, credential, or secret data is used.",
      "Matter-first, DMS ownership, Permission core ownership, and Audit core ownership are preserved where applicable.",
      "Hermes H01 evidence or blocked reason can be recorded.",
      "Claude C01 can independently review architecture, security, missing tests, and go/no-go status.",
    ],
    status: "planned",
  };
}

const entries = phases.flatMap((phase) => phase.micros.map((micro) => entryFor(phase, micro)));

function markdown(entries) {
  const lines = [];
  lines.push("# RP01 Core Domain Foundation Detailed Micro Phases v1");
  lines.push("");
  lines.push("Purpose: expand RP01 from the 3,300-phase master ledger into implementation-ready micro phases.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("- Program: RP01 Core Domain Foundation");
  lines.push("- Micro phases: 110");
  lines.push("- AI owner: Codex");
  lines.push("- Hermes gate: H01");
  lines.push("- Claude Code gate: C01");
  lines.push("- Immediate next implementation target: RP01.P00.M00");
  lines.push("");
  for (const phase of phases) {
    lines.push(`## RP01.${phase.id}: ${phase.title}`);
    lines.push("");
    lines.push(`Theme: ${phase.theme}`);
    lines.push("");
    lines.push(`Target files: ${phase.files.join(", ")}`);
    lines.push("");
    lines.push(`Target tests: ${phase.tests.join(", ")}`);
    lines.push("");
    for (const entry of entries.filter((row) => row.phase_id === `RP01.${phase.id}`)) {
      lines.push(`- ${entry.id} | ${entry.micro_title} | ${entry.objective}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_PATH, `${JSON.stringify({
  schema_version: "law-firm-os.rp01-detailed-microphases.v1",
  program_id: "RP01",
  micro_phase_count: entries.length,
  entries,
}, null, 2)}\n`);
await writeFile(MD_PATH, markdown(entries));

console.log(`Generated RP01 detailed micro phases: ${entries.length}`);
console.log(JSON_PATH);
console.log(MD_PATH);
