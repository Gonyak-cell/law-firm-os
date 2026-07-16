import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const candidateRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const sourceRoot = path.resolve(process.argv[2] ?? "");

if (!sourceRoot || process.argv.length !== 3) {
  throw new Error("usage: node scripts/generate-current-root-recovery-evidence.mjs <source-repository>");
}
if (path.resolve(candidateRoot) !== path.resolve(process.cwd())) {
  throw new Error(`run from candidate repository root: ${candidateRoot}`);
}
if (sourceRoot === path.resolve(candidateRoot)) {
  throw new Error("source repository must differ from the candidate repository");
}

const evidenceDir = path.join(candidateRoot, "workbook/forest-v0.1.17-integration-evidence/RC-001");
const maxBuffer = 256 * 1024 * 1024;
const externalTempRoot = existsSync("/private/tmp") ? "/private/tmp" : os.tmpdir();

function git(repo, args, { buffer = false } = {}) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: buffer ? null : "utf8",
    maxBuffer
  });
}

function splitZero(value) {
  return value.toString("utf8").split("\0").filter(Boolean);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileDigest(repo, relativePath) {
  const absolutePath = path.join(repo, relativePath);
  if (!existsSync(absolutePath)) {
    return { mode: "deleted", size: 0, sha256: null };
  }
  const stat = lstatSync(absolutePath);
  const content = stat.isSymbolicLink()
    ? Buffer.from(readlinkSync(absolutePath), "utf8")
    : readFileSync(absolutePath);
  return {
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    size: stat.size,
    sha256: sha256(content)
  };
}

function candidatePaths(repo) {
  return {
    tracked: splitZero(git(repo, ["diff", "--name-only", "-z", "HEAD", "--"], { buffer: true })),
    untracked: splitZero(git(repo, ["ls-files", "--others", "--exclude-standard", "-z"], { buffer: true }))
  };
}

function rowsFor(repo, paths = candidatePaths(repo)) {
  return [
    ...paths.tracked.map((relativePath) => ({ category: "tracked_modified", path: relativePath, ...fileDigest(repo, relativePath) })),
    ...paths.untracked.map((relativePath) => ({ category: "untracked", path: relativePath, ...fileDigest(repo, relativePath) }))
  ].sort((left, right) => left.path.localeCompare(right.path));
}

function manifestPayload(rows) {
  return rows.map((row) => [
    row.category,
    row.mode,
    row.size,
    row.sha256 ?? "deleted",
    row.path
  ].join("\t")).join("\n");
}

function snapshot(repo) {
  const paths = candidatePaths(repo);
  const rows = rowsFor(repo, paths);
  const diff = git(repo, ["diff", "--binary", "--full-index", "HEAD", "--"], { buffer: true });
  const status = git(repo, ["status", "--porcelain=v2", "--untracked-files=all", "-z"], { buffer: true });
  const manifest = manifestPayload(rows);
  return {
    head: git(repo, ["rev-parse", "HEAD"]).trim(),
    branch: git(repo, ["branch", "--show-current"]).trim(),
    tracked_modified_count: paths.tracked.length,
    untracked_count: paths.untracked.length,
    status_entry_count: splitZero(status).length,
    diff_sha256: sha256(diff),
    status_sha256: sha256(status),
    manifest_sha256: sha256(manifest),
    working_tree_sha256: sha256(`${sha256(diff)}\n${sha256(status)}\n${sha256(manifest)}`),
    rows
  };
}

function writeEvidence(name, value) {
  mkdirSync(evidenceDir, { recursive: true });
  const filePath = path.join(evidenceDir, name);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
  chmodSync(filePath, 0o644);
}

const first = snapshot(sourceRoot);
await delay(2000);
const second = snapshot(sourceRoot);
if (first.working_tree_sha256 !== second.working_tree_sha256) {
  throw new Error(`source worktree changed during quiescence check: ${first.working_tree_sha256} != ${second.working_tree_sha256}`);
}

const recoveryDir = mkdtempSync(path.join(externalTempRoot, "lawos-root-recovery-20260715."));
chmodSync(recoveryDir, 0o700);
const patchPath = path.join(recoveryDir, "tracked.patch");
const untrackedListPath = path.join(recoveryDir, "untracked-paths.zlist");
const untrackedArchivePath = path.join(recoveryDir, "untracked.tar");
const patch = git(sourceRoot, ["diff", "--binary", "--full-index", "HEAD", "--"], { buffer: true });
const untrackedList = git(sourceRoot, ["ls-files", "--others", "--exclude-standard", "-z"], { buffer: true });
writeFileSync(patchPath, patch);
writeFileSync(untrackedListPath, untrackedList);
chmodSync(patchPath, 0o600);
chmodSync(untrackedListPath, 0o600);
execFileSync("tar", ["--null", "-T", untrackedListPath, "-cf", untrackedArchivePath], {
  cwd: sourceRoot,
  maxBuffer
});
chmodSync(untrackedArchivePath, 0o600);

const restoreParent = mkdtempSync(path.join(externalTempRoot, "lawos-root-restore-20260715."));
const restoreDir = path.join(restoreParent, "worktree");
let worktreeAdded = false;
let restored;
try {
  git(sourceRoot, ["worktree", "add", "--detach", restoreDir, second.head]);
  worktreeAdded = true;
  git(restoreDir, ["apply", "--binary", patchPath]);
  execFileSync("tar", ["-xf", untrackedArchivePath, "-C", restoreDir], { maxBuffer });
  restored = snapshot(restoreDir);
  if (restored.working_tree_sha256 !== second.working_tree_sha256) {
    throw new Error(`restored worktree mismatch: ${restored.working_tree_sha256} != ${second.working_tree_sha256}`);
  }
} finally {
  if (worktreeAdded) {
    git(sourceRoot, ["worktree", "remove", "--force", restoreDir]);
  }
  rmSync(restoreParent, { recursive: true, force: true });
}

const after = snapshot(sourceRoot);
if (after.working_tree_sha256 !== second.working_tree_sha256) {
  throw new Error(`source worktree changed during recovery proof: ${after.working_tree_sha256} != ${second.working_tree_sha256}`);
}

const matchingProcessCount = execFileSync("ps", ["ax", "-o", "command="], { encoding: "utf8" })
  .split("\n")
  .filter((line) => line.includes(sourceRoot) && !line.includes("generate-current-root-recovery-evidence.mjs"))
  .length;
const receipt = {
  tuw: "RC-001",
  verdict: "PASS",
  candidate_entry_sha: git(candidateRoot, ["rev-parse", "HEAD"]).trim(),
  source_root: sourceRoot,
  source_branch: second.branch,
  source_head: second.head,
  tracked_modified_count: second.tracked_modified_count,
  untracked_count: second.untracked_count,
  status_entry_count: second.status_entry_count,
  first_working_tree_sha256: first.working_tree_sha256,
  second_working_tree_sha256: second.working_tree_sha256,
  after_working_tree_sha256: after.working_tree_sha256,
  worktree_stable: true,
  matching_process_count_observed: matchingProcessCount,
  process_adjudication: "A matching process is not treated as a writer when complete pre/post worktree fingerprints remain identical.",
  manifest_sha256: second.manifest_sha256,
  tracked_patch_sha256: sha256(readFileSync(patchPath)),
  untracked_archive_sha256: sha256(readFileSync(untrackedArchivePath)),
  recovery_dir: recoveryDir,
  recovery_directory_mode: "0700",
  recovery_file_mode: "0600",
  restored_working_tree_sha256: restored.working_tree_sha256,
  restore_dry_run: "PASS",
  source_mutation_count: 0,
  external_blockers: []
};

writeEvidence("manifest.tsv", [
  "category\tmode\tsize\tsha256\tpath",
  manifestPayload(second.rows)
].join("\n"));
writeEvidence("receipt.json", receipt);
writeEvidence("acceptance.md", [
  "# RC-001 Acceptance",
  "",
  "- status: DONE",
  `- candidate_entry_sha: \`${receipt.candidate_entry_sha}\``,
  `- source branch and HEAD: \`${receipt.source_branch}\` at \`${receipt.source_head}\``,
  `- tracked modified: ${receipt.tracked_modified_count}`,
  `- untracked: ${receipt.untracked_count}`,
  `- status entries: ${receipt.status_entry_count}`,
  `- working tree SHA-256: \`${receipt.second_working_tree_sha256}\``,
  `- tracked patch SHA-256: \`${receipt.tracked_patch_sha256}\``,
  `- untracked archive SHA-256: \`${receipt.untracked_archive_sha256}\``,
  `- external recovery directory: \`${receipt.recovery_dir}\``,
  "- recovery permissions: directory 0700, files 0600",
  "- detached restore dry-run: PASS",
  "- source mutation count: 0",
  `- matching process count observed: ${receipt.matching_process_count_observed}; full pre/post fingerprints remained identical`,
  "- manual QA: restored checkout reproduced every tracked and untracked path with identical mode, size, and SHA-256",
  "- known limits: recovery content remains outside Git because it may contain user data; repository evidence stores paths, counts, and hashes only",
  "- external blockers: none"
].join("\n"));
writeEvidence("commands.txt", [
  `node scripts/generate-current-root-recovery-evidence.mjs "${sourceRoot}"`,
  "git status --porcelain=v2 --untracked-files=all -z",
  "git diff --binary --full-index HEAD --",
  "git ls-files --others --exclude-standard -z",
  "tar --null -T <untracked-paths.zlist> -cf <untracked.tar>",
  "git worktree add --detach <restore-worktree> <source-head>",
  "git apply --binary <tracked.patch>",
  "tar -xf <untracked.tar> -C <restore-worktree>",
  "compare source and restored status, diff, and path manifest SHA-256",
  "git worktree remove --force <restore-worktree>"
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
