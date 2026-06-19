# Admin Console IA

Status: draft_completed_pending_l1_w01_scope_and_l2_permission_runtime
Work package: LT-L4-W01
TUW: LT-L4-W01-T18
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This IA document defines the Wave 1 Admin Console screen contract for later UI
work. It does not implement `apps/web`, does not modify
`apps/web/src/components/AdminSurface.jsx`, does not open admin runtime routes,
and does not claim LT-L4-W01 or LT-L4-W01-T18 completion.

The current `AdminSurface.jsx` is a demo surface using `mockData.js` for team,
billing, and notification previews. This IA does not treat that demo as
go-live-ready admin functionality.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` section 1 | Source row: Admin Console covers users, permissions, policy, AI policy, audit, and ledger. |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` section 8 | Admin UX principles for policy reason/impact, permission preview/audit, AI policy impact, Vault risk, and HR sensitive warning/re-auth. |
| `workbook/matter-post-cp-launch-plan.md` L1 and L4 sections | Wave 1 includes Admin Console; AI is dark launch/off; portals, Vault, and HR UI are later-wave surfaces. |
| `docs/launch/runtime-gap-report.md` | Runtime evidence: auth, permission, audit, and admin/audit read surfaces remain partial or absent. |
| `contracts/permission-kernel-contract.json` | Permission state vocabulary, hidden fields, audit hint preview, and fail-closed handling. |
| `contracts/audit-compliance-contract.json` | Append-only audit contract reference; runtime query and durable store are not claimed by this IA. |
| `apps/web/src/components/AdminSurface.jsx` | Current demo surface only; not an implementation source of truth for Wave 1 admin IA. |

## Wave 1 Admin Functions

| ID | Function | Screen structure | Data source contract/API field | Empty state copy | Permission handling | Backend WP dependency |
| --- | --- | --- | --- | --- | --- | --- |
| AC-FUNC-01 | User directory | Searchable user table, detail drawer, role/team chips, tenant status | Future `GET /admin/users`; core-domain User/Tenant shape; no demo `adminRows` | No users are available for this tenant. | allow: show authorized user fields; denied: hide directory; review_required: show review-required state without profile details. | LT-L2-W02 server-side identity/permission context; LT-L2-W04 admin read model |
| AC-FUNC-02 | Permission view | Role matrix, matter access preview, effective permission explanation, denied/review state badge | Permission kernel decision summary and audit hint preview; no sealed policy internals | No permission records match the current filter. | allow: show safe effective access; denied: hide policy internals and sealed source fields; review_required: show pending-review state. | LT-L2-W02 permission runtime; LT-L5 security acceptance |
| AC-FUNC-03 | Policy read | Read-only policy catalog, effective date, owner role, impact summary, change request placeholder | Future `GET /admin/policies`; contracts are deployment-time source, not runtime policy mutation | No policy records are published for this scope. | allow: show published policy metadata; denied: hide policy detail; review_required: suppress impact details. | LT-L1-W05 approval governance; LT-L2-W04 policy read model |
| AC-FUNC-04 | Audit read | Audit event search, hash-chain health summary, object filter, export request placeholder | Audit/compliance append-only event contract; future `GET /admin/audit-events` | No audit events are available for this filter. | allow: show safe event summaries; denied: hide event rows and counts; review_required: show review-required state without payload. | LT-L2-W01 durable audit store; LT-L2-W04 audit read API; LT-L5 audit completeness |

## Admin UX Principle Mapping

| ID | Source principle | Wave 1 screen response |
| --- | --- | --- |
| AC-UX-01 | Policy settings show reason and impact scope | Policy read shows reason, owner role, effective date, affected module, and impact summary. Mutating policy settings stay out of Wave 1 unless later approved. |
| AC-UX-02 | Permission changes require preview and audit | Permission view includes preview-only effective access. Actual permission changes require future write API, preview confirmation, and non-bypassable audit. |
| AC-UX-03 | AI policy changes show model-routing impact | AI policy change controls are excluded from Wave 1; read-only AI-off status may show model-routing impact placeholder only. |
| AC-UX-04 | Vault export/import shows risk grade | Vault export/import controls are excluded from Wave 1 and moved to Wave 3 or later. If referenced, show disabled risk-grade placeholder only. |
| AC-UX-05 | HR sensitive action has warning and re-auth recommendation | HR sensitive admin actions are excluded from Wave 1. Any future HR action requires warning, re-auth recommendation, and HR sensitivity gate. |

## Exclusions

| Excluded surface | Wave | Reason |
| --- | --- | --- |
| AI policy mutation | Wave 2 or later | AI is dark launch/off in Wave 1 and requires AI release gates, model-routing impact review, and owner approval. |
| Vault export/import administration | Wave 3 or later | Matter Vault/Obsidian export-import is outside Wave 1 and has separate storage/risk decisions. |
| HR sensitive administration | Separate HR track / later wave | HR real data and sensitive actions require HR sensitivity validation, deterministic guardrails, and re-auth policy. |
| Billing/checkout admin | Outside this TUW | Current demo billing preview is not part of the Wave 1 legal-product Admin Console acceptance. |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| No product admin route claimed | This IA does not modify `AdminSurface.jsx` or add routes. |
| No durable audit query claimed | Runtime gap evidence still treats audit persistence/query as partial or absent. |
| No permission mutation claimed | Permission changes require LT-L2-W02/LT-L2-W03 runtime, preview, approval, and audit evidence. |
| No policy mutation claimed | Contracts are not currently runtime-loaded policy state; policy change remains an approved deployment/change-management workflow. |

## Permission States

| State | Screen rule |
| --- | --- |
| allow | Render authorized user, permission, policy, and audit summaries using safe fields only. |
| denied | Hide rows and counts that could leak tenant users, matter membership, policy internals, or audit payloads. |
| review_required | Render a distinct review-required state and suppress underlying admin data until review is resolved. |
