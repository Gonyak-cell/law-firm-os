const TENANT_ID = "tenant-a";
const ACTOR_ID = "matter-ui-runtime";

function query(params = {}) {
  return new URLSearchParams({ tenant_id: TENANT_ID, actor_id: ACTOR_ID, ...params }).toString();
}

async function requestJson(path, options = {}) {
  let response;
  let body;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers ?? {})
      }
    });
    body = await response.json();
  } catch {
    return { kind: "error", reason: "network_or_parse_error" };
  }
  if (!response.ok || body === null || typeof body !== "object") {
    return { kind: "error", reason: body?.safe_error_code ?? body?.error ?? "unexpected_response", body };
  }
  return { kind: "data", body };
}

export async function createMatterClearanceToken(input = {}) {
  const result = await requestJson(`/api/matter/clearance-tokens?${query()}`, {
    method: "POST",
    body: JSON.stringify(input)
  });
  if (result.kind !== "data" || !result.body.clearance_token) return { kind: "error", body: result.body };
  return { kind: "data", clearance_token: result.body.clearance_token };
}

export async function reserveMatterNumber(input) {
  const result = await requestJson(`/api/matter/matter-numbers/reservations?${query()}`, {
    method: "POST",
    body: JSON.stringify(input)
  });
  if (result.kind !== "data" || !result.body.reservation) return { kind: "error", body: result.body };
  return { kind: "data", reservation: result.body.reservation };
}

export async function openMatter(input) {
  const result = await requestJson(`/api/matter/matters?${query()}`, {
    method: "POST",
    body: JSON.stringify(input)
  });
  if (result.kind !== "data" || !result.body.matter) return { kind: "error", body: result.body };
  return {
    kind: "data",
    matter: result.body.matter,
    opening_transaction: result.body.opening_transaction,
    wiki_shell: result.body.wiki_shell,
    graph_skeleton: result.body.graph_skeleton
  };
}

export async function fetchMatterDashboard(selectedMatterId) {
  const result = await requestJson(`/api/matter/dashboard?${query({ selected_matter_id: selectedMatterId ?? "" })}`);
  if (result.kind !== "data" || !result.body.dashboard) return { kind: "error", body: result.body };
  return { kind: "data", dashboard: result.body.dashboard };
}

export async function fetchMatterRuntimeEvidence() {
  const result = await requestJson(`/api/matter/runtime/evidence?${query()}`);
  if (result.kind !== "data" || !result.body.evidence) return { kind: "error", body: result.body };
  return { kind: "data", evidence: result.body.evidence };
}
