import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

const expectedIds = [
  ...Array.from({ length: 4 }, (_, index) => `WT-00-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `WT-01-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 9 }, (_, index) => `WT-02-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 12 }, (_, index) => `WT-03-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 8 }, (_, index) => `WT-04-${String(index + 1).padStart(2, "0")}`),
];
const expectedSet = new Set(expectedIds);
const idPattern = /WT-\d{2}-\d{2}/g;
const failures = [];

const commits = git("log", "--first-parent", "--reverse", "--format=%H%x09%s")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [hash, ...subjectParts] = line.split("\t");
    return { hash, subject: subjectParts.join("\t"), ids: subjectParts.join("\t").match(idPattern) ?? [] };
  });

const canonicalCommits = commits.filter((commit) => commit.ids.some((id) => expectedSet.has(id)));
for (const id of expectedIds) {
  const matches = canonicalCommits.filter((commit) => commit.ids.includes(id));
  if (matches.length !== 1) {
    failures.push(`${id}: expected exactly one canonical commit, found ${matches.length}`);
    continue;
  }
  const commit = matches[0];
  if (commit.ids.length !== 1) failures.push(`${id}: canonical subject contains multiple TUW IDs`);

  const changedFiles = git("show", "--format=", "--name-only", commit.hash).split("\n").filter(Boolean);
  const foreignEvidence = changedFiles.filter((file) => {
    const match = file.match(/workbook\/matter-worktree-evidence\/(WT-\d{2}-\d{2})\//);
    return match && match[1] !== id;
  });
  if (foreignEvidence.length) failures.push(`${id}: canonical commit touches foreign TUW evidence`);
  if (!changedFiles.some((file) => file.startsWith(`workbook/matter-worktree-evidence/${id}/`))) {
    failures.push(`${id}: canonical commit does not include its evidence directory`);
  }

  const evidenceDir = resolve(root, "workbook", "matter-worktree-evidence", id);
  for (const name of ["acceptance.md", "commands.txt", "tests.txt", "files.txt"]) {
    const file = resolve(evidenceDir, name);
    if (!existsSync(file) || !readFileSync(file, "utf8").trim()) failures.push(`${id}: missing non-empty ${name}`);
  }
  const testsFile = resolve(evidenceDir, "tests.txt");
  if (existsSync(testsFile)) {
    const tests = readFileSync(testsFile, "utf8");
    if (!/RED|실패/i.test(tests)) failures.push(`${id}: tests.txt does not record the RED condition`);
    if (!/GREEN|PASS|Exit:\s*0|종료 코드:\s*0/i.test(tests)) failures.push(`${id}: tests.txt does not record the GREEN result`);
  }
}

if (canonicalCommits.length !== expectedIds.length) {
  failures.push(`expected ${expectedIds.length} canonical commits, found ${canonicalCommits.length}`);
}

const result = {
  status: failures.length ? "failed" : "passed",
  expected_tuw_count: expectedIds.length,
  canonical_commit_count: canonicalCommits.length,
  unique_tuw_count: new Set(canonicalCommits.flatMap((commit) => commit.ids)).size,
  evidence_contract: ["acceptance.md", "commands.txt", "tests.txt", "files.txt"],
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
