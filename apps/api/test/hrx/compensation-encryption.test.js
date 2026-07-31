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

test("HRX compensation records expose only masked hashes after signed step-up", async () => {
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
  assert.deepEqual(Object.keys(visible.body.compensation_records[0]).sort(), [
    "compensation_id", "currency_ref", "effective_from", "effective_to", "employee_id", "encrypted_amount_ref_included",
    "masked_compensation_ref", "raw_amount_included",
  ].sort());
  assert.equal(JSON.stringify(visible.body).includes("lawos-comp-v1."), false);
  assert.equal(JSON.stringify(visible.body).includes("local-kms://"), false);
  assert.equal(JSON.stringify(visible.body).includes(String(SYNTHETIC_AMOUNT_MINOR)), false);

  const decryptChallenge = await json(`/api/hrx/compensation/${COMPENSATION_ID}/decrypt`);
  assert.equal(decryptChallenge.status, 403);
  assert.equal(decryptChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const confirmed = await json(`/api/hrx/compensation/${COMPENSATION_ID}/decrypt`, {
    headers: stepUpHeaders(),
  });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.outcome, "ok");
  assert.equal(confirmed.body.compensation_id, COMPENSATION_ID);
  assert.equal(confirmed.body.employee_id, EMPLOYEE_ID);
  assert.match(confirmed.body.masked_compensation_ref, /^compensation_ref_hash:[a-f0-9]{24}$/);
  assert.equal(confirmed.body.compensation_amount, null);
  assert.equal(confirmed.body.encrypted_amount_ref_included, false);
  assert.equal(confirmed.body.raw_amount_included, false);
  assert.deepEqual(Object.keys(confirmed.body).sort(), [
    "compensation_amount", "compensation_id", "currency_ref", "employee_id", "encrypted_amount_ref_included",
    "masked_compensation_ref", "outcome", "payroll_runtime_opened", "raw_amount_included", "request_id",
  ].sort());
  assert.equal(JSON.stringify(confirmed.body).includes("lawos-comp-v1."), false);
  assert.equal(JSON.stringify(confirmed.body).includes("local-kms://"), false);
  assert.equal(JSON.stringify(confirmed.body).includes(String(SYNTHETIC_AMOUNT_MINOR)), false);

  const audit = await json("/api/hrx/audit", {
    headers: stepUpHeaders("security_audit"),
  });
  assert.equal(audit.status, 200);
  const confirmEvent = audit.body.events.find(
    (event) => event.action === "hrx.compensation.decrypt" && event.object_id === COMPENSATION_ID && event.decision === "allow",
  );
  assert.ok(confirmEvent);
  assert.equal(confirmEvent.metadata.amount_minor_included, false);
  assert.equal(confirmEvent.metadata.encrypted_amount_ref_included, false);
  assert.equal(JSON.stringify(confirmEvent).includes(String(SYNTHETIC_AMOUNT_MINOR)), false);
  assert.equal(JSON.stringify(confirmEvent).includes("lawos-comp-v1."), false);
});
