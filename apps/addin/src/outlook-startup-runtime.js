import {
  OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS,
  OUTLOOK_STARTUP_PREPARATION_STATES,
  createOutlookStartupPreparation,
} from "./outlook-startup-preparation.js";
import {
  classifyOutlookStartupAuthority,
  classifyOutlookStartupSession,
  snapshotOutlookStartupObject,
} from "./outlook-startup-classification.js";

let startupPromise = null;
let officeMailboxPromise = null;
let currentResult = null;
let authHandlers = null;
const subscribers = new Set();

const frozenResult = (value, extra = {}) => Object.freeze({ ...value, ...extra });

function publish(value) {
  currentResult = value;
  for (const subscriber of [...subscribers]) {
    try { subscriber(value); } catch { /* A consumer cannot poison startup. */ }
  }
  return value;
}

export function subscribeOutlookStartup(subscriber) {
  if (typeof subscriber !== "function") throw new TypeError("subscriber is required");
  subscribers.add(subscriber);
  if (currentResult) {
    try { subscriber(currentResult); } catch { /* Keep the shared result usable. */ }
  }
  return () => subscribers.delete(subscriber);
}

export function registerOutlookStartupAuthHandlers({ unauthorized, recovered } = {}) {
  if (typeof unauthorized !== "function" || typeof recovered !== "function") {
    throw new TypeError("auth handlers are required");
  }
  const lease = Symbol("outlook-startup-auth-handlers");
  authHandlers = { lease, unauthorized, recovered };
  return () => {
    if (authHandlers?.lease === lease) authHandlers = null;
  };
}

export function notifyOutlookStartupUnauthorized(owner) {
  if (!authHandlers) return null;
  try { return authHandlers.unauthorized(owner) ?? null; } catch { return null; }
}

export function notifyOutlookStartupRecovered(owner) {
  if (!authHandlers) return null;
  try { return authHandlers.recovered(owner) === true; } catch { return false; }
}

export function resolveOutlookStartupStorage(host = globalThis) {
  try { return host?.localStorage ?? null; } catch { return null; }
}

function currentOfficeMailboxAddress(host) {
  try {
    const address = host?.Office?.context?.mailbox?.userProfile?.emailAddress;
    return typeof address === "string" && address.trim() ? address : null;
  } catch {
    return null;
  }
}

export function waitForOutlookStartupMailbox({ host = globalThis, waitForReady, readyEvent } = {}) {
  if (officeMailboxPromise) return officeMailboxPromise;
  officeMailboxPromise = new Promise((resolve) => {
    const finish = (allowMissing = false) => {
      const address = currentOfficeMailboxAddress(host);
      if (!address && !allowMissing) return false;
      host.removeEventListener(readyEvent, handleReady);
      resolve(address);
      return true;
    };
    const handleReady = () => finish();
    host.addEventListener(readyEvent, handleReady);
    try {
      void Promise.resolve(waitForReady()).then(
        ({ status }) => { if (!finish() && status !== "timed_out") finish(true); },
        () => finish(true),
      );
    } catch {
      finish(true);
    }
  });
  return officeMailboxPromise;
}

async function sha256(value, cryptoImpl) {
  if (typeof cryptoImpl?.subtle?.digest !== "function") {
    throw new Error("OUTLOOK_STARTUP_CRYPTO_UNAVAILABLE");
  }
  const bytes = await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function classificationForError(error, authenticated = false) {
  if (error?.status === 401) {
    return frozenResult({ state: "login_required", reason: "no_credential", authenticated: false });
  }
  if (error?.safe_error_code === "LAWOS_INTERACTION_REQUIRED") {
    return frozenResult({ state: "login_required", reason: "interaction_required", authenticated: false });
  }
  return frozenResult({ state: "deferred", reason: "transient_failure", authenticated });
}

async function execute({
  acquireSession,
  requestJson,
  storage,
  officeMailboxAddress,
  build,
  cryptoImpl = globalThis.crypto,
} = {}) {
  if (typeof acquireSession !== "function" || typeof requestJson !== "function") {
    throw new TypeError("startup operations are required");
  }
  let bootstrap = null;
  const coordinator = createOutlookStartupPreparation({
    storage,
    createMarkerId: () => cryptoImpl.randomUUID(),
    hash: (value) => sha256(value, cryptoImpl),
    prepare: async () => {
      try {
        const body = await requestJson("/api/outlook/bootstrap", {
          retryAfterUnauthorized: false,
        });
        const snapshot = snapshotOutlookStartupObject(body);
        const item = snapshot?.item;
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return {
            state: OUTLOOK_STARTUP_PREPARATION_STATES.deferred,
            reason: OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.transientFailure,
          };
        }
        bootstrap = item;
        return { state: OUTLOOK_STARTUP_PREPARATION_STATES.ready };
      } catch (error) {
        return error?.status === 401
          ? {
              state: OUTLOOK_STARTUP_PREPARATION_STATES.loginRequired,
              reason: OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.noCredential,
            }
          : {
              state: OUTLOOK_STARTUP_PREPARATION_STATES.deferred,
              reason: OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.transientFailure,
            };
      }
    },
  });
  const invalidate = async (classification) => {
    const invalidated = await coordinator.invalidate({
      reason: classification.reason,
      nextState: classification.state,
    });
    return frozenResult(classification, {
      state: invalidated.state,
      reason: invalidated.reason,
      supported: invalidated.supported,
      cache_hit: invalidated.cache_hit,
    });
  };

  let session;
  try { session = await acquireSession(); } catch (error) {
    return invalidate(classificationForError(error));
  }
  const signed = classifyOutlookStartupSession(session, build);
  if (signed.state !== "authenticated") return invalidate(signed);

  let resolvedOfficeMailboxAddress;
  try { resolvedOfficeMailboxAddress = await officeMailboxAddress; } catch (error) {
    return invalidate(classificationForError(error, true));
  }

  let connectionBody;
  let readinessBody;
  try {
    connectionBody = await requestJson("/api/outlook/connection", {
      retryAfterUnauthorized: false,
    });
    readinessBody = await requestJson("/api/outlook/readiness", {
      retryAfterUnauthorized: false,
    });
  } catch (error) {
    return invalidate(classificationForError(error, true));
  }
  const authority = classifyOutlookStartupAuthority({
    identity: signed.identity,
    connectionBody,
    readinessBody,
    officeMailboxAddress: resolvedOfficeMailboxAddress,
  });
  if (authority.state !== "ready") return invalidate(authority);
  const prepared = await coordinator.prepare(authority.binding);
  return frozenResult(authority, {
    state: prepared.state,
    reason: prepared.reason,
    authenticated: prepared.state === OUTLOOK_STARTUP_PREPARATION_STATES.loginRequired
      ? false
      : authority.authenticated,
    supported: prepared.supported,
    cache_hit: prepared.cache_hit,
    bootstrap,
  });
}

export function startOutlookStartup(input) {
  if (!startupPromise) startupPromise = execute(input).then(publish);
  return startupPromise;
}
