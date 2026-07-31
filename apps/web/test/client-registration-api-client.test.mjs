import assert from "node:assert/strict";
import test from "node:test";

import { createClientGroup, reviewClientGroup } from "../src/data/apiClient.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("client group adapters send the fixed review/create contract", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ input: String(input), init, body: JSON.parse(init.body) });
    if (String(input).endsWith("/review")) {
      return response({
        outcome: "passed",
        item: {
          review_digest: "digest-1",
          candidates: [],
          has_restricted_candidates: false,
          can_create: true,
          requires_distinct_confirmation: false
        },
        safe_error_codes: []
      });
    }
    return response({
      outcome: "passed",
      item: {
        client_group_id: "client-1",
        display_name: "김민수",
        client_type: "person",
        depositor_alias_saved: true,
        registration_number_saved: false,
        contact_saved: true
      },
      replayed: false,
      safe_error_codes: []
    }, 201);
  };
  try {
    const client = {
      client_type: "person",
      display_name: "김민수",
      email: "minsu@example.test",
      depositor_alias: "김민수"
    };
    const review = await reviewClientGroup({ client, idempotencyKey: "review-key" });
    assert.equal(review.kind, "data");
    assert.equal(calls[0].input, "/master-data/client-groups/review");
    assert.deepEqual(calls[0].body.client, client);
    assert.equal(calls[0].body.idempotency_key, "review-key");
    assert.equal(typeof calls[0].body.tenant_id, "string");
    assert.equal(typeof calls[0].body.permission_ref, "string");
    assert.equal(typeof calls[0].body.audit_hint_ref, "string");

    const created = await createClientGroup({
      client,
      reviewDigest: "digest-1",
      confirmDistinctClient: true,
      idempotencyKey: "create-key"
    });
    assert.equal(created.kind, "data");
    assert.equal(calls[1].input, "/master-data/client-groups");
    assert.equal(calls[1].body.review_digest, "digest-1");
    assert.equal(calls[1].body.confirm_distinct_client, true);
    assert.equal(calls[1].body.idempotency_key, "create-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("client group adapters fail closed on malformed and denied responses", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => response({ outcome: "passed", safe_error_codes: [] });
    const malformed = await reviewClientGroup({
      client: { client_type: "person", display_name: "김민수" }
    });
    assert.equal(malformed.kind, "error");

    globalThis.fetch = async () => response({
      outcome: "denied",
      ui_state: "denied",
      safe_error_codes: ["CLIENT_GROUP_PERMISSION_DENIED"]
    }, 403);
    const denied = await reviewClientGroup({
      client: { client_type: "person", display_name: "김민수" }
    });
    assert.equal(denied.kind, "guarded");
    assert.equal(denied.uiState, "denied");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
