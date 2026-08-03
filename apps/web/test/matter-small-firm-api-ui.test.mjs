import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
  createMatterWorktree,
  createMatterOpsMeeting,
  createMatterOpsTimeEntry,
  fetchMatterOpsCalendar,
  fetchMatterOpsCloseout,
  fetchMatterOpsDetail,
  fetchMatterOpsFollowups,
  fetchMatterOpsReportCsv,
  fetchMatterOpsTasks,
  fetchMatterOpsTimeBilling,
  fetchMatterOpsToday,
  patchMatterOpsTask,
  restoreMatterOpsMatter,
  uploadVaultDocumentFile
} from "../src/data/apiClient.js";

const ORIGINAL_SESSION_CONTEXT = globalThis.__LAWOS_SESSION_CONTEXT__;
const MATTER_TEST_TENANT = "tenant-matter-session-fixture";
const VAULT_TEST_TENANT = "tenant-vault-session-fixture";

function signedSession(tenantRefs = { matter: MATTER_TEST_TENANT, vault: VAULT_TEST_TENANT }) {
  return {
    schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
    state: "signed_in",
    session_ref: "session-matter-api-observable",
    source: "api_signed_session",
    actor_ref: "actor-matter-api-observable",
    tenant_refs: tenantRefs,
    role_ids: ["matter_runtime_user"],
    scopes: [],
    review_state: "allow"
  };
}

test.beforeEach(() => {
  globalThis.__LAWOS_SESSION_CONTEXT__ = signedSession();
});

test.afterEach(() => {
  if (ORIGINAL_SESSION_CONTEXT === undefined) delete globalThis.__LAWOS_SESSION_CONTEXT__;
  else globalThis.__LAWOS_SESSION_CONTEXT__ = ORIGINAL_SESSION_CONTEXT;
});

