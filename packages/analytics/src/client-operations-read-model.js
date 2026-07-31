import { evaluatePermission } from "../../authz/src/index.js";
import {
  buildClientDepositRevenue,
} from "../../billing/src/client-deposit-revenue-service.js";
import {
  buildClientReceivables,
} from "../../billing/src/client-receivables-service.js";
import {
  normalizeFeeCommitment,
} from "../../billing/src/fee-commitment-model.js";
import {
  CRM_INQUIRY_VISIBLE_STATUSES,
  compareCrmInquirySummaries,
  projectCrmInquiry,
  summarizeCrmInquiry,
} from "../../crm/src/inquiry-read-model.js";

const ACTIVE_CLIENT_STATUSES = new Set(["active", "current", "open"]);
const CLIENT_READ_ACTION = "analytics:client:read";
const INQUIRY_READ_ACTION = "crm:inquiry:read";
const CONSULTATION_READ_ACTION = "crm:consultation:read";
const MATTER_READ_ACTION = "matter:read";
const BANK_CLASSIFICATION_READ_ACTION =
  "finance:bank_classification:read";
const CLIENT_OPERATIONS_TIMEZONE = "Asia/Seoul";
const CLIENT_CONTACT_RELATIONSHIP_TYPES = new Set([
  "billing_contact",
  "contact_for",
  "crm_runtime_contact",
  "person_to_client_contact",
  "primary_contact",
]);
const CLOSED_ACTIVITY_STATUSES = new Set(["archived", "cancelled"]);
const ATTENTION_TYPE_PRIORITY = Object.freeze({
  overdue_consultation: 10,
  unassigned_new_inquiry: 20,
  consultation_today: 30,
  engagement_review: 40,
  bank_match_review: 50,
  fee_amount_missing: 60,
});
const REVENUE_RANKING_PERIODS = Object.freeze({
  month: "이번 달",
  quarter: "이번 분기",
  year: "올해 누적",
});

function requiredText(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function stableText(values, field) {
  if (
    !Array.isArray(values)
    || values.some(
      (value) => typeof value !== "string" || value.trim() === "",
    )
  ) {
    throw new TypeError(`${field} must be an array of non-empty strings`);
  }
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()))]
      .sort((left, right) => left.localeCompare(right, "en")),
  );
}

function permissionRules(permissionContext) {
  return Array.isArray(permissionContext?.rules)
    ? permissionContext.rules
    : [];
}

function objectAcl(permissionContext) {
  return Array.isArray(permissionContext?.object_acl)
    ? permissionContext.object_acl
    : [];
}

function aclForResource(
  permissionContext,
  resourceId,
  { clientGroupFallback = false, resourceType = null } = {},
) {
  return objectAcl(permissionContext).filter((entry) => {
    const targetId = entry.resource_id
      ?? (clientGroupFallback ? entry.client_group_id : undefined);
    const entryResourceType = entry.resource_type;
    const resourceTypeMatches = entryResourceType == null
      || entryResourceType === "*"
      || entryResourceType === resourceType;
    return resourceTypeMatches
      && (targetId === undefined
      || targetId === null
      || targetId === "*"
      || targetId === resourceId);
  });
}

function activeClientGroup(record) {
  return ACTIVE_CLIENT_STATUSES.has(
    String(record?.status ?? "active").trim().toLowerCase(),
  );
}

function aclForClientGroup(
  permissionContext,
  clientGroupId,
  resourceType,
) {
  return aclForResource(permissionContext, clientGroupId, {
    clientGroupFallback: true,
    resourceType,
  });
}

function safeClientGroup(record) {
  const clientGroupId = requiredText(
    record?.client_group_id,
    "ClientGroup.client_group_id",
  );
  return Object.freeze({
    model_type: "ClientGroup",
    tenant_id: requiredText(record?.tenant_id, "ClientGroup.tenant_id"),
    client_group_id: clientGroupId,
    display_name: requiredText(
      record?.display_name
        ?? record?.canonical_display_name
        ?? clientGroupId,
      "ClientGroup.display_name",
    ),
    status: String(record?.status ?? "active").trim().toLowerCase(),
    member_party_ids: stableText(
      record?.member_party_ids ?? [],
      "ClientGroup.member_party_ids",
    ),
    member_entity_ids: stableText(
      record?.member_entity_ids ?? [],
      "ClientGroup.member_entity_ids",
    ),
    primary_party_id:
      typeof record?.primary_party_id === "string"
      && record.primary_party_id.trim() !== ""
        ? record.primary_party_id.trim()
        : null,
    primary_entity_id:
      typeof record?.primary_entity_id === "string"
      && record.primary_entity_id.trim() !== ""
        ? record.primary_entity_id.trim()
        : null,
    legal_form:
      typeof record?.legal_form === "string"
      && record.legal_form.trim() !== ""
        ? record.legal_form.trim()
        : null,
  });
}

function clientGroupDecision(permissionContext, clientGroup) {
  if (!permissionContext?.principal) {
    return Object.freeze({ effect: "deny" });
  }
  return evaluatePermission({
    principal: permissionContext.principal,
    resource: {
      tenant_id: clientGroup.tenant_id,
      resource_type: "ClientGroup",
      resource_id: clientGroup.client_group_id,
      client_group_id: clientGroup.client_group_id,
    },
    action: CLIENT_READ_ACTION,
    rules: permissionRules(permissionContext),
    objectAcl: aclForClientGroup(
      permissionContext,
      clientGroup.client_group_id,
      "ClientGroup",
    ),
  });
}

function partyIndex(clientGroups) {
  const byParty = {};
  for (const clientGroup of clientGroups) {
    const partyIds = stableText([
      ...clientGroup.member_party_ids,
      ...(clientGroup.primary_party_id
        ? [clientGroup.primary_party_id]
        : []),
    ], "ClientGroup party references");
    for (const partyId of partyIds) {
      if (
        byParty[partyId]
        && byParty[partyId] !== clientGroup.client_group_id
      ) {
        throw new TypeError(
          `Party belongs to more than one permitted ClientGroup: ${partyId}`,
        );
      }
      byParty[partyId] = clientGroup.client_group_id;
    }
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(byParty)
        .sort(([left], [right]) => left.localeCompare(right, "en")),
    ),
  );
}

function readDecision(
  permissionContext,
  {
    action,
    resourceType,
    resourceId = null,
    tenantId = permissionContext?.principal?.tenant_id,
  },
) {
  if (!permissionContext?.principal) {
    return Object.freeze({ effect: "deny" });
  }
  return evaluatePermission({
    principal: permissionContext.principal,
    resource: {
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
    },
    action,
    rules: permissionRules(permissionContext),
    objectAcl: aclForResource(permissionContext, resourceId, {
      resourceType,
    }),
  });
}

function assertReadPermission(
  permissionContext,
  {
    action,
    resourceType,
    safeErrorCode,
    source,
    tenantId,
  },
) {
  if (
    readDecision(permissionContext, {
      action,
      resourceType,
      tenantId,
    }).effect !== "allow"
  ) {
    throw Object.assign(
      new Error(`${source} access is not permitted`),
      {
        safe_error_code: safeErrorCode,
        source,
      },
    );
  }
}

function validPartyIds(record) {
  return new Set([
    ...(Array.isArray(record?.member_party_ids)
      ? record.member_party_ids
      : []),
    record?.primary_party_id,
  ].filter((value) => (
    typeof value === "string" && value.trim() !== ""
  )).map((value) => value.trim()));
}

function clientReferenceAccess(activeGroups, allowedClientGroupIds) {
  const allowedIds = new Set(allowedClientGroupIds);
  const groupIdsByPartyId = new Map();
  for (const { client_group_id: clientGroupId, record } of activeGroups) {
    for (const partyId of validPartyIds(record)) {
      const groupIds = groupIdsByPartyId.get(partyId) ?? new Set();
      groupIds.add(clientGroupId);
      groupIdsByPartyId.set(partyId, groupIds);
    }
  }
  return Object.freeze(({
    client_group_id: clientGroupId,
    party_id: partyId,
  } = {}) => {
    const referencedGroupIds = new Set();
    if (
      typeof clientGroupId === "string"
      && clientGroupId.trim() !== ""
    ) {
      referencedGroupIds.add(clientGroupId.trim());
    }
    if (typeof partyId === "string" && partyId.trim() !== "") {
      for (
        const groupId
        of groupIdsByPartyId.get(partyId.trim()) ?? []
      ) {
        referencedGroupIds.add(groupId);
      }
    }
    if (referencedGroupIds.size === 0) return "unlinked";
    return [...referencedGroupIds].every((groupId) => (
      allowedIds.has(groupId)
    ))
      ? "allowed"
      : "denied";
  });
}

function listSource(repository, tenantId, modelType, source) {
  if (typeof repository?.list !== "function") {
    throw Object.assign(
      new TypeError(`${source} repository is required`),
      {
        safe_error_code:
          "CLIENT_OPERATIONS_SOURCE_UNAVAILABLE",
        source,
      },
    );
  }
  let records;
  try {
    records = repository.list({
      tenant_id: tenantId,
      model_type: modelType,
    });
  } catch (error) {
    throw Object.assign(
      new Error(`${source} could not be read`),
      {
        cause: error,
        safe_error_code:
          "CLIENT_OPERATIONS_SOURCE_UNAVAILABLE",
        source,
      },
    );
  }
  if (!Array.isArray(records)) {
    throw Object.assign(
      new TypeError(`${source} repository list must return an array`),
      {
        safe_error_code:
          "CLIENT_OPERATIONS_SOURCE_INVALID",
        source,
      },
    );
  }
  return records.filter((record) => (
    record?.tenant_id === tenantId
    && record.model_type === modelType
  ));
}

function canonicalAsOf(value) {
  const input = value ?? new Date();
  if (!(input instanceof Date) && typeof input !== "string") {
    throw new TypeError("as_of must be a Date or instant string");
  }
  const date = input instanceof Date
    ? new Date(input.getTime())
    : new Date(requiredText(input, "as_of"));
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("as_of must be a valid instant");
  }
  return date;
}

