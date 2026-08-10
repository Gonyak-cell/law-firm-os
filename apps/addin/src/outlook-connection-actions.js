import { GRAPH_STATE } from "./addin-auth.js";

const VERSION_CONFLICT = "M365_CONNECTION_VERSION_CONFLICT";
const CREDENTIAL_CLEANUP_PENDING =
  "M365_CONNECTION_CREDENTIAL_CLEANUP_PENDING";
const RESPONSE_INVALID = "API_RESPONSE_INVALID";
const CONNECTION_ID_ALIASES = Object.freeze([
  "id",
  "m365ConnectionId",
  "m365_connection_id",
  "connectionId",
]);

function invalidResponse() {
  return Object.assign(new Error(RESPONSE_INVALID), {
    safe_error_code: RESPONSE_INVALID,
  });
}

function assertRuntime(readConnection, deleteConnection) {
  if (
    typeof readConnection !== "function"
    || typeof deleteConnection !== "function"
  ) {
    throw new TypeError("Outlook connection actions are required");
  }
}

export function isOutlookConnectionDisconnected(connection) {
  const status = String(connection?.status ?? "").trim().toLowerCase();
  return status === "not_connected" || status === "revoked";
}

export function outlookConnectionPayload(body) {
  return body?.item?.connection
    ? body.item
    : body?.item
      ?? body?.connection
      ?? body;
}

function connectionIdRecords(body, item, connection) {
  const records = [];
  const seen = new Set();
  for (const record of [body, item, connection]) {
    if (
      !record
      || typeof record !== "object"
      || Array.isArray(record)
      || seen.has(record)
    ) continue;
    seen.add(record);
    records.push(record);
  }
  return records;
}

function parseCanonicalConnectionId({ body, item, connection, status }) {
  const records = connectionIdRecords(body, item, connection);
  if (records.some((record) => CONNECTION_ID_ALIASES.some((field) => Object.hasOwn(record, field)))) {
    throw invalidResponse();
  }
  const canonicalRecords = records.filter((record) => Object.hasOwn(record, "connection_id"));
  if (canonicalRecords.length > 1) throw invalidResponse();
  if (canonicalRecords.length === 0) {
    if (["not_connected", "unavailable"].includes(status)) return null;
    throw invalidResponse();
  }
  const rawId = canonicalRecords[0].connection_id;
  if (["not_connected", "unavailable"].includes(status)) {
    if (rawId === null) return null;
    throw invalidResponse();
  }
  if (typeof rawId !== "string" || rawId.trim() === "") throw invalidResponse();
  return rawId.trim();
}

export function parseOutlookConnectionRecord(body) {
  const item = outlookConnectionPayload(body);
  const connection = item?.connection ?? item;
  const status = [
    connection?.status,
    connection?.connection_state,
    item?.status,
    item?.connection_state,
  ].find((value) => typeof value === "string" && value.trim())?.trim().toLowerCase();
  if (!status) {
    throw invalidResponse();
  }
  if (
    (["not_connected", "revoked"].includes(status) && connection?.active !== false)
    || (status === "connected" && connection?.active !== true)
  ) {
    throw invalidResponse();
  }
  const m365ConnectionId = parseCanonicalConnectionId({
    body,
    item,
    connection,
    status,
  });
  const rawStateVersion = connection && Object.hasOwn(connection, "state_version")
    ? connection.state_version
    : item?.state_version;
  let stateVersion = rawStateVersion;
  if (status === "not_connected" && rawStateVersion == null) {
    stateVersion = 0;
  }
  if (
    !Number.isSafeInteger(stateVersion)
    || (status === "not_connected" ? stateVersion !== 0 : stateVersion < 1)
  ) throw invalidResponse();
  const rawCredentialCleanupPending = connection
    && Object.hasOwn(connection, "credential_cleanup_pending")
    ? connection.credential_cleanup_pending
    : item?.credential_cleanup_pending;
  if (
    rawCredentialCleanupPending !== undefined
    && typeof rawCredentialCleanupPending !== "boolean"
  ) throw invalidResponse();
  let state = GRAPH_STATE.unavailable;
  if (status === "connected" && connection?.active !== false) {
    state = GRAPH_STATE.connected;
  } else if (["expired", "scope_insufficient", "reauthorization_required"].includes(status)) {
    state = GRAPH_STATE.reconnectRequired;
  } else if (["not_connected", "revoked", "unavailable"].includes(status)) {
    state = GRAPH_STATE.notConnected;
  }
  return {
    state,
    status,
    stateVersion,
    m365ConnectionId,
    missingScopes: Array.isArray(connection?.missing_scopes) ? connection.missing_scopes : [],
    mailboxAddress: connection?.mailbox_address ?? item?.mailbox_address ?? null,
    authorizationUrl: item?.authorization_url ?? body?.authorization_url ?? null,
    oauthState: item?.state ?? body?.state ?? null,
    credentialCleanupPending: rawCredentialCleanupPending === true,
  };
}

