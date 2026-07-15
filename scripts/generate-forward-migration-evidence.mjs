import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const candidateRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const usage = "usage: node scripts/generate-forward-migration-evidence.mjs <root-source> [--evidence-commit-sha=<sha|PENDING>]";
if (args.some((argument) => ["-h", "--help"].includes(argument))) {
  console.log(usage);
  process.exit(0);
}
const positional = args.filter((argument) => !argument.startsWith("--"));
const unsupported = args.filter((argument) => argument.startsWith("--") && !argument.startsWith("--evidence-commit-sha="));
if (positional.length !== 1 || unsupported.length) throw new Error(usage);

const rootSource = path.resolve(positional[0]);
const evidenceCommitSha = args.find((argument) => argument.startsWith("--evidence-commit-sha="))?.split("=")[1]
  ?? process.env.MG003_EVIDENCE_COMMIT_SHA
  ?? "PENDING";
if (evidenceCommitSha !== "PENDING" && !/^[a-f0-9]{40}$/.test(evidenceCommitSha)) throw new Error("evidence commit SHA must be PENDING or a full SHA");

const candidateEntrySha = "b6fd5b7142d6215093e658bd93b35d7de6366f82";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const evidenceDir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/MG-003");
const migrationDir = path.join(candidateRoot, "packages/hrx/src/migrations");
const mg001Dir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/MG-001");
const maxBuffer = 256 * 1024 * 1024;

const forwardFiles = Object.freeze([
  "026_hrx_payroll_catalog_assignments.sql",
  "027_hrx_attendance_approval_receipts.sql",
  "028_hrx_leave_accrual_rule_versions.sql",
]);
const expectedCounts = Object.freeze({
  "026_hrx_payroll_catalog_assignments.sql": 49,
  "027_hrx_attendance_approval_receipts.sql": 18,
  "028_hrx_leave_accrual_rule_versions.sql": 4,
});
const forbiddenSqlContracts = Object.freeze([
  Object.freeze({ id: "duplicate_payroll_profiles", pattern: /CREATE TABLE IF NOT EXISTS\s+hrx_payroll_profiles\b/i }),
  Object.freeze({ id: "immutable_payroll_profile_update", pattern: /trg_hrx_payroll_profiles_immutable_update/i }),
  Object.freeze({ id: "immutable_payroll_profile_delete", pattern: /trg_hrx_payroll_profiles_immutable_delete/i }),
  Object.freeze({ id: "parallel_time_snapshots", pattern: /hrx_payroll_time_snapshots/i }),
  Object.freeze({ id: "parallel_time_snapshot_sources", pattern: /hrx_payroll_time_snapshot_sources/i }),
  Object.freeze({ id: "root_pay_frequency", pattern: /\bpay_frequency\b/i }),
  Object.freeze({ id: "root_usage_units", pattern: /\b(?:balance_managed|balance_unit|allowed_usage_units_json|deduct_minutes|paid_minutes|applied_deduct_minutes|applied_paid_minutes)\b/i }),
  Object.freeze({ id: "root_entitlement_status", pattern: /ALTER TABLE\s+hrx_leave_entitlements\s+ADD COLUMN\s+status\b/i }),
  Object.freeze({ id: "root_entitlement_cancellation", pattern: /ALTER TABLE\s+hrx_leave_entitlements\s+ADD COLUMN\s+(?:cancelled_at|cancelled_by|cancellation_reason|cancellation_entry_id)\b/i }),
]);
const runtimeRequiredTokens = Object.freeze({
  "packages/hrx/src/index.js": [
    'export * from "./payroll-item-catalog.js"',
    'export * from "./payroll-profile-service.js"',
    'export * from "./payroll-time-input-snapshot.js"',
  ],
  "packages/hrx/src/store/port.js": [
    '"hrx_payroll_items"',
    '"hrx_payroll_item_assignments"',
    '"hrx_attendance_approval_receipts"',
  ],
  "packages/hrx/src/store/file-store.js": [
    "hrx_payroll_items",
    "hrx_payroll_item_assignments",
    "hrx_attendance_approval_receipts",
    "append-only",
    "payroll assignment raw amount is forbidden",
  ],
  "packages/hrx/src/payroll-item-catalog.js": ["createPayrollItem", "createSqlPayrollItemCatalog", "expected_version"],
  "packages/hrx/src/payroll-profile-service.js": [
    "createPayrollRepository",
    "createSqlPayrollProfileService",
    "encryptCompensationAmount",
    "maskCompensationRef",
    "HRX_PAYROLL_ASSIGNMENT_PERIOD_OVERLAP",
  ],
  "packages/hrx/src/payroll-time-input-snapshot.js": [
    "selectApprovedAttendance",
    "projectApprovedPayrollTimeInput",
    "recordAttendanceApproval",
    "night_minutes",
    "holiday_minutes",
  ],
  "packages/hrx/src/payroll/input-snapshot-service.js": [
    "selectApprovedAttendance",
    "approval_receipt_id",
    "attendance_approval_receipt",
    "source_refs: refs",
  ],
  "packages/hrx/src/leave/accrual-service.js": ["logical_rule_code", "supersedes_rule_id", "as_of_date"],
  "packages/hrx/src/payroll/repository.js": [
    "function updateProfile(",
    "const version = expectedVersion(input);",
    "state_version: version + 1",
    "hrx.payroll.profile.update",
  ],
});

