import assert from "node:assert/strict";
import test from "node:test";

import {
  PRINCIPAL_REF,
  readyStore,
  signedSession,
  startupFixture,
  subject,
} from "./helpers/outlook-startup-runtime-fixture.js";

const CANONICAL = Object.freeze({
  tenant_id: "todo9-tenant",
  user_id: "todo9-user",
  outlook_desktop_principal_ref: PRINCIPAL_REF,
});

const CASES = Object.entries(CANONICAL).flatMap(([field, value]) => [
  { field, name: "leading padding", value: ` ${value}` },
  { field, name: "trailing padding", value: `${value} ` },
  { field, name: "blank", value: "" },
  { field, name: "whitespace-only", value: "   " },
]);

for (const identityCase of CASES) {
  test(`${identityCase.field} ${identityCase.name} invalidates READY before authority reads`, async () => {
    const store = await readyStore();
    assert.match(store.raw(), /"state":"ready"/u);
    const fixture = startupFixture({
      store,
      session: signedSession({ [identityCase.field]: identityCase.value }),
    });
    const runtime = await subject();
    const result = await runtime.startOutlookStartup(fixture.input);
    assert.deepEqual({
      outcome: [result.state, result.reason, result.authenticated],
      events: fixture.events,
      authorityRequests: fixture.requests.map(({ path }) => path),
      bootstrapCount: fixture.requests.filter(({ path }) => path === "/api/outlook/bootstrap").length,
      binding: result.binding ?? null,
      cacheHit: result.cache_hit,
      readyInvalidated: store.raw() === null,
    }, {
      outcome: ["login_required", "no_credential", false],
      events: ["session"],
      authorityRequests: [],
      bootstrapCount: 0,
      binding: null,
      cacheHit: false,
      readyInvalidated: true,
    });
  });
}
