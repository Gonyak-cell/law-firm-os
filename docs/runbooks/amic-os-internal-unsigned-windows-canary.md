# Runbook: AMIC OS internal-unsigned Windows host state canary

**Owner:** AMIC internal operations | **Frequency:** Per internal candidate
**Last updated:** 2026-09-04 | **Last run:** Not yet run for the current candidate

## Purpose

Collect tamper-checked, durable `preinstall → installed → postuninstall`
receipts from `JWS-GALAXYBOOK` without installing, launching, stopping, or
uninstalling anything from the collector itself. The three receipts prove only
the Windows-visible product state `0 → 1 → 0`. They do not prove the private
download, Windows warning and acceptance, sign-in, server data, Outlook action,
update, rollback, or hosted-data-preservation portions of gate G9.

## Prerequisites

- [ ] The exact candidate version, source SHA, source tree, and installer
      SHA-256 have been obtained from the independently verified private
      distribution receipt. Do not transcribe them from a filename.
- [ ] PowerShell 7.2 or newer is installed on `JWS-GALAXYBOOK`.
- [ ] The operator is signed into the same Windows account that will run AMIC
      OS. HKCU protocol and Outlook registration are account-scoped.
- [ ] The collector and native scanner below were copied together from the
      exact reviewed source SHA. Their hashes were checked after transfer:
      `scripts/collect-amic-os-internal-windows-state.ps1` and
      `scripts/windows-installed-tree-native-snapshot.ps1`.
- [ ] A new canary evidence directory exists outside `C:\Program Files\matter`,
      `%TEMP%\amic-os-internal-update-cache`, and
      `%LOCALAPPDATA%\AMIC OS\OutlookAttachments`.
- [ ] Any install, uninstall, credential/MFA, Outlook, update, or rollback
      action has separate human authorization. The state collector is
      observation-only except for creating one new receipt file.

## Procedure

### 1. Fix the canary inputs once

Open PowerShell 7 on `JWS-GALAXYBOOK`. Use a new evidence directory and replace
only the four values sourced from the verified candidate receipt.

```powershell
$CanaryId = 'amic-os-internal-YYYYMMDD-001'
$Version = '0.0.0'
$SourceSha = '0000000000000000000000000000000000000000'
$SourceTree = '0000000000000000000000000000000000000000'
$InstallerSha256 = '0000000000000000000000000000000000000000000000000000000000000000'
$ToolRoot = 'C:\AMIC-OS-Canary-Tools'
$EvidenceRoot = "C:\AMIC-OS-Canary-Evidence\$CanaryId"
$Collector = Join-Path $ToolRoot 'collect-amic-os-internal-windows-state.ps1'
$NativeScanner = Join-Path $ToolRoot 'windows-installed-tree-native-snapshot.ps1'

if (Test-Path -LiteralPath $EvidenceRoot) { throw 'Use a new canary evidence directory' }
New-Item -ItemType Directory -Path $EvidenceRoot | Out-Null
```

**Expected result:** a new, empty evidence directory exists.
**If it fails:** choose a new canary ID. Do not erase or reuse an earlier
evidence directory.

### 2. Verify the transferred tools

On the reviewed source machine, record:

```bash
shasum -a 256 scripts/collect-amic-os-internal-windows-state.ps1 \
  scripts/windows-installed-tree-native-snapshot.ps1
```

On Windows, compare both values byte-for-byte:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath $Collector, $NativeScanner |
  Select-Object Path, Hash
```

**Expected result:** both Windows hashes equal the hashes from the reviewed
source SHA.
**If it fails:** stop. Re-transfer the exact files; never edit the received
scripts in place.

### 3. Capture preinstall state zero

Run the collector in a child PowerShell process so its exit code is available
without closing the operator shell:

```powershell
& pwsh.exe -NoLogo -NoProfile -File $Collector `
  -Stage preinstall `
  -CanaryId $CanaryId `
  -ExpectedVersion $Version `
  -ExpectedSourceSha $SourceSha `
  -ExpectedSourceTree $SourceTree `
  -ExpectedInstallerSha256 $InstallerSha256 `
  -OutputPath (Join-Path $EvidenceRoot 'preinstall.json')
if ($LASTEXITCODE -ne 0) { throw 'Preinstall state is not zero; preserve the receipt and stop' }
```

