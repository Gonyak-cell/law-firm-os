# Matter Worktree Practice Active State QA

- Date: 2026-07-12
- App bundle: `apps/desktop/dist/mac/matter.app`
- Internal package version: `0.1.15`
- Surface: Matter > 업무 관리 > 워크트리
- Viewports: 375, 768, 1280, 1440 CSS px

## Interaction Result

Each practice button was clicked in the packaged Electron app under both supported skins.

| Skin | Buttons tested | Active | aria-pressed | Background | Border |
|---|---|---:|---:|---|---|
| Forest | 송무, 기업 자문, 분쟁, 트랜잭션 | true | true | `color(srgb 0.914902 0.976078 0.937647)` | `rgb(38, 194, 96)` |
| Matter | 송무, 기업 자문, 분쟁, 트랜잭션 | true | true | `color(srgb 0.907451 0.965098 0.941961)` | `rgb(19, 166, 107)` |

- Exactly one button remained active after each click.
- The selected text color remained `rgb(26, 26, 26)`.
- The 1440px render had no page-level horizontal overflow.
- Responsive captures showed no clipped Korean labels at 375px or 768px.

## Evidence

- `worktree-practice-375.png`
- `worktree-practice-768.png`
- `worktree-practice-1280.png`
- `worktree-practice-1440.png`
- `worktree-practice-forest.png`
- `worktree-practice-matter.png`

## Release Boundary

The local internal package build passed. This is not a signed, notarized, public release or production go-live claim.
