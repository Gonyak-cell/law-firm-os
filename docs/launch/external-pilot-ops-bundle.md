# External pilot operations bundle

This bundle is an offline, reference-only template for one named pilot. It does
not contact an external provider, assign a person, approve a DPA, or authorize
real-data access. The generated JSON is the source of truth for validation;
this document explains the required completion fields.

## Generate and validate

```bash
node scripts/generate-external-pilot-ops-bundle.mjs
node scripts/validate-external-pilot-ops-bundle.mjs
```

The default generated artifacts are written under the operating system
temporary directory (`$TMPDIR/lawos-external-pilot-ops/`) as private (`0600`)
files and are written atomically. This keeps generated bundle material out of
tracked repository/docs paths. Use explicit `--output` and `--markdown` paths
only when the destination is a protected, private location. A public
machine-only allowlist projection is opt-in:

```bash
node scripts/generate-external-pilot-ops-bundle.mjs \
  --public-projection /explicit/path/pilot-ops-public.json
```

The projection is separate from the private bundle and contains no tenant
identifiers, person names, evidence paths, approval content, or receipt bytes.

Use `--output`, `--markdown`, and `--bundle` when operating in an isolated
temporary directory. The generator always writes `TEMPLATE_ONLY`, keeps every
provider/data/go-live boundary false, and never accepts a readiness claim from
an input file. It does not read any provider, tenant, roster, or artifact data.

The validator emits a private (`0600`) JSON and Markdown report under the same
temporary directory with the SHA-256 of the bundle.
The validator uses the current system clock; there is no CLI clock override,
including when `NODE_ENV=test`. It performs no network or provider calls. A
`PASS` for a synthetic-only template means only
that the boundary and shape are safe; `operational_status` remains
`pending_required_fields` until the slots are completed.

Before any directory creation or report write, the generator and validator
resolve the declared root through the shared trust resolver and reject a
symlink root or symlink output ancestor. Private output writes are atomic and
mode `0600`; the opt-in public projection is the only `0644` output.

## Required binding

`pilot_binding` must identify exactly one pilot and bind the protected inputs:

- `pilot_id` selected by a human;
- explicit `lawos_tenant_id` plus a local LawOS tenant reference and SHA-256;
- explicit `entra_tenant_id` (a UUID) plus a local Entra tenant reference and
  SHA-256;
- the LawOS and Entra IDs must be distinct. Legacy `tenant_id`, `tenant_ref`,
  and `tenant_sha256` aliases are rejected; there is no fallback between them;
- a separately hashed Entra application reference;
- local pilot-roster reference plus its SHA-256 digest;
- local API and desktop artifact references plus their SHA-256 digests;
- source reference, source commit SHA, and source tree SHA;
- exact release `version` and canonical `binding_sha256` (the SHA-256 of the
  pilot/tenant/source/version tuple).

The validator rehashes every local reference using realpath containment. A
missing path, mismatched digest, placeholder, directory, ancestor-symlink escape,
or non-local real-data reference blocks real-data mode.

## Signed approval and receipt contract

Real-data approval and receipt references point to local JSON receipt bytes and
an adjacent detached Ed25519 signature reference:

```json
{
  "ref": "docs/pilot/monitoring-receipt.json",
  "sha256": "<sha256 of the exact receipt bytes>",
  "signature_ref": {
    "ref": "docs/pilot/monitoring-receipt.json.sig",
    "sha256": "<sha256 of the detached signature bytes>"
  }
}
```

The validator consumes only the versioned production trust-root policy exported
by the shared trust helper. Bundle-provided registry, anchor, or root references
are never authority and are rejected as input. Until the governance owner
installs that root policy, normal real-data validation fails with
`TRUST_ROOT_NOT_CONFIGURED`; a self-minted registry cannot bypass that gate.

The signed receipt JSON must bind the exact `key_id`, scope, pilot ID, distinct
LawOS and Entra tenant IDs, source commit/tree, version, an API or desktop
artifact SHA-256, canonical binding SHA-256, role, operation, `issued_at`, and
`expires_at`. The shared verifier checks the receipt/signature bytes, trusted
key registry scopes, detached Ed25519 signature, and `issued_at <= now <
expires_at`. Missing, tampered, untrusted, wrong-scope, future, expired, or
impossible timestamps fail closed.

## Operations fields

Complete the support contact, primary and secondary on-call, incident
commander, security/privacy contact, and rollback owner slots. Each real-data
slot needs a signed role-assignment approval and a passed signed local receipt
with a scope, signature reference, recorder, UTC recording time, and future
expiry. Add P0/P1/P2 escalation routes, the
incident channel, acknowledgement targets, monitoring thresholds and alert
channels, and a passed local monitoring/tabletop receipt.

`privacy_dpa_retention` contains references only. Supply exact local privacy,
DPA, and retention acceptance records plus a passed local legal review receipt;
do not paste legal policy text into this bundle. `backup_restore` requires a
passed isolated-restore receipt, local digest verification, recorder, scope,
future expiry, and measured RPO/RTO/object-count fields.

## Real-data gate

Set `data_boundary.requested_mode` to `real_data` only when the named pilot
inputs are ready for human/legal review. The validator still blocks unless all
of the following are present and locally rehashed:

1. exact signed human approval records for pilot, support, and rollback ownership;
2. exact signed privacy, DPA, and retention approval records;
3. support/on-call receipts and incident escalation/tabletop evidence;
4. monitoring receipt and threshold evidence;
5. isolated backup/restore receipt with measured recovery values;
6. pilot, tenant, Entra, roster, source, API, and desktop bindings.

The bundle cannot approve external-pilot distribution, production cutover, or
go-live. The default remains `synthetic_only: true`,
`real_data_authorized: false`, and `real_data_execution: not_executed`.
