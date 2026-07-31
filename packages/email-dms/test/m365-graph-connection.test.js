import assert from "node:assert/strict";
import test from "node:test";
import { createEmailDmsRepository } from "../src/repository.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
  normalizeM365Connection,
} from "../src/m365-connection-model.js";
import {
  M365_GRAPH_ERROR_CODES,
  assessM365ExternalReadiness,
  createM365GraphConnectionService,
} from "../src/m365-graph-connection-service.js";
import {
  createM365CalendarPort,
  createM365MailPort,
} from "../src/m365-graph-ports.js";

const TENANT = "tenant_m365_connection_test";
const USER = "user_m365_connection_test";
const SUBJECT = "entra_subject_m365_connection_test";
const NOW = "2026-07-30T06:00:00.000Z";
const EXPIRES = "2026-08-30T06:00:00.000Z";
const REDIRECT_URI =
  "https://app.example.invalid/api/outlook/connection/callback";

function principal(overrides = {}) {
  return {
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    ...overrides,
  };
}

function connection(overrides = {}) {
  return {
    model_type: "M365Connection",
    m365_connection_id: m365ConnectionId(principal()),
    ...principal(),
    mailbox_address_hash: hashMailboxAddress(
      "synthetic.m365.user@example.invalid",
    ),
    credential_ref: "aws-secrets-manager:synthetic/m365/user",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: NOW,
    expires_at: EXPIRES,
    revoked_at: null,
    state_version: 1,
    ...overrides,
  };
}

function fakeDependencies() {
  const calls = [];
  const credentials = new Map();
  const credentialVault = {
    async storeDelegatedCredential(input) {
      calls.push("vault:store");
      const reference = input.credential_ref
        ?? "aws-secrets-manager:synthetic/m365/user";
      credentials.set(reference, structuredClone(input.token_bundle));
      return reference;
    },
    async resolveDelegatedCredential({ credential_ref }) {
      calls.push("vault:resolve");
      return structuredClone(credentials.get(credential_ref));
    },
    async deleteDelegatedCredential({ credential_ref }) {
      calls.push("vault:delete");
      credentials.delete(credential_ref);
    },
  };
  const provider = {
    async beginDelegatedAuthorization(input) {
      calls.push("provider:begin");
      assert.equal(input.mailbox_scope, "me");
      assert.deepEqual(input.scopes, M365_GRAPH_REQUIRED_SCOPES);
      return {
        authorization_url:
          "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?state=synthetic",
        expires_at: "2026-07-30T06:10:00.000Z",
        pkce_used: true,
        state_bound: true,
      };
    },
    async completeDelegatedAuthorization(input) {
      calls.push("provider:complete");
      assert.equal(input.mailbox_scope, "me");
      assert.equal(input.expected_entra_subject_id, SUBJECT);
      return {
        authorization_attempt_consumed: true,
        entra_subject_id: SUBJECT,
        mailbox_address: "synthetic.m365.user@example.invalid",
        granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        consented_at: NOW,
        expires_at: EXPIRES,
        token_bundle: {
          access_token: "synthetic-access-token-never-persist",
          refresh_token: "synthetic-refresh-token-never-persist",
        },
      };
    },
    async getMeMessageMime(input) {
      calls.push("provider:mail:/me");
      assert.equal(input.mailbox_scope, "me");
      assert.equal(input.prefer_immutable_id, true);
      assert.equal(
        input.rest_message_id,
        "rest-message-synthetic-001",
      );
      assert.equal(input.source_id_type, "restId");
      assert.equal(
        input.target_id_type,
        "restImmutableEntryId",
      );
      assert.equal(
        input.credential.access_token,
        "synthetic-access-token-never-persist",
      );
      return {
        mime_bytes: Buffer.from("From: sender@example.invalid\r\n\r\nSynthetic"),
        immutable_message_id: "immutable-message-synthetic-001",
        internet_message_id: "<synthetic-001@example.invalid>",
        provider_request_id: "request-mail-synthetic-001",
        message_metadata: {
          conversation_id: "conversation-synthetic-001",
          internet_message_id: "<synthetic-001@example.invalid>",
          subject: "Synthetic inquiry",
          sender: {
            display_name: "Synthetic sender",
            address: "SENDER@example.invalid",
            raw_body: "must-not-cross-port",
          },
          recipients: [{
            display_name: "Intake",
            address: "INTAKE@example.invalid",
            recipient_type: "to",
            provider_payload: "must-not-cross-port",
          }],
          received_at: "2026-07-30T05:59:00.000Z",
          has_attachments: false,
          body_html: "must-not-cross-port",
        },
      };
    },
    async createMeCalendarEvent(input) {
      calls.push("provider:calendar:/me");
      assert.equal(input.mailbox_scope, "me");
      assert.deepEqual(input.event, {
        subject: "법률 상담",
        start_at: "2026-08-01T01:00:00.000Z",
        end_at: "2026-08-01T02:00:00.000Z",
        time_zone: "UTC",
        sensitivity: "private",
        show_as: "busy",
      });
      return {
        event_id: "event-synthetic-001",
        web_link: "https://outlook.office.com/calendar/item/synthetic",
        provider_request_id: "request-calendar-synthetic-001",
      };
    },
    async revokeDelegatedCredential(input) {
      calls.push("provider:revoke");
      assert.equal(input.mailbox_scope, "me");
      assert.equal(
        input.credential.refresh_token,
        "synthetic-refresh-token-never-persist",
      );
      return { revoked: true };
    },
  };
  return { calls, credentialVault, credentials, provider };
}

