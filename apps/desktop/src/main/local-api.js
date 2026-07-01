import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function ancestorApiServerEntries(start = moduleDir) {
  const entries = [];
  let current = start;
  const root = parse(current).root;
  while (current && current !== root) {
    entries.push(join(current, "apps/api/src/server.js"));
    current = dirname(current);
  }
  entries.push(join(root, "apps/api/src/server.js"));
  return entries;
}

export function desktopApiServerEntryCandidates({ start = moduleDir } = {}) {
  return [
    join(start, "../../runtime/apps/api/src/server.js"),
    join(start, "../../../api/src/server.js"),
    ...ancestorApiServerEntries(start)
  ];
}

export function resolveDesktopApiServerEntry({ start = moduleDir, existsSyncImpl = existsSync } = {}) {
  return desktopApiServerEntryCandidates({ start }).find((candidate) => existsSyncImpl(candidate)) ?? null;
}

export async function startDesktopLocalApiServer({
  env = process.env,
  existsSyncImpl = existsSync,
  start = moduleDir
} = {}) {
  if (env.MATTER_DESKTOP_LOCAL_API_DISABLED === "1") return null;
  const entry = resolveDesktopApiServerEntry({ start, existsSyncImpl });
  if (!entry) return null;
  const { startApiServer } = await import(pathToFileURL(entry).toString());
  const api = await startApiServer({ port: 0 });
  return {
    ...api,
    entry,
    baseUrl: `http://${api.host}:${api.port}`
  };
}

export function stopDesktopLocalApiServer(localApi) {
  localApi?.server?.close?.();
}
