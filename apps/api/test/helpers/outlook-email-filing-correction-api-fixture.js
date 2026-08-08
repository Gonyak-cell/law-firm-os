import {
  createDefaultDmsRuntime,
  startApiServer,
} from "../../src/server.js";
import { createDmsRepository } from "../../../../packages/dms/src/repository.js";
import { createEmailDmsRepository } from "../../../../packages/email-dms/src/repository.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";
import {
  CORRECTION_ACTOR_ID,
  DOCUMENT_ID,
  MATTER_A,
  MATTER_B,
  MIME_SHA256,
  RECEIPT_ID,
  TENANT_ID,
  THREAD_ID,
  seedOriginalFiling,
} from "../../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";

const TOKEN = "Bearer outm21-signed-session";

export function matterSeed() {
  const createdAt = "2026-08-08T00:00:00.000Z";
  return [
    {
      model_type: "MatterClient",
      tenant_id: TENANT_ID,
      client_id: "client-outm21",
      client_display_name: "OUTM-21 고객",
      client_short_name: "OUTM21",
      status: "active",
      created_by: CORRECTION_ACTOR_ID,
      created_at: createdAt,
    },
    ...[MATTER_A, MATTER_B].map((matterId) => ({
      model_type: "Matter",
      tenant_id: TENANT_ID,
      matter_id: matterId,
      matter_code: `OUTM21/${matterId}`,
      matter_name: matterId,
      client_id: "client-outm21",
      client_display_name: "OUTM-21 고객",
      title: matterId,
      status: "open",
      created_by: CORRECTION_ACTOR_ID,
      created_at: createdAt,
      permission_envelope_id: `perm:${matterId}`,
      audit_trace_id: `audit:${matterId}`,
    })),
  ];
}

function signedSessionAuth({ denyCorrection = false, objectAcl = [] } = {}) {
  const principal = Object.freeze({
    source: "api-signed-session",
    header_only_trust_allowed: false,
    tenant_id: TENANT_ID,
    user_id: CORRECTION_ACTOR_ID,
    actor_id: CORRECTION_ACTOR_ID,
    role_ids: Object.freeze(["outlook_addin_user"]),
    scopes: Object.freeze(["matter.read", "matter.write"]),
  });
  const context = Object.freeze({
    principal,
    rules: Object.freeze([{ id: "outm21-allow", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([
      ...(denyCorrection ? [{
        id: "outm21-deny-correction",
        effect: "deny",
        principal_id: CORRECTION_ACTOR_ID,
        action: "outlook:email:correct",
      }] : []),
      ...objectAcl,
    ]),
  });
  return Object.freeze({
    async resolvePermissionContextFromHeaders(headers) {
      if (headers.authorization !== TOKEN) return Object.freeze({ ok: false, status: 401 });
      return Object.freeze({
        ok: true,
        principal,
        context,
        token_payload: Object.freeze({ surface: "outlook_addin" }),
      });
    },
  });
}

export async function startCorrectionApiFixture({
  matterFilePath,
  matterRepository: injectedMatterRepository,
  denyCorrection = false,
  objectAcl = [],
} = {}) {
  const matterRepository = injectedMatterRepository ?? createMatterRepository({
    filePath: matterFilePath,
    seedRecords: matterSeed(),
  });
  const dmsRepository = createDmsRepository();
  seedOriginalFiling(dmsRepository);
  const emailDmsRepository = createEmailDmsRepository();
  const started = await startApiServer({
    port: 0,
    matterRuntime: Object.freeze({ repository: matterRepository }),
    dmsRuntime: createDefaultDmsRuntime({ repository: dmsRepository }),
    emailDmsRuntime: Object.freeze({ repository: emailDmsRepository }),
    sessionAuth: signedSessionAuth({ denyCorrection, objectAcl }),
  });
  return Object.freeze({
    baseUrl: `http://${started.host}:${started.port}`,
    server: started.server,
    matterRepository,
    dmsRepository,
    emailDmsRepository,
    async close({ closeMatter = true } = {}) {
      await new Promise((resolve) => started.server.close(resolve));
      if (closeMatter) matterRepository.close();
      dmsRepository.close();
      emailDmsRepository.close();
    },
  });
}

export async function correctionApiRequest(fixture, path, { method = "GET", body, requestId } = {}) {
  const response = await fetch(`${fixture.baseUrl}${path}`, {
    method,
    headers: {
      authorization: TOKEN,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return Object.freeze({ response, body: await response.json() });
}

export function correctionBody(current, overrides = {}) {
  return {
    email_thread_id: THREAD_ID,
    original_receipt_id: RECEIPT_ID,
    document_id: DOCUMENT_ID,
    mime_sha256: MIME_SHA256,
    source_matter_id: MATTER_A,
    target_matter_id: MATTER_B,
    expected_placement_id: current.placement_id,
    reason: "담당 Matter 정정",
    idempotency_key: "outm21-a-to-b",
    ...overrides,
  };
}

export function currentCorrectionPath(threadId = THREAD_ID) {
  return `/api/outlook/email/corrections/current?email_thread_id=${encodeURIComponent(threadId)}`;
}
