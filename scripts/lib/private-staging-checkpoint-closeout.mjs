import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

export const PRIVATE_STAGING_CLOSEOUT_CHECKPOINT = Object.freeze({
  source_sha: "a8fe52c454593c1c98f7993db4cb12e33b0b7e75",
  source_tree: "f0117ef631b41e0fe853cc2e9564645111e19a14",
  artifact_sha256: "08a0001f7adb81064c7277f41b42cf5023a29094e85c2cbb0732ff8ad9a9d29b",
  artifact_entries_sha256: "38e1c4db4b1cccee85e930c8d73be272383bc85c3a8bfa094d9c48bef65b2dca",
  packet_sha256: "807860bf0826e69d3296c3dad21b2f1a75f64971aa8c255ea0e22423dd937eae",
  result_sha256: "6454bfb1df41366e2f3128ec723395ebf1e3ea366c5fcd47cae7047bbc9c77b4",
  browser_diagnostics_sha256: "bf5e2aff742fb71ad6c563bb473af98d756a67fc757cf7a542c2a2908794ed9e",
  current_postgres_readback_sha256: "602c579597ee77e739f9220dce79dbfcefa6815a34c7f0e3e36978397213da47",
  screenshot_manifest_sha256: "86696d641c08844792e22c1565307a11751d6c0b7511f4173ac1b5eb6cad05d3",
});

export const PRIVATE_STAGING_CLOSEOUT_ALLOWED_PATHS = Object.freeze([
  ".github/workflows/private-staging-security.yml",
  "scripts/generate-private-staging-checkpoint-receipts.mjs",
  "scripts/lib/private-staging-aws-execution.mjs",
  "scripts/lib/private-staging-checkpoint-closeout.mjs",
  "scripts/lib/private-staging-execution-receipt.mjs",
  "scripts/run-private-staging-local-gates.mjs",
  "scripts/test/private-staging-aws-execution.test.mjs",
  "scripts/test/private-staging-checkpoint-closeout.test.mjs",
  "scripts/test/private-staging-execution-receipt.test.mjs",
  "scripts/validate-private-staging-execution-receipts.mjs",
]);

export const PRIVATE_STAGING_PRIOR_CHECKPOINT_SOURCES = Object.freeze({
  "infrastructure-deployment": Object.freeze({
    source_sha: "b2ba33238adfa9a09fa42cebe77a2836491dee62",
    source_tree: "0f315ba14d47d1eba255dd89e8797ae7024471de",
  }),
  "database-bootstrap": Object.freeze({
    source_sha: "b2ba33238adfa9a09fa42cebe77a2836491dee62",
    source_tree: "0f315ba14d47d1eba255dd89e8797ae7024471de",
  }),
  "cost-verification": Object.freeze({
    source_sha: "b2ba33238adfa9a09fa42cebe77a2836491dee62",
    source_tree: "0f315ba14d47d1eba255dd89e8797ae7024471de",
  }),
  "protected-resource-non-interference": Object.freeze({
    source_sha: "b2ba33238adfa9a09fa42cebe77a2836491dee62",
    source_tree: "0f315ba14d47d1eba255dd89e8797ae7024471de",
  }),
  "cut-005": Object.freeze({
    source_sha: "faab729a39b7b8379017ce004cb0ed3137ede994",
    source_tree: "33db6051fa5af7c1e957ec6adc5aac06dd976cc1",
  }),
  "cut-006": Object.freeze({
    source_sha: "faab729a39b7b8379017ce004cb0ed3137ede994",
    source_tree: "33db6051fa5af7c1e957ec6adc5aac06dd976cc1",
  }),
});

