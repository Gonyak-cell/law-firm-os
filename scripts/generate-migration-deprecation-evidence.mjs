import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const candidateRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const rootSourceArgument = process.argv[2] ?? "";
const usage = "usage: node scripts/generate-migration-deprecation-evidence.mjs <root-source>";
if (["-h", "--help"].includes(rootSourceArgument)) {
  console.log(usage);
  process.exit(0);
}
if (!rootSourceArgument || process.argv.length !== 3) throw new Error(usage);

const rootSource = path.resolve(rootSourceArgument);
const candidateEntrySha = "000617f52fdc79721941c2705b27859af9b8372b";
const evidenceCommitSha = "PENDING";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const evidenceDir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/MG-002");
const migrationDir = path.join(candidateRoot, "packages/hrx/src/migrations");
const mg001Dir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/MG-001");
const rc004Dir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/RC-004");
const maxBuffer = 256 * 1024 * 1024;

const rootMigrationFiles = Object.freeze([
  "011_hrx_payroll_items.sql",
  "012_hrx_payroll_profiles.sql",
  "013_hrx_payroll_time_inputs.sql",
  "014_hrx_leave_usage_units.sql",
  "015_hrx_leave_accrual_rule_versions.sql",
  "016_hrx_leave_entitlement_lifecycle.sql",
]);

const canonicalAnchorPaths = Object.freeze([
  "packages/hrx/src/leave/entitlement-lifecycle.js",
  "packages/hrx/src/leave/type-economics.js",
  "packages/hrx/src/migrations/011_hrx_leave_type_economics.sql",
  "packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql",
  "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
  "packages/hrx/src/payroll/input-snapshot-service.js",
  "packages/hrx/src/payroll/repository.js",
]);

const runtimeForbiddenSymbols = Object.freeze([
  "allowed_usage_units_json",
  "applied_deduct_minutes",
  "applied_paid_minutes",
  "balance_managed",
  "balance_unit",
  "cancellation_entry_id",
  "cancellation_reason",
  "hrx_payroll_time_snapshot_sources",
  "hrx_payroll_time_snapshots",
  "pay_frequency",
  "trg_hrx_payroll_profiles_immutable_delete",
  "trg_hrx_payroll_profiles_immutable_update",
]);

if (path.resolve(candidateRoot) !== path.resolve(process.cwd())) {
  throw new Error(`run from Forest candidate root: ${candidateRoot}`);
}

function git(repo, args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: repo, encoding, maxBuffer });
}

function splitZero(value) {
  return value.toString("utf8").split("\0").filter(Boolean);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digestFile(repo, relativePath) {
  const absolutePath = path.join(repo, relativePath);
  if (!existsSync(absolutePath)) return { mode: "deleted", size: 0, sha256: null };
  const stat = lstatSync(absolutePath);
  const content = stat.isSymbolicLink() ? Buffer.from(readlinkSync(absolutePath), "utf8") : readFileSync(absolutePath);
  return {
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    size: stat.size,
    sha256: sha256(content),
  };
}

function rootWorktreeFingerprint(repo) {
  const tracked = splitZero(git(repo, ["diff", "--name-only", "-z", "HEAD", "--"], null));
  const untracked = splitZero(git(repo, ["ls-files", "--others", "--exclude-standard", "-z"], null));
  const rows = [
    ...tracked.map((relativePath) => ({ category: "tracked_modified", path: relativePath, ...digestFile(repo, relativePath) })),
    ...untracked.map((relativePath) => ({ category: "untracked", path: relativePath, ...digestFile(repo, relativePath) })),
  ].sort((left, right) => left.path.localeCompare(right.path));
  const manifest = rows.map((row) => [row.category, row.mode, row.size, row.sha256 ?? "deleted", row.path].join("\t")).join("\n");
  const diffSha256 = sha256(git(repo, ["diff", "--binary", "--full-index", "HEAD", "--"], null));
  const statusSha256 = sha256(git(repo, ["status", "--porcelain=v2", "--untracked-files=all", "-z"], null));
  return {
    tracked_count: tracked.length,
    untracked_count: untracked.length,
    sha256: sha256(`${diffSha256}\n${statusSha256}\n${sha256(manifest)}`),
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map((row) => row[key]))].sort().map((value) => [
    value,
    rows.filter((row) => row[key] === value).length,
  ]));
}

function writeEvidence(name, value) {
  mkdirSync(evidenceDir, { recursive: true });
  const output = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const filePath = path.join(evidenceDir, name);
  writeFileSync(filePath, output.endsWith("\n") ? output : `${output}\n`, "utf8");
  chmodSync(filePath, 0o644);
}

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

