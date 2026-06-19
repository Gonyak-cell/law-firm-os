import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const refDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025");
const inventory = JSON.parse(fs.readFileSync(path.join(refDir, "amplitude-screenshot-inventory.json"), "utf8"));

const flowRoutes = {
  "marketing-entry": route("/?locale=en&view=auth&authStep=signup", "Chart your legal path", "public marketing hero"),
  "signup-start": route("/?locale=en&view=auth&authStep=signupModal", "Get started free", "signup modal/form"),
  "email-verification": route("/?locale=ko&view=auth&authStep=verify", "이메일을 확인하세요", "email verification"),
  "password-setup": route("/?locale=en&view=auth&authStep=password", "Set your password", "password setup"),
  "organization-create": route("/?locale=ko&view=auth&authStep=org", "조직 생성", "organization setup"),
  loading: route("/?locale=ko&view=loading", "matter 작업공간을 불러오는 중", "loading interstitial"),
  "onboarding-source-selection": route("/?locale=en&view=auth&authStep=onboarding", "Set up matter", "onboarding connector checklist"),
  "home-dashboard": route("/?locale=ko&view=home", "Matter Analytics", "home dashboard"),
  "home-guidance": route("/?locale=en&view=home&variant=tour", "What's New", "home guidance modal/popover family"),
  "home-widgets": route("/?locale=ko&view=home", "실시간 게이지", "home widget grid"),
  "home-actions": route("/?locale=ko&view=home&query=atlas", "Search \"atlas\"", "home menus/search/resource actions"),
  "ask-entry": route("/?locale=ko&view=ask", "matter에게 질문", "Ask prompt gallery"),
  "segmentation-basic": route("/?locale=en&view=analytics", "Untitled Chart", "segmentation builder"),
  "save-chart-modal": route("/?locale=en&view=analytics&modal=save", "Save Chart", "save chart modal"),
  "segmentation-advanced": route("/?locale=en&view=analytics", "Recommendations", "advanced builder states"),
  "chart-type-modal": route("/?locale=en&view=analytics&modal=chartType", "Choose chart type", "chart type modal"),
  "segmentation-output": route("/?locale=en&view=analytics", "Result Table", "segmentation output"),
  "share-save-modals": route("/?locale=en&view=analytics&modal=share", "Add people", "share/save modal family"),
  "chart-page-empty-table": route("/?locale=en&view=analytics&variant=dataTable", "Start your data table", "chart/data-table entry and metric modal"),
  "funnel-analysis": route("/?locale=en&view=analytics", "Funnel", "funnel analysis family"),
  "data-table-and-metric": route("/?locale=en&view=analytics&variant=dataTablePicker", "Select or Define a Metric", "data table and metric setup"),
  "data-table-heatmap": route("/?locale=en&view=analytics", "Recommendations", "data table heatmap family"),
  "retention-and-journeys": route("/?locale=en&view=analytics", "Journeys", "retention and journey builder"),
  "dashboard-create": route("/?locale=ko&view=dashboards", "대시보드", "dashboard builder"),
  "dashboard-chart-report": route("/?locale=ko&view=dashboards", "Dashboard", "dashboard chart/report states"),
  "dashboard-templates": route("/?locale=en&view=dashboards&variant=template", "Template Preview", "dashboard template states"),
  notebooks: route("/?locale=ko&view=dashboards", "Notebooks", "notebook/report surface"),
  "all-content-initial": route("/?locale=ko&view=content", "전체 콘텐츠", "all content list"),
  "live-events": route("/?locale=ko&view=profiles", "이벤트 스트림", "live events"),
  "analysis-card-guidance": route("/?locale=ko&view=ask", "Guidance", "analysis card guidance"),
  "ask-ai": route("/?locale=en&view=ask&variant=retention", "Generated retention chart", "Ask AI answer state"),
  "product-overview": route("/?locale=ko&view=home", "Matter Analytics", "product overview dashboard"),
  "user-profiles-list": route("/?locale=en&view=profiles&variant=userList", "Matching Profiles", "user profiles list"),
  "user-profile-detail": route("/?locale=ko&view=profiles", "Raw 이벤트", "user profile detail"),
  "cohorts-users": route("/?locale=en&view=ask", "Cohorts", "cohorts/users"),
  "session-replay": route("/?locale=en&view=ask", "Session Replay", "session replay"),
  "experiments-overview": route("/?locale=en&view=experiments&variant=overviewCards", "Web experimentation", "experiments overview"),
  "experiment-builder": route("/?locale=en&view=experiments&variant=builder", "Targeting", "experiment builder/rollout confirmation"),
  "resources-and-external-preview": route("/?locale=ko&view=content", "리소스", "resources and external preview"),
  "data-connections-catalog": route("/?locale=ko&view=admin", "조직 설정", "data connections/catalog settings"),
  "flags-and-content": route("/?locale=ko&view=content", "기능 플래그", "flags and content"),
  "global-search": route("/?locale=ko&view=home&query=atlas", "Search \"atlas\"", "global search"),
  "invite-teammates": route("/?locale=ko&view=admin&modal=invite", "멤버 초대", "invite teammates modal"),
  notifications: route("/?locale=ko&view=admin", "Notifications", "notifications settings"),
  "billing-plan": route("/?locale=ko&view=admin", "요금제와 사용량", "billing and plan"),
  "team-members": route("/?locale=en&view=admin", "Team Members", "team members"),
  "profile-settings": route("/?locale=en&view=admin&variant=profile", "Personal Information", "profile settings"),
  feedback: route("/?locale=en&view=home&variant=feedbackStars", "How would you rate your experience", "feedback widget"),
  "theme-dark-mode": route("/?locale=en&theme=dark&view=dark", "Theme Preferences", "theme and dark mode"),
  "auth-returning-user": route("/?locale=en&view=auth&authStep=login", "Log in to matter", "returning user auth")
};

