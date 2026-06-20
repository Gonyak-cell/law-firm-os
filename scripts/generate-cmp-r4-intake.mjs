#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = process.env.CMP_R4_SOURCE_DIR ?? "/Users/jws/Documents/Codex/CMP-2";
const SOURCE_ZIP = path.join(SOURCE_DIR, "CMP_R4_Developer_Roadmap_Package_v1.0.zip");
const OUT = path.join(ROOT, "docs/reorganization/client-matter-os/cmp-v1");
const PACKAGE_DATE = "2026-06-20";

const SCHEDULE = Object.freeze([
  ["CMP-G0", "Product Governance & Architecture Freeze", "2026-06-22", "2026-07-03", "PR-01", "", "Descriptor/runtime confusion"],
  ["CMP-G1", "Trust Foundation Runtime", "2026-07-06", "2026-08-14", "PR-02/PR-03", "CMP-G0", "Permission or audit bypass"],
  ["CMP-G2", "Party & Client Master Runtime", "2026-08-17", "2026-09-11", "PR-04", "CMP-G1", "Duplicate Party or conflict miss"],
  ["CMP-G3", "People / HRX Runtime Foundation", "2026-09-14", "2026-10-09", "PR-04", "CMP-G1, CMP-G2", "User and Employee conflation"],
  ["CMP-G6", "CRM to Intake to Matter Conversion Runtime", "2027-01-04", "2027-01-29", "PR-05", "CMP-G1, CMP-G2", "Conflict gate bypass"],
  ["CMP-G4", "Matter Core & Staffing Runtime", "2026-10-12", "2026-11-06", "PR-06", "CMP-G1, CMP-G2, CMP-G3, CMP-G6", "Employee staffing mismatch"],
  ["CMP-G5", "Vault-backed DMS / Email / Knowledge Runtime", "2026-11-09", "2026-12-18", "PR-07", "CMP-G1, CMP-G2, CMP-G3, CMP-G4", "Document or raw path leak"],
  ["CMP-G7", "Time / Billing / Finance Runtime", "2027-02-01", "2027-03-12", "PR-08", "CMP-G1, CMP-G2, CMP-G3, CMP-G4, CMP-G5, CMP-G6", "Billing and payment mismatch"],
  ["CMP-G8", "Analytics & Profitability Read Models", "2027-03-15", "2027-04-02", "PR-09", "CMP-G1, CMP-G2, CMP-G3, CMP-G4, CMP-G5, CMP-G7", "Masked data or freshness gap"],
  ["CMP-G9", "AI/RAG Governance Runtime", "2027-04-05", "2027-04-30", "PR-09", "CMP-G1, CMP-G5, CMP-G8", "AI permission or citation bypass"],
  ["CMP-G10", "Portal / Data Room / External Projection Runtime", "2027-05-03", "2027-05-28", "PR-09", "CMP-G1, CMP-G4, CMP-G5, CMP-G9", "External projection leak"],
  ["CMP-G11", "Client-Matter-People UI/UX Product Console", "2027-05-31", "2027-07-09", "PR-10", "CMP-G1-G10", "Mock fallback or misleading UI"],
  ["CMP-G12", "Enterprise Hardening, Migration, UAT, Launch", "2027-07-12", "2027-08-20", "PR-11/PR-12", "CMP-G1-G11", "Go-live overclaim"],
]);

const OWNERSHIP = Object.freeze([
  ["Party / Person / Organization", "Party Master", "CRM, Intake, Matter, Billing", "Conflict memo, matter strategy", "DB-backed CRUD + duplicate/merge audit"],
  ["BillingProfile", "Party Master with Billing references", "Billing/Invoice", "Duplicate billing client copies", "Legal vs billing client validation"],
  ["Employee", "HRX / People", "MatterTeam, TimeEntry, Analytics", "IAM User identity fields as Employee", "UserEmployeeLink and HR-sensitive tests"],
  ["Matter", "Matter Operations", "Party, Engagement, Employee, Vault, Billing", "Document bytes, payment ledger", "Clearance-gated opening transaction"],
  ["MatterTeamMember", "Matter Operations", "Employee, role, capacity profile", "User-only staffing", "employee_id required tests"],
  ["Document / DocumentVersion / FileObject", "Vault/DMS", "Matter, HRX, Email, Portal", "Invoice ledger, raw storage path", "Storage adapter + hash lineage"],
  ["TimeEntry", "Time/Billing", "Employee + Matter + rate/cost basis", "Payment matching", "Submit/approve/lock workflow"],
  ["Invoice / TaxInvoice", "Billing", "WIP/PreBill, Matter, BillingProfile", "Payment final matching", "Issued direct edit blocked"],
  ["Payment / ARBalance", "Finance", "Invoice, Matter, BillingClient", "Time narrative/conflict decision", "Idempotent import/match + AR aging"],
  ["AIOutput / Citation", "AI Governance", "Vault source evidence, permission decision", "Final legal decision", "Human review and citation required"],
  ["ExternalUser / PortalProjection", "Portal/DataRoom", "Matter, Vault shared objects", "Internal memo, conflict memo, AI draft", "Projection-only external tests"],
]);

