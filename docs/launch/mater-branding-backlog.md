# mater Branding Backlog

Status: active
Ledger TUW: `MDT-P0-W01-T04`
Product brand: `mater`
UI brand: `mater by AMIC`

## Purpose

This backlog classifies planned product-brand text changes separately from
domain, machine, evidence, and historical references. It prevents the desktop
branding work from rewriting legal-domain terms such as Matter records or
machine identifiers such as `law-firm-os`.

## Classification Values

| Classification | Meaning | Default action |
| --- | --- | --- |
| product_brand | User-facing reference to the application/product named `mater`. | Change from `matter` to `mater` in a scoped TUW. |
| ui_brand | User-facing combined brand `mater by AMIC`. | Source from `UI_BRAND`. |
| domain_object | Legal matter, Matter Core, Matter Vault, matter records, matter IDs, or matter workflow objects. | Preserve. |
| machine_identifier | Package names, API routes, CSS classes, module names, fixture IDs, script names, and repo identifiers. | Preserve. |
| evidence | Validation output, LazyCodex evidence, receipts, audits, and command snippets. | Preserve unless the owning TUW regenerates it. |
| historical | Prior decision records or historical source documents that intentionally mention `matter`. | Preserve and supersede through new `mater` documents. |

## Planned Product/UI Brand Changes

| ID | File | Current text | Target text | Classification | Planned TUW | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MB-001 | `apps/web/src/i18n.js` | `검색하거나 matter에게 질문` | `검색하거나 mater에게 질문` | product_brand | MDT-P0-W02-T03 | complete |
| MB-002 | `apps/web/src/i18n.js` | `Ask matter` | `Ask mater` | product_brand | MDT-P0-W02-T03 | complete |
| MB-003 | `apps/web/src/i18n.js` | `matter 작업공간을 불러오는 중` | `mater 작업공간을 불러오는 중` | product_brand | MDT-P0-W02-T03 | complete |
| MB-004 | `apps/web/src/i18n.js` | `matter는 사건, 문서, 청구, 권한, 감사 로그를 하나의 운영 분석 화면으로 묶습니다.` | `mater는 사건, 문서, 청구, 권한, 감사 로그를 하나의 운영 분석 화면으로 묶습니다.` | product_brand | MDT-P0-W02-T03 | complete |
| MB-005 | `apps/web/src/i18n.js` | `matter 시작하기` | `mater 시작하기` | product_brand | MDT-P0-W02-T03 | complete |
| MB-006 | `apps/web/src/i18n.js` | `matter에 로그인` | `mater에 로그인` | product_brand | MDT-P0-W02-T03 | complete |
| MB-007 | `apps/web/src/i18n.js` | `matter에게 질문` | `mater에게 질문` | product_brand | MDT-P0-W02-T03 | complete |
| MB-008 | `apps/web/src/i18n.js` | `Search or ask matter` | `Search or ask mater` | product_brand | MDT-P0-W02-T03 | complete |
| MB-009 | `apps/web/src/i18n.js` | `Loading your matter workspace` | `Loading your mater workspace` | product_brand | MDT-P0-W02-T03 | complete |
| MB-010 | `apps/web/src/i18n.js` | `matter brings matters, documents, billing, permissions, and audit evidence into one operating analytics surface.` | `mater brings matters, documents, billing, permissions, and audit evidence into one operating analytics surface.` | product_brand | MDT-P0-W02-T03 | complete |
| MB-011 | `apps/web/src/i18n.js` | `Get started with matter` | `Get started with mater` | product_brand | MDT-P0-W02-T03 | complete |
| MB-012 | `apps/web/src/i18n.js` | `Log in to matter` | `Log in to mater` | product_brand | MDT-P0-W02-T03 | complete |
| MB-013 | `apps/web/src/components/Shell.jsx` | `Ask matter for related insights` | `Ask mater for related insights` | product_brand | MDT-P0-W02-T03 | complete |
| MB-014 | `apps/web/src/components/AuthSurface.jsx` | `Receive emails about news from matter` | `Receive emails about news from mater` | product_brand | MDT-P0-W02-T03 | complete |
| MB-015 | `apps/web/src/components/AuthSurface.jsx` | `matter 설정 시작` | `mater 설정 시작` | product_brand | MDT-P0-W02-T03 | complete |
| MB-016 | `apps/web/src/components/AuthSurface.jsx` | `Set up matter` | `Set up mater` | product_brand | MDT-P0-W02-T03 | complete |
| MB-017 | `apps/web/src/components/AuthSurface.jsx` | `운영 데이터를 연결해 matter 작업공간을 완성하세요.` | `운영 데이터를 연결해 mater 작업공간을 완성하세요.` | product_brand | MDT-P0-W02-T03 | complete |
| MB-018 | `apps/web/src/components/AuthSurface.jsx` | `Connect your operating data to finish setting up matter.` | `Connect your operating data to finish setting up mater.` | product_brand | MDT-P0-W02-T03 | complete |
| MB-019 | `apps/web/src/components/AuthSurface.jsx` | `matter-ready-2026` | `mater-ready-2026` | product_brand | MDT-P0-W02-T03 | complete |
| MB-020 | `apps/web/src/components/AuthSurface.jsx` | `finish setting up your matter workspace.` | `finish setting up your mater workspace.` | product_brand | MDT-P0-W02-T03 | complete |
| MB-021 | `apps/web/src/components/MatterModal.jsx` | `Powered by Ask matter.` | `Powered by Ask mater.` | product_brand | MDT-P0-W02-T03 | complete |
| MB-022 | `apps/web/src/components/ThemeSurface.jsx` | `Created By matter` | `Created By mater` | product_brand | MDT-P0-W02-T03 | complete |
| MB-023 | `apps/web/src/components/AskSurface.jsx` | `your matter workspace` | `your mater workspace` | product_brand | MDT-P0-W02-T03 | complete |
| MB-024 | `apps/web/src/components/MatterLogo.jsx` | `matter by AMIC` / `matter` | `UI_BRAND` / `PRODUCT_BRAND` | ui_brand | MDT-P0-W01-T03 | complete |

