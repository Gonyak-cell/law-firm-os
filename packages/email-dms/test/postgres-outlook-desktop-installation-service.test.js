import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  signOutlookDesktopLifecycleRequest,
} from "../src/outlook-desktop-installation-proof.js";
import {
  createPostgresOutlookDesktopInstallationService,
} from "../src/postgres-outlook-desktop-installation-service.js";

const TENANT_ID = "tenant-desktop-service-a";
const PRINCIPAL = Object.freeze({
  tenant_id: TENANT_ID,
  user_id: "user-desktop-service-a",
  entra_subject_id: "subject-desktop-service-a",
});

function keyPair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    ...pair,
    publicKeySpki: pair.publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
  };
}

function proofWindow() {
  const issuedAt = new Date(Date.now() - 5_000);
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
  return {
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

function registrationRequest(pair, {
  idempotencyKey = "idem_service_register_0001",
  nonceByte = 1,
  body = {},
} = {}) {
  return {
    method: "POST",
    path: "/api/desktop/installations",
    body: {
      platform: "darwin",
      app_version: "0.1.26",
      source_sha: "2".repeat(40),
      device_public_key: pair.publicKeySpki,
      ...body,
    },
    installation_id: "NEW",
    idempotency_key: idempotencyKey,
    nonce: Buffer.alloc(24, nonceByte).toString("base64url"),
    ...proofWindow(),
  };
}

function heartbeatRequest(installationId, expectedStateVersion, {
  idempotencyKey,
  nonceByte,
} = {}) {
  return {
    method: "POST",
    path: `/api/desktop/installations/${installationId}/heartbeat`,
    body: { expected_state_version: expectedStateVersion },
    installation_id: installationId,
    idempotency_key: idempotencyKey,
    nonce: Buffer.alloc(24, nonceByte).toString("base64url"),
    ...proofWindow(),
  };
}

function retireRequest(installationId, expectedStateVersion, {
  idempotencyKey,
  nonceByte,
} = {}) {
  return {
    method: "POST",
    path: `/api/desktop/installations/${installationId}/retire`,
    body: {
      expected_state_version: expectedStateVersion,
      retire_reason: "device_disconnect",
    },
    installation_id: installationId,
    idempotency_key: idempotencyKey,
    nonce: Buffer.alloc(24, nonceByte).toString("base64url"),
    ...proofWindow(),
  };
}

function command(request, pair, {
  principal = PRINCIPAL,
  requestId = `request-${request.idempotency_key}`,
} = {}) {
  return {
    principal,
    request_id: requestId,
    request,
    signature: signOutlookDesktopLifecycleRequest(request, pair.privateKey),
  };
}

async function prepare(fixture) {
  for (const migration of listEmailDmsPostgresMigrations().slice(0, 5)) {
    await fixture.adminPool.query(migration.sql);
  }
  await fixture.adminPool.query(
    "REVOKE ALL ON lawos_email_dms.m365_connections FROM lawos_app",
  );
}

async function counts(fixture) {
  return withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT_ID, readOnly: true },
    async (client) => {
      const result = {};
      for (const table of [
        "outlook_desktop_installations",
        "outlook_desktop_installation_nonces",
        "outlook_desktop_installation_idempotency",
        "outlook_desktop_installation_audit_events",
      ]) {
        result[table] = Number((await client.query(
          `SELECT count(*) AS count FROM lawos_email_dms.${table}`,
        )).rows[0].count);
      }
      return result;
    },
  );
}

async function persistedInstallation(fixture, installationId) {
  return withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT_ID, readOnly: true },
    async (client) => (await client.query(
      `SELECT installation_id,user_id,entra_subject_id,device_key_fingerprint,
              registered_at,last_seen_at,lease_expires_at,retired_at,
              retire_reason,state_version
         FROM lawos_email_dms.outlook_desktop_installations
        WHERE tenant_id=$1 AND installation_id=$2`,
      [TENANT_ID, installationId],
    )).rows[0] ?? null,
  );
}

