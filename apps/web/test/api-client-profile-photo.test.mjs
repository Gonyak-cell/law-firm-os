import assert from "node:assert/strict";
import test from "node:test";

const PNG_BYTES = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10,
  115, 121, 110, 116, 104, 101, 116, 105, 99,
]);

function profileBody() {
  return {
    request_id: "request-profile-photo-test",
    outcome: "passed",
    item: {
      user_id: "user-profile-test",
      display_name: "합성 사용자",
      photo_url: "/api/profile/me/photo",
      photo_included: true,
    },
    safe_error_codes: [],
    audit_hint_ref: "profile-photo-test",
    ui_state: "data",
    production_ready_claim: false,
  };
}

function webLocation() {
  return { protocol: "https:", search: "" };
}

function desktopLocation() {
  return {
    protocol: "matter-app:",
    hostname: "app",
    port: "",
    username: "",
    password: "",
    search: "?desktop=1",
  };
}

test("web profile read hydrates the authenticated PNG without exposing its server path", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.window = { location: webLocation() };
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).startsWith("/api/profile/me?")) {
      return new Response(JSON.stringify(profileBody()), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    assert.equal(input, "/api/profile/me/photo");
    return new Response(PNG_BYTES, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "private, no-store",
      },
    });
  };

  try {
    const mod = await import(`../src/data/apiClient.js?profile-photo-web=${Date.now()}`);
    const result = await mod.fetchUserProfile();
    assert.equal(result.kind, "data");
    assert.equal(result.item.photo_included, true);
    assert.equal(result.item.photo_url, `data:image/png;base64,${Buffer.from(PNG_BYTES).toString("base64")}`);
    assert.equal(calls.length, 2);
    assert.equal(calls.every(({ init }) => typeof init.headers["x-lawos-permission-context"] === "string"), true);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

test("desktop profile read uses the main-process binary bridge and fails closed on invalid bytes", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const calls = [];
  let validPhoto = true;
  globalThis.window = {
    location: desktopLocation(),
    matterSession: {
      async api(input) {
        calls.push(input);
        if (input.path.startsWith("/api/profile/me?")) {
          return { http_status: 200, body: profileBody(), token_material_returned: false };
        }
        assert.equal(input.path, "/api/profile/me/photo");
        const bytes = validPhoto ? PNG_BYTES : Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
        return {
          http_status: 200,
          binary_body_base64: Buffer.from(bytes).toString("base64"),
          content_type: "image/png",
          byte_size: bytes.byteLength,
          token_material_returned: false,
        };
      },
    },
  };
  globalThis.fetch = async () => {
    throw new Error("desktop profile photo must not bypass the main-process bridge");
  };

  try {
    const mod = await import(`../src/data/apiClient.js?profile-photo-desktop=${Date.now()}`);
    const hydrated = await mod.fetchUserProfile();
    assert.equal(hydrated.kind, "data");
    assert.equal(hydrated.item.photo_url, `data:image/png;base64,${Buffer.from(PNG_BYTES).toString("base64")}`);
    assert.deepEqual(calls.map(({ path }) => path), [
      calls[0].path,
      "/api/profile/me/photo",
    ]);
    assert.equal(calls[0].path.startsWith("/api/profile/me?"), true);

    validPhoto = false;
    calls.length = 0;
    const rejected = await mod.fetchUserProfile();
    assert.equal(rejected.kind, "data");
    assert.equal(rejected.item.photo_url, null);
    assert.equal(rejected.item.photo_included, false);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});
