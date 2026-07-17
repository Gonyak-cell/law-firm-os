import { createHash } from "node:crypto";

export const REQUIRED_SELECTORS = Object.freeze([
  "command",
  "platform-goal",
  "internal-unsigned-package",
  "approval-packet-local-only",
  "source-browser-local",
  "provider-neutral-local",
  "approval-three-way",
  "external-three-way",
  "dependency-aware",
  "enabled-disabled-pending",
]);

const WORKSTREAM_COUNTS = Object.freeze({
  "RS-GOV": 8,
  "RS-SA": 8,
  "RS-SB": 10,
  "RS-DUR": 12,
  "RS-STO": 15,
  "RS-BKP": 8,
  "RS-DBF": 12,
  "RS-IDN": 10,
  "RS-DOM": 30,
  "RS-DMS": 10,
  "RS-PRJ": 6,
  "RS-OFF": 6,
  "RS-CUT": 12,
});

const ALLOWED_VARIABLES = new Set([
  "CUT_001_APPROVAL_RECEIPT_OR_NONE",
  "CUT_001_RECEIPT",
  "CUT_002_INVENTORY",
  "CUT_002_RECEIPT",
  "CUT_003_PHASE",
  "CUT_003_RECEIPT",
  "CUT_004_APPROVAL_RECEIPT_OR_NONE",
  "CUT_DEPENDENCY_RECEIPT_BUNDLE",
  "CUT_DECISION_SOURCE_SHA",
  "CUT_005_RECEIPT",
  "CUT_006_RECEIPT",
  "CUT_007_RECEIPT",
  "CUT_008_APPROVAL_RECEIPT_OR_NONE",
  "CUT_PREDECESSOR_RECEIPT",
  "CUT_PRODUCTION_MODE",
  "CUT_PRODUCTION_PHASE",
  "CUT_STAGE",
  "CUT_STAGING_MODE",
  "DMS_APPROVAL_RECEIPT_OR_NONE",
  "DMS_DECISION_SOURCE_SHA",
  "E_OFF_OUTCOME",
  "E_PRJ_OUTCOME",
  "FINAL_PLAN_SHA256",
  "LAWOS_APPROVAL_TRUST_REGISTRY_SHA256",
  "OFF_APPROVAL_RECEIPT_OR_NONE",
  "OFF_DECISION_SOURCE_SHA",
  "PLATFORM_GOAL_ID",
  "PLATFORM_GOAL_RECORD",
  "PRJ_APPROVAL_RECEIPT_OR_NONE",
  "PRJ_DECISION_SOURCE_SHA",
  "S_CUT_DEPENDENCY_RECEIPT",
  "S_CUT",
  "S_DMS",
  "S_OFF_SELECTED",
  "S_PRJ",
  "TARGET_CHECKOUT",
  "TARGET_SOURCE_SHA",
  "TOOLCHAIN",
  "TUW_ID",
  "TUW_OUTPUT_DIR",
]);

export class RuntimeSafetyCatalogError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeSafetyCatalogError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new RuntimeSafetyCatalogError(code, message, details);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function commandsForVariant(recipe) {
  return Array.isArray(recipe) ? [recipe] : Object.values(recipe);
}

function validateArgvList(commands, recipeName) {
  if (!Array.isArray(commands) || commands.length === 0) fail("CATALOG_RECIPE", "recipe commands must be a non-empty array", { recipeName });
  for (const argv of commands) {
    if (!Array.isArray(argv) || argv.length === 0 || argv.some((arg) => typeof arg !== "string" || arg.length === 0 || /[\0\r\n]/.test(arg))) {
      fail("CATALOG_RECIPE", "every recipe command must be a literal argv array", { recipeName });
    }
    if (argv.some((arg) => /[*?\[\]]/.test(arg.replaceAll(/\{\{[A-Z0-9_]+\}\}/g, "")))) {
      fail("CATALOG_GLOB", "recipe argv may not contain glob syntax", { recipeName });
    }
    for (const arg of argv) {
      for (const match of arg.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) {
        if (!ALLOWED_VARIABLES.has(match[1])) fail("CATALOG_UNDEFINED_VARIABLE", "recipe contains an undefined variable", { recipeName, variable: match[1] });
      }
      const unresolved = arg.replaceAll(/\{\{[A-Z0-9_]+\}\}/g, "");
      if (unresolved.includes("{{") || unresolved.includes("}}")) fail("CATALOG_UNDEFINED_VARIABLE", "recipe contains malformed interpolation", { recipeName });
    }
  }
}