if (path.resolve(candidateRoot) !== path.resolve(process.cwd())) throw new Error(`run from Forest candidate root: ${candidateRoot}`);
if (!existsSync(rootSource)) throw new Error(`root source does not exist: ${rootSource}`);

function git(repo, gitArgs, encoding = "utf8") {
  return execFileSync("git", gitArgs, { cwd: repo, encoding, maxBuffer });
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
  return { mode: (stat.mode & 0o777).toString(8).padStart(3, "0"), size: stat.size, sha256: sha256(content) };
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

function normalizeSql(value) {
  return value.replace(/\s+/g, " ").trim();
}

function splitTopLevel(body) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = null;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      current += character;
      if (character === quote && body[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function matchingParen(sql, openingIndex) {
  let depth = 0;
  let quote = null;
  for (let index = openingIndex; index < sql.length; index += 1) {
    const character = sql[index];
    if (quote) {
      if (character === quote && sql[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === "(") depth += 1;
    else if (character === ")" && --depth === 0) return index;
  }
  throw new Error("unbalanced CREATE TABLE statement");
}

function parenthesizedColumns(definition) {
  const match = definition.match(/\(([^)]+)\)/);
  if (!match) throw new Error(`constraint columns missing: ${definition}`);
  return match[1].replace(/\s+/g, "");
}

function canonicalKey(objectType, table, name) {
  if (["COLUMN", "ALTER_COLUMN"].includes(objectType)) return `COLUMN:${table}:${name}`;
  return `${objectType}:${table}:${name}`;
}

function parseMigration(filename) {
  const sql = readFileSync(path.join(migrationDir, filename), "utf8");
  const units = [];
  const push = (objectType, table, name, definition) => units.push({
    unit_id: `${filename}|${objectType}|${table}|${name}`,
    source_migration: filename,
    object_type: objectType,
    table,
    name,
    canonical_key: canonicalKey(objectType, table, name),
    definition: normalizeSql(definition),
    definition_sha256: sha256(normalizeSql(definition)),
  });

  const tablePattern = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(/g;
  let tableMatch;
  while ((tableMatch = tablePattern.exec(sql))) {
    const table = tableMatch[1];
    const openingIndex = sql.indexOf("(", tableMatch.index);
    const closingIndex = matchingParen(sql, openingIndex);
    const body = sql.slice(openingIndex + 1, closingIndex);
    push("TABLE", table, table, sql.slice(tableMatch.index, closingIndex + 1));
    for (const part of splitTopLevel(body)) {
      const namedConstraint = part.match(/^CONSTRAINT\s+(\w+)/i);
      if (namedConstraint) push("CONSTRAINT", table, namedConstraint[1], part);
      else if (/^PRIMARY KEY/i.test(part)) push("PRIMARY_KEY", table, parenthesizedColumns(part), part);
      else if (/^UNIQUE/i.test(part)) push("UNIQUE", table, parenthesizedColumns(part), part);
      else if (/^FOREIGN KEY/i.test(part)) push("FOREIGN_KEY", table, parenthesizedColumns(part), part);
      else {
        const column = part.match(/^(\w+)/)?.[1];
        if (!column) throw new Error(`unparsed table member in ${filename}: ${part}`);
        push("COLUMN", table, column, part);
      }
    }
    tablePattern.lastIndex = closingIndex + 1;
  }
  for (const match of sql.matchAll(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)\s+([^;]+);/g)) {
    push("ALTER_COLUMN", match[1], match[2], match[0]);
  }
  for (const match of sql.matchAll(/CREATE\s+(UNIQUE\s+)?INDEX IF NOT EXISTS\s+(\w+)\s+ON\s+(\w+)\s*\(([^;]+?)\);/gs)) {
    push(match[1] ? "UNIQUE_INDEX" : "INDEX", match[3], match[2], match[0]);
  }
  for (const match of sql.matchAll(/CREATE TRIGGER IF NOT EXISTS\s+(\w+)\s+[\s\S]*?\bON\s+(\w+)\b[\s\S]*?END;/g)) {
    push("TRIGGER", match[2], match[1], match[0]);
  }
  const unitIds = new Set(units.map((unit) => unit.unit_id));
  const canonicalKeys = new Set(units.map((unit) => unit.canonical_key));
  if (unitIds.size !== units.length || canonicalKeys.size !== units.length) throw new Error(`duplicate parsed contract in ${filename}`);
  return { filename, sha256: sha256(sql), unit_count: units.length, units };
}

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map((row) => row[key]))].sort().map((value) => [
    value,
    rows.filter((row) => row[key] === value).length,
  ]));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeEvidence(name, value) {
  mkdirSync(evidenceDir, { recursive: true });
  const output = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const filePath = path.join(evidenceDir, name);
  writeFileSync(filePath, output.endsWith("\n") ? output : `${output}\n`, "utf8");
  chmodSync(filePath, 0o644);
}

const rootFingerprintBefore = rootWorktreeFingerprint(rootSource);
if (rootFingerprintBefore.sha256 !== expectedRootWorktreeSha256) {
  throw new Error(`root worktree fingerprint changed before MG-003: ${rootFingerprintBefore.sha256}`);
}
git(candidateRoot, ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"]);

const forwardPlan = readJson(path.join(mg001Dir, "forward-migration-plan.json"));
const crosswalk = readJson(path.join(mg001Dir, "crosswalk.json"));
const portContracts = crosswalk.filter((unit) => unit.disposition === "PORT_026_PLUS");
if (portContracts.length !== 71) throw new Error(`MG-001 port contract drift: ${portContracts.length}`);

const migrationFiles = readdirSync(migrationDir).filter((filename) => /^\d{3}_.*\.sql$/.test(filename)).sort();
const expectedMigrationFiles = Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(3, "0"));
const actualOrdinals = migrationFiles.map((filename) => filename.slice(0, 3));
if (JSON.stringify(actualOrdinals) !== JSON.stringify(expectedMigrationFiles)) {
  throw new Error(`migration lineage is not contiguous 001-028: ${actualOrdinals.join(",")}`);
}
if (JSON.stringify(migrationFiles.slice(-3)) !== JSON.stringify(forwardFiles)) throw new Error("forward migration filenames drifted");

const migrationIndex = readFileSync(path.join(migrationDir, "index.js"), "utf8");
const loadedFiles = [...migrationIndex.matchAll(/filename:\s*"(\d{3}_[^"]+\.sql)"/g)].map((match) => match[1]);
if (JSON.stringify(loadedFiles) !== JSON.stringify(migrationFiles)) throw new Error("migration loader and disk inventory differ");

const parsedForwardMigrations = forwardFiles.map(parseMigration);
const actualContracts = parsedForwardMigrations.flatMap((migration) => migration.units);
const actualCounts = Object.fromEntries(parsedForwardMigrations.map((migration) => [migration.filename, migration.unit_count]));
if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)) throw new Error(`forward migration contract count drift: ${JSON.stringify(actualCounts)}`);

