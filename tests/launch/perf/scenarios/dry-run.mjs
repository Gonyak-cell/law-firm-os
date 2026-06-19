#!/usr/bin/env node
import { buildSyntheticManifest, loadSyntheticProfile } from "../lib/synthetic-perf.mjs";
import { searchIndexScenario } from "./search-index.mjs";
import { documentUploadScenario } from "./document-upload.mjs";
import { concurrentUsersScenario } from "./concurrent-users.mjs";

const scenarios = [searchIndexScenario, documentUploadScenario, concurrentUsersScenario];
const profile = loadSyntheticProfile();
const manifest = buildSyntheticManifest(profile);

const results = scenarios.map((scenario) => {
  const missingCounts = Object.entries(scenario.required_counts).filter(
    ([key, minimum]) => (manifest.generated_counts[key] ?? 0) < minimum
  );
  return {
    id: scenario.id,
    name: scenario.name,
    dry_run_only: scenario.dry_run_only,
    runtime_requests_executed: false,
    required_counts_satisfied: missingCounts.length === 0,
    missing_counts: missingCounts.map(([key]) => key),
    measure_count: scenario.measures.length,
    boundary: scenario.boundary
  };
});

const output = {
  schema_version: "law-firm-os.launch-perf.scenario-dry-run.v0.1",
  profile_id: profile.profile_id,
  seed: profile.seed,
  synthetic_only: true,
  no_real_data: true,
  scenario_count: scenarios.length,
  all_required_counts_satisfied: results.every((result) => result.required_counts_satisfied),
  runtime_requests_executed: false,
  staging_loaded: false,
  scenarios: results
};

console.log(JSON.stringify(output, null, 2));

if (
  output.scenario_count !== 3 ||
  output.synthetic_only !== true ||
  output.no_real_data !== true ||
  output.runtime_requests_executed !== false ||
  output.staging_loaded !== false ||
  !output.all_required_counts_satisfied
) {
  process.exit(1);
}