function zonedDateParts(date, timeZone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
      .filter(({ type }) => ["year", "month", "day"].includes(type))
      .map(({ type, value }) => [type, value]),
  );
}

function zonedDate(date, timeZone) {
  const { year, month, day } = zonedDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

function monthPeriod(date, timeZone) {
  const { year, month } = zonedDateParts(date, timeZone);
  const lastDay = new Date(
    Date.UTC(Number(year), Number(month), 0),
  ).getUTCDate();
  return Object.freeze({
    month: `${year}-${month}`,
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  });
}

function calendarMonth(year, month, offset = 0) {
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1 + offset, 1),
  );
  return Object.freeze({
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
  });
}

function revenueTrendPeriod(date, timeZone) {
  const current = zonedDateParts(date, timeZone);
  const first = calendarMonth(
    current.year,
    current.month,
    -11,
  );
  return Object.freeze({
    from: `${first.year}-${first.month}-01`,
    to: zonedDate(date, timeZone),
    month_count: 12,
  });
}

function revenueRankingPeriod(date, timeZone, selection) {
  const label = REVENUE_RANKING_PERIODS[selection];
  if (!label) {
    throw new TypeError(
      "revenue_ranking_period must be month, quarter, or year",
    );
  }
  const current = zonedDateParts(date, timeZone);
  const currentMonth = Number(current.month);
  const firstMonth = selection === "month"
    ? currentMonth
    : selection === "quarter"
      ? Math.floor((currentMonth - 1) / 3) * 3 + 1
      : 1;
  return Object.freeze({
    code: selection,
    label,
    from:
      `${current.year}-${String(firstMonth).padStart(2, "0")}-01`,
    to: zonedDate(date, timeZone),
  });
}

function crmInquiryProjections({
  repository,
  tenantId,
  permissionContext,
  referenceAccess,
}) {
  assertReadPermission(permissionContext, {
    action: INQUIRY_READ_ACTION,
    resourceType: "crm_inquiry",
    safeErrorCode:
      "CLIENT_OPERATIONS_INQUIRY_READ_DENIED",
    source: "crm.Lead",
    tenantId,
  });
  const sourceLeads = listSource(
    repository,
    tenantId,
    "Lead",
    "crm.Lead",
  );
  const permissionOmittedClientReferences = [];
  const leads = sourceLeads.filter((lead) => {
    const allowed = readDecision(permissionContext, {
      action: INQUIRY_READ_ACTION,
      resourceType: "crm_inquiry",
      resourceId: lead.lead_id,
      tenantId,
    }).effect === "allow";
    if (!allowed) {
      permissionOmittedClientReferences.push(Object.freeze({
        client_group_id: lead.client_group_id ?? null,
        party_id: lead.party_id ?? null,
      }));
    }
    return allowed;
  });
  const leadIds = new Set(leads.map(({ lead_id }) => lead_id));
  const explicitOpportunityIds = new Set(
    leads.map(({ opportunity_id }) => opportunity_id).filter(Boolean),
  );
  const opportunities = listSource(
    repository,
    tenantId,
    "Opportunity",
    "crm.Opportunity",
  ).filter((opportunity) => (
    leadIds.has(opportunity.lead_id)
    || explicitOpportunityIds.has(opportunity.opportunity_id)
  ));
  const baseProjections = leads.map((lead) => projectCrmInquiry({
    lead,
    opportunities,
    activities: [],
  }));
  const scopedLeadIds = new Set(
    baseProjections
      .filter((projection) => (
        referenceAccess({
          client_group_id: projection.client_group_id,
          party_id: projection.party_id,
        }) !== "denied"
      ))
      .map(({ lead_id }) => lead_id),
  );
  const scopedLeads = leads.filter(({ lead_id }) => (
    scopedLeadIds.has(lead_id)
  ));
  const scopedOpportunities = opportunities.filter((opportunity) => (
    scopedLeadIds.has(opportunity.lead_id)
    || scopedLeads.some((lead) => (
      lead.opportunity_id === opportunity.opportunity_id
    ))
  ));

  assertReadPermission(permissionContext, {
    action: CONSULTATION_READ_ACTION,
    resourceType: "crm_activity",
    safeErrorCode:
      "CLIENT_OPERATIONS_CONSULTATION_READ_DENIED",
    source: "crm.CRMActivity",
    tenantId,
  });
  const scopedOpportunityIds = new Set(
    scopedOpportunities.map(({ opportunity_id }) => opportunity_id),
  );
  const scopedConsultationCandidates = listSource(
    repository,
    tenantId,
    "CRMActivity",
    "crm.CRMActivity",
  ).filter((activity) => (
    scopedLeadIds.has(activity.lead_id)
    || scopedOpportunityIds.has(activity.opportunity_id)
  ));
  const leadIdByOpportunityId = new Map(
    scopedOpportunities.map((opportunity) => [
      opportunity.opportunity_id,
      opportunity.lead_id,
    ]),
  );
  const permissionOmittedLeadIds = new Set();
  const consultations = scopedConsultationCandidates.filter(
    (activity) => {
      const allowed = readDecision(permissionContext, {
        action: CONSULTATION_READ_ACTION,
        resourceType: "crm_activity",
        resourceId:
          activity.crm_activity_id
          ?? activity.activity_id
          ?? activity.resource_id,
        tenantId,
      }).effect === "allow";
      if (!allowed) {
        const leadId = activity.lead_id
          ?? leadIdByOpportunityId.get(activity.opportunity_id);
        if (leadId) permissionOmittedLeadIds.add(leadId);
      }
      return allowed;
    },
  );

  return Object.freeze({
    leads: Object.freeze(scopedLeads),
    opportunities: Object.freeze(scopedOpportunities),
    consultations: Object.freeze(consultations),
    projections: Object.freeze(scopedLeads.map((lead) => (
      projectCrmInquiry({
        lead,
        opportunities: scopedOpportunities,
        activities: consultations,
      })
    ))),
    permission_omitted_client_references: Object.freeze(
      permissionOmittedClientReferences,
    ),
    permission_omitted_lead_ids: Object.freeze(
      [...permissionOmittedLeadIds],
    ),
  });
}

function isIncompleteConsultation(activity) {
  return (
    (
      activity.activity_kind === "consultation"
      || activity.consultation === true
      || (
        activity.activity_type === "meeting"
        && Boolean(
          activity.scheduled_start ?? activity.scheduled_at,
        )
      )
    )
    && activity.completed_at == null
    && !CLOSED_ACTIVITY_STATUSES.has(activity.status)
  );
}

