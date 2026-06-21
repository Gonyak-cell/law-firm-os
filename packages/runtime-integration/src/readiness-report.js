import { RUNTIME_INTEGRATION_RESPONSIBILITY_MAP } from "./responsibility-map.js";

export function createRuntimeReadyEvidenceReport(result) {
  return Object.freeze({
    schema_version: "law-firm-os.runtime-spine.g6-runtime-ready-report.v0.1",
    status: result.ok ? "ready_candidate" : "blocked",
    runtime_ready_candidate: result.ok === true,
    actual_launch_go_live_claim: false,
    production_ready_claim: false,
    sandbox_attestation: result.sandbox_attestation,
    rtg_results: result.rtg_results,
    check_count: result.checks.length,
    audit_event_count: result.audit_event_count,
    responsibility_map: RUNTIME_INTEGRATION_RESPONSIBILITY_MAP,
    locked_future_domains: result.locked_future_domains,
    evidence_refs: Object.freeze([
      "packages/runtime-integration/src/harness.js",
      "packages/runtime-integration/test/harness.test.js",
      "packages/runtime-integration/test/security-boundary.test.js",
      "packages/runtime-integration/test/readiness-report.test.js"
    ])
  });
}