**Expected result:** the command prints a safe JSON summary with `PASS`, one
receipt hash, and `evidence_file_write_count = 1`. The receipt proves the exact
install root, uninstall entry, product process/service/task references, update
cache, AMIC Outlook cache, desktop/Outlook/COM registrations, protocol handler,
and exact shortcut name are absent.
**If it fails:** inspect only `safe_error_codes`. Do not delete a matching item
until its ownership is established and a separate removal is approved.

### 4. Perform the separately evidenced download and installation

Use the authenticated private distribution path. Preserve separate receipts
for signed metadata and revocation verification, exact S3 `VersionId`, download
SHA-256 and byte count, Windows unsigned-warning display, and human acceptance.
The collector does none of these actions and its `download_verified` and
`windows_warning_captured` fields intentionally remain `false`.

After installation, start AMIC OS once so Electron registers the `matter:`
protocol, then close it normally before the installed-tree capture. Preserve a
separate launch/sign-in receipt; do not place credentials in the evidence
directory.

**Expected result:** the exact candidate is installed and has completed one
normal launch.
**If it fails:** preserve all existing receipts and stop. Do not replace the
candidate with an unverified local copy.

### 5. Capture installed state one

```powershell
& pwsh.exe -NoLogo -NoProfile -File $Collector `
  -Stage installed `
  -CanaryId $CanaryId `
  -ExpectedVersion $Version `
  -ExpectedSourceSha $SourceSha `
  -ExpectedSourceTree $SourceTree `
  -ExpectedInstallerSha256 $InstallerSha256 `
  -OutputPath (Join-Path $EvidenceRoot 'installed.json')
if ($LASTEXITCODE -ne 0) { throw 'Installed state is incomplete; preserve the receipt and stop' }
```

**Expected result:** `PASS`. The receipt binds the exact build manifest lineage,
internal-unsigned marker, Ed25519 public trust file, executable and Classic
Outlook adapter, one exact uninstall entry, two registry views where required,
protocol and shortcut targets, and a five-pass native NTFS installed-tree
snapshot. The native scanner rejects reparse points, alternate data streams,
hard links, path aliases, and any content or identity drift across
`B0 → I1 → B1 → I2 → B2`.
**If it fails:** use `safe_error_codes`; do not relax an expected count or
rewrite the receipt. Correct the package or installation and begin a new canary
directory.

### 6. Complete the independent runtime canaries

While the application is installed, preserve separate receipts for:

1. human-owned sign-in and MFA;
2. tenant/legal-entity-authorized contacts, member photos, registration/roster
   membership, and hosted Vault readback;
3. the explicit AMIC OS Outlook action in each required Outlook host;
4. the fail-closed zero-provider screen while the approved provider count is
   zero;
5. a newer internal update and the independently authorized rollback.

Ordinary email selection is not an Outlook action receipt. A state receipt,
open RDP window, screenshot, or successful installer exit is not a substitute
for any runtime receipt.

### 7. Perform the separately authorized uninstall

Use the exact uninstall entry proved by the installed receipt. Uninstall is a
separate state-changing human-approved action; the collector never launches it.
Preserve the uninstaller identity, operator approval, process exit, and product
removal receipt.

**Expected result:** the exact installed package reports a successful uninstall.
**If it fails:** preserve the installed and uninstall receipts. Do not manually
delete the install tree or registry keys.

### 8. Capture postuninstall state zero

```powershell
& pwsh.exe -NoLogo -NoProfile -File $Collector `
  -Stage postuninstall `
  -CanaryId $CanaryId `
  -ExpectedVersion $Version `
  -ExpectedSourceSha $SourceSha `
  -ExpectedSourceTree $SourceTree `
  -ExpectedInstallerSha256 $InstallerSha256 `
  -OutputPath (Join-Path $EvidenceRoot 'postuninstall.json')
if ($LASTEXITCODE -ne 0) { throw 'Postuninstall state is not zero; preserve the receipt and stop' }
```

