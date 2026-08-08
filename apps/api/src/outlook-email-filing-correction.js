import { createEmailFilingCorrectionService } from "../../../packages/email-dms/src/email-filing-correction-service.js";
import { createEmailFilingOriginalResolver } from "../../../packages/email-dms/src/email-filing-original-resolver.js";
import { normalizeEmailFilingPlacementEvent } from "../../../packages/email-dms/src/email-filing-correction-model.js";
import { evaluateRouteDecision } from "./permission-gate.js";
import { assertOutlookOperationEvidenceSafe } from "./outlook-operation-response.js";
import {
  assertOutlookEmailFilingCorrectionProjection,
  createMatterBackedEmailFilingCorrectionRepository,
} from "./outlook-email-filing-correction-repository.js";

const POST_FIELDS = Object.freeze([
  "actor_id",
  "audit_hint_ref",
  "document_id",
  "email_thread_id",
  "expected_placement_id",
  "idempotency_key",
  "mime_sha256",
  "original_receipt_id",
  "reason",
  "source_matter_id",
  "target_matter_id",
]);
const GET_FIELDS = Object.freeze(["audit_hint_ref", "email_thread_id"]);
const ACTIVE_MATTER_STATUSES = new Set(["open", "opening", "paused"]);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw Object.assign(new TypeError(`${field} is required`), {
      safe_error_code: "OUTLOOK_EMAIL_CORRECTION_INVALID",
      status: 400,
    });
  }
  return value.trim();
}

function exactFields(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((field) => allowed.includes(field));
}

function response(status, body) {
  const result = {
    status,
    body: {
      safe_error_codes: [],
      count_leak_prevented: true,
      production_ready_claim: false,
      ...body,
    },
  };
  assertOutlookOperationEvidenceSafe(result);
  return result;
}

function blocked(status, requestId, code) {
  return response(status, {
    request_id: requestId,
    outcome: status === 403 ? "denied" : "blocked",
    item: null,
    safe_error_codes: [code],
  });
}

function safePlacement(value) {
  return Object.freeze({
    placement_id: value.placement_id,
    correction_id: value.correction_id,
    event_kind: value.event_kind,
    email_thread_id: value.email_thread_id,
    original_receipt_id: value.original_receipt_id,
    matter_id: value.matter_id ?? value.target_matter_id,
    document_id: value.document_id,
    mime_sha256: value.mime_sha256,
    occurred_at: value.occurred_at,
    status: value.status,
    copied_mime: false,
  });
}

function safeTimelines(events = []) {
  return Object.freeze(events.map((event) => Object.freeze({
    event_id: event.event_id,
    matter_id: event.matter_id,
    type: event.type,
    correction_id: event.correction_id,
    document_id: event.document_id,
    mime_sha256: event.mime_sha256,
    copied_mime: false,
  })));
}

function scopedContext(context, resourceId) {
  return {
    ...context,
    object_acl: (context?.object_acl ?? []).filter((entry) => (
      entry.resource_id === undefined || entry.resource_id === resourceId
    )),
  };
}

function allowed(context, { tenantId, matterId = null, resourceType, resourceId, action }) {
  return evaluateRouteDecision({
    context: scopedContext(context, resourceId),
    resource: {
      tenant_id: tenantId,
      matter_id: matterId,
      resource_type: resourceType,
      resource_id: resourceId,
    },
    action,
  }).effect === "allow";
}

function matterPermissions(context, tenantId, matterId, { target = false } = {}) {
  const checks = ["outlook:matter:read", "outlook:email:correct"];
  if (target) checks.push("outlook:document:link");
  return checks.every((action) => allowed(context, {
    tenantId,
    matterId,
    resourceType: "matter",
    resourceId: matterId,
    action,
  }));
}

function matterReadPermission(context, tenantId, matterId) {
  return allowed(context, {
    tenantId,
    matterId,
    resourceType: "matter",
    resourceId: matterId,
    action: "outlook:matter:read",
  });
}

function principalFrom(context) {
  return Object.freeze({
    tenant_id: requiredString(context?.principal?.tenant_id, "signed tenant"),
    actor_id: requiredString(context?.principal?.user_id, "signed actor"),
  });
}

function activeMatter(repository, tenantId, matterId) {
  const matter = repository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (
    matter?.tenant_id !== tenantId
    || matter.matter_id !== matterId
    || !ACTIVE_MATTER_STATUSES.has(matter.status)
    || typeof matter.permission_envelope_id !== "string"
    || matter.permission_envelope_id.trim() === ""
  ) {
    throw Object.assign(new Error("Matter link authority is unavailable"), {
      safe_error_code: "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT",
      status: 409,
    });
  }
  return matter;
}

