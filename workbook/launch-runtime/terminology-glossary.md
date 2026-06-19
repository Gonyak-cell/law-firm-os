# Launch Runtime Terminology Glossary

Status: t05_glossary_ready
Work package: LT-L2-W06
Created for: LT-L2-W06-T05
Recorded at: 2026-06-18T11:09:24Z

This glossary is the Wave 1 terminology baseline for launch runtime artifacts. It ingests the product naming decision from [matter Naming Rules](../../docs/launch/matter-naming-rules.md) and the homonym findings from [matter development gap analysis](../matter_dev_docs_gap_analysis.md).

## Product Naming Rule

| Term | Canonical usage | Applies to | Do not use | Source |
|---|---|---|---|---|
| product_brand | `matter` | User-facing product, launch, training, and UI copy when naming the product. | `Matter` as product brand; `Law Firm OS` as user-facing product brand. | [matter Naming Rules](../../docs/launch/matter-naming-rules.md) |
| ui_brand | `matter by AMIC` | UI labels, accessibility labels, product mastheads. | `matter by AMIC Law` in live app source. | [matter Naming Rules](../../docs/launch/matter-naming-rules.md) |
| platform_code_name | `Law Firm OS` | Governance, repository, CP evidence, contracts, validators, machine-readable launch artifacts. | Renaming historical platform evidence to `matter`. | [matter Naming Rules](../../docs/launch/matter-naming-rules.md) |
| machine_identifier | `law-firm-os` | Package IDs, scripts, contract IDs, evidence references. | Branding-driven machine identifier rename. | [matter Naming Rules](../../docs/launch/matter-naming-rules.md) |

## Homonym Resolution

| Homonym | Ambiguous meanings | Canonical launch terms | Rule | Source |
|---|---|---|---|---|
| Activity | Billing time-capture signal vs CRM sales activity. | `activity_signal` for billing/time-capture; `crm_activity` for CRM object. | Never use bare `Activity` in new launch runtime specs when either meaning is intended. | [matter terminology map](../../docs/matter-pack-integration/matter-terminology-map.md) |
| Lead | Matter lifecycle stage vs CRM lead object. | `matter_stage_lead` for lifecycle; `crm_lead` for CRM object. | Do not map Matter state `Lead` to CRM lead without explicit conversion rule. | [matter terminology map](../../docs/matter-pack-integration/matter-terminology-map.md) |
| Contact | Matter participant/role object vs ContactPoint communication value. | `matter_participant_role` for matter role; `contact_point` for email/phone/address value. | New specs must say whether they mean a person-role relationship or a communication endpoint. | [matter terminology map](../../docs/matter-pack-integration/matter-terminology-map.md) |
| Loop | Product development loop methodology vs AI orchestration/loop-system. | `methodology_loop` for product-development loop; `loop_system` for AI orchestration harness. | Do not treat loop-system implementation as satisfying methodology-loop governance without a separate mapping. | [matter terminology map](../../docs/matter-pack-integration/matter-terminology-map.md) |
| P-기호 | Product pillar P0-P14 vs priority P0-P2 vs implementation P0.x vs RP unit phase segment. | `PILLAR-P00` through `PILLAR-P14` for product pillars; `priority:P0/P1/P2` for severity; `phase:P0.x` for implementation planning; `RPxx.Pyy` for unit phase segments. | Bare `P0`, `P1`, or `P2` is forbidden in new launch specs unless the namespace is explicit. | [absorption master track](../absorption-package/02_마스터_흡수트랙_계획.md) |

## Exception List For Historical References

| Pattern | Allowed existing context | Reason |
|---|---|---|
| `matter by AMIC Law` | Historical plan text that describes the old mismatch; `docs/ui-reference/prototypes/matter-by-amic-logo-animation.html` legacy prototype. | These are not live app source. L4-5 may clean prototype copy separately. |
| `Law Firm OS` | Platform code name, repo governance, closeout evidence, contracts, scripts, and validators. | MAT-DEC-04 keeps platform and machine identifiers stable. |

## Verification Patterns

| Check | Required result |
|---|---|
| Glossary item count | 6 rows: product naming rule group plus five homonym rows. |
| Markdown links | All relative links in this file resolve from `workbook/launch-runtime/`. |
| Live app old UI brand phrase | `apps/web/src` contains 0 instances of `matter by AMIC Law`. |

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` in closeout evidence and is not valid review evidence.
