import { randomBytes, randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  assertOutlookDesktopInstallationBinding,
  createOutlookDesktopInstallation,
  heartbeatOutlookDesktopInstallation,
  projectOutlookDesktopInstallation,
  retireOutlookDesktopInstallation,
} from "./outlook-desktop-installation-model.js";
import {
  classifyOutlookDesktopLifecycleReplay,
  verifyOutlookDesktopLifecycleProof,
} from "./outlook-desktop-installation-proof.js";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const INSTALLATION_ID_PATTERN = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const BODY_FIELDS = Object.freeze({
  register: Object.freeze([
    "app_version",
    "device_public_key",
    "platform",
    "source_sha",
  ]),
  heartbeat: Object.freeze(["expected_state_version"]),
  retire: Object.freeze(["expected_state_version", "retire_reason"]),
});

function serviceError(code, reason, status = 400) {
  return Object.assign(new Error(reason), {
    safe_error_code: code,
    reason,
    status,
  });
}

function invalid(code, reason, status) {
  throw serviceError(code, reason, status);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function identifier(value, field) {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
      `outlook_desktop_installation_${field}_invalid`,
    );
  }
  return value;
}

function installationId(value) {
  if (typeof value !== "string" || !INSTALLATION_ID_PATTERN.test(value)) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
      "outlook_desktop_installation_id_invalid",
    );
  }
  return value;
}

function commandContext(command, tenantId) {
  if (!isPlainObject(command) || !isPlainObject(command.principal)) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
      "outlook_desktop_installation_command_invalid",
    );
  }
  const principal = Object.freeze({
    tenant_id: identifier(command.principal.tenant_id, "tenant_id"),
    user_id: identifier(command.principal.user_id, "user_id"),
    entra_subject_id: identifier(
      command.principal.entra_subject_id,
      "entra_subject_id",
    ),
  });
  if (principal.tenant_id !== tenantId) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
      "outlook_desktop_installation_tenant_mismatch",
      403,
    );
  }
  return Object.freeze({
    principal,
    request_id: identifier(command.request_id, "request_id"),
    request: command.request,
    signature: command.signature,
  });
}

function assertClosedBody(operation, body) {
  const expected = BODY_FIELDS[operation];
  if (
    !isPlainObject(body)
    || JSON.stringify(Object.keys(body).sort()) !== JSON.stringify(expected)
  ) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID",
      `outlook_desktop_installation_${operation}_body_invalid`,
    );
  }
  return body;
}

async function authorizeOperation(authorize, operation, context, targetId) {
  if (typeof authorize !== "function") {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_NOT_AUTHORIZED",
      "outlook_desktop_installation_authority_required",
      403,
    );
  }
  const allowed = await authorize(Object.freeze({
    operation,
    principal: context.principal,
    installation_id: targetId,
  }));
  if (allowed !== true) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_NOT_AUTHORIZED",
      "outlook_desktop_installation_not_authorized",
      403,
    );
  }
}

function iso(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_STATE_INVALID",
      `outlook_desktop_installation_${field}_invalid`,
      500,
    );
  }
  return date.toISOString();
}

function installationFromRow(row) {
  if (!row) return null;
  const stateVersion = Number(row.state_version);
  if (!Number.isSafeInteger(stateVersion) || stateVersion < 1) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_STATE_INVALID",
      "outlook_desktop_installation_state_version_invalid",
      500,
    );
  }
  return Object.freeze({
    tenant_id: row.tenant_id,
    installation_id: row.installation_id,
    user_id: row.user_id,
    entra_subject_id: row.entra_subject_id,
    device_public_key: row.device_public_key,
    device_key_fingerprint: row.device_key_fingerprint,
    platform: row.platform,
    app_version: row.app_version,
    source_sha: row.source_sha,
    registered_at: iso(row.registered_at, "registered_at"),
    last_seen_at: iso(row.last_seen_at, "last_seen_at"),
    lease_expires_at: iso(row.lease_expires_at, "lease_expires_at"),
    retired_at: row.retired_at ? iso(row.retired_at, "retired_at") : null,
    retire_reason: row.retire_reason ?? null,
    state_version: stateVersion,
  });
}

async function databaseNow(client) {
  const row = (await client.query("SELECT clock_timestamp() AS now")).rows[0];
  const now = row?.now instanceof Date ? row.now : new Date(row?.now);
  if (!Number.isFinite(now.getTime())) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_STATE_INVALID",
      "outlook_desktop_installation_database_time_invalid",
      500,
    );
  }
  return now;
}

