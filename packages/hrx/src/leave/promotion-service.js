import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { calculateLeavePromotionBalances } from "./promotion-balance.js";

export const LEAVE_PROMOTION_SCHEDULE_PROFILES = Object.freeze([
  Object.freeze({ id: "kr_lsa61_standard_v2025_10_23", label: "1년 이상 일반 연차", first_months_before: 6, first_window_days: 10, response_days: 10, second_months_before: 2, legal_basis_code: "KR_LSA_ARTICLE_61", legal_basis_version: "effective_2025-10-23" }),
  Object.freeze({ id: "kr_lsa61_first_year_v2025_10_23", label: "최초 1년 근로기간", first_months_before: 3, first_window_days: 10, response_days: 10, second_months_before: 1, legal_basis_code: "KR_LSA_ARTICLE_61", legal_basis_version: "effective_2025-10-23" }),
  Object.freeze({ id: "kr_lsa61_first_year_late_accrual_v2025_10_23", label: "최초 1년 후발 발생 연차", first_months_before: 1, first_window_days: 5, response_days: 10, second_days_before: 10, legal_basis_code: "KR_LSA_ARTICLE_61", legal_basis_version: "effective_2025-10-23" }),
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalIso(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new TypeError(`${field} must be an ISO timestamp`);
  return date.toISOString();
}

function isoDate(value, field) {
  const text = requiredString({ [field]: value }, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) throw new TypeError(`${field} must be an ISO date`);
  return text;
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

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function shiftMonths(value, months) {
  const source = new Date(`${value}T00:00:00Z`);
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return dateKey(target);
}

function seoulEndOfDay(value) {
  return new Date(`${value}T23:59:59+09:00`).toISOString();
}

function scheduleFor(periodEnd, profile) {
  const boundary = addDays(periodEnd, 1);
  const firstWindowStart = shiftMonths(boundary, -profile.first_months_before);
  const firstDeadline = addDays(firstWindowStart, profile.first_window_days - 1);
  const secondDeadline = profile.second_months_before
    ? addDays(shiftMonths(boundary, -profile.second_months_before), -1)
    : addDays(boundary, -profile.second_days_before);
  return Object.freeze({
    timezone: "Asia/Seoul",
    period_end_exclusive: boundary,
    first_notice_window_start: firstWindowStart,
    first_notice_deadline_at: seoulEndOfDay(firstDeadline),
    employee_response_days: profile.response_days,
    second_notice_deadline_at: seoulEndOfDay(secondDeadline),
    actual_processing_timestamps_separate: true,
  });
}

function allowedEmployeeIds(context) {
  if (!Array.isArray(context?.authorized_employee_ids)) throw guardedError("Trusted promotion employee scope is required", "HRX_LEAVE_PROMOTION_SCOPE_REQUIRED", 403);
  return new Set(context.authorized_employee_ids.filter((value) => typeof value === "string" && value.trim()));
}

function policyPromotionRules(policy) {
  const rules = parseJson(policy.rules_json, {});
  const promotion = rules.promotion && typeof rules.promotion === "object" ? rules.promotion : rules;
  const standardDayMinutes = Number(promotion.standard_day_minutes);
  const thresholdMinutes = Number(promotion.minimum_unused_minutes);
  if (!Number.isInteger(standardDayMinutes) || standardDayMinutes <= 0) throw guardedError("Policy promotion standard_day_minutes is required", "HRX_LEAVE_PROMOTION_DAY_MINUTES_REQUIRED");
  if (!Number.isInteger(thresholdMinutes) || thresholdMinutes <= 0) throw guardedError("Policy promotion minimum_unused_minutes is required", "HRX_LEAVE_PROMOTION_THRESHOLD_REQUIRED");
  return Object.freeze({ standard_day_minutes: standardDayMinutes, threshold_minutes: thresholdMinutes });
}

function noticeContentSnapshot({ campaign, recipient, stage, documentVersion }) {
  const first = stage === "first";
  return Object.freeze({
    schema_version: "law-firm-os.leave-promotion-notice.v1",
    document_type: "annual_leave_promotion_notice",
    document_version: documentVersion,
    title: first ? "연차휴가 사용 시기 지정 촉구서" : "연차휴가 사용 시기 지정 통보서",
    notice_stage: stage,
    campaign_id: recipient.campaign_id,
    recipient_id: recipient.recipient_id,
    target_employee_ref: `HRXEmployee:${recipient.employee_id}`,
    policy_version_id: campaign.policy_version_id,
    entitlement_period_end: campaign.entitlement_period_end,
    unused_minutes: recipient.unused_minutes,
    standard_day_minutes: recipient.standard_day_minutes,
    unused_days: recipient.unused_days,
    deadline_at: first ? recipient.first_notice_deadline_at : recipient.second_notice_deadline_at,
    legal_basis_code: campaign.legal_basis_code,
    legal_basis_version: campaign.legal_basis_version,
    legal_basis_effective_from: campaign.legal_basis_effective_from,
    timezone: campaign.timezone,
    source_version: recipient.source_version,
  });
}

function scheduleProfile(id) {
  const profile = LEAVE_PROMOTION_SCHEDULE_PROFILES.find((candidate) => candidate.id === id);
  if (!profile) throw guardedError("Unsupported leave promotion schedule profile", "HRX_LEAVE_PROMOTION_SCHEDULE_UNSUPPORTED", 400);
  return profile;
}

function recipientView(row, evidenceReceipts = []) {
  return Object.freeze({
    ...row,
    response: Object.freeze(parseJson(row.response_json, {})),
    response_json: undefined,
    late_reasons: Object.freeze(parseJson(row.late_reasons_json, [])),
    late_reasons_json: undefined,
    evidence_receipts: Object.freeze(evidenceReceipts.map((receipt) => Object.freeze({ ...receipt }))),
  });
}

function campaignView(row, recipients, evidenceReceipts = []) {
  const receiptsByRecipient = new Map();
  for (const receipt of evidenceReceipts) {
    if (!receiptsByRecipient.has(receipt.recipient_id)) receiptsByRecipient.set(receipt.recipient_id, []);
    receiptsByRecipient.get(receipt.recipient_id).push(receipt);
  }
  return Object.freeze({
    ...row,
    legal_schedule: Object.freeze(parseJson(row.legal_schedule_json, {})),
    legal_schedule_json: undefined,
    exclusions: Object.freeze(parseJson(row.exclusions_json, [])),
    exclusions_json: undefined,
    recipients: Object.freeze(recipients.map((recipient) => recipientView(recipient, receiptsByRecipient.get(recipient.recipient_id) ?? []))),
  });
}

function evidenceHash(value) {
  const normalized = requiredString({ evidence_hash: value }, "evidence_hash").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new TypeError("evidence_hash must be a SHA-256 hex digest");
  return normalized;
}

function ensurePromotionOutbox(target, { tenantId, recipientId, eventType, payload, idempotencyKey, availableAt, now, idFactory }) {
  const existing = target.query("selectOne", {
    table: "hrx_leave_sync_outbox",
    where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
  });
  if (existing) return existing;
  return target.query("insert", { table: "hrx_leave_sync_outbox", row: {
    tenant_id: tenantId,
    outbox_event_id: idFactory("leave_promotion_outbox"),
    aggregate_type: "LeavePromotionRecipient",
    aggregate_id: recipientId,
    event_type: eventType,
    payload_json: JSON.stringify(payload),
    idempotency_key: idempotencyKey,
    state: "pending",
    attempt_count: 0,
    available_at: availableAt,
    delivered_at: null,
    provider_receipt_ref: null,
    last_error_code: null,
    updated_at: now,
    created_at: now,
  } });
}

function noticeDeliveryPayload(recipient, stage) {
  const documentId = stage === "first" ? recipient.document_id : recipient.second_document_id;
  const documentVersion = stage === "first" ? recipient.first_document_version : recipient.second_document_version;
  const contentHash = stage === "first" ? recipient.first_content_hash : recipient.second_content_hash;
  const deadlineAt = stage === "first" ? recipient.first_notice_deadline_at : recipient.second_notice_deadline_at;
  return Object.freeze({
    promotion_recipient_ref: `LeavePromotionRecipient:${recipient.recipient_id}`,
    recipient_ref: `HRXEmployee:${recipient.employee_id}`,
    campaign_ref: `LeavePromotionCampaign:${recipient.campaign_id}`,
    document_ref: `HRXDocument:${documentId}`,
    content_hash: contentHash,
    document_version: documentVersion,
    notice_stage: stage,
    deadline_at: deadlineAt,
    channels: Object.freeze(["email", "message"]),
  });
}

export function createLeavePromotionService({ store, documents, employeeDirectory = () => [], clock = () => new Date().toISOString(), idFactory = (prefix) => `${prefix}_${randomUUID()}` } = {}) {
  if (!store || typeof store.transaction !== "function" || typeof store.query !== "function") throw new TypeError("leave promotion service requires a transactional store");
  if (!documents || typeof documents.create !== "function" || typeof documents.update !== "function") throw new TypeError("leave promotion service requires the HR document metadata store");
  const audit = createSqlHrxAuditEventStore({ store });

  function appendAudit(context, action, objectType, objectId, reason, metadata = {}) {
    audit.append({
      event_id: idFactory("leave_audit_promotion"),
      tenant_id: requiredString(context, "tenant_id"),
      actor_id: requiredString(context, "actor_id"),
      action,
      object_type: objectType,
      object_id: objectId,
      decision: "allow",
      reason,
      occurred_at: clock(),
      metadata,
    });
  }

  function preview(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const allowed = allowedEmployeeIds(context);
    const policyVersionId = requiredString(input, "policy_version_id");
    const periodEnd = isoDate(input.entitlement_period_end, "entitlement_period_end");
    const profile = scheduleProfile(requiredString(input, "schedule_profile_id"));
    const legalSchedule = scheduleFor(periodEnd, profile);
    const policy = store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId, policy_version_id: policyVersionId } });
    if (!policy || policy.status !== "active") throw guardedError("Active leave policy version not found", "HRX_LEAVE_PROMOTION_POLICY_NOT_FOUND", 404);
    const referenceDate = isoDate(input.reference_date ?? legalSchedule.first_notice_window_start, "reference_date");
    const rules = policyPromotionRules(policy);
    const directoryEmployees = new Map(employeeDirectory({ tenant_id: tenantId }).filter((employee) => allowed.has(employee.employee_id)).map((employee) => [employee.employee_id, employee]));
    const employees = new Map([...directoryEmployees].filter(([, employee]) => !["inactive", "terminated", "archived"].includes(employee.status)));
    const balance = calculateLeavePromotionBalances({
      tenant_id: tenantId,
      as_of: referenceDate,
      group_id: policy.group_id,
      employee_ids: [...employees.keys()],
      standard_day_minutes: rules.standard_day_minutes,
      entries: store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } }),
    });
    const balances = new Map(balance.rows.map((row) => [row.employee_id, row]));
    const targets = balance.rows
      .filter((row) => row.available_minutes >= rules.threshold_minutes)
      .map((row) => Object.freeze({ ...row, employee_display_name: employees.get(row.employee_id)?.display_name ?? "구성원" }));
    const exclusions = [...directoryEmployees].flatMap(([employeeId, employee]) => {
      if (!employees.has(employeeId)) {
        return [Object.freeze({ employee_id: employeeId, employee_display_name: employee.display_name ?? "구성원", reason: "employee_inactive", available_minutes: 0 })];
      }
      const row = balances.get(employeeId);
      if (!row) return [Object.freeze({ employee_id: employeeId, employee_display_name: employee.display_name ?? "구성원", reason: "no_eligible_balance", available_minutes: 0 })];
      if (row.available_minutes < rules.threshold_minutes) {
        return [Object.freeze({ employee_id: employeeId, employee_display_name: employee.display_name ?? "구성원", reason: "below_threshold", available_minutes: row.available_minutes })];
      }
      return [];
    }).sort((left, right) => left.employee_id.localeCompare(right.employee_id));
    const sourceVersion = hash({
      policy_version_id: policyVersionId,
      reference_date: referenceDate,
      balance_source_version: balance.source_version,
      targets: targets.map((row) => [row.employee_id, row.available_minutes, row.source_version]),
      exclusions: exclusions.map((row) => [row.employee_id, row.reason, row.available_minutes]),
    });
    return Object.freeze({
      policy_version_id: policyVersionId,
      group_id: policy.group_id,
      reference_date: referenceDate,
      entitlement_period_end: periodEnd,
      schedule_profile_id: profile.id,
      schedule_profile_label: profile.label,
      legal_basis_code: profile.legal_basis_code,
      legal_basis_version: profile.legal_basis_version,
      legal_schedule: legalSchedule,
      threshold_minutes: rules.threshold_minutes,
      standard_day_minutes: rules.standard_day_minutes,
      target_count: targets.length,
      targets: Object.freeze(targets),
      excluded_count: exclusions.length,
      exclusions: Object.freeze(exclusions),
      source_version: sourceVersion,
      calculation_snapshot_hash: hash({ legalSchedule, targets, exclusions, sourceVersion }),
      calculation_contract: balance.calculation_contract,
      legal_review_state: "required",
    });
  }

  function list(context) {
    const tenantId = requiredString(context, "tenant_id");
    const allowed = allowedEmployeeIds(context);
    const recipients = store.query("select", { table: "hrx_leave_promotion_recipients", where: { tenant_id: tenantId } }).filter((row) => allowed.has(row.employee_id));
    const visibleRecipientIds = new Set(recipients.map((recipient) => recipient.recipient_id));
    const evidenceReceipts = store.query("select", { table: "hrx_leave_promotion_evidence_receipts", where: { tenant_id: tenantId } })
      .filter((receipt) => visibleRecipientIds.has(receipt.recipient_id))
      .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at) || left.receipt_id.localeCompare(right.receipt_id));
    const byCampaign = new Map();
    for (const recipient of recipients) {
      if (!byCampaign.has(recipient.campaign_id)) byCampaign.set(recipient.campaign_id, []);
      byCampaign.get(recipient.campaign_id).push(recipient);
    }
    return Object.freeze(store.query("select", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: tenantId } })
      .filter((campaign) => byCampaign.has(campaign.campaign_id))
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((campaign) => campaignView(campaign, byCampaign.get(campaign.campaign_id).sort((left, right) => String(left.employee_display_name).localeCompare(String(right.employee_display_name), "ko")), evidenceReceipts)));
  }

  function get(context, campaignId) {
    const campaign = list(context).find((row) => row.campaign_id === campaignId);
    if (!campaign) throw guardedError("Leave promotion campaign not found", "HRX_LEAVE_PROMOTION_CAMPAIGN_NOT_FOUND", 404);
    return campaign;
  }

  function create(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const idempotencyKey = requiredString(input, "idempotency_key");
    const existing = store.query("selectOne", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) return get(context, existing.campaign_id);
    const result = preview(context, input);
    const campaignId = idFactory("leave_promotion_campaign");
    const now = clock();
    store.transaction((tx) => {
      tx.query("insert", { table: "hrx_leave_promotion_campaigns", row: {
        tenant_id: tenantId, campaign_id: campaignId, policy_version_id: result.policy_version_id, reference_date: result.reference_date,
        entitlement_period_end: result.entitlement_period_end, schedule_profile_id: result.schedule_profile_id, state: "active",
        legal_schedule_json: JSON.stringify(result.legal_schedule), legal_basis_code: result.legal_basis_code,
        legal_basis_version: result.legal_basis_version, legal_basis_effective_from: "2025-10-23", legal_review_state: "required",
        timezone: "Asia/Seoul", threshold_minutes: result.threshold_minutes, standard_day_minutes: result.standard_day_minutes,
        source_version: result.source_version, calculation_snapshot_hash: result.calculation_snapshot_hash, target_count: result.target_count,
        excluded_count: result.excluded_count, exclusions_json: JSON.stringify(result.exclusions),
        idempotency_key: idempotencyKey, created_at: now, updated_at: now,
      } });
      for (const target of result.targets) {
        const recipientId = idFactory("leave_promotion_recipient");
        tx.query("insert", { table: "hrx_leave_promotion_recipients", row: {
          tenant_id: tenantId, recipient_id: recipientId, campaign_id: campaignId,
          employee_id: target.employee_id, employee_display_name: target.employee_display_name, stage: "first_notice", state: "first_notice_pending",
          deadline_at: result.legal_schedule.first_notice_deadline_at, first_notice_deadline_at: result.legal_schedule.first_notice_deadline_at,
          second_notice_deadline_at: result.legal_schedule.second_notice_deadline_at, document_id: null, delivery_evidence_hash: null,
          response_json: "{}", unused_minutes: target.available_minutes, standard_day_minutes: target.standard_day_minutes,
          unused_days: target.unused_days, source_version: target.source_version, first_delivery_state: "not_created",
          second_delivery_state: "not_created", compliance_state: "open", late_reasons_json: "[]", created_at: now, updated_at: now,
        } });
        ensurePromotionOutbox(tx, {
          tenantId,
          recipientId,
          eventType: "leave.promotion.first_notice_deadline",
          payload: { recipient_id: recipientId, campaign_id: campaignId, stage: "first" },
          idempotencyKey: `promotion:${campaignId}:${recipientId}:first-deadline`,
          availableAt: result.legal_schedule.first_notice_deadline_at,
          now,
          idFactory,
        });
        ensurePromotionOutbox(tx, {
          tenantId,
          recipientId,
          eventType: "leave.promotion.second_notice_deadline",
          payload: { recipient_id: recipientId, campaign_id: campaignId, stage: "second" },
          idempotencyKey: `promotion:${campaignId}:${recipientId}:second-deadline`,
          availableAt: result.legal_schedule.second_notice_deadline_at,
          now,
          idFactory,
        });
      }
    });
    appendAudit(context, "hrx.leave.promotion.create", "LeavePromotionCampaign", campaignId, "leave_promotion_campaign_created", { target_count: result.target_count, source_version: result.source_version, legal_review_state: "required" });
    return get(context, campaignId);
  }

  function scopedRecipient(context, recipientId) {
    const tenantId = requiredString(context, "tenant_id");
    const allowed = allowedEmployeeIds(context);
    const recipient = store.query("selectOne", { table: "hrx_leave_promotion_recipients", where: { tenant_id: tenantId, recipient_id: recipientId } });
    if (!recipient || !allowed.has(recipient.employee_id)) throw guardedError("Leave promotion recipient not found", "HRX_LEAVE_PROMOTION_RECIPIENT_NOT_FOUND", 404);
    return recipient;
  }

  function viewRecipient(recipient) {
    const evidenceReceipts = store.query("select", {
      table: "hrx_leave_promotion_evidence_receipts",
      where: { tenant_id: recipient.tenant_id, recipient_id: recipient.recipient_id },
    }).sort((left, right) => left.occurred_at.localeCompare(right.occurred_at) || left.receipt_id.localeCompare(right.receipt_id));
    return recipientView(recipient, evidenceReceipts);
  }

  function issueNotice(context, recipientId, stage, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const recipient = scopedRecipient(context, recipientId);
    const documentField = stage === "first" ? "document_id" : "second_document_id";
    const versionField = stage === "first" ? "first_document_version" : "second_document_version";
    const contentHashField = stage === "first" ? "first_content_hash" : "second_content_hash";
    const notificationType = `leave.promotion.${stage}_notice_issued`;
    const notificationKey = `promotion:${recipient.campaign_id}:${recipientId}:${stage}-notice-issued`;
    const documentVersion = requiredString(input, "document_version");
    if (recipient[documentField]) {
      if (recipient[versionField] !== documentVersion) throw guardedError("Leave promotion notice version is already fixed", "HRX_LEAVE_PROMOTION_DOCUMENT_VERSION_CONFLICT");
      ensurePromotionOutbox(store, {
        tenantId,
        recipientId,
        eventType: notificationType,
        payload: noticeDeliveryPayload(recipient, stage),
        idempotencyKey: notificationKey,
        availableAt: clock(),
        now: clock(),
        idFactory,
      });
      return viewRecipient(recipient);
    }
    if (stage === "second") {
      if (recipient.responded_at) throw guardedError("Employee response already recorded", "HRX_LEAVE_PROMOTION_RESPONSE_ALREADY_RECORDED");
      if (recipient.first_delivery_state !== "delivered") throw guardedError("Verified first notice delivery is required", "HRX_LEAVE_PROMOTION_FIRST_DELIVERY_REQUIRED");
      if (!recipient.response_due_at || clock() <= recipient.response_due_at) throw guardedError("Employee response window is still open", "HRX_LEAVE_PROMOTION_RESPONSE_WINDOW_OPEN");
    }
    const now = clock();
    const documentId = idFactory(`leave_promotion_${stage}_document`);
    const campaign = store.query("selectOne", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: tenantId, campaign_id: recipient.campaign_id } });
    if (!campaign) throw guardedError("Leave promotion campaign not found", "HRX_LEAVE_PROMOTION_CAMPAIGN_NOT_FOUND", 404);
    const contentSnapshot = noticeContentSnapshot({ campaign, recipient, stage, documentVersion });
    const contentHash = hash(contentSnapshot);
    documents.create({
      tenant_id: tenantId, document_id: documentId, employee_id: recipient.employee_id,
      document_type: "annual_leave_promotion_notice",
      source_ref: `HRXLeavePromotion:${recipient.campaign_id}:${recipient.recipient_id}:${stage}:${documentVersion}`,
      source_provider: "hrx_document_reference", source_status: "unverified", source_version_ref: documentVersion,
      source_metadata: {
        provider_document_id: documentId,
        campaign_id: recipient.campaign_id,
        recipient_id: recipient.recipient_id,
        target_employee_ref: contentSnapshot.target_employee_ref,
        notice_stage: stage,
        document_version: documentVersion,
        deadline_at: contentSnapshot.deadline_at,
        content_hash: contentHash,
        legal_basis_code: contentSnapshot.legal_basis_code,
        legal_basis_version: contentSnapshot.legal_basis_version,
        delivery_state: "pending",
        etag_present: false,
        web_url_present: false,
      },
      title: contentSnapshot.title,
    });
    const lateReasons = parseJson(recipient.late_reasons_json, []);
    const deadlineAt = stage === "first" ? recipient.first_notice_deadline_at : recipient.second_notice_deadline_at;
    if (deadlineAt && now > deadlineAt) lateReasons.push(`${stage}_notice_late`);
    const patch = stage === "first"
      ? { document_id: documentId, first_document_version: documentVersion, [contentHashField]: contentHash, first_issued_at: now, first_delivery_state: "pending", state: "first_notice_issued", stage: "first_notice", deadline_at: recipient.first_notice_deadline_at, late_reasons_json: JSON.stringify([...new Set(lateReasons)]), updated_at: now }
      : { second_document_id: documentId, second_document_version: documentVersion, [contentHashField]: contentHash, second_issued_at: now, second_delivery_state: "pending", state: "second_notice_issued", stage: "second_notice", deadline_at: recipient.second_notice_deadline_at, late_reasons_json: JSON.stringify([...new Set(lateReasons)]), updated_at: now };
    const updated = store.query("updateOne", { table: "hrx_leave_promotion_recipients", where: { tenant_id: tenantId, recipient_id: recipientId }, patch });
    ensurePromotionOutbox(store, {
      tenantId,
      recipientId,
      eventType: notificationType,
      payload: noticeDeliveryPayload(updated, stage),
      idempotencyKey: notificationKey,
      availableAt: now,
      now,
      idFactory,
    });
    appendAudit(context, `hrx.leave.promotion.${stage}_notice.issue`, "LeavePromotionRecipient", recipientId, `leave_promotion_${stage}_notice_document_created`, { document_id: documentId, document_version: documentVersion, content_hash: contentHash, document_body_included: false });
    return viewRecipient(updated);
  }

  function latestEvidence(receipts, eventType) {
    return receipts.filter((receipt) => receipt.event_type === eventType)
      .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at) || right.receipt_id.localeCompare(left.receipt_id))[0] ?? null;
  }

  function updateEvidenceDocument(tenantId, documentId, delivery, failure, view) {
    if (!documentId) return;
    const document = documents.get({ tenant_id: tenantId, document_id: documentId });
    if (!document) return;
    documents.update({ tenant_id: tenantId, document_id: documentId }, {
      source_status: delivery ? "verified" : "unverified",
      source_verified_at: delivery?.occurred_at ?? null,
      source_metadata: {
        ...document.source_metadata,
        provider_document_id: delivery?.provider_receipt_ref ?? documentId,
        delivery_state: delivery ? "delivered" : failure ? "failed" : "pending",
        view_state: delivery && view ? "viewed" : "pending",
        viewed_at_present: Boolean(delivery && view),
        evidence_hash_present: Boolean(delivery || failure),
        etag_present: false,
        web_url_present: false,
      },
    });
  }

  function reprojectEvidence(context, recipientId) {
    const tenantId = requiredString(context, "tenant_id");
    const recipient = scopedRecipient(context, recipientId);
    const receipts = store.query("select", {
      table: "hrx_leave_promotion_evidence_receipts",
      where: { tenant_id: tenantId, recipient_id: recipientId, state: "active" },
    });
    const stageEvidence = (stage) => {
      const rows = receipts.filter((receipt) => receipt.stage === stage);
      const delivered = latestEvidence(rows, "delivered");
      const failed = latestEvidence(rows, "failed");
      const delivery = delivered && (!failed || delivered.occurred_at >= failed.occurred_at) ? delivered : null;
      const failure = failed && (!delivered || failed.occurred_at > delivered.occurred_at) ? failed : null;
      const viewed = delivery ? latestEvidence(rows.filter((receipt) => receipt.occurred_at >= delivery.occurred_at), "viewed") : null;
      return { delivery, failure, viewed };
    };
    const first = stageEvidence("first");
    const second = stageEvidence("second");
    const campaign = store.query("selectOne", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: tenantId, campaign_id: recipient.campaign_id } });
    const responseDays = Number(parseJson(campaign?.legal_schedule_json, {}).employee_response_days ?? 10);
    const firstState = first.delivery ? "delivered" : first.failure ? "failed" : recipient.document_id ? "pending" : "not_created";
    const secondState = second.delivery ? "delivered" : second.failure ? "failed" : recipient.second_document_id ? "pending" : "not_created";
    let state = first.delivery ? (recipient.responded_at ? "employee_responded" : "awaiting_employee_response") : first.failure ? "first_delivery_failed" : recipient.document_id ? "first_notice_issued" : "first_notice_pending";
    let complianceState = first.delivery && recipient.responded_at ? "employee_response_recorded_pending_legal_review" : "open";
    if (recipient.second_document_id) {
      state = second.delivery ? (second.viewed ? "second_notice_viewed" : "second_notice_delivered") : second.failure ? "second_delivery_failed" : "second_notice_issued";
      complianceState = second.delivery ? (second.viewed ? "evidence_complete_pending_legal_review" : "delivery_verified_view_pending") : "open";
    }
    const lateReasons = parseJson(recipient.late_reasons_json, []);
    for (const receipt of receipts) {
      const deadlineAt = receipt.stage === "first" ? recipient.first_notice_deadline_at : recipient.second_notice_deadline_at;
      if (deadlineAt && receipt.occurred_at > deadlineAt) lateReasons.push(`${receipt.stage}_notice_late`);
    }
    const updated = store.query("updateOne", {
      table: "hrx_leave_promotion_recipients",
      where: { tenant_id: tenantId, recipient_id: recipientId },
      patch: {
        first_delivery_state: firstState,
        first_delivered_at: first.delivery?.occurred_at ?? null,
        first_viewed_at: first.viewed?.occurred_at ?? null,
        first_evidence_hash: (first.delivery ?? first.failure)?.evidence_hash ?? null,
        response_due_at: first.delivery ? new Date(Date.parse(first.delivery.occurred_at) + responseDays * 86_400_000).toISOString() : null,
        second_delivery_state: secondState,
        second_delivered_at: second.delivery?.occurred_at ?? null,
        second_viewed_at: second.viewed?.occurred_at ?? null,
        second_evidence_hash: (second.delivery ?? second.failure)?.evidence_hash ?? null,
        delivery_evidence_hash: (second.delivery ?? second.failure ?? first.delivery ?? first.failure)?.evidence_hash ?? null,
        state,
        compliance_state: complianceState,
        late_reasons_json: JSON.stringify([...new Set(lateReasons)]),
        updated_at: clock(),
      },
    });
    updateEvidenceDocument(tenantId, recipient.document_id, first.delivery, first.failure, first.viewed);
    updateEvidenceDocument(tenantId, recipient.second_document_id, second.delivery, second.failure, second.viewed);
    return updated;
  }

  function recordEvidence(context, recipientId, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const recipient = scopedRecipient(context, recipientId);
    const stage = requiredString(input, "stage");
    const eventType = requiredString(input, "event_type");
    if (!["first", "second"].includes(stage) || !["delivered", "viewed", "failed"].includes(eventType)) throw new TypeError("stage or event_type is invalid");
    const documentId = stage === "first" ? recipient.document_id : recipient.second_document_id;
    if (!documentId) throw guardedError("Notice document must be created first", "HRX_LEAVE_PROMOTION_DOCUMENT_REQUIRED");
    const currentDeliveryState = stage === "first" ? recipient.first_delivery_state : recipient.second_delivery_state;
    if (eventType === "viewed" && currentDeliveryState !== "delivered") throw guardedError("Verified delivery is required before view evidence", "HRX_LEAVE_PROMOTION_DELIVERY_REQUIRED");
    const occurredAt = optionalIso(input.occurred_at, "occurred_at") ?? clock();
    const evidenceDigest = evidenceHash(input.evidence_hash);
    const providerReceiptRef = eventType === "delivered" ? requiredString(input, "provider_receipt_ref") : null;
    if (eventType !== "delivered" && input.provider_receipt_ref) throw new TypeError("provider_receipt_ref is only valid for delivered evidence");
    const idempotencyKey = input.idempotency_key
      ? requiredString(input, "idempotency_key")
      : `promotion-evidence:${hash({ recipient_id: recipientId, stage, event_type: eventType, evidence_hash: evidenceDigest, provider_receipt_ref: providerReceiptRef })}`;
    const existing = store.query("selectOne", { table: "hrx_leave_promotion_evidence_receipts", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) {
      const matches = existing.recipient_id === recipientId && existing.stage === stage && existing.event_type === eventType
        && existing.evidence_hash === evidenceDigest && (existing.provider_receipt_ref ?? null) === providerReceiptRef;
      if (!matches) throw guardedError("Leave promotion evidence idempotency key was reused", "HRX_LEAVE_PROMOTION_EVIDENCE_IDEMPOTENCY_REUSED");
      return viewRecipient(recipient);
    }
    const receiptId = idFactory("leave_promotion_evidence");
    store.query("insert", { table: "hrx_leave_promotion_evidence_receipts", row: {
      tenant_id: tenantId,
      receipt_id: receiptId,
      recipient_id: recipientId,
      stage,
      event_type: eventType,
      evidence_hash: evidenceDigest,
      provider_receipt_ref: providerReceiptRef,
      occurred_at: occurredAt,
      state: "active",
      idempotency_key: idempotencyKey,
      revoked_at: null,
      revoked_by_actor_id: null,
      revocation_reason_code: null,
      created_at: clock(),
      updated_at: clock(),
    } });
    const updated = reprojectEvidence(context, recipientId);
    appendAudit(context, `hrx.leave.promotion.${stage}_notice.${eventType}`, "LeavePromotionRecipient", recipientId, `leave_promotion_${stage}_notice_${eventType}_evidence_recorded`, { document_id: documentId, evidence_receipt_id: receiptId, evidence_hash: evidenceDigest, provider_receipt_ref: providerReceiptRef });
    return viewRecipient(updated);
  }

  function revokeEvidence(context, recipientId, receiptId, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    scopedRecipient(context, recipientId);
    const reasonCode = requiredString(input, "reason_code");
    if (!/^[A-Za-z0-9._:-]{2,80}$/.test(reasonCode)) throw new TypeError("reason_code is invalid");
    const receipt = store.query("selectOne", { table: "hrx_leave_promotion_evidence_receipts", where: { tenant_id: tenantId, receipt_id: receiptId, recipient_id: recipientId } });
    if (!receipt) throw guardedError("Leave promotion evidence receipt not found", "HRX_LEAVE_PROMOTION_EVIDENCE_NOT_FOUND", 404);
    if (receipt.state === "revoked") {
      if (receipt.revocation_reason_code !== reasonCode) throw guardedError("Leave promotion evidence was already revoked for another reason", "HRX_LEAVE_PROMOTION_EVIDENCE_ALREADY_REVOKED");
      return viewRecipient(scopedRecipient(context, recipientId));
    }
    const active = store.query("select", { table: "hrx_leave_promotion_evidence_receipts", where: { tenant_id: tenantId, recipient_id: recipientId, state: "active" } });
    const dependent = active.filter((candidate) => candidate.receipt_id === receiptId
      || (receipt.event_type === "delivered" && candidate.stage === receipt.stage && candidate.event_type === "viewed")
      || (receipt.stage === "first" && receipt.event_type === "delivered" && candidate.stage === "second"));
    const revokedAt = clock();
    for (const candidate of dependent) {
      store.query("updateOne", {
        table: "hrx_leave_promotion_evidence_receipts",
        where: { tenant_id: tenantId, receipt_id: candidate.receipt_id },
        patch: { state: "revoked", revoked_at: revokedAt, revoked_by_actor_id: requiredString(context, "actor_id"), revocation_reason_code: reasonCode, updated_at: revokedAt },
      });
    }
    const updated = reprojectEvidence(context, recipientId);
    appendAudit(context, "hrx.leave.promotion.evidence.revoke", "LeavePromotionRecipient", recipientId, "leave_promotion_evidence_revoked", { evidence_receipt_id: receiptId, revoked_receipt_ids: dependent.map((candidate) => candidate.receipt_id), reason_code: reasonCode });
    return viewRecipient(updated);
  }

  function issueBatch(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const campaignId = requiredString(input, "campaign_id");
    const stage = requiredString(input, "stage");
    if (!["first", "second"].includes(stage)) throw new TypeError("stage must be first or second");
    const documentVersion = requiredString(input, "document_version");
    const idempotencyKey = requiredString(input, "idempotency_key");
    const recipientIds = Array.isArray(input.recipient_ids) ? input.recipient_ids.map((value) => requiredString({ recipient_id: value }, "recipient_id")) : [];
    if (recipientIds.length < 1 || recipientIds.length > 200 || new Set(recipientIds).size !== recipientIds.length) throw new TypeError("recipient_ids must contain 1 to 200 unique recipients");
    get(context, campaignId);
    const results = recipientIds.map((recipientId) => {
      try {
        const before = scopedRecipient(context, recipientId);
        if (before.campaign_id !== campaignId) throw guardedError("Leave promotion recipient is outside the campaign", "HRX_LEAVE_PROMOTION_RECIPIENT_NOT_FOUND", 404);
        const existingDocumentId = stage === "first" ? before.document_id : before.second_document_id;
        const recipient = issueNotice(context, recipientId, stage, { document_version: documentVersion });
        const outbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: tenantId, idempotency_key: `promotion:${campaignId}:${recipientId}:${stage}-notice-issued` } });
        return Object.freeze({ recipient_id: recipientId, outcome: existingDocumentId ? "replayed" : "issued", outbox_event_id: outbox?.outbox_event_id ?? null });
      } catch (error) {
        return Object.freeze({ recipient_id: recipientId, outcome: "failed", safe_error_code: error?.safe_error_code ?? "HRX_LEAVE_PROMOTION_BATCH_ITEM_INVALID" });
      }
    });
    const issuedCount = results.filter((result) => result.outcome === "issued").length;
    const replayedCount = results.filter((result) => result.outcome === "replayed").length;
    const failedCount = results.filter((result) => result.outcome === "failed").length;
    const batchRef = `LeavePromotionBatch:${hash({ tenant_id: tenantId, campaign_id: campaignId, stage, document_version: documentVersion, recipient_ids: recipientIds, idempotency_key: idempotencyKey }).slice(0, 32)}`;
    appendAudit(context, "hrx.leave.promotion.batch.issue", "LeavePromotionCampaign", campaignId, "leave_promotion_notice_batch_queued", { batch_ref: batchRef, stage, requested_count: recipientIds.length, issued_count: issuedCount, replayed_count: replayedCount, failed_count: failedCount });
    return Object.freeze({ batch_ref: batchRef, requested_count: recipientIds.length, issued_count: issuedCount, replayed_count: replayedCount, failed_count: failedCount, results: Object.freeze(results) });
  }

  function recordResponse(context, recipientId, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const recipient = scopedRecipient(context, recipientId);
    if (recipient.first_delivery_state !== "delivered") throw guardedError("Verified first notice delivery is required", "HRX_LEAVE_PROMOTION_FIRST_DELIVERY_REQUIRED");
    const respondedAt = optionalIso(input.responded_at, "responded_at") ?? clock();
    const selectedDates = Array.isArray(input.selected_dates) ? input.selected_dates.map((value) => isoDate(value, "selected_dates")) : [];
    if (selectedDates.length === 0) throw new TypeError("selected_dates must include at least one date");
    const campaign = store.query("selectOne", { table: "hrx_leave_promotion_campaigns", where: { tenant_id: tenantId, campaign_id: recipient.campaign_id } });
    if (selectedDates.some((date) => date > campaign.entitlement_period_end)) throw guardedError("Selected leave date exceeds the entitlement period", "HRX_LEAVE_PROMOTION_RESPONSE_DATE_INVALID", 400);
    const response = { selected_dates: selectedDates, received_at: respondedAt, response_hash: hash({ recipient_id: recipientId, selected_dates: selectedDates, received_at: respondedAt }) };
    const lateReasons = parseJson(recipient.late_reasons_json, []);
    if (recipient.response_due_at && respondedAt > recipient.response_due_at) lateReasons.push("employee_response_late");
    const updated = store.query("updateOne", { table: "hrx_leave_promotion_recipients", where: { tenant_id: tenantId, recipient_id: recipientId }, patch: { response_json: JSON.stringify(response), responded_at: respondedAt, state: "employee_responded", compliance_state: "employee_response_recorded_pending_legal_review", late_reasons_json: JSON.stringify([...new Set(lateReasons)]), updated_at: clock() } });
    ensurePromotionOutbox(store, {
      tenantId,
      recipientId,
      eventType: "leave.promotion.response_recorded",
      payload: { recipient_id: recipientId, campaign_id: recipient.campaign_id },
      idempotencyKey: `promotion:${recipient.campaign_id}:${recipientId}:response-recorded`,
      availableAt: respondedAt,
      now: clock(),
      idFactory,
    });
    if (recipient.document_id) {
      const document = documents.get({ tenant_id: tenantId, document_id: recipient.document_id });
      documents.update({ tenant_id: tenantId, document_id: recipient.document_id }, { source_metadata: { ...document.source_metadata, response_state: "received", response_hash_present: true } });
    }
    appendAudit(context, "hrx.leave.promotion.response.record", "LeavePromotionRecipient", recipientId, "leave_promotion_employee_response_recorded", { response_hash: response.response_hash, selected_date_count: selectedDates.length });
    return viewRecipient(updated);
  }

  return Object.freeze({
    scheduleProfiles: () => LEAVE_PROMOTION_SCHEDULE_PROFILES,
    preview,
    create,
    list,
    get,
    issueFirstNotice: (context, recipientId, input) => issueNotice(context, recipientId, "first", input),
    issueSecondNotice: (context, recipientId, input) => issueNotice(context, recipientId, "second", input),
    issueBatch,
    recordEvidence,
    revokeEvidence,
    recordResponse,
  });
}
