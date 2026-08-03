# RFD-TUW-018 canary and RF13-DIST sealing

Status: `BLOCKED_BY_ARTIFACT/AUTHORITY`

This runbook describes the final distribution boundary. The checked-in files under `docs/launch/evidence/rfd-tuw-018/` are blocked templates and sanitized synthetic test data. They are not package, deployment, canary, signing, release, or go-live evidence.

No canary, API contact, deployment, signing, notarization, publication, production action, or rollback was performed while producing this implementation. The historical internal RF13 receipt is never accepted by RF13-DIST.

## Current blockers

An operational `PASS` cannot be produced from this worktree today:

- no tracked RFD-TUW-016 installed-app restart adapter is registered;
- no tracked RFD-TUW-018 actual canary adapter is registered;
- the RFD-TUW-003 operational Ed25519 signer allowlist is empty;
- the checked-in RF13-DIST and canary documents are templates, not current exact-SHA formal artifacts.

The file-only validator is intentionally read-only. It cannot recreate module-private capabilities from JSON, so a final file-only invocation remains blocked even when sidecar fields and hashes are mutually consistent.

## Required same-process chain

Every final gate must bind the same full source SHA, source tree, and exact staged artifact bytes.

| Gate | Required authority |
|---|---|
| Privacy | RFD-TUW-007 live scan capabilities for every indexed artifact and the expanded Windows package directory, plus the canonical privacy index |
| macOS release | RFD-TUW-012 live native validation of the exact app and DMG bytes |
| Windows native/release | RFD-TUW-013 strict native QA and its canonical release decision; signing may remain authority-blocked |
| Package QA | RFD-TUW-014 opaque native-package capability from the canonical OS launcher and reader |
| Exact-source API and login | RFD-TUW-015 opaque deployed-API capability, itself bound to RFD-TUW-014 |
| Restart | RFD-TUW-016 opaque two-launch capability, itself bound to RFD-TUW-015 |
| Rollback | RFD-TUW-017 same-process finalized rollback validation |
| Canary acceptance | RFD-TUW-018 actual installed-package observation plus RFD-TUW-003 signed human authority |
| Production go-live | Separate RFD-TUW-003 signed production authority, only when that claim is requested |

Serialization, `structuredClone`, a hand-written sidecar, a test adapter, a synthetic fixture, or a source-only check does not preserve any opaque capability.

## Safe local checks

These commands do not contact a network or mutate release state. Exit code `3` means the input is valid but deliberately blocked.

```bash
node scripts/validate-rf13-dist-manifest.mjs \
  --manifest docs/launch/evidence/rfd-tuw-018/rf13-dist-manifest.blocked.json

node scripts/validate-rfd018-canary-receipt.mjs \
  --receipt docs/launch/evidence/rfd-tuw-018/canary-receipt.blocked.json \
  --source-sha 0000000000000000000000000000000000000000 \
  --source-tree 0000000000000000000000000000000000000000 \
  --artifact-sha256 0000000000000000000000000000000000000000000000000000000000000000

node scripts/run-rfd018-canary-monitor.mjs \
  --fixture docs/launch/evidence/rfd-tuw-018/canary-observation.synthetic.json
```

The synthetic fixture contains only one or two anonymous observation sets. Names, emails, account/user/tenant/employee identifiers, credentials, private-photo hashes, roster hashes, and contact hashes are forbidden.

## Rollback-trigger test

The local injection mode tests trigger classification only. It never launches the package or executes rollback.

```bash
node scripts/run-rfd018-canary-monitor.mjs \
  --fixture docs/launch/evidence/rfd-tuw-018/canary-observation.synthetic.json \
  --inject-trigger CORE_READ_CONSECUTIVE_FAILURE
```

Supported codes are `LOGIN_OR_SESSION_FAILURE`, `TENANT_DATA_EXPOSURE`, `WRITE_DUPLICATION_OR_AR_MISMATCH`, `UNCERTAIN_WRITE_RESULT`, `CORE_READ_CONSECUTIVE_FAILURE`, `LATENCY_REGRESSION`, and `SIGNATURE_OR_HASH_MISMATCH`.

Latency injection requires five samples above twice the baseline median and five delayed samples, at least five minutes later, that remain above the same threshold. Synthetic output always stays `BLOCKED` and records `ROLLBACK_REQUIRED` when a trigger is active.

## Actual canary entrypoint

`runAuthoritativeRfd018Canary()` is a same-process API, not a JSON-to-PASS CLI. It accepts only the opaque RFD-TUW-014 package capability, the RFD-TUW-015 private receipt path, repository root, source SHA/tree, artifact SHA-256, and API endpoint SHA-256. Caller-provided observations, adapters, fixtures, and trigger results are rejected.

The function validates RFD-TUW-014, reads and validates RFD-TUW-015 with that exact capability, and then invokes the fixed RFD-TUW-016 contract with the tracked installed-app adapter constant. Because that adapter is currently absent, it returns `BLOCKED_BY_ARTIFACT/AUTHORITY` before package launch. Even if all upstream capabilities later pass, `runRfd018ActualCanary()` remains blocked until a reviewed tracked actual-canary adapter is added in source.

