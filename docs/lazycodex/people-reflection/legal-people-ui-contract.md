# Legal People UI Contract

Program: `LCX-PPL Full Reflection`
Status: `local_ui_reflection_ready`
Scope: `LCX-PPL-05.01` through `LCX-PPL-05.05`

This contract covers the UI reflection layer for legal People. It reframes
People from an HRX-only employee surface into a Client-Matter-People workspace
with HRX still reachable as an embedded sub-area.

## UI Surfaces

| TUW | Surface | Primary files | Claim |
| --- | --- | --- | --- |
| `LCX-PPL-05.01` | People Navigation IA | `apps/web/src/components/Shell.jsx`, `apps/web/src/people/PeopleHome.tsx` | Complete |
| `LCX-PPL-05.02` | Legal People Directory UI | `apps/web/src/people/legal/LegalPeopleWorkspace.tsx` | Complete |
| `LCX-PPL-05.03` | People Detail Workspace | `apps/web/src/people/legal/LegalPeopleWorkspace.tsx`, `apps/web/src/people/hrxApiClient.ts` | Complete |
| `LCX-PPL-05.04` | Relationship Panel | `apps/web/src/people/legal/LegalPeopleWorkspace.tsx` | Complete |
| `LCX-PPL-05.05` | Client/Matter Backlinks | `apps/web/src/components/ClientsSurface.jsx`, `apps/web/src/components/MattersSurface.jsx` | Complete |

## API Bindings

- `GET /api/hrx/legal-people/search`
- `GET /api/hrx/legal-people/:person_id`
- `GET /api/hrx/legal-people/relationships`

## Claim Boundary

Allowed current claim:

`LCX-PPL-05` local UI reflection is implemented for People navigation,
directory, detail workspace, relationship panel, and Client/Matter backlinks.

Not claimed:

- Browser QA receipt
- Full People legal relationship runtime-ready candidate completion
- Production readiness
- Go-live approval
- Enterprise trust approval
- Final AI legal/conflict decision authority

## Validator

```json
"lcx:ppl:ui:validate": "node scripts/validate-lcx-ppl-ui.mjs"
```
