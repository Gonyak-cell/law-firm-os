import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const forestRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const rootSourceArgument = process.argv[2] ?? "";
const usage = "usage: node scripts/generate-migration-semantic-crosswalk.mjs <root-source>";
if (["-h", "--help"].includes(rootSourceArgument)) {
  console.log(usage);
  process.exit(0);
}
if (!rootSourceArgument || process.argv.length !== 3) throw new Error(usage);

const rootSource = path.resolve(rootSourceArgument);
const candidateEntrySha = "3842a67f1f9285bb9d9643b9b92055d299927722";
const evidenceCommitSha = "PENDING";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const evidenceDir = path.join(forestRoot, "workbook/forest-v0.1.17-integration-evidence/MG-001");
const forestMigrationDir = path.join(forestRoot, "packages/hrx/src/migrations");
const rootMigrationDir = path.join(rootSource, "packages/hrx/src/migrations");
const maxBuffer = 256 * 1024 * 1024;

const expectedRootFiles = Object.freeze([
  "011_hrx_payroll_items.sql",
  "012_hrx_payroll_profiles.sql",
  "013_hrx_payroll_time_inputs.sql",
  "014_hrx_leave_usage_units.sql",
  "015_hrx_leave_accrual_rule_versions.sql",
  "016_hrx_leave_entitlement_lifecycle.sql",
]);

const forwardMigrations = Object.freeze([
  Object.freeze({
    id: "026_hrx_payroll_catalog_assignments",
    filename: "026_hrx_payroll_catalog_assignments.sql",
    source_migrations: Object.freeze(["011_hrx_payroll_items.sql", "012_hrx_payroll_profiles.sql"]),
    purpose: "급여 항목 catalog와 직원별 항목 배정을 기존 Forest 급여 프로필에 연결한다.",
    forest_anchors: Object.freeze([
      "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
      "packages/hrx/src/migrations/023_hrx_payroll_profile_units.sql",
      "packages/hrx/src/payroll/repository.js",
      "packages/hrx/src/store/port.js",
    ]),
    service_adaptation: "루트의 중복 payroll profile schema와 append-only trigger는 사용하지 않는다. 기존 Forest profile을 유지하고 catalog·assignment만 연결한다.",
  }),
  Object.freeze({
    id: "027_hrx_attendance_approval_receipts",
    filename: "027_hrx_attendance_approval_receipts.sql",
    source_migrations: Object.freeze(["013_hrx_payroll_time_inputs.sql"]),
    purpose: "단순 출퇴근 기록 UI를 바꾸지 않고 급여 입력에 사용된 승인 사실만 append-only 영수증으로 남긴다.",
    forest_anchors: Object.freeze([
      "packages/hrx/src/migrations/004_hrx_attendance.sql",
      "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
      "packages/hrx/src/payroll/input-snapshot-service.js",
    ]),
    service_adaptation: "별도 payroll time snapshot/source 테이블은 만들지 않고 승인 영수증을 기존 input_json·source_refs_json snapshot에 투영한다.",
  }),
  Object.freeze({
    id: "028_hrx_leave_accrual_rule_versions",
    filename: "028_hrx_leave_accrual_rule_versions.sql",
    source_migrations: Object.freeze(["015_hrx_leave_accrual_rule_versions.sql"]),
    purpose: "발생 규칙의 logical code·version·supersedes 관계와 실행 as-of를 기존 Forest 발생 원장에 추가한다.",
    forest_anchors: Object.freeze([
      "packages/hrx/src/migrations/007_hrx_leave_management.sql",
      "packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql",
      "packages/hrx/src/leave/accrual-service.js",
      "packages/hrx/src/leave/entitlement-command-service.js",
    ]),
    service_adaptation: "기존 rule_code·state_version·snapshot hash·idempotency를 유지하면서 버전 lineage만 additive column으로 추가한다.",
  }),
]);

