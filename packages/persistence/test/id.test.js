import assert from "node:assert/strict";
import test from "node:test";
import { assertStableRuntimeId, createStableRuntimeId } from "../src/index.js";

test("Runtime Spine stable IDs are deterministic and typed", () => {
  const first = createStableRuntimeId({ type: "matter", tenantId: "tenant-a", seed: "matter-001" });
  const second = createStableRuntimeId({ type: "matter", tenantId: "tenant-a", seed: "matter-001" });
  const otherTenant = createStableRuntimeId({ type: "matter", tenantId: "tenant-b", seed: "matter-001" });
  assert.equal(first, second);
  assert.notEqual(first, otherTenant);
  assert.match(first, /^mat_[a-f0-9]{20}$/);
  assert.equal(assertStableRuntimeId(first, "matter"), true);
});

test("Runtime Spine stable IDs reject unknown type and missing seed", () => {
  assert.throws(() => createStableRuntimeId({ type: "bad", tenantId: "tenant-a", seed: "x" }), /unknown runtime id type/);
  assert.throws(() => createStableRuntimeId({ type: "client", tenantId: "tenant-a", seed: "" }), /stable id seed/);
  assert.throws(() => assertStableRuntimeId("mat_123", "client"), /cli_/);
});
