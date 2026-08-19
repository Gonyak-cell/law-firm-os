import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { POSTGRES_TENANT_CONTEXT_SECRET } from "../../persistence/src/postgres/pool.js";
import {
  assertPostgresOutlookDesktopActivationIssueAuthorityPublisher,
  createPostgresOutlookDesktopActivationIssueAuthorityPublisher,
} from "../src/postgres-outlook-desktop-activation-issue-authority-publisher.js";

const TENANT = "tenant-activation-publisher";
const RELEASE = "release-activation-publisher";
const REQUEST = "publish-activation-authority-v1";
const POLICY_REVISION = "jwsuh_canary_2026-08-17.r1";
const PUBLISHED_AT = "2026-08-17T00:00:00.000Z";
const VALID_UNTIL = "2026-08-18T00:00:00.000Z";
const digest = (value) => createHash("sha256").update(value).digest("hex");

function publicationRequest() {
  return {
    macos_code_directory_sha256: digest("code-directory"),
    macos_designated_requirement_sha256: digest("designated-requirement"),
    pilot_policy: {
      owner_principal_id: "user-activation-publisher",
      pilot_id: "jwsuh_canary",
      policy_revision: POLICY_REVISION,
      roster_sha256: digest("roster"),
    },
    release_artifact_id: RELEASE,
    release_ticket_base64: Buffer.from("release-ticket", "utf8").toString("base64"),
    release_ticket_signature_base64: Buffer.alloc(64, 0x31).toString("base64"),
    request_id: REQUEST,
  };
}

function publisherPool() {
  const calls = [];
  const pool = {
    [POSTGRES_TENANT_CONTEXT_SECRET]: Buffer.alloc(32, 0x32),
    async connect() {
      return {
        async query(sql, values = []) {
          const statement = String(sql).replace(/\s+/gu, " ").trim();
          calls.push({ statement, values: [...values] });
          if (statement.includes("lawos_security.current_tenant_id")) {
            return { rows: [{ tenant_id: TENANT }] };
          }
          if (statement.includes(
            "publish_outlook_desktop_activation_issue_authority",
          )) {
            return { rows: [{ value: {
              authority_binding_sha256: digest("authority-binding"),
              outcome: "published",
              published_at: PUBLISHED_AT,
              release_artifact_id: RELEASE,
              release_authority_sha256: digest("release-authority"),
              request_id: REQUEST,
              tenant_id: TENANT,
              valid_until: VALID_UNTIL,
            } }] };
          }
          return { rows: [] };
        },
        release() {
          calls.push({ statement: "RELEASE", values: [] });
        },
      };
    },
  };
  return { calls, pool };
}

test("activation issue authority publisher is a narrow immutable control port", async () => {
  const control = publisherPool();
  const publisher = createPostgresOutlookDesktopActivationIssueAuthorityPublisher({
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  assert.equal(
    assertPostgresOutlookDesktopActivationIssueAuthorityPublisher(publisher),
    publisher,
  );
  assert.deepEqual(Object.keys(publisher).sort(), [
    "authority", "publish", "schema_version",
  ]);
  const receipt = await publisher.publish(publicationRequest());
  assert.equal(receipt.outcome, "published");
  const functionCall = control.calls.find(({ statement }) => statement.includes(
    "publish_outlook_desktop_activation_issue_authority",
  ));
  assert.ok(functionCall);
  assert.deepEqual(JSON.parse(functionCall.values[1]), publicationRequest());
  assert.equal(control.calls.filter(({ statement }) =>
    statement === "BEGIN ISOLATION LEVEL SERIALIZABLE").length, 1);
  assert.equal(control.calls.filter(({ statement }) => statement === "COMMIT").length, 1);
});

test("activation issue authority preserves the Task15 policy revision identifier", async () => {
  const control = publisherPool();
  const publisher = createPostgresOutlookDesktopActivationIssueAuthorityPublisher({
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  const request = publicationRequest();
  assert.equal((await publisher.publish(request)).outcome, "published");
  const functionCall = control.calls.find(({ statement }) => statement.includes(
    "publish_outlook_desktop_activation_issue_authority",
  ));
  assert.equal(
    JSON.parse(functionCall.values[1]).pilot_policy.policy_revision,
    POLICY_REVISION,
  );

  const numeric = publicationRequest();
  numeric.pilot_policy.policy_revision = 1;
  await assert.rejects(publisher.publish(numeric), /policy_revision/u);
});

test("activation issue authority publisher rejects unbound macOS facts", async () => {
  const control = publisherPool();
  const publisher = createPostgresOutlookDesktopActivationIssueAuthorityPublisher({
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  const request = publicationRequest();
  request.macos_code_directory_sha256 = "not-a-digest";
  await assert.rejects(
    publisher.publish(request),
    /macos_code_directory_sha256/u,
  );
  assert.equal(control.calls.length, 0);
});
