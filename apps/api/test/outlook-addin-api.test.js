import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createDefaultDmsRuntime,
  startApiServer,
} from "../src/server.js";
import { createDmsRepository, createFileStorageAdapter } from "../../../packages/dms/src/index.js";
import {
  createDmsDocument,
  createDmsEmailThread,
  createDmsFolder,
  createDmsWorkspace,
} from "../../../packages/dms/src/model.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { createMatterRuntimeContext } from "../src/matter-runtime-context.js";
import { createOutlookAttachmentReceiptAuthority } from "../src/outlook-attachment-receipt-authority.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import {
  MATTER_VAULT_USER_REGISTRATION_SEED,
  findRegisteredAccountByEmail,
} from "../src/matter-vault-account-registry.js";

const TENANT = "tenant_outlook_addin_test";
const MATTER = "matter_outlook_addin_test";
const OTHER_MATTER = "matter_separate_test";
const ACTOR = "user_amic_jwsuh";
const EMPLOYEE = "employee_outlook_addin_test";
const ENTRA_SUBJECT = "entra_subject_outlook_addin_test";
const MAILBOX = "lawyer@amic.kr";
const ATTACHMENT_BYTES = Buffer.from("contract attachment bytes");
const ATTACHMENT_RECOVERY_BYTES = Buffer.from("attachment domain recovery bytes");
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const MIME_BOUNDARY = "lawos-outlook-attachment-boundary";
const SPLIT_ENCODED_ATTACHMENT_NAME = "=?UTF-8?B?Y2xpZW50LQ==?= =?UTF-8?B?Y29udHJhY3QuZG9jeA==?=";

function messageMime({
  attachmentBytes = ATTACHMENT_BYTES,
  attachmentContentType = "text/plain",
  attachmentHeaderName = "contract.txt",
  duplicateAttachmentName = false,
  fromAddress = "opposing@example.com",
  hasAttachment = true,
  internetMessageId = "<outlook-addin-test-001@amic.law>",
} = {}) {
  const headers = [
    `From: ${fromAddress}`,
    `To: ${MAILBOX}`,
    "Date: Mon, 3 Jul 2026 01:00:00 +0000",
    "Subject: Outlook filing regression",
    `Message-ID: ${internetMessageId}`,
    "MIME-Version: 1.0",
  ];
  if (!hasAttachment) {
    return Buffer.from([
      ...headers,
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Attachment-free original MIME fixture",
      "",
    ].join("\r\n"));
  }
  const attachmentPart = [
    `Content-Type: ${attachmentContentType}; name="${attachmentHeaderName}"`,
    `Content-Disposition: attachment; filename="${attachmentHeaderName}"`,
    "Content-Transfer-Encoding: base64",
    "",
    attachmentBytes.toString("base64"),
  ];
  return Buffer.from([
    ...headers,
    `Content-Type: multipart/mixed; boundary=\"${MIME_BOUNDARY}\"`,
    "",
    `--${MIME_BOUNDARY}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Attachment provenance fixture",
    `--${MIME_BOUNDARY}`,
    ...attachmentPart,
    ...(duplicateAttachmentName
      ? [`--${MIME_BOUNDARY}`, ...attachmentPart]
      : []),
    `--${MIME_BOUNDARY}--`,
    "",
  ].join("\r\n"));
}

async function jsonFetch(baseUrl, path, init = {}, sessionHeaders = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...sessionHeaders, ...(init.headers ?? {}) },
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${path} failed: ${JSON.stringify(body)}`);
  return body;
}

function seedMatterRepository() {
  return createMatterRepository({
    seedRecords: [
      {
        model_type: "MatterClient",
        tenant_id: TENANT,
        client_id: "client_outlook_addin_test",
        client_display_name: "오피스 애드인 테스트 고객",
        client_short_name: "OUTLOOKADDIN",
        status: "active",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
      },
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: MATTER,
        matter_code: "OUTLOOK/LIT/CIV/애드인",
        matter_name: "Outlook Add-in filing test",
        client_id: "client_outlook_addin_test",
        client_display_name: "오피스 애드인 테스트 고객",
        title: "Outlook Add-in filing test",
        status: "open",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
        permission_envelope_id: "perm:outlook:addin:test",
        audit_trace_id: "audit:outlook:addin:test",
      },
      {
        model_type: "MatterMember",
        tenant_id: TENANT,
        matter_id: MATTER,
        member_id: "member_outlook_addin_test",
        employee_id: EMPLOYEE,
        user_id: ACTOR,
        role: "associate",
        status: "active",
        valid_from: "2026-07-03T00:00:00.000Z",
        identity_resolution_state: "resolved",
      },
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: OTHER_MATTER,
        matter_code: "SEPARATE/LIT/CIV/CASE",
        matter_name: "Separate matter",
        client_id: "client_outlook_addin_test",
        client_display_name: "오피스 애드인 테스트 고객",
        title: "Separate matter",
        status: "open",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
        permission_envelope_id: "perm:outlook:addin:other",
        audit_trace_id: "audit:outlook:addin:other",
      },
      {
        model_type: "MatterMember",
        tenant_id: TENANT,
        matter_id: OTHER_MATTER,
        member_id: "member_outlook_addin_other",
        employee_id: EMPLOYEE,
        user_id: ACTOR,
        role: "associate",
        status: "active",
        valid_from: "2026-07-03T00:00:00.000Z",
        identity_resolution_state: "resolved",
      },
    ],
  });
}

function seedPeopleDirectories() {
  const employee = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    display_name: "Outlook Add-in Test Attorney",
    status: "active",
  };
  const employeeUserLink = {
    tenant_id: TENANT,
    link_id: "link_outlook_addin_test",
    employee_id: EMPLOYEE,
    user_id: ACTOR,
    purpose: "login_mapping",
  };
  const user = { tenant_id: TENANT, user_id: ACTOR, status: "active" };
  return {
    employeeDirectory: {
      get: ({ tenant_id, employee_id } = {}) => (
        employee.tenant_id === tenant_id && employee.employee_id === employee_id ? employee : null
      ),
    },
    employeeUserLinkDirectory: [employeeUserLink],
    userDirectory: [user],
  };
}

function attachmentPayload(bytes = ATTACHMENT_BYTES) {
  return {
    attachment_id: "att-contract",
    name: "contract.txt",
    content_type: "text/plain",
    content_base64: Buffer.from(bytes).toString("base64"),
    confidentiality: "confidential",
  };
}

function emailFixture(overrides = {}) {
  const {
    graph_message_id: legacyRestMessageId = "graph-outlook-addin-test-001",
    ...exactOverrides
  } = overrides;
  const email = {
    internet_message_id: "<outlook-addin-test-001@amic.law>",
    conversation_id: "conversation-outlook-addin-test",
    from: { name: "상대방", email: "opposing@example.com" },
    to: [{ name: "AMIC 변호사", email: "lawyer@amic.law" }],
    cc: [{ name: "고객", email: "client@example.com" }],
    bcc: [],
    subject: "Outlook filing regression",
    body_preview: "첨부 확인 부탁드립니다.",
    sent_at: "2026-07-03T01:00:00.000Z",
    received_at: "2026-07-03T01:00:03.000Z",
    mailbox_ref: "mailbox:test",
    account_ref: "account:test",
    attachments: [
      {
        attachment_id: "att-contract",
        name: "contract.txt",
        content_type: "text/plain",
        size: ATTACHMENT_BYTES.byteLength,
        sha256: createHash("sha256").update(ATTACHMENT_BYTES).digest("hex"),
        confidentiality: "confidential",
      },
    ],
    ...exactOverrides,
  };
  const restMessageId = Object.hasOwn(overrides, "rest_message_id")
    ? overrides.rest_message_id
    : legacyRestMessageId;
  const immutableMessageId = Object.hasOwn(overrides, "canonical_graph_message_id")
    ? overrides.canonical_graph_message_id
    : ["graph-alias-a", "graph-alias-b"].includes(restMessageId)
      ? "immutable:graph-alias-target"
      : `immutable:${restMessageId}`;
  return {
    ...email,
    canonical_graph_message_id: immutableMessageId,
    rest_message_id: restMessageId,
    item_key: Object.hasOwn(overrides, "item_key")
      ? overrides.item_key
      : [restMessageId, email.internet_message_id, email.conversation_id].join("\u001f"),
  };
}

function expectedEmailThreadId(email) {
  return `thread:${createHash("sha256").update(JSON.stringify([
    TENANT,
    email.canonical_graph_message_id,
    email.internet_message_id,
  ])).digest("hex")}`;
}

function outlookSessionAuth() {
  const principal = Object.freeze({
    ok: true,
    source: "api-signed-session",
    header_only_trust_allowed: false,
    tenant_id: TENANT,
    user_id: ACTOR,
    actor_id: ACTOR,
    email: MAILBOX,
    entra_subject_id: ENTRA_SUBJECT,
    role_ids: Object.freeze(["outlook_addin_user"]),
    scopes: Object.freeze(["matter.read", "matter.write"]),
  });
  const contextFor = (filteredSearch = false) => Object.freeze({
    principal,
    rules: Object.freeze([Object.freeze({
      id: "outlook-addin-test-allow",
      effect: "allow",
      action: "*",
    })]),
    object_acl: filteredSearch
      ? Object.freeze([Object.freeze({
        id: "outlook-addin-test-deny-separate-matter",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: OTHER_MATTER,
        action: "outlook:matter:read",
      })])
      : Object.freeze([]),
  });
  return Object.freeze({
    async resolvePermissionContextFromHeaders(headers) {
      const filteredSearch = headers.authorization === "Bearer outlook-search-filter-session";
      if (headers.authorization !== "Bearer outlook-provenance-session" && !filteredSearch) {
        return Object.freeze({ ok: false, status: 401 });
      }
      return Object.freeze({
        ok: true,
        principal,
        context: contextFor(filteredSearch),
        token_payload: Object.freeze({ surface: "outlook_addin" }),
      });
    },
  });
}

async function scopeDerivedOutlookSessions() {
  const registered = ["wsjo@amic.kr", "sypark@amic.kr", "yjlee@amic.kr"]
    .map((email) => findRegisteredAccountByEmail(email));
  assert.equal(registered.every(Boolean), true);
  const accounts = registered
    .map((account) => ({
      ...account,
      tenant_memberships: [{ ...(account?.tenant_memberships?.[0] ?? {}), tenant_id: TENANT, status: "active" }],
    }));
  const [writer, reader, aclUser] = accounts;
  let deniedTaskId = null;
  const actions = ["outlook:task:create", "outlook:task:update"];
  const sessionAuth = createApiSessionAuth({
    profile: "local-dev",
    secret: "outlook-task-scope-derived-session-secret",
    trustedTenantId: TENANT,
    seed: { ...MATTER_VAULT_USER_REGISTRATION_SEED, tenant_id: TENANT, users: accounts },
    objectAclResolver({ user_id }) {
      const object_acl = user_id === aclUser.user_id ? [
        {
          id: "outlook-task-allow-selected-matter",
          tenant_id: TENANT,
          principal_id: aclUser.user_id,
          effect: "allow",
          actions,
          resource_type: "Matter",
          resource_id: MATTER,
        },
        {
          id: "outlook-task-deny-other-matter",
          tenant_id: TENANT,
          principal_id: aclUser.user_id,
          effect: "deny",
          actions,
          resource_type: "Matter",
          resource_id: OTHER_MATTER,
        },
        {
          id: "outlook-task-deny-unrelated-task",
          tenant_id: TENANT,
          principal_id: aclUser.user_id,
          effect: "deny",
          action: "outlook:task:update",
          resource_type: "MatterTask",
          resource_id: deniedTaskId ?? "outlook-task-unrelated",
        },
      ] : [];
      return { authoritative: true, source_ref: "outlook-task-test-acl", object_acl };
    },
  });
  const tokenFor = async (account) => {
    const result = await sessionAuth.login({
      email: account.email,
      password: account.local_dev.synthetic_token,
    }, { requestId: `outlook-task-login-${account.user_id}` });
    assert.equal(result.status, 200);
    return result.body.session_token;
  };
  return {
    sessionAuth,
    writer,
    reader,
    aclUser,
    writerToken: await tokenFor(writer),
    readerToken: await tokenFor(reader),
    aclToken: await tokenFor(aclUser),
    denyTask(taskId) {
      deniedTaskId = taskId;
    },
  };
}

function outlookEmailDmsRepository() {
  return createEmailDmsRepository({
    seedRecords: [{
      model_type: "M365Connection",
      m365_connection_id: m365ConnectionId({ tenant_id: TENANT, user_id: ACTOR }),
      tenant_id: TENANT,
      user_id: ACTOR,
      entra_subject_id: ENTRA_SUBJECT,
      mailbox_address_hash: hashMailboxAddress(MAILBOX),
      credential_ref: "aws-secrets-manager:synthetic/outlook-addin-test",
      granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
      consented_at: "2026-08-05T00:00:00.000Z",
      expires_at: "2026-08-08T00:00:00.000Z",
      revoked_at: null,
      state_version: 1,
    }],
  });
}

