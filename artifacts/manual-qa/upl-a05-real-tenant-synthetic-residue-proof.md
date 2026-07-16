# UPL-A-05 Real-Tenant Synthetic Residue Proof

Generated: 2026-07-03T09:20:22.504Z

Overall result: PASS

Tenant: `tenant_amic_matter_vault`

## Evidence

| Check | Result | Evidence |
|---|---|---|
| a05-forged-permission-context-blocked | PASS | `{"status":401}` |
| a05-api-readback-uses-registered-tenant | PASS | `{"tenant_id":"tenant_amic_matter_vault","current_client_group_count":99,"wrong_tenant_count":0}` |
| a05-current-client-count-99 | PASS | `{"candidate_count":99,"readback_count":99}` |
| a05-synthetic-only-zero | PASS | `{"synthetic_only_true_count":0}` |
| a05-display-residue-zero | PASS | `{"residue_count":0,"residue_rows":[]}` |
| a05-current-client-known-names-present | PASS | `{"sample_names":["귀한사람들","그래비티랩스","그로브","금홍","김정","김지은","동림산업","동문시장","라이트팜텍","매크로머신","박수현","삼원페이퍼"]}` |
| a05-removed-project-seller-names-absent | PASS | `{"removed_name_hits":[]}` |
| a05-crosswalk-real-tenant-links-present | PASS | `{"linked_count":99}` |

## Boundary

- Production ready claim: false
- Go-live claim: false
- Residue scan fields: display_name, canonical_display_name, client_short_name, source_lanes
