# Corporate administration documents

Corporate originals use a real `dms-auxiliary/DmsWorkspace` with
`scope_type: legal_entity_administration`, `matter_id: null`,
`synthetic_only: false`, and an explicit owner. The workspace binds one Entity,
Party, Organization, master-data permission reference, and DMS permission
envelope. It does not create a Matter, MatterClient, ClientGroup, CRM client,
or a synthetic folder. Existing matter workspaces retain their authority.

## Deployment order

1. Integrate the runtime and foundation `016_dms_corporate_workspace` with the
   exact operational migration catalog. The installation-authority migration
   `309_client_internal_unsigned_installation_authority` is owned by its
   separate change. The combined catalog has 81 entries: 16 foundation, 55 HRX,
   and 10 email/installation entries. Preserve the independently pinned
   79-entry and installation-only 80-entry catalogs in the API's explicit
   migration bridge. The general migration verifier remains strict.
2. Deploy the reviewed bridge runtime before applying additive DDL. Existing
   Matter uploads use their original INSERT columns even before 016 exists.
   Do not execute corporate commands before the 016 catalog/checksum readback
   passes. A source build or fixture database is not a live migration receipt.
3. Apply 016 through the existing approved migration runner. It adds an
   immutable workspace digest to upload sessions, permits null matter only
   under canonical corporate authority, and installs workspace/document
   guards. It neither updates nor deletes existing company or matter data.
4. After DDL, rollback must use a reviewed bridge artifact that accepts the
   exact new catalog. Do not roll back to a runtime accepting only 79 entries,
   remove migration history, or drop the new column or workspace records.

## Private execution

Keep source files, mappings, selected people and legal entities, signatures,
and execution receipts outside Git and installers. Use restricted local files
and the existing scoped operator access. The signed-in owner's principal is
the source of `actor_id` and `owner_user_id`; filenames or a proposed legal
entity ID are not existing account authority.

`packages/dms/src/corporate-workspace-service.js` exposes
`planCorporateWorkspace` and `executeCorporateWorkspace`. Both use the existing
authenticated PostgreSQL transaction and domain ledger. The execution requires
an independent trusted `expectedRegistrySha256`, the reviewed source commit and
tree, and a current owner approval for `lawos-corporate-workspace`. The approval
packet binds the entire manifest and the before/after workspace hashes. A
signed rejection, changed mapping, stale hash, or expired approval is rejected.

1. Create a manifest with schema `law-firm-os.corporate-workspace.v1`, operation
   `create`, environment, source SHA/tree, tenant, actor, approved mapping hash,
   `before_payload_sha256: null`, and the explicit workspace fields. Workspace
   fields are `workspace_id`, `name`, `legal_entity_id`, `organization_id`,
   `party_id`, `owner_user_id`, `permission_ref`, `permission_envelope_id`, and
   `audit_trace_id`. The service verifies the owner account is active, plans
   the exact creation, and writes only `pending_anchor` after signature
   validation. One legal entity cannot acquire a second corporate workspace.
2. Upload each approved original using the existing
   `createPostgresDmsUploadRuntime().uploadDocument` path. Supply the actual
   workspace ID, null matter, owner actor, and its permission envelope. The
   runtime locks the canonical workspace and derives its digest; caller-supplied
   owner or scope cannot override it. Stage and finalize independently verify
   the bytes; metadata, audit, and outbox commit through the existing DMS
   transaction. Preserve the original file/version and returned receipt.
3. Use `planCorporateRecordImport` and `executeCorporateRecordImport` with
   `binding.scope_type: legal_entity_administration`, null `matter_id` and
   `record_matter_id`, and exact workspace/owner/permission/anchor bindings.
   Documents also name this scope. The importer validates committed canonical
   versions and retains page numbers, original digest, source ID, legal entity,
   document version, and permission scope in append-only field evidence.
4. Independently read the three canonical master-data anchors, document
   versions/FileObjects, and exact object-storage versions and bodies. Form an
   `activate` manifest with the current workspace hash, three
   `anchor_payload_sha256` values keyed by Entity/Party/Organization, the
   corporate import manifest/plan/field-evidence hashes, and the complete
   workspace document set. Each document names document/version/FileObject/
   object IDs, SHA-256, and byte size. Plan and sign this separate activation.
   Activation verifies the anchors, import audit/outbox lineage, source
   evidence, committed document set, and absence of unfinished uploads before
   setting `active` and adding the actual master-data references.
5. Read back the receipt and canonical payload hash. The same approved command
   replays without a second mutation, audit event, or outbox event. Use
   `readOnly: true` to verify an existing receipt. Activation/readback verifies
   database metadata; object-storage body and version readback remains a
   separate explicit completion check.

## Permission and preservation checks

All public local Vault list, search, download, audit, and governance paths hide
`pending_anchor` documents from every principal, including the owner. Active
corporate documents require the normal authenticated action permission plus
the owner or an exact tenant/principal/workspace-or-document ObjectAcl allow.
An exact matching deny wins even for the owner. ACL authority must be current
and loaded. Broad `vault.read` alone does not authorize a corporate document.
Collections are trimmed per item before counts or snippets are exposed; audit
events require a canonical visible object. Test an owner, an unrelated user
with broad Vault read, an explicit reader, and a matching deny through the
actual deployed API. Held and archived workspaces stay hidden; preservation
operations may still extend legal holds internally without changing content.

Corporate documents cannot enter a Matter-backed precedent source, and their
workspace cannot be reassigned or deleted. Old matter workspaces, documents,
versions, and permissions must have matching before/after hashes. A separate
AMIC Vault provider has its own authority; this local DMS check does not prove
that provider's permissions or desktop routing.

The S3 commit and master-data/workspace transactions are separate. A failed
upload records `manual_recovery_required` and preserves staged or committed
bytes. Reconciliation and orphan cleanup cannot delete corporate bytes.
Activation remains blocked while an upload is unfinished. Retain the original
failure receipt and prepare an explicit reviewed recovery; do not purge the
session, overwrite the receipt, delete an object, or expose pending data to
make a batch appear complete.

Focused verification:

```sh
node --test --test-concurrency=1 \
  packages/dms/test/postgres-corporate-workspace.test.js \
  packages/dms/test/postgres-corporate-upload.test.js \
  apps/api/test/vault-corporate-permission.test.js \
  scripts/test/corporate-record-import.test.mjs
```

Use Node 22 and available PostgreSQL binaries. A skipped PostgreSQL fixture is
not evidence that the storage or authorization boundary passed.
