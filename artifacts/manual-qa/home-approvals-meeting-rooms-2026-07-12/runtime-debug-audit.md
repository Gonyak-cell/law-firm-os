# Runtime Debug Audit

## H1: stale packaged renderer

- Hypothesis: `matter.app` could still contain the renderer from before the Home changes.
- Evidence: the built web and packaged renderer JavaScript hashes both equal `4293ba34cc730f1200ecb6e7319e3802a050af7c2c2cb672a9395cb11a16a5de`; CSS hashes both equal `8a1b4153a1fa2e6f7e33ee2bb142ad9860de1d71551a0167d6e30b100b2a349f`.
- Result: rejected.

## H2: approval routes still coupled to To Do

- Hypothesis: moving the navigation could leave the old approval tab visible or route both approval categories to the same unfiltered screen.
- Evidence: packaged UI navigation opened `home-requests-leave`; `[data-home-tab-prefix="work"]` count was `0`; the Home card rendered exactly `휴가` and `비용처리`; the sidebar group exposed the same two children.
- Result: rejected.

## H3: new card or meeting-room route overflows compact windows

- Hypothesis: the additional card and sidebar entries could create horizontal clipping or hide the requested card below the initial viewport.
- Evidence: the first package run found the approval card below the 1280x820 viewport. The grid was changed to place `pending-approvals` in the main two-column area. The second package run measured `visible: true` at 1280x820 and `overflow: false` at both 1280x820 and 720x800; the meeting-room panel remained visible at 720x800.
- Result: confirmed and fixed.
