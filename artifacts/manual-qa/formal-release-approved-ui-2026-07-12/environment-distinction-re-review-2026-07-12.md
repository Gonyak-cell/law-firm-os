# Formal release environment-distinction re-review

Date: 2026-07-12 (Asia/Seoul)
Release: `matter-desktop-v0.1.15-approved-ui-20260712`
Source HEAD: `66a4eb20e6a83f82f5ae0b8254b18d1844f40bec`

## Verdict

**PASS for the approval-gated formal candidate and its authenticity evidence.** The earlier reviewer-lane failures are classified as host trust/keychain isolation, not intrinsic artifact corruption, because the parent macOS environment independently reported the Developer ID identity, three consecutive strict deep-codesign passes, accepted Notarized Developer ID Gatekeeper assessment, successful stapler validation, and successful live-app plus ZIP-extraction verification.

This PASS does not claim GitHub publication, public release, production go-live, or reproducibility from the current dirty HEAD.

## Reconciled evidence

- `approval-evidence-manifest.json` parses successfully and contains 5 evidence records.
- All 5 manifest evidence SHA-256 records match their current files:
  - approval execution receipt
  - `02-formal-worktree-1024x700.png`
  - formal release manifest
  - macOS build receipt
  - Windows build receipt
- Current package hashes match the formal release receipt and release manifest for the macOS executable, macOS ZIP, macOS DMG, and Windows installer.
- The parent environment's reported signing results resolve the restricted lane's `security find-identity = 0`, `CSSMERR_TP_NOT_TRUSTED`, and related `codesign`/`stapler` failures. Those failures are not treated as artifact defects.

## Visual evidence

`02-formal-worktree-1024x700.png` was inspected. It shows the Matter Worktree surface at the claimed 1024x700 CSS viewport with the Matter tab selected, Worktree active, clear green active treatment, usable controls, and no obvious clipping. It is classified `local_private_visual_evidence` and is excluded from release/publication sets. The earlier contact-heavy People screenshot remains local/private evidence only and is not used as release/publication evidence.

## Publication boundary

The approval evidence explicitly records `source_reproducible_from_head: false`, `github_release_created: false`, `public_release_claim: false`, and `production_go_live_claim: false`. Current status remains dirty, so no public-release or go-live claim is made.

## Remaining risk

The restricted reviewer environment still cannot independently reproduce the parent macOS signing checks until its keychain/trust isolation is fixed. This is an environment limitation, not a remaining intrinsic defect in the verified formal artifacts.
