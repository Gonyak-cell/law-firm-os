# Profile photo generation-switch rehearsal

This is the source contract for RFD-TUW-041 and the structural measurement
input for RFD-TUW-042. It grants no production authority. This repository has
no independently operated production-capability verifier, so the production
decision remains `BLOCKED_BY_EVIDENCE`. A source-authored sentinel, journal,
repository copy, receipt, or desktop marker cannot change that state.

## TEST_ONLY root

The included runners accept only a disposable canonical root whose owner-only
sentinel has schema `law-firm-os.profile-photo-safe-root.v2` and environment
`TEST_ONLY`. They reject `/`, broad roots, relative roots, symlinked roots, and
sentinels labeled `production`. The root contains:

- `.lawos-profile-media-root.json` and
  `.lawos-profile-media-operations.jsonl`;
- `incoming/<opaque-change-ref>/`, containing the proposed ten PNGs;
- `generations/<opaque-generation-ref>/`, containing immutable generation
  directories;
- `active`, a relative symlink to exactly one directory under `generations`;
- owner-only `.manifests/` and `.operations/` directories.

Change refs use `profile_change_` plus 32 lowercase hex characters. They are
generated opaque identifiers, not operator names, ticket titles, client names,
or employee identifiers. All operation paths are derived from the root and
opaque ref; callers cannot supply a live path, pointer target, generation,
manifest, or operation-record path.

Each generation must contain exactly ten regular, non-symlink files with
lowercase 64-hex `.png` filenames. Validation covers PNG signature, raw ASCII
chunk-type bytes and the reserved bit, chunk framing and order, IHDR, CRCs,
IDAT inflation, decoded scanline sizes and filters, IEND, trailing bytes, and
distinct content digests. Names, email addresses, raw employee IDs, photo
bytes, photo hashes, tokens, response bodies, and absolute journal paths do not
belong in public receipts or terminal logs.

## Prepare and atomic switch

Run a disposable-root dry-run before any TEST_ONLY execution:

```bash
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
  node scripts/run-profile-photo-server-operation.mjs prepare \
  --test-only \
  --root "$PROFILE_MEDIA_TEST_ROOT" \
  --change-ref "$PROFILE_MEDIA_CHANGE_REF"
```

Adding `--execute` copies the candidate to a temporary generation, validates
and synchronizes every file, renames it into `generations/`, writes the private
baseline/candidate manifests and operation record, and synchronizes their
directories. It does not change `active`.

Promotion and rollback never rename `active` away. They create a derived
temporary relative symlink, synchronize the root, and perform one same-directory
`rename` over `active`. POSIX rename is the sole visibility switch: process
death before it leaves the old generation active; process death after it leaves
the new generation active. The root is synchronized again after the switch.
Crash-point tests cover before pointer preparation, after pointer preparation,
after the rename, and after directory synchronization for both promotion and
rollback. They also cover candidate copy, candidate file synchronization,
generation publication, candidate removal, metadata removal, and cleanup
durability. Rollback handles both old-active and new-active crash outcomes and
restores the exact baseline with the same one-rename pointer switch.

An interrupted temporary pointer is accepted only when it targets one of the
two opaque generations in the private operation record. Rollback removes that
exact temporary pointer. Unknown stale paths, dangling or escaping pointers,
generation drift, manifest drift, or non-file generation entries stop the
operation. Cleanup runs only with the baseline active and removes only the
derived candidate generation and that operation's private metadata.

## Ten-profile API proof

The smoke harness requires the exact ordered cohort `profile_slot_01` through
`profile_slot_10`, kept in memory. For every response it requires:

- HTTP 200, `outcome=passed`, `ui_state=populated`, and
  `photo_included=true`;
- a canonical `data:image/png;base64,` payload;
- successful strict base64 decoding and full PNG structural decoding;
- the expected active opaque generation from
  `x-lawos-profile-photo-generation`;
- a SHA-256 digest equal to the private manifest entry for that exact slot.

Stale generations, swapped slot payloads, malformed base64, undecodable PNGs,
and structurally valid wrong PNGs fail. Public results contain only ten-of-ten
counters for status, UI state, decode, generation match, and digest match.

## Structural measurement only

The measurement runner is also TEST_ONLY. It requires `--test-only`, an HTTPS
API adapter for execution, and an independently supplied canonical desktop
marker path. A receipt path uses only the 32-hex suffix:

```bash
PROFILE_MEDIA_CHANGE_SUFFIX="${PROFILE_MEDIA_CHANGE_REF#profile_change_}"
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
  node scripts/run-profile-media-operability-measurement.mjs \
  --test-only \
  --root "$PROFILE_MEDIA_TEST_ROOT" \
  --change-ref "$PROFILE_MEDIA_CHANGE_REF" \
  --receipt "$PWD/.omo/evidence/profile-media-operability-measurement-$PROFILE_MEDIA_CHANGE_SUFFIX.json"
```

The execute path promotes with the atomic pointer, proves candidate 10/10,
rolls back with the atomic pointer, verifies all baseline hashes, proves
baseline 10/10, checks that the desktop marker bytes and filesystem state did
not change, cleans the candidate, appends one journal event, and writes an
owner-only aggregate receipt. Failure after promotion triggers baseline
rollback and baseline 10/10; no passing receipt is written.

The TEST_ONLY validator is separate from the production decision validator. It
independently resolves and re-reads the supplied repository root, complete
measurement source set, TEST_ONLY root and journal, receipt bytes, admin-Goal
test paths when selected, and desktop marker bytes. Receipt fields contain no
absolute journal or marker paths.

## Production decision boundary

The decision schema is
`law-firm-os.profile-media-operability-decision.v3`. The public production
validator deliberately rejects every `DECIDED` record with
`PRODUCTION_CAPABILITY_UNAVAILABLE`, including a bundle that labels its own
sentinel or receipt `production`. The source-only TEST_ONLY validator can
exercise threshold and admin-Goal policy, but its result includes
`environment=TEST_ONLY` and is not accepted by the CLI or live production
authorization path.

The checked-in owner record therefore remains schema
`law-firm-os.profile-media-operability-blocker.v1`, status
`BLOCKED_BY_EVIDENCE`, with no production profile mutation, deployment, or
desktop reinstall. Validate it with:

```bash
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
  node scripts/validate-profile-media-operability-decision.mjs \
  --decision .omo/evidence/profile-media-operability-decision.json
```

Exit 2 is the honest blocker. Exit 1 means an invalid or unauthorized decision;
there is no source-local path to exit 0. A future production path needs a
separately governed operator capability that independently selects and re-reads
the deployed source revision, canonical production journal, packaged desktop
marker, active-generation API header, and exact ten-slot content before the
validator may gain an exit-0 implementation.

## Source verification

```bash
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
  node --test \
  scripts/test/profile-photo-replacement-manifest.test.mjs \
  scripts/test/profile-photo-server-operation.test.mjs \
  scripts/test/profile-photo-live-operation.test.mjs \
  scripts/test/profile-media-operability-measurement.test.mjs \
  scripts/test/profile-media-operability-decision.test.mjs
```
