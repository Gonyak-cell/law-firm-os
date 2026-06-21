# LCX-DESK-07 Pilot Closeout Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P7 pilot QA, risk adjudication, owner packet, final evidence index, and no-public-release guard
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P7 pilot closeout progress only. It does not claim owner decision, production go-live, public release, external pilot approval, or store approval.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P7-W01-T01 | complete | `docs/desktop/mater-desktop-pilot-qa-checklist.md` |
| MDT-P7-W01-T02 | complete | `docs/lazycodex/evidence/mater-desktop/pilot-install-session.md` |
| MDT-P7-W01-T03 | complete | `docs/lazycodex/evidence/mater-desktop/pilot-native-capabilities.md` |
| MDT-P7-W01-T04 | complete | `docs/lazycodex/evidence/mater-desktop/pilot-security-audit.md` |
| MDT-P7-W02-T01 | complete | `docs/desktop/mater-desktop-pilot-risk-adjudication.md` |
| MDT-P7-W02-T02 | complete | `docs/desktop/mater-desktop-owner-decision-packet.md` |
| MDT-P7-W02-T03 | complete | `docs/lazycodex/evidence/mater-desktop/index.md` |
| MDT-P7-W02-T04 | pending | not started |
| MDT-P7-W02-T05 | pending | phase terminal not reached |

## MDT-P7-W01-T01 - Run Pilot QA Checklist

Plan:

- Create QA-01 through QA-12 checklist.
- Assign Pass, Fail, Blocked, or owner-risk status with evidence links.
- Keep owner approval and public release false.

Do:

- Added `docs/desktop/mater-desktop-pilot-qa-checklist.md`.

Check:

```bash
rg -n "QA-01|QA-12|Pass|Fail|Blocked|owner" docs/desktop/mater-desktop-pilot-qa-checklist.md
git diff --check -- docs/desktop/mater-desktop-pilot-qa-checklist.md docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md
```

Results:

- Pilot QA checklist grep passed.
- QA-01 through QA-12 have Pass, Blocked, or owner-risk status with evidence links.
- `git diff --check` passed.

Act:

- `MDT-P7-W01-T01` is complete.
- Next TUW is `MDT-P7-W01-T02`.

## MDT-P7-W01-T02 - Observe Install, Launch, Login, Logout, and Cache Wipe

Plan:

- Record install, launch, login, logout, tenant switch, and cache wipe receipts.
- Keep missing GUI screenshot evidence explicit instead of treating it as owner approval.

Do:

- Added `docs/lazycodex/evidence/mater-desktop/pilot-install-session.md`.

Check:

```bash
manual QA: record screenshots, command receipts, and cache paths checked
test -d apps/desktop/dist/mac/mater.app && /usr/bin/codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/mater.app && apps/desktop/dist/mac/mater.app/Contents/MacOS/mater
npm --workspace apps/desktop run test:session
node apps/desktop/test/temp-preview-cleanup.test.mjs
git diff --check -- docs/lazycodex/evidence/mater-desktop/pilot-install-session.md docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md
```

Results:

- Command receipts for install, launch, login, logout, tenant switch, and cache wipe were recorded.
- Cache classes checked are listed in the evidence file.
- GUI screenshot receipt remains Blocked and is not claimed complete.
- `git diff --check` passed.

Act:

- `MDT-P7-W01-T02` is complete as a recorded pilot evidence artifact with screenshot blocker called out.
- Next TUW is `MDT-P7-W01-T03`.

## MDT-P7-W01-T03 - Observe File Bridge, Deep Link, and Notification QA

Plan:

- Record allow and deny receipts for file bridge, deep link, notifications, and update rollback.
- Keep GUI pilot receipt and owner approval boundaries explicit.

Do:

- Added `docs/lazycodex/evidence/mater-desktop/pilot-native-capabilities.md`.

Check:

```bash
manual QA: run QA-06 through QA-09 and attach receipts
npm --workspace apps/desktop run test:file-bridge
node apps/desktop/test/deep-link-parser.test.mjs
node apps/desktop/test/deep-link-deny.test.mjs
node apps/desktop/test/deep-link-open-audit.test.mjs
node apps/desktop/test/notification-route-intent.test.mjs
npm --workspace apps/desktop run test:update
git diff --check -- docs/lazycodex/evidence/mater-desktop/pilot-native-capabilities.md docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md
```

