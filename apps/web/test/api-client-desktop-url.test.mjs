import assert from "node:assert/strict";
import test from "node:test";

test("desktop file renderer can route Matter API calls through handoff query fallback", async () => {
  const calls = [];
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;

  globalThis.window = {
    location: {
      protocol: "file:",
      search: "?desktop=1&desktop_api_base_url=http%3A%2F%2F127.0.0.1%3A52016",
    },
    matterSession: {},
  };
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return {
      json: async () => ({
        request_id: "req_desktop_matter_list",
        outcome: "passed",
        items: [{ matter_id: "matter_rp05_synthetic_opening" }],
        page_info: { returned_count: 1 },
        safe_error_codes: [],
        audit_hint_ref: "ui_cmp_g4_matter_probe",
        ui_state: null,
        count_leak_prevented: true,
        production_ready_claim: false,
      }),
    };
  };

  try {
    const mod = await import(`../src/data/apiClient.js?desktop-query-fallback=${Date.now()}`);
    const result = await mod.fetchMatterRecords();

    assert.equal(result.kind, "data");
    assert.equal(result.items[0].matter_id, "matter_rp05_synthetic_opening");
    assert.equal(calls.length, 1);
    assert.match(calls[0].input, /^http:\/\/127\.0\.0\.1:52016\/api\/matters\?/);
    assert.match(calls[0].init.headers["x-lawos-permission-context"], /matter_runtime_user/);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

test("packaged matter-app renderer routes signed Matter API calls through the main-process bridge", async () => {
  const bridgeCalls = [];
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;

  globalThis.window = {
    location: {
      protocol: "matter-app:",
      hostname: "app",
      port: "",
      username: "",
      password: "",
      search: "?desktop=1",
    },
    matterSession: {
      async api(input) {
        bridgeCalls.push(input);
        return {
          http_status: 200,
          body: {
            request_id: "req_packaged_matter_list",
            outcome: "passed",
            items: [{ matter_id: "matter_packaged_synthetic" }],
            page_info: { returned_count: 1 },
            safe_error_codes: [],
            audit_hint_ref: "packaged_matter_probe",
            ui_state: "populated",
            count_leak_prevented: true,
            production_ready_claim: false,
          },
        };
      },
    },
  };
  globalThis.fetch = async () => {
    throw new Error("packaged renderer must not bypass the main-process bridge");
  };

  try {
    const mod = await import(`../src/data/apiClient.js?matter-app-bridge=${Date.now()}`);
    const result = await mod.fetchMatterRecords();

    assert.equal(result.kind, "data");
    assert.equal(result.items[0].matter_id, "matter_packaged_synthetic");
    assert.equal(bridgeCalls.length, 1);
    assert.match(bridgeCalls[0].path, /^\/api\/matters\?/);
    assert.equal(bridgeCalls[0].method, "GET");
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});
