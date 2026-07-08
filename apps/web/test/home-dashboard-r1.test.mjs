import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

function installRouteWindow({ view, section }) {
  const storage = new Map();
  const search = `?view=${encodeURIComponent(view)}&ctx=allow`;
  const hash = section ? `#${encodeURIComponent(section)}` : "";
  globalThis.window = {
    location: { pathname: "/", search, hash, protocol: "http:" },
    history: {
      pushState() {},
      replaceState() {}
    },
    localStorage: {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    },
    addEventListener() {},
    removeEventListener() {},
    matchMedia() {
      return { matches: false, addEventListener() {}, removeEventListener() {} };
    }
  };
  globalThis.document = { documentElement: { dataset: {}, lang: "" } };
}

async function renderAppAtLegacyRoute(route) {
  installRouteWindow(route);
  const server = await createServer({
    root: webRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
  });
  try {
    const { App } = await server.ssrLoadModule("/src/App.jsx");
    return renderToStaticMarkup(React.createElement(App));
  } finally {
    await server.close();
    delete globalThis.window;
    delete globalThis.document;
  }
}

test("R1 WP-2 restores legacy request route context into Home request tab and filter", async () => {
  const html = await renderAppAtLegacyRoute({ view: "requests", section: "requests-leave" });

  assert.match(html, /data-home-section-screen="home-requests"/);
  assert.match(html, /data-home-request-tab="received"/);
  assert.match(html, /data-home-request-filter="leave"/);
  assert.match(html, /data-home-request-filter-id="leave"[^>]*data-home-request-filter-active="true"/);
});

test("R1 WP-2 renders dedicated Home utility screens from legacy route context", async () => {
  const messages = await renderAppAtLegacyRoute({ view: "messages", section: "messages-matter-channel" });
  const esign = await renderAppAtLegacyRoute({ view: "esign", section: "esign-status" });
  const company = await renderAppAtLegacyRoute({ view: "reports", section: "reports-matter-analytics" });

  assert.match(messages, /data-home-section-screen="home-messages"/);
  assert.match(messages, /data-home-message-tab="matter"/);
  assert.match(messages, /data-home-tab-id="matter"[^>]*data-home-tab-active="true"/);

  assert.match(esign, /data-home-section-screen="home-esign"/);
  assert.match(esign, /data-home-esign-tab="status"/);
  assert.match(esign, /data-home-tab-id="status"[^>]*data-home-tab-active="true"/);

  assert.match(company, /data-home-section-screen="home-company"/);
  assert.match(company, /data-home-company-tab="reports-matter-analytics"/);
  assert.match(company, /data-home-audit-summary="true"/);
});
