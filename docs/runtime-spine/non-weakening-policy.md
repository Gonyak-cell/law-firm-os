# Runtime Spine Non-Weakening Policy

Status: enforced by `runtime-spine:plan:validate`
Date: 2026-06-21

## Policy

Runtime Spine work is additive. It may add new runtime packages, APIs, tests, ledgers, and evidence, but it must not mutate the meaning of already closed descriptor-only work.

## Protected Boundaries

| Boundary | Rule |
| --- | --- |
| Closed packs before runtime boundary | Derive only; do not edit manifests to create runtime claims |
| `production_ready` | Preserved exactly; `runtime_ready` is an additional implication gate |
| Descriptor-only evidence | May support planning and coverage, not runtime execution |
| Synthetic fixture evidence | May support tests, not real customer/employee data readiness |
| No-write evidence | Must not be described as durable mutation coverage |
| Existing validators | Must not be weakened to make Runtime Spine pass |

## Disallowed Claims

- `runtime_ready: true` without RTG-001 through RTG-005 evidence.
- Actual launch/go-live completed from repo-only implementation.
- Real tenant data readiness before server-derived AuthN/AuthZ, tenant isolation, and durable audit.
- Vault import/sync readiness before export-only and source-of-truth boundaries are proven.
- HR real data readiness before User/Employee/ExternalUser/Contact separation is proven.

## Required Negative Evidence

Every runtime PR must preserve or add negative tests for at least one relevant failure path:

- tenant mismatch
- forged caller context
- missing or denied permission
- missing audit append
- hidden count/path/raw payload leakage
- feature-locked Portal/HR/AI/M365 route access

## Repo Boundary

This policy intentionally keeps repo implementation evidence separate from production launch authority. A PR can be merged and validators can pass while launch/go-live remains false.
