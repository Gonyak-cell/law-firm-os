#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { privateStagingPacketSha256, validatePrivateStagingExactHeadPacket } from "./lib/private-staging-exact-head-authority.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function ghJson(args) {
  const text = execFileSync("gh", args, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(text);
}

function privateFile(candidate, name) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const path = realpathSync(input);
  if (!statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) throw new Error(`${name} must be mode 0600`);
  return path;
}

function outputDirectory(candidate) {
  const root = realpathSync(process.cwd());
  const input = resolve(candidate);
  let parent = input;
  while (!existsSync(parent)) parent = dirname(parent);
  const path = resolve(realpathSync(parent), relative(parent, input));
  const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("GitHub evidence must remain outside the worktree");
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("GitHub evidence output cannot be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

function writeEvidence(outputDir, name, value) {
  const path = resolve(outputDir, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

const startedAt = new Date().toISOString();
const sourceSha = git("rev-parse", "HEAD^{commit}");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("GitHub evidence collection requires a clean exact-head worktree");
const packetPath = privateFile(option("--packet"), "exact-head packet");
const packet = JSON.parse(readFileSync(packetPath, "utf8"));
validatePrivateStagingExactHeadPacket(packet, { sourceSha, sourceTree, baseMainSha: git("rev-parse", "origin/main^{commit}"), baseMainTree: git("rev-parse", "origin/main^{tree}") });
const repo = option("--repo");
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repo)) throw new TypeError("--repo must be owner/name");
const prNumber = Number(option("--pr-number"));
if (!Number.isSafeInteger(prNumber) || prNumber < 1) throw new TypeError("--pr-number is invalid");
const pr = ghJson(["pr", "view", String(prNumber), "--repo", repo, "--json", "headRefOid,baseRefName,state,statusCheckRollup,url"]);
if (pr.headRefOid !== sourceSha || pr.baseRefName !== "main" || !["OPEN", "MERGED"].includes(pr.state)) throw new Error("PR is not bound to the exact source head and main base");
const checks = (pr.statusCheckRollup ?? []).map((check) => ({
  name: String(check.name ?? check.context ?? check.workflowName ?? check.__typename ?? "unknown").slice(0, 160),
  conclusion: String(check.conclusion ?? check.state ?? check.status ?? "UNKNOWN").toUpperCase(),
  details_url_sha256: sha256(String(check.detailsUrl ?? check.targetUrl ?? "")),
}));
if (!checks.length || checks.some((check) => check.conclusion !== "SUCCESS")) throw new Error("exact-head CI contains a missing, pending, skipped, neutral, or failed check");
const securityChecks = checks.filter((check) => /(?:codeql|security|sast|secret|dependency|dependabot)/iu.test(check.name));
if (!securityChecks.length) throw new Error("exact-head CI has no identifiable security check");

const [owner, name] = repo.split("/");
const endpoints = {
  code_scanning: `repos/${owner}/${name}/code-scanning/alerts?state=open&per_page=100`,
  secret_scanning: `repos/${owner}/${name}/secret-scanning/alerts?state=open&per_page=100`,
  dependabot: `repos/${owner}/${name}/dependabot/alerts?state=open&per_page=100`,
};
const alerts = Object.fromEntries(Object.entries(endpoints).map(([key, endpoint]) => [key, ghJson(["api", endpoint])]));
const codeCriticalHigh = alerts.code_scanning.filter((alert) => ["critical", "high"].includes(String(alert.rule?.security_severity_level ?? "").toLowerCase())).length;
const dependencyCriticalHigh = alerts.dependabot.filter((alert) => ["critical", "high"].includes(String(alert.security_advisory?.severity ?? "").toLowerCase())).length;
const openSecretCount = alerts.secret_scanning.length;
if (codeCriticalHigh || dependencyCriticalHigh || openSecretCount) throw new Error("GitHub security review has open critical/high code or dependency findings, or open secret alerts");
const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
const outputDir = outputDirectory(option("--output-dir"));
const common = {
  source_sha: sourceSha,
  source_tree: sourceTree,
  artifact_sha256: packet.artifact_sha256,
  packet_sha256: privateStagingPacketSha256(packet),
  pr_number: prNumber,
  pr_url_sha256: sha256(pr.url),
  started_at: startedAt,
  finished_at: finishedAt,
  profile: "github-readonly",
  exit_code: 0,
  real_data_count: 0,
  secret_material_returned: false,
};
const ciPath = writeEvidence(outputDir, `exact-head-ci-${sourceSha}.json`, {
  schema_version: "law-firm-os.private-staging.github-ci-evidence.v1",
  execution_state: "PASS",
  command: `gh pr view ${prNumber} --repo ${repo} --json exact-head-checks`,
  ...common,
  check_count: checks.length,
  success_count: checks.length,
  skipped_count: 0,
  checks,
});
const securityPath = writeEvidence(outputDir, `security-review-${sourceSha}.json`, {
  schema_version: "law-firm-os.private-staging.github-security-evidence.v1",
  execution_state: "PASS",
  command: `gh api ${repo} code-scanning secret-scanning dependabot read-only review`,
  ...common,
  security_check_count: securityChecks.length,
  open_code_critical_high_count: codeCriticalHigh,
  open_dependency_critical_high_count: dependencyCriticalHigh,
  open_secret_alert_count: openSecretCount,
  reviewed_code_alert_count: alerts.code_scanning.length,
  reviewed_dependency_alert_count: alerts.dependabot.length,
});
process.stdout.write(`${JSON.stringify({ verdict: "PASS", ci_evidence_path: ciPath, security_evidence_path: securityPath, exact_head_check_count: checks.length, security_check_count: securityChecks.length, critical_high_count: 0, open_secret_alert_count: 0 }, null, 2)}\n`);
