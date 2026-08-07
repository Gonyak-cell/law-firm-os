import assert from "node:assert/strict";
import test from "node:test";
import { GRAPH_STATE } from "../src/addin-auth.js";
import {
  disconnectCurrentOutlookConnection,
  isOutlookConnectionDisconnected,
  parseOutlookConnectionRecord,
} from "../src/outlook-connection-actions.js";

function connection(stateVersion, state = GRAPH_STATE.connected, status = "connected") {
  return { state, status, stateVersion };
}

test("connection response parser rejects missing status instead of inventing not_connected", () => {
  for (const body of [
    {},
    { item: {} },
    { item: { connection: {} } },
    { item: { connection: { active: true, state_version: 1 } } },
  ]) {
    assert.throws(
      () => parseOutlookConnectionRecord(body),
      (error) => error.safe_error_code === "API_RESPONSE_INVALID",
    );
  }
});

test("connection response parser accepts only an explicit not_connected absence", () => {
  const parsed = parseOutlookConnectionRecord({
    item: {
      connection: {
        status: "not_connected",
        active: false,
        state_version: null,
      },
    },
  });
  assert.equal(parsed.state, GRAPH_STATE.notConnected);
  assert.equal(parsed.status, "not_connected");
  assert.equal(isOutlookConnectionDisconnected(parsed), true);
});

test("connection response parser rejects contradictory terminal activity", () => {
  for (const status of ["not_connected", "revoked"]) {
    for (const active of [true, undefined]) {
      assert.throws(
        () => parseOutlookConnectionRecord({
          item: { connection: { status, active, state_version: 2 } },
        }),
        (error) => error.safe_error_code === "API_RESPONSE_INVALID",
      );
    }
    const parsed = parseOutlookConnectionRecord({
      item: {
        connection: {
          status,
          active: false,
          state_version: status === "not_connected" ? 0 : 2,
        },
      },
    });
    assert.equal(isOutlookConnectionDisconnected(parsed), true);
  }
});

test("connection response parser requires active true for connected status", () => {
  for (const active of [false, undefined]) {
    assert.throws(
      () => parseOutlookConnectionRecord({
        item: { connection: { status: "connected", active, state_version: 2 } },
      }),
      (error) => error.safe_error_code === "API_RESPONSE_INVALID",
    );
  }
  const parsed = parseOutlookConnectionRecord({
    item: { connection: { status: "connected", active: true, state_version: 2 } },
  });
  assert.equal(parsed.state, GRAPH_STATE.connected);
  assert.equal(isOutlookConnectionDisconnected(parsed), false);
});

test("connection response parser requires a valid version for every existing connection", () => {
  for (const { status, active } of [
    { status: "connected", active: true },
    { status: "revoked", active: false },
    { status: "scope_insufficient", active: false },
  ]) {
    for (const stateVersion of [undefined, 0, -1, 1.5, true, "1", [1]]) {
      assert.throws(
        () => parseOutlookConnectionRecord({
          item: { connection: { status, active, state_version: stateVersion } },
        }),
        (error) => error.safe_error_code === "API_RESPONSE_INVALID",
      );
    }
  }
  assert.throws(
    () => parseOutlookConnectionRecord({
      item: {
        connection: {
          status: "not_connected",
          active: false,
          state_version: 3,
        },
      },
    }),
    (error) => error.safe_error_code === "API_RESPONSE_INVALID",
  );
  for (const stateVersion of [false, "0", [], [0]]) {
    assert.throws(
      () => parseOutlookConnectionRecord({
        item: {
          connection: {
            status: "not_connected",
            active: false,
            state_version: stateVersion,
          },
        },
      }),
      (error) => error.safe_error_code === "API_RESPONSE_INVALID",
    );
  }
});

test("disconnect preflights the latest connection version", async () => {
  const calls = [];
  const result = await disconnectCurrentOutlookConnection({
    readConnection: async () => connection(2),
    deleteConnection: async (current) => {
      calls.push(current.stateVersion);
      return connection(3, GRAPH_STATE.notConnected, "revoked");
    },
  });
  assert.deepEqual(calls, [2]);
  assert.equal(result.connection.state, GRAPH_STATE.notConnected);
});

test("disconnect converges to revoked after an ambiguous timeout", async () => {
  let reads = 0;
  const result = await disconnectCurrentOutlookConnection({
    readConnection: async () => (
      ++reads === 1
        ? connection(1)
        : connection(2, GRAPH_STATE.notConnected, "revoked")
    ),
    deleteConnection: async () => {
      throw Object.assign(new Error("timeout"), {
        safe_error_code: "ADDIN_API_REQUEST_TIMEOUT",
      });
    },
  });
  assert.equal(result.outcome, "disconnected_after_ambiguous_response");
  assert.equal(result.connection.status, "revoked");
});

