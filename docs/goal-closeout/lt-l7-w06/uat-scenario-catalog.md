# UAT Scenario Catalog

Status: draft_blocked_pending_l4_w04_regression_map_runtime_pilot_users_and_uat_execution
Work package: LT-L7-W06
TUW: LT-L7-W06-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a UAT scenario catalog only. It does not execute UAT, does not record
pilot-user results, does not collect KPI before/after values, does not prove
prohibited-action blocking, and does not claim LT-L7-W06-T01 or LT-L7-W06
completion.

Every scenario below is `not_executed`. Pass/fail must be recorded later in
uat-execution-results.md after pilot users execute the catalog in the approved
environment.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| UAT-SRC-01 | `../../../workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` | Source list of 14 core screens and flows |
| UAT-SRC-02 | `../../../workbook/matter_dev_docs/16_Execution_Dependency_Graph.md` | Regression Map 6 rows |
| UAT-SRC-03 | `../../../workbook/matter_dev_docs/24_개발팀_착수_지시서.md` | Five prohibited actions |
| UAT-SRC-04 | `../../training/wave1/screen-flows.md` | Wave 1 screen flow source |
| UAT-SRC-05 | `../lt-l7-w05/kpi-baseline-definition.md` | KPI baseline and L9 mapping source |
| UAT-SRC-06 | `../lt-l7-w04/training/lawyer-guide.md` | Training flow source |

## Screen Scenario Coverage

Wave 1 included screens use flow-execution scenarios. Screens outside Wave 1 use
non-exposure or disabled-state scenarios until their launch gate opens.

| Scenario ID | Source screen | Scope | Scenario | Observable pass criterion | Current result |
| --- | --- | --- | --- | --- | --- |
| UAT-SCREEN-01 | Matter Home | Wave 1 included | Open a synthetic matter and review summary, tasks, deadlines, issues, recent documents, recent emails, and pending cues. | Required sections are visible with synthetic labels and restricted states do not reveal protected content. | not_executed |
| UAT-SCREEN-02 | Work Queue | Wave 1 included | Review My Tasks, Overdue, Review Needed, and approval request lanes. | Assigned items show correct state, unauthorized items show denied/review_required, and action reasons are visible. | not_executed |
| UAT-SCREEN-03 | Document Workspace | Wave 1 included | Review document status, version, source, QC result, related issue, and `file_ref`. | Metadata renders without raw paths, object keys, signed URLs, or direct Graph links. | not_executed |
| UAT-SCREEN-04 | Outlook Add-in Task Pane | Wave 1 included | Confirm suggested matter, file email, and preserve misfiling evidence when the suggestion is wrong. | Add-in shows approved pilot scope only, filing result or blocked state is observable, and audit/support reference exists. | not_executed |
| UAT-SCREEN-05 | Issue Ledger | Wave 1 included | Triage issue, link accessible source, update status, and record resolution basis. | Source link is permission-safe, state transition is visible, and final legal fields require authorized role. | not_executed |
| UAT-SCREEN-06 | Practice Pack Workspace | Future or partial scope | Verify future pack surfaces are hidden or disabled unless owner-approved for the pilot. | User sees disabled/backlog state or no navigation entry; no write action is available. | not_executed |
| UAT-SCREEN-07 | Client Portal | Future scope | Attempt to access client portal from pilot internal user context. | Portal is hidden, disabled, or access-denied with no client data exposure. | not_executed |
| UAT-SCREEN-08 | Employee Portal | Future HR scope | Attempt to access employee portal from ordinary matter context. | HR/employee portal is unavailable or access-denied; no HR data is exposed. | not_executed |
| UAT-SCREEN-09 | Candidate Portal | Future HR/recruiting scope | Attempt to access candidate portal from ordinary matter context. | Candidate portal is unavailable or access-denied; no recruiting data is exposed. | not_executed |
| UAT-SCREEN-10 | Knowledge Search | Future or limited scope | Attempt knowledge search from pilot user. | Search is hidden, disabled, or permission-trimmed; no unauthorized source appears. | not_executed |
| UAT-SCREEN-11 | Matter Vault Console | Future scope | Attempt Vault export/import access. | Vault console is hidden/disabled or requires separate approval; no Obsidian export is available. | not_executed |
| UAT-SCREEN-12 | AI Review Queue | Future AI scope | Attempt to open AI review queue or produce AI output. | Wave 1 AI remains off; no prompt, generated output, or write-back control is usable. | not_executed |
| UAT-SCREEN-13 | Admin Console | Wave 1 included | Read user directory, permission view, policy read, and audit read surfaces. | Admin read surfaces render with authorized fields only; policy/permission mutation remains blocked unless approved. | not_executed |
| UAT-SCREEN-14 | HR Operations | Future HR scope | Attempt HR Operations access from ordinary matter role. | HR Operations is unavailable or access-denied; salary/evaluation/recruiting data is not exposed. | not_executed |

