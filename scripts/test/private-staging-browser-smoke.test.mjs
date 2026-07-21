import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runPrivateStagingForestBrowserSmoke } from "../lib/private-staging-browser-smoke.mjs";

class FakePage {
  constructor() {
    this.handlers = new Map();
  }
  on(name, handler) { this.handlers.set(name, handler); }
  async goto() {}
  locator() { return { fill: async () => {}, click: async () => {} }; }
  async waitForSelector() {}
  async evaluate(fn, value) { return value ? true : true; }
  async screenshot({ path }) { writeFileSync(path, "synthetic-browser-evidence"); }
}

function fakeLaunchBrowser() {
  return Promise.resolve({
    newContext: async () => ({ newPage: async () => new FakePage() }),
    close: async () => {},
  });
}

test("Forest browser smoke returns only safe synthetic counts and fingerprints", async () => {
  const evidenceDir = mkdtempSync(join(tmpdir(), "lawos-browser-smoke-"));
  chmodSync(evidenceDir, 0o700);
  const result = await runPrivateStagingForestBrowserSmoke({
    apiBaseUrl: "https://lawos-private-staging.example.invalid",
    webBaseUrl: "http://127.0.0.1:5173",
    account: { email: "jwsuh+lawos-staging-admin@amic.kr", user_id: "synthetic-lawos-staging-admin" },
    password: "Synthetic-only-password-123!",
    expected: { matter_id: "matter-cut007-synthetic" },
    evidenceDir,
    launchBrowser: fakeLaunchBrowser,
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.critical_flow_count, 7);
  assert.equal(result.screenshot_count, 5);
  assert.equal(result.secret_material_returned, false);
  assert.match(result.evidence_fingerprint, /^[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(result), /password|(?:jwsuh\+)?lawos-staging-admin@/u);
});

test("Forest browser smoke rejects non-synthetic accounts and non-HTTPS staging", async () => {
  const evidenceDir = mkdtempSync(join(tmpdir(), "lawos-browser-smoke-"));
  chmodSync(evidenceDir, 0o700);
  const base = {
    apiBaseUrl: "https://lawos-private-staging.example.invalid",
    webBaseUrl: "http://127.0.0.1:5173",
    account: { email: "jwsuh+lawos-staging-admin@amic.kr", user_id: "synthetic-lawos-staging-admin" },
    password: "Synthetic-only-password-123!",
    evidenceDir,
    launchBrowser: fakeLaunchBrowser,
  };
  await assert.rejects(() => runPrivateStagingForestBrowserSmoke({ ...base, account: { ...base.account, email: "real@amic.kr" } }), /synthetic account email/u);
  await assert.rejects(() => runPrivateStagingForestBrowserSmoke({ ...base, apiBaseUrl: "http://public.example.invalid" }), /HTTPS/u);
});
