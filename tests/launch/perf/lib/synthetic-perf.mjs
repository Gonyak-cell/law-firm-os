import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultProfilePath = resolve(__dirname, "../datagen/wave1-pilot.synthetic-profile.json");

export function loadSyntheticProfile(profilePath = defaultProfilePath) {
  return JSON.parse(readFileSync(profilePath, "utf8"));
}

export function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildSyntheticManifest(profile = loadSyntheticProfile()) {
  const counts = { ...profile.target_counts };
  const countDigest = stableHash({
    seed: profile.seed,
    target_counts: counts,
    scenario_mix: profile.scenario_mix
  });

  return {
    schema_version: "law-firm-os.launch-perf.synthetic-manifest.v0.1",
    profile_id: profile.profile_id,
    status: profile.status,
    seed: profile.seed,
    synthetic_only: profile.synthetic_only === true,
    no_real_data: profile.no_real_data === true,
    target_counts: counts,
    generated_counts: counts,
    target_count_match: Object.entries(counts).every(([key, value]) => counts[key] === value),
    deterministic_digest: countDigest,
    scenario_mix: profile.scenario_mix,
    boundaries: {
      ...profile.boundaries,
      manifest_only: true,
      staging_load_verified: false
    }
  };
}

export function buildSampleRows(profile = loadSyntheticProfile()) {
  const sampleMatters = Array.from({ length: 3 }, (_, index) => ({
    id: `SYN-MAT-${String(index + 1).padStart(4, "0")}`,
    tenant_id: "SYN-TENANT-001",
    client_ref: `SYN-CLIENT-${String(index + 1).padStart(3, "0")}`,
    matter_name: `Synthetic Matter ${index + 1}`,
    confidentiality: index === 0 ? "standard" : "restricted",
    synthetic: true
  }));

  const sampleDocuments = sampleMatters.flatMap((matter, matterIndex) =>
    Array.from({ length: 2 }, (_, docIndex) => ({
      id: `SYN-DOC-${String(matterIndex * 2 + docIndex + 1).padStart(5, "0")}`,
      matter_id: matter.id,
      file_ref: `file_ref:synthetic:${matter.id}:${docIndex + 1}`,
      title: `Synthetic Document ${matterIndex + 1}-${docIndex + 1}`,
      synthetic: true
    }))
  );

  return {
    seed: profile.seed,
    synthetic_only: true,
    matters: sampleMatters,
    documents: sampleDocuments,
    digest: stableHash({ sampleMatters, sampleDocuments, seed: profile.seed })
  };
}

export function assertSyntheticManifest(manifest) {
  const countKeys = Object.keys(manifest.target_counts ?? {});
  const mismatches = countKeys.filter(
    (key) => manifest.target_counts[key] !== manifest.generated_counts[key]
  );
  const failures = [];
  if (manifest.synthetic_only !== true) failures.push("synthetic_only_not_true");
  if (manifest.no_real_data !== true) failures.push("no_real_data_not_true");
  if (!manifest.seed) failures.push("seed_missing");
  if (!manifest.deterministic_digest) failures.push("deterministic_digest_missing");
  if (mismatches.length) failures.push(`count_mismatch:${mismatches.join(",")}`);
  return { ok: failures.length === 0, failures };
}
