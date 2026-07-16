#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WINDOW_PATH = "apps/desktop/src/main/window.js";
const ORIGIN_POLICY_PATH = "apps/desktop/src/main/origin-policy.js";
const MAIN_PATH = "apps/desktop/src/main/main.js";
const APP_PROTOCOL_PATH = "apps/desktop/src/main/app-protocol.js";
const WEB_INDEX_PATH = "apps/web/index.html";
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
    ["file_scheme_not_denied", /url\.protocol === "file:"\) return false/],
    ["custom_scheme_missing", /url\.protocol === "matter-app:"/],
    ["custom_host_missing", /url\.hostname === "app"/],
    ["unapproved_navigation_not_prevented", /preventDefault\(\)/],
    ["new_window_default_deny_missing", /setWindowOpenHandler\(\(\) => \(\{ action: "deny" \}\)\)/]
  ];
  return checks.filter(([, pattern]) => !pattern.test(source)).map(([code]) => code);
}

function appProtocolFindings(source) {
  const checks = [
    ["custom_scheme_not_standard", /standard:\s*true/],
    ["custom_scheme_not_secure", /secure:\s*true/],
    ["custom_scheme_fetch_disabled", /supportFetchAPI:\s*true/],
    ["custom_scheme_cors_disabled", /corsEnabled:\s*true/],
    ["custom_scheme_stream_disabled", /stream:\s*true/],
    ["canonical_path_check_missing", /realpathSyncImpl/],
    ["regular_file_check_missing", /statSyncImpl\(canonicalPath\)\.isFile\(\)/],
    ["path_containment_check_missing", /isContainedPath/],
    ["path_blind_404_missing", /new Response\("Not found", \{ status: 404 \}\)/]
  ];
  return checks.filter(([, pattern]) => !pattern.test(source)).map(([code]) => code);
}

function cspFindings(source) {
  const checks = [
    ["csp_meta_missing", /http-equiv="Content-Security-Policy"/],
    ["csp_default_self_missing", /default-src 'self'/],
    ["csp_script_self_missing", /script-src 'self'/],
    ["csp_object_none_missing", /object-src 'none'/],
    ["csp_base_none_missing", /base-uri 'none'/]
  ];
  const findings = checks.filter(([, pattern]) => !pattern.test(source)).map(([code]) => code);
  if (/unsafe-eval/.test(source)) findings.push("csp_unsafe_eval_present");
  if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/iu.test(source)) findings.push("csp_executable_inline_script_present");
  return findings;
}

function singleInstanceFindings(source) {
  const findings = [];
  const lockIndex = source.indexOf("acquireDesktopSingleInstance(app)");
  const userDataIndex = source.indexOf("desktopUserDataPath(app)", lockIndex);
  const localApiIndex = source.indexOf("await startDesktopLocalApiServer", lockIndex);
  if (!/requestSingleInstanceLock\(\)/.test(source)) findings.push("single_instance_lock_missing");
  if (!/app\.on\("second-instance"/.test(source)) findings.push("second_instance_handler_missing");
  if (!/app\.on\("open-url"/.test(source)) findings.push("open_url_handler_missing");
  if (!/redactDeepLinkIntent\(intent\)/.test(source)) findings.push("deep_link_redaction_missing");
  if (lockIndex < 0 || userDataIndex < 0 || lockIndex > userDataIndex) findings.push("single_instance_lock_after_user_data");
  if (lockIndex < 0 || localApiIndex < 0 || lockIndex > localApiIndex) findings.push("single_instance_lock_after_local_api");
  return findings;
}

assert(existsSync(WINDOW_PATH), `${WINDOW_PATH} is missing`);
assert(existsSync(ORIGIN_POLICY_PATH), `${ORIGIN_POLICY_PATH} is missing`);
assert(existsSync(MAIN_PATH), `${MAIN_PATH} is missing`);
assert(existsSync(APP_PROTOCOL_PATH), `${APP_PROTOCOL_PATH} is missing`);
assert(existsSync(WEB_INDEX_PATH), `${WEB_INDEX_PATH} is missing`);

const desktopFiles = listFiles(DESKTOP_ROOT);
const windowSource = read(WINDOW_PATH);
const originPolicySource = read(ORIGIN_POLICY_PATH);
const mainSource = read(MAIN_PATH);
const appProtocolSource = read(APP_PROTOCOL_PATH);
const webIndexSource = read(WEB_INDEX_PATH);
const preloadFiles = desktopFiles.filter((path) => /preload/i.test(path) && /\.(cjs|js)$/.test(path));

const findings = [
  ...windowSecurityFindings(windowSource),
  ...originPolicyFindings(originPolicySource),
  ...appProtocolFindings(appProtocolSource),
  ...cspFindings(webIndexSource),
  ...singleInstanceFindings(mainSource),
  ...preloadFiles.flatMap((path) => preloadFindings(path, read(path)))
];

const probeFindings = {
  insecure_browser_window: windowSecurityFindings("webPreferences: { nodeIntegration: true, sandbox: false }"),
  missing_preload_allowlist: preloadFindings("probe-preload.js", "contextBridge.exposeInMainWorld('matter', { send: ipcRenderer.send })"),
  non_allowlisted_navigation: originPolicyFindings("export function isApprovedRendererUrl() { return true; }"),
  unsafe_custom_protocol: appProtocolFindings("export function installMatterAppProtocol() {}"),
  missing_csp: cspFindings("<!doctype html><script>eval('unsafe')</script>"),
  missing_single_instance_boundary: singleInstanceFindings("export async function startElectronApp() {}")
};

assert(probeFindings.insecure_browser_window.length > 0, "insecure BrowserWindow probe was not detected");
assert(probeFindings.missing_preload_allowlist.length > 0, "missing preload allowlist probe was not detected");
assert(probeFindings.non_allowlisted_navigation.length > 0, "non-allowlisted navigation probe was not detected");
assert(probeFindings.unsafe_custom_protocol.length > 0, "unsafe custom protocol probe was not detected");
assert(probeFindings.missing_csp.length > 0, "missing CSP probe was not detected");
assert(probeFindings.missing_single_instance_boundary.length > 0, "missing single-instance boundary probe was not detected");
assert.deepEqual(findings, [], "desktop security findings present");

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      checked_files: desktopFiles.length,
      preload_policy: preloadFiles.length === 0 ? "no_preload_surface_present" : "preload_allowlist_checked",
      single_instance_trust_boundary: "checked",
      custom_protocol_trust_boundary: "checked",
      packaged_csp: "checked",
      findings,
      probes: {
        insecure_browser_window: "detected",
        missing_preload_allowlist: "detected",
        non_allowlisted_navigation: "detected",
        unsafe_custom_protocol: "detected",
        missing_csp: "detected",
        missing_single_instance_boundary: "detected"
      }
    },
    null,
    2
  )
);
