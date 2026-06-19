# Contract Inventory

Status: Proposed
Gate: `G0`
TUW: `LFOS-G0-W00-T003`

## Contract Treatment

| Contract | Target module | G0 treatment |
| --- | --- | --- |
| `law-firm-os.product-contract.json` | Product governance | Canonical product invariant source. |
| `runtime-readiness-contract.json` | Runtime readiness | Align with R0-R6 badges before runtime claims. |
| `permission-kernel-contract.json` | Platform / IAM / Permission | Trust foundation dependency for every data route. |
| `audit-compliance-contract.json` | Platform / Audit | Trust foundation dependency for every write and sensitive read. |
| `master-data-contract.json` | Party & Relationship Master | G2 canonical identity source. |
| `crm-core-contract.json` | Client Growth / CRM | G3 pre-Matter source; no Matter direct create. |
| `intake-core-contract.json` | Intake / Conflict / Engagement | G3 mandatory gate source. |
| `matter-core-contract.json` | Matter Management | G4 operational source after clearance. |
| `dms-core-contract.json` | DMS / Knowledge Workspace | G4 document/version/permission source. |
| `email-dms-core-contract.json` | Email DMS | G4/G6 Office-native DMS source. |
| `time-expense-core-contract.json` | Time / Expense | G5 time and expense source. |
| `billing-core-contract.json` | Billing | G5 WIP/prebill/invoice source. |
| `payments-core-contract.json` | Payments | G5 payment source. |
| `settlement-core-contract.json` | Settlement | G5/G7 settlement source. |
| `analytics-core-contract.json` | Analytics / BI | G6 read-model-only source. |
| `ai-governance-core-contract.json` | AI Governance | G6 AI policy source. |
| `ai-legal-workflows-core-contract.json` | Legal Workflows | G6 workflow/human review source. |
| `client-portal-core-contract.json` | Client Portal | G6 portal projection source. |
| `data-room-vdr-core-contract.json` | Data Room / VDR | G6/G7 data room source. |
| `admin-console-contract.json` | Admin / Operations | G7 admin source. |
| `hrx-people-contract.json` | HRX People Module | G7 embedded People source. |
| `integrations-core-contract.json` | Integrations | G7 connector source. |
| `external-integrations-i-contract.json` | Integrations | G7 connector source. |
| `external-integrations-ii-contract.json` | Integrations | G7 connector source. |
| `migration-platform-contract.json` | Migration | G7 migration source. |
| `commercial-readiness-contract.json` | Commercial readiness | G7 launch/commercial source. |
| `enterprise-saas-hardening-contract.json` | Enterprise hardening | G7 enterprise source. |
| `final-product-completion-gate-contract.json` | Final gate | Final completion control. |
| `go-live-gate-contract.json` | Go-live | Launch decision source. |

## G0 Contract Rules

1. Contracts stay where they are during G0.
2. G0 may reference contracts, but must not change contract behavior.
3. Runtime claims must cite both contract status and implementation evidence.
4. Descriptor-only contracts cannot be represented as production-ready runtime.
