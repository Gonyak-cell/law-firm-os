import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";

export const POSTGRES_DMS_CONSUMER_READ_AUTHORITY = "lawos-dms-postgres-consumer-read-v1";
const REQUIRED_RLS_POLICIES = Object.freeze(new Map([
  ["file_objects", "dms_file_objects_tenant_policy"],
  ["upload_sessions", "dms_upload_sessions_tenant_policy"],
]));
const TENANT_RLS_EXPRESSION = "(tenant_id = lawos_security.current_tenant_id())";

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function denied(code = "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED") {
  return Object.assign(new Error("DMS committed object is not available"), {
    code: `LAWOS_${code}`,
    safe_error_code: code,
    status: 409,
  });
}

export function createPostgresDmsConsumerReadAuthority({
  pool,
  transactionOptions = {},
} = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  let probeCompleted = false;
  const contract = () => Object.freeze({
    authority: POSTGRES_DMS_CONSUMER_READ_AUTHORITY,
    durable: true,
    deny_before_provider_io: true,
    probe_completed: probeCompleted,
  });
  const probeCatalog = async (tenantId) => withPostgresTransaction(
    pool,
    { ...transactionOptions, tenant_id: tenantId, readOnly: true },
    async (client) => {
      const result = await client.query(
        `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
                p.polname, p.polcmd,
                pg_get_expr(p.polqual, p.polrelid) AS using_expression,
                pg_get_expr(p.polwithcheck, p.polrelid) AS check_expression
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           LEFT JOIN pg_policy p ON p.polrelid = c.oid
          WHERE n.nspname = 'lawos_dms'
            AND c.relname = ANY($1::text[])
          ORDER BY c.relname, p.polname`,
        [[...REQUIRED_RLS_POLICIES.keys()]],
      );
      const normalized = (value) => String(value ?? "").replace(/\s+/gu, " ").trim().toLowerCase();
      const exact = result.rows.length === REQUIRED_RLS_POLICIES.size
        && result.rows.every((row) => row.relrowsecurity === true
          && row.relforcerowsecurity === true
          && row.polname === REQUIRED_RLS_POLICIES.get(row.relname)
          && row.polcmd === "*"
          && normalized(row.using_expression) === TENANT_RLS_EXPRESSION
          && normalized(row.check_expression) === TENANT_RLS_EXPRESSION);
      if (!exact) throw denied("DMS_CONSUMER_READ_AUTHORITY_UNAVAILABLE");
    },
  );
  const inspect = async ({ tenant_id, object_id, adapter_id } = {}) => {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const objectId = requiredText(object_id, "object_id");
    const adapterId = requiredText(adapter_id, "adapter_id");
    return withPostgresTransaction(
      pool,
      { ...transactionOptions, tenant_id: tenantId, readOnly: true },
      async (client) => {
        const result = await client.query(
          `SELECT s.state, s.metadata_committed_at,
                  f.status AS file_object_status,
                  (s.state = 'finalized'
                   AND s.metadata_committed_at IS NOT NULL
                   AND f.status = 'committed'
                   AND s.adapter_id = $3
                   AND f.adapter_id = $3
                   AND f.sha256 = s.expected_sha256
                   AND f.byte_size = s.expected_byte_size
                   AND f.content_type = s.content_type) AS readable
             FROM lawos_dms.upload_sessions s
             LEFT JOIN lawos_dms.file_objects f
               ON f.tenant_id = s.tenant_id AND f.object_id = s.object_id
            WHERE s.tenant_id = $1 AND s.object_id = $2`,
          [tenantId, objectId, adapterId],
        );
        const row = result.rows[0];
        return Object.freeze({
          tracked: Boolean(row),
          readable: row?.readable === true,
        });
      },
    );
  };
  return Object.freeze({
    authority: POSTGRES_DMS_CONSUMER_READ_AUTHORITY,
    durable: true,
    validate() {
      return contract();
    },
    async probe({ tenant_id, adapter_id } = {}) {
      const tenantId = requiredText(tenant_id, "tenant_id");
      const adapterId = requiredText(adapter_id, "adapter_id");
      await probeCatalog(tenantId);
      await inspect({
        tenant_id: tenantId,
        object_id: "lawos-dms-consumer-read-authority-preflight",
        adapter_id: adapterId,
      });
      probeCompleted = true;
      return contract();
    },
    async assertReadable(input) {
      if (!probeCompleted) throw denied("DMS_CONSUMER_READ_AUTHORITY_UNAVAILABLE");
      const state = await inspect(input);
      if (!state.readable) throw denied();
      return state;
    },
    async assertDenied(input) {
      if (!probeCompleted) throw denied("DMS_CONSUMER_READ_AUTHORITY_UNAVAILABLE");
      const state = await inspect(input);
      if (!state.tracked || state.readable) throw denied("DMS_COMMITTED_OBJECT_DENY_UNCONFIRMED");
      return state;
    },
  });
}

export function createPostgresDmsConsumerStorage({ storage, authority } = {}) {
  if (!storage || typeof storage !== "object") throw new TypeError("DMS provider storage is required");
  for (const method of ["getObject", "statObject", "digestObject", "readObjectBounded"]) {
    if (typeof storage[method] !== "function") throw new TypeError(`DMS provider storage missing ${method}`);
  }
  const adapterId = requiredText(storage.adapter_id, "storage.adapter_id");
  const contract = authority?.validate?.();
  if (contract?.authority !== POSTGRES_DMS_CONSUMER_READ_AUTHORITY
      || contract.durable !== true
      || contract.deny_before_provider_io !== true
      || typeof authority?.assertReadable !== "function") {
    throw new TypeError("PostgreSQL DMS consumer read authority is required");
  }
  const invoke = async (method, input) => {
    if (input?.session_id != null) throw denied();
    await authority.assertReadable({ ...input, adapter_id: adapterId });
    return storage[method](input);
  };
  return Object.freeze({
    ...storage,
    consumer_read_authority: POSTGRES_DMS_CONSUMER_READ_AUTHORITY,
    validateConsumerReadAuthority: () => authority.validate(),
    getObject: (input) => invoke("getObject", input),
    statObject: (input) => invoke("statObject", input),
    digestObject: (input) => invoke("digestObject", input),
    readObjectBounded: (input) => invoke("readObjectBounded", input),
  });
}