const API_MATRIX = Object.freeze([
  ["Trust", "/permissions, /admin/policies, /audit", "tenant, actor, permission context, correlation", "permission.evaluated, role.changed, legal_hold.changed, breakglass.used", "in-memory audit/policy store"],
  ["Party", "/party-master/*", "tenant, actor, Party ACL", "party.created, party.updated, relationship.changed, duplicate.reviewed", "no DB-backed Party repository"],
  ["People", "/api/hrx/*", "tenant, actor, HR-sensitive scopes", "employee.data.changed, hr.document.viewed, evaluation.accessed", "User/Employee link not durable"],
  ["CRM/Intake", "/crm/*, /intake/*", "tenant, actor, Party refs, conflict scope", "crm.opportunity.created, conflict.search.executed, waiver.approved", "Matter direct conversion possible"],
  ["Matter", "/api/matter/*", "tenant, actor, clearance token, employee staffing", "matter.opened, matter.member.added, matter.deadline.changed", "MatterTeam user_id-only"],
  ["Vault", "/api/vault/*", "tenant, actor, object ACL, legal hold, permission-before-search", "document.version.created, document.downloaded, document.shared", "metadata-only, no storage adapter"],
  ["Finance", "/api/revenue/*", "tenant, actor, matter, employee cost permission", "time_entry.approved, invoice.issued, payment.matched", "no durable finance ledgers"],
  ["Analytics", "/api/analytics/*", "tenant, source object permissions, masking", "analytics.exported", "read model freshness/masking not durable"],
  ["AI", "/api/ai/*", "tenant, permission-before-AI, citation requirement", "ai.retrieval.requested, ai.output.reviewed", "no real retrieval/citation persistence"],
  ["Portal", "/api/portal/*, /api/data-rooms/*", "external ACL, projection scope", "portal.document.viewed, portal.file.uploaded", "projection store/external auth absent"],
]);

const GENERATED_OUTPUTS = new Set([
  "00-cmp-source-intake.md",
  "README.md",
  "adr-billing-profile-owner.md",
  "adr-user-employee.md",
  "adr-vault-runtime.md",
  "api-standard.md",
  "cmp-v1-tuw-crosswalk.csv",
  "cmp-v1-tuw-crosswalk.json",
  "current-state-report.md",
  "event-taxonomy.md",
  "g0-closeout.md",
  "glossary.md",
  "migration-manifest.csv",
  "module-boundaries.md",
  "object-ownership.md",
  "package-manifest.json",
  "permission-model.md",
  "pr-policy.md",
  "roadmap-calendar.md",
  "runtime-readiness-standard.md",
  "state-machines.md",
  "target-folder-map.md",
]);

