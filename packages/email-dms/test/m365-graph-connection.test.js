import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createEmailDmsRepository } from "../src/repository.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
  normalizeM365Connection,
} from "../src/m365-connection-model.js";
import {
  M365_GRAPH_CALLBACK_MODES,
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
const CLIENT_REFRESH_PROOF = "C".repeat(43);
const ROTATED_CLIENT_REFRESH_PROOF = "R".repeat(43);
const AUTHORIZATION_STATE = "single-use-synthetic-state";
const AUTHORIZATION_ATTEMPT_REF = createHash("sha256")
  .update(AUTHORIZATION_STATE)
  .digest("hex");

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
    referenceForGeneration({
      entra_subject_id,
      credential_generation,
    }) {
      const subjectDigest = createHash("sha256")
        .update(entra_subject_id)
        .digest("hex")
        .slice(0, 16);
      return `aws-secrets-manager:synthetic/m365/${subjectDigest}/${credential_generation}`;
    },
    async storeDelegatedCredential(input) {
      calls.push("vault:store");
      const reference = input.credential_ref
        ?? this.referenceForGeneration(input);
      if (!credentials.has(reference)) {
        credentials.set(reference, structuredClone(input.token_bundle));
      }
      return reference;
    },
    async resolveDelegatedCredential({ credential_ref }) {
      calls.push("vault:resolve");
      if (!credentials.has(credential_ref)) {
        throw Object.assign(new Error("credential not found"), {
          name: "ResourceNotFoundException",
        });
      }
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
          `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?state=${AUTHORIZATION_STATE}`,
        attempt_ref: AUTHORIZATION_ATTEMPT_REF,
        callback_mode: input.callback_mode,
        expires_at: "2026-07-30T06:10:00.000Z",
        pkce_used: true,
        state_bound: true,
      };
    },
    async completeDelegatedAuthorization(input) {
      calls.push("provider:complete");
      assert.deepEqual(
        {
          tenant_id: input.tenant_id,
          user_id: input.user_id,
          entra_subject_id: input.entra_subject_id,
        },
        principal(),
      );
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
          refresh_profile: "client",
          refresh_profile_proof: CLIENT_REFRESH_PROOF,
          expires_at: EXPIRES,
          granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
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
          from: {
            display_name: "Synthetic author",
            address: "AUTHOR@example.invalid",
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
          is_in_sent_items: true,
          is_draft: false,
          body_html: "must-not-cross-port",
          parent_folder_id: "must-not-cross-port",
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
    async refreshDelegatedCredential() {
      throw new Error("refresh should not run for an unexpired credential");
    },
  };
  return { calls, credentialVault, credentials, provider };
}

function generationRef(credentialVault, stateVersion) {
  return credentialVault.referenceForGeneration({
    ...principal(),
    credential_generation: `m365-connection-state-${stateVersion}`,
  });
}

test("M365Connection은 delegated 본인 메일함과 보안 저장소 참조만 보존한다", () => {
  const normalized = normalizeM365Connection(connection());
  assert.equal(normalized.connection_authority, "delegated");
  assert.equal(normalized.mailbox_scope, "me");
  assert.equal(normalized.credential_material_included, false);
  assert.deepEqual(normalized.pending_vault_cleanup_refs, []);
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
      pending_vault_cleanup_refs: [connection().credential_ref],
    }),
    /active credential_ref cannot be pending cleanup/,
  );
  assert.throws(
    () => normalizeM365Connection({
      ...connection({ revoked_at: NOW }),
      pending_vault_cleanup_refs: [
        "aws-secrets-manager:synthetic/m365/retired",
        "aws-secrets-manager:synthetic/m365/retired",
      ],
    }),
    /cannot contain duplicates/,
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
  assert.equal(before.connection.mailbox_address_hash, null);
  assert.equal(before.connection.credential_cleanup_pending, false);
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
  assert.equal(started.attempt_ref, AUTHORIZATION_ATTEMPT_REF);
  assert.equal(started.callback_mode, M365_GRAPH_CALLBACK_MODES.legacy);

  const pendingAttempt = service.getAuthorizationAttemptStatus({
    ...principal(),
    attempt_ref: started.attempt_ref,
  });
  assert.equal(pendingAttempt.status, "pending");

  const completed = await service.completeAuthorization({
    ...principal(),
    code: "single-use-synthetic-code",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
  });
  assert.equal(completed.outcome, "connected");
  assert.equal(completed.connection.status, "connected");
  assert.equal(completed.connection.state_version, 1);
  assert.equal(
    completed.connection.mailbox_address_hash,
    hashMailboxAddress("synthetic.m365.user@example.invalid"),
  );
  assert.equal(Object.hasOwn(completed.connection, "mailbox_address"), false);

  const completedAttempt = service.getAuthorizationAttemptStatus({
    ...principal(),
    attempt_ref: started.attempt_ref,
  });
  assert.equal(completedAttempt.status, "complete");
  assert.equal(service.getAuthorizationAttemptStatus({
    ...principal(),
    attempt_ref: "f".repeat(64),
  }).status, "pending");

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
  assert.equal(serialized.includes(CLIENT_REFRESH_PROOF), false);
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
  assert.equal(
    message.message_metadata.from.address,
    "author@example.invalid",
  );
  assert.equal(message.message_metadata.is_in_sent_items, true);
  assert.equal(message.message_metadata.is_draft, false);
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
  assert.equal(disconnected.connection.credential_cleanup_pending, true);
  assert.equal(
    Object.hasOwn(disconnected.connection, "pending_vault_cleanup_refs"),
    false,
  );
  assert.deepEqual(
    dependencies.calls.slice(-2),
    ["vault:resolve", "provider:revoke"],
  );
  const revokedConnection = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.deepEqual(revokedConnection.pending_vault_cleanup_refs, [
    credentialRef,
    generationRef(dependencies.credentialVault, 2),
  ]);
  const auditText = JSON.stringify(repository.listAudit({
    tenant_id: TENANT,
  }));
  assert.equal(auditText.includes("synthetic-access-token"), false);
  assert.equal(auditText.includes("synthetic-refresh-token"), false);
  assert.equal(auditText.includes(CLIENT_REFRESH_PROOF), false);
});