const screenshotRouteOverrides = new Map([
  [157, route("/?locale=en&view=dashboards&modal=generateChart", "Generate Chart with AI", "dashboard AI chart modal")],
  [158, route("/?locale=en&view=dashboards&modal=generateChart", "Generate Chart with AI", "dashboard AI chart modal")],
  [160, route("/?locale=en&view=dashboards&modal=dashboardSubscribe", "Subscribe to Dashboard Reports", "dashboard report subscription modal")],
  [161, route("/?locale=en&view=dashboards&modal=dashboardSubscribeSuccess", "Your schedules have been updated successfully", "dashboard report subscription success modal")],
  [166, route("/?locale=en&view=dashboards&variant=template&modal=createDashboard", "Create New Dashboard", "dashboard create modal")],
  [188, route("/?locale=en&view=ask&variant=retention&modal=feedback", "Were you satisfied with the response?", "Ask feedback modal")],
  [189, route("/?locale=en&view=ask&variant=retention&modal=feedback", "Were you satisfied with the response?", "Ask feedback modal")],
  [190, route("/?locale=en&view=ask&variant=retention&modal=feedback", "Were you satisfied with the response?", "Ask feedback modal")],
  [26, route("/?locale=en&view=home&modal=annotation", "New Annotation", "home annotation modal")],
  [27, route("/?locale=en&view=home&modal=annotation", "New Annotation", "home annotation modal")],
  [16, route("/?locale=en&view=home&modal=newNavigationTour", "Experience the new Amplitude", "new navigation tour modal")],
  [95, route("/?locale=en&view=analytics&modal=share", "Add people", "share modal blank")],
  [96, route("/?locale=en&view=analytics&modal=shareInvite", "Alex Smith", "share modal invite recipient")],
  [97, route("/?locale=en&view=analytics&variant=shareToast", "Success. Shared", "share success toast")],
  [98, route("/?locale=en&view=analytics&modal=shareHistory", "Last Viewed", "share modal history")],
  [99, route("/?locale=en&view=analytics&modal=saveChartCard", "Page Views by Unique Users", "save chart selected-card modal")],
  [100, route("/?locale=en&view=analytics&modal=saveChartSuggest", "Suggest", "save chart suggested-name modal")],
  [101, route("/?locale=en&view=analytics&modal=saveChartReportDropdown", "Create a new dashboard", "save chart report dropdown")],
  [102, route("/?locale=en&view=analytics&modal=saveChartReportSelected", "Untitled Dashboard - Dec 16", "save chart selected-report modal")],
  [115, route("/?locale=en&view=analytics&variant=dataTable&modal=metricUntitled", "Untitled metric", "metric definition modal empty")],
  [116, route("/?locale=en&view=analytics&variant=dataTable&modal=metricNamed", "Sign ups per day", "metric definition modal named")],
  [117, route("/?locale=en&view=analytics&variant=dataTable&modal=metricPicker", "Any Active Event", "metric event picker modal")],
  [118, route("/?locale=en&view=analytics&variant=dataTable&modal=metricPreview", "Current Uniques", "metric preview modal")],
  [215, route("/?locale=en&view=ask&modal=sessionReplay", "Session Replays", "session replay detail modal")],
  [300, route("/?locale=en&theme=dark&view=dark&variant=darkTemplates", "Dashboard Templates", "dark-shell bright dashboard templates grid")],
  [201, route("/?locale=en&view=profiles&variant=userList&modal=saveCohort", "No Current Location", "save cohort modal")],
  [202, route("/?locale=en&view=profiles&variant=userList&modal=saveCohort", "No Current Location", "save cohort modal")],
  [203, route("/?locale=en&view=profiles&variant=userList&modal=saveCohort", "Save", "save cohort modal")],
  [204, route("/?locale=en&view=profiles&variant=userList&modal=saveCohort", "Save", "save cohort modal")],
  [205, route("/?locale=en&view=profiles&variant=userList&modal=saveCohort", "Save", "save cohort modal")],
  [219, route("/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentBlank", "Name*", "new web experiment blank modal")],
  [220, route("/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentFilled", "Targeted Page", "new web experiment filled modal")],
  [221, route("/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentAdvanced", "Multi-Armed Bandit", "new web experiment advanced modal")],
  [222, route("/?locale=en&view=experiments&modal=openingTab", "Opening a new tab", "experiment opening-tab modal")],
  [224, route("/?locale=en&view=experiments&variant=expSiteSetup", "Script tag detected", "experiment setup site drawer")],
  [225, route("/?locale=en&view=experiments&variant=expVariantsDrawer", "Set up your variants", "experiment setup variants drawer")],
  [226, route("/?locale=en&view=experiments&variant=expActionModal", "Apply an action to this variant", "experiment visual editor action modal")],
  [228, route("/?locale=en&view=experiments&variant=expVisualEditor", "Selector", "experiment visual editor property panel")],
  [232, route("/?locale=en&view=experiments&variant=expAdding", "Adding variants to your experiment", "experiment visual editor adding variants")],
  [234, route("/?locale=en&view=experiments&variant=expGoalsDraft", "Enable Recommendation", "experiment setup goals draft drawer")],
  [235, route("/?locale=en&view=experiments&variant=expGoalsConfigured", "Sign up interest", "experiment setup goals configured drawer")],
  [236, route("/?locale=en&view=experiments&variant=expDelivery", "Delivery Options", "experiment setup delivery drawer")],
  [238, route("/?locale=en&view=experiments&variant=expStartModal", "Start Experiment", "experiment start confirmation modal")],
  [239, route("/?locale=en&view=experiments&variant=expDetailSettings", "Targeting", "experiment detail settings")],
  [240, route("/?locale=en&view=experiments&variant=expDetailActivity", "Data Quality", "experiment detail activity")],
  [244, route("/?locale=en&view=content&modal=visualLabelingLaunch", "Launch Visual Labeling", "visual labeling launch modal")],
  [261, route("/?locale=en&view=content&modal=archive", "Archive 2 items?", "all-content archive confirmation modal")],
  [283, route("/?locale=en&view=admin&modal=remove", "Remove 1 team member?", "team member remove confirmation modal")],
  [284, route("/?locale=en&view=admin&modal=remove", "Transfer content from Alex Smith to:", "team member remove confirmation modal")],
  [285, route("/?locale=en&view=admin&modal=remove", "Transfer content from Alex Smith to:", "team member remove confirmation modal")],
  [290, route("/?locale=en&view=admin&variant=profile&modal=profilePicture", "Profile Picture", "profile photo modal")],
  [291, route("/?locale=en&view=admin&variant=profile&modal=profilePicture", "Profile Picture", "profile photo modal")],
  [293, route("/?locale=en&view=home&variant=feedbackStars", "How would you rate your experience", "feedback rating widget")],
  [294, route("/?locale=en&view=home&variant=feedbackComment", "Anything else to add?", "feedback text widget")],
  [295, route("/?locale=en&view=home&variant=feedbackFilled", "Show me mouse clicks", "feedback text widget filled")],
  [296, route("/?locale=en&view=home&variant=feedbackThanks", "Thank you for your feedback", "feedback thanks widget")],
  [297, route("/?locale=en&view=home&modal=themePreferences", "Theme Preferences", "theme preferences modal")]
]);