function unzipText(zipMember) {
  return execFileSync("unzip", ["-p", SOURCE_ZIP, zipMember], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out.sort();
}

function ensureDir(file) {
  mkdirSync(path.dirname(file), { recursive: true });
}

function write(rel, body) {
  const file = path.join(OUT, rel);
  ensureDir(file);
  writeFileSync(file, body.endsWith("\n") ? body : `${body}\n`);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("\n", " ")).join(" | ")} |`),
  ].join("\n");
}

function splitTargets(value) {
  return String(value ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function targetExists(target) {
  const cmpPrefix = "docs/reorganization/client-matter-os/cmp-v1/";
  if (target.startsWith(cmpPrefix) && GENERATED_OUTPUTS.has(target.slice(cmpPrefix.length))) return true;
  if (target.endsWith("/**")) return existsSync(path.join(ROOT, target.slice(0, -3)));
  if (target.includes("*")) return false;
  return existsSync(path.join(ROOT, target));
}

function targetState(row) {
  const targets = splitTargets(row["Target Files / Packages"]);
  if (targets.length === 0) return ["no_target_declared", "planned"];
  const states = targets.map((target) => targetExists(target));
  if (states.every(Boolean)) return ["all_declared_targets_present", "target_files_present_needs_r4_evidence"];
  if (states.some(Boolean)) return ["some_declared_targets_present", "partial_target_present"];
  return ["no_declared_targets_present", "planned_missing_target_files"];
}

function byGate(rows) {
  return rows.reduce((acc, row) => {
    acc[row.Gate] ??= [];
    acc[row.Gate].push(row);
    return acc;
  }, {});
}

function currentGitRef() {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
    const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
    return `${branch}@${sha}`;
  } catch {
    return "unknown";
  }
}

function sourceFileRows() {
  return listFiles(SOURCE_DIR).map((file) => [
    path.relative(SOURCE_DIR, file),
    statSync(file).size,
    sha256(file),
  ]);
}

function zipRows() {
  return execFileSync("unzip", ["-l", SOURCE_ZIP], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })
    .split("\n")
    .map((line) => line.match(/\s+(cmp_r4_roadmap_package\/.*)$/)?.[1])
    .filter(Boolean);
}

function evidenceBody(row) {
  return `# ${row["TUW ID"]} Evidence

Status: baseline-created
Source package date: ${PACKAGE_DATE}
Current repo ref: ${currentGitRef()}

## Task

${row.Task}

## Acceptance Boundary

${row["Acceptance Criteria"]}

## Evidence Created In This Slice

- CMP-R4 source package intake recorded.
- CMP-R4 316-row crosswalk generated.
- This evidence file links the source TUW to a repo path without claiming runtime completion.

## Claim Boundary

- R4 runtime-write-ready: not claimed.
- R5/R6 owner-decision-ready: not claimed.
- Go-live or production-ready: blocked until owner approval and release gates pass.
`;
}

if (!existsSync(SOURCE_ZIP)) {
  console.error(`CMP R4 source zip not found: ${SOURCE_ZIP}`);
  process.exit(1);
}

const tuws = JSON.parse(unzipText("cmp_r4_roadmap_package/data/CMP_R4_TUW_Catalog_v1.0.json"));
const gates = byGate(tuws);
const sourceRows = sourceFileRows();
const packageFiles = zipRows();
const gateSummary = Object.entries(gates)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([gate, rows]) => [
    gate,
    rows[0]["Gate Name"],
    rows[0].Domain,
    rows.length,
    rows[0]["Target R Level"],
    rows[0]["PR Slice"],
    rows.filter((row) => row.Priority === "P0").length,
    rows.filter((row) => row.Priority === "P1").length,
    rows.filter((row) => row.Priority === "P2").length,
  ]);

const crosswalk = tuws.map((row) => {
  const [existingTargetState, repoStatus] = targetState(row);
  return {
    tuw_id: row["TUW ID"],
    gate: row.Gate,
    gate_name: row["Gate Name"],
    domain: row.Domain,
    phase: row.Phase,
    sprint_window: row["Sprint Window"],
    pr_slice: row["PR Slice"],
    priority: row.Priority,
    target_r_level: row["Target R Level"],
    task: row.Task,
    owner_role: row["Owner Role"],
    target_files: row["Target Files / Packages"],
    evidence_path: row["Evidence Path"],
    source_status: row.Status,
    repo_status: repoStatus,
    existing_target_state: existingTargetState,
    implementation_gate: "not_closed",
    acceptance_criteria: row["Acceptance Criteria"],
  };
});

const crosswalkHeaders = Object.keys(crosswalk[0]);
write(
  "cmp-v1-tuw-crosswalk.csv",
  [
    crosswalkHeaders.join(","),
    ...crosswalk.map((row) => crosswalkHeaders.map((header) => csvCell(row[header])).join(",")),
  ].join("\n"),
);
write("cmp-v1-tuw-crosswalk.json", JSON.stringify(crosswalk, null, 2));
write(
  "package-manifest.json",
  JSON.stringify(
    {
      package: "CMP R4 Developer Roadmap Package",
      package_date: PACKAGE_DATE,
      generated_from: SOURCE_ZIP,
      generated_at: new Date().toISOString(),
      current_repo_ref: currentGitRef(),
      total_tuws: tuws.length,
      gate_counts: Object.fromEntries(Object.entries(gates).map(([gate, rows]) => [gate, rows.length])),
      priority_counts: {
        P0: tuws.filter((row) => row.Priority === "P0").length,
        P1: tuws.filter((row) => row.Priority === "P1").length,
        P2: tuws.filter((row) => row.Priority === "P2").length,
      },
      current_completion_claim: "not_r4_ready",
      production_ready_claim: false,
      go_live_claim: false,
    },
    null,
    2,
  ),
);

write(
  "README.md",
  `# CMP R4 Intake Root

