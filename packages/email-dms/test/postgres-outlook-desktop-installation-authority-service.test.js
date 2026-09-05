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
const TRUSTED_CURRENT = Object.freeze({
  installation_id: "odi_authority_adapter_000001",
  status: "active",
  state_version: 4,
  lease_expires_at: "2026-08-26 01:02:03.004+00",
  retired_at: null,
  release_trusted: true,
  authority_snapshot_at: "2026-08-25 01:02:03.004+00",
});

function authorityPool({
  heartbeatUntrusted = false,
  installation,
  trustedCurrent = TRUSTED_CURRENT,
  trustedCurrentError = null,
} = {}) {
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
          if (trustedCurrentError
              && match?.[1] ===
                "read_trusted_current_outlook_desktop_installation") {
            throw trustedCurrentError;
          }
          if (installation !== undefined && [
            "read_outlook_desktop_installation",
            "read_current_outlook_desktop_installation",
          ].includes(match?.[1])) return { rows: [{ value: installation }] };
          return { rows: match ? [{
            value: match[1] ===
              "read_trusted_current_outlook_desktop_installation"
              ? trustedCurrent
              : { function: match[1] },
          }] : [] };
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
  assert.deepEqual(await service.readTrustedCurrent({ principal: PRINCIPAL }), {
    ...TRUSTED_CURRENT,
    lease_expires_at: "2026-08-26T01:02:03.004Z",
    authority_snapshot_at: "2026-08-25T01:02:03.004Z",
  });
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
    "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
  ]);
  const functionCalls = fixture.calls.filter(({ statement }) =>
    statement.includes("SELECT lawos_email_dms."));
  assert.equal(functionCalls.length, 7);
  assert.equal(functionCalls.every(({ values }) => values[0] === TENANT), true);
});

test("installation reads normalize PostgreSQL timezone timestamps without changing other fields", async () => {
  for (const retiredAt of [null, "2026-09-05T17:11:25.917+09:00"]) {
    const installation = Object.freeze({
      installation_id: "odi_authority_adapter_000001",
      status: retiredAt === null ? "active" : "retired",
      state_version: 4,
      lease_expires_at: "2026-09-05T17:11:25.917+09:00",
      retired_at: retiredAt,
      source_sha: "a".repeat(40),
      app_version: "0.1.32",
      created_at: "2026-09-04T17:11:25.917+09:00",
    });
    const fixture = authorityPool({ installation });
    const service = createPostgresOutlookDesktopInstallationAuthorityService({
      pool: fixture.pool, tenant_id: TENANT,
    });
    const expected = {
      ...installation,
      lease_expires_at: "2026-09-05T08:11:25.917Z",
      retired_at: retiredAt === null ? null : "2026-09-05T08:11:25.917Z",
    };
    assert.deepEqual(await service.read({
      principal: PRINCIPAL, installation_id: installation.installation_id,
    }), expected);
    assert.deepEqual(await service.readCurrent({ principal: PRINCIPAL }), expected);
    assert.equal(installation.lease_expires_at, "2026-09-05T17:11:25.917+09:00");
    assert.equal(fixture.calls.filter(({ statement }) =>
      statement.includes("SELECT lawos_email_dms.")).length, 2);
    assert.deepEqual(fixture.calls.filter(({ statement }) =>
      statement.startsWith("BEGIN ISOLATION LEVEL")).map(({ statement }) => statement), [
      "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
      "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
    ]);
  }
});

test("installation reads preserve null and reject invalid timestamp values", async () => {
  for (const installation of [
    null,
    { lease_expires_at: "invalid", retired_at: null },
    { lease_expires_at: null, retired_at: null },
    { lease_expires_at: new Date(), retired_at: null },
    { lease_expires_at: "2026-09-05T17:11:25.917+09:00", retired_at: "invalid" },
  ]) {
    const fixture = authorityPool({ installation });
    const service = createPostgresOutlookDesktopInstallationAuthorityService({
      pool: fixture.pool, tenant_id: TENANT,
    });
    for (const request of [
      () => service.read({ principal: PRINCIPAL, installation_id: "odi_authority_adapter_000001" }),
      () => service.readCurrent({ principal: PRINCIPAL }),
    ]) {
      if (installation === null) assert.equal(await request(), null);
      else await assert.rejects(request(), /installation result timestamp is invalid/u);
    }
  }
});

test("trusted-current result snapshots seven primitives and fails closed", async () => {
  const valid = { ...TRUSTED_CURRENT };
  for (const value of [
    new Proxy(valid, {}),
    { ...valid, token: "secret" },
    { ...valid, release_trusted: false },
    { ...valid, authority_snapshot_at: new Date() },
    { ...valid, lease_expires_at: "invalid" },
    { ...valid, lease_expires_at: valid.authority_snapshot_at },
  ]) {
    const fixture = authorityPool({ trustedCurrent: value });
    const service = createPostgresOutlookDesktopInstallationAuthorityService({
      pool: fixture.pool,
      tenant_id: TENANT,
    });
    await assert.rejects(service.readTrustedCurrent({ principal: PRINCIPAL }),
      (error) => error?.safe_error_code ===
        "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE"
        && error?.status === 503);
  }
  let reads = 0;
  const accessor = { ...valid };
  Object.defineProperty(accessor, "state_version", {
    enumerable: true,
    get() {
      reads += 1;
      return reads;
    },
  });
  const fixture = authorityPool({ trustedCurrent: accessor });
  const service = createPostgresOutlookDesktopInstallationAuthorityService({
    pool: fixture.pool,
    tenant_id: TENANT,
  });
  await assert.rejects(service.readTrustedCurrent({ principal: PRINCIPAL }),
    (error) => error?.safe_error_code ===
      "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE"
      && error?.status === 503);
  assert.equal(reads, 0);
});

test("trusted-current malformed rows and PostgreSQL failures map to one sanitized 503", async () => {
  for (const options of [
    { trustedCurrent: { ...TRUSTED_CURRENT, token: "secret" } },
    { trustedCurrentError: Object.assign(new Error("private database row"), {
      code: "XX999",
      detail: "private detail",
    }) },
  ]) {
    const fixture = authorityPool(options);
    const service = createPostgresOutlookDesktopInstallationAuthorityService({
      pool: fixture.pool,
      tenant_id: TENANT,
    });
    await assert.rejects(service.readTrustedCurrent({ principal: PRINCIPAL }),
      (error) => {
        assert.equal(error.code,
          "LAWOS_OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE");
        assert.equal(error.safe_error_code,
          "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE");
        assert.equal(error.status, 503);
        assert.doesNotMatch(JSON.stringify(error), /secret|private|detail/iu);
        return true;
      });
  }
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
