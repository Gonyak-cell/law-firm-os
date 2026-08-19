import {
  catalogReadbackConfirmation,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import {
  C0,
  F0,
  FCFG,
  TASK2_AUDITOR_ROW,
  TASK2_INVENTORY_BINDING,
  TASK2_INVENTORY_PATH,
} from "./production-catalog-readback-state-fixtures.mjs";

export function validateArgv(created) {
  return [
    "--mode", "validate",
    "--profile", "matter-readonly-auditor",
    "--region", "ap-northeast-2",
    "--function-name", "lawos-production-projection-auditor",
    "--artifact", "/private/diagnostic.zip",
    "--rollback-artifact", TASK2_AUDITOR_ROW.rollback_code.path,
    "--task2-inventory", TASK2_INVENTORY_PATH,
    "--expected-task2-inventory-sha256",
    TASK2_INVENTORY_BINDING.inventory_sha256,
    "--expected-revision-id", "R0",
    "--expected-code-sha256", C0,
    "--expected-config-fingerprint", F0,
    "--expected-non-code-config-fingerprint", FCFG,
    "--packet", "/private/task3-packet.json",
    "--source-envelope", ".omo/evidence/desktop-installed-outlook-auto-provisioning/task-1-source-envelope.json",
    "--evidence", "/private/task3-preflight.json",
  ];
}

export function executeArgv(created) {
  return [
    "--mode", "execute",
    "--profile", "matter-prod-deploy-admin",
    "--region", "ap-northeast-2",
    "--function-name", "lawos-production-projection-auditor",
    "--artifact", "/private/diagnostic.zip",
    "--rollback-artifact", TASK2_AUDITOR_ROW.rollback_code.path,
    "--task2-inventory", TASK2_INVENTORY_PATH,
    "--expected-task2-inventory-sha256",
    TASK2_INVENTORY_BINDING.inventory_sha256,
    "--expected-revision-id", "R0",
    "--expected-code-sha256", C0,
    "--expected-config-fingerprint", F0,
    "--expected-non-code-config-fingerprint", FCFG,
    "--packet", "/private/task3-packet.json",
    "--source-envelope", ".omo/evidence/desktop-installed-outlook-auto-provisioning/task-1-source-envelope.json",
    "--evidence", "/private/task3-execution.json",
    "--output", "/private/task3-catalog.json",
    "--confirmation", catalogReadbackConfirmation(
      created.packet,
      created.packet_sha256,
    ),
    "--execute",
  ];
}
