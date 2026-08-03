#!/usr/bin/env node

process.stderr.write(`${JSON.stringify({
  verdict: "BLOCKED_BY_AUTHORITY",
  error_code: "FORMAL_DEPLOYED_API_QA_LAUNCHER_REQUIRED",
  actual_deployment_pass: false,
  production_contact_count: 0,
})}\n`);
process.exitCode = 2;
