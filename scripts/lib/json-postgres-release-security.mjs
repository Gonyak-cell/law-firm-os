import { createHash } from "node:crypto";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const REQUIRED_ACTION_CHECKS = Object.freeze([
  "JSON PostgreSQL exact-head security",
  "HRX rollout validation",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createJsonPostgresReleaseSecurityEvidence({
  packet,
  cut008Receipt,
  checkRuns,
  codeAlerts,
  dependencyAlerts,
  secretAlerts,
} = {}) {
  if (packet?.phase !== "w13-production-cutover"
    || !SHA1.test(packet.source_sha ?? "")
    || !SHA1.test(packet.source_tree ?? "")
    || !SHA256.test(packet.packet_sha256 ?? "")
    || cut008Receipt?.valid !== true
    || cut008Receipt.signature_valid !== true
    || cut008Receipt.receipt_kind !== "cut-008"
    || cut008Receipt.execution_state !== "PASS"
    || cut008Receipt.source_sha !== packet.source_sha
    || cut008Receipt.source_tree !== packet.source_tree
    || cut008Receipt.packet_sha256 !== packet.packet_sha256
    || cut008Receipt.safe_counts?.required_postgres_test_skip_count !== 0) {
    throw new Error("release security requires the exact signed CUT-008 PASS");
  }
  if (!Array.isArray(checkRuns)
    || !Array.isArray(codeAlerts)
    || !Array.isArray(dependencyAlerts)
    || !Array.isArray(secretAlerts)) {
    throw new Error("release security inventories are incomplete");
  }
  const successful = checkRuns.filter((check) =>
    check?.head_sha === packet.source_sha
    && check.status === "completed"
    && check.conclusion === "success");
  for (const name of REQUIRED_ACTION_CHECKS) {
    if (!successful.some((check) =>
      check.name === name
      && check.app?.slug === "github-actions")) {
      throw new Error(`release security is missing trusted exact-head check: ${name}`);
    }
  }
  const codeql = successful.filter((check) =>
    check.app?.slug === "github-code-scanning"
    || /^CodeQL(?:\s|$|\/)/u.test(check.name ?? ""));
  if (codeql.length < 1) throw new Error("release security is missing an exact-head CodeQL PASS");
  const openCode = codeAlerts.filter((alert) =>
    ["critical", "high"].includes(
      String(alert.rule?.security_severity_level ?? "").toLowerCase(),
    )).length;
  const openDependencies = dependencyAlerts.filter((alert) =>
    ["critical", "high"].includes(
      String(alert.security_advisory?.severity ?? "").toLowerCase(),
    )).length;
  if (openCode !== 0 || openDependencies !== 0 || secretAlerts.length !== 0) {
    throw new Error("release security has open critical/high or sensitive-material alerts");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-release-security.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    cut008_receipt_sha256: cut008Receipt.canonical_sha256,
    exact_head_ci_passed: true,
    code_scanning_passed: true,
    dependency_review_passed: true,
    sensitive_material_scan_passed: true,
    trusted_action_check_count: REQUIRED_ACTION_CHECKS.length,
    trusted_codeql_check_count: codeql.length,
    open_critical_count: 0,
    open_high_count: 0,
    sensitive_material_finding_count: 0,
    reviewed_code_alert_count: codeAlerts.length,
    reviewed_dependency_alert_count: dependencyAlerts.length,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function validateJsonPostgresReleaseSecurityEvidence(value, {
  packet,
} = {}) {
  const { result_sha256: ignored, ...material } = value ?? {};
  if (value?.schema_version !== "law-firm-os.json-postgres-release-security.v1"
    || value.outcome !== "PASS"
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || !SHA256.test(value.packet_sha256 ?? "")
    || !SHA256.test(value.cut008_receipt_sha256 ?? "")
    || value.exact_head_ci_passed !== true
    || value.code_scanning_passed !== true
    || value.dependency_review_passed !== true
    || value.sensitive_material_scan_passed !== true
    || value.trusted_action_check_count < REQUIRED_ACTION_CHECKS.length
    || value.trusted_codeql_check_count < 1
    || value.open_critical_count !== 0
    || value.open_high_count !== 0
    || value.sensitive_material_finding_count !== 0
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== sha256(material)
    || (packet && (value.source_sha !== packet.source_sha
      || value.source_tree !== packet.source_tree
      || value.packet_sha256 !== packet.packet_sha256))) {
    throw new Error("release security evidence is invalid");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
  });
}