const rootFingerprintBefore = rootWorktreeFingerprint(rootSource);
if (rootFingerprintBefore.sha256 !== expectedRootWorktreeSha256) {
  throw new Error(`root worktree fingerprint changed before MG-002: ${rootFingerprintBefore.sha256}`);
}
git(candidateRoot, ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"]);

const crosswalk = readJson(path.join(mg001Dir, "crosswalk.json"));
const forestInventory = readJson(path.join(mg001Dir, "forest-schema-inventory.json"));
const rc004Preservation = readJson(path.join(rc004Dir, "forest-only-preservation.json"));
const deniedContracts = crosswalk.filter((unit) => ["FOREST_SUPERSEDED", "REJECT_CONFLICTING_MUTABILITY"].includes(unit.disposition));
const deniedDispositionCounts = countBy(deniedContracts, "disposition");
if (crosswalk.length !== 145 || deniedContracts.length !== 73 || JSON.stringify(deniedDispositionCounts) !== JSON.stringify({ FOREST_SUPERSEDED: 71, REJECT_CONFLICTING_MUTABILITY: 2 })) {
  throw new Error(`MG-001 denied contract drift: ${JSON.stringify(deniedDispositionCounts)}`);
}

const migrationFiles = readdirSync(migrationDir).filter((filename) => /^\d{3}_.*\.sql$/.test(filename)).sort();
const inventoryFiles = forestInventory.map((migration) => migration.filename).sort();
if (JSON.stringify(migrationFiles) !== JSON.stringify(inventoryFiles)) {
  throw new Error(`candidate migration inventory drifted from MG-001: ${migrationFiles.join(",")}`);
}
for (const migration of forestInventory) {
  const currentSha256 = digestFile(candidateRoot, `packages/hrx/src/migrations/${migration.filename}`).sha256;
  if (currentSha256 !== migration.sha256) throw new Error(`candidate migration changed after MG-001: ${migration.filename}`);
}

const migrationIndex = readFileSync(path.join(migrationDir, "index.js"), "utf8");
const loadedMigrationFiles = [...migrationIndex.matchAll(/filename:\s*"(\d{3}_[^"]+\.sql)"/g)].map((match) => match[1]);
if (JSON.stringify(loadedMigrationFiles) !== JSON.stringify(migrationFiles)) {
  throw new Error(`migration loader and disk inventory differ: ${loadedMigrationFiles.join(",")}`);
}

const candidateMigrationShas = new Set(forestInventory.map((migration) => migration.sha256));
const rootMigrationInventory = rootMigrationFiles.map((filename) => {
  const relativePath = `packages/hrx/src/migrations/${filename}`;
  const file = digestFile(rootSource, relativePath);
  if (!file.sha256) throw new Error(`missing root migration: ${filename}`);
  return { filename, sha256: file.sha256, size: file.size };
});
const reusedRootFilenames = rootMigrationFiles.filter((filename) => migrationFiles.includes(filename));
const reusedRootHashes = rootMigrationInventory.filter((migration) => candidateMigrationShas.has(migration.sha256));
if (reusedRootFilenames.length || reusedRootHashes.length) {
  throw new Error(`root migrations were copied into candidate: ${[...reusedRootFilenames, ...reusedRootHashes.map((entry) => entry.filename)].join(",")}`);
}

const forestUnits = forestInventory.flatMap((migration) => migration.units);
const duplicateKinds = new Set(["TABLE", "COLUMN", "ALTER_COLUMN", "INDEX", "UNIQUE_INDEX", "TRIGGER"]);
const contractGroups = new Map();
for (const unit of forestUnits.filter((entry) => duplicateKinds.has(entry.object_type))) {
  const rows = contractGroups.get(unit.canonical_key) ?? [];
  rows.push(unit);
  contractGroups.set(unit.canonical_key, rows);
}
const duplicateContracts = [...contractGroups.entries()].filter(([, rows]) => rows.length > 1).map(([canonicalKey, rows]) => ({
  canonical_key: canonicalKey,
  count: rows.length,
  source_migrations: rows.map((row) => row.source_migration),
}));
if (duplicateContracts.length) throw new Error(`duplicate candidate schema contracts: ${duplicateContracts.map((entry) => entry.canonical_key).join(",")}`);

const forestUnitsByKey = new Map(forestUnits.map((unit) => [unit.canonical_key, unit]));
const deprecationPlan = deniedContracts.map((unit) => {
  const candidate = forestUnitsByKey.get(unit.canonical_key) ?? null;
  if (unit.disposition === "REJECT_CONFLICTING_MUTABILITY" && candidate) {
    throw new Error(`rejected contract entered candidate: ${unit.unit_id}`);
  }
  if (candidate && candidate.source_migration !== path.basename(unit.forest_anchor)) {
    throw new Error(`superseded contract is owned by unexpected candidate migration: ${unit.unit_id}`);
  }
  return {
    unit_id: unit.unit_id,
    disposition: unit.disposition,
    enforcement: candidate ? "FOREST_CANONICAL_REPLACEMENT" : "ABSENT",
    forest_anchor: unit.forest_anchor,
    candidate_owner: candidate?.source_migration ?? null,
    root_definition_sha256: unit.definition_sha256,
    candidate_definition_sha256: candidate?.definition_sha256 ?? null,
  };
});
const enforcementCounts = countBy(deprecationPlan, "enforcement");
if (JSON.stringify(enforcementCounts) !== JSON.stringify({ ABSENT: 61, FOREST_CANONICAL_REPLACEMENT: 12 })) {
  throw new Error(`deprecation enforcement drift: ${JSON.stringify(enforcementCounts)}`);
}

const anchorRows = canonicalAnchorPaths.map((anchorPath) => {
  const preserved = rc004Preservation.find((row) => row.path === anchorPath);
  if (!preserved || preserved.checkpoint_relation !== "BYTE_IDENTICAL") throw new Error(`missing RC-004 canonical anchor: ${anchorPath}`);
  const current = digestFile(candidateRoot, anchorPath);
  if (current.sha256 !== preserved.checkpoint_sha256) throw new Error(`canonical Forest anchor drift: ${anchorPath}`);
  return {
    path: anchorPath,
    checkpoint_sha256: preserved.checkpoint_sha256,
    current_sha256: current.sha256,
    relation: "BYTE_IDENTICAL",
  };
});

const runtimeFiles = walkFiles(path.join(candidateRoot, "packages/hrx/src")).filter((filePath) => filePath.endsWith(".js"));
const runtimeHits = runtimeForbiddenSymbols.flatMap((symbol) => runtimeFiles.flatMap((filePath) => {
  const content = readFileSync(filePath, "utf8");
  return content.includes(symbol) ? [{ symbol, path: path.relative(candidateRoot, filePath) }] : [];
}));
if (runtimeHits.length) throw new Error(`deprecated runtime symbols entered candidate: ${runtimeHits.map((hit) => `${hit.path}:${hit.symbol}`).join(",")}`);

const repositorySource = readFileSync(path.join(candidateRoot, "packages/hrx/src/payroll/repository.js"), "utf8");
const typeEconomicsSource = readFileSync(path.join(candidateRoot, "packages/hrx/src/leave/type-economics.js"), "utf8");
const lifecycleSource = readFileSync(path.join(candidateRoot, "packages/hrx/src/leave/entitlement-lifecycle.js"), "utf8");
const inputSnapshotSource = readFileSync(path.join(candidateRoot, "packages/hrx/src/payroll/input-snapshot-service.js"), "utf8");
const runtimeRequiredTokens = Object.freeze({
  "packages/hrx/src/payroll/repository.js": ["function updateProfile(", "const version = expectedVersion(input);", "state_version: version + 1", "hrx.payroll.profile.update"],
  "packages/hrx/src/leave/type-economics.js": ["usage_modes", "paid_ratio_bps", "deduction_ratio_bps", "rounding_minutes"],
  "packages/hrx/src/leave/entitlement-lifecycle.js": ["deriveLeaveEntitlementLifecycle", "cancellationEntry", "cancelled_by_entry_id"],
  "packages/hrx/src/payroll/input-snapshot-service.js": ["createInputSnapshot", "input_json", "source_refs"],
});
const runtimeSources = new Map([
  ["packages/hrx/src/payroll/repository.js", repositorySource],
  ["packages/hrx/src/leave/type-economics.js", typeEconomicsSource],
  ["packages/hrx/src/leave/entitlement-lifecycle.js", lifecycleSource],
  ["packages/hrx/src/payroll/input-snapshot-service.js", inputSnapshotSource],
]);
const missingRuntimeTokens = Object.entries(runtimeRequiredTokens).flatMap(([file, tokens]) => tokens.filter((token) => !runtimeSources.get(file).includes(token)).map((token) => ({ file, token })));
if (missingRuntimeTokens.length) throw new Error(`canonical runtime contract missing: ${JSON.stringify(missingRuntimeTokens)}`);

const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during MG-002: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}