function serviceFor({ runtime, context, principal, session }) {
  const matterRepository = runtime?.matterRuntime?.repository;
  const correctionRepository = createMatterBackedEmailFilingCorrectionRepository({
    repository: matterRepository,
  });
  return createEmailFilingCorrectionService({
    repository: correctionRepository,
    original_filing_resolver: createEmailFilingOriginalResolver({
      repository: runtime?.dmsRuntime?.repository,
    }),
    resolve_principal: ({ session: candidate }) => candidate === session ? principal : null,
    authorize_matter: ({ matter_id: matterId, action }) => {
      if (action === "email_filing_correction.read") {
        return matterReadPermission(context, principal.tenant_id, matterId);
      }
      return matterPermissions(
        context,
        principal.tenant_id,
        matterId,
        { target: action === "email_filing_correction.target" },
      );
    },
  });
}

function mapError(error, requestId) {
  if (error?.status === 403) {
    return blocked(403, requestId, "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED");
  }
  if ([
    "EMAIL_FILING_CORRECTION_ORIGINAL_NOT_FOUND",
    "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
  ].includes(error?.safe_error_code)) {
    return blocked(409, requestId, "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT");
  }
  if (
    typeof error?.safe_error_code === "string"
    && /^EMAIL_FILING_CORRECTION_[A-Z0-9_]+$/u.test(error.safe_error_code)
  ) {
    return blocked(error.status ?? 409, requestId, error.safe_error_code);
  }
  if (error?.safe_error_code === "OUTLOOK_EMAIL_CORRECTION_INVALID") {
    return blocked(400, requestId, error.safe_error_code);
  }
  if (error?.safe_error_code === "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT") {
    return blocked(409, requestId, error.safe_error_code);
  }
  return blocked(500, requestId, "OUTLOOK_EMAIL_CORRECTION_FAILED");
}

export async function handleOutlookEmailFilingCorrection({
  method,
  query = {},
  body = {},
  context,
  requestId,
  runtime,
} = {}) {
  try {
    const principal = principalFrom(context);
    const matterRepository = runtime?.matterRuntime?.repository;
    const session = Object.freeze({ request_id: requestId });
    const service = serviceFor({ runtime, context, principal, session });
    if (method === "GET") {
      if (!exactFields(query, GET_FIELDS)) {
        throw Object.assign(new TypeError("unsupported correction query"), {
          safe_error_code: "OUTLOOK_EMAIL_CORRECTION_INVALID",
          status: 400,
        });
      }
      const emailThreadId = requiredString(query.email_thread_id, "email_thread_id");
      if (!allowed(context, {
        tenantId: principal.tenant_id,
        resourceType: "email_thread",
        resourceId: emailThreadId,
        action: "outlook:email:correction:read",
      })) return blocked(403, requestId, "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED");
      const current = await service.currentPlacement({
        session,
        email_thread_id: emailThreadId,
      });
      if (current.event_kind === "correction") {
        const record = matterRepository.get({
          tenant_id: principal.tenant_id,
          model_type: "EmailFilingPlacementEvent",
          resource_id: current.placement_id,
        });
        const event = normalizeEmailFilingPlacementEvent({
          ...record,
          model_type: record?.event_model_type,
        });
        assertOutlookEmailFilingCorrectionProjection(matterRepository, event);
      }
      return response(200, {
        request_id: requestId,
        outcome: "passed",
        item: safePlacement(current),
      });
    }
    if (method !== "POST" || !exactFields(body, POST_FIELDS)) {
      return blocked(400, requestId, "OUTLOOK_EMAIL_CORRECTION_INVALID");
    }
    const sourceMatterId = requiredString(body.source_matter_id, "source_matter_id");
    const targetMatterId = requiredString(body.target_matter_id, "target_matter_id");
    if (
      !matterPermissions(context, principal.tenant_id, sourceMatterId)
      || !matterPermissions(context, principal.tenant_id, targetMatterId, { target: true })
    ) return blocked(403, requestId, "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED");
    activeMatter(matterRepository, principal.tenant_id, sourceMatterId);
    activeMatter(matterRepository, principal.tenant_id, targetMatterId);
    const result = await service.correct({
      session,
      email_thread_id: requiredString(body.email_thread_id, "email_thread_id"),
      original_receipt_id: requiredString(body.original_receipt_id, "original_receipt_id"),
      document_id: requiredString(body.document_id, "document_id"),
      mime_sha256: requiredString(body.mime_sha256, "mime_sha256"),
      source_matter_id: sourceMatterId,
      target_matter_id: targetMatterId,
      prior_placement_id: requiredString(body.expected_placement_id, "expected_placement_id"),
      reason: requiredString(body.reason, "reason"),
      idempotency_key: requiredString(body.idempotency_key, "idempotency_key"),
    });
    const projection = assertOutlookEmailFilingCorrectionProjection(
      matterRepository,
      result.correction,
    );
    return response(result.outcome === "created" ? 201 : 200, {
      request_id: requestId,
      outcome: result.outcome,
      item: safePlacement(result.current_placement),
      timeline_events: safeTimelines(projection.timeline_events),
      idempotency_fingerprint: result.correction.payload_fingerprint,
      idempotent_replay: result.outcome === "idempotent_replay",
      audit_event_id: `email-filing-correction:${result.correction.correction_id}`,
    });
  } catch (error) {
    return mapError(error, requestId);
  }
}
