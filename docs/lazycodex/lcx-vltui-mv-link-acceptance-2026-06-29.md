# LCX-VLTUI MV-LINK Acceptance Ladder

Generated: 2026-06-29T11:16:21Z

Goal thread: 019f12b6-4a23-7042-8d78-524e0ec3f852

This receipt binds the LCX-VLTUI train to the existing Matter app to Vault linkage ladder without claiming production readiness, public release, go-live, owner final approval, customer document import, OneDrive cutover, or Vault document-write enablement.

## Scope

Implemented in this slice:

- LCX-VLTUI-01.02: Vault app status contract state map.
- LCX-VLTUI-01.03: bridge auth and projection negative cases.
- LCX-VLTUI-01.04: synthetic client and matter upsert handshake shape.
- LCX-VLTUI-01.05: projection sync or blocked-state mapping.
- LCX-VLTUI-01.06: MV-LINK ladder receipt.

## Ladder

| Check | LCX-VLTUI binding | Evidence state |
|---|---|---|
| MV-LINK-017 baseline counts | Count evidence remains Vault-side only and sanitized. | Bound to `/Users/jws/Projects/amic-vault/.omo/evidence/MV-LINK-ACCEPTANCE/mv-link-024-release-receipt.sanitized.json`. |
| MV-LINK-018 authenticated status | `GET /v1/integrations/matter-app/status` maps to LCX `status_state_map`. | Ready/projection/stale/unconfigured states are in `lcx-vltui-01-vault-bridge-contract-2026-06-29.json`. |
| MV-LINK-019 lookup positive | Vault lookup stays permission-scoped and returns reference-safe matter options. | Bound to Vault tests named in the contract fixture. |
| MV-LINK-020 permission negative | Denied or ethical-wall lookup cannot expose labels/counts as a write-ready state. | Mapped as `denied`, `may_call_law_bridge_upserts=false`. |
| MV-LINK-021 replay duplicate-create zero | Law Firm OS bridge replay must return idempotent state and zero duplicate creates. | API test covers idempotent matter replay; fixture requires duplicate-create count `0`. |
| MV-LINK-022 web picker/helper evidence | Vault web status/picker helpers stay the UI-facing consumer of the status route. | Bound to Vault web tests named in the contract fixture. |
| MV-LINK-023 runtime config fixation | `vault_projection_only` is dev/test unless a later ADR changes it. | Contract fixture labels it `dev_test_projection_only` and upload-authoritative `false`. |
| MV-LINK-024 sanitized release receipt | Receipts store counts, refs, and states only. | Sanitization flags in the contract fixture all remain true. |

## Non-Claims

- `production_ready=false`
- `public_release=false`
- `production_go_live=false`
- `owner_final_approval=false`
- `vault_document_write_enabled=false`
- `customer_document_import_executed=false`
- `onedrive_cutover_executed=false`