Status: source-intake-baseline
Package date: ${PACKAGE_DATE}
Current repo ref: ${currentGitRef()}

This folder is the repo-local intake layer for the CMP R4 developer roadmap package. It supersedes nothing in the older 198-TUW Client-Matter OS reorganization plan; it adds the broader 316-TUW Client-Matter-People R4 target.

## Goal

Move Law Firm OS from descriptor/API-evidence surfaces toward CMP R4 runtime-write-ready implementation and R5/R6 owner-decision-ready release evidence.

## Non-Claim Boundary

- The current repo does not claim CMP R4 complete.
- The current repo does not claim production-ready or go-live.
- Descriptor-only, synthetic-only, runtime API evidence only, and durable persistence open states remain blockers.

## Primary Artifacts

${markdownTable(["Artifact", "Purpose"], [
    ["00-cmp-source-intake.md", "Source package hash, inventory, and package manifest"],
    ["cmp-v1-tuw-crosswalk.csv/json", "316-row source-to-repo TUW crosswalk"],
    ["runtime-readiness-standard.md", "R0-R6 and R4/R5/R6 claim rules"],
    ["roadmap-calendar.md", "G0-G12 gate order and dependency correction"],
    ["g0-closeout.md", "G0 review checklist and approval fields"],
  ])}

## Validation

\`\`\`sh
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-v1:blockers:baseline
\`\`\`
`,
);

write(
  "00-cmp-source-intake.md",
  `# CMP R4 Source Package Intake

Status: source-intake-baseline
Package date: ${PACKAGE_DATE}
Current repo ref: ${currentGitRef()}

## Source Files

${markdownTable(["File", "Bytes", "SHA-256"], sourceRows)}

## Zip Manifest

${packageFiles.map((file) => `- \`${file}\``).join("\n")}

## TUW Count

${markdownTable(["Metric", "Count"], [
    ["Total TUWs", tuws.length],
    ["P0 TUWs", tuws.filter((row) => row.Priority === "P0").length],
    ["P1 TUWs", tuws.filter((row) => row.Priority === "P1").length],
    ["P2 TUWs", tuws.filter((row) => row.Priority === "P2").length],
  ])}

## Gate Summary

${markdownTable(["Gate", "Name", "Domain", "TUWs", "Target R", "PR", "P0", "P1", "P2"], gateSummary)}

## Claim Boundary

This intake records the package and crosswalk only. It does not make a runtime, production, go-live, or owner-approval claim.
`,
);

write(
  "glossary.md",
  `# CMP R4 Glossary

Status: source-intake-baseline

${markdownTable(["Term", "Definition", "Boundary"], [
    ["Client", "A commercial/legal client represented through Party Master and BillingProfile references.", "Client is not a Matter, Employee, or IAM User."],
    ["Party", "Canonical Person or Organization record used by CRM, Intake, Matter, Billing, and Portal.", "Party owns identity and relationships, not conflict memo or matter strategy."],
    ["Matter", "The execution ledger for approved legal work after Intake/conflict/engagement clearance.", "Matter cannot be created directly from Opportunity."],
    ["Employee", "People/HRX workforce object used for staffing, capacity, time, and HR workflows.", "Employee is not an IAM User session authority."],
    ["User", "Authentication/session principal.", "User may link to Employee through controlled UserEmployeeLink only."],
    ["Vault", "Storage, version, hash-lineage, search, email filing, HR document envelope, and RAG evidence boundary.", "Metadata-only API is not R4 Vault."],
    ["R4 runtime-write-ready", "Persistence + write API + permission + audit + state/idempotency evidence.", "Not satisfied by descriptor/API evidence alone."],
    ["R5/R6 owner-decision-ready", "Enterprise controls, migration, UAT, DR, monitoring, compliance, and go/no-go package.", "Requires owner decision; no self-approval."],
  ])}
