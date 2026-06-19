# Contract-to-Screen Map (matter by AMIC UI x Law Firm OS domain contracts)

## Purpose

The matter by AMIC web UI (`apps/web`) is today a fully static mock: zero `fetch` calls, zero
`packages/*` imports. The CP track is building the domain layer bottom-up under `contracts/` and
`packages/`, and `apps/api` is still a README-only stub. This document maps every UI surface in the
Amplitude-derived screen corpus (318 screenshots, 50 flow groups, registry
`matter.amplitude.screenshot-state-registry.v1` in
`docs/ui-reference/amplitude-feb-2025/matter-amplitude-screenshot-state-registry.json`) to the
domain contract that must eventually serve it. It is the wiring plan, not a claim that any wire
exists yet.

How to read: one table per UI build phase (P1-P10, the `implementation_phase` labels from the
registry). Each row is a flow group with its screenshot id range, the contract/package that can
serve it **today** (all current packages are descriptor-only and synthetic-fixture-only — none
persist or evaluate runtime permissions), the future RP that owns the full runtime behavior
(`docs/rp0X..rp29-*-detailed-microphases.md`), the bounded context that must exist in `apps/api`
(per `apps/api/README.md`), and a readiness verdict: `contract-ready` (contract + package
descriptors exist and the UI could consume them now), `partial` (entities/events defined upstream
but no owning service contract), or `future-RP` (no contract at all yet).

## Contract inventory (verified schema versions)

| Contract | `schema_version` | Package | Key entities / surfaces | Stage |
| --- | --- | --- | --- | --- |
| `contracts/core-domain-contract.json` | `law-firm-os.core-domain-contract.v0.14` | `packages/domain` | Tenant, User, Group, Role, PermissionReference, PolicyReference, Entity, Person, Organization, Client, ClientProfile, BillingEntity, ContactPoint, Relationship, Matter, MatterMember, MatterTask, MatterCalendarEvent, Checklist, MatterStatusHistory, DocumentReference, DocumentVersionReference, AuditEventReference, AuditEvent | descriptor-only, no-write (RP01) |
| `contracts/permission-kernel-contract.json` | `law-firm-os.permission-kernel-contract.v0.28` | `packages/authz` | decision_order `cross_tenant_deny -> deny_rule -> object_acl_deny -> review_required -> approval_required -> object_acl_allow -> abac -> rbac -> fail_closed_no_match`; decisions `allow / deny / review_required / approval_required` | synthetic decision workflows (RP02) |
| `contracts/audit-compliance-contract.json` | `law-firm-os.audit-compliance-contract.v0.22` | `packages/audit` | append-only event contract; actor_types incl. `user`, `client_user`, `ai_agent`, `hermes`, `claude_code`; object_types incl. Tenant, Matter, Document, Invoice, SecureLink, DataRoom, IntegrationConnection, LegalHold; action taxonomy incl. `auth.login`, `auth.mfa.challenge`, `document.view`, `permission.evaluate`, `ai.retrieve` | descriptor catalogs + append-only ledger model (RP03) |
| `contracts/master-data-contract.json` | `law-firm-os.master-data-contract.v0.21` | `packages/master-data` | 7 models: Entity, Person, Organization, ClientGroup, Relationship, ContactPoint, BillingProfile; service entrypoint `executeMasterDataServiceWorkflow`; API descriptors `GET /master-data/records`, `GET /master-data/relationships`, `GET /master-data/client-groups/:client_group_id`; UI state catalog (`master_data_records_table`, `master_data_relationship_panel`, `master_data_client_group_summary`) | descriptor-only with concrete API + UI-state descriptors (RP04) |
| `contracts/matter-core-contract.json` | `law-firm-os.matter-core-contract.v0.1` | `packages/matter` | 11 models: Matter, MatterMember, MatterTask, MatterCalendarEvent, MatterChecklist, MatterWiki, MatterWikiSection, MatterWikiSourceLink, MatterWikiSnapshot, MatterGraphNode, MatterGraphEdge; entrypoint `executeMatterCoreServiceWorkflow` (ops: matter_opening, member_assignment, task_planning, wiki_section_staging, graph_relationship_staging); `api_interface_ui_state_bridge` defines request/response contract fields + UI states | descriptor-only service boundary (RP05) |
| `contracts/dms-core-contract.json` | `law-firm-os.dms-core-contract.v0.1` | `packages/dms` | 10 model_definitions: DmsWorkspace, DmsFolder, DmsDocument, DmsDocumentVersion, DmsFileObject, DmsRendition, DmsExtractedText, DmsOcrResult, DmsEmailThread, DmsDocumentRelation; boundary `descriptor_only_dms_type_shape_service_boundary` | in-progress (CP00-198..207 lane, RP06) |
| `contracts/control-plane-contract.json` | `law-firm-os.control-plane-contract.v0.1` | `packages/control-plane` | ProductContract, AIControlRule, HermesGate, ClaudeReviewGate, HumanApproval, BlockedClaim; operator-surface and permission-audit boundary suites | contract-first, operator-facing only (RP00) |
| (none) | — | `packages/billing`, `packages/crm`, `packages/ai-governance` | README concept stubs only (TimeEntry/Invoice/AR; Lead/Opportunity/ConflictCheck; AIJob grounding) | stub |

