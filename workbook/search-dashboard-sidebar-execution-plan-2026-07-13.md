# Search Dashboard And Sidebar Execution Plan

Date: 2026-07-13
Scope: Law Firm OS `Search` product axis backed by the current Vault boundary
State: implementation approved
Evidence state: repo and live-browser baseline captured; hosted Lazyweb report waived by the owner on 2026-07-13 because the active Codex tool manifest exposed no Lazyweb report tools

## 1. Outcome

Replace every user-visible `AMIC Search` label with `Search`, then grow the current one-screen Vault document search into a Search workspace with a dashboard, contextual sidebar, unified result surface, recent/saved searches, and later advanced search modes.

The first implementation must preserve the current internal compatibility boundary:

- Keep the top-level route axis as `view=vault`.
- Keep the existing Vault API routes such as `/api/vault/search` until a cross-domain Search API is proven.
- Keep legacy `#vault-documents` deep links working.
- Treat `Search` as the user-visible product label and `Vault` as an internal data/provider boundary.
- Do not rename internal CSS classes, data attributes, APIs, or package names merely to chase the visible copy change.

Owner instruction on 2026-07-13 approved implementation without the hosted Lazyweb report. This does not approve public release or go-live.

## 2. Evidence And Claim Boundary

### 2.1 Current rendered baseline

The current Search surface was opened through an isolated signed development session, the top-level `Search` tab was clicked, and the query `engagement` returned one synthetic document.

- Current screenshot: `.lazyweb/lazyweb-design/search-dashboard-2026-07-13/references/current-state.png`
- QA copy: `output/playwright/search-dashboard-2026-07-13/current-state.png`
- SHA-256: `9f3e89a9a44d5eb8541b19271b70bfbe2a0a81d88d09f02e5da11fc57f2a826e`
- Route observed: `/?locale=ko&view=vault&authStep=login&ctx=allow`
- Result observed: `Synthetic engagement letter`, match field `제목`

The rendered baseline shows the same name four times across the workspace selector, sidebar item, page hero, and search-card label. It also leaves the sidebar with only one item and does not distinguish dashboard navigation from content-search modes.

### 2.2 Current code inventory

| Concern | Current source | Current truth |
|---|---|---|
| Top navigation | `apps/web/src/components/Shell.jsx` | Already displays `Search`. |
| Sidebar title and item | `apps/web/src/components/Shell.jsx` | Both display `AMIC Search`; only `vault-documents` exists. |
| Page, form, accessibility label | `apps/web/src/components/VaultSurface.jsx` | Hero, card title, and input label display `AMIC Search`. |
| Korean and English labels | `apps/web/src/i18n.js` | Both `vaultTitle` values are `AMIC Search`. |
| Regression contract | `apps/web/test/ui-regression.test.mjs` | Explicitly requires `AMIC Search`. |
| Web client | `apps/web/src/data/apiClient.js` | `fetchVaultSearch` calls `/api/vault/search`. |
| Current Vault search runtime | `apps/api/src/vault-dms-runtime-context.js` and `apps/api/test/cmp-r4-g5-vault.test.js` | Permission-trimmed document title, body sidecar, OCR sidecar, Matter, and version matching. |
| Search core package | `packages/search/src/service.js` | Descriptor-only contracts repeatedly declare `dispatches_search_runtime: false`; it is not a live unified-search engine. |
| Topbar search | `apps/web/src/components/Shell.jsx` | A navigation/command popover plus recently viewed/modified Matter links, not the Vault content search. |

### 2.3 Current capability boundary

Available now:

- Document-title matching.
- Document body-sidecar matching.
- Caller-supplied OCR-sidecar matching.
- Matter and document-version match labels.
- Signed-session access, permission trimming, audit hints, and count-leak protection.
- Recent Vault document list.

Not available or not proven now:

- Cross-domain ranking across Client, Matter, People, and documents.
- Result snippets/highlighting with a safe-redaction contract.
- Facets and filter counts after permission trimming.
- Saved searches or durable recent-query history.
- Clause search runtime.
- Semantic/vector search runtime.
- OCR provider execution; the current proof only indexes caller-supplied OCR sidecar text.
- Production-ready claim; the Vault response currently keeps `production_ready_claim: false`.