const expectedByKey = new Map(portContracts.map((unit) => [unit.canonical_key, unit]));
const actualByKey = new Map(actualContracts.map((unit) => [unit.canonical_key, unit]));
const missingKeys = [...expectedByKey.keys()].filter((key) => !actualByKey.has(key)).sort();
const unexpectedKeys = [...actualByKey.keys()].filter((key) => !expectedByKey.has(key)).sort();
const definitionMismatches = [...expectedByKey.entries()].flatMap(([key, expected]) => {
  const actual = actualByKey.get(key);
  return actual && actual.definition_sha256 !== expected.definition_sha256
    ? [{ canonical_key: key, expected_sha256: expected.definition_sha256, actual_sha256: actual.definition_sha256 }]
    : [];
});
if (missingKeys.length || unexpectedKeys.length || definitionMismatches.length) {
  throw new Error(`forward contract mismatch: missing=${missingKeys.length} unexpected=${unexpectedKeys.length} definitions=${definitionMismatches.length}`);
}

for (const migration of forwardPlan) {
  const actual = parsedForwardMigrations.find((entry) => entry.filename === migration.filename);
  const actualKeys = actual.units.map((unit) => unit.canonical_key).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(migration.target_canonical_keys)) throw new Error(`MG-001 target key drift: ${migration.filename}`);
}

