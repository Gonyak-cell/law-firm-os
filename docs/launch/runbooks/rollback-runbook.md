# Matter Rollback Runbook

Status: `draft_blocked_rfd_tuw_017_code_ready_pending_authority_and_staging_round_trip_evidence`

Work package: LT-L6-W05
TUW: RFD-TUW-017
Updated: 2026-08-01

## Boundary

The local packet, runner, attestation, and validator contracts are implemented.
No AWS, deployment, rollback, signing, notarization, or production action was
performed while preparing this runbook. This document remains `draft_blocked`:
there is no reviewed staging adapter, owner authority, independent attestor
authority, or actual staging `A -> B -> A` / isolated macOS `B -> A` receipt.

Dry-run and fabricated/synthetic observations are never executable evidence.
They cannot create a rollback receipt, final `PASS`, replay seal, or RF13-DIST
sidecar.

## Evidence Boundary

An authoritative staging `PASS` requires all of the following:

1. A private packet with a fresh packet ID, 256-bit execution nonce, expiry,
   exact A/B commit and tree, exact artifacts, API plan, and the full SHA-256 of
   each reviewed adapter module.
2. A packet-owner signature for `lawos-matter-rollback` and a separate owner
   execution checkpoint for `lawos-matter-rollback:execute`. Both sign the
   packet hash, which includes the nonce, adapter allowlist, source/tree, and
   plan digest.
3. A distinct registered attestor key. It signs every raw step receipt with
   action `lawos-matter-rollback:attest` and signs the completed receipt digest
   with action `lawos-matter-rollback:seal`.
4. Exactly one registered API adapter invocation with signed raw steps
   `A_BEFORE`, `B_CURRENT`, `A_ROLLBACK`, followed by exactly one registered
   desktop invocation with signed raw steps `B_CURRENT`, `A_ROLLBACK`.
5. Exact raw-evidence file hashes, step-to-step hash chains, monotonic times,
   packet freshness, final-seal freshness, one run ID, and the packet nonce on
   every step.
6. Exact equality of the canonical durable-readback scope SHA-256, snapshot
   SHA-256, and record count across API `A_BEFORE`, `B_CURRENT`, and
   `A_ROLLBACK`.
7. Durable publication of the requested RF13-DIST sidecar followed by atomic
   one-time consumption of the stable packet/nonce/run/target/platform identity
   in a private replay registry.

Observation labels such as `status: PASS`, `adapter: real`, or
`signing: verified` have no authority. The validator accepts only the signed raw
receipt chain and recomputes the final canonical digest.

## Artifact Provenance

Each A/B manifest verifies the declared Git commit locally and confirms that
the declared tree belongs to that commit. API artifacts are exact byte/hash
descriptors with an SHA-scoped S3 key and non-null `VersionId`.

The macOS application and disk image are bound to a current structured
RFD-TUW-012 `PASS` receipt whose probe mode is `native_live`, approved intake,
formal build manifest, formal release manifest, actual app bundle, actual DMG
bytes, and the exact RF13-DIST macOS sidecar emitted from RFD-TUW-012 strict
live validation. Every packet consumer re-runs that native validator in the
same process and passes its opaque capability to the sidecar consumer. The
packet binds the hashes of both receipts, but serialized fields alone never
carry authority. A structural or injected-runner `TEST_ONLY` receipt, a
hand-written `PASS` label, a cloned validation object, or a plain signing string
is rejected. The archive is separately byte/hash bound.

RFD-TUW-017 supports only the isolated macOS route. It records
`windows_native_qa: null`; it does not claim RFD-TUW-013 Windows execution.
Any future Windows rollback route must add and validate the RFD-TUW-013 native
QA/signing receipt rather than reusing this macOS contract.

## Authority Roles