async function findReceipt(client, context, idempotencyKey) {
  return (await client.query(
    `SELECT operation,request_fingerprint,response_status,response
       FROM lawos_email_dms.outlook_desktop_installation_idempotency
      WHERE tenant_id=$1 AND user_id=$2 AND idempotency_key=$3`,
    [context.principal.tenant_id, context.principal.user_id, idempotencyKey],
  )).rows[0] ?? null;
}

function replayEnvelope(receipt, operation, verified) {
  if (!receipt) return null;
  if (receipt.operation !== operation) {
    invalid(
      "OUTLOOK_DESKTOP_PROOF_IDEMPOTENCY_CONFLICT",
      "outlook_desktop_proof_idempotency_conflict",
      409,
    );
  }
  const replay = classifyOutlookDesktopLifecycleReplay({
    verified_request: verified,
    idempotency_receipt: receipt,
  });
  return Object.freeze({
    response_status: replay.response_status,
    body: Object.freeze(replay.response),
  });
}

async function findNonce(client, tenantId, installationIdValue, nonceHash) {
  return (await client.query(
    `SELECT nonce_hash
       FROM lawos_email_dms.outlook_desktop_installation_nonces
      WHERE tenant_id=$1 AND installation_id=$2 AND nonce_hash=$3`,
    [tenantId, installationIdValue, nonceHash],
  )).rows[0] ?? null;
}

function assertFreshNonce(nonceReceipt, verified) {
  return classifyOutlookDesktopLifecycleReplay({
    verified_request: verified,
    nonce_receipt: nonceReceipt,
  });
}

async function selectInstallationForUpdate(client, tenantId, targetId) {
  return installationFromRow((await client.query(
    `SELECT *
       FROM lawos_email_dms.outlook_desktop_installations
      WHERE tenant_id=$1 AND installation_id=$2
      FOR UPDATE`,
    [tenantId, targetId],
  )).rows[0]);
}

async function selectInstallationByKeyForUpdate(client, tenantId, fingerprint) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`${tenantId}\u001f${fingerprint}`],
  );
  return installationFromRow((await client.query(
    `SELECT *
       FROM lawos_email_dms.outlook_desktop_installations
      WHERE tenant_id=$1 AND device_key_fingerprint=$2
      FOR UPDATE`,
    [tenantId, fingerprint],
  )).rows[0]);
}

async function insertInstallation(client, installation) {
  return installationFromRow((await client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installations
       (tenant_id,installation_id,user_id,entra_subject_id,
        device_public_key,device_key_fingerprint,platform,app_version,
        source_sha,registered_at,last_seen_at,lease_expires_at,
        retired_at,retire_reason,state_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      installation.tenant_id,
      installation.installation_id,
      installation.user_id,
      installation.entra_subject_id,
      installation.device_public_key,
      installation.device_key_fingerprint,
      installation.platform,
      installation.app_version,
      installation.source_sha,
      installation.registered_at,
      installation.last_seen_at,
      installation.lease_expires_at,
      installation.retired_at,
      installation.retire_reason,
      installation.state_version,
    ],
  )).rows[0]);
}

async function updateHeartbeat(client, installation) {
  const row = (await client.query(
    `UPDATE lawos_email_dms.outlook_desktop_installations
        SET app_version=$3,source_sha=$4,last_seen_at=$5,
            lease_expires_at=$6,state_version=$7
      WHERE tenant_id=$1 AND installation_id=$2
        AND state_version=$8 AND retired_at IS NULL
      RETURNING *`,
    [
      installation.tenant_id,
      installation.installation_id,
      installation.app_version,
      installation.source_sha,
      installation.last_seen_at,
      installation.lease_expires_at,
      installation.state_version,
      installation.state_version - 1,
    ],
  )).rows[0];
  if (!row) {
    invalid(
      "OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT",
      "outlook_desktop_state_version_conflict",
      409,
    );
  }
  return installationFromRow(row);
}

async function updateRetirement(client, installation) {
  const row = (await client.query(
    `UPDATE lawos_email_dms.outlook_desktop_installations
        SET retired_at=$3,retire_reason=$4,state_version=$5
      WHERE tenant_id=$1 AND installation_id=$2
        AND state_version=$6 AND retired_at IS NULL
      RETURNING *`,
    [
      installation.tenant_id,
      installation.installation_id,
      installation.retired_at,
      installation.retire_reason,
      installation.state_version,
      installation.state_version - 1,
    ],
  )).rows[0];
  if (!row) {
    invalid(
      "OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT",
      "outlook_desktop_state_version_conflict",
      409,
    );
  }
  return installationFromRow(row);
}

