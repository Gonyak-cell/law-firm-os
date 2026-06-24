# Legal People Ethics Contract

Program: `LCX-PPL Full Reflection`
Status: `local_ethics_permission_surface_ready`
Scope: `LCX-PPL-06.01` through `LCX-PPL-06.04`

This contract covers ethics, conflict, permission, and reviewer receipt
surfaces for legal People.

## Runtime Route

- `GET /api/hrx/legal-people/ethics`

## Surfaces

| TUW | Surface | Primary files | Claim |
| --- | --- | --- | --- |
| `LCX-PPL-06.01` | Ethical Wall UI | `apps/web/src/people/legal/LegalPeopleWorkspace.tsx` | Complete |
| `LCX-PPL-06.02` | Conflict Review Queue | `packages/hrx/src/legal-people-ethics.js`, `apps/api/src/hrx-runtime-context.js` | Complete |
| `LCX-PPL-06.03` | Permission Admin Linkage | `apps/web/src/people/admin/PermissionAdminPanel.jsx` | Complete |
| `LCX-PPL-06.04` | Reviewer Receipt Model | `packages/hrx/src/legal-people-ethics.js` | Complete |

## Claim Boundary

Allowed current claim:

`LCX-PPL-06` local ethics, conflict, permission, and reviewer receipt surfaces
are implemented and validator-backed.

Still false:

- Browser QA complete
- Full People legal relationship runtime-ready candidate complete
- Production readiness
- Go-live approval
- Enterprise trust approval
- Final AI legal/conflict decision authority

## Validator

```json
"lcx:ppl:ethics:validate": "node scripts/validate-lcx-ppl-ethics.mjs"
```
