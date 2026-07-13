# Parent Host Runtime Verification

Date: 2026-07-12 KST

This verification ran in the user's actual macOS session. Reviewer sandboxes separately reported zero valid signing identities and `CSSMERR_TP_NOT_TRUSTED`; those sandbox results do not reproduce on the parent host.

## Current App and ZIP

- `security find-identity -v -p codesigning`: one valid Developer ID Application identity.
- Current `matter.app` strict codesign verification: PASS.
- Current `matter.app` Gatekeeper assessment: accepted, source `Notarized Developer ID`.
- Current `matter.app` stapler validation: PASS.
- ZIP-extracted `matter.app` strict codesign verification: PASS.

After launching the formal app and capturing the Worktree screen, strict codesign verification ran three consecutive times and returned exit code 0 each time. Gatekeeper and stapler also passed after runtime QA.

## DMG Install Path

The formal DMG was attached read-only, copied to a temporary install directory, and checked there:

- strict codesign: PASS
- Gatekeeper: accepted, source `Notarized Developer ID`
- stapler: PASS
- bundle ID: `com.amic.matter.desktop`

The temporary install directory was removed and the DMG was detached after verification.

## Visual Evidence Handling

- Current referenced screenshot: `02-formal-worktree-1024x700.png`.
- `01-formal-people-1024x700.png` contains direct contact information and remains local/private only.
- Neither screenshot is part of the formal release manifest or any GitHub publication set.
