import assert from "node:assert/strict";
import test from "node:test";
import { createEmploymentProfile } from "../src/schema.js";
import {
  assertEmploymentProfileTimeline,
  createEmploymentProfileChangeEvent,
  employmentProfileAsOf,
  employmentProfileTimeline,
  planEmploymentProfileInsertion,
  transitionEmploymentProfile,
} from "../src/employment-profile.js";

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

test("EmploymentProfile as-of selection keeps future changes out of the current view", () => {
  const plan = planEmploymentProfileInsertion([profile], {
    ...profile,
    profile_id: "profile-002",
    title: "파트너",
    effective_from: "2026-08-01",
  });
  assert.equal(plan.previous_update.effective_to, "2026-07-31");
  assert.equal(employmentProfileAsOf(plan.timeline, "2026-07-30").profile_id, "profile-001");
  assert.equal(employmentProfileAsOf(plan.timeline, "2026-08-01").profile_id, "profile-002");
  const timeline = employmentProfileTimeline(plan.timeline, { as_of: "2026-07-30" });
  assert.equal(timeline.current.profile_id, "profile-001");
  assert.deepEqual(timeline.scheduled.map((row) => row.profile_id), ["profile-002"]);
});

test("EmploymentProfile timeline rejects overlapping periods and terminated reactivation", () => {
  assert.throws(
    () =>
      assertEmploymentProfileTimeline([
        profile,
        createEmploymentProfile({
          ...profile,
          profile_id: "profile-overlap",
          effective_from: "2026-07-01",
        }),
      ]),
    /must not overlap/,
  );

  const terminated = createEmploymentProfile({
    ...profile,
    profile_id: "profile-terminated",
    status: "terminated",
    effective_from: "2026-07-01",
    effective_to: "2026-07-31",
  });
  assert.throws(
    () =>
      assertEmploymentProfileTimeline([
        { ...profile, effective_to: "2026-06-30" },
        terminated,
        createEmploymentProfile({
          ...profile,
          profile_id: "profile-reactivated",
          effective_from: "2026-08-01",
        }),
      ]),
    /terminated to active/,
  );
});

test("EmploymentProfile insertion preserves past rows when adding a middle effective date", () => {
  const later = createEmploymentProfile({
    ...profile,
    profile_id: "profile-later",
    effective_from: "2026-09-01",
  });
  const plan = planEmploymentProfileInsertion(
    [{ ...profile, effective_to: "2026-08-31" }, later],
    {
      ...profile,
      profile_id: "profile-middle",
      title: "시니어 어소시에이트",
      effective_from: "2026-08-01",
    },
  );
  assert.equal(plan.previous_update.effective_to, "2026-07-31");
  assert.equal(plan.profile.effective_to, "2026-08-31");
  assert.equal(employmentProfileAsOf(plan.timeline, "2026-07-15").profile_id, "profile-001");
  assert.equal(employmentProfileAsOf(plan.timeline, "2026-08-15").profile_id, "profile-middle");
  assert.equal(employmentProfileAsOf(plan.timeline, "2026-09-15").profile_id, "profile-later");
});
