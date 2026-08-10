import {
  EMPTY_ASSIGNMENT_FINGERPRINT_SHA256, PRODUCT_IDS, PRODUCTION_DISTRIBUTION, SHA256,
} from "./constants.mjs";
import { assertEqual, assertExactKeys, canonical, profileMap } from "./primitives.mjs";

const CONTRACT_PROFILE_KEYS = [
  "assignment_state", "central_operation_type", "distribution_role", "product_id", "production_user_visible",
  "profile", "real_host_evidence_required",
];

export function validateProductionDistributionContract(value) {
  assertEqual(canonical(value), canonical(PRODUCTION_DISTRIBUTION), "production distribution contract");
  const profiles = profileMap(value?.profiles, "production distribution profiles");
  for (const expected of PRODUCTION_DISTRIBUTION.profiles) {
    assertExactKeys(profiles.get(expected.product_id), CONTRACT_PROFILE_KEYS, `${expected.profile} distribution contract`);
  }
  return {
    source_product_id_count: PRODUCT_IDS.length,
    production_visible_product_id_count: PRODUCTION_DISTRIBUTION.profiles.filter((profile) => profile.production_user_visible).length,
    retained_unassigned_product_id_count: PRODUCTION_DISTRIBUTION.profiles.filter((profile) => !profile.production_user_visible).length,
  };
}

export function expectedDistributionProfile(contract, productId) {
  return profileMap(contract?.m365?.production_distribution?.profiles, "production distribution profiles").get(productId);
}

export function validateReceiptDistribution(receipt, contract) {
  validateProductionDistributionContract(contract?.m365?.production_distribution);
  assertEqual(canonical(receipt.production_distribution), canonical(contract.m365.production_distribution), "M365 production distribution");
}

export function validateProfileDistribution(profile, expected, name) {
  if (!expected || profile.distribution_role !== expected.distribution_role
    || profile.assignment_state !== expected.assignment_state
    || profile.production_user_visible !== expected.production_user_visible
    || profile.assign_to_everyone !== false
    || !Number.isSafeInteger(profile.assignment_count) || profile.assignment_count < 0
    || !SHA256.test(profile.assignment_fingerprint_sha256 ?? "")) {
    throw new Error(`${name} production distribution drifted`);
  }
  if (expected.production_user_visible) {
    if (profile.assignment_count < 1 || profile.assignment_fingerprint_sha256 === EMPTY_ASSIGNMENT_FINGERPRINT_SHA256) {
      throw new Error(`${name} visible assignment is empty`);
    }
  } else if (profile.assignment_count !== 0
    || profile.assignment_fingerprint_sha256 !== EMPTY_ASSIGNMENT_FINGERPRINT_SHA256) {
    throw new Error(`${name} retained ProductId must remain unassigned`);
  }
  return expected;
}

export function productionVisibleProductIds(contract) {
  return contract.m365.production_distribution.profiles
    .filter((profile) => profile.production_user_visible)
    .map((profile) => profile.product_id);
}
