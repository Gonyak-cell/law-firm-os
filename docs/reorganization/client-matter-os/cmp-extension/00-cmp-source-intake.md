# CMP Source Intake

Status: Proposed
Date: 2026-06-19
Source package: `/Users/jws/Documents/Codex/Client-Matter-People`

## Purpose

This intake records the attached Client-Matter-People package as an extension
candidate for the existing Client-Matter OS planning root. It does not replace
the current `LFOS-*` catalog, and it does not claim runtime readiness.

The package expands the existing Client-Matter scope into a
Client-Matter-People OS with a Vault-backed DMS runtime. The stable absorption
path is to map each `CMP-*` TUW into a repo-native execution lane, then close
runtime gates with evidence before any R4/R5/R6 claim.

## Source Files

| Source | Role | SHA-256 |
| --- | --- | --- |
| `/Users/jws/Documents/Codex/Client-Matter-People/README_Developer_Start_Here.md` | Developer package index | `7faed50ef5299a4bc66434d5dfae35471c07be89e8b337291750a9df85930903` |
| `/Users/jws/Documents/Codex/Client-Matter-People/CMP_OS_Developer_Handoff_Package_v1.0/CMP_OS_TUW_Catalog_v1.0.md` | Human-readable CMP TUW catalog | `cc4788786004e3f15007f407093df382ac483519311403e57d99ae800586334b` |
| `/Users/jws/Documents/Codex/Client-Matter-People/CMP_OS_Developer_Handoff_Package_v1.0/cmp_tuw_catalog.csv` | Structured backlog import | `73604f6be152e74d813e40721af86132d0dedd8fa4c0b71166a7b1249d57d9e5` |
| `/Users/jws/Documents/Codex/Client-Matter-People/CMP_OS_Developer_Handoff_Package_v1.0/cmp_tuw_catalog.json` | Automation source for crosswalk generation | `b738a3dc15c2870067a402824d9d05c57b95a1f3e83e7f0b817989bf21bffd39` |
| `/Users/jws/Documents/Codex/Client-Matter-People/CMP_OS_Developer_Handoff_Package_v1.0/CMP_OS_TUW_Catalog_v1.0.xlsx` | Spreadsheet source of record | `31d2f9343658259e3343a7df4c020d9c51aff18c65d8ad71c04e4fd925c9a862` |
| `/Users/jws/Documents/Codex/Client-Matter-People/CMP_OS_Developer_Handoff_Package_v1.0/CMP_OS_Developer_Handoff_Package_v1.0.docx` | Developer handoff narrative | `40d20797c32d022b8b8a7ad6fffe3cc05ea0f94b7c21659e217c76c72e06fbf2` |

## Gate Counts

| CMP gate | Name | TUWs | Existing lane treatment |
| --- | --- | ---: | --- |
| `CMP-G0` | Product Governance & Architecture Freeze | 21 | Extend current `G0` planning root and ADR set. |
| `CMP-G1` | Trust Foundation Runtime | 24 | Extend current `G1` trust foundation lane. |
| `CMP-G2` | Party & Client Master Runtime | 19 | Extend current `G2` Party Master lane. |
| `CMP-G3` | People / HRX Runtime Foundation | 24 | Split into HRX/People runtime lane after trust and master data gates. |
| `CMP-G4` | Matter Core & Staffing Runtime | 23 | Extend current Matter lane with Employee-backed staffing. |
| `CMP-G5` | Vault-backed DMS / Email / Knowledge Runtime | 32 | Extend current DMS/email/search/data-room lanes into Vault runtime. |
| `CMP-G6` | CRM to Intake to Matter Conversion Runtime | 22 | Extend current CRM/Intake gate and enforce no direct Matter opening. |
| `CMP-G7` | Time / Billing / Finance Runtime | 26 | Extend current Billing/Finance lane with Employee+Matter cost basis. |
| `CMP-G8` | Analytics & Profitability Read Models | 14 | Extend analytics read-model lane without source mutation. |
| `CMP-G9` | AI/RAG Governance Runtime | 18 | Extend AI governance lane with permission-aware retrieval evidence. |
| `CMP-G10` | Portal / Data Room / External Projection Runtime | 17 | Extend portal/data-room projection lane. |
| `CMP-G11` | Client-Matter-People UI/UX Product Console | 48 | Add a UI console lane after backend evidence exists. |
| `CMP-G12` | Enterprise Hardening, Migration, UAT, Launch | 28 | Extend current `G7` hardening, migration, and launch lane. |

## Intake Rules

1. Keep `docs/reorganization/client-matter-os/` as the canonical planning root.
2. Preserve existing `LFOS-*` TUWs until the CMP crosswalk is validated.
3. Treat `CMP-*` rows as extension candidates, not completed work.
4. Do not copy `.zip`, `.DS_Store`, duplicate top-level files, or generated Office
   binaries into the repo unless a later artifact-retention decision requires it.
5. Do not claim R4 or above from this intake. Runtime claims still require
   persistence, write API, permission, audit, state, and idempotency evidence.
