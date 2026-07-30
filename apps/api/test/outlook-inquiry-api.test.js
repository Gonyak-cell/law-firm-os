import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import {
  M365_GRAPH_ERROR_CODES,
} from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import {
  createEmailDmsRepository,
} from "../../../packages/email-dms/src/repository.js";
import {
  handleOutlookAddinApiRequest,
} from "../src/outlook-addin-runtime-context.js";

const TENANT = "tenant_outlook_inquiry_api";
const USER = "user_outlook_inquiry_api";
const SUBJECT = "entra_subject_outlook_inquiry_api";
const REST_MESSAGE_ID = "rest-message-outlook-inquiry-api";
const IMMUTABLE_MESSAGE_ID =
  "immutable-message-outlook-inquiry-api";
const MIME = Buffer.from([
  "From: sender@example.invalid",
  "To: intake@example.invalid",
  "Subject: Synthetic inquiry API",
  "Message-ID: <outlook-inquiry-api@example.invalid>",
  "MIME-Version: 1.0",
  "",
  "Synthetic inquiry body must not enter the API response",
].join("\r\n"));

function permissionContext({ allowed = true } = {}) {
  return {
    principal: {
      ok: true,
      source: "api-signed-session",
      header_only_trust_allowed: false,
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
      role_ids: ["lawos_staff"],
    },
    rules: allowed
      ? [{
        id: "outlook-inquiry-capture",
        effect: "allow",
        action_prefix: "outlook:inquiry:",
      }]
      : [],
    object_acl: [],
  };
}

function repository() {
  return createEmailDmsRepository({
    seedRecords: [{
      model_type: "M365Connection",
      m365_connection_id: m365ConnectionId({
        tenant_id: TENANT,
        user_id: USER,
      }),
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
      mailbox_address_hash: hashMailboxAddress(
        "intake-user@example.invalid",
      ),
      credential_ref:
        "aws-secrets-manager:synthetic/outlook-inquiry-api",
      granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
      consented_at: "2026-07-30T08:00:00.000Z",
      expires_at: "2026-08-30T08:00:00.000Z",
      revoked_at: null,
      state_version: 1,
    }],
  });
}

function runtime({
  enabled = true,
  inquiryEnabled = enabled,
} = {}) {
  const emailDmsRepository = repository();
  let providerCalls = 0;
  return {
    emailDmsRepository,
    get provider_calls() {
      return providerCalls;
    },
    value: {
      emailDmsRuntime: { repository: emailDmsRepository },
      m365GraphConfig: {
        feature_enabled: enabled,
        inquiry_feature_enabled: inquiryEnabled,
        provider_runtime_enabled: enabled,
        clock: () => new Date("2026-07-30T08:05:00.000Z"),
        credential_vault: {
          async resolveDelegatedCredential() {
            return {
              access_token:
                "outlook-inquiry-api-access-token-never-return",
              refresh_token:
                "outlook-inquiry-api-refresh-token-never-return",
            };
          },
        },
        provider: {
          async getMeMessageMime(input) {
            providerCalls += 1;
            assert.equal(input.mailbox_scope, "me");
            assert.equal(input.rest_message_id, REST_MESSAGE_ID);
            assert.equal(input.source_id_type, "restId");
            assert.equal(
              input.target_id_type,
              "restImmutableEntryId",
            );
            return {
              mime_bytes: MIME,
              immutable_message_id: IMMUTABLE_MESSAGE_ID,
              internet_message_id:
                "<outlook-inquiry-api@example.invalid>",
              provider_request_id:
                "provider-request-outlook-inquiry-api",
            };
          },
        },
      },
    },
  };
}

function request({
  body,
  context = permissionContext(),
  runtime: runtimeValue,
  requestId = "request-outlook-inquiry-api",
}) {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/inquiries/message/resolve",
    method: "POST",
    body,
    context,
    requestId,
    runtime: runtimeValue,
  });
}

