# LCX-WEB-06 People/Admin/Ops Coverage

Status: closed

## Closed TUWs

- W6-T00: employees, profiles, and employee-user links are visible under `people`.
- W6-T01: HR documents, leave, and approvals are visible under `people`.
- W6-T02: candidate portal, recruiting, onboarding, and offboarding are visible under `people`.
- W6-T03: policies, audit, analytics, HR AI assistant, and AI review are visible under `people`.
- W6-T04: UI readiness checks, critical paths, adjudications, and audit are visible under `readiness`.
- W6-T05: enterprise items, release candidates, go/no-go, and audit are visible under `ops`.

## Verification

- `npm run client-matter:cmp-v1:g11:validate`: required
- `npm run client-matter:cmp-v1:g12:validate`: required
- `npm run hrx:ui:validate`: required

## Boundary

- Sensitive HR fields remain masked unless server scope allows them.
