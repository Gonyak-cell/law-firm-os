# Sidebar IA + Home Dashboard Stage 3 Contract Notes

Date: 2026-07-07
Stage: 3 - data contract and API
Source of truth: `workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md` §6, §7

## Scope Landed

- Added Home dashboard runtime context: `apps/api/src/home-dashboard-runtime-context.js`
- Mounted canonical Home routes on the API server: `apps/api/src/server.js`
- Added contract tests: `apps/api/test/home-dashboard-api.test.js`
- Production-ready claim remains false in the Home descriptor and every response.

## Owner Decisions

| ID | Status | Stage 3 handling |
|---|---|---|
| O-01 | Confirmed by owner | External news sources are Bloter, Lawtimes, Dealsite, InvestChosun. |
| O-02 | Default in effect | Newsletter tab source is Vault tag collection. |
| O-03 | Default in effect | `home-company` entry remains admin-role only; no broad exposure added in Stage 3. |
| O-04 | Default in effect | Inline approve is allowed only for leave, certificate, and attendance. Cost/document/force approvals expose `open` only. |

No new owner decision was introduced in Stage 3, so O-05 is not opened.

## §6 Contract Mapping

| Contract endpoint | Implemented route | Response contract | Permission and audit behavior |
|---|---|---|---|
| `GET /home/action-inbox?type=approval|task&role=...` | `GET /home/action-inbox` plus `/api/home/action-inbox` alias | `{ items, counts: { approval, task_late, task_today } }` | Requires signed session, `tenant_id`, `permission_ref`, `audit_hint_ref`; evaluates `home:action_inbox:read`; writes `home.action_inbox.read`; records `home.widget.view`. |
| `POST /home/action-inbox/{id}/decision` | `POST /home/action-inbox/:id/decision` plus `/api/home/...` alias | `{ item, decision, audit_event, undo_expires_at }` | Requires signed session and permission revalidation; idempotency key supported; writes `home.action_inbox.decision`; body is not stored. |
| `GET /home/agenda?from&to` | `GET /home/agenda` plus `/api/home/agenda` alias | `{ events: [{ id, kind, title, starts_at, ends_at, location, matter_ref }] }` | Requires signed session; validates date window; evaluates `home:agenda:read`; writes `home.agenda.read`; records calendar widget view. |
| `GET /home/feed?tab=notice|news|newsletter` | `GET /home/feed` plus `/api/home/feed` alias | `{ entries: [{ id, source, title, body_preview, published_at, pinned_until, audience }] }` | Requires signed session; evaluates tab-specific read action; writes `home.feed.read`; records feed widget view. |

Stage 3 also exposes `GET /home/audit` and `GET /home/usage-events` as verification surfaces for the Stage 3 gate. They are permission-gated and return sanitized audit or usage rows for the requested tenant.

## News Connector Mapping

| Source | RSS handling | Stage 3 status |
|---|---|---|
| Bloter | `https://cdn.bloter.net/rss/gns_allArticle.xml` | RSS endpoint discovered from the official site metadata and used first. |
| Lawtimes | `https://cdn.lawtimes.co.kr/rss/gn_rss_allArticle.xml` | RSS endpoint discovered from the official site metadata and used first. |
| Dealsite | `https://dealsite.co.kr/rss/allArticle.xml`, `https://www.dealsite.co.kr/rss/allArticle.xml`, `https://news.dealsite.co.kr/rss/allArticle.xml` | Official homepage scan did not expose a feed link; Stage 3 tries candidate official-domain RSS paths and isolates failure per source. |
| InvestChosun | `https://www.investchosun.com/rss`, `https://www.investchosun.com/rss/allArticle.xml`, `https://www.investchosun.com/feed` | Official homepage scan did not expose a feed link; Stage 3 tries candidate official-domain RSS paths and isolates failure per source. |

Connector invariants:

- RSS-first fetch.
- Source-level cache clamped to 15-30 minutes.
- Full article body is not stored; `body_preview` is capped and stripped of markup.
- Entries carry a link-out URL only.
- A failed source returns `HOME_NEWS_SOURCE_FAILED` without blocking other sources.
- If every source fails, the API returns status 200 with empty entries and `HOME_NEWS_ALL_SOURCES_FAILED`.

## Audit And Usage Evidence

| Surface | Event |
|---|---|
| Action inbox read | `home.action_inbox.read` audit, `home.widget.view` usage |
| Action decision | `home.action_inbox.decision` audit, `home.widget.action` usage |
| Agenda read | `home.agenda.read` audit, `home.widget.view` usage |
| Feed read | `home.feed.read` audit, `home.widget.view` usage |

Audit rows include `raw_payload_included: false`, `metadata.body_stored: false`, and `production_ready_claim: false`.

## Stage 3 Gaps Carried Forward

| Gap | Reason | Next stage |
|---|---|---|
| Live action inbox source wiring | Stage 3 creates the contract runtime and tests; live repository aggregation remains separate. | Stage 4 client integration and follow-up data-source binding. |
| Live agenda source wiring | Stage 3 validates contract shape and permission/audit behavior; calendar source aggregation is not yet connected. | Stage 4/5 integration. |
| Dealsite and InvestChosun official RSS certainty | No RSS link was exposed by the simple official homepage scan during Stage 3. | Keep candidate official-domain URLs source-isolated; owner/source confirmation can refine without contract change. |

## Direct Verification

| Command | Exit code | Result |
|---|---:|---|
| `node --test apps/api/test/home-dashboard-api.test.js` | 0 | 6 tests passed. |
| `git diff --check -- apps/api/src/server.js apps/api/src/home-dashboard-runtime-context.js apps/api/test/home-dashboard-api.test.js workbook/sidebar-home-dashboard-stage-3-contract-2026-07-07.md` | 0 | No whitespace errors. |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | Existing repo-wide 127 findings reported; no Stage 3 changed-file blocker. |
| `npm test` | 0 | 4157 tests passed. |
| `npm run build` | 0 | Vite build passed with the existing large chunk warning. |
| `node --input-type=module <<'NODE' ... stage3 smoke ... NODE` | 0 | Live API server smoke returned action inbox 200, decision 201, agenda 1 event, news 1 entry with isolated failed sources, and audit actions for inbox, decision, agenda, feed. |