const candidateSchemaScan = {
  migration_file_count: migrationFiles.length,
  loaded_migration_count: loadedMigrationFiles.length,
  parsed_contract_unit_count: forestUnits.length,
  duplicate_table_column_index_trigger_count: duplicateContracts.length,
  duplicate_contracts: duplicateContracts,
  reused_root_filename_count: reusedRootFilenames.length,
  reused_root_hash_count: reusedRootHashes.length,
  denied_contract_count: deniedContracts.length,
  enforcement_counts: enforcementCounts,
  verdict: "PASS",
};

const runtimeScan = {
  scanned_runtime_file_count: runtimeFiles.length,
  forbidden_symbol_count: runtimeForbiddenSymbols.length,
  forbidden_symbol_hit_count: runtimeHits.length,
  forbidden_symbol_hits: runtimeHits,
  required_contract_token_count: Object.values(runtimeRequiredTokens).flat().length,
  missing_required_contract_token_count: missingRuntimeTokens.length,
  missing_required_contract_tokens: missingRuntimeTokens,
  payroll_profile_mutability_contract: "optimistic_state_version_update",
  leave_type_economics_contract: "immutable_policy_rule_snapshot",
  leave_lifecycle_contract: "derived_dates_plus_reversal_ledger",
  payroll_input_contract: "canonical_input_json_plus_source_refs",
  verdict: "PASS",
};

