import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const webRoot = fileURLToPath(new URL("../", import.meta.url));

test("People roster maps API contacts and preserves the missing-contact state", async () => {
  const viteServer = await createServer({ configFile: false, root: webRoot, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  try {
    const { rowsForTab } = await viteServer.ssrLoadModule("/src/people/employees/PeopleWorkforceDirectory.tsx");
    const rows = rowsForTab("active", {
      kind: "data",
      employees: [
        { employee_id: "employee-contact", display_name: "연락처 등록", status: "active", mobile_phone: "registered-contact" },
        { employee_id: "employee-missing", display_name: "연락처 미등록", status: "active" }
      ]
    }, null);

    assert.deepEqual(rows.map((row) => row.contact), ["registered-contact", "미등록"]);
  } finally {
    await viteServer.close();
  }
});
