# mater Naming Rules

Status: adopted_from_owner_decision
Recorded at: 2026-06-21
Work package: MDT-P0-W01
Decision source: owner instruction in the mater desktop implementation goal.

## Four-Layer Naming Table

| Layer | Required value | Rule |
| --- | --- | --- |
| Product brand | mater | Use lowercase `mater` in user-facing product, training, help, launch, and live UI copy. |
| UI brand | mater by AMIC | Use this phrase for splash, About, login/onboarding masthead, and accessibility labels. |
| Platform/repository code name | Law Firm OS | Keep this value in governance, repo, closeout, implementation evidence, architecture docs, and historical contexts. |
| Machine identifier | `law-firm-os` | Keep package, contract, script, validator, file, ledger, and evidence identifiers stable unless a separately approved migration plan exists. |

## Rename Ban

Do not rename package names, product-contract IDs, script names, closeout-pack references, ledger IDs, historical evidence links, validators, or package folders solely for product branding.

Preserved identifiers include:

- `Law Firm OS`
- `law-firm-os`
- `@law-firm-os/*`
- `packages/matter`
- `matter_id`
- historical closeout and launch evidence that recorded the earlier `matter` decision

## String Classification Rule

Every `matter` or `Law Firm OS` string must be classified before modification.

| Classification | Action |
| --- | --- |
| `product_brand` | Change user-facing product-brand misuse to `mater`. |
| `ui_brand` | Change user-facing UI brand misuse to `mater by AMIC`. |
| `domain_object` | Preserve when the string refers to Matter as a legal domain object, route concept, entity, or workspace object. |
| `machine_identifier` | Preserve when the string is part of package names, contract IDs, script names, paths, schema IDs, or ledger IDs. |
| `historical_evidence` | Preserve in closed evidence, prior decision records, closeout packs, receipts, and audit trails. |

## P0 Scope

P0 may update live web UI copy, brand constants, splash/logo derivatives, and branding validators. P0 must not create `apps/desktop`, implement auth/session, implement file bridge, implement deep links, rename package identifiers, or claim pilot/public release readiness.

## Review Policy

This document is a repo-local planning and implementation guardrail. It does not approve production go-live, public release, signed distribution, or owner go/no-go.