test("기존 durable 연결 replay는 synthetic request hash를 허용하되 operation 충돌은 거부한다", async () => {
  const idempotencyKey = `m365-connect:${AUTHORIZATION_ATTEMPT_REF}`;
  const dependencies = fakeDependencies();
  const legacyRepository = createEmailDmsRepository();
  legacyRepository.create(connection());
  legacyRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: idempotencyKey,
    operation: `request-hash:${"a".repeat(64)}`,
    response: {
      outcome: "connected",
      m365_connection_id: m365ConnectionId(principal()),
      state_version: 1,
    },
  });
  const legacyService = createM365GraphConnectionService({
    repository: legacyRepository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
  });
  assert.equal(legacyService.getAuthorizationAttemptStatus({
    ...principal(),
    attempt_ref: AUTHORIZATION_ATTEMPT_REF,
  }).status, "complete");
  const replay = await legacyService.completeAuthorization({
    ...principal(),
    code: "unused-replay-code",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
  });
  assert.equal(replay.replayed, true);
  assert.equal(dependencies.calls.includes("provider:complete"), false);

  const conflictingRepository = createEmailDmsRepository();
  conflictingRepository.create(connection());
  conflictingRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: idempotencyKey,
    operation: "unrelated.operation",
    response: {
      operation: "m365.connection.connect",
      outcome: "connected",
      m365_connection_id: m365ConnectionId(principal()),
      state_version: 1,
    },
  });
  const conflictingService = createM365GraphConnectionService({
    repository: conflictingRepository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
  });
  assert.throws(
    () => conflictingService.getAuthorizationAttemptStatus({
      ...principal(),
      attempt_ref: AUTHORIZATION_ATTEMPT_REF,
    }),
    (error) => error.safe_error_code === M365_GRAPH_ERROR_CODES.provider_invalid,
  );
  await assert.rejects(
    conflictingService.completeAuthorization({
      ...principal(),
      code: "unused-conflicting-code",
      state: AUTHORIZATION_STATE,
      redirect_uri: REDIRECT_URI,
    }),
    (error) => error.safe_error_code === M365_GRAPH_ERROR_CODES.provider_invalid,
  );
});

test("새 연결 credential은 결정적 generation으로 저장하고 outer 실패 보상 삭제를 등록하지 않는다", async () => {
  const repository = createEmailDmsRepository();
  const dependencies = fakeDependencies();
  const compensations = [];
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    request_failure_compensator: {
      register(compensation) {
        compensations.push(compensation);
      },
    },
  });

  await service.completeAuthorization({
    ...principal(),
    code: "single-use-synthetic-code",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
  });
  assert.equal(dependencies.credentials.size, 1);
  assert.equal(compensations.length, 0);
  assert.equal(dependencies.credentials.size, 1);
  assert.equal(
    repository.list({ tenant_id: TENANT, model_type: "M365Connection" })[0]
      .credential_ref,
    generationRef(dependencies.credentialVault, 1),
  );
});

function localCompletionCheckpoint(repository) {
  const run = ({ apply }) => repository.transaction(apply);
  return Object.freeze({ claim: run, finalize: run, fail: run });
}

function completionRequestFingerprint({
  state,
  code,
  redirect_uri = REDIRECT_URI,
}) {
  const digest = (value) => createHash("sha256")
    .update(value)
    .digest("hex");
  return digest(JSON.stringify({
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    attempt_ref: digest(state),
    authorization_code_hash: digest(code),
    redirect_uri_hash: digest(redirect_uri),
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
  }));
}

function checkpointClaim(repository, {
  state,
  code,
  redirect_uri = REDIRECT_URI,
  claimant = "another-callback-request",
} = {}) {
  const attemptRef = createHash("sha256").update(state).digest("hex");
  repository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `m365-connect:${attemptRef}:claim`,
    operation: "m365.connection.completion.claim",
    request_fingerprint: completionRequestFingerprint({
      state,
      code,
      redirect_uri,
    }),
    response: {
      outcome: "claimed",
      attempt_ref: attemptRef,
      claimant_hash: createHash("sha256").update(claimant).digest("hex"),
      m365_connection_id: m365ConnectionId(principal()),
      credential_material_included: false,
    },
    created_at: NOW,
  });
  return attemptRef;
}

test("Client callback checkpoint는 provider를 한 번만 교환하고 replay는 attempt Secret으로 끝낸다", async () => {
  const repository = createEmailDmsRepository();
  const dependencies = fakeDependencies();
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(repository),
  });
  const input = {
    ...principal(),
    code: "checkpoint-code",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "callback-request-1",
  };

  const connected = await service.completeAuthorization(input);
  const replay = await service.completeAuthorization({
    ...input,
    completion_claimant: "callback-request-2",
  });

  assert.equal(connected.outcome, "connected");
  assert.equal(replay.replayed, true);
  assert.equal(
    dependencies.calls.filter((call) => call === "provider:complete").length,
    1,
  );
  const attemptRef = createHash("sha256")
    .update(AUTHORIZATION_STATE)
    .digest("hex");
  const attemptCredentialRef = dependencies.credentialVault
    .referenceForGeneration({
      ...principal(),
      credential_generation: `m365-authorization-attempt-${attemptRef}`,
    });
  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(persisted.credential_ref, attemptCredentialRef);
  assert.deepEqual(persisted.pending_vault_cleanup_refs, [
    generationRef(dependencies.credentialVault, 1),
  ]);
  assert.equal(
    dependencies.credentials.get(attemptCredentialRef)
      .authorization_attempt_ref,
    attemptRef,
  );
  assert.equal(
    dependencies.credentials.get(attemptCredentialRef).entra_subject_id,
    SUBJECT,
  );
  assert.doesNotMatch(
    JSON.stringify(repository.snapshot()),
    /checkpoint-code/u,
  );
});

