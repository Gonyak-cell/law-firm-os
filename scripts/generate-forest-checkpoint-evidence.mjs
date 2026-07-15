import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(root) !== path.resolve(process.cwd())) {
  throw new Error(`run from repository root: ${root}`);
}

const evidenceRoot = path.join(root, "workbook/forest-v0.1.17-integration-evidence");
const expectedHead = "7717d5cee158fc97056510e8aebc9e0854d34196";
const originalCounts = { tracked_modified: 115, untracked_files: 92 };
const intentionalAdditions = new Set([
  "scripts/generate-forest-checkpoint-evidence.mjs",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md"
]);
const approvedIdentityPaths = new Set([
  "apps/api/test/hrx-runtime-api.test.js",
  "apps/api/test/hrx/route-authz.test.js",
  "apps/api/test/profile-api.test.js",
  "apps/desktop/test/aws-runtime-client.test.mjs",
  "apps/web/test/home-dashboard-r1.test.mjs",
  "docs/lazycodex/evidence/matter-desktop/artifacts/leave-management-package-qa.json",
  "packages/hrx/test/golden-fixture.test.js",
  "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md"
]);
const approvedSyntheticBankPaths = new Set([
  "packages/hrx/test/payroll-payment-service.test.js"
]);
const syntheticEmailDomains = new Set(["example.test", "example.com", "matter.local"]);

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: options.encoding ?? "utf8",
    maxBuffer: 128 * 1024 * 1024
  });
}

