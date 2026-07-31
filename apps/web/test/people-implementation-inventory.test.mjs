import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PEOPLE_FEATURE_ITEMS } from "../src/people/peopleFeatureCatalog.js";
import {
  buildPeopleImplementationInventory,
  PEOPLE_LEDGER_REPLAY_COMMAND
} from "../../../scripts/lib/people-implementation-inventory.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../../..");
const ledgerPath = path.join(
  repoRoot,
  "artifacts/people-v2/PEO-TUW-001/implementation-ledger.json"
);

function git(...args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sourceFingerprint(relativePaths) {
  const payload = [...new Set(relativePaths)]
    .sort()
    .map((relativePath) => `${relativePath}\0${readFileSync(path.join(repoRoot, relativePath), "utf8")}`)
    .join("\0");
  return sha256(payload);
}

function loadLedger() {
  assert.equal(existsSync(ledgerPath), true, "PEO-TUW-001 implementation ledger is required");
  return JSON.parse(readFileSync(ledgerPath, "utf8"));
}

function sorted(values) {
  return [...values].sort();
}

test("PEO-TUW-001 receipt is bound to the current base, HEAD, command, and source graph", async () => {
  const ledger = loadLedger();
  const inventory = await buildPeopleImplementationInventory(repoRoot);

  assert.equal(ledger.schema_version, "lawos.people-implementation-ledger.v2");
  assert.equal(ledger.source_sha, ledger.provenance.head_sha);
  assert.equal(ledger.provenance.head_semantics, "captured_pre_generation_head");
  assert.doesNotThrow(() => git("cat-file", "-e", `${ledger.provenance.head_sha}^{commit}`));
  assert.doesNotThrow(() => git("cat-file", "-e", `${ledger.provenance.base_sha}^{commit}`));
  assert.doesNotThrow(
    () => git("merge-base", "--is-ancestor", ledger.provenance.base_sha, ledger.provenance.head_sha),
    "captured base must be an ancestor of captured HEAD"
  );
  assert.doesNotThrow(
    () => git("merge-base", "--is-ancestor", ledger.provenance.head_sha, git("rev-parse", "HEAD")),
    "the containing commit may advance HEAD, but cannot rewrite the captured source history"
  );
  assert.match(ledger.provenance.branch, /\S/, "captured branch is required");
  assert.equal(Number.isNaN(Date.parse(ledger.captured_at)), false, "captured_at must be ISO-8601");
  assert.deepEqual(
    ledger.provenance.raw_argv,
    ["node", "scripts/generate-people-implementation-ledger.mjs", "--write"],
    "receipt must record the normalized argv that actually wrote it"
  );
  assert.equal(ledger.provenance.raw_argv_sha256, sha256(stableJson(ledger.provenance.raw_argv)));
  assert.equal(ledger.provenance.replay_command, PEOPLE_LEDGER_REPLAY_COMMAND);
  assert.equal(ledger.provenance.replay_command_sha256, sha256(PEOPLE_LEDGER_REPLAY_COMMAND));
  assert.equal(ledger.provenance.replay_command_sha256, inventory.replay_command_sha256);
  assert.equal(ledger.provenance.inventory_sha256, inventory.inventory_sha256);
  assert.equal(ledger.provenance.runtime_source_fingerprint_sha256, inventory.source_fingerprint_sha256);
  assert.equal(ledger.provenance.source_fingerprint_sha256, sourceFingerprint(ledger.provenance.source_files));

  const manualClaims = {
    classification: ledger.classification,
    inventory_semantics: ledger.inventory_semantics,
    routes: ledger.routes.map((entry) => ({
      route: entry.route,
      implementation_state: entry.implementation_state,
      domain_sources: entry.domain_sources,
      test_sources: entry.test_sources,
      gap: entry.gap
    }))
  };
  assert.equal(ledger.provenance.manual_claims_sha256, sha256(stableJson(manualClaims)));
  for (const entry of ledger.routes) {
    for (const sourcePath of [...entry.domain_sources, ...entry.test_sources]) {
      assert.ok(ledger.provenance.source_files.includes(sourcePath), `${entry.route}: evidence source is not fingerprinted`);
    }
  }
});

test("PEO-TUW-001 generator records the observed argv and preview stays read-only", () => {
  const before = readFileSync(ledgerPath, "utf8");
  const preview = JSON.parse(execFileSync(
    process.execPath,
    ["scripts/generate-people-implementation-ledger.mjs"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }
  ));

  assert.deepEqual(preview.provenance.raw_argv, [
    "node",
    "scripts/generate-people-implementation-ledger.mjs"
  ]);
  assert.equal(preview.provenance.raw_argv_sha256, sha256(stableJson(preview.provenance.raw_argv)));
  assert.equal(readFileSync(ledgerPath, "utf8"), before, "preview must not rewrite the receipt");
});

test("PEO-TUW-001 inventory equals the enabled and disabled People catalog in both directions", async () => {
  const ledger = loadLedger();
  const inventory = await buildPeopleImplementationInventory(repoRoot);
  const enabledCatalogRoutes = PEOPLE_FEATURE_ITEMS
    .filter((item) => item.route_enabled === true)
    .map((item) => item.section);
  const disabledCatalogRoutes = PEOPLE_FEATURE_ITEMS
    .filter((item) => item.route_enabled !== true)
    .map((item) => item.section);

  assert.deepEqual(ledger.sidebar_routes.enabled, enabledCatalogRoutes);
  assert.deepEqual(ledger.sidebar_routes.disabled, disabledCatalogRoutes);
  assert.deepEqual(ledger.routes.map((entry) => entry.route), enabledCatalogRoutes);
  assert.deepEqual(ledger.disabled_routes.map((entry) => entry.route), disabledCatalogRoutes);
  assert.deepEqual(inventory.enabled_route_ids, enabledCatalogRoutes);
  assert.deepEqual(inventory.disabled_route_ids, disabledCatalogRoutes);
  assert.equal(new Set(enabledCatalogRoutes).size, enabledCatalogRoutes.length);
  assert.equal(new Set(disabledCatalogRoutes).size, disabledCatalogRoutes.length);
  assert.deepEqual(
    enabledCatalogRoutes.filter((route) => disabledCatalogRoutes.includes(route)),
    [],
    "a sidebar route cannot be both enabled and disabled"
  );

  for (const entry of ledger.disabled_routes) {
    const catalogItem = PEOPLE_FEATURE_ITEMS.find((item) => item.section === entry.route);
    assert.ok(catalogItem, `${entry.route}: disabled catalog item is required`);
    assert.equal(catalogItem.route_enabled, false, `${entry.route}: disabled menu must remain disabled`);
    assert.equal(entry.route_enabled, false, `${entry.route}: ledger must preserve the disabled state`);
    assert.equal(entry.label, catalogItem.label, `${entry.route}: disabled label drift`);
    assert.equal(entry.catalog_state, catalogItem.state, `${entry.route}: disabled state drift`);
  }
});

test("PEO-TUW-001 route renderers and declared client-scope inventories match the source graph", async () => {
  const ledger = loadLedger();
  const inventory = await buildPeopleImplementationInventory(repoRoot);
  const runtimeByRoute = new Map(inventory.routes.map((entry) => [entry.route, entry]));
  const catalogByRoute = new Map(PEOPLE_FEATURE_ITEMS.map((item) => [item.section, item]));

  for (const entry of ledger.routes) {
    const runtime = runtimeByRoute.get(entry.route);
    const catalog = catalogByRoute.get(entry.route);
    assert.ok(runtime, `${entry.route}: PeopleHome renderer inventory is required`);
    assert.ok(catalog, `${entry.route}: catalog entry is required`);
    assert.equal(entry.label, catalog.label, `${entry.route}: label drift`);
    assert.equal(entry.catalog_state, catalog.state, `${entry.route}: state drift`);
    assert.equal(entry.catalog_implementation_state, catalog.implementation_state, `${entry.route}: catalog implementation state drift`);
    assert.deepEqual(entry.renderer_components, runtime.renderer_components, `${entry.route}: renderer component drift`);
    assert.deepEqual(entry.renderer_variants, runtime.renderer_variants, `${entry.route}: renderer variant drift`);
    assert.deepEqual(entry.component_sources, runtime.component_sources, `${entry.route}: component source drift`);
    assert.equal(entry.client_scope, runtime.client_scope, `${entry.route}: client reachability scope drift`);
    assert.ok(
      ["route_variant", "renderer_import_graph_superset"].includes(entry.client_scope),
      `${entry.route}: client scope semantics are required`
    );
    assert.deepEqual(entry.client_functions, runtime.client_functions, `${entry.route}: HRX client import drift`);
    assert.deepEqual(entry.excluded_client_functions, runtime.excluded_client_functions, `${entry.route}: route-variant exclusion drift`);
    assert.deepEqual(entry.api_routes, runtime.api_routes, `${entry.route}: client API operation drift`);
    assert.deepEqual(entry.api_route_policy_ids, runtime.api_route_policy_ids, `${entry.route}: API policy registration drift`);
    assert.deepEqual(
      sorted(Object.keys(entry.api_route_policy_ids)),
      sorted(entry.api_routes.filter((operation) => operation.includes(" /api/hrx/"))),
      `${entry.route}: every HRX client operation must have one registered policy`
    );
    assert.ok(entry.renderer_components.length > 0, `${entry.route}: enabled route needs a dedicated renderer`);
    assert.ok(entry.component_sources.length > 0, `${entry.route}: enabled route needs a component source`);
    assert.ok(entry.client_functions.length > 0, `${entry.route}: enabled route needs an HRX client export`);
    assert.ok(entry.api_routes.length > 0, `${entry.route}: enabled route needs a client API operation`);
    assert.ok(
      ["existing", "extend", "new", "provider-gated"].includes(entry.implementation_state),
      `${entry.route}: unknown implementation state`
    );

    for (const field of ["component_sources", "domain_sources", "test_sources"]) {
      assert.ok(Array.isArray(entry[field]), `${entry.route}: ${field} must be an array`);
      for (const sourcePath of entry[field]) {
        assert.equal(existsSync(path.join(repoRoot, sourcePath)), true, `${entry.route}: missing source ${sourcePath}`);
      }
    }
  }
});

test("PEO-TUW-001 records the dedicated close and pay-rules workspaces", () => {
  const ledger = loadLedger();
  const peopleHomeSource = readFileSync(path.join(repoRoot, "apps/web/src/people/PeopleHome.tsx"), "utf8");
  const close = ledger.routes.find((entry) => entry.route === "people-close");
  const payRules = ledger.routes.find((entry) => entry.route === "people-pay-rules");

  assert.match(
    peopleHomeSource,
    /currentSection === "people-close"[\s\S]*?<PayrollBoundaryPanel mode="close"/,
    "close route must mount the close-only renderer variant"
  );
  assert.deepEqual(close?.renderer_components, ["PayrollBoundaryPanel"]);
  assert.deepEqual(close?.renderer_variants, { PayrollBoundaryPanel: { mode: "close" } });
  assert.deepEqual(close?.component_sources, ["apps/web/src/people/payroll/PayrollBoundaryPanel.tsx"]);
  assert.equal(close?.client_scope, "route_variant");
  assert.deepEqual(close?.client_functions, [
    "approveHrxPayrollRun",
    "captureHrxPayrollRun",
    "closeHrxPayrollRun",
    "createHrxPayrollAdjustmentRun",
    "createHrxPayrollPeriod",
    "createHrxPayrollRun",
    "fetchHrxPayrollClosePrecheck",
    "fetchHrxPayrollRun",
    "fetchHrxPayrollWorkspace",
    "previewHrxPayrollRun",
    "requestHrxStepUpSession"
  ]);
  assert.deepEqual(close?.excluded_client_functions, [
    "approveHrxPayrollPayment",
    "calculateHrxPayrollYearEnd",
    "collectHrxPayrollYearEnd",
    "correctHrxPayrollFiling",
    "createHrxPayrollFiling",
    "exportHrxPayrollPayment",
    "prepareHrxPayrollPayment",
    "reconcileHrxPayrollPayment",
    "resolveHrxPayrollIssue",
    "retryFailedHrxPayrollPayment",
    "reviewHrxPayrollYearEnd",
    "safeHrxStepUpPurpose",
    "submitHrxPayrollFiling",
    "validateHrxPayrollFiling"
  ]);
  assert.deepEqual(close?.api_routes, [
    "GET /api/hrx/payroll/periods",
    "GET /api/hrx/payroll/runs/:runId",
    "GET /api/hrx/payroll/runs/:runId/precheck",
    "POST /api/auth/step-up",
    "POST /api/hrx/payroll/periods",
    "POST /api/hrx/payroll/runs",
    "POST /api/hrx/payroll/runs/:runId/approve",
    "POST /api/hrx/payroll/runs/:runId/close",
    "POST /api/hrx/payroll/runs/:runId/preview",
    "POST /api/hrx/payroll/runs/:runId/snapshot"
  ]);
  assert.equal(close?.implementation_state, "existing");
  assert.equal(close?.catalog_implementation_state, "existing");
  assert.deepEqual(payRules?.renderer_components, ["PayRulesWorkspace"]);
  assert.deepEqual(payRules?.component_sources, ["apps/web/src/people/payroll/PayRulesWorkspace.tsx"]);
  assert.equal(payRules?.implementation_state, "existing");
  assert.equal(payRules?.catalog_implementation_state, "existing");

  const payroll = ledger.routes.find((entry) => entry.route === "people-payroll");
  assert.ok(payroll?.api_routes.includes("POST /api/hrx/payroll/payment-batches/:batchId/approve"));
  assert.ok(payroll?.api_routes.includes("POST /api/hrx/payroll/filings/:filingJobId/submit"));
  assert.ok(payroll?.api_routes.includes("POST /api/hrx/payroll/runs/:runId/year-end/review"));
  assert.ok(!close?.api_routes.some((operation) => operation.includes("payment-batches")));
  assert.ok(!close?.api_routes.some((operation) => operation.includes("/filings")));
  assert.ok(!close?.api_routes.some((operation) => operation.includes("/year-end/")));
});
