# CMP R4 Intake Root

Status: source-intake-baseline
Package date: 2026-06-20
Current repo ref: codex/hrx-release-go-no-go-package@272156503

This folder is the repo-local intake layer for the CMP R4 developer roadmap package. It supersedes nothing in the older 198-TUW Client-Matter OS reorganization plan; it adds the broader 316-TUW Client-Matter-People R4 target.

## Goal

Move Law Firm OS from descriptor/API-evidence surfaces toward CMP R4 runtime-write-ready implementation and R5/R6 owner-decision-ready release evidence.

## Non-Claim Boundary

- The current repo does not claim CMP R4 complete.
- The current repo does not claim production-ready or go-live.
- Descriptor-only, synthetic-only, runtime API evidence only, and durable persistence open states remain blockers.

## Primary Artifacts

| Artifact | Purpose |
| --- | --- |
| 00-cmp-source-intake.md | Source package hash, inventory, and package manifest |
| cmp-v1-tuw-crosswalk.csv/json | 316-row source-to-repo TUW crosswalk |
| runtime-readiness-standard.md | R0-R6 and R4/R5/R6 claim rules |
| roadmap-calendar.md | G0-G12 gate order and dependency correction |
| g0-closeout.md | G0 review checklist and approval fields |

## Validation

```sh
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-v1:blockers:baseline
```
