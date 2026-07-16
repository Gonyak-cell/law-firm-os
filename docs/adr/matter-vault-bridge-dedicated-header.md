# ADR: Matter-Vault Bridge Dedicated Header

Status: Accepted for enterprise audit remediation v3 C3
Date: 2026-07-05

## Context

The Matter-Vault machine bridge previously used `Authorization: Bearer <LAWOS_VAULT_BRIDGE_TOKEN>`. Wave-1 API session authentication also owns `Authorization`, so bridge requests could be intercepted by the staff session gate or overwritten by web session helpers before the bridge token reached the Matter runtime.

## Decision

The Law Firm OS bridge accepts the machine token only in `x-lawos-vault-bridge-token`. The five bridge routes are exact-match exceptions before the staff session gate:

- `GET /api/matters/vault-bridge/status`
- `GET /api/matters/vault-bridge/matter-lookup`
- `POST /api/matters/vault-bridge/upload-preflight`
- `POST /api/matters/vault-bridge/clients/upsert`
- `POST /api/matters/vault-bridge/matters/upsert`

Lookup and upload-preflight continue to use `x-lawos-permission-context` as a machine-surface permission projection. Unknown bridge subpaths and methods still fall through to the normal session gate.

## Consequences

- Staff session `Authorization` and bridge machine authentication no longer collide.
- Current production Lambda deployments that only understand Bearer bridge auth must be redeployed before production bridge scripts are run.
- The external `amic-vault` operator tools must switch to `x-lawos-vault-bridge-token` before the next live bridge execution.
- `production_ready_claim` remains false; this ADR changes the transport header, not release authority.
