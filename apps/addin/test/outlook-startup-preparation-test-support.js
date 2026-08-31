import { createHash } from "node:crypto";

export const KEY = "lawos.outlook.prepare.v1";
export const READY_MS = 8 * 60 * 60 * 1000;
export const MARKER_MS = 30 * 1000;
export const SKEW_MS = 60 * 1000;
export const T0 = 1_800_000_000_000;
export const OWNER_A = "00000000-0000-4000-8000-000000000001";
export const OWNER_B = "00000000-0000-4000-8000-000000000002";
export const PRINCIPAL_REF = `odpr_${"A".repeat(43)}`;
export const SECRET_TOKEN = "lawos_session_v1.callback-secret";
export const SECRET_MAILBOX = "privileged-lawyer@example.invalid";

export const digest = async (value) => createHash("sha256").update(value).digest("hex");
export const subject = () => import("../src/outlook-startup-preparation.js");

export const binding = (patch = {}) => ({
  tenant_id: "tenant-a",
  user_id: "user-a",
  principal_ref: PRINCIPAL_REF,
  mailbox_address: SECRET_MAILBOX,
  installation_id: "odi_startup_preparation_000001",
  installation_state_version: 7,
  delegated_connection_state_version: 11,
  build: "addin@09ad50c275292899a03b46962493cf39ce714b09",
  ...patch,
});

export const clock = (value = T0) => ({ value, now() { return this.value; } });

export function storage(initial = null, behavior = {}) {
  const values = new Map(initial === null ? [] : [[KEY, initial]]);
  const calls = { get: 0, set: 0, remove: 0 };
  return {
    calls,
    values,
    api: {
      async getItem(key) {
        calls.get += 1;
        await behavior.beforeGet?.({ calls, values });
        return values.get(key) ?? null;
      },
      async setItem(key, value) {
        calls.set += 1;
        await behavior.beforeSet?.({ calls, values, value });
        if (!behavior.noOpSet) values.set(key, value);
        await behavior.afterSet?.({ calls, values, value });
      },
      async removeItem(key) {
        calls.remove += 1;
        await behavior.beforeRemove?.({ calls, values });
        if (!behavior.noOpRemove) values.delete(key);
      },
    },
    raw: () => values.get(KEY) ?? null,
    replace: (value) => {
      if (value === null) values.delete(KEY);
      else values.set(KEY, value);
    },
  };
}

export async function storedBinding(input = binding()) {
  const [tenant, user, principal, mailbox, build] = await Promise.all([
    input.tenant_id, input.user_id, input.principal_ref, input.mailbox_address, input.build,
  ].map(digest));
  return {
    tenant_hash: tenant,
    user_hash: user,
    subject_hash: principal,
    mailbox_hash: mailbox,
    build_hash: build,
    installation_id: input.installation_id,
    installation_state_version: input.installation_state_version,
    delegated_connection_state_version: input.delegated_connection_state_version,
  };
}

export async function readyRaw(input = binding(), at = T0) {
  return JSON.stringify({
    schema: KEY,
    state: "ready",
    binding: await storedBinding(input),
    prepared_at: at,
    expires_at: at + READY_MS,
  });
}

export async function markerRaw(input = binding(), at = T0, owner = OWNER_A) {
  return JSON.stringify({
    schema: KEY,
    state: "preparing",
    binding: await storedBinding(input),
    marker_owner: owner,
    marker_started_at: at,
    marker_expires_at: at + MARKER_MS,
  });
}

export async function machine({
  store,
  time = clock(),
  prepare = async () => ({ state: "ready" }),
  owner = OWNER_A,
  hash = digest,
} = {}) {
  const { createOutlookStartupPreparation } = await subject();
  return createOutlookStartupPreparation({
    storage: store?.api ?? store,
    now: () => typeof time === "number" ? time : time.now(),
    createMarkerId: () => owner,
    hash,
    prepare,
  });
}

export async function eventually(predicate) {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("condition not reached");
}
