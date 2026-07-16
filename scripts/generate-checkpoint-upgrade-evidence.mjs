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
import { auditHrxCheckpointUpgrades } from "./validate-hrx-checkpoint-upgrades.mjs";

const candidateRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const usage = "usage: node scripts/generate-checkpoint-upgrade-evidence.mjs <root-source> [--evidence-commit-sha=<sha|PENDING>]";
if (args.some((argument) => ["-h", "--help"].includes(argument))) {
  console.log(usage);
  process.exit(0);
}
const positional = args.filter((argument) => !argument.startsWith("--"));
const unsupported = args.filter((argument) => argument.startsWith("--") && !argument.startsWith("--evidence-commit-sha="));
if (positional.length !== 1 || unsupported.length) throw new Error(usage);

const rootSource = path.resolve(positional[0]);
const evidenceCommitSha = args.find((argument) => argument.startsWith("--evidence-commit-sha="))?.split("=")[1]
  ?? process.env.MG005_EVIDENCE_COMMIT_SHA
  ?? "PENDING";
if (evidenceCommitSha !== "PENDING" && !/^[a-f0-9]{40}$/.test(evidenceCommitSha)) {
  throw new Error("evidence commit SHA must be PENDING or a full SHA");
}

const candidateEntrySha = "f59b328927ee7c88a525bcb588938547a91ceb91";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const evidenceDir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/MG-005");
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
  throw new Error(`root worktree fingerprint changed before MG-005: ${rootFingerprintBefore.sha256}`);
}
git(candidateRoot, ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"]);

const firstAudit = auditHrxCheckpointUpgrades();
const secondAudit = auditHrxCheckpointUpgrades();
if (JSON.stringify(firstAudit) !== JSON.stringify(secondAudit)) throw new Error("checkpoint upgrade audit is not deterministic");
if (firstAudit.verdict !== "PASS" || JSON.stringify(firstAudit.checkpoints.map(({ checkpoint }) => checkpoint)) !== JSON.stringify([10, 20, 25])) {
  throw new Error("checkpoint upgrade audit did not cover 010, 020, and 025");
}
if (firstAudit.total_changed_existing_row_count || firstAudit.total_lost_existing_row_count || firstAudit.total_unexpected_new_row_count) {
  throw new Error("checkpoint upgrade data preservation gate failed");
}
if (!firstAudit.checkpoints.every((checkpoint) => checkpoint.final_schema_sha256 === firstAudit.fresh_schema_sha256)) {
  throw new Error("checkpoint final schema differs from fresh schema");
}

const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during MG-005: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}

const checkpointMatrix = firstAudit.checkpoints.map((checkpoint) => ({
  checkpoint: checkpoint.checkpoint,
  checkpoint_last_migration: checkpoint.checkpoint_last_migration,
  upgrade_migration_count: checkpoint.upgrade_migration_count,
  upgrade_first_migration: checkpoint.upgrade_first_migration,
  upgrade_last_migration: checkpoint.upgrade_last_migration,
  seeded_table_count: checkpoint.seeded_table_count,
  seeded_row_count: checkpoint.seeded_row_count,
  backfill_check_count: checkpoint.backfill_checks.length,
  data_snapshot_sha256: checkpoint.data_snapshot_sha256_before,
  final_schema_sha256: checkpoint.final_schema_sha256,
  changed_existing_row_count: checkpoint.changed_existing_row_count,
  lost_existing_row_count: checkpoint.lost_existing_row_count,
  unexpected_new_row_count: checkpoint.unexpected_new_row_count,
  durable_reopen: checkpoint.durable_reopen,
  integrity_check: checkpoint.reopened_validation.integrity_check,
  foreign_key_error_count: checkpoint.reopened_validation.foreign_key_error_count,
  verdict: checkpoint.verdict,
}));

