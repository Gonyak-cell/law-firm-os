import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createOutlookInstallationIdentityStore,
  createOutlookInstallationLifecycleCoordinator,
  readOutlookDesktopBuildIdentity,
} from "../src/main/outlook-installation.js";

const PRINCIPAL_A = Object.freeze({
  state: "signed_in",
  outlook_desktop_principal_ref:
    "odpr_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
});
const PRINCIPAL_B = Object.freeze({
  state: "signed_in",
  outlook_desktop_principal_ref:
    "odpr_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
});
const BUILD = Object.freeze({
  platform: "darwin",
  app_version: "0.1.26",
  source_sha: "2".repeat(40),
});
const NOW_MS = Date.parse("2026-08-11T04:00:00.000Z");

function filePath(label) {
  return join(
    mkdtempSync(join(tmpdir(), `lawos-outlook-coordinator-${label}-`)),
    "outlook-installation-identity.json",
  );
}

function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`safe-storage:${value}`, "utf8"),
    decryptString: (value) => String(value).replace(/^safe-storage:/u, ""),
  };
}

function timers() {
  const scheduled = [];
  const cleared = [];
  return {
    scheduled,
    cleared,
    setTimeoutImpl(callback, delay) {
      const timer = {
        callback,
        delay,
        unref_called: false,
        unref() {
          this.unref_called = true;
        },
      };
      scheduled.push(timer);
      return timer;
    },
    clearTimeoutImpl(timer) {
      cleared.push(timer);
      const index = scheduled.indexOf(timer);
      if (index >= 0) scheduled.splice(index, 1);
    },
  };
}

function installation(number, stateVersion = 1, status = "active") {
  return {
    installation_id: `odi_coordinator_${String(number).padStart(20, "0")}`,
    status,
    state_version: stateVersion,
    lease_expires_at: "2026-08-18T04:00:00.000Z",
    retired_at: status === "retired"
      ? "2026-08-11T04:00:00.000Z"
      : null,
  };
}

function readiness({ nextAction = "none", browserRequired = false } = {}) {
  return {
    http_status: 200,
    body: {
      request_id: "request-readiness",
      outcome: "passed",
      item: {
        next_action: nextAction,
        browser_required: browserRequired,
        safe_error_codes: browserRequired ? ["M365_INTERACTION_REQUIRED"] : [],
        installation: { state: "active", state_version: 1 },
        delegated_connection: {
          state: browserRequired ? "not_connected" : "connected",
          state_version: browserRequired ? null : 3,
        },
      },
      token_material_returned: false,
    },
    token_material_returned: false,
  };
}

function lifecycleResponse(item, outcome = "registered") {
  return {
    http_status: outcome === "registered" ? 201 : 200,
    body: {
      outcome,
      installation: item,
      safe_error_codes: [],
      token_material_returned: false,
    },
    token_material_returned: false,
  };
}

function installationReadResponse(item) {
  return {
    http_status: 200,
    body: {
      outcome: "read",
      installation: item,
      safe_error_codes: [],
      token_material_returned: false,
    },
    token_material_returned: false,
  };
}

function lifecycleFailure(code, httpStatus) {
  return {
    http_status: httpStatus,
    body: {
      outcome: "blocked",
      safe_error_codes: [code],
      token_material_returned: false,
    },
    token_material_returned: false,
  };
}

function createStore(target) {
  return createOutlookInstallationIdentityStore({
    filePath: target,
    safeStorage: fakeSafeStorage(),
    platform: "darwin",
  });
}

function coordinator({ target, requestApi, timer = timers(), overrides = {} }) {
  const value = createOutlookInstallationLifecycleCoordinator({
    identityStore: createStore(target),
    requestApi,
    buildIdentity: BUILD,
    now: () => NOW_MS,
    randomBytesFn: (size) => Buffer.alloc(size, 9),
    setTimeoutImpl: timer.setTimeoutImpl,
    clearTimeoutImpl: timer.clearTimeoutImpl,
    retryDelaysMs: [1_000, 5_000],
    heartbeatIntervalMs: 86_400_000,
    ...overrides,
  });
  return { value, timer };
}