`,
);

write(
  "object-ownership.md",
  `# CMP R4 Object Ownership Matrix

Status: source-intake-baseline

${markdownTable(["Object", "Canonical Owner", "Must Reference", "Must Not Own / Leak", "R4 Evidence"], OWNERSHIP)}
`,
);

write(
  "module-boundaries.md",
  `# CMP R4 Module Boundaries

Status: source-intake-baseline

${markdownTable(["Module", "Owns", "References", "Must Not Do"], [
    ["Trust", "Tenant, actor, permission context, policy, ACL, wall, hold, audit", "All domains", "Bypass durable audit or allow ungated data routes"],
    ["Party Master", "Party, Person, Organization, relationships, billing profile references", "CRM, Matter, Billing", "Own conflict memo, matter strategy, or payment ledger"],
    ["People/HRX", "Employee, employment profile, UserEmployeeLink, capacity, leave, HR docs metadata", "Matter, Vault, Analytics", "Use IAM User as Employee or store HR document body"],
    ["CRM/Intake", "Lead, Opportunity, IntakeRequest, ConflictCheck, Waiver, Engagement, FeeTerms", "Party, Matter clearance", "Create Matter before clearance"],
    ["Matter", "Matter, team, tasks, deadlines, status history", "Party, Employee, Vault, Billing", "Own document bytes or payment matching"],
    ["Vault/DMS", "FileObject, Document, versions, hash lineage, search ACL, email filing", "Matter, HRX, Portal, AI", "Expose raw storage path or ignore legal hold"],
    ["Finance", "TimeEntry, WIP, Invoice, Payment, AR, Settlement", "Matter, Employee, BillingProfile", "Own conflict decision or document storage"],
    ["AI/Portal", "AI output/citation/review, external projection/DataRoom", "Vault, Matter, Permission", "Retrieve without permission or expose internal data externally"],
  ])}
`,
);

write(
  "runtime-readiness-standard.md",
  `# CMP R4 Runtime Readiness Standard

Status: source-intake-baseline

${markdownTable(["Level", "Meaning", "Allowed Claim", "Blocked Claim"], [
    ["R0", "Source intake and architecture baseline", "Plan/source captured", "Runtime or pilot readiness"],
    ["R1", "Contracts, ownership, folder and PR discipline", "Implementation can start", "Runtime write readiness"],
    ["R2", "Fixture or descriptor evidence", "Design coverage", "Customer use readiness"],
    ["R3", "API-read or UI evidence skeleton", "Internal evidence only", "Durable runtime readiness"],
    ["R4", "Durable persistence + write API + permission + audit + state/idempotency tests", "Limited pilot after gate review", "Enterprise go-live"],
    ["R5", "Enterprise security, migration, DR, observability, UAT evidence", "Owner-decision-ready", "Automatic production approval"],
    ["R6", "Release evidence, owner approval, monitoring, rollback and compliance package", "Approved release package when signed", "Self-approved launch"],
  ])}

## Hard Rule

R4 requires all of these together: durable persistence, write API, tenant/actor permission decision, durable audit, state transition tests, idempotency tests, and evidence artifact.
`,
);

write(
  "target-folder-map.md",
  `# CMP R4 Target Folder Map

Status: source-intake-baseline

