import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";
import {
  clonePeopleProviderValue,
  emptyPeopleProviderIdentityState,
  normalizePeopleProviderIdentityState,
  peopleProviderFailure,
} from "./people-provider-identity-state.js";

export function assertPeopleProviderIdentityRepository(repository, { operational = false } = {}) {
  if (
    !repository
    || typeof repository.loadState !== "function"
    || typeof repository.replaceState !== "function"
  ) {
    throw new TypeError("provider identity repository must implement loadState and replaceState");
  }
  if (operational && (repository.test_only === true || repository.durable !== true)) {
    throw peopleProviderFailure(
      "PEOPLE_PROVIDER_IDENTITY_DURABLE_REPOSITORY_REQUIRED",
      "Operational provider identity history requires a durable repository",
    );
  }
  return repository;
}

export function assertOperationalPeopleProviderIdentityRepository(repository) {
  return assertPeopleProviderIdentityRepository(repository, { operational: true });
}

export function createTestPeopleProviderIdentityRepository({ state } = {}) {
  let current = normalizePeopleProviderIdentityState(state);
  return Object.freeze({
    durable: false,
    test_only: true,
    loadState() {
      return clonePeopleProviderValue(current);
    },
    replaceState(nextState) {
      current = normalizePeopleProviderIdentityState(nextState);
      return clonePeopleProviderValue(current);
    },
  });
}

export function createDurablePeopleProviderIdentityRepository({ filePath, file_path } = {}) {
  const resolvedFilePath = filePath ?? file_path;
  if (typeof resolvedFilePath !== "string" || resolvedFilePath.trim() === "") {
    throw new TypeError("filePath is required");
  }
  const controller = createDurableJsonStateController({
    filePath: resolvedFilePath,
    defaultValue: emptyPeopleProviderIdentityState(),
    normalizeValue: normalizePeopleProviderIdentityState,
  });
  return Object.freeze({
    durable: true,
    test_only: false,
    loadState() {
      return clonePeopleProviderValue(controller.reload().value);
    },
    replaceState(nextState) {
      try {
        controller.commit(normalizePeopleProviderIdentityState(nextState));
        return clonePeopleProviderValue(controller.value);
      } catch (error) {
        controller.reload();
        throw error;
      }
    },
  });
}
