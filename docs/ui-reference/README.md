# UI Reference

Reference material for the non-CP UI workstream (matter by AMIC web app). See
`docs/ui-workstream-conventions.md` for the workstream rules.

## Directory map

| Path | Content | Authorship |
| --- | --- | --- |
| `amplitude-feb-2025/` | Amplitude-parity reference pack: screen inventory, flow map, visual tokens, coverage ledgers, state registry, implementation/font/parity plans, contact sheets, visual-parity captures | **Entirely generated** — every file here, including its `README.md` and all `*-plan.md` documents, is written by `scripts/generate-amplitude-ui-reference.mjs` and `scripts/extract-amplitude-visual-tokens.mjs`. Do not hand-edit; change the generator and regenerate. |
| `prototypes/` | Hand-written HTML prototypes (canonical logo animation) | Hand-authored |
| `brand/` | Own-brand matter/AMIC logo and login-flow images (PNG negation rules in `.gitignore` allow these) | Hand-authored/exported |
| `brand-showcase/` | Module-suite showcase HTML pages and their assets, rescued from the local design archive | Hand-authored |
| `figma-archive/` | Manifests, source index, and classification reports describing the local design-reference archive | Hand-authored session outputs (non-regenerable) |

## Regenerating `amplitude-feb-2025/`

Regeneration requires inputs that are **not in git**:

1. The local design-reference archive (`Law Firm OS UI/` at the repo root, ~4 GB,
   gitignored). If the archive lives elsewhere, set `LAWOS_UI_ARCHIVE_DIR` to its
   location; the generators expect an `Amplitude web Feb 2025/` folder inside it
   (318 screenshots).
2. For capture/verification scripts (`capture-matter-amplitude-parity.mjs`,
   `verify-matter-amplitude-screenshot-states.mjs`, `verify-matter-ui-flows.mjs`):
   the web app dev server running at `127.0.0.1:5173` (`npm run dev`) and Playwright.

Then run `node scripts/generate-amplitude-ui-reference.mjs` and
`node scripts/extract-amplitude-visual-tokens.mjs`.

## Licensing

The contact-sheet and visual-parity PNGs in `amplitude-feb-2025/` are derived from
a Mobbin screenshot corpus of the Amplitude product UI. They are acceptable as
internal design reference in this private repository, but **must be re-reviewed
before this repository is pushed to any shared or public remote**. The bulk corpus
itself is never committed (`Law Firm OS UI/` is gitignored).

Fonts shipped with the app (Pretendard, SUITE) live in `apps/web/public/fonts/`;
license verification status is tracked in the app commit history.
