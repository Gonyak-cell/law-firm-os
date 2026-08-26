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
let interactiveSessionPromise = null;
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

function ownData(error, key) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, key);
    return descriptor && Object.hasOwn(descriptor, "value") ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function classificationForError(error, authenticated = false) {
  const status = ownData(error, "status");
  const code = ownData(error, "safe_error_code");
  if (status === 403) {
    const installation = typeof code === "string" && /(INSTALLATION|RELEASE)/u.test(code);
    return frozenResult({
      state: "revoked",
      reason: installation ? "installation_revoked" : "account_mismatch",
      authenticated,
    });
  }
  if (status === 401) {
    return frozenResult({ state: "login_required", reason: "no_credential", authenticated: false });
  }
  if (code === "LAWOS_INTERACTION_REQUIRED") {
    return frozenResult({ state: "login_required", reason: "interaction_required", authenticated: false });
  }
  return frozenResult({ state: "deferred", reason: "transient_failure", authenticated });
}

function shouldAcquireInteractively(result) {
  return result?.state === "login_required"
    && (result.reason === "interaction_required" || result.reason === "no_credential");
}

function acquireInteractiveSession(acquireSession) {
  if (!interactiveSessionPromise) {
    interactiveSessionPromise = Promise.resolve().then(() => acquireSession({
      interactive: true,
      force: true,
    }));
  }
  return interactiveSessionPromise;
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
        const classification = classificationForError(error, true);
        return { state: classification.state, reason: classification.reason };
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
  let interactionEligible = false;

  const attempt = async (sessionPromise = null) => {
    interactionEligible = false;
    let session;
    try {
      session = sessionPromise
        ? await sessionPromise
        : await acquireSession({ interactive: false, force: false });
    } catch (error) {
      const classification = classificationForError(error);
      interactionEligible = shouldAcquireInteractively(classification);
      return invalidate(classification);
    }
    const signed = classifyOutlookStartupSession(session, build);
    if (signed.state !== "authenticated") {
      const snapshot = snapshotOutlookStartupObject(session);
      interactionEligible = Boolean(snapshot) && snapshot.authenticated !== true;
      return invalidate(signed);
    }

    let resolvedOfficeMailboxAddress;
    try { resolvedOfficeMailboxAddress = await officeMailboxAddress; } catch (error) {
      const classification = classificationForError(error, true);
      interactionEligible = shouldAcquireInteractively(classification);
      return invalidate(classification);
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
      const classification = classificationForError(error, true);
      interactionEligible = shouldAcquireInteractively(classification);
      return invalidate(classification);
    }
    const authority = classifyOutlookStartupAuthority({
      identity: signed.identity,
      connectionBody,
      readinessBody,
      officeMailboxAddress: resolvedOfficeMailboxAddress,
    });
    if (authority.state !== "ready") return invalidate(authority);
    const prepared = await coordinator.prepare(authority.binding);
    const result = frozenResult(authority, {
      state: prepared.state,
      reason: prepared.reason,
      authenticated: prepared.state === OUTLOOK_STARTUP_PREPARATION_STATES.loginRequired
        ? false
        : authority.authenticated,
      supported: prepared.supported,
      cache_hit: prepared.cache_hit,
      bootstrap,
    });
    interactionEligible = shouldAcquireInteractively(result);
    return result;
  };

  const silent = await attempt();
  if (!interactionEligible || !shouldAcquireInteractively(silent)) return silent;
  return attempt(acquireInteractiveSession(acquireSession));
}

export function startOutlookStartup(input) {
  if (!startupPromise) startupPromise = execute(input).then(publish);
  return startupPromise;
}