test("Client callback은 같은 state에 다른 code를 replay하지 않는다", async () => {
  const repository = createEmailDmsRepository();
  const dependencies = fakeDependencies();
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(repository),
  });
  const input = {
    ...principal(),
    code: "checkpoint-conflict-original-code",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "checkpoint-conflict-first",
  };
  await service.completeAuthorization(input);
  const durableBefore = repository.snapshot();
  const credentialsBefore = structuredClone([
    ...dependencies.credentials.entries(),
  ]);
  const callsBefore = [...dependencies.calls];

  await assert.rejects(service.completeAuthorization({
    ...input,
    code: "checkpoint-conflict-different-code",
    completion_claimant: "checkpoint-conflict-replay",
  }), (error) => (
    error.safe_error_code === M365_GRAPH_ERROR_CODES.completion_conflict
    && error.status === 409
  ));
  assert.deepEqual(repository.snapshot(), durableBefore);
  assert.deepEqual(
    [...dependencies.credentials.entries()],
    credentialsBefore,
  );
  assert.deepEqual(dependencies.calls, callsBefore);
});

test("Client callback completed replay의 일시적 vault 장애는 연결과 Secret을 보존한다", async () => {
  const repository = createEmailDmsRepository();
  const dependencies = fakeDependencies();
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(repository),
  });
  const input = {
    ...principal(),
    code: "checkpoint-transient-replay-code",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "checkpoint-transient-first",
  };
  await service.completeAuthorization(input);
  const durableBefore = repository.snapshot();
  const credentialsBefore = structuredClone([
    ...dependencies.credentials.entries(),
  ]);
  const mutationCallsBefore = dependencies.calls.filter(
    (call) => call !== "vault:resolve",
  );
  const transient = Object.assign(new Error("Secrets Manager throttled"), {
    name: "ThrottlingException",
    status: 503,
  });
  dependencies.credentialVault.resolveDelegatedCredential = async () => {
    dependencies.calls.push("vault:resolve");
    throw transient;
  };

  await assert.rejects(service.completeAuthorization({
    ...input,
    completion_claimant: "checkpoint-transient-replay",
  }), (error) => error === transient);
  assert.deepEqual(repository.snapshot(), durableBefore);
  assert.deepEqual(
    [...dependencies.credentials.entries()],
    credentialsBefore,
  );
  assert.deepEqual(
    dependencies.calls.filter((call) => call !== "vault:resolve"),
    mutationCallsBefore,
  );
  assert.equal(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: `m365-connect:${AUTHORIZATION_ATTEMPT_REF}:failed`,
  }), undefined);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0].revoked_at, null);
});

test("Client callback replay는 stale detached repo가 아니라 fresh checkpoint 연결을 검증한다", async () => {
  const attemptRef = createHash("sha256")
    .update(AUTHORIZATION_STATE)
    .digest("hex");
  const dependencies = fakeDependencies();
  const attemptCredentialRef = dependencies.credentialVault
    .referenceForGeneration({
      ...principal(),
      credential_generation: `m365-authorization-attempt-${attemptRef}`,
    });
  const durableRepository = createEmailDmsRepository({
    seedRecords: [connection({ credential_ref: attemptCredentialRef })],
  });
  const replayCode = "durable-replay-code-must-not-exchange";
  checkpointClaim(durableRepository, {
    state: AUTHORIZATION_STATE,
    code: replayCode,
    claimant: "durable-replay-original-request",
  });
  durableRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `m365-connect:${attemptRef}`,
    operation: "m365.connection.connect",
    request_fingerprint: completionRequestFingerprint({
      state: AUTHORIZATION_STATE,
      code: replayCode,
    }),
    response: {
      operation: "m365.connection.connect",
      outcome: "connected",
      attempt_ref: attemptRef,
      m365_connection_id: m365ConnectionId(principal()),
      state_version: 1,
      credential_material_included: false,
    },
    created_at: NOW,
  });
  dependencies.credentials.set(attemptCredentialRef, {
    access_token: "durable-replay-access-token",
    refresh_token: "durable-replay-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    ...principal(),
    authorization_attempt_ref: attemptRef,
    redirect_uri_hash: createHash("sha256")
      .update(REDIRECT_URI)
      .digest("hex"),
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
    mailbox_address: "synthetic.m365.user@example.invalid",
    consented_at: NOW,
    expires_at: EXPIRES,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  });
  dependencies.provider.completeDelegatedAuthorization = async () => {
    throw new Error("provider exchange must not run for durable replay");
  };
  const staleDetachedRepository = createEmailDmsRepository();
  const service = createM365GraphConnectionService({
    repository: staleDetachedRepository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(durableRepository),
  });

  const result = await service.completeAuthorization({
    ...principal(),
    code: replayCode,
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "durable-replay-request",
  });
  assert.equal(result.replayed, true);
  assert.equal(result.connection.connection_id, connection().m365_connection_id);
  assert.equal(staleDetachedRepository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  }).length, 0);
});

test("Client callback claim만 남은 다른 요청은 code·Secret을 건드리지 않고 in-progress를 반환한다", async () => {
  const repository = createEmailDmsRepository();
  checkpointClaim(repository, {
    state: AUTHORIZATION_STATE,
    code: "claimed-code-must-not-replay",
  });
  const dependencies = fakeDependencies();
  dependencies.provider.completeDelegatedAuthorization = async () => {
    throw new Error("provider exchange must not replay after a durable claim");
  };
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(repository),
  });

  await assert.rejects(service.completeAuthorization({
    ...principal(),
    code: "claimed-code-must-not-replay",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "different-callback-request",
  }), (error) => (
    error.safe_error_code === M365_GRAPH_ERROR_CODES.completion_in_progress
    && error.status === 409
  ));
  const attemptRef = createHash("sha256")
    .update(AUTHORIZATION_STATE)
    .digest("hex");
  assert.equal(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: `m365-connect:${attemptRef}:failed`,
  }), undefined);
  assert.equal(dependencies.calls.includes("vault:delete"), false);
});

