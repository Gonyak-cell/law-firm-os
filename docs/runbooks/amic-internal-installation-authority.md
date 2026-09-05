# Internal unsigned installation authority

This authority enrolls a managed Windows device against an owner-approved,
already published managed-bootstrap release. It preserves the formal macOS
authority and the separately pinned legacy Windows canary. Publishing a package
or possessing an `odi_` identifier does not establish installation trust.

## Deployment prerequisites

Apply the reviewed additive `010_internal_unsigned_installation_authority`
migration (`309_client_internal_unsigned_installation_authority` in the combined
catalog), then read back its five function definitions, owners, ACLs and protected
table boundaries. The historical 007 migration approval remains immutable.
For the reviewed 79-row production catalog, the runner verifies the original
007 approval and authority before appending only 309. It verifies the new
authority after the commit and on replay. The append receipt records one
migration write and no role or role-secret writes; a replay records no writes.
Omitting the authority callbacks for this catalog is rejected.
The API uses the existing application-role pool and authenticated tenant context.
Owner authorization and revocation use the existing control-role pool.

The API requires one new environment reference:
`LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID`. It contains the dedicated
Secrets Manager reference, never the private key. The secret is a closed JSON
object containing `key_id`, `private_key_pem`, and `public_key_sha256`. The last
field must equal the SHA-256 of the private key's Ed25519 public SPKI DER bytes.
Grant the API only the required secret read. Configure the matching issuer ID,
public key, and digest independently for the adoption publisher and reader.
Duplicate issuer or public-key pins in the former server environment variables
are rejected. Missing the secret reference disables signing and the dedicated
endpoints while preserving internal-binding enforcement at a verified 80- or
81-row catalog. Malformed configuration, a key mismatch, or a changed live SQL
authority prevents activation.

The single reference adds its ARN length plus 55 bytes to a nonempty compact
JSON environment map. A representative 109-character ARN adds 164 bytes; a
128-character ARN adds 183 bytes. These are planning examples, not actual
deployment measurements. Recompute the complete live environment with the
actual ARN using the existing deployment budget guard before CloudFormation.

The original runtime requires exactly 79 catalog rows, so it is not a rollback
target after 309. Use the API composition bridge, which selects only the pinned
historical 79-row catalog, authority 80-row catalog, or combined 81-row catalog
and passes that choice to the unchanged strict verifier in one read-only
snapshot. The 80-row catalog with corporate 016 but without authority 309 is
rejected. Other counts, missing rows, and mismatched checksums fail. The 79-row mode prohibits the signer
secret reference; the signing service also verifies its SQL authority before
fetching its key.

Deploy in this order:

1. Record the final 81-row bridge source SHA, artifact hash, and exact rollback artifact.
   Deploy the bridge with the signer reference absent, and verify the actual
   79-row catalog and application behavior.
2. From that same final source, apply only 309 using the signed authority80
   target below. Read back all 80 rows and the new authority before continuing.
   Preserve the 79-row ledger and historical pause evidence.
3. With a separate signed combined81 target, apply only
   `016_dms_corporate_workspace` and read back all 81 rows. This foundation
   migration sorts before already applied HRX rows; the reviewed gap does not
   rewrite any existing ledger row. Keep the signer reference absent during
   both schema stages. A direct 79-to-81 transition is rejected.
4. Activate the exact signer secret reference after the full environment budget
   check. Verify startup, signing authority, and the independently pinned issuer.
5. Grant the approved device and verify its real enrollment.

After step 2, rollback only to the pinned config-off bridge artifact that
supports all three exact catalogs. Do not roll back to the original 79-only
runtime or remove migration history to make it start. In the bridge, no internal
binding leaves ordinary legacy behavior available. Database errors and invalid
internal bindings never permit fallback. The new internal endpoints fail closed
while the authority is disabled.

At 80 or 81 rows, removing the signer reference disables attestation and the dedicated
new endpoints while retaining the internal SQL checks on existing lifecycle and
trusted-current routes. A revoked internal grant cannot become legacy-trusted
when the signing configuration is removed.

