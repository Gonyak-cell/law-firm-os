# mater Desktop Pilot Security Audit

Status: pass_with_manual_pilot_boundary
Source TUW: MDT-P7-W01-T04

## Boundary

This audit records automated hardening checks. It does not claim owner approval, production go-live, public release, external penetration test completion, or public distribution readiness.

## Commands

```bash
node scripts/validate-mater-desktop-security.mjs
node scripts/validate-mater-desktop-file-bridge.mjs
node scripts/validate-mater-desktop-notification-copy.mjs
node apps/desktop/test/deep-link-deny.test.mjs
```

## Results

| Area | Status | Evidence |
| --- | --- | --- |
| Electron settings | Pass | Desktop security validator passed with hardened BrowserWindow probes. |
| Preload allowlist | Pass | Desktop security validator reported `preload_allowlist_checked`. |
| Token absence | Pass | Session cleanup tests and security validator keep renderer token body absent. |
| File bridge guards | Pass | File bridge validator detected directory watch, recursive scan, arbitrary path read/write, and path retention probes with no current findings. |
| Deep link denylist | Pass | `apps/desktop/test/deep-link-deny.test.mjs` passed. |
| Notification copy | Pass | Notification copy validator passed and probes detected sensitive placeholder classes. |

## Non-Claims

- external security review: false
- owner approval: false
- production go-live: false
- public release: false