function splitZero(value) {
  return value.split("\0").filter(Boolean);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileDigest(relativePath) {
  const absolutePath = path.join(root, relativePath);
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

function candidatePaths({ includeEvidence = false } = {}) {
  const tracked = splitZero(git(["diff", "--name-only", "-z", "HEAD", "--"]));
  const untracked = splitZero(git(["ls-files", "--others", "--exclude-standard", "-z"]))
    .filter((relativePath) => includeEvidence || !relativePath.startsWith("workbook/forest-v0.1.17-integration-evidence/"));
  return { tracked, untracked };
}

function manifestRows(options) {
  const { tracked, untracked } = candidatePaths(options);
  return [
    ...tracked.map((relativePath) => ({ category: "tracked_modified", path: relativePath, ...fileDigest(relativePath) })),
    ...untracked.map((relativePath) => ({ category: "untracked", path: relativePath, ...fileDigest(relativePath) }))
  ].sort((left, right) => left.path.localeCompare(right.path));
}

function snapshot() {
  const rows = manifestRows();
  const diff = git(["diff", "--binary", "--no-ext-diff", "HEAD", "--"]);
  const payload = rows.map((row) => [row.category, row.mode, row.size, row.sha256, row.path].join("\t")).join("\n");
  return {
    head: git(["rev-parse", "HEAD"]).trim(),
    status_sha256: sha256(git(["status", "--porcelain=v2", "--untracked-files=all", "-z"])),
    diff_sha256: sha256(diff),
    manifest_sha256: sha256(payload),
    working_tree_sha256: sha256(`${sha256(diff)}\n${sha256(payload)}`),
    rows
  };
}

function write(relativePath, value) {
  const absolutePath = path.join(evidenceRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
  chmodSync(absolutePath, 0o644);
}

function writeJson(relativePath, value) {
  write(relativePath, JSON.stringify(value, null, 2));
}

if (process.argv[2] === "--record-recovery") {
  const [recoveryDir, patchSha256, untrackedArchiveSha256, sourceTree, restoredTree, untrackedCount] = process.argv.slice(3);
  if (!recoveryDir || !patchSha256 || !untrackedArchiveSha256 || !sourceTree || !restoredTree || !untrackedCount) {
    throw new Error("usage: --record-recovery DIR PATCH_SHA ARCHIVE_SHA SOURCE_TREE RESTORED_TREE UNTRACKED_COUNT");
  }
  if (sourceTree !== restoredTree) {
    throw new Error(`restore tree mismatch: source=${sourceTree}, restored=${restoredTree}`);
  }
  const receipt = {
    tuw: "FZ-004",
    verdict: "PASS",
    entry_sha: git(["rev-parse", "HEAD"]).trim(),
    recovery_dir: recoveryDir,
    tracked_patch_sha256: patchSha256,
    untracked_archive_sha256: untrackedArchiveSha256,
    untracked_archive_file_count: Number(untrackedCount),
    source_tree_oid: sourceTree,
    restored_tree_oid: restoredTree,
    restore_dry_run: "PASS",
    archive_branch: "archive/forest-session-final-20260715 (created after checkpoint commit)"
  };
  writeJson("FZ-004/receipt.json", receipt);
  write("FZ-004/commands.txt", [
    "git diff --binary --full-index --output=<recovery>/tracked.patch HEAD --",
    "git ls-files --others --exclude-standard -z",
    "tar --null -T <untracked-list> -cf <recovery>/untracked.tar",
    "git worktree add --detach <restore-worktree> <entry-sha>",
    "git apply --binary <recovery>/tracked.patch",
    "tar -xf <recovery>/untracked.tar",
    "git write-tree"
  ].join("\n"));
  write("FZ-004/acceptance.md", [
    "# FZ-004 Acceptance",
    "",
    "- status: DONE",
    `- entry_sha: ${receipt.entry_sha}`,
    `- tracked_patch_sha256: ${patchSha256}`,
    `- untracked_archive_sha256: ${untrackedArchiveSha256}`,
    `- untracked_archive_file_count: ${untrackedCount}`,
    `- restored_tree_oid: ${restoredTree}`,
    "- restore dry-run: PASS",
    "- archive branch: pending FZ-005 checkpoint commit",
    "- external_blockers: none"
  ].join("\n"));
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}

function lineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function scanCandidate(rows) {
  const secretRules = [
    ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
    ["aws-access-key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
    ["github-token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
    ["openai-key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
    ["slack-token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
    ["google-api-key", /\bAIza[0-9A-Za-z_-]{30,}\b/g],
    ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
    ["url-userinfo", /https?:\/\/[^/\s:@]+:[^/\s@]+@/g]
  ];
  const piiRules = [
    ["korean-phone", /\b01[016789]-\d{3,4}-\d{4}\b/g],
    ["resident-registration-number", /\b\d{6}-[1-4]\d{6}\b/g],
    ["literal-bank-account", /(?:account_number|bank_account|계좌)[^\n]{0,40}["']?\d{10,16}["']?/gi]
  ];
  const forbiddenPath = /(^|\/)(?:\.env(?:\.|$)|node_modules|dist|coverage|\.cache|playwright-report|test-results|browser-profile|user-data|runtime-store)(?:\/|$)|\.(?:pem|p12|pfx|key|sqlite|sqlite3|db|har)$/i;
  const violations = [];
  const approved = [];
  const binaries = [];

  for (const row of rows) {
    if (row.mode === "deleted") continue;
    if (forbiddenPath.test(row.path)) {
      violations.push({ path: row.path, line: null, rule: "forbidden-artifact-path" });
      continue;
    }
    const bytes = readFileSync(path.join(root, row.path));
    if (bytes.includes(0)) {
      binaries.push({ path: row.path, size: row.size, sha256: row.sha256 });
      continue;
    }
    const content = bytes.toString("utf8");
    for (const [rule, pattern] of secretRules) {
      pattern.lastIndex = 0;
      for (const match of content.matchAll(pattern)) {
        violations.push({ path: row.path, line: lineNumber(content, match.index), rule });
      }
    }
    for (const [rule, pattern] of piiRules) {
      pattern.lastIndex = 0;
      for (const match of content.matchAll(pattern)) {
        const finding = { path: row.path, line: lineNumber(content, match.index), rule };
        if (rule === "literal-bank-account" && approvedSyntheticBankPaths.has(row.path)) {
          approved.push({ ...finding, classification: "synthetic-bank-test-fixture" });
        } else {
          violations.push(finding);
        }
      }
    }
    const emailPattern = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
    for (const match of content.matchAll(emailPattern)) {
      const domain = match[1].toLowerCase();
      const finding = { path: row.path, line: lineNumber(content, match.index), rule: "email", domain };
      if (syntheticEmailDomains.has(domain)) {
        approved.push({ ...finding, classification: "synthetic" });
      } else if (domain === "amic.kr" && approvedIdentityPaths.has(row.path)) {
        approved.push({ ...finding, classification: "user-approved-identity-contract" });
      } else {
        violations.push(finding);
      }
    }
  }
  return { violations, approved, binaries };
}

if (process.argv[2] === "--final-scan") {
  const rows = manifestRows({ includeEvidence: true });
  const scan = scanCandidate(rows);
  const receipt = {
    tuw: "FZ-005",
    phase: "precommit-security-scan",
    verdict: scan.violations.length === 0 ? "PASS" : "FAIL",
    entry_sha: git(["rev-parse", "HEAD"]).trim(),
    scanned_files: rows.length,
    secret_or_unapproved_pii_findings: scan.violations.length,
    findings: scan.violations,
    approved_match_count: scan.approved.length,
    approved_matches: scan.approved,
    binary_files: scan.binaries
  };
  writeJson("FZ-005/precommit-security-scan.json", receipt);
  console.log(JSON.stringify(receipt, null, 2));
  if (scan.violations.length > 0) process.exit(1);
  process.exit(0);
}

const first = snapshot();
if (first.head !== expectedHead) {
  throw new Error(`unexpected entry HEAD: ${first.head}`);
}
const writerLines = execFileSync("ps", ["ax", "-o", "pid=,ppid=,etime=,command="], { encoding: "utf8" })
  .split("\n")
  .filter((line) => line.includes(root) && !line.includes("generate-forest-checkpoint-evidence.mjs"));
await delay(2000);
const second = snapshot();
const stable = first.working_tree_sha256 === second.working_tree_sha256;
if (!stable || writerLines.length > 0) {
  throw new Error(`worktree not quiescent: stable=${stable}, writers=${writerLines.length}`);
}

const trackedCount = second.rows.filter((row) => row.category === "tracked_modified").length;
const untrackedRows = second.rows.filter((row) => row.category === "untracked");
const additionalUntracked = untrackedRows
  .map((row) => row.path)
  .filter((relativePath) => !intentionalAdditions.has(relativePath));
const countsMatch = trackedCount === originalCounts.tracked_modified
  && untrackedRows.length === originalCounts.untracked_files + intentionalAdditions.size
  && additionalUntracked.length === originalCounts.untracked_files;
if (!countsMatch) {
  throw new Error(`unexpected candidate counts: tracked=${trackedCount}, untracked=${untrackedRows.length}`);
}

const scan = scanCandidate(second.rows);
if (scan.violations.length > 0) {
  writeJson("FZ-003/security-scan.json", {
    verdict: "FAIL",
    scanned_files: second.rows.length,
    violation_count: scan.violations.length,
    findings: scan.violations,
    approved_match_count: scan.approved.length,
    approved_matches: scan.approved,
    binary_files: scan.binaries
  });
  throw new Error(`candidate security scan failed: ${scan.violations.length} finding(s)`);
}

writeJson("FZ-001/receipt.json", {
  tuw: "FZ-001",
  verdict: "PASS",
  entry_sha: second.head,
  first_working_tree_sha256: first.working_tree_sha256,
  second_working_tree_sha256: second.working_tree_sha256,
  interval_ms: 2000,
  changed_between_measurements: false,
  writer_process_count: 0
});
write("FZ-001/commands.txt", [
  "node scripts/generate-forest-checkpoint-evidence.mjs",
  "git status --porcelain=v2 --untracked-files=all -z",
  "git diff --binary --no-ext-diff HEAD --",
  "git ls-files --others --exclude-standard -z",
  "ps ax -o pid=,ppid=,etime=,command="
].join("\n"));
write("FZ-001/acceptance.md", [
  "# FZ-001 Acceptance",
  "",
  "- status: DONE",
  `- entry_sha: ${second.head}`,
  `- working_tree_sha256: ${second.working_tree_sha256}`,
  "- two measurements separated by 2000 ms: identical",
  "- writer processes targeting this worktree: 0",
  "- external_blockers: none"
].join("\n"));

const manifestHeader = "category\tmode\tsize\tsha256\tpath";
const manifestBody = second.rows.map((row) => [row.category, row.mode, row.size, row.sha256 ?? "-", row.path].join("\t"));
write("FZ-002/manifest.tsv", [manifestHeader, ...manifestBody].join("\n"));
writeJson("FZ-002/receipt.json", {
  tuw: "FZ-002",
  verdict: "PASS",
  entry_sha: second.head,
  tracked_modified: trackedCount,
  original_untracked_files: originalCounts.untracked_files,
  intentional_additions: [...intentionalAdditions].sort(),
  observed_untracked_files: untrackedRows.length,
  total_manifest_rows: second.rows.length,
  status_sha256: second.status_sha256,
  diff_sha256: second.diff_sha256,
  manifest_sha256: second.manifest_sha256,
  working_tree_sha256: second.working_tree_sha256
});
write("FZ-002/acceptance.md", [
  "# FZ-002 Acceptance",
  "",
  "- status: DONE",
  `- tracked_modified: ${trackedCount}`,
  `- untracked_files: ${untrackedRows.length} (original ${originalCounts.untracked_files} + Goal plan + evidence generator)`,
  `- manifest_rows: ${second.rows.length}`,
  `- manifest_sha256: ${second.manifest_sha256}`,
  "- external_blockers: none"
].join("\n"));

writeJson("FZ-003/security-scan.json", {
  tuw: "FZ-003",
  verdict: "PASS",
  scanned_files: second.rows.length,
  secret_or_unapproved_pii_findings: 0,
  approved_match_count: scan.approved.length,
  approved_matches: scan.approved,
  binary_files: scan.binaries,
  note: "Findings record path, rule, line, and domain only; matched values are never copied into evidence."
});
write("FZ-003/acceptance.md", [
  "# FZ-003 Acceptance",
  "",
  "- status: DONE",
  `- scanned_files: ${second.rows.length}`,
  "- secret findings: 0",
  "- unapproved PII findings: 0",
  "- forbidden runtime/generated artifact paths: 0",
  `- approved synthetic or explicit identity-contract matches: ${scan.approved.length}`,
  "- external_blockers: none"
].join("\n"));
write("FZ-003/commands.txt", "node scripts/generate-forest-checkpoint-evidence.mjs");

console.log(JSON.stringify({
  verdict: "PASS",
  head: second.head,
  working_tree_sha256: second.working_tree_sha256,
  tracked_modified: trackedCount,
  untracked_files: untrackedRows.length,
  scanned_files: second.rows.length,
  approved_identity_or_synthetic_matches: scan.approved.length,
  binary_files: scan.binaries.length
}, null, 2));
