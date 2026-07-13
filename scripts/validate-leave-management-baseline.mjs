#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateLeaveManagementBaseline } from "../packages/hrx/src/leave/management-baseline.js";

const fixturePath = resolve("packages/hrx/fixtures/leave-management-defaults.synthetic.json");
const baseline = validateLeaveManagementBaseline(JSON.parse(readFileSync(fixturePath, "utf8")));

console.log(JSON.stringify({
  status: "pass",
  schema_version: baseline.schema_version,
  decision_count: baseline.decisions.length,
  legal_version_count: baseline.legal_basis_versions.length,
  canonical_settings_section: baseline.route_ownership.canonical_settings_section,
  real_employee_data_allowed: baseline.real_employee_data_allowed,
  deployment_requires_company_decisions: baseline.deployment_requires_company_decisions,
}));
