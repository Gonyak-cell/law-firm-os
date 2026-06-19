import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const refDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025");
const inventoryPath = path.join(refDir, "amplitude-screenshot-inventory.json");
const parityDir = path.join(refDir, "visual-parity");

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const screenshotStateVerificationPath = path.join(refDir, "matter-amplitude-screenshot-state-verification.json");
const screenshotStateVerification = fs.existsSync(screenshotStateVerificationPath)
  ? JSON.parse(fs.readFileSync(screenshotStateVerificationPath, "utf8"))
  : null;
const routeVerificationByScreenshot = new Map(
  (screenshotStateVerification?.rows ?? []).map((row) => [row.screenshot_id, row])
);

const phaseEvidence = {
  "P1 app shell / navigation / search": {
    status: "componentized_foundation",
    surface: "Shared shell, search popover, loading state family",
    captures: [
      "phase-00-render-desktop-ko.png",
      "phase-00-render-desktop-en.png",
      "phase-00-render-mobile-ko.png",
      "phase-p1-global-search-desktop-ko.png",
      "phase-p1-loading-desktop-ko.png"
    ]
  },
  "P2 auth and onboarding flow": {
    status: "representative_verified",
    surface: "Auth/public marketing/sign-up/login/password/org/verify/reset state family",
    captures: [
      "phase-p2-auth-desktop-ko.png",
      "phase-p2-signup-modal-desktop-en.png",
      "phase-p2-login-desktop-en.png",
      "phase-p2-verify-desktop-ko.png",
      "phase-p2-onboarding-desktop-en.png"
    ]
  },
  "P3 home dashboards and templates": {
    status: "representative_verified",
    surface: "Home dashboard, metric cards, charts, tables, templates, guided setup",
    captures: [
      "phase-00-render-desktop-ko.png",
      "phase-00-render-desktop-en.png",
      "phase-00-render-mobile-ko.png",
      "phase-00-render-mobile-en.png",
      "phase-p3-home-tour-desktop-en.png",
      "phase-p3-annotation-modal-desktop-en.png"
    ]
  },
  "P4 spaces, all content, search, resource surfaces": {
    status: "representative_verified",
    surface: "All content, resources, feature flags, search-result state family",
    captures: ["phase-p4-content-desktop-ko.png", "phase-p4-content-archive-modal-desktop-en.png", "phase-p1-global-search-desktop-ko.png"]
  },
  "P5 matter profiles, event stream, raw evidence": {
    status: "representative_verified",
    surface: "Matter profile card, pinned properties, event stream, raw JSON panel",
    captures: [
      "phase-p5-profiles-desktop-ko.png",
      "phase-p5-user-profiles-list-desktop-en.png",
      "phase-p5-save-cohort-modal-desktop-en.png"
    ]
  },
  "P6 matter analytics builder": {
    status: "representative_verified",
    surface: "Analysis rail, query blocks, chart area, result table, recommendation panel",
    captures: [
      "phase-p6-analytics-desktop-en.png",
      "phase-p6-data-table-empty-desktop-en.png",
      "phase-p6-data-table-picker-desktop-en.png",
      "phase-p6-save-modal-desktop-en.png",
      "phase-p6-chart-type-modal-desktop-en.png",
      "phase-p6-share-modal-desktop-en.png"
    ]
  },
  "P7 dashboards, notebooks, reports": {
    status: "representative_verified",
    surface: "Dashboard cards, notebook/report grid, add-chart entry",
    captures: [
      "phase-p7-dashboards-desktop-ko.png",
      "phase-p7-dashboard-template-desktop-en.png",
      "phase-p7-create-dashboard-modal-desktop-en.png",
      "phase-p7-generate-chart-modal-desktop-en.png"
    ]
  },
  "P8 Ask matter, cohorts, replay, experiments, flags": {
    status: "representative_verified",
    surface: "Ask prompt gallery, answer surface, experiment table, variant editor, rollout modal",
    captures: [
      "phase-p8-ask-desktop-ko.png",
      "phase-p8-ask-retention-desktop-en.png",
      "phase-p8-ask-feedback-modal-desktop-en.png",
      "phase-p8-cohorts-replay-desktop-en.png",
      "phase-p8-experiments-desktop-en.png",
      "phase-p8-experiment-overview-cards-desktop-en.png",
      "phase-p8-experiment-builder-desktop-en.png",
      "phase-p8-new-experiment-modal-desktop-en.png",
      "phase-p8-opening-tab-modal-desktop-en.png"
    ]
  },
  "P9 settings, team, billing, profile, notifications": {
    status: "representative_verified",
    surface: "Admin settings, team table, billing usage, notifications, invite modal family",
    captures: [
      "phase-p9-admin-desktop-ko.png",
      "phase-p9-profile-settings-desktop-en.png",
      "phase-p9-profile-picture-modal-desktop-en.png",
      "phase-p9-remove-member-modal-desktop-en.png",
      "phase-p9-feedback-modal-desktop-en.png"
    ]
  },
  "P10 dark theme and preference parity": {
    status: "representative_verified",
    surface: "Theme preference, dark dashboard, dark content/panel tokens",
    captures: ["phase-p10-dark-desktop-en.png"]
  }
};

