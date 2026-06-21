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
  })
});

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/;

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

export function parseMaterDeepLink(candidate) {
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new DeepLinkError("INVALID_URL", "Deep link must be a valid URL");
  }

  if (url.protocol !== "mater:") {
    throw new DeepLinkError("UNSUPPORTED_SCHEME", "Deep link scheme must be mater");
  }

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
