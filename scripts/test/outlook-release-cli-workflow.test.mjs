import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFile, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertRecordedCommands, createCommandRunner, exactGitIdentity, trackedGitPaths,
} from "../lib/outlook-release/cli-runtime.mjs";
import { contract, contractRef, repoRoot } from "./helpers/outlook-release-fixtures.mjs";

function workflowEventPaths(source, eventName) {
  const lines = source.split(/\r?\n/u);
  const start = lines.findIndex((line) => line === `  ${eventName}:`);
  if (start < 0) throw new Error(`workflow event is missing: ${eventName}`);
  const end = lines.findIndex((line, index) => index > start && /^  [a-z_]+:/u.test(line));
  const section = lines.slice(start, end < 0 ? undefined : end);
  const paths = section.findIndex((line) => line === "    paths:");
  if (paths < 0) throw new Error(`workflow paths are missing: ${eventName}`);
  return section.slice(paths + 1).map((line) => line.match(/^      - "([^"]+)"$/u)?.[1]).filter(Boolean);
}

function workflowPathMatches(pattern, candidate) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] === "*" && pattern[index + 1] === "*") {
      expression += ".*";
      index += 1;
    } else if (pattern[index] === "*") expression += "[^/]*";
    else expression += pattern[index].replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  }
  return new RegExp(`${expression}$`, "u").test(candidate);
}

function workflowRuns(source) {
  return source.split(/\r?\n/u).map((line) => line.match(/^        run: (.+)$/u)?.[1]).filter(Boolean);
}

test("exact Git identity behavior rejects tracked and untracked dirt in a real temporary repository", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "amic-outlook-git-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const run = createCommandRunner({ cwd: root, allowedCommands: ["git"] });
  run("git", ["init", "-q"]);
  run("git", ["config", "user.email", "release-gate@amic.internal"]);
  run("git", ["config", "user.name", "AMIC Release Gate"]);
  await writeFile(path.join(root, "tracked.txt"), "one\n");
  run("git", ["add", "tracked.txt"]);
  run("git", ["commit", "-qm", "fixture"]);
  const head = String(run("git", ["rev-parse", "HEAD"])).trim();
  assert.equal(exactGitIdentity({ expectedSourceSha: head, runCommand: run }).sourceSha, head);
  await writeFile(path.join(root, "untracked.txt"), "untracked\n");
  assert.throws(() => exactGitIdentity({ expectedSourceSha: head, runCommand: run }), /worktree changes/);
  await rm(path.join(root, "untracked.txt"));
  await appendFile(path.join(root, "tracked.txt"), "changed\n");
  assert.throws(() => exactGitIdentity({ expectedSourceSha: head, runCommand: run }), /worktree changes/);
});

test("release coverage accepts only regular tracked Git files", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "amic-outlook-git-mode-"));
  const externalRoot = await mkdtemp(path.join(os.tmpdir(), "amic-outlook-git-external-"));
  t.after(() => Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(externalRoot, { recursive: true, force: true }),
  ]));
  const run = createCommandRunner({ cwd: root, allowedCommands: ["git"] });
  run("git", ["init", "-q"]);
  run("git", ["config", "user.email", "release-gate@amic.internal"]);
  run("git", ["config", "user.name", "AMIC Release Gate"]);
  await writeFile(path.join(root, "regular.txt"), "regular\n");
  const externalPath = path.join(externalRoot, "external.js");
  await writeFile(externalPath, "export const value = 'one';\n");
  await symlink(externalPath, path.join(root, "required.js"));
  run("git", ["add", "regular.txt", "required.js"]);
  run("git", ["commit", "-qm", "fixture"]);
  const head = String(run("git", ["rev-parse", "HEAD"])).trim();
  const tree = exactGitIdentity({ expectedSourceSha: head, runCommand: run }).sourceTree;
  assert.deepEqual([...trackedGitPaths(run)].sort(), ["regular.txt"]);
  await writeFile(externalPath, "export const value = 'two';\n");
  assert.deepEqual(exactGitIdentity({ expectedSourceSha: head, runCommand: run }), {
    sourceSha: head,
    sourceTree: tree,
  });
  assert.deepEqual([...trackedGitPaths(run)].sort(), ["regular.txt"]);
});

