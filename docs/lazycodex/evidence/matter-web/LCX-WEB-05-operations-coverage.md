# LCX-WEB-05 Operations Coverage

Status: closed

## Closed TUWs

- W5-T00: CRM leads, opportunities, and handoff are visible under `intake`.
- W5-T01: intake requests, conflict checks, clearance tokens, and audit are visible under `intake`.
- W5-T02: finance time, WIP, invoices, payments, AR, and audit are visible under `finance`.
- W5-T03: analytics dashboards, profitability, refresh, export, and audit are visible under `analytics`.
- W5-T04: AI policies, retrieval, output, review queue, export, and audit are visible under `ask`.
- W5-T05: portal, RFI, external ACL, secure link, data room, projection, and audit are visible under `portal`.

## Verification

- `npm run client-matter:cmp-v1:g6:validate`: required
- `npm run client-matter:cmp-v1:g7:validate`: required
- `npm run client-matter:cmp-v1:g8:validate`: required
- `npm run client-matter:cmp-v1:g9:validate`: required
- `npm run client-matter:cmp-v1:g10:validate`: required

## Boundary

- Action endpoints are visible as guarded capabilities; production authority remains server-owned.
