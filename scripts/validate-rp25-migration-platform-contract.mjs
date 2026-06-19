import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as migration from "../packages/migration/src/index.js";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function planPack(plan, binding) {
  return plan.packs.find((item) => item.pack_id === binding.pack_id) ?? (await readOptionalJson("docs/closeout-packs/" + binding.pack_id.toLowerCase() + "/manifest.json"))?.plan_binding_snapshot;
}

const plan = await readJson("docs/closeout-pack-plan/closeout-pack-plan.json");
const entries = [
  {
    key: "cp756",
    binding: migration.MIGRATION_PLATFORM_CP756_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp756ScopeContractFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp756ScopeContractFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp756ScopeContractFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp756ScopeContractFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp756ScopeContractFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP756_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp756ScopeContractFoundationDescriptor,
  },
  {
    key: "cp757",
    binding: migration.MIGRATION_PLATFORM_CP757_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp757DomainImplementationDescriptor(),
    hermes: migration.createMigrationPlatformCp757DomainImplementationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp757DomainImplementationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp757DomainImplementationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp757DomainImplementationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP757_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp757DomainImplementationDescriptor,
  },
  {
    key: "cp758",
    binding: migration.MIGRATION_PLATFORM_CP758_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp758PermissionFixtureDescriptor(),
    hermes: migration.createMigrationPlatformCp758PermissionFixtureHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp758PermissionFixtureClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp758PermissionFixtureCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp758PermissionFixtureCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP758_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp758PermissionFixtureDescriptor,
  },
  {
    key: "cp759",
    binding: migration.MIGRATION_PLATFORM_CP759_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp759ServiceFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp759ServiceFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp759ServiceFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp759ServiceFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp759ServiceFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP759_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp759ServiceFoundationDescriptor,
  },
  {
    key: "cp760",
    binding: migration.MIGRATION_PLATFORM_CP760_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp760PrimaryServiceDescriptor(),
    hermes: migration.createMigrationPlatformCp760PrimaryServiceHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp760PrimaryServiceClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp760PrimaryServiceCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp760PrimaryServiceCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP760_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp760PrimaryServiceDescriptor,
  },
  {
    key: "cp761",
    binding: migration.MIGRATION_PLATFORM_CP761_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp761SecondaryServiceDescriptor(),
    hermes: migration.createMigrationPlatformCp761SecondaryServiceHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp761SecondaryServiceClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp761SecondaryServiceCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp761SecondaryServiceCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP761_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp761SecondaryServiceDescriptor,
  },
  {
    key: "cp762",
    binding: migration.MIGRATION_PLATFORM_CP762_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp762PermissionAuditServiceDescriptor(),
    hermes: migration.createMigrationPlatformCp762PermissionAuditServiceHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp762PermissionAuditServiceClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp762PermissionAuditServiceCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp762PermissionAuditServiceCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP762_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp762PermissionAuditServiceDescriptor,
  },
  {
    key: "cp763",
    binding: migration.MIGRATION_PLATFORM_CP763_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp763FixtureInterfaceFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp763FixtureInterfaceFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp763FixtureInterfaceFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp763FixtureInterfaceFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP763_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp763FixtureInterfaceFoundationDescriptor,
  },
  {
    key: "cp764",
    binding: migration.MIGRATION_PLATFORM_CP764_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp764InterfaceImplementationDescriptor(),
    hermes: migration.createMigrationPlatformCp764InterfaceImplementationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp764InterfaceImplementationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp764InterfaceImplementationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp764InterfaceImplementationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP764_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp764InterfaceImplementationDescriptor,
  },
  {
    key: "cp765",
    binding: migration.MIGRATION_PLATFORM_CP765_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp765InterfacePermissionFixtureDescriptor(),
    hermes: migration.createMigrationPlatformCp765InterfacePermissionFixtureHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp765InterfacePermissionFixtureClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp765InterfacePermissionFixtureCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp765InterfacePermissionFixtureCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP765_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp765InterfacePermissionFixtureDescriptor,
  },
  {
    key: "cp766",
    binding: migration.MIGRATION_PLATFORM_CP766_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp766InterfaceUiFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp766InterfaceUiFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp766InterfaceUiFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp766InterfaceUiFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp766InterfaceUiFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP766_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp766InterfaceUiFoundationDescriptor,
  },
  {
    key: "cp767",
    binding: migration.MIGRATION_PLATFORM_CP767_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp767UiWorkflowDescriptor(),
    hermes: migration.createMigrationPlatformCp767UiWorkflowHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp767UiWorkflowClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp767UiWorkflowCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp767UiWorkflowCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP767_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp767UiWorkflowDescriptor,
  },
  {
    key: "cp768",
    binding: migration.MIGRATION_PLATFORM_CP768_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp768UiPermissionFixtureDescriptor(),
    hermes: migration.createMigrationPlatformCp768UiPermissionFixtureHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp768UiPermissionFixtureClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp768UiPermissionFixtureCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp768UiPermissionFixtureCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP768_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp768UiPermissionFixtureDescriptor,
  },
  {
    key: "cp769",
    binding: migration.MIGRATION_PLATFORM_CP769_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp769UiFixtureFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp769UiFixtureFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp769UiFixtureFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp769UiFixtureFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp769UiFixtureFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP769_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp769UiFixtureFoundationDescriptor,
  },
  {
    key: "cp770",
    binding: migration.MIGRATION_PLATFORM_CP770_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp770FixtureImplementationDescriptor(),
    hermes: migration.createMigrationPlatformCp770FixtureImplementationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp770FixtureImplementationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp770FixtureImplementationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp770FixtureImplementationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP770_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp770FixtureImplementationDescriptor,
  },
  {
    key: "cp771",
    binding: migration.MIGRATION_PLATFORM_CP771_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp771FixturePermissionAuditDescriptor(),
    hermes: migration.createMigrationPlatformCp771FixturePermissionAuditHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp771FixturePermissionAuditClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp771FixturePermissionAuditCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp771FixturePermissionAuditCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP771_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp771FixturePermissionAuditDescriptor,
  },
  {
    key: "cp772",
    binding: migration.MIGRATION_PLATFORM_CP772_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp772SyntheticFixtureTailDescriptor(),
    hermes: migration.createMigrationPlatformCp772SyntheticFixtureTailHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp772SyntheticFixtureTailClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp772SyntheticFixtureTailCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp772SyntheticFixtureTailCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP772_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp772SyntheticFixtureTailDescriptor,
  },
  {
    key: "cp773",
    binding: migration.MIGRATION_PLATFORM_CP773_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp773FixtureEvidenceUiFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP773_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor,
  },
  {
    key: "cp774",
    binding: migration.MIGRATION_PLATFORM_CP774_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor(),
    hermes: migration.createMigrationPlatformCp774PermissionMatrixPrimaryHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp774PermissionMatrixPrimaryClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp774PermissionMatrixPrimaryCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp774PermissionMatrixPrimaryCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP774_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp774PermissionMatrixPrimaryDescriptor,
  },
  {
    key: "cp775",
    binding: migration.MIGRATION_PLATFORM_CP775_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor(),
    hermes: migration.createMigrationPlatformCp775PermissionMatrixWorkflowHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp775PermissionMatrixWorkflowClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp775PermissionMatrixWorkflowCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp775PermissionMatrixWorkflowCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP775_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp775PermissionMatrixWorkflowDescriptor,
  },
  {
    key: "cp776",
    binding: migration.MIGRATION_PLATFORM_CP776_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor(),
    hermes: migration.createMigrationPlatformCp776PermissionMatrixAuditBindingHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp776PermissionMatrixAuditBindingClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp776PermissionMatrixAuditBindingCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp776PermissionMatrixAuditBindingCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP776_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor,
  },
  {
    key: "cp777",
    binding: migration.MIGRATION_PLATFORM_CP777_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp777PermissionMatrixFixtureFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP777_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor,
  },
  {
    key: "cp778",
    binding: migration.MIGRATION_PLATFORM_CP778_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor(),
    hermes: migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp778PermissionFixtureFailureFoundationCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP778_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor,
  },
  {
    key: "cp779",
    binding: migration.MIGRATION_PLATFORM_CP779_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor(),
    hermes: migration.createMigrationPlatformCp779FailureRecoveryPrimaryHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp779FailureRecoveryPrimaryClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp779FailureRecoveryPrimaryCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp779FailureRecoveryPrimaryCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP779_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp779FailureRecoveryPrimaryDescriptor,
  },
  {
    key: "cp780",
    binding: migration.MIGRATION_PLATFORM_CP780_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor(),
    hermes: migration.createMigrationPlatformCp780FailureRecoveryWorkflowHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp780FailureRecoveryWorkflowClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp780FailureRecoveryWorkflowCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp780FailureRecoveryWorkflowCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP780_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp780FailureRecoveryWorkflowDescriptor,
  },
  {
    key: "cp781",
    binding: migration.MIGRATION_PLATFORM_CP781_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor(),
    hermes: migration.createMigrationPlatformCp781FailureRecoveryAuditBindingHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp781FailureRecoveryAuditBindingClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp781FailureRecoveryAuditBindingCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp781FailureRecoveryAuditBindingCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP781_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor,
  },
  {
    key: "cp782",
    binding: migration.MIGRATION_PLATFORM_CP782_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor(),
    hermes: migration.createMigrationPlatformCp782FailureRecoveryAuditTailHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp782FailureRecoveryAuditTailClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp782FailureRecoveryAuditTailCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp782FailureRecoveryAuditTailCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP782_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp782FailureRecoveryAuditTailDescriptor,
  },
  {
    key: "cp783",
    binding: migration.MIGRATION_PLATFORM_CP783_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor(),
    hermes: migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp783FailureRecoveryAuditCloseoutCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP783_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor,
  },
  {
    key: "cp784",
    binding: migration.MIGRATION_PLATFORM_CP784_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor(),
    hermes: migration.createMigrationPlatformCp784FailureFixtureReviewBridgeHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp784FailureFixtureReviewBridgeClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp784FailureFixtureReviewBridgeCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp784FailureFixtureReviewBridgeCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP784_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor,
  },
  {
    key: "cp785",
    binding: migration.MIGRATION_PLATFORM_CP785_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor(),
    hermes: migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp785ReviewReceiptImplementationBridgeCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP785_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor,
  },
  {
    key: "cp786",
    binding: migration.MIGRATION_PLATFORM_CP786_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor(),
    hermes: migration.createMigrationPlatformCp786ReviewPacketRiskBridgeHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp786ReviewPacketRiskBridgeClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp786ReviewPacketRiskBridgeCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp786ReviewPacketRiskBridgeCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP786_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor,
  },
  {
    key: "cp787",
    binding: migration.MIGRATION_PLATFORM_CP787_PACK_BINDING,
    descriptor: migration.createMigrationPlatformCp787ReviewRiskCloseoutDescriptor(),
    hermes: migration.createMigrationPlatformCp787ReviewRiskCloseoutHermesEvidencePacket(),
    claude: migration.createMigrationPlatformCp787ReviewRiskCloseoutClaudeReviewPacket(),
    handoff: migration.createMigrationPlatformCp787ReviewRiskCloseoutCloseoutHandoff(),
    coverage: migration.validateMigrationPlatformCp787ReviewRiskCloseoutCoverage(await planPack(plan, migration.MIGRATION_PLATFORM_CP787_PACK_BINDING)),
    validateDescriptor: migration.validateMigrationPlatformCp787ReviewRiskCloseoutDescriptor,
  },
];