**Expected result:** `PASS` with the same exact absence checks as preinstall.
**If it fails:** preserve the receipt and investigate ownership. Do not run a
broad process-name cleanup or recursive deletion.

### 9. Copy back and validate the three receipts

Transfer the three JSON files to a private directory outside the Git worktree.
From the exact reviewed repository SHA, run:

```bash
npm run amic-os:windows-state:validate -- \
  --preinstall /private/canary/preinstall.json \
  --installed /private/canary/installed.json \
  --postuninstall /private/canary/postuninstall.json \
  --canary-id amic-os-internal-YYYYMMDD-001 \
  --version 0.0.0 \
  --source-sha 0000000000000000000000000000000000000000 \
  --source-tree 0000000000000000000000000000000000000000 \
  --installer-sha256 0000000000000000000000000000000000000000000000000000000000000000
```

**Expected result:** `verdict = PASS`, `state_sequence = [0, 1, 0]`, one host
fingerprint, one installed-tree hash, and hashes for all three receipt files.
The output deliberately reports `g9_complete_claim = false`.
**If it fails:** do not edit the receipt. Reconcile the exact candidate inputs,
host fingerprint, time order, file hashes, and stage checks.

### 10. Prove hosted-data preservation independently

After uninstall, use a newly authenticated server-side readback to prove the
same tenant/legal-entity contacts, photos, membership, Vault document versions,
audit records, and provider state still exist. Keep this receipt separate from
the Windows state files; never embed hosted record IDs, API credentials, or
personal data in the installer or state collector.

Only the full independent receipt set may advance gate G9.

## Verification

- [ ] The collector and scanner hashes match the reviewed source SHA.
- [ ] `preinstall.json`, `installed.json`, and `postuninstall.json` each exist
      once and were never overwritten.
- [ ] The validator returns `PASS` for one candidate, one canary ID, one host
      fingerprint, ordered timestamps, and `0 → 1 → 0`.
- [ ] The installed native tree validates all file bytes and NTFS identities.
- [ ] Separate download, warning/acceptance, login, server-data, Outlook,
      update, rollback, uninstall, and hosted-preservation receipts exist.
- [ ] No receipt, installer, source seed, member photo, credential, or private
      infrastructure locator was committed or uploaded to a public release.

## Troubleshooting

| Symptom | Likely cause | Required response |
| --- | --- | --- |
| `WINDOWS_REQUIRED` | Collector ran on a non-Windows machine | Run it on `JWS-GALAXYBOOK`; keep the blocked receipt only as tool evidence |
| `WINDOWS_HOST_IDENTITY_MISMATCH` | Wrong Windows host | Stop; do not treat another machine as the managed canary |
| `WINDOWS_INSTALL_ROOT_STATE_MISMATCH` | Prior install remains, install failed, or uninstall was incomplete | Establish ownership; use the exact uninstall path only after approval |
| `WINDOWS_*_REGISTRY_STATE_MISMATCH` | Registration missing, duplicated, or not removed | Preserve receipt; repair the installer rather than editing registry by hand |
| `WINDOWS_SHORTCUT_STATE_MISMATCH` | Shortcut missing or points elsewhere | Preserve receipt; verify the exact package and NSIS result |
| `WINDOWS_NATIVE_TREE_STATE_MISMATCH` | NTFS alias/link/stream, unstable bytes, or scanner failure | Close AMIC OS normally and retry in a new canary directory; if repeated, inspect the package |
| Validator reports candidate or host drift | Receipts came from different candidates or hosts | Reject the set and repeat the complete canary |
| Output file already exists | Canary directory or filename was reused | Keep the old file immutable; create a new canary ID and directory |

## Rollback

The collector has no operational rollback because it changes no product,
registry, service, task, cache, or hosted data. It creates one new evidence
file with create-new semantics. If the candidate itself must be rolled back,
use the separately signed rollback metadata and explicit operator flow, then
collect a separate rollback receipt. Never simulate rollback by copying files
over `C:\Program Files\matter`.

## Escalation

