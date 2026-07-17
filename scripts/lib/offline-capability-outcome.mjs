import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const OFFLINE_CAPABILITY_SOURCE_PATHS = Object.freeze([
  "apps/desktop/src/main/offline-capability.js",
  "apps/desktop/src/main/offline-cache.js",
  "apps/desktop/src/main/offline-outbox.js",
  "apps/desktop/src/main/offline-replay.js",
  "apps/desktop/src/preload/offline-capability.js",
]);

export function inspectOfflineCapabilitySource({ root = process.cwd() } = {}) {
  const repo = resolve(root);
  const present = OFFLINE_CAPABILITY_SOURCE_PATHS.filter((path) => existsSync(join(repo, path)));
  const mainSource = readFileSync(join(repo, "apps/desktop/src/main/main.js"), "utf8");
  const retiredRendererFailClosed = /\/offline\(\?:\\\.matter\)\?\\\.html\$\/i\.test\(pathname\)\) return packagedRendererUrl\(\)/u.test(mainSource);
  const sqliteImported = /(?:from\s+["']node:sqlite["']|require\(["']node:sqlite["']\))/u.test(mainSource);
  return Object.freeze({
    present_capability_paths: Object.freeze(present),
    capability_path_count: present.length,
    retired_offline_renderer_routed: false,
    retired_offline_renderer_fail_closed: retiredRendererFailClosed,
    sqlite_imported_by_desktop_main: sqliteImported,
  });
}

export function validateOfflineSourceOutcome({ outcome, inspection } = {}) {
  if (!inspection || !["pending", "disabled", "enabled"].includes(outcome)) throw new TypeError("offline source outcome inputs are invalid");
  if (outcome === "enabled") {
    if (inspection.capability_path_count === 0) {
      const error = new Error("approved offline capability source has not been materialized");
      error.code = "OFFLINE_ENABLED_SOURCE_MISSING";
      throw error;
    }
  } else if (inspection.capability_path_count !== 0 || inspection.sqlite_imported_by_desktop_main || !inspection.retired_offline_renderer_fail_closed) {
    const error = new Error("pending or disabled offline outcome must remain capability-absent and fail closed");
    error.code = "OFFLINE_FAIL_CLOSED_DRIFT";
    throw error;
  }
  return Object.freeze({ valid: true, outcome, ...inspection });
}