test("PostgreSQL desktop lifecycle is atomic, replay-safe, terminal, and independent from user OAuth", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 12 });
  if (!fixture) return;
  await prepare(fixture);
  const installationIds = [
    "odi_service_primary_0000000001",
    "odi_service_race_000000000001",
    "odi_service_unused_0000000001",
  ];
  let eventSequence = 0;
  const retireStarted = Promise.withResolvers();
  const releaseRetire = Promise.withResolvers();
  const service = createPostgresOutlookDesktopInstallationService({
    pool: fixture.appPool,
    tenant_id: TENANT_ID,
    installation_id_factory: () => installationIds.shift(),
    event_id_factory: () => `event-desktop-service-${eventSequence += 1}`,
    async fault_injector(stage, context) {
      if (
        stage === "after_operation_start"
        && context.request_id === "request-idem_service_race_retire_0010"
      ) {
        retireStarted.resolve();
        await releaseRetire.promise;
      }
    },
  });
  const authorize = async () => true;

  const primaryKey = keyPair();
  const registration = registrationRequest(primaryKey);
  const registrationCommand = command(registration, primaryKey);
  const registered = await service.register(registrationCommand, { authorize });
  assert.equal(registered.response_status, 201);
  assert.deepEqual(registered.body, {
    outcome: "registered",
    installation: {
      installation_id: "odi_service_primary_0000000001",
      status: "active",
      state_version: 1,
      lease_expires_at: registered.body.installation.lease_expires_at,
      retired_at: null,
    },
  });
  const persistedRegistered = await persistedInstallation(
    fixture,
    registered.body.installation.installation_id,
  );
  assert.equal(
    registered.body.installation.lease_expires_at,
    new Date(persistedRegistered.lease_expires_at).toISOString(),
  );
  assert.equal(
    Date.parse(persistedRegistered.lease_expires_at)
      - Date.parse(persistedRegistered.last_seen_at),
    7 * 24 * 60 * 60 * 1000,
  );
  assert.deepEqual(await counts(fixture), {
    outlook_desktop_installations: 1,
    outlook_desktop_installation_nonces: 1,
    outlook_desktop_installation_idempotency: 1,
    outlook_desktop_installation_audit_events: 1,
  });
  const currentInstallation = await service.readCurrent({
    principal: PRINCIPAL,
  }, { authorize });
  assert.equal(
    currentInstallation.installation_id,
    registered.body.installation.installation_id,
  );
  assert.equal(currentInstallation.status, "active");

  const replayedRegistration = await service.register(registrationCommand, { authorize });
  assert.deepEqual(replayedRegistration, registered);
  assert.deepEqual(await counts(fixture), {
    outlook_desktop_installations: 1,
    outlook_desktop_installation_nonces: 1,
    outlook_desktop_installation_idempotency: 1,
    outlook_desktop_installation_audit_events: 1,
  });

  const conflictingRegistration = registrationRequest(primaryKey, {
    nonceByte: 2,
    body: { platform: "win32" },
  });
  await assert.rejects(
    service.register(command(conflictingRegistration, primaryKey), { authorize }),
    (error) => error?.safe_error_code
      === "OUTLOOK_DESKTOP_PROOF_IDEMPOTENCY_CONFLICT",
  );

  const primaryId = registered.body.installation.installation_id;
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT_ID },
    (client) => client.query(
      `UPDATE lawos_email_dms.outlook_desktop_installations
          SET registered_at=clock_timestamp()-interval '8 days',
              last_seen_at=clock_timestamp()-interval '7 days',
              lease_expires_at=clock_timestamp()-interval '1 second'
        WHERE tenant_id=$1 AND installation_id=$2`,
      [TENANT_ID, primaryId],
    ),
  );
  const resumeRequest = registrationRequest(primaryKey, {
    idempotencyKey: "idem_service_register_resume_0002",
    nonceByte: 3,
  });
  const resumed = await service.register(command(resumeRequest, primaryKey), { authorize });
  assert.equal(resumed.response_status, 200);
  assert.equal(resumed.body.outcome, "resumed");
  assert.equal(resumed.body.installation.installation_id, primaryId);
  assert.equal(resumed.body.installation.state_version, 2);

  const heartbeat = heartbeatRequest(primaryId, 2, {
    idempotencyKey: "idem_service_heartbeat_0003",
    nonceByte: 4,
  });
  const heartbeatCommand = command(heartbeat, primaryKey);
  const heartbeatResult = await service.heartbeat(heartbeatCommand, { authorize });
  assert.equal(heartbeatResult.body.outcome, "heartbeat");
  assert.equal(heartbeatResult.body.installation.state_version, 3);
  assert.deepEqual(
    await service.heartbeat(heartbeatCommand, { authorize }),
    heartbeatResult,
  );

  const beforeRejectedWrites = await counts(fixture);
  const nonceReplay = heartbeatRequest(primaryId, 3, {
    idempotencyKey: "idem_service_heartbeat_nonce_replay_0004",
    nonceByte: 4,
  });
  await assert.rejects(
    service.heartbeat(command(nonceReplay, primaryKey), { authorize }),
    (error) => error?.safe_error_code === "OUTLOOK_DESKTOP_PROOF_NONCE_REPLAY",
  );
  const stale = heartbeatRequest(primaryId, 1, {
    idempotencyKey: "idem_service_heartbeat_stale_0005",
    nonceByte: 5,
  });
  await assert.rejects(
    service.heartbeat(command(stale, primaryKey), { authorize }),
    (error) => error?.safe_error_code
      === "OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT",
  );
  const staleRetire = retireRequest(primaryId, 2, {
    idempotencyKey: "idem_service_retire_stale_0006",
    nonceByte: 14,
  });
  await assert.rejects(
    service.retire(command(staleRetire, primaryKey), { authorize }),
    (error) => error?.safe_error_code
      === "OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT",
  );
  const mismatchedPrincipal = Object.freeze({
    ...PRINCIPAL,
    user_id: "user-desktop-service-other",
  });
  const mismatch = heartbeatRequest(primaryId, 3, {
    idempotencyKey: "idem_service_heartbeat_mismatch_0006",
    nonceByte: 6,
  });
  await assert.rejects(
    service.heartbeat(command(mismatch, primaryKey, {
      principal: mismatchedPrincipal,
    }), { authorize }),
    (error) => error?.safe_error_code
      === "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH",
  );
  const disabled = heartbeatRequest(primaryId, 3, {
    idempotencyKey: "idem_service_heartbeat_disabled_0007",
    nonceByte: 7,
  });
  await assert.rejects(
    service.heartbeat(command(disabled, primaryKey), {
      authorize: async () => false,
    }),
    (error) => error?.safe_error_code
      === "OUTLOOK_DESKTOP_INSTALLATION_NOT_AUTHORIZED",
  );
  assert.deepEqual(await counts(fixture), beforeRejectedWrites);

  const raceKey = keyPair();
  const raceRegistration = registrationRequest(raceKey, {
    idempotencyKey: "idem_service_race_register_0008",
    nonceByte: 8,
  });
  const raceRegistered = await service.register(
    command(raceRegistration, raceKey),
    { authorize },
  );
  const raceId = raceRegistered.body.installation.installation_id;
  const raceHeartbeat = heartbeatRequest(raceId, 1, {
    idempotencyKey: "idem_service_race_heartbeat_0009",
    nonceByte: 9,
  });
  const raceRetire = retireRequest(raceId, 1, {
    idempotencyKey: "idem_service_race_retire_0010",
    nonceByte: 10,
  });
  const retireRace = service.retire(
    command(raceRetire, raceKey),
    { authorize },
  );
  await retireStarted.promise;
  let heartbeatRace;
  try {
    heartbeatRace = await service.heartbeat(
      command(raceHeartbeat, raceKey),
      { authorize },
    );
  } finally {
    releaseRetire.resolve();
  }
  const retireRaceResult = await retireRace;
  assert.equal(heartbeatRace.body.outcome, "heartbeat");
  assert.equal(retireRaceResult.body.outcome, "retired");
  const retiredProjection = await service.read({
    principal: PRINCIPAL,
    installation_id: raceId,
  }, { authorize });
  assert.equal(retiredProjection.status, "retired");
  assert.equal(retiredProjection.state_version, 3);

  const terminalHeartbeat = heartbeatRequest(
    raceId,
    retiredProjection.state_version,
    {
      idempotencyKey: "idem_service_terminal_heartbeat_0011",
      nonceByte: 11,
    },
  );
  await assert.rejects(
    service.heartbeat(command(terminalHeartbeat, raceKey), { authorize }),
    (error) => error?.safe_error_code
      === "OUTLOOK_DESKTOP_INSTALLATION_RETIRED",
  );
  const repeatedRetire = retireRequest(
    raceId,
    retiredProjection.state_version,
    {
      idempotencyKey: "idem_service_repeated_retire_0012",
      nonceByte: 12,
    },
  );
  const repeated = await service.retire(command(repeatedRetire, raceKey), {
    authorize,
  });
  assert.equal(repeated.body.outcome, "already_retired");
  assert.equal(
    repeated.body.installation.state_version,
    retiredProjection.state_version,
  );

  const beforeRollback = await counts(fixture);
  const faultKey = keyPair();
  const faultService = createPostgresOutlookDesktopInstallationService({
    pool: fixture.appPool,
    tenant_id: TENANT_ID,
    installation_id_factory: () => "odi_service_fault_00000000001",
    event_id_factory: () => "event-desktop-service-fault",
    fault_injector(stage, context) {
      if (context.request_id === "request-service-fault" && stage === "after_audit") {
        throw new Error("synthetic lifecycle commit failure");
      }
    },
  });
  const faultRegistration = registrationRequest(faultKey, {
    idempotencyKey: "idem_service_fault_register_0013",
    nonceByte: 13,
  });
  await assert.rejects(
    faultService.register(command(faultRegistration, faultKey, {
      requestId: "request-service-fault",
    }), { authorize }),
    /synthetic lifecycle commit failure/u,
  );
  assert.deepEqual(await counts(fixture), beforeRollback);
  assert.equal(
    await persistedInstallation(fixture, "odi_service_fault_00000000001"),
    null,
  );
  assert.equal(
    Number((await fixture.adminPool.query(
      "SELECT count(*) AS count FROM lawos_email_dms.m365_connections",
    )).rows[0].count),
    0,
  );
});

