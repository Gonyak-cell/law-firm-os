# Domain Package

Shared core domain model definitions for Tenant, User, Group, Role, Permission/Policy references, Entity, Client, Matter, DMS references, and Audit references.

CP00-095 binds the first RP01 generated Risk C acceleration pack:

- Range: `RP01.P00.M00.S01-RP01.P02.M04.S06`
- Scope: RP01 contract baseline, package/domain model layout, ownership registry, and metadata-only service intake boundary
- No-write boundary: service intake normalizes requests, checks tenant/matter trace metadata, references permission, and emits audit hints without evaluating permission or writing audit/product state
- Handoff: Permission evaluation remains RP02-owned, Audit ledger writes remain RP03-owned, DMS document implementation remains RP06-owned, and Matter workflow behavior remains RP05-owned

CP00-096 binds the follow-on RP01 generated Risk B workflow pack:

- Range: `RP01.P02.M04.S07-RP01.P02.M06.S06`
- Scope: synthetic-only core-domain workflow routing, state transition enforcement, idempotency, lock decisions, persistence boundary checks, blocked-claim mapping, rollback/retry planning, and synthetic fixture execution
- No-write boundary: workflow results remain synthetic fixture snapshots only; they do not evaluate runtime permission, write audit ledger events, create database rows, or mutate product state

CP00-097 binds the RP01 generated Risk C API/golden/evidence surface pack:

- Range: `RP01.P02.M06.S07-RP01.P04.M02.S03`
- Scope: synthetic API contract, golden-case matrix, Hermes evidence packet, Claude review packet, closeout handoff, and initial UI surface inventory
- No-write boundary: API responses use explicit visibility allowlists and synthetic fixtures only; they do not evaluate runtime permission, write audit ledger events, create database rows, mutate product state, or implement LDIP

CP00-098 binds the RP01 generated Risk B UI state surface pack:

- Range: `RP01.P04.M02.S04-RP01.P04.M05.S04`
- Scope: UI state contract, loading/empty/denied/review/ready state matrix, responsive mode rules, permission badge references, audit hint displays, Hermes UI evidence packet, Claude UI leak review prompt, and handoff to CP00-099
- No-write boundary: UI states are synthetic contract fixtures only; they display permission/audit references without evaluating permission, writing audit ledger events, creating database rows, mutating product state, or implementing LDIP

CP00-099 binds the RP01 generated Risk A permission/audit binding pack:

- Range: `RP01.P04.M05.S05-RP01.P04.M05.S14`
- Scope: permission/audit binding denied and review-required states, primary/secondary interactions, reference-only permission badges, display-only audit hints, error copy, desktop/mobile responsive rules, and keyboard/focus behavior
- No-write boundary: permission badges never imply approval, audit hints never create ledger events, and the binding matrix remains synthetic-only with no runtime permission evaluation, no audit writes, no product state writes, and no LDIP implementation

CP00-100 binds the RP01 generated Risk A permission/audit fixture evidence pack:

- Range: `RP01.P04.M05.S15-RP01.P04.M06.S04`
- Scope: visual density check, synthetic fixture binding, build-smoke anchors, Hermes UI evidence, Claude leak-review prompt, closeout handoff, and the first M06 synthetic fixture surface states
- No-write boundary: fixture states use synthetic identifiers only; they do not evaluate permissions, create audit ledger events, mutate product state, load real client data, or implement LDIP

CP00-101 binds the RP01 generated Risk C synthetic fixture catalog pack:

- Range: `RP01.P04.M06.S05-RP01.P05.M09.S03`
- Scope: denied/review fixture UI states, P04 test/golden/Hermes/Claude/handoff packet coverage, and P05 synthetic fixture catalog cases through the opening Claude review packet fixtures
- No-write boundary: fixture catalog entries, UI states, Hermes evidence, and Claude packets remain synthetic-only; they do not evaluate permissions, create audit ledger events, create database rows, mutate product state, load real client data, or implement LDIP

