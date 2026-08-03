export const MATTER_SMALL_FIRM_OPS_BASE_PATH = "/api/matter/ops";

export const MATTER_SMALL_FIRM_OPS_VIEWS = Object.freeze({
  tasks: Object.freeze(["my", "overdue", "waiting", "unassigned"]),
  followups: Object.freeze(["today", "waiting_client", "stale_7d"]),
});

export const MATTER_SMALL_FIRM_OPS_PATHS = Object.freeze({
  today: "/api/matter/ops/today",
  tasks: "/api/matter/ops/tasks",
  task: "/api/matter/ops/tasks/:task_id",
  calendar: "/api/matter/ops/calendar",
  deadlines: "/api/matter/ops/deadlines",
  deadline: "/api/matter/ops/deadlines/:deadline_id",
  deadlineHistory: "/api/matter/ops/deadlines/:deadline_id/history",
  matters: "/api/matter/ops/matters",
  matterDetail: "/api/matter/ops/matters/:matter_id",
  matterArchive: "/api/matter/ops/matters/:matter_id/archive",
  matterCloseout: "/api/matter/ops/matters/:matter_id/closeout",
  matterHandoffs: "/api/matter/ops/matters/:matter_id/handoffs",
  matterMeetings: "/api/matter/ops/matters/:matter_id/meetings",
  matterRestore: "/api/matter/ops/matters/:matter_id/restore",
  followups: "/api/matter/ops/followups",
  followup: "/api/matter/ops/followups/:followup_id",
  followupContacts: "/api/matter/ops/followups/contacts",
  followupTaskConversion: "/api/matter/ops/followups/:followup_id/convert-to-task",
  followupHandoffs: "/api/matter/ops/followups/:followup_id/handoffs",
  timeBilling: "/api/matter/ops/time-billing",
  timeEntries: "/api/matter/ops/time-entries",
  timeWeekSubmit: "/api/matter/ops/time-weeks/submit",
  timeWeekLock: "/api/matter/ops/time-weeks/lock",
  timeWeekUnlock: "/api/matter/ops/time-weeks/unlock",
  wip: "/api/matter/ops/wip",
  invoices: "/api/matter/ops/invoices",
  invoiceLifecycle: "/api/matter/ops/invoices/:invoice_id/lifecycle",
  payments: "/api/matter/ops/payments",
  paymentAllocations: "/api/matter/ops/payments/:payment_id/allocations",
  paymentAllocationReversal: "/api/matter/ops/payments/:payment_id/allocations/:payment_allocation_id/reversal",
  reportCsv: "/api/matter/ops/report.csv",
});

function route(id, path, methods) {
  return Object.freeze({ id, path, methods: Object.freeze([...methods]) });
}

