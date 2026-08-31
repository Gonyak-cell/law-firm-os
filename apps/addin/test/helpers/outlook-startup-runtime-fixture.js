import { readyOutlookReadinessResponse } from "./outlook-readiness-fixture.js";

export const PRINCIPAL_REF = `odpr_${"A".repeat(43)}`;
export const OTHER_PRINCIPAL_REF = `odpr_${"B".repeat(43)}`;
export const PREPARATION_KEY = "lawos.outlook.prepare.v1";

let generation = 0;

export const subject = () => import(
  `../../src/outlook-startup-runtime.js?todo9=${generation += 1}`
);

export const signedSession = (patch = {}) => ({
  authenticated: true,
  principal: {
    tenant_id: "decoy-tenant",
    user_id: "decoy-user",
    outlook_desktop_principal_ref: OTHER_PRINCIPAL_REF,
  },
  session: {
    tenant_id: "todo9-tenant",
    user_id: "todo9-user",
    outlook_desktop_principal_ref: PRINCIPAL_REF,
    ...patch,
  },
});

export const connectionResponse = (patch = {}) => ({ item: {
  status: "connected",
  active: true,
  connection_id: "m365_connection_todo9_runtime",
  state_version: 7,
  mailbox_address: "qa@example.invalid",
  ...patch,
} });

export function storage(initial = null) {
  const values = new Map(initial === null ? [] : [[PREPARATION_KEY, initial]]);
  const calls = { get: 0, set: 0, remove: 0 };
  return {
    calls,
    values,
    api: {
      getItem(key) { calls.get += 1; return values.get(key) ?? null; },
      setItem(key, value) { calls.set += 1; values.set(key, value); },
      removeItem(key) { calls.remove += 1; values.delete(key); },
    },
    raw: () => values.get(PREPARATION_KEY) ?? null,
  };
}

export function startupFixture({
  store = storage(),
  session = signedSession(),
  connection = connectionResponse(),
  readiness = readyOutlookReadinessResponse(),
  bootstrap = { item: { ready: true, marker: "todo9-cold" } },
  holdSession = null,
  failPath = null,
  failStatus = 503,
} = {}) {
  const events = [];
  const requests = [];
  const acquireSession = async () => {
    events.push("session");
    if (holdSession) await holdSession;
    return session;
  };
  const requestJson = async (path, options = {}) => {
    events.push(path);
    requests.push({ path, options });
    if (path === failPath) throw Object.assign(new Error("request failed"), { status: failStatus });
    if (path === "/api/outlook/connection") return connection;
    if (path === "/api/outlook/readiness") return readiness;
    if (path === "/api/outlook/bootstrap") return bootstrap;
    throw new Error(`unexpected path: ${path}`);
  };
  return {
    acquireSession,
    events,
    requests,
    requestJson,
    store,
    input: {
      acquireSession,
      requestJson,
      storage: store?.api ?? store,
      officeMailboxAddress: "qa@example.invalid",
      build: "addin@todo9-test",
      cryptoImpl: globalThis.crypto,
    },
  };
}

export async function readyStore() {
  const store = storage();
  const fixture = startupFixture({ store });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);
  if (result?.state !== "ready") throw new Error("startup READY fixture failed");
  return store;
}