export function buildClientOperationsKpis({
  access_scope,
  client_reference_access,
  financeRepository,
  crmRepository,
  tenant_id,
  permission_context,
  as_of,
  timezone = CLIENT_OPERATIONS_TIMEZONE,
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (access_scope?.tenant_id !== tenantId) {
    throw new TypeError(
      "Client operations access scope does not match tenant_id",
    );
  }
  if (timezone !== CLIENT_OPERATIONS_TIMEZONE) {
    throw new TypeError(
      "Client operations timezone must be Asia/Seoul",
    );
  }
  if (typeof client_reference_access !== "function") {
    throw new TypeError(
      "Client operations require a precomputed client reference guard",
    );
  }
  const asOf = canonicalAsOf(as_of);
  const revenuePeriod = monthPeriod(asOf, timezone);
  const today = zonedDate(asOf, timezone);
  const crm = crmInquiryProjections({
    repository: crmRepository,
    tenantId,
    permissionContext: permission_context,
    referenceAccess: client_reference_access,
  });
  const revenue = buildClientDepositRevenue({
    repository: financeRepository,
    tenant_id: tenantId,
    permitted_client_records:
      access_scope.permitted_client_records,
    from: revenuePeriod.from,
    to: revenuePeriod.to,
  });
  const receivables = buildClientReceivables({
    repository: financeRepository,
    tenant_id: tenantId,
    permitted_client_records:
      access_scope.permitted_client_records,
    clock: () => new Date(asOf.getTime()),
  });
  const kpis = Object.freeze({
    new_inquiries: crm.projections.filter(
      ({ visible_status }) => visible_status === "new",
    ).length,
    consultations_today: crm.consultations.filter(
      (consultation) => (
        isIncompleteConsultation(consultation)
        && zonedDate(
          new Date(
            consultation.scheduled_start
              ?? consultation.scheduled_at,
          ),
          timezone,
        ) === today
      ),
    ).length,
    engagement_reviews: crm.projections.filter(
      ({ visible_status }) => (
        visible_status === "engagement_review"
      ),
    ).length,
    deposit_revenue_month:
      revenue.totals.net_deposit_revenue,
    receivables_total: receivables.total_receivables,
  });
  const nonNegativeValues = [
    kpis.new_inquiries,
    kpis.consultations_today,
    kpis.engagement_reviews,
    kpis.receivables_total,
  ];
  if (
    nonNegativeValues.some((value) => (
      !Number.isSafeInteger(value) || value < 0
    ))
    || !Number.isSafeInteger(kpis.deposit_revenue_month)
  ) {
    throw new TypeError(
      "Client operations KPI values must be safe integers",
    );
  }
  return Object.freeze({
    as_of: asOf.toISOString(),
    timezone,
    currency: "KRW",
    periods: Object.freeze({
      current: asOf.toISOString(),
      today,
      deposit_revenue_month: revenuePeriod,
    }),
    kpis,
    source_statuses: Object.freeze([
      Object.freeze({ source: "master-data.ClientGroup", status: "passed" }),
      Object.freeze({ source: "crm.Lead", status: "passed" }),
      Object.freeze({ source: "crm.Opportunity", status: "passed" }),
      Object.freeze({ source: "crm.CRMActivity", status: "passed" }),
      Object.freeze({ source: "finance.BankTransaction", status: "passed" }),
      Object.freeze({ source: "finance.FeeCommitment", status: "passed" }),
    ]),
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    unauthorized_amount_included: false,
    invoice_required: false,
    matter_required: false,
    production_ready_claim: false,
  });
}

function canonicalInstant(value, field) {
  const text = requiredText(value, field);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${field} must be a valid instant`);
  }
  return new Date(milliseconds).toISOString();
}

function positiveWholeKrw(value, field) {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value <= 0
  ) {
    throw new TypeError(
      `${field} must be a positive whole KRW amount`,
    );
  }
  return value;
}

function createAttentionItem({
  attention_item_id,
  attention_type,
  label,
  title,
  due_at = null,
  occurred_at = null,
  client_group_id = null,
  assigned_user_id = null,
  amount = null,
  currency = null,
  destination,
}) {
  const priority = ATTENTION_TYPE_PRIORITY[attention_type];
  if (!priority) {
    throw new TypeError(
      `Unsupported Client attention type: ${attention_type}`,
    );
  }
  return Object.freeze({
    attention_item_id: requiredText(
      attention_item_id,
      "attention_item_id",
    ),
    attention_type,
    label: requiredText(label, "attention label"),
    title: requiredText(title, "attention title"),
    priority,
    due_at,
    occurred_at,
    client_group_id,
    assigned_user_id,
    amount,
    currency,
    destination: Object.freeze({ ...destination }),
    production_ready_claim: false,
  });
}

function compareAttentionItems(left, right) {
  return (
    left.priority - right.priority
    || String(
      left.due_at ?? left.occurred_at ?? "\uffff",
    ).localeCompare(
      String(right.due_at ?? right.occurred_at ?? "\uffff"),
    )
    || left.attention_item_id.localeCompare(
      right.attention_item_id,
      "en",
    )
  );
}

function crmAttentionItems({
  crm,
  asOf,
  timeZone,
}) {
  const today = zonedDate(asOf, timeZone);
  const leadsById = new Map(
    crm.leads.map((lead) => [lead.lead_id, lead]),
  );
  const opportunitiesById = new Map(
    crm.opportunities.map((opportunity) => [
      opportunity.opportunity_id,
      opportunity,
    ]),
  );
  const projectionsByLeadId = new Map(
    crm.projections.map((projection) => [
      projection.lead_id,
      projection,
    ]),
  );
  const projectionsByOpportunityId = new Map(
    crm.projections
      .filter(({ opportunity_id }) => Boolean(opportunity_id))
      .map((projection) => [
        projection.opportunity_id,
        projection,
      ]),
  );
  const items = [];

  for (const projection of crm.projections) {
    const lead = leadsById.get(projection.lead_id);
    if (
      projection.visible_status !== "new"
      || (
        typeof lead?.assigned_user_id === "string"
        && lead.assigned_user_id.trim() !== ""
      )
    ) {
      continue;
    }
    items.push(createAttentionItem({
      attention_item_id: projection.lead_id,
      attention_type: "unassigned_new_inquiry",
      label: "새 문의 담당자 지정",
      title: projection.display_name,
      occurred_at: canonicalInstant(
        projection.received_at,
        "Lead.received_at",
      ),
      client_group_id: projection.client_group_id,
      assigned_user_id: null,
      destination: {
        section: "new_inquiries",
        record_id: projection.lead_id,
        filter: "new",
      },
    }));
  }

  for (const consultation of crm.consultations) {
    if (!isIncompleteConsultation(consultation)) continue;
    const projection =
      projectionsByLeadId.get(consultation.lead_id)
      ?? projectionsByOpportunityId.get(
        consultation.opportunity_id,
      );
    if (!projection) continue;
    const scheduledStart = canonicalInstant(
      consultation.scheduled_start
        ?? consultation.scheduled_at,
      "CRMActivity.scheduled_start",
    );
    const consultationDate = zonedDate(
      new Date(scheduledStart),
      timeZone,
    );
    const attentionType = consultationDate < today
      ? "overdue_consultation"
      : consultationDate === today
        ? "consultation_today"
        : null;
    if (!attentionType) continue;
    const activityId = requiredText(
      consultation.crm_activity_id
        ?? consultation.activity_id
        ?? consultation.resource_id,
      "CRMActivity ID",
    );
    items.push(createAttentionItem({
      attention_item_id: activityId,
      attention_type: attentionType,
      label: attentionType === "overdue_consultation"
        ? "지난 상담 확인"
        : "오늘 상담",
      title: projection.display_name,
      due_at: scheduledStart,
      client_group_id: projection.client_group_id,
      assigned_user_id: projection.assigned_user_id,
      destination: {
        section: "consultations",
        record_id: activityId,
        inquiry_id: projection.lead_id,
        filter: attentionType === "overdue_consultation"
          ? "overdue"
          : "today",
      },
    }));
  }

  for (const projection of crm.projections) {
    if (
      projection.visible_status !== "engagement_review"
      || !projection.opportunity_id
    ) {
      continue;
    }
    const opportunity = opportunitiesById.get(
      projection.opportunity_id,
    );
    const openedAt = canonicalInstant(
      opportunity?.engagement_decided_at
        ?? opportunity?.created_at
        ?? opportunity?.updated_at
        ?? projection.received_at,
      "Opportunity review timestamp",
    );
    items.push(createAttentionItem({
      attention_item_id: projection.opportunity_id,
      attention_type: "engagement_review",
      label: "수임 여부 결정",
      title: projection.display_name,
      occurred_at: openedAt,
      client_group_id: projection.client_group_id,
      assigned_user_id: projection.assigned_user_id,
      destination: {
        section: "engagement_status",
        record_id: projection.opportunity_id,
        inquiry_id: projection.lead_id,
        filter: "reviewing",
      },
    }));
  }

  return items;
}

function bankReviewAttentionItems({
  repository,
  tenantId,
  permissionContext,
  accessScope,
}) {
  assertReadPermission(permissionContext, {
    action: BANK_CLASSIFICATION_READ_ACTION,
    resourceType: "bank_transaction_classification",
    safeErrorCode:
      "CLIENT_OPERATIONS_BANK_REVIEW_READ_DENIED",
    source: "finance.BankTransactionClassification",
    tenantId,
  });
  const allowedClientIds = new Set(
    accessScope.allowed_client_group_ids,
  );
  const classifications = listSource(
    repository,
    tenantId,
    "BankTransactionClassification",
    "finance.BankTransactionClassification",
  ).filter((classification) => (
    classification.status === "review_required"
    && classification.transaction_direction === "inflow"
    && (
      !classification.client_group_id
      || allowedClientIds.has(classification.client_group_id)
    )
  )).filter((classification) => (
    readDecision(permissionContext, {
      action: BANK_CLASSIFICATION_READ_ACTION,
      resourceType: "bank_transaction_classification",
      resourceId:
        classification.bank_transaction_classification_id,
      tenantId,
    }).effect === "allow"
  ));
  if (classifications.length === 0) return [];
  const transactions = listSource(
    repository,
    tenantId,
    "BankTransaction",
    "finance.BankTransaction",
  );
  const transactionsById = new Map(
    transactions.map((transaction) => [
      transaction.bank_transaction_id,
      transaction,
    ]),
  );
  if (transactionsById.size !== transactions.length) {
    throw new TypeError("Duplicate BankTransaction ID");
  }
  const seenTransactionIds = new Set();
  const clientNames = new Map(
    accessScope.permitted_client_records.map((client) => [
      client.client_group_id,
      client.display_name,
    ]),
  );
  return classifications.map((classification) => {
    const transactionId = requiredText(
      classification.bank_transaction_id,
      "BankTransactionClassification.bank_transaction_id",
    );
    if (seenTransactionIds.has(transactionId)) {
      throw new TypeError(
        `Duplicate bank review task: ${transactionId}`,
      );
    }
    seenTransactionIds.add(transactionId);
    const transaction = transactionsById.get(transactionId);
    const amount = positiveWholeKrw(
      transaction?.amount,
      "BankTransaction.amount",
    );
    if (
      transaction.direction !== "inflow"
      || transaction.currency !== "KRW"
      || classification.currency !== "KRW"
      || positiveWholeKrw(
        classification.amount,
        "BankTransactionClassification.amount",
      ) !== amount
      || classification.transaction_date !== transaction.date
    ) {
      throw new TypeError(
        `Bank review task does not reconcile: ${transactionId}`,
      );
    }
    const occurredAt = canonicalInstant(
      transaction.occurred_at,
      "BankTransaction.occurred_at",
    );
    const clientName = clientNames.get(
      classification.client_group_id,
    );
    return createAttentionItem({
      attention_item_id: transactionId,
      attention_type: "bank_match_review",
      label: "입금 고객 연결",
      title: clientName
        ? `${clientName} 입금 확인`
        : "입금 고객 미확인",
      due_at: occurredAt,
      client_group_id:
        classification.client_group_id ?? null,
      amount,
      currency: "KRW",
      destination: {
        section: "deposit_revenue",
        record_id: transactionId,
        filter: "review_required",
      },
    });
  });
}

function feeAmountAttentionItems({
  repository,
  tenantId,
  accessScope,
}) {
  const allowedClientIds = new Set(
    accessScope.allowed_client_group_ids,
  );
  const clientNames = new Map(
    accessScope.permitted_client_records.map((client) => [
      client.client_group_id,
      client.display_name,
    ]),
  );
  return listSource(
    repository,
    tenantId,
    "FeeCommitment",
    "finance.FeeCommitment",
  )
    .filter((commitment) => (
      allowedClientIds.has(commitment.client_group_id)
      && commitment.status === "active"
      && commitment.agreed_amount === null
    ))
    .map(normalizeFeeCommitment)
    .map((commitment) => createAttentionItem({
      attention_item_id: commitment.fee_commitment_id,
      attention_type: "fee_amount_missing",
      label: "수임료 입력",
      title:
        clientNames.get(commitment.client_group_id)
        ?? "고객 수임료",
      due_at: commitment.due_date,
      occurred_at: canonicalInstant(
        commitment.accepted_at,
        "FeeCommitment.accepted_at",
      ),
      client_group_id: commitment.client_group_id,
      amount: null,
      currency: "KRW",
      destination: {
        section: "receivables",
        record_id: commitment.fee_commitment_id,
        filter: "amount_missing",
      },
    }));
}

export function buildClientOperationsAttentionItems({
  access_scope,
  client_reference_access,
  financeRepository,
  crmRepository,
  tenant_id,
  permission_context,
  as_of,
  timezone = CLIENT_OPERATIONS_TIMEZONE,
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (access_scope?.tenant_id !== tenantId) {
    throw new TypeError(
      "Client operations access scope does not match tenant_id",
    );
  }
  if (timezone !== CLIENT_OPERATIONS_TIMEZONE) {
    throw new TypeError(
      "Client operations timezone must be Asia/Seoul",
    );
  }
  if (typeof client_reference_access !== "function") {
    throw new TypeError(
      "Client operations require a precomputed client reference guard",
    );
  }
  const asOf = canonicalAsOf(as_of);
  const crm = crmInquiryProjections({
    repository: crmRepository,
    tenantId,
    permissionContext: permission_context,
    referenceAccess: client_reference_access,
  });
  const items = [
    ...crmAttentionItems({
      crm,
      asOf,
      timeZone: timezone,
    }),
    ...bankReviewAttentionItems({
      repository: financeRepository,
      tenantId,
      permissionContext: permission_context,
      accessScope: access_scope,
    }),
    ...feeAmountAttentionItems({
      repository: financeRepository,
      tenantId,
      accessScope: access_scope,
    }),
  ];
  const itemIds = new Set(
    items.map(({ attention_item_id }) => attention_item_id),
  );
  if (itemIds.size !== items.length) {
    throw new TypeError("Duplicate Client attention item ID");
  }
  const sortedItems = Object.freeze(
    items
      .sort(compareAttentionItems)
      .map((item, index) => Object.freeze({
        order: index + 1,
        ...item,
      })),
  );
  return Object.freeze({
    as_of: asOf.toISOString(),
    timezone,
    today: zonedDate(asOf, timezone),
    items: sortedItems,
    attention_item_ids: Object.freeze(
      sortedItems.map(({ attention_item_id }) => (
        attention_item_id
      )),
    ),
    evaluated_attention_types: Object.freeze(
      Object.keys(ATTENTION_TYPE_PRIORITY),
    ),
    source_statuses: Object.freeze([
      Object.freeze({ source: "master-data.ClientGroup", status: "passed" }),
      Object.freeze({ source: "crm.Lead", status: "passed" }),
      Object.freeze({ source: "crm.Opportunity", status: "passed" }),
      Object.freeze({ source: "crm.CRMActivity", status: "passed" }),
      Object.freeze({
        source: "finance.BankTransactionClassification",
        status: "passed",
      }),
      Object.freeze({ source: "finance.FeeCommitment", status: "passed" }),
    ]),
    stable_sort:
      "업무 우선순위 → 기한·발생 시각 → 항목 ID",
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    unauthorized_amount_included: false,
    raw_bank_counterparty_included: false,
    production_ready_claim: false,
  });
}

function inquiryStatusDestination(code) {
  if (code === "consultation_scheduled") {
    return Object.freeze({
      section: "consultations",
      filter: code,
    });
  }
  if (
    code === "engagement_review"
    || code === "engaged"
    || code === "not_engaged"
  ) {
    return Object.freeze({
      section: "engagement_status",
      filter: code,
    });
  }
  return Object.freeze({
    section: "new_inquiries",
    filter: code,
  });
}

export function buildClientOperationsTrendsAndRankings({
  access_scope,
  client_reference_access,
  financeRepository,
  crmRepository,
  tenant_id,
  permission_context,
  as_of,
  timezone = CLIENT_OPERATIONS_TIMEZONE,
  revenue_ranking_period = "year",
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (access_scope?.tenant_id !== tenantId) {
    throw new TypeError(
      "Client operations access scope does not match tenant_id",
    );
  }
  if (timezone !== CLIENT_OPERATIONS_TIMEZONE) {
    throw new TypeError(
      "Client operations timezone must be Asia/Seoul",
    );
  }
  if (typeof client_reference_access !== "function") {
    throw new TypeError(
      "Client operations require a precomputed client reference guard",
    );
  }
  const asOf = canonicalAsOf(as_of);
  const trendPeriod = revenueTrendPeriod(asOf, timezone);
  const rankingPeriod = revenueRankingPeriod(
    asOf,
    timezone,
    revenue_ranking_period,
  );
  const crm = crmInquiryProjections({
    repository: crmRepository,
    tenantId,
    permissionContext: permission_context,
    referenceAccess: client_reference_access,
  });
  const permittedClients =
    access_scope.permitted_client_records;
  const trendRevenue = buildClientDepositRevenue({
    repository: financeRepository,
    tenant_id: tenantId,
    permitted_client_records: permittedClients,
    from: trendPeriod.from,
    to: trendPeriod.to,
  });
  const rankedRevenue = buildClientDepositRevenue({
    repository: financeRepository,
    tenant_id: tenantId,
    permitted_client_records: permittedClients,
    from: rankingPeriod.from,
    to: rankingPeriod.to,
  });
  const receivables = buildClientReceivables({
    repository: financeRepository,
    tenant_id: tenantId,
    permitted_client_records: permittedClients,
    clock: () => new Date(asOf.getTime()),
  });
  const statusCountsByCode = new Map(
    CRM_INQUIRY_VISIBLE_STATUSES.map(({ code }) => [code, 0]),
  );
  for (const projection of crm.projections) {
    if (!statusCountsByCode.has(projection.visible_status)) {
      throw new TypeError(
        `Unsupported CRM inquiry status: ${projection.visible_status}`,
      );
    }
    statusCountsByCode.set(
      projection.visible_status,
      statusCountsByCode.get(projection.visible_status) + 1,
    );
  }
  const inquiryStatusItems = Object.freeze(
    CRM_INQUIRY_VISIBLE_STATUSES.map(({ code, label }) => (
      Object.freeze({
        code,
        label,
        count: statusCountsByCode.get(code),
        destination: inquiryStatusDestination(code),
      })
    )),
  );
  const inquiryStatusCounts = Object.freeze(Object.fromEntries(
    inquiryStatusItems.map(({ label, count }) => [label, count]),
  ));
  const inquiryTotal = inquiryStatusItems.reduce(
    (total, { count }) => total + count,
    0,
  );
  if (
    !Number.isSafeInteger(inquiryTotal)
    || inquiryTotal !== crm.projections.length
  ) {
    throw new TypeError(
      "Client inquiry status totals do not reconcile",
    );
  }
  const monthlyPoints = Object.freeze(
    trendRevenue.monthly.map((point) => Object.freeze({
      ...point,
      destination: Object.freeze({
        section: "deposit_revenue",
        filter: "month",
        month: point.month,
      }),
    })),
  );
  if (monthlyPoints.length !== trendPeriod.month_count) {
    throw new TypeError(
      "Client revenue trend must contain exactly 12 months",
    );
  }
  const revenueRanking = Object.freeze(
    rankedRevenue.ranking.map((row) => Object.freeze({
      ...row,
      destination: Object.freeze({
        section: "client_details",
        record_id: row.client_group_id,
        tab: "deposit_revenue",
        period: rankingPeriod.code,
      }),
    })),
  );
  const receivablesRanking = Object.freeze(
    receivables.ranking.map((row) => Object.freeze({
      ...row,
      destination: Object.freeze({
        section: "client_details",
        record_id: row.client_group_id,
        tab: "receivables",
      }),
    })),
  );

  return Object.freeze({
    as_of: asOf.toISOString(),
    timezone,
    currency: "KRW",
    monthly_deposit_revenue: Object.freeze({
      period: trendPeriod,
      total: trendRevenue.totals.net_deposit_revenue,
      points: monthlyPoints,
      reconciliation_status:
        trendRevenue.reconciliation.status,
    }),
    inquiry_status: Object.freeze({
      total: inquiryTotal,
      counts: inquiryStatusCounts,
      items: inquiryStatusItems,
    }),
    revenue_ranking: Object.freeze({
      selected_period: rankingPeriod,
      available_periods: Object.freeze(
        Object.entries(REVENUE_RANKING_PERIODS).map(
          ([code, label]) => Object.freeze({ code, label }),
        ),
      ),
      total: rankedRevenue.totals.net_deposit_revenue,
      items: revenueRanking,
      client_group_ids: Object.freeze(
        revenueRanking.map(({ client_group_id }) => (
          client_group_id
        )),
      ),
      reconciliation_status:
        rankedRevenue.reconciliation.status,
    }),
    receivables_ranking: Object.freeze({
      as_of: receivables.as_of,
      total: receivables.total_receivables,
      unknown_amount_count:
        receivables.unknown_amount_count,
      items: receivablesRanking,
      client_group_ids: Object.freeze(
        receivablesRanking.map(({ client_group_id }) => (
          client_group_id
        )),
      ),
      reconciliation_status:
        receivables.reconciliation.status,
    }),
    source_statuses: Object.freeze([
      Object.freeze({
        source: "master-data.ClientGroup",
        status: "passed",
      }),
      Object.freeze({ source: "crm.Lead", status: "passed" }),
      Object.freeze({
        source: "crm.Opportunity",
        status: "passed",
      }),
      Object.freeze({
        source: "crm.CRMActivity",
        status: "passed",
      }),
      Object.freeze({
        source: "finance.BankTransaction",
        status: "passed",
      }),
      Object.freeze({
        source: "finance.BankTransactionClassification",
        status: "passed",
      }),
      Object.freeze({
        source: "finance.FeeCommitment",
        status: "passed",
      }),
      Object.freeze({
        source: "finance.ClientDepositAllocation",
        status: "passed",
      }),
    ]),
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    unauthorized_amount_included: false,
    raw_bank_source_included: false,
    embedded_transaction_details: false,
    invoice_required: false,
    matter_required: false,
    production_ready_claim: false,
  });
}

function latestInstant(values = []) {
  let latest = null;
  for (const value of values) {
    if (typeof value !== "string" || value.trim() === "") continue;
    const milliseconds = Date.parse(value);
    if (
      Number.isFinite(milliseconds)
      && (latest === null || milliseconds > latest)
    ) {
      latest = milliseconds;
    }
  }
  return latest === null ? null : new Date(latest).toISOString();
}

function dashboardSource({
  source_id,
  label,
  generated_at,
  read,
  is_empty,
  latest_record_at,
  item_count,
}) {
  try {
    const data = read();
    const empty = is_empty(data);
    const count = item_count(data);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new TypeError(
        `Dashboard source item count is invalid: ${source_id}`,
      );
    }
    return Object.freeze({
      data,
      status: Object.freeze({
        source_id,
        label,
        status: empty ? "no_data" : "available",
        checked_at: generated_at,
        latest_record_at: latest_record_at(data),
        item_count: count,
        safe_error_code: null,
      }),
    });
  } catch (error) {
    const suppliedCode = typeof error?.safe_error_code === "string"
      ? error.safe_error_code
      : null;
    const permissionDenied = Boolean(
      suppliedCode?.endsWith("_READ_DENIED"),
    );
    return Object.freeze({
      data: null,
      status: Object.freeze({
        source_id,
        label,
        status: permissionDenied
          ? "permission_denied"
          : "error",
        checked_at: generated_at,
        latest_record_at: null,
        item_count: null,
        safe_error_code: suppliedCode ?? (
          "CLIENT_OPERATIONS_DASHBOARD_SOURCE_UNAVAILABLE"
        ),
      }),
    });
  }
}

function dashboardInquiryStatus(crm) {
  const countsByCode = new Map(
    CRM_INQUIRY_VISIBLE_STATUSES.map(({ code }) => [code, 0]),
  );
  for (const projection of crm.projections) {
    if (!countsByCode.has(projection.visible_status)) {
      throw new TypeError(
        `Unsupported CRM inquiry status: ${projection.visible_status}`,
      );
    }
    countsByCode.set(
      projection.visible_status,
      countsByCode.get(projection.visible_status) + 1,
    );
  }
  const items = Object.freeze(
    CRM_INQUIRY_VISIBLE_STATUSES.map(({ code, label }) => (
      Object.freeze({
        code,
        label,
        count: countsByCode.get(code),
        destination: inquiryStatusDestination(code),
      })
    )),
  );
  const total = items.reduce(
    (sum, { count }) => sum + count,
    0,
  );
  if (
    !Number.isSafeInteger(total)
    || total !== crm.projections.length
  ) {
    throw new TypeError(
      "Client inquiry status totals do not reconcile",
    );
  }
  return Object.freeze({
    total,
    counts: Object.freeze(Object.fromEntries(
      items.map(({ label, count }) => [label, count]),
    )),
    items,
  });
}

function dashboardMonthlyRevenue(trendRevenue, period) {
  const points = Object.freeze(
    trendRevenue.monthly.map((point) => Object.freeze({
      ...point,
      destination: Object.freeze({
        section: "deposit_revenue",
        filter: "month",
        month: point.month,
      }),
    })),
  );
  if (points.length !== period.month_count) {
    throw new TypeError(
      "Client revenue trend must contain exactly 12 months",
    );
  }
  return Object.freeze({
    period,
    total: trendRevenue.totals.net_deposit_revenue,
    points,
    reconciliation_status:
      trendRevenue.reconciliation.status,
  });
}

function dashboardRevenueRanking(rankedRevenue, period) {
  const items = Object.freeze(
    rankedRevenue.ranking.map((row) => Object.freeze({
      ...row,
      destination: Object.freeze({
        section: "client_details",
        record_id: row.client_group_id,
        tab: "deposit_revenue",
        period: period.code,
      }),
    })),
  );
  return Object.freeze({
    selected_period: period,
    available_periods: Object.freeze(
      Object.entries(REVENUE_RANKING_PERIODS).map(
        ([code, label]) => Object.freeze({ code, label }),
      ),
    ),
    total: rankedRevenue.totals.net_deposit_revenue,
    items,
    client_group_ids: Object.freeze(
      items.map(({ client_group_id }) => client_group_id),
    ),
    reconciliation_status:
      rankedRevenue.reconciliation.status,
  });
}

function dashboardReceivablesRanking(receivables) {
  const items = Object.freeze(
    receivables.ranking.map((row) => Object.freeze({
      ...row,
      destination: Object.freeze({
        section: "client_details",
        record_id: row.client_group_id,
        tab: "receivables",
      }),
    })),
  );
  return Object.freeze({
    as_of: receivables.as_of,
    total: receivables.total_receivables,
    unknown_amount_count:
      receivables.unknown_amount_count,
    items,
    client_group_ids: Object.freeze(
      items.map(({ client_group_id }) => client_group_id),
    ),
    reconciliation_status:
      receivables.reconciliation.status,
  });
}

function dashboardSection(status, data) {
  return Object.freeze({ status, data });
}

function combinedSectionStatus(sources, { empty = false } = {}) {
  if (
    sources.some(({ status }) => (
      status.status === "error"
      || status.status === "permission_denied"
    ))
  ) {
    return "partial";
  }
  return empty ? "no_data" : "available";
}

function dashboardAttention({
  crmSource,
  bankSource,
  feeSource,
}) {
  const items = [
    ...(crmSource.data
      ? crmSource.data.attention_items
      : []),
    ...(bankSource.data ?? []),
    ...(feeSource.data ?? []),
  ];
  const itemIds = new Set(
    items.map(({ attention_item_id }) => attention_item_id),
  );
  if (itemIds.size !== items.length) {
    throw new TypeError("Duplicate Client attention item ID");
  }
  const sortedItems = Object.freeze(
    items
      .sort(compareAttentionItems)
      .map((item, index) => Object.freeze({
        order: index + 1,
        ...item,
      })),
  );
  const typeStatuses = Object.freeze({
    overdue_consultation: crmSource.status.status,
    unassigned_new_inquiry: crmSource.status.status,
    consultation_today: crmSource.status.status,
    engagement_review: crmSource.status.status,
    bank_match_review: bankSource.status.status,
    fee_amount_missing: feeSource.status.status,
  });
  const sources = [crmSource, bankSource, feeSource];
  return dashboardSection(
    combinedSectionStatus(sources, {
      empty: sortedItems.length === 0,
    }),
    Object.freeze({
      items: sortedItems,
      attention_item_ids: Object.freeze(
        sortedItems.map(({ attention_item_id }) => (
          attention_item_id
        )),
      ),
      type_statuses: typeStatuses,
      stable_sort:
        "업무 우선순위 → 기한·발생 시각 → 항목 ID",
    }),
  );
}

function dashboardCrmKpis(crm, asOf, timeZone) {
  const today = zonedDate(asOf, timeZone);
  return Object.freeze({
    new_inquiries: crm.projections.filter(
      ({ visible_status }) => visible_status === "new",
    ).length,
    consultations_today: crm.consultations.filter(
      (consultation) => (
        isIncompleteConsultation(consultation)
        && zonedDate(
          new Date(canonicalInstant(
            consultation.scheduled_start
              ?? consultation.scheduled_at,
            "CRMActivity.scheduled_start",
          )),
          timeZone,
        ) === today
      ),
    ).length,
    engagement_reviews: crm.projections.filter(
      ({ visible_status }) => (
        visible_status === "engagement_review"
      ),
    ).length,
  });
}

function dashboardKpis({
  crmSource,
  revenueSource,
  receivablesSource,
  asOf,
  timeZone,
}) {
  const today = zonedDate(asOf, timeZone);
  const currentMonth = today.slice(0, 7);
  const crm = crmSource.data?.kpis ?? null;
  const revenue = revenueSource.data?.trend ?? null;
  const receivables = receivablesSource.data;
  const values = Object.freeze({
    new_inquiries: crm?.new_inquiries ?? null,
    consultations_today:
      crm?.consultations_today ?? null,
    engagement_reviews:
      crm?.engagement_reviews ?? null,
    deposit_revenue_month: revenue
      ? revenue.monthly.find(
        ({ month }) => month === currentMonth,
      )?.net_deposit_revenue ?? 0
      : null,
    receivables_total: receivables
      ? receivables.total_receivables
      : null,
  });
  const metricStatuses = Object.freeze({
    new_inquiries: crmSource.status.status,
    consultations_today: crmSource.status.status,
    engagement_reviews: crmSource.status.status,
    deposit_revenue_month:
      revenueSource.status.status,
    receivables_total:
      receivablesSource.status.status,
  });
  const sources = [
    crmSource,
    revenueSource,
    receivablesSource,
  ];
  return dashboardSection(
    combinedSectionStatus(sources, {
      empty: sources.every(
        ({ status }) => status.status === "no_data",
      ),
    }),
    Object.freeze({
      values,
      metric_statuses: metricStatuses,
      currency: "KRW",
      periods: Object.freeze({
        current: asOf.toISOString(),
        today,
        deposit_revenue_month: currentMonth,
      }),
    }),
  );
}

function dashboardUnavailableItem({
  accessScope,
  generatedAt,
  asOf,
  timeZone,
}) {
  const permissionDenied =
    accessScope.access_state === "no_access";
  const status = permissionDenied
    ? "permission_denied"
    : "no_data";
  const section = dashboardSection(status, null);
  return Object.freeze({
    generated_at: generatedAt,
    as_of: asOf.toISOString(),
    timezone: timeZone,
    outcome: permissionDenied
      ? "permission_denied"
      : "empty",
    ui_state: permissionDenied
      ? "permission_denied"
      : "no_data",
    access_state: accessScope.access_state,
    sections: Object.freeze({
      kpis: section,
      attention_items: section,
      monthly_deposit_revenue: section,
      inquiry_status: section,
      revenue_ranking: section,
      receivables_ranking: section,
    }),
    source_statuses: Object.freeze([
      Object.freeze({
        source_id: "master_data",
        label: "고객 정보",
        status,
        checked_at: generatedAt,
        latest_record_at: null,
        item_count: null,
        safe_error_code: permissionDenied
          ? "CLIENT_OPERATIONS_CLIENT_READ_DENIED"
          : null,
      }),
    ]),
    safe_error_codes: permissionDenied
      ? Object.freeze([
        "CLIENT_OPERATIONS_CLIENT_READ_DENIED",
      ])
      : Object.freeze([]),
    downstream_sources_read: false,
    count_leak_prevented: true,
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    unauthorized_amount_included: false,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

export function buildClientOperationsDashboard({
  access_scope,
  client_reference_access,
  financeRepository,
  crmRepository,
  tenant_id,
  permission_context,
  as_of,
  generated_at,
  timezone = CLIENT_OPERATIONS_TIMEZONE,
  revenue_ranking_period = "year",
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (access_scope?.tenant_id !== tenantId) {
    throw new TypeError(
      "Client operations access scope does not match tenant_id",
    );
  }
  if (timezone !== CLIENT_OPERATIONS_TIMEZONE) {
    throw new TypeError(
      "Client operations timezone must be Asia/Seoul",
    );
  }
  if (typeof client_reference_access !== "function") {
    throw new TypeError(
      "Client operations require a precomputed client reference guard",
    );
  }
  const asOf = canonicalAsOf(as_of);
  const generatedAt = canonicalAsOf(generated_at).toISOString();
  const trendPeriod = revenueTrendPeriod(asOf, timezone);
  const rankingPeriod = revenueRankingPeriod(
    asOf,
    timezone,
    revenue_ranking_period,
  );
  const permittedClients =
    access_scope.permitted_client_records;
  const crmSource = dashboardSource({
    source_id: "crm",
    label: "문의·상담·수임",
    generated_at: generatedAt,
    read: () => {
      const crm = crmInquiryProjections({
        repository: crmRepository,
        tenantId,
        permissionContext: permission_context,
        referenceAccess: client_reference_access,
      });
      return Object.freeze({
        crm,
        kpis: dashboardCrmKpis(crm, asOf, timezone),
        inquiry_status: dashboardInquiryStatus(crm),
        attention_items: Object.freeze(crmAttentionItems({
          crm,
          asOf,
          timeZone: timezone,
        })),
      });
    },
    is_empty: ({ crm }) => crm.projections.length === 0,
    latest_record_at: ({ crm }) => latestInstant([
      ...crm.leads.flatMap((lead) => [
        lead.updated_at,
        lead.created_at,
        lead.received_at,
      ]),
      ...crm.opportunities.flatMap((opportunity) => [
        opportunity.updated_at,
        opportunity.created_at,
        opportunity.engagement_decided_at,
      ]),
      ...crm.consultations.flatMap((consultation) => [
        consultation.updated_at,
        consultation.created_at,
        consultation.completed_at,
      ]),
    ]),
    item_count: ({ crm }) => crm.projections.length,
  });
  const revenueSource = dashboardSource({
    source_id: "deposit_revenue",
    label: "입금 매출",
    generated_at: generatedAt,
    read: () => Object.freeze({
      trend: buildClientDepositRevenue({
        repository: financeRepository,
        tenant_id: tenantId,
        permitted_client_records: permittedClients,
        from: trendPeriod.from,
        to: trendPeriod.to,
      }),
      ranking: buildClientDepositRevenue({
        repository: financeRepository,
        tenant_id: tenantId,
        permitted_client_records: permittedClients,
        from: rankingPeriod.from,
        to: rankingPeriod.to,
      }),
    }),
    is_empty: ({ trend }) => trend.details.length === 0,
    latest_record_at: ({ trend }) => latestInstant(
      trend.details.map(({ occurred_at }) => occurred_at),
    ),
    item_count: ({ trend }) => trend.details.length,
  });
  const receivablesSource = dashboardSource({
    source_id: "receivables",
    label: "수임료·미수금",
    generated_at: generatedAt,
    read: () => buildClientReceivables({
      repository: financeRepository,
      tenant_id: tenantId,
      permitted_client_records: permittedClients,
      clock: () => new Date(asOf.getTime()),
    }),
    is_empty: (receivables) => (
      receivables.details.fee_commitments.length === 0
      && receivables.details.deposits.length === 0
    ),
    latest_record_at: (receivables) => latestInstant([
      ...receivables.details.fee_commitments.map(
        ({ accepted_at }) => accepted_at,
      ),
      ...receivables.details.deposits.map(
        ({ occurred_at }) => occurred_at,
      ),
      ...receivables.details.allocations.flatMap(
        (allocation) => [
          allocation.updated_at,
          allocation.allocated_at,
          allocation.created_at,
        ],
      ),
    ]),
    item_count: (receivables) => (
      receivables.details.fee_commitments.length
      + receivables.details.deposits.length
    ),
  });
  const bankSource = dashboardSource({
    source_id: "bank_review",
    label: "연결 확인 필요 입금",
    generated_at: generatedAt,
    read: () => bankReviewAttentionItems({
      repository: financeRepository,
      tenantId,
      permissionContext: permission_context,
      accessScope: access_scope,
    }),
    is_empty: (items) => items.length === 0,
    latest_record_at: (items) => latestInstant(
      items.flatMap(({ occurred_at, due_at }) => [
        occurred_at,
        due_at,
      ]),
    ),
    item_count: (items) => items.length,
  });
  const feeSource = dashboardSource({
    source_id: "fee_amount_tasks",
    label: "금액 미입력 수임료",
    generated_at: generatedAt,
    read: () => feeAmountAttentionItems({
      repository: financeRepository,
      tenantId,
      accessScope: access_scope,
    }),
    is_empty: (items) => items.length === 0,
    latest_record_at: (items) => latestInstant(
      items.map(({ occurred_at }) => occurred_at),
    ),
    item_count: (items) => items.length,
  });
  const sources = [
    crmSource,
    revenueSource,
    receivablesSource,
    bankSource,
    feeSource,
  ];
  const sourceStatuses = Object.freeze([
    Object.freeze({
      source_id: "master_data",
      label: "고객 정보",
      status: "available",
      checked_at: generatedAt,
      latest_record_at: null,
      item_count:
        access_scope.allowed_client_group_ids.length,
      safe_error_code: null,
    }),
    ...sources.map(({ status }) => status),
  ]);
  const hasUnavailableSource = sources.some(({ status }) => (
    status.status === "error"
    || status.status === "permission_denied"
  ));
  const allSourcesEmpty = sources.every(
    ({ status }) => status.status === "no_data",
  );
  const safeErrorCodes = Object.freeze([
    ...new Set(
      sourceStatuses
        .map(({ safe_error_code }) => safe_error_code)
        .filter(Boolean),
    ),
  ]);
  const monthlyRevenue = revenueSource.data
    ? dashboardMonthlyRevenue(
      revenueSource.data.trend,
      trendPeriod,
    )
    : null;
  const inquiryStatus =
    crmSource.data?.inquiry_status ?? null;
  const revenueRanking = revenueSource.data
    ? dashboardRevenueRanking(
      revenueSource.data.ranking,
      rankingPeriod,
    )
    : null;
  const receivablesRanking = receivablesSource.data
    ? dashboardReceivablesRanking(
      receivablesSource.data,
    )
    : null;

  return Object.freeze({
    generated_at: generatedAt,
    as_of: asOf.toISOString(),
    timezone,
    outcome: hasUnavailableSource
      ? "partial"
      : allSourcesEmpty
        ? "empty"
        : "complete",
    ui_state: hasUnavailableSource
      ? "partial"
      : allSourcesEmpty
        ? "no_data"
        : null,
    access_state: "allowed",
    sections: Object.freeze({
      kpis: dashboardKpis({
        crmSource,
        revenueSource,
        receivablesSource,
        asOf,
        timeZone: timezone,
      }),
      attention_items: dashboardAttention({
        crmSource,
        bankSource,
        feeSource,
      }),
      monthly_deposit_revenue: dashboardSection(
        revenueSource.status.status,
        monthlyRevenue,
      ),
      inquiry_status: dashboardSection(
        crmSource.status.status,
        inquiryStatus,
      ),
      revenue_ranking: dashboardSection(
        revenueSource.status.status,
        revenueRanking,
      ),
      receivables_ranking: dashboardSection(
        receivablesSource.status.status,
        receivablesRanking,
      ),
    }),
    source_statuses: sourceStatuses,
    safe_error_codes: safeErrorCodes,
    downstream_sources_read: true,
    count_leak_prevented: true,
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    unauthorized_amount_included: false,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    embedded_transaction_details: false,
    invoice_required: false,
    matter_required: false,
    production_ready_claim: false,
  });
}

function selectedClientReferenceIds(client) {
  return new Set([
    client.client_group_id,
    client.primary_party_id,
    client.primary_entity_id,
    ...client.member_party_ids,
    ...client.member_entity_ids,
  ].filter(Boolean));
}

function clientMemberCount(client) {
  const parties = new Set([
    client.primary_party_id,
    ...client.member_party_ids,
  ].filter(Boolean));
  const entities = new Set([
    client.primary_entity_id,
    ...client.member_entity_ids,
  ].filter(Boolean));
  return Math.max(parties.size, entities.size);
}

function clientDetailContacts({
  masterDataRepository,
  tenantId,
  client,
}) {
  const clientEntityIds = new Set([
    client.primary_entity_id,
    ...client.member_entity_ids,
  ].filter(Boolean));
  const relationships = listSource(
    masterDataRepository,
    tenantId,
    "Relationship",
    "master-data.Relationship",
  ).filter((relationship) => (
    CLIENT_CONTACT_RELATIONSHIP_TYPES.has(
      relationship.relationship_type,
    )
  ));
  const relatedEntityIds = new Set(clientEntityIds);
  for (const relationship of relationships) {
    const from = relationship.from_entity_id;
    const to = relationship.to_entity_id;
    if (clientEntityIds.has(from) && to) relatedEntityIds.add(to);
    if (clientEntityIds.has(to) && from) relatedEntityIds.add(from);
  }
  const people = listSource(
    masterDataRepository,
    tenantId,
    "Person",
    "master-data.Person",
  ).filter((person) => (
    relatedEntityIds.has(person.entity_id)
    || client.member_party_ids.includes(person.party_id)
    || person.party_id === client.primary_party_id
  ));
  const contactPoints = listSource(
    masterDataRepository,
    tenantId,
    "ContactPoint",
    "master-data.ContactPoint",
  );
  const contactPointsByEntity = new Map();
  for (const point of contactPoints) {
    if (!relatedEntityIds.has(point.owner_entity_id)) continue;
    const points = contactPointsByEntity.get(point.owner_entity_id) ?? [];
    points.push(point);
    contactPointsByEntity.set(point.owner_entity_id, points);
  }
  return Object.freeze(
    people
      .map((person) => {
        const personContactPoints = (
          contactPointsByEntity.get(person.entity_id) ?? []
        ).slice().sort((left, right) => (
          Number(right.is_primary === true) - Number(left.is_primary === true)
          || String(left.contact_type ?? "").localeCompare(
            String(right.contact_type ?? ""),
            "en",
          )
          || String(left.contact_point_id ?? "").localeCompare(
            String(right.contact_point_id ?? ""),
            "en",
          )
        ));
        const contactPoint = personContactPoints[0] ?? null;
        return Object.freeze({
          contact_id: person.person_id,
          display_name:
            typeof person.display_name === "string"
              && person.display_name.trim() !== ""
              ? person.display_name.trim()
              : "이름 미등록",
          primary_contact_type:
            typeof contactPoint?.contact_type === "string"
              ? contactPoint.contact_type
              : null,
          contact_point_value_included: false,
          contact_value_masked: Boolean(contactPoint?.value),
          contact_points: Object.freeze(personContactPoints.map((point) => (
            Object.freeze({
              contact_type:
                typeof point.contact_type === "string"
                  ? point.contact_type
                  : null,
              contact_point_value_included: false,
              contact_value_masked: Boolean(point.value),
              is_primary: point.is_primary === true,
              status: point.status ?? "active",
            })
          ))),
          status: person.status ?? "active",
          production_ready_claim: false,
        });
      })
      .sort((left, right) => (
        left.display_name.localeCompare(right.display_name, "ko")
        || left.contact_id.localeCompare(right.contact_id, "en")
      )),
  );
}

function clientDetailMatters({
  matterRepository,
  tenantId,
  permissionContext,
  client,
}) {
  assertReadPermission(permissionContext, {
    action: MATTER_READ_ACTION,
    resourceType: "matter",
    safeErrorCode: "CLIENT_OPERATIONS_MATTER_READ_DENIED",
    source: "matter.Matter",
    tenantId,
  });
  const references = selectedClientReferenceIds(client);
  const candidates = listSource(
    matterRepository,
    tenantId,
    "Matter",
    "matter.Matter",
  ).filter((matter) => (
    [
      matter.client_group_id,
      matter.client_id,
      matter.legal_client_party_id,
      matter.billing_client_party_id,
    ].filter(Boolean).some((value) => references.has(value))
  ));
  let permissionOmitted = false;
  const items = candidates
    .filter((matter) => {
      const allowed = readDecision(permissionContext, {
        action: MATTER_READ_ACTION,
        resourceType: "matter",
        resourceId: matter.matter_id,
        tenantId,
      }).effect === "allow";
      if (!allowed) permissionOmitted = true;
      return allowed;
    })
    .map((matter) => Object.freeze({
      matter_id: matter.matter_id,
      matter_code: matter.matter_code ?? matter.matter_number ?? null,
      display_name:
        matter.matter_name
        ?? matter.title
        ?? matter.matter_code
        ?? "이름 미등록",
      status: matter.status ?? null,
      opened_at: matter.opened_at ?? matter.created_at ?? null,
      production_ready_claim: false,
    }))
    .sort((left, right) => (
      String(right.opened_at ?? "").localeCompare(
        String(left.opened_at ?? ""),
      )
      || left.display_name.localeCompare(right.display_name, "ko")
      || left.matter_id.localeCompare(right.matter_id, "en")
    ));
  return Object.freeze({
    items: Object.freeze(items),
    permission_omitted: permissionOmitted,
  });
}

function clientDetailInquiries({
  crmRepository,
  tenantId,
  permissionContext,
  accessScope,
  referenceAccess,
  client,
}) {
  const crm = crmInquiryProjections({
    repository: crmRepository,
    tenantId,
    permissionContext,
    referenceAccess,
  });
  const matchesClient = ({ client_group_id, party_id }) => (
    client_group_id
      ? client_group_id === client.client_group_id
      : accessScope.client_group_id_by_party_id[party_id]
        === client.client_group_id
  );
  const selectedProjections = crm.projections.filter(matchesClient);
  const selectedLeadIds = new Set(
    selectedProjections.map(({ lead_id }) => lead_id),
  );
  const items = selectedProjections
    .map((projection) => {
      const summary = summarizeCrmInquiry(projection);
      return Object.freeze({
        lead_id: summary.lead_id,
        display_name: summary.display_name,
        visible_status: summary.visible_status,
        visible_status_label: summary.visible_status_label,
        source: summary.source,
        received_at: summary.received_at,
        next_action: summary.next_action,
        assigned: Boolean(summary.assigned_user_id),
        production_ready_claim: false,
      });
    })
    .sort(compareCrmInquirySummaries);
  return Object.freeze({
    items: Object.freeze(items),
    permission_omitted: (
      crm.permission_omitted_client_references.some(matchesClient)
      || crm.permission_omitted_lead_ids.some(
        (leadId) => selectedLeadIds.has(leadId),
      )
    ),
  });
}

function clientDirectoryItems(accessScope) {
  return Object.freeze(
    accessScope.permitted_client_records.map((client) => Object.freeze({
      client_group_id: client.client_group_id,
      display_name: client.display_name,
      status: client.status,
      legal_form: client.legal_form,
      member_count: clientMemberCount(client),
      primary_record_present: Boolean(
        client.primary_party_id ?? client.primary_entity_id,
      ),
      production_ready_claim: false,
    })),
  );
}

function clientDetailSource({
  sourceId,
  label,
  permissionSafeErrorCode,
  read,
}) {
  try {
    const result = read();
    const items = Array.isArray(result) ? result : result.items;
    const permissionOmitted = !Array.isArray(result)
      && result.permission_omitted === true;
    const status = permissionOmitted
      ? items.length > 0
        ? "partial"
        : "permission_denied"
      : items.length === 0
        ? "no_data"
        : "available";
    const safeErrorCode = permissionOmitted
      ? permissionSafeErrorCode
      : null;
    return Object.freeze({
      section: Object.freeze({
        status,
        data: status === "permission_denied"
          ? null
          : Object.freeze({ items }),
      }),
      sourceStatus: Object.freeze({
        source_id: sourceId,
        label,
        status,
        item_count: permissionOmitted ? null : items.length,
        safe_error_code: safeErrorCode,
      }),
      safeErrorCode,
    });
  } catch (error) {
    const safeErrorCode =
      typeof error?.safe_error_code === "string"
        ? error.safe_error_code
        : "CLIENT_OPERATIONS_SOURCE_UNAVAILABLE";
    const status = safeErrorCode.endsWith("_READ_DENIED")
      ? "permission_denied"
      : "error";
    return Object.freeze({
      section: Object.freeze({
        status,
        data: null,
      }),
      sourceStatus: Object.freeze({
        source_id: sourceId,
        label,
        status,
        item_count: null,
        safe_error_code: safeErrorCode,
      }),
      safeErrorCode,
    });
  }
}

export function buildClientOperationsDetail({
  access_scope,
  client_reference_access,
  masterDataRepository,
  crmRepository,
  matterRepository,
  tenant_id,
  permission_context,
  client_group_id,
  generated_at,
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  const clientGroupId = requiredText(
    client_group_id,
    "client_group_id",
  );
  if (access_scope?.tenant_id !== tenantId) {
    throw new TypeError(
      "Client operations access scope does not match tenant_id",
    );
  }
  if (typeof client_reference_access !== "function") {
    throw new TypeError(
      "Client operations require a precomputed client reference guard",
    );
  }
  const client = access_scope.permitted_client_records.find(
    (record) => record.client_group_id === clientGroupId,
  );
  if (!client) return null;
  const contacts = clientDetailSource({
    sourceId: "master_data_contacts",
    label: "연락처",
    read: () => clientDetailContacts({
      masterDataRepository,
      tenantId,
      client,
    }),
  });
  const matters = clientDetailSource({
    sourceId: "matters",
    label: "Matter",
    permissionSafeErrorCode:
      "CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED",
    read: () => clientDetailMatters({
      matterRepository,
      tenantId,
      permissionContext: permission_context,
      client,
    }),
  });
  const inquiries = clientDetailSource({
    sourceId: "crm_inquiries",
    label: "문의",
    permissionSafeErrorCode:
      "CLIENT_OPERATIONS_INQUIRY_OBJECTS_OMITTED",
    read: () => clientDetailInquiries({
      crmRepository,
      tenantId,
      permissionContext: permission_context,
      accessScope: access_scope,
      referenceAccess: client_reference_access,
      client,
    }),
  });
  const sources = [contacts, matters, inquiries];
  const partial = sources.some(({ section }) => (
    ["partial", "permission_denied", "error"].includes(
      section.status,
    )
  ));
  const hasData = sources.some(({ section }) => (
    ["available", "partial"].includes(section.status)
  ));
  return Object.freeze({
    generated_at: canonicalAsOf(generated_at).toISOString(),
    timezone: CLIENT_OPERATIONS_TIMEZONE,
    outcome: partial ? "partial" : hasData ? "passed" : "empty",
    ui_state: partial ? "partial" : hasData ? null : "no_data",
    client: Object.freeze({
      client_group_id: client.client_group_id,
      display_name: client.display_name,
      status: client.status,
      legal_form: client.legal_form,
      member_count: clientMemberCount(client),
      primary_record_present: Boolean(
        client.primary_party_id ?? client.primary_entity_id,
      ),
      production_ready_claim: false,
    }),
    sections: Object.freeze({
      contacts: contacts.section,
      matters: matters.section,
      inquiries: inquiries.section,
    }),
    source_statuses: Object.freeze(
      sources.map(({ sourceStatus }) => sourceStatus),
    ),
    safe_error_codes: Object.freeze(
      sources
        .map(({ safeErrorCode }) => safeErrorCode)
        .filter(Boolean),
    ),
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    unauthorized_count_included: false,
    raw_contact_values_included: false,
    raw_source_payload_included: false,
    production_ready_claim: false,
  });
}

function resolveClientOperationsAccess({
  masterDataRepository,
  tenant_id,
  permission_context,
} = {}) {
  if (typeof masterDataRepository?.list !== "function") {
    throw Object.assign(
      new TypeError(
        "Client operations require a Master Data repository",
      ),
      {
        safe_error_code:
          "CLIENT_OPERATIONS_CLIENT_SCOPE_UNAVAILABLE",
        source: "master-data.ClientGroup",
      },
    );
  }
  const tenantId = requiredText(tenant_id, "tenant_id");
  let candidates;
  try {
    candidates = masterDataRepository.list({
      tenant_id: tenantId,
      model_type: "ClientGroup",
    });
  } catch (error) {
    throw Object.assign(
      new Error("ClientGroup access scope could not be resolved"),
      {
        cause: error,
        safe_error_code:
          "CLIENT_OPERATIONS_CLIENT_SCOPE_UNAVAILABLE",
        source: "master-data.ClientGroup",
      },
    );
  }
  if (!Array.isArray(candidates)) {
    throw Object.assign(
      new TypeError(
        "ClientGroup repository list must return an array",
      ),
      {
        safe_error_code:
          "CLIENT_OPERATIONS_CLIENT_SCOPE_INVALID",
        source: "master-data.ClientGroup",
      },
    );
  }

  const activeGroups = candidates
    .filter((record) => (
      record?.model_type === "ClientGroup"
      && record.tenant_id === tenantId
      && activeClientGroup(record)
    ))
    .map((record) => Object.freeze({
      record,
      tenant_id: tenantId,
      client_group_id: requiredText(
        record?.client_group_id,
        "ClientGroup.client_group_id",
      ),
    }));
  if (
    new Set(activeGroups.map(({ client_group_id }) => client_group_id))
      .size !== activeGroups.length
  ) {
    throw new TypeError("Duplicate ClientGroup ID");
  }

  const permittedClientRecords = Object.freeze(
    activeGroups
      .filter(
        (clientGroup) => (
          clientGroupDecision(permission_context, clientGroup).effect
            === "allow"
        ),
      )
      .map(({ record }) => safeClientGroup(record))
      .sort((left, right) => (
        left.display_name.localeCompare(right.display_name, "ko")
        || left.client_group_id.localeCompare(
          right.client_group_id,
          "en",
        )
      )),
  );
  const clientGroupIdByPartyId = partyIndex(permittedClientRecords);
  const allowedClientGroupIds = Object.freeze(
    permittedClientRecords.map(({ client_group_id }) => client_group_id),
  );
  const allowedPartyIds = Object.freeze(
    Object.keys(clientGroupIdByPartyId),
  );

  const accessScope = Object.freeze({
    tenant_id: tenantId,
    access_state: activeGroups.length === 0
      ? "no_data"
      : permittedClientRecords.length === 0
        ? "no_access"
        : "allowed",
    permitted_client_records: permittedClientRecords,
    allowed_client_group_ids: allowedClientGroupIds,
    allowed_party_ids: allowedPartyIds,
    client_group_id_by_party_id: clientGroupIdByPartyId,
    permission_prefilter_applied: true,
    permission_action: CLIENT_READ_ACTION,
    count_leak_prevented: true,
    unauthorized_count_included: false,
    unauthorized_amount_included: false,
    candidate_count_included: false,
    source_statuses: Object.freeze([
      Object.freeze({
        source: "master-data.ClientGroup",
        status: "passed",
      }),
    ]),
    production_ready_claim: false,
  });
  return Object.freeze({
    access_scope: accessScope,
    client_reference_access: clientReferenceAccess(
      activeGroups,
      allowedClientGroupIds,
    ),
  });
}

export function resolveClientOperationsAccessScope(input = {}) {
  return resolveClientOperationsAccess(input).access_scope;
}

export function createClientOperationsReadModel({
  masterDataRepository,
  financeRepository = null,
  crmRepository = null,
  matterRepository = null,
  clock = () => new Date(),
} = {}) {
  if (typeof clock !== "function") {
    throw new TypeError(
      "Client operations read model clock must be a function",
    );
  }

  function readWithAccess({
    tenant_id,
    permission_context,
    project,
  } = {}) {
    const resolved = resolveClientOperationsAccess({
      masterDataRepository,
      tenant_id,
      permission_context,
    });
    const accessScope = resolved.access_scope;
    if (
      accessScope.allowed_client_group_ids.length === 0
      || typeof project !== "function"
    ) {
      return Object.freeze({
        access_scope: accessScope,
        item: null,
        downstream_sources_read: false,
      });
    }
    return Object.freeze({
      access_scope: accessScope,
      item: project(Object.freeze({
        access_scope: accessScope,
        client_reference_access:
          resolved.client_reference_access,
        financeRepository,
        crmRepository,
        matterRepository,
      })),
      downstream_sources_read: true,
    });
  }

  return Object.freeze({
    resolveAccessScope({ tenant_id, permission_context } = {}) {
      return resolveClientOperationsAccessScope({
        masterDataRepository,
        tenant_id,
        permission_context,
      });
    },
    readDirectory({ tenant_id, permission_context } = {}) {
      const resolved = resolveClientOperationsAccess({
        masterDataRepository,
        tenant_id,
        permission_context,
      });
      const accessScope = resolved.access_scope;
      return Object.freeze({
        access_scope: accessScope,
        items: clientDirectoryItems(accessScope),
        downstream_sources_read: false,
      });
    },
    readClientDetail({
      tenant_id,
      permission_context,
      client_group_id,
    } = {}) {
      const resolved = resolveClientOperationsAccess({
        masterDataRepository,
        tenant_id,
        permission_context,
      });
      const accessScope = resolved.access_scope;
      const clientGroupId = requiredText(
        client_group_id,
        "client_group_id",
      );
      if (
        !accessScope.allowed_client_group_ids.includes(clientGroupId)
      ) {
        return Object.freeze({
          access_scope: accessScope,
          item: null,
          downstream_sources_read: false,
        });
      }
      return Object.freeze({
        access_scope: accessScope,
        item: buildClientOperationsDetail({
          access_scope: accessScope,
          client_reference_access:
            resolved.client_reference_access,
          masterDataRepository,
          crmRepository,
          matterRepository,
          tenant_id,
          permission_context,
          client_group_id: clientGroupId,
          generated_at: clock(),
        }),
        downstream_sources_read: true,
      });
    },
    read({
      tenant_id,
      permission_context,
      project,
    } = {}) {
      return readWithAccess({
        tenant_id,
        permission_context,
        project,
      });
    },
    readKpis({
      tenant_id,
      permission_context,
      as_of,
      timezone = CLIENT_OPERATIONS_TIMEZONE,
    } = {}) {
      return readWithAccess({
        tenant_id,
        permission_context,
        project: ({
          access_scope,
          client_reference_access,
        }) => buildClientOperationsKpis({
          access_scope,
          client_reference_access,
          financeRepository,
          crmRepository,
          tenant_id,
          permission_context,
          as_of,
          timezone,
        }),
      });
    },
    readAttentionItems({
      tenant_id,
      permission_context,
      as_of,
      timezone = CLIENT_OPERATIONS_TIMEZONE,
    } = {}) {
      return readWithAccess({
        tenant_id,
        permission_context,
        project: ({
          access_scope,
          client_reference_access,
        }) => buildClientOperationsAttentionItems({
          access_scope,
          client_reference_access,
          financeRepository,
          crmRepository,
          tenant_id,
          permission_context,
          as_of,
          timezone,
        }),
      });
    },
    readTrendsAndRankings({
      tenant_id,
      permission_context,
      as_of,
      timezone = CLIENT_OPERATIONS_TIMEZONE,
      revenue_ranking_period = "year",
    } = {}) {
      return readWithAccess({
        tenant_id,
        permission_context,
        project: ({
          access_scope,
          client_reference_access,
        }) => buildClientOperationsTrendsAndRankings({
          access_scope,
          client_reference_access,
          financeRepository,
          crmRepository,
          tenant_id,
          permission_context,
          as_of,
          timezone,
          revenue_ranking_period,
        }),
      });
    },
    readDashboard({
      tenant_id,
      permission_context,
      as_of,
      timezone = CLIENT_OPERATIONS_TIMEZONE,
      revenue_ranking_period = "year",
    } = {}) {
      const asOf = canonicalAsOf(as_of);
      if (timezone !== CLIENT_OPERATIONS_TIMEZONE) {
        throw new TypeError(
          "Client operations timezone must be Asia/Seoul",
        );
      }
      revenueRankingPeriod(
        asOf,
        timezone,
        revenue_ranking_period,
      );
      const generatedAt = canonicalAsOf(clock()).toISOString();
      const resolved = resolveClientOperationsAccess({
        masterDataRepository,
        tenant_id,
        permission_context,
      });
      const accessScope = resolved.access_scope;
      if (accessScope.allowed_client_group_ids.length === 0) {
        return Object.freeze({
          access_scope: accessScope,
          item: dashboardUnavailableItem({
            accessScope,
            generatedAt,
            asOf,
            timeZone: timezone,
          }),
          downstream_sources_read: false,
        });
      }
      return Object.freeze({
        access_scope: accessScope,
        item: buildClientOperationsDashboard({
          access_scope: accessScope,
          client_reference_access:
            resolved.client_reference_access,
          financeRepository,
          crmRepository,
          tenant_id,
          permission_context,
          as_of: asOf,
          generated_at: generatedAt,
          timezone,
          revenue_ranking_period,
        }),
        downstream_sources_read: true,
      });
    },
    production_ready_claim: false,
  });
}
