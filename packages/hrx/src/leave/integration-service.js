import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { normalizeHrxProviderDeliveryState } from "../provider-receipt-contract.js";
import {
  createMatterLeaveCalendarAdapter,
  resolveLeaveIntegrationProviderSwitches,
} from "./provider-adapters.js";

const PROVIDER_KINDS = Object.freeze(["schedule", "attendance", "payroll", "notification"]);
const PROVIDER_RESULT_RANK = Object.freeze({ queued: 0, sent: 1, delivered: 2, read: 3 });

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function opaqueProviderValue(input, field, maxLength = 255) {
  const value = requiredString(input, field);
  if (value.length > maxLength || !/^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(value)) {
    throw guardedError(`${field} is invalid`, "HRX_LEAVE_PROVIDER_EVENT_INVALID", 400);
  }
  return value;
}

function opaqueProviderReceiptRef(input) {
  const value = requiredString(input, "provider_receipt_ref");
  if (
    value.length > 512
    || !/^[A-Za-z][A-Za-z0-9_-]*:[^\s@]+$/.test(value)
    || /bearer|password|client[_-]?secret|access[_-]?token/i.test(value)
  ) {
    throw guardedError("provider_receipt_ref is invalid", "HRX_LEAVE_PROVIDER_EVENT_INVALID", 400);
  }
  return value;
}

function isoTimestamp(input, field) {
  const value = requiredString(input, field);
  if (Number.isNaN(Date.parse(value))) throw guardedError(`${field} is invalid`, "HRX_LEAVE_PROVIDER_EVENT_INVALID", 400);
  return new Date(value).toISOString();
}

function sha256Value(input, field) {
  const value = requiredString(input, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(value)) throw guardedError(`${field} is invalid`, "HRX_LEAVE_PROVIDER_EVENT_INVALID", 400);
  return value;
}

function parseJson(value, fallback = {}) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function safeErrorCode(error) {
  const candidate = error?.safe_error_code;
  return typeof candidate === "string" && /^[A-Z0-9_]{3,80}$/.test(candidate)
    ? candidate
    : "LEAVE_PROVIDER_DELIVERY_FAILED";
}

function providerErrorCode(result, fallback) {
  for (const candidate of [result?.safe_error_code, result?.error_code]) {
    if (typeof candidate === "string" && /^[A-Z0-9_]{3,80}$/.test(candidate)) return candidate;
  }
  return fallback;
}

function providerResultState(providerKind, result, providerReceiptRef) {
  const deliveryStates = ["accepted", "queued", "sent", "delivered", "read", "failed", "unknown"];
  const reportedState = result?.delivery_state
    ?? (deliveryStates.includes(result?.status) ? result.status : null)
    ?? (deliveryStates.includes(result?.state) ? result.state : null);
  const deliveryState = reportedState === "accepted" ? "sent" : reportedState;
  const receiptStates = ["pending", "succeeded", "failed"];
  const state = receiptStates.includes(result?.state)
    ? result.state
    : receiptStates.includes(result?.status)
      ? result.status
      : providerReceiptRef
        ? "succeeded"
        : "pending";
  return normalizeHrxProviderDeliveryState({
    state,
    provider_kind: providerKind === "schedule"
      ? "calendar"
      : providerKind === "notification"
        ? "delivery"
        : providerKind,
    ...(deliveryState == null ? {} : { delivery_state: deliveryState }),
    delivery_evidence_verified: result?.delivery_evidence_verified === true,
    read_evidence_verified: result?.read_evidence_verified === true,
  });
}

function requestContext(store, outbox) {
  const requestId = outbox.aggregate_type === "LeaveRequest"
    ? outbox.aggregate_id
    : parseJson(outbox.payload_json, {}).request_id;
  if (!requestId) return null;
  const request = store.query("selectOne", {
    table: "hrx_leave_requests",
    where: { tenant_id: outbox.tenant_id, request_id: requestId },
  });
  if (!request) return null;
  const segments = store.query("select", {
    table: "hrx_leave_request_segments",
    where: { tenant_id: outbox.tenant_id, request_id: requestId },
  }).sort((left, right) => left.segment_date.localeCompare(right.segment_date));
  const leaveType = request.leave_type_id
    ? store.query("selectOne", {
        table: "hrx_leave_types",
        where: { tenant_id: outbox.tenant_id, leave_type_id: request.leave_type_id },
      })
    : null;
  const policy = request.policy_version_id
    ? store.query("selectOne", {
        table: "hrx_leave_policy_versions",
        where: { tenant_id: outbox.tenant_id, policy_version_id: request.policy_version_id },
      })
    : null;
  return Object.freeze({ request, segments, leaveType, policy });
}

function payStatus(context) {
  const typeRules = parseJson(context.leaveType?.evidence_rule_json, {});
  const policyRules = parseJson(context.policy?.rules_json, {});
  const configured = typeRules.pay_status ?? policyRules.pay_status ?? policyRules.payroll?.pay_status;
  if (["paid", "unpaid"].includes(configured)) return configured;
  return context.leaveType?.code === "UNPAID" || context.request.leave_type === "UNPAID" ? "unpaid" : "paid";
}

function payrollMinutes(context) {
  const { request } = context;
  if (typeof request.policy_rules_snapshot_hash === "string") {
    const fields = ["rounded_requested_minutes", "paid_minutes", "unpaid_minutes"];
    if (fields.some((field) => !Number.isInteger(request[field]) || request[field] < 0)
      || request.rounded_requested_minutes <= 0
      || request.paid_minutes + request.unpaid_minutes !== request.rounded_requested_minutes) {
      throw guardedError("Leave payroll snapshot is invalid", "HRX_LEAVE_PAYROLL_SNAPSHOT_INVALID");
    }
    return Object.freeze({
      paid_minutes: request.paid_minutes,
      unpaid_minutes: request.unpaid_minutes,
    });
  }
  const status = payStatus(context);
  return Object.freeze({
    paid_minutes: status === "paid" ? request.requested_minutes : 0,
    unpaid_minutes: status === "unpaid" ? request.requested_minutes : 0,
  });
}

