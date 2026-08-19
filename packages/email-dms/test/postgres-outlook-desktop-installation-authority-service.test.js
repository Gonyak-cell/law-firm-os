import assert from "node:assert/strict";
import test from "node:test";

import { POSTGRES_TENANT_CONTEXT_SECRET } from "../../persistence/src/postgres/pool.js";
import {
  createPostgresOutlookDesktopInstallationAuthorityService,
} from "../src/postgres-outlook-desktop-installation-authority-service.js";

const TENANT = "tenant-authority-adapter";
const PRINCIPAL = Object.freeze({
  tenant_id: TENANT,
  user_id: "user-authority-adapter",
  entra_subject_id: "subject-authority-adapter",
});

function authorityPool({ heartbeatUntrusted = false } = {}) {
  const calls = [];
  const pool = {
    [POSTGRES_TENANT_CONTEXT_SECRET]: Buffer.alloc(32, 7),
    connectCount: 0,
    async connect() {
      pool.connectCount += 1;
      return {
        async query(sql, values = []) {
          const statement = String(sql).replace(/\s+/gu, " ").trim();
          calls.push({ statement, values: [...values] });
          if (statement.includes("lawos_security.current_tenant_id")) {
            return { rows: [{ tenant_id: TENANT }] };
          }
          const match = statement.match(/lawos_email_dms[.]([a-z_]+)/u);
          if (heartbeatUntrusted
              && match?.[1] === "heartbeat_outlook_desktop_installation") {
            throw Object.assign(new Error("private release row"), {
              code: "LOU01",
              detail: "private detail",
            });
          }
          return { rows: match ? [{ value: { function: match[1] } }] : [] };
        },
        release() {
          calls.push({ statement: "RELEASE", values: [] });
        },
      };
    },
  };
  return { calls, pool };
}

function authorization(operation) {
  return {
    operation,
    installation_id: "odi_authority_adapter_000001",
    user_id: PRINCIPAL.user_id,
    entra_subject_id: PRINCIPAL.entra_subject_id,
  };
}

test("installation authority adapter uses only exact SECDEF functions and transaction modes", async () => {
  const fixture = authorityPool();
  const service = createPostgresOutlookDesktopInstallationAuthorityService({
    pool: fixture.pool,
    tenant_id: TENANT,
  });
  assert.equal((await service.register({
    principal: PRINCIPAL,
    authorization: authorization("register"),
  })).function, "register_outlook_desktop_installation");
  assert.equal((await service.heartbeat({
    principal: PRINCIPAL,
    authorization: authorization("heartbeat"),
  })).function, "heartbeat_outlook_desktop_installation");
  assert.equal((await service.retire({
    principal: PRINCIPAL,
    authorization: authorization("retire"),
  })).function, "retire_outlook_desktop_installation");
  assert.equal((await service.read({
    principal: PRINCIPAL,
    installation_id: "odi_authority_adapter_000001",
  })).function, "read_outlook_desktop_installation");
  assert.equal((await service.readCurrent({ principal: PRINCIPAL })).function,
    "read_current_outlook_desktop_installation");
  assert.equal((await service.projectAssignmentState({ principal: PRINCIPAL })).function,
    "read_outlook_desktop_assignment_state");

  const begins = fixture.calls.filter(({ statement }) =>
    statement.startsWith("BEGIN ISOLATION LEVEL"))
    .map(({ statement }) => statement);
  assert.deepEqual(begins, [
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
    "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
    "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
  ]);
  const functionCalls = fixture.calls.filter(({ statement }) =>
    statement.includes("SELECT lawos_email_dms."));
  assert.equal(functionCalls.length, 6);
  assert.equal(functionCalls.every(({ values }) => values[0] === TENANT), true);
});

test("adapter rejects tenant or principal drift before opening PostgreSQL", async () => {
  const fixture = authorityPool();
  const service = createPostgresOutlookDesktopInstallationAuthorityService({
    pool: fixture.pool,
    tenant_id: TENANT,
  });
  await assert.rejects(service.register({
    principal: { ...PRINCIPAL, tenant_id: "tenant-foreign" },
    authorization: authorization("register"),
  }), (error) => error?.safe_error_code ===
    "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH");
  await assert.rejects(service.register({
    principal: PRINCIPAL,
    authorization: {
      ...authorization("register"),
      user_id: "user-foreign",
    },
  }), (error) => error?.safe_error_code ===
    "OUTLOOK_DESKTOP_INSTALLATION_BINDING_MISMATCH");
  assert.equal(fixture.pool.connectCount, 0);
});

test("heartbeat maps only private LOU01 and leaks no PostgreSQL details", async () => {
  const fixture = authorityPool({ heartbeatUntrusted: true });
  const service = createPostgresOutlookDesktopInstallationAuthorityService({
    pool: fixture.pool,
    tenant_id: TENANT,
  });
  await assert.rejects(service.heartbeat({
    principal: PRINCIPAL,
    authorization: authorization("heartbeat"),
  }), (error) => {
    assert.equal(error.code, "LAWOS_OUTLOOK_DESKTOP_RELEASE_UNTRUSTED");
    assert.equal(error.safe_error_code, "OUTLOOK_DESKTOP_RELEASE_UNTRUSTED");
    assert.equal(error.status, 409);
    assert.doesNotMatch(JSON.stringify(error), /private|detail/iu);
    return true;
  });
  assert.equal(fixture.calls.some(({ statement }) => statement === "ROLLBACK"), true);
});