test("M365Connection은 delegated 본인 메일함과 보안 저장소 참조만 보존한다", () => {
  const normalized = normalizeM365Connection(connection());
  assert.equal(normalized.connection_authority, "delegated");
  assert.equal(normalized.mailbox_scope, "me");
  assert.equal(normalized.credential_material_included, false);
  assert.deepEqual(normalized.granted_scopes, [
    "Calendars.ReadWrite",
    "Mail.Read",
    "offline_access",
  ]);
  assert.throws(
    () => normalizeM365Connection({
      ...connection(),
      access_token: "must-not-persist",
    }),
    /cannot be stored/,
  );
  assert.throws(
    () => normalizeM365Connection({
      ...connection(),
      granted_scopes: ["Mail.Read", "User.Read"],
    }),
    /unsupported/,
  );
  assert.throws(
    () => normalizeM365Connection({
      ...connection(),
      mailbox_scope: "shared",
    }),
    /must be me/,
  );
  assert.throws(
    () => normalizeM365Connection({
      ...connection(),
      credential_ref: "opaque-but-not-an-approved-secret-store",
    }),
    /AWS Secrets Manager reference/,
  );
  assert.throws(
    () => normalizeM365Connection({
      ...connection(),
      credential_ref: "aws-secrets-manager:invalid secret id",
    }),
    /AWS Secrets Manager reference/,
  );
});

