# matter Desktop Approval Execution Receipt

- Recorded at: 2026-07-12 21:37:23 KST
- User direction: `전부 승인할테니 승인 문제로 안했던 것들 진행`
- Release ID: `matter-desktop-v0.1.15-approved-ui-20260712`
- Version: `0.1.15`
- Formal app ID: `com.amic.matter.desktop`
- Source HEAD: `66a4eb20e6a83f82f5ae0b8254b18d1844f40bec`

## Approved Actions Executed

1. macOS screen-control QA continued and completed.
2. The QA-only account password reset gate was enabled for `matter.desktop.qa@amic.kr` during AWS runtime smoke. The protected administrator account was not reset.
3. The current macOS candidate was signed with `Developer ID Application: Jiwon Suh (LHDXU66NX3)`.
4. Apple notarization was submitted through the `matter-notary` keychain profile and accepted.
5. The notarization ticket was stapled and validated.
6. Formal macOS ZIP/DMG and Windows installer candidate artifacts were generated and checksummed.
7. The formal DMG was mounted, copied to a temporary install location, assessed by Gatekeeper, and validated with codesign and stapler.
8. The signed formal app was launched at 1024 by 700 and visually inspected.

## Results

- Desktop smoke tests: 93/93 passed.
- File bridge tests: 17/17 passed.
- AWS runtime smoke: PASS.
- QA account password login: allow.
- QA account administrator access: deny, HTTP 403.
- Developer ID signature: PASS.
- Apple notarization submission: `472a8d29-c7f9-43b8-8eb5-de2c3fa7b1b0`, Accepted.
- codesign deep strict verification: PASS.
- Gatekeeper assessment: PASS.
- stapler validation: PASS.
- Formal bundle validator: PASS, 9/9 artifacts verified.
- DMG install smoke: PASS.
- Packaged UI evidence: `02-formal-worktree-1024x700.png`.
- The earlier People capture contains direct contact information and is local/private evidence only. It is excluded from every release manifest and publication set.

## Primary Artifacts

- macOS ZIP: `apps/desktop/dist/mac/matter-0.1.15-macos.zip`
  - SHA-256: `88f4881ba98a0e6d4e57c8a393f8e6317147ee6a29eeea82f0b0b657ed6f30b5`
- macOS DMG: `apps/desktop/dist/mac/matter-0.1.15-macos.dmg`
  - SHA-256: `a5d7e47a7277ae614eb3e568f1c73478ee08637d478d6fe0d08f552f901f5c0d`
- Windows installer: `apps/desktop/dist/matter-0.1.15-win-x64.exe`
  - SHA-256: `0acd3b4b302b4e36dd9be6d4636bfcf73c86ad4581c792b7b73098306e7789ac`
- Manifest: `apps/desktop/dist/release/matter-desktop-v0.1.15-approved-ui-20260712/release-manifest.json`
- Checksums: `apps/desktop/dist/release/matter-desktop-v0.1.15-approved-ui-20260712/checksums.sha256`

## Publication Boundary

GitHub publication was not executed. The working tree contains 50 modified or deleted paths and 37 untracked paths, so a tag at the current HEAD would not reproduce the approved binary. This is a source-provenance blocker, not an approval blocker. No public-release or production-go-live claim is made.

## Runtime Debugging Audit

1. Hypothesis: the AWS runtime itself was unavailable. Refuted by live health, account-ledger, QA login, administrator allow, and QA administrator-deny responses from the staging Execute API.
2. Hypothesis: the AWS smoke was blocked only by missing owner approval. Confirmed by the fail-to-pass toggle: without `MATTER_ALLOW_QA_PASSWORD_RESET=1` it stopped with `PROTECTED_RESET_ACCOUNT`; with the approved QA-only flag it passed while the protected administrator remained untouched.
3. Hypothesis: signing or notarization credentials were unavailable. Refuted by the valid Developer ID identity, accepted `matter-notary` submission, stapler validation, strict codesign verification, and Gatekeeper acceptance.
4. Hypothesis: approval was the only remaining blocker to GitHub publication. Refuted by the working-tree provenance check: 87 non-HEAD paths would be absent from the release tag, so the generated binary would not be reproducible from the tagged source.