The current `/api/vault/search` proof reports `json_substring_search`. The UI must not call it semantic, AI, full-text-index, or unified search.

## 3. Lazyweb Evidence Gate

The target is an existing web `browse_search` surface, so the required Lazyweb route is:

- Skill: `lazyweb-design`
- Objective: `improve`
- Platform: `web`
- Screen type: `browse_search`
- Intent: `Turn the existing Vault document search into a clear Search dashboard and contextual sidebar for multiple permission-trimmed search modes without duplicating navigation or claiming unbuilt capabilities.`
- Product: `Law Firm OS / Matter`

Product brief for the resumed report:

> Lawyers and law-firm operators enter Search from the global product axis to find permission-trimmed documents and, later, Client, Matter, and People records. The current surface sits after login and currently exposes only Vault document search plus recent documents. Search is not a paid conversion surface; its value is faster retrieval without leaking unauthorized rows, counts, snippets, OCR text, or cross-Matter context. Its wedge is a single auditable legal-work search entry that preserves the surrounding Client, Matter, People, and Vault source boundaries.

Blocked evidence:

- Lazyweb v0.14.6 is installed and `[mcp_servers.lazyweb]` is enabled locally.
- The current Codex tool manifest does not expose `lazyweb_health`, `lazyweb_request_image_upload`, `lazyweb_resolve_image_upload`, `lazyweb_generate_report`, or `lazyweb_get_report`.
- Therefore no hosted Lazyweb URL, experiment evidence, or generated variant is claimed by this plan.

Deferred Lazyweb evidence sequence:

1. Reconnect the Lazyweb connector so the current task receives the fresh MCP tool manifest.
2. Run `lazyweb_health` with skill/version/integrity metadata.
3. Upload the captured current-state screenshot through the request/PUT/resolve flow.
4. Run one `lazyweb_generate_report` call with the context above.
5. Poll `lazyweb_get_report` until `done`.
6. Record the hosted report URL and any degraded slots in this document.
7. Record any later IA changes as follow-up evidence without treating the report as retroactive implementation approval.

## 4. Recommended Information Architecture

This is a repo-grounded working recommendation pending the Lazyweb report.

### 4.1 Product axis and compatibility

| Layer | Decision |
|---|---|
| Visible top-level name | `Search` in Korean and English UI. |
| Internal view id | Keep `vault`. |
| Default Search section | `vault-search-home`. |
| Legacy deep link | `vault-documents` redirects to `vault-search-documents`. |
| Existing API | Keep `/api/vault/search` for document/OCR mode. |
| Future aggregate API | Add only after its permission-trimmed contract is implemented and tested. |

### 4.2 Sidebar

Sidebar header: `Search`

| Group | Menu | Canonical section id | Availability |
|---|---|---|---|
| 검색 | 대시보드 | `vault-search-home` | Phase 1 |
| 검색 | 전체 검색 | `vault-search-all` | Phase 2; document-only until aggregate API exists, with an explicit scope label |
| 검색 | 문서·OCR | `vault-search-documents` | Phase 1 using current Vault API |
| 검색 | Matter·Client | `vault-search-work` | Phase 3 after aggregate contract |
| 검색 | People | `vault-search-people` | Phase 3 after aggregate contract |
| 내 검색 | 최근 검색 | `vault-search-recent` | Phase 2 |
| 내 검색 | 저장한 검색 | `vault-search-saved` | Phase 2 |
| 운영 | 검색 상태 | `vault-search-index-status` | Phase 4, admin-only |

Rules:

- Use grouped sidebar navigation consistent with Client and Matter rather than eight unrelated flat buttons.
- Keep the sidebar within one viewport at 768px height; collapse groups instead of adding a second scroll area.
- Do not show a live menu that opens a dead placeholder. Hide unbuilt Phase 3/4 items or show a disabled state with a concrete availability reason only in an explicitly approved prerelease build.
- Keep Matter/Client as one search mode in the sidebar and separate them by result tabs/filters; this avoids duplicating every entity type in navigation.

