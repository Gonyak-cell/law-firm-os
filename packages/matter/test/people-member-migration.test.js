import assert from "node:assert/strict";
import test from "node:test";
import {
  backfillPeopleMatterMembers,
  peopleMemberUnresolvedCsv,
} from "../src/people-member-migration.js";
import { createMatterMember } from "../src/model.js";

const TENANT = "tenant-people";

function legacy(overrides = {}) {
  return {
    model_type: "MatterMember",
    tenant_id: TENANT,
    matter_id: "matter-1",
    member_id: "member-1",
    employee_id: null,
    user_id: "user-1",
    role: "responsible_attorney",
    status: "active",
    ...overrides,
  };
}

test("member backfill is repeatable and preserves the original source hash", () => {
  const input = {
    tenant_id: TENANT,
    members: [legacy()],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-1",
      user_id: "user-1",
      employee_id: "emp-1",
    }],
    audit_events: [{
      tenant_id: TENANT,
      action: "matter.team.member.add",
      object_id: "member-1",
      occurred_at: "2026-07-01T09:00:00.000Z",
    }],
  };
  const first = backfillPeopleMatterMembers(input);
  const second = backfillPeopleMatterMembers({ ...input, members: first.rows });

  assert.deepEqual(second, first);
  assert.equal(first.rows[0].employee_id, "emp-1");
  assert.equal(first.rows[0].valid_from, "2026-07-01T09:00:00.000Z");
  assert.equal(first.rows[0].identity_resolution_state, "resolved");
  assert.match(first.rows[0].source_record_hash, /^sha256:/);
});

test("uncertain identity stays unresolved without an invented effective date", () => {
  const result = backfillPeopleMatterMembers({
    tenant_id: TENANT,
    members: [legacy()],
    employee_user_links: [],
    audit_events: [],
  });

  assert.equal(result.rows[0].employee_id, null);
  assert.equal(result.rows[0].valid_from, null);
  assert.equal(result.rows[0].identity_resolution_state, "unresolved");
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.validity_review_required[0].reason, "valid_from_unverified");
  assert.match(peopleMemberUnresolvedCsv(result.unresolved), /담당자 지정 필요/);
});

test("member migration rejects cross-tenant rows and reversed validity", () => {
  assert.throws(() => backfillPeopleMatterMembers({
    tenant_id: TENANT,
    members: [legacy({ tenant_id: "tenant-other" })],
  }), /tenant/);
  assert.throws(() => createMatterMember(legacy({
    employee_id: "emp-1",
    valid_from: "2026-07-02T09:00:00.000Z",
    valid_to: "2026-07-01T09:00:00.000Z",
    identity_resolution_state: "resolved",
  })), /valid_to/);
  assert.throws(() => backfillPeopleMatterMembers({
    tenant_id: TENANT,
    members: [legacy({
      valid_from: "2026-07-02T09:00:00.000Z",
      valid_to: "2026-07-01T09:00:00.000Z",
    })],
  }), /valid_to/);
});
