# matter Desktop Route Map

Status: active
Ledger TUW: `MDT-P3-W01-T01`

## Route Intent Table

| Desktop intent | Route source | Web route/view | Required permission check | Fallback |
| --- | --- | --- | --- | --- |
| matter | `matter://matter/:matterId` | `view=matters` with selected matter context | Recheck matter membership and Matter Core read permission before entry. | denied |
| document | `matter://document/:documentId` | `view=vault` with selected document context | Recheck document ACL, matter membership, and Vault read permission before entry. | denied |
| task | `matter://task/:taskId` | `view=home` or future task panel | Recheck task assignment and matter membership before entry. | denied |
| auth | `matter://auth/callback` | auth callback handler only | Validate PKCE state, issuer, and nonce in main process. | fallback |
| denied | server-owned denied result | `DesktopDeniedState` | Do not show row counts, snippets, citations, or document metadata. | denied |
| fallback | invalid or unsupported desktop route | loading/auth fallback surface | No privileged lookup before route is classified. | fallback |

## Rules

- Desktop route intents are presentation hints only.
- Every matter, document, and task route must recheck backend permission before
  screen entry.
- denied routes must not leak row counts, snippets, citations, file metadata, or
  hidden matter names.
- fallback routes must not invoke file bridge, billing, auth mutation, audit
  mutation, or AI generation.
- File bridge is not implemented in P3.

## Non-Claims

This map does not implement deep-link dispatch, backend permission checks,
file bridge, production go-live, public release, or owner approval.