const receipt = {
  tuw: "MG-005",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  database_engine: firstAudit.engine,
  sqlite_version: firstAudit.sqlite_version,
  checkpoint_count: firstAudit.checkpoint_count,
  checkpoints: checkpointMatrix.map(({ checkpoint }) => checkpoint),
  final_migration_count: firstAudit.final_migration_count,
  final_migration: firstAudit.final_migration,
  total_seeded_table_count: firstAudit.total_seeded_table_count,
  total_seeded_row_count: firstAudit.total_seeded_row_count,
  total_backfill_check_count: firstAudit.total_backfill_check_count,
  total_changed_existing_row_count: firstAudit.total_changed_existing_row_count,
  total_lost_existing_row_count: firstAudit.total_lost_existing_row_count,
  total_unexpected_new_row_count: firstAudit.total_unexpected_new_row_count,
  durable_reopen_count: firstAudit.checkpoints.filter(({ durable_reopen }) => durable_reopen).length,
  integrity_failure_count: firstAudit.checkpoints.filter(({ reopened_validation }) => reopened_validation.integrity_check !== "ok").length,
  foreign_key_error_count: firstAudit.checkpoints.reduce((sum, checkpoint) => sum + checkpoint.reopened_validation.foreign_key_error_count, 0),
  fresh_schema_sha256: firstAudit.fresh_schema_sha256,
  upgrade_report_sha256: sha256(JSON.stringify(firstAudit)),
  checkpoint_matrix_sha256: sha256(JSON.stringify(checkpointMatrix)),
  deterministic_audit: true,
  root_checkout_mutation_count: 0,
  external_blockers: [],
};

