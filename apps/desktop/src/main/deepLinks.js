export class DeepLinkError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DeepLinkError";
    this.code = code;
  }
}

export const DEEP_LINK_ROUTE_SPECS = Object.freeze({
  matter: Object.freeze({
    host: "matter",
    type: "matter",
    idField: "matterId",
    allowedQuery: Object.freeze(["tenant"])
  }),
  document: Object.freeze({
    host: "document",
    type: "document",
    idField: "documentId",
    allowedQuery: Object.freeze(["matter", "tenant"])
  }),
  task: Object.freeze({
    host: "task",
    type: "task",
    idField: "taskId",
    allowedQuery: Object.freeze(["matter", "tenant"])
  }),
  auth_callback: Object.freeze({
    host: "auth",
    type: "auth_callback",
    path: "/callback",
    allowedQuery: Object.freeze(["code", "state", "issuer"])
  }),
  password_reset_confirm: Object.freeze({
    host: "password-reset",
    type: "password_reset_confirm",
    path: "/confirm",
    allowedQuery: Object.freeze(["token"])
  })
});

export const DEEP_LINK_AUDIT_EVENTS = Object.freeze({
  matter: Object.freeze({
    permission: "deep_link.open.matter",
    opened: "deep_link.matter.opened",
    denied: "deep_link.matter.denied"
  }),
  document: Object.freeze({
    permission: "deep_link.open.document",
    opened: "deep_link.document.opened",
    denied: "deep_link.document.denied"
  }),
  task: Object.freeze({
    permission: "deep_link.open.task",
    opened: "deep_link.task.opened",
    denied: "deep_link.task.denied"
  }),
  auth_callback: Object.freeze({
    permission: null,
    opened: "deep_link.auth_callback.opened",
    denied: "deep_link.auth_callback.denied"
  }),
  password_reset_confirm: Object.freeze({
    permission: null,
    opened: "deep_link.password_reset_confirm.opened",
    denied: "deep_link.password_reset_confirm.denied"
  })
});

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/;
const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;
const REDACTED_RESET_TOKEN = "[reset-token-redacted]";
const FORBIDDEN_ACTION_HOSTS = new Set([
  "mutate",
  "mutation",
  "download",
  "upload",
  "ai",
  "ai-generate",
  "billing",
  "billing-write",
  "delivery",
  "delivery-execution"
]);
const FORBIDDEN_ACTION_QUERY_KEYS = new Set([
  "action",
  "mutation",
  "mutate",
  "download",
  "upload",
  "ai_generate",
  "billing_write",
  "delivery_execution"
]);

function assertNoActionExecution(url) {
  const routeToken = `${url.hostname}${url.pathname}`.toLowerCase().replace(/[_/]+/g, "-");
  if (FORBIDDEN_ACTION_HOSTS.has(url.hostname) || FORBIDDEN_ACTION_HOSTS.has(routeToken)) {
    throw new DeepLinkError("FORBIDDEN_ACTION_LINK", `Deep link action execution is forbidden: ${routeToken}`);
  }
  for (const key of url.searchParams.keys()) {
    if (FORBIDDEN_ACTION_QUERY_KEYS.has(key)) {
      throw new DeepLinkError("FORBIDDEN_ACTION_LINK", `Deep link action query is forbidden: ${key}`);
    }
  }
}

function assertKnownQuery(url, allowedQuery) {
  for (const key of url.searchParams.keys()) {
    if (!allowedQuery.includes(key)) {
      throw new DeepLinkError("UNKNOWN_QUERY_PARAMETER", `Unknown deep link query parameter: ${key}`);
    }
  }
}

function parseIdentifier(url, idField) {
  const id = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!IDENTIFIER_PATTERN.test(id)) {
    throw new DeepLinkError("INVALID_IDENTIFIER", `Invalid deep link identifier for ${idField}`);
  }
  return id;
}

function queryValue(url, key) {
  const value = url.searchParams.get(key);
  return value === null || value === "" ? undefined : value;
}

export function redactDeepLinkIntent(intent) {
  if (!intent || typeof intent !== "object") return intent;
  if (intent.type !== "password_reset_confirm") return { ...intent };
  return {
    ...intent,
    token: REDACTED_RESET_TOKEN
  };
}