Only that future tracked adapter may observe an installed package and mint the module-private RFD-TUW-018 capability. A valid canary requires one or two users, an isolated-profile installation, all runtime checks, a monitor window of at least 15 minutes, five covered latency actions with initial and delayed samples, one real rollback-trigger injection proof, no active trigger in the accepted observation, no identity or private hashes in the receipt, and exact source/tree/DMG bindings.

## Privacy index and artifacts

The final release root is fixed:

```text
apps/desktop/dist/releases/<version>/<full-source-sha>/formal/
```

`artifact-index.json` and `checksums.sha256` must exactly cover the 12 indexed macOS and Windows artifacts. `evidence/privacy-index.json` must additionally cover `windows_package_directory`, for 13 privacy members in total. Each index member binds the source SHA/tree, formal channel, corpus hash, artifact kind/hash/bytes, receipt hash/bytes, and a live RFD-TUW-007 capability.

ZIP, DMG, unsigned-package ZIP, and the expanded Windows directory require canonical member manifests and live expanded-member validation. The NSIS installer requires both the builder receipt and the actual RFD-TUW-013 native installed-tree/uninstall completion. Raw archive-byte scanning, a forged member manifest, or one NSIS phase alone cannot pass.

## Signed human authority

Canary acceptance and optional production go-live use `law-firm-os.rf13-dist.human-authority-receipt.v1`, verified by the RFD-TUW-003 canonical reader. The signed payload binds:

- release ID, environment, and action;
- exact source SHA/tree and sorted artifact hashes;
- release scope and canary user count;
- issue/expiry timestamps and a unique nonce;
- an Ed25519 detached signature from the tracked action/scope allowlist.

The receipt and signature must be private regular files owned by the current operator. Test-only keys cannot enter the operational allowlist. The current production allowlist is empty, so a signed operational canary or go-live receipt cannot yet be accepted.

## Sealing and one-time action consumption

`validateRf13DistManifest()` validates blocked templates and the structural/live gate chain but does not consume authority. A final `PASS` requires the same-process `sealRf13DistManifest()` API with all live capabilities.

The sealer first completes every artifact, gate, privacy, macOS, Windows, package, API, login, restart, rollback, canary, and human-authority check. Only that private validation path can mint the same-process final-sealer capability accepted by the durable writer. A copied, serialized, or hand-written capability is rejected, and no public low-level operational commit API exists.

Operational receipts use one per-user OS namespace outside every repository copy:

```text
macOS:   ~/Library/Application Support/com.amic.matter.desktop/rf13-dist-authority-ledger/v2/
Windows: ~/AppData/Local/com.amic.matter.desktop/rf13-dist-authority-ledger/v2/
Linux:   ~/.local/state/com.amic.matter.desktop/rf13-dist-authority-ledger/v2/
```

The root is derived internally from the current OS user; the caller cannot select it with `repoRoot`, a release path, an environment variable, or a test override. Directories and files are private, non-symlink, current-owner state with POSIX modes `0700` and `0600` where those mode bits apply. The release ID must equal `RF13-DIST-<version>-<full-source-sha>`. Each action slot binds the ledger schema, release, environment, action, source SHA/tree, and artifact hashes. Its binding and consumption key additionally bind the authority receipt, nonce, signing key ID and fingerprint, signature hash, and signed-payload hash. Identical release actions launched from copied repositories therefore resolve to the same slot.

Test isolation uses an opaque `TEST_ONLY` fixture minted under the OS temporary directory. Its receipt schema, status, and `operational=false` marker are separate from the operational ledger, so it can never yield or stand in for `PASS`.

Each action uses a write-ahead directory with a canonical owner, binding, phase, and recovery record before receipt publication. A live owner blocks a second writer. A proven-dead owner with the exact binding is quarantined as an auditable orphan and retried; a conflicting, malformed, or unverifiable orphan fails with `AUTHORITY_CONSUMPTION_RECOVERY_REQUIRED`. If the process dies after receipt publication, the next exact attempt verifies the target first, quarantines the dead write-ahead record, and returns the same receipt bytes without rewriting the inode.

Each receipt and write-ahead transition is fsynced, atomically renamed where applicable, and read back. Exact replay returns the existing bytes without rewriting them. A changed nonce, receipt, or signing-key identity for an occupied action slot fails. Canary and production actions, when both requested, are two separately atomic action commits rather than one multi-action transaction.

## Release sequence

Do not skip gates or infer them from green source tests:

1. Produce clean exact-SHA formal artifacts and the canonical release index.
2. Obtain live RFD-TUW-007, 012, 013, and 014 evidence on those exact bytes.
3. Deploy the exact source through the authorized private-staging path and obtain RFD-TUW-015.
4. Run the tracked installed app twice and obtain RFD-TUW-016.
5. Execute and finalize the RFD-TUW-017 rollback proof.
6. Run the tracked one-or-two-user canary and rollback-trigger injection, then obtain signed canary authority.
7. In one process, call `sealRf13DistManifest()` with every opaque capability.
8. If production go-live is requested, obtain its separate signed authority and consume that action during sealing.
9. Keep source merge, CI, package proof, deployment, release, and logged-in go-live verification as separate recorded gates.

`windows_release=BLOCKED_BY_AUTHORITY` is allowed only with strict Windows native QA and the canonical unsigned decision. In that state `windows_external_distribution_ready=false`, production scope is `macos_primary`, and no Windows readiness claim is allowed. Windows `PASS` requires the approved signer path and changes production scope to `all_platforms`.
