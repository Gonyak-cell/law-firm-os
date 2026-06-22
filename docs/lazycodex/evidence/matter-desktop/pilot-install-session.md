# matter Desktop Pilot Install and Session Evidence

Status: recorded_with_manual_screenshot_blocker
Source TUW: MDT-P7-W01-T02

## Boundary

This file records install, launch, login, logout, tenant switch, and cache wipe receipts available in this branch. It does not claim owner approval, production go-live, public release, or completed GUI screenshot QA.

## Receipts

| Area | Status | Receipt |
| --- | --- | --- |
| Install | Pass | `apps/desktop/dist/mac/matter.app` exists after `npm --workspace apps/desktop run build:mac`. |
| Code signature | Pass | `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app` returned valid on disk and satisfies its Designated Requirement. |
| Launch | Pass | `apps/desktop/dist/mac/matter.app/Contents/MacOS/matter` returned `matter desktop internal macOS build 0.1.0`. |
| Login | Pass | `npm --workspace apps/desktop run test:session` passed PKCE login coordinator tests. |
| Logout | Pass | `npm --workspace apps/desktop run test:session` passed logout cleanup tests. |
| Tenant switch | Pass | `node apps/desktop/test/temp-preview-cleanup.test.mjs` passed tenant switch cache wipe test. |
| Cache wipe | Pass | Session cleanup and temp preview cleanup tests passed. |
| Screenshots | Blocked | No GUI pilot screenshot receipt was captured in this branch. |

## Cache Classes Checked

- `secure_store_tokens`
- `pending_pkce_state`
- `session_summary_cache`
- `api_response_cache`
- `renderer_memory_cache`
- `service_worker_cache`
- `browser_storage`
- `tenant_shell_state`
- `deep_link_pending_state`
- temp preview cache

## Commands

```bash
test -d apps/desktop/dist/mac/matter.app && /usr/bin/codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app && apps/desktop/dist/mac/matter.app/Contents/MacOS/matter
npm --workspace apps/desktop run test:session
node apps/desktop/test/temp-preview-cleanup.test.mjs
```

## Non-Claims

- owner approval: false
- production go-live: false
- public release: false
- GUI screenshot QA complete: false