test("canonical Matter operations reads call their authenticated HTTP paths and preserve UI states", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    let body = { request_id: "req", outcome: "passed", safe_error_codes: [], audit_hint_ref: "audit", ui_state: "ready" };
    if (url.includes("/today")) body.item = { lanes: [] };
    else if (url.includes("/tasks")) body.items = [{ id: "task-1" }];
    else if (url.includes("/calendar")) body.items = [{ event_id: "event-1" }];
    else if (url.includes("/followups")) body.items = [{ followup_id: "followup-1" }];
    else if (url.includes("/time-billing")) {
      body.item = { time_entries: [] };
      body.ui_state = "empty";
    } else if (url.includes("/closeout")) {
      body.items = [{ blocker_id: "blocker-1" }];
      body.count = 1;
      body.can_close = false;
    } else {
      body.items = [];
      body.ui_state = "denied";
    }
    return new Response(JSON.stringify(body), {
      status: body.ui_state === "denied" ? 403 : 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    assert.equal((await fetchMatterOpsToday()).kind, "data");
    assert.deepEqual((await fetchMatterOpsTasks({ view: "overdue" })).items, [{ id: "task-1" }]);
    assert.deepEqual((await fetchMatterOpsCalendar()).items, [{ event_id: "event-1" }]);
    assert.deepEqual((await fetchMatterOpsFollowups({ view: "stale_7d" })).items, [{ followup_id: "followup-1" }]);
    assert.equal((await fetchMatterOpsTimeBilling()).kind, "empty");
    assert.equal((await fetchMatterOpsCloseout({ matterId: "matter-1" })).canClose, false);
    assert.equal((await fetchMatterOpsDetail({ matterId: "matter/한글" })).uiState, "denied");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.match(calls[1].url, /\/api\/matter\/ops\/tasks\?view=overdue&/);
  assert.match(calls[3].url, /\/api\/matter\/ops\/followups\?view=stale_7d&/);
  assert.match(calls[6].url, /\/api\/matter\/ops\/matters\/matter%2F%ED%95%9C%EA%B8%80\?/);
  for (const call of calls) {
    assert.equal(new URL(call.url, "http://local").searchParams.get("tenant_id"), MATTER_TEST_TENANT);
    assert.ok(call.init.headers["x-lawos-permission-context"]);
  }
});

test("Matter operations mutations send only the fixed ledger payloads and return mapped items", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), method: init.method, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({
      request_id: "mutation",
      outcome: "passed",
      item: { id: `item-${calls.length}` },
      safe_error_codes: [],
      audit_hint_ref: "audit",
      ui_state: "ready"
    }), {
      status: init.method === "POST" ? 201 : 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    assert.equal((await patchMatterOpsTask({
      taskId: "task/1",
      matterId: "matter-1",
      status: "blocked",
      reason: "의뢰인 서명본 대기"
    })).kind, "data");
    assert.equal((await createMatterOpsTimeEntry({
      matterId: "matter-1",
      roleId: "partner",
      workDate: "2026-07-30",
      durationMinutes: 45,
      narrative: "계약서 검토",
      billable: true
    })).kind, "data");
    assert.equal((await createMatterOpsMeeting({
      matterId: "matter-1",
      title: "주간 사건 회의",
      attendeeIds: ["user-1", "user-2"],
      decisions: ["준비서면 초안 작성"],
      followUpTaskIds: ["task-1"]
    })).kind, "data");
    assert.equal((await restoreMatterOpsMatter({ matterId: "matter-1" })).kind, "data");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[0].method, "PATCH");
  assert.match(calls[0].url, /\/tasks\/task%2F1\?tenant_id=/);
  assert.deepEqual(
    Object.keys(calls[0].body).sort(),
    ["idempotency_key", "matter_id", "reason", "status"].sort()
  );
  assert.equal(calls[0].body.reason, "의뢰인 서명본 대기");
  assert.deepEqual(
    Object.keys(calls[1].body.time_entry).sort(),
    ["billable", "duration_minutes", "matter_id", "narrative", "role_id", "time_entry_id", "work_date"].sort()
  );
  assert.deepEqual(calls[2].body.meeting.attendee_ids, ["user-1", "user-2"]);
  assert.deepEqual(calls[2].body.meeting.follow_up_task_ids, ["task-1"]);
  assert.equal(calls[3].body.target_status, "closed");
  for (const call of calls) {
    assert.equal("actor_id" in call.body, false);
    assert.equal("tenant_id" in call.body, false);
  }
});

