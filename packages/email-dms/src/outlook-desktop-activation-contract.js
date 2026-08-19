import { randomBytes } from "node:crypto";

import { verifyProductionTrustedRegistry } from "../../runtime-auth/src/external-release-trust.js";
import { issueActivationChallenge } from "./outlook-desktop-activation-challenge.js";
import {
  fail,
  isRecord,
  validationNow,
} from "./outlook-desktop-activation-primitives.js";
import {
  assertActivationReplayIdentity,
  verifyOperatorActivation,
} from "./outlook-desktop-activation-result.js";

export {
  OutlookDesktopActivationContractError,
} from "./outlook-desktop-activation-primitives.js";
export {
  OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_MAX_LIFETIME_MS,
  OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_SCHEMA,
  OUTLOOK_DESKTOP_ACTIVATION_MODE,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_LIFETIME_MS,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_SCHEMA,
} from "./outlook-desktop-activation-schema.js";

export function createOutlookDesktopActivationContract(options = {}) {
  if (!isRecord(options)
      || Object.keys(options).some((key) => ![
        "testOnlyNow", "testOnlyRandomBytes", "testOnlyVerifiedRegistry",
      ].includes(key))) {
    fail(
      "OUTLOOK_ACTIVATION_CONFIGURATION_INVALID",
      "activation contract configuration is invalid",
    );
  }
  if (Object.keys(options).length > 0 && process.env.NODE_ENV !== "test") {
    fail(
      "OUTLOOK_ACTIVATION_TEST_OVERRIDE_FORBIDDEN",
      "synthetic clock, entropy, and trust registry are test-only",
    );
  }
  if (options.testOnlyRandomBytes !== undefined
      && typeof options.testOnlyRandomBytes !== "function") {
    fail(
      "OUTLOOK_ACTIVATION_CONFIGURATION_INVALID",
      "test entropy override must be a function",
    );
  }
  const clock = () => validationNow(options.testOnlyNow ?? Date.now());
  const entropy = options.testOnlyRandomBytes ?? randomBytes;
  const registryResolver = options.testOnlyVerifiedRegistry === undefined
    ? () => verifyProductionTrustedRegistry()
    : () => options.testOnlyVerifiedRegistry;
  return Object.freeze({
    issueChallenge(input) {
      return issueActivationChallenge(input, clock(), entropy);
    },
    verifyOperatorActivation(input) {
      return verifyOperatorActivation(input, clock(), registryResolver);
    },
  });
}

export function assertOutlookDesktopActivationReplayIdentity(input) {
  return assertActivationReplayIdentity(input);
}