function phasedUploadRuntimeFixture({
  clock = () => new Date("2026-08-06T00:00:00.000Z"),
  failOnceAt = null,
} = {}) {
  const sessionsById = new Map();
  const sessionsByKey = new Map();
  const stagedBytes = new Map();
  const documentStates = new Map();
  const retirementsByFamily = new Map();
  let stageWriteCount = 0;
  let remainingFailureStage = failOnceAt;

  const failPlainOnce = (stage, code) => {
    if (remainingFailureStage !== stage) return;
    remainingFailureStage = null;
    throw Object.assign(new Error(`synthetic ${stage} failure`), { code });
  };

  const codedError = (message, safeErrorCode, status = 409) => Object.assign(
    new Error(message),
    {
      code: `LAWOS_${safeErrorCode}`,
      safe_error_code: safeErrorCode,
      status,
    },
  );
  const intentFingerprint = (input) => createHash("sha256").update(JSON.stringify({
    tenant_id: input.tenant_id,
    session_id: input.session_id,
    idempotency_key: input.idempotency_key,
    matter_id: input.matter_id,
    workspace_id: input.workspace_id,
    document_id: input.document_id,
    version_id: input.version_id,
    version_number: input.version_number,
    object_id: input.object_id,
    title: input.title,
    content_type: input.content_type,
    expected_sha256: input.expected_sha256,
    expected_byte_size: input.expected_byte_size,
    permission_envelope_id: input.permission_envelope_id,
    audit_trace_id: input.audit_trace_id,
    actor_id: input.actor_id,
    source_email_thread_id: input.source_email_thread_id,
    source_attachment_id: input.source_attachment_id,
    expires_at: input.expires_at,
  })).digest("hex");
  const persistSession = (session) => {
    const frozen = Object.freeze({ ...session });
    sessionsById.set(frozen.session_id, frozen);
    sessionsByKey.set(frozen.idempotency_key, frozen);
    return frozen;
  };
  const generationIds = ({ family_id, document_id, generation }) => {
    const familyRef = createHash("sha256")
      .update(JSON.stringify({ family_id }))
      .digest("hex");
    const versionId = `version:${document_id}:outlook-attempt:${generation}`;
    return Object.freeze({
      generation,
      session_id: `dms-upload:outlook-mime:${familyRef}:g${generation}`,
      idempotency_key: `outlook-original-mime:${familyRef}:g${generation}`,
      version_id: versionId,
      object_id: `object:${versionId}`,
    });
  };
  const sessionFor = ({ tenant_id, session_id }) => {
    const session = sessionsById.get(session_id);
    if (!session || session.tenant_id !== tenant_id) {
      throw codedError("synthetic upload session was not found", "DMS_UPLOAD_SESSION_NOT_FOUND", 404);
    }
    return session;
  };

  const runtime = Object.freeze({
    async getLatestUploadIntentRetirement({ family_id, document_id, identity_hash }) {
      const receipt = retirementsByFamily.get(family_id) ?? null;
      if (
        receipt
        && (receipt.document_id !== document_id || receipt.identity_hash !== identity_hash)
      ) {
        throw codedError(
          "synthetic upload retirement identity conflicts",
          "DMS_UPLOAD_INTENT_RETIREMENT_CONFLICT",
        );
      }
      return receipt;
    },
    async resolveUploadIntentGeneration({ family_id, document_id, identity_hash }) {
      const receipt = await runtime.getLatestUploadIntentRetirement({
        family_id,
        document_id,
        identity_hash,
      });
      return Object.freeze({
        family_id,
        identity_hash,
        prior_receipt_hash: receipt?.receipt_hash ?? null,
        ...generationIds({
          family_id,
          document_id,
          generation: receipt?.next_generation ?? 0,
        }),
      });
    },
    async rolloverExpiredUploadIntent({ family_id, identity_hash, session_id, expected }) {
      const session = sessionFor({ tenant_id: expected.tenant_id, session_id });
      const latest = retirementsByFamily.get(family_id) ?? null;
      if (latest?.prior_session_id === session_id) return latest;
      const generation = latest?.next_generation ?? 0;
      const current = generationIds({ family_id, document_id: expected.document_id, generation });
      if (
        session.state !== "expired"
        || !session.orphan_deleted_at
        || session.session_id !== current.session_id
        || session.idempotency_key !== current.idempotency_key
        || session.version_id !== current.version_id
        || session.object_id !== current.object_id
        || session.matter_id !== expected.matter_id
        || session.workspace_id !== expected.workspace_id
        || session.document_id !== expected.document_id
        || session.expected_sha256 !== expected.expected_sha256
        || session.expected_byte_size !== expected.expected_byte_size
        || session.permission_envelope_id !== expected.permission_envelope_id
        || session.audit_trace_id !== expected.audit_trace_id
        || session.actor_id !== expected.actor_id
        || session.source_email_thread_id !== expected.source_email_thread_id
        || session.source_attachment_id !== expected.source_attachment_id
        || (latest && latest.identity_hash !== identity_hash)
      ) {
        throw codedError(
          "synthetic upload intent cannot roll over",
          "DMS_UPLOAD_INTENT_IDENTITY_CONFLICT",
        );
      }
      const next = generationIds({
        family_id,
        document_id: expected.document_id,
        generation: generation + 1,
      });
      const receipt = Object.freeze({
        family_id,
        identity_hash,
        document_id: expected.document_id,
        generation,
        next_generation: generation + 1,
        prior_session_id: session.session_id,
        next_session_id: next.session_id,
        next_idempotency_key: next.idempotency_key,
        next_version_id: next.version_id,
        next_object_id: next.object_id,
        source_email_thread_id: session.source_email_thread_id,
        source_attachment_id: session.source_attachment_id,
        receipt_hash: createHash("sha256").update(JSON.stringify([
          family_id,
          identity_hash,
          generation,
          next.session_id,
        ])).digest("hex"),
      });
      retirementsByFamily.set(family_id, receipt);
      return receipt;
    },
    async getUploadSession(input) {
      return sessionFor(input);
    },
    async createUploadSession(input) {
      const fingerprint = intentFingerprint(input);
      const existing = sessionsByKey.get(input.idempotency_key);
      if (existing) {
        if (existing.request_hash !== fingerprint) {
          throw codedError(
            "synthetic upload idempotency key conflicts with another Matter",
            "DMS_IDEMPOTENCY_CONFLICT",
          );
        }
        return Object.freeze({ session: existing, replayed: true });
      }
      if (sessionsById.has(input.session_id)) {
        throw codedError("synthetic upload session identity conflicts", "DMS_IDEMPOTENCY_CONFLICT");
      }
      const session = persistSession({
        ...input,
        adapter_id: "postgres-shaped-upload-test",
        request_hash: fingerprint,
        state: "pending",
        next_attempt_at: input.initial_next_attempt_at ?? new Date(clock()).toISOString(),
        created_at: new Date(clock()).toISOString(),
        updated_at: new Date(clock()).toISOString(),
      });
      return Object.freeze({ session, replayed: false });
    },
    async stageUpload({ tenant_id, session_id, bytes }) {
      const session = sessionFor({ tenant_id, session_id });
      const buffer = Buffer.from(bytes);
      const digest = createHash("sha256").update(buffer).digest("hex");
      if (
        digest !== session.expected_sha256
        || buffer.byteLength !== Number(session.expected_byte_size)
      ) {
        throw codedError("synthetic staged MIME does not match intent", "DMS_STAGED_DIGEST_MISMATCH");
      }
      if (!stagedBytes.has(session_id)) {
        stagedBytes.set(session_id, buffer);
        stageWriteCount += 1;
      } else if (!stagedBytes.get(session_id).equals(buffer)) {
        throw codedError("synthetic staged MIME changed", "DMS_STAGED_DIGEST_MISMATCH");
      }
      return Object.freeze({
        session: persistSession({ ...session, state: session.state === "finalized" ? "finalized" : "bytes_stored" }),
        replayed: session.state !== "pending",
      });
    },
    async finalizeUpload({ tenant_id, session_id }) {
      const session = sessionFor({ tenant_id, session_id });
      if (session.state === "finalized") {
        return Object.freeze({ session, replayed: true });
      }
      if (session.state !== "bytes_stored") {
        throw codedError("synthetic upload has no staged MIME", "DMS_UPLOAD_INVALID_STATE");
      }
      failPlainOnce("finalize", "23505");
      const version = Object.freeze({
        tenant_id: session.tenant_id,
        version_id: session.version_id,
        document_id: session.document_id,
        tenant_id: session.tenant_id,
        version_number: 1,
        status: "current",
        file_object_id: `file:${session.version_id}`,
        sha256: session.expected_sha256,
        persisted: true,
      });
      const document = Object.freeze({
        tenant_id: session.tenant_id,
        document_id: session.document_id,
        matter_id: session.matter_id,
        workspace_id: session.workspace_id,
        folder_id: `folder:${session.matter_id}:00_Email`,
        title: session.title,
        mime_type: session.content_type,
        status: "active",
        current_version_id: session.version_id,
        permission_envelope_id: session.permission_envelope_id,
        audit_trace_id: session.audit_trace_id,
        latest_sha256: session.expected_sha256,
        source_email_thread_id: session.source_email_thread_id,
        source_attachment_id: session.source_attachment_id,
      });
      const fileObject = Object.freeze({
        file_object_id: version.file_object_id,
        object_id: session.object_id,
        tenant_id: session.tenant_id,
        storage_pointer_ref: `object:${session.object_id}`,
        sha256: session.expected_sha256,
        byte_size: Number(session.expected_byte_size),
        content_type: session.content_type,
        mime_type: session.content_type,
        status: "committed",
      });
      documentStates.set(session.document_id, Object.freeze({
        document,
        version,
        versions: Object.freeze([version]),
        file_object: fileObject,
        file_objects: Object.freeze([fileObject]),
      }));
      return Object.freeze({
        session: persistSession({ ...session, state: "finalized" }),
        replayed: false,
      });
    },
    async getDocumentState({ tenant_id, document_id }) {
      const state = documentStates.get(document_id);
      if (state) failPlainOnce("state_read", "57P01");
      return state?.document.tenant_id === tenant_id ? state : null;
    },
    async getDocumentIntegrityState({ tenant_id, document_id }) {
      const state = documentStates.get(document_id);
      if (!state || state.document.tenant_id !== tenant_id) return null;
      const session = [...sessionsById.values()].find((entry) =>
        entry.document_id === document_id && entry.object_id === state.file_object.object_id
      );
      const bytes = session ? stagedBytes.get(session.session_id) : null;
      if (!bytes) throw codedError("synthetic provider object is unavailable", "DMS_COMMITTED_OBJECT_NOT_FOUND");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (sha256 !== state.file_object.sha256 || bytes.byteLength !== Number(state.file_object.byte_size)) {
        throw codedError("synthetic provider integrity mismatch", "DMS_COMMITTED_DIGEST_MISMATCH");
      }
      return Object.freeze({
        ...state,
        provider_integrity: Object.freeze({
          object_id: state.file_object.object_id,
          sha256,
          byte_size: bytes.byteLength,
          mime_type: state.file_object.mime_type,
        }),
      });
    },
    async reconcileUploadSessions({ tenant_id }) {
      const now = new Date(clock()).getTime();
      const outcomes = [];
      for (const session of sessionsById.values()) {
        if (
          session.tenant_id === tenant_id
          && !["finalized", "expired", "failed_terminal"].includes(session.state)
          && Date.parse(session.expires_at) <= now
        ) {
          stagedBytes.delete(session.session_id);
          persistSession({
            ...session,
            state: "expired",
            orphan_deleted_at: new Date(now).toISOString(),
            updated_at: new Date(now).toISOString(),
          });
          outcomes.push(Object.freeze({ session_id: session.session_id, action: "orphan_cleaned" }));
        }
      }
      return Object.freeze(outcomes);
    },
  });

  return Object.freeze({
    runtime,
    get stage_write_count() {
      return stageWriteCount;
    },
    get document_count() {
      return documentStates.size;
    },
    get session_count() {
      return sessionsById.size;
    },
    get retirement_count() {
      return retirementsByFamily.size;
    },
    sessions() {
      return Object.freeze([...sessionsById.values()]);
    },
  });
}

async function startPhasedUploadSagaServer({
  uploadFixture,
  failAfterUploadIntent = false,
  failFilingAudit = false,
  dmsSeedRecords = [],
  clock = () => new Date("2026-08-06T00:00:00.000Z"),
} = {}) {
  const matterRepository = seedMatterRepository();
  const baseDmsRepository = createDmsRepository({ seedRecords: dmsSeedRecords });
  let failNextFilingAudit = failFilingAudit;
  let dmsRepository;
  dmsRepository = Object.freeze({
    ...baseDmsRepository,
    transaction(fn) {
      return baseDmsRepository.transaction(() => fn(dmsRepository));
    },
    create(record) {
      if (failAfterUploadIntent && record.model_type === "DmsWorkspace") {
        failAfterUploadIntent = false;
        throw new Error("synthetic process loss immediately after durable upload intent");
      }
      return baseDmsRepository.create(record);
    },
    appendAudit(event) {
      if (failNextFilingAudit && event.action === "dms.email.thread.file") {
        failNextFilingAudit = false;
        throw new Error("synthetic production-shaped filing audit failure");
      }
      return baseDmsRepository.appendAudit(event);
    },
  });
  const fileStorage = createFileStorageAdapter({
    adapter_id: "outlook-phased-saga-fallback",
    rootPath: join(mkdtempSync(join(tmpdir(), "outlook-phased-saga-")), "objects"),
  });
  const localDmsRuntime = createDefaultDmsRuntime({
    repository: dmsRepository,
    storage: fileStorage,
  });
  const dmsRuntime = Object.freeze({
    ...localDmsRuntime,
    upload_runtime: uploadFixture.runtime,
  });
  const emailDmsRepository = outlookEmailDmsRepository();
  const matterRuntime = createMatterRuntimeContext({
    repository: matterRepository,
    dmsRuntime,
    ...seedPeopleDirectories(),
    clock: () => "2026-08-06T00:00:00.000Z",
  });
  const m365GraphConfig = {
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock,
    credential_vault: {
      async resolveDelegatedCredential() {
        return {
          access_token: "phased-saga-access-token-never-return",
          refresh_token: "phased-saga-refresh-token-never-return",
          mailbox_address: MAILBOX,
          refresh_profile: "client",
          refresh_profile_proof: "s".repeat(43),
          expires_at: "2026-08-08T00:00:00.000Z",
        };
      },
      async storeDelegatedCredential() {
        throw new Error("unexpected credential refresh in phased saga test");
      },
    },
    provider: {
      async getMeMessageMime({ rest_message_id }) {
        const suffix = rest_message_id === "graph-phased-concurrent"
          ? "phased-concurrent"
          : "phased-process-loss";
        const internetMessageId = `<outlook-${suffix}@amic.law>`;
        return {
          mime_bytes: messageMime({ hasAttachment: false, internetMessageId }),
          immutable_message_id: `immutable:${rest_message_id}`,
          internet_message_id: internetMessageId,
          provider_request_id: `provider:${rest_message_id}`,
          message_metadata: {
            conversation_id: `conversation-${suffix}`,
            internet_message_id: internetMessageId,
            subject: "Outlook filing regression",
            sender: { display_name: "상대방", address: "opposing@example.com" },
            from: { display_name: "상대방", address: "opposing@example.com" },
            recipients: [{ display_name: "AMIC 변호사", address: MAILBOX, recipient_type: "to" }],
            received_at: "2026-08-06T00:00:00.000Z",
            has_attachments: false,
            is_in_sent_items: false,
            is_draft: false,
          },
        };
      },
    },
  };
  const started = await startApiServer({
    port: 0,
    matterRuntime,
    dmsRuntime,
    emailDmsRuntime: { repository: emailDmsRepository },
    m365GraphConfig,
    sessionAuth: outlookSessionAuth(),
  });
  return Object.freeze({
    ...started,
    base_url: `http://${started.host}:${started.port}`,
    dmsRepository,
    matterRepository,
    async close() {
      await new Promise((resolve) => started.server.close(resolve));
      emailDmsRepository.close();
      baseDmsRepository.close();
    },
  });
}

function phasedAuthorityEmail() {
  return emailFixture({
    graph_message_id: "graph-phased-process-loss",
    internet_message_id: "<outlook-phased-process-loss@amic.law>",
    conversation_id: "conversation-phased-process-loss",
    attachments: [],
  });
}

function phasedAuthorityDocumentId() {
  const email = phasedAuthorityEmail();
  const emailThreadId = `thread:${createHash("sha256").update(JSON.stringify([
    TENANT,
    email.canonical_graph_message_id,
    email.internet_message_id,
  ])).digest("hex")}`;
  const mimeSha256 = createHash("sha256").update(messageMime({
    hasAttachment: false,
    internetMessageId: email.internet_message_id,
  })).digest("hex");
  return `doc:${emailThreadId}:original-mime:${mimeSha256}`;
}

function dmsAuthorityConflictSeed(kind) {
  const workspaceId = `workspace:${MATTER}`;
  const rootFolderId = `folder:${workspaceId}:root`;
  const emailFolderId = `folder:${MATTER}:00_Email`;
  const expectedPermission = "perm:outlook:addin:test";
  const expectedAudit = "audit:outlook:addin:test";
  if (kind === "workspace") {
    return [createDmsWorkspace({
      workspace_id: workspaceId,
      tenant_id: TENANT,
      matter_id: MATTER,
      name: "Outlook Add-in filing test",
      status: "active",
      permission_envelope_id: "perm:outlook:conflict",
      audit_trace_id: expectedAudit,
    })];
  }
  if (kind === "workspace-identity") {
    return [createDmsWorkspace({
      workspace_id: "workspace:wrong-matter",
      tenant_id: TENANT,
      matter_id: MATTER,
      name: "Outlook Add-in filing test",
      status: "active",
      permission_envelope_id: expectedPermission,
      audit_trace_id: expectedAudit,
    })];
  }
  if (kind === "workspace-wrong-matter") {
    return [createDmsWorkspace({
      workspace_id: workspaceId,
      tenant_id: TENANT,
      matter_id: OTHER_MATTER,
      name: "Separate matter",
      status: "active",
      permission_envelope_id: expectedPermission,
      audit_trace_id: expectedAudit,
    })];
  }
  if (kind === "root") {
    return [createDmsFolder({
      folder_id: rootFolderId,
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: workspaceId,
      parent_folder_id: null,
      name: "Root",
      status: "active",
      permission_envelope_id: expectedPermission,
      audit_trace_id: "audit:outlook:conflict",
    })];
  }
  if (kind === "email-folder") {
    return [createDmsFolder({
      folder_id: emailFolderId,
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: workspaceId,
      parent_folder_id: rootFolderId,
      name: "Renamed_Email",
      status: "active",
      permission_envelope_id: expectedPermission,
      audit_trace_id: expectedAudit,
    })];
  }
  if (kind === "email-folder-wrong-matter") {
    return [createDmsFolder({
      folder_id: emailFolderId,
      tenant_id: TENANT,
      matter_id: OTHER_MATTER,
      workspace_id: workspaceId,
      parent_folder_id: rootFolderId,
      name: "00_Email",
      status: "active",
      permission_envelope_id: expectedPermission,
      audit_trace_id: expectedAudit,
    })];
  }
  if (kind === "matter-folder") {
    return [createDmsFolder({
      folder_id: `folder:${MATTER}:10_Pleadings`,
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: "workspace:wrong-matter",
      parent_folder_id: rootFolderId,
      name: "10_Pleadings",
      status: "active",
      permission_envelope_id: expectedPermission,
      audit_trace_id: expectedAudit,
    })];
  }
  if (kind === "document") {
    return [createDmsDocument({
      document_id: phasedAuthorityDocumentId(),
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: workspaceId,
      folder_id: emailFolderId,
      title: "Outlook filing regression.eml",
      status: "active",
      current_version_id: `version:${phasedAuthorityDocumentId()}:1`,
      permission_envelope_id: "perm:outlook:conflict",
      audit_trace_id: expectedAudit,
    })];
  }
  throw new TypeError(`unknown DMS authority conflict fixture: ${kind}`);
}

test("existing Matter DMS authority conflicts fail before any Outlook filing mutation", async (t) => {
  for (const kind of [
    "workspace",
    "workspace-identity",
    "workspace-wrong-matter",
    "root",
    "email-folder",
    "email-folder-wrong-matter",
    "matter-folder",
    "document",
  ]) {
    await t.test(kind, async () => {
      const uploadFixture = phasedUploadRuntimeFixture();
      const server = await startPhasedUploadSagaServer({
        uploadFixture,
        dmsSeedRecords: dmsAuthorityConflictSeed(kind),
      });
      const email = phasedAuthorityEmail();
      const modelTypes = [
        "DmsWorkspace",
        "DmsFolder",
        "DmsDocument",
        "DmsEmailThread",
      ];
      const before = Object.fromEntries(modelTypes.map((modelType) => [
        modelType,
        server.dmsRepository.list({ tenant_id: TENANT, model_type: modelType }).length,
      ]));
      const beforeTimeline = server.matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
      }).length;
      const beforeAudit = server.dmsRepository.listAudit({ tenant_id: TENANT }).length;
      try {
        const response = await fetch(`${server.base_url}/api/outlook/email/file`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer outlook-provenance-session",
          },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
        });
        const body = await response.json();
        assert.equal(response.status, 409, JSON.stringify(body));
        assert.deepEqual(body.safe_error_codes, ["OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT"]);
        assert.equal(uploadFixture.session_count, 0);
        for (const modelType of modelTypes) {
          assert.equal(
            server.dmsRepository.list({ tenant_id: TENANT, model_type: modelType }).length,
            before[modelType],
            `${kind} unexpectedly wrote ${modelType}`,
          );
        }
        assert.equal(
          server.matterRepository.list({
            tenant_id: TENANT,
            model_type: "MatterTimelineEvent",
          }).length,
          beforeTimeline,
          `${kind} unexpectedly wrote Matter timeline`,
        );
        assert.equal(
          server.dmsRepository.listAudit({ tenant_id: TENANT }).length,
          beforeAudit,
          `${kind} unexpectedly wrote DMS audit`,
        );
      } finally {
        await server.close();
      }
    });
  }
});

test("existing nested Matter folders remain valid when their ancestry reaches the canonical root", async () => {
  const workspaceId = `workspace:${MATTER}`;
  const rootFolderId = `folder:${workspaceId}:root`;
  const permissionEnvelopeId = "perm:outlook:addin:test";
  const auditTraceId = "audit:outlook:addin:test";
  const clientFolderId = `folder:${MATTER}:client-materials`;
  const correspondenceFolderId = `folder:${MATTER}:client-correspondence`;
  const dmsSeedRecords = [
    createDmsWorkspace({
      workspace_id: workspaceId,
      tenant_id: TENANT,
      matter_id: MATTER,
      name: "Outlook Add-in filing test",
      status: "active",
      permission_envelope_id: permissionEnvelopeId,
      audit_trace_id: auditTraceId,
    }),
    createDmsFolder({
      folder_id: rootFolderId,
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: workspaceId,
      parent_folder_id: null,
      name: "Root",
      status: "active",
      permission_envelope_id: permissionEnvelopeId,
      audit_trace_id: auditTraceId,
    }),
    createDmsFolder({
      folder_id: clientFolderId,
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: workspaceId,
      parent_folder_id: rootFolderId,
      name: "Client materials",
      status: "active",
      permission_envelope_id: permissionEnvelopeId,
      audit_trace_id: auditTraceId,
    }),
    createDmsFolder({
      folder_id: correspondenceFolderId,
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: workspaceId,
      parent_folder_id: clientFolderId,
      name: "Correspondence",
      status: "active",
      permission_envelope_id: permissionEnvelopeId,
      audit_trace_id: auditTraceId,
    }),
  ];
  const uploadFixture = phasedUploadRuntimeFixture();
  const server = await startPhasedUploadSagaServer({ uploadFixture, dmsSeedRecords });
  try {
    const response = await fetch(`${server.base_url}/api/outlook/email/file`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer outlook-provenance-session",
      },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email: phasedAuthorityEmail(),
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    assert.equal(body.outcome, "created");
    assert.equal(uploadFixture.session_count, 1);
    assert.equal(server.dmsRepository.get({
      tenant_id: TENANT,
      model_type: "DmsFolder",
      folder_id: correspondenceFolderId,
    }).parent_folder_id, clientFolderId);
  } finally {
    await server.close();
  }
});

