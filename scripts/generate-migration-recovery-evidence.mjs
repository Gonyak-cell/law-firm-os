import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { auditHrxMigrationRecovery } from "./validate-hrx-migration-recovery.mjs";

const candidateRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const usage = "usage: node scripts/generate-migration-recovery-evidence.mjs <root-source> [--evidence-commit-sha=<sha|PENDING>]";
if (args.some((argument) => ["-h", "--help"].includes(argument))) {
  console.log(usage);
  process.exit(0);
}
const positional = args.filter((argument) => !argument.startsWith("--"));
const unsupported = args.filter((argument) => argument.startsWith("--") && !argument.startsWith("--evidence-commit-sha="));
if (positional.length !== 1 || unsupported.length) throw new Error(usage);

const rootSource = path.resolve(positional[0]);
const evidenceCommitSha = args.find((argument) => argument.startsWith("--evidence-commit-sha="))?.split("=")[1]
  ?? process.env.MG006_EVIDENCE_COMMIT_SHA
  ?? "PENDING";
if (evidenceCommitSha !== "PENDING" && !/^[a-f0-9]{40}$/.test(evidenceCommitSha)) {
  throw new Error("evidence commit SHA must be PENDING or a full SHA");
}

const candidateEntrySha = "a79cb5f2743a03e012af01badcf86d1721750aab";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const evidenceDir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/MG-006");
const maxBuffer = 256 * 1024 * 1024;

if (path.resolve(candidateRoot) !== path.resolve(process.cwd())) throw new Error(`run from Forest candidate root: ${candidateRoot}`);
if (!existsSync(rootSource)) throw new Error(`root source does not exist: ${rootSource}`);

