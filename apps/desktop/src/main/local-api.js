import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const desktopRuntimeStoreDirName = "runtime-stores";
const mkdirParentDirectoriesOption = Object.freeze({ ["recursive"]: true });

const desktopRuntimeStoreFileNames = Object.freeze({
  hrxStorePath: "hrx-store.json",
  masterDataStorePath: "master-data-store.json",
  matterStorePath: "matter-store.json",
  dmsStorePath: "dms-store.json",
  crmStorePath: "crm-store.json",
  intakeStorePath: "intake-store.json",
  crmMasterDataStorePath: "crm-master-data-store.json",
  financeStorePath: "finance-store.json",
  analyticsStorePath: "analytics-store.json",
  aiStorePath: "ai-store.json",
  portalStorePath: "portal-store.json",
  uiReadinessStorePath: "ui-readiness-store.json",
  enterpriseReadinessStorePath: "enterprise-readiness-store.json"
});

const desktopRuntimeStoreEnvOverrides = Object.freeze({
  hrxStorePath: "LAWOS_HRX_STORE_PATH",
  masterDataStorePath: "LAWOS_MASTER_DATA_STORE_PATH",
  matterStorePath: "LAWOS_MATTER_STORE_PATH",
  dmsStorePath: "LAWOS_DMS_STORE_PATH",
  crmStorePath: "LAWOS_CRM_STORE_PATH",
  intakeStorePath: "LAWOS_INTAKE_STORE_PATH",
  crmMasterDataStorePath: "LAWOS_CRM_MASTER_DATA_STORE_PATH",
  financeStorePath: "LAWOS_FINANCE_STORE_PATH",
  analyticsStorePath: "LAWOS_ANALYTICS_STORE_PATH",
  aiStorePath: "LAWOS_AI_STORE_PATH",
  portalStorePath: "LAWOS_PORTAL_STORE_PATH",
  uiReadinessStorePath: "LAWOS_UI_READINESS_STORE_PATH",
  enterpriseReadinessStorePath: "LAWOS_ENTERPRISE_READINESS_STORE_PATH"
});

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
      Object.entries(desktopRuntimeStoreFileNames).map(([key, fileName]) => [
        key,
        env[desktopRuntimeStoreEnvOverrides[key]] || join(storeDir, fileName)
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
  const api = await startApiServer({ port: 0, ...storePaths });
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