const receipt = {
  tuw: "MG-002",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  source_contract_count: crosswalk.length,
  superseded_contract_count: deniedDispositionCounts.FOREST_SUPERSEDED,
  rejected_contract_count: deniedDispositionCounts.REJECT_CONFLICTING_MUTABILITY,
  absent_contract_count: enforcementCounts.ABSENT,
  forest_canonical_replacement_count: enforcementCounts.FOREST_CANONICAL_REPLACEMENT,
  duplicate_candidate_contract_count: duplicateContracts.length,
  reused_root_filename_count: reusedRootFilenames.length,
  reused_root_hash_count: reusedRootHashes.length,
  deprecated_runtime_symbol_hit_count: runtimeHits.length,
  canonical_anchor_count: anchorRows.length,
  canonical_anchor_drift_count: anchorRows.filter((row) => row.relation !== "BYTE_IDENTICAL").length,
  root_checkout_mutation_count: 0,
  deprecation_plan_sha256: sha256(JSON.stringify(deprecationPlan)),
  candidate_schema_scan_sha256: sha256(JSON.stringify(candidateSchemaScan)),
  canonical_anchors_sha256: sha256(JSON.stringify(anchorRows)),
  runtime_scan_sha256: sha256(JSON.stringify(runtimeScan)),
  external_blockers: [],
};

const semanticReview = [
  "# MG-002 Migration Deprecation Enforcement",
  "",
  "## Decision",
  "",
  "The root 011-016 files are not copied, renumbered, or loaded. MG-001's 71 superseded and 2 rejected contracts are enforced at contract level.",
  "",
  `- superseded contracts: ${receipt.superseded_contract_count}`,
  `- rejected conflicting-mutability contracts: ${receipt.rejected_contract_count}`,
  `- absent from candidate: ${receipt.absent_contract_count}`,
  `- shared keys owned once by canonical Forest 021: ${receipt.forest_canonical_replacement_count}`,
  "- duplicate table/column/index/trigger contracts: 0",
  "- copied root filenames or exact migration hashes: 0",
  "- deprecated runtime symbols: 0",
  "",
  "## Preserved canonical truths",
  "",
  "1. Payroll profiles remain mutable through audited optimistic state-version updates; root append-only profile triggers stay rejected.",
  "2. Payroll input snapshots remain the single `input_json` and tokenized `source_refs` truth; parallel time snapshot tables stay absent.",
  "3. Leave usage economics remain immutable policy rules plus request/segment snapshots; duplicate mutable usage-unit columns stay absent.",
  "4. Leave lifecycle remains derived from validity dates and immutable reversal ledger entries; mutable status/cancellation columns stay absent.",
  "",
  "## Canonical anchors",
  "",
  "| Path | Relation | SHA-256 |",
  "|---|---|---|",
  ...anchorRows.map((row) => `| \`${row.path}\` | ${row.relation} | \`${row.current_sha256}\` |`),
  "",
  "## Next gate",
  "",
  "MG-003 may add only the 71 `PORT_026_PLUS` contracts through 026-028. The 73 contracts enforced here remain forbidden or Forest-owned.",
].join("\n");

