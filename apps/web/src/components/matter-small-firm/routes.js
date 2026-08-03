export const MATTER_SMALL_FIRM_SECTIONS = Object.freeze([
  "matter-today",
  "matter-list",
  "matter-work",
  "matter-calendar",
  "matter-followups",
  "matter-time-billing"
]);

const canonicalSections = new Set(MATTER_SMALL_FIRM_SECTIONS);

/**
 * The only source of truth for Matter's historical deep links.  Keep aliases
 * here even when they are no longer visible in the sidebar so App, Shell, and
 * global shortcut resolution cannot drift apart.
 */
export const MATTER_LEGACY_ROUTE_REDIRECTS = Object.freeze([
  Object.freeze({ from: "matter-home", to: "matter-today" }),
  Object.freeze({ from: "matter-dashboard", to: "matter-today" }),
  Object.freeze({ from: "matter-analytics", to: "matter-today", filter: "report" }),
  Object.freeze({ from: "matters-list", to: "matter-list" }),
  Object.freeze({ from: "matter-opening", to: "matter-list", filter: "opening" }),
  Object.freeze({ from: "matter-closeout", to: "matter-list", filter: "closeout" }),
  Object.freeze({ from: "matter-archive", to: "matter-list", filter: "archived" }),
  Object.freeze({ from: "matter-board", to: "matter-work", filter: "board" }),
  Object.freeze({ from: "matter-tasks", to: "matter-work", filter: "tasks" }),
  Object.freeze({ from: "matter-worktree", to: "matter-work", filter: "worktree" }),
  Object.freeze({ from: "matter-external-schedule", to: "matter-calendar" }),
  Object.freeze({ from: "matter-meetings", to: "matter-followups", filter: "meetings" }),
  Object.freeze({ from: "matter-client-requests", to: "matter-followups", filter: "client-requests" }),
  Object.freeze({ from: "matter-timeline", to: "matter-followups", filter: "timeline" }),
  Object.freeze({ from: "matter-channel", to: "matter-followups", filter: "channel" }),
  Object.freeze({ from: "matter-notes", to: "matter-followups", filter: "notes" }),
  Object.freeze({ from: "matter-time", to: "matter-time-billing", filter: "time" }),
  Object.freeze({ from: "matter-expenses", to: "matter-time-billing", filter: "expenses" }),
  Object.freeze({ from: "matter-billing", to: "matter-time-billing", filter: "billing" }),
  Object.freeze({ from: "matter-ar", to: "matter-time-billing", filter: "ar" }),
  Object.freeze({ from: "matter-integrations", targetView: "settings", targetSection: "settings-integrations" })
]);

const legacyRoutes = new Map(MATTER_LEGACY_ROUTE_REDIRECTS.map((route) => [
  route.from,
  route
]));

function normalizedRouteFilter(filter) {
  return String(filter ?? "").trim() || null;
}

export function resolveMatterSmallFirmRoute(section = "", filter = "") {
  const requestedSection = String(section ?? "").trim();
  const requestedFilter = normalizedRouteFilter(filter);
  if (canonicalSections.has(requestedSection)) {
    return { section: requestedSection, mode: requestedFilter, redirectedFrom: null };
  }
  const legacy = legacyRoutes.get(requestedSection);
  if (!legacy || legacy.targetView && legacy.targetView !== "matters") {
    return {
      section: "matter-today",
      mode: requestedFilter,
      redirectedFrom: requestedSection || null
    };
  }
  return {
    section: legacy.to,
    mode: requestedFilter ?? legacy.filter ?? null,
    redirectedFrom: requestedSection
  };
}

/**
 * Resolve a Matter URL into the app-level route shape.  `filter` is explicit
 * URL state and therefore wins over an alias's historical default.
 */
export function resolveMatterRoute(section = "", filter = "") {
  const requestedSection = String(section ?? "").trim();
  const requestedFilter = normalizedRouteFilter(filter);
  if (!requestedSection) return { view: "matters", section: "matter-today" };

  const legacy = legacyRoutes.get(requestedSection);
  if (canonicalSections.has(requestedSection)) {
    return {
      view: "matters",
      section: requestedSection,
      ...(requestedFilter ? { filter: requestedFilter } : {})
    };
  }
  if (!legacy) {
    return {
      view: "matters",
      section: "matter-today",
      ...(requestedFilter ? { filter: requestedFilter } : {}),
      redirectedFrom: { view: "matters", section: requestedSection }
    };
  }

  const targetView = legacy.targetView ?? "matters";
  const targetSection = legacy.targetSection ?? legacy.to;
  const resolvedFilter = requestedFilter ?? legacy.filter ?? null;
  return {
    view: targetView,
    section: targetSection,
    ...(resolvedFilter ? { filter: resolvedFilter } : {}),
    redirectedFrom: { view: "matters", section: requestedSection }
  };
}

export function matterRouteFilter(search = "") {
  return new URLSearchParams(String(search ?? "")).get("filter") ?? "";
}

export function writeMatterRouteFilter(filter, source = globalThis) {
  if (!source?.history || !source?.location) return;
  const params = new URLSearchParams(source.location.search ?? "");
  if (filter) params.set("filter", filter);
  else params.delete("filter");
  source.history.replaceState(
    source.history.state,
    "",
    `${source.location.pathname}?${params.toString()}${source.location.hash ?? ""}`
  );
}
