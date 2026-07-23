import assert from "node:assert/strict";
import test from "node:test";
import {
  setPostgresRolePassword,
} from "../src/postgres/role-password.js";

test("role password bootstrap keeps the secret out of SQL text and returned evidence", async () => {
  const calls = [];
  const password = "private-role-password-value";
  const result = await setPostgresRolePassword({
    async query(text, values = []) {
      calls.push({ text, values });
      return { rows: [], rowCount: 0 };
    },
  }, {
    roleName: "lawos_app",
    password,
  });
  assert.equal(calls.length, 2);
  assert.equal(calls.some(({ text }) => text.includes(password)), false);
  assert.deepEqual(calls[0].values, ["lawos_app", password]);
  assert.match(calls[1].text, /format\('ALTER ROLE %I PASSWORD %L'/u);
  assert.equal(JSON.stringify(result).includes(password), false);
  assert.equal(result.password_returned, false);
});
test("role password bootstrap rejects unsafe identifiers and missing values", async () => {
  const client = { async query() { return { rows: [], rowCount: 0 }; } };
  await assert.rejects(
    setPostgresRolePassword(client, { roleName: "lawos_app; DROP ROLE x", password: "x" }),
    /required/u,
  );
  await assert.rejects(
    setPostgresRolePassword(client, { roleName: "lawos_app", password: "" }),
    /required/u,
  );
});
