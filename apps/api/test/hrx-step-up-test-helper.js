import { createHrxStepUpAuthority } from "../src/hrx-step-up-token.js";

export function signedStepUpHeader({
  tenant_id,
  actor_id,
  purpose = "hrx_sensitive_action",
  authority = createHrxStepUpAuthority(),
  at,
} = {}) {
  const totp = authority.generateTotp({ tenant_id, actor_id, purpose }, at === undefined ? {} : { at });
  const issued = authority.issue({
    principal: { tenant_id, user_id: actor_id },
    purpose,
    totp_code: totp,
    requestId: "test_step_up",
  });
  if (issued.status !== 200) {
    throw new Error(`failed to issue signed HRX step-up token: ${issued.body?.reason ?? issued.status}`);
  }
  return issued.body.step_up_token;
}
