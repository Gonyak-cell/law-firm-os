# LCX8 Desktop Native Residual Closeout

- Status before: mixed GUARDED/BLOCKED
- Status after: mixed GUARDED/BLOCKED
- Decision: native residual rows retain guarded/blocked final classification
- Reason: native_guard_source_confirmed_or_external_runtime_receipt_missing
- Proof: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-0245-0246-0258-0271-desktop-native-residual-proof.json
- Proof markdown: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-0245-0246-0258-0271-desktop-native-residual-proof.md

## Commands
- npm --workspace apps/desktop run test:smoke: PASS 59/59, fail 0
- npm --workspace apps/desktop run test:file-bridge: PASS 17/17, fail 0
- npm --workspace apps/desktop run test:update: PASS 3/3, fail 0

Verification: Post-closeout LCX8-ACTION-0245/0246/0258..0271 desktop native residual proof PASS. Source/runtime assertions confirmed approved renderer origin guard, unapproved navigation/window-open denial, file bridge trusted gesture and renderer-byte guard, denied permission audit, temp preview cleanup, deep-link route-only and invalid/action guards, notification route-intent guard, signed internal update/rollback source controller, and public update channel denial. Desktop tests passed: test:smoke 59/59, test:file-bridge 17/17 plus validators, test:update 3/3. Guarded rows remain GUARDED; external OS/runtime receipt rows remain BLOCKED.

## Rows
- LCX8-ACTION-0245: GUARDED final / source guard confirmed; Approved local dev renderer target and packaged file renderer are allowlisted.
- LCX8-ACTION-0246: GUARDED final / source guard confirmed; Unapproved renderer, navigation, and window-open are denied by origin-policy guards.
- LCX8-ACTION-0258: GUARDED final / source guard confirmed; File picker without trusted gesture throws USER_GESTURE_REQUIRED.
- LCX8-ACTION-0259: GUARDED final / source guard confirmed; Renderer-supplied file/document bytes throw RENDERER_FILE_BYTES_FORBIDDEN before dialog/write.
- LCX8-ACTION-0260: GUARDED final / source guard confirmed; Denied permission precheck throws PERMISSION_DENIED and records denied audit event.
- LCX8-ACTION-0262: GUARDED final / source guard confirmed; Temp preview cache cleanup removed scoped preview on logout and recorded cleanup audit.
- LCX8-ACTION-0263: BLOCKED remains BLOCKED / external desktop runtime receipt required; Matter/document/task deep links parse to routeOnly intents with no action execution.; missing=OS protocol registration and packaged app route-open receipt
- LCX8-ACTION-0264: BLOCKED remains BLOCKED / external auth runtime receipt required; Auth callback deep link parses only when code, state, and issuer are present.; missing=real IdP callback/OS protocol receipt
- LCX8-ACTION-0265: GUARDED final / source guard confirmed; Forbidden action deep link throws FORBIDDEN_ACTION_LINK.
- LCX8-ACTION-0266: GUARDED final / source guard confirmed; Invalid deep link route/query/id throws INVALID_IDENTIFIER.
- LCX8-ACTION-0267: BLOCKED remains BLOCKED / external desktop notification receipt required; Notification click converts a payload routeUrl into a routeOnly deep-link intent.; missing=OS notification click receipt from packaged desktop app
- LCX8-ACTION-0268: GUARDED final / source guard confirmed; Notification forbidden action route throws FORBIDDEN_ACTION_LINK; payload keys are body, id, routeUrl, templateId, title.
- LCX8-ACTION-0269: BLOCKED remains BLOCKED / external updater runtime receipt required; Signed internal update metadata applies after signature verification in source controller.; missing=packaged updater apply/install receipt
- LCX8-ACTION-0270: BLOCKED remains BLOCKED / external updater runtime receipt required; Signed rollback returns to the previous verified internal version in source controller.; missing=packaged updater rollback receipt
- LCX8-ACTION-0271: GUARDED final / source guard confirmed; Public update channel returns denied/public_channel_disabled.

## Non-Claims
- desktop source/test proof only for guarded rows
- blocked rows remain blocked where packaged OS/runtime/provider receipt is missing
- no OS file dialog, OS protocol, OS notification, or packaged updater receipt is claimed
- no production-ready, public release, or go-live claim
