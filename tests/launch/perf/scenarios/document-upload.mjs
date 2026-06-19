export const documentUploadScenario = {
  id: "PERF-SCENARIO-02",
  name: "document_upload_metadata",
  dry_run_only: true,
  runtime_requests_executed: false,
  required_counts: {
    matters: 1,
    documents: 1,
    file_refs: 1,
    audit_hints: 1
  },
  measures: ["document_register_p95_ms", "error_rate", "file_ref_metadata_integrity"],
  boundary: "Synthetic metadata/file_ref registration only; provider file transfer is excluded until MAT-DEC-03."
};
