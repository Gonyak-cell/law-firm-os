# UPL-C-06 Canonical Client Crosswalk Proof

- verdict: PASS
- contract_ref: UPL-C-06
- source_ref: amic_current_onedrive_folder_inventory_2026_07_01
- candidate_count: 99
- crosswalk_row_count: 99

## Checks
- PASS candidate-list-remains-99-current-clients
- PASS rp04-entity-to-rp05-client-crosswalk-is-one-to-one
- PASS single-tenant-current-client-readback-has-no-synthetic-client-groups
- PASS crm-intake-conflict-search-uses-canonical-client-list
- PASS caller-hit-count-is-ignored-for-canonical-client-search
- PASS audit-and-safe-output-boundary
