# RP00.P00.M01.S01 Finding Adjudication

First Claude C00 verdict: `BLOCK`

Rerun Claude C00 verdict: `PASS_WITH_FINDINGS`

Closeout blocked after rerun: no

## Fixed Findings

1. NARR-018 decision accounting was a non-enforced term list.
   - Original severity: `P1_MUST_FIX`.
   - Decision: fixed.
   - Change: `contracts/control-plane-contract.json` now records all 14 NARR-018 terms as per-term `decision_records` with `status`, `target_rp`, `owner`, and either `decision_ref` or `blocked_claim_ref`.
   - Change: `scripts/validate-rp00-control-plane-contract.mjs` now requires every NARR-018 term to have a matching decision record and enforces resolved/unresolved/blocked evidence.

2. Tenant requirement contracts omitted downstream test, Hermes, and Claude anchors.
   - Original severity: `P2_SHOULD_FIX`.
   - Decision: fixed.
   - Change: each `TEN-001` through `TEN-008` contract row now mirrors `test_anchor`, `hermes_anchor`, `claude_anchor`, and `acceptance_gate_refs` from `docs/spec-requirement-ledger.json`.
   - Change: validator enforces those anchors.

3. Weighted title drift for `RP00.P00.M01.S01`.
   - Original severity: `P2_SHOULD_FIX`.
   - Decision: safely deferred.
   - Owner: Codex.
   - Target: `RP00.P00.M10.S01`.
   - Rationale: weighted ledger IDs, source micro phase, requirement refs, and H00/C00 refs are authoritative and correct. The drift is generator-label behavior for P00 subphase titles, not a requirement or gate trace mismatch.

## Rerun P3 Notes

1. Title-drift deferral target also has a generic label.
   - Decision: recorded.
   - Owner: Codex.
   - Target: `RP00.P00.M10.S01`.
   - Rationale: the M10 handoff should decide whether to update the generator to emit per-subphase labels.

2. NARR-018 unresolved blocked claim refs are forward references.
   - Decision: recorded.
   - Owner: Codex plus each target RP owner.
   - Target RPs: `RP08`, `RP12`, `RP13`, `RP14`, `RP16`, `RP17`, `RP18`, `RP20`, `RP24`, `RP25`.
   - Rationale: this subphase is the contract-draft anchor. Target RPs must instantiate the referenced `BlockedClaim` records or replace them with resolved `decision_ref` values before their own closeout.

## Final Finding State

- P0: 0 unresolved.
- P1: 0 unresolved.
- P2: 0 unresolved.
- P3: 2 recorded.

## Actual Claude CLI Review Repair

Actual C00 was rerun with `claude-opus-4-8` at effort `max` in read-only CLI mode.

- session_id: `47f3580e-03fa-4ea1-8d9c-9ce8804662a3`
- uuid: `3ecec3d2-1cc5-4c39-94cd-53a8079e5e9e`
- verdict: PASS_WITH_FINDINGS
- P0/P1/P2: none
- P3: symbolic NARR-018 blocked refs, weighted title deferral target, and stale evidence line anchors

Disposition: accepted and recorded. Symbolic blocked refs remain valid until target RP closeout, weighted title drift remains deferred to `RP00.P00.M10.S01`, and regenerated review evidence refreshes line-anchor hygiene.