Check the exact live `LAWOS_CLIENT_OPERATIONS_V2_ENABLED` setting before rollout.
It controls `client_dashboard_v2`; absence resolves to false. If enabled, inspect
the existing analytics ledger idempotency entry
`client_operations_v2_schema_bound_readiness` through `ledger.listIdempotency`.
Its readiness attestation binds the actual schema count and hash. The current
client migration runner rejects a conflicting historical attestation and does
not provide schema-only rebinding. An enabled deployment therefore needs a
separate readiness transition before this rollout; do not delete the old receipt,
claim a historical count when the actual catalog differs, or treat rerunning the importer as a refresh. This
bridge does not change that client feature or its readiness validation.

### Exact signed migration targets

For each continuation, read the current RDS target and the five-field protected
007 bootstrap receipt independently. Include `hashDomainValue(bootstrapReceipt)`
as `target.historical_outlook_bootstrap_sha256` in the current signed W13 packet.
The new RDS receipt must be fresh at approval and execution; the historical
receipt remains immutable and does not authorize a new execution. The v4
operation binding covers both values. Only the exact authority80 and combined81
targets accept this pin, and a missing or mismatched pin rejects a changed
target receipt before DDL. The v3 run receipt records the current target hash
and the complete historical bootstrap receipt separately. Do not replace the
protected 007 row or reuse an expired approval to make those hashes equal.

The initial 007 receipt may predate the current 79-row catalog. Its original
catalog hash is preserved as provenance inside the complete signed bootstrap
pin. This pin does not replace the separate check of every current ledger row:
the authority transition still requires exactly 79 or 80 rows, and the corporate
transition requires exactly 80 or 81 rows. A continuation cannot skip directly
from 79 to 81. Receipts without the complete signed bootstrap pin retain their
existing historical79 restriction; another original catalog is not accepted
through that legacy path.

Use the same protected action with a fresh owner-signed `preflight` or `readback`
packet bound to the exact observed 79, 80, or 81 catalog to obtain
`historical_outlook_bootstrap_receipt` and `historical_outlook_bootstrap_sha256`.
The schema ledger and protected receipt are read in one server-enforced,
repeatable-read, read-only transaction. A missing, duplicate, malformed, or
schema-drifted row aborts the readback. Historical79 is accepted only by this
read-only selector; the migration runner continues to accept only the two
reviewed write targets. Sign each subsequent commit packet with the returned
historical pin and a fresh RDS target receipt.

The protected entry remains `bootstrapJsonPostgresProductionDatabase` in
`apps/api/src/json-postgres-program-admin-lambda.js`, with action
`lawos-json-postgres-production-bootstrap` and mode `commit`. There is no
caller-supplied SQL, arbitrary catalog path, or new unsigned action. The existing
owner-signed W13 packet's `bindings.migration_catalog_sha256` selects exactly one
target. `selectClientOperationsMigrationTarget(digest)` in
`apps/api/src/client-operations-schema.js` returns the complete reviewed
`catalog` document, SQL migration list, and normalized ledger. Retain that
complete catalog document's ordered IDs and checksums with the signed program
input manifest, approval, and receipt.

| Target | Rich catalog SHA-256 | Ordered ledger SHA-256 |
| --- | --- | --- |
| authority80 | `2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79` | `4d2b71686f05f483fee882b742e363ee4ce24e95879dce267a81083adc47287f` |
| combined81 | `8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7` | `29530ec602b720deeb1e26625c85a3dcc1268e2bfc116b6b86bfada761cb38a7` |

Both packets retain the same final executor `source_sha`, `source_tree`, and
artifact binding, while their target digest and operation approval are distinct.
The runner independently checks the full before ledger: authority80 accepts only
historical79 or an exact80 replay; combined81 accepts only authority80 or an
exact81 replay. The immutable historical 007 pause digest remains unchanged.
Each successful stage writes one migration, zero roles, and zero role secrets;
an exact replay records zero mutations. A failed postflight keeps a separate
partial receipt; it does not convert an applied migration into a success claim.

Use the same protected action with mode `readback` and the corresponding signed
target to verify its complete ledger. Independently read the installation SQL
authority with `verifyInternalUnsignedInstallationAuthorityReadback`, which is
also mandatory in each stage's migration postflight. Verify corporate schema
and activation prerequisites through its protected operator path before creating
a corporate workspace. Do not use the separate Task3 diagnostic operator chain
for these stage receipts: its operator-side rich source-catalog digest and
API-side slim source-ledger digest currently differ. That pre-existing contract
remains unresolved; it is not an alternative target selector.