test("Outlook editable task routes use signed scopes and resource-scoped ACLs", async () => {
  const sourceEmailThreadId = "thread:outlook-task-scope-test";
  const matterRepository = seedMatterRepository();
  const dmsRepository = createDmsRepository({
    seedRecords: [createDmsEmailThread({
      email_thread_id: sourceEmailThreadId,
      tenant_id: TENANT,
      matter_id: MATTER,
      subject: "Task source",
      status: "active",
      permission_envelope_id: "perm:outlook-task-source",
      audit_trace_id: "audit:outlook-task-source",
    })],
  });
  const dmsRuntime = createDefaultDmsRuntime({
    repository: dmsRepository,
    storage: createFileStorageAdapter({
      adapter_id: "outlook-task-scope-test-storage",
      rootPath: join(mkdtempSync(join(tmpdir(), "outlook-task-scope-")), "objects"),
    }),
  });
  const matterRuntime = createMatterRuntimeContext({
    repository: matterRepository,
    dmsRuntime,
    ...seedPeopleDirectories(),
    clock: () => "2026-08-08T00:00:00.000Z",
  });
  const sessions = await scopeDerivedOutlookSessions();
  const started = await startApiServer({
    port: 0,
    matterRuntime,
    dmsRuntime,
    sessionAuth: sessions.sessionAuth,
  });
  const baseUrl = `http://${started.host}:${started.port}`;
  const request = (token, path, method, body) => fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const createBody = (overrides = {}) => ({
    tenant_id: TENANT,
    actor_id: "forged-browser-actor",
    matter_id: MATTER,
    idempotency_key: "outlook-task-scope-create",
    source_email_thread_id: sourceEmailThreadId,
    task: { title: "서면 검토", due_at: "2026-08-12T09:30:00+09:00", status: "todo" },
    ...overrides,
  });

  try {
    const forgedTenant = await request(
      sessions.writerToken,
      "/api/outlook/tasks",
      "POST",
      createBody({ tenant_id: "tenant_forged", idempotency_key: "outlook-task-forged-tenant" }),
    );
    assert.equal(forgedTenant.status, 400);

    const scopeDeniedCreate = await request(
      sessions.readerToken,
      "/api/outlook/tasks",
      "POST",
      createBody({ idempotency_key: "outlook-task-reader-denied-create", source_email_thread_id: undefined }),
    );
    assert.equal(scopeDeniedCreate.status, 403);

    const aclCreatedResponse = await request(
      sessions.aclToken,
      "/api/outlook/tasks",
      "POST",
      createBody({ idempotency_key: "outlook-task-acl-create", source_email_thread_id: undefined }),
    );
    const aclCreated = await aclCreatedResponse.json();
    assert.equal(aclCreatedResponse.status, 201, JSON.stringify(aclCreated));
    const crossMatterAclCreate = await request(
      sessions.aclToken,
      "/api/outlook/tasks",
      "POST",
      createBody({
        matter_id: OTHER_MATTER,
        idempotency_key: "outlook-task-acl-cross-matter",
        source_email_thread_id: undefined,
      }),
    );
    assert.equal(crossMatterAclCreate.status, 403);

    const aclUpdatedResponse = await request(
      sessions.aclToken,
      `/api/outlook/tasks/${encodeURIComponent(aclCreated.item.activity_id)}`,
      "PATCH",
      {
        tenant_id: TENANT,
        matter_id: MATTER,
        idempotency_key: "outlook-task-acl-update",
        expected_version: 1,
        patch: { status: "in_progress" },
      },
    );
    const aclUpdated = await aclUpdatedResponse.json();
    assert.equal(aclUpdatedResponse.status, 200, JSON.stringify(aclUpdated));
    sessions.denyTask(aclCreated.item.activity_id);
    const taskAclDeniedUpdate = await request(
      sessions.aclToken,
      `/api/outlook/tasks/${encodeURIComponent(aclCreated.item.activity_id)}`,
      "PATCH",
      {
        tenant_id: TENANT,
        matter_id: MATTER,
        idempotency_key: "outlook-task-acl-task-denied",
        expected_version: 2,
        patch: { title: "차단되어야 하는 변경" },
      },
    );
    assert.equal(taskAclDeniedUpdate.status, 403);

    const createdResponse = await request(
      sessions.writerToken,
      "/api/outlook/tasks",
      "POST",
      createBody(),
    );
    const created = await createdResponse.json();
    assert.equal(createdResponse.status, 201, JSON.stringify(created));
    assert.equal(created.item.assigned_to_user_id, null);
    assert.equal(created.item.due_at, "2026-08-12T00:30:00.000Z");
    assert.equal(matterRepository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: created.item.activity_id,
    }).created_by, sessions.writer.user_id);

    const replayResponse = await request(sessions.writerToken, "/api/outlook/tasks", "POST", createBody());
    assert.equal(replayResponse.status, 200);
    assert.equal((await replayResponse.json()).outcome, "idempotent_replay");

    const crossActorCreateCounts = {
      tasks: matterRepository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length,
      audits: matterRepository.listAudit({ tenant_id: TENANT }).length,
      timeline: matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).length,
      idempotency: matterRepository.snapshot().idempotency.length,
    };
    const crossActorCreateResponse = await request(sessions.aclToken, "/api/outlook/tasks", "POST", createBody());
    const crossActorCreate = await crossActorCreateResponse.json();
    assert.equal(crossActorCreateResponse.status, 409, JSON.stringify(crossActorCreate));
    assert.deepEqual(crossActorCreate.safe_error_codes, ["OUTLOOK_TASK_IDEMPOTENCY_CONFLICT"]);
    assert.equal(crossActorCreate.item, null);
    assert.equal(crossActorCreate.audit_event, undefined);
    assert.equal(crossActorCreate.timeline_event, undefined);
    assert.equal(JSON.stringify(crossActorCreate).includes(sessions.writer.user_id), false);
    assert.deepEqual({
      tasks: matterRepository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length,
      audits: matterRepository.listAudit({ tenant_id: TENANT }).length,
      timeline: matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).length,
      idempotency: matterRepository.snapshot().idempotency.length,
    }, crossActorCreateCounts);

    const nullStatusKey = "outlook-task-null-status-route";
    const taskRef = {
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: created.item.activity_id,
    };
    const beforeNullStatus = matterRepository.get(taskRef);
    const auditCountBeforeNullStatus = matterRepository.listAudit({ tenant_id: TENANT }).length;
    const timelineCountBeforeNullStatus = matterRepository.list({
      tenant_id: TENANT,
      model_type: "MatterTimelineEvent",
      matter_id: MATTER,
    }).length;
    const nullStatusResponse = await request(
      sessions.writerToken,
      `/api/outlook/tasks/${encodeURIComponent(created.item.activity_id)}`,
      "PATCH",
      {
        tenant_id: TENANT,
        matter_id: MATTER,
        idempotency_key: nullStatusKey,
        expected_version: 1,
        patch: { status: null },
      },
    );
    assert.equal(nullStatusResponse.status, 400);
    assert.deepEqual(matterRepository.get(taskRef), beforeNullStatus);
    assert.equal(matterRepository.listAudit({ tenant_id: TENANT }).length, auditCountBeforeNullStatus);
    assert.equal(matterRepository.list({
      tenant_id: TENANT,
      model_type: "MatterTimelineEvent",
      matter_id: MATTER,
    }).length, timelineCountBeforeNullStatus);
    assert.equal(matterRepository.getIdempotency({
      tenant_id: TENANT,
      idempotency_key: nullStatusKey,
    }), undefined);

    const scopeDeniedUpdate = await request(
      sessions.readerToken,
      `/api/outlook/tasks/${encodeURIComponent(created.item.activity_id)}`,
      "PATCH",
      {
        tenant_id: TENANT,
        matter_id: MATTER,
        idempotency_key: "outlook-task-reader-denied-update",
        expected_version: 1,
        patch: { status: "in_progress" },
      },
    );
    assert.equal(scopeDeniedUpdate.status, 403);

    const updatedResponse = await request(
      sessions.writerToken,
      `/api/outlook/tasks/${encodeURIComponent(created.item.activity_id)}`,
      "PATCH",
      {
        tenant_id: TENANT,
        matter_id: MATTER,
        idempotency_key: "outlook-task-scope-update",
        expected_version: 1,
        patch: { due_at: "2026-08-13", estimated_minutes: 30, status: "in_progress" },
      },
    );
    const updated = await updatedResponse.json();
    assert.equal(updatedResponse.status, 200, JSON.stringify(updated));
    assert.equal(updated.item.due_at, "2026-08-13");
    assert.equal(updated.item.version, 2);

    const crossActorUpdateCounts = {
      tasks: matterRepository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length,
      audits: matterRepository.listAudit({ tenant_id: TENANT }).length,
      timeline: matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).length,
      idempotency: matterRepository.snapshot().idempotency.length,
    };
    const crossActorUpdateResponse = await request(
      sessions.aclToken,
      `/api/outlook/tasks/${encodeURIComponent(created.item.activity_id)}`,
      "PATCH",
      {
        tenant_id: TENANT,
        matter_id: MATTER,
        actor_id: "forged-browser-actor",
        idempotency_key: "outlook-task-scope-update",
        expected_version: 1,
        patch: { due_at: "2026-08-13", estimated_minutes: 30, status: "in_progress" },
      },
    );
    const crossActorUpdate = await crossActorUpdateResponse.json();
    assert.equal(crossActorUpdateResponse.status, 409, JSON.stringify(crossActorUpdate));
    assert.deepEqual(crossActorUpdate.safe_error_codes, ["OUTLOOK_TASK_IDEMPOTENCY_CONFLICT"]);
    assert.equal(crossActorUpdate.item, null);
    assert.equal(crossActorUpdate.audit_event, undefined);
    assert.equal(crossActorUpdate.timeline_event, undefined);
    assert.equal(JSON.stringify(crossActorUpdate).includes(sessions.writer.user_id), false);
    assert.deepEqual({
      tasks: matterRepository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length,
      audits: matterRepository.listAudit({ tenant_id: TENANT }).length,
      timeline: matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).length,
      idempotency: matterRepository.snapshot().idempotency.length,
    }, crossActorUpdateCounts);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
});

