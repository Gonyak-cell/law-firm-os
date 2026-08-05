import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders, registeredAccount } from "./helpers/session.js";

const COMPLETION_PATH = "/api/hrx/people/me/outlook-connection/complete";
const AUTHORIZATION_CODE = "0.ABC_people-outlook-http-complete";
const STATE_REF = "lawos_people_outlook_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

async function postCompletion(baseUrl, headers, body) {
  const response = await fetch(`${baseUrl}${COMPLETION_PATH}`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test("signed People Outlook completion enforces its HTTP trust boundary", async (t) => {
  const completionInputs = [];
  const started = await startApiServer({
    port: 0,
    peopleFeatureFlags: { outlook_calendar: true },
    peopleOutlookConnections: {
      complete(input) {
        completionInputs.push(input);
        return {
          provider: "microsoft_graph",
          connection_state: "connected",
          can_manage: true,
          delegated_scope: "Calendars.ReadBasic",
          connected_at: "2026-08-05T00:00:00.000Z",
          expires_at: "2026-08-05T01:00:00.000Z",
          safe_error_code: null,
        };
      },
    },
  });
  t.after(() => new Promise((resolve) => started.server.close(resolve)));
  const baseUrl = `http://${started.host}:${started.port}`;
  const headers = await apiSessionHeaders(
    baseUrl,
    registeredAccount("jwsuh@amic.kr"),
  );

  await t.test("accepts the two-field callback body with signed session identity", async () => {
    const completed = await postCompletion(baseUrl, headers, {
      authorization_code: AUTHORIZATION_CODE,
      state_ref: STATE_REF,
    });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.outcome, "ok");
    assert.equal(completed.body.employee_id, "emp_amic_jwsuh");
    assert.equal(completionInputs.length, 1);
    assert.equal(completionInputs[0].tenant_id, "tenant_amic_matter_vault");
    assert.equal(completionInputs[0].employee_id, "emp_amic_jwsuh");
    assert.equal(completionInputs[0].user_id, "user_amic_jwsuh");
    assert.equal(completionInputs[0].authorization_code, AUTHORIZATION_CODE);
    assert.equal(completionInputs[0].state_ref, STATE_REF);
  });

  await t.test("rejects every caller-supplied identity field", async () => {
    for (const identityField of [
      "actor_id",
      "tenant_id",
      "employee_id",
      "user_id",
      "can_manage",
      "session_email",
      "entra_subject_id",
    ]) {
      const blocked = await postCompletion(baseUrl, headers, {
        authorization_code: AUTHORIZATION_CODE,
        state_ref: STATE_REF,
        [identityField]: "forged",
      });
      assert.equal(blocked.status, 400, identityField);
      assert.equal(
        blocked.body.safe_error_code,
        "OUTLOOK_OAUTH_IDENTITY_INPUT_FORBIDDEN",
        identityField,
      );
    }
    assert.equal(completionInputs.length, 1);
  });

  await t.test("rejects caller-supplied OAuth credentials", async () => {
    const blocked = await postCompletion(baseUrl, headers, {
      authorization_code: AUTHORIZATION_CODE,
      state_ref: STATE_REF,
      client_secret: "forged-secret",
    });
    assert.equal(blocked.status, 400);
    assert.equal(
      blocked.body.safe_error_code,
      "OUTLOOK_OAUTH_BOUNDARY_INVALID",
    );
    assert.equal(completionInputs.length, 1);
  });

  await t.test("rejects unexpected callback fields", async () => {
    const blocked = await postCompletion(baseUrl, headers, {
      authorization_code: AUTHORIZATION_CODE,
      state_ref: STATE_REF,
      callback_url: "https://attacker.invalid/callback",
    });
    assert.equal(blocked.status, 400);
    assert.equal(
      blocked.body.safe_error_code,
      "OUTLOOK_OAUTH_CALLBACK_INVALID",
    );
    assert.equal(completionInputs.length, 1);
  });
});