## Core Business Scenario

| Step ID | Core workflow step | Scenario | Observable pass criterion | Current result |
| --- | --- | --- | --- | --- |
| UAT-CORE-01 | New matter registration | Create or select an approved synthetic/new pilot matter. | Matter id appears in Matter Home with safe metadata and audit/create reference. | not_executed |
| UAT-CORE-02 | Document filing | Register or review a document in Document Workspace. | Document row shows status, version, source, QC result, related issue, and opaque `file_ref`. | not_executed |
| UAT-CORE-03 | Email filing | File an Outlook email to the matter. | Filing result is visible, filing history updates, and audit/support reference exists. | not_executed |
| UAT-CORE-04 | Task/deadline | Create or process a task/deadline in Work Queue. | Task/deadline appears in the correct lane with owner, due state, and permission-safe display. | not_executed |
| UAT-CORE-05 | Issue | Create or update an Issue Ledger item. | Issue status and source basis are visible and unauthorized source details remain hidden. | not_executed |
| UAT-CORE-06 | Review approval | Process a review or approval request. | Approver action records decision/reason; non-approver receives denied/review_required state. | not_executed |
| UAT-CORE-07 | Audit read | Read audit evidence for the workflow. | Audit read shows expected event references without raw sensitive payload exposure. | not_executed |

## Regression Map Coverage

| Regression ID | Source change row | Regression check | Observable pass criterion | Current result |
| --- | --- | --- | --- | --- |
| UAT-REG-01 | Matter state change | Recheck Matter Home, Work Queue, Portal visibility, and Analytics/KPI aggregate impact. | Matter state change is visible only in authorized surfaces and future portals remain hidden/disabled. | not_executed |
| UAT-REG-02 | Document metadata change | Recheck DMS/Document Workspace, Search, AI extraction off-state, Vault export block, and QC. | Metadata changes do not expose raw storage links, AI extraction remains off, and Vault export is unavailable. | not_executed |
| UAT-REG-03 | Permission policy change | Recheck UI, API, Search, Portal, AI, Vault, and HR denial behavior. | Unauthorized access is denied without protected counts/details across every surface. | not_executed |
| UAT-REG-04 | Issue state change | Recheck Issue Ledger, Matter Home issue summary, Practice Pack, and Knowledge Pack handoff. | Issue state updates are visible in authorized places and future Knowledge/Practice actions stay disabled if out of scope. | not_executed |
| UAT-REG-05 | Employee model change | Recheck HR, User/Role, Billing, Workload, and Matter team displays. | Ordinary matter roles do not expose HR/payroll data and team/workload displays remain permission-safe. | not_executed |
| UAT-REG-06 | AI prompt/routing change | Recheck AI output quality path, guardrail, audit, and regression set. | Wave 1 AI remains disabled; no prompt/output/write-back occurs and any attempted route is blocked. | not_executed |

## Prohibited-Action Bypass Scenarios

| Prohibition ID | Prohibited action | Bypass attempt scenario | Observable pass criterion | Current result |
| --- | --- | --- | --- | --- |
| UAT-PROHIBIT-01 | AI output directly sent to customer or DB write-back | Try to use generated AI output as customer-facing text or write-back content. | AI output action is unavailable or blocked, and no DB/write-back event is created. | not_executed |
| UAT-PROHIBIT-02 | HR salary/evaluation/recruiting exposed under ordinary matter permission | Ordinary matter user attempts HR-sensitive access. | Access is denied and no HR-sensitive field, count, or payload is rendered. | not_executed |
| UAT-PROHIBIT-03 | SharePoint sharing link created without audit | User attempts to create/share a direct link without an audit route. | Direct sharing is blocked or requires audited workflow; audit reference is required before completion. | not_executed |
| UAT-PROHIBIT-04 | Obsidian export provided without permission validation | User attempts Vault/Obsidian export. | Export is unavailable or requires permission validation; no export artifact is produced. | not_executed |
| UAT-PROHIBIT-05 | Broad Graph permission requested in Outlook Add-in without review | User/admin attempts broad Graph scope or unreviewed Add-in consent. | Scope request is blocked or routed to admin review; no new broad scope is granted. | not_executed |

## Execution Rules

1. Use approved pilot users only after LT-L7-W05-T01 starts the pilot.
2. Use safe identifiers and avoid raw client, matter, email body, document,
   HR, privileged, or personal content in evidence.
3. Record pass/fail/blocked with timestamp, actor role, environment, and
   evidence reference in uat-execution-results.md.
4. Any fail must be linked to the defect/re-run queue before UAT can close.
5. This catalog is complete as a draft input only; it is not UAT execution
   evidence.
