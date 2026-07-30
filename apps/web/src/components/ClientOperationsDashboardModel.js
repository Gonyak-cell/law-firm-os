const KPI_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "new_inquiries",
    label: "새 문의",
    valueKind: "count",
    basis: "현재",
    route: Object.freeze({
      view: "clients",
      section: "client-leads",
      routeContext: Object.freeze({ filter: "new" }),
    }),
  }),
  Object.freeze({
    id: "consultations_today",
    label: "오늘 상담",
    valueKind: "count",
    basis: "오늘",
    route: Object.freeze({
      view: "clients",
      section: "client-consultation-proposals",
      routeContext: Object.freeze({ filter: "today" }),
    }),
  }),
  Object.freeze({
    id: "engagement_reviews",
    label: "수임 검토 중",
    valueKind: "count",
    basis: "현재",
    route: Object.freeze({
      view: "clients",
      section: "client-opportunities",
      routeContext: Object.freeze({ filter: "reviewing" }),
    }),
  }),
  Object.freeze({
    id: "deposit_revenue_month",
    label: "이번 달 입금 매출",
    valueKind: "money",
    basis: "이번 달 고객 입금에서 환불 차감",
    route: Object.freeze({
      view: "clients",
      section: "client-sales-history",
      routeContext: Object.freeze({ filter: "current_month" }),
    }),
  }),
  Object.freeze({
    id: "receivables_total",
    label: "총 미수금",
    valueKind: "money",
    basis: "금액이 확정된 수임료 기준",
    route: Object.freeze({
      view: "clients",
      section: "client-billing",
      routeContext: Object.freeze({ filter: "outstanding" }),
    }),
  }),
]);

const ATTENTION_SECTION_ROUTES = Object.freeze({
  new_inquiries: "client-leads",
  consultations: "client-consultation-proposals",
  engagement_status: "client-opportunities",
  deposit_revenue: "client-sales-history",
  receivables: "client-billing",
  client_details: "clients-list",
});

function resultState(result) {
  if (result === null || result === undefined || result.kind === "loading") {
    return "loading";
  }
  if (result.kind === "guarded") {
    if (result.uiState === "denied") return "denied";
    if (result.uiState === "review_required") return "review_required";
    return "error";
  }
  if (result.kind === "error") return "error";
  if (result.kind !== "data") return "error";
  if (
    result.uiState === "permission_denied"
    || result.uiState === "denied"
  ) {
    return "denied";
  }
  if (
    result.uiState === "review"
    || result.uiState === "review_required"
  ) {
    return "review_required";
  }
  if (result.uiState === "no_data" || result.outcome === "empty") {
    return "empty";
  }
  if (result.uiState === "partial" || result.outcome === "partial") {
    return "partial";
  }
  return "data";
}

function sectionState(status, fallback) {
  if (status === "available") return "data";
  if (status === "no_data") return "empty";
  if (status === "permission_denied") return "denied";
  if (status === "error") return "error";
  if (status === "partial") return "partial";
  return fallback;
}

function validMetricValue(value, valueKind, id) {
  if (!Number.isSafeInteger(value)) return false;
  if (valueKind === "count" || id === "receivables_total") {
    return value >= 0;
  }
  return true;
}

function routeContext(destination) {
  const context = {};
  if (typeof destination?.filter === "string" && destination.filter) {
    context.filter = destination.filter;
  }
  if (
    typeof destination?.record_id === "string"
    && destination.record_id
  ) {
    context.recordId = destination.record_id;
  }
  if (
    typeof destination?.inquiry_id === "string"
    && destination.inquiry_id
  ) {
    context.inquiryId = destination.inquiry_id;
  }
  return Object.freeze(context);
}

export function resolveClientOperationsDestination(destination) {
  const section = ATTENTION_SECTION_ROUTES[destination?.section];
  if (!section) return null;
  return Object.freeze({
    view: "clients",
    section,
    routeContext: routeContext(destination),
  });
}

function validAttentionItem(item) {
  return (
    item !== null
    && typeof item === "object"
    && typeof item.attention_item_id === "string"
    && Boolean(item.attention_item_id)
    && typeof item.label === "string"
    && Boolean(item.label)
    && typeof item.title === "string"
    && Boolean(item.title)
  );
}

function attentionModel(section, fallbackState) {
  const data = section?.data;
  const sourceItems = Array.isArray(data?.items) ? data.items : [];
  const malformed = sourceItems.some((item) => !validAttentionItem(item));
  const state = malformed
    ? "error"
    : sectionState(section?.status, fallbackState);
  const items = malformed
    ? []
    : sourceItems.map((item) => Object.freeze({
      id: item.attention_item_id,
      type: item.attention_type,
      label: item.label,
      title: item.title,
      dueAt: item.due_at ?? item.occurred_at ?? null,
      amount: Number.isSafeInteger(item.amount) ? item.amount : null,
      currency: item.currency === "KRW" ? "KRW" : null,
      assigned: Boolean(item.assigned_user_id),
      route: resolveClientOperationsDestination(item.destination),
    }));
  return Object.freeze({
    state,
    items: Object.freeze(items),
    typeStatuses: Object.freeze({ ...(data?.type_statuses ?? {}) }),
  });
}

export function buildClientOperationsDashboardModel(result) {
  const state = resultState(result);
  const sections = result?.kind === "data" && result.sections
    ? result.sections
    : {};
  const kpiSection = sections.kpis;
  const values = kpiSection?.data?.values ?? {};
  const metricStatuses = kpiSection?.data?.metric_statuses ?? {};
  const kpis = KPI_DEFINITIONS.map((definition) => {
    const metricState = sectionState(
      metricStatuses[definition.id] ?? kpiSection?.status,
      state,
    );
    const value = values[definition.id];
    const valid = validMetricValue(
      value,
      definition.valueKind,
      definition.id,
    );
    return Object.freeze({
      ...definition,
      state: ["data", "partial"].includes(metricState) && !valid
        ? "error"
        : metricState,
      value: valid ? value : null,
    });
  });

  return Object.freeze({
    state,
    generatedAt: result?.generatedAt ?? null,
    asOf: result?.asOf ?? null,
    timezone: result?.timezone ?? null,
    kpis: Object.freeze(kpis),
    attention: attentionModel(sections.attention_items, state),
    sourceStatuses: Object.freeze([
      ...(Array.isArray(result?.sourceStatuses)
        ? result.sourceStatuses
        : []),
    ]),
  });
}

export { KPI_DEFINITIONS as CLIENT_OPERATIONS_KPI_DEFINITIONS };
