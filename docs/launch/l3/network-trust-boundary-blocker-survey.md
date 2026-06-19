# L3 Network And Trust Boundary Blocker Survey

Status: blocked_pending_proxy_tls_cors_vault_and_staging_boundary_evidence

Work package: LT-L3-W03

Terminal TUW: LT-L3-W03-T04

Gate binding: G4, L3-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T13:17:48Z

## Boundary

This survey records why LT-L3-W03 cannot close from current repo evidence. It
does not configure a reverse proxy, does not issue TLS certificates, does not
open a staging domain, does not add CORS/security-header policy, and does not
create a vault or move secrets.

## Dependency State

| Dependency | Current audit status | Impact on W03 |
| --- | --- | --- |
| LT-L1-W06 | `decision_brief_blocked_pending_owner_hosting_decision` / `command_evidence_only_blocked` | Hosting/topology and domain boundary are not owner-approved. |
| LT-L3-W02 | `blocked_pending_remote_repo_ci_container_staging_and_rollback_evidence` / `standard_five_blocked` | Staging deployment target does not exist. |

## Current Repo Survey

| Check | Result | Evidence |
| --- | --- | --- |
| Proxy/TLS/certificate files | absent | `find infra ... proxy/tls/nginx/traefik/cert ... \| wc -l` returned `0` |
| Vault/secret config files | absent | `find infra .github apps/api apps/web ... secret/vault/.env ... \| wc -l` returned `0` |
| API network binding | local-only | `apps/api/src/server.js` binds `127.0.0.1` via `server.listen(port, HOST)` |
| CORS/OPTIONS runtime | absent | `apps/web` docs state the API has no CORS/OPTIONS handling and uses the Vite dev proxy |
| Deployment topology doc | absent | `docs/launch/l3/deployment-topology.md` is missing |
| Network trust boundary doc | absent | `docs/launch/l3/network-trust-boundary.md` is missing |
| Vault inventory doc | absent | `docs/launch/l3/vault-secret-inventory.md` is missing |

## G4 Basis

LT-L3-W03 contributes the G4 infrastructure trust-boundary proof. Current
evidence has no HTTPS staging domain, no certificate-chain validation, no HTTP
to HTTPS redirect evidence, no external-app-port denial evidence, no CORS
allowlist, no HSTS header, and no vault audit log.

## TUW Blocker Matrix

| TUW | Required outcome | Current blocker | Closeout state |
| --- | --- | --- | --- |
| LT-L3-W03-T01 | Reverse proxy, TLS, domain, redirect, and direct-port denial proof | No approved hosting, no staging deployment, no proxy/TLS files | blocked |
| LT-L3-W03-T02 | CORS allowlist and security headers | API has no CORS/OPTIONS handling and no deployed domain policy | blocked |
| LT-L3-W03-T03 | Vault-based secret management and audit log | No vault config, no secret inventory, no staging runtime, no audit log | blocked |
| LT-L3-W03-T04 | G4 trust-boundary evidence bundle | T01-T03 evidence is absent | blocked |

## Next Required Actions

1. Close L1-W06 and L3-W02 so the approved hosting target and staging runtime exist.
2. Add proxy/TLS/domain configuration and record HTTPS, redirect, and direct-port denial outputs.
3. Add domain-based CORS/security-header policy without wildcard origins.
4. Add vault inventory and audit-log proof without committing secret values.
