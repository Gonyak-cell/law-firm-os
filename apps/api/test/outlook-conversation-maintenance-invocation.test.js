import assert from "node:assert/strict";
import test from "node:test";

import {
  handleOutlookConversationMaintenanceEvent,
  LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
  runOutlookConversationMaintenanceInvocation,
} from "../src/outlook-conversation-maintenance-invocation.js";

test("OUTM-26~28 Lambda maintenance invocation uses the composed production worker without exposing provider data", async () => {
  const calls = [];
  const result = await runOutlookConversationMaintenanceInvocation({
    tenant_id: "tenant",
    limit: 10,
    runtime: {
      outlookConversationRuntime: {
        maintenance_worker: {
          async runOnce(input) {
            calls.push(input);
            return { message_jobs: { claimed: 0, filed: 0 } };
          },
        },
      },
    },
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.worker, LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION);
  assert.equal(result.provider_payload_included, false);
  assert.equal(result.credential_material_included, false);
  assert.equal(calls[0].tenant_id, "tenant");
  assert.equal(calls[0].limit, 10);
  assert.match(calls[0].worker_id, /^outlook-conversation-maintenance:[a-f0-9-]{36}$/u);
});

test("OUTM-26~28 Lambda routes only the dedicated direct-invoke maintenance action", async () => {
  let runtimeCalls = 0;
  const options = {
    env: { LAWOS_IDENTITY_TENANT_ID: "tenant" },
    runtime_factory: async () => {
      runtimeCalls += 1;
      return {
        outlookConversationRuntime: {
          maintenance_worker: { async runOnce() { return { message_jobs: { claimed: 0 } }; } },
        },
      };
    },
  };
  assert.equal(await handleOutlookConversationMaintenanceEvent({ maintenance_action: "other" }, options), null);
  assert.equal(runtimeCalls, 0);
  const http = await handleOutlookConversationMaintenanceEvent({
    rawPath: "/api/maintenance/outlook-conversation",
    lawos_maintenance_action: LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
  }, options);
  assert.equal(http.statusCode, 400);
  assert.equal(JSON.parse(http.body).public_http_endpoint, false);
  assert.equal(runtimeCalls, 0);
  const result = await handleOutlookConversationMaintenanceEvent({
    lawos_maintenance_action: LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
  }, options);
  assert.equal(result.worker, LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION);
  assert.equal(runtimeCalls, 1);
});