test("first verified login registers then reads readiness and restart heartbeats the same installation", async () => {
  const target = filePath("first-restart");
  const firstCalls = [];
  const first = coordinator({
    target,
    requestApi: async (input) => {
      firstCalls.push(input);
      return input.method === "POST"
        ? lifecycleResponse(installation(1))
        : readiness();
    },
  });
  assert.deepEqual(await first.value.sessionAvailable(PRINCIPAL_A), {
    state: "ready",
    next_action: "none",
    browser_required: false,
    safe_error_codes: [],
    retry_scheduled: false,
    token_material_returned: false,
    private_key_material_returned: false,
    production_ready_claim: false,
  });
  assert.deepEqual(firstCalls.map(({ method, path }) => ({ method, path })), [
    { method: "POST", path: "/api/desktop/installations" },
    {
      method: "GET",
      path: "/api/outlook/readiness?installation_id=odi_coordinator_00000000000000000001",
    },
  ]);
  assert.equal(first.timer.scheduled.length, 1);
  assert.equal(first.timer.scheduled[0].delay, 86_400_000);
  assert.equal(first.timer.scheduled[0].unref_called, true);
  first.value.stop({ reason: "quit" });

  const restartCalls = [];
  const restarted = coordinator({
    target,
    requestApi: async (input) => {
      restartCalls.push(input);
      return input.method === "POST"
        ? lifecycleResponse(installation(1, 2), "heartbeat")
        : readiness();
    },
  });
  await restarted.value.sessionAvailable(PRINCIPAL_A);
  assert.deepEqual(restartCalls.map(({ method, path }) => ({ method, path })), [
    {
      method: "POST",
      path: "/api/desktop/installations/odi_coordinator_00000000000000000001/heartbeat",
    },
    {
      method: "GET",
      path: "/api/outlook/readiness?installation_id=odi_coordinator_00000000000000000001",
    },
  ]);
  const heartbeatTimer = restarted.timer.scheduled.shift();
  await heartbeatTimer.callback();
  assert.equal(restartCalls.filter(({ method }) => method === "POST").length, 2);
  assert.equal(restarted.timer.scheduled.length, 1);
  restarted.value.stop({ reason: "logout" });
  assert.equal(restarted.timer.scheduled.length, 0);
  assert.equal(restartCalls.some(({ path }) => path.endsWith("/retire")), false);
});

test("account switching uses separate keys and never retires the previous principal", async () => {
  const target = filePath("account-switch");
  const registrations = [];
  let registrationCount = 0;
  const { value } = coordinator({
    target,
    requestApi: async (input) => {
      if (input.method === "GET") return readiness();
      const body = JSON.parse(input.body);
      registrations.push({ path: input.path, publicKey: body.device_public_key });
      registrationCount += 1;
      return lifecycleResponse(installation(registrationCount));
    },
  });
  await value.sessionAvailable(PRINCIPAL_A);
  await value.sessionAvailable(PRINCIPAL_B);
  assert.equal(registrations.length, 2);
  assert.notEqual(registrations[0].publicKey, registrations[1].publicKey);
  assert.equal(registrations.some(({ path }) => path.endsWith("/retire")), false);
});

