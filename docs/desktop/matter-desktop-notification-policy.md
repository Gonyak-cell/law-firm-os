# matter Desktop Notification Policy

Status: P5 design-active
Source ledger: `docs/desktop/matter-desktop-loop-tuw-ledger.json`
Scope: `MDT-P5-W02-T01`

## Boundary

Desktop notifications are generic route prompts only. They do not carry privileged matter content, billing content, document excerpts, or client-identifying text. Production go-live, public release, and owner approval remain false until explicit receipts exist.

## Lock Screen Copy Rule

On lock screen and notification center surfaces, notification templates must forbid:

- client names
- matter names
- document names
- document snippets
- deadlines with sensitive labels
- billing amounts
- opposing-party names
- privileged facts, litigation strategy, settlement terms, or health/financial identifiers

Allowed notification copy is generic, for example:

- `matter update`
- `A workspace item needs review`
- `Open matter to continue`

## Route Intent Rule

Notification click handling may pass only a route intent into the desktop deep-link parser. The notification payload must not include hidden client names, matter names, document names, snippets, billing amounts, or write-action instructions.

## Review Rule

Every notification template must be covered by the notification copy validator before it is used by the desktop shell.
