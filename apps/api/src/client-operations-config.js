export const LAWOS_CLIENT_OPERATIONS_V2_ENABLED_ENV =
  "LAWOS_CLIENT_OPERATIONS_V2_ENABLED";

export function resolveClientOperationsV2Enabled({
  value,
  env = process.env,
} = {}) {
  const selected = value
    ?? env[LAWOS_CLIENT_OPERATIONS_V2_ENABLED_ENV];
  if (selected === undefined || selected === null || selected === "") {
    return false;
  }
  if (typeof selected === "boolean") return selected;
  const normalized = String(selected).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new TypeError(
    `${LAWOS_CLIENT_OPERATIONS_V2_ENABLED_ENV} must be true or false`,
  );
}
