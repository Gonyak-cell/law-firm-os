# People Professional Profile Source Map

Generated at: 2026-07-07T00:00:00+09:00

Verdict: PASS_SOURCE_LOCK

Sources:

- https://amic-law.vercel.app/
- https://petrabridge.vercel.app/

## Source Priority

- AMIC attorney profiles use AMIC Law People sections as the primary source.
- PetraBridge finance/advisory profiles use PetraBridge Team sections as the primary source.
- Firm-level cases and transaction lists are excluded from individual profiles unless the source names the individual.

## Proof Scope

The LazyCodex browser proof must cover:

- 박병준: attorney
- 임영훈: attorney
- 서지원: attorney
- 조성민: attorney
- 김양태: cpa, not attorney
- 조우상: deal_advisor, not attorney

박서영 is source-mapped from the PetraBridge Team section as cpa but is outside the required browser proof scope for this goal.

## Excluded Claims

- `amic-law.case-selected-2025`: AMIC firm-level cases are not attributed to an individual profile.
- `petrabridge.successful-transactions`: PetraBridge firm-level transactions are not attributed to an individual profile.
- `petrabridge.alongside-amic-date-variant`: PetraBridge's AMIC mirror date variants are not used when AMIC People provides the primary profile.

## Boundary

Runtime web scraping, production writes, OIDC, DB conversion, production_ready, and go-live claims are false for this source-map.