export function parseMatterDeepLink(candidate) {
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new DeepLinkError("INVALID_URL", "Deep link must be a valid URL");
  }

  if (url.protocol !== "matter:") {
    throw new DeepLinkError("UNSUPPORTED_SCHEME", "Deep link scheme must be matter");
  }
  assertNoActionExecution(url);

  if (url.hostname === DEEP_LINK_ROUTE_SPECS.auth_callback.host) {
    const spec = DEEP_LINK_ROUTE_SPECS.auth_callback;
    if (url.pathname !== spec.path) {
      throw new DeepLinkError("INVALID_AUTH_CALLBACK_PATH", "Auth callback path must be /callback");
    }
    assertKnownQuery(url, spec.allowedQuery);
    for (const required of ["code", "state", "issuer"]) {
      if (!queryValue(url, required)) {
        throw new DeepLinkError("MISSING_AUTH_CALLBACK_QUERY", `Auth callback missing ${required}`);
      }
    }
    return {
      type: spec.type,
      routeOnly: true,
      code: queryValue(url, "code"),
      state: queryValue(url, "state"),
      issuer: queryValue(url, "issuer")
    };
  }

  if (url.hostname === DEEP_LINK_ROUTE_SPECS.password_reset_confirm.host) {
    const spec = DEEP_LINK_ROUTE_SPECS.password_reset_confirm;
    if (url.pathname !== spec.path) {
      throw new DeepLinkError("INVALID_PASSWORD_RESET_PATH", "Password reset path must be /confirm");
    }
    assertKnownQuery(url, spec.allowedQuery);
    const token = queryValue(url, "token");
    if (!token) {
      throw new DeepLinkError("MISSING_PASSWORD_RESET_TOKEN", "Password reset link is missing token");
    }
    if (!RESET_TOKEN_PATTERN.test(token)) {
      throw new DeepLinkError("INVALID_PASSWORD_RESET_TOKEN", "Password reset token shape is invalid");
    }
    return {
      type: spec.type,
      routeOnly: true,
      token
    };
  }

  const spec = Object.values(DEEP_LINK_ROUTE_SPECS).find((route) => route.host === url.hostname);
  if (!spec || !spec.idField) {
    throw new DeepLinkError("UNSUPPORTED_ROUTE", `Unsupported deep link route: ${url.hostname}`);
  }

  assertKnownQuery(url, spec.allowedQuery);
  const id = parseIdentifier(url, spec.idField);

  return {
    type: spec.type,
    routeOnly: true,
    [spec.idField]: id,
    matterId: spec.type === "matter" ? id : queryValue(url, "matter"),
    tenantIdHash: queryValue(url, "tenant")
  };
}

export async function openMatterDeepLink({
  url,
  permissionClient = {
    async precheckDeepLinkOpen() {
      return { allowed: false, reason: "permission_client_missing" };
    }
  },
  auditLogger = { async record() {} }
}) {
  const intent = parseMatterDeepLink(url);
  const auditSpec = DEEP_LINK_AUDIT_EVENTS[intent.type];

  if (intent.type === "auth_callback") {
    await auditLogger.record({
      eventName: auditSpec.opened,
      routeType: intent.type
    });
    return { state: "open", intent };
  }

  if (intent.type === "password_reset_confirm") {
    await auditLogger.record({
      eventName: auditSpec.opened,
      routeType: intent.type
    });
    return { state: "open", intent };
  }

  const precheck = await permissionClient.precheckDeepLinkOpen({
    routeType: intent.type,
    permission: auditSpec.permission,
    matterId: intent.matterId,
    documentId: intent.documentId,
    taskId: intent.taskId,
    tenantIdHash: intent.tenantIdHash
  });

  if (precheck?.allowed !== true) {
    await auditLogger.record({
      eventName: auditSpec.denied,
      routeType: intent.type,
      reason: precheck?.reason ?? "permission_denied"
    });
    return {
      state: "denied",
      reason: precheck?.reason ?? "permission_denied",
      intent
    };
  }

  await auditLogger.record({
    eventName: auditSpec.opened,
    routeType: intent.type,
    decisionId: precheck.decisionId
  });
  return {
    state: "open",
    intent,
    permissionDecisionId: precheck.decisionId ?? null
  };
}
