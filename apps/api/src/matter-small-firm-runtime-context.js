import { MATTER_SMALL_FIRM_OPS_ENDPOINTS } from "./matter-small-firm-api-catalog.js";

export const MATTER_SMALL_FIRM_OPS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "matter-small-firm-ops",
  contract_ref: ".lazyweb/design-research/matter-small-firm-os-2026-07-30/report.html",
  contract_schema_version: "law-firm-os.matter-small-firm-ops.v0.1",
  endpoints: Object.freeze(
    MATTER_SMALL_FIRM_OPS_ENDPOINTS.map(({ method, path }) => `${method} ${path}`),
  ),
  data_source: "matter_and_finance_runtime_repositories",
  runtime_persistence: "repository_ports",
  runtime_write_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export function createMatterSmallFirmRuntimeContext({
  matterRepository,
  financeRepository,
  now = () => new Date(),
} = {}) {
  if (!matterRepository) throw new TypeError("matterRepository is required");
  if (!financeRepository) throw new TypeError("financeRepository is required");
  if (typeof now !== "function") throw new TypeError("now must be a function");
  return Object.freeze({ matterRepository, financeRepository, now });
}
