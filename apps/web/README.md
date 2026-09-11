# Web App

Future Law Firm OS product UI.

Initial views should start with:

- Matter list and Matter detail.
- Document workspace.
- Permission and audit visibility.
- Time, billing, and AR views after Matter and DMS are stable.

## Browser-only LAN development

Run the canonical web app and its synthetic local API from the repository root:

```sh
npm --workspace apps/web run dev:lan
```

The command prints the browser's loopback URL, one URL for each active LAN IPv4
interface, a synthetic `@runtime.example.test` email, and the path to a private
credential file. It never prints the password. It does not start Electron. Stop
it with `Ctrl+C`; `SIGINT`, `SIGTERM`, and startup failures stop both servers,
wait for them to exit, and remove the temporary runtime.

Defaults are web port `5173` and API port `4180`. Override either port with a
validated integer from 1 through 65535:

```sh
LAWOS_WEB_PORT=5174 LAWOS_API_PORT=4181 npm --workspace apps/web run dev:lan
```

Security boundary:

- Vite listens on `0.0.0.0` so another device on the LAN can load the web app.
- A dedicated child entry starts the API and fails closed unless its reported
  listener host is exactly `127.0.0.1`. LAN clients reach `/api` and its
  descendants, plus `/master-data` and its descendants, through Vite's
  same-origin proxy. Similar names such as `/api-extra` and
  `/master-data-extra` remain web routes and are not proxied.
- Vite file serving uses a strict allowlist containing only `apps/web` and the
  shared `packages/matter/src/practice-area.js` browser import. Other repository
  files, including the repository-root `node_modules`, workspace packages
  reachable through its `@law-firm-os/*` symlinks, `AGENTS.md`, `docs`, and the
  rest of `packages`, are not served by `/@fs/`.
- The launcher imports the existing synthetic private-runtime fixture. It does
  not read the company roster, production data, cloud credentials, or
  operational secrets, and it does not pass inherited cloud configuration to
  the API process.
- Fixture, photo, store, credential, and generated local-session files live
  under one mode-`0700` temporary runtime. Its `home`, `tmp`, `xdg`, and `cloud`
  directories are also mode `0700`; the synthetic login and empty cloud config
  files are mode `0600`.
- Both child processes receive runtime-local `HOME`, `USERPROFILE`, temporary,
  XDG, and cloud-config paths. Cloud instance metadata lookup is disabled. No
  inherited home, temporary, XDG, or cloud credential path is passed through.
- Child shutdown starts with `SIGTERM`, escalates to `SIGKILL` after the grace
  period if necessary, and waits for exit before deleting the runtime.
- Treat the printed LAN URL as a development endpoint and use it only on a
  trusted network. The data and login are synthetic and are not suitable for
  production use.

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
never call it cross-origin. `vite.config.js` proxies only `/api` and
`/master-data` route boundaries (the exact path or a `/` descendant) to
`http://127.0.0.1:4180`, pins `strictPort`, and applies the filesystem allowlist
described above. Note: `vite preview` ignores `server.proxy` — live mode only
works under the dev server.

### Running the live proof

From the repo root:

1. Start the API: `npm run api:start` (or `node apps/api/src/server.js`)
2. Start the web dev server: `npm --workspace apps/web run dev` (or `npm run dev` in `apps/web`)
3. Run: `node scripts/verify-matter-live-data.mjs`

Evidence is written to
`docs/lazycodex/evidence/matter-web/artifacts/live-data-verification.{json,md}`.
