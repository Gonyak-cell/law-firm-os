// Deterministic in-process tests for the Master Data bounded context.
// The server is started on an ephemeral 127.0.0.1 port; no other network use.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { AMIC_CURRENT_CLIENT_CANDIDATES } from "../../../packages/master-data/src/index.js";

const TENANT = "tenant_rp04_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&actor_user_id=user_rp04_owner&permission_ref=perm_ref_rp04_read&audit_hint_ref=audit_hint_rp04_read`;

let server;
let baseUrl;

function allowContext(overrides = {}) {
  return JSON.stringify({
    principal: { user_id: "user_rp04_owner", tenant_id: TENANT, role_ids: ["master_data_reader"] },
    rules: [{ id: "rule_allow_read", effect: "allow", action: "*" }],
    object_acl: [],
    ...overrides,
  });
}

async function get(path, contextHeader) {
  const headers = {};
  if (contextHeader !== undefined) headers[PERMISSION_CONTEXT_HEADER] = contextHeader;
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("GET /api/health returns the service descriptor without permission context", async () => {
  const { status, body } = await get("/api/health");
  assert.equal(status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "@law-firm-os/api");
  assert.equal(body.synthetic_only, false);
  assert.equal(body.uses_real_client_data, true);
  assert.equal(body.permission_gate.default_decision, "deny");
  assert.equal(body.permission_gate.fail_closed, true);
  assert.deepEqual(body.permission_gate.decision_order.at(-1), "fail_closed_no_match");
  assert.equal(body.bounded_contexts[0].bounded_context, "master-data");
  assert.equal(body.bounded_contexts[0].contract_schema_version, "law-firm-os.master-data-contract.v0.21");
});

test("desktop file-origin API calls receive CORS headers and preflight success", async () => {
  const options = await fetch(`${baseUrl}/master-data/records?${BASE_QUERY}`, {
    method: "OPTIONS",
    headers: {
      origin: "null",
      "access-control-request-method": "GET",
      "access-control-request-headers": PERMISSION_CONTEXT_HEADER
    }
  });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("access-control-allow-origin"), "*");
  assert.match(options.headers.get("access-control-allow-headers") ?? "", new RegExp(PERMISSION_CONTEXT_HEADER));

  const response = await fetch(`${baseUrl}/api/health`, { headers: { origin: "null" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
});

test("records happy path returns tenant-scoped AMIC items with matter-core enrichment", async () => {
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}`, allowContext());
  assert.equal(status, 200);
  assert.equal(body.outcome, "passed");
  assert.equal(body.items.length, 25);
  assert.equal(body.page_info.returned_count, 25);
  assert.equal(body.page_info.omitted_item_count, 0);
  assert.equal(body.audit_hint_ref, "audit_hint_rp04_read");
  for (const item of body.items) {
    assert.equal(item.tenant_id, TENANT);
    assert.equal(item.matter_core_enrichment.runtime_seed_crosswalk, true);
    assert.equal(item.matter_core_enrichment.matter_id, "matter_rp05_synthetic_opening");
  }
});

test("ClientGroup records include current AMIC client names without legacy archive rows", async () => {
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}&model_type=ClientGroup&limit=100`, allowContext());
  assert.equal(status, 200);
  assert.equal(body.outcome, "passed");
  assert.equal(body.items.length, 100);
  assert.equal(body.page_info.next_cursor, "100");
  const nextPage = await get(`/master-data/records?${BASE_QUERY}&model_type=ClientGroup&limit=100&cursor=100`, allowContext());
  assert.equal(nextPage.status, 200);
  assert.equal(nextPage.body.outcome, "passed");
  assert.equal(nextPage.body.items.length, AMIC_CURRENT_CLIENT_CANDIDATES.length + 1 - 100);
  assert.equal(nextPage.body.page_info.next_cursor, null);
  const allItems = [...body.items, ...nextPage.body.items];
  const currentClientItems = allItems.filter((item) => item.client_source_ref === "amic_current_onedrive_folder_inventory_2026_07_01");
  assert.equal(currentClientItems.length, AMIC_CURRENT_CLIENT_CANDIDATES.length);
  const names = currentClientItems.map((item) => item.display_name);
  assert.ok(names.includes("고구려푸드"));
  assert.ok(names.includes("하이로닉"));
  assert.equal(names.includes("고구려푸드 주식회사"), false);
  assert.equal(names.some((name) => /선생님|원장님|회장님|교수님|작가|강제집행면탈|조세범|^Pjt\.|^Project\b/.test(name)), false);
  for (const expectedName of ["송수연", "한승민", "허유지", "장정도", "강영권", "임인홍", "황진수"]) {
    assert.ok(names.includes(expectedName));
  }
  for (const expectedName of [
    "홀딩핸즈앤코 외 12명",
    "한흥수 외 6명",
    "노윤현 외 19명",
    "최재헌 외 2명",
    "이강명 외 1명",
    "강상도 외 16명",
    "박민규 외 5명",
    "권도균 외 11명",
    "펜타스톤-오라이언-온앤업 신기술투자조합",
    "봉경환 외 4명",
    "박태오",
    "SMEJ Holdings, INC. 외 1명",
    "롯데에너지머티리얼즈",
    "김정환",
    "오윤록 외 1명",
    "에이치엘엘중앙",
  ]) {
    assert.ok(names.includes(expectedName));
  }
  for (const removedProjectSellerName of ["코오롱글로텍", "강상도", "Katelynn Yun-Yu Owyang", "SMEJ Holdings, INC.", "에스엠스튜디오스"]) {
    assert.equal(names.includes(removedProjectSellerName), false);
  }
  const goguryeo = allItems.find((item) => item.display_name === "고구려푸드");
  assert.equal(goguryeo.legal_form, "주식회사");
  assert.equal(goguryeo.canonical_display_name, "고구려푸드 주식회사");
  assert.equal(goguryeo.client_source_ref, "amic_current_onedrive_folder_inventory_2026_07_01");
  assert.equal(goguryeo.source_lanes.some((lane) => lane.startsWith("999_")), false);
  const lotteEnergyMaterials = allItems.find((item) => item.display_name === "롯데에너지머티리얼즈");
  assert.equal(lotteEnergyMaterials.legal_form, "주식회사");
  assert.equal(lotteEnergyMaterials.canonical_display_name, "롯데에너지머티리얼즈 주식회사");
  const hllJoongang = allItems.find((item) => item.display_name === "에이치엘엘중앙");
  assert.equal(hllJoongang.legal_form, "주식회사");
  assert.equal(hllJoongang.canonical_display_name, "에이치엘엘중앙 주식회사");
  assert.equal(AMIC_CURRENT_CLIENT_CANDIDATES.length, 108);
});

test("records model_type filter and cursor pagination are deterministic", async () => {
  const first = await get(`/master-data/records?${BASE_QUERY}&model_type=Entity&limit=1`, allowContext());
  assert.equal(first.status, 200);
  assert.equal(first.body.items.length, 1);
  assert.equal(first.body.page_info.next_cursor, "1");
  const second = await get(
    `/master-data/records?${BASE_QUERY}&model_type=Entity&limit=1&cursor=1`,
    allowContext(),
  );
  assert.equal(second.body.items.length, 1);
  assert.equal(second.body.page_info.next_cursor, "2");
  assert.notEqual(first.body.items[0].entity_id, second.body.items[0].entity_id);
});

test("records empty state: zero matches yields ui_state empty per UI-state catalog", async () => {
  const filters = encodeURIComponent(JSON.stringify({ status: "archived" }));
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}&filters=${filters}`, allowContext());
  assert.equal(status, 200);
  assert.equal(body.outcome, "passed");
  assert.deepEqual(body.items, []);
  assert.equal(body.ui_state, "empty");
  assert.deepEqual(body.safe_error_codes, []);
});

test("missing permission context fails closed: denied with safe error codes only", async () => {
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}`);
  assert.equal(status, 403);
  assert.equal(body.outcome, "blocked");
  assert.deepEqual(body.items, []);
  assert.deepEqual(body.safe_error_codes, ["MASTER_DATA_API_UNAUTHORIZED_OMISSION"]);
  assert.equal(body.ui_state, "denied");
});

