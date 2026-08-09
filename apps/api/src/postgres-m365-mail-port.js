import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../packages/email-dms/src/central-ledger.js";
import { createM365MailPort } from "../../../packages/email-dms/src/m365-graph-ports.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";
import { runRecordRepositoryDomainCommand } from "../../../packages/persistence/src/record-domain-adapter.js";

export function createPostgresM365MailPort({ ledger, tenant_id, credential_vault, provider, clock = () => new Date() } = {}) {
  if (typeof ledger?.transaction !== "function" || typeof provider?.getMeMessageMime !== "function") {
    throw new TypeError("PostgreSQL Microsoft Graph mail dependencies are required");
  }
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  return Object.freeze({
    mailbox_scope: "me",
    shared_mailbox_enabled: false,
    async getOwnMessageMime(input = {}) {
      if (requiredSyncString(input, "tenant_id") !== tenantId) throw new Error("Microsoft Graph mail tenant authority does not match");
      const result = await runRecordRepositoryDomainCommand({
        ledger,
        descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
        tenant_id: tenantId,
        create_repository: createEmailDmsRepository,
        command: (repository) => createM365MailPort({
          repository,
          credential_vault,
          provider,
          feature_enabled: true,
          inquiry_feature_enabled: true,
          provider_runtime_enabled: true,
          clock,
        }).getOwnMessageMime(input),
      });
      return result.result;
    },
  });
}
