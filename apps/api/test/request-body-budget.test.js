import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { mapApiHandlerError } from "../src/api-handler-dispatcher.js";
import { readRequestBody } from "../src/server.js";

function request(chunks, headers = {}) {
  const stream = Readable.from(chunks);
  stream.headers = headers;
  return stream;
}

test("request body budget rejects declared and chunked overflows before parsing or multipart expansion", async () => {
  await assert.rejects(
    readRequestBody(request([], { "content-length": "9", "content-type": "application/json" }), { maxBytes: 8 }),
    (error) => error?.status === 413 && error?.safe_error_code === "API_REQUEST_BODY_TOO_LARGE",
  );
  await assert.rejects(
    readRequestBody(request([Buffer.from("1234"), Buffer.from("56789")], { "content-type": "application/json" }), { maxBytes: 8 }),
    (error) => error?.status === 413 && error?.safe_error_code === "API_REQUEST_BODY_TOO_LARGE",
  );
  const mapped = mapApiHandlerError(Object.assign(new Error("do not expose payload"), {
    status: 413,
    safe_error_code: "API_REQUEST_BODY_TOO_LARGE",
  }));
  assert.equal(mapped.status, 413);
  assert.deepEqual(mapped.body.safe_error_codes, ["API_REQUEST_BODY_TOO_LARGE"]);
  assert.equal(mapped.body.detail_exposed, false);
});

test("authenticated request parsing replaces caller-asserted actor identity", async () => {
  const req = request([
    Buffer.from(JSON.stringify({ actor_id: "forged_actor", value: "kept" })),
  ], { "content-type": "application/json" });
  req.lawosAuthenticatedActorId = "signed_session_actor";

  const body = await readRequestBody(req);

  assert.deepEqual(body, { actor_id: "signed_session_actor", value: "kept" });
});
