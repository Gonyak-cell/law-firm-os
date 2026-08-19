import assert from "node:assert/strict";
import test from "node:test";

import * as packageTrust from "@law-firm-os/runtime-auth/external-release-trust";
import * as scriptTrust from "../../../scripts/lib/external-release-trust.mjs";

test("authority binding matches the external-pilot six-field byte contract", () => {
  const scope = {
    pilot_id: "amic-os-outlook",
    lawos_tenant_id: "amic-law-prod",
    entra_tenant_id: "123e4567-e89b-42d3-a456-426614174000",
    source_sha: "1cf6f9378166dce0b246749b0f301a490f2c8724",
    source_tree: "010a519b52f9d9bc00b35813c8d0605215eebae1",
    version: "0.1.27",
  };
  assert.equal(
    packageTrust.externalReleaseAuthorityBindingSha256(scope),
    "e063786fc233756e27302d3f0a008000b9236a61a172879624859ba0c2020b59",
  );
  assert.equal(
    scriptTrust.externalReleaseAuthorityBindingSha256(Object.fromEntries(Object.entries(scope).reverse())),
    "e063786fc233756e27302d3f0a008000b9236a61a172879624859ba0c2020b59",
  );
  assert.equal(
    packageTrust.externalReleaseAuthorityBindingSha256({
      ...scope,
      version: "law-firm-os.production-migration-catalog-readback-packet.v2",
    }),
    "56a7aab00a459b1a0fd8db5752709960b9ae1b40f45b229b9432388c63d062bb",
  );
  for (const version of ["v", "v".repeat(200)]) {
    assert.match(
      packageTrust.externalReleaseAuthorityBindingSha256({ ...scope, version }),
      /^[0-9a-f]{64}$/u,
    );
  }

  for (const invalid of [
    { ...scope, environment: "production" },
    { ...scope, packet_sha256: "f".repeat(64) },
    Object.fromEntries(Object.entries(scope).slice(0, -1)),
    { ...scope, source_sha: scope.source_sha.toUpperCase() },
    { ...scope, source_tree: "0".repeat(64) },
    { ...scope, version: "" },
    { ...scope, version: "unsafe version" },
    { ...scope, version: "v".repeat(201) },
    { ...scope, pilot_id: "AMIC-OS-OUTLOOK" },
    { ...scope, lawos_tenant_id: "" },
    { ...scope, entra_tenant_id: "not-an-entra-tenant" },
  ]) {
    assert.throws(
      () => packageTrust.externalReleaseAuthorityBindingSha256(invalid),
      (error) => error?.code === "TRUST_AUTHORITY_BINDING_INVALID",
    );
  }

  const symbolScope = { ...scope, [Symbol("hidden")]: "forbidden" };
  assert.throws(
    () => packageTrust.externalReleaseAuthorityBindingSha256(symbolScope),
    (error) => error?.code === "TRUST_AUTHORITY_BINDING_INVALID",
  );

  const nonEnumerableScope = { ...scope };
  Object.defineProperty(nonEnumerableScope, "version", {
    enumerable: false,
    value: scope.version,
  });
  assert.throws(
    () => packageTrust.externalReleaseAuthorityBindingSha256(nonEnumerableScope),
    (error) => error?.code === "TRUST_AUTHORITY_BINDING_INVALID",
  );

  let accessorCalls = 0;
  const accessorScope = { ...scope };
  Object.defineProperty(accessorScope, "pilot_id", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return scope.pilot_id;
    },
  });
  assert.throws(
    () => packageTrust.externalReleaseAuthorityBindingSha256(accessorScope),
    (error) => error?.code === "TRUST_AUTHORITY_BINDING_INVALID",
  );
  assert.equal(accessorCalls, 0);

  let proxyTrapCalls = 0;
  const proxyScope = new Proxy({ ...scope }, {
    ownKeys(target) {
      proxyTrapCalls += 1;
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => packageTrust.externalReleaseAuthorityBindingSha256(proxyScope),
    (error) => error?.code === "TRUST_AUTHORITY_BINDING_INVALID",
  );
  assert.equal(proxyTrapCalls, 0);

  let coercionCalls = 0;
  const coercionScope = {
    ...scope,
    version: {
      [Symbol.toPrimitive]() {
        coercionCalls += 1;
        return scope.version;
      },
      toJSON() {
        coercionCalls += 1;
        return scope.version;
      },
    },
  };
  assert.throws(
    () => packageTrust.externalReleaseAuthorityBindingSha256(coercionScope),
    (error) => error?.code === "TRUST_AUTHORITY_BINDING_INVALID",
  );
  assert.equal(coercionCalls, 0);
});
