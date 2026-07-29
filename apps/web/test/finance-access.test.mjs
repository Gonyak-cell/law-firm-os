import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessFinanceScope,
  canAccessHomeFinanceSection,
  explicitFinanceScopes,
} from "../src/data/financeAccess.js";

test("WP-FIN-5 finance access uses explicit session scopes without inferring staff access", () => {
  const staff = { session: { role_ids: ["lawos_staff"], scopes: ["matter.read", "finance.expense.write"] } };
  const scopes = explicitFinanceScopes([staff]);
  assert.ok(scopes.has("finance.expense.write"));
  assert.equal(canAccessHomeFinanceSection([staff], "home-finance-expenses"), true);
  assert.equal(canAccessHomeFinanceSection([staff], "home-finance-overview"), false);
  assert.equal(canAccessHomeFinanceSection([staff], "home-finance-cashflow"), false);
  assert.equal(canAccessHomeFinanceSection([staff], "home-finance-billing"), false);
  assert.equal(canAccessFinanceScope([staff], ["finance.export"]), false);

  const superAdmin = { session: { role_ids: ["system_super_admin"], scopes: ["matter.read"] } };
  assert.equal(canAccessHomeFinanceSection([superAdmin], "home-finance-cashflow"), true);
  assert.equal(canAccessHomeFinanceSection([superAdmin], "home-finance-billing"), true);
});

test("WP-FIN-5 finance access keeps scope-less local previews compatible", () => {
  assert.equal(explicitFinanceScopes([{ role_ids: ["lawos_staff"] }]), null);
  assert.equal(canAccessHomeFinanceSection([], "home-finance-overview"), true);
});
