import { createDurableJsonStateController, isDurableStoreConflict } from "../../persistence/src/durable-file.js";
import { cloneDocusignValue, docusignInfrastructureFailure, normalizeDocusignOutboxState } from "./docusign-envelope-model.js";

const MAX_CAS_ATTEMPTS = 12;
const EMPTY_STATE = Object.freeze({ requests: Object.freeze([]), webhook_receipts: Object.freeze([]) });

export function createDocusignEnvelopeRepository({ filePath, state } = {}) {
  const controller = createDurableJsonStateController({
    filePath,
    defaultValue: state ?? EMPTY_STATE,
    normalizeValue: normalizeDocusignOutboxState,
  });
  const snapshot = () => cloneDocusignValue(filePath ? controller.reload().value : controller.value);
  return Object.freeze({
    durable: Boolean(filePath),
    loadState: snapshot,
    replaceState(nextState) {
      controller.commit(normalizeDocusignOutboxState(nextState));
      return cloneDocusignValue(controller.value);
    },
    async transact({ tenant_id } = {}, mutate) {
      if (typeof mutate !== "function") throw new TypeError("DocuSign transaction callback is required");
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
