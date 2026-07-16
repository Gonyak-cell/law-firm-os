import assert from "node:assert/strict";
import test from "node:test";
import {
  APPROVED_DEV_RENDERER_URL,
  assertApprovedRendererUrl,
  installNavigationGuards,
  isApprovedRendererUrl
} from "../src/main/origin-policy.js";

const PACKAGED_RENDERER_URL = "file:///Applications/matter.app/Contents/Resources/app/src/renderer/web/index.html?desktop=1";
const originOptions = { packagedRendererUrl: PACKAGED_RENDERER_URL };

test("origin policy allows only approved dev and packaged renderer origins", () => {
  assert.equal(isApprovedRendererUrl(APPROVED_DEV_RENDERER_URL), true);
  assert.equal(isApprovedRendererUrl("http://127.0.0.1:5173/auth"), true);
  assert.equal(isApprovedRendererUrl(PACKAGED_RENDERER_URL, originOptions), true);
  assert.equal(isApprovedRendererUrl(`${PACKAGED_RENDERER_URL}#home`, originOptions), true);

  assert.equal(isApprovedRendererUrl(PACKAGED_RENDERER_URL), false);
  assert.equal(isApprovedRendererUrl("file:///tmp/index.html", originOptions), false);
  assert.equal(isApprovedRendererUrl(APPROVED_DEV_RENDERER_URL, { ...originOptions, allowDevRenderer: false }), false);
  assert.equal(isApprovedRendererUrl("http://localhost:5173"), false);
  assert.equal(isApprovedRendererUrl("http://127.0.0.1:4173"), false);
  assert.equal(isApprovedRendererUrl("https://matter.example.com"), false);
  assert.equal(isApprovedRendererUrl("notaurl"), false);
});

test("origin policy throws on unapproved renderer URLs", () => {
  assert.equal(assertApprovedRendererUrl(APPROVED_DEV_RENDERER_URL, originOptions), APPROVED_DEV_RENDERER_URL);
  assert.equal(assertApprovedRendererUrl(PACKAGED_RENDERER_URL, originOptions), PACKAGED_RENDERER_URL);
  assert.throws(
    () => assertApprovedRendererUrl("https://matter.example.com"),
    /Blocked unapproved desktop renderer origin/
  );
});

test("navigation guards deny unapproved navigations and window opens", () => {
  const handlers = new Map();
  let windowOpenHandler;
  const fakeWindow = {
    webContents: {
      on(eventName, handler) {
        handlers.set(eventName, handler);
      },
      setWindowOpenHandler(handler) {
        windowOpenHandler = handler;
      }
    }
  };

  installNavigationGuards(fakeWindow, originOptions);

  let prevented = false;
  handlers.get("will-navigate")({ preventDefault: () => { prevented = true; } }, "https://matter.example.com");
  assert.equal(prevented, true);

  prevented = false;
  handlers.get("will-navigate")({ preventDefault: () => { prevented = true; } }, APPROVED_DEV_RENDERER_URL);
  assert.equal(prevented, false);

  assert.deepEqual(windowOpenHandler({ url: "https://matter.example.com" }), { action: "deny" });
  assert.deepEqual(windowOpenHandler({ url: APPROVED_DEV_RENDERER_URL }), { action: "allow" });
  assert.deepEqual(windowOpenHandler({ url: PACKAGED_RENDERER_URL }), { action: "allow" });
  assert.deepEqual(windowOpenHandler({ url: "file:///tmp/index.html" }), { action: "deny" });
});
