import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  assignmentExactKeys,
  assignmentIdentifier,
  normalizeOutlookDesktopActivationIssueAuthorityPublicationReceipt,
  normalizeOutlookDesktopActivationIssueAuthorityPublicationRequest,
} from "./outlook-desktop-assignment-contract.js";

export const OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLISHER_SCHEMA_VERSION =
  "lawos.outlook-desktop-activation-issue-authority-publisher.v1";
export const OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLISH_FUNCTION =
  "publish_outlook_desktop_activation_issue_authority";

const INSTANCES = new WeakSet();

export function assertPostgresOutlookDesktopActivationIssueAuthorityPublisher(
  value,
) {
  if (!INSTANCES.has(value) || !Object.isFrozen(value)) {
    throw new TypeError(
      "PostgreSQL Outlook activation issue authority publisher is required",
    );
  }
  return value;
}

export function createPostgresOutlookDesktopActivationIssueAuthorityPublisher(
  options = {},
) {
  assignmentExactKeys(
    options,
    ["control_pool", "tenant_id"],
    "activation issue authority publisher options",
  );
  if (!options.control_pool?.connect) {
    throw new TypeError("PostgreSQL control pool is required");
  }
  const tenantId = assignmentIdentifier(options.tenant_id, "tenant_id");
  const publish = async (request = {}) => {
    const normalized =
      normalizeOutlookDesktopActivationIssueAuthorityPublicationRequest(request);
    return withPostgresTransaction(
      options.control_pool,
      { tenant_id: tenantId, isolationLevel: "serializable" },
      async (client) => normalizeOutlookDesktopActivationIssueAuthorityPublicationReceipt(
        (await client.query(
          `SELECT lawos_email_dms.${OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLISH_FUNCTION}($1,$2::jsonb) AS value`,
          [tenantId, JSON.stringify(normalized)],
        )).rows[0]?.value,
      ),
    );
  };
  const publisher = Object.freeze({
    authority: "postgres-outlook-desktop-activation-issue-authority-publisher",
    publish,
    schema_version:
      OUTLOOK_DESKTOP_ACTIVATION_ISSUE_AUTHORITY_PUBLISHER_SCHEMA_VERSION,
  });
  INSTANCES.add(publisher);
  return publisher;
}