| Situation | Owner | Action |
| --- | --- | --- |
| Candidate lineage or hash mismatch | Release owner | Reject the candidate; regenerate from the reviewed clean SHA |
| Unexpected service/task/registry ownership | Windows administrator | Identify the exact owner before any removal |
| Hosted tenant authorization mismatch | Data/security owner | Stop runtime testing; preserve audit and negative-tenant evidence |
| Credential, MFA, or provider consent required | Human account owner | Complete the interaction directly; never place credentials in receipts |
| Any destructive repair proposed | User/owner | Obtain explicit approval for the exact target and action |

## History

| Date | Run by | Notes |
| --- | --- | --- |
| 2026-09-04 | Codex local implementation | Collector and cross-receipt validator added; current-candidate host run remains pending |

## Adopt an already installed managed bootstrap

`adopt-managed-bootstrap` is an owner-approved control operation on an existing
private build. It keeps the original release ID, sequence, version, source SHA,
source tree and all four artifact object references, including their VersionIds.
It creates five control objects and a nine-reference baseline. It performs no
Windows build, installer upload, channel publication or rollback authorization.
The existing successor and desktop signature checks still apply after adoption.

Before dispatch, complete the dedicated internal-unsigned installation authority
registration using the signed-in principal and device proof. A Windows `installed`
receipt alone, an invented `odi_` identifier, or a caller-provided trust flag cannot
establish this authority. Preserve any previous installation/device binding; use
its explicit retirement and fresh enrollment procedure if the principal already
has one. Do not modify the formal/macOS or legacy Windows compatibility policy.

Prepare the closed request accepted by
`scripts/lib/amic-os-internal-baseline-adoption.mjs`. It binds the current reviewed
executor SHA/tree, original managed-bootstrap release and exact marker, real
installation ID, canary ID, exact installed-receipt hash, approval reference,
operation window, and separate original/artifact and new/control retention dates.
The original objects retain their existing retention dates. The new controls
require 365–3650 days from execution; retainUntil is never rounded down.

Request a server-signed attestation from
`POST /api/desktop/internal-updates/baseline-adoption-attestation` with
`{adoption_id, request_sha256, installation_id}` through the current signed
session. Its maximum lifetime is five minutes and it binds the exact active
installation state version, lease, release authorization and installed receipt.
After that snapshot, obtain the owner signature for action
`lawos-amic-internal-baseline-adopt`, the current executor SHA/tree, and the SHA-256
of canonical `{request, attestation_sha256}`. The exact data scope is the bootstrap
marker hash, installation ID and installed-receipt hash; contact scope is empty.
A changed heartbeat state, revoked release, retired installation or expired
snapshot requires refreshed evidence and a new approval.

Stage the exact installed receipt privately at
`internal-unsigned/baseline/adoption-inputs/<request-sha256>/installed.json`.
Record its immutable VersionId, SHA-256 and byte count. Require the distribution
bucket's KMS encryption, compliance retention equal to the new control retention,
and metadata `artifact-kind=windows_installed_receipt` plus `artifact-sha256`.
This preparation input is outside the five publication control objects. Keep the
raw Windows receipt, local paths and session token out of workflow input values.

The dispatch bundle contains exactly `request`, `attestation`,
`ownerApprovalReceipt`, `ownerApprovalSignatureBase64`, `installedReceiptRef` and
`retainUntil` (the new control retention). Set `publication_mode` to
`adopt-managed-bootstrap` and supply only this bundle in
`adoption_document_base64`; ordinary release/revocation/rollback documents stay
empty. Both existing protected environments must pin the issuer public key/ID
and owner registry independently of the bundle. They also require a fresh signed
session secret for the narrow current-state read. The canonical API origin is
fixed in the reader; a dispatch input cannot redirect its bearer token.

The publisher rechecks current authority before writing and immediately before
its conditional baseline marker commit. The isolated AWS readback job reads the
seven original versions and nine baseline references, compares all four original
artifact references, and rechecks current authority before and after those reads.
A PASS proves this adoption only. Login/data access, successor update, rollback,
uninstall and hosted-data preservation still need their separate real-host
receipts. Preserve partially written controls and failed receipts; a marker
conflict or existing baseline/channel history requires read-only diagnosis.