## Authorize and enroll one device

1. Preserve the exact seven managed-bootstrap object versions and the actual
   Windows installed receipt. The receipt must match the canary, release source,
   installer hash, native installed tree, measured build manifest, and update
   trust root. Record the device's actual Ed25519 public-key fingerprint.
2. Prepare the closed request for
   `createInternalUnsignedInstallationReleaseControl().authorize()`. Bind its
   principal, device key, installed receipt hash, bootstrap marker, installer
   version, explicit release validity, and current executor SHA/tree. The
   executor reads all seven object bodies using the existing independent
   bootstrap verifier; a caller-provided PASS flag is not accepted.
3. Obtain the current owner signature through the existing runtime-safety
   approval registry. The action is
   `lawos-amic-internal-installation-authorize`, data scope is exactly
   `internal-unsigned-installation-authority`, and contact scope is empty.
   The approval packet is canonical sorted request JSON plus one newline.
4. Execute the authorization with the control role. The stored grant includes
   the verified owner approval digest; its `release_authority_sha256` uses
   canonical sorted grant JSON without a newline and excludes its own digest.
5. An unregistered immutable 0.1.32 device uses its existing
   `POST /api/desktop/installations` request. The signed body remains exactly
   `platform`, `app_version`, `source_sha`, and `device_public_key` (SPKI DER
   base64), with the existing proof's idempotency key, nonce, timestamps, and
   Ed25519 signature. The server resolves one approved grant for the authenticated
   principal and verified device key, matches the signed release tuple, and
   obtains its authorization identifier and installed receipt hash from that
   grant. It never rewrites the signed body or asks the binary for a new field.

Enrollment returns the server-issued installation identifier. Heartbeat and
retirement use `/api/desktop/installations/:installation_id/heartbeat`
and `/api/desktop/installations/:installation_id/retire` with the same
proof contract and an expected state version. Retirement additionally requires
an existing retirement reason. Release revocation rejects registration,
heartbeat, and trusted reads while still allowing device retirement.

Only absence of any grant for the exact principal and device allows registration
to fall through to the existing legacy authority. An expired or revoked grant,
ambiguous grants, a different candidate tuple, invalid proof, or database error
blocks the request. Existing generic installation reads return the same owned
installation row, and trusted-current reads use the internal authority snapshot.

The dedicated `/api/desktop/internal-installations` route also supports a closed
registration body of `release_authorization_id`, `device_public_key`, and
`installed_receipt_sha256`. Its path is part of the proof transcript. It is not
required by the immutable 0.1.32 binary.

An existing legacy/formal identity or a different release authorization cannot
be rebound silently. The client enrollment procedure must preserve its existing
identity and explicitly account for retirement and new device-key enrollment.
This server change does not reset an already registered client's stored identity.
Before operating on a real host, distinguish an unregistered device from one
whose client already holds a legacy installation identifier. The latter needs
an explicit, separately specified transition; it cannot use this enrollment
bridge to replace its existing binding.

## Attest before adoption

POST `/api/desktop/internal-updates/baseline-adoption-attestation` using the
existing signed session and a closed body containing `adoption_id`,
`request_sha256`, and `installation_id`. Entitlement and lifecycle permission
are checked before the database read. The service chooses the current principal
installation first and refuses an untrusted current installation instead of
selecting an older one.

The response's `attestation` contains only `document_base64`,
`signature_base64`, and `key_id`. Verify it with
`verifyInternalUnsignedInstallationAttestation`. The canonical signed document
binds the adoption request, exact release and immutable artifact tuple, device
installation, installed receipt hash, release binding, state version, and lease.
Its lifetime is at most five minutes and never exceeds the lease or approved
release validity. The adoption publisher must obtain a fresh signed read before
its first write and again before its final marker, matching the approved state.

Retain owner approvals, installation measurements, control results, and signed
attestations privately. Neither this authority nor a successful source test is
a production enrollment or publication receipt.
