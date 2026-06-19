# matter Amplitude Screenshot State Verification

Generated at: 2026-06-10T13:13:52.158Z

Overall result: PASS

## Summary

- Screenshot rows: 318
- Unique route checks: 93
- Console errors: 0

| Status | Screenshot count |
| --- | ---: |
| screenshot_state_route_verified | 318 |

## Route Checks

| Route | Screenshots | Expected text | Result | Flow IDs |
| --- | ---: | --- | --- | --- |
| `/?locale=en&view=auth&authStep=signup` | 1 | Chart your legal path | PASS | marketing-entry |
| `/?locale=en&view=auth&authStep=signupModal` | 3 | Get started free | PASS | signup-start |
| `/?locale=ko&view=auth&authStep=verify` | 1 | 이메일을 확인하세요 | PASS | email-verification |
| `/?locale=en&view=auth&authStep=password` | 3 | Set your password | PASS | password-setup |
| `/?locale=ko&view=auth&authStep=org` | 3 | 조직 생성 | PASS | organization-create |
| `/?locale=ko&view=loading` | 1 | matter 작업공간을 불러오는 중 | PASS | loading |
| `/?locale=en&view=auth&authStep=onboarding` | 2 | Set up matter | PASS | onboarding-source-selection |
| `/?locale=ko&view=home` | 6 | Matter Analytics | PASS | home-dashboard, product-overview |
| `/?locale=en&view=home&modal=newNavigationTour` | 1 | Experience the new Amplitude | PASS | home-guidance |
| `/?locale=en&view=home&variant=tour` | 3 | What's New | PASS | home-guidance |
| `/?locale=ko&view=home` | 5 | 실시간 게이지 | PASS | home-widgets |
| `/?locale=ko&view=home&query=atlas` | 14 | Search "atlas" | PASS | home-actions, global-search |
| `/?locale=en&view=home&modal=annotation` | 2 | New Annotation | PASS | home-actions |
| `/?locale=ko&view=ask` | 3 | matter에게 질문 | PASS | ask-entry |
| `/?locale=en&view=analytics` | 4 | Untitled Chart | PASS | segmentation-basic |
| `/?locale=en&view=analytics&modal=save` | 1 | Save Chart | PASS | save-chart-modal |
| `/?locale=en&view=analytics` | 51 | Recommendations | PASS | segmentation-advanced, data-table-heatmap |
| `/?locale=en&view=analytics&modal=chartType` | 1 | Choose chart type | PASS | chart-type-modal |
| `/?locale=en&view=analytics` | 14 | Result Table | PASS | segmentation-output |
| `/?locale=en&view=analytics&modal=share` | 1 | Add people | PASS | share-save-modals |
| `/?locale=en&view=analytics&modal=shareInvite` | 1 | Alex Smith | PASS | share-save-modals |
| `/?locale=en&view=analytics&variant=shareToast` | 1 | Success. Shared | PASS | share-save-modals |
| `/?locale=en&view=analytics&modal=shareHistory` | 1 | Last Viewed | PASS | share-save-modals |
| `/?locale=en&view=analytics&modal=saveChartCard` | 1 | Page Views by Unique Users | PASS | share-save-modals |
| `/?locale=en&view=analytics&modal=saveChartSuggest` | 1 | Suggest | PASS | share-save-modals |
| `/?locale=en&view=analytics&modal=saveChartReportDropdown` | 1 | Create a new dashboard | PASS | share-save-modals |
| `/?locale=en&view=analytics&modal=saveChartReportSelected` | 1 | Untitled Dashboard - Dec 16 | PASS | share-save-modals |
| `/?locale=en&view=analytics&variant=dataTable` | 2 | Start your data table | PASS | chart-page-empty-table |
| `/?locale=en&view=analytics` | 7 | Funnel | PASS | funnel-analysis |
| `/?locale=en&view=analytics&variant=dataTablePicker` | 4 | Select or Define a Metric | PASS | data-table-and-metric |
| `/?locale=en&view=analytics&variant=dataTable&modal=metricUntitled` | 1 | Untitled metric | PASS | data-table-and-metric |
| `/?locale=en&view=analytics&variant=dataTable&modal=metricNamed` | 1 | Sign ups per day | PASS | data-table-and-metric |
| `/?locale=en&view=analytics&variant=dataTable&modal=metricPicker` | 1 | Any Active Event | PASS | data-table-and-metric |
| `/?locale=en&view=analytics&variant=dataTable&modal=metricPreview` | 1 | Current Uniques | PASS | data-table-and-metric |
| `/?locale=en&view=analytics` | 11 | Journeys | PASS | retention-and-journeys |
| `/?locale=ko&view=dashboards` | 8 | 대시보드 | PASS | dashboard-create |
| `/?locale=ko&view=dashboards` | 2 | Dashboard | PASS | dashboard-chart-report |
| `/?locale=en&view=dashboards&modal=generateChart` | 2 | Generate Chart with AI | PASS | dashboard-chart-report |
| `/?locale=en&view=dashboards&modal=dashboardSubscribe` | 1 | Subscribe to Dashboard Reports | PASS | dashboard-chart-report |
| `/?locale=en&view=dashboards&modal=dashboardSubscribeSuccess` | 1 | Your schedules have been updated successfully | PASS | dashboard-chart-report |
| `/?locale=en&view=dashboards&variant=template` | 5 | Template Preview | PASS | dashboard-templates |
| `/?locale=en&view=dashboards&variant=template&modal=createDashboard` | 1 | Create New Dashboard | PASS | dashboard-templates |
| `/?locale=ko&view=dashboards` | 8 | Notebooks | PASS | notebooks |
| `/?locale=ko&view=content` | 3 | 전체 콘텐츠 | PASS | all-content-initial |
| `/?locale=ko&view=profiles` | 1 | 이벤트 스트림 | PASS | live-events |
| `/?locale=ko&view=ask` | 2 | Guidance | PASS | analysis-card-guidance |
| `/?locale=en&view=ask&variant=retention` | 7 | Generated retention chart | PASS | ask-ai |
| `/?locale=en&view=ask&variant=retention&modal=feedback` | 3 | Were you satisfied with the response? | PASS | ask-ai |
| `/?locale=en&view=profiles&variant=userList` | 6 | Matching Profiles | PASS | user-profiles-list |
| `/?locale=en&view=profiles&variant=userList&modal=saveCohort` | 2 | No Current Location | PASS | user-profiles-list |
| `/?locale=en&view=profiles&variant=userList&modal=saveCohort` | 3 | Save | PASS | user-profiles-list |
| `/?locale=ko&view=profiles` | 3 | Raw 이벤트 | PASS | user-profile-detail |
| `/?locale=en&view=ask` | 3 | Cohorts | PASS | cohorts-users |
| `/?locale=en&view=ask` | 2 | Session Replay | PASS | session-replay |
| `/?locale=en&view=ask&modal=sessionReplay` | 1 | Session Replays | PASS | session-replay |
| `/?locale=en&view=experiments&variant=overviewCards` | 3 | Web experimentation | PASS | experiments-overview |
| `/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentBlank` | 1 | Name* | PASS | experiments-overview |
| `/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentFilled` | 1 | Targeted Page | PASS | experiments-overview |
| `/?locale=en&view=experiments&variant=overviewCards&modal=newExperimentAdvanced` | 1 | Multi-Armed Bandit | PASS | experiments-overview |
| `/?locale=en&view=experiments&modal=openingTab` | 1 | Opening a new tab | PASS | experiments-overview |
| `/?locale=en&view=experiments&variant=builder` | 7 | Targeting | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expSiteSetup` | 1 | Script tag detected | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expVariantsDrawer` | 1 | Set up your variants | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expActionModal` | 1 | Apply an action to this variant | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expVisualEditor` | 1 | Selector | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expAdding` | 1 | Adding variants to your experiment | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expGoalsDraft` | 1 | Enable Recommendation | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expGoalsConfigured` | 1 | Sign up interest | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expDelivery` | 1 | Delivery Options | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expStartModal` | 1 | Start Experiment | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expDetailSettings` | 1 | Targeting | PASS | experiment-builder |
| `/?locale=en&view=experiments&variant=expDetailActivity` | 1 | Data Quality | PASS | experiment-builder |
| `/?locale=ko&view=content` | 7 | 리소스 | PASS | resources-and-external-preview |
| `/?locale=en&view=content&modal=visualLabelingLaunch` | 1 | Launch Visual Labeling | PASS | resources-and-external-preview |
| `/?locale=ko&view=admin` | 4 | 조직 설정 | PASS | data-connections-catalog |
| `/?locale=ko&view=content` | 11 | 기능 플래그 | PASS | flags-and-content |
| `/?locale=en&view=content&modal=archive` | 1 | Archive 2 items? | PASS | flags-and-content |
| `/?locale=ko&view=admin&modal=invite` | 4 | 멤버 초대 | PASS | invite-teammates |
| `/?locale=ko&view=admin` | 3 | Notifications | PASS | notifications |
| `/?locale=ko&view=admin` | 7 | 요금제와 사용량 | PASS | billing-plan |
| `/?locale=en&view=admin` | 2 | Team Members | PASS | team-members |
| `/?locale=en&view=admin&modal=remove` | 1 | Remove 1 team member? | PASS | team-members |
| `/?locale=en&view=admin&modal=remove` | 2 | Transfer content from Alex Smith to: | PASS | team-members |
| `/?locale=en&view=admin&variant=profile` | 4 | Personal Information | PASS | profile-settings |
| `/?locale=en&view=admin&variant=profile&modal=profilePicture` | 2 | Profile Picture | PASS | profile-settings |
| `/?locale=en&view=home&variant=feedbackStars` | 1 | How would you rate your experience | PASS | feedback |
| `/?locale=en&view=home&variant=feedbackComment` | 1 | Anything else to add? | PASS | feedback |
| `/?locale=en&view=home&variant=feedbackFilled` | 1 | Show me mouse clicks | PASS | feedback |
| `/?locale=en&view=home&variant=feedbackThanks` | 1 | Thank you for your feedback | PASS | feedback |
| `/?locale=en&view=home&modal=themePreferences` | 1 | Theme Preferences | PASS | theme-dark-mode |
| `/?locale=en&theme=dark&view=dark` | 4 | Theme Preferences | PASS | theme-dark-mode |
| `/?locale=en&theme=dark&view=dark&variant=darkTemplates` | 1 | Dashboard Templates | PASS | theme-dark-mode |
| `/?locale=en&view=auth&authStep=login` | 15 | Log in to matter | PASS | auth-returning-user |

## Policy

This verification proves every Amplitude screenshot has a reachable matter route/state with expected UI text and no desktop horizontal overflow. It does not replace pixel-level screenshot comparison against each source image.