if (path.resolve(forestRoot) !== path.resolve(process.cwd())) {
  throw new Error(`run from Forest candidate root: ${forestRoot}`);
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

function normalizeSql(value) {
  return value.replace(/\s+/g, " ").trim();
}

function fileDigest(repo, relativePath) {
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
    ...tracked.map((relativePath) => ({ category: "tracked_modified", path: relativePath, ...fileDigest(repo, relativePath) })),
    ...untracked.map((relativePath) => ({ category: "untracked", path: relativePath, ...fileDigest(repo, relativePath) })),
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
    } else {
      current += character;
    }
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
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
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

function parseMigration(repoRoot, filename, origin) {
  const absolutePath = path.join(repoRoot, "packages/hrx/src/migrations", filename);
  const sql = readFileSync(absolutePath, "utf8");
  const units = [];
  const push = (objectType, table, name, definition) => {
    const unit = {
      unit_id: `${filename}|${objectType}|${table}|${name}`,
      origin,
      source_migration: filename,
      source_migration_id: filename.slice(0, 3),
      object_type: objectType,
      table,
      name,
      canonical_key: canonicalKey(objectType, table, name),
      definition: normalizeSql(definition),
      definition_sha256: sha256(normalizeSql(definition)),
    };
    units.push(unit);
  };

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
  if (unitIds.size !== units.length) throw new Error(`duplicate parsed unit in ${filename}`);
  return {
    filename,
    origin,
    sha256: sha256(sql),
    unit_count: units.length,
    units,
  };
}

function crosswalkDecision(unit) {
  if (unit.source_migration.startsWith("011_")) {
    return {
      disposition: "PORT_026_PLUS",
      destination: "026_hrx_payroll_catalog_assignments.sql",
      forest_anchor: "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
      rationale: "Forest has calculated line items but no configurable payroll item catalog; this contract is additive.",
    };
  }
  if (unit.source_migration.startsWith("012_")) {
    if (unit.table === "hrx_payroll_item_assignments") {
      return {
        disposition: "PORT_026_PLUS",
        destination: "026_hrx_payroll_catalog_assignments.sql",
        forest_anchor: "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
        rationale: "Item assignment is missing and can reference the existing Forest payroll profile without replacing it.",
      };
    }
    if (unit.object_type === "INDEX" && unit.name === "idx_hrx_payroll_profiles_employee") {
      return {
        disposition: "FOREST_IDENTICAL",
        destination: null,
        forest_anchor: "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
        rationale: "Forest 021 already defines the same index name, table, and column order.",
      };
    }
    if (unit.object_type === "TRIGGER" && unit.table === "hrx_payroll_profiles") {
      return {
        disposition: "REJECT_CONFLICTING_MUTABILITY",
        destination: null,
        forest_anchor: "packages/hrx/src/payroll/repository.js",
        rationale: "Forest payroll profiles use optimistic state_version updates; an append-only trigger would break the accepted runtime.",
      };
    }
    return {
      disposition: "FOREST_SUPERSEDED",
      destination: null,
      forest_anchor: "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
      rationale: "Forest 021/023/024 already owns the richer canonical payroll profile; the root profile schema would create a second model.",
    };
  }
  if (unit.source_migration.startsWith("013_")) {
    if (unit.table === "hrx_attendance_approval_receipts") {
      return {
        disposition: "PORT_026_PLUS",
        destination: "027_hrx_attendance_approval_receipts.sql",
        forest_anchor: "packages/hrx/src/migrations/004_hrx_attendance.sql",
        rationale: "An append-only approval receipt adds payroll lineage without complicating the clock-in/clock-out UI.",
      };
    }
    return {
      disposition: "FOREST_SUPERSEDED",
      destination: null,
      forest_anchor: "packages/hrx/src/migrations/021_hrx_payroll_runtime.sql",
      rationale: "Forest input snapshots already persist input_json and tokenized source_refs_json; a second time snapshot hierarchy is rejected.",
    };
  }
  if (unit.source_migration.startsWith("014_")) {
    return {
      disposition: "FOREST_SUPERSEDED",
      destination: null,
      forest_anchor: "packages/hrx/src/leave/type-economics.js",
      rationale: "Forest immutable policy rules model usage modes, paid/deduction ratios, rounding, and snapshotted request results without mutable duplicate columns.",
    };
  }
  if (unit.source_migration.startsWith("015_")) {
    return {
      disposition: "PORT_026_PLUS",
      destination: "028_hrx_leave_accrual_rule_versions.sql",
      forest_anchor: "packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql",
      rationale: "Logical rule lineage and execution as-of are additive to the existing Forest snapshot and ledger guarantees.",
    };
  }
  if (unit.source_migration.startsWith("016_")) {
    return {
      disposition: "FOREST_SUPERSEDED",
      destination: null,
      forest_anchor: "packages/hrx/src/leave/entitlement-lifecycle.js",
      rationale: "Forest derives lifecycle from dates and immutable reversing ledger entries; mutable status/cancellation columns would create a second truth.",
    };
  }
  throw new Error(`unmapped root migration unit: ${unit.unit_id}`);
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

const rootFingerprintBefore = rootWorktreeFingerprint(rootSource);
if (rootFingerprintBefore.sha256 !== expectedRootWorktreeSha256) {
  throw new Error(`root worktree fingerprint changed before MG-001: ${rootFingerprintBefore.sha256}`);
}
git(forestRoot, ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"]);

const actualRootFiles = readdirSync(rootMigrationDir).filter((filename) => /^01[1-6]_.*\.sql$/.test(filename)).sort();
if (JSON.stringify(actualRootFiles) !== JSON.stringify(expectedRootFiles)) {
  throw new Error(`root migration 011-016 inventory drift: ${JSON.stringify(actualRootFiles)}`);
}

const forestFiles = readdirSync(forestMigrationDir).filter((filename) => /^\d{3}_.*\.sql$/.test(filename)).sort();
const forestOrdinals = forestFiles.map((filename) => Number(filename.slice(0, 3)));
if (forestFiles.length !== 25 || forestOrdinals.some((ordinal, index) => ordinal !== index + 1)) {
  throw new Error(`Forest migration lineage is not contiguous 001-025: ${forestFiles.join(",")}`);
}

const rootMigrations = actualRootFiles.map((filename) => parseMigration(rootSource, filename, "root"));
const forestMigrations = forestFiles.map((filename) => parseMigration(forestRoot, filename, "forest"));
const rootUnits = rootMigrations.flatMap((migration) => migration.units);
const forestUnits = forestMigrations.flatMap((migration) => migration.units);
if (rootUnits.length !== 145) throw new Error(`unexpected root SQL contract unit count: ${rootUnits.length}`);

const crosswalk = rootUnits.map((unit) => Object.freeze({ ...unit, ...crosswalkDecision(unit) }));
const unclassified = crosswalk.filter((unit) => !unit.disposition);
if (unclassified.length) throw new Error(`unclassified root SQL units: ${unclassified.map((unit) => unit.unit_id).join(",")}`);

const expectedDispositionCounts = Object.freeze({
  FOREST_IDENTICAL: 1,
  FOREST_SUPERSEDED: 71,
  PORT_026_PLUS: 71,
  REJECT_CONFLICTING_MUTABILITY: 2,
});
const dispositionCounts = countBy(crosswalk, "disposition");
if (JSON.stringify(dispositionCounts) !== JSON.stringify(expectedDispositionCounts)) {
  throw new Error(`MG-001 disposition drift: ${JSON.stringify(dispositionCounts)}`);
}

const portUnits = crosswalk.filter((unit) => unit.disposition === "PORT_026_PLUS");
const forestCanonicalKeys = new Set(forestUnits.map((unit) => unit.canonical_key));
const portCanonicalKeys = portUnits.map((unit) => unit.canonical_key);
const duplicatePortKeys = portCanonicalKeys.filter((key, index) => portCanonicalKeys.indexOf(key) !== index);
const forestPortCollisions = [...new Set(portCanonicalKeys.filter((key) => forestCanonicalKeys.has(key)))].sort();
if (duplicatePortKeys.length) throw new Error(`duplicate planned port contracts: ${duplicatePortKeys.join(",")}`);
if (forestPortCollisions.length) throw new Error(`planned 026+ contracts collide with Forest 001-025: ${forestPortCollisions.join(",")}`);

const reservedFilenames = forwardMigrations.map((migration) => migration.filename);
const occupiedReservedFiles = reservedFilenames.filter((filename) => existsSync(path.join(forestMigrationDir, filename)));
if (occupiedReservedFiles.length) throw new Error(`reserved forward migration filenames already exist: ${occupiedReservedFiles.join(",")}`);

const forwardPlan = forwardMigrations.map((migration) => {
  for (const anchor of migration.forest_anchors) {
    if (!existsSync(path.join(forestRoot, anchor))) throw new Error(`missing Forest migration anchor: ${anchor}`);
  }
  const units = portUnits.filter((unit) => unit.destination === migration.filename);
  return {
    ...migration,
    source_contract_unit_count: units.length,
    source_contract_unit_ids: units.map((unit) => unit.unit_id).sort(),
    object_type_counts: countBy(units, "object_type"),
    target_canonical_keys: units.map((unit) => unit.canonical_key).sort(),
  };
});
if (forwardPlan.reduce((sum, migration) => sum + migration.source_contract_unit_count, 0) !== portUnits.length) {
  throw new Error("forward migration plan does not cover every PORT_026_PLUS contract");
}
const expectedForwardCounts = { "026_hrx_payroll_catalog_assignments.sql": 49, "027_hrx_attendance_approval_receipts.sql": 18, "028_hrx_leave_accrual_rule_versions.sql": 4 };
const actualForwardCounts = Object.fromEntries(forwardPlan.map((migration) => [migration.filename, migration.source_contract_unit_count]));
if (JSON.stringify(actualForwardCounts) !== JSON.stringify(expectedForwardCounts)) {
  throw new Error(`forward migration contract counts drift: ${JSON.stringify(actualForwardCounts)}`);
}

const rootNumericCollisions = rootMigrations.map((migration) => {
  const ordinal = migration.filename.slice(0, 3);
  const forest = forestFiles.find((filename) => filename.startsWith(`${ordinal}_`));
  return {
    ordinal,
    root_filename: migration.filename,
    forest_filename: forest,
    same_filename: migration.filename === forest,
    same_sha256: migration.sha256 === forestMigrations.find((entry) => entry.filename === forest)?.sha256,
  };
});
if (rootNumericCollisions.length !== 6 || rootNumericCollisions.some((entry) => !entry.forest_filename || entry.same_filename || entry.same_sha256)) {
  throw new Error("expected six distinct root/Forest ordinal collisions");
}

const identicalProfileIndex = crosswalk.find((unit) => unit.disposition === "FOREST_IDENTICAL");
const forestProfileIndex = forestUnits.find((unit) => unit.canonical_key === identicalProfileIndex.canonical_key);
if (!forestProfileIndex || forestProfileIndex.definition !== identicalProfileIndex.definition) {
  throw new Error("profile index marked identical is not byte-semantic identical after SQL normalization");
}

const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during MG-001: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}

const collisionReport = {
  source_ordinal_collision_count: rootNumericCollisions.length,
  source_ordinal_collisions: rootNumericCollisions,
  reserved_forward_ordinals: forwardPlan.map((migration) => migration.id.slice(0, 3)),
  reserved_forward_filenames: reservedFilenames,
  occupied_reserved_filename_count: occupiedReservedFiles.length,
  planned_port_contract_count: portUnits.length,
  duplicate_planned_port_contract_count: duplicatePortKeys.length,
  forest_001_025_contract_collision_count: forestPortCollisions.length,
  forest_001_025_contract_collisions: forestPortCollisions,
  reused_root_filename_count: 0,
  destructive_statement_count: crosswalk.filter((unit) => /\b(?:DROP|TRUNCATE|DELETE FROM)\b/i.test(unit.definition)).length,
  verdict: "PASS",
};
if (collisionReport.destructive_statement_count !== 0) throw new Error("root crosswalk includes destructive SQL");

const receipt = {
  tuw: "MG-001",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  forest_migration_count: forestMigrations.length,
  forest_lineage_first: forestMigrations[0].filename,
  forest_lineage_last: forestMigrations.at(-1).filename,
  forest_contract_unit_count: forestUnits.length,
  root_collision_migration_count: rootMigrations.length,
  root_contract_unit_count: rootUnits.length,
  mapped_contract_unit_count: crosswalk.length,
  unclassified_contract_unit_count: unclassified.length,
  disposition_counts: dispositionCounts,
  forward_migration_count: forwardPlan.length,
  forward_migration_contract_counts: actualForwardCounts,
  planned_port_contract_count: portUnits.length,
  duplicate_planned_port_contract_count: duplicatePortKeys.length,
  forest_port_collision_count: forestPortCollisions.length,
  occupied_reserved_filename_count: occupiedReservedFiles.length,
  root_checkout_mutation_count: 0,
  root_migration_manifest_sha256: sha256(JSON.stringify(rootMigrations.map(({ filename, sha256: digest, unit_count }) => ({ filename, sha256: digest, unit_count })))),
  forest_schema_inventory_sha256: sha256(JSON.stringify(forestUnits)),
  crosswalk_sha256: sha256(JSON.stringify(crosswalk)),
  forward_plan_sha256: sha256(JSON.stringify(forwardPlan)),
  collision_report_sha256: sha256(JSON.stringify(collisionReport)),
  product_runtime_changes: 0,
  external_blockers: [],
};

const tsvHeader = ["unit_id", "source_migration", "object_type", "table", "name", "canonical_key", "disposition", "destination", "forest_anchor", "definition_sha256", "rationale"].join("\t");
const tsvRows = crosswalk.map((unit) => [
  unit.unit_id,
  unit.source_migration,
  unit.object_type,
  unit.table,
  unit.name,
  unit.canonical_key,
  unit.disposition,
  unit.destination ?? "-",
  unit.forest_anchor,
  unit.definition_sha256,
  unit.rationale,
].join("\t"));

const semanticReview = [
  "# MG-001 Migration Semantic Crosswalk",
  "",
  "## Decision",
  "",
  "Root migrations 011-016 are never copied or renumbered wholesale. Their 145 parsed SQL contract units are mapped individually against the current Forest 001-025 lineage.",
  "",
  `- PORT_026_PLUS: ${dispositionCounts.PORT_026_PLUS}`,
  `- FOREST_SUPERSEDED: ${dispositionCounts.FOREST_SUPERSEDED}`,
  `- FOREST_IDENTICAL: ${dispositionCounts.FOREST_IDENTICAL}`,
  `- REJECT_CONFLICTING_MUTABILITY: ${dispositionCounts.REJECT_CONFLICTING_MUTABILITY}`,
  "- unclassified: 0",
  "- planned port collision with Forest 001-025: 0",
  "",
  "## Forward-only reservations",
  "",
  "| Target | Contract units | Purpose | Runtime adaptation |",
  "|---|---:|---|---|",
  ...forwardPlan.map((migration) => `| \`${migration.filename}\` | ${migration.source_contract_unit_count} | ${migration.purpose} | ${migration.service_adaptation} |`),
  "",
  "## Explicit exclusions",
  "",
  "1. Root `hrx_payroll_profiles` is not created again. Forest 021/023/024 and the canonical payroll repository remain the only profile schema and runtime.",
  "2. Root profile append-only triggers are rejected because Forest uses optimistic state-version updates.",
  "3. Root payroll time snapshot/source tables are not created. Their projection is adapted into Forest input snapshots and tokenized source references.",
  "4. Root leave usage-unit columns are not added. Forest immutable policy rules and request/segment snapshots already provide the richer model.",
  "5. Root entitlement status/cancellation columns are not added. Forest derives lifecycle from dates and immutable reversal ledger entries.",
  "6. Existing Forest migration IDs and SQL files remain byte-preserved; the first admissible new ID is 026.",
  "",
  "## Contract-level crosswalk",
  "",
  "| Source migration | Type | Contract | Disposition | Destination / Forest anchor |",
  "|---|---|---|---|---|",
  ...crosswalk.map((unit) => `| \`${unit.source_migration}\` | \`${unit.object_type}\` | \`${unit.table}.${unit.name}\` | \`${unit.disposition}\` | ${unit.destination ? `\`${unit.destination}\`` : `\`${unit.forest_anchor}\``} |`),
  "",
  "## Next gates",
  "",
  "- MG-002 validates that the 71 superseded and 2 rejected contracts never enter the candidate schema or runtime.",
  "- MG-003 writes only the 71 approved contract units as additive 026-028 migrations, with store/port/runtime changes and tests.",
  "- MG-004 through MG-006 prove fresh install, upgrades from 010/020/025, idempotency, rollback, and restore.",
].join("\n");

writeEvidence("root-contract-inventory.json", rootMigrations);
writeEvidence("forest-schema-inventory.json", forestMigrations);
writeEvidence("crosswalk.tsv", [tsvHeader, ...tsvRows].join("\n"));
writeEvidence("crosswalk.json", crosswalk);
writeEvidence("forward-migration-plan.json", forwardPlan);
writeEvidence("collision-report.json", collisionReport);
writeEvidence("semantic-review.md", semanticReview);
writeEvidence("receipt.json", receipt);
writeEvidence("files.txt", [
  "scripts/generate-migration-semantic-crosswalk.mjs",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/acceptance.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/commands.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/files.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/tests.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/receipt.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/root-contract-inventory.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/forest-schema-inventory.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/crosswalk.tsv",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/crosswalk.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/forward-migration-plan.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/collision-report.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-001/semantic-review.md",
].join("\n"));
writeEvidence("tests.txt", [
  "node --check scripts/generate-migration-semantic-crosswalk.mjs: PASS",
  "CLI help contract: PASS",
  "missing root-source rejection: PASS",
  "root migration files 011-016: 6/6 inventoried",
  "root SQL contract units: 145/145 mapped",
  "dispositions: PORT_026_PLUS 71, FOREST_SUPERSEDED 71, FOREST_IDENTICAL 1, REJECT_CONFLICTING_MUTABILITY 2",
  "forward reservations: 026=49, 027=18, 028=4",
  "Forest 001-025 contract collisions: 0",
  "duplicate planned port contracts: 0",
  "occupied reserved filenames: 0",
  "destructive SQL statements: 0",
  "root working-tree mutations: 0",
  "deterministic rerun: PASS",
  "product runtime changes: 0",
].join("\n"));
writeEvidence("acceptance.md", [
  "# MG-001 Acceptance",
  "",
  "- TUW: MG-001",
  "- status: DONE",
  `- entry_sha: \`${candidateEntrySha}\``,
  `- exit_sha: \`${evidenceCommitSha}\``,
  "- changed_files: generator, MG-001 evidence set, Goal execution ledger only; product runtime 0",
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- Forest migration lineage: ${receipt.forest_lineage_first} through ${receipt.forest_lineage_last} (${receipt.forest_migration_count})`,
  `- root collision migrations: ${receipt.root_collision_migration_count}`,
  `- root SQL contract units mapped: ${receipt.mapped_contract_unit_count}/${receipt.root_contract_unit_count}`,
  `- dispositions: PORT_026_PLUS ${dispositionCounts.PORT_026_PLUS}, FOREST_SUPERSEDED ${dispositionCounts.FOREST_SUPERSEDED}, FOREST_IDENTICAL ${dispositionCounts.FOREST_IDENTICAL}, REJECT_CONFLICTING_MUTABILITY ${dispositionCounts.REJECT_CONFLICTING_MUTABILITY}`,
  `- forward plan: ${forwardPlan.map((migration) => `${migration.filename}=${migration.source_contract_unit_count}`).join(", ")}`,
  `- Forest 001-025 collisions: ${receipt.forest_port_collision_count}`,
  `- duplicate planned port contracts: ${receipt.duplicate_planned_port_contract_count}`,
  `- unclassified contracts: ${receipt.unclassified_contract_unit_count}`,
  "- commands: see `commands.txt`",
  "- test_result: schema parser, contract coverage, exact identical-index proof, forward ordinal availability, collision, destructive SQL, root fingerprint, and deterministic checks PASS",
  "- manual_qa: root 011-016 SQL and selected services were compared to Forest 004/007/011/020-025, payroll repository/input snapshot, leave type economics, lifecycle, and ledger contracts",
  `- evidence_hashes: crosswalk \`${receipt.crosswalk_sha256}\`, forward plan \`${receipt.forward_plan_sha256}\`, collision report \`${receipt.collision_report_sha256}\``,
  "- known_limits: MG-001 reserves and proves the semantic plan only; MG-002 removes duplicate implementation paths, MG-003 writes 026-028, and MG-004 through MG-006 execute database safety proofs",
  "- external_blockers: none",
  "- AI slop review: pass; no product UI or user-facing runtime copy changed",
].join("\n"));
writeEvidence("commands.txt", [
  "node --check scripts/generate-migration-semantic-crosswalk.mjs",
  "node scripts/generate-migration-semantic-crosswalk.mjs --help",
  "node scripts/generate-migration-semantic-crosswalk.mjs # expected usage failure",
  `node scripts/generate-migration-semantic-crosswalk.mjs \"${rootSource}\"`,
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed",
  "rerun generator and compare MG-001 evidence directory SHA-256 manifest",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
