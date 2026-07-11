# AMIC Forest UI Design System

This document records the live-code design contract for the matter by AMIC web UI. The running app is the source of truth; the AMIC Figma reference at `https://embed.figma.com/site/LnF5jO6v5RReAKvHzIMaHi` is a visual reference.

## Scope

- Forest is the default skin. Matter remains available through `?skin=matter` and the settings UI.
- Forest is a light canvas with white panels. Deep forest tones are reserved for the sidebar, hero band, selected navigation states, and structural accents.
- New UI should reuse existing classes first. Add a `forest-` prefixed class only when no existing class carries the intended role.

## Tokens

| Role | Value |
| --- | --- |
| Deep forest | `#0F3A32` |
| Forest dark | `#0B2D27` |
| Forest shadow | `#07201C` |
| Forest sidebar | `#0A2B24` |
| Emerald | `#26C260` |
| Emerald hover | `#1FAA52` |
| Emerald soft | `#E8F8ED` |
| App canvas | `#F7F8FA` |
| Border | `#E5E7EB` |
| Primary text | `#111827` |
| Muted text | `#5B677A` |
| Inverse text | `#FFFFFF` |

Semantic CSS variables map forest emerald through `--am-blue`, `--am-blue-hover`, and `--am-blue-soft` so legacy component contracts continue to work. Focus uses `--am-focus-ring`: Matter keeps `rgba(11, 101, 229, 0.45)`, Forest uses `rgba(38, 194, 96, 0.5)`.

Spacing is compact: panels use `--am-panel-pad: 12px`, page vertical spacing uses `--am-page-pad-y: 12px`, and component gaps should prefer the existing 4px and 8px rhythm. Cards and panels stay at 8px radius or less unless an existing component already defines a smaller value.

Shadows are restrained and green-tinted in Forest: use existing panel, hover, and primary-button shadows before adding a new shadow. Avoid decorative blur-only layers.

## Typography

- Headings: `"SUITE Matter", "Pretendard Matter", sans-serif`.
- Body: `"Pretendard Matter", "SUITE Matter", sans-serif`.
- Product text uses the bundled Regular faces at `font-weight: 400`, except table headers which use the bundled SemiBold face at `600`.
- Numeric counters and mixed Korean/English record values use Pretendard Regular with `font-variant-numeric: tabular-nums` where alignment is needed.
- Do not use mono or operating-system font fallbacks in product UI text.
- Table body cells and table-like record rows stay at `400`, including nested `strong`, links, buttons, and status text.
- Do not use negative letter spacing or viewport-scaled font sizes.

## Motion

- Motion is CSS-only.
- Standard timing: `200ms cubic-bezier(.25,.1,.25,1)`.
- Pressed controls may use `scale(.98)` where the existing forest rule already applies.
- Respect `prefers-reduced-motion: reduce`; motion should fall back to no transition and no transform.

## Components

### Buttons

- Primary: emerald fill, white text, existing forest glow.
- Secondary: white or subtle panel surface with border.
- Icon buttons: lucide icon first; use text only when the command would be unclear without it.

### Badges

| State | Tone |
| --- | --- |
| `live` | Emerald tint |
| `denied` | Neutral subtle surface and muted text |
| `guarded` | Neutral subtle surface and muted text |
| `review` | Low-saturation amber |
| `unavailable` / `error` | Red, currently `#BC2C1A` |

Large permission or review states keep their own `.live-data-*` blocks. Small badges should not borrow the large-state background treatment.

### Tables

Use deep green table headers only for primary list tables. Do not apply the header treatment to small proof tables, property grids, or helper summaries.

### Panels

Forest panel headings may use the small emerald tick idiom already present in live code. Do not wrap page sections in decorative cards; cards are for repeated items, tools, and modal-like framed content.

### Hero

- Home hero uses `forest-cover` at opacity `0.4`.
- Surface hero bands use the forest background at opacity `0.18`.
- Subtitle text should come from the paired `PageHeader` subtitle.
- When the hero takes over the visible heading, keep `PageHeader` text in the DOM with `hidden`; do not conditionally omit the text.
- SUITE/Pretendard stay fixed for Forest, regardless of locale.

### Empty States

Use the current `.live-data-state` structure. In Forest, keep empty and denied states compact, left-aligned, and solid-bordered. Prefer one concise action-oriented sentence.

### Runtime State Copy

| State | Short Label | Sentence Pattern |
| --- | --- | --- |
| `loading` | 확인 중 | 상태를 확인하고 있습니다. |
| `denied` | 권한 없음 | 권한 기준을 확인하세요. |
| `guarded` | 확인 필요 | 추가 확인 후 표시합니다. |
| `review` | 검토 | 담당자 검토 후 표시합니다. |
| `unavailable` | 실패 | 연결 상태를 확인하세요. |
| `empty` | 자료 없음 | 표시할 항목이 없습니다. |

### Sidebar

Forest sidebar uses the deep forest gradient, a right-side 3px active bar, and restrained green glow. The workspace card label is `워크스페이스`; it toggles the local utility panel and closes on view changes.

## New UI Checklist

- Reuse existing classes and component shapes before adding anything.
- New Forest-only classes use the `forest-` prefix and should be added to this document when they become reusable.
- Do not add the banned classes or phrases guarded by `ui-regression.test.mjs`.
- Avoid placeholders: use concrete IDs, dates, counts, and state labels from the existing runtime data.
- Keep the UI dense and operational. Avoid marketing copy, oversized hero prose inside work surfaces, and generic capability claims.
- Keep source text literals in place for proof scripts; use `hidden` or CSS hiding when a surface must visually suppress text.
