# mater Desktop Pilot Native Capabilities Evidence

Status: recorded_with_gui_pilot_receipt_boundary
Source TUW: MDT-P7-W01-T03

## Boundary

This file records command receipts for file bridge, deep link, notification, and update paths. It does not claim external pilot approval, owner approval, production go-live, public release, or GUI screenshot completion.

## QA-06 through QA-09 Receipts

| QA | Capability | Allow path | Deny path | Receipt |
| --- | --- | --- | --- | --- |
| QA-06 | File bridge | picker, upload, save-as, temp preview pass | denied precheck, no silent scan, path retention probes pass | `npm --workspace apps/desktop run test:file-bridge` |
| QA-07 | Deep link | matter/document/task/auth callback parser and open audit pass | mutation/download/upload/AI/billing/delivery denylist pass | `node apps/desktop/test/deep-link-parser.test.mjs`, `deep-link-deny.test.mjs`, `deep-link-open-audit.test.mjs` |
| QA-08 | Notification | generic notification route intent pass | action execution route rejected through parser | `node apps/desktop/test/notification-route-intent.test.mjs` |
| QA-09 | Update/rollback | signed internal update applies and rollback passes | bad signature and public channel are denied | `npm --workspace apps/desktop run test:update` |

## Commands

```bash
npm --workspace apps/desktop run test:file-bridge
node apps/desktop/test/deep-link-parser.test.mjs
node apps/desktop/test/deep-link-deny.test.mjs
node apps/desktop/test/deep-link-open-audit.test.mjs
node apps/desktop/test/notification-route-intent.test.mjs
npm --workspace apps/desktop run test:update
```

## Manual GUI Boundary

The command receipts cover allow and deny logic. External GUI pilot screenshots and owner-observed native capability QA are not recorded here.

## Non-Claims

- owner approval: false
- external pilot approval: false
- production go-live: false
- public release: false
