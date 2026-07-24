const ROLE_NAME = /^[a-z_][a-z0-9_]{0,62}$/u;

export async function setPostgresRolePassword(client, {
  roleName,
  password,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL client is required");
  }
  const name = String(roleName ?? "").trim();
  const value = String(password ?? "");
  if (!ROLE_NAME.test(name) || !value) {
    throw new TypeError("PostgreSQL role name and password are required");
  }
  await client.query(
    `SELECT set_config('lawos.bootstrap_role_name', $1, true),
            set_config('lawos.bootstrap_role_password', $2, true)`,
    [name, value],
  );
  await client.query(`
DO $lawos_role_password$
DECLARE
  role_name text := current_setting('lawos.bootstrap_role_name', true);
  role_password text := current_setting('lawos.bootstrap_role_password', true);
BEGIN
  IF role_name IS NULL OR role_password IS NULL OR role_password = '' THEN
    RAISE EXCEPTION 'role password bootstrap context is missing';
  END IF;
  EXECUTE format('ALTER ROLE %I PASSWORD %L', role_name, role_password);
  PERFORM set_config('lawos.bootstrap_role_password', '', true);
END
$lawos_role_password$;`);
  return Object.freeze({
    role_name: name,
    password_returned: false,
    secret_material_returned: false,
  });
}
