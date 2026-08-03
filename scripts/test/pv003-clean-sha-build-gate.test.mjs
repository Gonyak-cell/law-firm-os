import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertDesktopFormalBuildProvenance,
  readDesktopBuildSourceIdentity,
} from "../lib/matter-desktop-provenance.mjs";
import {
  FORMAL_PACKAGE_RUNNER,
  FORMAL_PACKAGE_SCRIPT,
  FORMAL_RELEASE_COMPATIBILITY_SCRIPT,
  assertFormalPackageCommandContract,
  readDesktopCommandPackages,
} from "../lib/matter-desktop-formal-command-contract.mjs";

const SOURCE_SHA = "a38a63f8bcc0bedae5d038027cb2de7148cd6129";
const SOURCE_TREE = "3da21d6486a0577abb90a084988de3eb6888a189";
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const VALIDATOR = path.join(REPO_ROOT, "scripts/validate-pv003-clean-sha-build-gate.mjs");
const ENTRYPOINTS = [
  "scripts/build-matter-desktop-mac.mjs",
  "scripts/build-matter-desktop-win.mjs",
  "scripts/build-matter-desktop-win-installer.mjs",
  "scripts/release-matter-desktop-formal.mjs",
];

function identity(overrides = {}) {
  return {
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    sourceBranch: "main",
    ...overrides,
  };
}

function formalGate(overrides = {}) {
  return assertDesktopFormalBuildProvenance({
    releaseChannel: "formal",
    sourceIdentity: identity(),
    expectedSourceSha: SOURCE_SHA,
    ...overrides,
  });
}

