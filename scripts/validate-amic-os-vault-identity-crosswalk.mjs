#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..");
const defaultContractPath = "contracts/amic-os-vault-identity-crosswalk.json";
const expectedMappingKeys = Object.freeze([
  "tenant",
  "user",
  "matter",
  "workspace",
  "folder",
  "document",
  "version",
  "file_object",
  "permission_decision",
  "audit_trace",
]);

function fail(message) {
  throw new Error(`AMIC_OS_VAULT_IDENTITY_CROSSWALK_INVALID: ${message}`);
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} drifted`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  exact(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function nonEmptyStrings(value, label) {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array`);
  if (value.some((entry) => typeof entry !== "string" || entry.trim() !== entry || entry.length === 0)) {
    fail(`${label} must contain trimmed non-empty strings`);
  }
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
}

async function assertPathsExist(root, paths, label) {
  for (const relativePath of paths) {
    if (path.isAbsolute(relativePath) || relativePath.includes("..")) fail(`${label} path must be repository-relative`);
    try {
      await access(path.join(root, relativePath));
    } catch {
      fail(`${label} source path is missing: ${relativePath}`);
    }
  }
}

function gitHead(root, label) {
  const result = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" });
  if (result.status !== 0) fail(`${label} source is not a readable git checkout`);
  return result.stdout.trim();
}

function assertPinnedGitSnapshot(root, commit, paths, label) {
  const commitResult = spawnSync("git", ["-C", root, "cat-file", "-e", `${commit}^{commit}`], { encoding: "utf8" });
  if (commitResult.status !== 0) fail(`${label} pinned commit is unavailable`);
  for (const relativePath of paths) {
    const pathResult = spawnSync("git", ["-C", root, "cat-file", "-e", `${commit}:${relativePath}`], { encoding: "utf8" });
    if (pathResult.status !== 0) fail(`${label} source path is absent from pinned commit: ${relativePath}`);
  }
}

function validateDecision(contract) {
  exactKeys(contract.decision, [
    "database_migration_required",
    "lawos_database_migration_count",
    "production_ready_claim",
    "production_writes_default",
    "reason_codes",
    "runtime_data_binding_required",
    "vault_database_migration_count",
  ], "decision");
  if (contract.decision.database_migration_required !== false) fail("database migration decision must remain false");
  if (contract.decision.lawos_database_migration_count !== 0) fail("LawOS migration count must remain zero");
  if (contract.decision.vault_database_migration_count !== 0) fail("Vault migration count must remain zero");
  if (contract.decision.runtime_data_binding_required !== true) fail("runtime data binding gate is required");
  if (contract.decision.production_writes_default !== "deny") fail("production writes must default to deny");
  if (contract.decision.production_ready_claim !== false) fail("source crosswalk cannot claim production readiness");
  nonEmptyStrings(contract.decision.reason_codes, "decision reason codes");
}

function validateTrustBoundary(contract) {
  exact(contract.trust_boundary, {
    resolution_location: "amic_os_server_bff",
    client_supplied_tenant_or_actor_trusted: false,
    desktop_session_forwarded_to_vault: false,
    email_or_display_name_identity_fallback_allowed: false,
    raw_storage_locator_exposed: false,
    automatic_latest_version_resolution_allowed: false,
    vault_authorization_rechecked_per_operation: true,
  }, "trust boundary");
}

function validateMappings(contract) {
  if (!Array.isArray(contract.mappings)) fail("mappings must be an array");
  exact(contract.mappings.map((mapping) => mapping?.key), expectedMappingKeys, "mapping order and keys");
  for (const mapping of contract.mappings) {
    exactKeys(mapping, [
      "authority",
      "cardinality",
      "client_input_trusted",
      "client_visible_fields",
      "key",
      "lawos_source",
      "lossless",
      "required_checks",
      "resolver",
      "server_resolved",
      "vault_target",
    ], `mapping ${mapping?.key ?? "unknown"}`);
    for (const field of ["authority", "cardinality", "key", "lawos_source", "resolver", "vault_target"]) {
      if (typeof mapping[field] !== "string" || mapping[field].trim() !== mapping[field] || !mapping[field]) {
        fail(`mapping ${mapping.key} ${field} is invalid`);
      }
    }
    if (mapping.server_resolved !== true) fail(`mapping ${mapping.key} must be server-resolved`);
    if (mapping.client_input_trusted !== false) fail(`mapping ${mapping.key} must reject client trust`);
    if (mapping.lossless !== true) fail(`mapping ${mapping.key} must be lossless`);
    nonEmptyStrings(mapping.required_checks, `mapping ${mapping.key} checks`);
    nonEmptyStrings(mapping.client_visible_fields, `mapping ${mapping.key} client-visible fields`);
  }

  const byKey = new Map(contract.mappings.map((mapping) => [mapping.key, mapping]));
  if (!byKey.get("user").vault_target.includes("user_login_identities")) fail("user mapping must use the account-ledger registry");
  if (!byKey.get("matter").resolver.includes("lawosMatterId")) fail("matter mapping must use the existing LawOS reflection metadata");
  if (byKey.get("workspace").required_checks.includes("workspace_is_document_authority")) {
    fail("workspace must not replace matter-scoped document authority");
  }
  if (!byKey.get("version").required_checks.includes("automatic_latest_substitution_is_zero")) {
    fail("exact-version mapping must forbid automatic latest substitution");
  }
  if (byKey.get("file_object").client_visible_fields.some((field) => /storage|path|uri/iu.test(field))) {
    fail("file-object mapping exposes a storage locator");
  }
  if (byKey.get("permission_decision").authority !== "vault") fail("Vault must own permission decisions");
  if (byKey.get("audit_trace").authority !== "vault") fail("Vault must own Vault audit events");
}

