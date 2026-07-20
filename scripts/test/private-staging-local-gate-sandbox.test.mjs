import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createPrivateStagingGateEnvironment,
  PRIVATE_STAGING_GATE_ENVIRONMENT_KEYS,
  PRIVATE_STAGING_GATE_SANDBOX_PROFILE,
  privateStagingGateCommand,
} from "../lib/private-staging-local-gate-sandbox.mjs";

test("local gate children receive only the explicit nonsecret environment", () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-local-gate-env-test-"));
  try {
    const env = createPrivateStagingGateEnvironment(root);
    assert.deepEqual(Object.keys(env).sort(), [...PRIVATE_STAGING_GATE_ENVIRONMENT_KEYS].sort());
    for (const forbidden of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "GITHUB_TOKEN", "DATABASE_URL", "LAWOS_DATABASE_URL", "SSH_AUTH_SOCK"]) {
      assert.equal(Object.hasOwn(env, forbidden), false);
    }
    assert.equal(env.HOME.startsWith(root), true);
    assert.equal(env.TMPDIR.startsWith(root), true);
    assert.equal(env.PLAYWRIGHT_BROWSERS_PATH.startsWith(root), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("local gate sandbox denies external egress and the operator home", () => {
  assert.match(PRIVATE_STAGING_GATE_SANDBOX_PROFILE, /deny network-outbound/u);
  assert.equal(PRIVATE_STAGING_GATE_SANDBOX_PROFILE.includes('(remote ip "localhost:*")'), true);
  assert.equal(PRIVATE_STAGING_GATE_SANDBOX_PROFILE.includes('(deny file-read* (subpath "/Users"))'), true);
  if (process.platform === "darwin") {
    const wrapped = privateStagingGateCommand("node", ["--version"]);
    assert.equal(wrapped.command, "/usr/bin/sandbox-exec");
    assert.deepEqual(wrapped.args.slice(-2), ["node", "--version"]);
  } else {
    assert.throws(() => privateStagingGateCommand("node", ["--version"]), /require the macOS deny-egress sandbox/u);
  }
});

test("macOS local gate sandbox enforces egress and operator-home denial", {
  skip: process.platform !== "darwin",
}, () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-local-gate-runtime-test-"));
  try {
    const environment = createPrivateStagingGateEnvironment(root);
    const egress = privateStagingGateCommand("node", [
      "-e",
      'const net=require("net");const s=net.connect(443,"1.1.1.1");s.on("connect",()=>process.exit(2));s.on("error",e=>process.exit(["EPERM","EACCES"].includes(e.code)?0:3));setTimeout(()=>process.exit(4),2000)',
    ]);
    assert.equal(spawnSync(egress.command, egress.args, { env: environment, timeout: 5_000 }).status, 0);

    const operatorRead = privateStagingGateCommand("node", [
      "-e",
      'const fs=require("fs");try{fs.readdirSync(process.argv[1]);process.exit(2)}catch(e){process.exit(["EPERM","EACCES"].includes(e.code)?0:3)}',
      "/Users",
    ]);
    assert.equal(spawnSync(operatorRead.command, operatorRead.args, { env: environment, timeout: 5_000 }).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