// This is the executable route source of truth. Its order is also the stable
// public endpoint order; compiled matchers below apply specificity ordering
// where a static path and parameterized path can otherwise overlap.
export const MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG = Object.freeze([
  route("today", MATTER_SMALL_FIRM_OPS_PATHS.today, ["GET"]),
  route("tasks", MATTER_SMALL_FIRM_OPS_PATHS.tasks, ["GET", "POST"]),
  route("task", MATTER_SMALL_FIRM_OPS_PATHS.task, ["PATCH"]),
  route("calendar", MATTER_SMALL_FIRM_OPS_PATHS.calendar, ["GET"]),
  route("deadlines", MATTER_SMALL_FIRM_OPS_PATHS.deadlines, ["GET", "POST"]),
  route("deadline", MATTER_SMALL_FIRM_OPS_PATHS.deadline, ["PATCH"]),
  route("deadlineHistory", MATTER_SMALL_FIRM_OPS_PATHS.deadlineHistory, ["GET"]),
  route("matters", MATTER_SMALL_FIRM_OPS_PATHS.matters, ["GET"]),
  route("matterDetail", MATTER_SMALL_FIRM_OPS_PATHS.matterDetail, ["GET"]),
  route("matterArchive", MATTER_SMALL_FIRM_OPS_PATHS.matterArchive, ["POST"]),
  route("matterCloseout", MATTER_SMALL_FIRM_OPS_PATHS.matterCloseout, ["GET"]),
  route("matterHandoffs", MATTER_SMALL_FIRM_OPS_PATHS.matterHandoffs, ["POST"]),
  route("matterMeetings", MATTER_SMALL_FIRM_OPS_PATHS.matterMeetings, ["POST"]),
  route("matterRestore", MATTER_SMALL_FIRM_OPS_PATHS.matterRestore, ["POST"]),
  route("followups", MATTER_SMALL_FIRM_OPS_PATHS.followups, ["GET", "POST"]),
  route("followup", MATTER_SMALL_FIRM_OPS_PATHS.followup, ["GET", "PATCH", "DELETE"]),
  route("followupContacts", MATTER_SMALL_FIRM_OPS_PATHS.followupContacts, ["GET", "POST"]),
  route("followupTaskConversion", MATTER_SMALL_FIRM_OPS_PATHS.followupTaskConversion, ["POST"]),
  route("followupHandoffs", MATTER_SMALL_FIRM_OPS_PATHS.followupHandoffs, ["POST"]),
  route("timeBilling", MATTER_SMALL_FIRM_OPS_PATHS.timeBilling, ["GET"]),
  route("timeEntries", MATTER_SMALL_FIRM_OPS_PATHS.timeEntries, ["GET", "POST"]),
  route("timeWeekSubmit", MATTER_SMALL_FIRM_OPS_PATHS.timeWeekSubmit, ["POST"]),
  route("timeWeekLock", MATTER_SMALL_FIRM_OPS_PATHS.timeWeekLock, ["POST"]),
  route("timeWeekUnlock", MATTER_SMALL_FIRM_OPS_PATHS.timeWeekUnlock, ["POST"]),
  route("wip", MATTER_SMALL_FIRM_OPS_PATHS.wip, ["GET", "POST"]),
  route("invoices", MATTER_SMALL_FIRM_OPS_PATHS.invoices, ["GET", "POST"]),
  route("invoiceLifecycle", MATTER_SMALL_FIRM_OPS_PATHS.invoiceLifecycle, ["PATCH"]),
  route("payments", MATTER_SMALL_FIRM_OPS_PATHS.payments, ["GET", "POST"]),
  route("paymentAllocations", MATTER_SMALL_FIRM_OPS_PATHS.paymentAllocations, ["POST"]),
  route("paymentAllocationReversal", MATTER_SMALL_FIRM_OPS_PATHS.paymentAllocationReversal, ["POST"]),
  route("reportCsv", MATTER_SMALL_FIRM_OPS_PATHS.reportCsv, ["GET"]),
]);

const ROUTE_PARAM_PATTERN = /^:([A-Za-z][A-Za-z0-9_]*)$/u;
const STATIC_ROUTE_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/u;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function analyzeRoutePath(path) {
  if (typeof path !== "string" || !path.startsWith(`${MATTER_SMALL_FIRM_OPS_BASE_PATH}/`)) {
    throw new TypeError("Matter route catalog path is outside the operations base");
  }
  const segments = path.split("/");
  if (segments.length < 3 || segments.some((segment, index) => index > 0 && segment === "")) {
    throw new TypeError(`Matter route catalog path is malformed: ${path}`);
  }
  const parameterNames = new Set();
  const semanticSegments = [];
  let staticSegmentCount = 0;
  for (const segment of segments.slice(1)) {
    if (segment.startsWith(":")) {
      const parameter = ROUTE_PARAM_PATTERN.exec(segment);
      if (!parameter) throw new TypeError(`Matter route catalog parameter is malformed: ${path}`);
      if (parameterNames.has(parameter[1])) {
        throw new TypeError(`Matter route catalog parameter is duplicated: ${parameter[1]}`);
      }
      parameterNames.add(parameter[1]);
      semanticSegments.push(":");
      continue;
    }
    if (segment.includes(":")) throw new TypeError(`Matter route catalog parameter is malformed: ${path}`);
    if (!STATIC_ROUTE_SEGMENT_PATTERN.test(segment)) {
      throw new TypeError(`Matter route catalog segment is malformed: ${path}`);
    }
    staticSegmentCount += 1;
    semanticSegments.push(segment);
  }
  return Object.freeze({
    segments: Object.freeze(semanticSegments),
    canonicalPath: `/${semanticSegments.join("/")}`,
    segmentCount: segments.length,
    staticSegmentCount,
  });
}

function compileRoutePath(path) {
  const analysis = analyzeRoutePath(path);
  const parameterNames = [];
  const source = path.split("/").map((segment) => {
    const parameter = ROUTE_PARAM_PATTERN.exec(segment);
    if (parameter) {
      parameterNames.push(parameter[1]);
      return "([^/]+)";
    }
    return escapeRegex(segment);
  }).join("/");
  return Object.freeze({
    parameterNames: Object.freeze(parameterNames),
    ...analysis,
    matcher: new RegExp(`^${source}$`, "u"),
  });
}

