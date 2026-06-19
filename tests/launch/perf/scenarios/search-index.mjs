export const searchIndexScenario = {
  id: "PERF-SCENARIO-01",
  name: "search_index",
  dry_run_only: true,
  runtime_requests_executed: false,
  required_counts: {
    matters: 1,
    documents: 1,
    emails: 1,
    audit_hints: 1
  },
  measures: ["search_p95_ms", "error_rate", "query_family_coverage"],
  boundary: "Synthetic authorized search/index traffic only; no search runtime is executed by dry-run."
};
