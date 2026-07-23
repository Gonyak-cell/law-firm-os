import { createHash } from "node:crypto";

export const JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS = Object.freeze([
  "signed-artifacts-deployed",
  "tenant-isolation",
  "internal-email-auth",
  "critical-domain-flows",
  "dms",
  "audit-outbox",
  "backup-visibility",
  "cut-012",
]);

export const JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS = Object.freeze([
  "background-workers",
  "scheduled-jobs",
  "representative-authorized-operations",
]);

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const ZERO_AUTHORITY_COUNTERS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
]);

function fail(message) {
  throw new Error(message);
}
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function material(value, digestKey = "result_sha256") {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== digestKey));
}

function exactPacket(packet) {
  if (!SHA1.test(packet?.source_sha ?? "")
    || !SHA1.test(packet?.source_tree ?? "")
    || !SHA256.test(packet?.packet_sha256 ?? "")
    || packet.phase !== "w13-production-cutover") {
    fail("production smoke requires an exact W13 packet");
  }
  return packet;
}

function exactComponent(value, packet, allowed, schemaVersion, label) {
  exactPacket(packet);
  if (value?.schema_version !== schemaVersion
    || value.outcome !== "PASS"
    || !allowed.includes(value.component)
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || !TIME.test(value.observed_at ?? "")
    || !Number.isFinite(Date.parse(value.observed_at))
    || !Number.isSafeInteger(value.observed_event_count)
    || value.observed_event_count < 1
    || value.failed_event_count !== 0
    || !SHA256.test(value.external_evidence_sha256 ?? "")
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== sha256(material(value))) {
    fail(`${label} component evidence is invalid`);
  }
  return value;
}

function createComponent({
  packet,
  component,
  observedAt,
  observedEventCount,
  externalEvidenceSha256,
}, allowed, schemaVersion, label) {
  exactPacket(packet);
  if (!allowed.includes(component)
    || !TIME.test(observedAt ?? "")
    || !Number.isSafeInteger(observedEventCount)
    || observedEventCount < 1
    || !SHA256.test(externalEvidenceSha256 ?? "")) {
    fail(`${label} component input is invalid`);
  }
  const value = {
    schema_version: schemaVersion,
    outcome: "PASS",
    component,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    observed_at: observedAt,
    observed_event_count: observedEventCount,
    failed_event_count: 0,
    external_evidence_sha256: externalEvidenceSha256,
  };
  return Object.freeze({ ...value, result_sha256: sha256(value) });
}

function exactSet(values, expected, validator, label) {
  if (!Array.isArray(values)
    || values.length !== expected.length
    || JSON.stringify(values.map((item) => item?.component).sort())
      !== JSON.stringify([...expected].sort())) {
    fail(`${label} component set is incomplete`);
  }
  return values.map(validator);
}

export function createJsonPostgresProductionSmokeComponent(input = {}) {
  return createComponent(
    input,
    JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS,
    "law-firm-os.json-postgres-production-smoke-component.v1",
    "production smoke",
  );
}

export function validateJsonPostgresProductionSmokeComponent(value, { packet } = {}) {
  return exactComponent(
    value,
    packet,
    JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS,
    "law-firm-os.json-postgres-production-smoke-component.v1",
    "production smoke",
  );
}

export function createJsonPostgresEventAcceptanceComponent(input = {}) {
  return createComponent(
    input,
    JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS,
    "law-firm-os.json-postgres-event-acceptance-component.v1",
    "event acceptance",
  );
}

export function validateJsonPostgresEventAcceptanceComponent(value, { packet } = {}) {
  return exactComponent(
    value,
    packet,
    JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS,
    "law-firm-os.json-postgres-event-acceptance-component.v1",
    "event acceptance",
  );
}

