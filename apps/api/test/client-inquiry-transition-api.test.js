import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = "tenant_cmp_g6_synthetic";
const LEAD_ID = "lead_cmp_g6_synthetic_001";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-client-inquiry-api-t01-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

const sessionHeaderCache = new Map();

async function signedHeaders(baseUrl) {
  if (!sessionHeaderCache.has(baseUrl)) {
    sessionHeaderCache.set(baseUrl, await apiSessionHeaders(baseUrl));
  }
  return sessionHeaderCache.get(baseUrl);
}

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(await signedHeaders(baseUrl)),
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: await response.json() };
}

function transitionBody(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "client-inquiry-transition-write",
    audit_hint_ref: "client-inquiry-transition-audit",
    next_inquiry_status: "reviewing",
    expected_version: 1,
    next_action: "상담 일정 확인",
    reason: "문의 내용을 확인함",
    idempotency_key: "client-inquiry-transition-1",
    ...overrides,
  };
}

test("CL-P3-W02-T01 실제 CRM API는 문의 상태 전환 endpoint와 canonical Lead 필드를 제공한다", async (t) => {
  const root = fixtureRoot(t);
  const crmStorePath = join(root, "crm.json");

  await withServer({ crmStorePath }, async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const crm = health.body.bounded_contexts.find(
      (context) => context.bounded_context === "crm-intake",
    );
    assert.ok(crm.endpoints.includes("POST /api/crm/inquiries/:id/transitions"));

    const first = await json(
      baseUrl,
      `/api/crm/inquiries/${LEAD_ID}/transitions`,
      { method: "POST", body: transitionBody() },
    );
    assert.equal(first.status, 200);
    assert.equal(first.body.outcome, "updated");
    assert.equal(first.body.item.inquiry_status, "reviewing");
    assert.equal(first.body.item.source, "manual");
    assert.equal(first.body.item.received_at, "2026-07-30T00:00:00.000Z");
    assert.equal(first.body.item.next_action, "상담 일정 확인");
    assert.equal(first.body.item.version, 2);
    assert.equal("lead_source" in first.body.item, false);
    assert.equal(first.body.audit_event.action, "crm.inquiry.transition");
    assert.equal(
      JSON.stringify(first.body.audit_event).includes("상담 일정 확인"),
      false,
    );

    const replay = await json(
      baseUrl,
      `/api/crm/inquiries/${LEAD_ID}/transitions`,
      { method: "POST", body: transitionBody() },
    );
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);
    assert.equal(replay.body.item.version, 2);

    const forbidden = await json(
      baseUrl,
      `/api/crm/inquiries/${LEAD_ID}/transitions`,
      {
        method: "POST",
        body: transitionBody({
          next_inquiry_status: "new",
          expected_version: 2,
          next_action: "문의 확인",
          idempotency_key: "client-inquiry-transition-forbidden",
        }),
      },
    );
    assert.equal(forbidden.status, 409);
    assert.deepEqual(
      forbidden.body.safe_error_codes,
      ["CRM_INQUIRY_TRANSITION_INVALID"],
    );

    const stale = await json(
      baseUrl,
      `/api/crm/inquiries/${LEAD_ID}/transitions`,
      {
        method: "POST",
        body: transitionBody({
          next_inquiry_status: "closed",
          next_action: null,
          idempotency_key: "client-inquiry-transition-stale",
        }),
      },
    );
    assert.equal(stale.status, 409);
    assert.deepEqual(
      stale.body.safe_error_codes,
      ["CRM_INQUIRY_VERSION_CONFLICT"],
    );

    const keyConflict = await json(
      baseUrl,
      `/api/crm/inquiries/${LEAD_ID}/transitions`,
      {
        method: "POST",
        body: transitionBody({ next_action: "다른 다음 행동" }),
      },
    );
    assert.equal(keyConflict.status, 409);
    assert.deepEqual(
      keyConflict.body.safe_error_codes,
      ["CRM_INQUIRY_IDEMPOTENCY_CONFLICT"],
    );

    const crossTenant = await json(
      baseUrl,
      `/api/crm/inquiries/${LEAD_ID}/transitions`,
      {
        method: "POST",
        body: transitionBody({
          tenant_id: "tenant_not_signed",
          idempotency_key: "client-inquiry-transition-cross-tenant",
        }),
      },
    );
    assert.equal(crossTenant.status, 403);
    assert.deepEqual(
      crossTenant.body.safe_error_codes,
      ["CRM_INTAKE_UNAUTHORIZED_OMISSION"],
    );

    const leads = await json(
      baseUrl,
      `/api/crm/leads?tenant_id=${TENANT}&permission_ref=client-inquiry-read&audit_hint_ref=client-inquiry-read`,
    );
    const lead = leads.body.items.find(({ lead_id }) => lead_id === LEAD_ID);
    assert.equal(lead.inquiry_status, "reviewing");
    assert.equal(lead.version, 2);
  });
});
