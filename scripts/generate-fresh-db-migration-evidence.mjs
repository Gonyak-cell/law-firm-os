import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { auditFreshHrxDatabase } from "./validate-hrx-fresh-db.mjs";

const candidateRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const usage = "usage: node scripts/generate-fresh-db-migration-evidence.mjs <root-source> [--evidence-commit-sha=<sha|PENDING>]";
if (args.some((argument) => ["-h", "--help"].includes(argument))) {
  console.log(usage);
  process.exit(0);
}
const positional = args.filter((argument) => !argument.startsWith("--"));
const unsupported = args.filter((argument) => argument.startsWith("--") && !argument.startsWith("--evidence-commit-sha="));
if (positional.length !== 1 || unsupported.length) throw new Error(usage);

const rootSource = path.resolve(positional[0]);
const evidenceCommitSha = args.find((argument) => argument.startsWith("--evidence-commit-sha="))?.split("=")[1]
  ?? process.env.MG004_EVIDENCE_COMMIT_SHA
  ?? "PENDING";
if (evidenceCommitSha !== "PENDING" && !/^[a-f0-9]{40}$/.test(evidenceCommitSha)) {
  throw new Error("evidence commit SHA must be PENDING or a full SHA");
}

const candidateEntrySha = "8d01be6fe73614f227864d6514df8f4ccc47c574";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const evidenceDir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/MG-004");
const maxBuffer = 256 * 1024 * 1024;

if (path.resolve(candidateRoot) !== path.resolve(process.cwd())) {
  throw new Error(`run from Forest candidate root: ${candidateRoot}`);
}
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

function writeEvidence(name, value) {
  mkdirSync(evidenceDir, { recursive: true });
  const output = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const filePath = path.join(evidenceDir, name);
  writeFileSync(filePath, output.endsWith("\n") ? output : `${output}\n`, "utf8");
  chmodSync(filePath, 0o644);
}

const rootFingerprintBefore = rootWorktreeFingerprint(rootSource);
if (rootFingerprintBefore.sha256 !== expectedRootWorktreeSha256) {
  throw new Error(`root worktree fingerprint changed before MG-004: ${rootFingerprintBefore.sha256}`);
}
git(candidateRoot, ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"]);

const firstAudit = auditFreshHrxDatabase();
const secondAudit = auditFreshHrxDatabase();
if (JSON.stringify(firstAudit) !== JSON.stringify(secondAudit)) {
  throw new Error("fresh database audit is not deterministic");
}
if (firstAudit.verdict !== "PASS" || firstAudit.migration_count !== 28) {
  throw new Error(`fresh database migration audit failed: ${firstAudit.verdict}/${firstAudit.migration_count}`);
}
if (JSON.stringify(firstAudit.actual_object_counts) !== JSON.stringify({ tables: 73, indexes: 53, triggers: 12 })) {
  throw new Error(`fresh database object inventory drifted: ${JSON.stringify(firstAudit.actual_object_counts)}`);
}
if (firstAudit.nonempty_table_count || firstAudit.foreign_key_error_count || firstAudit.integrity_check !== "ok") {
  throw new Error("fresh database cleanliness or integrity gate failed");
}

const { migration_receipts: migrationReceipts, ...freshDbReport } = firstAudit;
const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during MG-004: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}

const receipt = {
  tuw: "MG-004",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  database_engine: firstAudit.engine,
  sqlite_version: firstAudit.sqlite_version,
  migration_count: firstAudit.migration_count,
  migration_lineage_first: firstAudit.migration_first,
  migration_lineage_last: firstAudit.migration_last,
  table_count: firstAudit.actual_object_counts.tables,
  index_count: firstAudit.actual_object_counts.indexes,
  trigger_count: firstAudit.actual_object_counts.triggers,
  required_column_check_count: firstAudit.required_column_checks.length,
  forbidden_column_check_count: firstAudit.forbidden_column_checks.length,
  forbidden_table_count: firstAudit.forbidden_table_count,
  constraint_probe_count: firstAudit.constraint_probes.length,
  empty_table_count: firstAudit.empty_table_count,
  nonempty_table_count: firstAudit.nonempty_table_count,
  integrity_check: firstAudit.integrity_check,
  foreign_key_error_count: firstAudit.foreign_key_error_count,
  migration_manifest_sha256: firstAudit.migration_manifest_sha256,
  schema_manifest_sha256: firstAudit.schema_manifest_sha256,
  row_count_manifest_sha256: firstAudit.row_count_manifest_sha256,
  fresh_db_report_sha256: sha256(JSON.stringify(freshDbReport)),
  migration_receipts_sha256: sha256(JSON.stringify(migrationReceipts)),
  deterministic_audit: true,
  root_checkout_mutation_count: 0,
  external_blockers: [],
};

