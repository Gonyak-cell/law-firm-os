# LCX-PPL-04 Evidence Receipt

Generated at: 2026-06-24T10:13:46Z  
Local time: 2026-06-24T19:13:46+0900  
Program: `LCX-PPL Full Reflection`

## Scope

This receipt covers:

- `LCX-PPL-04.01` People Search API
- `LCX-PPL-04.02` People Detail API
- `LCX-PPL-04.03` Relationship API
- `LCX-PPL-04.04` Permission-Aware Response

It does not claim UI reflection, browser QA, production readiness, go-live
approval, enterprise trust approval, or full runtime-ready candidate completion.

## Artifacts Created

| Artifact | Purpose |
| --- | --- |
| `packages/hrx/src/legal-people-api.js` | Local runtime read model for legal People search, detail, relationship pivots, and permission-aware response shaping. |
| `apps/api/src/hrx-runtime-context.js` | HRX API routes for legal People search, detail, and relationships. |
| `apps/api/src/routes/hrx/route-policy-map.js` | Fail-closed HRX authz policies requiring `hrx.legal_people.read`. |
| `packages/hrx/test/legal-people-api.test.js` | Focused read model coverage for filters, detail payloads, redaction, relationship pivots, and claim boundaries. |
| `apps/api/test/hrx/legal-people-api.test.js` | Server/API coverage for route behavior, restricted vs privileged responses, and authz denial. |
| `docs/lazycodex/people-reflection/legal-people-api-contract.json` | Machine-readable `LCX-PPL-04` API contract. |
| `docs/lazycodex/people-reflection/legal-people-api-contract.md` | Reader-facing API contract summary. |
| `scripts/validate-lcx-ppl-api.mjs` | Validator for `LCX-PPL-04.01` through `LCX-PPL-04.04`. |

## Package Script

```json
"lcx:ppl:api:validate": "node scripts/validate-lcx-ppl-api.mjs"
```

## Command Evidence

### `node --test packages/hrx/test/legal-people-api.test.js`

Result: `PASS`

```text
1..6
# tests 6
# pass 6
# fail 0
```

### `node --test apps/api/test/hrx/legal-people-api.test.js`

Result: `PASS`

```text
1..4
# tests 4
# pass 4
# fail 0
```

### `npm run hrx:authz:validate`

Result: `PASS`

```text
HRX route authz validation passed.
route_policy_count: 29
```

### `npm run lcx:ppl:api:validate`

Result: `PASS`

```json
{
  "verdict": "PASS",
  "program_id": "LCX-PPL Full Reflection",
  "scope": [
    "LCX-PPL-04.01",
    "LCX-PPL-04.02",
    "LCX-PPL-04.03",
    "LCX-PPL-04.04"
  ],
  "endpoints": 3,
  "legal_people_seed_count": 9,
  "relationship_count": 6,
  "search_api_complete": true,
  "detail_api_complete": true,
  "relationship_api_complete": true,
  "permission_aware_api_response_complete": true,
  "runtime_ready_candidate_complete": false,
  "production_ready": false,
  "enterprise_trust_approved": false
}
```

### `node --test packages/hrx/test/*.test.js`

Result: `PASS`

```text
1..342
# tests 342
# pass 342
# fail 0
```

### HRX API/runtime test suite

Command:

```text
node --test apps/api/test/hrx/*.test.js apps/api/test/hrx-runtime-api.test.js apps/api/test/hrx-durable-runtime.test.js apps/api/test/hrx-audit-write.test.js apps/api/test/hrx-observability.test.js apps/api/test/hrx-step-up.test.js
```

Result: `PASS`

```text
1..68
# tests 68
# pass 68
# fail 0
```

### Existing LCX and parity validators

Result: `PASS`

```text
npm run lcx:ppl:contract:validate
npm run lcx:ppl:relationship:validate
npm run hro:deel-parity:validate
npm run sf:client-matter-parity:validate
json ok
git diff --check: no output
```

## Runtime API Coverage

- Search supports type, organization, Client, Matter, status, and text filters.
- Detail returns profile, affiliations, Client refs, Matter refs, relationships, conflict refs, ethical-wall refs, audit summary, and claim boundary.
- Relationship endpoint supports person, Client, Matter, Organization, and relationship-type pivots.
- Route policy map requires `hrx.legal_people.read` and fails closed before runtime when missing.
- Restricted actors receive redacted sensitive refs and restricted relationship targets.
- Privileged legal roles can see restricted target refs without raw contact/provider payloads.

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
