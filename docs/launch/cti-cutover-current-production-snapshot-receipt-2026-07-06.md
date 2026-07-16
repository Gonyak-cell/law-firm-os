# CTI CUTOVER Current Production Snapshot Receipt

Status: `PASS`

Goal: `cti-cutover-readonly-efs-snapshot-surface`

Approval signature ref: `I14-CTI-CUTOVER-READONLY-EFS-SNAPSHOT-SURFACE-OWNER-APPROVAL-2026-07-06`

Generated date: `2026-07-06`

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

## Lambda Deployment

| Field | Value |
|---|---|
| Function | `matter-lawos-api-prod` |
| Runtime | `nodejs22.x` |
| Handler | `apps/api/src/lambda.handler` |
| Pre CodeSha256 | `ESTSdyTDZuGldldTzguf67hhvD9tmlYmnhqPvuD2cF4=` |
| Post CodeSha256 | `QPwLXbHH9NOUzN/hENTHVGJ8RnrI7Rkjz4/LrHzuqwA=` |
| Deployment zip sha256 | `40fc0b5db1c7f4d394ccdfe110d4c754627c467ac8ed1923cf8fcbac7ceeab00` |
| State | `Active` |
| LastUpdateStatus | `Successful` |
| FileSystemConfigs | `1` |

The deployment patched `apps/api/src/lambda.js` inside the downloaded pre-I14 deployment zip. No Lambda environment mutation is recorded in this receipt.

## Direct Invoke Result

| Field | Value |
|---|---|
| Invoke status | `200` |
| Function error | `null` |
| Lambda response status | `200` |
| Maintenance action | `cti_cutover_readonly_efs_snapshot` |
| Public HTTP endpoint | `false` |

## Snapshot

| Field | Value |
|---|---|
| Generated at | `2026-07-06T07:08:36.038Z` |
| Snapshot hash | `2ce798915fccf16aff5c25746e8db4478dc5f160b7ebe7ca430833ce7735cffb` |
| Runtime profile | `operational` |
| Allowed root | `/mnt/lawos` |
| Store manifest count | `14` |
| Readable store files | `13` |
| Missing store env count | `0` |
| Read errors | `0` |
| Blocked paths | `0` |

## Snapshot-Bound Restore Rehearsal

| Field | Value |
|---|---|
| Status | `PASS` |
| Isolated boundary | `lambda_ephemeral_tmpdir` |
| Source file count | `13` |
| Restored file count | `13` |
| Checksum mismatches | `0` |
| Receipt hash | `e2020638c06ad0cd0140d5a0aebde852814330d51e6272236c58a9321d9e4e2c` |
| Production write executed | `false` |
| Production restore executed | `false` |

## Boundary

This receipt records a private Lambda direct-invoke read-only snapshot surface. It does not record plaintext file contents, secret values, credentials, tokens, passwords, production writes, production restore, tenant migration, account or permission injection, operational profile switch, bridge token rotation, password issuance or distribution, freeze execution, CUTOVER, S5/S6, OIDC, DB conversion, or production_ready/go-live claim.
