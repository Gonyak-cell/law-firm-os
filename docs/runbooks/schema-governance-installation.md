# Schema governance installation

The W13 schema commit path uses the source-pinned schema governance anchor in
`packages/runtime-auth/src/external-release-trust-registry.js`. The general
external-release root remains unconfigured. Schema approval does not authorize
desktop activation, public distribution, provider activation, or queue replay.

The admin reads exactly `/opt/lawos-schema-governance/installation.json` and the
three public files listed below. No request, environment variable, current
directory, or S3 locator can select its trust root. A missing installation stops
before authorization input reads. New schema commits require a fresh database
target receipt and the distinct governance leaf; legacy internal-owner approval
cannot activate a new schema commit.

1. Finalize and verify the source commit, tree and production artifact first.
   Keep the exact previous artifact, function configuration, schema catalog and
   complete original bootstrap receipt hash as recovery evidence.
2. Keep signing keys outside Git, server artifacts and the layer. Use a leaf
   distinct from the pinned root. Root-sign an external-release registry with
   the exact source-pinned serial. Each leaf must allow only the W13 production
   cutover receipt, owner role, fixed LawOS/Entra tenant namespaces, and one
   exact source SHA/tree, artifact SHA and six-field authority binding SHA.
   Wildcards and reuse of the root as a leaf are rejected. Limit leaf validity
   to the approved operational window; each execution receipt remains limited
   to 15 minutes and its freshly observed RDS target.
3. Package only `lawos-schema-governance/root-public-key.spki.pem`,
   `lawos-schema-governance/trust-registry.json`,
   `lawos-schema-governance/trust-registry.json.sig` (64 raw Ed25519 bytes), and
   `lawos-schema-governance/installation.json`. The installation manifest has
   exactly `schema_version` (`law-firm-os.schema-governance-installation.v1`),
   `registry_serial`, and `files`. Its file table has exactly the three other
   basenames; each entry has `sha256` and `size_bytes`. The root signature and
   source-pinned anchor/serial establish authority. The file table identifies
   the bytes and does not introduce another trust root.
4. Reject archive paths outside this four-file set, links, duplicates, encrypted
   entries, executable files, code, extensions, credentials and private keys.
   Read back the complete archive independently by version and SHA-256. Publish
   an immutable layer named `lawos-schema-governance-<serial>-<archive_sha256>`
   in the production account and region. Record its exact version ARN, Lambda
   code digest, installed manifest SHA and public file digests separately from
   the source artifact digest. Do not grant public layer permissions.
5. Attach that version through `SchemaGovernanceLayerVersionArn` in a reviewed
   CloudFormation change set. This parameter is disabled by default and applies
   only to `AdminFunction`. Verify the full before/after parameter list, template,
   roles, function revisions, source/artifact, layers and provider/worker flags.
   The API, worker and auditor must receive no layer. The existing W15 runtime
   deployment preserves the selected layer parameter; changing code still
   requires a newly scoped registry before the next schema commit.
6. Direct-invoke `lawos-json-postgres-schema-governance-readback` with exactly
   `action`, `attempt_ref`, `source_sha`, `source_tree`, and `artifact_sha256`.
   Require `PASS`, one active leaf, and exact registry/manifest/anchor/serial
   readback. This action reads no database, secret or program input and writes
   no approval claim. Then prepare each schema transition separately with a
   fresh RDS receipt, exact catalog digest and whole initial bootstrap hash.
   Preserve old rows and receipts and verify replay through the existing
   migration claim/terminal receipt path.

Before a schema commit, recovery can detach the layer and restore the retained
pre-change artifact. After a schema commit, preserve a runtime compatible with
the new catalog and detach the signing layer to stop further commits; never
restore an old runtime that cannot read the committed schema. Revocation or
replacement requires a reviewed new registry serial and immutable layer.

[AWS Lambda layer documentation](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html)
describes the `/opt` installation path and immutable version ARNs. The separate
public-data layer avoids making the registry's artifact scope depend on its own
archive hash. Unit/CI results do not prove installation or schema execution.
