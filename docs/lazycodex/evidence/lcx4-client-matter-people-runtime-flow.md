# LCX4 Client Matter People Runtime Flow Evidence

Status: passed
Date: 2026-06-21
Branch: codex/runtime-spine-launch-tuw-crosswalk

## Scope

LCX4 drives Client, Matter, and People through executable package/runtime code
paths. It does not yet capture browser UI screenshots or HTTP manual QA; those
belong to LCX5.

## Direct Runtime Smoke

Executed a Node ESM smoke that imported these runtime surfaces directly:

- `packages/master-data/src/index.js`
- `packages/matter/src/index.js`
- `packages/hrx/src/repository.js`

Smoke output summary:

```json
{
  "client": {
    "person_id": "person-lcx4-contact",
    "organization_id": "org-lcx4-client",
    "client_group_id": "group-lcx4",
    "tenant_records": 7
  },
  "matter": {
    "outcome": "created",
    "matter_number": "M-TENANT-LCX4-2026-LCX4-OPENING",
    "workspace_id": "workspace-matter-lcx4",
    "ledger_id": "ledger-matter-lcx4",
    "audit_events": 1,
    "user_only_member_blocked": true,
    "team_employee_id": "emp-lcx4"
  },
  "people": {
    "employee_id": "emp-lcx4",
    "profile_id": "profile-lcx4",
    "link_purpose": "login_mapping",
    "user_employee_conflation_blocked": true,
    "employee_count": 1
  },
  "production_ready_claim": false,
  "actual_launch_go_live_claim": false
}
```

## Flow Coverage

| Flow | Runtime path exercised | Result |
| --- | --- | --- |
| Client master | Created Party, Entity, Person, Organization, and ClientGroup through Master Data repository/services | PASS |
| Client identity safety | Duplicate service invoked against tenant records | PASS |
| Matter opening | `openMatterTransaction` required clearance token, generated matter number, created DMS workspace and billing ledger side effects, and appended audit | PASS |
| Matter team guard | `addMatterTeamMember` rejected user-only member and accepted employee-backed member | PASS |
| People registry | HRX repository created Employee and EmploymentProfile | PASS |
| User/Employee split | HRX EmployeeUserLink used `login_mapping`; same Employee/User identifier was rejected | PASS |

## Command Validation

| Command | Result |
| --- | --- |
| `npm --workspace @law-firm-os/master-data test` | PASS, 95/95 |
| `npm --workspace @law-firm-os/matter test` | PASS, 104/104 |
| `node --test packages/hrx/test/repository.test.js packages/hrx/test/identity-link.test.js packages/hrx/test/compensation.test.js packages/hrx/test/evaluation.test.js packages/hrx/test/leave-balance.test.js packages/hrx/test/overtime.test.js` | PASS, 16/16 |
| `npm run client-matter:cmp-v1:g2:validate` | PASS, `19/19` |
| `npm run client-matter:cmp-v1:g4:validate` | PASS, `23/23` |
| `npm run client-matter:cmp-v1:g7:validate` | PASS, `26/26` |

## Boundary

LCX4 proves executable package/runtime flow behavior for Client, Matter, and
People. It does not prove browser rendering, live HTTP manual QA, external
identity provider behavior, production persistence, external storage, owner
approval, or go-live.
