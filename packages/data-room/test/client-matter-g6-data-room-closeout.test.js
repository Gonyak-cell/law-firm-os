import assert from "node:assert/strict";
import test from "node:test";

import { DATA_ROOM_G6G_TUW_COVERAGE, createDataRoomG6DataRoomAclDescriptor } from "../src/index.js";

const tenant_id = "tenant_g6g_validator";
const matter_id = "matter_g6g";
const room_id = "room_g6g";

function dataRoom(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    room_id,
    room_level_acl: true,
    grants: [{ room_id, external_user_id: "external_user_g6g", shared_with_external: true }],
    ...overrides,
  };
}

test("G6-G DataRoom descriptor requires room-level ACL", () => {
  const descriptor = createDataRoomG6DataRoomAclDescriptor({
    tenant_id,
    matter_id,
    data_room: dataRoom(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.data_room_acl_receipt.room_level_acl_tested, true);
  assert.equal(descriptor.data_room_acl_receipt.data_room_persisted, false);
  assert.equal(DATA_ROOM_G6G_TUW_COVERAGE.length, 1);

  const blocked = createDataRoomG6DataRoomAclDescriptor({
    tenant_id,
    matter_id,
    data_room: dataRoom({
      room_level_acl: false,
      unauthorized_access: true,
      grants: [{ room_id: "other_room", external_user_id: "external_user_g6g", shared_with_external: false }],
      dispatched_runtime: true,
    }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("data_room_room_level_acl_required"));
  assert.ok(blocked.blocked_claims.includes("data_room_unauthorized_access_blocked"));
  assert.ok(blocked.blocked_claims.includes("data_room_runtime_dispatch_blocked"));
});