## 5. Dashboard And Results UI

### 5.1 Search dashboard

Remove the decorative repeated hero and use one compact page heading. The dashboard order is:

1. `Search` heading with no marketing subtitle.
2. One primary query field with a visible scope control: `전체`, `문서·OCR`, `Matter·Client`, `People`.
3. Keyboard help and a clear submit action; Enter searches, Escape clears/closes only the active overlay.
4. `최근 검색` row list with query, scope, and relative time.
5. `저장한 검색` row list with owner-visible name and scope.
6. `최근 문서` row list backed by the existing Vault documents call.
7. Admin-only `검색 상태` summary when the status contract exists.

The dashboard is an operational launch surface, not a marketing page. Use list rows and section dividers rather than a uniform icon-card grid.

### 5.2 Result surface

After submit, keep the query field pinned at the top of the content region and render:

- Result tabs: `전체`, `문서`, `Matter`, `Client`, `People`.
- Filter toolbar: Matter/Client, content type, matched field, date, owner, version/current-only.
- Sort: relevance by default only when the backend supplies a ranking score; otherwise `최근 수정`.
- Dense result rows with title, entity type, Matter/Client context, safe match-field labels, updated time, and one direct-open action.
- Optional snippet only after the API proves permission-trimmed, redacted snippet generation.
- Result counts only after authorization and trimming. Never display an omitted/unauthorized total.

### 5.3 Topbar search relationship

The topbar search currently behaves as a navigation command palette. Preserve that fast path, but remove ambiguity:

- Empty query: keep recent viewed/modified Matter history.
- Typed query: show `Search에서 “…” 검색` as the first action.
- Enter on that action: route to `view=vault#vault-search-all` and pass the query to the Search surface.
- Keep domain navigation suggestions below it, labeled as navigation rather than search results.
- Do not run a second hidden search implementation inside the topbar.

### 5.4 Required UI states

- Initial: explain available scopes with plain labels, not capability claims.
- Loading: stable row skeleton or progress text; no decorative motion.
- Empty query: recent and saved searches.
- Zero results: preserve query and filters and offer clear filter reset.
- Partial source failure: show which source is unavailable without suppressing safe results from healthy sources.
- Denied: no rows, counts, facets, or snippets.
- Review required: no direct open action until the review decision allows it.
- Stale index: show last indexed time and recovery guidance when the backend supplies it.
- Offline/error: keep the query, provide retry, and do not substitute synthetic rows.

## 6. Data Contract Direction

### 6.1 Existing document search

Extend `/api/vault/search` only for document-specific filters. Preserve its signed-session, tenant, permission, audit, count-leak, and `production_ready_claim` fields.

### 6.2 Future unified query

Do not use the descriptor-only `packages/search` package as if it were live. Open a runtime work package first, then expose one aggregate endpoint, tentatively `GET /api/search/query`.

Minimum response envelope:

```text
request_id
outcome
items[]
facets
page_info
source_statuses[]
safe_error_codes[]
audit_hint_ref
count_leak_prevented
production_ready_claim
```

Minimum safe result fields:

```text
result_id
result_type
title
context_label
route_target
match_fields[]
updated_at
snippet (optional, only after redaction contract)
```

Each provider must authorize and trim before aggregation. The aggregator must never receive or count unauthorized raw rows.

### 6.3 Recent and saved searches

- Store query text, scope, filters, owner, and timestamps; do not cache result payloads by default.
- Bind saved searches to tenant and owner/team visibility.
- Audit create, rename, share, and delete actions.
- Provide an explicit retention period for query history because queries may contain client or matter information.
- Make clearing recent history a real action with confirmation and audit behavior defined before implementation.

## 7. Work Packages

### WP-SRCH-00: Lazyweb report attachment

Deliverable: hosted `lazyweb-design` report URL and decision note against Section 4.

Gate result: owner explicitly approved proceeding without the report on 2026-07-13. Hosted Lazyweb evidence remains unavailable and must not be claimed.

### WP-SRCH-01: Visible naming correction