| Gate | Required authority | Failure state |
| --- | --- | --- |
| Packet approval | Registered owner key, action `lawos-matter-rollback` | `BLOCKED_BY_AUTHORITY` |
| Execution checkpoint | Registered owner key, action `lawos-matter-rollback:execute` | `BLOCKED_BY_AUTHORITY` |
| Raw steps | Different registered attestor key, action `lawos-matter-rollback:attest` | `BLOCKED_BY_EVIDENCE` |
| Final seal | Attestor key, action `lawos-matter-rollback:seal` | `BLOCKED_BY_EVIDENCE` |
| Staging AWS role | Exact profile `matter-staging-admin` | `BLOCKED_BY_AUTHORITY` |
| Production intent | Separate production authority plus exact `matter-prod-deploy-admin` profile | `BLOCKED_BY_AUTHORITY` |

The trust registry must contain separate owner and attestor key IDs. Receipts,
signatures, packets, raw evidence, and replay state must be private,
non-symlink files outside the worktree.

## Safe Packet Preparation

The adapter modules are reviewed first, copied to immutable filenames that
contain their full SHA-256, and then passed to packet preparation. The packet
tool computes their hashes; there is no operator-supplied hash option.

```bash
node scripts/prepare-matter-rollback-packet.mjs \
  --environment staging \
  --current-manifest "$B_MANIFEST" \
  --target-manifest "$A_MANIFEST" \
  --api-adapter-module "$API_ROLLBACK_ADAPTER" \
  --desktop-adapter-module "$DESKTOP_ROLLBACK_ADAPTER" \
  --output "$ROLLBACK_PACKET"
```

The output verdict is `APPROVAL_REQUIRED`. Preparation performs no mutation,
signing, notarization submission, deployment, or rollback. It does perform the
RFD-TUW-012 native read-only app/DMG checks and notary status queries needed to
mint the same-process input capability; the notary profile and network access
must therefore already be authorized.

The plan command never imports a rollback adapter and returns `TEST_ONLY`. It
also revalidates both RFD-TUW-012 boundaries read-only because a serialized
packet cannot preserve their live capability:

```bash
node scripts/run-matter-api-rollback.mjs \
  --mode plan \
  --profile matter-staging-admin \
  --packet "$ROLLBACK_PACKET" \
  --approval-receipt "$PACKET_APPROVAL" \
  --approval-signature "$PACKET_APPROVAL_SIG"
```

The plan must contain only `ApiFunction` and `AdminFunction`, both
`AWS::Lambda::Function` modifications limited to `Code` and `Environment`,
with no replacement, database, bucket, or network changes.

## Authorized Staging Round Trip

These commands are a contract, not evidence that the required external inputs
currently exist.

1. Run API `A -> B -> A` only after owner approval and the separate execution
   checkpoint. The selected module must exactly equal the packet allowlist.

```bash
node scripts/run-matter-api-rollback.mjs \
  --mode execute \
  --adapter real \
  --profile matter-staging-admin \
  --packet "$ROLLBACK_PACKET" \
  --approval-receipt "$PACKET_APPROVAL" \
  --approval-signature "$PACKET_APPROVAL_SIG" \
  --execution-checkpoint-receipt "$EXECUTION_CHECKPOINT" \
  --execution-checkpoint-signature "$EXECUTION_CHECKPOINT_SIG" \
  --adapter-module "$API_ROLLBACK_ADAPTER" \
  --receipt "$ROLLBACK_RECEIPT"
```

The API runner writes `API_ATTESTED`, not `PASS`.

2. Run isolated macOS `B -> A` with the same packet, run ID, receipt, and an
   existing empty user-data directory.

```bash
node scripts/run-matter-desktop-rollback.mjs \
  --platform macos \
  --adapter real \
  --profile matter-staging-admin \
  --packet "$ROLLBACK_PACKET" \
  --isolated-user-data "$EMPTY_ISOLATED_USER_DATA" \
  --adapter-module "$DESKTOP_ROLLBACK_ADAPTER" \
  --receipt "$ROLLBACK_RECEIPT"
```

