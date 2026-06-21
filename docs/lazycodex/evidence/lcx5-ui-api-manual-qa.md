# LCX5 UI/API Manual QA Evidence

Date: 2026-06-21
Branch: codex/runtime-spine-launch-tuw-crosswalk
Scope: local UI/API manual QA for Client, Matter, and People runtime surfaces
Claim boundary: repo-local QA only; not production go-live

## Runtime Under Test

API server:

- Command: `LAWOS_API_PORT=4180 npm --workspace @law-firm-os/api run start`
- URL: `http://127.0.0.1:4180`
- Receipt: `law-firm-os api listening on http://127.0.0.1:4180`

Web server:

- Command: `npm --workspace @law-firm-os/web run dev -- --port 5173`
- URL: `http://127.0.0.1:5173/`
- Receipt: Vite reported local dev server ready at `http://127.0.0.1:5173/`

## Manual Smoke Summary

Command:

```bash
node --input-type=module
```

Result:

```json
{
  "health": {
    "status": 200,
    "bounded_context_count": 10,
    "production_ready_claims": 0
  },
  "client": {
    "allow": {
      "status": 200,
      "outcome": "passed",
      "item_count": 7,
      "ui_state": null,
      "safe_error_codes": []
    },
    "denied": {
      "status": 403,
      "outcome": "blocked",
      "ui_state": "denied",
      "safe_error_codes": [
        "MASTER_DATA_API_UNAUTHORIZED_OMISSION"
      ]
    }
  },
  "matter": {
    "allow": {
      "status": 200,
      "outcome": "passed",
      "item_count": 1,
      "matter_id": "matter_rp05_synthetic_opening",
      "production_ready_claim": false,
      "count_leak_prevented": true
    },
    "denied": {
      "status": 403,
      "outcome": "blocked",
      "item_count": 0,
      "count_leak_prevented": true,
      "safe_error_codes": [
        "MATTER_UNAUTHORIZED_OMISSION"
      ]
    }
  },
  "people": {
    "allow": {
      "status": 200,
      "outcome": "ok",
      "employee_count": 2,
      "first_employee_id": "emp-001"
    },
    "denied": {
      "status": 400,
      "outcome": "blocked",
      "safe_error_code": "HRX_TENANT_CONTEXT_REQUIRED",
      "fail_closed": true
    }
  },
  "web": {
    "status": 200,
    "route": "/?locale=en&view=profiles&variant=userList&data=live",
    "html_shell_loaded": true
  },
  "production_ready_claim": false,
  "actual_launch_go_live_claim": false
}
```

Coverage:

- Client: `/master-data/records` happy path and missing-permission denied path.
- Matter: `/api/matters` happy path and missing-permission denied path.
- People: `/api/hrx/employees` trusted-context happy path and missing-context denied path.
- Web: Vite route shell loads for the live-data UI route.
- Health: `/api/health` returns ten bounded contexts and zero production-ready claims.

## UI Evidence

Command:

```bash
npm --workspace @law-firm-os/web run test:ui
```

Result:

- PASS, 16/16.
- Covered Matter-Vault UI hardening, sample UI regression, Finance, Analytics,
  Ask, Portal, UI Readiness, Enterprise, Intake, Vault, Matters, Clients,
  People, and HRX audit/lifecycle surfaces.

Command:

```bash
node scripts/verify-matter-live-data.mjs
```

Result:

- `live data verification: PASS`
- `PASS live-allow-table`
- `PASS live-denied-state`
- `PASS live-review-state`
- `PASS mock-route-unchanged`

Evidence files refreshed:

- `docs/ui-reference/amplitude-feb-2025/visual-parity/live-data-verification.json`
- `docs/ui-reference/amplitude-feb-2025/visual-parity/live-data-verification.md`

## API Test Evidence

Command:

```bash
npm --workspace @law-firm-os/api run test -- apps/api/test/master-data-api.test.js apps/api/test/cmp-r4-g4-matter.test.js apps/api/test/hrx-runtime-api.test.js apps/api/test/hrx/route-authz.test.js
```

Result:

- PASS, 131/131.
- Includes Client/Master Data, Matter, HRX/People, fail-closed authz,
  tenant isolation, runtime persistence, and route policy regression coverage.

## Boundary

LCX5 proves local observable UI/API behavior for the currently implemented
runtime surfaces. It does not prove production persistence, external identity
provider integration, WORM audit storage, live tenant data migration, security
acceptance, or owner go-live approval. Those remain LCX6 locked-domain unlock
packet items and launch blockers.
