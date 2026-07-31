import {
  createClientOperationsReadModel,
} from "../../../packages/analytics/src/client-operations-read-model.js";
import {
  MASTER_DATA_DOMAIN_DESCRIPTOR,
} from "../../../packages/master-data/src/central-ledger.js";
import {
  createMasterDataRepository,
} from "../../../packages/master-data/src/repository.js";
import {
  MATTER_DOMAIN_DESCRIPTOR,
} from "../../../packages/matter/src/central-ledger.js";
import {
  createMatterRepository,
} from "../../../packages/matter/src/repository.js";
import {
  CRM_DOMAIN_DESCRIPTOR,
} from "../../../packages/crm/src/central-ledger.js";
import {
  createCrmRuntimeRepository,
} from "../../../packages/crm/src/runtime-repository.js";
import {
  FINANCE_DOMAIN_DESCRIPTOR,
} from "../../../packages/billing/src/central-ledger.js";
import {
  createFinanceRepository,
} from "../../../packages/billing/src/finance-repository.js";
import {
  materializeRecordRepositoryFromDomainLedger,
} from "../../../packages/persistence/src/record-domain-adapter.js";

const POSTGRES_READ_DOMAINS = Object.freeze([
  Object.freeze({
    key: "masterDataRepository",
    descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
    create_repository: createMasterDataRepository,
  }),
  Object.freeze({
    key: "matterRepository",
    descriptor: MATTER_DOMAIN_DESCRIPTOR,
    create_repository: createMatterRepository,
  }),
  Object.freeze({
    key: "crmRepository",
    descriptor: CRM_DOMAIN_DESCRIPTOR,
    create_repository: createCrmRuntimeRepository,
  }),
  Object.freeze({
    key: "financeRepository",
    descriptor: FINANCE_DOMAIN_DESCRIPTOR,
    create_repository: createFinanceRepository,
  }),
]);

function readModel(repositories, clock) {
  return createClientOperationsReadModel({
    ...repositories,
    clock,
  });
}

export function createClientOperationsLegacyReadProvider({
  masterDataRepository,
  matterRepository,
  crmRepository,
  financeRepository,
  clock = () => new Date(),
} = {}) {
  const model = readModel({
    masterDataRepository,
    matterRepository,
    crmRepository,
    financeRepository,
  }, clock);
  return Object.freeze({
    authority: "legacy-request-repositories",
    resolveAccessScope(input) {
      return model.resolveAccessScope(input);
    },
    readDirectory(input) {
      return model.readDirectory(input);
    },
    readClientDetail(input) {
      return model.readClientDetail(input);
    },
    read(input) {
      return model.read(input);
    },
    readKpis(input) {
      return model.readKpis(input);
    },
    readAttentionItems(input) {
      return model.readAttentionItems(input);
    },
    readTrendsAndRankings(input) {
      return model.readTrendsAndRankings(input);
    },
    readDashboard(input) {
      return model.readDashboard(input);
    },
    production_ready_claim: false,
  });
}

export function createClientOperationsPostgresReadProvider({
  ledger,
  clock = () => new Date(),
} = {}) {
  if (!ledger || typeof ledger.transactionMany !== "function") {
    throw new TypeError(
      "Client operations PostgreSQL read provider requires a domain ledger",
    );
  }
  return Object.freeze({
    authority: "postgres-domain-ledger-snapshot",
    async readDashboard(input = {}) {
      const tenantId = String(input.tenant_id ?? "").trim();
      if (!tenantId) throw new TypeError("tenant_id is required");
      const repositories = Object.create(null);
      try {
        await ledger.transactionMany({
          tenant_id: tenantId,
          domain_ids: POSTGRES_READ_DOMAINS.map(
            ({ descriptor }) => descriptor.domain_id,
          ),
        }, async (transactions) => {
          for (const domain of POSTGRES_READ_DOMAINS) {
            repositories[domain.key] =
              await materializeRecordRepositoryFromDomainLedger({
                ledger: transactions[domain.descriptor.domain_id],
                descriptor: domain.descriptor,
                tenant_id: tenantId,
                create_repository: domain.create_repository,
              });
          }
        });
        return readModel(repositories, clock).readDashboard(input);
      } finally {
        for (const repository of Object.values(repositories)) {
          repository.close?.();
        }
      }
    },
  });
}