function notificationTitle(eventType) {
  if (eventType === "leave.request.submitted") return "휴가 신청이 접수되었습니다";
  if (eventType === "leave.request.approved") return "휴가 신청이 승인되었습니다";
  if (eventType === "leave.request.rejected") return "휴가 신청 결과를 확인해 주세요";
  if (eventType.includes("reschedule")) return "휴가 일정 변경 요청을 확인해 주세요";
  if (eventType === "leave.approval.escalated" || eventType.includes("deadline")) return "휴가 처리 마감을 확인해 주세요";
  if (eventType.startsWith("leave.promotion.")) return "연차 사용 촉진 안내를 확인해 주세요";
  if (eventType.includes("cancelled")) return "휴가 신청 상태가 변경되었습니다";
  if (eventType.includes("additional_information")) return "휴가 신청의 추가 확인 항목이 있습니다";
  return "휴가 신청 상태를 확인해 주세요";
}

function targetsFor(eventType) {
  if (eventType === "leave.request.approved" || eventType === "leave.request.cancelled_after_approval") {
    return PROVIDER_KINDS;
  }
  if (eventType === "leave.termination.payroll_reconciliation_requested") return Object.freeze(["payroll"]);
  if (eventType.startsWith("leave.request.") || eventType.startsWith("leave.approval.") || eventType.startsWith("leave.promotion.")) {
    return Object.freeze(["notification"]);
  }
  return Object.freeze([]);
}

function payloadFor(store, outbox, providerKind) {
  const context = requestContext(store, outbox);
  const isCancellation = outbox.event_type === "leave.request.cancelled_after_approval";
  if (providerKind === "notification") {
    const source = parseJson(outbox.payload_json, {});
    const isPromotionNotice = /^leave\.promotion\.(first|second)_notice_issued$/.test(outbox.event_type);
    const recipientSeed = context?.request.employee_id ?? source.recipient_ref ?? outbox.aggregate_id;
    if (isPromotionNotice) {
      return Object.freeze({
        schema_version: "law-firm-os.hrx.leave-promotion-delivery.v0.1",
        event_code: outbox.event_type,
        title: notificationTitle(outbox.event_type),
        recipient_token: digest(`${outbox.tenant_id}:${recipientSeed}`).slice(0, 24),
        recipient_ref: requiredString(source, "recipient_ref"),
        promotion_recipient_ref: requiredString(source, "promotion_recipient_ref"),
        campaign_ref: requiredString(source, "campaign_ref"),
        document_ref: requiredString(source, "document_ref"),
        content_hash: requiredString(source, "content_hash"),
        document_version: requiredString(source, "document_version"),
        notice_stage: requiredString(source, "notice_stage"),
        deadline_at: requiredString(source, "deadline_at"),
        channels: Object.freeze(Array.isArray(source.channels) ? source.channels : []),
        route: "people-annual-leave-notices",
        private_fields_included: false,
        recipient_address_included: false,
        document_body_included: false,
        requested_dates_included: false,
        log_context: Object.freeze({ event_code: outbox.event_type }),
      });
    }
    return Object.freeze({
      schema_version: "law-firm-os.hrx.leave-notification.v0.1",
      event_code: outbox.event_type,
      title: notificationTitle(outbox.event_type),
      recipient_token: digest(`${outbox.tenant_id}:${recipientSeed}`).slice(0, 24),
      route: outbox.event_type.startsWith("leave.promotion.") ? "people-annual-leave-notices" : "people-leave-requests",
      private_fields_included: false,
      requested_dates_included: false,
      log_context: Object.freeze({ event_code: outbox.event_type }),
    });
  }
  if (providerKind === "payroll" && outbox.event_type === "leave.termination.payroll_reconciliation_requested") {
    const source = parseJson(outbox.payload_json, {});
    return Object.freeze({
      schema_version: "law-firm-os.hrx.leave-termination-payroll-boundary.v0.1",
      operation: "reconcile_termination",
      employee_id: source.employee_id,
      termination_date: source.termination_date,
      totals: source.totals,
      groups: source.groups,
      raw_compensation_amount_included: false,
    });
  }
  if (!context) throw guardedError("Leave integration request source was not found", "HRX_LEAVE_INTEGRATION_SOURCE_NOT_FOUND", 404);
  const { request, segments } = context;
  if (providerKind === "schedule") {
    return Object.freeze({
      schema_version: "law-firm-os.hrx.leave-schedule-projection.v0.1",
      operation: isCancellation ? "delete" : "upsert",
      schedule_object_ref: `LeaveSchedule:${request.request_id}`,
      owner_ref: `HRXEmployee:${request.employee_id}`,
      start_date: request.start_date,
      end_date: request.end_date,
      timezone: request.timezone,
      public_title: "휴가",
      coworker_visibility: "title_only",
      leave_type_included: false,
      reason_included: false,
      attachments_included: false,
      documents_included: false,
      private_description_included: false,
    });
  }
  if (providerKind === "attendance") {
    return Object.freeze({
      schema_version: "law-firm-os.hrx.leave-attendance-projection.v0.1",
      operation: isCancellation ? "reverse" : "apply",
      employee_id: request.employee_id,
      days: Object.freeze(segments.map((segment) => Object.freeze({
        work_date: segment.segment_date,
        scheduled_minutes: segment.scheduled_minutes,
        leave_minutes: segment.requested_minutes,
        remaining_work_minutes: segment.scheduled_minutes - segment.requested_minutes,
        unexcused_absence_minutes: 0,
        absence_judgment: "approved_leave_excluded",
      }))),
    });
  }
  const minutes = payrollMinutes(context);
  return Object.freeze({
    schema_version: "law-firm-os.hrx.leave-payroll-boundary.v0.1",
    operation: isCancellation ? "reverse" : "apply",
    employee_id: request.employee_id,
    request_id: request.request_id,
    paid_minutes: minutes.paid_minutes,
    unpaid_minutes: minutes.unpaid_minutes,
    policy_snapshot_ref: Object.freeze({
      policy_version_id: request.policy_version_id ?? null,
      policy_rules_snapshot_hash: request.policy_rules_snapshot_hash ?? null,
    }),
    raw_compensation_amount_included: false,
    payroll_rate_calculated: false,
  });
}

