import {
  createExternalReadProviderOnboardingService,
  createExternalReadProviderPackCatalog,
  createExternalReadProviderRegistry,
} from "../../../packages/integrations-core/src/index.js";
import { evaluateRouteDecision } from "./permission-gate.js";

export const EXTERNAL_READ_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "external-read-integrations",
  contract_schema_version: "law-firm-os.external-read-onboarding.v1",
  endpoints: Object.freeze([
    "GET /api/external-read/providers",
    "GET /api/external-read/legal-entities",
    "POST /api/external-read/connections",
    "GET /api/external-read/connections/:connectionId",
    "GET /api/external-read/connections/:connectionId/first-sync",
    "GET /api/external-read/connections/:connectionId/latest-sync",
    "POST /api/external-read/connections/:connectionId/sync",
    "POST /api/external-read/connections/:connectionId/rotate",
    "POST /api/external-read/connections/:connectionId/disable",
    "POST /api/external-read/connections/:connectionId/reconnect",
    "POST /api/external-read/connections/:connectionId/revoke",
    "POST /api/external-read/connections/:connectionId/repair",
  ]),
  authentication: "required",
  tenant_and_legal_entity_scoped: true,
  credential_authority: "aws-secrets-manager-reference-only",
  supported_authentication: Object.freeze(["api_key_header"]),
  provider_writes_allowed: false,
  production_ready_claim: false,
  fail_closed: true,
});

const ACTIONS = Object.freeze({
  list: "external_read.provider.list",
  listLegalEntities: "external_read.legal_entity.list",
  create: "external_read.connection.create",
  read: "external_read.connection.read",
  data: "external_read.data.read",
  sync: "external_read.connection.sync",
  rotate: "external_read.connection.rotate",
  disable: "external_read.connection.disable",
  reconnect: "external_read.connection.reconnect",
  revoke: "external_read.connection.revoke",
  repair: "external_read.connection.repair",
});

const LEGAL_ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;

function blocked(status, requestId, code, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: [code],
      ...extra,
      credential_material_included: false,
      raw_provider_payload_included: false,
      production_ready_claim: false,
    },
  };
}

function allowed(context, tenantId, action, resourceType, resourceId = null) {
  if (!tenantId || context?.principal?.tenant_id !== tenantId) return false;
  return evaluateRouteDecision({
    context,
    resource: {
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
    },
    action,
  }).effect === "allow";
}

