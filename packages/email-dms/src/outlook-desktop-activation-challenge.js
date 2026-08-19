import { isDeepStrictEqual, types } from "node:util";

import {
  bindingDigest,
  makeBindings,
  validateApprovedRelease,
  validateDevice,
  validatePolicy,
  validatePrincipal,
} from "./outlook-desktop-activation-bindings.js";
import {
  assertExactKeys,
  assertFalseAttestations,
  assertPrivacyTree,
  canonicalBytes,
  canonicalNonce,
  deepFreeze,
  fail,
  isRecord,
  parseTime,
  pureObject,
  sha256,
} from "./outlook-desktop-activation-primitives.js";
import {
  ACTIVATION_ID,
  ACTIVATION_ID_RANDOM_BYTES,
  CHALLENGE_KEYS,
  CHALLENGE_NONCE_BYTES,
  ISSUE_KEYS,
  OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_MAX_LIFETIME_MS,
  OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_SCHEMA,
  OUTLOOK_DESKTOP_ACTIVATION_MODE,
  REQUEST_KEYS,
} from "./outlook-desktop-activation-schema.js";

function snapshotIssuedChallengeValue(value, state, depth) {
  state.nodes += 1;
  if (state.nodes > 2_000 || depth > 32) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_INVALID", "issued challenge exceeds the bounded shape");
  }
  if (value === null || ["boolean", "number", "string"].includes(typeof value)) return value;
  if (types.isProxy(value) || !isRecord(value) || state.ancestors.has(value)) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_INVALID", "issued challenge must be canonical data");
  }
  const snapshot = Object.create(null);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  state.ancestors.add(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (typeof key !== "string"
        || descriptor.enumerable !== true
        || !Object.hasOwn(descriptor, "value")) {
      fail(
        "OUTLOOK_ACTIVATION_CHALLENGE_INVALID",
        "issued challenge cannot contain accessor or noncanonical properties",
      );
    }
    snapshot[key] = snapshotIssuedChallengeValue(descriptor.value, state, depth + 1);
  }
  state.ancestors.delete(value);
  return snapshot;
}

function snapshotIssuedChallenge(challenge) {
  const snapshot = snapshotIssuedChallengeValue(
    challenge,
    { ancestors: new WeakSet(), nodes: 0 },
    0,
  );
  if (!isRecord(snapshot)) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_INVALID", "issued challenge must be one object");
  }
  return snapshot;
}

export function issueActivationChallenge(input, now, entropy) {
  assertPrivacyTree(input);
  if (isRecord(input)
      && (Object.hasOwn(input, "activation_id")
        || Object.hasOwn(input, "challenge_nonce_base64url")
        || Object.hasOwn(input, "challenge_nonce"))) {
    fail(
      "OUTLOOK_ACTIVATION_CHALLENGE_CLIENT_VALUE_FORBIDDEN",
      "activation id and challenge nonce are server-owned values",
    );
  }
  assertExactKeys(input, ISSUE_KEYS, "OUTLOOK_ACTIVATION_INPUT_INVALID", "challenge issue input");
  const principal = validatePrincipal(input.authenticated_principal);
  const candidateDevice = validateDevice(input.candidate_device);
  const pilotPolicy = validatePolicy(input.pilot_policy);
  const release = validateApprovedRelease(input.approved_release, now);
  if (release.value.tenant_id !== principal.lawos_tenant_id) {
    fail(
      "OUTLOOK_ACTIVATION_RELEASE_BINDING_MISMATCH",
      "approved release does not belong to the authenticated LawOS tenant",
    );
  }
  const activationRandom = entropy(ACTIVATION_ID_RANDOM_BYTES);
  const nonceBytes = entropy(CHALLENGE_NONCE_BYTES);
  if (!Buffer.isBuffer(activationRandom)
      || activationRandom.length !== ACTIVATION_ID_RANDOM_BYTES
      || !Buffer.isBuffer(nonceBytes)
      || nonceBytes.length !== CHALLENGE_NONCE_BYTES) {
    fail(
      "OUTLOOK_ACTIVATION_ENTROPY_INVALID",
      "server entropy source did not return the required exact bytes",
    );
  }
  const activationId = `oda_${activationRandom.toString("base64url")}`;
  const challengeNonceBase64url = nonceBytes.toString("base64url");
  const challengeNonceSha256 = sha256(nonceBytes);
  const bindings = makeBindings({
    activationId,
    approvedRelease: release.value,
    candidateDevice,
    pilotPolicy,
    principal,
  });
  const expiresAt = Math.min(
    now + OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_MAX_LIFETIME_MS,
    release.validUntil,
  );
  if (expiresAt <= now) {
    fail("OUTLOOK_ACTIVATION_RELEASE_INVALID", "approved release cannot cover a server challenge");
  }
  return deepFreeze(pureObject({
    ...bindings,
    activation_binding_sha256: bindingDigest(challengeNonceSha256, bindings),
    challenge_nonce_base64url: challengeNonceBase64url,
    challenge_nonce_sha256: challengeNonceSha256,
    expires_at: new Date(expiresAt).toISOString(),
    issued_at: new Date(now).toISOString(),
    schema_version: OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_SCHEMA,
  }));
}

