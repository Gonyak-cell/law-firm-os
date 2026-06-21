# mater Desktop Auth Session Plan

Status: active
Ledger TUW: `MDT-P2-W01-T01`
Risk class: A

## Authority Model

The desktop app uses OIDC Authorization Code with PKCE. Session authority belongs
to the Electron main process and the operating-system secure store. The renderer
receives session status only.

## Required Flow

1. Main process creates a PKCE verifier, challenge, state, and nonce.
2. Main process opens the system browser or approved OS auth surface.
3. The identity provider redirects to the reserved desktop auth callback route.
4. Main process validates state, nonce, issuer, audience, and PKCE verifier.
5. Main process stores token material only in the approved secure store.
6. Renderer receives a bounded session summary: signed-in state, tenant id hash,
   expiry timestamp, and allowed commands.

## Forbidden

- embedded password login is forbidden.
- renderer storage of token material is forbidden.
- `localStorage` token persistence is forbidden.
- `sessionStorage` token persistence is forbidden.
- IndexedDB token persistence is forbidden.
- Generic renderer IPC access to auth token bodies is forbidden.
- Auth callback deep links must not execute mutation, download, upload, file
  bridge, or AI generation actions.

## Reserved Auth Callback Deep Link

The only reserved desktop deep link route in P2-W01 is `auth_callback`.

Contract: `contracts/desktop-deep-link-contract.json`

- Scheme: `mater`
- Host: `auth`
- Path: `/callback`
- Allowed query keys: `code`, `state`, `issuer`
- Forbidden actions: `mutation`, `download`, `upload`, `ai_generate`,
  `file_bridge`, `open_external_url`, and `execute_command`
- The callback validates auth state only; it cannot execute non-auth actions.

## Renderer Storage Policy

Renderer storage may keep non-sensitive UI preferences only. It must not store:

- access token
- refresh token
- ID token
- PKCE verifier
- auth code
- client secret
- tenant secret
- raw account profile

## Logout and Tenant Switch

Logout and tenant switch must clear secure-store token material, renderer caches,
API response caches, service-worker caches, pending auth state, and any
tenant-scoped shell state before a new session can start.

## Non-Claims

This plan does not implement auth, session storage, secure-store writes, deep
link handlers, preload session APIs, production go-live, public release, or owner
approval.
