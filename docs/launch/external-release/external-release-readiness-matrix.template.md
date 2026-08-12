# Named External Law-Firm Pilot Release Readiness

Status: `BLOCKED_PENDING_EXTERNAL_INPUTS`

This is an evidence-intake template. It does not call Microsoft 365 or any other provider, approve external distribution, execute production cutover, or claim go-live. A local file is not proof by itself: every gate receipt requires exact bytes, a matching SHA-256, a detached Ed25519 signature, a key in a root-governed registry, and the required semantic fields. No production trust root is configured in this versioned contract, so the normal validator remains blocked until an external owner installs one through the governed installation path.

Identity namespace is versioned as `law-firm-os.external-tenant-identity.v1`: `lawos_tenant_id` is the LawOS identity/database namespace and `entra_tenant_id` is a distinct Microsoft Entra UUID. The legacy ambiguous `tenant_id` field has no compatibility fallback.

The table below is presentation order. Execution order is separately contracted as API artifact → signed internal provisioning adapter → signed tenant-pinned runtime/config (or reviewed multi-tenant runtime) → M365 → macOS → operations → backup/restore → legal owner; this keeps migration/producer evidence distinct from runtime deployment evidence.

| Gate | Evidence class | Required input | Current state |
| --- | --- | --- | --- |
| API artifact and deployment | Technical | Signed exact API artifact/deployment receipt bound to source SHA, source-tree SHA, version, artifact/binding SHA-256 values, both distinct tenant IDs, target, deployment receipt, role, and operation | Pending external receipt |
| Tenant provisioning and runtime binding | External provider | Signed internal-provisioning adapter bound to the LawOS producer receipt and exact protected manifest bytes/hash/schema for both tenant IDs **and** either an exact tenant-pinned deployment/config receipt (`identity_tenant_id` + `database_tenant_id` = LawOS; resolved protected OIDC config version/digest + safe tenant projection = Entra UUID) or a separately reviewed multi-tenant runtime receipt | Pending external receipt |
| M365 consent/deployment visibility | External provider | Signed Microsoft 365 receipt bound to both tenant namespaces (Entra UUID is the provider identity), source/source-tree/version, artifact/binding hashes, role/operation, admin-consent/scope reconciliation, deployment, positive included-user visibility, and negative excluded-user visibility | Pending Microsoft 365 receipt |
| macOS distribution | Technical | Signed exact artifact receipt plus Developer ID/notarized/stapled DMG, matching checksums file, CycloneDX SBOM, both tenant IDs, source/source-tree/version, and artifact/binding hashes | Pending release artifact receipt |
| Monitoring, support, rollback | Human/operations | Signed receipt naming monitoring, support, and rollback owners plus runbook/channel references, exact source/source-tree/version, both tenant IDs, binding hash, role, and operation | Pending owner receipt |
| Backup/restore rehearsal | Technical | Signed exact restore rehearsal with measured RPO/RTO and approved threshold reference, exact source/source-tree/version, both tenant IDs, binding hash, role, and operation | Pending rehearsal receipt |
| Legal owner approval | Human/legal | Signed real legal-owner approval receipt for the named pilot scope, exact source/source-tree/version, both tenant IDs, binding hash, role, and operation | Pending legal-owner receipt |

Runtime boundary: the current API runtime is a single `LAWOS_IDENTITY_TENANT_ID`/`LAWOS_DATABASE_TENANT_ID` LawOS binding with a tenant-derived Entra issuer. Tenant provisioning alone cannot satisfy runtime binding. Do not replace this boundary with an inferred claim.

The normal validator CLI has no caller-controlled trust-registry option. It reports `TRUST_ROOT_NOT_CONFIGURED` until an external authority installs a root-signed registry whose root SPKI digest is pinned by a versioned production policy. A registry and hash supplied in the input or command line can never become production authority. The provisioning producer’s `law-firm-os.external-tenant-provisioning-receipt.v1` is accepted only through the signed adapter slot; the adapter must load the exact protected `manifest_ref`, verify its bytes/hash/schema, and reconcile both tenant IDs. It is not treated as a global external-release receipt.

No legal text is authored by this template. Attach a real owner/provider receipt when available, then run:

```text
node scripts/validate-external-release-readiness.mjs \
  --input docs/launch/external-release/external-release-readiness-input.template.json \
  --report .omo/evidence/external-release-readiness-validation.json \
  --report-md .omo/evidence/external-release-readiness-validation.md
```
