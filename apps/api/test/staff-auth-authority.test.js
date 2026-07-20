import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_STAFF_AUTH_AUTHORITIES,
  resolveStaffAuthAuthority,
} from "../src/staff-auth-authority.js";

test("staff authentication defaults to internal password authority", () => {
  assert.equal(resolveStaffAuthAuthority(), LAWOS_STAFF_AUTH_AUTHORITIES.internalPassword);
  assert.equal(resolveStaffAuthAuthority(" INTERNAL-PASSWORD "), LAWOS_STAFF_AUTH_AUTHORITIES.internalPassword);
  assert.equal(resolveStaffAuthAuthority("entra-oidc"), LAWOS_STAFF_AUTH_AUTHORITIES.entraOidc);
});

test("unknown staff authentication authority fails closed", () => {
  assert.throws(
    () => resolveStaffAuthAuthority("auto"),
    (error) => error?.code === "LAWOS_STAFF_AUTH_AUTHORITY_INVALID" && error?.exitCode === 78,
  );
});