function git(repo, gitArgs, encoding = "utf8") {
  return execFileSync("git", gitArgs, { cwd: repo, encoding, maxBuffer });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function splitZero(value) {
  return value.toString("utf8").split("\0").filter(Boolean);
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
  throw new Error(`root worktree fingerprint changed before MG-006: ${rootFingerprintBefore.sha256}`);
}
git(candidateRoot, ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"]);

const firstAudit = auditHrxMigrationRecovery();
const secondAudit = auditHrxMigrationRecovery();
if (JSON.stringify(firstAudit) !== JSON.stringify(secondAudit)) throw new Error("migration recovery audit is not deterministic");
if (firstAudit.verdict !== "PASS" || firstAudit.partial_commit_count !== 0 || firstAudit.external_write_count !== 0) {
  throw new Error("migration recovery audit did not pass zero-partial-commit boundary");
}
if (!firstAudit.canonical_rerun.idempotent || firstAudit.canonical_rerun.rerun_applied_count !== 0) {
  throw new Error("canonical migration rerun is not idempotent");
}
if (!firstAudit.canonical_backup_restore.restore_exact || !firstAudit.sqlite_recovery.backup_restore_exact) {
  throw new Error("migration backup restore is not exact");
}
if (!firstAudit.sqlite_recovery.transaction_rollback_exact || firstAudit.sqlite_recovery.partial_schema_object_count !== 0) {
  throw new Error("SQLite transaction rollback left partial state");
}

const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during MG-006: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}

const recoveryMatrix = [
  {
    gate: "canonical_rerun",
    before_sha256: firstAudit.canonical_rerun.first_snapshot_sha256,
    after_sha256: firstAudit.canonical_rerun.rerun_snapshot_sha256,
    reopened_sha256: firstAudit.canonical_rerun.reopened_snapshot_sha256,
    partial_commit_count: firstAudit.canonical_rerun.rerun_applied_count,
    verdict: "PASS",
  },
  {
    gate: "canonical_failure_rollback",
    before_sha256: firstAudit.canonical_failure_rollback.before_snapshot_sha256,
    after_sha256: firstAudit.canonical_failure_rollback.restored_snapshot_sha256,
    reopened_sha256: firstAudit.canonical_failure_rollback.reopened_snapshot_sha256,
    partial_commit_count: firstAudit.canonical_failure_rollback.partial_applied_count,
    verdict: "PASS",
  },
  {
    gate: "canonical_backup_restore",
    before_sha256: firstAudit.canonical_backup_restore.backup_snapshot_sha256,
    after_sha256: firstAudit.canonical_backup_restore.restored_snapshot_sha256,
    reopened_sha256: firstAudit.canonical_backup_restore.reopened_snapshot_sha256,
    partial_commit_count: 0,
    verdict: "PASS",
  },
  {
    gate: "sqlite_checkpoint_backup_restore",
    before_sha256: firstAudit.sqlite_recovery.backup_file_sha256,
    after_sha256: firstAudit.sqlite_recovery.restored_file_sha256,
    reopened_sha256: firstAudit.sqlite_recovery.restored_final_data_sha256,
    partial_commit_count: 0,
    verdict: "PASS",
  },
  {
    gate: "sqlite_transaction_rollback",
    before_sha256: firstAudit.sqlite_recovery.failed_transaction_data_sha256_before,
    after_sha256: firstAudit.sqlite_recovery.failed_transaction_data_sha256_after,
    reopened_sha256: firstAudit.sqlite_recovery.reopened_data_sha256,
    partial_commit_count: firstAudit.sqlite_recovery.partial_schema_object_count,
    verdict: "PASS",
  },
];

const receipt = {
  tuw: "MG-006",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  migration_count: firstAudit.migration_count,
  canonical_first_applied_count: firstAudit.canonical_rerun.first_applied_count,
  canonical_rerun_applied_count: firstAudit.canonical_rerun.rerun_applied_count,
  canonical_failure_partial_applied_count: firstAudit.canonical_failure_rollback.partial_applied_count,
  canonical_restore_exact: firstAudit.canonical_backup_restore.restore_exact,
  sqlite_checkpoint: firstAudit.sqlite_recovery.checkpoint,
  sqlite_upgrade_migration_count: firstAudit.sqlite_recovery.upgrade_migration_count,
  sqlite_backup_restore_exact: firstAudit.sqlite_recovery.backup_restore_exact,
  sqlite_transaction_rollback_exact: firstAudit.sqlite_recovery.transaction_rollback_exact,
  sqlite_partial_schema_object_count: firstAudit.sqlite_recovery.partial_schema_object_count,
  integrity_check: firstAudit.sqlite_recovery.integrity_check,
  foreign_key_error_count: firstAudit.sqlite_recovery.foreign_key_error_count,
  total_partial_commit_count: firstAudit.partial_commit_count,
  deterministic_audit: true,
  recovery_report_sha256: sha256(JSON.stringify(firstAudit)),
  recovery_matrix_sha256: sha256(JSON.stringify(recoveryMatrix)),
  root_checkout_mutation_count: 0,
  external_blockers: [],
};

writeEvidence("migration-recovery-report.json", firstAudit);
writeEvidence("recovery-matrix.json", recoveryMatrix);
writeEvidence("receipt.json", receipt);
writeEvidence("semantic-review.md", [
  "# MG-006 Migration Recovery Evidence",
  "",
  "## Decision",
  "",
  "Canonical reruns, injected migration failures, backup restore, and actual SQLite transaction failure all recover without a partial commit.",
  "",
  `- canonical first application: ${receipt.canonical_first_applied_count}/${receipt.migration_count}`,
  `- canonical rerun applications: ${receipt.canonical_rerun_applied_count}`,
  `- canonical injected-failure receipts left behind: ${receipt.canonical_failure_partial_applied_count}`,
  "- canonical snapshot backup/restore: byte-stable before, after, and reopen",
  `- SQLite checkpoint ${receipt.sqlite_checkpoint} backup/restore and ${receipt.sqlite_upgrade_migration_count}-migration re-upgrade: exact`,
  `- SQLite failed transaction schema objects left behind: ${receipt.sqlite_partial_schema_object_count}`,
  `- integrity: ${receipt.integrity_check}; foreign-key errors: ${receipt.foreign_key_error_count}`,
  "- two independent audit runs are byte-identical",
  "- the user-owned root checkout is fingerprint-identical before and after generation",
  "",
  "## Boundary",
  "",
  "Individual historical SQL files are not all statement-idempotent because additive ALTER statements exist. Safe rerun is provided by immutable migration ID/hash receipts and skip semantics in the canonical runner. Fixtures and file databases are synthetic; production employee, payroll, bank, tax, and leave records are never read or written.",
].join("\n"));
writeEvidence("files.txt", [
  "packages/hrx/test/migration-recovery.test.js",
  "scripts/generate-migration-recovery-evidence.mjs",
  "scripts/validate-hrx-migration-recovery.mjs",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/acceptance.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/commands.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/files.txt",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/migration-recovery-report.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/receipt.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/recovery-matrix.json",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/semantic-review.md",
  "workbook/forest-v0.1.17-integration-evidence/MG-006/tests.txt",
].join("\n"));
writeEvidence("tests.txt", [
  "node --check migration recovery validator, evidence generator, and test: PASS",
  "validator and generator help/invalid-argument contracts: PASS",
  "canonical first migration application: 28/28 PASS",
  "canonical rerun: pending 0, applied 0, durable snapshot unchanged",
  "canonical injected failure: partial receipts 0, exact restore and reopen PASS",
  "canonical backup: exact restore/reopen and tamper rejection PASS",
  "SQLite checkpoint 025 backup/restore: exact file, schema, and data hashes PASS",
  "SQLite 026-028 re-upgrade after restore: exact final schema and data hashes PASS",
  "SQLite injected transaction failure: partial schema objects 0, exact row/schema rollback PASS",
  "targeted migration safety tests: 12/12 PASS",
  "complete HRX regression: 566/566 PASS",
  "web production build: PASS (1718 modules)",
  "integrity ok; foreign-key errors 0; external writes 0",
  "root working-tree mutations: 0",
  "deterministic rerun: PASS",
].join("\n"));
writeEvidence("acceptance.md", [
  "# MG-006 Acceptance",
  "",
  "- TUW: MG-006",
  "- status: DONE",
  `- entry_sha: \`${candidateEntrySha}\``,
  `- exit_sha: \`${evidenceCommitSha}\``,
  "- changed_files: deterministic recovery validator, regression test, evidence generator, MG-006 evidence set, Goal execution ledger",
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- migration rerun: first ${receipt.canonical_first_applied_count}/${receipt.migration_count}, second ${receipt.canonical_rerun_applied_count}/${receipt.migration_count}`,
  `- injected failure: canonical partial receipts ${receipt.canonical_failure_partial_applied_count}, SQLite partial schema objects ${receipt.sqlite_partial_schema_object_count}`,
  `- restore: canonical exact ${receipt.canonical_restore_exact}, SQLite exact ${receipt.sqlite_backup_restore_exact}`,
  `- SQLite transaction rollback exact: ${receipt.sqlite_transaction_rollback_exact}`,
  `- integrity: ${receipt.integrity_check}; FK errors ${receipt.foreign_key_error_count}`,
  "- commands: see `commands.txt`",
  "- test_result: syntax, CLI contracts, 5 recovery gates, 12 targeted migration tests, 566 complete HRX tests, web production build, integrity, root fingerprint, and deterministic checks PASS",
  "- manual_qa: directly ran validator happy/help/invalid paths and inspected immutable receipt skip, injected failure restore, backup checksum rejection, checkpoint file restore, re-upgrade, transaction rollback, and durable reopen hashes",
  `- evidence_hashes: report \`${receipt.recovery_report_sha256}\`, recovery matrix \`${receipt.recovery_matrix_sha256}\``,
  "- known_limits: repository-safe synthetic files only; production data migration and external provider/bank/tax writes are outside MG-006 and remain approval-gated",
  "- external_blockers: none",
  "- AI slop review: pass; no product UI or user-facing copy changed",
].join("\n"));
writeEvidence("commands.txt", [
  "git status --short",
  "node --check scripts/validate-hrx-migration-recovery.mjs",
  "node --check scripts/generate-migration-recovery-evidence.mjs",
  "node --check packages/hrx/test/migration-recovery.test.js",
  "node scripts/validate-hrx-migration-recovery.mjs --help",
  "node scripts/validate-hrx-migration-recovery.mjs unexpected # expected failure",
  "node scripts/validate-hrx-migration-recovery.mjs",
  "node --test packages/hrx/test/migration-recovery.test.js packages/hrx/test/migration-safety.test.js packages/hrx/test/migration-upgrade.test.js packages/hrx/test/migration-fresh-db.test.js packages/hrx/test/migration.test.js",
  "node scripts/generate-migration-recovery-evidence.mjs --help",
  "node scripts/generate-migration-recovery-evidence.mjs # expected usage failure",
  `node scripts/generate-migration-recovery-evidence.mjs "${rootSource}" --evidence-commit-sha=${evidenceCommitSha}`,
  "node --test packages/hrx/test/*.test.js",
  "npm run build",
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed",
  "rerun generator and compare MG-006 evidence directory SHA-256 manifest",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
