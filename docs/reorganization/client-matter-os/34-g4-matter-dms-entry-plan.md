# G4 Matter DMS Entry Plan

Status: Proposed
Gate: `G4 DMS/Matter Execution Gate`
Depends on: G1 implementation evidence review, G2 implementation evidence review, G3 implementation evidence review
TUW range: `LFOS-G4-W05-T001` through `LFOS-G4-W06-T016`

## Purpose

G4 turns the Matter and DMS descriptor evidence into the execution lane for
Matter opening, matter numbering, team membership, task/deadline runtime,
status history, client-safe matter reporting, matter closing checks, matter
dashboard states, DMS workspace/document/version controls, privilege/redaction
boundaries, secure sharing, email filing, ACL-aware search, and DMS audit
coverage.

This plan opens G4 planning only. It does not claim G4 runtime readiness while
the stacked G1, G2, and G3 PRs are still in draft review.

This plan does not claim G4 runtime readiness.

Matter opening remains prohibited unless G3 has produced a valid
Intake-to-Matter clearance token. Matter and DMS must remain matter-scoped,
permission-trimmed, audit-bound, and safe for silent-matter handling.

## Existing Evidence

| Surface | Current evidence | G4 treatment |
| --- | --- | --- |
| `contracts/matter-core-contract.json` | RP05 Matter Core descriptor contract for Matter, MatterMember, MatterTask, MatterCalendarEvent, MatterWiki, and MatterGraph surfaces | Reuse as source contract; convert Matter opening, numbering, team, task, deadline, status, report, closing, silent-matter, and dashboard controls into runtime tests. |
| `contracts/dms-core-contract.json` | RP06 DMS Core descriptor contract for DmsWorkspace, folders, documents, versions, file objects, rendition, extracted text, OCR, email thread, and relation surfaces | Reuse as source contract; convert workspace, folder, document, version, storage abstraction, lineage, lock, privilege, redaction, secure link, search ACL, UI, and audit controls into runtime tests. |
| `contracts/email-dms-core-contract.json` | RP08 Email and Office Native DMS descriptor contract for email ingestion, filing, Office-native editing, and DMS sync | Reuse as source contract for email filing and Outlook placeholder boundaries; do not treat RP08 descriptor completion as filing runtime readiness. |
| `packages/matter/README.md` | RP05 generated pack evidence through CP00-197 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as Matter runtime readiness proof. |
| `packages/dms/README.md` | RP06 generated pack evidence through CP00-234 and no-runtime/no-write boundaries | Treat as descriptor evidence; do not use pack catalog status as DMS runtime readiness proof. |
| `packages/email-dms/README.md` | RP08 generated pack evidence through CP00-298 and email filing no-runtime boundaries | Treat as descriptor evidence; do not use pack catalog status as email filing runtime readiness proof. |
| `docs/reorganization/client-matter-os/33-g3-e-intake-ui-closeout-report.md` | G3 closeout descriptor records conflict memo, waiver, engagement UI, and Opportunity-to-Matter bypass controls | Use as entry handoff only; G4 Matter opening still requires accepted G3 evidence or fail-closed clearance stubs. |
| `docs/reorganization/client-matter-os/12-risk-register.md` | R-005 AI DMS permission bypass, R-011 DMS search index ACL, and R-015 descriptor/runtime confusion risks | Use as G4 negative evidence requirements. |
| `docs/reorganization/client-matter-os/13-workflow-state-and-folder-checklist.md` | Matter Opening, matter execution, DMS workspace, and Matter closing workflow states | Use as workflow coverage map for G4 runtime evidence. |

## Runtime Evidence Still Required

G4 cannot close until the following evidence exists in implementation PRs:

1. Matter schema runtime requires a valid G3 clearance token and blocks direct
   Opportunity-to-Matter creation.
2. Matter number generation is tenant-scoped, idempotent, and duplicate-safe.
3. Matter opening transaction creates Matter, ACL, DMS workspace, and Billing
   references atomically or fails closed without partial state.
