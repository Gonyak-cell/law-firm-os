# Global density and responsive packaged-app QA

- Date: 2026-07-12
- App: `apps/desktop/dist/mac/matter.app`
- Version: `0.1.15`
- App ID: `com.amic.matter.desktop.internal`
- Release scope: internal package only
- Public release: false
- Owner approval: false

## Issues found and resolved

1. The six product axes could clip at narrower desktop widths because the search and utility tracks starved the product navigation.
2. Home dashboard cards responded to viewport width instead of the remaining content width beside the sidebar.
3. The two-row desktop topbar left the sidebar at `100vh`, which pushed the profile trigger below a 700px-high window.
4. The normal Forest sidebar used extra grid rows, allowing the profile trigger to overlap the final navigation item.

The final responsive rules cap the search track, stack the topbar from 821px through 1180px, size the app frame below the first topbar row, use content container queries for Home, and preserve separate normal and mode-exception sidebar row maps.

## Final packaged-app evidence

- `13-people-final-package-1024x700.png`: minimum supported desktop window; six product axes, five People columns, and the full profile card are visible without clipping or overlap.
- `14-people-final-package-1280x820.png`: normal desktop window; typography, spacing, navigation, table columns, and right padding remain balanced.
- `15-worktree-final-package-1024x700.png`: minimum supported desktop window; six product axes, four Worktree tabs, selector controls, content panel, and full profile card fit.

All three captures were created after packaged CSS `index-SRPByxZV.css` at 2026-07-12 21:16:15.

## Verification

- Related Node and Playwright tests: 55/55 passed.
- Rendered geometry matrix: 1280, 1180, 1024, and 820 by 700; normal and mode-exception shells; 8/8 passed.
- TypeScript check: passed.
- Web production build: passed.
- Desktop renderer preparation: passed.
- macOS internal package build: passed.
- Install smoke: passed.
- `git diff --check`: passed.
- Web/package CSS SHA-256: `8d685327c03dbb65a9e0bc8cd2a76f6dc54b5b33d4efa1ce661e63c3425f26fb`.
- Web/package JS SHA-256: `ae419eeaa079bee728561a9df41dd1e34fcc9716c161df2ab25860e2a9b3622b`.
- Independent visual gate: PASS, no blockers.
- Independent code review: APPROVE, no blockers; horizontal containment remains covered by the real 1024px and 1280px captures rather than a dedicated geometry assertion.

## Release boundary

This is verified local source and internal packaged-app evidence. Developer ID distribution signing, notarization, owner approval, and public release are not complete and are not claimed.

## AI slop review

Pass for this responsive change. Sloplint still reports 64 pre-existing repository findings in older UI rules and evidence documents; this change adds none of those patterns.