function deliveryView(row) {
  const { payload_json: payloadJson, ...delivery } = row;
  const providerKind = row.provider_kind === "schedule"
    ? "calendar"
    : row.provider_kind === "notification"
      ? "delivery"
      : row.provider_kind;
  const providerResultState = row.provider_result_state ?? normalizeHrxProviderDeliveryState({
    state: row.state,
    provider_kind: providerKind,
    provider_receipt_ref: row.provider_receipt_ref,
    delivery_evidence_verified: row.state === "delivered" && row.provider_kind !== "notification",
  });
  return Object.freeze({
    ...delivery,
    provider_result_state: providerResultState,
    payload: Object.freeze(parseJson(payloadJson, {})),
  });
}

function providerEventDeliveryView(row) {
  const delivery = deliveryView(row);
  return Object.freeze({
    delivery_id: delivery.delivery_id,
    provider_kind: delivery.provider_kind,
    state: delivery.state,
    provider_result_state: delivery.provider_result_state,
    attempt_count: delivery.attempt_count,
    last_error_code: delivery.last_error_code,
    provider_receipt_ref: delivery.provider_receipt_ref,
    delivered_at: delivery.delivered_at,
  });
}

export function createInternalLeaveIntegrationProviders() {
  const receipts = new Map();
  const providers = Object.fromEntries(PROVIDER_KINDS.map((providerKind) => [providerKind, Object.freeze({
    mode: "internal_projection",
    async deliver(input) {
      const key = requiredString(input, "idempotency_key");
      const payloadHash = digest(input.payload);
      const existing = receipts.get(key);
      if (existing && existing.payload_hash !== payloadHash) {
        throw guardedError("Provider idempotency key was reused with a different payload", "HRX_LEAVE_PROVIDER_IDEMPOTENCY_REUSED");
      }
      const receipt = existing ?? Object.freeze({
        payload_hash: payloadHash,
        provider_receipt_ref: `InternalLeaveProjection:${providerKind}:${digest(key).slice(0, 24)}`,
        delivery_state: "delivered",
      });
      receipts.set(key, receipt);
      return Object.freeze({
        provider_receipt_ref: receipt.provider_receipt_ref,
        delivery_state: receipt.delivery_state,
      });
    },
  })]));
  providers.schedule = createMatterLeaveCalendarAdapter();
  return Object.freeze(providers);
}

