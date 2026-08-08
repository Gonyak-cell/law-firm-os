import { createEmailFilingCorrectionService } from "../../../packages/email-dms/src/email-filing-correction-service.js";
import { normalizeEmailFilingPlacementEvent } from "../../../packages/email-dms/src/email-filing-correction-model.js";
import { createEmailFilingOriginalResolver } from "../../../packages/email-dms/src/email-filing-original-resolver.js";
import {
  CORRECTION_GET_FIELDS,
  CORRECTION_POST_FIELDS,
  assertActiveCorrectionMatter,
  correctionAllowed,
  correctionPrincipal,
  exactCorrectionFields,
  matterCorrectionPermissions,
  matterCorrectionReadPermission,
  requiredCorrectionString,
} from "./outlook-email-filing-correction-permissions.js";
import { assertOutlookEmailFilingCorrectionProjection } from "./outlook-email-filing-correction-projection-validation.js";
import { createMatterBackedEmailFilingCorrectionRepository } from "./outlook-email-filing-correction-repository.js";
import {
  correctionBlocked,
  correctionResponse,
  mapCorrectionError,
  safeCorrectionPlacement,
  safeCorrectionTimelines,
} from "./outlook-email-filing-correction-response.js";

function correctionService({ runtime, context, principal, session }) {
  const matterRepository = runtime?.matterRuntime?.repository;
  const uploadRuntime = runtime?.dmsRuntime?.upload_runtime;
  const originalResolver = createEmailFilingOriginalResolver({
    repository: runtime?.dmsRuntime?.repository,
    ...(typeof uploadRuntime?.getDocumentState === "function"
      ? { document_state_reader: uploadRuntime }
      : {}),
  });
  const repository = createMatterBackedEmailFilingCorrectionRepository({
    repository: matterRepository,
    resolve_document_binding: originalResolver.getDocumentBinding,
  });
  const service = createEmailFilingCorrectionService({
    repository,
    original_filing_resolver: originalResolver,
    resolve_principal: ({ session: candidate }) => candidate === session ? principal : null,
    authorize_matter: ({ matter_id: matterId, action }) => {
      if (action === "email_filing_correction.read") {
        return matterCorrectionReadPermission(context, principal.tenant_id, matterId);
      }
      return matterCorrectionPermissions(
        context,
        principal.tenant_id,
        matterId,
        { target: action === "email_filing_correction.target" },
      );
    },
  });
  return Object.freeze({ service, originalResolver });
}

function persistedCorrection(matterRepository, tenantId, placement) {
  const record = matterRepository.get({
    tenant_id: tenantId,
    model_type: "EmailFilingPlacementEvent",
    resource_id: placement.placement_id,
  });
  return normalizeEmailFilingPlacementEvent({
    ...record,
    model_type: record?.event_model_type,
  });
}

async function currentPlacement({ query, context, principal, session, runtime, requestId }) {
  if (!exactCorrectionFields(query, CORRECTION_GET_FIELDS)) {
    throw Object.assign(new TypeError("unsupported correction query"), {
      safe_error_code: "OUTLOOK_EMAIL_CORRECTION_INVALID",
      status: 400,
    });
  }
  const emailThreadId = requiredCorrectionString(query.email_thread_id, "email_thread_id");
  if (!correctionAllowed(context, {
    tenantId: principal.tenant_id,
    resourceType: "email_thread",
    resourceId: emailThreadId,
    action: "outlook:email:correction:read",
  })) return correctionBlocked(403, requestId, "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED");
  const { service, originalResolver } = correctionService({
    runtime,
    context,
    principal,
    session,
  });
  const current = await service.currentPlacement({ session, email_thread_id: emailThreadId });
  if (current.event_kind === "correction") {
    const event = persistedCorrection(
      runtime.matterRuntime.repository,
      principal.tenant_id,
      current,
    );
    assertOutlookEmailFilingCorrectionProjection(
      runtime.matterRuntime.repository,
      event,
      originalResolver.getDocumentBinding(event),
    );
  }
  return correctionResponse(200, {
    request_id: requestId,
    outcome: "passed",
    item: safeCorrectionPlacement(current),
  });
}

async function correctPlacement({ body, context, principal, session, runtime, requestId }) {
  if (!exactCorrectionFields(body, CORRECTION_POST_FIELDS)) {
    return correctionBlocked(400, requestId, "OUTLOOK_EMAIL_CORRECTION_INVALID");
  }
  const sourceMatterId = requiredCorrectionString(body.source_matter_id, "source_matter_id");
  const targetMatterId = requiredCorrectionString(body.target_matter_id, "target_matter_id");
  if (
    !matterCorrectionPermissions(context, principal.tenant_id, sourceMatterId)
    || !matterCorrectionPermissions(context, principal.tenant_id, targetMatterId, { target: true })
  ) return correctionBlocked(403, requestId, "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED");
  const matterRepository = runtime?.matterRuntime?.repository;
  assertActiveCorrectionMatter(matterRepository, principal.tenant_id, sourceMatterId);
  assertActiveCorrectionMatter(matterRepository, principal.tenant_id, targetMatterId);
  const { service, originalResolver } = correctionService({
    runtime,
    context,
    principal,
    session,
  });
  const result = await service.correct({
    session,
    email_thread_id: requiredCorrectionString(body.email_thread_id, "email_thread_id"),
    original_receipt_id: requiredCorrectionString(body.original_receipt_id, "original_receipt_id"),
    document_id: requiredCorrectionString(body.document_id, "document_id"),
    mime_sha256: requiredCorrectionString(body.mime_sha256, "mime_sha256"),
    source_matter_id: sourceMatterId,
    target_matter_id: targetMatterId,
    prior_placement_id: requiredCorrectionString(body.expected_placement_id, "expected_placement_id"),
    reason: requiredCorrectionString(body.reason, "reason"),
    idempotency_key: requiredCorrectionString(body.idempotency_key, "idempotency_key"),
  });
  const projection = assertOutlookEmailFilingCorrectionProjection(
    matterRepository,
    result.correction,
    originalResolver.getDocumentBinding(result.correction),
  );
  return correctionResponse(result.outcome === "created" ? 201 : 200, {
    request_id: requestId,
    outcome: result.outcome,
    item: safeCorrectionPlacement(result.current_placement),
    timeline_events: safeCorrectionTimelines(projection.timeline_events),
    idempotency_fingerprint: result.correction.payload_fingerprint,
    idempotent_replay: result.outcome === "idempotent_replay",
    audit_event_id: projection.audit.event_id,
  });
}

export async function handleOutlookEmailFilingCorrection(input = {}) {
  const { method, query = {}, body = {}, context, requestId, runtime } = input;
  try {
    const principal = correctionPrincipal(context);
    const session = Object.freeze({ request_id: requestId });
    if (method === "GET") {
      return await currentPlacement({ query, context, principal, session, runtime, requestId });
    }
    if (method === "POST") {
      return await correctPlacement({ body, context, principal, session, runtime, requestId });
    }
    return correctionBlocked(400, requestId, "OUTLOOK_EMAIL_CORRECTION_INVALID");
  } catch (error) {
    return mapCorrectionError(error, requestId);
  }
}
