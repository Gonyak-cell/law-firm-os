# Web App

Future Law Firm OS product UI.

Initial views should start with:

- Matter list and Matter detail.
- Document workspace.
- Permission and audit visibility.
- Time, billing, and AR views after Matter and DMS are stable.

## Canonical live data mode

Canonical post-login surfaces render live API states from `apps/api` when
requested through query params. Existing historical mock screens may remain for
local development, but canonical verification does not use them as product
truth.

| Param | Values | Default | Effect |
| --- | --- | --- | --- |
| `data` | `live` | mock | `data=live` fetches real records from `apps/api`; anything else stays in local-development mode. |
| `ctx` | `allow` \| `denied` \| `review` | `allow` | Picks the synthetic permission context sent in the `x-lawos-permission-context` header (live mode only). |

Example: `http://127.0.0.1:5173/?locale=en&view=profiles&variant=userList&data=live&ctx=denied`

Live mode renders a live-specific column set (Name / Type / Status / Owner /
Matter) and explicit UI states for loading, error, empty, denied, and
review-required. There is intentionally **no mock fallback**: if the API is
down or returns an unexpected shape, an inline error state is shown.

### Dev proxy

The API (`127.0.0.1:4180`) has no CORS or OPTIONS handling, so the browser must
never call it cross-origin. `vite.config.js` proxies the relative paths
`/master-data` and `/api` to `http://127.0.0.1:4180` and pins `strictPort` for
the dev server. Note: `vite preview` ignores `server.proxy` — live mode only
works under the dev server.

### Running the live proof

From the repo root:

1. Start the API: `npm run api:start` (or `node apps/api/src/server.js`)
2. Start the web dev server: `npm --workspace apps/web run dev` (or `npm run dev` in `apps/web`)
3. Run: `node scripts/verify-matter-live-data.mjs`

Evidence is written to
`docs/lazycodex/evidence/matter-web/artifacts/live-data-verification.{json,md}`.
