# Matter-Vault R4 UAT Results

Status: local-synthetic-pass
Date: 2026-06-20

| Scenario | Evidence | Result |
| --- | --- | --- |
| Partner opens Matter and reviews Vault panel | `npm run web:e2e -- matter-vault` | Pass |
| Associate uploads through Matter facade | `npm --workspace apps/api run test` | Pass |
| Records manager applies privilege/legal-hold metadata | `apps/api/test/security/matter-vault-legal-hold.test.js` | Pass |
| Client user sees portal projection only | `apps/api/test/e2e/portal-vault-projection.test.js` | Pass |

Local synthetic UAT is engineering evidence only. External user acceptance and owner release authority remain separate.