export const MATTER_SMALL_FIRM_OPS_ENDPOINTS = Object.freeze(
  MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG.flatMap(({ path, methods }) =>
    methods.map((method) => Object.freeze({ method, path }))),
);

export function validateMatterSmallFirmOpsCatalog(catalog = MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG) {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new TypeError("Matter small-firm route catalog must be a non-empty array");
  }
  const routeIds = new Set();
  const routePaths = new Set();
  const semanticRoutes = [];
  let endpointCount = 0;
  for (const entry of catalog) {
    if (!entry || typeof entry !== "object") throw new TypeError("Matter route catalog entry must be an object");
    if (typeof entry.id !== "string" || !entry.id) throw new TypeError("Matter route catalog entry id is required");
    if (routeIds.has(entry.id)) throw new TypeError(`Matter route catalog id is duplicated: ${entry.id}`);
    routeIds.add(entry.id);
    const analysis = analyzeRoutePath(entry.path);
    if (routePaths.has(entry.path)) throw new TypeError(`Matter route catalog path is duplicated: ${entry.path}`);
    routePaths.add(entry.path);
    if (semanticRoutes.some(({ canonicalPath }) => canonicalPath === analysis.canonicalPath)) {
      throw new TypeError(`Matter route catalog semantic path is duplicated: ${analysis.canonicalPath}`);
    }
    for (const previous of semanticRoutes) {
      if (
        previous.segmentCount !== analysis.segmentCount
        || previous.staticSegmentCount !== analysis.staticSegmentCount
      ) continue;
      const overlaps = previous.segments.every((segment, index) =>
        segment === ":" || analysis.segments[index] === ":" || segment === analysis.segments[index]);
      if (overlaps) {
        throw new TypeError(
          `Matter route catalog precedence is ambiguous: ${previous.path} and ${entry.path}`,
        );
      }
    }
    semanticRoutes.push({ path: entry.path, ...analysis });
    if (!Array.isArray(entry.methods) || entry.methods.length === 0) {
      throw new TypeError(`Matter route catalog methods are required: ${entry.id}`);
    }
    const methods = new Set(entry.methods);
    if (methods.size !== entry.methods.length || [...methods].some((method) =>
      !["GET", "POST", "PATCH", "DELETE"].includes(method))) {
      throw new TypeError(`Matter route catalog methods are invalid: ${entry.id}`);
    }
    endpointCount += entry.methods.length;
  }
  return Object.freeze({
    valid: true,
    route_count: catalog.length,
    endpoint_count: endpointCount,
  });
}

export const MATTER_SMALL_FIRM_OPS_CATALOG_VALIDATION =
  validateMatterSmallFirmOpsCatalog();

function compileRouteCatalog(catalog) {
  validateMatterSmallFirmOpsCatalog(catalog);
  return Object.freeze(
    catalog.map((entry) => Object.freeze({
      route: entry,
      ...compileRoutePath(entry.path),
    })).sort((left, right) =>
      right.staticSegmentCount - left.staticSegmentCount
      || right.segmentCount - left.segmentCount),
  );
}

function resolveCompiledMatterSmallFirmOpsRoute(compiledCatalog, pathname) {
  if (typeof pathname !== "string") return null;
  for (const { route, matcher, parameterNames } of compiledCatalog) {
    const match = matcher.exec(pathname);
    if (!match) continue;
    return Object.freeze({
      route,
      params: Object.freeze(Object.fromEntries(
        parameterNames.map((name, index) => [name, match[index + 1]]),
      )),
    });
  }
  return null;
}

const COMPILED_ROUTE_CATALOG = compileRouteCatalog(MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG);

/**
 * Build a pure route resolver for a disposable catalog copy. The API handler
 * uses the canonical resolver below; this factory makes catalog mutation
 * tests exercise the same compilation and precedence rules without adding a
 * production dependency-injection seam to request handling.
 */
export function createMatterSmallFirmOpsRouteResolver(
  catalog = MATTER_SMALL_FIRM_OPS_ROUTE_CATALOG,
) {
  const compiledCatalog = compileRouteCatalog(catalog);
  return (pathname) => resolveCompiledMatterSmallFirmOpsRoute(compiledCatalog, pathname);
}

export function resolveMatterSmallFirmOpsRoute(pathname) {
  return resolveCompiledMatterSmallFirmOpsRoute(COMPILED_ROUTE_CATALOG, pathname);
}
