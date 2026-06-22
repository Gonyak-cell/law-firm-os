# LCX-WEB-04 Core Client/Matter/Vault Coverage

Status: closed

## Closed TUWs

- W4-T00: master-data records, relationships, and client groups are mapped to `clients`.
- W4-T01: matter list, detail, command-center, vault summary, and timeline are mapped to `matters`.
- W4-T02: opening, team member, and document attach actions are visible as guarded matter capabilities.
- W4-T03: vault documents, download, search, and audit are mapped to `vault`.
- W4-T04: upload, version, checkout lock, privilege label, and legal hold actions are visible as guarded vault capabilities.

## Verification

- `npm run client-matter:cmp-v1:g2:validate`: required
- `npm run client-matter:cmp-v1:g4:validate`: required
- `npm run client-matter:cmp-v1:g5:validate`: required

## Boundary

- Document bytes stay out of renderer-owned state.
