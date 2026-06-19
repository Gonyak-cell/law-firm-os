# CMP v1.0 Baseline Implementation Plan

Status: Proposed
Date: 2026-06-19

## What This Folder Does

This folder translates the attached Client-Matter-People package into the
repo-native CMP v1.0 implementation baseline. The package contains 316 newly
generated `CMP-*` TUWs across 13 gates. The current repo also has an older
198-TUW `LFOS-*` Client-Matter catalog; that catalog remains useful as a legacy
reference anchor, but the CMP package is not merely an extension of it.

## Files

| File | Purpose |
| --- | --- |
| `00-cmp-source-intake.md` | Registers source paths, hashes, gate counts, and intake rules. |
| `cmp-v1-tuw-crosswalk.csv` | Maps all 316 CMP TUWs to legacy LFOS anchors, status, target package, validator impact, and runtime-claim permission. |
| `02-cmp-stable-implementation-plan.md` | Defines the TUW batch order, branch/commit/PR strategy, validators, and runtime claim boundaries. |
| `03-cmp-g1-trust-foundation-runtime-report.md` | Records the first executable CMP-G1 trust foundation API slice, tests, validator, and no-premature-R4 boundary. |
| `04-cmp-g2-party-runtime-report.md` | Records the executable CMP-G2 Party Master API slice, tests, validator, G1 dependency, and no-premature-R4 boundary. |
| `05-cmp-g3-people-hrx-runtime-report.md` | Records the executable CMP-G3 People/HRX boundary API slice, People UI refs, tests, validator, G1/G2 dependencies, and no-premature-R4 boundary. |
| `06-cmp-g4-matter-runtime-report.md` | Records the executable CMP-G4 Matter Core API slice, CRM/Intake clearance dependency, People staffing boundary, tests, validator, and no-premature-R4 boundary. |
| `07-cmp-g5-vault-dms-runtime-report.md` | Records the executable CMP-G5 Vault/DMS API slice, permission-before-search guardrail, Vault write/search/share audit evidence, tests, validator, and no-premature-R4 boundary. |

## Baseline Rule

`CMP-*` rows are the active CMP v1.0 baseline. They are still not completed
until a row or gate has implementation evidence. A plan, descriptor, fixture, or
synthetic-only result may close a planning task, but it must not be described as
runtime-write-ready.

R4 and higher claims still require the repo's runtime readiness rule:
persistence, write API, permission, audit, state, and idempotency evidence.
