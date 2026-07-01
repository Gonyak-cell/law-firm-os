import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOW_PROTECTED_RESET_ENV,
  PROTECTED_RESET_EMAILS_ENV,
  QA_RESET_EMAIL_ENV,
  DEFAULT_QA_RESET_EMAIL,
  ProtectedResetAccountError,
  assertResetAllowed,
  isProtectedResetEmail,
  protectedResetEmails,
  protectedResetOverrideEnabled,
  resetProtectionSummary,
  selectQaResetAccount
} from "../lib/protected-reset-accounts.mjs";

const USERS = [
  { email: "jwsuh@amic.kr", role_ids: ["system_super_admin"] },
  { email: "matter.desktop.qa@amic.kr", role_ids: ["matter_vault_user"] },
  { email: "ytkim@amic.kr", role_ids: ["matter_vault_user"] },
  { email: "ops.qa@amic.kr", role_ids: ["matter_vault_user"] }
];

test("jwsuh@amic.kr is protected by default", () => {
  assert.equal(isProtectedResetEmail("JWSUH@AMIC.KR", { env: {} }), true);
  assert.throws(
    () => assertResetAllowed("jwsuh@amic.kr", { env: {}, context: "unit test" }),
    (error) =>
      error instanceof ProtectedResetAccountError &&
      error.code === "PROTECTED_RESET_ACCOUNT" &&
      error.details.email === "jwsuh@amic.kr" &&
      error.details.token_material_returned === false
  );
});

test("dangerous override is explicit", () => {
  assert.equal(protectedResetOverrideEnabled({ env: {} }), false);
  assert.equal(protectedResetOverrideEnabled({ env: { [ALLOW_PROTECTED_RESET_ENV]: "1" } }), true);
  assert.deepEqual(assertResetAllowed("jwsuh@amic.kr", { env: { [ALLOW_PROTECTED_RESET_ENV]: "1" } }), {
    email: "jwsuh@amic.kr",
    protected: true,
    override_enabled: true,
    reset_allowed: true,
    token_material_returned: false
  });
});

test("protected email env extends the default protected list", () => {
  const env = { [PROTECTED_RESET_EMAILS_ENV]: "owner@amic.kr, second@amic.kr" };
  assert.deepEqual(protectedResetEmails({ env }), ["jwsuh@amic.kr", "owner@amic.kr", "second@amic.kr"]);
  assert.equal(isProtectedResetEmail("OWNER@AMIC.KR", { env }), true);
});

test("QA account selection defaults to the dedicated synthetic QA account", () => {
  const selected = selectQaResetAccount(USERS, { env: {} });
  assert.equal(DEFAULT_QA_RESET_EMAIL, "matter.desktop.qa@amic.kr");
  assert.equal(selected.email, DEFAULT_QA_RESET_EMAIL);
  assert.equal(selected.reset_policy.reset_allowed, true);
  assert.equal(selected.reset_policy.protected, false);
});

test("QA account selection honors explicit non-protected email", () => {
  const selected = selectQaResetAccount(USERS, { env: { [QA_RESET_EMAIL_ENV]: "ops.qa@amic.kr" } });
  assert.equal(selected.email, "ops.qa@amic.kr");
});

test("QA account selection denies protected preferred non-admin before network reset", () => {
  assert.throws(
    () =>
      selectQaResetAccount(USERS, {
        env: { [QA_RESET_EMAIL_ENV]: "ytkim@amic.kr", [PROTECTED_RESET_EMAILS_ENV]: "ytkim@amic.kr" }
      }),
    /protected from password reset by default/
  );
});

test("QA account selection denies preferred super-admin even when not in protected env", () => {
  assert.throws(
    () =>
      selectQaResetAccount([{ email: "admin@amic.kr", role_ids: ["system_super_admin"] }], {
        env: { [QA_RESET_EMAIL_ENV]: "admin@amic.kr" }
      }),
    /system_super_admin account/
  );
});

test("summary is sanitized", () => {
  const summary = resetProtectionSummary({ env: { [QA_RESET_EMAIL_ENV]: "ops.qa@amic.kr" } });
  assert.equal(summary.token_material_returned, false);
  assert.equal(JSON.stringify(summary).includes("password="), false);
});
