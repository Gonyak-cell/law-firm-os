# LawOS JSON to PostgreSQL source inventory summary

Status: `PASS_SAFE_INVENTORY_WITH_REAL_DATA_ADJUDICATION_REQUIRED`

This is a read-only, PII-safe inventory. It does not select a real-data authority, import a record, contact production, or expose a source value. The canonical detailed artifact is a mode-0600 file outside the repository:

`/Users/jws/.codex/recovery/law-firm-os/json-postgres-private-staging-cut007-20260720-evidence/source-inventory-canonical-v2-20260720.json`

- inventory SHA-256: `b6aec824e107c49e3de3f504298394d1a7cd996fddfc1e23412fc4497256d309`
- candidate sources: 287
- exact-byte duplicates: 84
- manual-review sources: 203
- authoritative sources selected: 0
- corrupt parsed sources: 0
- field paths classified: 857
- silent drops: 0

## Candidate coverage

| Source group | Exists | Candidates | Parsing policy |
|---|---:|---:|---|
| primary runtime stores | yes | 14 | safe structural parse |
| desktop runtime stores | yes | 13 | safe structural parse |
| Electron runtime stores | yes | 13 | safe structural parse |
| local backup generations | yes | 245 | streaming digest and metadata only |
| registered account source | yes | 1 | safe structural parse |
| registered roster source | yes | 1 | safe structural parse |
| additional packaged user-data root | no | 0 | unavailable |
| production EFS and production backup manifests | not contacted | 0 | separate approval required |

Backup parsing is intentionally deferred: all 245 candidates have pseudonymous references, digest, size, mtime, mode, generation reference, and classification, but they remain `manual-review` or `duplicate` until an owner-approved authority manifest selects their lineage. Modification time alone is never used as authority.

## Field disposition contract

| Disposition | Fields |
|---|---:|
| `postgres-live` | 27 |
| `postgres-json-payload` | 814 |
| `derived-recompute` | 1 |
| `encrypted-archive-only` | 0 |
| `secret-excluded` | 15 |
| `synthetic-excluded` | 0 |

All discovered fields have one disposition. Secret-like and raw-byte fields are excluded from PostgreSQL live or JSON payload import. Synthetic exclusion remains zero because none of the candidate files is wholly synthetic; record-level synthetic classification remains part of the later approved source manifest.

## Current-runtime reconciliation

The following counts are scoped only to `runtime-primary` plus the two registered source files. This scope is a reconciliation view, not an authority selection.

| Check | Safe result |
|---|---:|
| registered accounts | 12 |
| roster members | 10 |
| registered accounts without roster row | 2 |
| roster rows without registered account | 0 |
| employees | 12 |
| employee-user links | 12 |
| employees without link | 0 |
| links without employee | 0 |
| professional profiles | 8 |
| career entries | 40 |
| education entries | 18 |
| qualifications | 10 |
| practice areas | 37 |
| lower-case email collisions across different linked identities | 2 |
| distinct matter codes | 152 |
| matter-code collisions across different matter identities | 0 |
| current matter rows missing a matter code | 0 |
| live rows missing tenant context | 0 |
| checked matter/client/employee/DMS/finance/portal missing references | 0 |

The two account-to-roster gaps and two cross-identity email collisions require manual adjudication before any approved-real-manifest import. They do not block synthetic-only CUT-005, CUT-006, or CUT-007.

## Canonicality and stop boundary

- No candidate is `authoritative` until a separate owner-approved source manifest identifies exact digests and lineage.
- The preliminary broad backup scan is non-canonical; it was superseded after the scanner was bounded to store and manifest families. Only the SHA above is canonical.
- Real values, emails, tenant identifiers, credentials, and document bytes are absent from both this summary and the canonical inventory artifact.
- No real-data import, reset email, AWS mutation, production contact, release, signing, or go-live action is authorized by this inventory.
