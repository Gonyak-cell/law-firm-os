import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";
import { findRegisteredAccountByEmail } from "../../src/matter-vault-account-registry.js";
import { signedStepUpHeader } from "../hrx-step-up-test-helper.js";
import { apiSessionHeaders } from "../helpers/session.js";

const TENANT_ID = "tenant_amic_matter_vault";
const ACTOR_ID = "user_amic_jwsuh";
const EMPLOYEE_ID = "emp_amic_ytkim";
const COMPENSATION_ID = "comp-001";
const SYNTHETIC_AMOUNT_MINOR = 10101010;

let server;
let baseUrl;
let authHeaders;

function account(email) {
  const found = findRegisteredAccountByEmail(email);
  assert.ok(found, `registered account ${email} should exist`);
  return found;
}

function stepUpHeaders(purpose = "compensation_access") {
  return {
    ...authHeaders,
    "x-lawos-hrx-step-up": signedStepUpHeader({
      tenant_id: TENANT_ID,
      actor_id: ACTOR_ID,
      purpose,
    }),
  };
}

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? authHeaders),
    },
  });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
  authHeaders = await apiSessionHeaders(baseUrl, account("jwsuh@amic.kr"));
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX compensation records expose only masked hashes and decrypt only after signed step-up", async () => {
  const readChallenge = await json(`/api/hrx/compensation?employee_id=${EMPLOYEE_ID}`);
  assert.equal(readChallenge.status, 403);
  assert.equal(readChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const visible = await json(`/api/hrx/compensation?employee_id=${EMPLOYEE_ID}`, {
    headers: stepUpHeaders(),
  });
  assert.equal(visible.status, 200);
  assert.equal(visible.body.outcome, "ok");
  assert.match(visible.body.masked_compensation_ref, /^compensation_ref_hash:[a-f0-9]{24}$/);
  assert.equal(visible.body.compensation_records[0].compensation_id, COMPENSATION_ID);
  assert.equal(visible.body.compensation_records[0].encrypted_amount_ref_included, false);
  assert.equal(visible.body.compensation_records[0].raw_amount_included, false);
  assert.equal(JSON.stringify(visible.body).includes("lawos-comp-v1."), false);
  assert.equal(JSON.stringify(visible.body).includes("local-kms://"), false);
  assert.equal(JSON.stringify(visible.body).includes(String(SYNTHETIC_AMOUNT_MINOR)), false);

  const decryptChallenge = await json(`/api/hrx/compensation/${COMPENSATION_ID}/decrypt`);
  assert.equal(decryptChallenge.status, 403);
  assert.equal(decryptChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const decrypted = await json(`/api/hrx/compensation/${COMPENSATION_ID}/decrypt`, {
    headers: stepUpHeaders(),
  });
  assert.equal(decrypted.status, 200);
  assert.equal(decrypted.body.outcome, "ok");
  assert.equal(decrypted.body.compensation_id, COMPENSATION_ID);
  assert.equal(decrypted.body.employee_id, EMPLOYEE_ID);
  assert.equal(decrypted.body.compensation_amount.amount_minor, SYNTHETIC_AMOUNT_MINOR);
  assert.equal(decrypted.body.compensation_amount.currency_ref, "Currency:KRW");
  assert.equal(decrypted.body.encrypted_amount_ref_included, false);
  assert.equal(decrypted.body.raw_amount_included, true);
  assert.equal(JSON.stringify(decrypted.body).includes("lawos-comp-v1."), false);
  assert.equal(JSON.stringify(decrypted.body).includes("local-kms://"), false);

  const audit = await json("/api/hrx/audit", {
    headers: stepUpHeaders("security_audit"),
  });
  assert.equal(audit.status, 200);
  const decryptEvent = audit.body.events.find(
    (event) => event.action === "hrx.compensation.decrypt" && event.object_id === COMPENSATION_ID && event.decision === "allow",
  );
  assert.ok(decryptEvent);
  assert.equal(decryptEvent.metadata.amount_minor_included, false);
  assert.equal(decryptEvent.metadata.encrypted_amount_ref_included, false);
  assert.equal(JSON.stringify(decryptEvent).includes(String(SYNTHETIC_AMOUNT_MINOR)), false);
  assert.equal(JSON.stringify(decryptEvent).includes("lawos-comp-v1."), false);
});