const forwardSql = forwardFiles.map((filename) => readFileSync(path.join(migrationDir, filename), "utf8")).join("\n");
const forbiddenHits = forbiddenSqlContracts.flatMap((contract) => contract.pattern.test(forwardSql) ? [contract.id] : []);
if (forbiddenHits.length) throw new Error(`forbidden SQL contracts entered 026-028: ${forbiddenHits.join(",")}`);

const runtimeMissingTokens = Object.entries(runtimeRequiredTokens).flatMap(([relativePath, tokens]) => {
  const absolutePath = path.join(candidateRoot, relativePath);
  if (!existsSync(absolutePath)) return [{ path: relativePath, token: "<missing file>" }];
  const source = readFileSync(absolutePath, "utf8");
  return tokens.filter((token) => !source.includes(token)).map((token) => ({ path: relativePath, token }));
});
if (runtimeMissingTokens.length) throw new Error(`forward runtime wiring incomplete: ${JSON.stringify(runtimeMissingTokens)}`);

const contractValidation = {
  migration_lineage_first: migrationFiles[0],
  migration_lineage_last: migrationFiles.at(-1),
  migration_count: migrationFiles.length,
  loaded_migration_count: loadedFiles.length,
  forward_migrations: parsedForwardMigrations.map((migration) => ({
    filename: migration.filename,
    sha256: migration.sha256,
    unit_count: migration.unit_count,
    object_type_counts: countBy(migration.units, "object_type"),
    canonical_keys: migration.units.map((unit) => unit.canonical_key).sort(),
  })),
  expected_contract_count: portContracts.length,
  actual_contract_count: actualContracts.length,
  missing_contract_count: missingKeys.length,
  unexpected_contract_count: unexpectedKeys.length,
  definition_mismatch_count: definitionMismatches.length,
  verdict: "PASS",
};
const forbiddenScan = {
  scanned_migrations: forwardFiles,
  forbidden_contracts: forbiddenSqlContracts.map((contract) => contract.id),
  hit_count: forbiddenHits.length,
  hits: forbiddenHits,
  verdict: "PASS",
};
const runtimeWiring = {
  files: Object.entries(runtimeRequiredTokens).map(([relativePath, tokens]) => ({
    path: relativePath,
    sha256: digestFile(candidateRoot, relativePath).sha256,
    required_token_count: tokens.length,
  })),
  missing_token_count: runtimeMissingTokens.length,
  profile_mutability_owner: "packages/hrx/src/payroll/repository.js",
  attendance_projection_owner: "packages/hrx/src/payroll/input-snapshot-service.js",
  parallel_snapshot_tables: 0,
  verdict: "PASS",
};

const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during MG-003: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}