function connectionIdFromPath(pathname, suffix = "") {
  const prefix = "/api/external-read/connections/";
  if (!pathname.startsWith(prefix) || (suffix && !pathname.endsWith(suffix))) return null;
  const end = suffix ? pathname.length - suffix.length : pathname.length;
  const encoded = pathname.slice(prefix.length, end);
  if (!encoded || encoded.includes("/")) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

async function legalEntityIds(directory, tenantId) {
  if (typeof directory?.listEmploymentProfiles !== "function") return null;
  const profiles = await directory.listEmploymentProfiles({ tenant_id: tenantId });
  if (!Array.isArray(profiles)) throw new TypeError("legal entity directory is invalid");
  const ids = new Set();
  for (const profile of profiles) {
    if (profile?.tenant_id !== tenantId || profile.legal_entity_id == null) continue;
    if (!LEGAL_ENTITY_ID.test(profile.legal_entity_id)) {
      throw new TypeError("legal entity directory contains an invalid identifier");
    }
    ids.add(profile.legal_entity_id);
  }
  return Object.freeze([...ids].sort((left, right) => left.localeCompare(right, "en")));
}

function mapError(error, requestId) {
  const code = /^[A-Z][A-Z0-9_]{2,127}$/u.test(String(error?.safe_error_code ?? ""))
    ? error.safe_error_code
    : "EXTERNAL_READ_REQUEST_FAILED";
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : error instanceof TypeError ? 400 : 500;
  return blocked(status, requestId, code, error?.connection
    ? { connection: error.connection }
    : {});
}

export function createExternalReadRuntime({
  packs = [],
  credentialVault = null,
  repository = null,
  fetchImpl = globalThis.fetch,
  clock = () => new Date().toISOString(),
  idFactory,
  operational = false,
} = {}) {
  const catalog = createExternalReadProviderPackCatalog({ packs });
  if (catalog.provider_count === 0) {
    return Object.freeze({
      catalog,
      registry: createExternalReadProviderRegistry(),
      service: null,
      operational,
      readiness: Object.freeze({
        provider_count: 0,
        api_key_onboarding_available: false,
        state: "no_approved_providers",
        production_ready_claim: false,
      }),
    });
  }
  if (typeof credentialVault?.resolveApiKey !== "function") {
    throw new TypeError("external read credential vault resolveApiKey is required");
  }
  const registry = createExternalReadProviderRegistry({
    providers: catalog.providers({
      fetch_impl: fetchImpl,
      resolve_credential: (input) => credentialVault.resolveApiKey(input),
      clock,
    }),
  });
  const service = createExternalReadProviderOnboardingService({
    catalog,
    provider_registry: registry,
    credential_vault: credentialVault,
    repository,
    clock,
    idFactory,
    operational,
  });
  return Object.freeze({
    catalog,
    registry,
    service,
    operational,
    readiness: Object.freeze({
      provider_count: catalog.provider_count,
      api_key_onboarding_available: true,
      state: "configured",
      production_ready_claim: false,
    }),
  });
}

export function createFailClosedExternalReadRuntime() {
  return createExternalReadRuntime();
}

export async function runExternalReadScheduledSync({
  service,
  targets = [],
  schedule_window,
  actor_id = "external-read-scheduler",
} = {}) {
  if (!service || typeof service.syncConnection !== "function") {
    throw new TypeError("external read lifecycle service is required");
  }
  if (!Array.isArray(targets) || targets.length > 100) {
    throw new TypeError("scheduled sync targets must contain at most 100 entries");
  }
  const scheduleWindow = typeof schedule_window === "string" ? schedule_window.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(scheduleWindow)) {
    throw new TypeError("schedule_window is invalid");
  }
  const actorId = typeof actor_id === "string" ? actor_id.trim() : "";
  if (!actorId) throw new TypeError("actor_id is invalid");
  const receipts = [];
  for (const target of targets) {
    try {
      const result = await service.syncConnection({
        tenant_id: target?.tenant_id,
        legal_entity_id: target?.legal_entity_id,
        connection_id: target?.connection_id,
        actor_id: actorId,
        idempotency_key: `scheduled:${scheduleWindow}:${target?.connection_id ?? "missing"}`,
      });
      receipts.push(Object.freeze({
        tenant_id: target?.tenant_id ?? null,
        legal_entity_id: target?.legal_entity_id ?? null,
        connection_id: target?.connection_id ?? null,
        outcome: "synchronized",
        operation_id: result.operation.operation_id,
        sync_receipt_ref: result.operation.result?.sync_receipt_ref ?? null,
        replayed: result.replayed === true,
        safe_error_code: null,
      }));
    } catch (error) {
      receipts.push(Object.freeze({
        tenant_id: target?.tenant_id ?? null,
        legal_entity_id: target?.legal_entity_id ?? null,
        connection_id: target?.connection_id ?? null,
        outcome: "failed",
        operation_id: null,
        sync_receipt_ref: null,
        replayed: false,
        safe_error_code: /^[A-Z][A-Z0-9_]{2,127}$/u.test(String(error?.safe_error_code ?? ""))
          ? error.safe_error_code
          : "EXTERNAL_READ_SCHEDULED_SYNC_FAILED",
      }));
    }
  }
  return Object.freeze({
    schedule_window: scheduleWindow,
    target_count: targets.length,
    synchronized_count: receipts.filter(({ outcome }) => outcome === "synchronized").length,
    failed_count: receipts.filter(({ outcome }) => outcome === "failed").length,
    receipts: Object.freeze(receipts),
    credential_material_included: false,
    raw_provider_payload_included: false,
    production_ready_claim: false,
  });
}