function fail(message) {
  const error = new Error(message);
  error.code = "PRIVATE_STAGING_CHECKPOINT_CLOSEOUT_INVALID";
  throw error;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sha256PrivateStagingCloseout(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseEvidence(bytes, name, expectedSha256) {
  if (!Buffer.isBuffer(bytes) || sha256PrivateStagingCloseout(bytes) !== expectedSha256) fail(`${name} digest mismatch`);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${name} is not valid JSON`);
  }
}

function allFiniteNonNegativeCounts(value, name) {
  if (!isRecord(value) || !Object.keys(value).length) fail(`${name} safe counts are missing`);
  if (Object.entries(value).some(([, count]) => typeof count !== "number" || !Number.isFinite(count) || count < 0)) {
    fail(`${name} safe counts must be finite non-negative numbers`);
  }
}

function requireZeroCounters(value, counters, name) {
  for (const counter of counters) if (value[counter] !== 0) fail(`${name} ${counter} must equal zero`);
}

export function privateStagingScreenshotManifestSha256(directory) {
  const root = realpathSync(resolve(directory));
  if (lstatSync(root).isSymbolicLink() || !statSync(root).isDirectory() || (statSync(root).mode & 0o077) !== 0) {
    fail("screenshot directory must be a private non-symlink directory");
  }
  const names = readdirSync(root).filter((name) => name.endsWith(".png")).sort();
  const expectedNames = ["01-home.png", "02-people.png", "03-matter.png", "04-vault.png", "05-finance.png"];
  if (JSON.stringify(names) !== JSON.stringify(expectedNames)) fail("screenshot inventory is not the approved five-route manifest");
  const manifest = names.map((name) => {
    const path = resolve(root, name);
    if (lstatSync(path).isSymbolicLink() || !statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) {
      fail(`screenshot is not a private regular file: ${name}`);
    }
    return `${sha256PrivateStagingCloseout(readFileSync(path))}  ${path}\n`;
  }).join("");
  return sha256PrivateStagingCloseout(manifest);
}

export function validatePrivateStagingCloseoutSourceDelta({
  baseSourceSha,
  baseSourceTree,
  currentSourceSha,
  changedPaths,
  checkpoint = PRIVATE_STAGING_CLOSEOUT_CHECKPOINT,
  allowedPaths = PRIVATE_STAGING_CLOSEOUT_ALLOWED_PATHS,
} = {}) {
  if (baseSourceSha !== checkpoint.source_sha || baseSourceTree !== checkpoint.source_tree) fail("closeout base source binding drifted");
  if (!SHA1.test(currentSourceSha ?? "") || currentSourceSha === baseSourceSha) fail("closeout current source SHA is invalid");
  if (!Array.isArray(changedPaths) || changedPaths.length === 0 || changedPaths.some((path) => typeof path !== "string" || !path)) {
    fail("closeout source delta is empty or invalid");
  }
  const unique = [...new Set(changedPaths)].sort();
  if (unique.length !== changedPaths.length) fail("closeout source delta contains duplicate paths");
  const allowed = new Set(allowedPaths);
  const unexpected = unique.filter((path) => !allowed.has(path));
  if (unexpected.length) fail(`closeout source delta escaped its allowlist: ${unexpected.join(",")}`);
  return Object.freeze({
    changed_path_count: unique.length,
    receipt_closeout_path_count: unique.length,
    runtime_dependency_change_count: 0,
    changed_paths_sha256: sha256PrivateStagingCloseout(JSON.stringify(unique)),
  });
}

export function validatePrivateStagingCut007CloseoutEvidence({
  resultBytes,
  browserDiagnosticsBytes,
  currentReadbackBytes,
  screenshotManifestSha256,
  checkpoint = PRIVATE_STAGING_CLOSEOUT_CHECKPOINT,
} = {}) {
  const result = parseEvidence(resultBytes, "CUT-007 browser result", checkpoint.result_sha256);
  const diagnostics = parseEvidence(browserDiagnosticsBytes, "CUT-007 browser diagnostics", checkpoint.browser_diagnostics_sha256);
  const readback = parseEvidence(currentReadbackBytes, "CUT-007 current PostgreSQL readback", checkpoint.current_postgres_readback_sha256);
  if (screenshotManifestSha256 !== checkpoint.screenshot_manifest_sha256) fail("CUT-007 screenshot manifest digest mismatch");

  if (result.outcome !== "PASS" || result.environment !== "lawos-staging" || result.data_scope !== "synthetic-only") {
    fail("CUT-007 browser result is not a staging synthetic-only PASS");
  }
  allFiniteNonNegativeCounts(result.safe_counts, "CUT-007 browser result");
  if (result.safe_counts.password_reset_count !== 1 || result.safe_counts.checkpoint_reused_count !== 1 || result.safe_counts.current_postgres_readback_count !== 1) {
    fail("CUT-007 browser result lacks its approved setup and checkpoint counts");
  }
  requireZeroCounters(result, [
    "json_fallback_count",
    "json_writer_count",
    "dual_write_count",
    "file_current_authority_count",
    "offline_mutation_count",
    "memory_fallback_count",
    "wrong_tenant_visible_count",
    "real_data_count",
  ], "CUT-007 browser result");
  if (result.secret_material_returned !== false || result.raw_pii_returned !== false || result.production_contacted !== false || result.production_ready_claim !== false) {
    fail("CUT-007 browser result crossed a secret, PII, or production boundary");
  }
  const browser = result.browser_smoke;
  if (!isRecord(browser) || browser.outcome !== "PASS" || browser.critical_flow_count !== 7 || browser.screenshot_count !== 5 || browser.api_request_count !== 108 || browser.console_error_count !== 0 || browser.failed_request_count !== 0) {
    fail("CUT-007 browser PASS counts drifted");
  }
  if (diagnostics.outcome !== "PASS" || diagnostics.api_request_count !== 108 || diagnostics.screenshot_count !== 5 || diagnostics.console_error_count !== 0 || diagnostics.failed_request_count !== 0 || diagnostics.raw_url_returned !== false || diagnostics.secret_material_returned !== false || diagnostics.raw_pii_returned !== false) {
    fail("CUT-007 browser diagnostics drifted");
  }
  if (JSON.stringify(diagnostics.visited_routes) !== JSON.stringify(["home", "people", "matter", "vault", "finance"])) {
    fail("CUT-007 browser route coverage drifted");
  }

  if (readback.outcome !== "PASS" || readback.action !== "lawos-private-staging-cut-007-readback" || readback.source_sha !== checkpoint.source_sha || readback.source_tree !== checkpoint.source_tree || readback.artifact_sha256 !== checkpoint.artifact_sha256 || readback.owner_instruction_sha256 !== checkpoint.packet_sha256) {
    fail("CUT-007 PostgreSQL readback source binding drifted");
  }
  allFiniteNonNegativeCounts(readback.safe_counts, "CUT-007 PostgreSQL readback");
  requireZeroCounters(readback, ["json_fallback_count", "json_writer_count", "dual_write_count", "real_data_count"], "CUT-007 PostgreSQL readback");
  if (readback.safe_counts.wrong_tenant_visible_count !== 0 || readback.safe_counts.dms_committed_digest_match_count !== 2 || readback.safe_counts.dms_active_legal_hold_count !== 1 || readback.safe_counts.dms_retention_policy_count !== 1) {
    fail("CUT-007 PostgreSQL tenant or DMS readback invariant failed");
  }
  if (readback.raw_value_returned !== false || readback.secret_material_returned !== false || readback.production_contacted !== false || readback.production_ready_claim !== false) {
    fail("CUT-007 PostgreSQL readback crossed a secret, raw-value, or production boundary");
  }
  return Object.freeze({
    result,
    diagnostics,
    readback,
    safe_counts: Object.freeze({
      ...result.safe_counts,
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      file_current_authority_count: 0,
      offline_mutation_count: 0,
      memory_fallback_count: 0,
      wrong_tenant_visible_count: 0,
      real_data_count: 0,
    }),
  });
}

export function validatePrivateStagingCloseoutRebind(summary, packet) {
  if (!isRecord(summary) || !isRecord(packet)) fail("closeout rebind summary and packet are required");
  if (summary.verdict !== "PASS" || summary.source_sha !== packet.source_sha || summary.source_tree !== packet.source_tree || summary.artifact_sha256 !== packet.artifact_sha256 || summary.packet_sha256 !== packet.packet_sha256 || summary.stack_status !== "UPDATE_COMPLETE") {
    fail("closeout rebind exact binding failed");
  }
  if (summary.temporary_eni_allow_count !== 0 || summary.source_function_arn_explicit_deny_count !== 2 || summary.exact_lambda_count !== 2 || summary.protected_resource_mutation_count !== 0 || summary.real_data_count !== 0 || summary.production_contacted !== false) {
    fail("closeout rebind AWS safety invariant failed");
  }
  return Object.freeze({
    exact_lambda_count: 2,
    temporary_eni_allow_count: 0,
    protected_resource_mutation_count: 0,
    real_data_count: 0,
  });
}

export function validatePrivateStagingPriorCheckpointReceipt(receipt, expectedKind) {
  const source = PRIVATE_STAGING_PRIOR_CHECKPOINT_SOURCES[expectedKind];
  if (!source || !isRecord(receipt) || receipt.receipt_kind !== expectedKind || receipt.execution_state !== "PASS" || receipt.exit_code !== 0 || receipt.source_sha !== source.source_sha || receipt.source_tree !== source.source_tree) {
    fail(`${expectedKind} prior signed checkpoint binding failed`);
  }
  allFiniteNonNegativeCounts(receipt.safe_counts, expectedKind);
  if (receipt.claims?.secret_material_returned !== false || receipt.claims?.raw_pii_returned !== false || receipt.claims?.production_contacted !== false || receipt.claims?.real_data_contacted !== false || receipt.safe_counts.real_data_count !== 0) {
    fail(`${expectedKind} prior checkpoint crossed a secret, PII, real-data, or production boundary`);
  }
  if (expectedKind === "infrastructure-deployment") {
    requireZeroCounters(receipt.safe_counts, ["eni_bootstrap_policy_count", "public_rds_count", "public_bucket_count", "protected_resource_mutation_count", "real_data_count"], expectedKind);
    if (receipt.safe_counts.lambda_active_successful_count !== 2) fail("infrastructure checkpoint Lambda count drifted");
  } else if (expectedKind === "database-bootstrap") {
    requireZeroCounters(receipt.safe_counts, ["json_fallback_count", "json_writer_count", "dual_write_count", "real_data_count"], expectedKind);
    if (receipt.safe_counts.migration_count < 1 || receipt.safe_counts.tenant_authority_count < 1) fail("database bootstrap checkpoint is incomplete");
  } else if (expectedKind === "cost-verification") {
    if (receipt.safe_counts.monthly_estimate_krw > 300_000 || receipt.safe_counts.cost_limit_krw !== 300_000) fail("cost checkpoint exceeds its approved limit");
  } else if (expectedKind === "protected-resource-non-interference") {
    requireZeroCounters(receipt.safe_counts, ["protected_resource_mutation_count", "real_data_count"], expectedKind);
  } else if (expectedKind === "cut-005") {
    requireZeroCounters(receipt.safe_counts, ["unexpected_rejection_count", "shadow_difference_count", "tenant_negative_visible_count", "replay_residual_count", "rollback_residual_count", "real_data_count"], expectedKind);
    if (receipt.safe_counts.source_record_count !== receipt.safe_counts.accepted_record_count + receipt.safe_counts.rejected_row_count) fail("CUT-005 checkpoint count invariant failed");
  } else if (expectedKind === "cut-006") {
    requireZeroCounters(receipt.safe_counts, ["json_fallback_count", "json_writer_count", "dual_write_count", "file_current_authority_count", "offline_mutation_count", "memory_fallback_count", "tenant_negative_visible_count", "real_data_count"], expectedKind);
    if (receipt.safe_counts.zero_counter_count !== 6 || receipt.safe_counts.postgres_write_target_count !== receipt.safe_counts.postgres_readback_equal_count) fail("CUT-006 checkpoint authority invariant failed");
  }
  return receipt;
}

export function validatePrivateStagingCloseoutArtifactManifest(manifest, packet) {
  if (!isRecord(manifest) || !isRecord(packet) || manifest.source_sha !== packet.source_sha || manifest.source_tree !== packet.source_tree || manifest.artifact_sha256 !== packet.artifact_sha256) {
    fail("closeout artifact manifest exact binding failed");
  }
  if (manifest.artifact_sha256 !== PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.artifact_sha256 || manifest.artifact_entries_sha256 !== PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.artifact_entries_sha256 || manifest.artifact_runtime_store_entry_count !== 0 || manifest.artifact_real_json_store_count !== 0) {
    fail("closeout artifact changed a runtime dependency or introduced a runtime store");
  }
  for (const digest of [packet.packet_sha256, packet.artifact_sha256, manifest.artifact_entries_sha256]) if (!SHA256.test(digest ?? "")) fail("closeout artifact or packet digest is invalid");
  return Object.freeze({ runtime_dependency_change_count: 0, artifact_entries_sha256: manifest.artifact_entries_sha256 });
}
