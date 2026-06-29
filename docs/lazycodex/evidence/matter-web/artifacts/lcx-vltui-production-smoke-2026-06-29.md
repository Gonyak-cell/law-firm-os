# LCX-VLTUI Production Smoke

Generated at: 2026-06-29T23:38:17.883Z

Verdict: PASS

Base URL: https://d2mthcc8vp3cr2.cloudfront.net

Deployment commit: 0ff79586d887a950200ab091a5864a20c174bdf9

| Check | Passed | Detail |
| --- | --- | --- |
| cloudfront-root-new-assets | true | root=200, assets=index-C4I169hQ.js/index-COfWDa_0.css |
| health-context-profile | true | profile present |
| health-context-matter-core | true | matter-core present |
| health-context-vault-dms | true | vault-dms present |
| health-context-crm-intake | true | crm-intake present |
| profile-session-principal | true | status=200, ui_state=populated |
| client-crm-sections | true | opportunities=1, activities=1, proposals=1 |
| matter-list | true | status=200, matters=1 |
| matter-workspace-sections | true | command_center=200, timeline=200, vault_summary=200 |
| vault-documents | true | status=200, documents=1 |
| vault-bridge-status | true | status=200, source_mode=matter_app_api |
| vault-bridge-client-upsert | true | status=201, action=created |
| vault-bridge-matter-upsert | true | status=201, action=created |
| vault-bridge-lookup | true | status=200, matches=1 |
| vault-upload-preflight-guarded | true | status=200, allowed_next_step=permission_check_only |

## Boundary

- CloudFront web, Lambda API, Client CRM, Matter runtime, Vault DMS, and Vault bridge routes were checked.
- Bridge writes are synthetic idempotent Client/Matter upserts only.
- Upload preflight remains permission-check-only and does not write document bytes.
- No public release, owner final approval, real-client-data import, or company-wide go-live is claimed by this smoke.
