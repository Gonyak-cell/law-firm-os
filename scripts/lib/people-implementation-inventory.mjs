import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  clientFunctionOperations,
  registeredPolicyIds
} from "./people-inventory-client-api.mjs";
import {
  peopleHomeRouteRenderers,
  routeClientFunctions
} from "./people-inventory-web-surface.mjs";

const PEOPLE_CATALOG_PATH = "apps/web/src/people/peopleFeatureCatalog.js";
const BASE_SOURCE_FILES = [
  "apps/api/src/routes/hrx/route-policy-map.js",
  "apps/web/src/people/PeopleHome.tsx",
  "apps/web/src/people/hrxApiClient.ts",
  PEOPLE_CATALOG_PATH,
  "apps/web/test/people-implementation-inventory.test.mjs",
  "scripts/generate-people-implementation-ledger.mjs",
  "scripts/lib/people-implementation-inventory.mjs",
  "scripts/lib/people-inventory-client-api.mjs",
  "scripts/lib/people-inventory-web-surface.mjs"
];
const ROUTE_CLIENT_VARIANTS = Object.freeze({
  "people-close": Object.freeze({
    renderer: "PayrollBoundaryPanel",
    required_props: Object.freeze({ mode: "close" }),
    client_functions: Object.freeze([
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
    ]),
    excluded_client_functions: Object.freeze([
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
    ])
  })
});

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

function sourceFingerprint(repoRoot, relativePaths) {
  const payload = [...new Set(relativePaths)]
    .sort()
    .map((relativePath) => `${relativePath}\0${readFileSync(path.join(repoRoot, relativePath), "utf8")}`)
    .join("\0");
  return sha256(payload);
}

function applyRouteClientVariant(route, rendered, clientInventory) {
  const variant = ROUTE_CLIENT_VARIANTS[route];
  if (!variant) return { ...clientInventory, client_scope: "renderer_import_graph_superset" };
  const actualProps = rendered.renderer_variants?.[variant.renderer] ?? {};
  for (const [name, expected] of Object.entries(variant.required_props)) {
    if (actualProps[name] !== expected) {
      throw new Error(`${route}: expected ${variant.renderer} ${name}=${expected}`);
    }
  }
  const imported = new Set(clientInventory.client_functions);
  const classified = new Set([...variant.client_functions, ...variant.excluded_client_functions]);
  for (const name of classified) {
    if (!imported.has(name)) throw new Error(`${route}: classified variant client is not imported by ${variant.renderer}: ${name}`);
  }
  for (const name of imported) {
    if (!classified.has(name)) throw new Error(`${route}: imported client needs route-variant classification: ${name}`);
  }
  return {
    ...clientInventory,
    client_functions: [...variant.client_functions].sort(),
    excluded_client_functions: [...variant.excluded_client_functions].sort(),
    client_scope: "route_variant"
  };
}

export const PEOPLE_LEDGER_REPLAY_COMMAND =
  "node scripts/generate-people-implementation-ledger.mjs --write";

export async function buildPeopleImplementationInventory(repoRoot) {
  const catalogUrl = `${pathToFileURL(path.join(repoRoot, PEOPLE_CATALOG_PATH)).href}?inventory=${Date.now()}`;
  const { PEOPLE_FEATURE_ITEMS } = await import(catalogUrl);
  const enabledItems = PEOPLE_FEATURE_ITEMS.filter((item) => item.route_enabled === true);
  const disabledItems = PEOPLE_FEATURE_ITEMS.filter((item) => item.route_enabled !== true);
  const renderers = peopleHomeRouteRenderers(repoRoot);
  const routes = [];
  const sourceFiles = new Set(BASE_SOURCE_FILES);

  for (const item of enabledItems) {
    const rendered = renderers.get(item.section) ?? {
      renderer_components: [],
      renderer_variants: {},
      component_sources: []
    };
    const importedClients = routeClientFunctions(repoRoot, rendered.component_sources);
    const clients = applyRouteClientVariant(item.section, rendered, importedClients);
    const apiRoutes = clientFunctionOperations(repoRoot, clients.client_functions);
    const policyIds = await registeredPolicyIds(repoRoot, apiRoutes);
    for (const sourceFile of [...rendered.component_sources, ...clients.source_files]) sourceFiles.add(sourceFile);
    routes.push({
      route: item.section,
      label: item.label,
      catalog_state: item.state,
      catalog_implementation_state: item.implementation_state,
      ...rendered,
      client_scope: clients.client_scope,
      client_functions: clients.client_functions,
      excluded_client_functions: clients.excluded_client_functions ?? [],
      api_routes: apiRoutes,
      api_route_policy_ids: policyIds
    });
  }

  const disabledRoutes = disabledItems.map((item) => ({
    route: item.section,
    label: item.label,
    catalog_state: item.state,
    route_enabled: false
  }));
  const runtime = { routes, disabled_routes: disabledRoutes };
  return {
    ...runtime,
    enabled_route_ids: routes.map((entry) => entry.route),
    disabled_route_ids: disabledRoutes.map((entry) => entry.route),
    inventory_sha256: sha256(stableJson(runtime)),
    source_fingerprint_sha256: sourceFingerprint(repoRoot, sourceFiles),
    source_files: [...sourceFiles].sort(),
    replay_command_sha256: sha256(PEOPLE_LEDGER_REPLAY_COMMAND)
  };
}
