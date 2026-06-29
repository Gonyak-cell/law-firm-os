import assert from "node:assert/strict";
import test from "node:test";
import { requestPath } from "../src/lambda.js";

test("Lambda wrapper normalizes duplicate leading slashes from Function URL rawPath", () => {
  assert.equal(
    requestPath({
      rawPath: "//api/matters/vault-bridge/status",
      rawQueryString: "source=smoke"
    }),
    "/api/matters/vault-bridge/status?source=smoke"
  );
});

test("Lambda wrapper falls back to requestContext HTTP path", () => {
  assert.equal(
    requestPath({
      requestContext: { http: { path: "//api/matters/vault-bridge/status" } }
    }),
    "/api/matters/vault-bridge/status"
  );
});