function responseEnvelope(outcome, installation, now, responseStatus = 200) {
  return Object.freeze({
    response_status: responseStatus,
    body: Object.freeze({
      outcome,
      installation: projectOutlookDesktopInstallation(installation, { now }),
    }),
  });
}

async function persistReceipts({
  client,
  context,
  operation,
  verified,
  envelope,
  installation,
  eventType,
  now,
  eventIdFactory,
  faultInjector,
  auditDetails = {},
}) {
  const faultContext = Object.freeze({
    operation,
    request_id: context.request_id,
    installation_id: installation.installation_id,
  });
  await faultInjector?.("after_installation", faultContext);
  await client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installation_nonces
       (tenant_id,installation_id,nonce_hash,request_fingerprint,
        idempotency_key,issued_at,expires_at,consumed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      context.principal.tenant_id,
      installation.installation_id,
      verified.nonce_hash,
      verified.request_fingerprint,
      verified.idempotency_key,
      verified.issued_at,
      verified.expires_at,
      now,
    ],
  );
  await faultInjector?.("after_nonce", faultContext);
  await client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installation_idempotency
       (tenant_id,user_id,installation_id,idempotency_key,operation,
        request_fingerprint,response_status,response,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
    [
      context.principal.tenant_id,
      context.principal.user_id,
      installation.installation_id,
      verified.idempotency_key,
      operation,
      verified.request_fingerprint,
      envelope.response_status,
      JSON.stringify(envelope.body),
      now,
    ],
  );
  await faultInjector?.("after_receipt", faultContext);
  const eventId = identifier(eventIdFactory(), "event_id");
  await client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installation_audit_events
       (tenant_id,event_id,installation_id,user_id,entra_subject_id,
        event_type,request_id,idempotency_key,state_version,details,occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
    [
      context.principal.tenant_id,
      eventId,
      installation.installation_id,
      context.principal.user_id,
      context.principal.entra_subject_id,
      eventType,
      context.request_id,
      verified.idempotency_key,
      installation.state_version,
      JSON.stringify({
        outcome: envelope.body.outcome,
        installation_status: envelope.body.installation.status,
        ...auditDetails,
      }),
      now,
    ],
  );
  await faultInjector?.("after_audit", faultContext);
  return envelope;
}

async function concurrentHeartbeatCanBeOverridden({
  client,
  installation,
  operationStartedAt,
  requestedStateVersion,
  now,
}) {
  if (
    installation.retired_at
    || installation.state_version !== requestedStateVersion + 1
  ) {
    return false;
  }
  const latest = (await client.query(
    `SELECT event_type,state_version,occurred_at
       FROM lawos_email_dms.outlook_desktop_installation_audit_events
      WHERE tenant_id=$1 AND installation_id=$2 AND state_version=$3
      ORDER BY occurred_at DESC,event_id DESC
      LIMIT 1`,
    [
      installation.tenant_id,
      installation.installation_id,
      installation.state_version,
    ],
  )).rows[0];
  if (
    !latest
    || !new Set(["heartbeat", "resumed"]).has(latest.event_type)
    || Number(latest.state_version) !== installation.state_version
  ) {
    return false;
  }
  const occurredAt = new Date(latest.occurred_at).getTime();
  return (
    occurredAt >= operationStartedAt.getTime()
    && occurredAt <= now.getTime()
  );
}

