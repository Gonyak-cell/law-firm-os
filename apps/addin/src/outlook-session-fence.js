function text(value) {
  return typeof value === "string" ? value : "";
}

function normalizedToken(value) {
  return text(value).trim();
}

export function createOutlookAuthOwnerFence() {
  let ownerEpoch = 0;
  let ownerToken = null;
  let allowTokenAdoption = true;

  const snapshot = ({ tokenBound = false, token = ownerToken } = {}) => Object.freeze({
    ownerEpoch,
    token: tokenBound ? normalizedToken(token) : null,
    tokenBound,
  });

  return Object.freeze({
    capture() {
      return snapshot();
    },
    begin({ token = null, allowTokenAdoption: nextAllowTokenAdoption = false } = {}) {
      ownerEpoch += 1;
      const value = token === null ? "" : normalizedToken(token);
      ownerToken = value || null;
      allowTokenAdoption = nextAllowTokenAdoption === true;
      return snapshot();
    },
    restart() {
      ownerEpoch += 1;
      return snapshot();
    },
    bindToken(owner, token) {
      if (!owner || owner.ownerEpoch !== ownerEpoch) return null;
      const value = normalizedToken(token);
      if (!value) return null;
      if (ownerToken === null && allowTokenAdoption) ownerToken = value;
      if (ownerToken === null || ownerToken !== value) return null;
      return snapshot({ tokenBound: true, token: value });
    },
    setToken(owner, token) {
      if (!owner || owner.ownerEpoch !== ownerEpoch || owner.tokenBound) return false;
      const value = normalizedToken(token);
      if (!value) return false;
      if (ownerToken !== null && ownerToken !== value) return false;
      ownerToken = value;
      allowTokenAdoption = false;
      return true;
    },
    clearToken(owner) {
      if (!owner || owner.ownerEpoch !== ownerEpoch) return false;
      if (owner.tokenBound && owner.token !== (ownerToken ?? "")) return false;
      ownerToken = null;
      allowTokenAdoption = false;
      return true;
    },
    isCurrent(owner) {
      return Boolean(owner)
        && owner.ownerEpoch === ownerEpoch
        && (!owner.tokenBound || owner.token === (ownerToken ?? ""));
    },
    currentToken() {
      return ownerToken ?? "";
    },
    canUsePersistedToken(owner) {
      if (!owner || owner.ownerEpoch !== ownerEpoch) return false;
      return ownerToken !== null || allowTokenAdoption;
    },
  });
}

export function createOutlookBusyFence() {
  let active = null;
  return Object.freeze({
    begin(label = "operation") {
      const token = Symbol(label);
      active = token;
      return token;
    },
    end(token) {
      if (active !== token) return false;
      active = null;
      return true;
    },
    invalidate() {
      active = null;
    },
    isCurrent(token) {
      return active === token;
    },
  });
}

export function createOutlookAuthOwnerChangedError() {
  const error = new Error("AUTH_SESSION_OWNER_CHANGED");
  error.safe_error_code = "AUTH_SESSION_OWNER_CHANGED";
  return error;
}

function safeResponseCode(payload) {
  return text(payload?.safe_error_codes?.[0])
    || text(payload?.safe_error_code)
    || "";
}

function responseCode(payload) {
  return safeResponseCode(payload) || text(payload?.message);
}

export function createOutlookApiResponseError({
  status,
  payload = null,
  parseFailed = false,
} = {}) {
  const code = Number(status) === 401
    ? safeResponseCode(payload) || "AUTH_SESSION_INVALID"
    : parseFailed
      ? "API_RESPONSE_INVALID"
      : responseCode(payload) || "request_failed";
  const error = new Error(code);
  error.safe_error_code = code;
  if (Number.isInteger(status)) error.status = status;
  if (payload && typeof payload === "object") error.payload = payload;
  return error;
}

export function isOutlookOperationSessionCurrent({
  operationSessionGenerations,
  operationStartKey,
  sessionGeneration,
  authenticated = false,
} = {}) {
  return authenticated === true
    && typeof operationSessionGenerations?.get === "function"
    && operationSessionGenerations.get(operationStartKey) === sessionGeneration;
}

/**
 * Monotonic owner fence for asynchronous business reads.
 *
 * A caller captures the current session, item and Matter before starting a
 * read.  Invalidating the fence is synchronous, so a response from an older
 * authentication boundary can never become current again by accident.
 */
export function createOutlookBusinessReadFence() {
  let generation = 0;

  return Object.freeze({
    capture({ authenticated = false, itemContextKey = "", matterId = "" } = {}) {
      return Object.freeze({
        generation,
        authenticated: authenticated === true,
        itemContextKey: text(itemContextKey),
        matterId: text(matterId),
      });
    },
    invalidate() {
      generation += 1;
      return generation;
    },
    current() {
      return generation;
    },
    isCurrent(
      snapshot,
      { authenticated = false, itemContextKey = "", matterId = "" } = {},
    ) {
      if (!snapshot || typeof snapshot !== "object") return false;
      if (
        snapshot.generation !== generation
        || snapshot.authenticated !== true
        || authenticated !== true
        || snapshot.matterId !== text(matterId)
      ) return false;
      return !snapshot.itemContextKey
        || snapshot.itemContextKey === text(itemContextKey);
    },
  });
}
