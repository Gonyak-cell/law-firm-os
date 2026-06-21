export const RUNTIME_INTEGRATION_RESPONSIBILITY_MAP = Object.freeze([
  Object.freeze({
    rtg: "RTG-001",
    owner_role: "repo_runtime_engineering",
    responsibility: "Functional Client-Matter-People-Wiki-Vault export path is exercised by the RS-6 harness.",
    evidence_refs: Object.freeze(["packages/runtime-integration/src/harness.js", "packages/runtime-integration/test/harness.test.js"]),
    status: "passed"
  }),
  Object.freeze({
    rtg: "RTG-002",
    owner_role: "repo_security_engineering",
    responsibility: "Server-derived principal, permission context, denial, review, and safe error behavior fail closed.",
    evidence_refs: Object.freeze(["packages/runtime-integration/src/harness.js", "packages/runtime-integration/test/security-boundary.test.js"]),
    status: "passed"
  }),
  Object.freeze({
    rtg: "RTG-003",
    owner_role: "repo_audit_engineering",
    responsibility: "Every runtime read/write/export/permission path appends durable hash-chain audit evidence.",
    evidence_refs: Object.freeze(["packages/runtime-integration/src/harness.js", "packages/audit/src/runtime-writer.js"]),
    status: "passed"
  }),
  Object.freeze({
    rtg: "RTG-004",
    owner_role: "release_owner",
    responsibility: "Harness remains synthetic-only and keeps Portal, M365, HR real data, AI, and Vault sync locked.",
    evidence_refs: Object.freeze(["packages/runtime-integration/src/factory.js", "docs/runtime-spine/evidence/g6-runtime-ready-evidence.json"]),
    status: "passed"
  }),
  Object.freeze({
    rtg: "RTG-005",
    owner_role: "qa_owner",
    responsibility: "Regression sweep, reset behavior, and evidence index closeout are verified before repo runtime-ready candidate.",
    evidence_refs: Object.freeze(["scripts/validate-runtime-spine-rs6-integration.mjs", "docs/runtime-spine/qa-checklist.md"]),
    status: "passed"
  })
]);

export function validateRuntimeIntegrationResponsibilityMap(map = RUNTIME_INTEGRATION_RESPONSIBILITY_MAP) {
  const expected = new Set(["RTG-001", "RTG-002", "RTG-003", "RTG-004", "RTG-005"]);
  const errors = [];
  for (const entry of map) {
    if (!expected.has(entry.rtg)) errors.push(`${entry.rtg}: unexpected RTG`);
    if (!entry.owner_role) errors.push(`${entry.rtg}: missing owner_role`);
    if (entry.status !== "passed") errors.push(`${entry.rtg}: status must be passed`);
    if (!Array.isArray(entry.evidence_refs) || entry.evidence_refs.length === 0) errors.push(`${entry.rtg}: missing evidence refs`);
    expected.delete(entry.rtg);
  }
  for (const missing of expected) errors.push(`${missing}: missing responsibility entry`);
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
