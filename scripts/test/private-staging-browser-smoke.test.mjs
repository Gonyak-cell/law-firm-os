import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runPrivateStagingForestBrowserSmoke } from "../lib/private-staging-browser-smoke.mjs";

class FakePage {
  constructor(responseStatus = null, requestsPerNavigation = 1) {
    this.handlers = new Map();
    this.responseStatus = responseStatus;
    this.requestsPerNavigation = requestsPerNavigation;
  }
  on(name, handler) { this.handlers.set(name, handler); }
  async goto() {
    for (let index = 0; index < this.requestsPerNavigation; index += 1) {
      const request = {
        url: () => `http://127.0.0.1:5173/api/browser-probe-${index}`,
        method: () => "GET",
      };
      this.handlers.get("request")?.(request);
      this.handlers.get("requestfinished")?.(request);
    }
    if (this.responseStatus != null) {
      this.handlers.get("response")?.({
        url: () => "http://127.0.0.1:5173/api/health",
        status: () => this.responseStatus,
        request: () => ({ method: () => "GET" }),
      });
    }
  }
  locator() { return { fill: async () => {}, click: async () => {} }; }
  async waitForSelector() {}
  async evaluate(fn, value) { return value ? true : true; }
  async screenshot({ path }) { writeFileSync(path, "synthetic-browser-evidence"); }
}

function fakeLaunchBrowser(responseStatus = null, requestsPerNavigation = 1) {
  return Promise.resolve({
    newContext: async () => ({ newPage: async () => new FakePage(responseStatus, requestsPerNavigation) }),
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
  assert.equal(result.api_request_count, 6);
  assert.equal(result.secret_material_returned, false);
  assert.match(result.evidence_fingerprint, /^[0-9a-f]{64}$/u);
  const diagnostics = JSON.parse(readFileSync(join(evidenceDir, "browser-diagnostics.json"), "utf8"));
  assert.equal(diagnostics.outcome, "PASS");
  assert.equal(diagnostics.api_request_count, 6);
  assert.doesNotMatch(JSON.stringify(result), /password|(?:jwsuh\+)?lawos-staging-admin@/u);
  assert.doesNotMatch(JSON.stringify(diagnostics), /password|(?:jwsuh\+)?lawos-staging-admin@/u);
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

test("Forest browser smoke rejects throttled API responses", async () => {
  const evidenceDir = mkdtempSync(join(tmpdir(), "lawos-browser-smoke-"));
  chmodSync(evidenceDir, 0o700);
  await assert.rejects(() => runPrivateStagingForestBrowserSmoke({
    apiBaseUrl: "https://lawos-private-staging.example.invalid",
    webBaseUrl: "http://127.0.0.1:5173",
    account: { email: "jwsuh+lawos-staging-admin@amic.kr", user_id: "synthetic-lawos-staging-admin" },
    password: "Synthetic-only-password-123!",
    evidenceDir,
    launchBrowser: () => fakeLaunchBrowser(429),
  }), /console errors or failed critical requests/u);
  const diagnostics = JSON.parse(readFileSync(join(evidenceDir, "browser-diagnostics.json"), "utf8"));
  assert.equal(diagnostics.outcome, "FAIL");
  assert.equal(diagnostics.failed_request_count > 0, true);
});

test("Forest browser smoke fails closed when its API request budget is exceeded", async () => {
  const evidenceDir = mkdtempSync(join(tmpdir(), "lawos-browser-smoke-"));
  chmodSync(evidenceDir, 0o700);
  await assert.rejects(() => runPrivateStagingForestBrowserSmoke({
    apiBaseUrl: "https://lawos-private-staging.example.invalid",
    webBaseUrl: "http://127.0.0.1:5173",
    account: { email: "jwsuh+lawos-staging-admin@amic.kr", user_id: "synthetic-lawos-staging-admin" },
    password: "Synthetic-only-password-123!",
    evidenceDir,
    launchBrowser: () => fakeLaunchBrowser(null, 129),
  }), /request budget/u);
  const diagnostics = JSON.parse(readFileSync(join(evidenceDir, "browser-diagnostics.json"), "utf8"));
  assert.equal(diagnostics.outcome, "FAIL");
  assert.equal(diagnostics.api_request_count, 129);
  assert.equal(diagnostics.api_request_limit, 128);
});