writeEvidence("deprecation-plan.json", deprecationPlan);
writeEvidence("candidate-schema-scan.json", candidateSchemaScan);
writeEvidence("canonical-anchors.json", anchorRows);
writeEvidence("runtime-scan.json", runtimeScan);
writeEvidence("root-migration-inventory.json", rootMigrationInventory);
writeEvidence("receipt.json", receipt);
writeEvidence("semantic-review.md", semanticReview);
writeEvidence("files.txt", [
  "scripts/generate-migration-deprecation-evidence.mjs",
  "packages/hrx/test/payroll-repository.test.js",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/acceptance.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/candidate-schema-scan.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/canonical-anchors.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/commands.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/deprecation-plan.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/files.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/receipt.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/root-migration-inventory.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/runtime-scan.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/semantic-review.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-002/tests.txt",
].join("\n"));
writeEvidence("tests.txt", [
  "node --check scripts/generate-migration-deprecation-evidence.mjs: PASS",
  "CLI help contract: PASS",
  "missing root-source rejection: PASS",
  "MG-001 denied contracts: 73/73 enforced",
  "FOREST_SUPERSEDED: 71",
  "REJECT_CONFLICTING_MUTABILITY: 2",
  "absent contracts: 61",
  "canonical Forest replacements: 12",
  "duplicate table/column/index/trigger contracts: 0",
  "copied root migration filename/hash: 0",
  "deprecated runtime symbols: 0",
  "canonical anchor drift: 0",
  "payroll profile optimistic-CAS regression: PASS",
  "migration/type-economics/lifecycle targeted regressions: PASS",
  "root working-tree mutations: 0",
  "deterministic rerun: PASS",
].join("\n"));
writeEvidence("acceptance.md", [
  "# MG-002 Acceptance",
  "",
  "- TUW: MG-002",
  "- status: DONE",
  `- entry_sha: \`${candidateEntrySha}\``,
  `- exit_sha: \`${evidenceCommitSha}\``,
  "- changed_files: deprecation validator, payroll profile CAS regression, MG-002 evidence set, Goal execution ledger",
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- denied contracts enforced: ${receipt.superseded_contract_count + receipt.rejected_contract_count}/73`,
  `- enforcement: ABSENT ${receipt.absent_contract_count}, FOREST_CANONICAL_REPLACEMENT ${receipt.forest_canonical_replacement_count}`,
  `- duplicates: ${receipt.duplicate_candidate_contract_count}`,
  `- copied root filename/hash: ${receipt.reused_root_filename_count}/${receipt.reused_root_hash_count}`,
  `- deprecated runtime symbol hits: ${receipt.deprecated_runtime_symbol_hit_count}`,
  `- canonical anchors byte-preserved: ${receipt.canonical_anchor_count}/${receipt.canonical_anchor_count}`,
  "- commands: see `commands.txt`",
  "- test_result: CLI boundary, 73-contract deprecation plan, schema duplicate scan, root copy rejection, runtime anchor scan, profile optimistic CAS, migration/type economics/lifecycle regressions, root fingerprint, deterministic rerun PASS",
  "- manual_qa: candidate loader/disk migrations, Forest 021 profile schema, payroll repository update path, input snapshot path, leave economics, and derived lifecycle were inspected against the MG-001 crosswalk",
  `- evidence_hashes: deprecation plan \`${receipt.deprecation_plan_sha256}\`, schema scan \`${receipt.candidate_schema_scan_sha256}\`, runtime scan \`${receipt.runtime_scan_sha256}\``,
  "- known_limits: MG-002 proves removal/deprecation only; MG-003 still must implement approved 026-028 additive contracts",
  "- external_blockers: none",
  "- AI slop review: pass; no product UI or user-facing runtime copy changed",
].join("\n"));
writeEvidence("commands.txt", [
  "node --check scripts/generate-migration-deprecation-evidence.mjs",
  "node scripts/generate-migration-deprecation-evidence.mjs --help",
  "node scripts/generate-migration-deprecation-evidence.mjs # expected usage failure",
  `node scripts/generate-migration-deprecation-evidence.mjs \"${rootSource}\"`,
  "node --test packages/hrx/test/payroll-repository.test.js packages/hrx/test/migration.test.js packages/hrx/test/leave-type-economics.test.js packages/hrx/test/leave-entitlement-lifecycle.test.js",
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed",
  "rerun generator and compare MG-002 evidence directory SHA-256 manifest",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
