import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresOutlookDesktopOperationalControlPorts,
} from "../src/outlook-desktop-operational-runtime.js";
import { startApiServer, startCliApiServer } from "../src/server.js";

const TENANT_ID = "tenant-outlook-startup-a";
const POSTGRES_ENV = Object.freeze({
  LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/must-not-read",
  LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID:
    "lawos/test/must-not-read-tenant-context",
});
const FORBIDDEN_OPTIONS = Object.freeze([
  "outlookDesktopRuntime",
  "outlookDesktopActivationService",
  "outlookDesktopActivationServiceFactory",
  "outlookDesktopActivationContract",
  "outlookDesktopActivationClock",
  "outlookDesktopActivationEnv",
  "outlookDesktopLifecycleService",
  "outlookDesktopLifecycleServiceFactory",
  "outlookDesktopLifecycleContract",
  "outlookDesktopLifecycleClock",
  "outlookDesktopLifecycleEnv",
]);

function controlPorts() {
  return createPostgresOutlookDesktopOperationalControlPorts({
    app_pool: { connect() {} },
    control_pool: { connect() {} },
    tenant_id: TENANT_ID,
    verifier_pool: { connect() {} },
  });
}

async function rejectedBeforeSecret(extra = {}) {
  let secretCalls = 0;
  await assert.rejects(
    startApiServer({
      port: 0,
      runtimeProfile: "operational",
      persistenceAuthority: "postgres-v2",
      persistenceAuthorityEnv: POSTGRES_ENV,
      persistenceResolvePostgresSecret: async () => {
        secretCalls += 1;
        throw new Error("desktop startup preflight ran too late");
      },
      ...extra,
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(secretCalls, 0);
}

test("postgres-v2 requires an explicit primitive desktop entitlement decision", async () => {
  await rejectedBeforeSecret();
  await rejectedBeforeSecret({ outlookDesktopEntitlementEnabled: "false" });
  await rejectedBeforeSecret({
    outlookDesktopEntitlementEnabled: new Boolean(false),
  });
});

test("enabled startup requires the exact API-composed private-branded pair", async () => {
  const ports = controlPorts();
  await rejectedBeforeSecret({ outlookDesktopEntitlementEnabled: true });
  await rejectedBeforeSecret({
    outlookDesktopEntitlementEnabled: true,
    outlookDesktopActivationControlPort:
      ports.outlookDesktopActivationControlPort,
  });
  await rejectedBeforeSecret({
    outlookDesktopEntitlementEnabled: true,
    outlookDesktopActivationControlPort: Object.freeze({}),
    outlookDesktopLifecycleControlPort: Object.freeze({}),
  });
});

test("disabled startup rejects dormant activation or lifecycle authority", async () => {
  const ports = controlPorts();
  await rejectedBeforeSecret({
    outlookDesktopEntitlementEnabled: false,
    outlookDesktopActivationControlPort:
      ports.outlookDesktopActivationControlPort,
    outlookDesktopLifecycleControlPort:
      ports.outlookDesktopLifecycleControlPort,
  });
});

test("forbidden service, factory, contract, clock, env, and runtime options fail closed", async () => {
  for (const key of FORBIDDEN_OPTIONS) {
    await rejectedBeforeSecret({
      outlookDesktopEntitlementEnabled: false,
      [key]: undefined,
    });
  }
});

test("accessor and Proxy startup authority options fail before observation", async () => {
  let getterCalls = 0;
  const accessor = {
    port: 0,
    runtimeProfile: "operational",
    persistenceAuthority: "postgres-v2",
    persistenceAuthorityEnv: POSTGRES_ENV,
    persistenceResolvePostgresSecret: async () => {
      throw new Error("desktop startup preflight ran too late");
    },
  };
  Object.defineProperty(accessor, "outlookDesktopEntitlementEnabled", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return false;
    },
  });
  await assert.rejects(
    startApiServer(accessor),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(getterCalls, 0);

  let trapCalls = 0;
  const proxy = new Proxy({
    outlookDesktopEntitlementEnabled: false,
  }, {
    ownKeys() {
      trapCalls += 1;
      return [];
    },
  });
  await assert.rejects(
    startApiServer(proxy),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(trapCalls, 0);
});

test("inherited startup authority and nested environment accessors fail before observation", async () => {
  let secretCalls = 0;
  const inherited = Object.create({
    runtimeProfile: "operational",
    persistenceAuthority: "postgres-v2",
    outlookDesktopEntitlementEnabled: false,
  });
  Object.assign(inherited, {
    persistenceAuthorityEnv: POSTGRES_ENV,
    persistenceResolvePostgresSecret: async () => {
      secretCalls += 1;
      throw new Error("inherited startup authority reached secret resolution");
    },
  });
  await assert.rejects(
    startApiServer(inherited),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(secretCalls, 0);

  let envGetterCalls = 0;
  const accessorEnv = {};
  Object.defineProperty(accessorEnv, "LAWOS_RUNTIME_PROFILE", {
    enumerable: true,
    get() {
      envGetterCalls += 1;
      return "operational";
    },
  });
  await assert.rejects(
    startApiServer({
      outlookDesktopEntitlementEnabled: false,
      persistenceAuthorityEnv: accessorEnv,
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(envGetterCalls, 0);

  let envTrapCalls = 0;
  const proxyEnv = new Proxy({}, {
    ownKeys() {
      envTrapCalls += 1;
      return [];
    },
  });
  await assert.rejects(
    startApiServer({
      outlookDesktopEntitlementEnabled: false,
      persistenceAuthorityEnv: proxyEnv,
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(envTrapCalls, 0);
});

test("CLI startup rejects inherited startup options before spreading them", () => {
  let getterCalls = 0;
  const inherited = {};
  Object.defineProperty(inherited, "sessionSecret", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "must-not-be-observed";
    },
  });
  assert.throws(
    () => startCliApiServer({
      startupOptions: Object.create(inherited),
      startApiServerFn: async () => ({ port: 0 }),
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(getterCalls, 0);
});

test("startup snapshot discards Object.prototype authority pollution", async () => {
  let getterCalls = 0;
  let secretCalls = 0;
  Object.defineProperty(Object.prototype, "outlookDesktopActivationControlPort", {
    configurable: true,
    get() {
      getterCalls += 1;
      return undefined;
    },
  });
  try {
    await assert.rejects(
      startApiServer({
        port: 0,
        runtimeProfile: "operational",
        persistenceAuthority: "postgres-v2",
        persistenceAuthorityEnv: POSTGRES_ENV,
        outlookDesktopEntitlementEnabled: false,
        persistenceResolvePostgresSecret: async () => {
          secretCalls += 1;
          throw new Error("expected persistence boundary");
        },
      }),
      (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
    );
  } finally {
    delete Object.prototype.outlookDesktopActivationControlPort;
  }
  assert.equal(getterCalls, 0);
  assert.equal(secretCalls, 1);
});

for (const [label, extra] of [
  ["disabled", { outlookDesktopEntitlementEnabled: false }],
  ["enabled", {
    outlookDesktopEntitlementEnabled: true,
    ...controlPorts(),
  }],
]) {
  test(`valid ${label} startup passes desktop preflight before persistence resolution`, async () => {
    let secretCalls = 0;
    await assert.rejects(
      startApiServer({
        port: 0,
        runtimeProfile: "operational",
        persistenceAuthority: "postgres-v2",
        outlookDesktopAutoconnectRoster: null,
        ...extra,
        persistenceAuthorityEnv: POSTGRES_ENV,
        persistenceResolvePostgresSecret: async () => {
          secretCalls += 1;
          throw new Error("expected persistence boundary");
        },
      }),
      (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
    );
    assert.equal(secretCalls, 1);
  });
}
