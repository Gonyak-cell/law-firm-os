import assert from "node:assert/strict";
import test from "node:test";
import { partyPermissionResponse } from "../src/party-runtime-context.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp04_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&actor_user_id=user_rp04_owner&permission_ref=perm_ref_rp04_read&audit_hint_ref=audit_hint_rp04_read`;

function allowContext() {
  return JSON.stringify({
    principal: { user_id: "user_rp04_owner", tenant_id: TENANT, role_ids: ["master_data_reader"] },
    rules: [{ id: "rule_allow_read", effect: "allow", action: "*" }],
    object_acl: [],
  });
}

test("G2 party permission trimming omits unauthorized parties without count leak", () => {
  const response = partyPermissionResponse({
    allowedPartyIds: ["party-a"],
    items: [
      { party_id: "party-a", display_name: "Allowed" },
      { party_id: "party-b", display_name: "Denied" },
    ],
  });
  assert.deepEqual(response.items.map((item) => item.party_id), ["party-a"]);
  assert.equal(response.omitted_item_count, null);
  assert.equal(response.count_leak_prevented, true);
});

test("G2 Party API contract reads repository runtime without descriptor marker", async () => {
  const started = await startApiServer({ port: 0 });
  try {
    const response = await fetch(`http://${started.host}:${started.port}/master-data/records?${BASE_QUERY}&model_type=Entity`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: allowContext() },
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.outcome, "passed");
    assert.ok(body.items.length > 0);
    assert.equal(body.items[0].matter_core_enrichment.runtime_seed_crosswalk, true);
    assert.equal(JSON.stringify(body).includes("descriptor-only"), false);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
});
