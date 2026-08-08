import { createDurableJsonStateController, isDurableStoreConflict } from "../../persistence/src/durable-file.js";
import { cloneDocusignValue, docusignInfrastructureFailure, normalizeDocusignOutboxState } from "./docusign-envelope-model.js";
import { assertCompletionAuthority } from "./docusign-completion-authority.js";

const MAX_CAS_ATTEMPTS = 12;
const EMPTY_STATE = Object.freeze({ requests: Object.freeze([]), webhook_receipts: Object.freeze([]) });
const DURABLE_COMPLETION_LOCKS = new Map();

function completionLock(scope = null) {
  const locks = scope == null ? new Map() : DURABLE_COMPLETION_LOCKS.get(scope) ?? new Map();
  if (scope != null) DURABLE_COMPLETION_LOCKS.set(scope, locks);
  function acquire(key) {
    const queue = locks.get(key);
    if (!queue) {
      locks.set(key, []);
      return null;
    }
    return new Promise((resolve) => queue.push(resolve));
  }
  function release(key) {
    const queue = locks.get(key);
    const next = queue?.shift();
    if (next) next();
    else locks.delete(key);
  }
  return Object.freeze({ acquire, release });
}

export function createDocusignEnvelopeRepository({ filePath, state } = {}) {
  const controller = createDurableJsonStateController({
    filePath,
    defaultValue: state ?? EMPTY_STATE,
    normalizeValue: normalizeDocusignOutboxState,
  });
  const locks = completionLock(filePath == null ? null : `docusign:${String(filePath)}`);
  const snapshot = () => cloneDocusignValue(filePath ? controller.reload().value : controller.value);
  const runWithLock = (tenantId, callback) => {
    const key = String(tenantId ?? "");
    const pending = locks.acquire(key);
    const run = () => {
      try { return callback(); }
      finally { locks.release(key); }
    };
    return pending ? pending.then(run) : run();
  };
  const currentRequest = (tenantId, requestId) => snapshot().requests.find((item) => item.tenant_id === tenantId && item.request_id === requestId);
  return Object.freeze({
    durable: Boolean(filePath),
    loadState: snapshot,
    replaceState(nextState) {
      controller.commit(normalizeDocusignOutboxState(nextState));
      return cloneDocusignValue(controller.value);
    },
    transact({ tenant_id } = {}, mutate) {
      if (typeof mutate !== "function") throw new TypeError("DocuSign transaction callback is required");
      return runWithLock(tenant_id, () => {
        for (let attempt = 1; attempt <= MAX_CAS_ATTEMPTS; attempt += 1) {
          const state = snapshot();
          const draft = cloneDocusignValue(state);
          let result;
          try {
            result = mutate(draft, Object.freeze({ tenant_id, attempt }));
            if (result && typeof result.then === "function") throw new TypeError("DocuSign transaction callback must be synchronous");
            controller.commit(normalizeDocusignOutboxState(draft));
            return cloneDocusignValue(result);
          } catch (error) {
            if (isDurableStoreConflict(error) && attempt < MAX_CAS_ATTEMPTS) {
              controller.reload();
              continue;
            }
            if (isDurableStoreConflict(error)) throw docusignInfrastructureFailure("DOCUSIGN_REPOSITORY_BUSY");
            throw error;
          }
        }
        throw docusignInfrastructureFailure("DOCUSIGN_REPOSITORY_BUSY");
      });
    },
    validateCompletionAuthority({ expected } = {}) {
      const current = currentRequest(expected?.tenant_id, expected?.request_id);
      return assertCompletionAuthority(expected, current);
    },
    readCompletionAuthority({ expected } = {}) {
      const current = currentRequest(expected?.tenant_id, expected?.request_id);
      return assertCompletionAuthority(expected, current);
    },
    withCompletionAuthority({ expected } = {}, callback) {
      if (typeof callback !== "function") throw new TypeError("completion authority callback is required");
      const tenantId = expected?.tenant_id;
      return runWithLock(tenantId, async () => {
        const current = currentRequest(expected?.tenant_id, expected?.request_id);
        assertCompletionAuthority(expected, current);
        return callback(Object.freeze({ request: current }));
      });
    },
  });
}

export function requireDocusignRepository(repository) {
  if (!repository || typeof repository.transact !== "function") throw new TypeError("DocuSign atomic repository is required");
  return repository;
}

export async function readDocusignState(repository, tenantId) {
  if (typeof repository.readState === "function") return repository.readState({ tenant_id: tenantId });
  if (typeof repository.loadState === "function") return repository.loadState();
  throw new TypeError("DocuSign repository readState is required");
}
