import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  PRIVILEGED_LEAVE_SCOPES,
  validateLeaveManagementBaseline,
} from "../src/leave/management-baseline.js";

const fixturePath = join(import.meta.dirname, "../fixtures/leave-management-defaults.synthetic.json");

function fixture() {
  return JSON.parse(readFileSync(fixturePath, "utf8"));
}

test("synthetic leave baseline freezes decisions, schedule source, legal versions, and route ownership", () => {
  const baseline = validateLeaveManagementBaseline(fixture());
  assert.equal(baseline.decisions.length, 10);
  assert.equal(baseline.schedule_source.silent_480_minute_fallback, false);
  assert.equal(baseline.schedule_source.company_default_profile.assignment_required, true);
  assert.equal(baseline.legal_basis_versions[1].effective_from, "2026-08-20");
  assert.equal(baseline.route_ownership.legacy_redirects["people-company-leave"], "people-leave-types");
});

test("staff compatibility profile cannot inherit privileged leave operations", () => {
  const baseline = validateLeaveManagementBaseline(fixture());
  for (const scope of PRIVILEGED_LEAVE_SCOPES) {
    assert.equal(baseline.role_scope_profiles.staff.includes(scope), false, scope);
  }
});

test("baseline rejects a silent schedule fallback", () => {
  const baseline = fixture();
  baseline.schedule_source.silent_480_minute_fallback = true;
  assert.throws(() => validateLeaveManagementBaseline(baseline), /silent 480-minute fallback is forbidden/);
});