test("PostgreSQL lifecycle permits more than ten installations for one principal", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 12 });
  if (!fixture) return;
  await prepare(fixture);

  let installationSequence = 0;
  let eventSequence = 0;
  const service = createPostgresOutlookDesktopInstallationService({
    pool: fixture.appPool,
    tenant_id: TENANT_ID,
    installation_id_factory: () => (
      `odi_service_many_${String(installationSequence += 1).padStart(12, "0")}`
    ),
    event_id_factory: () => `event-desktop-service-many-${eventSequence += 1}`,
  });
  const authorize = async () => true;

  const registered = [];
  for (let index = 1; index <= 11; index += 1) {
    const pair = keyPair();
    const request = registrationRequest(pair, {
      idempotencyKey: `idem_service_many_${String(index).padStart(4, "0")}`,
      nonceByte: 20 + index,
    });
    const response = await service.register(command(request, pair), { authorize });
    assert.equal(response.response_status, 201);
    assert.equal(response.body.outcome, "registered");
    registered.push(response.body.installation.installation_id);
  }

  assert.equal(new Set(registered).size, 11);
  assert.deepEqual(await counts(fixture), {
    outlook_desktop_installations: 11,
    outlook_desktop_installation_nonces: 11,
    outlook_desktop_installation_idempotency: 11,
    outlook_desktop_installation_audit_events: 11,
  });
});