function validateSourceSnapshot(contract) {
  exactKeys(contract.source_snapshot, ["lawos", "vault"], "source snapshot");
  for (const source of ["lawos", "vault"]) {
    exactKeys(contract.source_snapshot[source], ["commit", "identity_storage", "paths"], `${source} source snapshot`);
    if (!/^[0-9a-f]{40}$/u.test(contract.source_snapshot[source].commit)) fail(`${source} source commit is invalid`);
    nonEmptyStrings(contract.source_snapshot[source].paths, `${source} source paths`);
  }
  if (contract.source_snapshot.lawos.identity_storage !== "text") fail("LawOS identity storage classification drifted");
  if (contract.source_snapshot.vault.identity_storage !== "uuid") fail("Vault identity storage classification drifted");
}

export async function validateAmicOsVaultIdentityCrosswalk({
  repoRoot = defaultRepoRoot,
  contractOverride,
  vaultSourceRoot,
} = {}) {
  const contract = contractOverride ?? JSON.parse(await readFile(path.join(repoRoot, defaultContractPath), "utf8"));
  exactKeys(contract, [
    "blocked_conditions",
    "decision",
    "mappings",
    "required_runtime_readbacks",
    "schema_version",
    "source_snapshot",
    "trust_boundary",
  ], "contract");
  if (contract.schema_version !== "law-firm-os.amic-os-vault-identity-crosswalk.v1") fail("schema version drifted");
  validateSourceSnapshot(contract);
  validateDecision(contract);
  validateTrustBoundary(contract);
  validateMappings(contract);
  nonEmptyStrings(contract.required_runtime_readbacks, "required runtime readbacks");
  nonEmptyStrings(contract.blocked_conditions, "blocked conditions");
  if (!contract.blocked_conditions.includes("client_supplied_tenant_user_or_actor")) fail("forged trust context must be blocked");
  if (!contract.blocked_conditions.includes("vault_provider_or_permission_authority_unavailable")) fail("unavailable authority must be blocked");

  await assertPathsExist(repoRoot, contract.source_snapshot.lawos.paths, "LawOS");
  assertPinnedGitSnapshot(
    repoRoot,
    contract.source_snapshot.lawos.commit,
    contract.source_snapshot.lawos.paths,
    "LawOS",
  );

  let vaultSourceVerified = false;
  if (vaultSourceRoot) {
    await assertPathsExist(vaultSourceRoot, contract.source_snapshot.vault.paths, "Vault");
    assertPinnedGitSnapshot(
      vaultSourceRoot,
      contract.source_snapshot.vault.commit,
      contract.source_snapshot.vault.paths,
      "Vault",
    );
    const currentVaultHead = gitHead(vaultSourceRoot, "Vault");
    if (currentVaultHead !== contract.source_snapshot.vault.commit) fail("Vault source snapshot commit drifted");
    vaultSourceVerified = true;
  }

  return Object.freeze({
    schema_version: "law-firm-os.amic-os-vault-identity-crosswalk-validation.v1",
    verdict: "PASS",
    database_migration_required: false,
    lawos_database_migration_count: 0,
    vault_database_migration_count: 0,
    mapping_keys: Object.freeze([...expectedMappingKeys]),
    runtime_data_binding_required: true,
    production_writes_default: "deny",
    production_ready_claim: false,
    lawos_source_verified: true,
    vault_source_verified: vaultSourceVerified,
    provider_runtime_readback_performed: false,
  });
}

function cliVaultSourceRoot(argv) {
  const index = argv.indexOf("--vault-source");
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail("--vault-source requires a path");
  return path.resolve(value);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  validateAmicOsVaultIdentityCrosswalk({ vaultSourceRoot: cliVaultSourceRoot(process.argv.slice(2)) })
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