function cleanupPendingError(connection) {
  return Object.assign(
    new Error(CREDENTIAL_CLEANUP_PENDING),
    {
      safe_error_code: CREDENTIAL_CLEANUP_PENDING,
      authoritative_connection: connection,
    },
  );
}

async function disconnectConnection({
  current,
  readConnection,
  deleteConnection,
  retryVersionConflict,
  cleanupRetryAvailable,
}) {
  try {
    const deleted = await deleteConnection(current);
    if (isOutlookConnectionDisconnected(deleted)) {
      if (deleted.credentialCleanupPending === true) {
        if (!cleanupRetryAvailable) throw cleanupPendingError(deleted);
        return disconnectConnection({
          current: deleted,
          readConnection,
          deleteConnection,
          retryVersionConflict: false,
          cleanupRetryAvailable: false,
        });
      }
      return Object.freeze({ outcome: "disconnected", connection: deleted });
    }
  } catch (error) {
    if (error?.safe_error_code === CREDENTIAL_CLEANUP_PENDING) throw error;
    let observed;
    try {
      observed = await readConnection();
    } catch {
      throw error;
    }
    if (isOutlookConnectionDisconnected(observed)) {
      if (observed.credentialCleanupPending === true) {
        if (!cleanupRetryAvailable) throw cleanupPendingError(observed);
        return disconnectConnection({
          current: observed,
          readConnection,
          deleteConnection,
          retryVersionConflict: false,
          cleanupRetryAvailable: false,
        });
      }
      return Object.freeze({
        outcome: "disconnected_after_ambiguous_response",
        connection: observed,
      });
    }
    if (
      retryVersionConflict
      && error?.safe_error_code === VERSION_CONFLICT
      && observed.stateVersion !== current?.stateVersion
    ) {
      return disconnectConnection({
        current: observed,
        readConnection,
        deleteConnection,
        retryVersionConflict: false,
        cleanupRetryAvailable,
      });
    }
    error.authoritative_connection = observed;
    throw error;
  }

  const observed = await readConnection();
  if (isOutlookConnectionDisconnected(observed)) {
    if (observed.credentialCleanupPending === true) {
      if (!cleanupRetryAvailable) throw cleanupPendingError(observed);
      return disconnectConnection({
        current: observed,
        readConnection,
        deleteConnection,
        retryVersionConflict: false,
        cleanupRetryAvailable: false,
      });
    }
    return Object.freeze({ outcome: "disconnected", connection: observed });
  }
  throw Object.assign(
    new Error("Outlook disconnect was not confirmed"),
    {
      safe_error_code: "M365_CONNECTION_DISCONNECT_NOT_CONFIRMED",
      authoritative_connection: observed,
    },
  );
}

export async function disconnectCurrentOutlookConnection({
  readConnection,
  deleteConnection,
} = {}) {
  assertRuntime(readConnection, deleteConnection);
  const current = await readConnection();
  if (String(current?.status ?? "").trim().toLowerCase() === "not_connected") {
    return Object.freeze({
      outcome: "already_disconnected",
      connection: current,
    });
  }
  return disconnectConnection({
    current,
    readConnection,
    deleteConnection,
    retryVersionConflict: true,
    cleanupRetryAvailable: true,
  });
}