function route(url, expectedText, stateFamily) {
  return { url, expectedText, stateFamily };
}

const rows = inventory.map((item) => {
  const routeInfo = screenshotRouteOverrides.get(item.screenshot_id) ?? flowRoutes[item.flow_id];
  if (!routeInfo) {
    throw new Error(`Missing route mapping for ${item.flow_id}`);
  }

  return {
    screenshot_id: item.screenshot_id,
    source_file: item.file,
    flow_id: item.flow_id,
    screen_family: item.screen_family,
    implementation_phase: item.implementation_phase,
    state_family: routeInfo.stateFamily,
    matter_route: routeInfo.url,
    expected_text: routeInfo.expectedText,
    verification_tier: "state_route_defined",
    next_gate: "Run registry verification, then add screenshot-specific pixel comparison for this state."
  };
});

const byFlow = rows.reduce((acc, row) => {
  acc[row.flow_id] = (acc[row.flow_id] ?? 0) + 1;
  return acc;
}, {});

const registry = {
  schema_version: "matter.amplitude.screenshot-state-registry.v1",
  generated_at: new Date().toISOString(),
  screenshot_count: rows.length,
  flow_count: Object.keys(byFlow).length,
  policy:
    "Every Amplitude screenshot must have a reachable matter route/state. This registry proves state routing, not final pixel parity.",
  flow_summary: Object.entries(byFlow).map(([flow_id, count]) => ({
    flow_id,
    count,
    route: flowRoutes[flow_id].url,
    expected_text: flowRoutes[flow_id].expectedText,
    state_family: flowRoutes[flow_id].stateFamily
  })),
  rows
};

