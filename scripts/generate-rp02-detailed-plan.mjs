#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("docs");
const JSON_PATH = path.join(OUTPUT_DIR, "rp02-permission-kernel-detailed-microphases.json");
const MD_PATH = path.join(OUTPUT_DIR, "rp02-permission-kernel-detailed-microphases.md");

const phases = [
  {
    id: "P00",
    title: "Contract And Acceptance Baseline",
    files: ["contracts/permission-kernel-contract.json", "packages/authz/README.md"],
    tests: ["scripts/validate-product-contract.mjs"],
    theme: "RBAC/ABAC/ACL/Deny/Security Trimming을 구현 전 계약으로 고정",
    micros: [
      ["M00", "Inventory spec permission sections", "Extract system roles, five permission layers, deny precedence, and security trimming requirements."],
      ["M01", "Draft permission kernel contract shell", "Create future contract shape for principals, resources, actions, effects, constraints, and decisions."],
      ["M02", "Define principal taxonomy", "Lock User, Group, Role, MatterMember, ClientUser, ExternalCounsel, Auditor, and SystemAdmin principal references."],
      ["M03", "Define resource taxonomy", "Lock Tenant, Entity, Client, Matter, Folder, Document, DocumentVersion, Invoice, Payment, SettlementRun, AIJob resources."],
      ["M04", "Define action taxonomy", "Lock view, search, create, update, delete, download, share, approve, bill, settle, export, ai_retrieve actions."],
      ["M05", "Define effect taxonomy", "Lock allow, deny, review_required, approval_required, and blocked effects."],
      ["M06", "Define precedence contract", "Record Legal Hold, Ethical Wall/Deny, Object Restriction, Matter Permission, Role Permission, Tenant Default order."],
      ["M07", "Define security trimming contract", "Record that unauthorized result titles, snippets, AI citations, and report rows are hidden before display."],
      ["M08", "Prepare Hermes H02 preflight", "Define what Hermes records before permission implementation starts."],
      ["M09", "Prepare Claude C02 design brief", "Prepare review questions on bypass risk, precedence ambiguity, and insufficient test coverage."],
      ["M10", "Close RP02.P00 handoff", "Hand off a contract-first permission implementation scope to AI."],
    ],
  },
  {
    id: "P01",
    title: "Domain Model",
    files: ["packages/authz/src/policy-model.js", "packages/authz/src/resources.js", "packages/authz/src/actions.js"],
    tests: ["packages/authz/test/policy-model.test.js"],
    theme: "권한 판단에 필요한 모델과 enum을 코드로 선언",
    micros: [
      ["M00", "Create authz package structure", "Create src and test layout for permission kernel implementation."],
      ["M01", "Implement Principal model", "Define principal kinds, IDs, tenant scope, group membership, and role assignments."],
      ["M02", "Implement Resource model", "Define resource kinds, IDs, tenant_id, matter_id, owner module, and confidentiality attributes."],
      ["M03", "Implement Action model", "Define action groups and high-risk actions for document, billing, settlement, sharing, and AI retrieval."],
      ["M04", "Implement PolicyRule model", "Define rule_id, source, principal selector, resource selector, action selector, effect, priority, condition."],
      ["M05", "Implement DenyRule model", "Define deny-specific source types: legal_hold, ethical_wall, regulatory_hold, object_restriction, tenant_policy."],
      ["M06", "Implement MatterPermission model", "Define MatterMember role and matter permission level mapping."],
      ["M07", "Implement ObjectACL model", "Define object-specific principal/effect/action grants and restrictions."],
      ["M08", "Implement Decision model", "Define decision result shape: allowed, effect, reason, matched_rules, review_required, audit_hint."],
      ["M09", "Export policy model registry", "Export all enums and models through a stable package interface."],
      ["M10", "Close domain model phase", "Confirm permission kernel has enough model surface for deterministic evaluation."],
    ],
  },
  {
    id: "P02",
    title: "Service Logic",
    files: ["packages/authz/src/evaluate.js", "packages/authz/src/precedence.js", "packages/authz/src/conditions.js"],
    tests: ["packages/authz/test/evaluate-permission.test.js"],
    theme: "권한 평가 엔진과 precedence를 구현",
    micros: [
      ["M00", "Define evaluatePermission API", "Create deterministic evaluation entrypoint for principal, resource, action, and context."],
      ["M01", "Implement tenant boundary check", "Reject cross-tenant access unless explicit system operation is flagged and audited."],
      ["M02", "Implement legal hold precedence", "Ensure legal/regulatory hold rules are evaluated before all allow rules."],
      ["M03", "Implement ethical wall deny precedence", "Ensure ethical wall deny overrides partner/admin/matter-team allow."],
      ["M04", "Implement object restriction precedence", "Apply object-specific restrictions before matter-level and role-level allow."],
      ["M05", "Implement matter-level permission", "Evaluate MatterMember role and permission_level for matter-scoped resources."],
      ["M06", "Implement role-based permission", "Evaluate role permission_set when no stronger restriction blocks access."],
      ["M07", "Implement tenant default policy", "Apply default tenant policy as final fallback."],
      ["M08", "Implement review-required effects", "Return review_required or approval_required without treating them as direct allow."],
      ["M09", "Implement explainable decisions", "Return matched rule IDs, precedence reason, and blocked claims for Hermes evidence."],
      ["M10", "Close service logic phase", "Confirm evaluator handles allow, deny, review, approval, and blocked outcomes deterministically."],
    ],
  },
  {
    id: "P03",
    title: "API And Interface",
    files: ["packages/authz/src/index.js", "packages/authz/src/decision-contract.js"],
    tests: ["packages/authz/test/authz-interface.test.js"],
    theme: "다른 패키지와 API가 사용할 권한 public interface를 고정",
    micros: [
      ["M00", "Define public exports", "Expose policy model, evaluatePermission, trimResults, and decision helpers from package index."],
      ["M01", "Define canView interface", "Provide a convenience wrapper for view decisions on matter, document, invoice, and report resources."],
      ["M02", "Define canSearch interface", "Provide a wrapper for search result visibility decisions."],
      ["M03", "Define canDownload interface", "Provide a wrapper for document/file download decisions and audit hints."],
      ["M04", "Define canShare interface", "Provide a wrapper for secure link and client portal sharing decisions."],
      ["M05", "Define canApprove interface", "Provide a wrapper for billing, settlement, engagement, and output approval decisions."],
      ["M06", "Define canAIRetrieve interface", "Provide a wrapper for AI retrieval scope decisions."],
      ["M07", "Define decision serialization", "Lock serializable shape for API responses and Hermes evidence without leaking hidden policy internals."],
      ["M08", "Define stable error codes", "Add error codes for cross_tenant, denied_by_wall, legal_hold, object_restricted, insufficient_role, review_required."],
      ["M09", "Define Claude review contract summary", "Expose enough interface summary for C02 cross-validation."],
      ["M10", "Close API interface phase", "Freeze RP02 interface until RP03 audit integration extends it."],
    ],
  },
  {
    id: "P04",
    title: "UI And Operator Surface",
    files: ["apps/web/src/main.jsx", "apps/web/src/styles.css"],
    tests: ["npm run build"],
    theme: "Jira-like UI에서 권한 상태와 차단 사유를 작게 표시",
    micros: [
      ["M00", "Inventory permission UI surfaces", "Identify Matter detail, DMS, audit panel, approval box, and admin surfaces for permission status."],
      ["M01", "Plan permission badge states", "Define compact allowed, denied, review_required, ethical_wall, legal_hold, and inherited badges."],
      ["M02", "Plan denied result empty state", "Define how unauthorized search/report results disappear without revealing titles or snippets."],
      ["M03", "Plan Matter team permission display", "Map MatterMember roles and permission levels to existing UI density."],
      ["M04", "Plan object restriction indicator", "Define restricted document/invoice indicators without leaking restricted details."],
      ["M05", "Plan approval-required UI", "Show approval_required as a queue item, not as an actionable allow."],
      ["M06", "Plan audit hint UI", "Show that actions will be audited for sensitive actions."],
      ["M07", "Plan responsive permission UI", "Keep permission context visible on mobile without crowding Matter rows."],
      ["M08", "Prepare Hermes UI permission evidence", "Record UI is presentation-only and cannot override evaluator decisions."],
      ["M09", "Prepare Claude UI permission review", "Ask Claude to check whether UI leaks blocked resource details."],
      ["M10", "Close UI operator phase", "Defer deep admin permission editing UI to RP21 while preserving display requirements."],
    ],
  },
  {
    id: "P05",
    title: "Fixtures And Golden Cases",
    files: ["packages/authz/src/fixtures.js", "packages/authz/fixtures/permission-golden-cases.json"],
    tests: ["packages/authz/test/permission-golden-cases.test.js"],
    theme: "권한 golden case로 deny-over-allow와 search trimming을 증명",
    micros: [
      ["M00", "Define base tenant fixture", "Create synthetic tenant with default security policy and roles."],
      ["M01", "Define matter team fixture", "Create synthetic responsible partner, attorney, staff, finance, security admin, auditor, and client user."],
      ["M02", "Define matter resource fixture", "Create synthetic matters with normal, confidential, highly confidential, and ethical wall variants."],
      ["M03", "Define document resource fixture", "Create synthetic documents with folder, version, confidentiality, and matter references."],
      ["M04", "Define invoice settlement fixtures", "Create synthetic invoice and settlement resources for future finance permissions."],
      ["M05", "Define legal hold golden case", "Create case where legal hold blocks destructive action despite role allow."],
      ["M06", "Define ethical wall golden case", "Create case where partner/admin-style principal is denied by wall."],
      ["M07", "Define object ACL golden case", "Create case where object restriction narrows matter team access."],
      ["M08", "Define security trimming golden case", "Create mixed search results where unauthorized rows disappear before display."],
      ["M09", "Define AI retrieval golden case", "Create case where AI can retrieve only permitted document/version refs."],
      ["M10", "Close fixtures phase", "Confirm fixtures are synthetic, reusable, and explicit about expected decisions."],
    ],
  },
  {
    id: "P06",
    title: "Permission Audit Integration",
    files: ["packages/authz/src/audit-hints.js", "packages/audit/README.md"],
    tests: ["packages/authz/test/permission-audit-hints.test.js"],
    theme: "권한 결정이 감사 이벤트 생성을 위한 충분한 힌트를 제공하게 함",
    micros: [
      ["M00", "Define audit hint contract", "Define audit_hint fields for actor, action, resource, decision, reason, and matched rules."],
      ["M01", "Bind view audit hint", "Return audit hints for document, matter, invoice, and report view decisions."],
      ["M02", "Bind download audit hint", "Return stronger audit hints for file download and export actions."],
      ["M03", "Bind share audit hint", "Return audit hints for secure link, portal share, and external counsel share attempts."],
      ["M04", "Bind permission-change audit hint", "Return audit hints when a policy or ACL mutation is requested."],
      ["M05", "Bind billing audit hint", "Return audit hints for invoice, payment, write-off, and month-close actions."],
      ["M06", "Bind settlement audit hint", "Return audit hints for settlement preview, approval, dispute, and lock actions."],
      ["M07", "Bind AI retrieval audit hint", "Return audit hints with model policy and retrieval scope metadata."],
      ["M08", "Prepare Hermes H02 audit evidence", "Record which permission decisions require audit event generation downstream."],
      ["M09", "Prepare Claude audit integration review", "Ask Claude to find decisions that lack audit hints."],
      ["M10", "Close permission audit integration", "Hand off audit event persistence to RP03 with no hidden gaps."],
    ],
  },
  {
    id: "P07",
    title: "Failure Edge And Recovery",
    files: ["packages/authz/test/permission-failure-cases.test.js"],
    tests: ["packages/authz/test/permission-failure-cases.test.js"],
    theme: "권한 우회, 모호한 allow, cross-tenant, missing context를 모두 실패 케이스로 고정",
    micros: [
      ["M00", "Define missing principal failure", "Fail closed when principal is missing, disabled, or lacks tenant context."],
      ["M01", "Define missing resource failure", "Fail closed when resource kind, ID, tenant, or matter context is missing."],
      ["M02", "Define missing action failure", "Fail closed when action is unknown or unsupported."],
      ["M03", "Define cross-tenant failure", "Deny access when principal and resource tenant IDs differ."],
      ["M04", "Define ambiguous rule failure", "Fail or require review when two same-priority rules conflict."],
      ["M05", "Define stale matter membership failure", "Deny or review when MatterMember is inactive or removed."],
      ["M06", "Define admin bypass failure", "Prove admin or partner role cannot bypass ethical wall or legal hold."],
      ["M07", "Define search leak failure", "Fail if unauthorized resource title, snippet, or count is leaked."],
      ["M08", "Define AI retrieval leak failure", "Fail if unauthorized document/version enters AI retrieval set."],
      ["M09", "Prepare Claude bypass review", "Ask Claude to find missing bypass and failure cases."],
      ["M10", "Close failure phase", "Confirm all dangerous ambiguity fails closed or requires review."],
    ],
  },
  {
    id: "P08",
    title: "Hermes Validation Binding",
    files: ["hermes/project.json", "docs/hermes-connection.md", "scripts/validate-product-contract.mjs"],
    tests: ["npm run validate", "npm test", "npm run fullplan:validate"],
    theme: "Hermes H02가 권한 커널 결과를 증거로 기록할 수 있게 함",
    micros: [
      ["M00", "Define H02 command matrix", "Record product commands Hermes should run for permission kernel validation."],
      ["M01", "Define H02 decision evidence fields", "Define decision count, deny count, review count, blocked claims, and matched rule summary."],
      ["M02", "Define H02 precedence evidence", "Record proof that legal hold and deny rules outrank allow rules."],
      ["M03", "Define H02 trimming evidence", "Record proof that unauthorized search/AI/report rows are hidden."],
      ["M04", "Define H02 audit-hint evidence", "Record proof that sensitive decisions carry audit hints."],
      ["M05", "Define H02 no-real-data evidence", "Record synthetic-only permission fixtures."],
      ["M06", "Define H02 Claude dependency", "Mark C02 review mandatory before DMS or AI retrieval code trusts the evaluator."],
      ["M07", "Define H02 human approval note", "Record what human must approve: deny precedence and fail-closed policy."],
      ["M08", "Prepare H02 evidence packet template", "Create a future template for Hermes to fill during RP02 closeout."],
      ["M09", "Prepare H02 closeout criteria", "Define PASS/BLOCK semantics for permission kernel gate."],
      ["M10", "Close Hermes binding phase", "Confirm Hermes validates permission behavior without owning product code."],
    ],
  },
  {
    id: "P09",
    title: "Claude Cross Validation Closeout",
    files: ["docs/rp02-claude-cross-validation-brief.md"],
    tests: ["npm run validate", "npm test", "npm run fullplan:validate"],
    theme: "Claude Code가 권한 모델과 우회 가능성을 독립 검토하게 하는 review packet 준비",
    micros: [
      ["M00", "Prepare RP02 architecture review questions", "Ask whether permission model boundaries are stable and extensible."],
      ["M01", "Prepare RP02 security review questions", "Ask whether deny-over-allow, fail-closed, and cross-tenant rules are sufficient."],
      ["M02", "Prepare RP02 bypass review questions", "Ask Claude to find admin, partner, search, report, and AI retrieval bypasses."],
      ["M03", "Prepare RP02 missing test questions", "Ask what golden cases and failure cases are missing."],
      ["M04", "Prepare RP02 DMS readiness questions", "Ask whether evaluator can safely support DMS Core in RP06."],
      ["M05", "Prepare RP02 AI readiness questions", "Ask whether evaluator can safely support AI retrieval later in RP17/RP18."],
      ["M06", "Define Claude finding severity", "Use P0/P1/P2/P3 severity for permission findings."],
      ["M07", "Define go/no-go verdict format", "Require PASS, PASS_WITH_FINDINGS, or BLOCK for RP02 closeout."],
      ["M08", "Define finding-to-microphase routing", "Route findings to RP02 corrections, RP03 audit, RP06 DMS, or RP17 AI governance."],
      ["M09", "Prepare human approval summary", "Summarize the deny precedence, fail-closed, and review-required rules for approval."],
      ["M10", "Close RP02 detailed plan", "Confirm RP02 is detailed enough for AI implementation without more planning decisions."],
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
    id: `RP02.${phase.id}.${microId}`,
    program_id: "RP02",
    program_title: "Permission Kernel",
    phase_id: `RP02.${phase.id}`,
    phase_title: phase.title,
    micro_id: microId,
    micro_title: title,
    objective,
    ai_owner: "Codex",
    hermes_gate: "H02",
    claude_gate: "C02",
    target_files: phase.files,
    target_tests: phase.tests,
    commands: commandsFor(phase.id),
    acceptance: [
      "Deliverable is specific enough for AI implementation without choosing permission scope.",
      "No real client, matter, document, billing, settlement, credential, or secret data is used.",
      "Deny-over-allow, tenant isolation, fail-closed behavior, and security trimming are preserved where applicable.",
      "Hermes H02 evidence or blocked reason can be recorded.",
      "Claude C02 can independently review architecture, security, bypass risks, missing tests, and go/no-go status.",
    ],
    status: "planned",
  };
}

const entries = phases.flatMap((phase) => phase.micros.map((micro) => entryFor(phase, micro)));

function markdown(entries) {
  const lines = [];
  lines.push("# RP02 Permission Kernel Detailed Micro Phases v1");
  lines.push("");
  lines.push("Purpose: expand RP02 from the 3,300-phase master ledger into implementation-ready permission-kernel micro phases.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("- Program: RP02 Permission Kernel");
  lines.push("- Micro phases: 110");
  lines.push("- AI owner: Codex");
  lines.push("- Hermes gate: H02");
  lines.push("- Claude Code gate: C02");
  lines.push("- Immediate next implementation target after RP01 closeout: RP02.P00.M00");
  lines.push("");
  for (const phase of phases) {
    lines.push(`## RP02.${phase.id}: ${phase.title}`);
    lines.push("");
    lines.push(`Theme: ${phase.theme}`);
    lines.push("");
    lines.push(`Target files: ${phase.files.join(", ")}`);
    lines.push("");
    lines.push(`Target tests: ${phase.tests.join(", ")}`);
    lines.push("");
    for (const entry of entries.filter((row) => row.phase_id === `RP02.${phase.id}`)) {
      lines.push(`- ${entry.id} | ${entry.micro_title} | ${entry.objective}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_PATH, `${JSON.stringify({
  schema_version: "law-firm-os.rp02-detailed-microphases.v1",
  program_id: "RP02",
  micro_phase_count: entries.length,
  entries,
}, null, 2)}\n`);
await writeFile(MD_PATH, markdown(entries));

console.log(`Generated RP02 detailed micro phases: ${entries.length}`);
console.log(JSON_PATH);
console.log(MD_PATH);

