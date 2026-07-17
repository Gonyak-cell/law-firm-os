import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  MATTER_APP_CONTENT_SECURITY_POLICY,
  MATTER_APP_ORIGIN,
  MATTER_APP_SCHEME,
  installMatterAppProtocol,
  matterAppRendererUrl,
  registerMatterAppScheme,
  resolveMatterAppRequestPath,
} from "../src/main/app-protocol.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

async function protocolFixture() {
  const root = await mkdtemp(join(tmpdir(), "matter-app-protocol-"));
  const webRoot = join(root, "web");
  const outsidePath = join(root, "outside.txt");
  await mkdir(join(webRoot, "assets"), { recursive: true });
  await writeFile(join(webRoot, "index.html"), "<!doctype html><title>matter</title>\n");
  await writeFile(join(webRoot, "assets", "app.js"), "export const ready = true;\n");
  await writeFile(outsidePath, "outside\n");
  await symlink(outsidePath, join(webRoot, "assets", "outside-link.txt"));
  return { root, webRoot };
}

function electronBinary() {
  const candidates = [
    process.env.MATTER_ELECTRON_BINARY,
    join(repoRoot, "node_modules/.bin/electron"),
    join(process.cwd(), "node_modules/.bin/electron"),
  ];
  try {
    const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
    candidates.push(join(commonDir, "..", "node_modules/.bin/electron"));
  } catch {}
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

test("matter-app scheme is registered as standard, secure and fetch-capable before app ready", () => {
  const calls = [];
  registerMatterAppScheme({
    registerSchemesAsPrivileged(entries) {
      calls.push(entries);
    },
  });
  assert.deepEqual(calls, [[{
    scheme: MATTER_APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  }]]);
  assert.equal(MATTER_APP_ORIGIN, "matter-app://app");
  assert.equal(matterAppRendererUrl(), "matter-app://app/index.html?desktop=1");

  const source = readFileSync(new URL("../src/main/main.js", import.meta.url), "utf8");
  const registration = source.indexOf("registerMatterAppScheme(protocol)");
  const ready = source.indexOf("await app.whenReady()", registration);
  const handler = source.indexOf("installMatterAppProtocol", ready);
  assert.ok(registration >= 0);
  assert.ok(ready > registration);
  assert.ok(handler > ready);
});

test("matter-app resolver returns only canonical regular files under the packaged web root", async () => {
  const fixture = await protocolFixture();
  try {
    assert.equal(
      resolveMatterAppRequestPath("matter-app://app/", { webRoot: fixture.webRoot }),
      realpathSync(join(fixture.webRoot, "index.html")),
    );
    assert.equal(
      resolveMatterAppRequestPath("matter-app://app/assets/app.js?cache=1", { webRoot: fixture.webRoot }),
      realpathSync(join(fixture.webRoot, "assets", "app.js")),
    );
    for (const candidate of [
      "file:///tmp/index.html",
      "matter-app://evil/index.html",
      "matter-app://app/../outside.txt",
      "matter-app://app/%2e%2e/outside.txt",
      "matter-app://app/%252e%252e/outside.txt",
      "matter-app://app/%2foutside.txt",
      "matter-app://app/%5coutside.txt",
      "matter-app://app/assets/outside-link.txt",
      "matter-app://app/assets",
      "matter-app://app/missing.txt",
    ]) {
      assert.equal(resolveMatterAppRequestPath(candidate, { webRoot: fixture.webRoot }), null, candidate);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("matter-app protocol serves resolved files and returns a path-blind 404 for rejected requests", async () => {
  const fixture = await protocolFixture();
  try {
    let handler;
    const fetched = [];
    const expected = new Response("ok", { status: 200 });
    installMatterAppProtocol({
      protocol: {
        handle(scheme, candidate) {
          assert.equal(scheme, MATTER_APP_SCHEME);
          handler = candidate;
        },
      },
      net: {
        fetch(url) {
          fetched.push(url);
          return expected;
        },
      },
      webRoot: fixture.webRoot,
    });

    const served = await handler({ url: "matter-app://app/index.html" });
    assert.equal(served.status, 200);
    assert.equal(await served.text(), "ok");
    assert.equal(served.headers.get("content-security-policy"), MATTER_APP_CONTENT_SECURITY_POLICY);
    assert.equal(fetched.length, 1);
    assert.match(fetched[0], /^file:/);
    const rejected = await handler({ url: "matter-app://app/%2e%2e/outside.txt" });
    assert.equal(rejected.status, 404);
    assert.equal((await rejected.text()).includes(fixture.root), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("actual Electron renderer sends the registered custom origin", async () => {
  const binary = electronBinary();
  assert.ok(binary, "Electron binary is required for the custom-origin integration receipt");
  const root = await mkdtemp(join(tmpdir(), "matter-app-electron-origin-"));
  try {
    const fixture = new URL("./fixtures/app-protocol-electron.mjs", import.meta.url);
    const result = spawnSync(binary, [
      `--user-data-dir=${join(root, "profile")}`,
      fileURLToPath(fixture),
    ], {
      cwd: process.cwd(),
      env: { ...process.env, MATTER_APP_PROTOCOL_QA_ROOT: root },
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const receiptLine = result.stdout.split("\n").find((line) => line.includes('"observed_origin"'));
    assert.ok(receiptLine, result.stdout);
    const receipt = JSON.parse(receiptLine);
    const lock = JSON.parse(readFileSync(new URL("../../../package-lock.json", import.meta.url), "utf8"));
    assert.equal(receipt.verdict, "PASS");
    assert.equal(receipt.electron_version, lock.packages["node_modules/electron"].version);
    assert.equal(receipt.renderer_url, "matter-app://app/index.html?desktop=1");
    assert.equal(receipt.observed_origin, MATTER_APP_ORIGIN);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