## Preserve List

| ID | Surface | Examples | Classification | Reason |
| --- | --- | --- | --- | --- |
| MP-001 | Navigation and analytics domain nouns | `Matters`, `Matter Profiles`, `Matter Analytics`, `Top matters` | domain_object | These refer to legal matter records, not the product brand. |
| MP-002 | Matter runtime surfaces | `Matter Core`, `Matter API`, `Matter Home`, `Matter Vault`, `Matter Graph` | domain_object | These name legal-domain modules and data surfaces. |
| MP-003 | Data model and API references | `matter_id`, `/api/matters`, `fetchMatterRecords`, `MatterOpeningWizard` | machine_identifier | Runtime contracts and code identifiers are preserved by `docs/launch/mater-naming-rules.md`. |
| MP-004 | Package and repo names | `law-firm-os`, `@law-firm-os/*`, `packages/matter`, `Law Firm OS` | machine_identifier | Repo, package, and machine names are not product copy. |
| MP-005 | CSS and DOM hooks | `matter-app`, `matter-logo`, `matter-runtime-grid`, `data-cmp-g4-live-matters` | machine_identifier | Style/test hooks stay stable until a separate compatibility TUW exists. |
| MP-006 | Existing launch evidence | `docs/lazycodex/evidence/**`, validator receipts, command output, audit JSON | evidence | Evidence must remain reproducible and historically accurate. |
| MP-007 | Prior naming decisions | `docs/launch/matter-naming-rules.md`, extracted source audits, old decision rows | historical | Old records remain as historical source material and are superseded by `mater` records. |

## Guardrails

- No `apps/desktop` changes belong to this P0 backlog.
- File bridge, native shell, signing, and go-live claims remain out of scope.
- Production go-live, public release, and owner approval remain `false` until explicit receipts are recorded.
