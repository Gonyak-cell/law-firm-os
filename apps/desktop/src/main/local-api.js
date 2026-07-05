import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LAWOS_RUNTIME_PROFILES } from "../../../api/src/runtime-profile.js";
import { STORE_PATH_MANIFEST } from "../../../api/src/store-path-manifest.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const desktopRuntimeStoreDirName = "runtime-stores";
const mkdirParentDirectoriesOption = Object.freeze({ ["recursive"]: true });

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

export function desktopRuntimeStorePaths({
  env = process.env,
  mkdirSyncImpl = mkdirSync,
  userDataPath
} = {}) {
  const storeDir =
    env.MATTER_DESKTOP_RUNTIME_STORE_DIR || (userDataPath ? join(userDataPath, desktopRuntimeStoreDirName) : null);
  if (!storeDir) return Object.freeze({});
  mkdirSyncImpl(storeDir, mkdirParentDirectoriesOption);
  return Object.freeze(
    Object.fromEntries(
      STORE_PATH_MANIFEST.map((entry) => [
        entry.key,
        env[entry.env] || join(storeDir, entry.fileName)
      ])
    )
  );
}

export async function startDesktopLocalApiServer({
  env = process.env,
  existsSyncImpl = existsSync,
  mkdirSyncImpl = mkdirSync,
  startApiServerImpl,
  userDataPath,
  start = moduleDir
} = {}) {
  if (env.MATTER_DESKTOP_LOCAL_API_DISABLED === "1") return null;
  const entry = resolveDesktopApiServerEntry({ start, existsSyncImpl });
  if (!entry) return null;
  const startApiServer =
    startApiServerImpl ?? (await import(pathToFileURL(entry).toString())).startApiServer;
  const storePaths = desktopRuntimeStorePaths({ env, mkdirSyncImpl, userDataPath });
  const api = await startApiServer({ port: 0, runtimeProfile: LAWOS_RUNTIME_PROFILES.localDev, ...storePaths });
  return {
    ...api,
    entry,
    storePaths,
    baseUrl: `http://${api.host}:${api.port}`
  };
}

export function stopDesktopLocalApiServer(localApi) {
  localApi?.server?.close?.();
}
