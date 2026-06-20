function allowedByPartySet(allowedPartyIds, partyId) {
  return !allowedPartyIds || allowedPartyIds.includes(partyId);
}

export function trimPartyItemsByPermission({ items = [], allowedPartyIds } = {}) {
  const allowedSet = Array.isArray(allowedPartyIds) ? allowedPartyIds : undefined;
  return Object.freeze(
    items.filter((item) => {
      const partyId = item.party_id ?? item.legal_client_party_id ?? item.billing_client_party_id ?? item.primary_party_id;
      return partyId ? allowedByPartySet(allowedSet, partyId) : true;
    }),
  );
}

export function partyPermissionResponse({ items = [], allowedPartyIds } = {}) {
  return Object.freeze({
    outcome: "passed",
    items: trimPartyItemsByPermission({ items, allowedPartyIds }),
    omitted_item_count: null,
    count_leak_prevented: true,
  });
}
