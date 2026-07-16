# Law Firm OS Design Contract

## 1. Product Character

Law Firm OS is a restrained operational interface for legal work. The Forest skin uses architectural imagery, deep green surfaces, white type, compact spacing, and flat record-oriented layouts. Decoration must not compete with client, matter, people, vault, or portal data.

## 2. Color and Material

- Product surfaces and interaction colors come from the existing `--am-*` tokens in `apps/web/src/styles.css`.
- Forest heroes use the existing deep green base and white foreground text.
- Photography is subordinate to the interface: shared Forest hero images render at `0.24` opacity over the Forest base.
- Home uses a lighter left-to-right green gradient (`0.58 → 0.16`) and a `52%` vertical focal point so both architectural structures remain visible while the greeting stays readable.
- No decorative blur, glow, image animation, carousel, or automatic rotation.

## 3. Typography

- Heading: `--font-heading` (`SUITE Matter`, then `Pretendard Matter`).
- Body: `--font-body` (`Pretendard Matter`, then `SUITE Matter`).
- Product hero headings remain regular weight; imagery must not require heavier text.
- Product hero titles use `--am-font-size-hero` (`40px` desktop, `34px` mobile).
- Section and tab labels use `--am-font-size-section` (`16px`).
- Tables, list rows, controls, and primary interface copy use `--am-font-size-body` (`14px`).
- Dates, status context, field help, and secondary descriptions use `--am-font-size-meta` (`12px`).
- Font sizes never scale continuously with viewport width.

## 4. Application Density

- Page padding is `20px` horizontally and `16px` vertically on full desktop windows.
- Panel content uses `16px` padding and repeated surface gaps use the `4px` spacing scale.
- Standard table headers and rows share a `44px` height with vertically centered content.
- Primary tabs use a `42px` height. Icon and compact controls use `32px`; topbar controls use `38px`.
- At `1180px`, `820px`, and `640px`, spacing steps down without shrinking body or table text.
- Narrow layouts reflow or use explicit internal scrolling; page-level horizontal clipping is not allowed.

## 5. Spacing and Geometry

- Preserve the existing Forest hero height, padding, radius, and shadow.
- Photography uses `object-fit: cover` and the full hero bounds.
- Hero content stays above imagery and retains its current alignment at desktop, tablet, and mobile breakpoints.

## 6. Reusable Primitives

### Product Hero

- Home, Client, Matter, People, Search, and Portal each own one unique architectural image.
- An attached image may appear in only one product hero.
- ForestHero's `image` prop is the shared implementation seam for Client, Matter, People, Search, and Portal.
- Home uses the same contract through its existing `home-dashboard-hero` background layer.
- Images are decorative: empty alt text, no pointer events, and no accessible-name contribution.

### Search Product Hero

- Search reuses the original Vault photographic hero and changes only its visible product title to `Search`.
- Search controls and filters remain in the work card below the hero; they are not embedded in the hero.
- The hero contains no additional Search-specific scope label, description, statistics, or actions.
- Search dashboard sections use existing list-row and panel tokens; no icon-card feature grid is introduced.

States:

- Default: unique image visible beneath the Forest treatment.
- Responsive: image crops without tiling or distortion.
- Text: white title and subtitle retain readable contrast across the crop.
- Reduced motion: unchanged because heroes contain no image motion.

## 7. Responsive Behavior

- Desktop and tablet keep one full-bleed image per product hero, including Search.
- Mobile crops the same image; it never swaps to or repeats another product's image.
- No hero may create page-level horizontal overflow.

## 8. Accessibility

- Product titles remain real headings in the content layer.
- Decorative images are hidden from assistive technology.
- Text contrast is validated in the rendered application, not inferred from the source image.
- Search retains a visible hero heading; the explicit input label, native date controls, and submit button remain in the work card below it.

## 9. Accepted Debt

- Global utility screens retain the existing generic Forest background because the six supplied images are reserved for the six product axes.
- Hero states are checked by the existing UI regression suite and browser QA at product routes; no separate component gallery is added for this bounded asset change.

## Reference

Lazyweb design report: https://www.lazyweb.com/report/lazyweb/f77fdb98-4479-45f9-8123-3c71be428052/?source=create