test("CL-P3-W01-T02 Outlook 문의 API는 현재 사용자의 REST ID만 Graph MIME으로 확인하고 SHA 영수증만 반환한다", async () => {
  const fixture = runtime();
  const result = await request({
    body: {
      tenant_id: TENANT,
      rest_message_id: REST_MESSAGE_ID,
    },
    runtime: fixture.value,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.outcome, "message_resolved");
  assert.equal(
    result.body.item.graph_immutable_message_id,
    IMMUTABLE_MESSAGE_ID,
  );
  assert.equal(
    result.body.item.mime_sha256,
    createHash("sha256").update(MIME).digest("hex"),
  );
  assert.equal(result.body.item.mime_byte_size, MIME.byteLength);
  assert.equal(result.body.item.raw_mime_included, false);
  assert.equal(result.body.item.message_body_included, false);
  assert.equal(result.body.item.product_record_created, false);
  assert.equal(fixture.provider_calls, 1);
  assert.equal(
    fixture.emailDmsRepository.list({
      tenant_id: TENANT,
    }).length,
    1,
  );
  const audit = fixture.emailDmsRepository.listAudit({
    tenant_id: TENANT,
  });
  assert.equal(audit.length, 1);
  assert.equal(audit[0].payload.mime_sha256, result.body.item.mime_sha256);
  const serialized = JSON.stringify({
    response: result.body,
    audit,
  });
  assert.equal(
    serialized.includes("Synthetic inquiry body"),
    false,
  );
  assert.equal(serialized.includes("access-token-never-return"), false);
  assert.equal(serialized.includes("refresh-token-never-return"), false);
});

test("VC-CL-INQ-005 위조 tenant·mailbox와 권한 없는 사용자는 Graph 호출 전에 403으로 차단된다", async () => {
  const fixture = runtime();
  const forgedTenant = await request({
    body: {
      tenant_id: "tenant-forged",
      rest_message_id: REST_MESSAGE_ID,
    },
    runtime: fixture.value,
    requestId: "request-forged-tenant",
  });
  assert.equal(forgedTenant.status, 403);
  assert.equal(
    forgedTenant.body.safe_error_codes[0],
    "M365_CONNECTION_TENANT_MISMATCH",
  );

  const forgedMailbox = await request({
    body: {
      tenant_id: TENANT,
      rest_message_id: REST_MESSAGE_ID,
      mailbox_address: "shared@example.invalid",
    },
    runtime: fixture.value,
    requestId: "request-forged-mailbox",
  });
  assert.equal(forgedMailbox.status, 403);
  assert.equal(
    forgedMailbox.body.safe_error_codes[0],
    M365_GRAPH_ERROR_CODES.mailbox_override,
  );

  const denied = await request({
    body: {
      tenant_id: TENANT,
      rest_message_id: REST_MESSAGE_ID,
    },
    context: permissionContext({ allowed: false }),
    runtime: fixture.value,
    requestId: "request-denied-user",
  });
  assert.equal(denied.status, 403);
  assert.equal(
    denied.body.safe_error_codes[0],
    "OUTLOOK_ADDIN_PERMISSION_DENIED",
  );
  assert.equal(fixture.provider_calls, 0);
  assert.equal(
    fixture.emailDmsRepository.listAudit({
      tenant_id: TENANT,
    }).length,
    0,
  );
});

test("VC-CL-INQ-006 Graph 연동이 꺼져 있으면 문의나 증거를 만들지 않고 명확히 차단한다", async () => {
  const fixture = runtime({
    enabled: true,
    inquiryEnabled: false,
  });
  const result = await request({
    body: {
      tenant_id: TENANT,
      rest_message_id: REST_MESSAGE_ID,
    },
    runtime: fixture.value,
    requestId: "request-graph-disabled",
  });
  assert.equal(result.status, 503);
  assert.equal(
    result.body.safe_error_codes[0],
    M365_GRAPH_ERROR_CODES.feature_disabled,
  );
  assert.equal(fixture.provider_calls, 0);
  assert.equal(
    fixture.emailDmsRepository.list({
      tenant_id: TENANT,
    }).length,
    1,
  );
  assert.equal(
    fixture.emailDmsRepository.listAudit({
      tenant_id: TENANT,
    }).length,
    0,
  );
  assert.equal(JSON.stringify(result.body).includes("mime_bytes"), false);
});
