import {
  PROJECTION_AUDITOR_FORBIDDEN_ENV_KEYS,
  PROJECTION_AUDITOR_REQUIRED_ENV_KEYS,
  environmentKeyInventoryDigest,
} from "./outlook-production-aws-inventory-contract.mjs";

const ENVIRONMENT_KEYS = Object.freeze([
  "authority",
  "expected_keys",
  "expected_key_inventory_sha256",
]);
const REQUIRED = Object.freeze(
  [...PROJECTION_AUDITOR_REQUIRED_ENV_KEYS].sort(),
);

export function exactProjectionAuditorEnvironment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...ENVIRONMENT_KEYS].sort())
    || value.authority !== "PROCESSED_CLOUDFORMATION"
    || !Array.isArray(value.expected_keys)
    || value.expected_keys.join("\n") !== REQUIRED.join("\n")
    || !value.expected_keys.includes(
      "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
    )
    || value.expected_keys.some(
      (key) => PROJECTION_AUDITOR_FORBIDDEN_ENV_KEYS.includes(key),
    )) return false;
  return value.expected_key_inventory_sha256
    === environmentKeyInventoryDigest(
      "lawos-production-projection-auditor",
      "ProjectionAuditorFunction",
      REQUIRED,
    );
}
