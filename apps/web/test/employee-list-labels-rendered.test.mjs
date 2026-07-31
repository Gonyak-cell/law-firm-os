import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const repoRoot = resolve(webRoot, "../..");
const fallback = "구성원 이름 확인 필요";
const unsafeLabels = [
  "lawyer@example.com",
  "550e8400-e29b-41d4-a716-446655440000",
  "0123456789abcdef0123456789abcdef",
  "opaque-9f2a4c7b8d1e",
  "employee-id-equal",
  "user-id-equal",
];

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

test("Employee list fails closed for opaque labels in rendered text and accessible names", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const employees = [
    { employee_id: "emp-email", display_name: "lawyer@example.com", status: "active" },
    { employee_id: "emp-uuid", display_name: "550e8400-e29b-41d4-a716-446655440000", status: "active" },
    { employee_id: "emp-hex", display_name: "0123456789abcdef0123456789abcdef", status: "active" },
    { employee_id: "emp-opaque", display_name: "opaque-9f2a4c7b8d1e", status: "active" },
    { employee_id: "employee-id-equal", display_name: "employee-id-equal", status: "active" },
    { employee_id: "emp-user-id", user_id: "user-id-equal", display_name: "user-id-equal", status: "active" },
    { employee_id: "lee", display_name: "Leena Kim", status: "active", photo_url: "data:image/png;base64,iVBORw0KGgo=" },
  ];
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname === "/api/hrx/employees"
      ? { outcome: "ok", employees }
      : {};
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  const evidenceDir = join(repoRoot, ".omo/evidence/employee-list-labels-rendered");
  await mkdir(evidenceDir, { recursive: true });
  try {
    await page.goto(`http://127.0.0.1:${port}/?view=people&ctx=allow#people-attendance-records`, { waitUntil: "domcontentloaded" });
    const panel = page.locator("#people-members");
    await panel.waitFor({ timeout: 5000 });
    await panel.locator(".people-row").first().waitFor({ timeout: 5000 });
    const visibleText = await panel.innerText();
    for (const label of unsafeLabels) {
      assert.equal(visibleText.includes(label), false, `unsafe label leaked: ${label}`);
    }
    assert.equal((await panel.getByRole("button", { name: fallback, exact: true }).count()), unsafeLabels.length);
    assert.equal(await panel.getByRole("button", { name: "Leena Kim", exact: true }).count(), 1);
    assert.match(visibleText, /Leena Kim/);
    assert.equal(await panel.getByRole("button", { name: "Leena Kim", exact: true }).locator("img").count(), 1);
    assert.equal(await panel.locator(".people-row-avatar").filter({ hasText: fallback }).count(), 0);
    await page.screenshot({ path: join(evidenceDir, "employee-list-labels.png"), fullPage: true });
    await writeFile(join(evidenceDir, "employee-list-labels.json"), JSON.stringify({
      schema_version: "lawos.people.employee-list-labels-rendered-evidence.v1",
      invocation: "node --test apps/web/test/employee-list-labels-rendered.test.mjs",
      unsafe_labels_hidden: true,
      fallback_count: unsafeLabels.length,
      leena_kim_preserved: true,
      screenshot: ".omo/evidence/employee-list-labels-rendered/employee-list-labels.png",
    }, null, 2) + "\n");
  } finally {
    await page.close();
    await browser.close();
    await server.close();
  }
});
