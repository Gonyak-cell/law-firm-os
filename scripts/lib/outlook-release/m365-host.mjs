import { PRODUCT_IDS } from "./constants.mjs";
import { m365CompletionMillis } from "./m365-base.mjs";
import { assertEqual, assertExactKeys, canonical, concreteText, profileMap, sorted } from "./primitives.mjs";
import { assertProofBase } from "./proof-common.mjs";
import { readProtectedJsonProof } from "./protected-evidence.mjs";

function validateProof(evidence, receipt, options, temporal) {
  const loaded = readProtectedJsonProof(options.protectedEvidence, {
    evidence_ref: evidence.evidence_ref, evidence_sha256: evidence.evidence_sha256,
  }, "real_outlook_host");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.real-outlook-host-proof.v1", "real_outlook_host", options.expectedSourceIdentity, [
    "accessibility_check", "bundle_sha256", "executed", "host", "host_dom_manipulation", "host_version",
    "manifest_sha256", "observed_at_utc", "product_id", "result", "scenarios",
  ]);
  const receiptProjection = Object.fromEntries(Object.entries(evidence).filter(([key]) => ![
    "evidence_kind", "evidence_ref", "evidence_sha256",
  ].includes(key)));
  const proofProjection = Object.fromEntries(Object.entries(proof).filter(([key]) => ![
    "package_lock_sha256", "proof_class", "schema_version", "source_sha", "source_tree",
  ].includes(key)));
  assertEqual(canonical(proofProjection), canonical(receiptProjection), "real Outlook protected evidence");
  const expected = options.contract.profiles.find(({ product_id }) => product_id === evidence.product_id);
  const profile = profileMap(receipt.profiles, "M365 receipt profiles").get(evidence.product_id);
  const scenarios = expected ? [
    ...options.contract.m365.required_common_host_scenarios,
    ...options.contract.m365.required_profile_scenarios[expected.profile],
  ] : [];
  if (!expected || !options.contract.m365.required_host_evidence.includes(evidence.host)
    || evidence.evidence_kind !== "real_outlook_host" || evidence.executed !== true || evidence.result !== "pass"
    || evidence.manifest_sha256 !== profile.candidate_manifest_sha256 || evidence.bundle_sha256 !== profile.bundle_sha256
    || JSON.stringify(sorted(evidence.scenarios ?? [])) !== JSON.stringify(sorted(scenarios))
    || new Set(evidence.scenarios ?? []).size !== scenarios.length
    || !concreteText(evidence.host_version, `${expected?.profile ?? "unknown"}/${evidence.host} host_version`)
    || evidence.accessibility_check !== "pass" || evidence.host_dom_manipulation !== false) {
    throw new Error(`real Outlook evidence is incomplete: ${evidence.product_id}:${evidence.host}`);
  }
  const completedAt = m365CompletionMillis(
    evidence.observed_at_utc, "real Outlook observation", temporal.validationCutoff,
  );
  if (completedAt < temporal.centralObservedAt) {
    throw new Error("real Outlook observation precedes central deployment");
  }
  return { ...loaded, completedAt };
}

export function validateM365Hosts(receipt, options, temporal) {
  const keys = new Set();
  const loaded = [];
  for (const evidence of receipt.host_evidence ?? []) {
    assertExactKeys(evidence, [
      "accessibility_check", "bundle_sha256", "evidence_kind", "evidence_ref", "evidence_sha256", "executed",
      "host", "host_dom_manipulation", "host_version", "manifest_sha256", "observed_at_utc", "product_id",
      "result", "scenarios",
    ], "M365 host evidence");
    const key = `${evidence.product_id}:${evidence.host}`;
    if (keys.has(key)) throw new Error(`real Outlook evidence is duplicated: ${key}`);
    keys.add(key);
    loaded.push(validateProof(evidence, receipt, options, temporal));
  }
  if (receipt.claims.real_outlook_verified === true) {
    for (const productId of PRODUCT_IDS) {
      for (const host of options.contract.m365.required_host_evidence) {
        if (!keys.has(`${productId}:${host}`)) throw new Error(`real Outlook evidence is incomplete for ${productId}:${host}`);
      }
    }
  }
  return loaded;
}