test("recording command runner observes only fail-closed Git reads", () => {
  const calls = [];
  const responses = new Map([
    ["rev-parse HEAD", "a".repeat(40)],
    ["rev-parse HEAD^{tree}", "b".repeat(40)],
    ["status --porcelain=v1 --untracked-files=all", ""],
  ]);
  const run = createCommandRunner({
    cwd: "/recording-fixture",
    allowedCommands: ["git"],
    record: (call) => calls.push(call),
    execute: (command, args) => {
      if (command !== "git") throw new Error(`provider command attempted: ${command}`);
      return responses.get(args.join(" "));
    },
  });
  assert.deepEqual(exactGitIdentity({ expectedSourceSha: "a".repeat(40), runCommand: run }), {
    sourceSha: "a".repeat(40), sourceTree: "b".repeat(40),
  });
  assert.deepEqual(assertRecordedCommands(calls, ["git"]), { call_count: 3, commands: ["git"] });
  assert.deepEqual(calls.map(({ args }) => args), [
    ["rev-parse", "HEAD"], ["rev-parse", "HEAD^{tree}"],
    ["status", "--porcelain=v1", "--untracked-files=all"],
  ]);
  assert.throws(() => run("aws", ["s3", "sync"]), /unexpected command/);
  assert.throws(() => assertRecordedCommands(calls.concat({ command: "aws", args: ["s3", "sync"] }), ["git"]), /unexpected command/);
});

