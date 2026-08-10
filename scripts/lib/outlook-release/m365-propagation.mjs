import { PRODUCT_IDS } from "./constants.mjs";
import { m365CompletionMillis } from "./m365-base.mjs";
import { assertEqual, assertExactKeys, canonical, profileMap, utcMillis } from "./primitives.mjs";
import { assertProofBase } from "./proof-common.mjs";
import { readProtectedJsonProof } from "./protected-evidence.mjs";

function validateProof(entry, receipt, options, temporal) {
  const loaded = readProtectedJsonProof(options.protectedEvidence, {
    evidence_ref: entry.evidence_ref, evidence_sha256: entry.evidence_sha256,
  }, "propagation_observation");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-propagation-proof.v1", "propagation_observation", options.expectedSourceIdentity, [
    "assignment_fingerprint_sha256", "hour", "manifest_sha256", "observed_at_utc", "product_id", "result", "version",
  ]);
  const receiptProjection = Object.fromEntries(Object.entries(entry).filter(([key]) => !key.startsWith("evidence_")));
  const proofProjection = Object.fromEntries(Object.entries(proof).filter(([key]) => ![
    "package_lock_sha256", "proof_class", "schema_version", "source_sha", "source_tree",
  ].includes(key)));
  assertEqual(canonical(proofProjection), canonical(receiptProjection), "M365 propagation protected evidence");
  const profile = profileMap(receipt.profiles, "M365 receipt profiles").get(entry.product_id);
  if (!profile || !options.contract.m365.propagation_observation_hours.includes(entry.hour)
    || entry.result !== "exact_readback" || entry.version !== options.contract.release_version
    || entry.manifest_sha256 !== profile.candidate_manifest_sha256
    || entry.assignment_fingerprint_sha256 !== profile.assignment_fingerprint_sha256) {
    throw new Error(`M365 propagation observation is invalid: ${entry.product_id}:${entry.hour}`);
  }
  const completedAt = m365CompletionMillis(
    entry.observed_at_utc, "M365 propagation observation", temporal.validationCutoff,
  );
  if (completedAt < temporal.centralObservedAt) {
    throw new Error("M365 propagation observation precedes central deployment");
  }
  return { ...loaded, completedAt };
}

export function validateM365Propagation(receipt, options, temporal) {
  const keys = new Set();
  const loaded = [];
  for (const entry of receipt.propagation_observations ?? []) {
    assertExactKeys(entry, [
      "assignment_fingerprint_sha256", "evidence_ref", "evidence_sha256", "hour", "manifest_sha256",
      "observed_at_utc", "product_id", "result", "version",
    ], "M365 propagation observation");
    const key = `${entry.product_id}:${entry.hour}`;
    if (keys.has(key)) throw new Error(`M365 propagation observation is duplicated: ${key}`);
    keys.add(key);
    loaded.push(validateProof(entry, receipt, options, temporal));
  }
  if (receipt.claims.propagation_verified === true) {
    for (const productId of PRODUCT_IDS) {
      const observations = receipt.propagation_observations.filter((entry) => entry.product_id === productId);
      assertEqual(observations.map(({ hour }) => hour).sort((a, b) => a - b), options.contract.m365.propagation_observation_hours, `${productId} propagation observations`);
      const base = utcMillis(observations.find(({ hour }) => hour === 0)?.observed_at_utc, "hour-zero propagation observation");
      if (observations.some((entry) => utcMillis(entry.observed_at_utc, "propagation observation") - base < entry.hour * 3_600_000)) {
        throw new Error(`${productId} propagation observations were recorded before their stated window`);
      }
    }
  }
  return loaded;
}