${markdownTable(["Area", "Primary Paths", "Owner"], [
    ["CMP intake", "docs/reorganization/client-matter-os/cmp-v1", "Architecture Lead / PM"],
    ["Platform persistence", "packages/platform/src/persistence, scripts/migrate-*.mjs", "Platform Security Lead"],
    ["Trust", "packages/authz, packages/audit, apps/api/src/middleware", "Security Lead"],
    ["Party Master", "packages/master-data, apps/api/src/party-runtime-context.js", "Master Data Lead"],
    ["People/HRX", "packages/hrx, apps/api/src/routes/hrx, apps/web/src/people", "HRX/People Lead"],
    ["CRM/Intake", "packages/crm, packages/intake", "Intake Lead"],
    ["Matter", "packages/matter, apps/api/src/routes/matter", "Matter Lead"],
    ["Vault/DMS", "packages/dms, packages/search, packages/email-dms", "Vault Lead"],
    ["Finance", "packages/time-expense, packages/billing, packages/payments, packages/settlement", "Finance Lead"],
    ["Analytics/AI/Portal", "packages/analytics, packages/ai-governance, packages/client-portal, packages/data-room", "Analytics/AI/Portal Leads"],
    ["UI", "apps/web/src/components, apps/web/src/data, apps/web/e2e", "Frontend Lead"],
    ["Enterprise", "packages/enterprise, scripts/*readiness*, docs/*go-live*", "Enterprise/DevOps Lead"],
  ])}
`,
);

write(
  "pr-policy.md",
  `# CMP R4 PR Policy

Status: source-intake-baseline

## Required PR Fields

- CMP TUW IDs.
- Target R level.
- Evidence path.
- Test commands and results.
- Permission/audit/state/idempotency impact.
- Explicit allowed and blocked readiness claims.

## Merge Rules

1. No PR may claim CMP R4 completion from descriptor, synthetic, or API evidence alone.
2. R4 claims require persistence, write API, permission, audit, state/idempotency, tests, and evidence.
3. G6 CRM/Intake clearance must be implemented before G4 Matter opening can claim R4 completion.
4. Production-ready and go-live claims require owner approval and release gates.
`,
);

write(
  "migration-manifest.csv",
  ["artifact_id,source_path,target_path,canonical_owner,move_type,status,evidence_path,notes"].join("\n"),
);

write(
  "api-standard.md",
  `# CMP R4 API Standard

Status: source-intake-baseline

${markdownTable(["Domain", "API Group", "Mandatory Context", "Write Audit Events", "R4 Blocker"], API_MATRIX)}

## Common API Requirements

- Every write command carries tenant, actor, permission decision, audit event, and idempotency key.
- Every sensitive read emits or links an audit event.
- Safe error envelopes must not leak cross-tenant object existence.
`,
);

write(
  "event-taxonomy.md",
  `# CMP R4 Event Taxonomy

Status: source-intake-baseline

${markdownTable(["Domain", "Required Event Examples"], API_MATRIX.map(([domain, , , events]) => [domain, events]))}
`,
);

write(
  "state-machines.md",
  `# CMP R4 State Machine Registry

Status: source-intake-baseline

${markdownTable(["Object", "Required State Coverage"], [
    ["Opportunity", "lead/open -> qualified -> intake_requested; direct Matter creation blocked"],
    ["IntakeRequest", "draft -> conflict_check -> waiver_or_clearance -> engagement_approved"],
    ["Matter", "opening -> active -> closing -> closed; clearance token required"],
    ["DocumentVersion", "created -> checked_out -> checked_in -> retained/deleted; legal hold blocks delete"],
    ["TimeEntry", "draft -> submitted -> approved -> locked"],
    ["Invoice", "draft -> issued -> corrected/voided; issued direct edit blocked"],
    ["Payment", "imported -> matched/partially_matched/unmatched -> reconciled"],
    ["AIOutput", "candidate -> review_required -> confirmed/rejected; citation required for confirm"],
  ])}
`,
);

write(
  "permission-model.md",
  `# CMP R4 Permission Model Baseline

Status: source-intake-baseline

## Mandatory Controls

- Fail closed when tenant, actor, permission context, or object ACL is missing.
- Deny overrides allow.
- Object ACL, ethical wall, legal hold, break-glass, and external projection rules are evaluated before data access.
- Search and AI retrieval must perform permission-before-search and permission-before-AI checks.
`,
);

write(
  "adr-vault-runtime.md",
  `# ADR-CMP-R4-001: Vault Runtime Boundary

Status: Proposed
Date: ${PACKAGE_DATE}

## Context

CMP R4 treats metadata-only DMS evidence as a blocker. Vault must own object storage, version/hash lineage, legal hold, search ACL, email filing, HR document envelope, and RAG source evidence.