test("CL-P3-W00-T01 delegated 연결과 Mail·Calendar port는 본인 /me만 사용하고 token을 저장하지 않는다", async () => {
  const repository = createEmailDmsRepository();
  const dependencies = fakeDependencies();
  const disabled = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
  });
  await assert.rejects(
    disabled.beginAuthorization({
      ...principal(),
      redirect_uri: REDIRECT_URI,
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.feature_disabled
    ),
  );

  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
  });
  const before = service.getConnectionStatus(principal());
  assert.equal(before.connection.status, "not_connected");
  assert.equal(before.release_readiness.status, "blocked");
  assert.equal(before.automatic_mailbox_scan_enabled, false);
  await assert.rejects(
    service.beginAuthorization({
      ...principal(),
      redirect_uri: "https://attacker.example.invalid/callback",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.redirect_uri_invalid
    ),
  );
  assert.equal(dependencies.calls.includes("provider:begin"), false);

  const started = await service.beginAuthorization({
    ...principal(),
    redirect_uri: REDIRECT_URI,
  });
  assert.equal(started.pkce_used, true);
  assert.equal(started.state_bound, true);

  const completed = await service.completeAuthorization({
    ...principal(),
    code: "single-use-synthetic-code",
    state: "single-use-synthetic-state",
    redirect_uri: REDIRECT_URI,
  });
  assert.equal(completed.outcome, "connected");
  assert.equal(completed.connection.status, "connected");
  assert.equal(completed.connection.state_version, 1);

  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  });
  assert.equal(persisted.length, 1);
  const serialized = JSON.stringify({
    records: persisted,
    audits: repository.listAudit({ tenant_id: TENANT }),
  });
  assert.equal(serialized.includes("synthetic-access-token"), false);
  assert.equal(serialized.includes("synthetic-refresh-token"), false);
  assert.equal(persisted[0].credential_material_included, false);
  assert.equal(Object.hasOwn(persisted[0], "mailbox_address"), false);
  assert.equal(
    dependencies.credentials.get(persisted[0].credential_ref)
      .mailbox_address,
    "synthetic.m365.user@example.invalid",
  );

  const mail = createM365MailPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });
  const message = await mail.getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-synthetic-001",
  });
  assert.equal(message.immutable_message_id, "immutable-message-synthetic-001");
  assert.equal(
    message.mailbox_address,
    "synthetic.m365.user@example.invalid",
  );
  assert.equal(message.mime_bytes.byteLength > 0, true);
  assert.equal(
    JSON.stringify(message.message_metadata).includes(
      "must-not-cross-port",
    ),
    false,
  );
  assert.equal(
    message.message_metadata.sender.address,
    "sender@example.invalid",
  );
  const credentialRef = persisted[0].credential_ref;
  const validCredential =
    structuredClone(dependencies.credentials.get(credentialRef));
  dependencies.credentials.set(credentialRef, {
    ...validCredential,
    mailbox_address: "another-user@example.invalid",
  });
  const mailCallCount = dependencies.calls.filter(
    (call) => call === "provider:mail:/me",
  ).length;
  await assert.rejects(
    mail.getOwnMessageMime({
      ...principal(),
      rest_message_id: "rest-message-synthetic-001",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.provider_invalid
    ),
  );
  assert.equal(
    dependencies.calls.filter(
      (call) => call === "provider:mail:/me",
    ).length,
    mailCallCount,
  );
  const credentialWithoutMailbox = structuredClone(validCredential);
  delete credentialWithoutMailbox.mailbox_address;
  dependencies.credentials.set(
    credentialRef,
    credentialWithoutMailbox,
  );
  await assert.rejects(
    mail.getOwnMessageMime({
      ...principal(),
      rest_message_id: "rest-message-synthetic-001",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.provider_invalid
    ),
  );
  assert.equal(
    dependencies.calls.filter(
      (call) => call === "provider:mail:/me",
    ).length,
    mailCallCount,
  );
  dependencies.credentials.set(credentialRef, validCredential);
  await assert.rejects(
    mail.getOwnMessageMime({
      ...principal(),
      rest_message_id: "rest-message-synthetic-001",
      mailbox_user_principal_name: "shared@example.invalid",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.mailbox_override
    ),
  );
  await assert.rejects(
    mail.getOwnMessageMime({
      ...principal({ entra_subject_id: "another-entra-subject" }),
      rest_message_id: "rest-message-synthetic-001",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.subject_mismatch
    ),
  );

  const calendar = createM365CalendarPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });
  const event = await calendar.createOwnEvent({
    ...principal(),
    transaction_id: "00000000-0000-5000-8000-000000000001",
    event: {
      subject: "법률 상담",
      start_at: "2026-08-01T01:00:00.000Z",
      end_at: "2026-08-01T02:00:00.000Z",
      time_zone: "UTC",
      sensitivity: "private",
      show_as: "busy",
    },
  });
  assert.equal(event.event_id, "event-synthetic-001");
  assert.equal(
    event.transaction_id,
    "00000000-0000-5000-8000-000000000001",
  );
  assert.equal(dependencies.calls.includes("provider:mail:/me"), true);
  assert.equal(dependencies.calls.includes("provider:calendar:/me"), true);

  const invalidCalendar = createM365CalendarPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: {
      async createMeCalendarEvent() {
        return {
          event_id: "event-invalid-web-link",
          web_link: "https://example.invalid/open-redirect",
        };
      },
    },
    feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });
  await assert.rejects(
    invalidCalendar.createOwnEvent({
      ...principal(),
      transaction_id: "00000000-0000-5000-8000-000000000002",
      event: {
        subject: "법률 상담",
        start_at: "2026-08-01T01:00:00.000Z",
        end_at: "2026-08-01T02:00:00.000Z",
        time_zone: "UTC",
        sensitivity: "private",
        show_as: "busy",
      },
    }),
    (error) => (
      error.safe_error_code
      === M365_GRAPH_ERROR_CODES.provider_invalid
    ),
  );

  const disconnected = await service.revokeConnection({
    ...principal(),
    expected_state_version: 1,
    reason: "사용자 연결 해제",
  });
  assert.equal(disconnected.outcome, "disconnected");
  assert.equal(disconnected.connection.status, "revoked");
  assert.deepEqual(
    dependencies.calls.slice(-3),
    ["vault:resolve", "provider:revoke", "vault:delete"],
  );
  const auditText = JSON.stringify(repository.listAudit({
    tenant_id: TENANT,
  }));
  assert.equal(auditText.includes("synthetic-access-token"), false);
  assert.equal(auditText.includes("synthetic-refresh-token"), false);
});