export function createPostgresOutlookDesktopInstallationService({
  pool,
  tenant_id: tenantIdInput,
  installation_id_factory: installationIdFactory = () => (
    `odi_${randomBytes(24).toString("base64url")}`
  ),
  event_id_factory: eventIdFactory = randomUUID,
  fault_injector: faultInjector,
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const tenantId = identifier(tenantIdInput, "tenant_id");
  if (typeof installationIdFactory !== "function") {
    throw new TypeError("installation_id_factory must be a function");
  }
  if (typeof eventIdFactory !== "function") {
    throw new TypeError("event_id_factory must be a function");
  }
  if (faultInjector !== undefined && typeof faultInjector !== "function") {
    throw new TypeError("fault_injector must be a function");
  }
  const tx = (callback, options = {}) => withPostgresTransaction(pool, {
    tenant_id: tenantId,
    isolationLevel: "serializable",
    ...options,
  }, callback);

  async function register(command = {}, { authorize } = {}) {
    const context = commandContext(command, tenantId);
    const body = assertClosedBody("register", context.request?.body);
    await authorizeOperation(authorize, "register", context, "NEW");
    let candidateId;
    return tx(async (client) => {
      const now = await databaseNow(client);
      const verified = verifyOutlookDesktopLifecycleProof({
        request: context.request,
        signature: context.signature,
        public_key: body.device_public_key,
        now,
      });
      const receipt = await findReceipt(
        client,
        context,
        verified.idempotency_key,
      );
      const replay = replayEnvelope(receipt, "register", verified);
      if (replay) return replay;

      const candidateInput = {
        ...context.principal,
        ...body,
        device_key_fingerprint: verified.public_key_fingerprint,
      };
      const candidate = createOutlookDesktopInstallation(candidateInput, {
        now,
        installation_id_factory: () => "odi_candidate_validation_00000001",
      });
      let installation = await selectInstallationByKeyForUpdate(
        client,
        tenantId,
        candidate.device_key_fingerprint,
      );
      let outcome;
      let eventType;
      let responseStatus;
      if (!installation) {
        installation = await insertInstallation(
          client,
          createOutlookDesktopInstallation(candidateInput, {
            now,
            installation_id_factory: () => {
              candidateId ??= installationIdFactory();
              return candidateId;
            },
          }),
        );
        outcome = "registered";
        eventType = "registered";
        responseStatus = 201;
      } else {
        assertOutlookDesktopInstallationBinding(installation, {
          ...context.principal,
          device_key_fingerprint: candidate.device_key_fingerprint,
        });
        if (
          installation.device_public_key !== candidate.device_public_key
          || installation.platform !== candidate.platform
        ) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
            "outlook_desktop_installation_key_or_platform_mismatch",
            403,
          );
        }
        const transition = heartbeatOutlookDesktopInstallation({
          ...installation,
          app_version: candidate.app_version,
          source_sha: candidate.source_sha,
        }, {
          ...context.principal,
          device_key_fingerprint: candidate.device_key_fingerprint,
          expected_state_version: installation.state_version,
        }, { now });
        installation = await updateHeartbeat(
          client,
          transition.installation,
        );
        outcome = transition.transition;
        eventType = transition.transition;
        responseStatus = 200;
      }
      assertFreshNonce(
        await findNonce(
          client,
          tenantId,
          installation.installation_id,
          verified.nonce_hash,
        ),
        verified,
      );
      const envelope = responseEnvelope(
        outcome,
        installation,
        now,
        responseStatus,
      );
      return persistReceipts({
        client,
        context,
        operation: "register",
        verified,
        envelope,
        installation,
        eventType,
        now,
        eventIdFactory,
        faultInjector,
      });
    });
  }

  async function heartbeat(command = {}, { authorize } = {}) {
    const context = commandContext(command, tenantId);
    assertClosedBody("heartbeat", context.request?.body);
    const targetId = installationId(context.request?.installation_id);
    await authorizeOperation(authorize, "heartbeat", context, targetId);
    return tx(async (client) => {
      let installation = await selectInstallationForUpdate(
        client,
        tenantId,
        targetId,
      );
      if (!installation) {
        invalid(
          "OUTLOOK_DESKTOP_INSTALLATION_NOT_FOUND",
          "outlook_desktop_installation_not_found",
          404,
        );
      }
      assertOutlookDesktopInstallationBinding(installation, {
        ...context.principal,
        device_key_fingerprint: installation.device_key_fingerprint,
      });
      const now = await databaseNow(client);
      const verified = verifyOutlookDesktopLifecycleProof({
        request: context.request,
        signature: context.signature,
        public_key: installation.device_public_key,
        now,
      });
      const replay = replayEnvelope(
        await findReceipt(client, context, verified.idempotency_key),
        "heartbeat",
        verified,
      );
      if (replay) return replay;
      assertFreshNonce(
        await findNonce(
          client,
          tenantId,
          targetId,
          verified.nonce_hash,
        ),
        verified,
      );
      const transition = heartbeatOutlookDesktopInstallation(installation, {
        ...context.principal,
        device_key_fingerprint: installation.device_key_fingerprint,
        expected_state_version: context.request.body.expected_state_version,
      }, { now });
      installation = await updateHeartbeat(client, transition.installation);
      const envelope = responseEnvelope(
        transition.transition,
        installation,
        now,
      );
      return persistReceipts({
        client,
        context,
        operation: "heartbeat",
        verified,
        envelope,
        installation,
        eventType: transition.transition,
        now,
        eventIdFactory,
        faultInjector,
      });
    });
  }

  async function retire(command = {}, { authorize } = {}) {
    const context = commandContext(command, tenantId);
    assertClosedBody("retire", context.request?.body);
    const targetId = installationId(context.request?.installation_id);
    await authorizeOperation(authorize, "retire", context, targetId);
    const operationStartedAt = await tx(
      (client) => databaseNow(client),
      { readOnly: true },
    );
    await faultInjector?.("after_operation_start", Object.freeze({
      operation: "retire",
      request_id: context.request_id,
      installation_id: targetId,
    }));
    return tx(async (client) => {
      let installation = await selectInstallationForUpdate(
        client,
        tenantId,
        targetId,
      );
      if (!installation) {
        invalid(
          "OUTLOOK_DESKTOP_INSTALLATION_NOT_FOUND",
          "outlook_desktop_installation_not_found",
          404,
        );
      }
      assertOutlookDesktopInstallationBinding(installation, {
        ...context.principal,
        device_key_fingerprint: installation.device_key_fingerprint,
      });
      const now = await databaseNow(client);
      const verified = verifyOutlookDesktopLifecycleProof({
        request: context.request,
        signature: context.signature,
        public_key: installation.device_public_key,
        now,
      });
      const replay = replayEnvelope(
        await findReceipt(client, context, verified.idempotency_key),
        "retire",
        verified,
      );
      if (replay) return replay;
      assertFreshNonce(
        await findNonce(
          client,
          tenantId,
          targetId,
          verified.nonce_hash,
        ),
        verified,
      );
      const requestedStateVersion = context.request.body.expected_state_version;
      const overrideHeartbeat = await concurrentHeartbeatCanBeOverridden({
        client,
        installation,
        operationStartedAt,
        requestedStateVersion,
        now,
      });
      const transition = retireOutlookDesktopInstallation(installation, {
        ...context.principal,
        device_key_fingerprint: installation.device_key_fingerprint,
        expected_state_version: overrideHeartbeat
          ? installation.state_version
          : requestedStateVersion,
        retire_reason: context.request.body.retire_reason,
      }, { now });
      if (transition.transition === "retired") {
        installation = await updateRetirement(
          client,
          transition.installation,
        );
      }
      const envelope = responseEnvelope(
        transition.transition,
        installation,
        now,
      );
      return persistReceipts({
        client,
        context,
        operation: "retire",
        verified,
        envelope,
        installation,
        eventType: "retired",
        now,
        eventIdFactory,
        faultInjector,
        auditDetails: overrideHeartbeat
          ? {
              concurrent_heartbeat_overridden: true,
              requested_state_version: requestedStateVersion,
            }
          : {},
      });
    });
  }

  async function read({ principal, installation_id: targetIdInput } = {}, {
    authorize,
  } = {}) {
    const context = commandContext({
      principal,
      request_id: "outlook-desktop-read",
      request: null,
      signature: null,
    }, tenantId);
    const targetId = installationId(targetIdInput);
    await authorizeOperation(authorize, "read", context, targetId);
    return tx(async (client) => {
      const installation = installationFromRow((await client.query(
        `SELECT *
           FROM lawos_email_dms.outlook_desktop_installations
          WHERE tenant_id=$1 AND installation_id=$2`,
        [tenantId, targetId],
      )).rows[0]);
      if (!installation) return null;
      assertOutlookDesktopInstallationBinding(installation, {
        ...context.principal,
        device_key_fingerprint: installation.device_key_fingerprint,
      });
      return projectOutlookDesktopInstallation(installation, {
        now: await databaseNow(client),
      });
    }, { readOnly: true });
  }

  async function readCurrent({ principal } = {}, { authorize } = {}) {
    const context = commandContext({
      principal,
      request_id: "outlook-desktop-read-current",
      request: null,
      signature: null,
    }, tenantId);
    await authorizeOperation(authorize, "read", context, "CURRENT");
    return tx(async (client) => {
      const now = await databaseNow(client);
      const installation = installationFromRow((await client.query(
        `SELECT *
           FROM lawos_email_dms.outlook_desktop_installations
          WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3
          ORDER BY
            CASE
              WHEN retired_at IS NULL AND lease_expires_at>$4 THEN 0
              WHEN retired_at IS NULL THEN 1
              ELSE 2
            END,
            last_seen_at DESC,registered_at DESC,installation_id DESC
          LIMIT 1`,
        [
          tenantId,
          context.principal.user_id,
          context.principal.entra_subject_id,
          now,
        ],
      )).rows[0]);
      if (!installation) return null;
      assertOutlookDesktopInstallationBinding(installation, {
        ...context.principal,
        device_key_fingerprint: installation.device_key_fingerprint,
      });
      return projectOutlookDesktopInstallation(installation, { now });
    }, { readOnly: true });
  }

  return Object.freeze({
    authority: "postgres-outlook-desktop-installation",
    durable: true,
    register,
    heartbeat,
    retire,
    read,
    readCurrent,
  });
}
