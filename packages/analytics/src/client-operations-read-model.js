import { evaluatePermission } from "../../authz/src/index.js";

const ACTIVE_CLIENT_STATUSES = new Set(["active", "current", "open"]);
const CLIENT_READ_ACTION = "analytics:client:read";

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

function activeClientGroup(record) {
  return ACTIVE_CLIENT_STATUSES.has(
    String(record?.status ?? "active").trim().toLowerCase(),
  );
}

function aclForClientGroup(permissionContext, clientGroupId) {
  const objectAcl = Array.isArray(permissionContext?.object_acl)
    ? permissionContext.object_acl
    : [];
  return objectAcl.filter((entry) => {
    const targetId = entry.resource_id ?? entry.client_group_id;
    return targetId === undefined
      || targetId === null
      || targetId === clientGroupId;
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
    rules: Array.isArray(permissionContext.rules)
      ? permissionContext.rules
      : [],
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

export function resolveClientOperationsAccessScope({
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

  return Object.freeze({
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
}

export function createClientOperationsReadModel({
  masterDataRepository,
  financeRepository = null,
  crmRepository = null,
  matterRepository = null,
} = {}) {
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
      const accessScope = resolveClientOperationsAccessScope({
        masterDataRepository,
        tenant_id,
        permission_context,
      });
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
          financeRepository,
          crmRepository,
          matterRepository,
        })),
        downstream_sources_read: true,
      });
    },
    production_ready_claim: false,
  });
}
