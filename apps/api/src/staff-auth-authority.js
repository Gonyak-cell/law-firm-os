export const LAWOS_STAFF_AUTH_AUTHORITY_ENV = "LAWOS_STAFF_AUTHORITY";
export const LAWOS_STAFF_AUTH_AUTHORITIES = Object.freeze({
  internalPassword: "internal-password",
  entraOidc: "entra-oidc",
});

export function resolveStaffAuthAuthority(value = process.env[LAWOS_STAFF_AUTH_AUTHORITY_ENV]) {
  const normalized = String(value ?? LAWOS_STAFF_AUTH_AUTHORITIES.internalPassword).trim().toLowerCase();
  if (Object.values(LAWOS_STAFF_AUTH_AUTHORITIES).includes(normalized)) return normalized;
  const error = new Error(`${LAWOS_STAFF_AUTH_AUTHORITY_ENV} must be internal-password or entra-oidc`);
  error.code = "LAWOS_STAFF_AUTH_AUTHORITY_INVALID";
  error.exitCode = 78;
  throw error;
}
