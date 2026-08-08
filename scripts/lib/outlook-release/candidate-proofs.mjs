import { PRODUCT_IDS } from "./constants.mjs";
import {
  assertSafeRelativePath, profileMap, requiredText,
} from "./primitives.mjs";

export function validateSurfaceSeparation(surface, baseline, contract) {
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
    if (profile.assignment_count !== baselineProfile.assignment_count
      || profile.assignment_fingerprint_sha256 !== baselineProfile.assignment_fingerprint_sha256) {
      throw new Error(`${expected.profile} assignment drifted`);
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
  return { permission_event_assignment_diff: "none", profile_count: 2 };
}

export function validateRollbackContract(rollback, baseline, contract) {
  if (rollback?.schema_version !== 1 || rollback.candidate_version !== contract.release_version
    || rollback.rollback_version !== contract.rollback_version
    || rollback.permission_event_assignment_diff !== "none") {
    throw new Error("rollback version or permission/event/assignment contract drifted");
  }
  if (rollback.raw_assignment_pii_included !== false || rollback.secret_material_included !== false
    || rollback.raw_manifest_xml_included !== false) {
    throw new Error("rollback contract contains protected material");
  }
  const baselineById = profileMap(baseline?.profiles, "deployment baseline");
  const rollbackById = profileMap(rollback?.profiles, "rollback contract");
  const refs = new Set();
  const urls = new Set();
  for (const expected of contract.profiles) {
    const profile = rollbackById.get(expected.product_id);
    const deployed = baselineById.get(expected.product_id);
    if (!profile || !deployed || profile.profile !== expected.profile) throw new Error(`missing independent rollback for ${expected.profile}`);
    if (profile.rollback_manifest_sha256 !== deployed.manifest_sha256
      || profile.assignment_count !== deployed.assignment_count
      || profile.sanitized_assignment_fingerprint_sha256 !== deployed.assignment_fingerprint_sha256) {
      throw new Error(`${expected.profile} rollback baseline drifted`);
    }
    const ref = assertSafeRelativePath(profile.protected_manifest_ref, `${expected.profile} protected_manifest_ref`);
    if (!ref.startsWith(".omo/evidence/") || refs.has(ref)) throw new Error(`${expected.profile} rollback reference is not independent`);
    refs.add(ref);
    const url = new URL(requiredText(profile.rollback_manifest_url, `${expected.profile} rollback_manifest_url`));
    if (url.protocol !== "https:" || url.search || url.hash
      || !url.pathname.includes(`/${expected.product_id}/${contract.rollback_version}/`)
      || !url.pathname.includes(profile.rollback_manifest_sha256) || urls.has(url.href)) {
      throw new Error(`${expected.profile} rollback URL is not immutable and identity-bound`);
    }
    urls.add(url.href);
  }
  if (refs.size !== 2 || urls.size !== 2) throw new Error("two independent rollback artifacts are required");
  return { rollback_profile_count: 2, permission_event_assignment_diff: "none" };
}

export function validateCoveragePaths(existingPaths, contract) {
  const existing = existingPaths instanceof Set ? existingPaths : new Set(existingPaths ?? []);
  const required = [...(contract.required_release_paths ?? []), ...(contract.required_test_paths ?? [])];
  const missing = required.filter((candidate) => !existing.has(candidate));
  if (missing.length) throw new Error(`Outlook release coverage paths are missing: ${missing.join(", ")}`);
  return { required_path_count: required.length };
}