function runSourceFixture(source) {
  const root = mkdtempSync(path.join(tmpdir(), "matter-pv003-source-"));
  try {
    for (const relativePath of ENTRYPOINTS) {
      const absolutePath = path.join(root, relativePath);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, source);
    }
    return spawnSync(process.execPath, [VALIDATOR, "--source", "--source-root", root], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const structuralGate = `
import { assertDesktopFormalBuildProvenance as provenanceGate, readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
import { mkdir as makeDirectory } from "node:fs/promises";
const ROOT = process.cwd();
const releaseChannel = "formal";
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
provenanceGate(
  {
    releaseChannel,
    sourceIdentity,
    expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
  },
);
await makeDirectory("dist");
`;

test("PV-003 leaves internal builds outside the formal clean-SHA gate", () => {
  const result = assertDesktopFormalBuildProvenance({
    releaseChannel: "internal",
    sourceIdentity: identity({ sourceDirty: true, sourceBranch: "codex/local-work" }),
  });

  assert.equal(result.enforced, false);
  assert.equal(result.verdict, "NOT_APPLICABLE");
});

test("PV-003 permits clean exact-SHA formal builds only from release-authorized refs", () => {
  for (const sourceBranch of [
    "main",
    "integration/forest-v0.1.17",
    "release/forest-v0.1.17",
    "",
  ]) {
    const result = formalGate({ sourceIdentity: identity({ sourceBranch }) });
    assert.equal(result.enforced, true);
    assert.equal(result.verdict, "PASS");
    assert.equal(result.source_sha, SOURCE_SHA);
    assert.equal(result.source_branch, sourceBranch || "DETACHED");
  }
});

test("PV-003 rejects a dirty formal worktree before artifact generation", () => {
  assert.throws(
    () => formalGate({ sourceIdentity: identity({ sourceDirty: true }) }),
    /formal build blocked: Git worktree is dirty/,
  );
});

test("PV-003 rejects missing, abbreviated, or mismatched expected SHAs", () => {
  assert.throws(
    () => formalGate({ expectedSourceSha: undefined }),
    /MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA/,
  );
  assert.throws(
    () => formalGate({ expectedSourceSha: "a38a63f8" }),
    /MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA/,
  );
  assert.throws(
    () => formalGate({ expectedSourceSha: "0000000000000000000000000000000000000000" }),
    /formal build blocked: HEAD .* does not match expected source SHA/,
  );
});

test("PV-003 rejects formal builds from non-release branches", () => {
  for (const sourceBranch of [
    "codex/forest-v0.1.16-release-20260713",
    "feature/payroll",
    "integration/forest-latest",
    "release/forest-v0.1",
  ]) {
    assert.throws(
      () => formalGate({ sourceIdentity: identity({ sourceBranch }) }),
      new RegExp(`formal build blocked: branch .* is not release-authorized`),
    );
  }
});

test("PV-003 source identity records clean, dirty, branch, and detached states", () => {
  const repo = mkdtempSync(path.join(tmpdir(), "matter-pv003-git-"));
  const git = (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  try {
    git(["init", "-b", "main"]);
    git(["config", "user.name", "Matter Test"]);
    git(["config", "user.email", "matter-test@example.invalid"]);
    const receiptPath = path.join(repo, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md");
    mkdirSync(path.dirname(receiptPath), { recursive: true });
    writeFileSync(path.join(repo, "README.md"), "matter\n");
    writeFileSync(receiptPath, "receipt\n");
    git(["add", "."]);
    git(["commit", "-m", "fixture"]);

    const clean = readDesktopBuildSourceIdentity(repo);
    assert.equal(clean.sourceBranch, "main");
    assert.equal(clean.sourceDirty, false);

    writeFileSync(receiptPath, "generated receipt\n");
    const receiptOnly = readDesktopBuildSourceIdentity(repo);
    assert.equal(receiptOnly.sourceDirty, false);
    assert.deepEqual(receiptOnly.ignoredEvidenceDirtyPaths, [
      "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md",
    ]);

    writeFileSync(path.join(repo, "dirty.txt"), "dirty\n");
    const dirty = readDesktopBuildSourceIdentity(repo);
    assert.equal(dirty.sourceDirty, true);
    assert.deepEqual(dirty.sourceDirtyPaths, ["dirty.txt"]);
    rmSync(path.join(repo, "dirty.txt"));
    git(["checkout", "--", "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md"]);

    git(["checkout", "--detach"]);
    assert.equal(readDesktopBuildSourceIdentity(repo).sourceBranch, "");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("PV-003 CLI accepts an aliased top-level gate before imported filesystem mutation", () => {
  const result = runSourceFixture(structuralGate);
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.formal_bypass_count, 0);
  assert.equal(receipt.structural_contracts.length, ENTRYPOINTS.length);
});

test("PV-003 CLI rejects import-only and unused-string gate decoys", () => {
  for (const source of [
    `
      import { assertDesktopFormalBuildProvenance } from "./lib/matter-desktop-provenance.mjs";
      const expectedSourceSha = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA;
      await mkdir("dist");
    `,
    `
      import { assertDesktopFormalBuildProvenance } from "./lib/matter-desktop-provenance.mjs";
      const decoy = "assertDesktopFormalBuildProvenance({ expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA });";
      await mkdir("dist");
    `,
    `
      import { assertDesktopFormalBuildProvenance } from "./lib/matter-desktop-provenance.mjs";
      const decoy = /assertDesktopFormalBuildProvenance/;
      const expectedShaDecoy = "MATTER_DESKTOP_EXPECTED_SOURCE_SHA";
      await mkdir("dist");
    `,
  ]) {
    const result = runSourceFixture(source);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /top-level formal provenance gate call/);
  }
});

test("PV-003 CLI rejects a filesystem mutation before a real gate", () => {
  const source = structuralGate.replace(
    "provenanceGate(\n",
    "await makeDirectory(\"premature-dist\");\nprovenanceGate(\n",
  );
  const result = runSourceFixture(source);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /mutation(?: binding)? (?:is referenced|appears) before the formal provenance gate/);
});

test("PV-003 CLI rejects a deferred or nested gate that is never executed as preflight", () => {
  const source = structuralGate.replace(
    "provenanceGate(\n",
    "const deferredGate = () => provenanceGate(\n",
  );
  const result = runSourceFixture(source);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /top-level formal provenance gate call/);
});

test("PV-003 CLI rejects computed, re-aliased, and dynamic-import filesystem mutations before the gate", () => {
  const gate = `
    const releaseChannel = "formal";
    const sourceIdentity = {};
    provenanceGate({
      releaseChannel,
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `;
  for (const source of [
    `
      import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
      import * as fs from "node:fs/promises";
      await fs["mkdir"]("premature-dist");
      ${gate}
    `,
    `
      import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
      import { mkdir } from "node:fs/promises";
      const makeDirectory = mkdir;
      await makeDirectory("premature-dist");
      ${gate}
    `,
    `
      import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
      const { mkdir: makeDirectory } = await import("node:fs/promises");
      await makeDirectory("premature-dist");
      ${gate}
    `,
    `
      import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
      const fs = await import("node:fs/promises");
      const method = "mk" + "dir";
      await fs[method]?.("premature-dist");
      ${gate}
    `,
  ]) {
    const result = runSourceFixture(source);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /mutation binding|namespace|unapproved preflight call|optional indirect call/);
  }
});

test("PV-003 CLI rejects filesystem mutation while evaluating gate arguments", () => {
  const result = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
    const releaseChannel = "formal";
    provenanceGate({
      releaseChannel,
      sourceIdentity: (
        process.getBuiltinModule("node:fs")["writeFi" + "leSync"]("premature-artifact", "x"),
        {}
      ),
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unapproved preflight call getBuiltinModule/);
});

test("PV-003 CLI rejects a NOT_APPLICABLE internal gate before artifact mutation", () => {
  const result = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
    import { mkdir as makeDirectory } from "node:fs/promises";
    const releaseChannel = "internal";
    const sourceIdentity = {};
    provenanceGate({
      releaseChannel,
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
    await makeDirectory("post-gate-artifact");
  `);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /formal release channel binding is not canonical/);
});

test("PV-003 CLI binds allowed member calls to their trusted receiver", () => {
  const result = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
    const parser = { parse: process.exit };
    parser.parse(0);
    const releaseChannel = "formal";
    const sourceIdentity = {};
    provenanceGate({
      releaseChannel,
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unapproved preflight call parse/);

  const shadowedGlobal = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
    const JSON = { parse: process.exit };
    JSON.parse(0);
    const releaseChannel = "formal";
    const sourceIdentity = {};
    provenanceGate({
      releaseChannel,
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(shadowedGlobal.status, 0);
  assert.match(shadowedGlobal.stderr, /unapproved preflight call parse/);

  const computedGlobal = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
    globalThis["JSON"].parse = process.exit;
    JSON.parse(0);
    const releaseChannel = "formal";
    const sourceIdentity = {};
    provenanceGate({
      releaseChannel,
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(computedGlobal.status, 0);
  assert.match(computedGlobal.stderr, /non-declaration assignment/);
});

test("PV-003 CLI rejects duplicate channel keys and fabricated source identity", () => {
  const duplicateChannel = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate, readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
    const ROOT = process.cwd();
    const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
    provenanceGate({
      releaseChannel: "formal",
      releaseChannel: "internal",
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(duplicateChannel.status, 0);
  assert.match(duplicateChannel.stderr, /formal release channel binding is not canonical/);

  const duplicateExpectedSha = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate, readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
    const ROOT = process.cwd();
    const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
    provenanceGate({
      releaseChannel: "formal",
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
      expectedSourceSha: readDesktopBuildSourceIdentity(ROOT).sourceSha,
    });
  `);
  assert.notEqual(duplicateExpectedSha.status, 0);
  assert.match(duplicateExpectedSha.stderr, /top-level formal provenance gate call; found 0/);

  const fabricatedIdentity = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs";
    const sourceIdentity = {
      sourceDirty: false,
      sourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
      sourceBranch: "main",
    };
    provenanceGate({
      releaseChannel: "formal",
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(fabricatedIdentity.status, 0);
  assert.match(fabricatedIdentity.stderr, /source identity is not read from the canonical Git root/);

  const escapedDuplicateChannel = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate, readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
    const ROOT = process.cwd();
    const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
    provenanceGate({
      releaseChannel: "formal",
      release\\u0043hannel: "internal",
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(escapedDuplicateChannel.status, 0);
  assert.match(escapedDuplicateChannel.stderr, /escaped code identifiers are not allowed/);

  const escapedStringDuplicate = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate, readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
    const ROOT = process.cwd();
    const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
    provenanceGate({
      releaseChannel: "formal",
      "release\\u0043hannel": "internal",
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(escapedStringDuplicate.status, 0);
  assert.match(escapedStringDuplicate.stderr, /formal release channel binding is not canonical/);

  const wrongRootDecoy = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate, readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
    import { dirname, resolve } from "node:path";
    import { fileURLToPath } from "node:url";
    const scriptDir = "/tmp/attacker/scripts";
    { const scriptDir = dirname(fileURLToPath(import.meta.url)); }
    const repoRoot = resolve(scriptDir, "..");
    const sourceIdentity = readDesktopBuildSourceIdentity(repoRoot);
    provenanceGate({
      releaseChannel: "formal",
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(wrongRootDecoy.status, 0);
  assert.match(wrongRootDecoy.stderr, /source identity is not read from the canonical Git root/);
});

test("PV-003 CLI rejects semicolon-less imports that could swallow executable preflight tokens", () => {
  const result = runSourceFixture(`
    import { assertDesktopFormalBuildProvenance as provenanceGate } from "./lib/matter-desktop-provenance.mjs"
    import { mkdir as makeDirectory } from "node:fs/promises";
    await makeDirectory("premature-dist");
    const releaseChannel = "formal";
    const sourceIdentity = {};
    provenanceGate({
      releaseChannel,
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /static imports must terminate with a semicolon/);

  const sideEffectImport = runSourceFixture(`
    import "./mutating-module.mjs"
    import { assertDesktopFormalBuildProvenance as provenanceGate, readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
    const ROOT = process.cwd();
    const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
    provenanceGate({
      releaseChannel: "formal",
      sourceIdentity,
      expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    });
  `);
  assert.notEqual(sideEffectImport.status, 0);
  assert.match(sideEffectImport.stderr, /side-effect-only imports are not allowed/);
});

test("PV-003 CLI rejects re-exports and every untrusted import-time side-effect path", () => {
  for (const declaration of [
    'export * from "./preflight-side-effect.mjs";',
    'export { marker } from "./preflight-side-effect.mjs";',
  ]) {
    const result = runSourceFixture(`${declaration}\n${structuralGate}`);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /re-export-from declarations are not allowed/);
  }

  const importOnly = runSourceFixture(`import "./preflight-side-effect.mjs";\n${structuralGate}`);
  assert.notEqual(importOnly.status, 0);
  assert.match(importOnly.stderr, /side-effect-only imports are not allowed/);

  const dynamicImport = runSourceFixture(structuralGate.replace(
    "provenanceGate(\n",
    'await import("./preflight-side-effect.mjs");\nprovenanceGate(\n',
  ));
  assert.notEqual(dynamicImport.status, 0);
  assert.match(dynamicImport.stderr, /untrusted dynamic import before formal preflight/);

  const unknownLocalImport = runSourceFixture(`
    import { marker } from "./preflight-side-effect.mjs";
    ${structuralGate}
  `);
  assert.notEqual(unknownLocalImport.status, 0);
  assert.match(unknownLocalImport.stderr, /untrusted static import before formal preflight/);

  const unexpectedTrustedBinding = runSourceFixture(`
    import { unexpectedBinding } from "./lib/matter-desktop-provenance.mjs";
    ${structuralGate}
  `);
  assert.notEqual(unexpectedTrustedBinding.status, 0);
  assert.match(unexpectedTrustedBinding.stderr, /unexpected local import binding before formal preflight/);
});

test("PV-003 structured formal package plan gates the current source before builders", () => {
  const packages = readDesktopCommandPackages(REPO_ROOT);
  const contract = assertFormalPackageCommandContract(packages);
  assert.equal(packages.rootScripts[FORMAL_PACKAGE_SCRIPT], FORMAL_PACKAGE_RUNNER);
  assert.equal(packages.rootScripts[FORMAL_RELEASE_COMPATIBILITY_SCRIPT], `npm run ${FORMAL_PACKAGE_SCRIPT}`);
  const gateIndex = contract.plan.findIndex(({ id }) => id === "pv003-current-source");
  const macIndex = contract.plan.findIndex(({ id }) => id === "build-macos");
  assert.equal(gateIndex, 0);
  assert.ok(gateIndex < macIndex);
  assert.deepEqual(contract.plan[gateIndex].argv.slice(1), [
    "scripts/validate-pv003-clean-sha-build-gate.mjs",
    "--current",
  ]);
  assert.equal(contract.planValidation.stage_index < contract.planValidation.pv005_package_index, true);
  assert.equal(contract.planValidation.pv005_package_index < contract.planValidation.release_index, true);
});