test("CL-P3-W00-T01 provider 해제 뒤 credential 삭제 실패는 연결을 해제 상태로 남기고 안전한 오류를 반환한다", async () => {
  const repository = createEmailDmsRepository({
    seedRecords: [connection()],
  });
  const dependencies = fakeDependencies();
  dependencies.credentials.set(connection().credential_ref, {
    access_token: "synthetic-access-token-never-persist",
    refresh_token: "synthetic-refresh-token-never-persist",
  });
  dependencies.credentialVault.deleteDelegatedCredential = async () => {
    dependencies.calls.push("vault:delete");
    throw new Error("synthetic secret cleanup failure");
  };
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
  });

  await assert.rejects(
    service.revokeConnection({
      ...principal(),
      expected_state_version: 1,
      reason: "사용자 연결 해제",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.credential_delete_failed
      && error.status === 502
      && !error.message.includes("synthetic secret cleanup failure")
    ),
  );

  assert.deepEqual(
    dependencies.calls,
    ["vault:resolve", "provider:revoke", "vault:delete"],
  );
  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(persisted.revoked_at, NOW);
  assert.equal(persisted.state_version, 2);
  const audit = repository.listAudit({ tenant_id: TENANT }).at(-1);
  assert.equal(audit.event_type, "m365.connection.revoked");
  assert.equal(audit.payload.provider_revoked_first, true);
  assert.equal(audit.payload.credential_reference_deleted, false);
  assert.equal(
    JSON.stringify({ persisted, audit }).includes(
      "synthetic secret cleanup failure",
    ),
    false,
  );
});

test("CL-P3-W00-T01 만료·scope 부족·외부 영수증 누락은 출시와 provider 호출을 막는다", async () => {
  const dependencies = fakeDependencies();
  const expiredRepository = createEmailDmsRepository({
    seedRecords: [connection({
      consented_at: "2026-07-01T00:00:00.000Z",
      expires_at: "2026-07-30T05:59:59.000Z",
    })],
  });
  dependencies.credentials.set(
    connection().credential_ref,
    { access_token: "should-not-be-used" },
  );
  const expiredMail = createM365MailPort({
    repository: expiredRepository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });
  await assert.rejects(
    expiredMail.getOwnMessageMime({
      ...principal(),
      message_id: "expired-message",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.connection_not_found
    ),
  );
  assert.equal(dependencies.calls.includes("provider:mail:/me"), false);

  const scopeRepository = createEmailDmsRepository({
    seedRecords: [connection({
      granted_scopes: ["Calendars.ReadWrite", "offline_access"],
    })],
  });
  const scopeMail = createM365MailPort({
    repository: scopeRepository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });
  await assert.rejects(
    scopeMail.getOwnMessageMime({
      ...principal(),
      message_id: "scope-message",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.scope_insufficient
    ),
  );

  const blocked = assessM365ExternalReadiness();
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.release_allowed, false);
  assert.equal(blocked.missing_evidence.length, 8);
  assert.equal(blocked.production_ready_claim, false);
});

test("CL-P3-W00-T01 잘못된 provider 응답은 credential 저장 전에 차단한다", async () => {
  const repository = createEmailDmsRepository();
  const dependencies = fakeDependencies();
  dependencies.provider.completeDelegatedAuthorization = async () => ({
    authorization_attempt_consumed: true,
    entra_subject_id: SUBJECT,
    mailbox_address: "synthetic.m365.user@example.invalid",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: NOW,
    expires_at: "2026-07-30T05:59:59.000Z",
    token_bundle: {
      access_token: "invalid-provider-access-token",
      refresh_token: "invalid-provider-refresh-token",
    },
  });
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
  });
  await assert.rejects(
    service.completeAuthorization({
      ...principal(),
      code: "invalid-provider-code",
      state: "invalid-provider-state",
      redirect_uri: REDIRECT_URI,
    }),
    /expires_at must be after consented_at/,
  );
  assert.equal(dependencies.calls.includes("vault:store"), false);
  assert.deepEqual(repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  }), []);
});