`apps/api` bounded contexts (from its README): Core Platform, Master Data, Matter Core, Legal
Workspace / DMS, Billing & Finance, CRM / Intake, Settlement, AI Governance.

## P1 — App shell / navigation / search

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| loading | 11 | core-domain (Tenant/User session bootstrap shapes) | RP01/RP26 (session hardening) | Core Platform (session/bootstrap) | partial |
| global-search | 265-267 | none yet (DMS/matter list descriptors can fake scoped search) | RP07 Search OCR And Index | Legal Workspace / DMS (search index) | future-RP |

## P2 — Auth and onboarding flow

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| marketing-entry | 0 | none needed (public static shell) | — | none | contract-ready (static) |
| signup-start | 1-3 | core-domain `User` entity shape; audit `auth.login` taxonomy; no identity service contract | RP26 Enterprise SaaS Hardening (SSO/MFA) | Core Platform (identity/signup) | partial |
| email-verification | 4 | none yet (audit `auth.*` actions defined) | RP26 | Core Platform (identity) | partial |
| password-setup | 5-7 | none yet | RP26 | Core Platform (identity) | partial |
| organization-create | 8-10 | core-domain `Tenant` (tenant_id, plan, region, security_policy, data_residency) | RP21 Admin Console / RP26 | Core Platform (tenant provisioning) | partial |
| onboarding-source-selection | 12-13 | none yet (connector checklist) | RP22/RP23 External Integrations | Core Platform + integrations | future-RP |
| auth-returning-user | 303-317 | core-domain `User`; permission-kernel decisions gate post-login routes; audit `auth.login`/`auth.mfa.challenge` events | RP26 | Core Platform (identity/session) | partial |

## P3 — Home dashboards and templates

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| home-dashboard | 14-15 | matter-core descriptors can feed matter-count/task widgets; no dashboard contract | RP15 Firm Analytics | Core Platform (home aggregate) | partial |
| home-guidance | 16-19 | none needed (client-side coaching state) | — | none | contract-ready (static) |
| home-widgets | 20-24 | none yet (widget data = analytics) | RP15 | Billing & Finance + Matter Core aggregates | future-RP |
| home-actions | 25-37 | matter-core + dms-core list descriptors for search/resource drawers | RP07 (search) / RP15 | Matter Core + Legal Workspace / DMS | partial |
| product-overview | 192-195 | none yet | RP15 | analytics read models | future-RP |

## P4 — Spaces, all content, search, resource surfaces

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| all-content-initial | 176-178 | dms-core `DmsWorkspace`/`DmsFolder`/`DmsDocument`/`DmsDocumentVersion` descriptors (descriptor-only, CP lane in progress) | RP06 DMS Core (runtime) / RP07 (index) | Legal Workspace / DMS (content listing) | partial |
| resources-and-external-preview | 241-248 | none yet (developer resources / integration setup) | RP22/RP23 External Integrations | integrations context | future-RP |
| flags-and-content | 253-264 | content library/archive: dms-core descriptors; feature flags: none (control-plane `AIControlRule` is the only flag-like surface and is operator-only) | RP06 (content) / RP27 Platform Extensibility (flags) | Legal Workspace / DMS + platform config | partial (content) / future-RP (flags) |

## P5 — Matter profiles, event stream, raw evidence

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| live-events | 179 | audit-compliance append-only event contract + `packages/audit` ledger/event catalogs | RP03 (runtime ledger) / RP15 (stream UX) | Core Platform (audit event read API) | partial |
| user-profiles-list | 196-206 | master-data `GET /master-data/records` descriptor (Entity/Person/Organization/ClientGroup) + matter-core registry (Matter, MatterMember) | RP04/RP05 (already in-flight) | Master Data + Matter Core | contract-ready |
| user-profile-detail | 207-209 | matter-core `Matter`/`MatterMember`/`MatterTask` + master-data relationship lookup + audit `AuditEventReference` for raw-event tab | RP04/RP05 + RP03 | Master Data + Matter Core + audit read | contract-ready |

