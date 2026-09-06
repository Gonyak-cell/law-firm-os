# Native corporate document preview and save

Corporate documents belong to a legal-entity workspace with a null Matter. The prior desktop renderer, preloads, file bridge and export transport required a Matter, so authorized users could list these documents but could not preview or save them.

The new path keeps an exclusive workspace target from the renderer through both packaged and source preloads, the existing file bridge, authenticated main-process coordinator, and native API. The existing Matter and Classic Outlook export protocol remains intact. Corporate attachments to Outlook are not enabled by this change.

## Authorization and transfer

Four POST endpoints under `/api/vault/desktop/corporate-export-` provide preflight, authorization, bounded chunks and delivery acknowledgement. They require a signed current session, native PostgreSQL authority, active corporate workspace, owner or canonical object ACL, and the exact current document/version/file/hash/size/MIME binding. Explicit denial takes precedence. Generic renderer API calls cannot invoke these endpoints or the legacy document-body download route.

Authorization state has a closed schema, principal and nonce binding, and a fixed five-minute expiry. Each chunk rechecks permission and current version. Reusing a nonce cannot change the target or extend expiry. Ordered chunk receipts, authorization state and delivery acknowledgement use the existing repository idempotency and audit transaction. Responses are buffered until PostgreSQL commits; failed audit persistence rolls back the new authorization.

The existing guarded storage reader verifies the complete object before returning each at-most-3-MiB chunk. The supported whole-document limit remains 25 MiB. Repeated full bounded reads are deliberate: they reuse the existing storage integrity contract without introducing a weaker range reader. Main consumes bounded private JSON with redirects disabled and a timeout, checks chunk identity, offsets, length and SHA-256, then checks the assembled document hash. Bytes never cross the renderer bridge. This fits the deployed buffered HTTP API without changing infrastructure or enabling an external provider.

## Filesystem boundary review

The reviewed main/preload/shared changes add only workspace target propagation and the bounded native transport. Both session preloads retain the same contract; the standalone file preload uses the same target allowlist. Live user activation, trusted IPC sender and renderer ownership checks remain required. Renderer-supplied bytes, paths, identities, permissions and operation authority are rejected or omitted before native operations. Missing or mixed Matter/workspace targets fail before the native dialog or any object read.

Save As still uses the existing native picker and atomic writer. Cancelling performs no download or acknowledgement. Preview still uses the protected temporary-file manager and existing expiry, logout and application-exit cleanup. A server acknowledgement is required before either operation reports completion. No directory watch, recursive scan, new persistent path store, path logging, or renderer-visible raw path was added. The desktop source manifest pin is refreshed only after this review and execution of the boundary tests.

## Validation and remaining deployment gate

Synthetic validation covers real PostgreSQL with a single application connection, authenticated desktop transport, independent ACL revocation, pending and held workspace denial, unchanged corporate anchor references and original versions, durable audit-failure rollback, idempotent completion, multi-chunk full-body verification, tampering, invalid offsets, expiry, size bounds, redirects, unsafe caching and stalled responses. Desktop tests cover real packaged-preload execution, current user activation, forbidden renderer authority, native-dialog cancellation, workspace propagation, protected preview and unchanged Matter/Outlook behavior. Browser tests verify both corporate actions and the workspace label, including cancellation without success feedback. The rendered desktop and narrow-screen surfaces are inspected. AI slop review passes: an unchanged binary-payload denylist in `session.js` matches one weak visual-style heuristic and is retained as security code. No visual-style change is associated with that finding.

These are source and synthetic test results. Production deployment, a higher private desktop version, actual Windows document preview/save and an independent saved-file hash remain required before claiming operational completion. No company originals or credentials are included in this change.

Interaction reference: [private document preview and Save As evidence](https://www.lazyweb.com/agentic-search/7156163b-8926-43e0-aadb-57511bd6a8a5). The existing document detail and native save-dialog interaction are retained.
