# CTI S1-G Authenticated Production Probe Receipt

Status: `PASS`

Approval ref: `I18-CTI-S2-PRODUCTION-AUTH-PROBE-PRINCIPAL-OWNER-APPROVAL-2026-07-06`

Source plan: `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`

## Result

S2 production auth code was deployed to `matter-lawos-api-prod`, `LAWOS_AUTH_CREDENTIAL_STORE_PATH` was present, one probe-principal credential record was updated, and the probe completed through the real login/session flow.

## Evidence

- Lambda invoke status: `200`
- Lambda code sha256: `FjmpI+t+zyB4YToT9IPzL8HddRgalcSbcV5CgLO78iM=`
- Credential records after update: `1`
- Credential revision: `2`
- Login status: `200`
- Session status: `200`
- Matter readback status/count: `200` / `0`
- Marker mode: `security_audit_break_glass_marker`
- Marker status: `201`
- Matching audit marker count: `1`
- Matching marker readback count: `1`

Because production matter readback returned zero matter records, the probe used an authenticated security audit marker instead of a matter recently-viewed marker. This proves the production principal/session/audit/readback path without tenant migration, matter creation, or CUTOVER execution.

## Boundary

No public endpoint, debug endpoint, direct token mint, temporary backdoor principal, secret value output, token output, plaintext password output, or credential material output was used or recorded. This receipt does not execute CUTOVER, tenant migration, account/permission injection, operational profile switch, bridge token rotation, password distribution, production restore, S5/S6, OIDC, DB conversion, production_ready, or go-live.
