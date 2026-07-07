import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const desktopRuntimeStoreDirName = "runtime-stores";
const mkdirParentDirectoriesOption = Object.freeze({ ["recursive"]: true });
const localDevRuntimeProfile = "local-dev";
const DESKTOP_STORE_PATH_MANIFEST = Object.freeze([
  ["hrxStorePath", "LAWOS_HRX_STORE_PATH", "hrx-store.json"],
  ["masterDataStorePath", "LAWOS_MASTER_DATA_STORE_PATH", "master-data-store.json"],
  ["matterStorePath", "LAWOS_MATTER_STORE_PATH", "matter-store.json"],
  ["dmsStorePath", "LAWOS_DMS_STORE_PATH", "dms-store.json"],
  ["crmStorePath", "LAWOS_CRM_STORE_PATH", "crm-store.json"],
  ["intakeStorePath", "LAWOS_INTAKE_STORE_PATH", "intake-store.json"],
  ["crmMasterDataStorePath", "LAWOS_CRM_MASTER_DATA_STORE_PATH", "crm-master-data-store.json"],
  ["financeStorePath", "LAWOS_FINANCE_STORE_PATH", "finance-store.json"],
  ["analyticsStorePath", "LAWOS_ANALYTICS_STORE_PATH", "analytics-store.json"],
  ["aiStorePath", "LAWOS_AI_STORE_PATH", "ai-store.json"],
  ["portalStorePath", "LAWOS_PORTAL_STORE_PATH", "portal-store.json"],
  ["uiReadinessStorePath", "LAWOS_UI_READINESS_STORE_PATH", "ui-readiness-store.json"],
  ["enterpriseReadinessStorePath", "LAWOS_ENTERPRISE_READINESS_STORE_PATH", "enterprise-readiness-store.json"],
  ["securityAuditStorePath", "LAWOS_AUDIT_STORE_PATH", "security-audit-events.ndjson"],
  ["authCredentialStorePath", "LAWOS_AUTH_CREDENTIAL_STORE_PATH", "auth/credential-store.json"],
  ["authPasswordResetStorePath", "LAWOS_AUTH_PASSWORD_RESET_STORE_PATH", "auth/password-reset-store.json"]
]);

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
      DESKTOP_STORE_PATH_MANIFEST.map(([key, envKey, fileName]) => [
        key,
        env[envKey] || join(storeDir, fileName)
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
  const api = await startApiServer({ port: 0, runtimeProfile: localDevRuntimeProfile, ...storePaths });
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
