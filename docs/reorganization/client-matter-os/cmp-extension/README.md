# CMP Extension Absorption Plan

Status: Proposed
Date: 2026-06-19

## What This Folder Does

This folder translates the attached Client-Matter-People package into a
repo-native absorption plan. The package contains 316 `CMP-*` TUWs across 13
gates. The current repo already has a validated 198-TUW `LFOS-*` Client-Matter
plan, so the CMP package is absorbed through a crosswalk instead of replacing
the existing catalog in place.

## Files

| File | Purpose |
| --- | --- |
| `00-cmp-source-intake.md` | Registers source paths, hashes, gate counts, and intake rules. |
| `01-cmp-tuw-crosswalk.csv` | Maps all 316 CMP TUWs to repo lanes, existing LFOS anchors, execution batches, and GitHub history units. |
| `02-cmp-stable-implementation-plan.md` | Defines the TUW batch order, branch/commit/PR strategy, validators, and runtime claim boundaries. |

## Absorption Rule

`CMP-*` rows are extension candidates until a row or gate has implementation
evidence. A plan, descriptor, fixture, or synthetic-only result may close a
planning task, but it must not be described as runtime-write-ready.

R4 and higher claims still require the repo's runtime readiness rule:
persistence, write API, permission, audit, state, and idempotency evidence.