test("Client callback은 같은 claimant의 기존 claim도 attempt Secret으로 복구하고 provider를 재호출하지 않는다", async () => {
  const repository = createEmailDmsRepository();
  const attemptRef = checkpointClaim(repository, {
    state: AUTHORIZATION_STATE,
    code: "staged-code-must-not-replay",
    claimant: "staged-recovery-request",
  });
  const dependencies = fakeDependencies();
  const attemptCredentialRef = dependencies.credentialVault
    .referenceForGeneration({
      ...principal(),
      credential_generation: `m365-authorization-attempt-${attemptRef}`,
    });
  dependencies.credentials.set(attemptCredentialRef, {
    access_token: "checkpoint-staged-access-token",
    refresh_token: "checkpoint-staged-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    ...principal(),
    authorization_attempt_ref: attemptRef,
    redirect_uri_hash: createHash("sha256")
      .update(REDIRECT_URI)
      .digest("hex"),
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
    mailbox_address: "synthetic.m365.user@example.invalid",
    consented_at: NOW,
    expires_at: EXPIRES,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  });
  dependencies.provider.completeDelegatedAuthorization = async () => {
    throw new Error("provider exchange must not run after staged credential");
  };
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(repository),
  });

  const result = await service.completeAuthorization({
    ...principal(),
    code: "staged-code-must-not-replay",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "staged-recovery-request",
  });
  assert.equal(result.outcome, "connected");
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0].credential_ref, attemptCredentialRef);
});

test("Client callback staged recovery의 일시적 vault 장애는 기존 연결과 Secret을 보존한다", async () => {
  const repository = createEmailDmsRepository({ seedRecords: [connection()] });
  const code = "staged-transient-code-must-not-replay";
  const attemptRef = checkpointClaim(repository, {
    state: AUTHORIZATION_STATE,
    code,
    claimant: "staged-transient-original-request",
  });
  const dependencies = fakeDependencies();
  const attemptCredentialRef = dependencies.credentialVault
    .referenceForGeneration({
      ...principal(),
      credential_generation: `m365-authorization-attempt-${attemptRef}`,
    });
  dependencies.credentials.set(connection().credential_ref, {
    access_token: "active-credential-access-token",
    refresh_token: "active-credential-refresh-token",
  });
  dependencies.credentials.set(attemptCredentialRef, {
    access_token: "staged-transient-access-token",
    refresh_token: "staged-transient-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    ...principal(),
    authorization_attempt_ref: attemptRef,
    redirect_uri_hash: createHash("sha256")
      .update(REDIRECT_URI)
      .digest("hex"),
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
    mailbox_address: "synthetic.m365.user@example.invalid",
    consented_at: NOW,
    expires_at: EXPIRES,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  });
  const resolve = dependencies.credentialVault
    .resolveDelegatedCredential.bind(dependencies.credentialVault);
  const transient = Object.assign(new Error("Secrets Manager unavailable"), {
    name: "ServiceUnavailableException",
    status: 503,
  });
  dependencies.credentialVault.resolveDelegatedCredential = async (input) => {
    if (input.credential_ref === attemptCredentialRef) {
      dependencies.calls.push("vault:resolve");
      throw transient;
    }
    return resolve(input);
  };
  dependencies.provider.completeDelegatedAuthorization = async () => {
    throw new Error("provider exchange must not run during staged recovery");
  };
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(repository),
  });
  const durableBefore = repository.snapshot();
  const credentialsBefore = structuredClone([
    ...dependencies.credentials.entries(),
  ]);

  await assert.rejects(service.completeAuthorization({
    ...principal(),
    code,
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "staged-transient-recovery-request",
  }), (error) => error === transient);
  assert.deepEqual(repository.snapshot(), durableBefore);
  assert.deepEqual(
    [...dependencies.credentials.entries()],
    credentialsBefore,
  );
  assert.equal(dependencies.calls.includes("vault:delete"), false);
  assert.equal(dependencies.calls.includes("provider:complete"), false);
  assert.equal(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: `m365-connect:${attemptRef}:failed`,
  }), undefined);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0].revoked_at, null);
});

test("Client callback은 subject가 다른 staged Secret을 finalize하지 않고 tombstone 정리한다", async () => {
  const repository = createEmailDmsRepository();
  const attemptRef = checkpointClaim(repository, {
    state: AUTHORIZATION_STATE,
    code: "mismatched-staged-code-must-not-replay",
  });
  const dependencies = fakeDependencies();
  const attemptCredentialRef = dependencies.credentialVault
    .referenceForGeneration({
      ...principal(),
      credential_generation: `m365-authorization-attempt-${attemptRef}`,
    });
  dependencies.credentials.set(attemptCredentialRef, {
    access_token: "mismatched-staged-access-token",
    refresh_token: "mismatched-staged-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    ...principal({ entra_subject_id: "different-entra-subject" }),
    authorization_attempt_ref: attemptRef,
    redirect_uri_hash: createHash("sha256")
      .update(REDIRECT_URI)
      .digest("hex"),
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
    mailbox_address: "synthetic.m365.user@example.invalid",
    consented_at: NOW,
    expires_at: EXPIRES,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  });
  dependencies.provider.completeDelegatedAuthorization = async () => {
    throw new Error("provider exchange must not run for staged mismatch");
  };
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    completion_checkpoint: localCompletionCheckpoint(repository),
  });

  await assert.rejects(service.completeAuthorization({
    ...principal(),
    code: "mismatched-staged-code-must-not-replay",
    state: AUTHORIZATION_STATE,
    redirect_uri: REDIRECT_URI,
    completion_claimant: "mismatched-staged-request",
  }), (error) => (
    error.safe_error_code === M365_GRAPH_ERROR_CODES.reauthorization_required
    && error.status === 409
  ));
  assert.equal(dependencies.credentials.has(attemptCredentialRef), false);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  }).length, 0);
  assert.equal(repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: `m365-connect:${attemptRef}:failed`,
  }).response.outcome, "authorization_restart_required");
});

