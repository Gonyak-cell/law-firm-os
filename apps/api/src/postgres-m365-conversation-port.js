import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../packages/email-dms/src/central-ledger.js";
import { createM365ConversationSyncPort } from "../../../packages/email-dms/src/m365-conversation-sync-port.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";
import { runRecordRepositoryDomainCommand } from "../../../packages/persistence/src/record-domain-adapter.js";

const METHODS = Object.freeze([
  "createOwnMessageSubscription",
  "renewOwnMessageSubscription",
  "listOwnMessageSubscriptions",
  "deleteOwnMessageSubscription",
  "listOwnMessageDelta",
]);

export function createPostgresM365ConversationPort({
  ledger,
  tenant_id,
  credential_vault,
  conversation_provider,
  clock = () => new Date(),
} = {}) {
  if (typeof ledger?.transaction !== "function") throw new TypeError("PostgreSQL domain ledger is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  for (const method of METHODS) {
    if (typeof conversation_provider?.[method] !== "function") throw new TypeError("Microsoft Graph conversation provider is required");
  }

  async function execute(method, input = {}) {
    if (requiredSyncString(input, "tenant_id") !== tenantId) throw new Error("Microsoft Graph tenant authority does not match");
    const result = await runRecordRepositoryDomainCommand({
      ledger,
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      tenant_id: tenantId,
      create_repository: createEmailDmsRepository,
      command: (repository) => createM365ConversationSyncPort({
        repository,
        credential_vault,
        conversation_provider,
        credential_refresh_provider: conversation_provider,
        feature_enabled: true,
        provider_runtime_enabled: true,
        clock,
      })[method](input),
    });
    return result.result;
  }

  return Object.freeze(Object.fromEntries(METHODS.map((method) => [
    method,
    (input = {}) => execute(method, input),
  ])));
}
