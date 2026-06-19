# CMP Source Intake

Status: Proposed
Date: 2026-06-19
Source package: `/Users/jws/Documents/Codex/Client-Matter-People`

## Purpose

This intake records the attached Client-Matter-People package as the CMP v1.0
TUW baseline for the existing Client-Matter OS planning root. It supersedes the
older 198-TUW `LFOS-*` catalog as the active CMP implementation backlog while
keeping `LFOS-*` rows as legacy reference anchors. It does not claim runtime
readiness.

The package rebuilds the Client-Matter scope as a Client-Matter-People OS with a
Vault-backed DMS runtime. The stable implementation path is to map each `CMP-*`
TUW into a repo-native execution lane, then close runtime gates with evidence
before any R4/R5/R6 claim.

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

Total CMP TUWs: 316
First CMP TUW: `CMP-G0-W00-T001`
Last CMP TUW: `CMP-G12-W12-T028`

| CMP gate | Name | TUWs | Repo implementation treatment |
| --- | --- | ---: | --- |
| `CMP-G0` | Product Governance & Architecture Freeze | 21 | Supersede current `G0` planning rows as the CMP governance baseline. |
| `CMP-G1` | Trust Foundation Runtime | 24 | Supersede current `G1` trust rows with runtime implementation evidence. |
| `CMP-G2` | Party & Client Master Runtime | 19 | Supersede current `G2` Party Master rows with runtime implementation evidence. |
| `CMP-G3` | People / HRX Runtime Foundation | 24 | Split into HRX/People runtime lane after trust and master data gates. |
| `CMP-G4` | Matter Core & Staffing Runtime | 23 | Reordered after CRM/Intake clearance and People/HRX so MatterTeam can reference Employee. |
| `CMP-G5` | Vault-backed DMS / Email / Knowledge Runtime | 32 | Supersede current DMS/email/search/data-room rows with Vault runtime evidence. |
| `CMP-G6` | CRM to Intake to Matter Conversion Runtime | 22 | Reordered before Matter runtime to enforce no direct Matter opening. |
| `CMP-G7` | Time / Billing / Finance Runtime | 26 | Supersede current Billing/Finance rows with Employee+Matter cost basis. |
| `CMP-G8` | Analytics & Profitability Read Models | 14 | Supersede analytics read-model rows without source mutation. |
| `CMP-G9` | AI/RAG Governance Runtime | 18 | Supersede AI governance rows with permission-aware retrieval evidence. |
| `CMP-G10` | Portal / Data Room / External Projection Runtime | 17 | Supersede portal/data-room rows with projection-only runtime evidence. |
| `CMP-G11` | Client-Matter-People UI/UX Product Console | 48 | Add a UI console lane after backend evidence exists. |
| `CMP-G12` | Enterprise Hardening, Migration, UAT, Launch | 28 | Supersede current hardening, migration, and launch rows with R5/R6 evidence. |

## Intake Rules

1. Keep `docs/reorganization/client-matter-os/` as the canonical planning root.
2. Preserve existing `LFOS-*` TUWs as legacy reference anchors.
3. Treat `CMP-*` rows as the active CMP v1.0 implementation backlog, not completed work.
4. Do not copy `.zip`, `.DS_Store`, duplicate top-level files, or generated Office
   binaries into the repo unless a later artifact-retention decision requires it.
5. Do not claim R4 or above from this intake. Runtime claims still require
   persistence, write API, permission, audit, state, and idempotency evidence.