test("CL-P3-W00-T01 해제 뒤 재연결은 삭제 예약 credential ref를 재사용하지 않는다", async () => {
  const revoked = connection({ revoked_at: NOW, state_version: 2 });
  const repository = createEmailDmsRepository({ seedRecords: [revoked] });
  const dependencies = fakeDependencies();
  let storedInput = null;
  const postCommitActions = [];
  dependencies.credentialVault.storeDelegatedCredential = async (input) => {
    dependencies.calls.push("vault:store");
    storedInput = structuredClone(input);
    const ref = "aws-secrets-manager:synthetic/m365/reconnected-user";
    dependencies.credentials.set(ref, structuredClone(input.token_bundle));
    return ref;
  };
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    request_failure_compensator: {
      register() {},
      registerPostCommit(action) {
        postCommitActions.push(action);
      },
    },
  });

  const reconnected = await service.completeAuthorization({
    ...principal(),
    code: "single-use-reconnect-code",
    state: "single-use-reconnect-state",
    redirect_uri: REDIRECT_URI,
  });

  assert.equal(storedInput.credential_ref, undefined);
  assert.equal(storedInput.credential_generation, "m365-connection-state-3");
  assert.equal(reconnected.outcome, "reconnected");
  assert.equal(reconnected.connection.status, "connected");
  assert.equal(reconnected.connection.state_version, 3);
  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(
    persisted.credential_ref,
    "aws-secrets-manager:synthetic/m365/reconnected-user",
  );
  assert.equal(persisted.revoked_at, null);
  assert.deepEqual(persisted.pending_vault_cleanup_refs, [revoked.credential_ref]);
  assert.equal(
    repository.listAudit({ tenant_id: TENANT }).at(-1)
      .payload.token_replaced_in_vault,
    true,
  );
  assert.equal(postCommitActions.length, 1);
});

test("CL-P3-W00-T01 연결 해제는 commit 뒤 credential 정리를 시도하고 실패를 durable marker로 보존한다", async () => {
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
  const postCommitActions = [];
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    request_failure_compensator: {
      register() {},
      registerPostCommit(action) {
        postCommitActions.push(action);
      },
    },
  });

  const disconnected = await service.revokeConnection({
    ...principal(),
    expected_state_version: 1,
    reason: "사용자 연결 해제",
  });
  assert.equal(disconnected.outcome, "disconnected");

  assert.deepEqual(
    dependencies.calls,
    ["vault:resolve", "provider:revoke"],
  );
  assert.equal(postCommitActions.length, 1);
  await assert.rejects(postCommitActions[0](), /synthetic secret cleanup failure/u);
  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(persisted.revoked_at, NOW);
  assert.equal(persisted.state_version, 2);
  assert.deepEqual(persisted.pending_vault_cleanup_refs, [
    connection().credential_ref,
    generationRef(dependencies.credentialVault, 2),
  ]);
  const audit = repository.listAudit({ tenant_id: TENANT }).at(-1);
  assert.equal(audit.event_type, "m365.connection.revoked");
  assert.equal(audit.payload.provider_revoked_first, true);
  assert.equal(audit.payload.credential_cleanup_requested, true);
  assert.equal(Object.hasOwn(audit.payload, "credential_cleanup_ref"), false);
  assert.equal(
    JSON.stringify({ persisted, audit }).includes(
      "synthetic secret cleanup failure",
    ),
    false,
  );
});

test("연결 해제는 동시 요청이 만들 수 있는 다음 deterministic staged ref도 정리한다", async () => {
  const repository = createEmailDmsRepository({ seedRecords: [connection()] });
  const dependencies = fakeDependencies();
  const currentRef = connection().credential_ref;
  const stagedRef = dependencies.credentialVault.referenceForGeneration({
    ...principal(),
    credential_generation: "m365-connection-state-2",
  });
  dependencies.credentials.set(currentRef, {
    access_token: "synthetic-access-token-never-persist",
    refresh_token: "synthetic-refresh-token-never-persist",
  });
  dependencies.credentials.set(stagedRef, { staged: true });
  const postCommitActions = [];
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
    request_failure_compensator: {
      register() {},
      registerPostCommit(action) {
        postCommitActions.push(action);
      },
    },
  });

  await service.revokeConnection({
    ...principal(),
    expected_state_version: 1,
    reason: "사용자 연결 해제",
  });
  const revoked = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.deepEqual(revoked.pending_vault_cleanup_refs, [currentRef, stagedRef]);
  assert.equal(postCommitActions.length, 1);
  await postCommitActions[0]();
  assert.equal(dependencies.credentials.has(currentRef), false);
  assert.equal(dependencies.credentials.has(stagedRef), false);
  assert.doesNotMatch(
    JSON.stringify(repository.listAudit({ tenant_id: TENANT })),
    /aws-secrets-manager/iu,
  );
});

