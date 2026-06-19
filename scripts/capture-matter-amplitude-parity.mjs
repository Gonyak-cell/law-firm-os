import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025", "visual-parity");
const baseUrl = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";

const captures = [
  {
    name: "phase-00-render-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=home"
  },
  {
    name: "phase-00-render-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home"
  },
  {
    name: "phase-p3-home-tour-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&variant=tour"
  },
  {
    name: "phase-p3-new-navigation-tour-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&modal=newNavigationTour"
  },
  {
    name: "phase-p3-annotation-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&modal=annotation"
  },
  {
    name: "phase-00-render-mobile-ko.png",
    viewport: { width: 390, height: 844 },
    path: "/?locale=ko&view=home"
  },
  {
    name: "phase-00-render-mobile-en.png",
    viewport: { width: 390, height: 844 },
    path: "/?locale=en&view=home"
  },
  {
    name: "phase-p2-auth-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=auth"
  },
  {
    name: "phase-p2-signup-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=auth&authStep=signupModal"
  },
  {
    name: "phase-p1-loading-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=loading"
  },
  {
    name: "phase-p2-login-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=auth&authStep=login"
  },
  {
    name: "phase-p2-verify-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=auth&authStep=verify"
  },
  {
    name: "phase-p2-onboarding-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=auth&authStep=onboarding"
  },
  {
    name: "phase-p1-global-search-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=home&query=atlas"
  },
  {
    name: "phase-p4-content-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=content"
  },
  {
    name: "phase-p4-visual-labeling-launch-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=content&modal=visualLabelingLaunch"
  },
  {
    name: "phase-p4-content-archive-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=content&modal=archive"
  },
  {
    name: "phase-p5-profiles-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=profiles"
  },
  {
    name: "phase-p5-user-profiles-list-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=profiles&variant=userList"
  },
  {
    name: "phase-p5-save-cohort-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=profiles&variant=userList&modal=saveCohort"
  },
  {
    name: "phase-p6-analytics-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics"
  },
  {
    name: "phase-p6-data-table-empty-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&variant=dataTable"
  },
  {
    name: "phase-p6-data-table-picker-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&variant=dataTablePicker"
  },
  {
    name: "phase-p6-metric-untitled-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&variant=dataTable&modal=metricUntitled"
  },
  {
    name: "phase-p6-metric-named-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&variant=dataTable&modal=metricNamed"
  },
  {
    name: "phase-p6-metric-picker-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&variant=dataTable&modal=metricPicker"
  },
  {
    name: "phase-p6-metric-preview-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&variant=dataTable&modal=metricPreview"
  },
  {
    name: "phase-p6-save-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=save"
  },
  {
    name: "phase-p6-chart-type-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=chartType"
  },
  {
    name: "phase-p6-share-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=share"
  },
  {
    name: "phase-p6-share-invite-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=shareInvite"
  },
  {
    name: "phase-p6-share-toast-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&variant=shareToast"
  },
  {
    name: "phase-p6-share-history-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=shareHistory"
  },
  {
    name: "phase-p6-save-chart-card-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=saveChartCard"
  },
  {
    name: "phase-p6-save-chart-suggest-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=saveChartSuggest"
  },
  {
    name: "phase-p6-save-chart-report-dropdown-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=saveChartReportDropdown"
  },
  {
    name: "phase-p6-save-chart-report-selected-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=analytics&modal=saveChartReportSelected"
  },
  {
    name: "phase-p7-dashboards-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=dashboards"
  },
  {
    name: "phase-p7-dashboard-template-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=dashboards&variant=template"
  },
  {
    name: "phase-p7-create-dashboard-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=dashboards&variant=template&modal=createDashboard"
  },
  {
    name: "phase-p7-generate-chart-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=dashboards&modal=generateChart"
  },
  {
    name: "phase-p7-dashboard-subscribe-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=dashboards&modal=dashboardSubscribe"
  },
  {
    name: "phase-p7-dashboard-subscribe-success-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=dashboards&modal=dashboardSubscribeSuccess"
  },
  {
    name: "phase-p8-ask-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=ask"
  },
  {
    name: "phase-p8-ask-retention-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=ask&variant=retention"
  },
  {
    name: "phase-p8-ask-feedback-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=ask&variant=retention&modal=feedback"
  },
  {
    name: "phase-p8-cohorts-replay-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=ask"
  },
  {
    name: "phase-p8-session-replay-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=ask&modal=sessionReplay"
  },
  {
    name: "phase-p8-experiments-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments"
  },
  {
    name: "phase-p8-experiment-overview-cards-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=overviewCards"
  },
  {
    name: "phase-p8-experiment-builder-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=builder"
  },
  {
    name: "phase-p8-experiment-setup-site-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expSiteSetup"
  },
  {
    name: "phase-p8-experiment-setup-variants-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expVariantsDrawer"
  },
  {
    name: "phase-p8-experiment-setup-goals-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expGoalsConfigured"
  },
  {
    name: "phase-p8-experiment-setup-delivery-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expDelivery"
  },
  {
    name: "phase-p8-experiment-visual-editor-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expVisualEditor"
  },
  {
    name: "phase-p8-experiment-action-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expActionModal"
  },
  {
    name: "phase-p8-experiment-adding-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expAdding"
  },
  {
    name: "phase-p8-experiment-detail-settings-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expDetailSettings"
  },
  {
    name: "phase-p8-experiment-detail-activity-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expDetailActivity"
  },
  {
    name: "phase-p8-experiment-start-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=expStartModal"
  },
  {
    name: "phase-p8-new-experiment-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperiment"
  },
  {
    name: "phase-p8-new-experiment-blank-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentBlank"
  },
  {
    name: "phase-p8-new-experiment-filled-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentFilled"
  },
  {
    name: "phase-p8-new-experiment-advanced-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentAdvanced"
  },
  {
    name: "phase-p8-opening-tab-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=experiments&modal=openingTab"
  },
  {
    name: "phase-p9-admin-desktop-ko.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=ko&view=admin"
  },
  {
    name: "phase-p9-profile-settings-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=admin&variant=profile"
  },
  {
    name: "phase-p9-profile-picture-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=admin&variant=profile&modal=profilePicture"
  },
  {
    name: "phase-p9-remove-member-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=admin&modal=remove"
  },
  {
    name: "phase-p9-feedback-rating-widget-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&variant=feedbackStars"
  },
  {
    name: "phase-p9-feedback-comment-widget-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&variant=feedbackComment"
  },
  {
    name: "phase-p9-feedback-filled-widget-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&variant=feedbackFilled"
  },
  {
    name: "phase-p9-feedback-thanks-widget-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&variant=feedbackThanks"
  },
  {
    name: "phase-p10-dark-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&theme=dark&view=dark"
  },
  {
    name: "phase-p10-dark-templates-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&theme=dark&view=dark&variant=darkTemplates"
  },
  {
    name: "phase-p10-theme-preferences-modal-desktop-en.png",
    viewport: { width: 1920, height: 1320 },
    path: "/?locale=en&view=home&modal=themePreferences"
  }
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

for (const capture of captures) {
  await page.setViewportSize(capture.viewport);
  await page.goto(`${baseUrl}${capture.path}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
  await page.screenshot({
    path: path.join(outDir, capture.name),
    fullPage: false
  });
  console.log(`${capture.name} ${capture.viewport.width}x${capture.viewport.height} ${capture.path}`);
}

await browser.close();
