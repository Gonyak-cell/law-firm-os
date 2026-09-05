# Corporate record import

The private operator uses `planCorporateRecordImport` to read the current master-data state and committed DMS source references, then obtains an owner approval for that exact plan. `executeCorporateRecordImport` applies the plan; the same entry point with `readOnly: true` verifies a completed import without writes.

Both `executeCorporateRecordImport` and `verifyCorporateImportApproval` require `expectedRegistrySha256` as a separate argument. The caller must obtain this digest from trusted, versioned execution configuration, such as an independently verified signed access descriptor. Never derive this argument from the approval bundle, its `registrySha256`, or the registry bytes submitted alongside the approval. There is no fallback to a bundle-supplied digest. Owner key rotation requires a separately authorized update of the trusted execution configuration.

```js
const result = await executeCorporateRecordImport({
  pool,
  manifest,
  plan,
  sourceSha,
  sourceTree,
  expectedRegistrySha256: trustedExecutionConfig.owner_registry_sha256,
  approval: { registryBytes, receiptBytes, signatureBytes },
  readOnly: false,
});
```

Every binding's Entity, Party, and Organization must match the manifest tenant and the binding's owner, permission, and `record_matter_id`, including anchors that are only referenced by a newly created record. This operation cannot reassign those authorities. `record_matter_id` is explicit null for a global directory record or its existing matter ID; the DMS source document's `matter_id` is a separate scope.

Field changes require the approved baseline hash, expected prior field values, and per-field source document/version/page evidence. Exact committed DMS metadata is checked in the same authenticated PostgreSQL transaction as master-data changes, idempotency, audit, and outbox. Actual document-body and storage-provider version verification remain separate upload/readback gates. Real imports always check approval time against the wall clock; only synthetic fixtures accept an injected clock.