4. MatterMember roles enforce permission boundaries and audit add/remove
   changes.
5. Matter team UI supports add/remove states without leaking hidden members,
   silent-matter presence, or unauthorized counts.
6. MatterTask and MatterCalendarEvent APIs enforce status transitions,
   deadline-change audit, and critical-deadline dual control.
7. MatterStatusHistory is immutable and preserves actor, reason, and transition
   evidence.
8. Client report objects are portal-projection safe and exclude privileged,
   internal, or unresolved conflict material.
9. Matter closing checklist blocks closing when WIP, AR, holds, retention, or
   unresolved tasks remain open.
10. Silent matter visibility rules and Matter dashboard UI omit unauthorized
    matters and trim detail consistently.
11. DMS workspace, folder, document, version, and file-object APIs are
    matter-scoped and do not expose raw storage paths or document bytes.
12. Document hash/lineage, check-in/check-out, privilege label, redaction,
    secure link, email filing, Outlook placeholder, search ACL, DMS UI, and DMS
    audit coverage all have denied/leak negative tests.
13. R-005, R-011, and R-015 remain explicit G4 control requirements.
14. G4 closeout records command output, PR state, G1/G2/G3 evidence
    disposition, and human review disposition.

## PR Slice Plan

| Slice | TUWs | Target branch | Scope | Exit evidence |
| --- | --- | --- | --- | --- |
| G4-A | `LFOS-G4-W05-T001`-`LFOS-G4-W05-T004` | `codex/lawos-g4-matter-opening-foundation` | Matter schema runtime, matter number service, Matter opening transaction, MatterMember schema | Clearance required, idempotent numbering, atomic ACL/DMS/Billing refs, member role permission tests. |
| G4-B | `LFOS-G4-W05-T005`-`LFOS-G4-W05-T010` | `codex/lawos-g4-matter-execution-workflow` | Matter team UI, MatterTask API, MatterCalendarEvent API, critical deadline dual control, MatterStatusHistory, Client report object | Add/remove audit, status transition, deadline-change audit, two-person confirmation, immutable history, portal projection safe tests. |
| G4-C | `LFOS-G4-W05-T011`-`LFOS-G4-W05-T014` | `codex/lawos-g4-matter-closeout-ui` | Matter closing checklist, silent matter support, Matter dashboard UI, G4 Matter closeout | WIP/AR blocks closing, unauthorized list omission, ACL trimming, Matter runtime evidence. |
| G4-D | `LFOS-G4-W06-T001`-`LFOS-G4-W06-T006` | `codex/lawos-g4-dms-workspace-document-foundation` | DMS workspace, folder, document, document version, file-object storage abstraction, document hash/lineage | Matter required, path permission, upload audit, immutable version, no raw path leak, hash mismatch detection tests. |
| G4-E | `LFOS-G4-W06-T007`-`LFOS-G4-W06-T013` | `codex/lawos-g4-dms-security-email-search` | Check-in/check-out, privilege labels, redaction metadata, secure link sharing, email filing, Outlook placeholder API, search index ACL | Concurrent edit, AI/search exclusion, redacted export, expiry/MFA/watermark, Matter filing, no credential leak, unauthorized result absent tests. |
| G4-F | `LFOS-G4-W06-T014`-`LFOS-G4-W06-T016` | `codex/lawos-g4-dms-ui-audit-closeout` | DMS workspace UI, DMS audit coverage, G4 DMS closeout | Version/privilege display, view/download/share audit events, DMS runtime evidence. |

## TUW Coverage