test("approved internal current read requires the exact signed Windows canary lifecycle", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 4 });
  if (!fixture) return;
  await prepare(fixture);
  const sourceSha = "4".repeat(40);
  const options = {
    pool: fixture.appPool,
    tenant_id: TENANT_ID,
    internal_canary_package_identity: {
      app_version: "0.1.29",
      platform: "win32",
      source_sha: sourceSha,
    },
  };
  const service = createPostgresOutlookDesktopInstallationService({
    ...options,
    installation_id_factory: () => "odi_service_internal_000000001",
    event_id_factory: () => "event-service-internal-0001",
  });
  const authorize = async () => true;
  const pair = keyPair();
  const request = registrationRequest(pair, {
    idempotencyKey: "idem_service_internal_0001",
    nonceByte: 91,
    body: {
      platform: "win32",
      app_version: "0.1.29",
      source_sha: sourceSha,
    },
  });
  const registered = await service.register(command(request, pair), {
    authorize,
  });
  const approved = await service.readApprovedInternalCurrent({
    principal: PRINCIPAL,
  }, { authorize });
  assert.deepEqual(approved, {
    ...registered.body.installation,
    release_trusted: true,
    authority_snapshot_at: approved.authority_snapshot_at,
  });
  assert.equal(
    new Date(approved.authority_snapshot_at).toISOString(),
    approved.authority_snapshot_at,
  );
  assert.ok(
    Date.parse(approved.lease_expires_at)
      > Date.parse(approved.authority_snapshot_at),
  );

  const wrongSource = createPostgresOutlookDesktopInstallationService({
    ...options,
    internal_canary_package_identity: {
      ...options.internal_canary_package_identity,
      source_sha: "5".repeat(40),
    },
  });
  assert.equal(await wrongSource.readApprovedInternalCurrent({
    principal: PRINCIPAL,
  }, { authorize }), null);
  await assert.rejects(
    service.readApprovedInternalCurrent({ principal: PRINCIPAL }),
    (error) => error.safe_error_code
      === "OUTLOOK_DESKTOP_INSTALLATION_NOT_AUTHORIZED",
  );
});
