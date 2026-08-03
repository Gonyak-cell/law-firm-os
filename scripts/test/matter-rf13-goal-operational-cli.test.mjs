import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  RF13_GOAL_OPERATIONAL_INPUT_SCHEMA,
} from "../lib/matter-rf13-goal-operational-authority.mjs";
import { runCli } from "../validate-matter-rf13-debt-remediation-goal.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const NODE22 = "/opt/homebrew/opt/node@22/bin/node";
const SCRIPT_RELATIVE = "scripts/validate-matter-rf13-debt-remediation-goal.mjs";
const RUNNER_RELATIVE = "scripts/internal/run-matter-rf13-debt-remediation-goal.mjs";
const WRAPPER_RELATIVE = "scripts/run-matter-rf13-debt-remediation-goal.sh";
const PLAN_RELATIVE = "workbook/matter-rf13-maintenance-debt-remediation-plan-2026-07-31.md";
const EXTERNAL_KEYS = Object.freeze([
  "trust_registry_path",
  "web_full_attestation_receipt_path",
  "web_full_attestation_signature_path",
  "profile_measurement_attestation_packet_path",
  "profile_measurement_attestation_receipt_path",
  "profile_measurement_attestation_signature_path",
  "profile_operation_attestation_receipt_path",
  "profile_operation_attestation_signature_path",
  "profile_decision_attestation_receipt_path",
  "profile_decision_attestation_signature_path",
]);

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function writeOwnerOnly(target, bytes) {
  mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  chmodSync(path.dirname(target), 0o700);
  writeFileSync(target, bytes, { mode: 0o600 });
  chmodSync(target, 0o600);
  return target;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function copyStaticModuleClosure(destinationRoot, entrypoints) {
  const pending = [...entrypoints];
  const copied = new Set();
  while (pending.length > 0) {
    const relativePath = pending.pop();
    if (copied.has(relativePath)) continue;
    const sourcePath = path.join(ROOT, relativePath);
    assert.equal(existsSync(sourcePath), true, `fixture module is missing: ${relativePath}`);
    copied.add(relativePath);
    const destinationPath = path.join(destinationRoot, relativePath);
    mkdirSync(path.dirname(destinationPath), { recursive: true });
    cpSync(sourcePath, destinationPath);
    const source = readFileSync(sourcePath, "utf8");
    const imports = source.matchAll(/(?:from\s*|import\s*\()(["'])(\.{1,2}\/[^"']+)\1/gu);
    for (const match of imports) {
      const unresolved = path.resolve(path.dirname(sourcePath), match[2]);
      const dependency = [
        unresolved,
        `${unresolved}.mjs`,
        `${unresolved}.js`,
        path.join(unresolved, "index.mjs"),
        path.join(unresolved, "index.js"),
      ].find((candidate) => existsSync(candidate));
      if (dependency) pending.push(path.relative(ROOT, dependency));
    }
  }
}

function initializeFixture(testContext) {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), "rf13-goal-operational-cli-")));
  const repo = path.join(base, "repo");
  const external = path.join(base, "private");
  mkdirSync(repo, { recursive: true });
  mkdirSync(external, { recursive: true, mode: 0o700 });
  chmodSync(external, 0o700);
  cpSync(path.join(ROOT, "package.json"), path.join(repo, "package.json"));
  copyStaticModuleClosure(repo, [
    SCRIPT_RELATIVE,
    RUNNER_RELATIVE,
  ]);
  cpSync(path.join(ROOT, WRAPPER_RELATIVE), path.join(repo, WRAPPER_RELATIVE));
  symlinkSync(path.join(ROOT, "node_modules"), path.join(repo, "node_modules"), "dir");
  mkdirSync(path.dirname(path.join(repo, PLAN_RELATIVE)), { recursive: true });
  cpSync(path.join(ROOT, PLAN_RELATIVE), path.join(repo, PLAN_RELATIVE));
  git(repo, ["init", "-q", "-b", "main"]);
  git(repo, ["config", "user.email", "rf13-goal-cli@example.invalid"]);
  git(repo, ["config", "user.name", "RF13 Goal CLI"]);
  git(repo, ["add", "--all"]);
  git(repo, ["commit", "-q", "-m", "isolated goal cli fixture"]);

  const manifestPath = writeOwnerOnly(path.join(external, "manifest.json"), Buffer.from("{\"units\":[]}\n"));
  const files = {};
  for (const key of EXTERNAL_KEYS) {
    const body = Buffer.from(`${JSON.stringify({ kind: key })}\n`);
    files[key] = writeOwnerOnly(path.join(external, `${key}.bin`), body);
  }
  const operational = Object.freeze({
    schema_version: RF13_GOAL_OPERATIONAL_INPUT_SCHEMA,
    authenticated_session_fixture_path: path.join(external, "authenticated-session"),
    exchange_root: path.join(external, "exchange"),
    ...Object.fromEntries(EXTERNAL_KEYS.map((key) => [key, files[key]])),
  });
  mkdirSync(operational.authenticated_session_fixture_path, { mode: 0o700 });
  writeOwnerOnly(
    path.join(operational.authenticated_session_fixture_path, "secure-session-store.json"),
    Buffer.from("{}\n"),
  );
  mkdirSync(operational.exchange_root, { mode: 0o700 });
  const operationalPath = writeOwnerOnly(
    path.join(external, "operational-inputs.json"),
    Buffer.from(`${JSON.stringify(operational, null, 2)}\n`),
  );
  testContext.after(() => rmSync(base, { recursive: true, force: true }));
  return {
    base,
    repo,
    external,
    manifestPath,
    files,
    operational,
    operationalPath,
    registryPin: sha256(Buffer.from(`${JSON.stringify({ kind: "trust_registry_path" })}\n`)),
  };
}

function invokeWrapper(fixture, {
  operationalPath = fixture.operationalPath,
  env = {},
  relative = false,
} = {}) {
  const wrapper = relative ? WRAPPER_RELATIVE : path.join(fixture.repo, WRAPPER_RELATIVE);
  return spawnSync(wrapper, [
    "--manifest", fixture.manifestPath,
    "--operational-inputs", operationalPath,
  ], {
    cwd: fixture.repo,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: process.env.HOME ?? tmpdir(),
      TMPDIR: process.env.TMPDIR ?? tmpdir(),
      LAWOS_OWNER_TRUST_REGISTRY_SHA256: fixture.registryPin,
      ...env,
    },
  });
}