test("expired installation resumes with the same identity while confirmed retired state rekeys once", async () => {
  const target = filePath("resume-rekey");
  const publicKeys = [];
  let phase = "register";
  const { value } = coordinator({
    target,
    requestApi: async (input) => {
      if (
        input.method === "GET"
        && input.path.startsWith("/api/desktop/installations/")
      ) {
        return installationReadResponse(installation(1, 2, "retired"));
      }
      if (input.method === "GET") return readiness();
      const body = JSON.parse(input.body);
      if (input.path === "/api/desktop/installations") {
        publicKeys.push(body.device_public_key);
        phase = phase === "register" ? "resume" : "rekeyed";
        return lifecycleResponse(
          installation(phase === "resume" ? 1 : 2),
        );
      }
      if (phase === "resume") {
        phase = "retired";
        return lifecycleResponse(installation(1, 2), "resumed");
      }
      return {
        http_status: 409,
        body: {
          outcome: "blocked",
          safe_error_codes: ["OUTLOOK_DESKTOP_INSTALLATION_RETIRED"],
          token_material_returned: false,
        },
      };
    },
  });
  await value.sessionAvailable(PRINCIPAL_A);
  await value.refresh();
  assert.equal(value.status().state, "ready");
  await value.refresh();
  assert.equal(value.status().state, "ready");
  assert.equal(publicKeys.length, 2);
  assert.notEqual(publicKeys[0], publicKeys[1]);
});

test("Microsoft handoff requires both authoritative interaction-required and explicit confirmation", async () => {
  const target = filePath("interaction");
  let handoffs = 0;
  let requireInteraction = true;
  const { value } = coordinator({
    target,
    requestApi: async (input) => input.method === "POST"
      ? lifecycleResponse(installation(1))
      : readiness(requireInteraction
        ? { nextAction: "confirm_microsoft", browserRequired: true }
        : {}),
    overrides: {
      onInteractionRequired: async () => {
        handoffs += 1;
        return { handoff_accepted: true };
      },
    },
  });
  await value.sessionAvailable(PRINCIPAL_A);
  assert.equal(value.status().state, "interaction_required");
  assert.deepEqual(await value.confirmMicrosoft(), {
    handoff_accepted: false,
    reason: "explicit_confirmation_required",
    token_material_returned: false,
  });
  assert.equal(handoffs, 0);
  assert.deepEqual(await value.confirmMicrosoft({ confirmed: true }), {
    handoff_accepted: true,
    token_material_returned: false,
  });
  assert.equal(handoffs, 1);

  requireInteraction = false;
  await value.refresh();
  assert.deepEqual(await value.confirmMicrosoft({ confirmed: true }), {
    handoff_accepted: false,
    reason: "microsoft_interaction_not_required",
    token_material_returned: false,
  });
  assert.equal(handoffs, 1);
});