test("Client refresh는 결정적 새 vault ref로 교체하고 commit 뒤 이전 ref만 정리한다", async () => {
  const expiringAt = "2026-07-30T05:59:30.000Z";
  const rotatedExpiresAt = "2026-07-30T07:00:00.000Z";
  const repository = createEmailDmsRepository({
    seedRecords: [connection({
      consented_at: "2026-07-29T06:00:00.000Z",
      expires_at: expiringAt,
    })],
  });
  const dependencies = fakeDependencies();
  const credentialRef = connection().credential_ref;
  const refreshedCredentialRef = dependencies.credentialVault.referenceForGeneration({
    ...principal(),
    credential_generation: "m365-connection-state-2",
  });
  const compensations = [];
  const postCommitActions = [];
  dependencies.credentials.set(credentialRef, {
    access_token: "expiring-client-access-token",
    refresh_token: "expiring-client-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    expires_at: expiringAt,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    mailbox_address: "synthetic.m365.user@example.invalid",
  });
  dependencies.credentialVault.storeDelegatedCredential = async (input) => {
    dependencies.calls.push("vault:store");
    assert.equal(input.credential_ref, undefined);
    assert.equal(input.credential_generation, "m365-connection-state-2");
    dependencies.credentials.set(
      refreshedCredentialRef,
      structuredClone(input.token_bundle),
    );
    return refreshedCredentialRef;
  };
  dependencies.provider.refreshDelegatedCredential = async ({ credential }) => {
    dependencies.calls.push("provider:refresh");
    assert.equal(credential.refresh_profile, "client");
    assert.equal(credential.refresh_profile_proof, CLIENT_REFRESH_PROOF);
    return {
      expires_at: rotatedExpiresAt,
      token_bundle: {
        ...credential,
        access_token: "rotated-client-access-token",
        refresh_token: "rotated-client-refresh-token",
        refresh_profile_proof: ROTATED_CLIENT_REFRESH_PROOF,
        expires_at: rotatedExpiresAt,
      },
    };
  };
  dependencies.provider.getMeMessageMime = async ({ credential }) => {
    dependencies.calls.push("provider:mail:/me");
    assert.equal(credential.access_token, "rotated-client-access-token");
    return {
      mime_bytes: Buffer.from("From: sender@example.invalid\r\n\r\nRotated"),
      immutable_message_id: "immutable-message-rotated-001",
      internet_message_id: "<rotated-001@example.invalid>",
      message_metadata: {
        received_at: NOW,
        is_in_sent_items: false,
        is_draft: false,
      },
    };
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
  const beforeAction = service.getConnectionStatus(principal()).connection;
  assert.equal(beforeAction.status, "connected");
  assert.equal(beforeAction.active, true);
  assert.equal(beforeAction.token_refresh_pending, true);
  const mail = createM365MailPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
    request_failure_compensator: {
      register(compensation) {
        compensations.push(compensation);
      },
      registerPostCommit(action) {
        postCommitActions.push(action);
      },
    },
  });

  await mail.getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-rotated-001",
  });

  assert.deepEqual(
    dependencies.calls.slice(0, 6),
    [
      "vault:resolve",
      "vault:resolve",
      "provider:refresh",
      "vault:store",
      "vault:resolve",
      "provider:mail:/me",
    ],
  );
  const stored = dependencies.credentials.get(refreshedCredentialRef);
  assert.equal(stored.refresh_token, "rotated-client-refresh-token");
  assert.equal(
    stored.refresh_profile_proof,
    ROTATED_CLIENT_REFRESH_PROOF,
  );
  const updated = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(updated.credential_ref, refreshedCredentialRef);
  assert.deepEqual(updated.pending_vault_cleanup_refs, [credentialRef]);
  assert.equal(updated.expires_at, rotatedExpiresAt);
  assert.equal(updated.state_version, 2);
  const afterAction = service.getConnectionStatus(principal()).connection;
  assert.equal(afterAction.status, "connected");
  assert.equal(afterAction.active, true);
  assert.equal(afterAction.token_refresh_pending, false);
  assert.equal(Object.hasOwn(afterAction, "pending_vault_cleanup_refs"), false);
  const audit = repository.listAudit({ tenant_id: TENANT }).at(-1);
  assert.equal(audit.event_type, "m365.connection.credential.refreshed");
  assert.equal(audit.payload.refresh_token_rotated, true);
  assert.equal(audit.payload.credential_cleanup_requested, true);
  assert.equal(audit.payload.credential_cleanup_requested_count, 1);
  assert.equal(Object.hasOwn(audit.payload, "credential_cleanup_ref"), false);
  const refreshClaim = repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: `m365-refresh:${updated.m365_connection_id}:1`,
  });
  assert.equal(refreshClaim.operation, "m365.connection.refresh");
  assert.deepEqual(refreshClaim.response, {
    outcome: "refreshed",
    m365_connection_id: updated.m365_connection_id,
    state_version: 2,
    credential_material_included: false,
  });
  assert.doesNotMatch(
    JSON.stringify({ updated, audit, refreshClaim }),
    /rotated-client/u,
  );
  assert.equal(compensations.length, 0);
  assert.equal(postCommitActions.length, 1);
  await postCommitActions[0]();
  assert.equal(dependencies.credentials.has(refreshedCredentialRef), true);
  assert.equal(dependencies.credentials.has(credentialRef), false);
  await mail.getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-rotated-001",
  });
  const cleaned = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.deepEqual(cleaned.pending_vault_cleanup_refs, []);
  assert.equal(dependencies.credentials.has(refreshedCredentialRef), true);
  assert.equal(dependencies.credentials.has(credentialRef), false);
});

test("outer commit이 사라진 refresh는 다음 요청이 같은 deterministic ref를 재사용한다", async () => {
  const expiringAt = "2026-07-30T06:00:30.000Z";
  const rotatedExpiresAt = "2026-07-30T07:00:00.000Z";
  const seed = connection({ expires_at: expiringAt });
  const dependencies = fakeDependencies();
  dependencies.credentials.set(seed.credential_ref, {
    access_token: "expiring-client-access-token",
    refresh_token: "expiring-client-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    expires_at: expiringAt,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    mailbox_address: "synthetic.m365.user@example.invalid",
  });
  const generations = [];
  const originalStore = dependencies.credentialVault.storeDelegatedCredential;
  dependencies.credentialVault.storeDelegatedCredential = async function store(input) {
    generations.push(input.credential_generation);
    return originalStore.call(dependencies.credentialVault, input);
  };
  let refreshAttempt = 0;
  dependencies.provider.refreshDelegatedCredential = async ({ credential }) => ({
    token_bundle: {
      ...credential,
      access_token: `rotated-client-access-token-${++refreshAttempt}`,
      refresh_token: `rotated-client-refresh-token-${refreshAttempt}`,
      refresh_profile_proof: ROTATED_CLIENT_REFRESH_PROOF,
      expires_at: rotatedExpiresAt,
    },
  });
  const graphAccessTokens = [];
  dependencies.provider.getMeMessageMime = async ({ credential }) => {
    graphAccessTokens.push(credential.access_token);
    return {
      mime_bytes: Buffer.from("From: sender@example.invalid\r\n\r\nDeterministic"),
      immutable_message_id: "immutable-message-deterministic-001",
      internet_message_id: "<deterministic-001@example.invalid>",
      message_metadata: {
        received_at: NOW,
        is_in_sent_items: false,
        is_draft: false,
      },
    };
  };
  const run = async (repository) => createM365MailPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  }).getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-deterministic-001",
  });

  const discardedRepository = createEmailDmsRepository({ seedRecords: [seed] });
  await run(discardedRepository);
  const stagedRef = dependencies.credentialVault.referenceForGeneration({
    ...principal(),
    credential_generation: "m365-connection-state-2",
  });
  assert.equal(dependencies.credentials.has(stagedRef), true);

  const retryRepository = createEmailDmsRepository({ seedRecords: [seed] });
  await run(retryRepository);
  assert.deepEqual(generations, ["m365-connection-state-2"]);
  assert.equal(refreshAttempt, 1);
  assert.equal(retryRepository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0].credential_ref, stagedRef);
  assert.equal(dependencies.credentials.has(stagedRef), true);
  assert.deepEqual(graphAccessTokens, [
    "rotated-client-access-token-1",
    "rotated-client-access-token-1",
  ]);
});

