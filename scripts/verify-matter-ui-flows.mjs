import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025", "visual-parity");
const baseUrl = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";

const viewChecks = [
  { name: "home-ko", url: "/?locale=ko&view=home", expectText: "Matter Analytics" },
  { name: "home-en", url: "/?locale=en&view=home", expectText: "Matter Analytics" },
  { name: "home-tour-en", url: "/?locale=en&view=home&variant=tour", expectText: "What's New" },
  { name: "new-navigation-tour-modal-en", url: "/?locale=en&view=home&modal=newNavigationTour", expectText: "Experience the new Amplitude" },
  { name: "annotation-modal-en", url: "/?locale=en&view=home&modal=annotation", expectText: "New Annotation" },
  { name: "auth-signup-ko", url: "/?locale=ko&view=auth&authStep=signup", expectText: "matter 시작하기" },
  { name: "auth-signup-modal-en", url: "/?locale=en&view=auth&authStep=signupModal", expectText: "Get started free" },
  { name: "auth-login-en", url: "/?locale=en&view=auth&authStep=login", expectText: "Log in to matter" },
  { name: "auth-verify-ko", url: "/?locale=ko&view=auth&authStep=verify", expectText: "이메일을 확인하세요" },
  { name: "content-ko", url: "/?locale=ko&view=content", expectText: "전체 콘텐츠" },
  { name: "visual-labeling-launch-modal-en", url: "/?locale=en&view=content&modal=visualLabelingLaunch", expectText: "Launch Visual Labeling" },
  { name: "profiles-ko", url: "/?locale=ko&view=profiles", expectText: "사용자 프로필" },
  { name: "profiles-user-list-en", url: "/?locale=en&view=profiles&variant=userList", expectText: "Matching Profiles" },
  { name: "save-cohort-modal-en", url: "/?locale=en&view=profiles&variant=userList&modal=saveCohort", expectText: "No Current Location" },
  { name: "analytics-en", url: "/?locale=en&view=analytics", expectText: "Untitled Chart" },
  { name: "analytics-data-table-en", url: "/?locale=en&view=analytics&variant=dataTable", expectText: "Start your data table" },
  { name: "analytics-data-table-picker-en", url: "/?locale=en&view=analytics&variant=dataTablePicker", expectText: "Select or Define a Metric" },
  { name: "metric-untitled-modal-en", url: "/?locale=en&view=analytics&variant=dataTable&modal=metricUntitled", expectText: "Untitled metric" },
  { name: "metric-named-modal-en", url: "/?locale=en&view=analytics&variant=dataTable&modal=metricNamed", expectText: "Sign ups per day" },
  { name: "metric-picker-modal-en", url: "/?locale=en&view=analytics&variant=dataTable&modal=metricPicker", expectText: "Any Active Event" },
  { name: "metric-preview-modal-en", url: "/?locale=en&view=analytics&variant=dataTable&modal=metricPreview", expectText: "Current Uniques" },
  { name: "dashboards-ko", url: "/?locale=ko&view=dashboards", expectText: "대시보드" },
  { name: "dashboard-template-en", url: "/?locale=en&view=dashboards&variant=template", expectText: "Template Preview" },
  { name: "create-dashboard-modal-en", url: "/?locale=en&view=dashboards&variant=template&modal=createDashboard", expectText: "Create New Dashboard" },
  { name: "dashboard-subscribe-modal-en", url: "/?locale=en&view=dashboards&modal=dashboardSubscribe", expectText: "Subscribe to Dashboard Reports" },
  { name: "dashboard-subscribe-success-modal-en", url: "/?locale=en&view=dashboards&modal=dashboardSubscribeSuccess", expectText: "Your schedules have been updated successfully" },
  { name: "ask-ko", url: "/?locale=ko&view=ask", expectText: "matter에게 질문" },
  { name: "ask-retention-en", url: "/?locale=en&view=ask&variant=retention", expectText: "Generated retention chart" },
  { name: "experiments-en", url: "/?locale=en&view=experiments", expectText: "Experiment Overview" },
  { name: "experiments-overview-cards-en", url: "/?locale=en&view=experiments&variant=overviewCards", expectText: "Web experimentation" },
  { name: "experiment-builder-en", url: "/?locale=en&view=experiments&variant=builder", expectText: "Targeting" },
  { name: "experiment-setup-site-en", url: "/?locale=en&view=experiments&variant=expSiteSetup", expectText: "Script tag detected" },
  { name: "experiment-setup-variants-en", url: "/?locale=en&view=experiments&variant=expVariantsDrawer", expectText: "Set up your variants" },
  { name: "experiment-setup-goals-en", url: "/?locale=en&view=experiments&variant=expGoalsConfigured", expectText: "Sign up interest" },
  { name: "experiment-setup-delivery-en", url: "/?locale=en&view=experiments&variant=expDelivery", expectText: "Delivery Options" },
  { name: "experiment-visual-editor-en", url: "/?locale=en&view=experiments&variant=expVisualEditor", expectText: "Selector" },
  { name: "experiment-action-modal-en", url: "/?locale=en&view=experiments&variant=expActionModal", expectText: "Apply an action to this variant" },
  { name: "experiment-adding-modal-en", url: "/?locale=en&view=experiments&variant=expAdding", expectText: "Adding variants to your experiment" },
  { name: "experiment-detail-settings-en", url: "/?locale=en&view=experiments&variant=expDetailSettings", expectText: "Targeting" },
  { name: "experiment-detail-activity-en", url: "/?locale=en&view=experiments&variant=expDetailActivity", expectText: "Data Quality" },
  { name: "experiment-start-modal-en", url: "/?locale=en&view=experiments&variant=expStartModal", expectText: "Start Experiment" },
  { name: "new-experiment-modal-en", url: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperiment", expectText: "New Web Experiment" },
  { name: "new-experiment-blank-modal-en", url: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentBlank", expectText: "Name*" },
  { name: "new-experiment-filled-modal-en", url: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentFilled", expectText: "Targeted Page" },
  { name: "new-experiment-advanced-modal-en", url: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentAdvanced", expectText: "Multi-Armed Bandit" },
  { name: "admin-ko", url: "/?locale=ko&view=admin", expectText: "조직 설정" },
  { name: "profile-settings-en", url: "/?locale=en&view=admin&variant=profile", expectText: "Personal Information" },
  { name: "profile-picture-modal-en", url: "/?locale=en&view=admin&variant=profile&modal=profilePicture", expectText: "Profile Picture" },
  { name: "dark-en", url: "/?locale=en&theme=dark&view=dark", expectText: "Theme Preferences" },
  { name: "theme-preferences-modal-en", url: "/?locale=en&view=home&modal=themePreferences", expectText: "Match System Settings" },
  { name: "search-ko", url: "/?locale=ko&view=home&query=atlas", expectText: "Search \"atlas\"" },
  { name: "save-modal-en", url: "/?locale=en&view=analytics&modal=save", expectText: "Save Chart" },
  { name: "share-modal-en", url: "/?locale=en&view=analytics&modal=share", expectText: "Add people" },
  { name: "share-invite-modal-en", url: "/?locale=en&view=analytics&modal=shareInvite", expectText: "Alex Smith" },
  { name: "share-toast-en", url: "/?locale=en&view=analytics&variant=shareToast", expectText: "Success. Shared" },
  { name: "share-history-modal-en", url: "/?locale=en&view=analytics&modal=shareHistory", expectText: "Last Viewed" },
  { name: "save-chart-card-modal-en", url: "/?locale=en&view=analytics&modal=saveChartCard", expectText: "Page Views by Unique Users" },
  { name: "save-chart-suggest-modal-en", url: "/?locale=en&view=analytics&modal=saveChartSuggest", expectText: "Suggest" },
  { name: "save-chart-report-dropdown-modal-en", url: "/?locale=en&view=analytics&modal=saveChartReportDropdown", expectText: "Create a new dashboard" },
  { name: "save-chart-report-selected-modal-en", url: "/?locale=en&view=analytics&modal=saveChartReportSelected", expectText: "Untitled Dashboard - Dec 16" },
  { name: "archive-modal-en", url: "/?locale=en&view=content&modal=archive", expectText: "Archive 2 items?" },
  { name: "generate-chart-modal-en", url: "/?locale=en&view=dashboards&modal=generateChart", expectText: "Generate Chart with AI" },
  { name: "ask-feedback-modal-en", url: "/?locale=en&view=ask&variant=retention&modal=feedback", expectText: "Were you satisfied with the response?" },
  { name: "feedback-widget-rating-en", url: "/?locale=en&view=home&variant=feedbackStars", expectText: "How would you rate your experience" },
  { name: "feedback-widget-comment-en", url: "/?locale=en&view=home&variant=feedbackComment", expectText: "Anything else to add?" },
  { name: "feedback-widget-filled-en", url: "/?locale=en&view=home&variant=feedbackFilled", expectText: "Show me mouse clicks" },
  { name: "feedback-widget-thanks-en", url: "/?locale=en&view=home&variant=feedbackThanks", expectText: "Thank you for your feedback" },
  { name: "opening-tab-modal-en", url: "/?locale=en&view=experiments&modal=openingTab", expectText: "Opening a new tab" },
  { name: "invite-modal-ko", url: "/?locale=ko&view=admin&modal=invite", expectText: "멤버 초대" },
  { name: "remove-member-modal-en", url: "/?locale=en&view=admin&modal=remove", expectText: "Remove 1 team member?" },
  { name: "confirm-modal-en", url: "/?locale=en&view=experiments&modal=confirm", expectText: "Approve rollout?" }
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

const results = [];

for (const check of viewChecks) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}${check.url}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  const textFound = await page.getByText(check.expectText, { exact: false }).count();
  const metrics = await page.evaluate(() => ({
    title: document.title,
    locale: document.documentElement.dataset.locale,
    theme: document.documentElement.dataset.theme,
    bodyFont: getComputedStyle(document.body).fontFamily,
    headingFont: getComputedStyle(document.querySelector("h1") ?? document.body).fontFamily,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));

  results.push({
    name: check.name,
    url: check.url,
    expectText: check.expectText,
    passed: textFound > 0 && !metrics.horizontalOverflow,
    textFound,
    metrics
  });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/?locale=ko&view=home`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
});
const mobileMetrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
}));

await browser.close();

const passed = results.every((result) => result.passed) && !mobileMetrics.horizontalOverflow && consoleErrors.length === 0;
const verification = {
  schema_version: "matter.amplitude.runtime-verification.v1",
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  passed,
  console_errors: consoleErrors,
  mobile_metrics: mobileMetrics,
  results
};

const md = `# phase-00 Runtime Verification

Generated at: ${verification.generated_at}

Overall result: ${passed ? "PASS" : "FAIL"}

## Checks

| Check | URL | Expected text | Result | Notes |
| --- | --- | --- | --- | --- |
${results
  .map(
    (result) =>
      `| ${result.name} | \`${result.url}\` | ${result.expectText} | ${result.passed ? "PASS" : "FAIL"} | locale=${result.metrics.locale}; theme=${result.metrics.theme}; overflow=${result.metrics.horizontalOverflow} |`
  )
  .join("\n")}

## Mobile Overflow

- scrollWidth: ${mobileMetrics.scrollWidth}
- clientWidth: ${mobileMetrics.clientWidth}
- horizontalOverflow: ${mobileMetrics.horizontalOverflow}

## Console Errors

${consoleErrors.length ? consoleErrors.map((error) => `- ${error}`).join("\n") : "- None"}
`;

fs.writeFileSync(path.join(outDir, "phase-00-runtime-verification.json"), `${JSON.stringify(verification, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "phase-00-runtime-verification.md"), md);

console.log(`runtime verification: ${passed ? "PASS" : "FAIL"}`);
for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
}
if (consoleErrors.length) {
  console.error(consoleErrors.join("\n"));
  process.exitCode = 1;
}
if (!passed) {
  process.exitCode = 1;
}
