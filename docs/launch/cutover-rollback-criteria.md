# Cutover Rollback Criteria

Status: approved_for_cti_cutover_post_i18_snapshot_rebind
Work package: LT-L8-W03
TUW: LT-L8-W03-T02
Prepared at: 2026-06-18T12:21:08Z
CTI approval signature ref: I15-CTI-CUTOVER-ROLLBACK-ABORT-CRITERIA-OWNER-APPROVAL-2026-07-06
CTI post-I18 rebind approval ref: I19-CTI-CUTOVER-POST-I18-SNAPSHOT-REBIND-OWNER-APPROVAL-2026-07-06
CTI snapshot receipt: docs/launch/cti-cutover-execute-precheck-live-snapshot-receipt-2026-07-06.json
CTI snapshot hash: b4139c730895d173cf964a92fa6ba375c93cefcb13687b0f82732c4c0531da49
CTI restore rehearsal: PASS (15 source / 15 restored / 0 checksum mismatches)
CTI superseded snapshot hash: 2ce798915fccf16aff5c25746e8db4478dc5f160b7ebe7ca430833ce7735cffb

## Boundary

This is an approved CTI CUTOVER rollback/abort criteria input. It does not
execute rollback, production restore, production write, CUTOVER, tenant
migration, account/permission injection, operational profile switch, bridge
token rotation, password issuance/distribution, freeze execution,
production_ready, or go-live.

Rollback execution remains allowed only inside a separately opened CUTOVER
execute goal, only after a failure condition matches this criteria, and only
against the I19-rebound post-I18 production snapshot and restore rehearsal
receipt listed above.

## Owner Decision

| Required field | Current status |
| --- | --- |
| S1 trigger definition | approved for CTI: any CUTOVER step failure that blocks authentication, tenant isolation, account permission correctness, data readback integrity, or first-login validation after the abort threshold |
| 48-hour rollback window | approved for CTI: rollback decision window opens at CUTOVER failure detection and closes 48 hours later unless owner records an earlier abort/rollback decision |
| Decision authority real-person role | approved for CTI: owner approval signature ref I15 governs criteria; actual rollback execution still requires CUTOVER execute failure-state evidence |
| Pilot-scope return procedure | approved for CTI: restore only to the I19-rebound post-I18 snapshot boundary, then re-run CUT-G and first-login validation before any release claim |
| Signature reference | I15-CTI-CUTOVER-ROLLBACK-ABORT-CRITERIA-OWNER-APPROVAL-2026-07-06; I19-CTI-CUTOVER-POST-I18-SNAPSHOT-REBIND-OWNER-APPROVAL-2026-07-06 |

## Abort Criteria

CUTOVER execute must abort before the next irreversible step when any of these
conditions are observed:

- verified snapshot hash or restore rehearsal receipt is missing or mismatched;
- freeze state is not confirmed before production mutation begins;
- operational profile switch fails health/readback checks;
- tenant migration dry-run/result count mismatches approved input counts;
- account/permission injection would grant access outside I1/I2/I3 approved scope;
- bridge token control cannot be rotated/applied without exposing token material;
- password issuance/distribution cannot satisfy I3 in-person boundary;
- first-login validation fails for required validation principals;
- PII-safe evidence or receipt generation fails.

## Rollback Criteria

Rollback is permitted only during the CUTOVER execute goal after a matching
failure condition is recorded. Production restore is permitted only to the
I15-bound verified snapshot boundary and only when the CUTOVER execute goal's
rollback path records:

- failure condition and affected step;
- snapshot hash `b4139c730895d173cf964a92fa6ba375c93cefcb13687b0f82732c4c0531da49`;
- restore rehearsal status `PASS` with 15 source files, 15 restored files, and 0 checksum mismatches;
- rollback decision timestamp inside the 48-hour window;
- hash/count evidence before and after restore;
- no plaintext PII, credential, token, or password material in repo evidence.
