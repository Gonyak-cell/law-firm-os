# mater Desktop Secure Store Policy

Status: active
Ledger TUW: `MDT-P2-W01-T03`
Risk class: A

## Token Location

Token material must live only in the Electron main process and the operating
system secure store. The renderer must never receive access token, refresh
token, ID token, PKCE verifier, auth code, client secret, or tenant secret
bodies.

Approved secure-store targets:

- macOS Keychain
- Windows Credential Manager
- Linux Secret Service compatible keyring

## Lifetime

- Access token lifetime follows the IdP expiry and is never extended in renderer
  storage.
- Refresh token lifetime follows IdP rotation policy and is stored only in the
  secure store.
- Session summary cache may contain signed-in state, tenant id hash, and expiry
  timestamp only.
- Pending PKCE state expires after the auth callback window or 10 minutes,
  whichever comes first.

## Logout Deletion

Logout must delete:

- secure-store token entries
- pending PKCE verifier/state/nonce
- session summary cache
- API response cache
- renderer memory cache
- service-worker cache
- tenant-scoped shell state

## Tenant Switch Invalidation

Tenant switch is treated as logout plus new login. Before the new tenant can
load, the app must wipe the previous tenant token, session summary cache, API
cache, service-worker cache, pending requests, and shell state.

## Cache Rules

Cache may store only non-sensitive shell metadata. Cache must not contain token
bodies, raw account profile, client data, matter data, file metadata, document
bytes, privileged content, or AI output.

## Forbidden Renderer Storage

- `localStorage` token storage is forbidden.
- `sessionStorage` token storage is forbidden.
- IndexedDB token storage is forbidden.
- Cache API token storage is forbidden.
- Preload API must expose session state and commands only, never token bodies.

## Non-Claims

This policy does not implement secure-store writes, auth coordinator behavior,
logout execution, tenant switch execution, production IdP readiness, public
release, or owner approval.