test("explicit device disconnect retires only that installation and then erases its local identity", async () => {
  const target = filePath("disconnect-success");
  const calls = [];
  const registrationKeys = [];
  let registrationCount = 0;
  const { value, timer } = coordinator({
    target,
    requestApi: async (input) => {
      calls.push(input);
      if (input.method === "GET") return readiness();
      const body = JSON.parse(input.body);
      if (input.path === "/api/desktop/installations") {
        registrationCount += 1;
        registrationKeys.push(body.device_public_key);
        return lifecycleResponse(installation(registrationCount));
      }
      if (input.path.endsWith("/retire")) {
        assert.equal(body.retire_reason, "device_disconnect");
        assert.equal(body.expected_state_version, 1);
        return lifecycleResponse(
          installation(1, 2, "retired"),
          "retired",
        );
      }
      return lifecycleResponse(installation(1, 2), "heartbeat");
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  assert.equal(timer.scheduled.length, 1);
  assert.deepEqual(await value.disconnectDevice(), {
    retired: true,
    reason: "device_disconnect",
    token_material_returned: false,
  });
  assert.equal(timer.scheduled.length, 0);
  assert.equal(calls.filter(({ path }) => path.endsWith("/retire")).length, 1);
  assert.equal(calls.some(({ path }) => path.startsWith("/api/outlook/connection")), false);

  await value.sessionAvailable(PRINCIPAL_A);
  assert.equal(registrationCount, 2);
  assert.notEqual(registrationKeys[0], registrationKeys[1]);
});

test("committed heartbeat with a lost response retries the exact signed request", async () => {
  const target = filePath("heartbeat-lost-response");
  const heartbeatBodies = [];
  let heartbeatAttempts = 0;
  const { value, timer } = coordinator({
    target,
    requestApi: async (input) => {
      if (input.method === "GET") return readiness();
      if (input.path === "/api/desktop/installations") {
        return lifecycleResponse(installation(1));
      }
      heartbeatAttempts += 1;
      heartbeatBodies.push(input.body);
      if (heartbeatAttempts === 1) {
        throw new Error("response_lost_after_commit");
      }
      return lifecycleResponse(installation(1, 2), "heartbeat");
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  await timer.scheduled.shift().callback();
  assert.equal(value.status().retry_scheduled, true);
  assert.equal(timer.scheduled.length, 1);
  await timer.scheduled.shift().callback();

  assert.equal(heartbeatAttempts, 2);
  assert.equal(heartbeatBodies[1], heartbeatBodies[0]);
  assert.equal(value.status().state, "ready");
  assert.equal(value.status().retry_scheduled, false);
});

test("committed retire with a lost response retries the exact signed request", async () => {
  const target = filePath("retire-lost-response");
  const retireBodies = [];
  let registrations = 0;
  let retireAttempts = 0;
  const { value, timer } = coordinator({
    target,
    requestApi: async (input) => {
      if (input.method === "GET") return readiness();
      if (input.path === "/api/desktop/installations") {
        registrations += 1;
        return lifecycleResponse(installation(registrations));
      }
      if (input.path.endsWith("/retire")) {
        retireAttempts += 1;
        retireBodies.push(input.body);
        if (retireAttempts === 1) {
          throw new Error("response_lost_after_commit");
        }
        return lifecycleResponse(
          installation(1, 2, "retired"),
          "retired",
        );
      }
      throw new Error("heartbeat_must_not_replace_pending_retire");
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  assert.deepEqual(await value.disconnectDevice(), {
    retired: false,
    reason: "device_disconnect_failed",
    token_material_returned: false,
  });
  assert.equal(timer.scheduled.length, 1);
  const retryResult = await timer.scheduled.shift().callback();

  assert.deepEqual(retryResult, {
    retired: true,
    reason: "device_disconnect",
    token_material_returned: false,
  });
  assert.equal(retireAttempts, 2, JSON.stringify(retryResult));
  assert.equal(retireBodies[1], retireBodies[0]);
  assert.equal(value.status().state, "idle");
  await value.sessionAvailable(PRINCIPAL_A);
  assert.equal(registrations, 2);
});

test("committed heartbeat with a lost response reconciles after coordinator recreation", async () => {
  const target = filePath("heartbeat-restart-reconcile");
  let serverInstallation = installation(1);
  const heartbeatBodies = [];
  const first = coordinator({
    target,
    requestApi: async (input) => {
      if (input.method === "GET") return readiness();
      if (input.path === "/api/desktop/installations") {
        return lifecycleResponse(serverInstallation);
      }
      heartbeatBodies.push(input.body);
      serverInstallation = installation(1, 2);
      throw new Error("response_lost_after_heartbeat_commit");
    },
  });
  await first.value.sessionAvailable(PRINCIPAL_A);
  await first.timer.scheduled.shift().callback();
  assert.equal(first.value.status().retry_scheduled, true);
  first.value.stop({ reason: "process_exit" });

  const restartCalls = [];
  const restarted = coordinator({
    target,
    requestApi: async (input) => {
      restartCalls.push(input);
      if (
        input.method === "GET"
        && input.path.startsWith("/api/desktop/installations/")
      ) {
        return installationReadResponse(serverInstallation);
      }
      if (input.method === "GET") return readiness();
      const body = JSON.parse(input.body);
      heartbeatBodies.push(input.body);
      if (body.expected_state_version !== serverInstallation.state_version) {
        return lifecycleFailure("OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT", 409);
      }
      serverInstallation = installation(
        1,
        serverInstallation.state_version + 1,
      );
      return lifecycleResponse(serverInstallation, "heartbeat");
    },
  });

  await restarted.value.sessionAvailable(PRINCIPAL_A);
  assert.equal(restarted.value.status().state, "ready");
  assert.deepEqual(
    restartCalls.map(({ method, path }) => ({ method, path })),
    [
      {
        method: "POST",
        path: "/api/desktop/installations/odi_coordinator_00000000000000000001/heartbeat",
      },
      {
        method: "GET",
        path: "/api/desktop/installations/odi_coordinator_00000000000000000001",
      },
      {
        method: "POST",
        path: "/api/desktop/installations/odi_coordinator_00000000000000000001/heartbeat",
      },
      {
        method: "GET",
        path: "/api/outlook/readiness?installation_id=odi_coordinator_00000000000000000001",
      },
    ],
  );
  assert.deepEqual(
    heartbeatBodies.map((body) => JSON.parse(body).expected_state_version),
    [1, 1, 2],
  );
  assert.notEqual(heartbeatBodies[2], heartbeatBodies[1]);
  assert.equal(serverInstallation.state_version, 3);
});

test("committed retire with a lost response restores terminal state after coordinator recreation", async () => {
  const target = filePath("retire-restart-reconcile");
  let serverInstallation = installation(1);
  let registrations = 0;
  const registrationKeys = [];
  const first = coordinator({
    target,
    requestApi: async (input) => {
      if (input.method === "GET") return readiness();
      const body = JSON.parse(input.body);
      if (input.path === "/api/desktop/installations") {
        registrations += 1;
        registrationKeys.push(body.device_public_key);
        return lifecycleResponse(serverInstallation);
      }
      serverInstallation = installation(1, 2, "retired");
      throw new Error("response_lost_after_retire_commit");
    },
  });
  await first.value.sessionAvailable(PRINCIPAL_A);
  assert.equal((await first.value.disconnectDevice()).retired, false);
  first.value.stop({ reason: "process_exit" });

  const restartCalls = [];
  const restarted = coordinator({
    target,
    requestApi: async (input) => {
      restartCalls.push(input);
      if (
        input.method === "GET"
        && input.path.startsWith("/api/desktop/installations/")
      ) {
        return installationReadResponse(serverInstallation);
      }
      if (input.method === "GET") return readiness();
      const body = JSON.parse(input.body);
      if (input.path === "/api/desktop/installations") {
        registrations += 1;
        registrationKeys.push(body.device_public_key);
        serverInstallation = installation(2);
        return lifecycleResponse(serverInstallation);
      }
      assert.equal(body.expected_state_version, 1);
      return lifecycleFailure("OUTLOOK_DESKTOP_INSTALLATION_RETIRED", 409);
    },
  });

  await restarted.value.sessionAvailable(PRINCIPAL_A);
  assert.equal(restarted.value.status().state, "ready");
  assert.deepEqual(
    restartCalls.map(({ method, path }) => ({ method, path })),
    [
      {
        method: "POST",
        path: "/api/desktop/installations/odi_coordinator_00000000000000000001/heartbeat",
      },
      {
        method: "GET",
        path: "/api/desktop/installations/odi_coordinator_00000000000000000001",
      },
      { method: "POST", path: "/api/desktop/installations" },
      {
        method: "GET",
        path: "/api/outlook/readiness?installation_id=odi_coordinator_00000000000000000002",
      },
    ],
  );
  assert.equal(registrations, 2);
  assert.notEqual(registrationKeys[0], registrationKeys[1]);
  assert.equal(
    restartCalls.some(({ path }) => path.startsWith("/api/outlook/connection")),
    false,
  );
});

test("account switch away and back reconciles a lost committed heartbeat without stale CAS", async () => {
  const target = filePath("account-switch-reconcile");
  const serverInstallations = new Map();
  const heartbeatVersions = [];
  let registrations = 0;
  let loseFirstAHeartbeat = true;
  const { value, timer } = coordinator({
    target,
    requestApi: async (input) => {
      if (
        input.method === "GET"
        && input.path.startsWith("/api/desktop/installations/")
      ) {
        const installationId = input.path.split("/").at(-1);
        return installationReadResponse(serverInstallations.get(installationId));
      }
      if (input.method === "GET") return readiness();
      const body = JSON.parse(input.body);
      if (input.path === "/api/desktop/installations") {
        registrations += 1;
        const created = installation(registrations);
        serverInstallations.set(created.installation_id, created);
        return lifecycleResponse(created);
      }
      const installationId = input.path.split("/").at(-2);
      const current = serverInstallations.get(installationId);
      heartbeatVersions.push({
        installation_id: installationId,
        expected: body.expected_state_version,
      });
      if (body.expected_state_version !== current.state_version) {
        return lifecycleFailure("OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT", 409);
      }
      const updated = {
        ...current,
        state_version: current.state_version + 1,
      };
      serverInstallations.set(installationId, updated);
      if (installationId === installation(1).installation_id && loseFirstAHeartbeat) {
        loseFirstAHeartbeat = false;
        throw new Error("response_lost_after_account_a_heartbeat_commit");
      }
      return lifecycleResponse(updated, "heartbeat");
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  await timer.scheduled.shift().callback();
  assert.equal(value.status().retry_scheduled, true);
  await value.sessionAvailable(PRINCIPAL_B);
  await value.sessionAvailable(PRINCIPAL_A);

  const installationA = installation(1).installation_id;
  assert.equal(value.status().state, "ready");
  assert.deepEqual(
    heartbeatVersions
      .filter(({ installation_id: installationId }) => installationId === installationA)
      .map(({ expected }) => expected),
    [1, 1, 2],
  );
  assert.equal(serverInstallations.get(installationA).state_version, 3);
  assert.equal(
    heartbeatVersions.some(({ installation_id: installationId }) => (
      installationId === installation(2).installation_id
    )),
    false,
  );
});

test("expired exact heartbeat replay reconciles the committed version then signs a fresh proof", async () => {
  const target = filePath("heartbeat-proof-expiry");
  let nowMs = NOW_MS;
  let serverInstallation = installation(1);
  const heartbeatBodies = [];
  const { value, timer } = coordinator({
    target,
    overrides: { now: () => nowMs },
    requestApi: async (input) => {
      if (
        input.method === "GET"
        && input.path.startsWith("/api/desktop/installations/")
      ) {
        return installationReadResponse(serverInstallation);
      }
      if (input.method === "GET") return readiness();
      if (input.path === "/api/desktop/installations") {
        return lifecycleResponse(serverInstallation);
      }
      const body = JSON.parse(input.body);
      heartbeatBodies.push(input.body);
      if (heartbeatBodies.length === 1) {
        serverInstallation = installation(1, 2);
        throw new Error("response_lost_after_heartbeat_commit");
      }
      if (Date.parse(body.expires_at) <= nowMs) {
        return lifecycleFailure("OUTLOOK_DESKTOP_PROOF_FRESHNESS_INVALID", 401);
      }
      assert.equal(body.expected_state_version, serverInstallation.state_version);
      serverInstallation = installation(
        1,
        serverInstallation.state_version + 1,
      );
      return lifecycleResponse(serverInstallation, "heartbeat");
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  await timer.scheduled.shift().callback();
  nowMs += 6 * 60 * 1000;
  await timer.scheduled.shift().callback();

  assert.equal(value.status().state, "ready");
  assert.equal(heartbeatBodies.length, 3);
  assert.equal(heartbeatBodies[1], heartbeatBodies[0]);
  assert.notEqual(heartbeatBodies[2], heartbeatBodies[1]);
  assert.deepEqual(
    heartbeatBodies.map((body) => JSON.parse(body).expected_state_version),
    [1, 1, 2],
  );
  assert.equal(serverInstallation.state_version, 3);
});

test("expired exact committed-retire replay restores terminal state without another mutation", async () => {
  const target = filePath("retire-proof-expiry-terminal");
  let nowMs = NOW_MS;
  let serverInstallation = installation(1);
  const retireBodies = [];
  const { value, timer } = coordinator({
    target,
    overrides: { now: () => nowMs },
    requestApi: async (input) => {
      if (
        input.method === "GET"
        && input.path.startsWith("/api/desktop/installations/")
      ) {
        return installationReadResponse(serverInstallation);
      }
      if (input.method === "GET") return readiness();
      if (input.path === "/api/desktop/installations") {
        return lifecycleResponse(serverInstallation);
      }
      const body = JSON.parse(input.body);
      retireBodies.push(input.body);
      if (retireBodies.length === 1) {
        serverInstallation = installation(1, 2, "retired");
        throw new Error("response_lost_after_retire_commit");
      }
      assert.ok(Date.parse(body.expires_at) <= nowMs);
      return lifecycleFailure("OUTLOOK_DESKTOP_PROOF_FRESHNESS_INVALID", 401);
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  assert.equal((await value.disconnectDevice()).retired, false);
  nowMs += 6 * 60 * 1000;
  const result = await timer.scheduled.shift().callback();

  assert.deepEqual(result, {
    retired: true,
    reason: "device_disconnect",
    token_material_returned: false,
  });
  assert.equal(retireBodies.length, 2);
  assert.equal(retireBodies[1], retireBodies[0]);
  assert.equal(value.status().state, "idle");
});

test("expired uncommitted retire proof reconciles active state then signs a fresh proof", async () => {
  const target = filePath("retire-proof-expiry-fresh");
  let nowMs = NOW_MS;
  let serverInstallation = installation(1);
  const retireBodies = [];
  const { value, timer } = coordinator({
    target,
    overrides: { now: () => nowMs },
    requestApi: async (input) => {
      if (
        input.method === "GET"
        && input.path.startsWith("/api/desktop/installations/")
      ) {
        return installationReadResponse(serverInstallation);
      }
      if (input.method === "GET") return readiness();
      if (input.path === "/api/desktop/installations") {
        return lifecycleResponse(serverInstallation);
      }
      const body = JSON.parse(input.body);
      retireBodies.push(input.body);
      if (retireBodies.length === 1) {
        throw new Error("ambiguous_retire_transport_failure_before_commit");
      }
      if (Date.parse(body.expires_at) <= nowMs) {
        return lifecycleFailure("OUTLOOK_DESKTOP_PROOF_FRESHNESS_INVALID", 401);
      }
      assert.equal(body.expected_state_version, serverInstallation.state_version);
      serverInstallation = installation(1, 2, "retired");
      return lifecycleResponse(serverInstallation, "retired");
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  assert.equal((await value.disconnectDevice()).retired, false);
  nowMs += 6 * 60 * 1000;
  const result = await timer.scheduled.shift().callback();

  assert.deepEqual(result, {
    retired: true,
    reason: "device_disconnect",
    token_material_returned: false,
  });
  assert.equal(retireBodies.length, 3);
  assert.equal(retireBodies[1], retireBodies[0]);
  assert.notEqual(retireBodies[2], retireBodies[1]);
  assert.deepEqual(
    retireBodies.map((body) => JSON.parse(body).expected_state_version),
    [1, 1, 1],
  );
  assert.equal(value.status().state, "idle");
});

test("failed device disconnect preserves the registered identity and heartbeat", async () => {
  const target = filePath("disconnect-failure");
  let registrations = 0;
  let heartbeats = 0;
  const { value, timer } = coordinator({
    target,
    requestApi: async (input) => {
      if (input.method === "GET") return readiness();
      if (input.path === "/api/desktop/installations") {
        registrations += 1;
        return lifecycleResponse(installation(1));
      }
      if (input.path.endsWith("/retire")) {
        return {
          http_status: 503,
          body: {
            outcome: "blocked",
            safe_error_codes: ["OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE"],
          },
        };
      }
      heartbeats += 1;
      return lifecycleResponse(installation(1, 2), "heartbeat");
    },
  });

  await value.sessionAvailable(PRINCIPAL_A);
  assert.deepEqual(await value.disconnectDevice(), {
    retired: false,
    reason: "device_disconnect_failed",
    token_material_returned: false,
  });
  assert.equal(timer.scheduled.length, 1);
  await value.refresh();
  assert.equal(registrations, 1);
  assert.equal(heartbeats, 1);
  assert.equal(value.status().state, "ready");
});

test("transient retries are bounded unref timers and stop never sends retire", async () => {
  const target = filePath("retry");
  let calls = 0;
  const retryTimers = timers();
  const { value } = coordinator({
    target,
    timer: retryTimers,
    requestApi: async (input) => {
      assert.equal(input.path, "/api/desktop/installations");
      calls += 1;
      return {
        http_status: 503,
        body: {
          outcome: "blocked",
          safe_error_codes: ["OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE"],
        },
      };
    },
  });
  await value.sessionAvailable(PRINCIPAL_A);
  assert.equal(calls, 1);
  assert.equal(retryTimers.scheduled.length, 1);
  assert.equal(retryTimers.scheduled[0].unref_called, true);
  await retryTimers.scheduled.shift().callback();
  assert.equal(calls, 2);
  assert.equal(retryTimers.scheduled.length, 1);
  await retryTimers.scheduled.shift().callback();
  assert.equal(calls, 3);
  assert.equal(retryTimers.scheduled.length, 0);
  assert.equal(value.status().retry_scheduled, false);
  value.stop({ reason: "quit" });
  assert.equal(calls, 3);
});

test("missing authoritative principal or build provenance fails closed before storage or network", async () => {
  let calls = 0;
  const target = filePath("fail-closed");
  const missingPrincipal = coordinator({
    target,
    requestApi: async () => {
      calls += 1;
    },
  }).value;
  const status = await missingPrincipal.sessionAvailable({
    state: "signed_in",
    tenant_id: "client-supplied-tenant",
    user_id: "client-supplied-user",
    entra_subject_id: "client-supplied-subject",
  });
  assert.equal(status.state, "blocked");
  assert.deepEqual(status.safe_error_codes, [
    "OUTLOOK_DESKTOP_IDENTITY_BINDING_REQUIRED",
  ]);

  const missingBuild = createOutlookInstallationLifecycleCoordinator({
    identityStore: createStore(target),
    requestApi: async () => {
      calls += 1;
    },
    buildIdentity: { ...BUILD, source_sha: null },
  });
  assert.equal((await missingBuild.sessionAvailable(PRINCIPAL_A)).state, "blocked");
  assert.equal(calls, 0);
});

test("packaged build identity accepts only clean matching manifest provenance", async () => {
  const manifestPath = filePath("build-manifest");
  const manifest = {
    schema_version: "law-firm-os.matter-desktop-build-provenance.v1",
    package_name: "@law-firm-os/desktop",
    platform: "darwin",
    version: "0.1.26",
    source_sha: "2".repeat(40),
    source_dirty: false,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.deepEqual(await readOutlookDesktopBuildIdentity({
    manifestPath,
    platform: "darwin",
    appVersion: "0.1.26",
  }), BUILD);

  writeFileSync(manifestPath, JSON.stringify({ ...manifest, source_dirty: true }));
  assert.equal(await readOutlookDesktopBuildIdentity({
    manifestPath,
    platform: "darwin",
    appVersion: "0.1.26",
  }), null);
  assert.equal(await readOutlookDesktopBuildIdentity({
    manifestPath: `${manifestPath}.missing`,
    platform: "darwin",
    appVersion: "0.1.26",
  }), null);
});