function selectorOutcomes(selector, tuwId) {
  const artifact = (name) => [`${tuwId}/${name}`, `${tuwId}/output-hashes.json`];
  const defaults = {
    command: {
      pass: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("command-evidence.v0.2.json") },
      fail: { implementation_state: "BLOCKED", execution_state: "NOT_APPLICABLE", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "platform-goal": {
      active: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("run-manifest.json") },
      missing: { implementation_state: "BLOCKED", execution_state: "NOT_APPLICABLE", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "internal-unsigned-package": {
      pass: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("command-evidence.v0.2.json") },
      fail: { implementation_state: "BLOCKED_NOT_REPRODUCIBLE", execution_state: "NOT_APPLICABLE", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "approval-packet-local-only": {
      packet_valid: { implementation_state: "VERIFIED", execution_state: "APPROVAL_REQUIRED", claims: { verified: true }, required_artifacts: artifact("decision-packet.json") },
      packet_missing: { implementation_state: "READY", execution_state: "APPROVAL_REQUIRED", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "source-browser-local": {
      pass: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("command-evidence.v0.2.json") },
      fail: { implementation_state: "BLOCKED_NOT_REPRODUCIBLE", execution_state: "NOT_APPLICABLE", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "provider-neutral-local": {
      pass: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("command-evidence.v0.2.json") },
      fail: { implementation_state: "BLOCKED", execution_state: "NOT_APPLICABLE", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "approval-three-way": {
      signed_approved: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("decision-packet.json.sig") },
      signed_rejected: { implementation_state: "BLOCKED", execution_state: "NOT_APPLICABLE", claims: { verified: false }, required_artifacts: artifact("decision-packet.json.sig") },
      unsigned_pending: { implementation_state: "READY", execution_state: "APPROVAL_REQUIRED", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "external-three-way": {
      authorized_executed: { implementation_state: "VERIFIED", execution_state: "EXECUTED", claims: { verified: true }, required_artifacts: artifact("command-evidence.v0.2.json") },
      authorized_unavailable: { implementation_state: "BLOCKED", execution_state: "BLOCKED_EXTERNAL", claims: { verified: false }, required_artifacts: artifact("output-hashes.json") },
      approval_required: { implementation_state: "READY", execution_state: "APPROVAL_REQUIRED", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "dependency-aware": {
      dependency_verified: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("command-evidence.v0.2.json") },
      dependency_pending: { implementation_state: "PLANNED", execution_state: "APPROVAL_REQUIRED", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
    "enabled-disabled-pending": {
      enabled: { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("command-evidence.v0.2.json") },
      disabled: { implementation_state: "DISABLED_BY_APPROVED_DECISION", execution_state: "NOT_APPLICABLE", claims: { verified: true }, required_artifacts: artifact("decision-packet.json.sig") },
      pending: { implementation_state: "PLANNED", execution_state: "APPROVAL_REQUIRED", claims: { verified: false }, required_artifacts: artifact("status.json") },
    },
  };
  const outcomes = structuredClone(defaults[selector]);
  if (!outcomes) fail("CATALOG_SELECTOR", "selector has no closed outcome table", { selector, tuwId });
  if (tuwId === "RS-PRJ-005") {
    outcomes.signed_rejected = { ...outcomes.signed_approved };
    outcomes.unsigned_pending.implementation_state = "READY";
  }
  if (tuwId === "RS-PRJ-006") {
    outcomes.signed_rejected.implementation_state = "DISABLED_BY_APPROVED_DECISION";
    outcomes.signed_rejected.claims.verified = true;
    outcomes.unsigned_pending.implementation_state = "PLANNED";
  }
  if (tuwId.startsWith("RS-OFF-")) {
    if (["RS-OFF-001", "RS-OFF-006"].includes(tuwId)) outcomes.disabled.implementation_state = "VERIFIED";
    outcomes.pending.implementation_state = tuwId === "RS-OFF-001" ? "READY" : "PLANNED";
  }
  if (tuwId === "RS-DMS-001") {
    outcomes.signed_rejected.implementation_state = "VERIFIED";
    outcomes.signed_rejected.claims.verified = true;
  }
  return outcomes;
}

export function parseRuntimeSafetyCommandCatalog(catalogText, { expectedSha256 } = {}) {
  const catalogSha256 = sha256(catalogText);
  if (expectedSha256 && catalogSha256 !== expectedSha256) fail("CATALOG_HASH_DRIFT", "catalog hash does not match the expected SHA-256");

  const targetRules = {};
  for (const match of catalogText.matchAll(/^\| `(T_[A-Z]+)` \| (.+) \|$/gm)) targetRules[match[1]] = match[2].trim();
  if (Object.keys(targetRules).length !== 13) fail("CATALOG_TARGET_RULE", "catalog must define exactly 13 target rules");

  const recipes = {};
  for (const match of catalogText.matchAll(/^`(R_[A-Z0-9_]+)`\n\n```json\n([\s\S]*?)\n```$/gm)) {
    try {
      recipes[match[1]] = JSON.parse(match[2]);
    } catch {
      fail("CATALOG_RECIPE_JSON", "recipe JSON is invalid", { recipe: match[1] });
    }
  }
  if (Object.keys(recipes).length === 0) fail("CATALOG_RECIPE", "catalog contains no recipes");
  for (const [name, recipe] of Object.entries(recipes)) {
    if (!Array.isArray(recipe) && (recipe === null || typeof recipe !== "object" || Array.isArray(recipe))) fail("CATALOG_RECIPE", "recipe must be an argv array or closed variant object", { name });
    for (const commands of commandsForVariant(recipe)) validateArgvList(commands, name);
  }

  const rows = [...catalogText.matchAll(/^\| (RS-[A-Z]+-\d{3}) \| (T_[A-Z]+) \| (R_[A-Z0-9_]+) \| ([a-z-]+) \| (isolated:RS-[A-Z]+-\d{3}:all) \|$/gm)]
    .map((match) => ({ tuw_id: match[1], target_rule: match[2], recipe: match[3], selector: match[4], result_slice: match[5] }));
  if (rows.length !== 147 || new Set(rows.map((row) => row.tuw_id)).size !== 147) fail("CATALOG_CARDINALITY", "catalog must contain 147 unique TUW rows");
  const counts = {};
  for (const row of rows) {
    const workstream = row.tuw_id.replace(/-\d{3}$/, "");
    counts[workstream] = (counts[workstream] ?? 0) + 1;
    if (!(row.target_rule in targetRules)) fail("CATALOG_TARGET_RULE", "row references an undefined target rule", { tuw_id: row.tuw_id });
    if (!(row.recipe in recipes)) fail("CATALOG_RECIPE", "row references an undefined recipe", { tuw_id: row.tuw_id });
    if (!REQUIRED_SELECTORS.includes(row.selector)) fail("CATALOG_SELECTOR", "row references an undefined selector", { tuw_id: row.tuw_id });
    if (row.result_slice !== `isolated:${row.tuw_id}:all`) fail("CATALOG_RESULT_SLICE", "row result slice is not exact", { tuw_id: row.tuw_id });
  }
  if (JSON.stringify(counts) !== JSON.stringify(WORKSTREAM_COUNTS)) fail("CATALOG_WORKSTREAMS", "catalog workstream counts drifted", { counts });
  const selectors = new Set(rows.map((row) => row.selector));
  const missingSelectors = REQUIRED_SELECTORS.filter((selector) => !selectors.has(selector));
  if (missingSelectors.length) fail("CATALOG_SELECTOR", "catalog does not exercise every closed selector", { missingSelectors });

  return Object.freeze({ catalog_sha256: catalogSha256, target_rules: targetRules, recipes, rows });
}

export function buildRuntimeSafetyRerunManifest(catalogText, options = {}) {
  const parsed = parseRuntimeSafetyCommandCatalog(catalogText, options);
  const envelope = {
    cwd: "{{TARGET_CHECKOUT}}",
    shell: false,
    stdin: "closed",
    env: {
      CI: "1",
      TZ: "UTC",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      GIT_OPTIONAL_LOCKS: "0",
      AWS_EC2_METADATA_DISABLED: "true",
      NO_PROXY: "127.0.0.1,localhost,::1",
    },
    allowed_injected_env: ["LAWOS_TEST_POSTGRES_URL", "LAWOS_APPROVAL_TRUST_REGISTRY_SHA256"],
    timeout_ms: 900_000,
    parser: "ordered-process-results-v1",
  };
  const rows = parsed.rows.map((row) => ({
    ...row,
    cwd: envelope.cwd,
    env: envelope.env,
    parser: envelope.parser,
    timeout_ms: envelope.timeout_ms,
    commands: parsed.recipes[row.recipe],
    outcomes: selectorOutcomes(row.selector, row.tuw_id),
  }));
  return {
    schema_version: "law-firm-os.runtime-safety.evidence-rerun-manifest.v0.2",
    catalog_path: ".omo/plans/lawos-runtime-safety-147-command-catalog-20260717.md",
    catalog_sha256: parsed.catalog_sha256,
    historical_tuw_count: rows.filter((row) => !/^RS-(?:DMS|PRJ|OFF|CUT)-/.test(row.tuw_id)).length,
    post_legacy_tuw_count: rows.filter((row) => /^RS-(?:DMS|PRJ|OFF|CUT)-/.test(row.tuw_id)).length,
    tuw_count: rows.length,
    envelope,
    target_rules: parsed.target_rules,
    selectors: REQUIRED_SELECTORS,
    rows,
  };
}
