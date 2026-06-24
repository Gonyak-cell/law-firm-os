# LCX-PPL-04 Legal People API Contract

Program: `LCX-PPL Full Reflection`

Scope:

- `LCX-PPL-04.01` People Search API
- `LCX-PPL-04.02` People Detail API
- `LCX-PPL-04.03` Relationship API
- `LCX-PPL-04.04` Permission-Aware Response

## Runtime Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /api/hrx/legal-people/search` | Unified legal People directory search with type, organization, Client, Matter, status, and text filters. |
| `GET /api/hrx/legal-people/:person_id` | Person detail payload with profile, affiliations, Clients, Matters, relationships, conflict refs, ethical-wall refs, and audit summary. |
| `GET /api/hrx/legal-people/relationships` | Relationship pivot endpoint for person, Client, Matter, Organization, and relationship-type filters. |

## Permission Boundary

- Required HRX scope: `hrx.legal_people.read`.
- Trusted context comes from HRX authz headers, not query params.
- Privileged relationship detail roles: `security_admin`, `legal_ops`, `conflicts_reviewer`, `matter_admin`, `responsible_attorney`.
- Restricted actors receive relationship markers, review state, and redaction metadata without sensitive target refs.
- Raw contact values, provider payloads, credentials, document body text, and AI-final-decision claims are never included.

## Claim Boundary

Allowed current claim:

```text
LCX-PPL-04 local runtime API routes and permission-aware response shaping are validated.
```

Blocked current claims:

- Legal People UI reflection complete
- Browser QA complete
- People legal relationship runtime-ready candidate complete
- production ready
- go-live approved
- enterprise trust approved
- AI final decision allowed