test("malformed permission context header also fails closed", async () => {
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}`, "{not json");
  assert.equal(status, 403);
  assert.deepEqual(body.safe_error_codes, ["MASTER_DATA_API_UNAUTHORIZED_OMISSION"]);
});

test("context without matching allow rule fails closed (fail_closed_no_match)", async () => {
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}`, allowContext({ rules: [] }));
  assert.equal(status, 403);
  assert.equal(body.outcome, "blocked");
  assert.equal(body.ui_state, "denied");
});

test("cross-tenant principal is denied (cross_tenant_deny precedes allow)", async () => {
  const context = JSON.stringify({
    principal: { user_id: "user_other", tenant_id: "tenant_other", role_ids: [] },
    rules: [{ id: "rule_allow_read", effect: "allow", action: "*" }],
    object_acl: [],
  });
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}`, context);
  assert.equal(status, 403);
  assert.deepEqual(body.safe_error_codes, ["MASTER_DATA_API_UNAUTHORIZED_OMISSION"]);
});

test("review_required rule yields review badge outcome without items or dispatch", async () => {
  const context = allowContext({
    rules: [{ id: "rule_review", effect: "review_required", action: "search" }],
  });
  const { status, body } = await get(`/master-data/records?${BASE_QUERY}`, context);
  assert.equal(status, 200);
  assert.equal(body.outcome, "review_required");
  assert.deepEqual(body.items, []);
  assert.deepEqual(body.safe_error_codes, ["MASTER_DATA_REVIEW_REQUIRED"]);
  assert.equal(body.ui_state, "review_required");
});

test("approval_required rule yields approval outcome without items", async () => {
  const context = allowContext({
    rules: [{ id: "rule_approval", effect: "approval_required", action: "search" }],
  });
  const { body } = await get(`/master-data/records?${BASE_QUERY}`, context);
  assert.equal(body.outcome, "approval_required");
  assert.deepEqual(body.safe_error_codes, ["MASTER_DATA_APPROVAL_REQUIRED"]);
});

test("error taxonomy: tenant, permission_ref, audit_hint_ref, filter, and validation codes", async () => {
  const noTenant = await get(
    "/master-data/records?permission_ref=p&audit_hint_ref=a",
    allowContext(),
  );
  assert.equal(noTenant.status, 400);
  assert.deepEqual(noTenant.body.safe_error_codes, ["MASTER_DATA_API_TENANT_REQUIRED"]);

  const noPermissionRef = await get(
    `/master-data/records?tenant_id=${TENANT}&audit_hint_ref=a`,
    allowContext(),
  );
  assert.deepEqual(noPermissionRef.body.safe_error_codes, ["MASTER_DATA_API_PERMISSION_REF_REQUIRED"]);

  const noAuditHint = await get(
    `/master-data/records?tenant_id=${TENANT}&permission_ref=p`,
    allowContext(),
  );
  assert.deepEqual(noAuditHint.body.safe_error_codes, ["MASTER_DATA_API_AUDIT_HINT_REQUIRED"]);

  const badFilter = await get(
    `/master-data/records?${BASE_QUERY}&filters=${encodeURIComponent('{"secret_probe":"x"}')}`,
    allowContext(),
  );
  assert.equal(badFilter.status, 400);
  assert.deepEqual(badFilter.body.safe_error_codes, ["MASTER_DATA_API_UNSUPPORTED_FILTER"]);

  const badLimit = await get(`/master-data/records?${BASE_QUERY}&limit=abc`, allowContext());
  assert.equal(badLimit.status, 400);
  assert.deepEqual(badLimit.body.safe_error_codes, ["MASTER_DATA_API_VALIDATION_ERROR"]);

  for (const response of [noTenant, noPermissionRef, noAuditHint, badFilter, badLimit]) {
    assert.equal(response.body.outcome, "blocked");
    assert.deepEqual(response.body.items, []);
    assert.ok(Array.isArray(response.body.safe_error_codes));
    assert.ok("request_id" in response.body);
    assert.ok("omitted_fields" in response.body);
  }
});

test("relationship lookup happy path serves the synthetic relationship row", async () => {
  const { status, body } = await get(`/master-data/relationships?${BASE_QUERY}`, allowContext());
  assert.equal(status, 200);
  assert.equal(body.outcome, "passed");
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].model_type, "Relationship");
  assert.equal(body.items[0].direction, "person_to_organization");
});

test("client group resolution returns review_required badge for the synthetic group", async () => {
  const { status, body } = await get(
    `/master-data/client-groups/client_group_rp04_amic?${BASE_QUERY}`,
    allowContext(),
  );
  assert.equal(status, 200);
  assert.equal(body.outcome, "review_required");
  assert.equal(body.ui_state, "review_required");
  assert.deepEqual(body.safe_error_codes, ["MASTER_DATA_REVIEW_REQUIRED"]);
  assert.equal(body.items[0].client_group_id, "client_group_rp04_amic");
  assert.equal(body.items[0].members.length, 2);
  assert.ok(body.items[0].members.every((member) => member.display_name));
});

test("unknown client group resolves to empty state without existence leak", async () => {
  const { status, body } = await get(
    `/master-data/client-groups/client_group_does_not_exist?${BASE_QUERY}`,
    allowContext(),
  );
  assert.equal(status, 404);
  assert.deepEqual(body.items, []);
  assert.equal(body.ui_state, "empty");
  assert.deepEqual(body.safe_error_codes, []);
});

test("hidden source fields never appear in serialized items", async () => {
  const { body } = await get(`/master-data/records?${BASE_QUERY}`, allowContext());
  const forbidden = ["bank_account_number", "secret", "credential", "access_token", "private_key"];
  for (const item of body.items) {
    for (const key of forbidden) assert.ok(!(key in item), `${key} leaked`);
  }
});

test("unknown routes 404 and non-GET methods 405 with JSON bodies", async () => {
  const notFound = await get("/master-data/unknown", allowContext());
  assert.equal(notFound.status, 404);
  assert.equal(notFound.body.error, "not_found");

  const res = await fetch(`${baseUrl}/master-data/records`, { method: "POST" });
  assert.equal(res.status, 405);
  const body = await res.json();
  assert.equal(body.error, "method_not_allowed");
});