export function createJsonPostgresProductionSmokeEvidence({
  packet,
  components,
  authorityCounters,
} = {}) {
  exactPacket(packet);
  const verified = exactSet(
    components,
    JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS,
    (value) => validateJsonPostgresProductionSmokeComponent(value, { packet }),
    "production smoke",
  );
  if (ZERO_AUTHORITY_COUNTERS.some((key) => authorityCounters?.[key] !== 0)
    || Object.keys(authorityCounters ?? {}).length !== ZERO_AUTHORITY_COUNTERS.length) {
    fail("production smoke legacy authority counters are not exactly zero");
  }
  const byComponent = Object.fromEntries(
    verified.map((value) => [value.component, value.result_sha256]),
  );
  const value = {
    schema_version: "law-firm-os.json-postgres-production-smoke.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    component_result_sha256: byComponent,
    signed_artifacts_deployed: true,
    production_smoke_passed: true,
    tenant_isolation_passed: true,
    internal_email_auth_passed: true,
    critical_domain_flows_passed: true,
    dms_passed: true,
    audit_outbox_passed: true,
    backup_visible: true,
    cut_012_verified: true,
    critical_flow_failure_count: 0,
    active_stop_condition_count: 0,
    ...Object.fromEntries(ZERO_AUTHORITY_COUNTERS.map((key) => [key, 0])),
  };
  return Object.freeze({ ...value, result_sha256: sha256(value) });
}

export function validateJsonPostgresProductionSmokeEvidence(value, { packet } = {}) {
  exactPacket(packet);
  const componentDigests = value?.component_result_sha256;
  if (value?.schema_version !== "law-firm-os.json-postgres-production-smoke.v1"
    || value.outcome !== "PASS"
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || !componentDigests
    || typeof componentDigests !== "object"
    || Array.isArray(componentDigests)
    || JSON.stringify(Object.keys(componentDigests).sort())
      !== JSON.stringify([...JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS].sort())
    || Object.values(componentDigests).some((digest) => !SHA256.test(digest))
    || value.signed_artifacts_deployed !== true
    || value.production_smoke_passed !== true
    || value.tenant_isolation_passed !== true
    || value.internal_email_auth_passed !== true
    || value.critical_domain_flows_passed !== true
    || value.dms_passed !== true
    || value.audit_outbox_passed !== true
    || value.backup_visible !== true
    || value.cut_012_verified !== true
    || value.critical_flow_failure_count !== 0
    || value.active_stop_condition_count !== 0
    || ZERO_AUTHORITY_COUNTERS.some((key) => value[key] !== 0)
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== sha256(material(value))) {
    fail("production smoke evidence is invalid");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
    component_count: JSON_POSTGRES_PRODUCTION_SMOKE_COMPONENTS.length,
  });
}

export function createJsonPostgresEventAcceptanceEvidence({
  packet,
  components,
} = {}) {
  exactPacket(packet);
  const verified = exactSet(
    components,
    JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS,
    (value) => validateJsonPostgresEventAcceptanceComponent(value, { packet }),
    "event acceptance",
  );
  const value = {
    schema_version: "law-firm-os.json-postgres-event-acceptance.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    component_result_sha256: Object.fromEntries(
      verified.map((item) => [item.component, item.result_sha256]),
    ),
    background_workers_observed: true,
    scheduled_jobs_observed: true,
    representative_authorized_operations_observed: true,
    observed_event_count: verified.reduce((total, item) => total + item.observed_event_count, 0),
    failed_event_count: 0,
  };
  return Object.freeze({ ...value, result_sha256: sha256(value) });
}

export function validateJsonPostgresEventAcceptanceEvidence(value, { packet } = {}) {
  exactPacket(packet);
  const componentDigests = value?.component_result_sha256;
  if (value?.schema_version !== "law-firm-os.json-postgres-event-acceptance.v1"
    || value.outcome !== "PASS"
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || !componentDigests
    || typeof componentDigests !== "object"
    || Array.isArray(componentDigests)
    || JSON.stringify(Object.keys(componentDigests).sort())
      !== JSON.stringify([...JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS].sort())
    || Object.values(componentDigests).some((digest) => !SHA256.test(digest))
    || value.background_workers_observed !== true
    || value.scheduled_jobs_observed !== true
    || value.representative_authorized_operations_observed !== true
    || !Number.isSafeInteger(value.observed_event_count)
    || value.observed_event_count < JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS.length
    || value.failed_event_count !== 0
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== sha256(material(value))) {
    fail("event acceptance evidence is invalid");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
    component_count: JSON_POSTGRES_EVENT_ACCEPTANCE_COMPONENTS.length,
  });
}
