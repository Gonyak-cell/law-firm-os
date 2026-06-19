import assert from "node:assert/strict";
import test from "node:test";
import { createEmploymentProfile } from "../src/schema.js";
import { createEmploymentProfileChangeEvent, transitionEmploymentProfile } from "../src/employment-profile.js";

const profile = createEmploymentProfile({
  tenant_id: "tenant-a",
  profile_id: "profile-001",
  employee_id: "emp-001",
  employment_type: "full_time",
  status: "active",
  effective_from: "2026-06-19",
});

test("EmploymentProfile lifecycle applies effective-dated status changes", () => {
  const next = transitionEmploymentProfile(profile, { status: "on_leave", effective_from: "2026-07-01" });
  assert.equal(next.status, "on_leave");
  assert.equal(next.effective_from, "2026-07-01");
  const event = createEmploymentProfileChangeEvent(profile, { status: "on_leave", effective_from: "2026-07-01" });
  assert.equal(event.from_status, "active");
  assert.equal(event.to_status, "on_leave");
});

test("EmploymentProfile lifecycle rejects invalid transitions", () => {
  const terminated = transitionEmploymentProfile(profile, { status: "terminated", effective_from: "2026-07-01" });
  assert.throws(() => transitionEmploymentProfile(terminated, { status: "active", effective_from: "2026-08-01" }), /cannot transition/);
});
