import assert from "node:assert/strict";
import test from "node:test";
import { startCliApiServer } from "../src/server.js";

test("CLI bootstrap passes an injected payroll statement provider verifier to the API server", async () => {
  const verifier = Object.freeze({
    async verify() {
      return { ok: true };
    },
  });
  let receivedOptions;
  const started = await startCliApiServer({
    startupOptions: {
      port: 0,
      sessionSecret: "cli-provider-test-session-secret-32-bytes",
    },
    payrollStatementProviderVerifier: verifier,
    startApiServerFn: async (options) => {
      receivedOptions = options;
      return { port: 41234 };
    },
  });

  assert.equal(receivedOptions.payrollStatementProviderVerifier, verifier);
  assert.equal(receivedOptions.sessionSecret, "cli-provider-test-session-secret-32-bytes");
  assert.deepEqual(started, { port: 41234 });
});
