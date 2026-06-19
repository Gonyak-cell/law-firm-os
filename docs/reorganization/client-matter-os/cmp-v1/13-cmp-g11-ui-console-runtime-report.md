# CMP-G11 UI Console Runtime Report

CMP-G11-W11 implements the Client-Matter-People console layer over the G1-G10 backend runtime evidence already present in this branch. It adds the IA catalog, web navigation, routable CMP console surface, reusable denied/review states, Vault security badges, domain API client contract, UI regression coverage, and a dedicated validator for all 48 CMP-G11 TUWs.

Runtime readiness remains `runtime_ui_evidence_only__backend_runtime_required__durable_persistence_open`. This report does not claim R4 or durable production persistence.

## TUW Coverage

- CMP-G11-W11-T001 through CMP-G11-W11-T041: primary IA, route, and screen coverage for command center, client/party, CRM/intake, matter, people, vault/DMS, finance, analytics, AI review, admin audit, connector, policy, wall, and hold surfaces.
- CMP-G11-W11-T042: `PermissionDeniedState` reusable component.
- CMP-G11-W11-T043: `ReviewRequiredState` reusable component.
- CMP-G11-W11-T044: `VaultSecurityBadges` for LegalHold, Privilege, and HRSensitive indicators.
- CMP-G11-W11-T045: domain API client contract with tenant, actor, permission receipt, audit event, and idempotency context.
- CMP-G11-W11-T046: i18n glossary binding through `cmp` and `cmpConsoleTitle` copy keys.
- CMP-G11-W11-T047: keyboard-accessible route/state buttons and semantic status regions.
- CMP-G11-W11-T048: UI regression test coverage for catalog, routing, states, API context, backend dependencies, and no-R4 boundary.

Trace list: CMP-G11-W11-T001, CMP-G11-W11-T002, CMP-G11-W11-T003, CMP-G11-W11-T004, CMP-G11-W11-T005, CMP-G11-W11-T006, CMP-G11-W11-T007, CMP-G11-W11-T008, CMP-G11-W11-T009, CMP-G11-W11-T010, CMP-G11-W11-T011, CMP-G11-W11-T012, CMP-G11-W11-T013, CMP-G11-W11-T014, CMP-G11-W11-T015, CMP-G11-W11-T016, CMP-G11-W11-T017, CMP-G11-W11-T018, CMP-G11-W11-T019, CMP-G11-W11-T020, CMP-G11-W11-T021, CMP-G11-W11-T022, CMP-G11-W11-T023, CMP-G11-W11-T024, CMP-G11-W11-T025, CMP-G11-W11-T026, CMP-G11-W11-T027, CMP-G11-W11-T028, CMP-G11-W11-T029, CMP-G11-W11-T030, CMP-G11-W11-T031, CMP-G11-W11-T032, CMP-G11-W11-T033, CMP-G11-W11-T034, CMP-G11-W11-T035, CMP-G11-W11-T036, CMP-G11-W11-T037, CMP-G11-W11-T038, CMP-G11-W11-T039, CMP-G11-W11-T040, CMP-G11-W11-T041, CMP-G11-W11-T042, CMP-G11-W11-T043, CMP-G11-W11-T044, CMP-G11-W11-T045, CMP-G11-W11-T046, CMP-G11-W11-T047, CMP-G11-W11-T048.

## Runtime Artifacts

| Artifact | Purpose |
| --- | --- |
| `apps/web/src/data/cmpConsoleCatalog.js` | Canonical G11 UI catalog with 48 TUW IDs, required UI states, backend evidence gates, and readiness boundary. |
| `apps/web/src/data/cmpApiClient.js` | Domain client contract that carries tenant, actor, permission, audit, and idempotency context. |
| `apps/web/src/components/CmpConsoleSurface.jsx` | Usable CMP console screen with IA list, route detail, shared state previews, security badges, and backend evidence strip. |
| `apps/web/test/cmp-g11-console.test.mjs` | UI regression tests for catalog, routing, state, API client, dependency, and readiness boundaries. |
| `scripts/validate-client-matter-os-cmp-g11-runtime.mjs` | Dedicated CMP-G11 validator. |

## Guardrails

- The console is UI runtime evidence only and depends on G1-G10 backend evidence.
- Explicit backend dependency list: CMP-G1-W01, CMP-G2-W02, CMP-G3-W03, CMP-G4-W04, CMP-G5-W05, CMP-G6-W06, CMP-G7-W07, CMP-G8-W08, CMP-G9-W09, CMP-G10-W10.
- All screens expose loading, empty, denied, review-required, and error state coverage.
- Domain requests must include tenant, actor, permission receipt, audit event, and idempotency context.
- Vault/AI-adjacent screens expose LegalHold, Privilege, and HRSensitive badges.
- No source mutation, external sharing, AI dispatch, or production persistence claim is introduced by G11.
