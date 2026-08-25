import { GRAPH_STATE } from "./addin-auth.js";
import { parseOutlookConnectionRecord } from "./outlook-connection-actions.js";
import { parseOutlookStartupBinding, presentOutlookReadiness } from "./outlook-readiness-status.js";

const PRINCIPAL_REF = /^odpr_[A-Za-z0-9_-]{43}$/u;
const SEALED_BUILD = /^addin@[A-Za-z0-9._-]{1,128}$/u;
const INVALID_SNAPSHOT = Symbol("invalid-outlook-startup-snapshot");
const SNAPSHOT_MAX_DEPTH = 8;
const SNAPSHOT_MAX_KEYS = 256;

const text = (value) => typeof value === "string" ? value.trim() : "";
const exactIdentity = (value) => typeof value === "string" && value !== "" && value === value.trim();
const mailbox = (value) => text(value).toLowerCase();
const outcome = (state, reason, extra = {}) => Object.freeze({ state, reason, ...extra });

function snapshotData(value, depth = 0, budget = { keys: 0 }) {
  if (value === null || ["string", "number", "boolean", "undefined"].includes(typeof value)) {
    return value;
  }
  if (typeof value !== "object" || depth > SNAPSHOT_MAX_DEPTH) return INVALID_SNAPSHOT;
  let descriptors;
  let prototype;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
    prototype = Object.getPrototypeOf(value);
  } catch {
    return INVALID_SNAPSHOT;
  }
  const array = Array.isArray(value);
  if (prototype !== (array ? Array.prototype : Object.prototype) && prototype !== null) {
    return INVALID_SNAPSHOT;
  }
  const keys = Reflect.ownKeys(descriptors);
  budget.keys += keys.length;
  if (budget.keys > SNAPSHOT_MAX_KEYS || keys.some((key) => typeof key !== "string")) {
    return INVALID_SNAPSHOT;
  }
  if (keys.some((key) => !Object.hasOwn(descriptors[key], "value"))) return INVALID_SNAPSHOT;
  if (array) {
    const length = descriptors.length?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > SNAPSHOT_MAX_KEYS) {
      return INVALID_SNAPSHOT;
    }
    const copy = new Array(length);
    for (const key of keys) {
      if (key === "length") continue;
      if (!/^(0|[1-9][0-9]*)$/u.test(key) || Number(key) >= length) return INVALID_SNAPSHOT;
      const nested = snapshotData(descriptors[key].value, depth + 1, budget);
      if (nested === INVALID_SNAPSHOT) return INVALID_SNAPSHOT;
      copy[Number(key)] = nested;
    }
    return Object.freeze(copy);
  }
  const copy = Object.create(null);
  for (const key of keys) {
    const nested = snapshotData(descriptors[key].value, depth + 1, budget);
    if (nested === INVALID_SNAPSHOT) return INVALID_SNAPSHOT;
    copy[key] = nested;
  }
  return Object.freeze(copy);
}

export function snapshotOutlookStartupObject(value) {
  const snapshot = snapshotData(value);
  return snapshot !== INVALID_SNAPSHOT
    && snapshot !== null
    && typeof snapshot === "object"
    && !Array.isArray(snapshot)
    ? snapshot
    : null;
}

export function classifyOutlookStartupSession(value, build) {
  const snapshot = snapshotOutlookStartupObject(value);
  if (snapshot?.authenticated !== true) {
    const reason = snapshot?.safe_error_code === "LAWOS_INTERACTION_REQUIRED"
      ? "interaction_required"
      : "no_credential";
    return outcome("login_required", reason, { authenticated: false });
  }
  const session = snapshot.session;
  const tenantId = session?.tenant_id;
  const userId = session?.user_id;
  const principalRef = session?.outlook_desktop_principal_ref;
  const revision = typeof build === "string" && build === build.trim() && SEALED_BUILD.test(build)
    ? build
    : "";
  if (
    !exactIdentity(tenantId)
    || !exactIdentity(userId)
    || !exactIdentity(principalRef)
    || !PRINCIPAL_REF.test(principalRef)
    || !revision
  ) {
    return outcome("login_required", "no_credential", { authenticated: false });
  }
  return outcome("authenticated", null, {
    authenticated: true,
    identity: Object.freeze({
      tenant_id: tenantId,
      user_id: userId,
      principal_ref: principalRef,
      build: revision,
    }),
  });
}

function installationRevoked(body) {
  const installation = body?.item?.installation;
  return installation?.release_trusted !== true
    || installation?.state !== "active"
    || installation?.retired_at !== null;
}

export function classifyOutlookStartupAuthority({
  identity,
  connectionBody,
  readinessBody,
  officeMailboxAddress,
} = {}) {
  const connectionSnapshot = snapshotOutlookStartupObject(connectionBody);
  const readinessSnapshot = snapshotOutlookStartupObject(readinessBody);
  if (!connectionSnapshot || !readinessSnapshot) {
    return outcome("deferred", "transient_failure", { authenticated: true });
  }
  let connection;
  try { connection = parseOutlookConnectionRecord(connectionSnapshot); } catch {
    return outcome("deferred", "transient_failure", { authenticated: true });
  }
  const frozenConnection = Object.freeze({
    ...connection,
    missingScopes: Object.freeze([...connection.missingScopes]),
  });
  const presentation = presentOutlookReadiness(readinessSnapshot);
  if (connection.state !== GRAPH_STATE.connected) {
    return outcome("connection_required", "connection_required", {
      authenticated: true,
      connection: frozenConnection,
      presentation,
    });
  }
  if (
    !mailbox(officeMailboxAddress)
    || mailbox(connection.mailboxAddress) !== mailbox(officeMailboxAddress)
  ) {
    return outcome("revoked", "account_mismatch", {
      authenticated: true,
      connection: frozenConnection,
      presentation,
    });
  }
  if (installationRevoked(readinessSnapshot)) {
    return outcome("revoked", "installation_revoked", {
      authenticated: true,
      connection: frozenConnection,
      presentation,
    });
  }
  const projected = parseOutlookStartupBinding(readinessSnapshot, {
    principal_ref: identity?.principal_ref,
  });
  if (!projected || projected.delegated_connection_state_version !== connection.stateVersion) {
    return outcome("revoked", "account_mismatch", {
      authenticated: true,
      connection: frozenConnection,
      presentation,
    });
  }
  return outcome("ready", null, {
    authenticated: true,
    connection: frozenConnection,
    presentation,
    binding: Object.freeze({
      ...identity,
      mailbox_address: mailbox(officeMailboxAddress),
      ...projected,
    }),
  });
}