| TUW | Work | Required evidence |
| --- | --- | --- |
| `LFOS-G4-W05-T001` | Matter schema runtime implementation | Clearance required test. |
| `LFOS-G4-W05-T002` | Matter number service | Idempotency duplicate test. |
| `LFOS-G4-W05-T003` | Matter opening transaction | ACL/DMS/Billing refs atomic test. |
| `LFOS-G4-W05-T004` | MatterMember schema | Member role permission test. |
| `LFOS-G4-W05-T005` | MatterTeam UI | Add/remove audit test. |
| `LFOS-G4-W05-T006` | MatterTask schema/API | Status transition test. |
| `LFOS-G4-W05-T007` | MatterCalendarEvent schema/API | Deadline change audit test. |
| `LFOS-G4-W05-T008` | Critical deadline dual control | Two-person confirmation test. |
| `LFOS-G4-W05-T009` | MatterStatusHistory | Immutable history test. |
| `LFOS-G4-W05-T010` | Client report object | Portal projection safe test. |
| `LFOS-G4-W05-T011` | Matter closing checklist | WIP/AR open blocks closing. |
| `LFOS-G4-W05-T012` | Silent matter support | Unauthorized list omission test. |
| `LFOS-G4-W05-T013` | Matter dashboard UI | ACL trimming test. |
| `LFOS-G4-W05-T014` | G4 Matter closeout | Matter runtime evidence. |
| `LFOS-G4-W06-T001` | DMS workspace schema | Matter required test. |
| `LFOS-G4-W06-T002` | Folder schema/API | Path permission test. |
| `LFOS-G4-W06-T003` | Document schema/API | Upload audit test. |
| `LFOS-G4-W06-T004` | DocumentVersion schema/API | Immutable version test. |
| `LFOS-G4-W06-T005` | FileObject storage abstraction | No raw path leak test. |
| `LFOS-G4-W06-T006` | Document hash/lineage | Hash mismatch detection test. |
| `LFOS-G4-W06-T007` | Check-in/check-out | Concurrent edit test. |
| `LFOS-G4-W06-T008` | Privilege label model | AI/search exclusion test. |
| `LFOS-G4-W06-T009` | Redaction metadata | Redacted export test. |
| `LFOS-G4-W06-T010` | Secure link sharing | Expiry/MFA/watermark test. |
| `LFOS-G4-W06-T011` | Email filing schema | Matter filing test. |
| `LFOS-G4-W06-T012` | Outlook filing placeholder API | No credential leak test. |
| `LFOS-G4-W06-T013` | Search index ACL | Unauthorized search result absent. |
| `LFOS-G4-W06-T014` | DMS workspace UI | Version/privilege display test. |
| `LFOS-G4-W06-T015` | DMS audit coverage | View/download/share events. |
| `LFOS-G4-W06-T016` | G4 DMS closeout | DMS runtime evidence. |

## Entry Validation

```sh
npm run client-matter:g0:validate
npm run client-matter:g1:plan:validate
npm run client-matter:g1a:validate
npm run client-matter:g1b:validate
npm run client-matter:g1c:validate
npm run client-matter:g1d:validate
npm run client-matter:g2:plan:validate
npm run client-matter:g2a:validate
npm run client-matter:g2b:validate
npm run client-matter:g2c:validate
npm run client-matter:g2d:validate
npm run client-matter:g3:plan:validate
npm run client-matter:g3a:validate
npm run client-matter:g3b:validate
npm run client-matter:g3c:validate
npm run client-matter:g3d:validate
npm run client-matter:g3e:validate
npm run client-matter:g4:plan:validate
npm run rp05:matter-core:validate
npm run rp06:dms-core:validate
npm run rp08:email-dms-core:validate
npm run validate
```

The G4 plan validator confirms that all 30 G4 TUWs are represented, that Matter,
DMS, and Email-DMS descriptor evidence exists, that R-005/R-011/R-015 controls
are preserved, that G3 clearance remains required before Matter opening, and
that G4 runtime readiness remains open.

## Gate Boundary

G4 remains open. Planning artifacts, descriptor catalogs, generated RP05/RP06/RP08 closeout packs, and contract validators are entry evidence only.

G4 must not claim Matter/DMS runtime readiness before G1, G2, and G3 evidence is
human-reviewed or explicitly stubbed behind fail-closed tests.
