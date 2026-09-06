# Authenticated member photo boundary review

The member directory and sidebar passed display names to a photo resolver that accepts a profile object. The roster also lacked an authenticated employee photo URL. This change connects the existing image renderer to the server's scoped member-photo storage and the desktop's bounded PNG transport.

## Server authority

The new GET route uses the employee-read policy, signed session tenant, and existing self-service ownership guard before looking up storage. Employee and current employment-profile tenant fields must agree. Its legal-entity and employee bindings select the existing versioned photo reader, which verifies scope, PNG dimensions, maximum size, storage version and complete SHA-256. Missing photos return no image; failed integrity checks return a generic unavailable result. The PostgreSQL path materializes HRX only and retains the existing durable denial-audit transaction.

## Desktop filesystem review

Of the 24 audited files under main, preload and shared, only `apps/desktop/src/main/aws-runtime.js` changed from the previous reviewed source. The exact employee photo GET path joins the existing current-profile image path. Queries, bodies, writes, noncanonical paths and renderer authorization headers remain rejected or omitted. Authentication comes from the main-process session. Redirects are rejected, and the existing request deadline, private/no-store response requirement, nosniff check, PNG signature and 5 MiB stream limit remain enforced.

The change adds no filesystem operation, native dialog, directory scan, watcher, persistent path, file logging or renderer-visible native path. Profile image bytes cross the existing image-only bridge for display; document bytes continue to use the separate native file bridge. The preloads, trusted sender rules, user activation checks, document transfer contracts and temporary preview cleanup are unchanged. The reviewed source manifest is `36703aba9090eea7bfa3d116797b5a92c8a5c0ee241ab0cabc27fd5d84508268`.

## Verification

The combined API/PostgreSQL/installation/native/web suite passed 115 checks. A further 79 desktop boundary checks passed, including real HTTP redirects and stalled photo bodies, authenticated PNG reads, oversized and unsafe-cache responses, native file handling, authentication coordination and preview cleanup. Three rendered scenarios verify decoded synthetic pictures, initials when no image is available, and unchanged accessible member names. Web typecheck, production build and AI slop lint pass; the synthetic rendered surfaces were inspected.

The UI retains the existing compact avatar, table and sidebar styles. [Selected private avatar reference](https://www.lazyweb.com/agentic-search/fd01ecdd-3d0a-4d56-a6c8-a0e0d8471281). These are source and synthetic verification results. Deployed API readback and the actual supplied portraits in a new Windows candidate remain required for operational completion. No supplied photographs, corporate records or credentials are included in this change.