test("API verifier requires its candidate manifest and CA bundle before repository commands", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "amic-outlook-api-options-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifact = path.join(root, "candidate.zip");
  const artifactManifest = path.join(root, "candidate.manifest.json");
  await writeFile(artifact, "candidate");
  await writeFile(artifactManifest, "{}");
  const verifier = path.join(repoRoot, "scripts/verify-outlook-api-release-artifact.mjs");
  const missingManifest = spawnSync(process.execPath, [verifier, "--artifact", artifact], {
    cwd: repoRoot, encoding: "utf8",
  });
  assert.equal(missingManifest.status, 1);
  assert.match(missingManifest.stderr, /--artifact-manifest is required/u);

  const missingCa = spawnSync(process.execPath, [
    verifier, "--artifact", artifact, "--artifact-manifest", artifactManifest,
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(missingCa.status, 1);
  assert.match(missingCa.stderr, /--rds-ca-bundle is required/u);
  assert.doesNotMatch(`${missingManifest.stderr}${missingCa.stderr}`, /worktree changes|producer build/u);
});

test("CI selects every release lane and explicitly executes UPL and focused tests", async () => {
  const [workflow, aggregator] = await Promise.all([
    readFile(path.join(repoRoot, ".github/workflows/outlook-addin-validation.yml"), "utf8"),
    readFile(path.join(repoRoot, "scripts/test/outlook-release-gates.test.mjs"), "utf8"),
  ]);
  const aggregatorImports = [...aggregator.matchAll(/^import "([^"]+)";$/gmu)].map((match) => match[1]);
  for (const regression of [
    "./outlook-release-m365-temporal.test.mjs",
    "./outlook-release-profile-artifacts.test.mjs",
    "./outlook-release-api-artifact-provenance.test.mjs",
    "./outlook-release-api-artifact-orchestration.test.mjs",
  ]) {
    assert.equal(aggregatorImports.filter((entry) => entry === regression).length, 1, `${regression} must be imported exactly once`);
  }
  assert.equal(new Set(aggregatorImports).size, aggregatorImports.length, "release aggregator imports must not repeat tests");
  const requiredPaths = [
    ...contract.required_release_paths, ...contract.required_test_paths, ...contract.manifests,
    contractRef, contract.baseline_receipt, contract.rollback_contract, contract.surface_contract,
    ".github/workflows/outlook-addin-validation.yml", "contracts/migration-platform-contract.json",
    "package-lock.json", "packages/dms/src/migrations/001_dms_vault_runtime.sql",
    "packages/email-dms/src/migrations/003_email_filing_correction.sql",
    "packages/matter/src/migrations/005_people_task_fields.sql", "packages/migration/src/import-plan.js",
    "packages/persistence/src/postgres/migrations/004_dms_upload_runtime.sql",
    "packages/platform/migrations/001_matter_vault_core.sql", "scripts/lib/outlook-release/m365.mjs",
    "scripts/lib/outlook-release-gates.mjs", "scripts/plan-outlook-static-deploy.mjs",
    "scripts/test/outlook-release-m365.test.mjs", "scripts/test/outlook-release-gates.test.mjs",
    "scripts/validate-outlook-m365-release-receipt.mjs", "scripts/validate-outlook-release-candidate.mjs",
    "scripts/validate-upl-c09-c12-outlook-addin.mjs", "scripts/verify-outlook-api-release-artifact.mjs",
  ];
  for (const eventName of ["pull_request", "push"]) {
    const patterns = workflowEventPaths(workflow, eventName);
    for (const requiredPath of requiredPaths) {
      assert.ok(patterns.some((pattern) => workflowPathMatches(pattern, requiredPath)), `${eventName} does not select ${requiredPath}`);
    }
  }
  const runs = workflowRuns(workflow);
  assert.ok(
    runs.includes("npm --workspace apps/addin run build && node --test --test-concurrency=1 apps/addin/test/*.test.js"),
    "CI must build the clean checkout and serialize Add-in browser tests",
  );
  assert.deepEqual(
    runs.filter((run) => /^node --test .*outlook-release/u.test(run)),
    ["node --test scripts/test/outlook-release-*.test.mjs"],
  );
  const focusedStart = workflow.indexOf("      - name: Final Outlook API, Matter replay, and DocuSign hardening tests");
  const focusedEnd = workflow.indexOf("      - name: Email DMS provider and filing tests", focusedStart);
  assert.ok(focusedStart >= 0 && focusedEnd > focusedStart, "final focused API/Matter/DocuSign step is required");
  const focusedStep = workflow.slice(focusedStart, focusedEnd);
  assert.match(focusedStep, /--test-concurrency=1/u);
  for (const focusedPath of [
    "apps/api/test/outlook-conversation-policy-api.test.js",
    "apps/api/test/outlook-conversation-policy-status-api.test.js",
    "apps/api/test/outlook-document-api.test.js",
    "apps/api/test/outlook-email-filing-correction-response-binding.test.js",
    "apps/api/test/outlook-inquiry-registration-service.test.js",
    "apps/api/test/outm32-approval-publication-replay-api.test.js",
    "apps/api/test/outm32-document-builder-api.test.js",
    "apps/api/test/outm32-generic-actor-replay-api.test.js",
    "packages/matter/test/document-builder-approval.test.js",
    "packages/matter/test/document-builder-postgres-reconciliation.test.js",
    "packages/matter/test/document-builder-publication.test.js",
    "packages/integrations-core/test/docusign-outm33-34-hardening.test.js",
  ]) {
    assert.match(focusedStep, new RegExp(`\\n          ${focusedPath.replaceAll(".", "\\.")}\\n`, "u"), `${focusedPath} must run in the serialized focused step`);
  }
  const vaultStart = workflow.indexOf("      - name: Vault immutable precedent target tests");
  const vaultEnd = workflow.indexOf("      - name: Web production build", vaultStart);
  assert.ok(vaultStart >= 0 && vaultEnd > vaultStart, "Vault immutable precedent target step is required");
  const vaultStep = workflow.slice(vaultStart, vaultEnd);
  for (const vaultPath of [
    "apps/api/test/cmp-r4-g5-vault.test.js",
    "apps/api/test/outlook-precedent-api.test.js",
    "apps/web/test/search-preferences.test.mjs",
    "packages/dms/test/postgres-precedent-lifecycle.test.js",
  ]) {
    assert.match(vaultStep, new RegExp(`\\n          ${vaultPath.replaceAll(".", "\\.")}\\n`, "u"), `${vaultPath} must run in the serialized Vault step`);
  }
  assert.ok(runs.includes("npm --workspace apps/web run build"), "CI must build the immutable Vault receiver");
  assert.ok(runs.includes("npx --no-install playwright install --with-deps chromium"), "CI must install Chromium after npm ci --ignore-scripts");
  assert.ok(runs.includes("node scripts/validate-upl-c09-c12-outlook-addin.mjs"));
  assert.ok(runs.includes("node --test scripts/test/outlook-release-*.test.mjs"));
  assert.ok(runs.some((run) => run.startsWith("node scripts/validate-outlook-release-candidate.mjs --source-sha")));
  for (const manifest of contract.manifests) {
    assert.match(workflow, new RegExp(`office-addin-manifest@2\\.1\\.6 validate ${manifest.replaceAll(".", "\\.")}`));
  }
});