## P6 — matter analytics builder

All eleven flow groups (`segmentation-basic` 41-44, `save-chart-modal` 45, `segmentation-advanced`
46-79, `chart-type-modal` 80, `segmentation-output` 81-94, `share-save-modals` 95-102,
`chart-page-empty-table` 103-104, `funnel-analysis` 105-111, `data-table-and-metric` 112-119,
`data-table-heatmap` 120-136, `retention-and-journeys` 137-147) share one row:

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| analytics builder family (11 flows) | 41-147 | none yet — the only upstream substrate is the audit-compliance event taxonomy (`document.view`, `permission.evaluate`, `billing.change`, ...), which will be the event source for charts | RP15 Firm Analytics | new analytics read-model context (not yet in apps/api README) | future-RP |

## P7 — Dashboards, notebooks, reports

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| dashboard-create | 148-155 | none yet | RP15 | analytics read models | future-RP |
| dashboard-chart-report | 156-161 | none yet | RP15 | analytics read models | future-RP |
| dashboard-templates | 162-167 | none yet | RP15 | analytics read models | future-RP |
| notebooks | 168-175 | none yet | RP15 / RP18 AI Legal Workflows (report generator) | analytics + AI Governance | future-RP |

## P8 — Ask matter, cohorts, replay, experiments, flags

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| ask-entry | 38-40 | none yet (`packages/ai-governance` is a README stub; control-plane gates AI operator flows, not product Q&A) | RP17 AI Governance + RP18 AI Legal Workflows | AI Governance | future-RP |
| analysis-card-guidance | 180-181 | none needed (static guidance) | — | none | contract-ready (static) |
| ask-ai | 182-191 | none yet; outputs must carry document_id/version_id grounding per ai-governance README | RP17/RP18 | AI Governance | future-RP |
| cohorts-users | 210-212 | none yet (client/matter cohorts) | RP09 CRM And Business Development / RP15 | CRM / Intake + analytics | future-RP |
| session-replay | 213-215 | none yet; audit object_types `SecureLink`/`DataRoom` are the only anchors | RP19 Client Portal / RP20 Data Room And VDR | client portal context | future-RP |
| experiments-overview | 216-222 | none yet | RP27 Platform Extensibility | platform config | future-RP |
| experiment-builder | 223-240 | none yet | RP27 | platform config | future-RP |

## P9 — Settings, team, billing, profile, notifications

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| data-connections-catalog | 249-252 | none yet (audit object `IntegrationConnection` only) | RP22/RP23 External Integrations | integrations context | future-RP |
| invite-teammates | 268-271 | core-domain `User`/`Group`/`Role` shapes + permission-kernel role references; no invitation service | RP21 Admin Console | Core Platform (org admin) | partial |
| notifications | 272-274 | none yet | RP21 | Core Platform (notifications) | future-RP |
| billing-plan | 275-281 | none yet (`packages/billing` is a stub; core-domain `BillingEntity` is matter-side, not subscription) | RP12 Billing And Invoicing + RP21/RP29 Commercial Readiness (plan/usage) | Billing & Finance | future-RP |
| team-members | 282-286 | core-domain `User`/`Group`/`Role` + permission-kernel decision surface (security-trimmed member list) | RP21 | Core Platform (org admin) | partial |
| profile-settings | 287-292 | core-domain `User` entity | RP21 | Core Platform (account) | partial |
| feedback | 293-296 | none yet | RP29 Commercial Readiness | none (3rd-party or platform) | future-RP |

## P10 — Dark theme and preference parity

| Flow group | Screens | Serving contract/package today | Future RP owner | apps/api surface needed | Readiness |
| --- | --- | --- | --- | --- | --- |
| theme-dark-mode | 297-302 | none needed (client-side preference; later persisted on core-domain `User`) | RP21 (preference persistence) | Core Platform (account prefs) | contract-ready (static) |

Coverage: 50 flow groups / 318 screens mapped. Roughly 13 flow groups have a serving contract today
(contract-ready or content-partial), ~12 are partial (entities exist, no owning service), and ~25
are future-RP only.

