import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function readWebFile(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("CMP-G11 console catalog traces all 48 UI TUWs", async () => {
  const catalog = await readWebFile("src/data/cmpConsoleCatalog.js");
  const component = await readWebFile("src/components/CmpConsoleSurface.jsx");

  for (let index = 1; index <= 48; index += 1) {
    const tuw = `CMP-G11-W11-T${String(index).padStart(3, "0")}`;
    assert.match(catalog, new RegExp(tuw));
  }

  assert.match(catalog, /CMP_CONSOLE_UI_STATES/);
  assert.match(component, /data-cmp-g11-tuw-count/);
});

test("CMP-G11 app route, nav, and sidebar are wired", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const i18nSource = await readWebFile("src/i18n.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");

  assert.match(navSource, /id: "cmp"/);
  assert.match(appSource, /view === "cmp"/);
  assert.match(i18nSource, /cmpConsoleTitle/);
  assert.match(shellSource, /Client-Matter-People/);
});

test("CMP-G11 common UI states and security badges are implemented", async () => {
  const component = await readWebFile("src/components/CmpConsoleSurface.jsx");

  for (const marker of [
    "PermissionDeniedState",
    "ReviewRequiredState",
    "VaultSecurityBadges",
    "loading",
    "empty",
    "denied",
    "review-required",
    "error",
    "LegalHold",
    "Privilege",
    "HRSensitive",
  ]) {
    assert.match(component, new RegExp(marker));
  }
});

test("CMP-G11 domain API client carries tenant actor permission audit idempotency context", async () => {
  const client = await readWebFile("src/data/cmpApiClient.js");
  const catalog = await readWebFile("src/data/cmpConsoleCatalog.js");

  for (const marker of ["x-tenant-id", "x-actor-id", "x-permission-receipt-id", "x-idempotency-key", "audit_event_type"]) {
    assert.match(client, new RegExp(marker));
  }

  for (const gate of ["CMP-G1-W01", "CMP-G5-W05", "CMP-G9-W09", "CMP-G10-W10"]) {
    assert.match(catalog, new RegExp(gate));
  }
});

test("CMP-G11 preserves UI-only readiness and does not claim R4", async () => {
  const catalog = await readWebFile("src/data/cmpConsoleCatalog.js");
  const component = await readWebFile("src/components/CmpConsoleSurface.jsx");

  assert.match(catalog, /runtime_ui_evidence_only__backend_runtime_required__durable_persistence_open/);
  assert.doesNotMatch(catalog, /R4-candidate|runtime_readiness: "R4|runtime_readiness_claim: "R4/);
  assert.doesNotMatch(component, /R4-candidate|runtime_readiness: "R4|runtime_readiness_claim: "R4/);
});
