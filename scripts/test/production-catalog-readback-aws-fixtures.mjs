import {
  validateCatalogReadbackAuthorizationPacket,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import {
  CATALOG_READBACK_CATALOG_RECEIPT_SCHEMA_VERSION,
  createCatalogReadbackCatalogReceipt,
} from "../../packages/persistence/src/postgres/catalog-readback-receipts.js";
import {
  approval,
  lineage,
  TASK3_FIXTURE_NOW,
} from "./production-catalog-readback-authorization-fixtures.mjs";
import {
  C0,
  C1,
  F0,
  F1,
  liveCatalog,
  state,
} from "./production-catalog-readback-state-fixtures.mjs";

export function operatorPorts(aws, created) {
  return {
    aws,
    now: TASK3_FIXTURE_NOW,
    verifyExecutionAuthorization: ({ authorization }) => approval(
      created ?? { packet_sha256: authorization.packet_sha256 },
    ),
  };
}

export function successfulAws({
  invokeResult = liveCatalog(),
  rollbackState = state("R2", C0, F0),
} = {}) {
  const calls = [];
  const reads = [
    state("R0", C0, F0),
    state("R1", C1, F1),
    rollbackState,
  ];
  return {
    calls,
    async getCallerIdentity() {
      calls.push("identity");
      return {
        account_id: "770880870480",
        role: "matter-prod-deploy-admin",
      };
    },
    async getFunctionState() {
      calls.push("read");
      return reads.shift();
    },
    async updateFunctionCode(input) {
      calls.push(
        `update:${input.expected_revision_id}:${input.code_sha256_base64}`,
      );
      return input.code_sha256_base64 === C1
        ? { revision_id: "R1", code_sha256_base64: C1 }
        : { revision_id: "R2", code_sha256_base64: C0 };
    },
    async waitForFunctionActive() { calls.push("wait"); },
    async invokeFunction({ event }) {
      calls.push("invoke");
      if (invokeResult?.schema_version
          === CATALOG_READBACK_CATALOG_RECEIPT_SCHEMA_VERSION) {
        return invokeResult;
      }
      const validated = validateCatalogReadbackAuthorizationPacket(
        event.packet,
      );
      const created = {
        packet: validated.packet,
        packet_sha256: validated.packet_sha256,
      };
      return createCatalogReadbackCatalogReceipt({
        lineage: lineage(created),
        preflightReceiptSha256: event.preflight_receipt_sha256,
        catalog: invokeResult,
      });
    },
    async updateFunctionConfiguration() {
      calls.push("CONFIGURATION_WRITE_FORBIDDEN");
    },
  };
}
