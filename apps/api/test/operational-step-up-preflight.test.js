import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_STEP_UP_DEFAULT_SECRET,
  HRX_STEP_UP_DEFAULT_TOTP_SECRET,
  resolveHrxStepUpConfig,
} from "../src/hrx-step-up-token.js";
import { startApiServer } from "../src/server.js";

const SESSION_SECRET = "operational-preflight-session-secret-32-bytes";
const STEP_UP_SECRET = "operational-preflight-step-up-secret-32-bytes";
const STEP_UP_TOTP_SECRET = "operational-preflight-step-up-totp-secret-32-bytes";

function assertPreflightError(run) {
  assert.throws(run, (error) => {
    assert.equal(error.code, "LAWOS_RUNTIME_PREFLIGHT_FAILED");
    assert.equal(error.exitCode, 78);
    return true;
  });
}

test("operational step-up config rejects missing, blank and known default secrets", () => {
  assertPreflightError(() => resolveHrxStepUpConfig({ profile: "operational", env: {} }));
  assertPreflightError(() => resolveHrxStepUpConfig({
    profile: "operational",
    env: {},
    secret: " ",
    totpSecret: " ",
  }));
  assertPreflightError(() => resolveHrxStepUpConfig({
    profile: "operational",
    env: {},
    secret: HRX_STEP_UP_DEFAULT_SECRET,
    totpSecret: HRX_STEP_UP_DEFAULT_TOTP_SECRET,
  }));
});

test("local-dev may use local defaults while operational accepts only explicit strong secrets", () => {
  const local = resolveHrxStepUpConfig({ profile: "local-dev", env: {} });
  assert.equal(local.secret, HRX_STEP_UP_DEFAULT_SECRET);
  assert.equal(local.totpSecret, HRX_STEP_UP_DEFAULT_TOTP_SECRET);

  const operational = resolveHrxStepUpConfig({
    profile: "operational",
    env: {},
    secret: STEP_UP_SECRET,
    totpSecret: STEP_UP_TOTP_SECRET,
  });
  assert.equal(operational.secret, STEP_UP_SECRET);
  assert.equal(operational.totpSecret, STEP_UP_TOTP_SECRET);
});

test("operational API refuses the legacy file authority", async () => {
  await assert.rejects(
    startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: SESSION_SECRET,
      hrxStepUpSecret: STEP_UP_SECRET,
      hrxStepUpTotpSecret: STEP_UP_TOTP_SECRET,
      persistenceAuthority: "file-current",
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
      && error?.exitCode === 78
      && /requires postgres-v2/u.test(error.message),
  );
});
