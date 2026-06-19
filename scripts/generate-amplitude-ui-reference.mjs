import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const archiveDir = process.env.LAWOS_UI_ARCHIVE_DIR ?? path.join(root, "Law Firm OS UI");
const sourceDir = path.join(archiveDir, "Amplitude web Feb 2025");
const outDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025");

const screenshotCount = 318;
const expectedIds = Array.from({ length: screenshotCount }, (_, index) => index);

const phases = {
  shell: "P1 app shell / navigation / search",
  auth: "P2 auth and onboarding flow",
  home: "P3 home dashboards and templates",
  content: "P4 spaces, all content, search, resource surfaces",
  profiles: "P5 matter profiles, event stream, raw evidence",
  analytics: "P6 matter analytics builder",
  dashboard: "P7 dashboards, notebooks, reports",
  intelligence: "P8 Ask matter, cohorts, replay, experiments, flags",
  admin: "P9 settings, team, billing, profile, notifications",
  theme: "P10 dark theme and preference parity"
};

const ranges = [
  {
    start: 0,
    end: 0,
    flowId: "marketing-entry",
    family: "Marketing landing",
    screenType: "public landing page with top nav, geometric hero, CTA pair, customer logos, downstream product section",
    elements: ["public top navigation", "geometric brand motif", "primary and secondary CTA", "logo trust strip", "section preview"],
    matterDestination: "Public matter marketing shell and pre-auth brand promise",
    implementationPhase: phases.auth
  },
  {
    start: 1,
    end: 3,
    flowId: "signup-start",
    family: "Signup modal over app preview",
    screenType: "get started modal variants with form fields, consent checkboxes, blue continue CTA, dimmed dashboard behind",
    elements: ["modal overlay", "signup form", "checkbox rows", "customer data storage select", "full-width primary CTA"],
    matterDestination: "matter account creation and tenant-region consent",
    implementationPhase: phases.auth
  },
  {
    start: 4,
    end: 4,
    flowId: "email-verification",
    family: "Email verification",
    screenType: "centered email-sent confirmation card with illustration and resend/back links",
    elements: ["centered card", "verification illustration", "secondary button", "text link"],
    matterDestination: "matter email verification and invite acceptance",
    implementationPhase: phases.auth
  },
  {
    start: 5,
    end: 7,
    flowId: "password-setup",
    family: "Password setup",
    screenType: "set password form states with validation feedback and data residency selector",
    elements: ["compact auth form", "password validation", "select control", "status helper text", "captcha badge"],
    matterDestination: "password setup for firm users",
    implementationPhase: phases.auth
  },
  {
    start: 8,
    end: 10,
    flowId: "organization-create",
    family: "Organization creation",
    screenType: "create organization form states with terms, privacy, invite/news options",
    elements: ["organization form", "tenant name input", "agreement checks", "primary CTA", "auth shell"],
    matterDestination: "AMIC Law tenant creation",
    implementationPhase: phases.auth
  },
  {
    start: 11,
    end: 11,
    flowId: "loading",
    family: "Loading interstitial",
    screenType: "minimal centered spinner with brand mark",
    elements: ["spinner", "empty gray stage", "brand mark"],
    matterDestination: "route-level loading and data-fetch state",
    implementationPhase: phases.shell
  },
  {
    start: 12,
    end: 13,
    flowId: "onboarding-source-selection",
    family: "Onboarding checklist",
    screenType: "set up product onboarding with source cards, checklists, progress bar, and workspace chrome",
    elements: ["onboarding checklist", "progress indicator", "source cards", "table list", "top action row"],
    matterDestination: "matter setup checklist for DMS, billing, audit, client portal integrations",
    implementationPhase: phases.auth
  },
  {
    start: 14,
    end: 15,
    flowId: "home-dashboard",
    family: "Home dashboard",
    screenType: "main dashboard with topbar, sidebar, metrics, line chart, realtime gauge, template cards",
    elements: ["topbar", "left nav", "metric cards", "line chart", "realtime gauge", "templates", "resource menu"],
    matterDestination: "matter home overview",
    implementationPhase: phases.home
  },
  {
    start: 16,
    end: 19,
    flowId: "home-guidance",
    family: "Guidance overlays",
    screenType: "tutorial video modal, checklist popover, success/info tooltip, realtime gauge tooltip",
    elements: ["video modal", "popover", "tooltip", "toast", "guided setup"],
    matterDestination: "guided onboarding and contextual coaching",
    implementationPhase: phases.home
  },
  {
    start: 20,
    end: 24,
    flowId: "home-widgets",
    family: "Dashboard widgets",
    screenType: "home card variants for top pages, map, session replay, funnel, empty/realtime panels",
    elements: ["table card", "map card", "session replay card", "funnel chart", "empty card"],
    matterDestination: "matter dashboard widget library",
    implementationPhase: phases.home
  },
  {
    start: 25,
    end: 37,
    flowId: "home-actions",
    family: "Home menus and resources",
    screenType: "home dashboard with dropdowns, side resource panels, date filters, template carousel, setup side panels",
    elements: ["dropdown menu", "right side drawer", "date range menu", "template carousel", "filter control", "resource card"],
    matterDestination: "dashboard controls, resource drawer, and workspace actions",
    implementationPhase: phases.home
  },
  {
    start: 38,
    end: 40,
    flowId: "ask-entry",
    family: "Ask Amplitude prompt gallery",
    screenType: "AI prompt cards and initial chat-like entry surface",
    elements: ["AI prompt card", "prompt input", "suggested question grid", "empty state"],
    matterDestination: "Ask matter prompt gallery",
    implementationPhase: phases.intelligence
  },
  {
    start: 41,
    end: 44,
    flowId: "segmentation-basic",
    family: "Segmentation builder",
    screenType: "chart builder with left analysis rail, event selection, metrics, line chart, result table",
    elements: ["analysis type tabs", "event block", "measure grid", "segment card", "chart toolbar", "breakdown table"],
    matterDestination: "matter analytics segmentation",
    implementationPhase: phases.analytics
  },
  {
    start: 45,
    end: 45,
    flowId: "save-chart-modal",
    family: "Save chart modal",
    screenType: "save chart modal with plan notice, name field, location select, add-to-report link, footer actions",
    elements: ["modal overlay", "plan notice", "input with suggest", "location select", "modal footer"],
    matterDestination: "save matter chart",
    implementationPhase: phases.analytics
  },
  {
    start: 46,
    end: 79,
    flowId: "segmentation-advanced",
    family: "Segmentation advanced states",
    screenType: "segmentation chart states for filters, group-by, date picker, chart type, compare, export, save, side panels",
    elements: ["property dropdown", "filter popover", "date picker", "chart type selector", "export CSV", "recommendation panel", "custom event drawer"],
    matterDestination: "advanced matter analytics builder states",
    implementationPhase: phases.analytics
  },
  {
    start: 80,
    end: 80,
    flowId: "chart-type-modal",
    family: "Chart type modal",
    screenType: "choose chart type modal with visual options",
    elements: ["modal", "chart option tiles", "dimmed backdrop"],
    matterDestination: "chart visualization picker",
    implementationPhase: phases.analytics
  },
  {
    start: 81,
    end: 94,
    flowId: "segmentation-output",
    family: "Segmentation output and custom events",
    screenType: "resulting chart views, custom event sidecar, export, success toast, empty/recommendation states",
    elements: ["line chart result", "table result", "side panel", "success toast", "recommendation drawer", "custom event panel"],
    matterDestination: "analytics result review and event definition sidecar",
    implementationPhase: phases.analytics
  },
  {
    start: 95,
    end: 102,
    flowId: "share-save-modals",
    family: "Share and save modals",
    screenType: "share, embed, folder/location, save chart, save validation and invite-style modal variants",
    elements: ["share modal", "save modal", "embed options", "folder picker", "validation helper"],
    matterDestination: "share/save matter analysis",
    implementationPhase: phases.analytics
  },
  {
    start: 103,
    end: 104,
    flowId: "chart-page-empty-table",
    family: "Chart and data table entry",
    screenType: "standalone chart page and empty data table analysis state",
    elements: ["standalone chart canvas", "empty-state illustration", "analysis builder"],
    matterDestination: "saved chart route and data table empty state",
    implementationPhase: phases.analytics
  },
  {
    start: 105,
    end: 111,
    flowId: "funnel-analysis",
    family: "Funnel analysis",
    screenType: "funnel builder and output states with conversion bars, step selection, breakdown and tooltips",
    elements: ["funnel step builder", "conversion bars", "step table", "tooltip", "breakdown controls"],
    matterDestination: "matter workflow funnel analysis",
    implementationPhase: phases.analytics
  },
  {
    start: 112,
    end: 119,
    flowId: "data-table-and-metric",
    family: "Data table and metric setup",
    screenType: "data table empty/source states, create metric modal, metric chart and dimension builder",
    elements: ["data source selector", "empty state", "metric modal", "field dropdown", "metric bar chart"],
    matterDestination: "matter data table and KPI builder",
    implementationPhase: phases.analytics
  },
  {
    start: 120,
    end: 136,
    flowId: "data-table-heatmap",
    family: "Data table heatmap",
    screenType: "intersection-by-country pivot/heatmap states with nested dropdowns and property filters",
    elements: ["pivot table", "heatmap cells", "property selector", "nested dropdown", "table toolbar"],
    matterDestination: "matter dimension table and heatmap analysis",
    implementationPhase: phases.analytics
  },
  {
    start: 137,
    end: 147,
    flowId: "retention-and-journeys",
    family: "Retention and journey builder",
    screenType: "retention empty/result states and journey/onboarding path visualizations with node/branch controls",
    elements: ["retention empty state", "retention grid", "journey Sankey", "path diagram", "branch popover", "step menu"],
    matterDestination: "retention of clients/matters and legal workflow journey analysis",
    implementationPhase: phases.analytics
  },
  {
    start: 148,
    end: 155,
    flowId: "dashboard-create",
    family: "Dashboard builder",
    screenType: "create menu, empty dashboard, template cards, add charts/cohorts side panel",
    elements: ["create menu", "empty dashboard", "template gallery", "right configuration panel", "checkbox list"],
    matterDestination: "matter dashboard builder",
    implementationPhase: phases.dashboard
  },
  {
    start: 156,
    end: 161,
    flowId: "dashboard-chart-report",
    family: "Dashboard chart/report states",
    screenType: "chart card, conversion modal, export/save-to-dashboard/report modals",
    elements: ["dashboard chart card", "modal overlay", "report destination selector", "dashboard destination selector"],
    matterDestination: "dashboard/report publishing",
    implementationPhase: phases.dashboard
  },
  {
    start: 162,
    end: 167,
    flowId: "dashboard-templates",
    family: "Dashboard templates and funnel dashboard",
    screenType: "dashboard template gallery and multi-card funnel dashboard/report layout",
    elements: ["template grid", "dashboard section layout", "chart cards", "text cards", "progress bars"],
    matterDestination: "dashboard templates for legal operations",
    implementationPhase: phases.dashboard
  },
  {
    start: 168,
    end: 175,
    flowId: "notebooks",
    family: "Notebook/report surface",
    screenType: "notebook empty, search/add blocks, cover image, report chart cards, change image controls",
    elements: ["notebook empty state", "block search", "cover image", "report card", "image controls"],
    matterDestination: "matter narrative report/notebook",
    implementationPhase: phases.dashboard
  },
  {
    start: 176,
    end: 178,
    flowId: "all-content-initial",
    family: "All content list",
    screenType: "content list and empty content states with filters, editors, type, and right filters",
    elements: ["content table", "editor filter", "type filter", "right filter rail", "empty state"],
    matterDestination: "matter all content / DMS index",
    implementationPhase: phases.content
  },
  {
    start: 179,
    end: 179,
    flowId: "live-events",
    family: "Live events",
    screenType: "live event table with event names, user/session identifiers, columns and filters",
    elements: ["live events table", "column headers", "event rows", "filter rail"],
    matterDestination: "matter live audit/event stream",
    implementationPhase: phases.profiles
  },
  {
    start: 180,
    end: 181,
    flowId: "analysis-card-guidance",
    family: "Guidance cards",
    screenType: "large educational chart card with CTA and inline tutorial controls",
    elements: ["education card", "CTA", "illustrated chart", "resource links"],
    matterDestination: "analytics education and empty-state guidance",
    implementationPhase: phases.intelligence
  },
  {
    start: 182,
    end: 191,
    flowId: "ask-ai",
    family: "Ask AI",
    screenType: "Ask surface from empty prompt cards to query result, chart response, follow-up, and feedback modal",
    elements: ["chat input", "prompt cards", "AI generated chart", "feedback modal", "result explanation", "suggested followups"],
    matterDestination: "Ask matter legal analytics assistant",
    implementationPhase: phases.intelligence
  },
  {
    start: 192,
    end: 195,
    flowId: "product-overview",
    family: "Product overview dashboard",
    screenType: "home/product overview dashboard variants with metrics, gauges, charts and feedback popovers",
    elements: ["dashboard overview", "feedback popover", "metric card", "gauge card"],
    matterDestination: "matter product overview",
    implementationPhase: phases.home
  },
  {
    start: 196,
    end: 206,
    flowId: "user-profiles-list",
    family: "User profiles list and cohort save",
    screenType: "user profile list, profile query builder, save cohort modal and cohort validation states",
    elements: ["user profile table", "query builder", "save cohort modal", "side nav", "cohort filter"],
    matterDestination: "matter profile list and cohort save",
    implementationPhase: phases.profiles
  },
  {
    start: 207,
    end: 209,
    flowId: "user-profile-detail",
    family: "User profile detail",
    screenType: "profile activity stream, pinned properties, raw event panel, insights charts",
    elements: ["profile card", "event stream", "raw JSON panel", "activity tabs", "pinned properties"],
    matterDestination: "matter profile detail and audit evidence",
    implementationPhase: phases.profiles
  },
  {
    start: 210,
    end: 212,
    flowId: "cohorts-users",
    family: "Cohorts and users",
    screenType: "cohort list, users table, user activity chart and cohort membership views",
    elements: ["cohort cards", "user table", "activity chart", "membership table"],
    matterDestination: "client/matter cohorts",
    implementationPhase: phases.intelligence
  },
  {
    start: 213,
    end: 215,
    flowId: "session-replay",
    family: "Session replay",
    screenType: "session replay list/player/settings with timeline, playback controls and metadata rail",
    elements: ["session replay table", "replay player", "timeline controls", "metadata panel", "settings popover"],
    matterDestination: "client portal session replay and audit playback",
    implementationPhase: phases.intelligence
  },
  {
    start: 216,
    end: 222,
    flowId: "experiments-overview",
    family: "Experiments overview",
    screenType: "experiment overview, resource cards, create/new web experiment modals and confirmation states",
    elements: ["experiment overview cards", "resource cards", "experiment modal", "confirmation modal"],
    matterDestination: "workflow experiment and feature-test entry",
    implementationPhase: phases.intelligence
  },
  {
    start: 223,
    end: 240,
    flowId: "experiment-builder",
    family: "Experiment builder",
    screenType: "experiment setup, targeting, variants, preview editor, theme/color controls, checkout/delivery modals",
    elements: ["experiment steps", "targeting controls", "variant cards", "preview iframe", "color picker", "settings drawer", "modal confirmation"],
    matterDestination: "legal workflow flags, controlled rollout, and portal experiment builder",
    implementationPhase: phases.intelligence
  },
  {
    start: 241,
    end: 248,
    flowId: "resources-and-external-preview",
    family: "Resources and external preview",
    screenType: "home/resources pages and embedded external app preview with code/config side panel",
    elements: ["resource cards", "external preview", "code/config drawer", "status toast"],
    matterDestination: "developer resources and integration setup",
    implementationPhase: phases.content
  },
  {
    start: 249,
    end: 252,
    flowId: "data-connections-catalog",
    family: "Data, connections, catalog",
    screenType: "event definitions, connection overview, integration catalog and provider cards",
    elements: ["event definition table", "connection map", "integration cards", "catalog filters"],
    matterDestination: "matter data integrations and event catalog",
    implementationPhase: phases.admin
  },
  {
    start: 253,
    end: 264,
    flowId: "flags-and-content",
    family: "Feature flags and content",
    screenType: "home dashboard, feature flags list, session scorecards, all content table/grid, archive modal and toast",
    elements: ["feature flag table", "all content table", "grid card view", "archive modal", "success toast", "session scorecard"],
    matterDestination: "workflow flags, content library and archive flow",
    implementationPhase: phases.content
  },
  {
    start: 265,
    end: 267,
    flowId: "global-search",
    family: "Global search",
    screenType: "global search dropdown and search results page",
    elements: ["search dropdown", "result rows", "search page", "right filters"],
    matterDestination: "global matter search",
    implementationPhase: phases.shell
  },
  {
    start: 268,
    end: 271,
    flowId: "invite-teammates",
    family: "Invite teammates",
    screenType: "invite modal variants with email input, permissions, message area and success state",
    elements: ["invite modal", "email chips", "permission select", "message field", "success toast"],
    matterDestination: "firm user invitation",
    implementationPhase: phases.admin
  },
  {
    start: 272,
    end: 274,
    flowId: "notifications",
    family: "Notifications",
    screenType: "empty and populated notification center",
    elements: ["notification empty state", "notification list", "timestamp rows", "avatar rows"],
    matterDestination: "matter notifications",
    implementationPhase: phases.admin
  },
  {
    start: 275,
    end: 281,
    flowId: "billing-plan",
    family: "Billing and plan",
    screenType: "plan overview, usage, pricing cards and checkout/upgrade states",
    elements: ["plan card", "usage chart", "pricing columns", "checkout panel", "upgrade CTA"],
    matterDestination: "subscription, usage and billing admin",
    implementationPhase: phases.admin
  },
  {
    start: 282,
    end: 286,
    flowId: "team-members",
    family: "Team members",
    screenType: "team member table and remove member confirmation modal variants",
    elements: ["team table", "role tags", "danger modal", "remove confirmation"],
    matterDestination: "firm team management",
    implementationPhase: phases.admin
  },
  {
    start: 287,
    end: 292,
    flowId: "profile-settings",
    family: "Profile settings",
    screenType: "profile settings, personal information, notification preferences, year review and profile photo modal",
    elements: ["profile form", "profile avatar", "notification settings", "stats card", "photo modal"],
    matterDestination: "personal account settings",
    implementationPhase: phases.admin
  },
  {
    start: 293,
    end: 296,
    flowId: "feedback",
    family: "Feedback widgets",
    screenType: "feedback rating popovers anchored to product chrome",
    elements: ["rating popover", "comment box", "anchored feedback card"],
    matterDestination: "in-product feedback",
    implementationPhase: phases.admin
  },
  {
    start: 297,
    end: 302,
    flowId: "theme-dark-mode",
    family: "Theme and dark mode",
    screenType: "theme preference modal and dark-mode versions of home, templates, content, Ask AI",
    elements: ["theme modal", "dark topbar", "dark sidebar", "dark cards", "dark charts", "dark AI result"],
    matterDestination: "light/dark matter theme parity",
    implementationPhase: phases.theme
  },
  {
    start: 303,
    end: 317,
    flowId: "auth-returning-user",
    family: "Auth returning user",
    screenType: "signup, login, forgot password, email confirmation, reset password, password changed and email sent states",
    elements: ["auth card", "login form", "forgot password form", "reset password form", "validation message", "email sent card"],
    matterDestination: "complete returning-user auth flow",
    implementationPhase: phases.auth
  }
];

