import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("profile contact values wrap instead of overflowing the sidebar", () => {
  const source = readFileSync(new URL("../src/components/UserProfileSurface.jsx", import.meta.url), "utf8");
  assert.match(source, /profileDraft\.english_name/);
  assert.match(source, /english_name:\s*draft\.english_name\.trim\(\)/);
  assert.match(source, /matter-profile-editor-fields/);
  assert.match(source, /PNG 파일 선택/);
  assert.match(source, /matter-profile-photo-input/);
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.matter-profile-contact-column[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(styles, /\.matter-profile-field-row strong[^}]*min-width:\s*0/s);
});

test("profile save succeeds only after server readback, never browser storage", async () => {
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch;
  globalThis.window = { location: { protocol: "https:", search: "" }, localStorage: { getItem() { return null; }, setItem() { throw new Error("browser override forbidden"); } } };
  let persisted = {}, readsFail = false;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push([url, init.method ?? "GET"]);
    if (init.method === "PATCH") { persisted = JSON.parse(init.body); return Response.json({ outcome: "passed", item: persisted }); }
    if (readsFail) return Response.json({}, { status: 503 });
    return Response.json({ request_id: "synthetic", outcome: "passed", item: persisted, safe_error_codes: [], audit_hint_ref: null, ui_state: "populated", production_ready_claim: false });
  };
  try {
    const { saveUserProfile } = await import(`../src/data/apiClient.js?profile-save=${Date.now()}`);
    const result = await saveUserProfile({ patch: { mobile_phone: "010-0000-0000" }, idempotencyKey: "save-1" });
    assert.equal(result.kind, "data");
    assert.equal(result.item.mobile_phone, "010-0000-0000");
    assert.deepEqual(calls.map(call => call[1]), ["PATCH", "GET"]);
    readsFail = true;
    assert.notEqual((await saveUserProfile({ patch: {}, idempotencyKey: "save-2" })).kind, "data");
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});
