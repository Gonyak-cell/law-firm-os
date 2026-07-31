import {
  assertOperationalPeopleProviderIdentityRepository,
  createDurablePeopleProviderIdentityRepository,
  createTestPeopleProviderIdentityRepository,
} from "./people-provider-identity-repository.js";
import { createPeopleProviderIdentityRegistryImpl } from "./people-provider-identity-registry.js";

export {
  assertOperationalPeopleProviderIdentityRepository,
  createDurablePeopleProviderIdentityRepository,
  createTestPeopleProviderIdentityRepository,
};

export function createPeopleProviderIdentityRegistry(options = {}) {
  return createPeopleProviderIdentityRegistryImpl(options);
}