test("disconnect retries one version conflict with the authoritative version", async () => {
  let reads = 0;
  const deletes = [];
  const result = await disconnectCurrentOutlookConnection({
    readConnection: async () => connection(++reads),
    deleteConnection: async (current) => {
      deletes.push(current.stateVersion);
      if (deletes.length === 1) {
        throw Object.assign(new Error("conflict"), {
          safe_error_code: "M365_CONNECTION_VERSION_CONFLICT",
        });
      }
      return connection(3, GRAPH_STATE.notConnected, "revoked");
    },
  });
  assert.deepEqual(deletes, [1, 2]);
  assert.equal(result.connection.status, "revoked");
});

test("disconnect preserves an authoritative connected state on failure", async () => {
  let reads = 0;
  await assert.rejects(
    disconnectCurrentOutlookConnection({
      readConnection: async () => connection(++reads),
      deleteConnection: async () => {
        throw Object.assign(new Error("denied"), {
          safe_error_code: "OUTLOOK_ADDIN_PERMISSION_DENIED",
        });
      },
    }),
    (error) => (
      error.safe_error_code === "OUTLOOK_ADDIN_PERMISSION_DENIED"
      && error.authoritative_connection?.stateVersion === 2
    ),
  );
});

test("already revoked connections still issue DELETE to drain durable cleanup", async () => {
  const calls = [];
  const result = await disconnectCurrentOutlookConnection({
    readConnection: async () => connection(2, GRAPH_STATE.notConnected, "revoked"),
    deleteConnection: async (current) => {
      calls.push(current.stateVersion);
      return connection(2, GRAPH_STATE.notConnected, "revoked");
    },
  });
  assert.deepEqual(calls, [2]);
  assert.equal(result.connection.status, "revoked");
});

test("only revoked or genuinely absent connections are terminally disconnected", () => {
  assert.equal(isOutlookConnectionDisconnected(connection(0, GRAPH_STATE.notConnected, "not_connected")), true);
  assert.equal(isOutlookConnectionDisconnected(connection(2, GRAPH_STATE.notConnected, "revoked")), true);
  for (const status of [
    "scope_insufficient",
    "reauthorization_required",
    "unavailable",
    "future_unknown_state",
  ]) {
    assert.equal(
      isOutlookConnectionDisconnected(connection(2, GRAPH_STATE.notConnected, status)),
      false,
      status,
    );
  }
});

test("nonterminal preflight state still issues DELETE", async () => {
  const calls = [];
  const result = await disconnectCurrentOutlookConnection({
    readConnection: async () => connection(2, GRAPH_STATE.reconnectRequired, "scope_insufficient"),
    deleteConnection: async (current) => {
      calls.push(current.status);
      return connection(3, GRAPH_STATE.notConnected, "revoked");
    },
  });
  assert.deepEqual(calls, ["scope_insufficient"]);
  assert.equal(result.connection.status, "revoked");
});

test("ambiguous DELETE does not treat a nonterminal state as revocation", async () => {
  let reads = 0;
  await assert.rejects(
    disconnectCurrentOutlookConnection({
      readConnection: async () => (
        ++reads === 1
          ? connection(1)
          : connection(2, GRAPH_STATE.reconnectRequired, "reauthorization_required")
      ),
      deleteConnection: async () => {
        throw Object.assign(new Error("timeout"), {
          safe_error_code: "ADDIN_API_REQUEST_TIMEOUT",
        });
      },
    }),
    (error) => (
      error.safe_error_code === "ADDIN_API_REQUEST_TIMEOUT"
      && error.authoritative_connection?.status === "reauthorization_required"
    ),
  );
});

test("nonterminal DELETE and readback fail closed without clearing connection data", async () => {
  let reads = 0;
  await assert.rejects(
    disconnectCurrentOutlookConnection({
      readConnection: async () => connection(++reads, GRAPH_STATE.notConnected, "unavailable"),
      deleteConnection: async () => connection(2, GRAPH_STATE.notConnected, "unavailable"),
    }),
    (error) => (
      error.safe_error_code === "M365_CONNECTION_DISCONNECT_NOT_CONFIRMED"
      && error.authoritative_connection?.status === "unavailable"
    ),
  );
});