test("Outlook add-in routes file email, save attachments, create follow-up, and warn without blocking send", async (t) => {
  const baseMatterRepository = seedMatterRepository();
  let failNextFollowupIdempotency = false;
  let failNextOutlookTimelineAudit = false;
  let matterRepository;
  matterRepository = Object.freeze({
    ...baseMatterRepository,
    transaction(fn) {
      return baseMatterRepository.transaction(() => fn(matterRepository));
    },
    recordIdempotency(entry) {
      if (failNextFollowupIdempotency && entry.operation === "outlook_followup_create") {
        failNextFollowupIdempotency = false;
        throw new Error("synthetic follow-up idempotency failure");
      }
      return baseMatterRepository.recordIdempotency(entry);
    },
    appendAudit(event) {
      if (failNextOutlookTimelineAudit && event.action === "matter.timeline.outlook.file") {
        failNextOutlookTimelineAudit = false;
        throw new Error("synthetic Outlook timeline audit failure");
      }
      return baseMatterRepository.appendAudit(event);
    },
  });
  const baseDmsRepository = createDmsRepository();
  let failNextFilingAudit = false;
  let dmsRepository;
  dmsRepository = Object.freeze({
    ...baseDmsRepository,
    transaction(fn) {
      return baseDmsRepository.transaction(() => fn(dmsRepository));
    },
    appendAudit(event) {
      if (failNextFilingAudit && event.action === "dms.email.thread.file") {
        failNextFilingAudit = false;
        throw new Error("synthetic filing audit failure");
      }
      return baseDmsRepository.appendAudit(event);
    },
  });
  const fileStorage = createFileStorageAdapter({
    adapter_id: "outlook-addin-test-storage",
    rootPath: join(mkdtempSync(join(tmpdir(), "outlook-addin-dms-")), "objects"),
  });
  let storageWriteCount = 0;
  let failNextStorageWrite = false;
  const storage = Object.freeze({
    ...fileStorage,
    putObject(input) {
      if (failNextStorageWrite) {
        failNextStorageWrite = false;
        throw new Error("synthetic original MIME upload failure");
      }
      storageWriteCount += 1;
      return fileStorage.putObject(input);
    },
  });
  const dmsRuntime = createDefaultDmsRuntime({ repository: dmsRepository, storage });
  const emailDmsRepository = outlookEmailDmsRepository();
  let providerCallCount = 0;
  let invalidateFiledSentMessage = false;
  let sentAfterManual = false;
  let closeMatterDuringProviderRead = false;
  const m365GraphConfig = {
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date("2026-08-06T00:00:00.000Z"),
    credential_vault: {
      async resolveDelegatedCredential() {
        return {
          access_token: "outlook-addin-test-access-token-never-return",
          refresh_token: "outlook-addin-test-refresh-token-never-return",
          mailbox_address: MAILBOX,
          refresh_profile: "client",
          refresh_profile_proof: "p".repeat(43),
          expires_at: "2026-08-07T00:00:00.000Z",
        };
      },
      async storeDelegatedCredential() {
        throw new Error("unexpected credential refresh in filing test");
      },
    },
    provider: {
      async getMeMessageMime(input) {
        providerCallCount += 1;
        if (closeMatterDuringProviderRead) {
          closeMatterDuringProviderRead = false;
          baseMatterRepository.update(
            { tenant_id: TENANT, model_type: "Matter", matter_id: MATTER },
            { status: "closed" },
          );
        }
        assert.equal(input.mailbox_scope, "me");
        assert.equal(input.source_id_type, "restId");
        assert.equal(input.target_id_type, "restImmutableEntryId");
        if (input.rest_message_id === "graph-provider-failure") {
          throw Object.assign(new Error("synthetic Microsoft Graph failure"), {
            safe_error_code: "M365_GRAPH_MAIL_PROVIDER_ERROR",
            status: 502,
          });
        }
        const identityMismatch = input.rest_message_id === "graph-identity-mismatch";
        const ambiguous = input.rest_message_id === "graph-ambiguous-attachments";
        const officeAttachmentMetadata = input.rest_message_id === "graph-office-attachment-metadata";
        const oversizedMime = input.rest_message_id === "graph-oversized-mime";
        const attachmentAtLimit = input.rest_message_id === "graph-attachment-at-limit";
        const attachmentOverLimit = input.rest_message_id === "graph-attachment-over-limit";
        const participantSpoof = input.rest_message_id === "graph-participant-spoof";
        const sent = input.rest_message_id === "graph-outlook-sent-001"
          || (input.rest_message_id === "graph-sent-after-manual" && sentAfterManual);
        const divergentSenderFrom = input.rest_message_id === "graph-divergent-sender-from";
        const sentDraft = input.rest_message_id === "graph-outlook-sent-draft-001";
        const authoredByMailbox = sent || sentDraft || input.rest_message_id === "graph-sent-after-manual";
        const sameConversationSecond = input.rest_message_id === "graph-outlook-addin-test-002";
        const attachmentFree = [
          "graph-attachment-free",
          "graph-upload-failure",
          "graph-partial-retry",
          "graph-outlook-sent-draft-001",
          "graph-outlook-received-as-sent-001",
          "graph-divergent-sender-from",
          "graph-oversized-mime",
          "graph-participant-spoof",
        ].includes(input.rest_message_id);
        const internetMessageId = ({
          "graph-attachment-free": "<outlook-attachment-free@amic.law>",
          "graph-upload-failure": "<outlook-upload-failure@amic.law>",
          "graph-partial-retry": "<outlook-partial-retry@amic.law>",
          "graph-outlook-sent-draft-001": "<outlook-sent-draft-001@amic.law>",
          "graph-outlook-received-as-sent-001": "<outlook-received-as-sent-001@amic.law>",
          "graph-divergent-sender-from": "<outlook-divergent-sender-from@amic.law>",
          "graph-oversized-mime": "<outlook-oversized-mime@amic.law>",
          "graph-attachment-at-limit": "<outlook-attachment-at-limit@amic.law>",
          "graph-attachment-over-limit": "<outlook-attachment-over-limit@amic.law>",
          "graph-participant-spoof": "<outlook-participant-spoof@amic.law>",
          "graph-office-attachment-metadata": "<outlook-office-attachment-metadata@amic.law>",
          "graph-sent-after-manual": "<outlook-sent-after-manual@amic.law>",
          "graph-alias-a": "<outlook-alias-target@amic.law>",
          "graph-alias-b": "<outlook-alias-target@amic.law>",
        })[input.rest_message_id]
          ?? (sameConversationSecond
            ? "<outlook-addin-test-002@amic.law>"
            : "<outlook-addin-test-001@amic.law>");
        const conversationId = identityMismatch
          ? "provider-conversation-does-not-match"
          : ({
              "graph-ambiguous-attachments": "conversation-ambiguous-attachments",
              "graph-attachment-free": "conversation-attachment-free",
              "graph-upload-failure": "conversation-upload-failure",
              "graph-partial-retry": "conversation-partial-retry",
              "graph-outlook-sent-001": "conversation-outlook-sent",
              "graph-outlook-sent-draft-001": "conversation-outlook-sent-draft",
              "graph-outlook-received-as-sent-001": "conversation-outlook-received-as-sent",
              "graph-divergent-sender-from": "conversation-divergent-sender-from",
              "graph-oversized-mime": "conversation-oversized-mime",
              "graph-attachment-at-limit": "conversation-attachment-at-limit",
              "graph-attachment-over-limit": "conversation-attachment-over-limit",
              "graph-participant-spoof": "conversation-participant-spoof",
              "graph-office-attachment-metadata": "conversation-office-attachment-metadata",
              "graph-sent-after-manual": "conversation-sent-after-manual",
              "graph-alias-a": "conversation-alias-target",
              "graph-alias-b": "conversation-alias-target",
            })[input.rest_message_id] ?? "conversation-outlook-addin-test";
        const senderAddress = divergentSenderFrom
          ? "delegate@example.com"
          : authoredByMailbox
            ? MAILBOX
            : "opposing@example.com";
        const fromAddress = participantSpoof
          ? "canonical-author@example.com"
          : divergentSenderFrom
            ? MAILBOX
            : senderAddress;
        const immutableMessageId = ["graph-alias-a", "graph-alias-b"].includes(input.rest_message_id)
          ? "immutable:graph-alias-target"
          : `immutable:${input.rest_message_id}`;
        const mimeBytes = messageMime({
            attachmentBytes: attachmentAtLimit
              ? Buffer.alloc(MAX_ATTACHMENT_BYTES, 0x61)
              : attachmentOverLimit
                ? Buffer.alloc(MAX_ATTACHMENT_BYTES + 1, 0x62)
                : input.rest_message_id === "graph-attachment-domain-recovery"
                  ? ATTACHMENT_RECOVERY_BYTES
                  : ATTACHMENT_BYTES,
            attachmentContentType: officeAttachmentMetadata
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "text/plain",
            attachmentHeaderName: officeAttachmentMetadata
              ? SPLIT_ENCODED_ATTACHMENT_NAME
              : "contract.txt",
            duplicateAttachmentName: ambiguous,
            fromAddress,
            hasAttachment: !attachmentFree,
            internetMessageId,
          });
        return {
          mime_bytes: oversizedMime
            ? Buffer.concat([mimeBytes, Buffer.alloc(3 * 1024 * 1024)])
            : mimeBytes,
          immutable_message_id: immutableMessageId,
          internet_message_id: internetMessageId,
          provider_request_id: `provider:${input.rest_message_id}`,
          message_metadata: {
            conversation_id: conversationId,
            internet_message_id: internetMessageId,
            subject: "Outlook filing regression",
            sender: { display_name: authoredByMailbox ? "AMIC 변호사" : "상대방", address: senderAddress },
            from: { display_name: participantSpoof ? "Canonical Author" : divergentSenderFrom ? "AMIC 변호사" : "작성자", address: fromAddress },
            recipients: participantSpoof
              ? [
                  { display_name: "Canonical To", address: "canonical-to@amic.kr", recipient_type: "to" },
                  { display_name: "Canonical Cc", address: "canonical-cc@example.com", recipient_type: "cc" },
                  { display_name: "Canonical Bcc", address: "canonical-bcc@example.com", recipient_type: "bcc" },
                ]
              : [{ display_name: "AMIC 변호사", address: MAILBOX, recipient_type: "to" }],
            received_at: "2026-07-03T01:00:03.000Z",
            has_attachments: !attachmentFree,
            is_in_sent_items: invalidateFiledSentMessage && sent
              ? false
              : sent || sentDraft || divergentSenderFrom,
            is_draft: invalidateFiledSentMessage && sent
              ? true
              : sentDraft,
          },
        };
      },
    },
  };
  const matterRuntime = createMatterRuntimeContext({
    repository: matterRepository,
    dmsRuntime,
    ...seedPeopleDirectories(),
    clock: () => "2026-07-03T02:00:00.000Z",
  });
  const baseAttachmentReceiptAuthority = createOutlookAttachmentReceiptAuthority({
    secret: "outlook-attachment-api-issue-counter-secret-v1",
  });
  let attachmentReceiptIssueCount = 0;
  const attachmentReceiptAuthority = {
    verify: baseAttachmentReceiptAuthority.verify,
    issue(input) {
      attachmentReceiptIssueCount += 1;
      return baseAttachmentReceiptAuthority.issue(input);
    },
  };
  const started = await startApiServer({
    port: 0,
    matterRuntime,
    dmsRuntime,
    emailDmsRuntime: { repository: emailDmsRepository },
    m365GraphConfig,
    sessionAuth: outlookSessionAuth(),
    outlookAttachmentReceiptAuthority: attachmentReceiptAuthority,
  });
  const baseUrl = `http://${started.host}:${started.port}`;
  try {
    const forged = await fetch(`${baseUrl}/api/outlook/smart-alerts/evaluate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lawos-permission-context": JSON.stringify({
          principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["outlook_addin_user"] },
          rules: [{ id: "outlook-addin-test-forged-allow", effect: "allow", action: "*" }],
          object_acl: [],
        }),
      },
      body: JSON.stringify({ message: { to: [{ email: "external@example.com" }], attachments: [] } }),
    });
    const forgedBody = await forged.json();
    assert.equal(forged.status, 401);
    assert.equal(forgedBody.safe_error_codes[0], "AUTH_SESSION_REQUIRED");

    const sessionHeaders = { authorization: "Bearer outlook-provenance-session" };
    const json = (path, init = {}) => jsonFetch(baseUrl, path, init, sessionHeaders);

    const forgedClaims = await fetch(`${baseUrl}/api/outlook/bootstrap?tenant_id=${TENANT}&ProductId=browser-product`, {
      headers: {
        ...sessionHeaders,
        "x-lawos-permission-context": JSON.stringify({
          principal: { user_id: "forged-actor", tenant_id: "forged-tenant", ProductId: "browser-product" },
          rules: [{ id: "forged-allow", effect: "allow", action: "*" }],
          object_acl: [],
        }),
      },
    });
    const forgedClaimsBody = await forgedClaims.json();
    assert.equal(forgedClaims.status, 200);
    assert.equal(forgedClaimsBody.item.taskpane_loaded, true);
    assert.notEqual(forgedClaimsBody.tenant_id, "forged-tenant");

    const forgedTenant = await fetch(`${baseUrl}/api/outlook/connection?tenant_id=forged-tenant`, {
      headers: sessionHeaders,
    });
    const forgedTenantBody = await forgedTenant.json();
    assert.equal(forgedTenant.status, 403);
    assert.notEqual(forgedTenantBody.outcome, "complete");

    const bootstrap = await json(`/api/outlook/bootstrap?tenant_id=${TENANT}`);
    assert.equal(bootstrap.item.taskpane_loaded, true);
    assert.equal(bootstrap.item.external_receipt_boundary.entra_admin_consent_receipt_present, false);

    for (const [query, expectedMatterIds] of [
      ["OUTLOOK/LIT/CIV", [MATTER]],
      ["Add-in filing test", [MATTER]],
      ["오피스 애드인 테스트 고객", [MATTER, OTHER_MATTER]],
    ]) {
      const matters = await json(
        `/api/outlook/matters?tenant_id=${TENANT}&q=${encodeURIComponent(query)}`,
      );
      assert.deepEqual(
        matters.items.map((entry) => entry.matter_id),
        expectedMatterIds,
      );
    }

    const firstMatterPage = await json(
      `/api/outlook/matters?q=${encodeURIComponent("오피스")}&limit=1`,
    );
    assert.deepEqual(firstMatterPage.items.map((entry) => entry.matter_id), [MATTER]);
    assert.deepEqual(Object.keys(firstMatterPage.items[0]).sort(), [
      "client_display_name",
      "matter_code",
      "matter_id",
      "status",
      "title",
    ]);
    assert.doesNotMatch(
      JSON.stringify(firstMatterPage),
      /(?:omitted_count|denied_count|body|bytes|content|storage_pointer)/u,
    );
    assert.equal(firstMatterPage.page_info.has_more, true);
    assert.ok(firstMatterPage.page_info.next_cursor);
    const secondMatterPage = await json(
      `/api/outlook/matters?q=${encodeURIComponent("오피스")}&limit=1&cursor=${encodeURIComponent(firstMatterPage.page_info.next_cursor)}`,
    );
    assert.deepEqual(secondMatterPage.items.map((entry) => entry.matter_id), [OTHER_MATTER]);
    assert.deepEqual(secondMatterPage.page_info, {
      limit: 1,
      has_more: false,
      next_cursor: null,
    });

    const originalMatterTitle = baseMatterRepository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: MATTER,
    }).title;
    baseMatterRepository.update(
      { tenant_id: TENANT, model_type: "Matter", matter_id: MATTER },
      { title: "표시 이름만 바뀐 Matter" },
    );
    const exactMatterAfterDisplayChange = await json(
      `/api/outlook/matters?matter_id=${encodeURIComponent(MATTER)}&limit=1`,
    );
    assert.deepEqual(exactMatterAfterDisplayChange.items.map((entry) => entry.matter_id), [MATTER]);
    assert.equal(exactMatterAfterDisplayChange.items[0].title, "표시 이름만 바뀐 Matter");
    baseMatterRepository.update(
      { tenant_id: TENANT, model_type: "Matter", matter_id: MATTER },
      { title: originalMatterTitle },
    );

    const canonicalIdentity = await json("/api/outlook/messages/identity", {
      method: "POST",
      body: JSON.stringify({
        matter_id: MATTER,
        rest_message_id: "graph-outlook-addin-test-001",
        internet_message_id: "<outlook-addin-test-001@amic.law>",
        conversation_id: "conversation-outlook-addin-test",
      }),
    });
    assert.deepEqual(canonicalIdentity.item, {
      rest_message_id: "graph-outlook-addin-test-001",
      canonical_graph_message_id: "immutable:graph-outlook-addin-test-001",
      internet_message_id: "<outlook-addin-test-001@amic.law>",
      conversation_id: "conversation-outlook-addin-test",
      source_id_type: "restId",
      target_id_type: "restImmutableEntryId",
      raw_mime_included: false,
      credential_material_included: false,
      production_ready_claim: false,
    });

    await t.test("missing or mismatched canonical Graph identity fails closed before filing", async () => {
      const missingCanonical = emailFixture();
      delete missingCanonical.canonical_graph_message_id;
      const beforeMissingProviderCalls = providerCallCount;
      const missing = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ matter_id: MATTER, email: missingCanonical }),
      });
      const missingBody = await missing.json();
      assert.equal(missing.status, 400, JSON.stringify(missingBody));
      assert.deepEqual(missingBody.safe_error_codes, ["OUTLOOK_ADDIN_VALIDATION_ERROR"]);
      assert.equal(providerCallCount, beforeMissingProviderCalls);

      const beforeMismatchStorageWrites = storageWriteCount;
      const mismatch = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          matter_id: MATTER,
          email: emailFixture({
            canonical_graph_message_id: "immutable:wrong-current-item",
          }),
        }),
      });
      const mismatchBody = await mismatch.json();
      assert.equal(mismatch.status, 409, JSON.stringify(mismatchBody));
      assert.deepEqual(mismatchBody.safe_error_codes, [
        "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT",
      ]);
      assert.equal(storageWriteCount, beforeMismatchStorageWrites);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length, 0);
    });

    await t.test("Matter state is revalidated after provider read and before the first filing write", async () => {
      closeMatterDuringProviderRead = true;
      const beforeStorageWrites = storageWriteCount;
      const response = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          matter_id: MATTER,
          email: emailFixture({
            graph_message_id: "graph-close-during-provider",
            internet_message_id: "<outlook-addin-test-001@amic.law>",
          }),
        }),
      });
      const responseBody = await response.json();
      assert.equal(response.status, 409, JSON.stringify(responseBody));
      assert.deepEqual(responseBody.safe_error_codes, ["OUTLOOK_ADDIN_MATTER_INACTIVE"]);
      assert.equal(storageWriteCount, beforeStorageWrites);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length, 0);
      baseMatterRepository.update(
        { tenant_id: TENANT, model_type: "Matter", matter_id: MATTER },
        { status: "open" },
      );
    });

    const foreignTenant = await fetch(
      `${baseUrl}/api/outlook/matters?tenant_id=tenant_foreign&q=OUTLOOK`,
      { headers: sessionHeaders },
    );
    const foreignTenantBody = await foreignTenant.json();
    assert.equal(foreignTenant.status, 403);
    assert.deepEqual(foreignTenantBody.safe_error_codes, ["OUTLOOK_ADDIN_PERMISSION_DENIED"]);
    assert.equal(foreignTenantBody.item, null);
    assert.equal("omitted_count" in foreignTenantBody, false);

    const filteredMatters = await jsonFetch(
      baseUrl,
      `/api/outlook/matters?q=${encodeURIComponent("오피스")}&limit=9999`,
      {},
      { authorization: "Bearer outlook-search-filter-session" },
    );
    assert.deepEqual(filteredMatters.items.map((entry) => entry.matter_id), [MATTER]);
    assert.equal(filteredMatters.page_info.limit <= 50, true);
    assert.equal("omitted_count" in filteredMatters, false);
    assert.equal("denied_count" in filteredMatters, false);
    assert.equal(
      JSON.stringify(filteredMatters).includes(OTHER_MATTER),
      false,
    );
    for (const entry of filteredMatters.items) {
      for (const forbidden of ["bytes", "content", "document_bytes", "storage_pointer", "storage_pointer_ref"]) {
        assert.equal(forbidden in entry, false);
      }
    }

    const oversizedQuery = await fetch(
      `${baseUrl}/api/outlook/matters?q=${"x".repeat(121)}`,
      { headers: sessionHeaders },
    );
    const oversizedQueryBody = await oversizedQuery.json();
    assert.equal(oversizedQuery.status, 400);
    assert.deepEqual(oversizedQueryBody.safe_error_codes, ["OUTLOOK_ADDIN_VALIDATION_ERROR"]);
    assert.equal(JSON.stringify(oversizedQueryBody).includes("x".repeat(121)), false);

    await t.test("Matter timeline uses a bounded stable cursor without denied counts", async () => {
      // Given
      for (const [eventId, occurredAt, requiredScope] of [
        ["timeline-visible-005", "2026-08-08T05:00:00.000Z", null],
        ["timeline-visible-004", "2026-08-08T04:00:00.000Z", null],
        ["timeline-visible-003", "2026-08-08T03:00:00.000Z", null],
        ["timeline-visible-002", "2026-08-08T02:00:00.000Z", null],
        ["timeline-visible-001", "2026-08-08T01:00:00.000Z", null],
        ["timeline-denied-999", "2026-08-08T09:00:00.000Z", "matter:secret"],
      ]) {
        matterRepository.upsert({
          model_type: "MatterTimelineEvent",
          resource_id: eventId,
          event_id: eventId,
          tenant_id: TENANT,
          matter_id: OTHER_MATTER,
          occurred_at: occurredAt,
          type: "matter.test",
          title: `${eventId}\n한 줄`,
          source_ref: `source:${eventId}`,
          ...(requiredScope ? { required_scope: requiredScope } : {}),
        });
      }
      const first = await json(`/api/outlook/matters/${OTHER_MATTER}/timeline?limit=2`);
      matterRepository.upsert({
        model_type: "MatterTimelineEvent",
        resource_id: "timeline-visible-006",
        event_id: "timeline-visible-006",
        tenant_id: TENANT,
        matter_id: OTHER_MATTER,
        occurred_at: "2026-08-08T06:00:00.000Z",
        type: "matter.test",
        title: "inserted after page one",
        source_ref: "source:timeline-visible-006",
      });

      // When
      const second = await json(
        `/api/outlook/matters/${OTHER_MATTER}/timeline?limit=2&cursor=${encodeURIComponent(first.item.page_info.next_cursor)}`,
      );

      // Then
      assert.deepEqual(first.item.visible_entries.map(({ event_id }) => event_id), [
        "timeline-visible-005",
        "timeline-visible-004",
      ]);
      assert.deepEqual(second.item.visible_entries.map(({ event_id }) => event_id), [
        "timeline-visible-003",
        "timeline-visible-002",
      ]);
      assert.equal(first.item.visible_entries[0].title, "timeline-visible-005 한 줄");
      assert.equal(first.item.omitted_entry_count, null);
      assert.equal("denied_count" in first.item, false);
      assert.equal("total_count" in first.item, false);
      assert.deepEqual(second.item.page_info, {
        limit: 2,
        has_more: true,
        next_cursor: second.item.page_info.next_cursor,
      });
      const tampered = await fetch(
        `${baseUrl}/api/outlook/matters/${OTHER_MATTER}/timeline?limit=2&cursor=${encodeURIComponent(`${first.item.page_info.next_cursor}A`)}`,
        { headers: sessionHeaders },
      );
      assert.equal(tampered.status, 400);
    });

    await t.test("provider message identity mismatch fails before thread or object storage", async () => {
      const identityMismatch = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({
            graph_message_id: "graph-identity-mismatch",
            conversation_id: "conversation-identity-mismatch",
          }),
        }),
      });
      const identityMismatchBody = await identityMismatch.json();
      assert.equal(identityMismatch.status, 409);
      assert.deepEqual(identityMismatchBody.safe_error_codes, [
        "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
      ]);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length, 0);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
      assert.equal(matterRepository.list({ tenant_id: TENANT, model_type: "MatterTimelineEvent", matter_id: MATTER }).length, 0);
      assert.equal(storageWriteCount, 0);
    });

    await t.test("partial duplicate-name attachment list fails, while complete ordered duplicates reconcile", async () => {
      const beforeThreadCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length;
      const beforeDocumentCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length;
      const beforeStorageWrites = storageWriteCount;
      const ambiguousAttachment = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({
            graph_message_id: "graph-ambiguous-attachments",
            conversation_id: "conversation-ambiguous-attachments",
          }),
        }),
      });
      const ambiguousAttachmentBody = await ambiguousAttachment.json();
      assert.equal(ambiguousAttachment.status, 409);
      assert.deepEqual(ambiguousAttachmentBody.safe_error_codes, [
        "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
      ]);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length, beforeThreadCount);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, beforeDocumentCount);
      assert.equal(storageWriteCount, beforeStorageWrites);

      const source = emailFixture().attachments[0];
      const complete = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({
            graph_message_id: "graph-ambiguous-attachments",
            conversation_id: "conversation-ambiguous-attachments",
            attachments: [
              { ...source, attachment_id: "att-duplicate-1" },
              { ...source, attachment_id: "att-duplicate-2" },
            ],
          }),
        }),
      });
      assert.equal(complete.outcome, "created");
      assert.equal(complete.email_thread.attachment_metadata.length, 2);
      assert.deepEqual(
        complete.email_thread.attachment_metadata.map((item) => item.source_provenance.occurrence),
        [0, 1],
      );
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
    });

    await t.test("Office attachment size overhead and adjacent encoded filename words reconcile to MIME bytes", async () => {
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const canonicalName = "client-contract.docx";
      const filingEmail = (attachmentOverrides = {}) => emailFixture({
        graph_message_id: "graph-office-attachment-metadata",
        internet_message_id: "<outlook-office-attachment-metadata@amic.law>",
        conversation_id: "conversation-office-attachment-metadata",
        attachments: [{
          attachment_id: "att-office-metadata",
          name: canonicalName,
          content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: ATTACHMENT_BYTES.byteLength + 378,
          confidentiality: "confidential",
          ...attachmentOverrides,
        }],
      });
      const assertProvenanceRejected = async (attachmentOverrides) => {
        const response = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({
            tenant_id: TENANT,
            matter_id: MATTER,
            email: filingEmail(attachmentOverrides),
          }),
        });
        const responseBody = await response.json();
        assert.equal(response.status, 409);
        assert.deepEqual(responseBody.safe_error_codes, [
          "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
        ]);
        assert.equal(storageWriteCount, beforeStorageWrites);
      };

      await assertProvenanceRejected({ name: "different-contract.docx" });
      await assertProvenanceRejected({ sha256: "0".repeat(64) });

      const filed = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: filingEmail(),
        }),
      });

      assert.equal(filed.outcome, "created");
      assert.equal(filed.email_thread.attachment_metadata.length, 1);
      assert.equal(filed.email_thread.attachment_metadata[0].name, canonicalName);
      assert.equal(filed.email_thread.attachment_metadata[0].size, ATTACHMENT_BYTES.byteLength);
      assert.equal(
        filed.email_thread.attachment_metadata[0].sha256,
        createHash("sha256").update(ATTACHMENT_BYTES).digest("hex"),
      );
      assert.equal(providerCallCount, beforeProviderCalls + 3);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
    });

    await t.test("provider failure creates no thread, document, or timeline", async () => {
      const email = emailFixture({
        graph_message_id: "graph-provider-failure",
        internet_message_id: "<outlook-provider-failure@amic.law>",
        conversation_id: "conversation-provider-failure",
        attachments: [],
      });
      const emailThreadId = expectedEmailThreadId(email);
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const beforeDocumentCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length;
      const response = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const responseBody = await response.json();
      assert.equal(response.status, 502);
      assert.deepEqual(responseBody.safe_error_codes, ["M365_GRAPH_MAIL_PROVIDER_ERROR"]);
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites);
      assert.equal(dmsRepository.get({ tenant_id: TENANT, model_type: "DmsEmailThread", email_thread_id: emailThreadId }), undefined);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, beforeDocumentCount);
      assert.equal(matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).some((event) => event.source_object_id === emailThreadId), false);
    });

    await t.test("Graph MIME over the 3 MiB filing boundary fails before durable mutation", async () => {
      const email = emailFixture({
        graph_message_id: "graph-oversized-mime",
        internet_message_id: "<outlook-oversized-mime@amic.law>",
        conversation_id: "conversation-oversized-mime",
        attachments: [],
      });
      const emailThreadId = expectedEmailThreadId(email);
      const beforeStorageWrites = storageWriteCount;
      const response = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const responseBody = await response.json();
      assert.equal(response.status, 413);
      assert.deepEqual(responseBody.safe_error_codes, [
        "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
      ]);
      assert.equal(storageWriteCount, beforeStorageWrites);
      assert.equal(dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailThread",
        email_thread_id: emailThreadId,
      }), undefined);
    });

    await t.test("raw attachment boundary is truthfully capped at 2 MiB inside the 3 MiB MIME envelope", async () => {
      const filingEmail = (suffix, bytes) => emailFixture({
        graph_message_id: `graph-attachment-${suffix}`,
        internet_message_id: `<outlook-attachment-${suffix}@amic.law>`,
        conversation_id: `conversation-attachment-${suffix}`,
        attachments: [{
          attachment_id: "att-contract",
          name: "contract.txt",
          content_type: "text/plain",
          size: bytes.byteLength,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          confidentiality: "confidential",
        }],
      });
      const atLimitBytes = Buffer.alloc(MAX_ATTACHMENT_BYTES, 0x61);
      const atLimit = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: filingEmail("at-limit", atLimitBytes),
        }),
      });
      assert.equal(atLimit.outcome, "created");
      assert.equal(atLimit.email_thread.attachment_metadata[0].size, MAX_ATTACHMENT_BYTES);

      const overLimitBytes = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1, 0x62);
      const overLimitEmail = filingEmail("over-limit", overLimitBytes);
      const beforeStorageWrites = storageWriteCount;
      const rejected = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: overLimitEmail }),
      });
      const rejectedBody = await rejected.json();
      assert.equal(rejected.status, 413);
      assert.deepEqual(rejectedBody.safe_error_codes, [
        "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
      ]);
      assert.equal(storageWriteCount, beforeStorageWrites);
      assert.equal(dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailThread",
        email_thread_id: expectedEmailThreadId(overLimitEmail),
      }), undefined);
    });

    await t.test("upload failure leaves a linked pending thread and retry finalizes it", async () => {
      const email = emailFixture({
        graph_message_id: "graph-upload-failure",
        internet_message_id: "<outlook-upload-failure@amic.law>",
        conversation_id: "conversation-upload-failure",
        attachments: [],
      });
      const emailThreadId = expectedEmailThreadId(email);
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const beforeDocumentCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length;
      failNextStorageWrite = true;
      const response = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const responseBody = await response.json();
      assert.equal(response.status, 400);
      assert.deepEqual(responseBody.safe_error_codes, ["M365_CONNECTION_VALIDATION_ERROR"]);
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites);
      const pending = dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailThread",
        email_thread_id: emailThreadId,
      });
      assert.equal(pending.status, "draft");
      assert.equal(pending.filed_document_ids.length, 1);
      const pendingMimeSha256 = createHash("sha256").update(messageMime({
        hasAttachment: false,
        internetMessageId: email.internet_message_id,
      })).digest("hex");
      assert.equal(
        dmsRepository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key:
            `outlook-email-file:${emailThreadId}:${pendingMimeSha256}:dms-pending`,
        })?.response?.status,
        "draft",
      );
      assert.equal(
        dmsRepository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key: `outlook-matter-folders:${TENANT}:${MATTER}:v1`,
        })?.operation,
        "outlook_matter_folders_ensure",
      );
      assert.equal(
        dmsRepository.listAudit({ tenant_id: TENANT, object_id: emailThreadId })
          .some(({ action }) => action === "dms.email.thread.file.pending"),
        true,
      );
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, beforeDocumentCount);
      assert.equal(matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).some((event) => event.source_object_id === emailThreadId), false);

      const retried = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      assert.equal(retried.outcome, "created");
      assert.equal(retried.email_thread.status, "active");
      assert.equal(retried.email_thread.email_thread_id, pending.email_thread_id);
      assert.deepEqual(retried.email_thread.filed_document_ids, pending.filed_document_ids);
      assert.equal(providerCallCount, beforeProviderCalls + 2);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
    });

    await t.test("attachment-free filing stores one immutable original MIME and replay revalidates Graph without storage I/O", async () => {
      const email = emailFixture({
        graph_message_id: "graph-attachment-free",
        internet_message_id: "<outlook-attachment-free@amic.law>",
        conversation_id: "conversation-attachment-free",
        attachments: [],
      });
      const mimeBytes = messageMime({
        hasAttachment: false,
        internetMessageId: email.internet_message_id,
      });
      const mimeSha256 = createHash("sha256").update(mimeBytes).digest("hex");
      const emailThreadId = expectedEmailThreadId(email);
      const documentId = `doc:${emailThreadId}:original-mime:${mimeSha256}`;
      const versionId = `version:${documentId}:1`;
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const filedResponse = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const filed = await filedResponse.json();
      assert.equal(filedResponse.status, 201, JSON.stringify(filed));
      assert.equal(filed.outcome, "created");
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      assert.deepEqual(filed.email_thread.filed_document_ids, [documentId]);
      assert.deepEqual(filed.timeline_event.safe_summary.filed_document_ids, [documentId]);
      assert.equal(filed.timeline_event.safe_summary.original_mime_document_id, documentId);
      const responseJson = JSON.stringify(filed);
      assert.equal(responseJson.includes(mimeBytes.toString("base64")), false);
      assert.equal(responseJson.includes("outlook-addin-test-access-token-never-return"), false);
      assert.equal(responseJson.includes("outlook-addin-test-refresh-token-never-return"), false);
      assert.doesNotMatch(responseJson, /"(?:mime_bytes|content_base64|storage_pointer_ref|access_token|refresh_token)":/u);

      const document = dmsRepository.get({ tenant_id: TENANT, model_type: "DmsDocument", document_id: documentId });
      const version = dmsRepository.get({ tenant_id: TENANT, model_type: "DmsDocumentVersion", version_id: versionId });
      const fileObject = dmsRepository.get({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: version.file_object_id });
      const stored = storage.getObject({ tenant_id: TENANT, object_id: fileObject.vault_object_id });
      assert.equal(document.folder_id, `folder:${MATTER}:00_Email`);
      assert.equal(document.mime_type, "message/rfc822");
      assert.equal(document.latest_sha256, mimeSha256);
      assert.equal(document.source_policy, "source_required");
      assert.equal(document.source_email_thread_id, emailThreadId);
      assert.equal(version.sha256, mimeSha256);
      assert.equal(fileObject.sha256, mimeSha256);
      assert.equal(fileObject.byte_size, mimeBytes.byteLength);
      assert.equal(fileObject.mime_type, "message/rfc822");
      assert.equal(stored.mime_type, "message/rfc822");
      assert.equal(stored.byte_size, mimeBytes.byteLength);
      assert.equal(stored.sha256, mimeSha256);
      assert.deepEqual(stored.bytes, mimeBytes);

      const beforeReplayProviderCalls = providerCallCount;
      const beforeReplayStorageWrites = storageWriteCount;
      const beforeReplayDocumentCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length;
      const filingReceiptKey = `outlook-email-file:${emailThreadId}:${mimeSha256}:dms`;
      const beforeReplayFilingReceipt = dmsRepository.getIdempotency({
        tenant_id: TENANT,
        idempotency_key: filingReceiptKey,
      });
      const beforeReplayDmsSnapshot = JSON.stringify(dmsRepository.snapshot());
      const replayResponse = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const replay = await replayResponse.json();
      assert.equal(replayResponse.status, 200, JSON.stringify(replay));
      assert.equal(replay.outcome, "idempotent_replay");
      assert.equal(replay.idempotent_replay, true);
      const replayMimeSha256 = replay.email_thread.filed_document_ids[0].split(":").at(-1);
      assert.equal(replayMimeSha256, mimeSha256);
      const afterReplayFilingReceipt = dmsRepository.getIdempotency({
        tenant_id: TENANT,
        idempotency_key: filingReceiptKey,
      });
      assert.equal(afterReplayFilingReceipt?.response?.outcome, "created");
      assert.deepEqual(afterReplayFilingReceipt, beforeReplayFilingReceipt);
      const afterReplayDmsSnapshot = JSON.stringify(dmsRepository.snapshot());
      assert.equal(afterReplayDmsSnapshot, beforeReplayDmsSnapshot);
      assert.equal(providerCallCount, beforeReplayProviderCalls + 1);
      assert.equal(storageWriteCount, beforeReplayStorageWrites);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, beforeReplayDocumentCount);
    });

    await t.test("audit failure keeps MIME linked to a pending thread and retry finalizes without duplicate upload", async () => {
      const email = emailFixture({
        graph_message_id: "graph-partial-retry",
        internet_message_id: "<outlook-partial-retry@amic.law>",
        conversation_id: "conversation-partial-retry",
        attachments: [],
      });
      const emailThreadId = expectedEmailThreadId(email);
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      failNextFilingAudit = true;
      const interrupted = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      assert.equal(interrupted.status, 400);
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      const pending = dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailThread",
        email_thread_id: emailThreadId,
      });
      assert.equal(pending.status, "draft");
      assert.equal(pending.filed_document_ids.length, 1);
      assert.equal(matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).some((event) => event.source_object_id === emailThreadId), false);
      const partialDocuments = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" })
        .filter((document) => document.source_email_thread_id === emailThreadId);
      assert.equal(partialDocuments.length, 1);
      assert.deepEqual(pending.filed_document_ids, [partialDocuments[0].document_id]);
      assert.deepEqual(
        dmsRepository.listAudit({ tenant_id: TENANT, object_id: emailThreadId })
          .map(({ action }) => action),
        ["dms.email.thread.file.pending"],
      );

      const pendingAttachment = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email_thread_id: emailThreadId,
          selected_attachment_ids: ["att-contract"],
          attachments: [attachmentPayload()],
        }),
      });
      assert.equal(pendingAttachment.status, 404);
      const pendingFollowup = await fetch(`${baseUrl}/api/outlook/followups`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          source_email_thread_id: emailThreadId,
          kind: "task",
          title: "pending thread must not authorize this",
        }),
      });
      assert.equal(pendingFollowup.status, 404);

      const retried = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      assert.equal(retried.outcome, "created");
      assert.equal(retried.email_thread.status, "active");
      assert.equal(providerCallCount, beforeProviderCalls + 2);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      assert.deepEqual(retried.email_thread.filed_document_ids, [partialDocuments[0].document_id]);
      assert.deepEqual(
        dmsRepository.listAudit({ tenant_id: TENANT, object_id: emailThreadId })
          .map(({ action }) => action)
          .sort(),
        ["dms.email.thread.file", "dms.email.thread.file.pending"],
      );
    });

    let fileBody;
    await t.test("initial filing binds canonical immutable identity and complete Graph MIME provenance", async () => {
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      fileBody = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
      });
      assert.equal(fileBody.outcome, "created");
      assert.equal(
        fileBody.email_thread.field_contract_count,
        fileBody.email_object_field_contract.length,
      );
      assert.equal(fileBody.email_thread.raw_body_included, false);
      assert.equal(fileBody.email_thread.canonical_graph_message_id, "immutable:graph-outlook-addin-test-001");
      assert.equal(Object.hasOwn(fileBody.email_thread, "graph_message_id"), false);
      assert.deepEqual(fileBody.source_identity, {
        canonical_graph_message_id: "immutable:graph-outlook-addin-test-001",
        rest_message_id: "graph-outlook-addin-test-001",
        internet_message_id: "<outlook-addin-test-001@amic.law>",
        conversation_id: "conversation-outlook-addin-test",
        item_key: [
          "graph-outlook-addin-test-001",
          "<outlook-addin-test-001@amic.law>",
          "conversation-outlook-addin-test",
        ].join("\u001f"),
      });
      for (const [field, value] of Object.entries(fileBody.source_identity)) {
        assert.equal(fileBody.email_thread[field], value);
      }
      assert.equal(
        JSON.stringify(fileBody).includes('"graph_message_id":"graph-outlook-addin-test-001"'),
        false,
      );
      assert.equal(fileBody.email_thread.attachment_metadata[0].size, ATTACHMENT_BYTES.byteLength);
      assert.equal(
        fileBody.email_thread.attachment_metadata[0].sha256,
        createHash("sha256").update(ATTACHMENT_BYTES).digest("hex"),
      );
      assert.equal(
        fileBody.email_thread.attachment_metadata[0].source_provenance.authority,
        "microsoft_graph_mime",
      );
      assert.equal(fileBody.email_thread.attachment_metadata[0].source_provenance.raw_bytes_included, false);
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      assert.equal(fileBody.email_thread.filed_document_ids.length, 1);
      assert.equal(fileBody.matter_timeline.visible_entries.some((entry) => entry.type === "outlook.email.filed"), true);
      const mimeSha256 = fileBody.email_thread.filed_document_ids[0].split(":").at(-1);
      const filingKey = `outlook-email-file:${fileBody.email_thread.email_thread_id}:${mimeSha256}`;
      assert.equal(
        dmsRepository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key: `${filingKey}:dms`,
        })?.response?.email_thread_id,
        fileBody.email_thread.email_thread_id,
      );
      assert.equal(
        dmsRepository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key: `${filingKey}:dms`,
        })?.response?.outcome,
        "created",
      );
      const timelineEvent = matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).find((entry) => entry.source_object_id === fileBody.email_thread.email_thread_id);
      assert.equal(
        matterRepository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key: `${filingKey}:matter:${MATTER}`,
        })?.response?.timeline_event_id,
        timelineEvent.event_id,
      );
      assert.equal(
        matterRepository.listAudit({
          tenant_id: TENANT,
          object_id: timelineEvent.event_id,
        }).length,
        1,
      );
    });

    await t.test("existing matching timeline event backfills audit and idempotency on retry", async () => {
      const email = emailFixture({ graph_message_id: "graph-legacy-timeline-recovery" });
      const emailThreadId = expectedEmailThreadId(email);
      const eventId = `outlook.email.filed:${TENANT}:${MATTER}:${emailThreadId}`;
      const mimeSha256 = createHash("sha256").update(messageMime({
        internetMessageId: email.internet_message_id,
      })).digest("hex");
      const documentId = `doc:${emailThreadId}:original-mime:${mimeSha256}`;
      matterRepository.create({
        model_type: "MatterTimelineEvent",
        resource_id: eventId,
        event_id: eventId,
        tenant_id: TENANT,
        matter_id: MATTER,
        occurred_at: "2026-07-03T01:30:00.000Z",
        type: "outlook.email.filed",
        title: "Outlook filing regression",
        source_ref: emailThreadId,
        source_module: "outlook-addin",
        source_object_id: emailThreadId,
        safe_summary: {
          graph_message_id: email.canonical_graph_message_id,
          canonical_graph_message_id: email.canonical_graph_message_id,
          rest_message_id: email.rest_message_id,
          internet_message_id: email.internet_message_id,
          conversation_id: email.conversation_id,
          item_key: email.item_key,
          filed_document_ids: [documentId],
          original_mime_document_id: documentId,
          attachment_count: 1,
          attachment_source_authority: "microsoft_graph_mime",
          raw_body_included: false,
          raw_mime_included: false,
          storage_pointer_ref_included: false,
        },
        raw_body_included: false,
        raw_provider_payload_included: false,
      });

      const recovered = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const filingKey = `outlook-email-file:${emailThreadId}:${mimeSha256}:matter:${MATTER}`;
      assert.equal(matterRepository.getIdempotency({
        tenant_id: TENANT,
        idempotency_key: filingKey,
      })?.response?.timeline_event_id, eventId);
      assert.equal(matterRepository.listAudit({ tenant_id: TENANT, object_id: eventId }).length, 1);
    });

    await t.test("caller participant spoof cannot alter persisted canonical Graph participants", async () => {
      const spoofedEmail = emailFixture({
        graph_message_id: "graph-participant-spoof",
        internet_message_id: "<outlook-participant-spoof@amic.law>",
        conversation_id: "conversation-participant-spoof",
        from: { name: "Caller Spoof From", email: "caller-spoof-from@example.net" },
        to: [{ name: "Caller Spoof To", email: "caller-spoof-to@example.net" }],
        cc: [{ name: "Caller Spoof Cc", email: "caller-spoof-cc@example.net" }],
        bcc: [{ name: "Caller Spoof Bcc", email: "caller-spoof-bcc@example.net" }],
        attachments: [],
      });
      const filed = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: spoofedEmail }),
      });
      assert.equal(filed.outcome, "created");
      assert.deepEqual(filed.email_thread.from, {
        display_name: "Canonical Author",
        address_ref: "canonical-author@example.com",
        external: true,
      });
      assert.deepEqual(filed.email_thread.to, [{
        display_name: "Canonical To",
        address_ref: "canonical-to@amic.kr",
        external: false,
      }]);
      assert.deepEqual(filed.email_thread.cc, [{
        display_name: "Canonical Cc",
        address_ref: "canonical-cc@example.com",
        external: true,
      }]);
      assert.deepEqual(filed.email_thread.bcc, [{
        display_name: "Canonical Bcc",
        address_ref: "canonical-bcc@example.com",
        external: true,
      }]);
      assert.equal(JSON.stringify(filed.email_thread).includes("caller-spoof-"), false);

      const persisted = dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailThread",
        email_thread_id: expectedEmailThreadId(spoofedEmail),
      });
      assert.deepEqual(persisted.from, filed.email_thread.from);
      assert.deepEqual(persisted.to, filed.email_thread.to);
      assert.deepEqual(persisted.cc, filed.email_thread.cc);
      assert.deepEqual(persisted.bcc, filed.email_thread.bcc);
      assert.equal(JSON.stringify(persisted).includes("caller-spoof-"), false);
    });

    await t.test("same conversation messages receive distinct server-derived filing identities", async () => {
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const beforeThreadCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length;
      const secondMessage = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({
            graph_message_id: "graph-outlook-addin-test-002",
            internet_message_id: "<outlook-addin-test-002@amic.law>",
          }),
        }),
      });
      assert.equal(secondMessage.outcome, "created");
      assert.notEqual(
        secondMessage.email_thread.email_thread_id,
        fileBody.email_thread.email_thread_id,
      );
      assert.equal(
        dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length,
        beforeThreadCount + 1,
      );
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
    });

    await t.test("Graph immutable message IDs remain case-sensitive canonical identities", async () => {
      const lower = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({ graph_message_id: "graph-case-sensitive" }),
        }),
      });
      const upper = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({ graph_message_id: "GRAPH-case-sensitive" }),
        }),
      });
      assert.equal(lower.email_thread.canonical_graph_message_id, "immutable:graph-case-sensitive");
      assert.equal(upper.email_thread.canonical_graph_message_id, "immutable:GRAPH-case-sensitive");
      assert.notEqual(lower.email_thread.email_thread_id, upper.email_thread.email_thread_id);
    });

    await t.test("a different REST alias for one canonical immutable ID is rejected exactly", async () => {
      const aliasEmail = (graphMessageId) => emailFixture({
        graph_message_id: graphMessageId,
        canonical_graph_message_id: "immutable:graph-alias-target",
        internet_message_id: "<outlook-alias-target@amic.law>",
        conversation_id: "conversation-alias-target",
      });
      const beforeStorageWrites = storageWriteCount;
      const first = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: aliasEmail("graph-alias-a") }),
      });
      const replay = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: aliasEmail("graph-alias-b") }),
      });
      const replayBody = await replay.json();
      assert.equal(first.email_thread.rest_message_id, "graph-alias-a");
      assert.equal(replay.status, 409);
      assert.deepEqual(replayBody.safe_error_codes, ["OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT"]);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);

      const crossMatter = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: OTHER_MATTER, email: aliasEmail("graph-alias-b") }),
      });
      const crossMatterBody = await crossMatter.json();
      assert.equal(crossMatter.status, 409);
      assert.deepEqual(crossMatterBody.safe_error_codes, ["OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT"]);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
    });

    await t.test("same message cannot replay into another Matter or append its timeline", async () => {
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const beforeThreadCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length;
      const beforeOtherMatterTimelineCount = matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: OTHER_MATTER,
      }).length;
      const crossMatterReplay = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: OTHER_MATTER,
          email: {
            ...emailFixture(),
            email_thread_id: "caller-controlled-cross-matter-id",
          },
        }),
      });
      const crossMatterReplayBody = await crossMatterReplay.json();
      assert.equal(crossMatterReplay.status, 409);
      assert.deepEqual(crossMatterReplayBody.safe_error_codes, [
        "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT",
      ]);
      assert.equal(
        dmsRepository.list({ tenant_id: TENANT, model_type: "DmsEmailThread" }).length,
        beforeThreadCount,
      );
      assert.equal(
        matterRepository.list({
          tenant_id: TENANT,
          model_type: "MatterTimelineEvent",
          matter_id: OTHER_MATTER,
        }).length,
        beforeOtherMatterTimelineCount,
      );
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites);
    });

    const missingSourceIdentity = async (requiredIdentity) => {
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const incompleteEmail = { ...emailFixture() };
      delete incompleteEmail[requiredIdentity];
      const rejected = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: incompleteEmail }),
      });
      const rejectedBody = await rejected.json();
      assert.equal(rejected.status, 400);
      assert.deepEqual(rejectedBody.safe_error_codes, ["OUTLOOK_ADDIN_VALIDATION_ERROR"]);
      assert.equal(providerCallCount, beforeProviderCalls);
      assert.equal(storageWriteCount, beforeStorageWrites);
    };

    await t.test("missing REST source ID is rejected before filing mutation", async () => {
      await missingSourceIdentity("rest_message_id");
    });

    await t.test("missing canonical Graph source ID is rejected before filing mutation", async () => {
      await missingSourceIdentity("canonical_graph_message_id");
    });

    await t.test("missing item_key is rejected before filing mutation", async () => {
      await missingSourceIdentity("item_key");
    });

    await t.test("missing Internet Message-ID is rejected before filing mutation", async () => {
      await missingSourceIdentity("internet_message_id");
    });

    await t.test("missing conversation ID is rejected before filing mutation", async () => {
      await missingSourceIdentity("conversation_id");
    });

    await t.test("extra legacy graph_message_id alias is rejected before Graph preflight", async () => {
      const beforeProviderCalls = providerCallCount;
      const exact = emailFixture();
      const rejected = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: { ...exact, graph_message_id: exact.rest_message_id },
        }),
      });
      assert.equal(rejected.status, 400);
      assert.deepEqual((await rejected.json()).safe_error_codes, [
        "OUTLOOK_ADDIN_VALIDATION_ERROR",
      ]);
      assert.equal(providerCallCount, beforeProviderCalls);
    });

    const mismatchedSourceIdentity = async (
      overrides,
      expectedCode = "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
    ) => {
      const rejected = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture(overrides),
        }),
      });
      const rejectedBody = await rejected.json();
      assert.equal(rejected.status, 409);
      assert.deepEqual(rejectedBody.safe_error_codes, [expectedCode]);
    };

    await t.test("wrong canonical immutable ID is rejected after Graph preflight", async () => {
      await mismatchedSourceIdentity({
        canonical_graph_message_id: "immutable:wrong-canonical",
      }, "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT");
    });

    await t.test("case-only Internet Message-ID difference is rejected after Graph preflight", async () => {
      await mismatchedSourceIdentity({
        internet_message_id: "<OUTLOOK-ADDIN-TEST-001@amic.law>",
      });
    });

    await t.test("whitespace-only Internet Message-ID difference is rejected after Graph preflight", async () => {
      await mismatchedSourceIdentity({
        internet_message_id: "<outlook-addin-test-001 @amic.law>",
      });
    });

    await t.test("NFKC-only conversation ID difference is rejected after Graph preflight", async () => {
      await mismatchedSourceIdentity({
        conversation_id: "conversation-outlook-addin-tes\uff54",
      });
    });

    const beforeReplayProviderCalls = providerCallCount;
    const beforeReplayStorageWrites = storageWriteCount;
    const replayBody = await json("/api/outlook/email/file", {
      method: "POST",
      body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
    });
    assert.equal(replayBody.outcome, "idempotent_replay");
    assert.equal(replayBody.idempotent_replay, true);
    assert.equal(providerCallCount, beforeReplayProviderCalls + 1);
    assert.equal(storageWriteCount, beforeReplayStorageWrites);

    await t.test("attachment and follow-up writes reject missing or stale canonical Graph context", async () => {
      const beforeStorageWrites = storageWriteCount;
      for (const [path, body, expectedStatus, expectedCode] of [
        [
          "/api/outlook/attachments/save",
          {
            matter_id: MATTER,
            email_thread_id: fileBody.email_thread.email_thread_id,
            selected_attachment_ids: ["att-contract"],
            attachments: [attachmentPayload()],
          },
          400,
          "OUTLOOK_ADDIN_VALIDATION_ERROR",
        ],
        [
          "/api/outlook/attachments/save",
          {
            matter_id: MATTER,
            email_thread_id: fileBody.email_thread.email_thread_id,
            canonical_graph_message_id: "immutable:stale-attachment-item",
            selected_attachment_ids: ["att-contract"],
            attachments: [attachmentPayload()],
          },
          409,
          "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT",
        ],
        [
          "/api/outlook/followups",
          {
            matter_id: MATTER,
            kind: "task",
            title: "누락된 식별자 후속 조치",
            source_email_thread_id: fileBody.email_thread.email_thread_id,
          },
          400,
          "OUTLOOK_ADDIN_VALIDATION_ERROR",
        ],
        [
          "/api/outlook/followups",
          {
            matter_id: MATTER,
            kind: "task",
            title: "오래된 식별자 후속 조치",
            source_email_thread_id: fileBody.email_thread.email_thread_id,
            canonical_graph_message_id: "immutable:stale-followup-item",
          },
          409,
          "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT",
        ],
      ]) {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify(body),
        });
        const responseBody = await response.json();
        assert.equal(response.status, expectedStatus, `${path}: ${JSON.stringify(responseBody)}`);
        assert.deepEqual(responseBody.safe_error_codes, [expectedCode]);
      }
      assert.equal(storageWriteCount, beforeStorageWrites);
    });

    const alteredBytes = Buffer.from(ATTACHMENT_BYTES);
    alteredBytes[0] ^= 1;
    assert.equal(alteredBytes.byteLength, ATTACHMENT_BYTES.byteLength);
    const assertSourceBytesRejected = async (bytes) => {
      const beforeDocumentCount = dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length;
      const beforeStorageWrites = storageWriteCount;
      const rejected = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email_thread_id: fileBody.email_thread.email_thread_id,
          canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
          selected_attachment_ids: ["att-contract"],
          attachments: [{
            ...attachmentPayload(bytes),
            size: ATTACHMENT_BYTES.byteLength,
            sha256: createHash("sha256").update(ATTACHMENT_BYTES).digest("hex"),
          }],
        }),
      });
      const rejectedBody = await rejected.json();
      assert.equal(rejected.status, 409);
      assert.deepEqual(rejectedBody.safe_error_codes, [
        "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
      ]);
      assert.equal(dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, beforeDocumentCount);
      assert.equal(storageWriteCount, beforeStorageWrites);
    };
    await t.test("same ID name and type with altered bytes fails before upload", async () => {
      await assertSourceBytesRejected(alteredBytes);
    });
    await t.test("truncated bytes with spoofed caller length and hash fail before upload", async () => {
      await assertSourceBytesRejected(ATTACHMENT_BYTES.subarray(0, ATTACHMENT_BYTES.byteLength - 1));
    });

    let attachmentBody;
    await t.test("canonical attachment bytes save once with Graph-derived name and type", async () => {
      const beforeStorageWrites = storageWriteCount;
      attachmentBody = await json("/api/outlook/attachments/save", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email_thread_id: fileBody.email_thread.email_thread_id,
          canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
          selected_attachment_ids: ["att-contract"],
          attachments: [{
            ...attachmentPayload(),
            name: "forged-name.exe",
            content_type: "application/x-msdownload",
          }],
        }),
      });
      assert.equal(attachmentBody.outcome, "attachments_saved");
      assert.equal(attachmentBody.items.length, 1);
      assert.equal(attachmentBody.items[0].file_object.storage_pointer_ref_included, false);
      assert.equal(attachmentBody.items[0].storage_receipt.storage_pointer_ref_included, false);
      assert.doesNotMatch(JSON.stringify(attachmentBody), /"storage_pointer_ref":/u);
      assert.equal(attachmentBody.items[0].document.title, "contract.txt");
      assert.equal(attachmentBody.items[0].document.mime_type, "text/plain");
      assert.equal(attachmentBody.attachment_receipt.attachment_id, "att-contract");
      assert.equal(typeof attachmentBody.attachment_receipt.receipt_token, "string");
      assert.equal(typeof attachmentBody.attachment_receipt.receipt_ref, "string");
      assert.doesNotMatch(
        JSON.stringify(attachmentBody),
        /"source_(?:email_thread|attachment)_id":/u,
      );
      assert.deepEqual(attachmentBody.items[0].timeline_event.safe_summary, {
        email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
        rest_message_id: fileBody.source_identity.rest_message_id,
        internet_message_id: fileBody.source_identity.internet_message_id,
        conversation_id: fileBody.source_identity.conversation_id,
        item_key: fileBody.source_identity.item_key,
        attachment_id: "att-contract",
        document_id: attachmentBody.items[0].document.document_id,
        version_id: attachmentBody.items[0].version.version_id,
        sha256: attachmentBody.items[0].version.sha256,
        byte_size: ATTACHMENT_BYTES.byteLength,
        folder: "00_Email",
        source_message_ref: fileBody.email_thread.attachment_metadata[0].source_provenance.message_ref,
        source_provenance_authority: "microsoft_graph_mime",
      });
      assert.equal(attachmentBody.folder_structure[0], "00_Email");
      assert.equal(attachmentBody.folder_structure.at(-1), "99_Archive");
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      const attachmentSha256 = attachmentBody.items[0].version.sha256;
      const attachmentKey = `outlook-attachment:${fileBody.email_thread.email_thread_id}:att-contract:${attachmentSha256}`;
      assert.equal(
        dmsRepository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key: `${attachmentKey}:dms-mapping`,
        })?.response?.document_id,
        attachmentBody.items[0].document.document_id,
      );
      assert.equal(
        matterRepository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key: `${attachmentKey}:matter:${MATTER}`,
        })?.response?.timeline_event_id,
        attachmentBody.items[0].timeline_event.event_id,
      );
      assert.equal(
        matterRepository.listAudit({
          tenant_id: TENANT,
          object_id: attachmentBody.items[0].timeline_event.event_id,
        }).length,
        1,
      );
    });

    await t.test("canonical attachment replay is idempotent and performs no second upload", async () => {
      const beforeStorageWrites = storageWriteCount;
      const duplicateBody = await json("/api/outlook/attachments/save", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email_thread_id: fileBody.email_thread.email_thread_id,
          canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
          selected_attachment_ids: ["att-contract"],
          attachments: [attachmentPayload()],
        }),
      });
      assert.equal(duplicateBody.duplicate_count, 1);
      assert.equal(
        duplicateBody.attachment_receipt.receipt_token,
        attachmentBody.attachment_receipt.receipt_token,
      );
      assert.equal(storageWriteCount, beforeStorageWrites);
    });

    const assertAttachmentSaveTamperRejected = async ({
      repository,
      query,
      mutate,
    }) => {
      const persisted = repository.get(query);
      const beforeIssues = attachmentReceiptIssueCount;
      let response;
      try {
        repository.upsert(mutate(persisted));
        response = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({
            tenant_id: TENANT,
            matter_id: MATTER,
            email_thread_id: fileBody.email_thread.email_thread_id,
            canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
            selected_attachment_ids: ["att-contract"],
            attachments: [attachmentPayload()],
          }),
        });
      } finally {
        repository.upsert(persisted);
      }
      const responseBody = await response.json();
      assert.equal(response.status, 409, JSON.stringify(responseBody));
      assert.deepEqual(
        responseBody.safe_error_codes,
        ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"],
      );
      assert.equal(responseBody.attachment_receipt, undefined);
      assert.equal(attachmentReceiptIssueCount, beforeIssues);
    };

    const attachmentMappingQuery = {
      tenant_id: TENANT,
      model_type: "DmsEmailAttachmentMapping",
      resource_id: attachmentBody.attachment_receipt.receipt_ref,
    };
    const attachmentTimelineQuery = {
      tenant_id: TENANT,
      model_type: "MatterTimelineEvent",
      resource_id: attachmentBody.items[0].timeline_event.event_id,
    };

    await t.test("attachment-save replay rejects persisted timeline version tamper before signing", async () => {
      await assertAttachmentSaveTamperRejected({
        repository: matterRepository,
        query: attachmentTimelineQuery,
        mutate: (event) => ({
          ...event,
          safe_summary: { ...event.safe_summary, version_id: "version-tampered" },
        }),
      });
    });

    await t.test("attachment-save replay rejects persisted mapping version tamper before signing", async () => {
      await assertAttachmentSaveTamperRejected({
        repository: dmsRepository,
        query: attachmentMappingQuery,
        mutate: (mapping) => ({ ...mapping, version_id: "version-tampered" }),
      });
    });

    await t.test("attachment-save replay rejects persisted mapping source tamper before signing", async () => {
      await assertAttachmentSaveTamperRejected({
        repository: dmsRepository,
        query: attachmentMappingQuery,
        mutate: (mapping) => ({ ...mapping, email_thread_id: "thread-tampered" }),
      });
    });

    await t.test("attachment-save replay rejects persisted mapping provenance tamper before signing", async () => {
      await assertAttachmentSaveTamperRejected({
        repository: dmsRepository,
        query: attachmentMappingQuery,
        mutate: (mapping) => ({
          ...mapping,
          source_provenance_authority: "tampered-authority",
        }),
      });
    });

    const attachmentOperationKey = `outlook-attachment:${fileBody.email_thread.email_thread_id}:att-contract:${attachmentBody.items[0].version.sha256}`;
    const assertLegacyIdempotencyHashRejected = async ({
      repository,
      idempotencyKey,
      hashField,
    }) => {
      const originalIdempotency = repository.getIdempotency({
        tenant_id: TENANT,
        idempotency_key: idempotencyKey,
      });
      const legacyResponse = { ...originalIdempotency.response };
      delete legacyResponse[hashField];
      const legacyIdempotency = repository.recordIdempotency({
        ...originalIdempotency,
        response: legacyResponse,
      });
      const beforeIssues = attachmentReceiptIssueCount;
      const beforeStorageWrites = storageWriteCount;
      const beforeMapping = dmsRepository.get(attachmentMappingQuery);
      const beforeTimeline = matterRepository.get(attachmentTimelineQuery);
      const beforeMappingAudit = dmsRepository.listAudit({
        tenant_id: TENANT,
        object_id: beforeMapping.mapping_id,
      });
      const beforeTimelineAudit = matterRepository.listAudit({
        tenant_id: TENANT,
        object_id: beforeTimeline.event_id,
      });
      try {
        const response = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({
            tenant_id: TENANT,
            matter_id: MATTER,
            email_thread_id: fileBody.email_thread.email_thread_id,
            canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
            selected_attachment_ids: ["att-contract"],
            attachments: [attachmentPayload()],
          }),
        });
        const responseBody = await response.json();
        assert.equal(response.status, 409, JSON.stringify(responseBody));
        assert.deepEqual(
          responseBody.safe_error_codes,
          ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"],
        );
        assert.equal(responseBody.attachment_receipt, undefined);
        assert.equal(attachmentReceiptIssueCount, beforeIssues);
        assert.equal(storageWriteCount, beforeStorageWrites);
        assert.deepEqual(repository.getIdempotency({
          tenant_id: TENANT,
          idempotency_key: idempotencyKey,
        }), legacyIdempotency);
        assert.deepEqual(dmsRepository.get(attachmentMappingQuery), beforeMapping);
        assert.deepEqual(matterRepository.get(attachmentTimelineQuery), beforeTimeline);
        assert.deepEqual(dmsRepository.listAudit({
          tenant_id: TENANT,
          object_id: beforeMapping.mapping_id,
        }), beforeMappingAudit);
        assert.deepEqual(matterRepository.listAudit({
          tenant_id: TENANT,
          object_id: beforeTimeline.event_id,
        }), beforeTimelineAudit);
      } finally {
        repository.recordIdempotency(originalIdempotency);
      }
    };

    await t.test("attachment-save replay rejects a legacy mapping idempotency receipt before signing or mutation", async () => {
      await assertLegacyIdempotencyHashRejected({
        repository: dmsRepository,
        idempotencyKey: `${attachmentOperationKey}:dms-mapping`,
        hashField: "mapping_hash",
      });
    });

    await t.test("attachment-save replay rejects a legacy timeline idempotency receipt before signing or mutation", async () => {
      await assertLegacyIdempotencyHashRejected({
        repository: matterRepository,
        idempotencyKey: `${attachmentOperationKey}:matter:${MATTER}`,
        hashField: "timeline_event_hash",
      });
    });

    await t.test("email replay verifies a signed attachment receipt and rejects forgery", async () => {
      const receipt = attachmentBody.attachment_receipt;
      const verified = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture(),
          attachment_receipts: [{ receipt_ref: receipt.receipt_ref, receipt_token: receipt.receipt_token }],
        }),
      });
      assert.deepEqual(verified.attachment_state.retry_attachment_ids, []);
      assert.equal(verified.attachment_state.receipts[0].attachment_id, "att-contract");

      const forged = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture(),
          attachment_receipts: [{ receipt_ref: receipt.receipt_ref, receipt_token: `${receipt.receipt_token}A` }],
        }),
      });
      const forgedBody = await forged.json();
      assert.equal(forged.status, 409);
      assert.deepEqual(forgedBody.safe_error_codes, ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"]);

      const wrongRef = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture(),
          attachment_receipts: [{ receipt_ref: `${receipt.receipt_ref}:forged`, receipt_token: receipt.receipt_token }],
        }),
      });
      assert.equal(wrongRef.status, 409);
      assert.deepEqual((await wrongRef.json()).safe_error_codes, ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"]);

      const persistedMapping = dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailAttachmentMapping",
        resource_id: receipt.receipt_ref,
      });
      dmsRepository.delete({
        tenant_id: TENANT,
        model_type: "DmsEmailAttachmentMapping",
        resource_id: receipt.receipt_ref,
      });
      let missingReadback;
      try {
        missingReadback = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({
            tenant_id: TENANT,
            matter_id: MATTER,
            email: emailFixture(),
            attachment_receipts: [{ receipt_ref: receipt.receipt_ref, receipt_token: receipt.receipt_token }],
          }),
        });
      } finally {
        dmsRepository.upsert(persistedMapping);
      }
      assert.equal(missingReadback.status, 409);
      assert.deepEqual((await missingReadback.json()).safe_error_codes, ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"]);

      const persistedVersion = dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsDocumentVersion",
        version_id: receipt.version_id,
      });
      let crossDocumentReadback;
      try {
        dmsRepository.upsert({ ...persistedVersion, document_id: "doc:cross-document-corruption" });
        crossDocumentReadback = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
        });
      } finally {
        dmsRepository.upsert(persistedVersion);
      }
      assert.equal(crossDocumentReadback.status, 409);
      assert.deepEqual(
        (await crossDocumentReadback.json()).safe_error_codes,
        ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"],
      );

      let crossMatterVersionReadback;
      try {
        dmsRepository.upsert({ ...persistedVersion, matter_id: OTHER_MATTER });
        crossMatterVersionReadback = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
        });
      } finally {
        dmsRepository.upsert(persistedVersion);
      }
      assert.equal(crossMatterVersionReadback.status, 409);
      assert.deepEqual(
        (await crossMatterVersionReadback.json()).safe_error_codes,
        ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"],
      );

      const persistedThread = dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailThread",
        email_thread_id: fileBody.email_thread.email_thread_id,
      });
      let crossMatterThreadReadback;
      try {
        dmsRepository.upsert({ ...persistedThread, matter_id: OTHER_MATTER });
        crossMatterThreadReadback = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
        });
      } finally {
        dmsRepository.upsert(persistedThread);
      }
      assert.equal(crossMatterThreadReadback.status, 409);
      assert.deepEqual(
        (await crossMatterThreadReadback.json()).safe_error_codes,
        ["OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT"],
      );

      let inactiveThreadReadback;
      try {
        dmsRepository.upsert({ ...persistedThread, status: "archived" });
        inactiveThreadReadback = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
        });
      } finally {
        dmsRepository.upsert(persistedThread);
      }
      assert.equal(inactiveThreadReadback.status, 409);
      assert.deepEqual(
        (await inactiveThreadReadback.json()).safe_error_codes,
        ["OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT"],
      );

      const persistedTimeline = matterRepository.get({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        resource_id: attachmentBody.items[0].timeline_event.event_id,
      });
      let mismatchedTimelineReadback;
      try {
        matterRepository.upsert({
          ...persistedTimeline,
          safe_summary: { ...persistedTimeline.safe_summary, version_id: "version:other" },
        });
        mismatchedTimelineReadback = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
        });
      } finally {
        matterRepository.upsert(persistedTimeline);
      }
      const mismatchedTimelineBody = await mismatchedTimelineReadback.json();
      assert.equal(mismatchedTimelineReadback.status, 200, JSON.stringify(mismatchedTimelineBody));
      assert.deepEqual(mismatchedTimelineBody.attachment_state.receipts, []);
      assert.deepEqual(mismatchedTimelineBody.attachment_state.retry_attachment_ids, ["att-contract"]);

      const cleanReplay = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture(),
          attachment_receipts: [{ receipt_ref: receipt.receipt_ref, receipt_token: receipt.receipt_token }],
        }),
      });
      assert.deepEqual(cleanReplay.attachment_state.retry_attachment_ids, []);
      assert.equal(cleanReplay.attachment_state.receipts[0].receipt_ref, receipt.receipt_ref);
    });

    const assertDocumentSourceTamperRejected = async (overrides) => {
      const documentId = attachmentBody.items[0].document.document_id;
      const persistedDocument = dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsDocument",
        document_id: documentId,
      });
      const beforeIssues = attachmentReceiptIssueCount;
      let response;
      try {
        dmsRepository.upsert({ ...persistedDocument, ...overrides });
        response = await fetch(`${baseUrl}/api/outlook/email/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
        });
      } finally {
        dmsRepository.upsert(persistedDocument);
      }
      const responseBody = await response.json();
      assert.equal(response.status, 409, JSON.stringify(responseBody));
      assert.deepEqual(responseBody.safe_error_codes, ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"]);
      assert.equal(responseBody.attachment_state, undefined);
      assert.equal(attachmentReceiptIssueCount, beforeIssues);
    };

    await t.test("persisted attachment document from another source thread issues zero receipts", async () => {
      await assertDocumentSourceTamperRejected({ source_email_thread_id: "thread-other" });
    });

    await t.test("persisted attachment document from another source attachment issues zero receipts", async () => {
      await assertDocumentSourceTamperRejected({ source_attachment_id: "attachment-other" });
    });

    await t.test("same-context stale valid receipt is rejected before the API signer is invoked", async () => {
      const current = attachmentBody.attachment_receipt;
      const stale = baseAttachmentReceiptAuthority.issue({
        ...current,
        version_id: "version-stale-but-valid",
      });
      const beforeIssues = attachmentReceiptIssueCount;
      const response = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture(),
          attachment_receipts: [{
            receipt_ref: stale.receipt_ref,
            receipt_token: stale.receipt_token,
          }],
        }),
      });
      const responseBody = await response.json();
      assert.equal(response.status, 409, JSON.stringify(responseBody));
      assert.deepEqual(responseBody.safe_error_codes, ["OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID"]);
      assert.equal(responseBody.attachment_state, undefined);
      assert.equal(attachmentReceiptIssueCount, beforeIssues);
    });

    await t.test("attachment retry repairs mapping and timeline after the upload already committed", async () => {
      const recoveryEmail = emailFixture({
        graph_message_id: "graph-attachment-domain-recovery",
        attachments: [{
          attachment_id: "att-contract",
          name: "contract.txt",
          content_type: "text/plain",
          size: ATTACHMENT_RECOVERY_BYTES.byteLength,
          sha256: createHash("sha256").update(ATTACHMENT_RECOVERY_BYTES).digest("hex"),
          confidentiality: "confidential",
        }],
      });
      const filed = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: recoveryEmail }),
      });
      const payload = {
        tenant_id: TENANT,
        matter_id: MATTER,
        email_thread_id: filed.email_thread.email_thread_id,
        canonical_graph_message_id: filed.source_identity.canonical_graph_message_id,
        selected_attachment_ids: ["att-contract"],
        attachments: [attachmentPayload(ATTACHMENT_RECOVERY_BYTES)],
      };
      const beforeStorageWrites = storageWriteCount;
      failNextOutlookTimelineAudit = true;
      const interrupted = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify(payload),
      });
      assert.equal(interrupted.status, 400);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      const documentId = `doc:${filed.email_thread.email_thread_id.replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 96)}:att-contract`;
      assert.equal(dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsDocument",
        document_id: documentId,
      })?.source_email_thread_id, filed.email_thread.email_thread_id);
      const mappingId = `email-attachment:${filed.email_thread.email_thread_id}:att-contract`;
      assert.equal(dmsRepository.get({
        tenant_id: TENANT,
        model_type: "DmsEmailAttachmentMapping",
        resource_id: mappingId,
      })?.document_id, documentId);

      const recovered = await json("/api/outlook/attachments/save", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      assert.equal(recovered.duplicate_count, 1);
      assert.equal(recovered.items.length, 0);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      const sha256 = createHash("sha256").update(ATTACHMENT_RECOVERY_BYTES).digest("hex");
      const attachmentKey = `outlook-attachment:${filed.email_thread.email_thread_id}:att-contract:${sha256}`;
      assert.equal(dmsRepository.getIdempotency({
        tenant_id: TENANT,
        idempotency_key: `${attachmentKey}:dms-mapping`,
      })?.response?.document_id, documentId);
      const timelineId = `outlook.attachment.saved:${TENANT}:${MATTER}:${documentId}`;
      assert.equal(matterRepository.getIdempotency({
        tenant_id: TENANT,
        idempotency_key: `${attachmentKey}:matter:${MATTER}`,
      })?.response?.timeline_event_id, timelineId);
    });

    const wrongMatterAttachment = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
      method: "POST",
      headers: { "content-type": "application/json", ...sessionHeaders },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: OTHER_MATTER,
        email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
        selected_attachment_ids: ["att-contract"],
        attachments: [attachmentPayload()],
      }),
    });
    const wrongMatterAttachmentBody = await wrongMatterAttachment.json();
    assert.equal(wrongMatterAttachment.status, 404);
    assert.deepEqual(wrongMatterAttachmentBody.safe_error_codes, ["OUTLOOK_ADDIN_EMAIL_NOT_FOUND"]);

    const unknownAttachment = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
      method: "POST",
      headers: { "content-type": "application/json", ...sessionHeaders },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
        selected_attachment_ids: ["att-not-on-message"],
        attachments: [{
          attachment_id: "att-not-on-message",
          name: "forged.txt",
          content_type: "text/plain",
          content_text: "not from the filed Outlook message",
        }],
      }),
    });
    const unknownAttachmentBody = await unknownAttachment.json();
    assert.equal(unknownAttachment.status, 400);
    assert.match(unknownAttachmentBody.message, /not present on the filed Outlook email/u);

    const missingBytes = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
      method: "POST",
      headers: { "content-type": "application/json", ...sessionHeaders },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
        selected_attachment_ids: ["att-contract"],
        attachments: [{ attachment_id: "att-contract", name: "contract.txt", content_type: "text/plain" }],
      }),
    });
    const missingBytesBody = await missingBytes.json();
    assert.equal(missingBytes.status, 400);
    assert.deepEqual(missingBytesBody.safe_error_codes, ["OUTLOOK_ADDIN_VALIDATION_ERROR"]);
    assert.match(missingBytesBody.message, /attachment bytes are required/u);

    const beforeOversizedStorageWrites = storageWriteCount;
    const oversized = await fetch(`${baseUrl}/api/outlook/attachments/save`, {
      method: "POST",
      headers: { "content-type": "application/json", ...sessionHeaders },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
        selected_attachment_ids: ["att-contract"],
        attachments: [{
          attachment_id: "att-contract",
          name: "contract.txt",
          content_type: "application/octet-stream",
          content_base64: Buffer.alloc(MAX_ATTACHMENT_BYTES + 1).toString("base64"),
        }],
      }),
    });
    const oversizedBody = await oversized.json();
    assert.equal(oversized.status, 400);
    assert.match(oversizedBody.message, /must not exceed 2 MiB/u);
    assert.equal(storageWriteCount, beforeOversizedStorageWrites);

    const wrongMatterFollowup = await fetch(`${baseUrl}/api/outlook/followups`, {
      method: "POST",
      headers: { "content-type": "application/json", ...sessionHeaders },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: OTHER_MATTER,
        kind: "task",
        title: "잘못된 Matter 후속 조치",
        due_at: "2026-07-10T09:00:00.000Z",
        source_email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
      }),
    });
    const wrongMatterFollowupBody = await wrongMatterFollowup.json();
    assert.equal(wrongMatterFollowup.status, 404);
    assert.deepEqual(wrongMatterFollowupBody.safe_error_codes, ["OUTLOOK_ADDIN_EMAIL_NOT_FOUND"]);

    const followup = await json("/api/outlook/followups", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        kind: "task",
        title: "메일 검토 후 후속 조치",
        due_at: "2026-07-10T09:00:00.000Z",
        source_email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
      }),
    });
    assert.equal(followup.outcome, "created");
    assert.equal(followup.item.assigned_to_user_id, ACTOR);
    assert.equal(
      followup.item.source_ref,
      `DmsEmailThread:${fileBody.email_thread.email_thread_id}`,
    );
    assert.equal(
      followup.timeline_event.source_ref,
      `DmsEmailThread:${fileBody.email_thread.email_thread_id}`,
    );
    assert.equal(followup.auto_created_without_lawyer_approval, false);
    const followupKey = `outlook-followup:${TENANT}:${MATTER}:task:${fileBody.email_thread.email_thread_id}:${followup.item.activity_id}`;
    assert.equal(
      matterRepository.getIdempotency({
        tenant_id: TENANT,
        idempotency_key: followupKey,
      })?.response?.timeline_event?.event_id,
      followup.timeline_event.event_id,
    );
    const replayedFollowup = await json("/api/outlook/followups", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        kind: "task",
        title: "메일 검토 후 후속 조치",
        due_at: "2026-07-10T09:00:00.000Z",
        source_email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
      }),
    });
    assert.equal(replayedFollowup.outcome, "idempotent_replay");
    assert.equal(replayedFollowup.item.activity_id, followup.item.activity_id);
    assert.equal(replayedFollowup.timeline_event.event_id, followup.timeline_event.event_id);

    const conflictingFollowup = await fetch(`${baseUrl}/api/outlook/followups`, {
      method: "POST",
      headers: { "content-type": "application/json", ...sessionHeaders },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        kind: "task",
        title: "같은 식별자의 변경된 후속 조치",
        due_at: "2026-07-10T09:00:00.000Z",
        source_email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
      }),
    });
    assert.equal(conflictingFollowup.status, 400);
    assert.equal(matterRepository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      resource_id: followup.item.activity_id,
    })?.title, "메일 검토 후 후속 조치");

    await t.test("follow-up idempotency failure rolls back the item, audit, and timeline", async () => {
      const rollbackId = "followup_rollback";
      const payload = {
        tenant_id: TENANT,
        matter_id: MATTER,
        kind: "task",
        task_id: "followup:rollback",
        title: "후속 조치 원자성 검증",
        due_at: "2026-07-11T09:00:00.000Z",
        source_email_thread_id: fileBody.email_thread.email_thread_id,
        canonical_graph_message_id: fileBody.source_identity.canonical_graph_message_id,
      };
      failNextFollowupIdempotency = true;
      const interrupted = await fetch(`${baseUrl}/api/outlook/followups`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify(payload),
      });
      assert.equal(interrupted.status, 400);
      assert.equal(matterRepository.get({
        tenant_id: TENANT,
        model_type: "MatterTask",
        resource_id: rollbackId,
      }), undefined);
      assert.equal(matterRepository.listAudit({ tenant_id: TENANT, object_id: rollbackId }).length, 0);
      assert.equal(matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).some((event) => event.source_object_id === rollbackId), false);

      const recovered = await json("/api/outlook/followups", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      assert.equal(recovered.outcome, "created");
      assert.equal(recovered.item.activity_id, rollbackId);
    });

    await t.test("canonical non-draft Sent Items message files one original MIME", async () => {
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const sent = await json("/api/outlook/sent/file", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({ graph_message_id: "graph-outlook-sent-001", conversation_id: "conversation-outlook-sent" }),
        }),
      });
      assert.equal(sent.external_send_state, "provider_gated_no_external_send_claim");
      assert.equal(sent.timeline_event.type, "outlook.email.sent_filed");
      assert.equal(providerCallCount, beforeProviderCalls + 1);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      assert.equal(sent.email_thread.filed_document_ids.length, 1);

      const receivedRoute = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({ graph_message_id: "graph-outlook-sent-001", conversation_id: "conversation-outlook-sent" }),
        }),
      });
      const receivedRouteBody = await receivedRoute.json();
      assert.equal(receivedRoute.status, 409);
      assert.deepEqual(receivedRouteBody.safe_error_codes, ["OUTLOOK_ADDIN_SENT_MESSAGE_PROVENANCE_MISMATCH"]);

      invalidateFiledSentMessage = true;
      const beforeRejectedReplayStorageWrites = storageWriteCount;
      const rejectedReplay = await fetch(`${baseUrl}/api/outlook/sent/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: emailFixture({ graph_message_id: "graph-outlook-sent-001", conversation_id: "conversation-outlook-sent" }),
        }),
      });
      const rejectedReplayBody = await rejectedReplay.json();
      invalidateFiledSentMessage = false;
      assert.equal(rejectedReplay.status, 409);
      assert.deepEqual(rejectedReplayBody.safe_error_codes, [
        "OUTLOOK_ADDIN_SENT_MESSAGE_PROVENANCE_MISMATCH",
      ]);
      assert.equal(providerCallCount, beforeProviderCalls + 3);
      assert.equal(storageWriteCount, beforeRejectedReplayStorageWrites);
      assert.equal(
        dmsRepository.get({
          tenant_id: TENANT,
          model_type: "DmsEmailThread",
          email_thread_id: sent.email_thread.email_thread_id,
        }).status,
        "active",
      );
    });

    await t.test("repeated manual and sent filing reuses one canonical server identity while revalidating Sent Items", async () => {
      const email = emailFixture({
        graph_message_id: "graph-sent-after-manual",
        internet_message_id: "<outlook-sent-after-manual@amic.law>",
        conversation_id: "conversation-sent-after-manual",
      });
      const beforeProviderCalls = providerCallCount;
      const beforeStorageWrites = storageWriteCount;
      const beforeTimelineCount = matterRepository.list({
        tenant_id: TENANT,
        model_type: "MatterTimelineEvent",
        matter_id: MATTER,
      }).length;
      const manual = await json("/api/outlook/email/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      sentAfterManual = true;
      const sent = await json("/api/outlook/sent/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const repeatedSent = await json("/api/outlook/sent/file", {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const repeatedManual = await fetch(`${baseUrl}/api/outlook/email/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const repeatedManualBody = await repeatedManual.json();
      assert.equal(sent.outcome, "created");
      assert.equal(sent.filing_operation, "sent");
      assert.equal(sent.timeline_event.type, "outlook.email.sent_filed");
      assert.equal(sent.email_thread.email_thread_id, manual.email_thread.email_thread_id);
      assert.equal(repeatedSent.outcome, "idempotent_replay");
      assert.equal(repeatedSent.email_thread.email_thread_id, manual.email_thread.email_thread_id);
      assert.equal(repeatedManual.status, 409);
      assert.deepEqual(repeatedManualBody.safe_error_codes, ["OUTLOOK_ADDIN_SENT_MESSAGE_PROVENANCE_MISMATCH"]);
      invalidateFiledSentMessage = true;
      const invalidated = await fetch(`${baseUrl}/api/outlook/sent/file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      invalidateFiledSentMessage = false;
      const invalidatedBody = await invalidated.json();
      assert.equal(invalidated.status, 409);
      assert.deepEqual(invalidatedBody.safe_error_codes, [
        "OUTLOOK_ADDIN_SENT_MESSAGE_PROVENANCE_MISMATCH",
      ]);
      assert.equal(providerCallCount, beforeProviderCalls + 5);
      assert.equal(storageWriteCount, beforeStorageWrites + 1);
      assert.equal(
        dmsRepository.list({
          tenant_id: TENANT,
          model_type: "DmsDocument",
          matter_id: MATTER,
        }).filter((document) => (
          document.source_email_thread_id === manual.email_thread.email_thread_id
        )).length,
        1,
      );
      assert.deepEqual(
        dmsRepository.listAudit({
          tenant_id: TENANT,
          object_id: manual.email_thread.email_thread_id,
        }).map(({ action }) => action).sort(),
        ["dms.email.thread.file", "dms.email.thread.file.pending"],
      );
      assert.equal(
        matterRepository.list({
          tenant_id: TENANT,
          model_type: "MatterTimelineEvent",
          matter_id: MATTER,
        }).length,
        beforeTimelineCount + 2,
      );
      sentAfterManual = false;
    });

    for (const rejectedSent of [
      {
        name: "ordinary received message",
        email: emailFixture({
          graph_message_id: "graph-outlook-received-as-sent-001",
          internet_message_id: "<outlook-received-as-sent-001@amic.law>",
          conversation_id: "conversation-outlook-received-as-sent",
          attachments: [],
        }),
      },
      {
        name: "draft in Sent Items",
        email: emailFixture({
          graph_message_id: "graph-outlook-sent-draft-001",
          internet_message_id: "<outlook-sent-draft-001@amic.law>",
          conversation_id: "conversation-outlook-sent-draft",
          attachments: [],
        }),
      },
      {
        name: "Sent Items message with divergent Graph sender and from",
        email: emailFixture({
          graph_message_id: "graph-divergent-sender-from",
          internet_message_id: "<outlook-divergent-sender-from@amic.law>",
          conversation_id: "conversation-divergent-sender-from",
          attachments: [],
        }),
      },
    ]) {
      await t.test(`${rejectedSent.name} cannot use the sent filing route`, async () => {
        const emailThreadId = expectedEmailThreadId(rejectedSent.email);
        const beforeProviderCalls = providerCallCount;
        const beforeStorageWrites = storageWriteCount;
        const response = await fetch(`${baseUrl}/api/outlook/sent/file`, {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders },
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: rejectedSent.email }),
        });
        const responseBody = await response.json();
        assert.equal(response.status, 409);
        assert.deepEqual(responseBody.safe_error_codes, [
          "OUTLOOK_ADDIN_SENT_MESSAGE_PROVENANCE_MISMATCH",
        ]);
        assert.equal(providerCallCount, beforeProviderCalls + 1);
        assert.equal(storageWriteCount, beforeStorageWrites);
        assert.equal(dmsRepository.get({ tenant_id: TENANT, model_type: "DmsEmailThread", email_thread_id: emailThreadId }), undefined);
        assert.equal(matterRepository.list({
          tenant_id: TENANT,
          model_type: "MatterTimelineEvent",
          matter_id: MATTER,
        }).some((event) => event.source_object_id === emailThreadId), false);
      });
    }

    const alerts = await json("/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({
        message: {
          to: [{ name: "외부", email: "external@example.com" }],
          body_preview: "첨부 확인 부탁드립니다.",
          attachments: [{ attachment_id: "conf", name: "secret.pdf", confidentiality: "highly_confidential" }],
        },
      }),
    });
    assert.equal(alerts.item.warning_count, 1);
    assert.equal(alerts.item.send_blocked, false);
    assert.equal(alerts.item.raw_body_included, false);
    assert.equal(alerts.item.attachment_bytes_included, false);
    assert.match(alerts.item.message_hashes.body_preview_sha256, /^[a-f0-9]{64}$/);

    const missingAttachment = await json("/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({ message: { to: [{ name: "AMIC", email: "lawyer@amic.kr" }], body_preview: "첨부 확인", attachments: [] } }),
    });
    assert.equal(missingAttachment.item.warning_count, 1);
    assert.equal(missingAttachment.item.warnings[0].warning_id, "missing-mentioned-attachment");
    assert.equal(missingAttachment.item.send_blocked, false);

    const clean = await json("/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({
        message: {
          to: [{ name: "AMIC", email: "LAWYER@AMIC.KR" }],
          body_preview: "확인했습니다.",
          attachments: [{ attachment_id: "internal-conf", confidentiality: "highly_confidential" }],
        },
      }),
    });
    assert.equal(clean.item.warning_count, 0);
    assert.equal(clean.item.send_blocked, false);

    const docs = await json(`/api/outlook/matters/${MATTER}/documents?tenant_id=${TENANT}`);
    assert.equal(docs.items.length, dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument", matter_id: MATTER }).length);
    assert.equal(docs.document_bytes_included, false);

    matterRepository.update(
      { tenant_id: TENANT, model_type: "Matter", matter_id: MATTER },
      { status: "closed" },
    );
    const beforeClosedMatterProviderCalls = providerCallCount;
    for (const [path, body] of [
      ["/api/outlook/email/file", { matter_id: MATTER, email: emailFixture() }],
      ["/api/outlook/attachments/save", { matter_id: MATTER, email_thread_id: "thread:any" }],
      ["/api/outlook/followups", { matter_id: MATTER, kind: "task", source_email_thread_id: "thread:any", title: "blocked" }],
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      assert.equal(response.status, 409, `${path}: ${JSON.stringify(responseBody)}`);
      assert.deepEqual(responseBody.safe_error_codes, ["OUTLOOK_ADDIN_MATTER_INACTIVE"]);
      assert.equal(responseBody.item, null);
    }
    assert.equal(providerCallCount, beforeClosedMatterProviderCalls);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
    emailDmsRepository.close();
  }
});

for (const [failureStage, expectedCode] of [
  ["finalize", "OUTLOOK_EMAIL_FILE_MIME_FINALIZE_FAILED_23505"],
  ["state_read", "OUTLOOK_EMAIL_FILE_MIME_STATE_READ_FAILED_57P01"],
]) {
  test(`phased Outlook MIME ${failureStage} failure is classified and retries without duplicate storage`, async () => {
    const uploadFixture = phasedUploadRuntimeFixture({ failOnceAt: failureStage });
    const email = phasedAuthorityEmail();
    const server = await startPhasedUploadSagaServer({ uploadFixture });
    try {
      const interrupted = await fetch(`${server.base_url}/api/outlook/email/file`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer outlook-provenance-session",
        },
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      });
      const interruptedBody = await interrupted.json();
      assert.equal(interrupted.status, 400, JSON.stringify(interruptedBody));
      assert.deepEqual(interruptedBody.safe_error_codes, [expectedCode]);
      assert.equal(uploadFixture.stage_write_count, 1);

      const recovered = await jsonFetch(
        server.base_url,
        "/api/outlook/email/file",
        {
          method: "POST",
          body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
        },
        { authorization: "Bearer outlook-provenance-session" },
      );
      assert.equal(recovered.outcome, "created");
      assert.equal(uploadFixture.stage_write_count, 1);
      assert.equal(uploadFixture.document_count, 1);
    } finally {
      await server.close();
    }
  });
}

test("phased upload runtime safely retries one post-claim intent and rejects cross-Matter reuse", async () => {
  let now = "2026-08-06T00:00:00.000Z";
  const clock = () => new Date(now);
  const uploadFixture = phasedUploadRuntimeFixture({ clock });
  const email = emailFixture({
    graph_message_id: "graph-phased-process-loss",
    internet_message_id: "<outlook-phased-process-loss@amic.law>",
    conversation_id: "conversation-phased-process-loss",
    attachments: [],
  });
  const interruptedServer = await startPhasedUploadSagaServer({
    uploadFixture,
    failAfterUploadIntent: true,
    clock,
  });
  try {
    const interrupted = await fetch(`${interruptedServer.base_url}/api/outlook/email/file`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer outlook-provenance-session",
      },
      body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
    });
    const interruptedBody = await interrupted.json();
    assert.equal(interrupted.status, 400, JSON.stringify(interruptedBody));
    assert.equal(uploadFixture.session_count, 1);
    assert.equal(uploadFixture.stage_write_count, 0);
    assert.equal(uploadFixture.document_count, 0);
    const [intent] = uploadFixture.sessions();
    assert.equal(intent.state, "pending");
    const recoveryWindow = Date.parse(intent.expires_at) - Date.parse(now);
    assert.equal(recoveryWindow >= 24 * 60 * 60 * 1_000, true);
    assert.equal(recoveryWindow <= 25 * 60 * 60 * 1_000, true);
  } finally {
    await interruptedServer.close();
  }

  now = "2026-08-06T00:31:00.000Z";
  const retryServer = await startPhasedUploadSagaServer({ uploadFixture, clock });
  try {
    const retried = await jsonFetch(
      retryServer.base_url,
      "/api/outlook/email/file",
      {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      },
      { authorization: "Bearer outlook-provenance-session" },
    );
    assert.equal(retried.outcome, "created");
    assert.equal(retried.email_thread.status, "active");
    assert.equal(uploadFixture.session_count, 1);
    assert.deepEqual(uploadFixture.sessions().map((session) => session.state), ["finalized"]);
    assert.equal(uploadFixture.stage_write_count, 1);
    assert.equal(uploadFixture.document_count, 1);
    assert.equal(retryServer.dmsRepository.listAudit({
      tenant_id: TENANT,
      object_id: expectedEmailThreadId(email),
    }).length, 2);

    const crossMatter = await fetch(`${retryServer.base_url}/api/outlook/email/file`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer outlook-provenance-session",
      },
      body: JSON.stringify({ tenant_id: TENANT, matter_id: OTHER_MATTER, email }),
    });
    const crossMatterBody = await crossMatter.json();
    assert.equal(crossMatter.status, 409);
    assert.deepEqual(crossMatterBody.safe_error_codes, [
      "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT",
    ]);
    assert.equal(uploadFixture.session_count, 1);
    assert.equal(uploadFixture.document_count, 1);
    assert.equal(retryServer.dmsRepository.listAudit({
      tenant_id: TENANT,
      object_id: expectedEmailThreadId(email),
    }).length, 2);
  } finally {
    await retryServer.close();
  }
});

test("expired claim-only Outlook MIME intent rolls forward and files one canonical document", async () => {
  let now = "2026-08-06T00:00:00.000Z";
  const clock = () => new Date(now);
  const uploadFixture = phasedUploadRuntimeFixture({ clock });
  const email = emailFixture({
    graph_message_id: "graph-phased-process-loss",
    internet_message_id: "<outlook-phased-process-loss@amic.law>",
    conversation_id: "conversation-phased-process-loss",
    attachments: [],
  });
  const interruptedServer = await startPhasedUploadSagaServer({
    uploadFixture,
    failAfterUploadIntent: true,
    clock,
  });
  try {
    const interrupted = await fetch(`${interruptedServer.base_url}/api/outlook/email/file`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer outlook-provenance-session",
      },
      body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
    });
    const interruptedBody = await interrupted.json();
    assert.equal(interrupted.status, 400, JSON.stringify(interruptedBody));
    assert.equal(uploadFixture.session_count, 1);
    assert.deepEqual(uploadFixture.sessions().map((session) => session.state), ["pending"]);
  } finally {
    await interruptedServer.close();
  }

  now = "2026-08-07T02:00:00.000Z";
  const cleanup = await uploadFixture.runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.equal(cleanup.length, 1);
  assert.equal(cleanup[0].action, "orphan_cleaned");
  const retryServer = await startPhasedUploadSagaServer({ uploadFixture, clock });
  try {
    const recovered = await jsonFetch(
      retryServer.base_url,
      "/api/outlook/email/file",
      {
        method: "POST",
        body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email }),
      },
      { authorization: "Bearer outlook-provenance-session" },
    );
    assert.equal(recovered.email_thread.status, "active");
    assert.equal(uploadFixture.session_count, 2);
    assert.deepEqual(uploadFixture.sessions().map((session) => session.state).sort(), ["expired", "finalized"]);
    assert.equal(uploadFixture.retirement_count, 1);
    assert.equal(uploadFixture.document_count, 1);
    assert.equal(uploadFixture.stage_write_count, 1);
    const finalized = uploadFixture.sessions().find((session) => session.state === "finalized");
    const expired = uploadFixture.sessions().find((session) => session.state === "expired");
    assert.equal(finalized.document_id, expired.document_id);
    assert.notEqual(finalized.version_id, expired.version_id);
    assert.notEqual(finalized.object_id, expired.object_id);

    const wrongMatter = await fetch(`${retryServer.base_url}/api/outlook/email/file`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer outlook-provenance-session",
      },
      body: JSON.stringify({ tenant_id: TENANT, matter_id: OTHER_MATTER, email }),
    });
    assert.equal(wrongMatter.status, 409);
    assert.equal(uploadFixture.session_count, 2);
    assert.equal(uploadFixture.document_count, 1);
  } finally {
    await retryServer.close();
  }
});

test("production-shaped phased MIME intent survives lost domain flush and resolves cross-Matter concurrency", async () => {
  const uploadFixture = phasedUploadRuntimeFixture();
  const processLossEmail = emailFixture({
    graph_message_id: "graph-phased-process-loss",
    internet_message_id: "<outlook-phased-process-loss@amic.law>",
    conversation_id: "conversation-phased-process-loss",
    attachments: [],
  });
  const processLossThreadId = expectedEmailThreadId(processLossEmail);
  const first = await startPhasedUploadSagaServer({
    uploadFixture,
    failFilingAudit: true,
  });
  try {
    const interrupted = await fetch(`${first.base_url}/api/outlook/email/file`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer outlook-provenance-session",
      },
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email: processLossEmail,
      }),
    });
    assert.equal(interrupted.status, 400);
    const pending = first.dmsRepository.get({
      tenant_id: TENANT,
      model_type: "DmsEmailThread",
      email_thread_id: processLossThreadId,
    });
    assert.equal(pending.status, "draft");
    assert.equal(uploadFixture.session_count, 1);
    assert.equal(uploadFixture.document_count, 1);
    assert.equal(uploadFixture.stage_write_count, 1);
    const [durableIntent] = uploadFixture.sessions();
    assert.equal(durableIntent.state, "finalized");
    assert.equal(durableIntent.matter_id, MATTER);
    assert.deepEqual(pending.filed_document_ids, [durableIntent.document_id]);
  } finally {
    await first.close();
  }

  const recovered = await startPhasedUploadSagaServer({ uploadFixture });
  try {
    const retried = await jsonFetch(
      recovered.base_url,
      "/api/outlook/email/file",
      {
        method: "POST",
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: MATTER,
          email: processLossEmail,
        }),
      },
      { authorization: "Bearer outlook-provenance-session" },
    );
    assert.equal(retried.outcome, "created");
    assert.equal(retried.email_thread.status, "active");
    assert.equal(retried.email_thread.email_thread_id, processLossThreadId);
    assert.equal(uploadFixture.session_count, 1);
    assert.equal(uploadFixture.document_count, 1);
    assert.equal(uploadFixture.stage_write_count, 1);
    assert.equal(recovered.dmsRepository.listAudit({
      tenant_id: TENANT,
      object_id: processLossThreadId,
    }).length, 2);

    const concurrentEmail = emailFixture({
      graph_message_id: "graph-phased-concurrent",
      internet_message_id: "<outlook-phased-concurrent@amic.law>",
      conversation_id: "conversation-phased-concurrent",
      attachments: [],
    });
    const concurrentThreadId = expectedEmailThreadId(concurrentEmail);
    const beforeStages = uploadFixture.stage_write_count;
    const beforeSessions = uploadFixture.session_count;
    const responses = await Promise.all([MATTER, OTHER_MATTER].map((matterId) => fetch(
      `${recovered.base_url}/api/outlook/email/file`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer outlook-provenance-session",
        },
        body: JSON.stringify({
          tenant_id: TENANT,
          matter_id: matterId,
          email: concurrentEmail,
        }),
      },
    )));
    const responseBodies = await Promise.all(responses.map((response) => response.json()));
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    const winnerIndex = responses.findIndex((response) => response.status === 201);
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    const winnerMatterId = [MATTER, OTHER_MATTER][winnerIndex];
    assert.equal(responseBodies[winnerIndex].email_thread.status, "active");
    assert.equal(responseBodies[winnerIndex].email_thread.email_thread_id, concurrentThreadId);
    assert.equal(responseBodies[loserIndex].safe_error_codes.length, 1);
    assert.ok([
      "DMS_IDEMPOTENCY_CONFLICT",
      "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT",
    ].includes(responseBodies[loserIndex].safe_error_codes[0]));
    assert.equal(uploadFixture.session_count, beforeSessions + 1);
    assert.equal(uploadFixture.stage_write_count, beforeStages + 1);
    assert.equal(
      uploadFixture.sessions().find((session) => session.document_id === (
        responseBodies[winnerIndex].email_thread.filed_document_ids[0]
      )).matter_id,
      winnerMatterId,
    );
    const activeThread = recovered.dmsRepository.get({
      tenant_id: TENANT,
      model_type: "DmsEmailThread",
      email_thread_id: concurrentThreadId,
    });
    assert.equal(activeThread.status, "active");
    assert.equal(activeThread.matter_id, winnerMatterId);
    assert.equal(recovered.dmsRepository.listAudit({
      tenant_id: TENANT,
      object_id: concurrentThreadId,
    }).length, 2);
    assert.equal(recovered.matterRepository.list({
      tenant_id: TENANT,
      model_type: "MatterTimelineEvent",
    }).filter((event) => event.source_object_id === concurrentThreadId).length, 1);
  } finally {
    await recovered.close();
  }
});
