# @law-firm-os/integrations-core

Descriptor-only External Integrations I contract package for RP22.

CP00-666 opens the RP22 External Integrations I program with a synthetic, no-write descriptor for Microsoft 365, Google Workspace, Slack/Teams, e-sign, and webhook intake boundaries. It records IntegrationConnection, OAuthCredentialRef, SyncJob, ExternalMessage, ESignRequest, and WebhookEvent ownership without executing external API calls, persisting credentials, opening OAuth runtime, writing product state, exposing raw external payloads, or loading real tenant, matter, document, billing, or client data.

Validation entry points:

- `npm run rp22:external-integrations-i:validate`
- `node --test packages/integrations-core/test/model.test.js`
