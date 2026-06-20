import assert from "node:assert/strict";
import test from "node:test";
import { assertHrxRuntimePayload, validateHrxRuntimePayload } from "../src/validators.js";

test("HRX runtime validator rejects descriptor-only payloads", () => {
  const validation = validateHrxRuntimePayload(
    {
      entity_type: "Employee",
      tenant_id: "tenant-a",
      actor_id: "user-a",
      descriptor_only: true,
      runtime_execution: false,
      product_state_written: false,
    },
    { entity_type: "Employee" },
  );
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /descriptor_only payload cannot enter runtime path/);
  assert.match(validation.errors.join("\n"), /runtime_execution=false/);
});

test("HRX runtime validator requires tenant and actor", () => {
  const validation = validateHrxRuntimePayload({ entity_type: "Employee" }, { entity_type: "Employee" });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /tenant_id is required/);
  assert.match(validation.errors.join("\n"), /actor_id is required/);
});

test("HRX runtime validator accepts scoped runtime payload", () => {
  assert.equal(
    validateHrxRuntimePayload({
      entity_type: "Employee",
      tenant_id: "tenant-a",
      actor_id: "user-a",
      runtime_execution: true,
      product_state_written: true,
    }).valid,
    true,
  );
  assert.doesNotThrow(() =>
    assertHrxRuntimePayload({
      entity_type: "Employee",
      tenant_id: "tenant-a",
      actor_id: "user-a",
      runtime_execution: true,
      product_state_written: true,
    }),
  );
});
