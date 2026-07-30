const CLIENT_DETAIL_TAB_IDS = Object.freeze([
  "overview",
  "contacts",
  "matters",
  "inquiries"
]);

const CLIENT_DETAIL_TAB_SET = new Set(CLIENT_DETAIL_TAB_IDS);

const CLIENT_RELATED_ROUTE_TABS = Object.freeze({
  deposit_revenue: Object.freeze({
    section: "client-sales-history",
    label: "입금 매출 내역"
  }),
  receivables: Object.freeze({
    section: "client-billing",
    label: "수임료·미수금"
  })
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function itemsOf(result) {
  return result?.kind === "data" && Array.isArray(result.items)
    ? result.items
    : [];
}

export function clientDirectoryRecordId(client) {
  return text(client?.client_group_id) || null;
}

export function normalizeClientDetailTab(value) {
  const requested = text(value);
  return CLIENT_DETAIL_TAB_SET.has(requested) ? requested : "overview";
}

export function clientDetailRouteContext(value) {
  const requested = text(value);
  return Object.freeze({
    requestedTab: requested || "overview",
    activeTab: normalizeClientDetailTab(requested),
    relatedRoute: CLIENT_RELATED_ROUTE_TABS[requested] ?? null
  });
}

function sourceState(status) {
  return {
    available: "available",
    no_data: "empty",
    partial: "partial",
    permission_denied: "denied",
    error: "error"
  }[status] ?? "error";
}

function wholeDetailState(result) {
  if (result === null || result === undefined) return "loading";
  if (result.kind === "empty") return "denied";
  if (result.kind === "error") return "error";
  if (result.kind === "guarded") {
    return result.uiState === "review_required"
      ? "review_required"
      : "denied";
  }
  return result.kind === "data" ? null : "error";
}

function emptySection(state) {
  return Object.freeze({
    state,
    items: Object.freeze([])
  });
}

function contactItems(section) {
  return Object.freeze(
    (section?.data?.items ?? []).map((item) => Object.freeze({
      contactId: text(item.contact_id) || null,
      displayName: text(item.display_name) || "이름 미등록",
      contactType: text(item.primary_contact_type) || null,
      contactValue: null,
      contactValueIncluded: false,
      contactValueMasked: item.contact_value_masked === true,
      contactPoints: Object.freeze(
        (Array.isArray(item.contact_points) ? item.contact_points : [])
          .map((point) => Object.freeze({
            contactType: text(point.contact_type) || null,
            contactValue: null,
            contactValueIncluded: false,
            contactValueMasked: point.contact_value_masked === true,
            isPrimary: point.is_primary === true,
            status: text(point.status) || null
          }))
      ),
      status: text(item.status) || null
    }))
  );
}

function matterItems(section) {
  return Object.freeze(
    (section?.data?.items ?? []).map((item) => Object.freeze({
      matterId: text(item.matter_id) || null,
      displayName: text(item.display_name) || "이름 미등록",
      matterCode: text(item.matter_code) || null,
      status: text(item.status) || null,
      openedAt: text(item.opened_at) || null
    }))
  );
}

function inquiryItems(section) {
  return Object.freeze(
    (section?.data?.items ?? []).map((item) => Object.freeze({
      inquiryId: text(item.lead_id) || null,
      displayName: text(item.display_name) || "이름 미등록",
      visibleStatus: text(item.visible_status) || null,
      visibleStatusLabel:
        text(item.visible_status_label) || "상태 확인 필요",
      source: text(item.source) || null,
      receivedAt: text(item.received_at) || null,
      nextAction: text(item.next_action) || null,
      assigned: item.assigned === true
    }))
  );
}

function detailSection(section, mapItems, fallbackState) {
  if (fallbackState) return emptySection(fallbackState);
  if (!section) return emptySection("error");
  return Object.freeze({
    state: sourceState(section.status),
    items: mapItems(section)
  });
}

function selectedDetailClient(directoryClient, operationsResult) {
  if (operationsResult?.kind !== "data") return directoryClient;
  const detailClient = operationsResult.item?.client;
  if (
    clientDirectoryRecordId(detailClient)
      !== clientDirectoryRecordId(directoryClient)
  ) {
    return null;
  }
  return Object.freeze({
    ...directoryClient,
    ...detailClient
  });
}

export function buildClientDirectoryModel({
  clientsResult,
  operationsResult = null,
  requestedRecordId = "",
  requestedTab = ""
} = {}) {
  const clients = itemsOf(clientsResult);
  const recordId = text(requestedRecordId);
  const directoryClient = recordId
    ? clients.find((client) => clientDirectoryRecordId(client) === recordId)
      ?? null
    : null;
  const route = clientDetailRouteContext(requestedTab);
  if (!directoryClient) {
    return Object.freeze({
      clients: Object.freeze(clients),
      selectedClient: null,
      requestedRecordAvailable: recordId ? false : null,
      route,
      contacts: emptySection("empty"),
      matters: emptySection("empty"),
      inquiries: emptySection("empty"),
      countLeakPrevented: true
    });
  }

  const selectedClient = selectedDetailClient(
    directoryClient,
    operationsResult
  );
  if (!selectedClient) {
    return Object.freeze({
      clients: Object.freeze(clients),
      selectedClient: null,
      requestedRecordAvailable: false,
      route,
      contacts: emptySection("error"),
      matters: emptySection("error"),
      inquiries: emptySection("error"),
      countLeakPrevented: true
    });
  }

  const fallbackState = wholeDetailState(operationsResult);
  const sections = operationsResult?.kind === "data"
    ? operationsResult.item?.sections
    : null;
  return Object.freeze({
    clients: Object.freeze(clients),
    selectedClient,
    requestedRecordAvailable: true,
    route,
    contacts: detailSection(
      sections?.contacts,
      contactItems,
      fallbackState
    ),
    matters: detailSection(
      sections?.matters,
      matterItems,
      fallbackState
    ),
    inquiries: detailSection(
      sections?.inquiries,
      inquiryItems,
      fallbackState
    ),
    countLeakPrevented: true
  });
}

export { CLIENT_DETAIL_TAB_IDS };