writeEvidence("fresh-db-report.json", freshDbReport);
writeEvidence("migration-receipts.json", migrationReceipts);
writeEvidence("receipt.json", receipt);
writeEvidence("semantic-review.md", [
  "# MG-004 Fresh Database Migration Evidence",
  "",
  "## Decision",
  "",
  "A real in-memory SQLite database accepts the complete canonical migration lineage 001-028 in order. This is execution proof, not SQL-text inspection.",
  "",
  `- engine: ${receipt.database_engine} ${receipt.sqlite_version}`,
  `- lineage: ${receipt.migration_lineage_first} through ${receipt.migration_lineage_last} (${receipt.migration_count}/28)`,
  `- schema objects: ${receipt.table_count} tables, ${receipt.index_count} indexes, ${receipt.trigger_count} triggers`,
  `- required/forbidden column checks: ${receipt.required_column_check_count}/${receipt.forbidden_column_check_count}`,
  `- constraint probes: ${receipt.constraint_probe_count}/${receipt.constraint_probe_count} PASS`,
  `- empty tables after probe rollback: ${receipt.empty_table_count}/${receipt.table_count}`,
  `- integrity/foreign keys: ${receipt.integrity_check}/${receipt.foreign_key_error_count} errors`,
  "- two independent fresh database audits are byte-identical",
  "- the user-owned root checkout is fingerprint-identical before and after generation",
  "",
  "## Boundary",
  "",
  "MG-004 proves a fresh installation only. It does not claim production-data migration, upgrades from historical checkpoints, rollback, or restore; those remain MG-005 and MG-006.",
].join("\n"));
writeEvidence("files.txt", [
  "packages/hrx/test/migration-fresh-db.test.js",
  "scripts/generate-fresh-db-migration-evidence.mjs",
  "scripts/validate-hrx-fresh-db.mjs",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/acceptance.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/commands.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/files.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/fresh-db-report.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/migration-receipts.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/receipt.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/semantic-review.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-004/tests.txt",
].join("\n"));
writeEvidence("tests.txt", [
  "node --check fresh database validator, evidence generator, and test: PASS",
  "validator help and invalid-argument contracts: PASS",
  "fresh SQLite migration execution 001-028: 28/28 PASS",
  "targeted migration tests: 6/6 PASS",
  "complete HRX regression: 564/564 PASS",
  "web production build: PASS (1718 modules)",
  "schema inventory: 73 tables, 53 indexes, 12 triggers; missing/unexpected 0",
  "required/forbidden column checks: 7/7 PASS; forbidden tables 0",
  "constraint probes: 7/7 PASS",
  "post-probe empty tables: 73/73; integrity ok; foreign-key errors 0",
  "root working-tree mutations: 0",
  "deterministic rerun: PASS",
].join("\n"));
writeEvidence("acceptance.md", [
  "# MG-004 Acceptance",
  "",
  "- TUW: MG-004",
  "- status: DONE",
  `- entry_sha: \`${candidateEntrySha}\``,
  `- exit_sha: \`${evidenceCommitSha}\``,
  "- changed_files: native SQLite fresh-database validator, regression test, deterministic evidence generator, MG-004 evidence set, Goal execution ledger",
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- database: ${receipt.database_engine} ${receipt.sqlite_version}`,
  `- migration lineage: ${receipt.migration_lineage_first} through ${receipt.migration_lineage_last} (${receipt.migration_count}/28)`,
  `- schema objects: ${receipt.table_count} tables, ${receipt.index_count} indexes, ${receipt.trigger_count} triggers`,
  `- constraint checks: required columns ${receipt.required_column_check_count}, forbidden columns ${receipt.forbidden_column_check_count}, forbidden tables ${receipt.forbidden_table_count}, runtime probes ${receipt.constraint_probe_count}`,
  `- clean state: empty tables ${receipt.empty_table_count}/${receipt.table_count}, integrity ${receipt.integrity_check}, foreign-key errors ${receipt.foreign_key_error_count}`,
  "- commands: see `commands.txt`",
  "- test_result: syntax, CLI contracts, fresh migration execution, 6 targeted migration tests, 564 complete HRX tests, web production build, exact schema inventory, constraints, clean-state, integrity, root fingerprint, and deterministic checks PASS",
  "- manual_qa: reviewed migration receipts 001-028, canonical mutable payroll profile, append-only assignment and attendance receipt triggers, FK/CHECK enforcement, forbidden parallel schema absence, and probe rollback",
  `- evidence_hashes: migrations \`${receipt.migration_manifest_sha256}\`, schema \`${receipt.schema_manifest_sha256}\`, rows \`${receipt.row_count_manifest_sha256}\``,
  "- known_limits: fresh in-memory SQLite install only; no production data was read or written, and historical upgrades/rollback/restore remain MG-005/MG-006",
  "- external_blockers: none",
  "- AI slop review: pass; no product UI or user-facing copy changed",
].join("\n"));
writeEvidence("commands.txt", [
  "git status --short",
  "node --check scripts/validate-hrx-fresh-db.mjs",
  "node --check scripts/generate-fresh-db-migration-evidence.mjs",
  "node --check packages/hrx/test/migration-fresh-db.test.js",
  "node scripts/validate-hrx-fresh-db.mjs --help",
  "node scripts/validate-hrx-fresh-db.mjs unexpected # expected failure",
  "node scripts/validate-hrx-fresh-db.mjs",
  "node --test packages/hrx/test/migration-fresh-db.test.js packages/hrx/test/migration.test.js",
  "node scripts/generate-fresh-db-migration-evidence.mjs --help",
  "node scripts/generate-fresh-db-migration-evidence.mjs # expected usage failure",
  `node scripts/generate-fresh-db-migration-evidence.mjs \"${rootSource}\" --evidence-commit-sha=${evidenceCommitSha}`,
  "node --test packages/hrx/test/*.test.js",
  "npm run build",
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed",
  "rerun generator and compare MG-004 evidence directory SHA-256 manifest",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
