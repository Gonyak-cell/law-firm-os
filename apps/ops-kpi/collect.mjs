#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultInputPath = resolve(__dirname, "fixtures/synthetic-kpi-input.json");

function ratio(numerator, denominator) {
  if (denominator === 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function requireNumber(counts, key) {
  const value = counts[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Missing numeric aggregate count: ${key}`);
  }
  return value;
}

function assertAggregateOnly(input) {
  const failures = [];
  if (input.synthetic_only !== true) failures.push("synthetic_only_not_true");
  if (input.no_real_data !== true) failures.push("no_real_data_not_true");
  if (input.aggregate_only !== true) failures.push("aggregate_only_not_true");
  for (const [key, value] of Object.entries(input.raw_field_policy ?? {})) {
    if (value !== false) failures.push(`raw_field_policy_violation:${key}`);
  }
  if (failures.length) {
    throw new Error(failures.join(","));
  }
}

export function collectKpis(input) {
  assertAggregateOnly(input);
  const counts = input.counts ?? {};

  const kpis = [
    {
      id: "KPI-DEF-01",
      name: "Matter status visibility",
      value: ratio(
        requireNumber(counts, "matter_status_visible_required_signals"),
        requireNumber(counts, "matter_status_required_signals")
      ),
      unit: "percent",
      numerator: "matter_status_visible_required_signals",
      denominator: "matter_status_required_signals"
    },
    {
      id: "KPI-DEF-02",
      name: "Filing usage rate",
      value: ratio(
        requireNumber(counts, "filed_outlook_emails"),
        requireNumber(counts, "eligible_outlook_emails")
      ),
      unit: "percent",
      numerator: "filed_outlook_emails",
      denominator: "eligible_outlook_emails"
    },
    {
      id: "KPI-DEF-03",
      name: "Document integrity",
      value: ratio(
        requireNumber(counts, "qc_errors_fixed"),
        requireNumber(counts, "qc_errors_detected")
      ),
      unit: "percent",
      numerator: "qc_errors_fixed",
      denominator: "qc_errors_detected"
    },
    {
      id: "KPI-DEF-04",
      name: "AI reliability",
      value:
        requireNumber(counts, "total_ai_outputs") === 0
          ? "pass_zero_output"
          : ratio(
              requireNumber(counts, "source_linked_ai_outputs"),
              requireNumber(counts, "total_ai_outputs")
            ),
      unit: "percent_or_zero_output_state",
      numerator: "source_linked_ai_outputs",
      denominator: "total_ai_outputs",
      companion_count: {
        hallucination_incidents: requireNumber(counts, "hallucination_incidents")
      }
    },
    {
      id: "KPI-DEF-05",
      name: "Security",
      value: {
        unauthorized_block_rate: ratio(
          requireNumber(counts, "blocked_unauthorized_attempts"),
          requireNumber(counts, "unauthorized_attempts")
        ),
        audit_completeness_rate: ratio(
          requireNumber(counts, "audit_events_present"),
          requireNumber(counts, "expected_audit_events")
        )
      },
      unit: "percent_pair",
      numerator: "blocked_unauthorized_attempts,audit_events_present",
      denominator: "unauthorized_attempts,expected_audit_events"
    },
    {
      id: "KPI-DEF-06",
      name: "HR stability",
      value: {
        hr_sensitive_block_rate: ratio(
          requireNumber(counts, "blocked_hr_sensitive_attempts"),
          requireNumber(counts, "hr_sensitive_attempts")
        ),
        rule_engine_separation_pass_rate: ratio(
          requireNumber(counts, "rule_engine_separation_passes"),
          requireNumber(counts, "rule_engine_separation_checks")
        )
      },
      unit: "percent_pair",
      numerator: "blocked_hr_sensitive_attempts,rule_engine_separation_passes",
      denominator: "hr_sensitive_attempts,rule_engine_separation_checks"
    },
    {
      id: "KPI-DEF-07",
      name: "Knowledge conversion",
      value: ratio(
        requireNumber(counts, "knowledge_packs_created"),
        requireNumber(counts, "closed_matters")
      ),
      unit: "percent",
      numerator: "knowledge_packs_created",
      denominator: "closed_matters"
    }
  ];

  return {
    schema_version: "law-firm-os.ops-kpi.collection-output.v0.1",
    fixture_id: input.fixture_id,
    collection_window: input.collection_window,
    synthetic_only: true,
    no_real_data: true,
    aggregate_only: true,
    staging_source: input.staging_source === true,
    raw_sensitive_fields_exposed: false,
    kpi_count: kpis.length,
    null_value_count: kpis.filter((kpi) => kpi.value === null).length,
    dashboard_published: false,
    auto_refresh_24h_verified: false,
    kpis
  };
}

const args = process.argv.slice(2);
if (args.includes("--all")) {
  const inputIndex = args.indexOf("--input");
  const inputPath = inputIndex >= 0 ? resolve(args[inputIndex + 1]) : defaultInputPath;
  const input = JSON.parse(readFileSync(inputPath, "utf8"));
  const output = collectKpis(input);
  console.log(JSON.stringify(output, null, 2));
  if (
    output.kpi_count !== 7 ||
    output.null_value_count !== 0 ||
    output.synthetic_only !== true ||
    output.no_real_data !== true ||
    output.aggregate_only !== true ||
    output.raw_sensitive_fields_exposed !== false
  ) {
    process.exit(1);
  }
}
