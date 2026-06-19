# matter Bilingual Font Plan

This plan is a cross-cutting requirement for the Amplitude-based matter UI rebuild. It applies to every implementation phase in `matter-amplitude-implementation-plan.md`.

## Locale Versions

| Version | Locale key | Heading / display font | Body / UI font | Rule |
| --- | --- | --- | --- | --- |
| Korean | ko | SUITE | Pretendard | Headings, navigation labels, page titles, modal titles use SUITE; body, tables, forms, helper text, cards, and dense Amplitude-style data surfaces use Pretendard. |
| English | en | Comfortaa | Comfortaa | Use Comfortaa as the primary English UI typeface so the English version matches the matter logo wordmark font from docs/ui-reference/prototypes/matter-by-amic-logo-animation.html. |

## Source Font Assets

| Font | Source | Role | Implementation note |
| --- | --- | --- | --- |
| Pretendard | local font library (outside repo); deployed copies live in apps/web/public/fonts/pretendard/ | Korean body font | Copy required OTF weights into the web app font asset folder and load through @font-face. Do not reference the local font library directly at runtime. |
| SUITE | local font library (outside repo); deployed copies live in apps/web/public/fonts/suite/ | Korean heading font | Copy required OTF weights into the web app font asset folder and load through @font-face. Do not reference the local font library directly at runtime. |
| Comfortaa | docs/ui-reference/prototypes/matter-by-amic-logo-animation.html and current apps/web/index.html Google Fonts reference | English primary and matter logo font | Use weights 300 and 400 to match the logo treatment; add heavier weight only if an English UI control fails readability. |

## Implementation Requirements

1. Create a locale mode for `ko` and `en`; do not hard-code one language into the component tree.
2. Add `lang="ko"` and `lang="en"` handling at the app shell/root level.
3. Define typography tokens before rebuilding components:
   - `--font-ko-heading: "SUITE"`
   - `--font-ko-body: "Pretendard"`
   - `--font-en: "Comfortaa"`
   - `--font-ui-fallback: "Avenir Next", "SF Pro Rounded", Inter, sans-serif`
4. Korean UI must use SUITE for headings/navigation and Pretendard for body, forms, tables, modals, and dense data text.
5. English UI must use Comfortaa as the primary UI font to match the matter logo wordmark.
6. Build auth/onboarding, shell, tables, modals, dropdowns, dashboards, Ask matter, experiments, admin, and dark-mode states in both language modes.
7. Capture visual verification for both locales after every phase.

## Phase Integration

- P0 foundation: copy/font-load assets, define locale dictionaries, define typography tokens, and add a locale switcher or route-level locale mode.
- P1 app shell: verify topbar, sidebar, search, invite chip, and workspace labels in Korean and English.
- P2 auth/onboarding: verify all screenshots `0-13` and `303-317` in Korean and English, including login, signup, password reset, verification, and organization creation states.
- P3-P10: every implemented screen state must include both Korean and English copy, with matching spacing and no text overflow.

## Verification Gate

- `ko` screenshot set: Playwright capture for each implemented phase.
- `en` screenshot set: Playwright capture for each implemented phase.
- Font-loading check: browser computed styles must show SUITE/Pretendard for Korean and Comfortaa for English.
- Text-fit check: Korean and English strings must not overflow buttons, tables, cards, modals, or side panels.
