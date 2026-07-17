import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { MATTER_APP_CONTENT_SECURITY_POLICY } from "../src/main/app-protocol.js";

const webIndexPath = new URL("../../web/index.html", import.meta.url);
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

function cspDirectives(html) {
  const tag = html.match(/<meta\s+[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/iu)?.[0] ?? "";
  const content = tag.match(/content=(["'])(.*?)\1/iu)?.[2] ?? "";
  return parseCspDirectives(content);
}

function parseCspDirectives(content) {
  return new Map(content.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [name, ...values] = entry.split(/\s+/u);
    return [name, values];
  }));
}

function electronBinary() {
  const candidates = [
    process.env.MATTER_ELECTRON_BINARY,
    join(repoRoot, "node_modules/.bin/electron"),
    resolve("node_modules/.bin/electron"),
  ];
  try {
    const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
    }).trim();
    candidates.push(join(commonDir, "..", "node_modules/.bin/electron"));
  } catch {}
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

test("packaged web HTML declares a restrictive CSP without executable inline script", () => {
  const html = readFileSync(webIndexPath, "utf8");
  const directives = cspDirectives(html);
  assert.deepEqual(directives.get("default-src"), ["'self'"]);
  assert.deepEqual(directives.get("script-src"), ["'self'"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.deepEqual(directives.get("base-uri"), ["'none'"]);
  assert.equal(directives.has("frame-ancestors"), false);
  assert.deepEqual(parseCspDirectives(MATTER_APP_CONTENT_SECURITY_POLICY).get("frame-ancestors"), ["'none'"]);
  for (const values of directives.values()) {
    assert.equal(values.includes("*"), false);
    assert.equal(values.includes("'unsafe-eval'"), false);
  }
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/iu);
  assert.match(html, /<html\s+lang="ko"\s+data-skin="forest">/u);
});

test("built web renderer loads under matter-app origin with CSP enforced in Electron", async () => {
  const binary = electronBinary();
  assert.ok(binary, "Electron binary is required for the built-renderer smoke");
  const root = await mkdtemp(join(tmpdir(), "matter-built-renderer-"));
  const webRoot = join(root, "web");
  try {
    execFileSync("node", [
      join(repoRoot, "node_modules/vite/bin/vite.js"),
      "build",
      "--outDir",
      webRoot,
      "--emptyOutDir",
    ], {
      cwd: join(repoRoot, "apps/web"),
      encoding: "utf8",
    });
    const fixture = fileURLToPath(new URL("./fixtures/built-renderer-electron.mjs", import.meta.url));
    const result = spawnSync(binary, [
      `--user-data-dir=${join(root, "profile")}`,
      fixture,
    ], {
      env: { ...process.env, MATTER_APP_PROTOCOL_WEB_ROOT: webRoot },
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const receiptLine = result.stdout.split("\n").find((line) => line.includes('"renderer_origin"'));
    assert.ok(receiptLine, result.stdout);
    const receipt = JSON.parse(receiptLine);
    const lock = JSON.parse(readFileSync(new URL("../../../package-lock.json", import.meta.url), "utf8"));
    assert.equal(receipt.verdict, "PASS");
    assert.equal(receipt.electron_version, lock.packages["node_modules/electron"].version);
    assert.equal(receipt.renderer_origin, "matter-app://app");
    assert.equal(receipt.skin, "forest");
    assert.equal(receipt.root_child_count > 0, true);
    assert.equal(receipt.csp_present, true);
    assert.equal(receipt.unsafe_eval, false);
    assert.equal(receipt.csp_violation_count, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
