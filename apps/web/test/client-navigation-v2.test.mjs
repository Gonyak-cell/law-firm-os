import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { createServer } from "vite";

const webRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

const canonicalSections = [
  "clients-home",
  "clients-list",
  "client-new",
  "client-leads",
  "client-sales-history",
  "client-opportunities",
  "client-consultation-proposals",
  "client-activities",
  "client-billing",
  "client-reports",
];

const canonicalLabels = [
  "대시보드",
  "고객 목록",
  "신규 고객",
  "새 문의",
  "입금 매출 내역",
  "수임 현황",
  "상담·수임 관리",
  "접촉 이력",
  "수임료·미수금",
  "리포트",
];

test("VC-CL-ROUTE-001 / CL-P5-W01-T01 Client 메뉴 10개와 숨은 주소 처리 규칙을 고정한다", async () => {
  const globalUtilities = await import(pathToFileURL(
    resolve(webRoot, "src/data/globalUtilities.js"),
  ).href);
  const viteServer = await createServer({
    configFile: false,
    root: webRoot,
    server: {
      middlewareMode: true,
      hmr: false,
    },
    appType: "custom",
    logLevel: "error",
  });

  try {
    const { buildContextualNavigation } =
      await viteServer.ssrLoadModule(
        "/src/components/Shell.jsx",
      );
    const clientItems = buildContextualNavigation()
      .clients.items.flatMap(({ children }) => children);

    assert.equal(clientItems.length, 10);
    assert.deepEqual(
      clientItems.map(({ label }) => label),
      canonicalLabels,
    );
    assert.deepEqual(
      clientItems.map(({ section }) => section),
      canonicalSections,
    );
    for (const section of canonicalSections) {
      assert.deepEqual(
        globalUtilities.resolveGlobalShortcut(
          "clients",
          section,
        ),
        { view: "clients", section },
      );
    }

    for (const [source, target] of [
      ["client-accounts", "clients-list"],
      ["client-contacts", "clients-list"],
      ["client-relationships", "clients-list"],
      ["client-intake", "client-consultation-proposals"],
      ["client-conflict", "client-consultation-proposals"],
      ["client-contracts", "client-consultation-proposals"],
    ]) {
      assert.deepEqual(
        globalUtilities.resolveGlobalShortcut(
          "clients",
          source,
        ),
        {
          view: "clients",
          section: target,
          redirectedFrom: {
            view: "clients",
            section: source,
            disposition: "merged",
          },
        },
      );
    }

    for (const section of [
      "client-data",
      "client-import",
      "client-settings",
    ]) {
      const resolved =
        globalUtilities.resolveGlobalShortcut(
          "clients",
          section,
        );
      assert.equal(resolved.view, "clients");
      assert.equal(resolved.section, "clients-home");
      assert.equal(resolved.clientRouteDisabled, true);
      assert.deepEqual(resolved.redirectedFrom, {
        view: "clients",
        section,
        disposition: "disabled",
      });
    }

    const unknown = globalUtilities.resolveGlobalShortcut(
      "clients",
      "client-unknown",
    );
    assert.equal(unknown.section, "clients-home");
    assert.equal(unknown.clientRouteDisabled, true);
    assert.equal(
      unknown.redirectedFrom.disposition,
      "not_found",
    );
  } finally {
    await viteServer.close();
  }

  const clientsSource = await readFile(
    resolve(webRoot, "src/components/ClientsSurface.jsx"),
    "utf8",
  );
  const appSource = await readFile(
    resolve(webRoot, "src/App.jsx"),
    "utf8",
  );
  const allowListStart = clientsSource.indexOf(
    "const CLIENT_SECTIONS",
  );
  const allowListEnd = clientsSource.indexOf(
    "]);",
    allowListStart,
  );
  const allowListSource = clientsSource.slice(
    allowListStart,
    allowListEnd,
  );

  for (const section of canonicalSections) {
    assert.match(allowListSource, new RegExp(`"${section}"`));
  }
  for (const section of [
    "client-accounts",
    "client-contacts",
    "client-relationships",
    "client-intake",
    "client-conflict",
    "client-contracts",
    "client-data",
    "client-import",
    "client-settings",
  ]) {
    assert.doesNotMatch(
      allowListSource,
      new RegExp(`"${section}"`),
    );
  }
  assert.match(
    clientsSource,
    /data-client-route-disabled=\{disabledRouteDisposition\}/,
  );
  assert.match(
    appSource,
    /redirectedFrom=\{activeRedirectedFrom\}/,
  );
});
