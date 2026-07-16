# UPL-A-06 All-Domain Durable Roundtrip Proof

Status: PASS

- Domains: 13
- Local Wave-1 owner boundary closed: true
- External production DB decision claimed: false
- Production-ready claim: false

| Domain | Store file | Reopen readback | Schema/migration |
|---|---:|---:|---|
| hrx | 2074 | true | {"schema_version":"law-firm-os.hrx-file-store.v0.1","migration_count":6,"first_migration_results":[{"id":"001_hrx_core","applied":true,"hash":"8b9d8ee1f3cd2e4f0d98bbfe086da661404c472088ac661f88c72197a6b403db"},{"id":"002_hrx_documents_leave_audit","applied":true,"hash":"3fcb1cff2f1bd005c89ff5c37584589d73e343c28bf89dc4b780bb41746b876d"},{"id":"003_hrx_ai_analytics","applied":true,"hash":"04cd2e7601bd3d7ba6be960b8e064ef404323cce8fcde9429c4009a1db78236d"},{"id":"004_hrx_attendance","applied":true,"hash":"f6ee9b3229ab5e43b32e36bfade6a9537df3c4fde778a67347269e0bd293f507"},{"id":"005_hrx_overtime","applied":true,"hash":"f65359909803e277c6dd77b7848b3de5e6886b060fa0de0d6eea9589ab59cf50"},{"id":"006_hrx_recruiting_lifecycle","applied":true,"hash":"36d349f3de1cebacda1a3f42e25488fcbe131c72277c1b66e4053ae8de828a85"}],"second_migration_results":[{"id":"001_hrx_core","applied":false},{"id":"002_hrx_documents_leave_audit","applied":false},{"id":"003_hrx_ai_analytics","applied":false},{"id":"004_hrx_attendance","applied":false},{"id":"005_hrx_overtime","applied":false},{"id":"006_hrx_recruiting_lifecycle","applied":false}]} |
| master_data | 1076 | true | {"schema_version":"law-firm-os.master-data-repository.v0.1"} |
| matter | 2296 | true | {"migrations":[{"id":"001_matter_core","filename":"001_matter_core.sql","checksum":"matter-core-r4-001-canonical-identity","description":"Matter Core tenant-scoped runtime tables with canonical client and matter code identity"},{"id":"002_matter_worktree","filename":"002_matter_worktree.sql","checksum":"matter-worktree-v1-model-storage","description":"Matter Worktree and template storage keyed by tenant and canonical model identifiers"}]} |
| dms | 1369 | true | {"migrations":[{"id":"001_dms_vault_runtime","description":"Create Vault/DMS runtime metadata, idempotency, and audit tables.","sql_ref":"packages/dms/src/migrations/001_dms_vault_runtime.sql"}]} |
| crm | 1380 | true | {"migrations":["crm-runtime-001-file-store"]} |
| intake | 1489 | true | {"migrations":["intake-runtime-001-file-store"]} |
| crm_master_data | 1092 | true | {"schema_version":"law-firm-os.master-data-repository.v0.1"} |
| finance | 984 | true | {"migrations":["finance-runtime-001-file-store"]} |
| analytics | 1091 | true | {"migrations":["analytics-runtime-001-file-store"]} |
| ai_governance | 992 | true | {"migrations":["ai-governance-runtime-001-file-store"]} |
| client_portal | 1173 | true | {"migrations":["client-portal-runtime-001-file-store"]} |
| ui_readiness | 1127 | true | {"migrations":["ui-readiness-runtime-001-file-store"]} |
| enterprise_readiness | 1103 | true | {"migrations":["enterprise-readiness-runtime-001-file-store"]} |