const statusRank = {
  planned: 0,
  componentized_foundation: 1,
  implemented_foundation: 2,
  representative_verified: 3,
  screenshot_verified: 4
};

const rows = inventory.map((item) => {
  const evidence = phaseEvidence[item.implementation_phase] ?? {
    status: "planned",
    surface: "No foundation surface mapped",
    captures: []
  };
  const routeVerification = routeVerificationByScreenshot.get(item.screenshot_id);
  return {
    screenshot_id: item.screenshot_id,
    flow_id: item.flow_id,
    screen_family: item.screen_family,
    implementation_phase: item.implementation_phase,
    matter_destination: item.matter_destination,
    foundation_status: evidence.status,
    evidence_surface: evidence.surface,
    evidence_captures: evidence.captures,
    route_verification_tier: routeVerification?.verification_tier ?? "not_run",
    route_verified: Boolean(routeVerification?.route_verified),
    route_verification_ref: screenshotStateVerification ? "matter-amplitude-screenshot-state-verification.json" : "",
    next_gate:
      evidence.status === "representative_verified"
        ? "Add screenshot-specific state capture and compare exact modal/dropdown/table variants"
        : evidence.status === "implemented_foundation"
          ? "Capture representative state and promote to representative_verified"
          : "Implement or expand code-native state family"
  };
});

const summary = Object.entries(
  rows.reduce((acc, row) => {
    acc[row.foundation_status] = (acc[row.foundation_status] ?? 0) + 1;
    return acc;
  }, {})
)
  .sort((a, b) => statusRank[b[0]] - statusRank[a[0]])
  .map(([status, count]) => ({ status, count }));

const byPhase = Object.entries(
  rows.reduce((acc, row) => {
    const entry = acc[row.implementation_phase] ?? {
      phase: row.implementation_phase,
      count: 0,
      statuses: {},
      captures: phaseEvidence[row.implementation_phase]?.captures ?? []
    };
    entry.count += 1;
    entry.statuses[row.foundation_status] = (entry.statuses[row.foundation_status] ?? 0) + 1;
    acc[row.implementation_phase] = entry;
    return acc;
  }, {})
).map(([, value]) => value);

const routeVerificationSummary = Object.entries(
  rows.reduce((acc, row) => {
    acc[row.route_verification_tier] = (acc[row.route_verification_tier] ?? 0) + 1;
    return acc;
  }, {})
).map(([status, count]) => ({ status, count }));

const ledger = {
  schema_version: "matter.amplitude.coverage-ledger.v1",
  generated_at: new Date().toISOString(),
  screenshot_count: rows.length,
  status_summary: summary,
  route_verification_summary: routeVerificationSummary,
  phase_summary: byPhase,
  evidence_policy:
    "This ledger is conservative: representative_verified means a phase-level surface has screenshot evidence; it does not mean every individual screenshot in that phase is pixel-verified.",
  rows
};

const csvHeaders = [
  "screenshot_id",
  "flow_id",
  "screen_family",
  "implementation_phase",
  "foundation_status",
  "route_verification_tier",
  "route_verified",
  "evidence_surface",
  "evidence_captures",
  "next_gate"
];
const csvRows = [
  csvHeaders,
  ...rows.map((row) => csvHeaders.map((key) => (Array.isArray(row[key]) ? row[key].join("; ") : String(row[key] ?? ""))))
];

const md = `# matter Amplitude Coverage Ledger

Generated at: ${ledger.generated_at}

## Status Policy

${ledger.evidence_policy}

## Summary

| Status | Screenshot count |
| --- | ---: |
${summary.map((row) => `| ${row.status} | ${row.count} |`).join("\n")}

## Route Verification Summary

| Status | Screenshot count |
| --- | ---: |
${routeVerificationSummary.map((row) => `| ${row.status} | ${row.count} |`).join("\n")}

## Phase Summary

| Phase | Screenshots | Status counts | Captures |
| --- | ---: | --- | --- |
${byPhase
  .map(
    (phase) =>
      `| ${phase.phase} | ${phase.count} | ${Object.entries(phase.statuses)
        .map(([status, count]) => `${status}: ${count}`)
        .join("; ")} | ${phase.captures.join(", ") || "none"} |`
  )
  .join("\n")}

## Next Gate

- Promote representative surfaces into screenshot-specific verified states.
- Add exact dropdown, date picker, modal, side panel, table, and dark-mode variants per screenshot family.
- Keep \`amplitude-screenshot-inventory.json\` immutable as the source catalog; use this ledger to track implementation proof.
`;

fs.writeFileSync(path.join(refDir, "matter-amplitude-coverage-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
fs.writeFileSync(
  path.join(refDir, "matter-amplitude-coverage-ledger.csv"),
  `${csvRows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")}\n`
);
fs.writeFileSync(path.join(parityDir, "phase-00-coverage-ledger.md"), md);

console.log(`coverage rows: ${rows.length}`);
for (const item of summary) {
  console.log(`${item.status}: ${item.count}`);
}