test("refresh와 reconnect가 같은 generation을 쓰면 DB metadata도 실제 선점 bundle만 따른다", async () => {
  const repository = createEmailDmsRepository({
    seedRecords: [connection()],
  });
  const dependencies = fakeDependencies();
  const stagedRef = dependencies.credentialVault.referenceForGeneration({
    ...principal(),
    credential_generation: "m365-connection-state-2",
  });
  const stagedConsentedAt = "2026-07-29T06:00:00.000Z";
  const stagedExpiresAt = "2026-07-30T07:00:00.000Z";
  dependencies.credentials.set(stagedRef, {
    access_token: "refresh-winner-access-token",
    refresh_token: "refresh-winner-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: ROTATED_CLIENT_REFRESH_PROOF,
    entra_subject_id: SUBJECT,
    mailbox_address: "synthetic.m365.user@example.invalid",
    consented_at: stagedConsentedAt,
    expires_at: stagedExpiresAt,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  });
  dependencies.provider.completeDelegatedAuthorization = async () => ({
    authorization_attempt_consumed: true,
    entra_subject_id: SUBJECT,
    mailbox_address: "synthetic.m365.user@example.invalid",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: NOW,
    expires_at: EXPIRES,
    token_bundle: {
      access_token: "reconnect-loser-access-token",
      refresh_token: "reconnect-loser-refresh-token",
      refresh_profile: "client",
      refresh_profile_proof: CLIENT_REFRESH_PROOF,
      expires_at: EXPIRES,
      granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
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

  await service.completeAuthorization({
    ...principal(),
    code: "reconnect-loser-code",
    state: "reconnect-loser-state",
    redirect_uri: REDIRECT_URI,
  });

  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(persisted.credential_ref, stagedRef);
  assert.equal(persisted.consented_at, stagedConsentedAt);
  assert.equal(persisted.expires_at, stagedExpiresAt);
  assert.equal(
    dependencies.credentials.get(stagedRef).access_token,
    "refresh-winner-access-token",
  );
  assert.equal(
    dependencies.credentials.get(stagedRef).refresh_token,
    "refresh-winner-refresh-token",
  );
  assert.doesNotMatch(
    JSON.stringify(repository.snapshot()),
    /reconnect-loser-access-token|reconnect-loser-refresh-token/u,
  );
});

test("같은 generation의 staged credential이 만료됐으면 overwrite하지 않고 reauth로 닫는다", async () => {
  const expiringAt = "2026-07-30T06:00:30.000Z";
  const repository = createEmailDmsRepository({
    seedRecords: [connection({ expires_at: expiringAt })],
  });
  const dependencies = fakeDependencies();
  const currentRef = connection().credential_ref;
  const stagedRef = dependencies.credentialVault.referenceForGeneration({
    ...principal(),
    credential_generation: "m365-connection-state-2",
  });
  dependencies.credentials.set(currentRef, {
    access_token: "current-expiring-access",
    refresh_token: "current-expiring-refresh",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    expires_at: expiringAt,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    mailbox_address: "synthetic.m365.user@example.invalid",
  });
  dependencies.credentials.set(stagedRef, {
    access_token: "stale-staged-access",
    refresh_token: "stale-staged-refresh",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    expires_at: "2026-07-30T05:00:00.000Z",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    mailbox_address: "synthetic.m365.user@example.invalid",
  });
  let refreshProviderCalls = 0;
  dependencies.provider.refreshDelegatedCredential = async () => {
    refreshProviderCalls += 1;
    throw new Error("provider refresh must not run for a staged credential");
  };
  let graphCalls = 0;
  dependencies.provider.getMeMessageMime = async () => {
    graphCalls += 1;
    return {};
  };
  const mail = createM365MailPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });

  await assert.rejects(mail.getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-stale-staged",
  }), (error) => (
    error.safe_error_code === M365_GRAPH_ERROR_CODES.reauthorization_required
  ));
  assert.equal(graphCalls, 0);
  assert.equal(refreshProviderCalls, 0);
  assert.equal(
    dependencies.credentials.get(stagedRef).access_token,
    "stale-staged-access",
  );
  const revoked = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(revoked.revoked_at, NOW);
  assert.deepEqual(revoked.pending_vault_cleanup_refs, [currentRef, stagedRef]);
});

test("Client refresh 401은 Graph 호출 전 연결을 해제하고 기존 vault ref 정리를 요청한다", async () => {
  const expiringAt = "2026-07-30T06:00:30.000Z";
  const repository = createEmailDmsRepository({
    seedRecords: [connection({ expires_at: expiringAt })],
  });
  const dependencies = fakeDependencies();
  const credentialRef = connection().credential_ref;
  dependencies.credentials.set(credentialRef, {
    access_token: "rejected-client-access-token",
    refresh_token: "rejected-client-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    expires_at: expiringAt,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    mailbox_address: "synthetic.m365.user@example.invalid",
  });
  dependencies.provider.refreshDelegatedCredential = async () => {
    dependencies.calls.push("provider:refresh");
    throw Object.assign(new Error("provider detail must not persist"), {
      status: 401,
      safe_error_code: "OUTLOOK_PROVIDER_REJECTED",
    });
  };
  let graphCalls = 0;
  const postCommitActions = [];
  dependencies.provider.getMeMessageMime = async () => {
    graphCalls += 1;
    throw new Error("Graph must not run after rejected refresh");
  };
  const mail = createM365MailPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
    request_failure_compensator: {
      register() {},
      registerPostCommit(action) {
        postCommitActions.push(action);
      },
    },
  });

  await assert.rejects(
    mail.getOwnMessageMime({
      ...principal(),
      rest_message_id: "rest-message-rejected-001",
    }),
    (error) => (
      error.safe_error_code
        === M365_GRAPH_ERROR_CODES.reauthorization_required
      && error.status === 401
    ),
  );
  assert.equal(graphCalls, 0);
  assert.equal(dependencies.credentials.has(credentialRef), true);
  assert.equal(dependencies.calls.includes("vault:delete"), false);
  const disconnected = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(disconnected.revoked_at, NOW);
  assert.equal(disconnected.state_version, 2);
  assert.deepEqual(disconnected.pending_vault_cleanup_refs, [
    credentialRef,
    generationRef(dependencies.credentialVault, 2),
  ]);
  const audit = repository.listAudit({ tenant_id: TENANT }).at(-1);
  assert.equal(audit.event_type, "m365.connection.reauthorization_required");
  assert.equal(audit.payload.credential_cleanup_requested, true);
  assert.equal(audit.payload.credential_cleanup_requested_count, 2);
  assert.equal(Object.hasOwn(audit.payload, "credential_cleanup_ref"), false);
  const reauthorizationClaim = repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key:
      `m365-reauthorize:${disconnected.m365_connection_id}:1`,
  });
  assert.equal(
    reauthorizationClaim.operation,
    "m365.connection.reauthorization_required",
  );
  assert.deepEqual(reauthorizationClaim.response, {
    outcome: "reauthorization_required",
    m365_connection_id: disconnected.m365_connection_id,
    state_version: 2,
    credential_material_included: false,
  });
  assert.doesNotMatch(
    JSON.stringify(repository.snapshot()),
    /provider detail must not persist|rejected-client/u,
  );
  assert.equal(postCommitActions.length, 1);
  await postCommitActions[0]();
  assert.equal(dependencies.credentials.has(credentialRef), false);
});

