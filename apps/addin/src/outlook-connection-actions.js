import { GRAPH_STATE } from "./addin-auth.js";

const VERSION_CONFLICT = "M365_CONNECTION_VERSION_CONFLICT";
const RESPONSE_INVALID = "API_RESPONSE_INVALID";

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
    missingScopes: Array.isArray(connection?.missing_scopes) ? connection.missing_scopes : [],
    mailboxAddress: connection?.mailbox_address ?? item?.mailbox_address ?? null,
    authorizationUrl: item?.authorization_url ?? body?.authorization_url ?? null,
    oauthState: item?.state ?? body?.state ?? null,
  };
}

async function disconnectConnection({
  current,
  readConnection,
  deleteConnection,
  retryVersionConflict,
}) {
  try {
    const deleted = await deleteConnection(current);
    if (isOutlookConnectionDisconnected(deleted)) {
      return Object.freeze({ outcome: "disconnected", connection: deleted });
    }
  } catch (error) {
    let observed;
    try {
      observed = await readConnection();
    } catch {
      throw error;
    }
    if (isOutlookConnectionDisconnected(observed)) {
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
      });
    }
    error.authoritative_connection = observed;
    throw error;
  }

  const observed = await readConnection();
  if (isOutlookConnectionDisconnected(observed)) {
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
  });
}
