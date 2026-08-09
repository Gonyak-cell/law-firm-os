import { acquireActiveM365Credential, M365_GRAPH_ERROR_CODES } from "./m365-graph-connection-service.js";

const MAILBOX_OVERRIDE_FIELDS = Object.freeze([
  "mailbox",
  "mailbox_id",
  "mailbox_address",
  "target_user_id",
  "user_principal_name",
]);

function portError(code, message, status) {
  return Object.assign(new Error(message), { safe_error_code: code, status });
}

export function createM365ConversationSyncPort({
  repository,
  credential_vault,
  conversation_provider,
  credential_refresh_provider = conversation_provider,
  request_failure_compensator = null,
  feature_enabled = false,
  provider_runtime_enabled = false,
  clock = () => new Date(),
} = {}) {
  async function execute(method, input) {
    if (feature_enabled !== true) {
      throw portError(M365_GRAPH_ERROR_CODES.feature_disabled, "Microsoft 365 connection is disabled", 503);
    }
    if (provider_runtime_enabled !== true || typeof conversation_provider?.[method] !== "function") {
      throw portError(M365_GRAPH_ERROR_CODES.provider_runtime_disabled, "Microsoft Graph conversation provider is unavailable", 503);
    }
    if (MAILBOX_OVERRIDE_FIELDS.some((field) => input?.[field] !== undefined && input?.[field] !== null)) {
      throw portError(M365_GRAPH_ERROR_CODES.mailbox_override, "Only the signed-in user's own mailbox is allowed", 403);
    }
    const { credential } = await acquireActiveM365Credential({
      repository,
      credential_vault,
      provider: credential_refresh_provider,
      request_failure_compensator,
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      entra_subject_id: input.entra_subject_id,
      required_scope: "Mail.Read",
      clock,
    });
    return conversation_provider[method]({ ...input, credential, mailbox_scope: "me" });
  }

  return Object.freeze({
    mailbox_scope: "me",
    shared_mailbox_enabled: false,
    createOwnMessageSubscription: (input = {}) => execute("createOwnMessageSubscription", input),
    renewOwnMessageSubscription: (input = {}) => execute("renewOwnMessageSubscription", input),
    listOwnMessageSubscriptions: (input = {}) => execute("listOwnMessageSubscriptions", input),
    deleteOwnMessageSubscription: (input = {}) => execute("deleteOwnMessageSubscription", input),
    listOwnMessageDelta: (input = {}) => execute("listOwnMessageDelta", input),
  });
}
