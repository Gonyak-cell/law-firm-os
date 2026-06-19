# L3 Entra Graph Admin Consent Blocker Survey

Status: blocked_pending_m365_admin_graph_scope_entra_registration_and_admin_consent

Work package: LT-L3-W07

Terminal TUW: LT-L3-W07-T04

Gate binding: G5, L3-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T13:22:14Z

## Boundary

This survey records why LT-L3-W07 cannot close from current repo evidence. It
does not confirm tenant administrator access, does not approve Graph scopes,
does not register Entra applications, does not store credentials, and does not
grant admin consent.

## Dependency State

| Dependency | Current audit status | Impact on W07 |
| --- | --- | --- |
| LT-PRE-W06 | `blocked_pending_external_actions` / `command_evidence_only_blocked` | EXT-M365-ADMIN confirmation is externally pending. |
| LT-L1-W02 | `decision_round_brief_blocked_pending_owner_decisions` / `command_evidence_only_blocked` | OQ-002 Graph scope/admin consent range is not owner-approved. |
| LT-L3-W03 | `blocked_pending_proxy_tls_cors_vault_and_staging_boundary_evidence` / `standard_five_blocked` | Vault secret storage for app credentials is absent. |

## Current Repo Survey

| Check | Result | Evidence |
| --- | --- | --- |
| Tenant admin confirmation | absent | `docs/launch/l3/m365-tenant-admin-confirmation.md` is missing |
| Graph scope register | absent | `docs/launch/l3/graph-scope-register.md` is missing |
| Entra app registration | absent | `docs/launch/l3/entra-app-registration.md` is missing |
| Admin consent evidence | absent | `docs/launch/l3/admin-consent-evidence.md` is missing |
| W07/M365 evidence files | absent | required W07 path search returned `0` |
| MSAL/NAA/auth config files | absent | auth config search returned `0` |
| M365 runtime contract | not admitted | contract says `implementation_allowed=false`, `calls_graph_api=false`, and `acquires_entra_tokens=false` |
| G5 gate evidence | blocked | G5 evidence cites pending M365 tenant/admin evidence |

## G5 Basis

LT-L3-W07 contributes the G5 admin-consent proof. Current evidence has no tenant
admin confirmation, no least-privilege Graph scope register, no Entra app IDs,
no manifest-to-scope diff, no vault credential proof, and no admin consent
export. Existing external-leadtime and L8 G5 files keep this gate blocked.

## TUW Blocker Matrix

| TUW | Required outcome | Current blocker | Closeout state |
| --- | --- | --- | --- |
| LT-L3-W07-T01 | AMIC M365 tenant administrator access confirmed and recorded | EXT-M365-ADMIN remains pending external confirmation | blocked |
| LT-L3-W07-T02 | Least-privilege Graph scope register approved | OQ-002 and owner scope decision are not complete | blocked |
| LT-L3-W07-T03 | Local/staging/production Entra apps registered and credentials vaulted | T01/T02 and L3-W03 vault boundary are absent | blocked |
| LT-L3-W07-T04 | Admin consent granted and G5 evidence assembled | T01-T03 evidence and consent export are absent | blocked |

## Next Required Actions

1. Obtain owner/tenant-admin evidence for EXT-M365-ADMIN without synthesizing access.
2. Complete OQ-002 Graph scope/admin consent range with least-privilege rationale.
3. Register local/staging/production Entra apps after vault storage exists.
4. Preserve admin consent export and reconcile granted scopes against the approved register.
