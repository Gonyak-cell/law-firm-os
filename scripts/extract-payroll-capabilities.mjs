import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { listHrxRoutePolicies } from "../apps/api/src/routes/hrx/route-policy-map.js";
import { loadHrxCoreMigrations } from "../packages/hrx/src/migrations/index.js";
import {
  HRX_DURABLE_CORE_TABLES,
  HRX_DURABLE_WORKFLOW_TABLES,
} from "../packages/hrx/src/store/port.js";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), "..");
const peopleRoot = resolve(repoRoot, "apps/web/src/people");
const clientPath = resolve(peopleRoot, "hrxApiClient.ts");

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

async function sourceHashManifest(paths) {
  return Promise.all(
    sortedUnique(paths).map(async (path) => ({
      path: posixRelative(repoRoot, path),
      sha256: createHash("sha256").update(await readFile(path)).digest("hex"),
    })),
  );
}

function hashSourceManifest(manifest) {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

function posixRelative(root, path) {
  return relative(root, path).split(sep).join("/");
}

async function walk(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(entryPath));
    else files.push(entryPath);
  }
  return files;
}

function exportedPayrollClientCapabilities(source) {
  const exports = [...source.matchAll(/export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  return exports
    .map((match, index) => {
      const end = exports[index + 1]?.index ?? source.length;
      return { client_function: match[1], source: source.slice(match.index, end) };
    })
    .filter((entry) => entry.source.includes("/api/hrx/payroll"))
    .map((entry) => {
      const rawPath = entry.source.match(/([`"'])(\/api\/hrx\/payroll[\s\S]*?)\1/)?.[2] ?? null;
      const pathnameSample = rawPath
        ?.replace(/\$\{[^}]+\}/g, "sample")
        .split("?")[0]
        ?? null;
      return {
        client_function: entry.client_function,
        method: entry.source.match(/\bmethod:\s*["']([A-Z]+)["']/)?.[1] ?? "GET",
        pathname_sample: pathnameSample,
      };
    })
    .sort((left, right) => left.client_function.localeCompare(right.client_function));
}

function importSpecifiers(source) {
  return sortedUnique([
    ...[...source.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]),
    ...[...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1]),
  ]);
}

function executableModuleBody(source) {
  return source
    .replace(/^\s*import[\s\S]*?\s+from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "");
}

async function existingModulePath(importerPath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const unresolved = resolve(dirname(importerPath), specifier);
  const candidates = /\.[cm]?[jt]sx?$/.test(unresolved)
    ? [unresolved]
    : [
        unresolved,
        ...[".tsx", ".ts", ".jsx", ".js", ".mjs"].map((extension) => `${unresolved}${extension}`),
        ...["index.tsx", "index.ts", "index.jsx", "index.js"].map((name) => resolve(unresolved, name)),
      ];
  for (const candidate of candidates) {
    const relativePath = relative(peopleRoot, candidate);
    if (relativePath.startsWith("..") || relativePath === "") continue;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next native module resolution candidate.
    }
  }
  return null;
}

async function reachablePeopleSources(entryPath) {
  const pending = [entryPath];
  const reached = new Set();
  while (pending.length) {
    const path = pending.pop();
    if (!path || reached.has(path)) continue;
    reached.add(path);
    const source = await readFile(path, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const importedPath = await existingModulePath(path, specifier);
      if (importedPath && !reached.has(importedPath)) pending.push(importedPath);
    }
  }
  return [...reached].sort();
}

function destructuredFunctionParameters(source, functionName) {
  const marker = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\(\\s*\\{`);
  const match = source.match(marker);
  if (!match || match.index === undefined) return [];
  const openIndex = source.indexOf("{", match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let closeIndex = -1;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        closeIndex = index;
        break;
      }
    }
  }
  if (closeIndex < 0) return [];

  const parts = [];
  let current = "";
  depth = 0;
  quote = null;
  escaped = false;
  for (const character of source.slice(openIndex + 1, closeIndex)) {
    if (quote) {
      current += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      current += character;
      continue;
    }
    if ("{[(".includes(character)) depth += 1;
    if ("}])".includes(character)) depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts
    .map((part) => part.trim().match(/^([A-Za-z_$][\w$]*)/)?.[1] ?? null)
    .filter(Boolean);
}

function bracedBlockAfter(source, startIndex) {
  const openIndex = source.indexOf("{", startIndex);
  if (openIndex < 0 || openIndex - startIndex > 500) return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  return null;
}

async function extractExternalPayrollPolicies() {
  const apiSourceRoot = resolve(repoRoot, "apps/api/src");
  const paths = (await walk(apiSourceRoot)).filter((path) => path.endsWith(".js"));
  const serverSource = await readFile(resolve(apiSourceRoot, "server.js"), "utf8");
  const policies = [];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    const stringConstants = new Map(
      [...source.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*["']([^"']+)["']/g)]
        .map((match) => [match[1], match[2]]),
    );
    for (const match of source.matchAll(/export\s+const\s+[A-Za-z_$][\w$]*POLICY\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/g)) {
      const body = match[1];
      const id = body.match(/\bid:\s*["'](hrx\.payroll\.[^"']+)["']/)?.[1];
      if (!id) continue;
      const method = body.match(/\bmethod:\s*["']([A-Z]+)["']/)?.[1] ?? null;
      const pathnameToken = body.match(/\bpathname:\s*([^,\n]+)/)?.[1]?.trim() ?? null;
      const pathname = pathnameToken?.match(/^["']([^"']+)["']$/)?.[1]
        ?? stringConstants.get(pathnameToken)
        ?? null;
      const registrationGuard = [...source.matchAll(/export\s+function\s+(is[A-Z][A-Za-z0-9_$]*)\s*\(/g)]
        .map((guardMatch) => guardMatch[1])
        .find((name) => serverSource.includes(`${name}(`)) ?? null;
      const registrationHandler = registrationGuard
        ? `handle${registrationGuard.slice(2)}`
        : null;
      const handlerExported = registrationHandler
        ? new RegExp(`export\\s+(?:async\\s+)?function\\s+${registrationHandler}\\s*\\(`).test(source)
        : false;
      const dispatchWired = registrationGuard && handlerExported
        ? [...serverSource.matchAll(new RegExp(`\\b${registrationGuard}\\s*\\(`, "g"))]
          .some((guardCall) => bracedBlockAfter(serverSource, guardCall.index)
            ?.includes(`${registrationHandler}(`))
        : false;
      policies.push({
        id,
        method,
        pathname,
        authentication: body.match(/\bauthentication:\s*["']([^"']+)["']/)?.[1] ?? null,
        source: posixRelative(repoRoot, path),
        registered: dispatchWired,
        registration_guard: registrationGuard,
        registration_handler: registrationHandler,
        registration_source: dispatchWired ? "apps/api/src/server.js" : null,
      });
    }
  }
  return policies;
}

function extractMigrationSchemas() {
  const registeredHrxTables = new Set([...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES]);
  const migrations = loadHrxCoreMigrations()
    .filter((migration) => /(?:payroll|payment_reconciliation|minimum_wage|attendance_approval_receipts)/.test(migration.id))
    .map((migration) => {
      const schemaIdentifiers = sortedUnique(
        [
          ...[...migration.sql.matchAll(
            /(?:CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?|ALTER\s+TABLE\s+|REFERENCES\s+|ON\s+)(hrx_[a-z0-9_]+)/gi,
          )].map((match) => match[1]),
          ...(migration.sql.match(/\bhrx_[a-z0-9_]+\b/gi) ?? [])
            .map((identifier) => identifier.toLowerCase())
            .filter((identifier) => registeredHrxTables.has(identifier)),
        ],
      );
      return {
        migration_id: migration.id,
        filename: migration.filename,
        schema_identifiers: schemaIdentifiers,
      };
    });
  return {
    migrations,
    schema_identifiers: sortedUnique(migrations.flatMap((migration) => migration.schema_identifiers)),
  };
}

async function extractProviderPorts() {
  const runtimeSource = await readFile(resolve(repoRoot, "apps/api/src/hrx-payroll-runtime.js"), "utf8");
  const serverSource = await readFile(resolve(repoRoot, "apps/api/src/server.js"), "utf8");
  const runtimePorts = destructuredFunctionParameters(runtimeSource, "createHrxPayrollRuntime")
    .filter((name) => /(?:Port|Adapter|Resolver)$/.test(name));
  const callbackPorts = destructuredFunctionParameters(serverSource, "createApiServer")
    .filter((name) => /^payroll.*ProviderVerifier$/i.test(name));
  return sortedUnique([...runtimePorts, ...callbackPorts]);
}

export function hashPayrollCapabilityInventory(inventory) {
  const { inventory_sha256: _existingHash, ...hashableInventory } = inventory;
  return createHash("sha256").update(JSON.stringify(hashableInventory)).digest("hex");
}

export async function extractPayrollCapabilityInventory() {
  const clientSource = await readFile(clientPath, "utf8");
  const clientCapabilities = exportedPayrollClientCapabilities(clientSource);
  const clientFunctions = clientCapabilities.map((entry) => entry.client_function);
  const reachableSources = await reachablePeopleSources(resolve(peopleRoot, "PeopleHome.tsx"));
  const surfaceActions = [];
  for (const path of reachableSources) {
    if (!/\.[jt]sx$/.test(path)) continue;
    const source = await readFile(path, "utf8");
    const executableSource = executableModuleBody(source);
    const functions = clientFunctions.filter(
      (name) => new RegExp(`\\b${name}\\s*\\(`).test(executableSource),
    );
    if (functions.length) {
      surfaceActions.push({
        surface: posixRelative(peopleRoot, path),
        client_functions: functions.sort(),
      });
    }
  }

  const sessionPolicies = listHrxRoutePolicies()
    .filter((policy) => policy.id.startsWith("hrx.payroll."))
    .map((policy) => ({
      id: policy.id,
      method: policy.method,
      pattern: policy.pattern,
      pathname: null,
      authentication: "session_scope",
      source: "apps/api/src/routes/hrx/route-policy-map.js",
      registered: true,
      registration_guard: "resolveHrxRoutePolicy",
      registration_handler: null,
      registration_source: "apps/api/src/routes/hrx/route-policy-map.js",
    }));
  const routePolicies = [...sessionPolicies, ...await extractExternalPayrollPolicies()]
    .sort((left, right) => left.id.localeCompare(right.id));
  const migrationInventory = extractMigrationSchemas();
  const serverSourceManifest = await sourceHashManifest([
    resolve(repoRoot, "apps/api/src/routes/hrx/route-policy-map.js"),
    resolve(repoRoot, "apps/api/src/server.js"),
    resolve(repoRoot, "apps/api/src/hrx-payroll-runtime.js"),
    ...routePolicies.map((policy) => resolve(repoRoot, policy.source)),
  ]);
  const webSourceManifest = await sourceHashManifest([clientPath, ...reachableSources]);
  const migrationSourceManifest = await sourceHashManifest([
    resolve(repoRoot, "packages/hrx/src/migrations/index.js"),
    resolve(repoRoot, "packages/hrx/src/store/port.js"),
    ...migrationInventory.migrations.map((migration) => (
      resolve(repoRoot, "packages/hrx/src/migrations", migration.filename)
    )),
  ]);
  const authoritySourceManifest = [
    ...serverSourceManifest,
    ...webSourceManifest,
    ...migrationSourceManifest,
  ].filter((entry, index, entries) => (
    entries.findIndex((candidate) => candidate.path === entry.path) === index
  )).sort((left, right) => left.path.localeCompare(right.path));
  const inventory = {
    route_policies: routePolicies,
    client_capabilities: clientCapabilities,
    client_functions: clientFunctions,
    surface_actions: surfaceActions.sort((left, right) => left.surface.localeCompare(right.surface)),
    migrations: migrationInventory.migrations,
    schema_identifiers: migrationInventory.schema_identifiers,
    provider_ports: await extractProviderPorts(),
    authority_source_hashes: {
      server_contracts_sha256: hashSourceManifest(serverSourceManifest),
      web_reachable_graph_sha256: hashSourceManifest(webSourceManifest),
      migration_schema_sha256: hashSourceManifest(migrationSourceManifest),
      aggregate_sha256: hashSourceManifest(authoritySourceManifest),
      source_count: authoritySourceManifest.length,
    },
  };
  return Object.freeze({
    ...inventory,
    inventory_sha256: hashPayrollCapabilityInventory(inventory),
  });
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  process.stdout.write(`${JSON.stringify(await extractPayrollCapabilityInventory(), null, 2)}\n`);
}
