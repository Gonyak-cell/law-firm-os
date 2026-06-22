# matter Desktop Deep Link Audit Map

Status: P5 design-active
Source ledger: `docs/desktop/matter-desktop-loop-tuw-ledger.json`
Scope: `MDT-P5-W01-T04`

## Boundary

Deep links are route-only. Opening a deep link never executes mutation, download, upload, AI generation, billing write, or delivery execution. Production go-live, public release, and owner approval remain false until explicit receipts exist.

## Permission and Audit Matrix

| Route intent | Permission recheck | Open audit | Denied audit | Notes |
| --- | --- | --- | --- | --- |
| `matter` | `deep_link.open.matter` | `deep_link.matter.opened` | `deep_link.matter.denied` | Opens a Matter workspace route intent only. |
| `document` | `deep_link.open.document` | `deep_link.document.opened` | `deep_link.document.denied` | Opens a Document route intent only. |
| `task` | `deep_link.open.task` | `deep_link.task.opened` | `deep_link.task.denied` | Opens a Task route intent only. |
| `auth_callback` | N/A | `deep_link.auth_callback.opened` | `deep_link.auth_callback.denied` | Completes auth callback handling only; no workspace route permission. |

## Implementation Notes

- Parser validation happens before permission recheck.
- Backend permission is rechecked for `matter`, `document`, and `task`.
- An open audit or denied audit is recorded for every valid route open attempt.
- Renderer receives route intent output only.
