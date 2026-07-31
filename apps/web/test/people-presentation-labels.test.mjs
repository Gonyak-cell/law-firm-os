import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("People presentation labels hide opaque references without hiding legitimate names", async () => {
  const server = await createServer({
    configFile: false,
    root: new URL("../", import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const {
      safeEmployeeLabel,
      safePeopleLabel,
      UNRESOLVED_EMPLOYEE_LABEL,
    } = await server.ssrLoadModule("/src/people/peoplePresentation.ts");
    const unsafe = [
      { employee_id: "emp-x", display_name: "prefixEMP-Xpost" },
      { employee_id: "emp-aad", display_name: "AAD-OBJECT-42" },
      { employee_id: "emp-email", display_name: "lawyer@example.com" },
      { employee_id: "emp-uuid", display_name: "550e8400-e29b-01d4-0716-446655440000" },
      { employee_id: "emp-hex", display_name: "0123456789abcdef0123456789abcdef" },
      { employee_id: "emp-token", display_name: "opaque-9f2a4c7b8d1e" },
      { employee_id: "emp-code", display_name: "ABC-42" },
      { employee_id: "kim", display_name: "KIM" },
      { employee_id: "employee-123", display_name: "prefixemployee-123suffix" },
    ];
    for (const employee of unsafe) {
      assert.equal(safeEmployeeLabel(employee), UNRESOLVED_EMPLOYEE_LABEL);
    }
    const legitimateNames = [
      { employee_id: "lee", display_name: "Leena Kim" },
      { employee_id: "kim", display_name: "Kim Min" },
      { employee_id: "park", display_name: "Park Jiyoon" },
      { employee_id: "alexander", display_name: "Alexander Kim" },
      { employee_id: "kim", display_name: "김민" },
      { employee_id: "park", display_name: "박지윤" },
      { employee_id: "lee", display_name: "Madonna" },
      { employee_id: "kim", display_name: "J. Kim" },
      { employee_id: "lee", display_name: "foo lee bar" },
      { employee_id: "lee", display_name: "account lee owner" },
      { employee_id: "lee", display_name: "prefix-LEE-post" },
    ];
    for (const employee of legitimateNames) {
      assert.equal(safeEmployeeLabel(employee), employee.display_name);
    }
    assert.equal(safePeopleLabel("서지원", { identifiers: ["emp-support"] }), "서지원");
  } finally {
    await server.close();
  }
});
