# mater Desktop File Bridge Audit Map

Status: P4 design-active
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`
Scope: `MDT-P4-W01-T03`

## Boundary

The desktop file bridge is not broad filesystem authority. Every upload, download, and save-as path is mediated by a user gesture when applicable, a backend permission precheck, and an audit event map. Production go-live, public release, and owner approval remain false until explicit receipts exist.

## Permission Precheck and Audit Matrix

| Bridge path | Direction | Permission precheck | Audit events | Denied behavior |
| --- | --- | --- | --- | --- |
| `choose_file_for_upload` | upload | `file_bridge.upload` before native picker opens | `file_bridge.upload.permission_precheck.allowed`, `file_bridge.upload.permission_precheck.denied`, `file_bridge.upload.picker.cancelled`, `file_bridge.upload.picker.selected` | Native picker is not opened and no file handle is created. |
| `save_document_as` | download / save-as | `file_bridge.download` before save dialog opens | `file_bridge.download.permission_precheck.allowed`, `file_bridge.download.permission_precheck.denied`, `file_bridge.download.save-as.dialog_opened`, `file_bridge.download.save-as.completed` | Save dialog is not opened and no default path write is attempted. |
| `open_temp_preview` | download / preview | `file_bridge.preview` before temp preview is materialized | `file_bridge.preview.permission_precheck.allowed`, `file_bridge.preview.permission_precheck.denied`, `file_bridge.preview.opened` | Temp preview file is not created. |

## Implementation Notes

- The permission precheck is server-owned. The desktop process supplies action, matter/document context, and tenant hash, but does not decide entitlement locally.
- The audit logger records decision and outcome events for upload, download, and save-as paths.
- Renderer-visible metadata must not include raw absolute paths or file bytes.
- File bridge cache cleanup is handled by later P4 TUWs and is not claimed complete here.
