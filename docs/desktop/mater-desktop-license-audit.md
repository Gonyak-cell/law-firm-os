# mater Desktop License Audit

Status: P6 audit-active
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`
Scope: `MDT-P6-W02-T03`

## Dependency Snapshot

Command:

```bash
npm ls --workspace apps/desktop --json
```

Observed result: PASS. The current worktree has lockfile metadata for desktop dependencies, but `node_modules` is not installed in this worktree, so `npm ls` does not expand a full dependency tree.

## Desktop Dependencies

| Dependency | Source | License | Redistribution note |
| --- | --- | --- | --- |
| Electron `^42.4.1` | `apps/desktop/package.json`, `package-lock.json` | MIT in lockfile package metadata | Electron redistribution must keep upstream notices and remain separate from any public release approval. |

## Lockfile License Classes

The desktop lockfile slice includes MIT, BSD-2-Clause, and ISC license entries. No GPL-class dependency was added for the desktop package in this lane.

## Redistribution Constraints

- license notices must be bundled with any internal installer before pilot distribution.
- Electron redistribution must follow Electron's license notice requirements.
- Public release redistribution is not approved.
- Owner approval is not recorded.
- Production go-live is false.

## Follow-Up Before Public Release

Before any public release, rerun the audit in an installed dependency environment and attach a complete SBOM receipt with full package names, versions, licenses, and notice files.