test("commit 뒤 cleanup 실패는 다음 Graph 요청에서 재시도하고 active ref는 보존한다", async () => {
  const activeRef = connection().credential_ref;
  const retiredRef = "aws-secrets-manager:synthetic/m365/retired";
  const repository = createEmailDmsRepository({
    seedRecords: [connection({
      pending_vault_cleanup_refs: [retiredRef],
    })],
  });
  const dependencies = fakeDependencies();
  dependencies.credentials.set(activeRef, {
    access_token: "synthetic-access-token-never-persist",
    refresh_token: "synthetic-refresh-token-never-persist",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    expires_at: EXPIRES,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    mailbox_address: "synthetic.m365.user@example.invalid",
  });
  dependencies.credentials.set(retiredRef, { retired: true });
  let cleanupAttempts = 0;
  dependencies.credentialVault.deleteDelegatedCredential = async ({
    credential_ref,
  }) => {
    dependencies.calls.push("vault:delete");
    assert.equal(credential_ref, retiredRef);
    cleanupAttempts += 1;
    if (cleanupAttempts === 1) throw new Error("synthetic cleanup outage");
    dependencies.credentials.delete(credential_ref);
  };
  const mail = createM365MailPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });

  await mail.getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-synthetic-001",
  });
  assert.deepEqual(repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0].pending_vault_cleanup_refs, [retiredRef]);
  assert.equal(dependencies.credentials.has(activeRef), true);

  await mail.getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-synthetic-001",
  });
  const cleaned = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.deepEqual(cleaned.pending_vault_cleanup_refs, []);
  assert.equal(cleaned.credential_ref, activeRef);
  assert.equal(dependencies.credentials.has(activeRef), true);
  assert.equal(dependencies.credentials.has(retiredRef), false);
  assert.equal(cleanupAttempts, 2);
});

test("이미 해제된 연결의 반복 DELETE는 남은 vault cleanup을 재시도한다", async () => {
  const credentialRef = connection().credential_ref;
  const repository = createEmailDmsRepository({
    seedRecords: [connection({
      revoked_at: NOW,
      state_version: 2,
      pending_vault_cleanup_refs: [credentialRef],
    })],
  });
  const dependencies = fakeDependencies();
  dependencies.credentials.set(credentialRef, { retired: true });
  const service = createM365GraphConnectionService({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    allowed_redirect_uris: [REDIRECT_URI],
    clock: () => new Date(NOW),
  });

  const result = await service.revokeConnection({
    ...principal(),
    expected_state_version: 2,
    reason: "사용자 연결 해제 재시도",
  });
  assert.equal(result.outcome, "already_disconnected");
  assert.equal(result.connection.credential_cleanup_pending, false);
  assert.equal(
    Object.hasOwn(result.connection, "pending_vault_cleanup_refs"),
    false,
  );
  const cleaned = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.deepEqual(cleaned.pending_vault_cleanup_refs, []);
  assert.equal(cleaned.state_version, 2);
  assert.equal(dependencies.credentials.has(credentialRef), false);
});

test("활성 연결의 stale 버전 DELETE는 provider·vault·상태 변경 없이 거부한다", async () => {
  const repository = createEmailDmsRepository({
    seedRecords: [connection({ state_version: 2 })],
  });
  const dependencies = fakeDependencies();
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
      reason: "오래된 화면에서 연결 해제",
    }),
    (error) => (
      error.safe_error_code === M365_GRAPH_ERROR_CODES.state_version_conflict
    ),
  );
  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(persisted.state_version, 2);
  assert.equal(persisted.revoked_at, null);
  assert.deepEqual(dependencies.calls, []);
  assert.deepEqual(repository.listAudit({ tenant_id: TENANT }), []);
});

test("generation 저장 전 vault delete·reference capability가 없으면 fail-closed한다", async () => {
  const expiringAt = "2026-07-30T06:00:30.000Z";
  const seededConnection = connection({ expires_at: expiringAt });
  const repository = createEmailDmsRepository({
    seedRecords: [seededConnection],
  });
  const dependencies = fakeDependencies();
  dependencies.credentials.set(seededConnection.credential_ref, {
    access_token: "expiring-client-access-token",
    refresh_token: "expiring-client-refresh-token",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
    expires_at: expiringAt,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    mailbox_address: "synthetic.m365.user@example.invalid",
  });
  delete dependencies.credentialVault.deleteDelegatedCredential;
  let graphCalls = 0;
  dependencies.provider.getMeMessageMime = async () => {
    graphCalls += 1;
    return {};
  };
  const mail = createM365MailPort({
    repository,
    credential_vault: dependencies.credentialVault,
    provider: dependencies.provider,
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date(NOW),
  });

  await assert.rejects(mail.getOwnMessageMime({
    ...principal(),
    rest_message_id: "rest-message-no-delete-capability",
  }), (error) => (
    error.safe_error_code === M365_GRAPH_ERROR_CODES.provider_runtime_disabled
    && error.status === 503
  ));
  assert.equal(graphCalls, 0);
  assert.equal(dependencies.calls.includes("vault:store"), false);
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
        === M365_GRAPH_ERROR_CODES.reauthorization_required
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