for (const entry of entries) {
  const descriptorValidation = entry.validateDescriptor(entry.descriptor, { latest_pack: entry.binding });
  entry.descriptorValidation = descriptorValidation;
  assert.deepEqual(entry.coverage.errors, []);
  assert.deepEqual(descriptorValidation.errors, []);
  assert.equal(entry.hermes.emits_runtime_receipt, false);
  assert.equal(entry.claude.read_only, true);
  assert.equal(entry.handoff.to_pack_id, entry.binding.next_pack_id);
}

const latest = entries.at(-1);
const contract = {
  schema_version: "law-firm-os.migration-platform-contract.v0.1",
  generated_by: "scripts/validate-rp25-migration-platform-contract.mjs",
  program_contract: migration.MIGRATION_PLATFORM_PROGRAM_CONTRACT,
  current_pack: latest.binding,
  latest_pack: latest.binding,
  historical_packs: entries.slice(0, -1).map((entry) => entry.binding),
  projections: Object.fromEntries(entries.map((entry) => [entry.key, entry.descriptor])),
  latest_projection: latest.descriptor,
  hermes_packets: Object.fromEntries(entries.map((entry) => [entry.key, entry.hermes])),
  claude_packets: Object.fromEntries(entries.map((entry) => [entry.key, entry.claude])),
  closeout_handoffs: Object.fromEntries(entries.map((entry) => [entry.key, entry.handoff])),
  import_plan: migration.createMigrationImportPlanDescriptor(),
  mappers: migration.createMigrationMapperDescriptor(),
  validation: {
    valid: entries.every((entry) => entry.coverage.valid && entry.descriptorValidation.valid),
    packs: Object.fromEntries(entries.map((entry) => [entry.key, { coverage: entry.coverage, descriptor: entry.descriptorValidation }])),
  },
};

await writeFile("contracts/migration-platform-contract.json", JSON.stringify(contract, null, 2) + String.fromCharCode(10));
console.log("RP25 Migration Platform contract validation passed.");
console.log("pack: " + latest.binding.pack_id);
console.log("next: " + latest.binding.next_pack_id + " / " + latest.binding.next_subphase_id);
