import { createHash } from "node:crypto";

export function isActiveOwnedConnection(connection, input, now) {
  return connection && connection.tenant_id === input.tenant_id
    && connection.user_id === input.user_id
    && connection.entra_subject_id === input.entra_subject_id
    && connection.m365_connection_id === input.m365_connection_id
    && !connection.revoked_at && Date.parse(connection.expires_at) > now.getTime()
    && connection.connection_authority === "delegated"
    && connection.mailbox_scope === "me"
    && connection.granted_scopes?.includes("Mail.Read")
    && /^[a-f0-9]{64}$/u.test(connection.mailbox_address_hash ?? "");
}

export function exactGraphNotificationUrl(value) {
  let url;
  try { url = new URL(value); } catch {
    throw new TypeError("notification_url must be the public HTTPS Graph webhook URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash
    || url.search || url.pathname.replace(/\/+$/u, "")
      !== "/api/outlook/graph/notifications") {
    throw new TypeError("notification_url must be the public HTTPS Graph webhook URL");
  }
  return url.toString();
}

export function matchesGraphSubscriptionIntent(local, remote, binding) {
  let remoteUrl;
  try { remoteUrl = exactGraphNotificationUrl(remote.notification_url); } catch {
    return false;
  }
  return remote.resource === local.resource
    && remote.change_type === "created"
    && remote.client_state_hash === local.client_state_hash
    && remote.entra_tenant_id === binding.entra_tenant_id
    && remote.account_id === binding.entra_subject_id
    && createHash("sha256").update(remoteUrl).digest("hex")
      === local.notification_url_hash;
}