Touch only the minimum visible-copy and regression files:

- `apps/web/src/components/VaultSurface.jsx`
- `apps/web/src/components/Shell.jsx`
- `apps/web/src/i18n.js`
- `apps/web/test/ui-regression.test.mjs`

Acceptance:

- Top nav, sidebar title, sidebar item, page heading, form label, and accessible name all read `Search`.
- Korean and English UI contain no visible `AMIC Search`.
- Internal `view=vault`, `/api/vault/*`, and existing data attributes remain compatible.

### WP-SRCH-02: Search sidebar and dashboard shell

Deliverable: new section routing, grouped sidebar, compact Search dashboard, and legacy redirect.

Acceptance:

- `view=vault` defaults to `vault-search-home`.
- `vault-documents` resolves to `vault-search-documents`.
- Only working menu items are interactive.
- Existing document search and recent document data remain functional.
- No repeated `Search` heading/card/sidebar label in the main content.

### WP-SRCH-03: Document/OCR result depth

Deliverable: document filter contract and dense result surface using `/api/vault/search`.

Acceptance:

- Title/body/OCR/Matter/version matches are distinguishable.
- Current-version and date filters are URL-addressable.
- Denied rows, counts, facets, and snippets do not leak.
- The UI states that OCR is sidecar-indexed unless runtime OCR execution is separately proven.

### WP-SRCH-04: Topbar-to-Search handoff

Deliverable: one typed-query handoff into the Search workspace while preserving navigation suggestions and recent Matter history.

Acceptance:

- Search query survives the route change.
- Keyboard and focus behavior work at desktop and 820px/768px layouts.
- There is one content-search execution path, not separate topbar and dashboard engines.

### WP-SRCH-05: Recent and saved searches

Deliverable: durable, tenant/owner-scoped query history and saved searches.

Acceptance:

- No result payload snapshots are persisted by default.
- Retention, delete, share, and audit behavior are tested.
- Saved searches reopen the same URL-addressable query/filter state.

### WP-SRCH-06: Unified multi-domain search

Deliverable: permission-trimmed aggregate runtime and `전체`, `Matter`, `Client`, `People` providers.

Acceptance:

- Provider failures are isolated and reported through `source_statuses`.
- Authorization happens before aggregation and counting.
- Every result opens the correct existing product route.
- Ranking is deterministic and its inputs are documented.

### WP-SRCH-07: Advanced search and operator status

Deliverable: clause/semantic/index-status features only after runtime receipts exist.

Acceptance:

- No AI, semantic, OCR-runtime, or production-ready label appears without matching backend evidence.
- Stale-index, OCR-review, and citation-mismatch outcomes fail closed or route to review.
- Search status is admin-only and contains no raw indexed content.

### WP-SRCH-08: Package and release verification

Deliverable: source, browser, packaged-app, and claim-boundary evidence package.

Acceptance:

- Source build and targeted tests pass.
- Browser captures prove dashboard, result, zero, denied, partial, and responsive states.
- The actual packaged `matter.app` shows `Search` and the intended sidebar.
- Prerelease validation does not become a public-release or go-live claim.

## 8. Verification Matrix

| Layer | Required checks |
|---|---|
| Copy | `rg -n 'AMIC Search' apps/web/src apps/web/test` returns no visible-copy dependency after WP-SRCH-01. |
| Web tests | `node --test apps/web/test/ui-regression.test.mjs` plus targeted Search route/browser tests. |
| API tests | `node --test apps/api/test/cmp-r4-g5-vault.test.js` and new unified-search security tests when added. |
| Search package | Existing `packages/search/test/*.test.js`; runtime claims remain blocked while `dispatches_search_runtime: false`. |
| Build | `npm --workspace apps/web run typecheck` and `npm --workspace apps/web run build`. |
| Browser | Signed-session test at 1440, 1280, 820, and 768 CSS pixels; click every sidebar item and result route. |
| Accessibility | Visible focus, keyboard submit/clear, dialog naming, no color-only match state, WCAG AA text contrast. |
| Security | Tenant isolation, Matter ACL, pre-trim counts/facets, snippet redaction, saved-query ownership, audit persistence. |
| Package | Launch current packaged `matter.app`, verify runtime endpoint/session/tenant, capture Search tab/sidebar/results. |
| AI slop | Run `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`, then manually inspect rendered hierarchy and Korean copy. |

