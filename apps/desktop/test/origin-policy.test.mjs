import assert from "node:assert/strict";
import test from "node:test";
import {
  APPROVED_DEV_RENDERER_URL,
  assertApprovedRendererUrl,
  installNavigationGuards,
  isApprovedRendererUrl
} from "../src/main/origin-policy.js";

test("origin policy allows only approved dev and packaged renderer origins", () => {
  assert.equal(isApprovedRendererUrl(APPROVED_DEV_RENDERER_URL), true);
  assert.equal(isApprovedRendererUrl("http://127.0.0.1:5173/auth"), true);
  assert.equal(isApprovedRendererUrl("file:///Applications/mater.app/Contents/Resources/app.asar/dist/index.html"), true);

  assert.equal(isApprovedRendererUrl("http://localhost:5173"), false);
  assert.equal(isApprovedRendererUrl("http://127.0.0.1:4173"), false);
  assert.equal(isApprovedRendererUrl("https://mater.example.com"), false);
  assert.equal(isApprovedRendererUrl("notaurl"), false);
});

test("origin policy throws on unapproved renderer URLs", () => {
  assert.equal(assertApprovedRendererUrl(APPROVED_DEV_RENDERER_URL), APPROVED_DEV_RENDERER_URL);
  assert.throws(
    () => assertApprovedRendererUrl("https://mater.example.com"),
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

  installNavigationGuards(fakeWindow);

  let prevented = false;
  handlers.get("will-navigate")({ preventDefault: () => { prevented = true; } }, "https://mater.example.com");
  assert.equal(prevented, true);

  prevented = false;
  handlers.get("will-navigate")({ preventDefault: () => { prevented = true; } }, APPROVED_DEV_RENDERER_URL);
  assert.equal(prevented, false);

  assert.deepEqual(windowOpenHandler({ url: "https://mater.example.com" }), { action: "deny" });
  assert.deepEqual(windowOpenHandler({ url: APPROVED_DEV_RENDERER_URL }), { action: "allow" });
});
