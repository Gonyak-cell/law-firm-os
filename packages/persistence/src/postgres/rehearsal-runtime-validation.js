import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import { createPostgresIdentityLedger } from "../../../runtime-auth/src/postgres-identity-ledger.js";
import { hashDomainValue } from "../domain-ledger.js";
import {
  commitPostgresRecordWithAuditOutbox,
  createPostgresRepositoryPortV2,
} from "./repository-v2.js";
import { createPostgresDomainLedger } from "./domain-ledger.js";
import {
  jsonPostgresDirectoryProjection,
  prepareJsonPostgresMigrationCorpus,
} from "./json-postgres-migration.js";
import { withPostgresTransaction } from "./transaction.js";

export const JSON_POSTGRES_REHEARSAL_FAILURE_INJECTION_VERSION =
  "law-firm-os.json-postgres-rehearsal-failure-injection.v1";
export const JSON_POSTGRES_REHEARSAL_OWNER_SAMPLING_VERSION =
  "law-firm-os.json-postgres-rehearsal-owner-sampling.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
const SAMPLE_TYPES = Object.freeze([
  Object.freeze({
    sample_kind: "employee",
    domain_id: "hrx",
    record_type: "hrx_employees",
    maximum_count: 3,
  }),
  Object.freeze({
    sample_kind: "client",
    domain_id: "matter",
    record_type: "MatterClient",
    maximum_count: 3,
  }),
  Object.freeze({
    sample_kind: "matter",
    domain_id: "matter",
    record_type: "Matter",
    maximum_count: 3,
  }),
  Object.freeze({
    sample_kind: "document",
    domain_id: "dms-auxiliary",
    record_type: "DmsDocument",
    maximum_count: 3,
  }),
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function requiredToken(value, label) {
  const text = String(value ?? "").trim();
  if (!TOKEN.test(text)) throw new TypeError(`${label} is invalid`);
  return text;
}

function exactDigest(value, label) {
  const digest = String(value ?? "").trim().toLowerCase();
  if (!SHA256.test(digest)) throw new TypeError(`${label} is invalid`);
  return digest;
}

function resultDigest(value) {
  return createHash("sha256").update(canonicalizeJson(value)).digest("hex");
}

async function probeRowCounts(pool, tenantId, {
  recordId,
  auditEventId,
  outboxEventId,
} = {}) {
  return withPostgresTransaction(
    pool,
    { tenant_id: tenantId, readOnly: true },
    async (client) => {
      const records = await client.query(
        `SELECT count(*)::int AS count
           FROM lawos_runtime.records
          WHERE tenant_id = $1
            AND record_type = 'LawosRehearsalFaultProbe'
            AND record_id = $2`,
        [tenantId, recordId],
      );
      const audit = await client.query(
        `SELECT count(*)::int AS count
           FROM lawos_runtime.audit_events
          WHERE tenant_id = $1 AND event_id = $2`,
        [tenantId, auditEventId],
      );
      const outbox = await client.query(
        `SELECT count(*)::int AS count
           FROM lawos_runtime.outbox_events
          WHERE tenant_id = $1 AND event_id = $2`,
        [tenantId, outboxEventId],
      );
      return Object.freeze({
        record_count: Number(records.rows[0]?.count ?? 0),
        audit_count: Number(audit.rows[0]?.count ?? 0),
        outbox_count: Number(outbox.rows[0]?.count ?? 0),
      });
    },
  );
}

function assertZeroRows(value, label) {
  if (Object.values(value).some((count) => count !== 0)) {
    fail(
      "LAWOS_REHEARSAL_FAILURE_RESIDUAL",
      `${label} left a durable PostgreSQL row`,
    );
  }
}

export async function runJsonPostgresRehearsalFailureInjection({
  pool,
  tenantId,
  negativeTenantId,
  probeRef,
} = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("PostgreSQL pool is required");
  }
  const tenant = requiredToken(tenantId, "tenantId");
  const negativeTenant = requiredToken(
    negativeTenantId,
    "negativeTenantId",
  );
  if (negativeTenant === tenant) {
    throw new TypeError("negativeTenantId must differ from tenantId");
  }
  const probe = requiredToken(probeRef, "probeRef");
  const repository = createPostgresRepositoryPortV2({ pool });
  const base = createHash("sha256")
    .update(`${tenant}\x1f${probe}`)
    .digest("hex")
    .slice(0, 32);
  const ids = (kind) => Object.freeze({
    recordId: `${kind}-${base}`,
    auditEventId: `audit-${kind}-${base}`,
    outboxEventId: `outbox-${kind}-${base}`,
  });

  const rollbackIds = ids("rollback");
  let rollbackObserved = false;
  try {
    await repository.transaction({ tenant_id: tenant }, async (tx) => {
      await tx.write({
        tenant_id: tenant,
        record_type: "LawosRehearsalFaultProbe",
        record_id: rollbackIds.recordId,
        expected_version: 0,
        data: { probe_kind: "transaction-rollback" },
      });
      await tx.appendAudit({
        tenant_id: tenant,
        event_id: rollbackIds.auditEventId,
        event_type: "lawos.rehearsal.rollback",
        object_type: "LawosRehearsalFaultProbe",
        object_id: rollbackIds.recordId,
        payload: { expected_rollback: true },
      });
      await tx.enqueueOutbox({
        tenant_id: tenant,
        event_id: rollbackIds.outboxEventId,
        topic: "lawos.rehearsal.rollback",
        payload: { expected_rollback: true },
      });
      fail(
        "LAWOS_REHEARSAL_INJECTED_ROLLBACK",
        "rehearsal rollback fault injected",
      );
    });
  } catch (error) {
    rollbackObserved = error?.code === "LAWOS_REHEARSAL_INJECTED_ROLLBACK";
  }
  if (!rollbackObserved) {
    fail(
      "LAWOS_REHEARSAL_FAILURE_INJECTION",
      "transaction rollback injection did not reach the expected boundary",
    );
  }
  assertZeroRows(
    await probeRowCounts(pool, tenant, rollbackIds),
    "transaction rollback",
  );

  const conflictIds = ids("conflict");
  let conflictObserved = false;
  try {
    await repository.transaction({ tenant_id: tenant }, async (tx) => {
      await tx.write({
        tenant_id: tenant,
        record_type: "LawosRehearsalFaultProbe",
        record_id: conflictIds.recordId,
        expected_version: 0,
        data: { sequence: 1 },
      });
      await tx.write({
        tenant_id: tenant,
        record_type: "LawosRehearsalFaultProbe",
        record_id: conflictIds.recordId,
        expected_version: 1,
        data: { sequence: 2 },
      });
      await tx.write({
        tenant_id: tenant,
        record_type: "LawosRehearsalFaultProbe",
        record_id: conflictIds.recordId,
        expected_version: 1,
        data: { sequence: 3 },
      });
    });
  } catch (error) {
    conflictObserved = error?.code === "LAWOS_REPOSITORY_CONFLICT";
  }
  if (!conflictObserved) {
    fail(
      "LAWOS_REHEARSAL_FAILURE_INJECTION",
      "optimistic conflict injection did not fail closed",
    );
  }
  assertZeroRows(
    await probeRowCounts(pool, tenant, conflictIds),
    "optimistic conflict",
  );

  const outboxIds = ids("outbox");
  let outboxObserved = false;
  try {
    await commitPostgresRecordWithAuditOutbox(repository, {
      tenant_id: tenant,
      record: {
        record_type: "LawosRehearsalFaultProbe",
        record_id: outboxIds.recordId,
        expected_version: 0,
        data: { probe_kind: "outbox-atomicity" },
      },
      audit_event: {
        event_id: outboxIds.auditEventId,
        event_type: "lawos.rehearsal.outbox",
        object_type: "LawosRehearsalFaultProbe",
        object_id: outboxIds.recordId,
        payload: { expected_rollback: true },
      },
      outbox_event: {
        event_id: outboxIds.outboxEventId,
        topic: "",
        payload: { expected_rollback: true },
      },
    });
  } catch (error) {
    outboxObserved = /outbox topic is required/u.test(error?.message ?? "");
  }
  if (!outboxObserved) {
    fail(
      "LAWOS_REHEARSAL_FAILURE_INJECTION",
      "outbox fault injection did not fail closed",
    );
  }
  assertZeroRows(
    await probeRowCounts(pool, tenant, outboxIds),
    "outbox fault",
  );

  const retryIds = ids("retry");
  let retryAttemptCount = 0;
  let retryObserved = false;
  try {
    await withPostgresTransaction(
      pool,
      {
        tenant_id: tenant,
        maxAttempts: 3,
        retryDelayMillis: 1,
      },
      async (client, { attempt }) => {
        retryAttemptCount = attempt;
        await client.query(
          `INSERT INTO lawos_runtime.records
             (tenant_id, record_type, record_id, state_version, data)
           VALUES ($1, 'LawosRehearsalFaultProbe', $2, 1, $3::jsonb)`,
          [tenant, retryIds.recordId, JSON.stringify({ attempt })],
        );
        throw Object.assign(new Error("injected serializable retry"), {
          code: "40001",
        });
      },
    );
  } catch (error) {
    retryObserved = error?.code === "LAWOS_POSTGRES_RETRY_EXHAUSTED"
      && retryAttemptCount === 3;
  }
  if (!retryObserved) {
    fail(
      "LAWOS_REHEARSAL_FAILURE_INJECTION",
      "retry exhaustion injection did not roll back every attempt",
    );
  }
  assertZeroRows(
    await probeRowCounts(pool, tenant, retryIds),
    "transaction retry",
  );

  let timeoutObserved = false;
  try {
    await withPostgresTransaction(
      pool,
      {
        tenant_id: tenant,
        statementTimeoutMillis: 1,
        maxAttempts: 1,
      },
      (client) => client.query("SELECT pg_sleep(0.05)"),
    );
  } catch (error) {
    timeoutObserved = error?.code === "LAWOS_POSTGRES_OPERATION_FAILED"
      && error?.postgres_code === "57014";
  }
  if (!timeoutObserved) {
    fail(
      "LAWOS_REHEARSAL_FAILURE_INJECTION",
      "statement timeout injection did not fail closed",
    );
  }

  let crossTenantObserved = false;
  try {
    await repository.transaction({ tenant_id: tenant }, (tx) => tx.write({
      tenant_id: negativeTenant,
      record_type: "LawosRehearsalFaultProbe",
      record_id: `cross-tenant-${base}`,
      expected_version: 0,
      data: {},
    }));
  } catch (error) {
    crossTenantObserved = error?.code === "LAWOS_TENANT_SCOPE_MISMATCH";
  }
  if (!crossTenantObserved) {
    fail(
      "LAWOS_REHEARSAL_FAILURE_INJECTION",
      "cross-tenant transaction injection did not fail closed",
    );
  }

  const material = Object.freeze({
    schema_version: JSON_POSTGRES_REHEARSAL_FAILURE_INJECTION_VERSION,
    outcome: "PASS",
    probe_ref_sha256: createHash("sha256").update(probe).digest("hex"),
    checks: Object.freeze({
      transaction_rollback_verified: true,
      partial_commit_prevented: true,
      optimistic_conflict_verified: true,
      outbox_atomicity_verified: true,
      retry_rollback_verified: true,
      statement_timeout_verified: true,
      cross_tenant_transaction_denied: true,
    }),
    safe_counts: Object.freeze({
      injected_fault_count: 6,
      retry_attempt_count: retryAttemptCount,
      partial_commit_count: 0,
      residual_probe_record_count: 0,
      residual_probe_audit_count: 0,
      residual_probe_outbox_count: 0,
      cross_tenant_write_count: 0,
    }),
    claims: Object.freeze({
      durable_probe_write: false,
      source_mutated: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  return Object.freeze({
    ...material,
    result_sha256: resultDigest(material),
  });
}

function deterministicSamples(records, packetSha256, sampleKind, maximumCount) {
  return [...records]
    .map((record) => ({
      record,
      rank: createHash("sha256")
        .update(
          `${packetSha256}\x1f${sampleKind}\x1f`
          + `${record.domain_id}\x1f${record.record_type}\x1f`
          + record.record_id,
        )
        .digest("hex"),
    }))
    .sort((left, right) => left.rank.localeCompare(right.rank))
    .slice(0, Math.min(maximumCount, records.length));
}

function recordSampleRef(packetSha256, sampleKind, record) {
  return createHash("sha256")
    .update(
      `${packetSha256}\x1f${sampleKind}\x1f`
      + `${record.domain_id}\x1f${record.record_type}\x1f`
      + record.record_id,
    )
    .digest("hex");
}

export async function runJsonPostgresRehearsalOwnerSampling({
  pool,
  corpus,
  packetSha256,
  createDomainLedger = createPostgresDomainLedger,
  createIdentityLedger = createPostgresIdentityLedger,
} = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("PostgreSQL pool is required");
  }
  const packetDigest = exactDigest(packetSha256, "packetSha256");
  const prepared = prepareJsonPostgresMigrationCorpus(
    corpus,
    { allowRealData: true },
  );
  const domainLedger = createDomainLedger({ pool });
  const samples = [];
  for (const specification of SAMPLE_TYPES) {
    const snapshot = prepared.snapshots.find(
      (item) => item.domain_id === specification.domain_id,
    );
    const candidates = (snapshot?.records ?? []).filter(
      (record) => record.record_type === specification.record_type,
    );
    if (candidates.length === 0) {
      fail(
        "LAWOS_REHEARSAL_OWNER_SAMPLE_GAP",
        `owner sample source is empty for ${specification.sample_kind}`,
      );
    }
    for (const { record } of deterministicSamples(
      candidates,
      packetDigest,
      specification.sample_kind,
      specification.maximum_count,
    )) {
      const target = await domainLedger.read({
        tenant_id: prepared.tenant_id,
        domain_id: record.domain_id,
        record_type: record.record_type,
        record_id: record.record_id,
      });
      if (!target
        || target.state_version !== record.state_version
        || target.payload_hash !== record.payload_hash
        || target.unique_key !== record.unique_key
        || target.append_only !== record.append_only) {
        fail(
          "LAWOS_REHEARSAL_OWNER_SAMPLE_VARIANCE",
          `owner sample variance found for ${specification.sample_kind}`,
        );
      }
      samples.push(Object.freeze({
        sample_kind: specification.sample_kind,
        sample_ref: recordSampleRef(
          packetDigest,
          specification.sample_kind,
          record,
        ),
        state_version: record.state_version,
        content_sha256: record.payload_hash,
      }));
    }
  }

  const identityLedger = createIdentityLedger({ pool });
  const accountSamples = deterministicSamples(
    prepared.accounts.map((account) => ({
      domain_id: "identity",
      record_type: "Account",
      record_id: account.user.user_id,
      account,
    })),
    packetDigest,
    "account",
    3,
  );
  for (const { record } of accountSamples) {
    const target = await identityLedger.findDirectoryUserByUserId({
      tenant_id: prepared.tenant_id,
      user_id: record.account.user.user_id,
    });
    const sourceProjection = jsonPostgresDirectoryProjection({
      ...record.account.user,
      tenant_memberships: [record.account.membership],
    });
    const targetProjection = target
      ? jsonPostgresDirectoryProjection(target)
      : null;
    if (!targetProjection
      || hashDomainValue(targetProjection)
        !== hashDomainValue(sourceProjection)) {
      fail(
        "LAWOS_REHEARSAL_OWNER_SAMPLE_VARIANCE",
        "owner account sample variance found",
      );
    }
    samples.push(Object.freeze({
      sample_kind: "account",
      sample_ref: recordSampleRef(packetDigest, "account", record),
      state_version: Number(target.directory_state_version ?? 1),
      content_sha256: hashDomainValue(sourceProjection),
    }));
  }

  const sampleCounts = Object.fromEntries(
    [...SAMPLE_TYPES.map((item) => item.sample_kind), "account"]
      .map((kind) => [
        `${kind}_sample_count`,
        samples.filter((sample) => sample.sample_kind === kind).length,
      ]),
  );
  const material = Object.freeze({
    schema_version: JSON_POSTGRES_REHEARSAL_OWNER_SAMPLING_VERSION,
    outcome: "PASS",
    packet_sha256: packetDigest,
    sample_set_sha256: hashDomainValue(samples),
    samples: Object.freeze(samples),
    safe_counts: Object.freeze({
      ...sampleCounts,
      owner_sample_variance_count: 0,
    }),
    claims: Object.freeze({
      read_only: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  return Object.freeze({
    ...material,
    result_sha256: resultDigest(material),
  });
}
