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
are rejected. Missing the secret reference leaves the internal authority
disabled; malformed configuration, a key mismatch, or a changed live SQL
authority prevents activation.

The single reference adds its ARN length plus 55 bytes to a nonempty compact
JSON environment map. A representative 109-character ARN adds 164 bytes; a
128-character ARN adds 183 bytes. These are planning examples, not actual
deployment measurements. Recompute the complete live environment with the
actual ARN using the existing deployment budget guard before CloudFormation.

The old runtime requires exactly 79 catalog rows and the candidate requires 80.
Applying 309 before switching code can therefore fail an old runtime cold start
or readiness check; starting the candidate before 309 also fails its catalog
check. Additive DDL and unchanged 007/009 definitions do not establish rollout
compatibility. Coordinate the migration and candidate switch within an explicit
deployment procedure that accounts for this interval. Do not relax the generic
catalog verifier or claim uninterrupted old-runtime behavior. After both are
verified, grant the approved device and verify its real enrollment. In the
candidate, no internal binding leaves ordinary legacy behavior available.
Database errors and invalid internal bindings never permit fallback. The new
internal endpoints fail closed while the authority is disabled.

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
