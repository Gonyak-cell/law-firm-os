import assert from "node:assert/strict";
import test from "node:test";
import { mapHrxSsoSubjectToUser } from "../src/sso-subject-map.js";

test("SSO subject mapping creates IAM User identity without Employee conflation", () => {
  const mapped = mapHrxSsoSubjectToUser(
    {
      iss: "https://idp.example.test",
      sub: "external-user-001",
      aud: "lawos",
      tenant_id: "tenant-a",
    },
    {
      allowed_issuers: ["https://idp.example.test"],
      allowed_audiences: ["lawos"],
    },
  );

  assert.equal(mapped.effect, "allow");
  assert.equal(mapped.mapped_object_type, "User");
  assert.equal(mapped.employee_id, null);
  assert.equal(mapped.employee_link_required, true);
  assert.match(mapped.user_id, /^user:/);
});

test("SSO subject mapping denies unknown issuer audience and user employee conflation", () => {
  const base = { iss: "https://idp.example.test", sub: "sub-001", aud: "lawos", tenant_id: "tenant-a" };
  assert.equal(
    mapHrxSsoSubjectToUser(base, { allowed_issuers: ["https://other-idp.test"] }).reason,
    "hrx_sso_issuer_not_allowed",
  );
  assert.equal(
    mapHrxSsoSubjectToUser(base, { allowed_audiences: ["other-app"] }).reason,
    "hrx_sso_audience_not_allowed",
  );
  assert.equal(
    mapHrxSsoSubjectToUser({ ...base, user_id: "emp-001", employee_id: "emp-001" }).reason,
    "hrx_sso_employee_user_conflation",
  );
});
