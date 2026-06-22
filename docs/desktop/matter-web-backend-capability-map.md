# LCX-WEB Backend Capability Map

Status: implementation-active
Source: `apps/web/src/data/capabilityMap.js`

This map binds every current backend capability family to a visible `apps/web` route. The map includes read endpoints, action endpoints, and audit endpoints. Action endpoints are displayed as guarded affordances; they are not silently converted into local mock behavior.

## Route Families

| Capability | Web route | Coverage |
| --- | --- | --- |
| Runtime health | `home` | `GET /api/health` |
| Clients and master data | `clients` | `/master-data/records`, relationships, client groups |
| Matter core | `matters` | matter list/detail/command-center/opening/team/document/timeline/audit |
| Vault and DMS | `vault` | documents, upload, versions, locks, privilege, legal hold, search, audit |
| CRM and intake | `intake` | leads, opportunities, handoff, requests, conflict, clearance, audit |
| Finance | `finance` | time, WIP, invoices, payments, AR, audit |
| Analytics | `analytics` | dashboards, profitability, refresh, exports, audit |
| AI governance | `ask` | policies, retrieval, outputs, review queue, exports, audit |
| Portal and data room | `portal` | projections, dashboard, RFI, ACL, secure links, rooms, audit |
| People and HRX | `people` | employee, user link, documents, leave, approvals, recruiting, lifecycle, policies, audit, analytics, AI |
| UI readiness | `readiness` | checks, critical path runs, adjudications, audit |
| Enterprise readiness | `ops` | items, release candidates, go/no-go, audit |

## Boundary

- No new dummy data may be introduced.
- API unavailable, denied, review, and guarded states must be visible.
- production go-live: false
- public release: false
- owner approval: false