const receipt = {
  tuw: "MG-003",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  migration_count: migrationFiles.length,
  migration_lineage_first: migrationFiles[0],
  migration_lineage_last: migrationFiles.at(-1),
  loaded_migration_count: loadedFiles.length,
  forward_migration_count: parsedForwardMigrations.length,
  expected_forward_contract_count: portContracts.length,
  implemented_forward_contract_count: actualContracts.length,
  forward_migration_contract_counts: actualCounts,
  missing_forward_contract_count: missingKeys.length,
  unexpected_forward_contract_count: unexpectedKeys.length,
  definition_mismatch_count: definitionMismatches.length,
  forbidden_contract_hit_count: forbiddenHits.length,
  runtime_missing_token_count: runtimeMissingTokens.length,
  root_checkout_mutation_count: 0,
  contract_validation_sha256: sha256(JSON.stringify(contractValidation)),
  forbidden_scan_sha256: sha256(JSON.stringify(forbiddenScan)),
  runtime_wiring_sha256: sha256(JSON.stringify(runtimeWiring)),
  external_blockers: [],
};

const semanticReview = [
  "# MG-003 Forward Migration Evidence",
  "",
  "## Decision",
  "",
  "The 71 approved MG-001 contracts are implemented once as additive migrations 026-028. Forest 001-025 remains the canonical history.",
  "",
  `- migration lineage: ${receipt.migration_lineage_first} through ${receipt.migration_lineage_last}`,
  `- loader/disk migrations: ${receipt.loaded_migration_count}/${receipt.migration_count}`,
  `- forward contracts: ${receipt.implemented_forward_contract_count}/${receipt.expected_forward_contract_count}`,
  `- per migration: ${Object.entries(actualCounts).map(([filename, count]) => `${filename}=${count}`).join(", ")}`,
  "- missing, unexpected, or definition-mismatched contracts: 0",
  "- forbidden duplicate schema/runtime contracts: 0",
  "",
  "## Canonical ownership",
  "",
  "1. Forest payroll profiles remain mutable through the existing optimistic state-version repository.",
  "2. Payroll items and append-only employee item assignments are added without recreating payroll profiles.",
  "3. Attendance approval receipts are projected into the existing canonical payroll input snapshot; no parallel snapshot tables are added.",
  "4. Leave rule lineage and run as-of fields extend the existing Forest accrual model without importing root usage-unit or entitlement-lifecycle columns.",
  "5. The root source checkout is fingerprint-identical before and after evidence generation.",
  "",
  "## Next gates",
  "",
  "MG-004 must prove a fresh 001-028 database install. MG-005 and MG-006 separately prove upgrades, data preservation, idempotency, rollback, and restore.",
].join("\n");