export function createLeaveIntegrationService({
  store,
  providers = {},
  providerEnabled = {},
  terminationDeliveryRecorder,
  promotionDeliveryRecorder,
  clock = () => new Date().toISOString(),
  retryDelayMs = 60_000,
  maxDeliveryAttempts = 3,
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
} = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("leave integration service requires a transactional store");
  }
  const providerSwitches = resolveLeaveIntegrationProviderSwitches(providerEnabled);
  const audit = createSqlHrxAuditEventStore({ store });

  function tenantDeadLetter(tenantId, deliveryId) {
    return store.query("selectOne", {
      table: "hrx_leave_integration_dead_letters",
      where: { tenant_id: tenantId, delivery_id: deliveryId },
    });
  }

  function upsertDeadLetter(outbox, delivery, errorCode) {
    const existing = tenantDeadLetter(delivery.tenant_id, delivery.delivery_id);
    const now = clock();
    if (existing) {
      return store.query("updateOne", {
        table: "hrx_leave_integration_dead_letters",
        where: { tenant_id: delivery.tenant_id, dead_letter_id: existing.dead_letter_id },
        patch: {
          state: "open",
          fail_count: Number(delivery.attempt_count ?? 0),
          last_error_code: errorCode,
          requeued_at: null,
          requeued_by_actor_id: null,
          resolved_at: null,
          updated_at: now,
        },
      });
    }
    return store.query("insert", {
      table: "hrx_leave_integration_dead_letters",
      row: {
        tenant_id: delivery.tenant_id,
        dead_letter_id: `leave_dead_letter_${digest(`${delivery.tenant_id}:${delivery.delivery_id}`).slice(0, 28)}`,
        outbox_event_id: outbox.outbox_event_id,
        delivery_id: delivery.delivery_id,
        provider_kind: delivery.provider_kind,
        state: "open",
        fail_count: Number(delivery.attempt_count ?? 0),
        last_error_code: errorCode,
        idempotency_key: `dead-letter:${delivery.idempotency_key}`,
        created_at: now,
        requeued_at: null,
        requeued_by_actor_id: null,
        resolved_at: null,
        updated_at: now,
      },
    });
  }

  function resolveDeadLetter(delivery) {
    const existing = tenantDeadLetter(delivery.tenant_id, delivery.delivery_id);
    if (!existing || existing.state === "resolved") return existing;
    return store.query("updateOne", {
      table: "hrx_leave_integration_dead_letters",
      where: { tenant_id: delivery.tenant_id, dead_letter_id: existing.dead_letter_id },
      patch: { state: "resolved", resolved_at: clock(), updated_at: clock() },
    });
  }

  function appendAudit(context, outbox, providerKind, state, attemptCount, errorCode = null) {
    audit.append({
      event_id: idFactory("leave_integration_audit"),
      tenant_id: outbox.tenant_id,
      actor_id: requiredString(context, "actor_id"),
      action: `hrx.leave.integration.${providerKind}.${state}`,
      object_type: "LeaveIntegrationDelivery",
      object_id: outbox.outbox_event_id,
      decision: state === "delivered" ? "allow" : "review_required",
      reason: `leave_integration_${state}`,
      occurred_at: clock(),
      metadata: { outbox_event_id: outbox.outbox_event_id, event_type: outbox.event_type, provider_kind: providerKind, attempt_count: attemptCount, error_code: errorCode },
    });
  }

  function ensureDelivery(outbox, providerKind) {
    const payload = payloadFor(store, outbox, providerKind);
    const payloadHash = digest(payload);
    const existing = store.query("selectOne", {
      table: "hrx_leave_integration_deliveries",
      where: { tenant_id: outbox.tenant_id, outbox_event_id: outbox.outbox_event_id, provider_kind: providerKind },
    });
    if (existing) {
      if (existing.payload_hash !== payloadHash) {
        throw guardedError("Leave integration payload changed after enqueue", "HRX_LEAVE_INTEGRATION_PAYLOAD_CHANGED");
      }
      return existing;
    }
    const provider = providers[providerKind];
    const providerMode = typeof provider === "object" && provider?.mode ? provider.mode : provider ? "configured" : "not_configured";
    const idempotencyKey = `${outbox.idempotency_key}:${providerKind}`;
    return store.query("insert", { table: "hrx_leave_integration_deliveries", row: {
      tenant_id: outbox.tenant_id,
      delivery_id: `leave_delivery_${digest(`${outbox.tenant_id}:${outbox.outbox_event_id}:${providerKind}`).slice(0, 28)}`,
      outbox_event_id: outbox.outbox_event_id,
      provider_kind: providerKind,
      provider_mode: providerMode,
      event_type: outbox.event_type,
      state: "pending_sync",
      provider_result_state: "queued",
      payload_hash: payloadHash,
      payload_json: JSON.stringify(payload),
      idempotency_key: idempotencyKey,
      attempt_count: 0,
      last_error_code: null,
      provider_receipt_ref: null,
      delivered_at: null,
      created_at: clock(),
      updated_at: clock(),
    } });
  }

  function recordPromotionProviderResult(context, outbox, current, resultState, providerReceiptRef, occurredAt = clock()) {
    if (!/^leave\.promotion\.(first|second)_notice_issued$/.test(outbox.event_type)) return;
    if (!["delivered", "read", "failed"].includes(resultState)) return;
    if (typeof promotionDeliveryRecorder !== "function") {
      throw guardedError("Leave promotion delivery recorder is not configured", "HRX_LEAVE_PROMOTION_RECORDER_NOT_CONFIGURED");
    }
    const payload = parseJson(current.payload_json, {});
    const recipientRef = requiredString(payload, "promotion_recipient_ref");
    const recipientMatch = /^LeavePromotionRecipient:(.+)$/.exec(recipientRef);
    if (!recipientMatch) throw guardedError("Leave promotion recipient reference is invalid", "HRX_LEAVE_PROMOTION_RECIPIENT_REF_INVALID");
    const stage = requiredString(payload, "notice_stage");
    const evidenceInput = (eventType) => ({
      recipient_id: recipientMatch[1],
      stage,
      event_type: eventType,
      evidence_hash: eventType === "delivered"
        ? digest({
            payload_hash: current.payload_hash,
            provider_receipt_ref: providerReceiptRef,
            idempotency_key: current.idempotency_key,
          })
        : digest({
            payload_hash: current.payload_hash,
            provider_receipt_ref: providerReceiptRef || null,
            idempotency_key: current.idempotency_key,
            event_type: eventType,
          }),
      ...(eventType === "delivered" ? { provider_receipt_ref: providerReceiptRef } : {}),
      occurred_at: occurredAt,
      idempotency_key: eventType === "delivered"
        ? `promotion-delivery:${current.idempotency_key}`
        : `promotion-${eventType}:${current.idempotency_key}`,
    });
    if (resultState === "failed") {
      promotionDeliveryRecorder(context, evidenceInput("failed"));
      return;
    }
    promotionDeliveryRecorder(context, evidenceInput("delivered"));
    if (resultState === "read") promotionDeliveryRecorder(context, evidenceInput("viewed"));
  }

  function recordProviderResult(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    requiredString(context, "actor_id");
    const deliveryId = requiredString(input, "delivery_id");
    const current = store.query("selectOne", {
      table: "hrx_leave_integration_deliveries",
      where: { tenant_id: tenantId, delivery_id: deliveryId },
    });
    if (!current) throw guardedError("Leave integration delivery not found", "HRX_LEAVE_INTEGRATION_DELIVERY_NOT_FOUND", 404);
    const outbox = store.query("selectOne", {
      table: "hrx_leave_sync_outbox",
      where: { tenant_id: tenantId, outbox_event_id: current.outbox_event_id },
    });
    if (!outbox) throw guardedError("Leave integration event not found", "HRX_LEAVE_INTEGRATION_EVENT_NOT_FOUND", 404);

    const reportedReceiptRef = typeof input.provider_receipt_ref === "string"
      ? input.provider_receipt_ref.trim()
      : "";
    const providerReceiptRef = reportedReceiptRef || current.provider_receipt_ref || "";
    const resultState = providerResultState(current.provider_kind, input, providerReceiptRef);
    const occurredAt = input.occurred_at == null ? clock() : isoTimestamp(input, "occurred_at");
    if (["sent", "delivered", "read"].includes(resultState) && !reportedReceiptRef) {
      throw guardedError("Leave provider result requires its receipt reference", "HRX_LEAVE_PROVIDER_RECEIPT_REQUIRED", 400);
    }
    if (current.provider_receipt_ref && reportedReceiptRef !== current.provider_receipt_ref) {
      throw guardedError("Leave provider receipt does not match the delivery", "HRX_LEAVE_PROVIDER_RECEIPT_MISMATCH", 409);
    }
    if (current.provider_result_state === resultState) {
      return Object.freeze({ delivery: deliveryView(current), outbox: Object.freeze({ ...outbox }), replayed: true });
    }

    const currentRank = PROVIDER_RESULT_RANK[current.provider_result_state];
    const targetRank = PROVIDER_RESULT_RANK[resultState];
    if (Number.isInteger(targetRank)) {
      if (targetRank === 0) {
        throw guardedError("Leave provider callback cannot return to queued", "HRX_LEAVE_PROVIDER_RESULT_OUT_OF_ORDER", 409);
      }
      if (Number.isInteger(currentRank) && (targetRank < currentRank || targetRank > currentRank + 1)) {
        throw guardedError("Leave provider result cannot move backward", "HRX_LEAVE_PROVIDER_RESULT_OUT_OF_ORDER", 409);
      }
      recordPromotionProviderResult(context, outbox, current, resultState, providerReceiptRef, occurredAt);
      const updated = store.query("updateOne", {
        table: "hrx_leave_integration_deliveries",
        where: { tenant_id: tenantId, delivery_id: deliveryId },
        patch: {
          state: "delivered",
          provider_result_state: resultState,
          last_error_code: null,
          provider_receipt_ref: providerReceiptRef,
          delivered_at: current.delivered_at ?? occurredAt,
          updated_at: clock(),
        },
      });
      resolveDeadLetter(updated);
      appendAudit(context, outbox, current.provider_kind, resultState, Number(updated.attempt_count ?? 0));
      const allDeliveries = store.query("select", {
        table: "hrx_leave_integration_deliveries",
        where: { tenant_id: tenantId, outbox_event_id: outbox.outbox_event_id },
      });
      const updatedOutbox = finalizeOutbox(outbox, allDeliveries);
      return Object.freeze({ delivery: deliveryView(updated), outbox: Object.freeze({ ...updatedOutbox }), replayed: false });
    }

    if (
      !["failed", "unknown"].includes(resultState)
      || ["delivered", "read"].includes(current.provider_result_state)
      || (resultState === "unknown" && Number.isInteger(currentRank) && currentRank >= PROVIDER_RESULT_RANK.sent)
    ) {
      throw guardedError("Leave provider result is out of order", "HRX_LEAVE_PROVIDER_RESULT_OUT_OF_ORDER", 409);
    }
    const errorCode = providerErrorCode(
      input,
      resultState === "failed" ? "HRX_LEAVE_PROVIDER_REPORTED_FAILED" : "HRX_LEAVE_PROVIDER_RESULT_UNKNOWN",
    );
    recordPromotionProviderResult(context, outbox, current, resultState, "", occurredAt);
    const updated = store.query("updateOne", {
      table: "hrx_leave_integration_deliveries",
      where: { tenant_id: tenantId, delivery_id: deliveryId },
      patch: {
        state: resultState === "failed" ? "failed" : "pending_sync",
        provider_result_state: resultState,
        last_error_code: errorCode,
        provider_receipt_ref: resultState === "unknown" ? providerReceiptRef || null : null,
        delivered_at: null,
        updated_at: clock(),
      },
    });
    appendAudit(context, outbox, current.provider_kind, resultState, Number(updated.attempt_count ?? 0), errorCode);
    const allDeliveries = store.query("select", {
      table: "hrx_leave_integration_deliveries",
      where: { tenant_id: tenantId, outbox_event_id: outbox.outbox_event_id },
    });
    const updatedOutbox = finalizeOutbox(outbox, allDeliveries);
    return Object.freeze({ delivery: deliveryView(updated), outbox: Object.freeze({ ...updatedOutbox }), replayed: false });
  }

  function applyProviderEvent(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const providerEventId = opaqueProviderValue(input, "provider_event_id");
    const providerId = opaqueProviderValue(input, "provider_id", 128);
    const providerReceiptRef = opaqueProviderReceiptRef(input);
    const providerEventState = requiredString(input, "provider_event_state").toLowerCase();
    if (!["accepted", "sent", "delivered", "read", "failed", "unknown"].includes(providerEventState)) {
      throw guardedError("Leave provider event state is unsupported", "HRX_LEAVE_PROVIDER_EVENT_STATE_UNKNOWN", 400);
    }
    const eventOccurredAt = isoTimestamp(input, "event_occurred_at");
    const payloadHash = sha256Value(input, "payload_hash");
    const eventId = `leave_provider_event_${digest(`${tenantId}:${providerEventId}`).slice(0, 28)}`;
    const existingEvent = store.query("selectOne", {
      table: "hrx_audit_events",
      where: { tenant_id: tenantId, event_id: eventId },
    });
    if (existingEvent) {
      const metadata = parseJson(existingEvent.metadata_json, {});
      const sameEvent = metadata.provider_event_id === providerEventId
        && metadata.provider_id === providerId
        && metadata.provider_receipt_ref === providerReceiptRef
        && metadata.provider_event_state === providerEventState
        && metadata.payload_hash === payloadHash
        && metadata.event_occurred_at === eventOccurredAt;
      if (!sameEvent) {
        throw guardedError("Leave provider event id was reused with different content", "HRX_LEAVE_PROVIDER_EVENT_CONFLICT", 409);
      }
      const replayDelivery = store.query("selectOne", {
        table: "hrx_leave_integration_deliveries",
        where: { tenant_id: tenantId, delivery_id: existingEvent.object_id },
      });
      if (!replayDelivery) throw guardedError("Leave integration delivery not found", "HRX_LEAVE_INTEGRATION_DELIVERY_NOT_FOUND", 404);
      return Object.freeze({
        outcome: "replayed",
        replayed: true,
        provider_event: Object.freeze({ provider_event_id: providerEventId, provider_event_state: providerEventState, event_occurred_at: eventOccurredAt }),
        delivery: providerEventDeliveryView(replayDelivery),
        raw_payload_included: false,
        private_fields_included: false,
        production_ready_claim: false,
      });
    }

    const matchingDeliveries = store.query("select", {
      table: "hrx_leave_integration_deliveries",
      where: { tenant_id: tenantId, provider_receipt_ref: providerReceiptRef },
    });
    if (matchingDeliveries.length !== 1) {
      throw guardedError("Leave provider receipt does not resolve one delivery", "HRX_LEAVE_PROVIDER_RECEIPT_NOT_FOUND", 404);
    }
    const delivery = matchingDeliveries[0];
    const provider = providers[delivery.provider_kind];
    if (typeof provider?.provider_id !== "string" || !provider.provider_id.trim()) {
      throw guardedError("Leave provider identity is not configured", "HRX_LEAVE_PROVIDER_IDENTITY_REQUIRED", 503);
    }
    if (provider.provider_id !== providerId) {
      throw guardedError("Leave provider identity does not match the delivery", "HRX_LEAVE_PROVIDER_ID_MISMATCH", 403);
    }
    const result = recordProviderResult(context, {
      delivery_id: delivery.delivery_id,
      provider_receipt_ref: providerReceiptRef,
      delivery_state: providerEventState,
      occurred_at: eventOccurredAt,
      ...(providerEventState === "failed" ? { error_code: providerErrorCode(input, "HRX_LEAVE_PROVIDER_REPORTED_FAILED") } : {}),
    });
    audit.append({
      event_id: eventId,
      tenant_id: tenantId,
      actor_id: actorId,
      action: `hrx.leave.integration.provider_event.${providerEventState}`,
      object_type: "LeaveIntegrationDelivery",
      object_id: delivery.delivery_id,
      decision: "allow",
      reason: "leave_integration_provider_event_recorded",
      occurred_at: eventOccurredAt,
      metadata: {
        provider_event_id: providerEventId,
        provider_id: providerId,
        provider_receipt_ref: providerReceiptRef,
        provider_event_state: providerEventState,
        payload_hash: payloadHash,
        event_occurred_at: eventOccurredAt,
        raw_payload_included: false,
      },
    });
    return Object.freeze({
      outcome: "applied",
      replayed: false,
      provider_event: Object.freeze({ provider_event_id: providerEventId, provider_event_state: providerEventState, event_occurred_at: eventOccurredAt }),
      delivery: providerEventDeliveryView(result.delivery),
      raw_payload_included: false,
      private_fields_included: false,
      production_ready_claim: false,
    });
  }

  async function deliver(context, outbox, current) {
    if (current.state === "delivered") return current;
    const openDeadLetter = tenantDeadLetter(current.tenant_id, current.delivery_id);
    if (openDeadLetter?.state === "open") return current;
    const provider = providers[current.provider_kind];
    const deliverFn = typeof provider === "function" ? provider : provider?.deliver;
    const attemptCount = Number(current.attempt_count ?? 0) + 1;
    if (providerSwitches[current.provider_kind] === false) {
      const updated = store.query("updateOne", {
        table: "hrx_leave_integration_deliveries",
        where: { tenant_id: current.tenant_id, delivery_id: current.delivery_id },
        patch: {
          state: "not_configured",
          provider_result_state: "unknown",
          attempt_count: attemptCount,
          last_error_code: "LEAVE_PROVIDER_DISABLED",
          provider_receipt_ref: null,
          delivered_at: null,
          updated_at: clock(),
        },
      });
      appendAudit(context, outbox, current.provider_kind, "not_configured", attemptCount, "LEAVE_PROVIDER_DISABLED");
      return updated;
    }
    if (typeof deliverFn !== "function") {
      const updated = store.query("updateOne", {
        table: "hrx_leave_integration_deliveries",
        where: { tenant_id: current.tenant_id, delivery_id: current.delivery_id },
        patch: {
          state: "not_configured",
          provider_result_state: "unknown",
          attempt_count: attemptCount,
          last_error_code: "LEAVE_PROVIDER_NOT_CONFIGURED",
          updated_at: clock(),
        },
      });
      appendAudit(context, outbox, current.provider_kind, "not_configured", attemptCount, "LEAVE_PROVIDER_NOT_CONFIGURED");
      return updated;
    }
    try {
      const result = await deliverFn.call(provider, {
        tenant_id: current.tenant_id,
        event_type: current.event_type,
        provider_kind: current.provider_kind,
        idempotency_key: current.idempotency_key,
        payload: parseJson(current.payload_json, {}),
      });
      const providerReceiptRef = typeof result?.provider_receipt_ref === "string" ? result.provider_receipt_ref.trim() : "";
      const resultState = providerResultState(current.provider_kind, result, providerReceiptRef);
      if (resultState === "failed") {
        const errorCode = providerErrorCode(result, "HRX_LEAVE_PROVIDER_REPORTED_FAILED");
        recordPromotionProviderResult(context, outbox, current, resultState, "");
        const updated = store.query("updateOne", {
          table: "hrx_leave_integration_deliveries",
          where: { tenant_id: current.tenant_id, delivery_id: current.delivery_id },
          patch: {
            state: "failed",
            provider_result_state: resultState,
            attempt_count: attemptCount,
            last_error_code: errorCode,
            provider_receipt_ref: null,
            delivered_at: null,
            updated_at: clock(),
          },
        });
        appendAudit(context, outbox, current.provider_kind, "failed", attemptCount, errorCode);
        if (attemptCount >= maxDeliveryAttempts) {
          upsertDeadLetter(outbox, updated, errorCode);
          appendAudit(context, outbox, current.provider_kind, "dead_lettered", attemptCount, errorCode);
        }
        return updated;
      }
      if (resultState === "unknown") {
        const errorCode = providerErrorCode(result, "HRX_LEAVE_PROVIDER_RESULT_UNKNOWN");
        const updated = store.query("updateOne", {
          table: "hrx_leave_integration_deliveries",
          where: { tenant_id: current.tenant_id, delivery_id: current.delivery_id },
          patch: {
            state: "pending_sync",
            provider_result_state: resultState,
            attempt_count: attemptCount,
            last_error_code: errorCode,
            provider_receipt_ref: providerReceiptRef || null,
            delivered_at: null,
            updated_at: clock(),
          },
        });
        appendAudit(context, outbox, current.provider_kind, "pending_sync", attemptCount, errorCode);
        if (attemptCount >= maxDeliveryAttempts) {
          upsertDeadLetter(outbox, updated, errorCode);
          appendAudit(context, outbox, current.provider_kind, "dead_lettered", attemptCount, errorCode);
        }
        return updated;
      }
      if (resultState === "queued" || !providerReceiptRef) {
        const errorCode = "HRX_PROVIDER_RECEIPT_PENDING";
        const updated = store.query("updateOne", {
          table: "hrx_leave_integration_deliveries",
          where: { tenant_id: current.tenant_id, delivery_id: current.delivery_id },
          patch: {
            state: "pending_sync",
            provider_result_state: "queued",
            attempt_count: attemptCount,
            last_error_code: errorCode,
            provider_receipt_ref: null,
            delivered_at: null,
            updated_at: clock(),
          },
        });
        appendAudit(context, outbox, current.provider_kind, "pending_sync", attemptCount, errorCode);
        return updated;
      }
      if (outbox.event_type === "leave.termination.payroll_reconciliation_requested") {
        if (typeof terminationDeliveryRecorder !== "function") {
          throw guardedError("Termination payroll delivery recorder is not configured", "HRX_LEAVE_TERMINATION_RECORDER_NOT_CONFIGURED");
        }
        terminationDeliveryRecorder(context, { outbox_event_id: outbox.outbox_event_id, provider_receipt: result?.provider_receipt });
      }
      recordPromotionProviderResult(context, outbox, current, resultState, providerReceiptRef);
      const updated = store.query("updateOne", {
        table: "hrx_leave_integration_deliveries",
        where: { tenant_id: current.tenant_id, delivery_id: current.delivery_id },
        patch: {
          state: "delivered",
          provider_result_state: resultState,
          attempt_count: attemptCount,
          last_error_code: null,
          provider_receipt_ref: providerReceiptRef,
          delivered_at: clock(),
          updated_at: clock(),
        },
      });
      resolveDeadLetter(updated);
      appendAudit(context, outbox, current.provider_kind, "delivered", attemptCount);
      return updated;
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const updated = store.query("updateOne", {
        table: "hrx_leave_integration_deliveries",
        where: { tenant_id: current.tenant_id, delivery_id: current.delivery_id },
        patch: {
          state: "failed",
          provider_result_state: "failed",
          attempt_count: attemptCount,
          last_error_code: errorCode,
          updated_at: clock(),
        },
      });
      appendAudit(context, outbox, current.provider_kind, "failed", attemptCount, errorCode);
      if (attemptCount >= maxDeliveryAttempts) {
        upsertDeadLetter(outbox, updated, errorCode);
        appendAudit(context, outbox, current.provider_kind, "dead_lettered", attemptCount, errorCode);
      }
      return updated;
    }
  }

  function finalizeOutbox(outbox, deliveries) {
    const allDelivered = deliveries.length > 0 && deliveries.every((delivery) => delivery.state === "delivered");
    const current = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: outbox.tenant_id, outbox_event_id: outbox.outbox_event_id } });
    if (allDelivered) {
      if (current.state === "delivered") return current;
      return store.query("updateOne", {
        table: "hrx_leave_sync_outbox",
        where: { tenant_id: outbox.tenant_id, outbox_event_id: outbox.outbox_event_id },
        patch: {
          state: "delivered",
          attempt_count: Number(current.attempt_count ?? 0) + 1,
          provider_receipt_ref: `LeaveIntegration:${digest(deliveries.map((delivery) => delivery.provider_receipt_ref)).slice(0, 24)}`,
          last_error_code: null,
          delivered_at: clock(),
          updated_at: clock(),
        },
      });
    }
    const firstError = deliveries.find((delivery) => delivery.state !== "delivered")?.last_error_code ?? "HRX_LEAVE_INTEGRATION_PENDING";
    const nextAttempt = new Date(Date.parse(clock()) + retryDelayMs).toISOString();
    return store.query("updateOne", {
      table: "hrx_leave_sync_outbox",
      where: { tenant_id: outbox.tenant_id, outbox_event_id: outbox.outbox_event_id },
      patch: { state: "pending_sync", attempt_count: Number(current.attempt_count ?? 0) + 1, available_at: nextAttempt, last_error_code: firstError, updated_at: clock() },
    });
  }

  async function processEvent(context, outbox) {
    const targets = targetsFor(outbox.event_type);
    if (targets.length === 0) {
      const updated = store.query("updateOne", {
        table: "hrx_leave_sync_outbox",
        where: { tenant_id: outbox.tenant_id, outbox_event_id: outbox.outbox_event_id },
        patch: { state: "pending_sync", attempt_count: Number(outbox.attempt_count ?? 0) + 1, last_error_code: "HRX_LEAVE_INTEGRATION_EVENT_UNSUPPORTED", updated_at: clock() },
      });
      return Object.freeze({ outbox: updated, deliveries: Object.freeze([]) });
    }
    const deliveries = [];
    for (const providerKind of targets) deliveries.push(await deliver(context, outbox, ensureDelivery(outbox, providerKind)));
    const updatedOutbox = finalizeOutbox(outbox, deliveries);
    return Object.freeze({ outbox: updatedOutbox, deliveries: Object.freeze(deliveries.map(deliveryView)) });
  }

  function list(context, { limit = 100 } = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const outbox = store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: tenantId } })
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
      .slice(0, Math.max(1, Math.min(Number(limit) || 100, 250)));
    const deliveries = store.query("select", { table: "hrx_leave_integration_deliveries", where: { tenant_id: tenantId } });
    const deadLetters = store.query("select", { table: "hrx_leave_integration_dead_letters", where: { tenant_id: tenantId } });
    const rows = outbox.map((event) => {
      const { payload_json: _payloadJson, ...eventView } = event;
      return Object.freeze({
        ...eventView,
        deliveries: Object.freeze(deliveries.filter((delivery) => delivery.outbox_event_id === event.outbox_event_id).map((delivery) => Object.freeze({
          ...deliveryView(delivery),
          dead_letter: deadLetters.find((candidate) => candidate.delivery_id === delivery.delivery_id) ?? null,
        }))),
      });
    });
    const summary = {
      pending_sync: rows.filter((row) => ["pending", "pending_sync"].includes(row.state)).length,
      delivered: rows.filter((row) => row.state === "delivered").length,
      failed_deliveries: deliveries.filter((row) => row.state === "failed").length,
      not_configured: deliveries.filter((row) => row.state === "not_configured").length,
      dead_lettered: deadLetters.filter((row) => row.state === "open").length,
      provider_results: Object.freeze(Object.fromEntries(
        ["queued", "sent", "delivered", "read", "failed", "unknown"].map((state) => [
          state,
          deliveries.filter((row) => deliveryView(row).provider_result_state === state).length,
        ]),
      )),
    };
    return Object.freeze({ summary: Object.freeze(summary), rows: Object.freeze(rows), dead_letters: Object.freeze(deadLetters) });
  }

  function retryDeadLetter(context, deadLetterId) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const current = store.query("selectOne", {
      table: "hrx_leave_integration_dead_letters",
      where: { tenant_id: tenantId, dead_letter_id: requiredString({ dead_letter_id: deadLetterId }, "dead_letter_id") },
    });
    if (!current) throw guardedError("Leave integration dead letter not found", "HRX_LEAVE_INTEGRATION_DEAD_LETTER_NOT_FOUND", 404);
    if (current.state !== "open") throw guardedError("Leave integration dead letter is not open", "HRX_LEAVE_INTEGRATION_DEAD_LETTER_STATE_CONFLICT");
    const now = clock();
    const updated = store.query("updateOne", {
      table: "hrx_leave_integration_dead_letters",
      where: { tenant_id: tenantId, dead_letter_id: current.dead_letter_id },
      patch: { state: "requeued", requeued_at: now, requeued_by_actor_id: actorId, updated_at: now },
    });
    store.query("updateOne", {
      table: "hrx_leave_sync_outbox",
      where: { tenant_id: tenantId, outbox_event_id: current.outbox_event_id },
      patch: { state: "pending_sync", available_at: now, updated_at: now },
    });
    store.query("updateOne", {
      table: "hrx_leave_integration_deliveries",
      where: { tenant_id: tenantId, delivery_id: current.delivery_id },
      patch: {
        state: "pending_sync",
        provider_result_state: "queued",
        last_error_code: null,
        provider_receipt_ref: null,
        delivered_at: null,
        updated_at: now,
      },
    });
    audit.append({
      event_id: idFactory("leave_integration_requeue_audit"),
      tenant_id: tenantId,
      actor_id: actorId,
      action: "hrx.leave.integration.dead_letter.requeue",
      object_type: "LeaveIntegrationDeadLetter",
      object_id: current.dead_letter_id,
      decision: "allow",
      reason: "leave_integration_dead_letter_requeued",
      occurred_at: now,
      metadata: { outbox_event_id: current.outbox_event_id, delivery_id: current.delivery_id, provider_kind: current.provider_kind, fail_count: current.fail_count },
    });
    return Object.freeze({ ...updated });
  }

  async function process(context, { limit = 25, event_ids: eventIds, aggregate_types: aggregateTypes, force = false } = {}) {
    const tenantId = requiredString(context, "tenant_id");
    requiredString(context, "actor_id");
    const now = clock();
    const eventSet = Array.isArray(eventIds) ? new Set(eventIds) : null;
    const aggregateSet = Array.isArray(aggregateTypes) ? new Set(aggregateTypes) : null;
    const candidates = store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: tenantId } })
      .filter((event) => ["pending", "pending_sync", "failed"].includes(event.state))
      .filter((event) => force || !event.available_at || event.available_at <= now)
      .filter((event) => !eventSet || eventSet.has(event.outbox_event_id))
      .filter((event) => !aggregateSet || aggregateSet.has(event.aggregate_type))
      .filter((event) => !store.query("select", { table: "hrx_leave_integration_dead_letters", where: { tenant_id: tenantId, outbox_event_id: event.outbox_event_id, state: "open" } }).length)
      .sort((left, right) => String(left.available_at).localeCompare(String(right.available_at)) || String(left.created_at).localeCompare(String(right.created_at)))
      .slice(0, Math.max(1, Math.min(Number(limit) || 25, 100)));
    const results = [];
    for (const outbox of candidates) results.push(await processEvent(context, outbox));
    return Object.freeze({ processed_count: results.length, results: Object.freeze(results), status: list(context) });
  }

  return Object.freeze({ list, process, recordProviderResult, applyProviderEvent, retryDeadLetter });
}
