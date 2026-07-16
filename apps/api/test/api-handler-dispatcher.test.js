import assert from "node:assert/strict";
import test from "node:test";
import {
  dispatchApiHandler,
  mapApiHandlerError,
} from "../src/api-handler-dispatcher.js";

test("API dispatcher handles sync and Promise handlers with the same result", async () => {
  assert.deepEqual(await dispatchApiHandler((input) => ({ value: input.value + 1 }), { value: 1 }), { value: 2 });
  assert.deepEqual(await dispatchApiHandler(async (input) => ({ value: input.value + 1 }), { value: 2 }), { value: 3 });
  await assert.rejects(dispatchApiHandler(async () => {
    throw Object.assign(new Error("secret database detail"), {
      code: "LAWOS_REPOSITORY_CONFLICT",
      safe_error_code: "REPOSITORY_VERSION_CONFLICT",
      status: 409,
    });
  }), { code: "LAWOS_REPOSITORY_CONFLICT" });
});

test("API error mapping preserves typed status without exposing internal details", () => {
  const conflict = mapApiHandlerError(Object.assign(new Error("row and secret detail"), {
    code: "LAWOS_REPOSITORY_CONFLICT",
    safe_error_code: "REPOSITORY_VERSION_CONFLICT",
    status: 409,
  }), { requestId: "req-dispatch-conflict" });
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.body.safe_error_codes, ["REPOSITORY_VERSION_CONFLICT"]);
  assert.equal(JSON.stringify(conflict).includes("row and secret detail"), false);

  const internal = mapApiHandlerError(new Error("postgresql://user:password@db.example.test/lawos"));
  assert.equal(internal.status, 500);
  assert.deepEqual(internal.body.safe_error_codes, ["API_INTERNAL_ERROR"]);
  assert.equal(JSON.stringify(internal).includes("password"), false);
});