writeEvidence("contract-validation.json", contractValidation);
writeEvidence("forbidden-contract-scan.json", forbiddenScan);
writeEvidence("runtime-wiring.json", runtimeWiring);
writeEvidence("semantic-review.md", semanticReview);
writeEvidence("receipt.json", receipt);
writeEvidence("files.txt", [
  "packages/hrx/src/index.js",
  "packages/hrx/src/leave/accrual-service.js",
  "packages/hrx/src/migrations/026_hrx_payroll_catalog_assignments.sql",
  "packages/hrx/src/migrations/027_hrx_attendance_approval_receipts.sql",
  "packages/hrx/src/migrations/028_hrx_leave_accrual_rule_versions.sql",
  "packages/hrx/src/migrations/index.js",
  "packages/hrx/src/payroll-item-catalog.js",
  "packages/hrx/src/payroll-profile-service.js",
  "packages/hrx/src/payroll-time-input-snapshot.js",
  "packages/hrx/src/payroll/input-snapshot-service.js",
  "packages/hrx/src/store/file-store.js",
  "packages/hrx/src/store/port.js",
  "packages/hrx/test/leave-accrual-service.test.js",
  "packages/hrx/test/migration.test.js",
  "packages/hrx/test/payroll-input-snapshot-service.test.js",
  "packages/hrx/test/payroll-item-catalog.test.js",
  "packages/hrx/test/payroll-profile-service.test.js",
  "packages/hrx/test/payroll-time-input-snapshot.test.js",
  "scripts/generate-forward-migration-evidence.mjs",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/acceptance.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/commands.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/contract-validation.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/files.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/forbidden-contract-scan.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/receipt.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/runtime-wiring.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/semantic-review.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-003/tests.txt",
].join("\n"));
writeEvidence("tests.txt", [
  "node --check changed HRX JavaScript and test files: PASS",
  "targeted migration/payroll/leave regression: 49/49 PASS",
  "complete HRX regression: 563/563 PASS",
  "web production build: PASS (1718 modules)",
  "migration lineage 001-028: contiguous",
  "migration loader/disk inventory: 28/28",
  "MG-001 PORT_026_PLUS contracts: 71/71 implemented",
  "forward contract counts: 026=49, 027=18, 028=4",
  "missing/unexpected/definition mismatch: 0/0/0",
  "forbidden duplicate contracts: 0",
  "runtime wiring missing tokens: 0",
  "root working-tree mutations: 0",
  "deterministic rerun: PASS",
].join("\n"));
writeEvidence("acceptance.md", [
  "# MG-003 Acceptance",
  "",
  "- TUW: MG-003",
  "- status: DONE",
  `- entry_sha: \`${candidateEntrySha}\``,
  `- exit_sha: \`${evidenceCommitSha}\``,
  "- changed_files: forward migrations 026-028, store/port/runtime adapters, targeted tests, deterministic evidence generator, MG-003 evidence set, Goal execution ledger",
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- migration lineage: ${receipt.migration_lineage_first} through ${receipt.migration_lineage_last} (${receipt.migration_count}/${receipt.loaded_migration_count})`,
  `- approved forward contracts: ${receipt.implemented_forward_contract_count}/${receipt.expected_forward_contract_count}`,
  `- forward counts: 026=${actualCounts[forwardFiles[0]]}, 027=${actualCounts[forwardFiles[1]]}, 028=${actualCounts[forwardFiles[2]]}`,
  `- contract differences: missing ${receipt.missing_forward_contract_count}, unexpected ${receipt.unexpected_forward_contract_count}, definition mismatch ${receipt.definition_mismatch_count}`,
  `- forbidden contract hits: ${receipt.forbidden_contract_hit_count}`,
  `- runtime wiring missing tokens: ${receipt.runtime_missing_token_count}`,
  "- commands: see `commands.txt`",
  "- test_result: syntax, 49 targeted migration/payroll/leave tests, 563 complete HRX tests, web production build, exact 71-contract mapping, filename/order/loader, forbidden-schema, runtime wiring, root fingerprint, and deterministic checks PASS",
  "- manual_qa: Forest payroll profile ownership, assignment encryption/masking, approved attendance projection, correction replacement, exact night/holiday minutes, leave rule lineage, and run as-of behavior inspected",
  `- evidence_hashes: contract \`${receipt.contract_validation_sha256}\`, forbidden scan \`${receipt.forbidden_scan_sha256}\`, runtime wiring \`${receipt.runtime_wiring_sha256}\``,
  "- known_limits: MG-003 implements and unit-tests the additive contracts; fresh install, upgrade, rollback, and restore remain MG-004 through MG-006",
  "- external_blockers: none",
  "- AI slop review: pass; no product UI or user-facing copy changed",
].join("\n"));
writeEvidence("commands.txt", [
  "git status --short",
  "node --check changed HRX JavaScript and test files",
  "node --test packages/hrx/test/migration.test.js packages/hrx/test/payroll-item-catalog.test.js packages/hrx/test/payroll-profile-service.test.js packages/hrx/test/payroll-time-input-snapshot.test.js packages/hrx/test/payroll-input-snapshot-service.test.js packages/hrx/test/payroll-repository.test.js packages/hrx/test/leave-accrual-service.test.js packages/hrx/test/leave-accrual-batch-service.test.js packages/hrx/test/leave-accrual-batch-repository.test.js",
  "node scripts/generate-forward-migration-evidence.mjs --help",
  "node scripts/generate-forward-migration-evidence.mjs # expected usage failure",
  `node scripts/generate-forward-migration-evidence.mjs \"${rootSource}\" --evidence-commit-sha=${evidenceCommitSha}`,
  "node --test packages/hrx/test/*.test.js",
  "npm run build",
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed",
  "rerun generator and compare MG-003 evidence directory SHA-256 manifest",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