## Decision

Vault/DMS is the canonical owner for Document, DocumentVersion, FileObject, storage adapter, search evidence, and document-derived AI source evidence.

## Consequences

- Matter, HRX, Portal, and AI reference Vault objects instead of storing document bodies.
- Raw storage paths never appear in API/UI responses.
- Legal hold and privilege labels bind before delete/search/AI retrieval.
`,
);

write(
  "adr-user-employee.md",
  `# ADR-CMP-R4-002: User and Employee Separation

Status: Proposed
Date: ${PACKAGE_DATE}

## Context

CMP R4 requires MatterTeam staffing and workforce analytics to use Employee identity, not IAM User identity.

## Decision

Employee is owned by People/HRX. User is session authority only. UserEmployeeLink is a controlled link and cannot collapse the two identities.

## Consequences

- MatterTeamMember requires employee_id.
- TimeEntry and capacity references use Employee.
- UI may show linked user context only after permission and masking checks.
`,
);

write(
  "adr-billing-profile-owner.md",
  `# ADR-CMP-R4-003: BillingProfile Ownership

Status: Proposed
Date: ${PACKAGE_DATE}

## Context

BillingProfile is shared by Party Master, Billing, Invoice, and Finance. Duplicate client billing copies would break conflict and accounting evidence.

## Decision

Party Master owns BillingProfile identity and references. Billing owns downstream billing workflow state, invoice state, payment matching, and AR state.

## Consequences

- BillingProfile validates legal client versus billing client references.
- Billing cannot create duplicate canonical Party or BillingProfile records.
`,
);

write(
  "current-state-report.md",
  `# CMP R4 Current State Report

Status: source-intake-baseline
Current repo ref: ${currentGitRef()}

## Evidence-Based Summary

- Existing Client-Matter planning root covers an older 198-TUW G0-G7 program.
- CMP R4 introduces a broader 316-TUW G0-G12 program.
- HRX runtime/API/UI evidence exists, but current source still includes synthetic tenant and in-memory runtime surfaces.
- CMP R4 completion is not claimed.

## Target Existence Summary

${markdownTable(["State", "TUWs"], Object.entries(
    crosswalk.reduce((acc, row) => {
      acc[row.existing_target_state] = (acc[row.existing_target_state] ?? 0) + 1;
      return acc;
    }, {}),
  ))}
`,
);

write(
  "roadmap-calendar.md",
  `# CMP R4 Roadmap Calendar

Status: source-intake-baseline

## Source Gate Calendar

${markdownTable(["Gate", "Name", "Start", "End", "PR", "Dependencies", "Primary Risk"], SCHEDULE)}

## Corrected Execution Order

The source workbook lists CMP-G4 Matter before CMP-G6 CRM/Intake on the calendar, while G4 depends on CMP-G6 clearance-token evidence. Execution must therefore run CMP-G6 before any G4 R4 completion claim.

Corrected dependency order:

1. CMP-G0
2. CMP-G1
3. CMP-G2 and CMP-G3
4. CMP-G6
5. CMP-G4
6. CMP-G5
7. CMP-G7
8. CMP-G8, CMP-G9, CMP-G10
9. CMP-G11
10. CMP-G12
`,
);

write(
  "g0-closeout.md",
  `# CMP G0 Closeout Checklist

Status: source-intake-baseline

## G0 TUWs

${markdownTable(["TUW", "Task", "Evidence", "Status"], gates["CMP-G0"].map((row) => [
    row["TUW ID"],
    row.Task,
    row["Evidence Path"],
    "baseline evidence generated; human review pending",
  ]))}

## Approval Fields

| Role | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| PM |  | Pending |  |  |
| Tech Lead |  | Pending |  |  |
| QA |  | Pending |  |  |
| Security |  | Pending |  |  |

## Closeout Boundary

G0 can close only as source/governance intake. It cannot close any R4 runtime claim.
`,
);

for (const row of gates["CMP-G0"]) {
  const evidenceRel = row["Evidence Path"].replace("docs/reorganization/client-matter-os/cmp-v1/", "");
  write(evidenceRel, evidenceBody(row));
}

console.log(`CMP R4 intake generated: ${OUT}`);
console.log(`tuws: ${tuws.length}`);