export function validateIssuedChallenge(challenge, now) {
  assertPrivacyTree(challenge);
  assertExactKeys(
    challenge,
    CHALLENGE_KEYS,
    "OUTLOOK_ACTIVATION_CHALLENGE_INVALID",
    "issued challenge",
  );
  if (challenge.schema_version !== OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_SCHEMA) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_INVALID", "issued challenge schema is unsupported");
  }
  if (challenge.activation_mode !== OUTLOOK_DESKTOP_ACTIVATION_MODE) {
    fail(
      "OUTLOOK_ACTIVATION_MODE_UNSUPPORTED",
      "activation mode is unsupported by this operator-controlled contract",
    );
  }
  if (!ACTIVATION_ID.test(challenge.activation_id)) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_INVALID", "issued challenge activation id is invalid");
  }
  assertFalseAttestations(challenge);
  const nonceBytes = canonicalNonce(challenge.challenge_nonce_base64url);
  const nonceSha256 = sha256(nonceBytes);
  if (challenge.challenge_nonce_sha256 !== nonceSha256) {
    fail("OUTLOOK_ACTIVATION_CHALLENGE_MISMATCH", "issued challenge nonce digest is invalid");
  }
  const issuedAt = parseTime(
    challenge.issued_at,
    "OUTLOOK_ACTIVATION_CHALLENGE_INVALID",
    "challenge.issued_at",
  );
  const expiresAt = parseTime(
    challenge.expires_at,
    "OUTLOOK_ACTIVATION_CHALLENGE_INVALID",
    "challenge.expires_at",
  );
  if (issuedAt > now || expiresAt <= now || expiresAt <= issuedAt
      || expiresAt - issuedAt > OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_MAX_LIFETIME_MS) {
    fail(
      "OUTLOOK_ACTIVATION_CHALLENGE_EXPIRED",
      "issued challenge is expired or exceeds its 30-minute lifetime",
    );
  }
  const release = validateApprovedRelease(challenge.approved_release, now);
  if (expiresAt > release.validUntil) {
    fail(
      "OUTLOOK_ACTIVATION_CHALLENGE_INVALID",
      "issued challenge exceeds approved release validity",
    );
  }
  const bindings = makeBindings({
    activationId: challenge.activation_id,
    approvedRelease: release.value,
    candidateDevice: validateDevice(challenge.candidate_device),
    pilotPolicy: validatePolicy(challenge.pilot_policy),
    principal: validatePrincipal(challenge.authenticated_principal),
  });
  if (challenge.local_measurement_evidence_sha256
      !== bindings.local_measurement_evidence_sha256) {
    fail(
      "OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_MISMATCH",
      "issued challenge local measurement does not match the approved release",
    );
  }
  const activationBindingSha256 = bindingDigest(nonceSha256, bindings);
  if (challenge.activation_binding_sha256 !== activationBindingSha256) {
    fail("OUTLOOK_ACTIVATION_BINDING_MISMATCH", "issued challenge binding digest is invalid");
  }
  return {
    activationBindingSha256,
    bindings,
    challenge: pureObject(challenge),
    expiresAt,
    issuedAt,
    nonceSha256,
  };
}

export function outlookDesktopActivationIssuedChallengeSha256(challenge) {
  const snapshot = snapshotIssuedChallenge(challenge);
  const issuedAt = parseTime(
    snapshot.issued_at,
    "OUTLOOK_ACTIVATION_CHALLENGE_INVALID",
    "challenge.issued_at",
  );
  validateIssuedChallenge(snapshot, issuedAt);
  return sha256(canonicalBytes(snapshot));
}

export function validateActivationRequest(request, issued) {
  assertPrivacyTree(request);
  assertExactKeys(
    request,
    REQUEST_KEYS,
    "OUTLOOK_ACTIVATION_REQUEST_INVALID",
    "activation request",
  );
  if (request.activation_mode !== OUTLOOK_DESKTOP_ACTIVATION_MODE) {
    fail(
      "OUTLOOK_ACTIVATION_MODE_UNSUPPORTED",
      "activation mode is unsupported by this operator-controlled contract",
    );
  }
  assertFalseAttestations(request);
  canonicalNonce(request.challenge_nonce_base64url);
  const bindings = makeBindings({
    activationId: request.activation_id,
    approvedRelease: validateApprovedRelease(request.approved_release, issued.issuedAt).value,
    candidateDevice: validateDevice(request.candidate_device),
    pilotPolicy: validatePolicy(request.pilot_policy),
    principal: validatePrincipal(request.authenticated_principal),
  });
  if (request.local_measurement_evidence_sha256
      !== bindings.local_measurement_evidence_sha256) {
    fail(
      "OUTLOOK_ACTIVATION_LOCAL_MEASUREMENT_MISMATCH",
      "activation request local measurement does not match the approved release",
    );
  }
  if (request.activation_binding_sha256 !== issued.activationBindingSha256) {
    fail(
      "OUTLOOK_ACTIVATION_BINDING_MISMATCH",
      "activation request binding digest does not match the server challenge",
    );
  }
  if (request.challenge_nonce_base64url !== issued.challenge.challenge_nonce_base64url
      || request.activation_id !== issued.challenge.activation_id
      || !isDeepStrictEqual(bindings, issued.bindings)) {
    fail(
      "OUTLOOK_ACTIVATION_CHALLENGE_MISMATCH",
      "activation request does not exactly match the issued server challenge",
    );
  }
  return { bindings, request: pureObject(request) };
}
