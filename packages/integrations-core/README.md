# @law-firm-os/integrations-core

Descriptor-only External Integrations I contract package for RP22.

CP00-666 opens the RP22 External Integrations I program with a synthetic, no-write descriptor for Microsoft 365, Google Workspace, Slack/Teams, e-sign, and webhook intake boundaries. It records IntegrationConnection, OAuthCredentialRef, SyncJob, ExternalMessage, ESignRequest, and WebhookEvent ownership without executing external API calls, persisting credentials, opening OAuth runtime, writing product state, exposing raw external payloads, or loading real tenant, matter, document, billing, or client data.

Validation entry points:

- `npm run rp22:external-integrations-i:validate`
- `node --test packages/integrations-core/test/model.test.js`

## Future external read providers

`external-read-provider-registry.js` is a provider-ready, fail-closed boundary;
it is not a bank, disclosure, accounting, or other external API integration.
The default registry contains zero providers and therefore cannot make an
external request. A future server-side adapter becomes callable only after it
declares an explicit `*.read` capability and receives a tenant- and legal
entity-scoped connection with an opaque AWS Secrets Manager reference and the
required active consent. The server-authoritative tenant and legal-entity scope
must independently match that connection before the adapter is called. The
adapter receives the reference, never resolved
credential material, and must return an opaque provider receipt and checkpoint
reference.

Write, payment, transfer, and filing operations are deliberately outside this
boundary and require a separate approval and audit design before implementation.
