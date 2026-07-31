import assert from "node:assert/strict";
import test from "node:test";

import { handoffCrmOpportunityToIntake } from "../src/data/apiClient.js";

function response(body, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("수임 현황 핸드오프의 결정적 키는 ID 구두점·긴 공통 접두사를 보존하고 재시도에 안정적이다", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    calls.push({
      input: String(input),
      body: JSON.parse(init.body)
    });
    return response({
      outcome: "created",
      item: { intake_request_id: calls.at(-1).body.intake_request_id },
      opportunity: { opportunity_id: calls.at(-1).body.opportunity_id ?? "" },
      safe_error_codes: []
    });
  };

  try {
    const ids = [
      "opp:a",
      "opp.a",
      "opp/a",
      `opp-${"x".repeat(80)}-one`,
      `opp-${"x".repeat(80)}-two`
    ];
    for (const opportunityId of ids) {
      await handoffCrmOpportunityToIntake({ opportunityId });
    }
    const firstRequestBodies = calls.map(({ body }) => body);
    assert.equal(new Set(firstRequestBodies.map(({ idempotency_key }) => idempotency_key)).size, ids.length);
    assert.equal(new Set(firstRequestBodies.map(({ intake_request_id }) => intake_request_id)).size, ids.length);
    assert.deepEqual(
      firstRequestBodies.slice(0, 3).map(({ idempotency_key }) => idempotency_key),
      ["handoff:opportunity_opp%3Aa", "handoff:opportunity_opp.a", "handoff:opportunity_opp%2Fa"]
    );
    assert.notEqual(firstRequestBodies[3].idempotency_key, firstRequestBodies[4].idempotency_key);
    assert.notEqual(firstRequestBodies[3].intake_request_id, firstRequestBodies[4].intake_request_id);

    await handoffCrmOpportunityToIntake({ opportunityId: ids[0] });
    const retryBody = calls.at(-1).body;
    assert.equal(retryBody.idempotency_key, firstRequestBodies[0].idempotency_key);
    assert.equal(retryBody.intake_request_id, firstRequestBodies[0].intake_request_id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("수임 현황 핸드오프는 호출자가 준 재시도 키를 그대로 사용한다", async () => {
  const originalFetch = globalThis.fetch;
  let body;
  globalThis.fetch = async (_input, init = {}) => {
    body = JSON.parse(init.body);
    return response({ outcome: "created", item: null, opportunity: null, safe_error_codes: [] });
  };
  try {
    await handoffCrmOpportunityToIntake({
      opportunityId: "opp:caller-key",
      intakeRequestId: "intake:caller-key",
      idempotencyKey: "handoff:caller-key"
    });
    assert.equal(body.intake_request_id, "intake:caller-key");
    assert.equal(body.idempotency_key, "handoff:caller-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("잘못된 UTF-16 Opportunity ID는 대체값으로 합치지 않고 요청 전에 거절한다", () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("fetch should not run");
  };
  try {
    assert.throws(
      () => handoffCrmOpportunityToIntake({ opportunityId: "opp-\uD800" }),
      URIError
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
