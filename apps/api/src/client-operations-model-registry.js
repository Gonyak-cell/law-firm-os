import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";

export const CLIENT_OPERATIONS_MODEL_REGISTRY_VERSION =
  "law-firm-os.client-operations-model-registry.v1";

const ENTRIES = [
  ["crm", "CRMActivity", "CL-P3-W02-T03"],
  ["crm", "EngagementDecisionProcess", "CL-P3-W03-T01"],
  ["crm", "Lead", "CL-P3-W02-T01"],
  ["crm", "Opportunity", "CL-P3-W03-T01"],
  ["email-dms", "InquiryEmailEvidence", "CL-P3-W01-T01"],
  ["email-dms", "InquiryEvidenceFileObject", "CL-P3-W01-T01"],
  ["email-dms", "M365Connection", "CL-P3-W00-T01"],
  ["finance", "BankClassificationRule", "CL-P1-W01-T05"],
  ["finance", "BankImportBatch", "CL-P1-W01-T03"],
  ["finance", "BankTransaction", "CL-P1-W01-T03"],
  ["finance", "BankTransactionClassification", "CL-P1-W01-T04"],
  ["finance", "ClientDepositAllocation", "CL-P2-W02-T01"],
  ["finance", "FeeCommitment", "CL-P2-W01-T01"],
].map(([domain_id, model_type, source_tuw]) => Object.freeze({
  domain_id,
  model_type,
  source_tuw,
  persistence_classification: "generic-domain-ledger-persisted",
  postgres_schema: "lawos_domain",
  postgres_table: "records",
  postgres_destination: "lawos_domain.records",
  postgres_discriminator: Object.freeze({
    domain_id,
    record_type: model_type,
  }),
}));

function material(entries) {
  return {
    schema_version: CLIENT_OPERATIONS_MODEL_REGISTRY_VERSION,
    entries,
  };
}

export const CLIENT_OPERATIONS_MODEL_REGISTRY = Object.freeze({
  ...material(Object.freeze(ENTRIES)),
  model_count: ENTRIES.length,
  registry_sha256: hashDomainValue(material(ENTRIES)),
});

export function validateClientOperationsModelRegistry(
  registry = CLIENT_OPERATIONS_MODEL_REGISTRY,
) {
  if (
    registry?.schema_version
      !== CLIENT_OPERATIONS_MODEL_REGISTRY_VERSION
    || !Array.isArray(registry.entries)
  ) {
    throw new TypeError("Client operations model registry is invalid");
  }
  const keys = registry.entries.map(
    ({ domain_id, model_type }) => `${domain_id}:${model_type}`,
  );
  if (
    new Set(keys).size !== keys.length
    || registry.model_count !== keys.length
    || registry.entries.some((entry) => (
      entry.persistence_classification
        !== "generic-domain-ledger-persisted"
      || entry.postgres_schema !== "lawos_domain"
      || entry.postgres_table !== "records"
      || entry.postgres_destination !== "lawos_domain.records"
      || entry.postgres_discriminator?.domain_id
        !== entry.domain_id
      || entry.postgres_discriminator?.record_type
        !== entry.model_type
    ))
  ) {
    throw new TypeError(
      "Client operations model registry persistence is invalid",
    );
  }
  const digest = hashDomainValue(material(registry.entries));
  if (registry.registry_sha256 !== digest) {
    throw new TypeError(
      "Client operations model registry digest is invalid",
    );
  }
  return Object.freeze({
    model_count: keys.length,
    registry_sha256: digest,
  });
}