## 9. AI Slop Guardrails

- Remove the repeated `AMIC Search`/`Search` hero-card-sidebar stack.
- Do not replace it with a centered marketing hero, vague promise, or capability buzzwords.
- Do not use an icon-top card grid to represent equal search modes; use scope controls and operational lists.
- Do not make every filter a rounded pill or every section a same-sized card.
- Do not show dead CTA/menu items for future semantic, clause, OCR-runtime, or saved-search capabilities.
- Use concrete Korean labels and avoid translationese such as generic “지식을 원활하게 탐색하세요.”
- Use motion only for state feedback and respect reduced-motion preferences.

## 10. Completion Criteria

The Search initiative is complete only when:

- All user-visible `AMIC Search` labels are `Search`.
- The Search axis opens a working dashboard and contextual sidebar.
- Document search remains permission-trimmed and auditable.
- Every visible search mode has a working backend and complete loading/empty/denied/error behavior.
- Topbar query handoff and Search workspace share one execution path.
- Saved/recent queries have ownership, retention, deletion, and audit contracts.
- Advanced search claims match executed runtime evidence.
- The current web build and packaged app have both been manually exercised.
- The hosted Lazyweb report and final accept/amend decision are attached, or the owner explicitly waives that evidence gate.

## 11. Execution Closeout — 2026-07-13

Status: `implemented_and_internally_packaged`

- `AMIC Search` visible copy was replaced by `Search`; internal `view=vault` and `/api/vault/*` contracts remain compatible.
- The Search dashboard, grouped contextual sidebar, topbar handoff, permission-trimmed document/OCR results, direct document detail, current-version/date filters, recent searches, saved searches, delete, and audited link sharing are implemented.
- Date filters use draft/submitted state so result execution, URL state, saved state, and copied links cannot diverge.
- Only current-version search is exposed. Historical all-version search is not shown because the DMS runtime does not have a proven per-version index.
- OCR copy explicitly states that caller-supplied sidecar text is indexed and that this screen does not execute an OCR provider runtime.
- Search preferences are tenant/owner scoped, operation-mutated on the server, serialized in the client, physically pruned on access after 90 days, and never persist result payloads.
- The desktop signed API bridge permits exactly `POST /api/vault/search/preferences`; other Vault writes and alternate methods remain blocked.
- Lazyweb hosted-report evidence was explicitly waived by the owner. No hosted Lazyweb report is claimed.

Verification:

- Web tests: 123 passed, 1 skipped, 0 failed.
- Targeted Search/web/API: 34 passed, 0 failed.
- DMS runtime services: 7 passed, 0 failed.
- Search descriptor package: 112 passed, 0 failed; it remains descriptor-only and is not represented as the runtime used by this surface.
- Desktop smoke: 94 passed, 0 failed.
- Web typecheck and production build: passed.
- Signed browser QA: dashboard, results, detail, zero, denied, review, English, 1440/1280/820/768, visible focus, legacy-route canonicalization, saved-query race, and URL/filter restoration passed.
- Current packaged app: PID `19392`, renderer built `2026-07-13 02:52:06`, local runtime `127.0.0.1:62402`, health `ok`, runtime profile `local-dev`, tenant `tenant_amic_matter_vault`, actor `user_amic_jwsuh`, no token exposed.
- Packaged remember/save/delete roundtrip: passed; console errors: 0.
- Evidence receipt: `docs/lazycodex/evidence/matter-desktop/artifacts/search-dashboard-2026-07-13.md`.

Claim boundary:

- Internal package: `PASS`.
- Developer ID distribution signing: `not_distribution_ready`.
- Notarization: `not_submitted_internal_only`.
- Public release: `false`.
- Go-live: `false`.
- Unified multi-domain and advanced semantic/clause/OCR-provider modes remain unexposed until their runtime receipts exist.