function findRange(id) {
  return ranges.find((range) => id >= range.start && id <= range.end);
}

function csvEscape(value) {
  const stringValue = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function screenshotPath(id) {
  return path.join("Law Firm OS UI", "Amplitude web Feb 2025", `Amplitude web Feb 2025 ${id}.png`);
}

function buildInventory() {
  const rows = expectedIds.map((id) => {
    const range = findRange(id);
    if (!range) {
      throw new Error(`No classification range for screenshot ${id}`);
    }
    const sourcePath = path.join(root, screenshotPath(id));
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing screenshot ${id}: ${sourcePath}`);
    }
    return {
      screenshot_id: id,
      file: screenshotPath(id),
      width: 1920,
      height: 1320,
      flow_id: range.flowId,
      screen_family: range.family,
      screen_type: range.screenType,
      ui_elements: range.elements,
      matter_destination: range.matterDestination,
      implementation_phase: range.implementationPhase,
      coverage_status: "planned",
      coverage_rule: "must be implemented or componentized; do not ignore",
      source_range: `${range.start}-${range.end}`
    };
  });
  return rows;
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(outDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeCsv(fileName, rows) {
  const columns = [
    "screenshot_id",
    "file",
    "flow_id",
    "screen_family",
    "screen_type",
    "ui_elements",
    "matter_destination",
    "implementation_phase",
    "coverage_status",
    "coverage_rule"
  ];
  const lines = [columns.join(",")];
  rows.forEach((row) => {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  });
  fs.writeFileSync(path.join(outDir, fileName), `${lines.join("\n")}\n`);
}

function mdTable(headers, rows) {
  const divider = headers.map(() => "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${divider.join(" | ")} |`
  ];
  rows.forEach((row) => {
    lines.push(`| ${row.map((cell) => String(cell).replaceAll("\n", " ")).join(" | ")} |`);
  });
  return lines.join("\n");
}

function formatIdRanges(ids) {
  if (!ids.length) return "";

  const sorted = [...ids].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const id = sorted[index];
    if (id === previous + 1) {
      previous = id;
      continue;
    }
    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = id;
    previous = id;
  }

  ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
  return ranges.join(", ");
}

function writeReadme(rows) {
  const summaryRows = Object.entries(
    rows.reduce((acc, row) => {
      acc[row.flow_id] = (acc[row.flow_id] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([flowId, count]) => {
    const range = ranges.find((item) => item.flowId === flowId);
    return [flowId, `${range.start}-${range.end}`, count, range.family, range.implementationPhase];
  });

  const content = `# Amplitude Feb 2025 UI Reference for matter

This folder is the source-of-truth planning pack for applying the complete Amplitude screenshot corpus to the matter app UI.

## Corpus

- Source folder: \`Law Firm OS UI/Amplitude web Feb 2025/\`
- Screenshots covered: \`Amplitude web Feb 2025 0.png\` through \`Amplitude web Feb 2025 317.png\`
- Count: ${rows.length}
- Dimensions: 1920 x 1320 for every numbered screenshot
- Rule: no numbered screenshot may be ignored. Each screenshot must be implemented directly, componentized into the matter design system, or explicitly deferred with a reason during later build phases.

## Generated Files

- \`amplitude-screenshot-inventory.json\`: one row per screenshot with flow, screen family, UI elements, and matter destination.
- \`amplitude-coverage-matrix.csv\`: spreadsheet-ready coverage tracker for all 318 screenshots.
- \`amplitude-flow-map.md\`: flow-level grouping and matter adaptation target.
- \`amplitude-ui-elements.md\`: reusable component catalog extracted from the corpus.
- \`matter-amplitude-screen-map.md\`: Amplitude screen families mapped to matter product surfaces.
- \`matter-amplitude-implementation-plan.md\`: build order and verification gates.
- \`matter-bilingual-font-plan.md\`: Korean/English locale and typography rules for the rebuilt matter UI.
- \`contact-sheets/\`: visual audit sheets covering every numbered screenshot.

## Language And Font Rule

- Build two product-language versions: Korean and English.
- Korean version: use local SUITE for headings/navigation and local Pretendard for body, forms, tables, modals, and dense operational text.
- English version: use Comfortaa, the same font used by \`docs/ui-reference/prototypes/matter-by-amic-logo-animation.html\` for the matter logo wordmark.
- The font rule is cross-cutting. Every screenshot phase must be implemented and verified in both language modes unless a phase is explicitly marked locale-neutral.

## Flow Summary

${mdTable(["Flow", "Screenshots", "Count", "Family", "Implementation phase"], summaryRows)}
`;
  fs.writeFileSync(path.join(outDir, "README.md"), content);
}

function writeFlowMap() {
  const sections = ranges.map((range) => `## ${range.flowId} (${range.start}-${range.end})

- Family: ${range.family}
- Screen type: ${range.screenType}
- UI elements: ${range.elements.join(", ")}
- matter destination: ${range.matterDestination}
- Implementation phase: ${range.implementationPhase}
- Coverage rule: all screenshots in this range must be represented in component states or flow states.
`).join("\n");

  fs.writeFileSync(path.join(outDir, "amplitude-flow-map.md"), `# Amplitude Flow Map

This map groups all numbered screenshots into product flows. It intentionally uses the Amplitude corpus as the planning source, not the existing local showcase HTML.

${sections}`);
}

function writeElementsCatalog() {
  const elements = [
    ["App shell", "topbar, left nav, workspace selector, global search, invite chip, upgrade link, icon actions", "14-37, 41-317", "Shared matter app frame"],
    ["Auth cards", "signup, login, password setup, reset password, verification, org creation", "1-10, 303-317", "Complete matter auth and tenant setup"],
    ["Modals", "save chart, share, embed, invite, archive, delete/remove, feedback, profile photo, experiment confirmation", "1-3, 26-27, 45, 80, 95-102, 115-118, 157-161, 166, 188-190, 201-205, 219-222, 238, 244, 261, 268-271, 283-285, 290-291, 297-298", "matter modal system"],
    ["Dropdowns and popovers", "property menus, resource menus, date pickers, chart selectors, search suggestions, guided tooltips", "15, 17-19, 25, 28-37, 52-57, 60, 64, 69-74, 83-86, 92, 106-111, 120-131, 141-143, 148, 153, 214, 228-230, 265-267, 293-296", "matter controls and contextual overlays"],
    ["Dashboard cards", "metric cards, chart cards, templates, gauges, maps, session replay cards, empty cards", "14, 20-24, 148-167, 192-195, 253-258, 264, 299-300", "Home and dashboard surfaces"],
    ["Analysis builder", "analysis tabs, event block, measure grid, segment cards, date controls, chart toolbar, result table", "41-79, 103-147", "matter analytics builder"],
    ["Data tables", "all content, user profiles, live events, feature flags, team members, event definitions, cohorts", "119-136, 176-179, 196-213, 249, 255, 259-263, 278, 282, 286", "Dense operational tables"],
    ["Event and profile detail", "profile card, pinned properties, activity tabs, event stream, raw JSON panel", "196-209", "Matter profile and audit evidence detail"],
    ["Ask AI", "prompt gallery, chat input, chart response, follow-up, feedback", "38-40, 182-191, 302", "Ask matter assistant"],
    ["Experiment builder", "overview, target controls, variants, preview editor, theme/color controls, rollout confirmation", "216-240", "Workflow flag and experiment system"],
    ["Admin and billing", "settings side nav, notifications, profile, team, plan, pricing, checkout, usage", "272-292", "Firm administration"],
    ["Dark mode", "theme modal, dark dashboard, dark content, dark ask surface", "297-302", "Dark theme parity"]
  ];

  fs.writeFileSync(path.join(outDir, "amplitude-ui-elements.md"), `# Amplitude UI Elements Catalog

The matter UI should not copy screenshots as static images. Each Amplitude element below becomes a reusable code-native component or state family.

${mdTable(["Element family", "Extracted UI elements", "Reference screenshots", "matter usage"], elements)}

## Non-negotiable Element Rules

- Use Amplitude-style product density: compact typography, 1px borders, white panels on a pale gray canvas, and strong blue active states.
- Preserve the bilingual typography system: Korean uses SUITE for headings/navigation and Pretendard for body/table/form text; English uses Comfortaa to match the matter logo font.
- Preserve table-first workflows for operational surfaces; do not convert dense tables into marketing-style cards.
- Preserve modal anatomy: dim overlay, compact title, dismiss icon, gray notice band where present, footer action row.
- Preserve chart-builder anatomy: left analysis rail, top chart toolbar, central graph, bottom result table.
- Preserve side panels and dropdowns as first-class states, not hidden implementation details.
- Preserve dark-mode parity after light-mode surfaces are stable.
`);
}

function writeBilingualFontPlan() {
  const localeRows = [
    [
      "Korean",
      "ko",
      "SUITE",
      "Pretendard",
      "Headings, navigation labels, page titles, modal titles use SUITE; body, tables, forms, helper text, cards, and dense Amplitude-style data surfaces use Pretendard."
    ],
    [
      "English",
      "en",
      "Comfortaa",
      "Comfortaa",
      "Use Comfortaa as the primary English UI typeface so the English version matches the matter logo wordmark font from docs/ui-reference/prototypes/matter-by-amic-logo-animation.html."
    ]
  ];

  const assetRows = [
    [
      "Pretendard",
      "local font library (outside repo); deployed copies live in apps/web/public/fonts/pretendard/",
      "Korean body font",
      "Copy required OTF weights into the web app font asset folder and load through @font-face. Do not reference the local font library directly at runtime."
    ],
    [
      "SUITE",
      "local font library (outside repo); deployed copies live in apps/web/public/fonts/suite/",
      "Korean heading font",
      "Copy required OTF weights into the web app font asset folder and load through @font-face. Do not reference the local font library directly at runtime."
    ],
    [
      "Comfortaa",
      "docs/ui-reference/prototypes/matter-by-amic-logo-animation.html and current apps/web/index.html Google Fonts reference",
      "English primary and matter logo font",
      "Use weights 300 and 400 to match the logo treatment; add heavier weight only if an English UI control fails readability."
    ]
  ];

  fs.writeFileSync(path.join(outDir, "matter-bilingual-font-plan.md"), `# matter Bilingual Font Plan

This plan is a cross-cutting requirement for the Amplitude-based matter UI rebuild. It applies to every implementation phase in \`matter-amplitude-implementation-plan.md\`.

## Locale Versions

${mdTable(["Version", "Locale key", "Heading / display font", "Body / UI font", "Rule"], localeRows)}

## Source Font Assets

${mdTable(["Font", "Source", "Role", "Implementation note"], assetRows)}

## Implementation Requirements

1. Create a locale mode for \`ko\` and \`en\`; do not hard-code one language into the component tree.
2. Add \`lang=\"ko\"\` and \`lang=\"en\"\` handling at the app shell/root level.
3. Define typography tokens before rebuilding components:
   - \`--font-ko-heading: "SUITE"\`
   - \`--font-ko-body: "Pretendard"\`
   - \`--font-en: "Comfortaa"\`
   - \`--font-ui-fallback: "Avenir Next", "SF Pro Rounded", Inter, sans-serif\`
4. Korean UI must use SUITE for headings/navigation and Pretendard for body, forms, tables, modals, and dense data text.
5. English UI must use Comfortaa as the primary UI font to match the matter logo wordmark.
6. Build auth/onboarding, shell, tables, modals, dropdowns, dashboards, Ask matter, experiments, admin, and dark-mode states in both language modes.
7. Capture visual verification for both locales after every phase.

## Phase Integration

- P0 foundation: copy/font-load assets, define locale dictionaries, define typography tokens, and add a locale switcher or route-level locale mode.
- P1 app shell: verify topbar, sidebar, search, invite chip, and workspace labels in Korean and English.
- P2 auth/onboarding: verify all screenshots \`0-13\` and \`303-317\` in Korean and English, including login, signup, password reset, verification, and organization creation states.
- P3-P10: every implemented screen state must include both Korean and English copy, with matching spacing and no text overflow.

## Verification Gate

- \`ko\` screenshot set: Playwright capture for each implemented phase.
- \`en\` screenshot set: Playwright capture for each implemented phase.
- Font-loading check: browser computed styles must show SUITE/Pretendard for Korean and Comfortaa for English.
- Text-fit check: Korean and English strings must not overflow buttons, tables, cards, modals, or side panels.
`);
}

function writeMatterMap() {
  const rows = ranges.map((range) => [
    `${range.start}-${range.end}`,
    range.family,
    range.matterDestination,
    range.implementationPhase
  ]);

  fs.writeFileSync(path.join(outDir, "matter-amplitude-screen-map.md"), `# matter Screen Map from Amplitude

This map converts the Amplitude product surfaces into matter product surfaces. It is a planning overlay for implementation, not a claim that the current app already covers the corpus.

${mdTable(["Screenshots", "Amplitude family", "matter destination", "Build phase"], rows)}

## Domain Translation Rules

- User Profiles -> Matter Profiles, Client Profiles, Actor Profiles, and event-bound audit identity.
- Events -> Matter, DMS, Billing, Permission, Audit, Client Portal, and AI Evidence events.
- Charts -> Matter throughput, document activity, review queues, approval cycle time, billing/WIP, conflict checks, DMS version movement.
- Cohorts -> client cohorts, matter cohorts, risk cohorts, partner review queues, segmentable groups.
- Experiments and Flags -> workflow flags, portal rollout flags, permission experiment gates, controlled process changes.
- Session Replay -> client portal playback and user-session audit review.
- Data/Catalog/Connections -> master data, integration catalog, event definitions, and connector health.
- Billing/Plan/Admin -> firm tenant administration, usage, seats, teams, profile, notification, and subscription controls.
`);
}

function writeImplementationPlan(rows) {
  const phaseRows = Object.values(phases).map((phase) => {
    const phaseRows = rows.filter((row) => row.implementation_phase === phase);
    const ids = phaseRows.map((row) => row.screenshot_id);
    return [
      phase,
      formatIdRanges(ids),
      phaseRows.length,
      [...new Set(phaseRows.map((row) => row.screen_family))].join("; ")
    ];
  });

  fs.writeFileSync(path.join(outDir, "matter-amplitude-implementation-plan.md"), `# matter Amplitude Implementation Plan

## Objective

Implement the matter app so the complete Amplitude Feb 2025 corpus is represented as a coherent matter-native SaaS UI system. The current app shell is only a starter and must be treated as replaceable during this plan.

## Build Phases

${mdTable(["Phase", "Reference screenshots", "Count", "Screen families"], phaseRows)}

## Execution Gates

1. Inventory gate: \`amplitude-screenshot-inventory.json\` must contain exactly 318 rows.
2. Mapping gate: every row in \`amplitude-coverage-matrix.csv\` must have a matter destination and implementation phase.
3. Component gate: each UI element family in \`amplitude-ui-elements.md\` must have a code-native component or documented state.
4. Flow gate: each flow in \`amplitude-flow-map.md\` must be reachable or intentionally staged in the matter navigation model.
5. Visual gate: for each implemented phase, capture Playwright screenshots at 1920 x 1320 and compare against the reference ranges.
6. Locale/font gate: each implemented phase must support Korean and English. Korean uses SUITE + Pretendard from the supplied local font folders; English uses Comfortaa to match the matter logo font.
7. State gate: modals, dropdowns, side panels, toasts, empty states, and dark-mode states count as required UI states, not optional polish.
8. Coverage gate: no screenshot may remain unassigned. Later implementation status may change from \`planned\` to \`implemented\`, \`componentized\`, or \`deferred_with_reason\`, but never \`ignored\`.

## Recommended Next Implementation Order

1. Establish bilingual typography foundation: locale dictionaries, \`ko\`/\`en\` mode, SUITE/Pretendard font loading for Korean, and Comfortaa loading for English.
2. Rebuild shared shell: topbar, sidebar, workspace selector, global search, invite chip, resource menu, usage card.
3. Build full auth/onboarding state set from 0-13 and 303-317.
4. Build home dashboard and widget system from 14-37 and 192-195.
5. Build all content/search/resources from 176-178, 241-248, 253-264, and global search states from 265-267.
6. Build matter profiles and event evidence from 179, 196-209.
7. Build analytics builder from 41-147, including segmentation, funnel, data table, retention, journey, date/chart controls, export, save/share states.
8. Build dashboards, notebooks, and reports from 148-175.
9. Build Ask matter, cohorts, replay, experiments, flags from 38-40 and 182-240.
10. Build admin, team, billing, notifications, profile, feedback from 268-296.
11. Build dark-mode parity from 297-302.

## Verification Artifacts to Produce Per Phase

- \`phase-XX-reference-list.md\`: reference screenshot IDs used.
- \`phase-XX-render-desktop-ko.png\`: Playwright 1920 x 1320 Korean capture.
- \`phase-XX-render-desktop-en.png\`: Playwright 1920 x 1320 English capture.
- \`phase-XX-render-mobile-ko.png\`: Korean mobile capture.
- \`phase-XX-render-mobile-en.png\`: English mobile capture.
- \`phase-XX-fidelity-ledger.md\`: explicit comparison notes for shell, spacing, table density, controls, modal/dropdown states, locale text fit, font loading, and flow continuity.
`);
}

fs.mkdirSync(outDir, { recursive: true });

const inventory = buildInventory();
if (inventory.length !== screenshotCount) {
  throw new Error(`Expected ${screenshotCount} screenshots, got ${inventory.length}`);
}

writeJson("amplitude-screenshot-inventory.json", inventory);
writeCsv("amplitude-coverage-matrix.csv", inventory);
writeReadme(inventory);
writeFlowMap();
writeElementsCatalog();
writeMatterMap();
writeImplementationPlan(inventory);
writeBilingualFontPlan();

console.log(`Generated Amplitude UI reference pack with ${inventory.length} screenshots at ${outDir}`);