test("task status payloads omit reasons unless the caller supplies the exact reason", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_input, init = {}) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({
      request_id: "task-reason",
      outcome: "passed",
      item: { task_id: "task-1" },
      safe_error_codes: [],
      audit_hint_ref: "audit",
      ui_state: "ready"
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    await patchMatterOpsTask({
      taskId: "task-1",
      matterId: "matter-1",
      status: "done"
    });
    await patchMatterOpsTask({
      taskId: "task-1",
      matterId: "matter-1",
      status: "blocked",
      reason: "법원 송달 원본을 기다리는 중"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal("reason" in calls[0], false);
  assert.equal("blocked_reason" in calls[0], false);
  assert.equal(calls[1].reason, "법원 송달 원본을 기다리는 중");
  assert.equal("blocked_reason" in calls[1], false);
});

test("weekly operations CSV uses the authenticated API client instead of an unauthenticated anchor", async () => {
  const originalFetch = globalThis.fetch;
  let call;
  globalThis.fetch = async (input, init = {}) => {
    call = { url: String(input), init };
    return new Response("row_type,question_id,count\nquestion,overdue_deadlines,2\n", {
      status: 200,
      headers: { "content-type": "text/csv; charset=utf-8" }
    });
  };
  try {
    const result = await fetchMatterOpsReportCsv();
    assert.equal(result.kind, "data");
    assert.match(result.csv, /overdue_deadlines,2/);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(call.url, /\/api\/matter\/ops\/report\.csv\?tenant_id=/);
  assert.ok(call.init.headers["x-lawos-permission-context"]);
});

test("validated session tenants isolate Matter bodies and multipart Vault uploads", async () => {
  const originalFetch = globalThis.fetch;
  const originalSession = globalThis.__LAWOS_SESSION_CONTEXT__;
  const matterTenant = "tenant-matter-session-test";
  const vaultTenant = "tenant-vault-session-test";
  const calls = [];
  globalThis.__LAWOS_SESSION_CONTEXT__ = {
    schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
    state: "signed_in",
    session_ref: "session-tenant-boundary-test",
    source: "api_signed_session",
    actor_ref: "actor-tenant-boundary-test",
    tenant_refs: { default: "tenant-default-session-test", matter: matterTenant, vault: vaultTenant },
    role_ids: ["matter_runtime_user"],
    scopes: [],
    review_state: "allow"
  };
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ input: String(input), init });
    if (String(input).includes("/api/vault/documents/upload")) {
      return new Response(JSON.stringify({
        request_id: "vault-upload-tenant-boundary",
        outcome: "passed",
        item: { document_id: "document-tenant-boundary", document_bytes_included: false },
        file_object: { sha256: "a".repeat(64), byte_size: 8, mime_type: "text/plain" },
        safe_error_codes: []
      }), { status: 201, headers: { "content-type": "application/json" } });
    }
    if (String(input).includes("/worktree")) {
      return new Response(JSON.stringify({
        request_id: "worktree-tenant-boundary",
        outcome: "passed",
        ui_state: "data",
        item: { worktree_id: "worktree-tenant-boundary", nodes: [] },
        safe_error_codes: []
      }), { status: 201, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({
      request_id: "matter-read-tenant-boundary",
      outcome: "passed",
      ui_state: "empty",
      item: null,
      safe_error_codes: []
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    await fetchMatterOpsToday();
    const worktree = await createMatterWorktree({
      matterId: "matter-tenant-boundary",
      payload: {
        tenant_id: "tenant-caller-cross-scope",
        nested: { tenant_id: "tenant-caller-cross-scope" }
      }
    });
    assert.equal(worktree.kind, "data");
    const upload = await uploadVaultDocumentFile({
      file: new File(["boundary"], "boundary.txt", { type: "text/plain" })
    });
    assert.equal(upload.kind, "data");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSession === undefined) delete globalThis.__LAWOS_SESSION_CONTEXT__;
    else globalThis.__LAWOS_SESSION_CONTEXT__ = originalSession;
  }

  assert.equal(new URL(calls[0].input, "http://local").searchParams.get("tenant_id"), matterTenant);
  const worktreeBody = JSON.parse(calls[1].init.body);
  assert.equal(worktreeBody.tenant_id, matterTenant);
  assert.equal(worktreeBody.nested.tenant_id, matterTenant);
  const uploadForm = calls[2].init.body;
  assert.equal(uploadForm.get("tenant_id"), vaultTenant);
  assert.equal(JSON.parse(uploadForm.get("document")).tenant_id, vaultTenant);
});

test("Matter, Worktree, and Vault transports make zero requests without their exact valid tenant", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    throw new Error("tenant boundary must block before fetch");
  };
  const invalidContexts = [
    null,
    { ...signedSession(), schema_version: "invalid-session-envelope" },
    { ...signedSession(), expires_at: "2000-01-01T00:00:00.000Z" },
    { ...signedSession(), expires_at: "not-a-timestamp" },
    signedSession({ default: "tenant-default-cross-scope", vault: VAULT_TEST_TENANT })
  ];

  try {
    for (const context of invalidContexts) {
      if (context) globalThis.__LAWOS_SESSION_CONTEXT__ = context;
      else delete globalThis.__LAWOS_SESSION_CONTEXT__;
      assert.equal((await fetchMatterOpsToday()).kind, "error");
      assert.equal((await createMatterWorktree({
        matterId: "matter-blocked",
        payload: { tenant_id: "tenant-caller-cross-scope" }
      })).kind, "error");
    }
    globalThis.__LAWOS_SESSION_CONTEXT__ = signedSession({ matter: MATTER_TEST_TENANT });
    assert.equal((await uploadVaultDocumentFile({
      file: new File(["blocked"], "blocked.txt", { type: "text/plain" })
    })).kind, "error");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(requestCount, 0);
});