export async function handleExternalReadApiRequest({
  pathname,
  method,
  query = {},
  body = {},
  context,
  requestId,
  runtime,
  legalEntityDirectory = null,
} = {}) {
  const principal = context?.principal;
  if (!principal?.tenant_id || !principal?.user_id) {
    return blocked(401, requestId, "EXTERNAL_READ_AUTHENTICATION_REQUIRED");
  }
  const tenantId = String(body.tenant_id ?? query.tenant_id ?? principal.tenant_id).trim();

  if (pathname === "/api/external-read/providers") {
    if (method !== "GET") return blocked(405, requestId, "EXTERNAL_READ_METHOD_NOT_ALLOWED");
    if (!allowed(context, principal.tenant_id, ACTIONS.list, "external_read_provider")) {
      return blocked(403, requestId, "EXTERNAL_READ_PERMISSION_DENIED");
    }
    const items = runtime.catalog.list();
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "ok",
        items,
        provider_count: items.length,
        api_key_onboarding_available: runtime.service !== null,
        credential_material_included: false,
        provider_endpoint_included: false,
        production_ready_claim: false,
      },
    };
  }

  if (pathname === "/api/external-read/legal-entities") {
    if (method !== "GET") return blocked(405, requestId, "EXTERNAL_READ_METHOD_NOT_ALLOWED");
    if (!allowed(context, principal.tenant_id, ACTIONS.listLegalEntities, "external_read_legal_entity")) {
      return blocked(403, requestId, "EXTERNAL_READ_PERMISSION_DENIED");
    }
    try {
      const ids = await legalEntityIds(legalEntityDirectory, principal.tenant_id);
      if (ids === null) {
        return blocked(503, requestId, "EXTERNAL_READ_LEGAL_ENTITY_DIRECTORY_UNAVAILABLE");
      }
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: "ok",
          items: ids.map((legalEntityId) => ({ legal_entity_id: legalEntityId })),
          legal_entity_count: ids.length,
          credential_material_included: false,
          raw_provider_payload_included: false,
          production_ready_claim: false,
        },
      };
    } catch {
      return blocked(503, requestId, "EXTERNAL_READ_LEGAL_ENTITY_DIRECTORY_UNAVAILABLE");
    }
  }

  if (pathname === "/api/external-read/connections") {
    if (method !== "POST") return blocked(405, requestId, "EXTERNAL_READ_METHOD_NOT_ALLOWED");
    if (!allowed(context, tenantId, ACTIONS.create, "external_read_connection")) {
      return blocked(403, requestId, "EXTERNAL_READ_PERMISSION_DENIED");
    }
    if (!runtime.service) {
      return blocked(409, requestId, "EXTERNAL_READ_PROVIDER_UNAVAILABLE");
    }
    try {
      if (runtime.operational === true) {
        const ids = await legalEntityIds(legalEntityDirectory, tenantId);
        if (ids === null) {
          return blocked(503, requestId, "EXTERNAL_READ_LEGAL_ENTITY_DIRECTORY_UNAVAILABLE");
        }
        if (!ids.includes(body.legal_entity_id)) {
          return blocked(404, requestId, "EXTERNAL_READ_LEGAL_ENTITY_NOT_FOUND");
        }
      }
      const connection = await runtime.service.onboardApiKey({
        tenant_id: tenantId,
        legal_entity_id: body.legal_entity_id,
        provider_id: body.provider_id,
        actor_id: principal.user_id,
        idempotency_key: body.idempotency_key,
        api_key: body.api_key,
      });
      return {
        status: connection.replayed ? 200 : 201,
        body: {
          request_id: requestId,
          outcome: "connected",
          connection,
          credential_material_included: false,
          raw_provider_payload_included: false,
          production_ready_claim: false,
        },
      };
    } catch (error) {
      return mapError(error, requestId);
    }
  }

  const firstSyncId = connectionIdFromPath(pathname, "/first-sync");
  if (firstSyncId !== null) {
    if (method !== "GET") return blocked(405, requestId, "EXTERNAL_READ_METHOD_NOT_ALLOWED");
    if (!allowed(context, tenantId, ACTIONS.data, "external_read_snapshot", firstSyncId)) {
      return blocked(403, requestId, "EXTERNAL_READ_PERMISSION_DENIED");
    }
    if (!runtime.service) return blocked(404, requestId, "EXTERNAL_READ_CONNECTION_NOT_FOUND");
    try {
      const snapshot = await runtime.service.readFirstSync({
        tenant_id: tenantId,
        legal_entity_id: query.legal_entity_id,
        connection_id: firstSyncId,
      });
      if (!snapshot) return blocked(404, requestId, "EXTERNAL_READ_SNAPSHOT_NOT_FOUND");
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: "ok",
          snapshot,
          credential_material_included: false,
          raw_provider_payload_included: false,
          production_ready_claim: false,
        },
      };
    } catch (error) {
      return mapError(error, requestId);
    }
  }

  const latestSyncId = connectionIdFromPath(pathname, "/latest-sync");
  if (latestSyncId !== null) {
    if (method !== "GET") return blocked(405, requestId, "EXTERNAL_READ_METHOD_NOT_ALLOWED");
    if (!allowed(context, tenantId, ACTIONS.data, "external_read_snapshot", latestSyncId)) {
      return blocked(403, requestId, "EXTERNAL_READ_PERMISSION_DENIED");
    }
    if (!runtime.service) return blocked(404, requestId, "EXTERNAL_READ_CONNECTION_NOT_FOUND");
    try {
      const snapshot = await runtime.service.readLatestSync({
        tenant_id: tenantId,
        legal_entity_id: query.legal_entity_id,
        connection_id: latestSyncId,
      });
      if (!snapshot) return blocked(404, requestId, "EXTERNAL_READ_SNAPSHOT_NOT_FOUND");
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: "ok",
          snapshot,
          credential_material_included: false,
          raw_provider_payload_included: false,
          production_ready_claim: false,
        },
      };
    } catch (error) {
      return mapError(error, requestId);
    }
  }

  const lifecycleRoutes = Object.freeze([
    ["sync", ACTIONS.sync, "syncConnection"],
    ["rotate", ACTIONS.rotate, "rotateApiKey"],
    ["disable", ACTIONS.disable, "disableConnection"],
    ["reconnect", ACTIONS.reconnect, "reconnectConnection"],
    ["revoke", ACTIONS.revoke, "revokeConnection"],
    ["repair", ACTIONS.repair, "repairConnection"],
  ]);
  for (const [suffix, action, serviceMethod] of lifecycleRoutes) {
    const lifecycleConnectionId = connectionIdFromPath(pathname, `/${suffix}`);
    if (lifecycleConnectionId === null) continue;
    if (method !== "POST") return blocked(405, requestId, "EXTERNAL_READ_METHOD_NOT_ALLOWED");
    if (!allowed(context, tenantId, action, "external_read_connection", lifecycleConnectionId)) {
      return blocked(403, requestId, "EXTERNAL_READ_PERMISSION_DENIED");
    }
    if (!runtime.service) return blocked(404, requestId, "EXTERNAL_READ_CONNECTION_NOT_FOUND");
    try {
      const result = await runtime.service[serviceMethod]({
        tenant_id: tenantId,
        legal_entity_id: body.legal_entity_id,
        connection_id: lifecycleConnectionId,
        actor_id: principal.user_id,
        idempotency_key: body.idempotency_key,
        ...(suffix === "rotate" ? { api_key: body.api_key } : {}),
        ...(["disable", "revoke"].includes(suffix) ? { reason_code: body.reason_code } : {}),
      });
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: result.operation.result?.outcome ?? "completed",
          connection: result.connection,
          operation: result.operation,
          credential_material_included: false,
          raw_provider_payload_included: false,
          production_ready_claim: false,
        },
      };
    } catch (error) {
      return mapError(error, requestId);
    }
  }

  const connectionId = connectionIdFromPath(pathname);
  if (connectionId !== null) {
    if (method !== "GET") return blocked(405, requestId, "EXTERNAL_READ_METHOD_NOT_ALLOWED");
    if (!allowed(context, tenantId, ACTIONS.read, "external_read_connection", connectionId)) {
      return blocked(403, requestId, "EXTERNAL_READ_PERMISSION_DENIED");
    }
    if (!runtime.service) return blocked(404, requestId, "EXTERNAL_READ_CONNECTION_NOT_FOUND");
    try {
      const connection = await runtime.service.getConnection({
        tenant_id: tenantId,
        legal_entity_id: query.legal_entity_id,
        connection_id: connectionId,
      });
      return {
        status: 200,
        body: {
          request_id: requestId,
          outcome: "ok",
          connection,
          credential_material_included: false,
          raw_provider_payload_included: false,
          production_ready_claim: false,
        },
      };
    } catch (error) {
      return mapError(error, requestId);
    }
  }

  return blocked(404, requestId, "EXTERNAL_READ_ROUTE_NOT_FOUND");
}