const csvHeaders = [
  "screenshot_id",
  "flow_id",
  "screen_family",
  "implementation_phase",
  "state_family",
  "matter_route",
  "expected_text",
  "verification_tier",
  "next_gate"
];

const csvRows = [
  csvHeaders,
  ...rows.map((row) => csvHeaders.map((key) => String(row[key] ?? "")))
];

const md = `# matter Amplitude Screenshot State Registry

Generated at: ${registry.generated_at}

## Policy

${registry.policy}

## Summary

- Screenshot rows: ${registry.screenshot_count}
- Flow groups: ${registry.flow_count}

## Flow Routes

| Flow | Screenshots | Route | Expected text | State family |
| --- | ---: | --- | --- | --- |
${registry.flow_summary
  .map((flow) => `| ${flow.flow_id} | ${flow.count} | \`${flow.route}\` | ${flow.expected_text} | ${flow.state_family} |`)
  .join("\n")}
`;

fs.writeFileSync(path.join(refDir, "matter-amplitude-screenshot-state-registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
fs.writeFileSync(
  path.join(refDir, "matter-amplitude-screenshot-state-registry.csv"),
  `${csvRows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")}\n`
);
fs.writeFileSync(path.join(refDir, "matter-amplitude-screenshot-state-registry.md"), md);

console.log(`screenshot state rows: ${registry.screenshot_count}`);
console.log(`flow routes: ${registry.flow_count}`);
