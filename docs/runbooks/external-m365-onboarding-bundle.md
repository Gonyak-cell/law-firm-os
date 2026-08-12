# External M365 / Outlook onboarding bundle

`generate-external-m365-onboarding-bundle.mjs` is an offline handoff generator
for a separate law firm's Microsoft Entra/M365 administrator. It binds the
existing exact production Outlook manifest, the delegated OAuth/Graph scope
contract, and one tenant-pinned LawOS runtime target into a private checklist.

The generator does not contact Microsoft, deploy an add-in, grant consent,
read a mailbox, call Graph, or claim AppSource/marketplace distribution. Every
checklist item remains `pending_external_verification` until a human admin and
real Outlook host supply the corresponding receipt.

## Inputs

Create a local, untracked JSON file. The values below are illustrative shapes,
not credentials:

```json
{
  "schema_version": "amic-os.external-m365-onboarding-bundle.v2.input",
  "lawos_tenant_id": "tenant-firm-a",
  "entra_tenant_id": "<external-entra-tenant-uuid>",
  "client_id": "<external-entra-app-uuid>",
  "admin_contact": "<tenant-admin-email>",
  "target_runtime_url": "https://firm-specific-lawos.example/outlook",
  "runtime_config_digest_sha256": "<64 lowercase hex characters>",
  "tenant_pinned": true,
  "pilot_group": {
    "display_name": "External Firm Outlook Pilot",
    "expected_member_count": 2
  },
  "profile": "matter-full"
}
```

The v2 input deliberately separates the LawOS application identity
(`lawos_tenant_id`) from the Microsoft Entra tenant UUID
(`entra_tenant_id`). The legacy `tenant_id`, nested `external_firm`, and
nested `deployment` aliases are rejected. `tenant_pinned: true`, an absolute
HTTPS `target_runtime_url`, and an exact 64-character config digest are
mandatory. Wildcards, credentials, query strings, fragments, Unicode or
punycode hostnames, trailing-dot hosts, localhost/metadata aliases, and all
literal IP hosts (including loopback, unspecified, link-local, private,
unique-local, or multicast ranges) fail closed. A config digest is a receipt
binding only: it does not prove that the endpoint was deployed or that
Microsoft accepted it.

An optional `runtime_config_receipt` may be supplied, but it is a closed
object and must exactly repeat the target URL, host, both tenant namespaces,
and config digest:

```json
{
  "target_runtime_url": "https://firm-specific-lawos.example/outlook",
  "lawos_tenant_id": "tenant-firm-a",
  "entra_tenant_id": "<external-entra-tenant-uuid>",
  "config_digest_sha256": "<64 lowercase hex characters>",
  "host": "firm-specific-lawos.example"
}
```

The output carries both `target_runtime.config_digest_sha256` and the
equivalent `target_runtime.config_receipt_sha256`, plus a binding digest over
both explicit tenant IDs, the client ID, the canonical runtime URL and host,
and the config receipt. This is a deterministic exact-host binding, not proof
of a live deployment.

The `admin_contact` and tenant/client IDs are accepted as non-secret private
metadata, but they must never be copied into public evidence. Keep the input
file outside Git and remove it after the private handoff is transferred.

`pilot_group.expected_member_count` must be a JSON number representing the
named direct-member canary group. The accepted range is 2 through 1000;
strings, booleans, null, fractions, unsafe integers, zero, and negative values
fail closed in both the API and generator CLI.

## Generate and validate

Run from the repository root:

```bash
node scripts/generate-external-m365-onboarding-bundle.mjs \
  --input /private/path/external-m365-input.json \
  --manifest apps/addin/manifest.production.xml \
  --output /private/path/external-m365-handoff.json \
  --markdown /private/path/external-m365-handoff.md

node scripts/validate-external-m365-onboarding-bundle.mjs \
  --bundle /private/path/external-m365-handoff.json \
  --manifest apps/addin/manifest.production.xml
```

The generator compares the supplied manifest bytes with the current
`apps/addin/manifest.production.xml` bytes, records both byte and semantic
SHA-256 values, and reuses `validateOutlookAddinSurfaces` for the existing
profile/runtime contract. It reads the existing OAuth/Graph scope contract and
the machine-readable `MICROSOFT_EGRESS_REDIRECT_URIS` export; it does not
parse source prose, invoke a provider, or run a deployment command.

The JSON and optional Markdown outputs are written with mode `0600`. The JSON
contains a closed-schema `public_evidence` projection re-derived from the
validated private payload. It intentionally omits raw LawOS/Entra tenant IDs,
client ID, contact, runtime URL/host, and pilot-group values, retaining only
safe hashes and aggregate release bindings. The validator requires exact
canonical equality with that projection. Do not publish the private JSON or
the Markdown handoff as public evidence.

## Operator checklist contents

The generated checklist requires:

- Entra app/client and tenant readback bound to the private metadata;
- the exact client redirect URI and no alternate/wildcard callback;
- exact delegated OAuth and Graph connection scopes with a zero diff after
  consent;
- positive verification for an included direct pilot member reaching the
  tenant-pinned runtime and seeing one visible add-in;
- negative verification for a non-member, wrong tenant/client, redirect
  mismatch, and missing scopes, all failing closed;
- raw roster/contact/token/mailbox values kept private; and
- rollback to the frozen `1.0.1.1` baseline with
  `reconcile_to_validated_single_visible_distribution` before retrying.

Assignment is direct-member-only, nested groups are prohibited, tenant-wide
assignment is prohibited, and the maximum visible add-ins per user is one.
These are checklist requirements, not evidence that an external admin has
performed them.

## Evidence boundary

The generator and validator machine-readable summaries must continue to show
the zero-provider boundary. The validator additionally reports local validity
separately from external handoff state:

```text
provider_calls: 0
external_mutations: 0
appsource_claim: false
local_validation_status: VALID
handoff_status: PENDING_EXTERNAL_VERIFICATION
external_success_claim: false
checklist_status: PENDING_EXTERNAL_VERIFICATION
```

The validator exits `0` only when the private handoff is internally
consistent with the exact source manifest and runtime contracts. That local
exit is deliberately not an external success, readiness, or verification
claim; the machine output contains no generic `PASS`, `READY`, or `VERIFIED`
state. A non-zero exit means the local bundle is malformed, drifted, or
unbound. Neither result proves Entra registration, admin consent, M365
admin-center assignment, propagation, a real Outlook host, provider delivery,
or go-live.