The desktop runner writes `SEAL_REQUIRED`, not `PASS`.

3. Have the independent attestor sign the exact
   `receipt.canonical_digest`, then validate and consume that seal once.

```bash
node scripts/validate-matter-rollback-receipt.mjs \
  --receipt "$ROLLBACK_RECEIPT" \
  --seal-receipt "$FINAL_SEAL_RECEIPT" \
  --seal-signature "$FINAL_SEAL_SIGNATURE" \
  --replay-registry "$PRIVATE_REPLAY_REGISTRY" \
  --rf13-dist-sidecar "$RF13_DIST_ROLLBACK_SIDECAR"
```

Only this command can return `PASS`. It writes and fsyncs temporary evidence,
validates the bytes, promotes and fsyncs the requested sidecar, then commits the
stable replay marker last. A sidecar failure leaves the identity reusable; a
post-promotion cleanup failure reports an explicit recovery-required evidence
state. Revalidation of the same stable execution identity returns
`MATTER_ROLLBACK_REPLAY_DETECTED`, even with a different seal ID. A failed,
stale, tampered, fabricated, or self-attested receipt creates no authoritative
sidecar.

The serialized rollback sidecar is a compact transport artifact, not standalone
authority. An RF13-DIST consumer must run in the same process with the exact
committed finalization capability and re-read the persisted sidecar hash and
bytes. A copied or hand-authored nine-field `PASS` object is rejected.

## Mutation Telemetry

Every signed raw step records `attempted`, `started`, `completed`, `failed`,
and `unknown`. Authoritative `PASS` requires completed transitions and rejects
failed or unknown states. If control enters an approved adapter and the import,
execution, or evidence validation then fails, CLI failure output reports:

```json
{
  "external_mutation_state": "unknown_or_partial",
  "external_mutation_executed": null,
  "mutation_telemetry": {
    "attempted": true,
    "started": true,
    "completed": false,
    "failed": true,
    "unknown": true
  }
}
```

It never claims `external_mutation_executed: false` after adapter control has
started.

## PASS Observables

| ID | Required observable |
| --- | --- |
| RR-VERIFY-01 | Exact packet, A/B source commit/tree, native-live RFD-TUW-012 receipt and RF13-DIST sidecar, adapters, approvals, checkpoint, and authority file hashes validate. |
| RR-VERIFY-02 | API raw chain is exactly `A -> B -> A`; each health/login check passes and source/artifact/environment/S3 version matches the relevant target. |
| RR-VERIFY-03 | Desktop raw chain is exactly `B -> A`; launch/login/isolation checks pass and RFD-TUW-012/package/DMG/archive hashes match. |
| RR-VERIFY-04 | Durable-readback scope hash, snapshot hash, and record count are exactly equal across all three API steps; all data/database/bucket/network write counts and production contacts are zero. |
| RR-VERIFY-05 | Two registered adapter invocations, fresh monotonic timestamps, one run ID, exact stable final receipt ID, packet nonce, globally unique evidence IDs, raw hash chain, attestor signatures, and final seal all validate. |
| RR-VERIFY-06 | The requested sidecar is durably promoted before the stable replay marker; duplicate finalization is red and any pre-commit sidecar failure leaves the identity retryable. |

## Current Blockers

| State | Missing external evidence |
| --- | --- |
| `BLOCKED_BY_AUTHORITY` | No owner-signed current packet, separate execution checkpoint, or approved exact adapter modules were supplied. |
| `BLOCKED_BY_EVIDENCE` | No current native-live RFD-TUW-012 receipt/sidecar, independent attestor receipts, actual staging API round trip, isolated macOS rollback, final seal, or one-time validator `PASS` exists. |
| Production non-claim | Production rollback was not requested or executed. A staging receipt cannot authorize or prove production rollback. |

The prior LT-L3-W02 deployment/rollback pipeline evidence and LT-L6-W05
tabletop remain separate launch gates. Local code readiness closes neither.
