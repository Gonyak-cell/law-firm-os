import { PRODUCT_IDS } from "./constants.mjs";
import {
  profileMap,
} from "./primitives.mjs";

export function validateSurfaceSeparation(surface, baseline, contract) {
  if (surface?.schema_version !== 3) throw new Error("Outlook surface schema_version must be 3");
  const baselineById = profileMap(baseline?.profiles, "deployment baseline");
  const profiles = profileMap(surface?.profiles, "surface contract");
  if (surface.release_candidate_version !== contract.release_version) throw new Error("surface release version drifted");
  for (const expected of contract.profiles) {
    const profile = profiles.get(expected.product_id);
    const baselineProfile = baselineById.get(expected.product_id);
    if (!profile || !baselineProfile) throw new Error(`missing release profile ${expected.product_id}`);
    if (profile.profile !== expected.profile || profile.permission !== expected.permission) {
      throw new Error(`${expected.profile} identity or permission drifted`);
    }
  }
  const matter = profiles.get(PRODUCT_IDS[0])?.manifest_fingerprint;
  const inquiry = profiles.get(PRODUCT_IDS[1])?.manifest_fingerprint;
  if (!matter || !inquiry || matter.launch_events?.length !== 1
    || !matter.launch_events[0].startsWith("OnMessageSend:")
    || inquiry.launch_events?.length !== 0
    || inquiry.rule_fingerprints?.some((rule) => rule.endsWith(":Edit"))) {
    throw new Error("Matter and inquiry host/event profiles leaked across ProductIds");
  }
  return { permission_event_diff: "none", profile_count: 2 };
}

export function validateCoveragePaths(existingPaths, contract) {
  const existing = existingPaths instanceof Set ? existingPaths : new Set(existingPaths ?? []);
  const required = [...(contract.required_release_paths ?? []), ...(contract.required_test_paths ?? [])];
  const missing = required.filter((candidate) => !existing.has(candidate));
  if (missing.length) throw new Error(`Outlook release coverage paths are missing: ${missing.join(", ")}`);
  return { required_path_count: required.length };
}
