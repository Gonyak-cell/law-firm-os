# UI Workstream Conventions (non-CP track)

The matter by AMIC web UI is developed **outside** the closeout-pack (CP)
governance system. CP sessions commit `Close CP00-xxx` packs to `main` in this
same working directory, so the UI workstream follows these rules to coexist
safely. Established 2026-06-10 during the root cleanup (commits `bfa4fe73`,
`6945733e`, `70ebbe89`, `535466f2`).

## Where things live

| Content | Location |
| --- | --- |
| App code | `apps/web/src/` |
| App-imported images (bundled by Vite) | `apps/web/src/assets/` |
| App-served binaries (fonts, favicons) | `apps/web/public/` |
| Generated UI reference packs | `docs/ui-reference/<pack>/` (generated only — change the generator, never the output) |
| Hand-written HTML prototypes | `docs/ui-reference/prototypes/` — never the repo root; iterate via git history, never Finder "복사본" copies |
| Own-brand images | `docs/ui-reference/brand/` (committable via the `!docs/ui-reference/brand/*.png` negation) |
| UI tooling scripts | `scripts/` with an `ui:*` npm alias in `package.json` |
| Local dashboards/tools | `tools/<name>/` — generated runtime snapshots (e.g. `live-data.js`) stay gitignored |
| Bulk third-party reference corpora | **outside git** — `Law Firm OS UI/` is gitignored wholesale; set `LAWOS_UI_ARCHIVE_DIR` if it moves off-repo |

## How to commit (while CP sessions are active)

1. Act only in the quiet window **immediately after** a `Close CP00-xxx` commit
   lands; run `git log -1` and `git status --porcelain` fresh first.
2. Stage **explicit paths only**. Never `git add -A`, `git add .`, `git stash`,
   `git clean`, `git checkout <branch>`, or `git reset --hard` in this worktree.
3. Never stage CP-owned paths, regardless of momentary cleanliness:
   `contracts/**`, `packages/**`, `scripts/validate-*.mjs`,
   `scripts/generate-rp*.mjs`, `scripts/generate-closeout*.mjs`,
   `docs/closeout-packs/**`, `docs/closeout-pack-plan/**`, `artifacts/**`,
   `docs/ldip-integration/**`.
4. Verify `git diff --cached --name-only` before every commit; prefer
   pathspec-limited commits (`git commit -m msg -- <paths>`).
5. If `git status` shows a CP session has dirtied a shared root file
   (`.gitignore`, `package.json`): **stop and coordinate, never edit.**
6. On a `.git/index.lock` error: back off and retry after the next Close
   commit. Never delete the lock file.
7. `npm test` and `npm run build` must be green before every commit — the CP
   close gate runs both, so a red state on `main` blocks the other workstream.
8. Adding files to `scripts/test/` requires CP coordination: that glob is part
   of the CP close gate, so any flaky/corpus-dependent test there blocks packs.
   UI tests must stay deterministic and corpus/server-independent.
9. Use conventional prefixes `feat(web)` / `chore(ui)` / `docs(ui)` — the
   `Close CP00-xxx` prefix is reserved for the CP system.
10. Deletions are backup-gated: a file may be removed only after it is verified
    present in an off-repo backup (tar/bundle under `~/lawos-backups/`).

## Licensing

- No third-party logos, screenshots, or crops are committed without a license
  check. Mobbin-derived reference imagery is private-repo-only and must be
  re-reviewed before any push to a shared or public remote.
- Font binaries ship with license texts (Pretendard/SUITE: verify SIL OFL from
  upstream and keep `LICENSE`/`OFL.txt` next to the OTFs).

## Progress control room

`npm run progress:serve` serves `tools/progress-control-room/index.html` and
regenerates `tools/progress-control-room/live-data.js` (gitignored) every 60s.
A fresh clone shows an empty dashboard until that command runs once.
