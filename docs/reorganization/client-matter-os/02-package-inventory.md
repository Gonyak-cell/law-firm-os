# Package Inventory

Status: Proposed
Gate: `G0`
TUW: `LFOS-G0-W00-T002`

## Runtime Status Badges

- `R0`: planning only
- `R1`: contract/descriptor ready
- `R2`: fixture/golden case ready
- `R3`: API read ready
- `R4`: runtime write ready
- `R5`: enterprise ready
- `R6`: production certified

## Package Classification

| Package | Target module | Current G0 classification | Notes |
| --- | --- | --- | --- |
| `packages/domain` | Core domain | R1/R2 | Shared model definitions and tests. |
| `packages/authz` | Platform / IAM / Permission | R2/R3 logic | Permission evaluator exists; persistence remains future work. |
| `packages/audit` | Platform / Audit | R1/R2 | Audit concepts exist; durable API wiring remains future work. |
| `packages/control-plane` | Platform / Operations | R1/R2 | Descriptor/control-plane validation surface. |
| `packages/master-data` | Party & Relationship Master | R2/R3 through `apps/api` read surface | Synthetic fixture read surface exists. |
| `packages/matter` | Matter Management | R1/R2 | Matter model/descriptor surface; write runtime is future work. |
| `packages/dms` | DMS / Email / Knowledge Workspace | R1/R2 | Descriptor package; storage/runtime remains future work. |
| `packages/email-dms` | DMS / Email | R1/R2 | Office/email DMS planning and descriptor surface. |
| `packages/search` | Search / DMS / AI support | R1/R2 | Search contract package; permission-aware runtime remains future work. |
| `packages/crm` | Client Growth / CRM | R1/R2 | Descriptor-only; must not create Matter directly. |
| `packages/intake` | Intake / Conflict / Engagement | R1/R2 | Descriptor-only; becomes mandatory gate in G3. |
| `packages/time-expense` | Time / Expense / Billing | R1/R2 | Descriptor-only revenue precursor. |
| `packages/billing` | Time / Billing | R1/R2 | Descriptor-only; runtime invoice lifecycle future work. |
| `packages/payments` | Finance / Payments | R1/R2 | Descriptor-only payment package. |
| `packages/settlement` | Finance / Settlement | R1/R2 | Descriptor-only settlement package. |
| `packages/analytics` | Analytics / BI | R1/R2 | Read-model target; source mutation prohibited. |
| `packages/ai-governance` | AI Governance | R1/R2 | AI policy/governance package. |
| `packages/ai-legal-workflows` | Legal Workflows | R1/R2 | Legal workflow descriptor package. |
| `packages/client-portal` | Client Portal / Data Room | R1/R2 | Portal projection target; external ACL required. |
| `packages/data-room` | Client Portal / VDR | R1/R2 | Data room descriptor package. |
| `packages/admin` | Admin / Operations | R1/R2 | Admin console contract package. |
| `packages/integrations-core` | External Integrations | R1/R2 | Connector/integration core package. |
| `packages/migration` | Migration | R1/R2 | Migration platform package. |
| `packages/finance-integrations` | Finance integrations | R1/R2 | External accounting/export target. |
| `packages/korean-legal` | Korean legal depth | R1/R2 | Jurisdiction-specific legal package. |
| `packages/governance` | Governance | R1/R2 | Governance core package. |
| `packages/enterprise` | Enterprise hardening | R1/R2 | Enterprise SaaS hardening surface. |
| `packages/platform` | Platform extensibility | R1/R2 | Platform extension package. |
| `packages/marketplace` | Marketplace / custom AI apps | R1/R2 | Later marketplace target. |
| `packages/commercial` | Commercial readiness | R1/R2 | Commercial readiness package. |
| `packages/hrx` | HRX People Module | R1/R2 | Embedded People module; do not split into separate product. |

## G0 Decision

The package inventory confirms that G1/G2 must come before G3+ runtime work.
CRM, Intake, Matter, DMS, Billing, Finance, AI, and Portal must not be treated
as production runtime surfaces until their gates have persistence, permission,
audit, state-machine, idempotency, and negative tests.