test("RF13 Goal operational CLI accepts only its canonical one-process macOS wrapper", async (t) => {
  const fixture = initializeFixture(t);
  const help = spawnSync(path.join(fixture.repo, WRAPPER_RELATIVE), ["--help"], {
    cwd: fixture.repo,
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? tmpdir() },
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--operational-inputs ABSOLUTE_OWNER_ONLY_JSON/u);

  for (const entrypoint of [SCRIPT_RELATIVE, RUNNER_RELATIVE]) {
    const direct = spawnSync(NODE22, [
      path.join(fixture.repo, entrypoint),
      "--manifest", fixture.manifestPath,
      "--operational-inputs", fixture.operationalPath,
    ], { cwd: fixture.repo, encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin" } });
    assert.equal(direct.status, 2, direct.stderr);
    assert.match(direct.stderr, /RF13_GOAL_OPERATIONAL_LAUNCHER_REQUIRED/u);
  }

  const relative = invokeWrapper(fixture, { relative: true });
  assert.equal(relative.status, 2, relative.stderr);
  assert.match(relative.stderr, /RF13_GOAL_OPERATIONAL_LAUNCHER_REQUIRED/u);

  for (const variable of ["NODE_OPTIONS", "NODE_PATH"]) {
    const injected = invokeWrapper(fixture, { env: { [variable]: "" } });
    assert.equal(injected.status, 2, injected.stderr);
    assert.match(injected.stderr, /RF13_GOAL_OPERATIONAL_LAUNCHER_REQUIRED/u);
  }
});

test("RF13 Goal operational CLI loads one closed owner-only bundle before honest evidence blocking", (t) => {
  const fixture = initializeFixture(t);
  const result = invokeWrapper(fixture);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /RF13_GOAL_OPERATIONAL_EVIDENCE_UNAVAILABLE/u);
  assert.doesNotMatch(result.stderr, /trust_registry_path|profile_.*_path|private/u);
  assert.equal(git(fixture.repo, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
});

test("RF13 Goal operational input rejects unsafe files and session or exchange directories", async (t) => {
  const fixture = initializeFixture(t);
  const cases = [];

  const symlinkPath = path.join(fixture.external, "operational-symlink.json");
  symlinkSync(fixture.operationalPath, symlinkPath);
  cases.push(symlinkPath);

  const hardlinkPath = path.join(fixture.external, "operational-hardlink.json");
  linkSync(fixture.operationalPath, hardlinkPath);
  cases.push(hardlinkPath);

  const broadPath = writeOwnerOnly(path.join(fixture.external, "operational-broad.json"), Buffer.from(JSON.stringify(fixture.operational)));
  chmodSync(broadPath, 0o644);
  cases.push(broadPath);

  const repositoryPath = path.join(fixture.repo, ".git", "operational-inputs.json");
  writeFileSync(repositoryPath, Buffer.from(JSON.stringify(fixture.operational)), { mode: 0o600 });
  chmodSync(repositoryPath, 0o600);
  cases.push(repositoryPath);

  const oversizedPath = writeOwnerOnly(path.join(fixture.external, "operational-oversized.json"), Buffer.alloc(256 * 1024 + 1, 0x20));
  cases.push(oversizedPath);

  const selfPinnedPath = writeOwnerOnly(path.join(fixture.external, "operational-self-pin.json"), Buffer.from(JSON.stringify({
    ...fixture.operational,
    trust_registry_sha256: fixture.registryPin,
  })));
  cases.push(selfPinnedPath);

  const linkedFixture = path.join(fixture.external, "linked-session");
  symlinkSync(fixture.operational.authenticated_session_fixture_path, linkedFixture, "dir");
  cases.push(writeOwnerOnly(path.join(fixture.external, "linked-session-input.json"), Buffer.from(JSON.stringify({
    ...fixture.operational,
    authenticated_session_fixture_path: linkedFixture,
  }))));

  const broadExchange = path.join(fixture.external, "broad-exchange");
  mkdirSync(broadExchange, { mode: 0o755 });
  chmodSync(broadExchange, 0o755);
  cases.push(writeOwnerOnly(path.join(fixture.external, "broad-exchange-input.json"), Buffer.from(JSON.stringify({
    ...fixture.operational,
    exchange_root: broadExchange,
  }))));

  cases.push(writeOwnerOnly(path.join(fixture.external, "repository-session-input.json"), Buffer.from(JSON.stringify({
    ...fixture.operational,
    authenticated_session_fixture_path: path.join(fixture.repo, "scripts"),
  }))));

  for (const operationalPath of cases) {
    const result = invokeWrapper(fixture, { operationalPath });
    assert.equal(result.status, 1, `${operationalPath}: ${result.stderr}`);
    assert.match(result.stderr, /RF13_GOAL_OPERATIONAL_INPUT_INVALID/u);
  }
  rmSync(repositoryPath, { force: true });
});

test("RF13 Goal operational nested evidence uses the same pinned owner-only boundary and external registry pin", (t) => {
  const fixture = initializeFixture(t);
  for (const { name, override, env, expectedStatus, expectedCode } of [
    {
      name: "wrong-registry-pin",
      override: {},
      env: { LAWOS_OWNER_TRUST_REGISTRY_SHA256: "f".repeat(64) },
      expectedStatus: 1,
      expectedCode: /RF13_GOAL_OPERATIONAL_TRUST_REGISTRY_INVALID/u,
    },
    {
      name: "missing-registry-pin",
      override: {},
      env: { LAWOS_OWNER_TRUST_REGISTRY_SHA256: undefined },
      expectedStatus: 2,
      expectedCode: /RF13_GOAL_OPERATIONAL_TRUST_AUTHORITY_REQUIRED/u,
    },
  ]) {
    const operationalPath = writeOwnerOnly(path.join(fixture.external, `${name}.json`), Buffer.from(JSON.stringify({
      ...fixture.operational,
      ...override,
    })));
    const mergedEnv = { ...env };
    if (Object.hasOwn(mergedEnv, "LAWOS_OWNER_TRUST_REGISTRY_SHA256")
      && mergedEnv.LAWOS_OWNER_TRUST_REGISTRY_SHA256 === undefined) {
      delete mergedEnv.LAWOS_OWNER_TRUST_REGISTRY_SHA256;
      const result = spawnSync(path.join(fixture.repo, WRAPPER_RELATIVE), [
        "--manifest", fixture.manifestPath,
        "--operational-inputs", operationalPath,
      ], {
        cwd: fixture.repo,
        encoding: "utf8",
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? tmpdir() },
      });
      assert.equal(result.status, expectedStatus, `${name}: ${result.stderr}`);
      assert.match(result.stderr, expectedCode);
      continue;
    }
    const result = invokeWrapper(fixture, { operationalPath, env: mergedEnv });
    assert.equal(result.status, expectedStatus, `${name}: ${result.stderr}`);
    assert.match(result.stderr, expectedCode);
  }

  const linkedRegistry = path.join(fixture.external, "linked-registry.json");
  linkSync(fixture.files.trust_registry_path, linkedRegistry);
  const hardlinkOperationalPath = writeOwnerOnly(path.join(fixture.external, "nested-hardlink.json"), Buffer.from(JSON.stringify({
    ...fixture.operational,
    trust_registry_path: linkedRegistry,
  })));
  const hardlink = invokeWrapper(fixture, { operationalPath: hardlinkOperationalPath });
  assert.equal(hardlink.status, 1, hardlink.stderr);
  assert.match(hardlink.stderr, /RF13_GOAL_OPERATIONAL_INPUT_INVALID/u);
  rmSync(linkedRegistry);

  const broadSignature = writeOwnerOnly(path.join(fixture.external, "broad-signature.bin"), Buffer.from("signature\n"));
  chmodSync(broadSignature, 0o644);
  const broadOperationalPath = writeOwnerOnly(path.join(fixture.external, "nested-broad.json"), Buffer.from(JSON.stringify({
    ...fixture.operational,
    profile_decision_attestation_signature_path: broadSignature,
  })));
  const broad = invokeWrapper(fixture, { operationalPath: broadOperationalPath });
  assert.equal(broad.status, 1, broad.stderr);
  assert.match(broad.stderr, /RF13_GOAL_OPERATIONAL_INPUT_INVALID/u);
});

test("RF13 Goal public runCli rejects caller-authored authorities and operational argument drift", async () => {
  await assert.rejects(
    runCli(["--help"], { operationalAuthorities: {} }),
    (error) => error?.code === "INVALID_CALLER_CONTEXT",
  );
  await assert.rejects(
    runCli(["--template", "--operational-inputs", "/tmp/private.json"]),
    (error) => error?.code === "INVALID_ARGUMENT",
  );
  await assert.rejects(
    runCli(["--manifest", "/tmp/manifest.json", "--structure-only", "--operational-inputs", "/tmp/private.json"]),
    (error) => error?.code === "INVALID_ARGUMENT",
  );
  await assert.rejects(
    runCli(["--manifest", "/tmp/manifest.json", "--signing-timeout-ms", "1000"]),
    (error) => error?.code === "INVALID_ARGUMENT",
  );
  for (const timeout of ["999", "1800001", "01000", "1e3"]) {
    await assert.rejects(
      runCli([
        "--manifest", "/tmp/manifest.json",
        "--operational-inputs", "/tmp/private.json",
        "--signing-timeout-ms", timeout,
      ]),
      (error) => error?.code === "INVALID_ARGUMENT",
    );
  }
});