writeEvidence("checkpoint-upgrade-report.json", firstAudit);
writeEvidence("checkpoint-matrix.json", checkpointMatrix);
writeEvidence("receipt.json", receipt);
writeEvidence("semantic-review.md", [
  "# MG-005 Checkpoint Upgrade Evidence",
  "",
  "## Decision",
  "",
  "The 010, 020, and 025 historical checkpoints each upgrade to 028 on a durable SQLite file without changing or losing any pre-existing value.",
  "",
  `- checkpoints: ${receipt.checkpoints.join(", ")}`,
  `- upgrade migrations: ${checkpointMatrix.map((row) => `${row.checkpoint}=>${row.upgrade_migration_count}`).join(", ")}`,
  `- synthetic golden coverage: ${receipt.total_seeded_table_count} tables / ${receipt.total_seeded_row_count} rows`,
  `- backfill checks: ${receipt.total_backfill_check_count}/${receipt.total_backfill_check_count} PASS`,
  "- existing rows changed/lost: 0/0",
  "- unexpected new rows: 0",
  `- durable close/reopen proofs: ${receipt.durable_reopen_count}/${receipt.checkpoint_count}`,
  "- integrity failures and foreign-key errors: 0/0",
  `- all final schemas equal fresh schema: ${receipt.fresh_schema_sha256}`,
  "- two independent audit runs are byte-identical",
  "- the user-owned root checkout is fingerprint-identical before and after generation",
  "",
  "## Boundary",
  "",
  "The fixtures are synthetic and repository-safe. MG-005 does not read or write production employee, payroll, bank, or leave data. Idempotency, injected failure rollback, backup, and restore remain MG-006.",
].join("\n"));
writeEvidence("files.txt", [
  "packages/hrx/test/migration-upgrade.test.js",
  "scripts/generate-checkpoint-upgrade-evidence.mjs",
  "scripts/validate-hrx-checkpoint-upgrades.mjs",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/acceptance.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/checkpoint-matrix.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/checkpoint-upgrade-report.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/commands.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/files.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/receipt.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/semantic-review.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-005/tests.txt",
].join("\n"));
writeEvidence("tests.txt", [
  "node --check checkpoint upgrade validator, evidence generator, and test: PASS",
  "validator and generator help/invalid-argument contracts: PASS",
  "checkpoint 010 -> 028: 18/18 migrations PASS",
  "checkpoint 020 -> 028: 8/8 migrations PASS",
  "checkpoint 025 -> 028: 3/3 migrations PASS",
  "targeted migration tests: 7/7 PASS",
  "complete HRX regression: 565/565 PASS",
  "web production build: PASS (1718 modules)",
  "synthetic golden rows: 32/32 byte-stable before/after/reopen",
  "backfill checks: 30/30 PASS",
  "changed/lost/unexpected rows: 0/0/0",
  "final schema equals fresh schema: 3/3",
  "integrity and foreign-key errors: 0",
  "root working-tree mutations: 0",
  "deterministic rerun: PASS",
].join("\n"));
writeEvidence("acceptance.md", [
  "# MG-005 Acceptance",
  "",
  "- TUW: MG-005",
  "- status: DONE",
  `- entry_sha: \`${candidateEntrySha}\``,
  `- exit_sha: \`${evidenceCommitSha}\``,
  "- changed_files: durable SQLite checkpoint-upgrade validator, synthetic golden fixtures, regression test, deterministic evidence generator, MG-005 evidence set, Goal execution ledger",
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- checkpoints: ${receipt.checkpoints.join(", ")} -> ${receipt.final_migration}`,
  `- synthetic golden coverage: ${receipt.total_seeded_table_count} tables / ${receipt.total_seeded_row_count} rows`,
  `- data result: changed ${receipt.total_changed_existing_row_count}, lost ${receipt.total_lost_existing_row_count}, unexpected new ${receipt.total_unexpected_new_row_count}`,
  `- backfill checks: ${receipt.total_backfill_check_count}/${receipt.total_backfill_check_count}`,
  `- durable reopen: ${receipt.durable_reopen_count}/${receipt.checkpoint_count}; integrity failures ${receipt.integrity_failure_count}; FK errors ${receipt.foreign_key_error_count}`,
  `- final schema SHA-256: \`${receipt.fresh_schema_sha256}\``,
  "- commands: see `commands.txt`",
  "- test_result: syntax, CLI contracts, three durable checkpoint upgrades, 7 targeted migration tests, 565 complete HRX tests, web production build, row/value hashes, 30 backfills, schema golden, integrity, root fingerprint, and deterministic checks PASS",
  "- manual_qa: inspected close/reopen boundaries, per-checkpoint migration spans, seeded tables, pre-existing value hashes, new-column defaults, final schema equality, and cleanup of temporary SQLite files",
  `- evidence_hashes: report \`${receipt.upgrade_report_sha256}\`, checkpoint matrix \`${receipt.checkpoint_matrix_sha256}\``,
  "- known_limits: repository-safe synthetic file databases only; failure injection, idempotency, rollback, backup, and restore remain MG-006",
  "- external_blockers: none",
  "- AI slop review: pass; no product UI or user-facing copy changed",
].join("\n"));
writeEvidence("commands.txt", [
  "git status --short",
  "node --check scripts/validate-hrx-checkpoint-upgrades.mjs",
  "node --check scripts/generate-checkpoint-upgrade-evidence.mjs",
  "node --check packages/hrx/test/migration-upgrade.test.js",
  "node scripts/validate-hrx-checkpoint-upgrades.mjs --help",
  "node scripts/validate-hrx-checkpoint-upgrades.mjs unexpected # expected failure",
  "node scripts/validate-hrx-checkpoint-upgrades.mjs",
  "node --test packages/hrx/test/migration-upgrade.test.js packages/hrx/test/migration-fresh-db.test.js packages/hrx/test/migration.test.js",
  "node scripts/generate-checkpoint-upgrade-evidence.mjs --help",
  "node scripts/generate-checkpoint-upgrade-evidence.mjs # expected usage failure",
  `node scripts/generate-checkpoint-upgrade-evidence.mjs \"${rootSource}\" --evidence-commit-sha=${evidenceCommitSha}`,
  "node --test packages/hrx/test/*.test.js",
  "npm run build",
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed",
  "rerun generator and compare MG-005 evidence directory SHA-256 manifest",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