## Gaps — surfaces with no contract at all

| Gap surface (flows) | Screens | Missing contract | Future RP owner |
| --- | --- | --- | --- |
| Analytics builder (segmentation, funnels, data tables, retention, journeys) | 41-147 | analytics query/chart/saved-analysis contract | RP15 Firm Analytics |
| Dashboards, templates, notebooks/reports | 148-175 | dashboard/report contract | RP15 (+ RP18 for narrative reports) |
| Ask matter (prompt gallery + AI answers) | 38-40, 182-191 | AI job/grounding/retrieval contract (ai-governance is a stub) | RP17 AI Governance + RP18 AI Legal Workflows |
| Experiments + feature flags | 216-240, flags half of 253-264 | flag/rollout/experiment contract | RP27 Platform Extensibility |
| Session replay / portal playback | 213-215 | client portal session + playback contract | RP19 Client Portal / RP20 Data Room VDR |
| Cohorts (client/matter/risk cohorts) | 210-212 | cohort definition contract | RP09 CRM / RP15 |
| Global search | 265-267 | search/OCR/index contract | RP07 Search OCR And Index |
| Integrations: connections, catalog, resources, onboarding connectors | 12-13, 241-252 | integration connection/catalog contract | RP22/RP23 External Integrations |
| Subscription billing, plan, usage | 275-281 | firm-level subscription/usage contract (billing stub covers matter billing concepts only) | RP12 Billing And Invoicing + RP29 |
| Notifications | 272-274 | notification contract | RP21 Admin Console |
| Identity runtime (signup, verification, password, MFA, returning login) | 1-7, 303-317 | identity/session service contract (only entity shapes + audit `auth.*` taxonomy exist) | RP26 Enterprise SaaS Hardening |
| In-product feedback | 293-296 | none planned in-domain | RP29 Commercial Readiness |

## Recommended wiring order

Preconditions, in order, before any UI surface consumes real data:

0. **Stand up `apps/api`.** It is an empty README stub; nothing can be wired until at least the
   Core Platform, Master Data, and Matter Core bounded contexts exist as serving processes. Note
   that `packages/**` and `contracts/**` are CP-owned: any integration that imports or extends them
   requires CP-owner coordination per `docs/ui-workstream-conventions.md` (never edit those paths
   from the UI lane; act in quiet windows between `Close CP00-xxx` commits).
1. **Auth/org/workspace shell (P2 partials + P1 loading).** Back the tenant/org/user session
   bootstrap with core-domain `Tenant`/`User`/`Group`/`Role` shapes, master-data records for org
   entities, and permission-kernel decision descriptors (`allow/deny/review_required/
   approval_required`, fail-closed) for route gating. Identity runtime (passwords/MFA) stays
   mocked until RP26.
2. **Matter/client profiles (P5: user-profiles-list, user-profile-detail).** This is the first
   surface where a full descriptor chain already exists: master-data `GET /master-data/records` +
   `GET /master-data/relationships` (the only contract with concrete endpoint descriptors, error
   taxonomy, and a UI state catalog: loading/empty/denied/review_required) joined with matter-core
   `executeMatterCoreServiceWorkflow` descriptors and its `api_interface_ui_state_bridge`.
3. **Content/DMS lists (P4: all-content-initial, content half of flags-and-content; P3
   home-actions resource drawer).** Serve workspace/folder/document/version lists from dms-core
   model descriptors (`DmsWorkspace`..`DmsDocumentRelation`). The RP06 lane is mid-flight
   (CP00-198..207), so this wave trails wave 2 and needs the tightest CP coordination.
4. **Audit/event stream (P5 live-events) and admin partials (P9 team-members, invite-teammates,
   profile-settings).** Audit read API over the append-only event contract; security-trimmed
   member lists via permission-kernel.
5. **Everything else waits for its RP** (analytics RP15, Ask matter RP17/18, search RP07, portal
   replay RP19/20, integrations RP22/23, subscription billing RP12/29, flags/experiments RP27,
   notifications/admin console RP21) — keep these surfaces on static fixtures and track them in the
   Gaps table above.

**First wiring target:** P5 `user-profiles-list` (screens 196-206) against a new `apps/api`
Master Data bounded context exposing the master-data `records_search` descriptor
(`GET /master-data/records`), with permission-kernel decisions trimming the list and matter-core
registry descriptors enriching matter columns. It is the only surface where contract, package,
endpoint descriptor, error-code taxonomy, and UI-state catalog all already exist.
