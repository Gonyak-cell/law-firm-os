import { evaluatePermission } from "../../authz/src/index.js";
import {
  buildClientDepositRevenue,
} from "../../billing/src/client-deposit-revenue-service.js";
import {
  buildClientReceivables,
} from "../../billing/src/client-receivables-service.js";
import {
  projectCrmInquiry,
} from "../../crm/src/inquiry-read-model.js";

const ACTIVE_CLIENT_STATUSES = new Set(["active", "current", "open"]);
const CLIENT_READ_ACTION = "analytics:client:read";
const INQUIRY_READ_ACTION = "crm:inquiry:read";
const CONSULTATION_READ_ACTION = "crm:consultation:read";
const CLIENT_OPERATIONS_TIMEZONE = "Asia/Seoul";
const CLOSED_ACTIVITY_STATUSES = new Set(["archived", "cancelled"]);

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
  { clientGroupFallback = false } = {},
) {
  return objectAcl(permissionContext).filter((entry) => {
    const targetId = entry.resource_id
      ?? (clientGroupFallback ? entry.client_group_id : undefined);
    return targetId === undefined
      || targetId === null
      || targetId === resourceId;
  });
}

function activeClientGroup(record) {
  return ACTIVE_CLIENT_STATUSES.has(
    String(record?.status ?? "active").trim().toLowerCase(),
  );
}

function aclForClientGroup(permissionContext, clientGroupId) {
  return aclForResource(permissionContext, clientGroupId, {
    clientGroupFallback: true,
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
    primary_party_id:
      typeof record?.primary_party_id === "string"
      && record.primary_party_id.trim() !== ""
        ? record.primary_party_id.trim()
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
    objectAcl: aclForResource(permissionContext, resourceId),
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
  const leads = listSource(
    repository,
    tenantId,
    "Lead",
    "crm.Lead",
  ).filter((lead) => (
    readDecision(permissionContext, {
      action: INQUIRY_READ_ACTION,
      resourceType: "crm_inquiry",
      resourceId: lead.lead_id,
      tenantId,
    }).effect === "allow"
  ));
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
  const consultations = listSource(
    repository,
    tenantId,
    "CRMActivity",
    "crm.CRMActivity",
  ).filter((activity) => (
    scopedLeadIds.has(activity.lead_id)
    || scopedOpportunityIds.has(activity.opportunity_id)
  )).filter((activity) => (
    readDecision(permissionContext, {
      action: CONSULTATION_READ_ACTION,
      resourceType: "crm_activity",
      resourceId:
        activity.crm_activity_id
        ?? activity.activity_id
        ?? activity.resource_id,
      tenantId,
    }).effect === "allow"
  ));

  return Object.freeze({
    consultations: Object.freeze(consultations),
    projections: Object.freeze(scopedLeads.map((lead) => (
      projectCrmInquiry({
        lead,
        opportunities: scopedOpportunities,
        activities: consultations,
      })
    ))),
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

function resolveClientOperationsAccess({
  masterDataRepository,
  tenant_id,
  permission_context,
} = {}) {
  if (typeof masterDataRepository?.list !== "function") {
    throw new TypeError(
      "Client operations require a Master Data repository",
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
    throw new TypeError("ClientGroup repository list must return an array");
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
} = {}) {
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
    production_ready_claim: false,
  });
}
