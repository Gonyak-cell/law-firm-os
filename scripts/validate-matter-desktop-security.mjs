#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WINDOW_PATH = "apps/desktop/src/main/window.js";
const ORIGIN_POLICY_PATH = "apps/desktop/src/main/origin-policy.js";
const DESKTOP_ROOT = "apps/desktop";

function read(path) {
  return readFileSync(path, "utf8");
}

function listFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else files.push(path);
  }
  return files.sort();
}

function windowSecurityFindings(source) {
  const checks = [
    ["nodeIntegration_false", /nodeIntegration:\s*false/],
    ["contextIsolation_true", /contextIsolation:\s*true/],
    ["sandbox_true", /sandbox:\s*true/],
    ["webSecurity_true", /webSecurity:\s*true/],
    ["insecure_content_blocked", /allowRunningInsecureContent:\s*false/]
  ];
  return checks.filter(([, pattern]) => !pattern.test(source)).map(([code]) => code);
}

function preloadFindings(path, source) {
  const exposesBridge = /contextBridge|ipcRenderer|ipcMain|postMessage/.test(source);
  const hasAllowlist = /PRELOAD_CHANNEL_ALLOWLIST|allowedPreloadChannels|preloadChannelAllowlist/.test(source);
  if (exposesBridge && !hasAllowlist) return [`${path}:missing_preload_allowlist`];
  if (/ipcRenderer\.send\([^)]*\*|ipcRenderer\.invoke\([^)]*\*/.test(source)) return [`${path}:wildcard_ipc`];
  return [];
}

function originPolicyFindings(source) {
  const checks = [
    ["approved_dev_url_missing", /APPROVED_DEV_RENDERER_URL/],
    ["packaged_origin_missing", /PACKAGED_RENDERER_ORIGIN/],
    ["unapproved_navigation_not_prevented", /preventDefault\(\)/],
    ["unapproved_window_open_not_denied", /action:\s*"deny"/],
    ["remote_allow_all_detected", /return\s+true;?\s*$/m]
  ];
  const findings = [];
  for (const [code, pattern] of checks) {
    if (code === "remote_allow_all_detected") {
      if (pattern.test(source) && !/url\.protocol === "file:"\) return true/.test(source)) findings.push(code);
    } else if (!pattern.test(source)) {
      findings.push(code);
    }
  }
  return findings;
}

assert(existsSync(WINDOW_PATH), `${WINDOW_PATH} is missing`);
assert(existsSync(ORIGIN_POLICY_PATH), `${ORIGIN_POLICY_PATH} is missing`);

const desktopFiles = listFiles(DESKTOP_ROOT);
const windowSource = read(WINDOW_PATH);
const originPolicySource = read(ORIGIN_POLICY_PATH);
const preloadFiles = desktopFiles.filter((path) => /preload/i.test(path) && /\.(cjs|js)$/.test(path));

const findings = [
  ...windowSecurityFindings(windowSource),
  ...originPolicyFindings(originPolicySource),
  ...preloadFiles.flatMap((path) => preloadFindings(path, read(path)))
];

const probeFindings = {
  insecure_browser_window: windowSecurityFindings("webPreferences: { nodeIntegration: true, sandbox: false }"),
  missing_preload_allowlist: preloadFindings("probe-preload.js", "contextBridge.exposeInMainWorld('matter', { send: ipcRenderer.send })"),
  non_allowlisted_navigation: originPolicyFindings("export function isApprovedRendererUrl() { return true; }")
};

assert(probeFindings.insecure_browser_window.length > 0, "insecure BrowserWindow probe was not detected");
assert(probeFindings.missing_preload_allowlist.length > 0, "missing preload allowlist probe was not detected");
assert(probeFindings.non_allowlisted_navigation.length > 0, "non-allowlisted navigation probe was not detected");
assert.deepEqual(findings, [], "desktop security findings present");

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      checked_files: desktopFiles.length,
      preload_policy: preloadFiles.length === 0 ? "no_preload_surface_present" : "preload_allowlist_checked",
      findings,
      probes: {
        insecure_browser_window: "detected",
        missing_preload_allowlist: "detected",
        non_allowlisted_navigation: "detected"
      }
    },
    null,
    2
  )
);
