# CTI I1 Owner Mapping Confirmation Receipt

Status: `RECORDED_OWNER_MAPPING_CONFIRMED_DROPDOWN_NORMALIZATION_REQUIRED`

Approval ref: `I1-CTI-LAWYER-ROLE-MAPPING-OWNER-CONFIRMATION-2026-07-06`

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

## Summary

- Owner supplied the filled I1 mapping workbook and instructed Codex to proceed.
- Row count: 148.
- Required owner fields are complete after applying the conservative default `blank matter_status -> unknown_review_required` for 1 row.
- This receipt is repo-safe: it records workbook hashes, counts, and model requirements only; it does not record plaintext client, matter, attorney, credential, token, or password material.

## Counts

- Source owner workbook SHA-256: `52382ee35d4ba7e0133ed2d9ddad8a1c53ee64c9ab42a0ca89fba5dc177106d4`
- Finalized private workbook SHA-256: `e4adaaa7e510ac2a68ad495e335562d2a2310730ea8436a9e371fdadab971b18`
- Finalized assignment digest SHA-256: `5ce24b09dffb5b8f0c5f9ce3e4fe6c61b2470397b35aaee14ea436930eedc607`
- Status counts: active 126, closed 18, hold 3, unknown_review_required 1.
- Joint retaining candidate rows: 87.
- Responsible attorney multi-select rows: 148.

## Production Model Requirement

- `retaining_attorneys`: multi-select dropdown; joint retaining allowed; minimum one selected principal.
- `responsible_attorneys`: multi-select dropdown; minimum one selected principal; may overlap with retaining attorneys.
- `matter_status`: single-select dropdown with `active`, `closed`, `hold`, `unknown_review_required`.
- Production write paths must persist canonical user/account IDs, not display labels.
- `owner_notes` remains an operator/admin note surface and is excluded from repo evidence.

## Boundary

No production write, CUTOVER, tenant migration, account/permission injection, password issuance/distribution, production_ready claim, go-live claim, plaintext PII commit, credential material, or token material was executed or recorded by this receipt.
