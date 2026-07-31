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

const INQUIRY_STATUS_DEFINITIONS = Object.freeze([
  Object.freeze({ code: "new", label: "새 문의" }),
  Object.freeze({ code: "reviewing", label: "확인 중" }),
  Object.freeze({
    code: "consultation_scheduled",
    label: "상담 예정",
  }),
  Object.freeze({
    code: "engagement_review",
    label: "수임 검토 중",
  }),
  Object.freeze({ code: "engaged", label: "수임 확정" }),
  Object.freeze({
    code: "not_engaged",
    label: "수임하지 않음",
  }),
]);
const REVENUE_PERIOD_LABELS = Object.freeze({
  month: "이번 달",
  quarter: "이번 분기",
  year: "올해 누적",
});
const MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const CLIENT_RANKING_LIMIT = 10;

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
  for (const key of ["month", "tab", "period"]) {
    if (typeof destination?.[key] === "string" && destination[key]) {
      context[key] = destination[key];
    }
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

function sectionDataState(section, fallbackState, valid) {
  const state = sectionState(section?.status, fallbackState);
  return ["data", "partial"].includes(state) && !valid
    ? "error"
    : state;
}

function monthlyRevenueModel(section, fallbackState) {
  const data = section?.data;
  const sourcePoints = Array.isArray(data?.points)
    ? data.points
    : [];
  const points = sourcePoints.map((point) => ({
    month: point?.month,
    amount: point?.net_deposit_revenue,
    route: resolveClientOperationsDestination(point?.destination),
  }));
  const monthKeys = points.map(({ month }) => month);
  const pointTotal = points.reduce(
    (sum, point) => sum + (
      Number.isSafeInteger(point.amount) ? point.amount : 0
    ),
    0,
  );
  const valid = (
    data !== null
    && typeof data === "object"
    && Number.isSafeInteger(data.total)
    && data.period?.month_count === 12
    && typeof data.period?.from === "string"
    && typeof data.period?.to === "string"
    && points.length === 12
    && new Set(monthKeys).size === 12
    && monthKeys.every((month, index) => (
      index === 0 || month > monthKeys[index - 1]
    ))
    && points.every((point) => (
      MONTH_PATTERN.test(point.month)
      && Number.isSafeInteger(point.amount)
      && point.route !== null
    ))
    && pointTotal === data.total
  );
  const state = sectionDataState(
    section,
    fallbackState,
    valid,
  );
  return Object.freeze({
    state,
    total: valid ? data.total : null,
    period: valid
      ? Object.freeze({
        from: data.period.from,
        to: data.period.to,
      })
      : null,
    points: Object.freeze(valid
      ? points.map((point) => Object.freeze(point))
      : []),
  });
}

function inquiryStatusModel(section, fallbackState) {
  const data = section?.data;
  const sourceItems = Array.isArray(data?.items)
    ? data.items
    : [];
  const items = sourceItems.map((item, index) => ({
    code: item?.code,
    label: INQUIRY_STATUS_DEFINITIONS[index]?.label,
    count: item?.count,
    route: resolveClientOperationsDestination(item?.destination),
  }));
  const sum = items.reduce(
    (total, item) => total + (
      Number.isSafeInteger(item.count) ? item.count : 0
    ),
    0,
  );
  const valid = (
    data !== null
    && typeof data === "object"
    && Number.isSafeInteger(data.total)
    && data.total >= 0
    && items.length === INQUIRY_STATUS_DEFINITIONS.length
    && items.every((item, index) => (
      item.code === INQUIRY_STATUS_DEFINITIONS[index].code
      && Number.isSafeInteger(item.count)
      && item.count >= 0
      && item.route !== null
    ))
    && sum === data.total
  );
  const state = sectionDataState(
    section,
    fallbackState,
    valid,
  );
  return Object.freeze({
    state,
    total: valid ? data.total : null,
    items: Object.freeze(valid
      ? items.map((item) => Object.freeze(item))
      : []),
  });
}

function rankingRows(data, amountField) {
  const sourceItems = Array.isArray(data?.items)
    ? data.items
    : [];
  return sourceItems.map((item) => ({
    rank: item?.rank,
    clientId: item?.client_group_id,
    displayName: item?.display_name,
    amount: item?.[amountField],
    latestDepositAt: item?.latest_deposit_at ?? null,
    earliestDueDate: item?.earliest_due_date ?? null,
    route: resolveClientOperationsDestination(item?.destination),
  }));
}

function validRankingRows(rows) {
  return rows.every((row, index) => (
    row.rank === index + 1
    && typeof row.clientId === "string"
    && Boolean(row.clientId)
    && typeof row.displayName === "string"
    && Boolean(row.displayName)
    && Number.isSafeInteger(row.amount)
    && row.route !== null
  ));
}

function rankingModel(
  section,
  fallbackState,
  {
    amountField,
    revenue = false,
  },
) {
  const data = section?.data;
  const rows = rankingRows(data, amountField);
  const total = rows.reduce(
    (sum, row) => sum + (
      Number.isSafeInteger(row.amount) ? row.amount : 0
    ),
    0,
  );
  const periodCode = data?.selected_period?.code;
  const periodValid = !revenue || (
    typeof REVENUE_PERIOD_LABELS[periodCode] === "string"
    && typeof data?.selected_period?.from === "string"
    && typeof data?.selected_period?.to === "string"
  );
  const unknownAmountCount = revenue
    ? 0
    : data?.unknown_amount_count;
  const valid = (
    data !== null
    && typeof data === "object"
    && Number.isSafeInteger(data.total)
    && validRankingRows(rows)
    && total === data.total
    && periodValid
    && (
      revenue
      || (
        Number.isSafeInteger(unknownAmountCount)
        && unknownAmountCount >= 0
      )
    )
  );
  const state = sectionDataState(
    section,
    fallbackState,
    valid,
  );
  return Object.freeze({
    state,
    total: valid ? data.total : null,
    displayedTotal: valid
      ? rows.slice(0, CLIENT_RANKING_LIMIT).reduce(
        (sum, row) => sum + row.amount,
        0,
      )
      : null,
    period: valid && revenue
      ? Object.freeze({
        code: periodCode,
        label: REVENUE_PERIOD_LABELS[periodCode],
        from: data.selected_period.from,
        to: data.selected_period.to,
      })
      : null,
    asOf: valid && !revenue ? data.as_of ?? null : null,
    unknownAmountCount: valid ? unknownAmountCount : null,
    items: Object.freeze(valid
      ? rows.slice(0, CLIENT_RANKING_LIMIT)
        .map((row) => Object.freeze(row))
      : []),
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
    monthlyRevenue: monthlyRevenueModel(
      sections.monthly_deposit_revenue,
      state,
    ),
    inquiryStatus: inquiryStatusModel(
      sections.inquiry_status,
      state,
    ),
    revenueRanking: rankingModel(
      sections.revenue_ranking,
      state,
      {
        amountField: "net_deposit_revenue",
        revenue: true,
      },
    ),
    receivablesRanking: rankingModel(
      sections.receivables_ranking,
      state,
      {
        amountField: "receivable_amount",
      },
    ),
    sourceStatuses: Object.freeze([
      ...(Array.isArray(result?.sourceStatuses)
        ? result.sourceStatuses
        : []),
    ]),
  });
}

export {
  INQUIRY_STATUS_DEFINITIONS as CLIENT_INQUIRY_STATUS_DEFINITIONS,
  KPI_DEFINITIONS as CLIENT_OPERATIONS_KPI_DEFINITIONS,
};
