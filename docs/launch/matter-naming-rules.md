# matter Naming Rules

Status: adopted_from_owner_decision
Recorded at: 2026-06-18T10:06:17Z
Work package: LT-PRE-W07
Decision source: `workbook/matter-post-cp-launch-plan.md` section 1 records the 2026-06-12 owner instruction that the product name is matter.

## Four-Layer Naming Table

| Layer | Required display | Rule |
|---|---|---|
| Product brand | matter | Use lowercase `matter` in user-facing product, training, and launch materials. |
| UI brand | matter by AMIC | Use this phrase for user-visible UI brand labels and accessibility labels. |
| Platform/repository code name | Law Firm OS | Keep this name in governance, repo, closeout, and implementation evidence contexts. |
| Machine identifier | `law-firm-os` | Keep package, contract, script, file, and evidence identifiers stable. |

## Machine Identifier Rename Ban

기계 식별자 리네이밍 금지: package names, product-contract IDs, script names, closeout-pack references, ledger IDs, and historical evidence links must not be renamed from `law-firm-os` or Law Firm OS solely for product branding.

Reason: closed CP evidence, manifests, validators, and launch ledgers already point to these identifiers. Renaming them for display copy would weaken traceability and create avoidable reference drift.

## New Artifact Rule

New user-facing artifacts should use `matter` for the product brand and `matter by AMIC` for UI brand labels. New governance, machine, validation, and evidence artifacts should preserve Law Firm OS and `law-firm-os` identifiers unless a separately approved migration plan exists.

## L2-6 Glossary Intake

L2-6 enum and terminology alignment must ingest this naming rule set:

| Glossary item | Canonical value | Intake note |
|---|---|---|
| product_brand | matter | Lowercase user-facing product name. |
| ui_brand | matter by AMIC | UI copy and accessibility labels. |
| platform_code_name | Law Firm OS | Governance/repo/evidence contexts. |
| machine_identifier | `law-firm-os` | No rename without approved migration plan. |

## Checklist Crosswalk

| Checklist item | Evidence | Status |
|---|---|---|
| Product strategy declaration sections 7 and 8 updated | `docs/product-strategy-declaration.md` | 완료 |
| Decision register MAT-DEC-04 updated | `workbook/absorption-package/06_오픈_결정_레지스터.md` | 완료 |
| User-visible UI brand string aligned | `apps/web/src/components/MatterLogo.jsx` | 완료 |
| L2-6 glossary intake item specified | This document, L2-6 Glossary Intake | 완료 |
| New artifact naming rule specified | This document, New Artifact Rule | 완료 |

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
