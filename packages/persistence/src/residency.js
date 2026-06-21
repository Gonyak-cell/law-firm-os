export const DATA_RESIDENCY_REGIONS = Object.freeze(["synthetic", "US", "EU", "KR", "UK", "CA"]);

export const DATA_RESIDENCY_POLICIES = Object.freeze([
  "synthetic-only",
  "us-only",
  "eu-only",
  "kr-only",
  "uk-only",
  "ca-only"
]);

export const DATA_CLASSIFICATIONS = Object.freeze([
  "public",
  "internal",
  "confidential",
  "restricted",
  "privileged",
  "hr-sensitive",
  "client-confidential"
]);

function requireAllowed(value, allowed, name) {
  if (!allowed.includes(value)) {
    throw new TypeError(`invalid ${name}: ${value}`);
  }
  return value;
}

export function createDataResidencyMetadata(input = {}, fallback = {}) {
  const metadata = {
    region: input.region ?? fallback.region ?? "synthetic",
    policy: input.policy ?? fallback.policy ?? "synthetic-only",
    classification: input.classification ?? fallback.classification ?? "internal",
    source: input.source ?? fallback.source ?? "runtime-spine-synthetic"
  };
  requireAllowed(metadata.region, DATA_RESIDENCY_REGIONS, "data residency region");
  requireAllowed(metadata.policy, DATA_RESIDENCY_POLICIES, "data residency policy");
  requireAllowed(metadata.classification, DATA_CLASSIFICATIONS, "data classification");
  return Object.freeze(metadata);
}

export function assertTenantResidency(tenant = {}, metadata = {}) {
  const normalized = createDataResidencyMetadata(metadata);
  if (tenant.region && tenant.region !== "synthetic" && normalized.region !== tenant.region) {
    throw new Error(`tenant residency mismatch: expected ${tenant.region}, got ${normalized.region}`);
  }
  if (
    tenant.data_residency_policy &&
    tenant.data_residency_policy !== "synthetic-only" &&
    normalized.policy !== tenant.data_residency_policy
  ) {
    throw new Error(`tenant residency policy mismatch: expected ${tenant.data_residency_policy}, got ${normalized.policy}`);
  }
  return true;
}

export function applyDataResidencyMetadata(record = {}, metadata = {}, tenant = {}) {
  const normalized = createDataResidencyMetadata(metadata, {
    region: record.residency_region ?? tenant.region ?? "synthetic",
    policy: record.data_residency_policy ?? tenant.data_residency_policy ?? "synthetic-only",
    classification: record.data_classification ?? "internal"
  });
  assertTenantResidency(tenant, normalized);
  return Object.freeze({
    ...record,
    residency_region: normalized.region,
    data_residency_policy: normalized.policy,
    data_classification: normalized.classification
  });
}