CP00-102 binds the RP01 generated Risk C permission matrix reference catalog pack:

- Range: `RP01.P05.M09.S04-RP01.P06.M08.S16`
- Scope: permission matrix rows for view/search/mutation/export/share/AI retrieval, audit hint fields, matched-rule capture, deny-over-allow reference behavior, legal hold, ethical wall, object ACL, review/approval routing, security trimming proof, permission fixture expectations, allowed/denied tests, Hermes evidence packet, Claude review packet, and closeout handoff
- No-write boundary: permission matrix entries are reference-only and synthetic-only; they do not evaluate runtime permission, create audit ledger events, create database rows, mutate product state, load real client data, or implement LDIP

CP00-103 binds the RP01 generated Risk A permission review packet boundary:

- Range: `RP01.P06.M08.S17-RP01.P06.M09.S06`
- Scope: audit event expectation, permission fixture, allowed/denied expected tests, base tenant/user/matter/document fixture references, and export/share decision bindings for the Claude review packet boundary
- No-write boundary: export and share decisions are approval-required references only; they do not execute downloads, perform external sharing, evaluate runtime permission, create audit ledger events, create database rows, mutate product state, load real client data, or implement LDIP

CP00-104 binds the RP01 generated Risk C failure taxonomy and evidence catalog pack:

- Range: `RP01.P06.M09.S07-RP01.P07.M08.S17`
- Scope: AI retrieval review-required reference, audit hint fields, matched-rule capture, deny-over-allow and legal-hold references, closeout handoff rows, and P07 failure taxonomy, failure fixtures, failure tests, audit failure hints, blocked-claim receipts, and Hermes failure evidence references
- No-write boundary: failure taxonomy entries and scenario rows are expected-failure references only; they do not evaluate runtime permission, write audit ledger events, mutate product state, create database rows, execute AI retrieval, run retries, mutate locks, perform rollback or compensation, load real client data, or implement LDIP

CP00-105 binds the RP01 generated Risk C evidence review catalog pack:

- Range: `RP01.P07.M08.S18-RP01.P09.M03.S09`
- Scope: P07 failure closeout tail, P08 Hermes command/evidence receipt matrix, PASS/PASS_WITH_FINDINGS/BLOCK semantics references, no-real-data and regression receipts, and P09 architecture/security/permission/audit/test/UI/downstream risk review question catalog
- No-write boundary: evidence and review catalog entries are reference-only; they do not execute Claude review, grant human approval, evaluate runtime permission, write audit ledger events, mutate product state, create database rows, execute AI retrieval, execute export/share flows, run retries, mutate locks, perform rollback or compensation, load real client data, or implement LDIP

CP00-106 binds the RP01 generated Risk B review outcome routing pack:

- Range: `RP01.P09.M03.S10-RP01.P09.M07.S08`
- Scope: go/no-go verdict format, finding routing map, architecture/security/permission/audit/test/UI/downstream review questions, risk register entries, and severity taxonomy references across the P09 review workflow boundary
- No-write boundary: review outcome routing entries are reference-only; they do not execute Claude review, grant human approval, mutate issue routing, evaluate runtime permission, write audit ledger events, mutate product state, create database rows, execute AI retrieval, execute export/share flows, run retries, mutate locks, perform rollback or compensation, load real client data, or implement LDIP

CP00-107 binds the RP01 terminal Risk B review closeout readiness pack:

- Range: `RP01.P09.M07.S09-RP01.P09.M10.S01`
- Scope: final severity taxonomy, go/no-go verdict format, finding routing map, Hermes evidence packet references, Claude review packet references, and the first RP01 closeout handoff review question before transition to RP02
- No-write boundary: review closeout readiness entries are reference-only; they do not execute Claude review, grant human approval, mutate issue routing, evaluate runtime permission, write audit ledger events, mutate product state, create database rows, execute AI retrieval, execute export/share flows, run retries, mutate locks, perform rollback or compensation, load real client data, or implement LDIP