Results:

- QA-06 through QA-09 command receipts were recorded.
- Allow and deny paths for file bridge, deep link, notifications, and update rollback passed.
- External GUI pilot screenshots remain not recorded and not claimed.
- `git diff --check` passed.

Act:

- `MDT-P7-W01-T03` is complete as a command-receipt evidence artifact with GUI pilot boundary called out.
- Next TUW is `MDT-P7-W01-T04`.

## MDT-P7-W01-T04 - Run Security Hardening Audit

Plan:

- Run desktop security, file bridge, and notification copy validators.
- Record deep link denylist receipt as supporting evidence.
- Close only `MDT-P7-W01` because this is the work package terminal TUW.

Do:

- Added `docs/lazycodex/evidence/mater-desktop/pilot-security-audit.md`.

Check:

```bash
node scripts/validate-mater-desktop-security.mjs && node scripts/validate-mater-desktop-file-bridge.mjs && node scripts/validate-mater-desktop-notification-copy.mjs
node apps/desktop/test/deep-link-deny.test.mjs
git diff --check -- docs/lazycodex/evidence/mater-desktop/pilot-security-audit.md docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md
```

Results:

- Security, file bridge, and notification copy validators passed.
- Deep link denylist test passed.
- Audit covers Electron settings, preload allowlist, token absence, file bridge guards, deep link denylist, and notification copy.
- `git diff --check` passed.

Act:

- `MDT-P7-W01` is closed at its terminal TUW, `MDT-P7-W01-T04`.
- Next ledger TUW is `MDT-P7-W02-T01`.

## MDT-P7-W02-T01 - Adjudicate Pilot Risk Register

Plan:

- Adjudicate failed, blocked, and owner-risk QA items.
- Include owner, severity, mitigation, and go/no-go impact.

Do:

- Added `docs/desktop/mater-desktop-pilot-risk-adjudication.md`.

Check:

```bash
rg -n "severity|mitigation|go/no-go|owner" docs/desktop/mater-desktop-pilot-risk-adjudication.md
git diff --check -- docs/desktop/mater-desktop-pilot-risk-adjudication.md docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md
```

Results:

- Risk adjudication grep passed.
- Blocked and owner-risk items have owner, severity, mitigation, and go/no-go impact.
- `git diff --check` passed.

Act:

- `MDT-P7-W02-T01` is complete.
- Next TUW is `MDT-P7-W02-T02`.

## MDT-P7-W02-T02 - Prepare Owner Decision Packet

Plan:

- Separate repo-ready, pilot-ready, production-ready, public-release, and owner-approved states.
- Keep owner approval false without explicit receipt.

Do:

- Added `docs/desktop/mater-desktop-owner-decision-packet.md`.

Check:

```bash
rg -n "repo-ready|pilot-ready|production-ready|public-release|owner-approved" docs/desktop/mater-desktop-owner-decision-packet.md
git diff --check -- docs/desktop/mater-desktop-owner-decision-packet.md docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md
```

Results:

- Owner packet grep passed.
- Packet separates repo-ready, pilot-ready, production-ready, public-release, and owner-approved states.
- `git diff --check` passed.

Act:

- `MDT-P7-W02-T02` is complete.
- Next TUW is `MDT-P7-W02-T03`.

## MDT-P7-W02-T03 - Assemble Final Desktop Evidence Index

Plan:

- Link LCX-DESK-00 through LCX-DESK-07 evidence files.
- Include every phase terminal TUW.

Do:

- Added `docs/lazycodex/evidence/mater-desktop/index.md`.

Check:

```bash
rg -n "LCX-DESK-00|LCX-DESK-07|MDT-P0-W02-T05|MDT-P7-W02-T05" docs/lazycodex/evidence/mater-desktop/index.md
git diff --check -- docs/lazycodex/evidence/mater-desktop/index.md docs/lazycodex/evidence/mater-desktop/lcx-desk-07-pilot-closeout.md
```

Results:

- Evidence index grep passed.
- Index links LCX-DESK-00 through LCX-DESK-07 and every phase terminal TUW.
- `git diff --check` passed.

Act:

- `MDT-P7-W02-T03` is complete.
- Next TUW is `MDT-P7-W02-T04`.
