import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import * as migration from "../src/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function planPack(binding) {
  const plan = readJson("docs/closeout-pack-plan/closeout-pack-plan.json");
  const fromPlan = plan.packs.find((item) => item.pack_id === binding.pack_id);
  if (fromPlan) return fromPlan;
  const manifestPath = "docs/closeout-packs/" + binding.pack_id.toLowerCase() + "/manifest.json";
  if (existsSync(manifestPath)) return readJson(manifestPath).plan_binding_snapshot;
  return undefined;
}

test("CP00-756 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP756_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-756");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp756ScopeContractFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP756_REQUIREMENTS.deliverable_counts);
});

test("CP00-756 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP756_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp756ScopeContractFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp756ScopeContractFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-757");
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp756ScopeContractFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp756ScopeContractFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp756ScopeContractFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-756 import plan and mapper descriptors stay dry-run only", () => {
  const importPlan = migration.createMigrationImportPlanDescriptor();
  assert.equal(importPlan.dry_run_required_before_import, true);
  assert.equal(importPlan.runtime_import_opened, false);
  assert.equal(importPlan.external_credential_included, false);
  const mapper = migration.createMigrationMapperDescriptor();
  assert.equal(mapper.requires_human_mapping_approval, true);
  assert.equal(mapper.runtime_mapping_opened, false);
  assert.equal(mapper.cross_tenant_access_allowed, false);
});

test("CP00-756 contract projection remains historical after CP00-757 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp756.descriptor, "MigrationPlatformCp756ScopeContractFoundationDescriptor");
  assert.equal(contract.validation.packs.cp756.coverage.valid, true);
});

test("CP00-757 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP757_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-757");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp757DomainImplementationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP757_REQUIREMENTS.deliverable_counts);
});

test("CP00-757 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP757_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp757DomainImplementationDescriptor();
  const validation = migration.validateMigrationPlatformCp757DomainImplementationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-758");
  assert.equal(descriptor.domain_implementation_case_set.section_count, 3);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp757DomainImplementationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp757DomainImplementationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp757DomainImplementationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-757 contract projection remains historical after CP00-758 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp757.descriptor, "MigrationPlatformCp757DomainImplementationDescriptor");
  assert.equal(contract.validation.packs.cp757.coverage.valid, true);
});

test("CP00-758 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP758_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-758");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp758PermissionFixtureCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP758_REQUIREMENTS.deliverable_counts);
});

test("CP00-758 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP758_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp758PermissionFixtureDescriptor();
  const validation = migration.validateMigrationPlatformCp758PermissionFixtureDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-759");
  assert.equal(descriptor.permission_fixture_case_set.section_count, 3);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp758PermissionFixtureHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp758PermissionFixtureClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp758PermissionFixtureCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-758 contract projection remains historical after CP00-759 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp758.descriptor, "MigrationPlatformCp758PermissionFixtureDescriptor");
  assert.equal(contract.validation.packs.cp758.coverage.valid, true);
});

test("CP00-759 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP759_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-759");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp759ServiceFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP759_REQUIREMENTS.deliverable_counts);
});

test("CP00-759 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP759_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp759ServiceFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp759ServiceFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-760");
  assert.equal(descriptor.service_foundation_case_set.section_count, 8);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp759ServiceFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp759ServiceFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp759ServiceFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-759 contract projection remains historical after CP00-760 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp759.descriptor, "MigrationPlatformCp759ServiceFoundationDescriptor");
  assert.equal(contract.validation.packs.cp759.coverage.valid, true);
});

test("CP00-760 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP760_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-760");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp760PrimaryServiceCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP760_REQUIREMENTS.deliverable_counts);
});

test("CP00-760 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP760_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp760PrimaryServiceDescriptor();
  const validation = migration.validateMigrationPlatformCp760PrimaryServiceDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-761");
  assert.equal(descriptor.primary_service_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp760PrimaryServiceHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp760PrimaryServiceClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp760PrimaryServiceCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-760 contract projection remains historical after CP00-761 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp760.descriptor, "MigrationPlatformCp760PrimaryServiceDescriptor");
  assert.equal(contract.validation.packs.cp760.coverage.valid, true);
});

test("CP00-761 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP761_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-761");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp761SecondaryServiceCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP761_REQUIREMENTS.deliverable_counts);
});

test("CP00-761 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP761_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp761SecondaryServiceDescriptor();
  const validation = migration.validateMigrationPlatformCp761SecondaryServiceDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-762");
  assert.equal(descriptor.secondary_service_case_set.section_count, 1);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp761SecondaryServiceHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp761SecondaryServiceClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp761SecondaryServiceCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-761 contract projection remains historical after CP00-762 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp761.descriptor, "MigrationPlatformCp761SecondaryServiceDescriptor");
  assert.equal(contract.validation.packs.cp761.coverage.valid, true);
});

test("CP00-762 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP762_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-762");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp762PermissionAuditServiceCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP762_REQUIREMENTS.deliverable_counts);
});

test("CP00-762 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP762_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp762PermissionAuditServiceDescriptor();
  const validation = migration.validateMigrationPlatformCp762PermissionAuditServiceDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-763");
  assert.equal(descriptor.permission_audit_service_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp762PermissionAuditServiceHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp762PermissionAuditServiceClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp762PermissionAuditServiceCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-762 contract projection remains historical after CP00-763 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp762.descriptor, "MigrationPlatformCp762PermissionAuditServiceDescriptor");
  assert.equal(contract.validation.packs.cp762.coverage.valid, true);
});

test("CP00-763 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP763_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-763");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp763FixtureInterfaceFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP763_REQUIREMENTS.deliverable_counts);
});

test("CP00-763 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP763_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp763FixtureInterfaceFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp763FixtureInterfaceFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-764");
  assert.equal(descriptor.fixture_interface_foundation_case_set.section_count, 8);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp763FixtureInterfaceFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp763FixtureInterfaceFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp763FixtureInterfaceFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-763 contract projection remains historical after CP00-764 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp763.descriptor, "MigrationPlatformCp763FixtureInterfaceFoundationDescriptor");
  assert.equal(contract.validation.packs.cp763.coverage.valid, true);
});

test("CP00-764 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP764_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-764");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp764InterfaceImplementationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP764_REQUIREMENTS.deliverable_counts);
});

test("CP00-764 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP764_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp764InterfaceImplementationDescriptor();
  const validation = migration.validateMigrationPlatformCp764InterfaceImplementationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-765");
  assert.equal(descriptor.interface_implementation_case_set.section_count, 3);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp764InterfaceImplementationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp764InterfaceImplementationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp764InterfaceImplementationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-764 contract projection remains historical after CP00-765 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp764.descriptor, "MigrationPlatformCp764InterfaceImplementationDescriptor");
  assert.equal(contract.validation.packs.cp764.coverage.valid, true);
});

test("CP00-765 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP765_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-765");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp765InterfacePermissionFixtureCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP765_REQUIREMENTS.deliverable_counts);
});

test("CP00-765 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP765_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp765InterfacePermissionFixtureDescriptor();
  const validation = migration.validateMigrationPlatformCp765InterfacePermissionFixtureDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-766");
  assert.equal(descriptor.interface_permission_fixture_case_set.section_count, 3);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp765InterfacePermissionFixtureHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp765InterfacePermissionFixtureClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp765InterfacePermissionFixtureCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-765 contract projection remains historical after CP00-766 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp765.descriptor, "MigrationPlatformCp765InterfacePermissionFixtureDescriptor");
  assert.equal(contract.validation.packs.cp765.coverage.valid, true);
});

test("CP00-766 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP766_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-766");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp766InterfaceUiFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP766_REQUIREMENTS.deliverable_counts);
});

test("CP00-766 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP766_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp766InterfaceUiFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp766InterfaceUiFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-767");
  assert.equal(descriptor.interface_ui_foundation_case_set.section_count, 9);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp766InterfaceUiFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp766InterfaceUiFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp766InterfaceUiFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-766 contract projection remains historical after CP00-767 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp766.descriptor, "MigrationPlatformCp766InterfaceUiFoundationDescriptor");
  assert.equal(contract.validation.packs.cp766.coverage.valid, true);
});

test("CP00-767 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP767_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-767");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp767UiWorkflowCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP767_REQUIREMENTS.deliverable_counts);
});

test("CP00-767 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP767_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp767UiWorkflowDescriptor();
  const validation = migration.validateMigrationPlatformCp767UiWorkflowDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-768");
  assert.equal(descriptor.ui_workflow_case_set.section_count, 3);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp767UiWorkflowHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp767UiWorkflowClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp767UiWorkflowCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-767 contract projection remains historical after CP00-768 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp767.descriptor, "MigrationPlatformCp767UiWorkflowDescriptor");
  assert.equal(contract.validation.packs.cp767.coverage.valid, true);
});

test("CP00-768 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP768_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-768");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp768UiPermissionFixtureCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP768_REQUIREMENTS.deliverable_counts);
});

test("CP00-768 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP768_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp768UiPermissionFixtureDescriptor();
  const validation = migration.validateMigrationPlatformCp768UiPermissionFixtureDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-769");
  assert.equal(descriptor.ui_permission_fixture_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp768UiPermissionFixtureHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp768UiPermissionFixtureClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp768UiPermissionFixtureCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-768 contract projection remains historical after CP00-769 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp768.descriptor, "MigrationPlatformCp768UiPermissionFixtureDescriptor");
  assert.equal(contract.validation.packs.cp768.coverage.valid, true);
});

test("CP00-769 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP769_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-769");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp769UiFixtureFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP769_REQUIREMENTS.deliverable_counts);
});

test("CP00-769 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP769_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp769UiFixtureFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp769UiFixtureFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-770");
  assert.equal(descriptor.ui_fixture_foundation_case_set.section_count, 8);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp769UiFixtureFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp769UiFixtureFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp769UiFixtureFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-769 contract projection remains historical after CP00-770 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp769.descriptor, "MigrationPlatformCp769UiFixtureFoundationDescriptor");
  assert.equal(contract.validation.packs.cp769.coverage.valid, true);
});

test("CP00-770 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP770_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-770");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp770FixtureImplementationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP770_REQUIREMENTS.deliverable_counts);
});

test("CP00-770 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP770_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp770FixtureImplementationDescriptor();
  const validation = migration.validateMigrationPlatformCp770FixtureImplementationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-771");
  assert.equal(descriptor.fixture_implementation_case_set.section_count, 3);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp770FixtureImplementationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp770FixtureImplementationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp770FixtureImplementationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-770 contract projection remains historical after CP00-771 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp770.descriptor, "MigrationPlatformCp770FixtureImplementationDescriptor");
  assert.equal(contract.validation.packs.cp770.coverage.valid, true);
});

test("CP00-771 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP771_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-771");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp771FixturePermissionAuditCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP771_REQUIREMENTS.deliverable_counts);
});

test("CP00-771 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP771_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp771FixturePermissionAuditDescriptor();
  const validation = migration.validateMigrationPlatformCp771FixturePermissionAuditDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-772");
  assert.equal(descriptor.fixture_permission_audit_case_set.section_count, 3);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp771FixturePermissionAuditHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp771FixturePermissionAuditClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp771FixturePermissionAuditCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-771 contract projection remains historical after CP00-772 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp771.descriptor, "MigrationPlatformCp771FixturePermissionAuditDescriptor");
  assert.equal(contract.validation.packs.cp771.coverage.valid, true);
});

test("CP00-772 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP772_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-772");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp772SyntheticFixtureTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP772_REQUIREMENTS.deliverable_counts);
});

test("CP00-772 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP772_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp772SyntheticFixtureTailDescriptor();
  const validation = migration.validateMigrationPlatformCp772SyntheticFixtureTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-773");
  assert.equal(descriptor.synthetic_fixture_tail_case_set.section_count, 1);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp772SyntheticFixtureTailHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp772SyntheticFixtureTailClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp772SyntheticFixtureTailCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-772 contract projection remains historical after CP00-773 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp772.descriptor, "MigrationPlatformCp772SyntheticFixtureTailDescriptor");
  assert.equal(contract.validation.packs.cp772.coverage.valid, true);
});

test("CP00-773 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP773_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-773");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp773FixtureEvidenceUiFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP773_REQUIREMENTS.deliverable_counts);
});

test("CP00-773 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP773_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-774");
  assert.equal(descriptor.fixture_evidence_ui_foundation_case_set.section_count, 8);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp773FixtureEvidenceUiFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-773 contract projection remains historical after CP00-774 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp773.descriptor, "MigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor");
  assert.equal(contract.validation.packs.cp773.coverage.valid, true);
});

test("CP00-774 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP774_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-774");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp774PermissionMatrixPrimaryCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP774_REQUIREMENTS.deliverable_counts);
});

test("CP00-774 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP774_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp774PermissionMatrixPrimaryDescriptor();
  const validation = migration.validateMigrationPlatformCp774PermissionMatrixPrimaryDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-775");
  assert.equal(descriptor.permission_matrix_primary_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp774PermissionMatrixPrimaryHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp774PermissionMatrixPrimaryClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp774PermissionMatrixPrimaryCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-774 contract projection remains historical after CP00-775 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp774.descriptor, "MigrationPlatformCp774PermissionMatrixPrimaryDescriptor");
  assert.equal(contract.validation.packs.cp774.coverage.valid, true);
});

test("CP00-775 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP775_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-775");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp775PermissionMatrixWorkflowCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP775_REQUIREMENTS.deliverable_counts);
});

test("CP00-775 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP775_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp775PermissionMatrixWorkflowDescriptor();
  const validation = migration.validateMigrationPlatformCp775PermissionMatrixWorkflowDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-776");
  assert.equal(descriptor.permission_matrix_workflow_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp775PermissionMatrixWorkflowHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp775PermissionMatrixWorkflowClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp775PermissionMatrixWorkflowCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-775 contract projection remains historical after CP00-776 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp775.descriptor, "MigrationPlatformCp775PermissionMatrixWorkflowDescriptor");
  assert.equal(contract.validation.packs.cp775.coverage.valid, true);
});

test("CP00-776 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP776_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-776");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp776PermissionMatrixAuditBindingCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP776_REQUIREMENTS.deliverable_counts);
});

test("CP00-776 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP776_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor();
  const validation = migration.validateMigrationPlatformCp776PermissionMatrixAuditBindingDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-777");
  assert.equal(descriptor.permission_matrix_audit_binding_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp776PermissionMatrixAuditBindingHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp776PermissionMatrixAuditBindingClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp776PermissionMatrixAuditBindingCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-776 contract projection remains historical after CP00-777 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp776.descriptor, "MigrationPlatformCp776PermissionMatrixAuditBindingDescriptor");
  assert.equal(contract.validation.packs.cp776.coverage.valid, true);
});

test("CP00-777 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP777_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-777");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp777PermissionMatrixFixtureFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP777_REQUIREMENTS.deliverable_counts);
});

test("CP00-777 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP777_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-778");
  assert.equal(descriptor.permission_matrix_fixture_foundation_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp777PermissionMatrixFixtureFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-777 contract projection remains historical after CP00-778 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp777.descriptor, "MigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor");
  assert.equal(contract.validation.packs.cp777.coverage.valid, true);
});

test("CP00-778 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP778_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-778");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp778PermissionFixtureFailureFoundationCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP778_REQUIREMENTS.deliverable_counts);
});

test("CP00-778 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP778_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor();
  const validation = migration.validateMigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-779");
  assert.equal(descriptor.permission_fixture_failure_foundation_case_set.section_count, 8);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp778PermissionFixtureFailureFoundationCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-778 contract projection remains historical after CP00-779 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp778.descriptor, "MigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor");
  assert.equal(contract.validation.packs.cp778.coverage.valid, true);
});

test("CP00-779 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP779_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-779");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp779FailureRecoveryPrimaryCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP779_REQUIREMENTS.deliverable_counts);
});

test("CP00-779 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP779_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp779FailureRecoveryPrimaryDescriptor();
  const validation = migration.validateMigrationPlatformCp779FailureRecoveryPrimaryDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-780");
  assert.equal(descriptor.failure_recovery_primary_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp779FailureRecoveryPrimaryHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp779FailureRecoveryPrimaryClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp779FailureRecoveryPrimaryCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-779 contract projection remains historical after CP00-780 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp779.descriptor, "MigrationPlatformCp779FailureRecoveryPrimaryDescriptor");
  assert.equal(contract.validation.packs.cp779.coverage.valid, true);
});

test("CP00-780 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP780_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-780");
  assert.equal(binding.unit_count, 40);
  const coverage = migration.validateMigrationPlatformCp780FailureRecoveryWorkflowCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP780_REQUIREMENTS.deliverable_counts);
});

test("CP00-780 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP780_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp780FailureRecoveryWorkflowDescriptor();
  const validation = migration.validateMigrationPlatformCp780FailureRecoveryWorkflowDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-781");
  assert.equal(descriptor.failure_recovery_workflow_case_set.section_count, 2);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp780FailureRecoveryWorkflowHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp780FailureRecoveryWorkflowClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp780FailureRecoveryWorkflowCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-780 contract projection remains historical after CP00-781 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp780.descriptor, "MigrationPlatformCp780FailureRecoveryWorkflowDescriptor");
  assert.equal(contract.validation.packs.cp780.coverage.valid, true);
});

test("CP00-781 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP781_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-781");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp781FailureRecoveryAuditBindingCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP781_REQUIREMENTS.deliverable_counts);
});

test("CP00-781 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP781_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor();
  const validation = migration.validateMigrationPlatformCp781FailureRecoveryAuditBindingDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-782");
  assert.equal(descriptor.failure_recovery_audit_binding_case_set.section_count, 1);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp781FailureRecoveryAuditBindingHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp781FailureRecoveryAuditBindingClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp781FailureRecoveryAuditBindingCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-781 contract projection remains historical after CP00-782 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp781.descriptor, "MigrationPlatformCp781FailureRecoveryAuditBindingDescriptor");
  assert.equal(contract.validation.packs.cp781.coverage.valid, true);
});

test("CP00-782 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP782_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-782");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp782FailureRecoveryAuditTailCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP782_REQUIREMENTS.deliverable_counts);
});

test("CP00-782 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP782_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp782FailureRecoveryAuditTailDescriptor();
  const validation = migration.validateMigrationPlatformCp782FailureRecoveryAuditTailDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-783");
  assert.equal(descriptor.failure_recovery_audit_tail_case_set.section_count, 1);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp782FailureRecoveryAuditTailHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp782FailureRecoveryAuditTailClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp782FailureRecoveryAuditTailCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-782 contract projection remains historical after CP00-783 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp782.descriptor, "MigrationPlatformCp782FailureRecoveryAuditTailDescriptor");
  assert.equal(contract.validation.packs.cp782.coverage.valid, true);
});

test("CP00-783 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP783_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-783");
  assert.equal(binding.unit_count, 10);
  const coverage = migration.validateMigrationPlatformCp783FailureRecoveryAuditCloseoutCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP783_REQUIREMENTS.deliverable_counts);
});

test("CP00-783 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP783_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor();
  const validation = migration.validateMigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-784");
  assert.equal(descriptor.failure_recovery_audit_closeout_case_set.section_count, 1);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp783FailureRecoveryAuditCloseoutCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-783 contract projection remains historical after CP00-784 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp783.descriptor, "MigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor");
  assert.equal(contract.validation.packs.cp783.coverage.valid, true);
});

test("CP00-784 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP784_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-784");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp784FailureFixtureReviewBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP784_REQUIREMENTS.deliverable_counts);
});

test("CP00-784 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP784_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor();
  const validation = migration.validateMigrationPlatformCp784FailureFixtureReviewBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-785");
  assert.equal(descriptor.failure_fixture_review_bridge_case_set.section_count, 8);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp784FailureFixtureReviewBridgeHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp784FailureFixtureReviewBridgeClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp784FailureFixtureReviewBridgeCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-784 contract projection remains historical after CP00-785 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp784.descriptor, "MigrationPlatformCp784FailureFixtureReviewBridgeDescriptor");
  assert.equal(contract.validation.packs.cp784.coverage.valid, true);
});

test("CP00-785 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP785_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-785");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp785ReviewReceiptImplementationBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP785_REQUIREMENTS.deliverable_counts);
});

test("CP00-785 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP785_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor();
  const validation = migration.validateMigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-786");
  assert.equal(descriptor.review_receipt_implementation_bridge_case_set.section_count, 8);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp785ReviewReceiptImplementationBridgeCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-785 contract projection remains historical after CP00-786 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp785.descriptor, "MigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor");
  assert.equal(contract.validation.packs.cp785.coverage.valid, true);
});

test("CP00-786 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP786_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-786");
  assert.equal(binding.unit_count, 150);
  const coverage = migration.validateMigrationPlatformCp786ReviewPacketRiskBridgeCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP786_REQUIREMENTS.deliverable_counts);
});

test("CP00-786 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP786_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor();
  const validation = migration.validateMigrationPlatformCp786ReviewPacketRiskBridgeDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-787");
  assert.equal(descriptor.review_packet_risk_bridge_case_set.section_count, 9);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp786ReviewPacketRiskBridgeHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp786ReviewPacketRiskBridgeClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp786ReviewPacketRiskBridgeCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-786 contract projection remains historical after CP00-787 promotion", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.projections.cp786.descriptor, "MigrationPlatformCp786ReviewPacketRiskBridgeDescriptor");
  assert.equal(contract.validation.packs.cp786.coverage.valid, true);
});

test("CP00-787 binding and coverage", () => {
  const binding = migration.MIGRATION_PLATFORM_CP787_PACK_BINDING;
  assert.equal(binding.pack_id, "CP00-787");
  assert.equal(binding.unit_count, 86);
  const coverage = migration.validateMigrationPlatformCp787ReviewRiskCloseoutCoverage(planPack(binding));
  assert.deepEqual(coverage.errors, []);
  assert.deepEqual(coverage.summary.by_deliverable, migration.MIGRATION_PLATFORM_CP787_REQUIREMENTS.deliverable_counts);
});

test("CP00-787 descriptor and packets stay runtime-closed", () => {
  const binding = migration.MIGRATION_PLATFORM_CP787_PACK_BINDING;
  const descriptor = migration.createMigrationPlatformCp787ReviewRiskCloseoutDescriptor();
  const validation = migration.validateMigrationPlatformCp787ReviewRiskCloseoutDescriptor(descriptor, { latest_pack: binding });
  assert.deepEqual(validation.errors, []);
  assert.equal(descriptor.authority_boundary.claude_is_final_approval, false);
  assert.equal(descriptor.authority_boundary.human_final_approval_required_for_runtime_opening, true);
  assert.equal(descriptor.authority_boundary.runtime_opening_pack_id, "CP00-788");
  assert.equal(descriptor.review_risk_closeout_case_set.section_count, 5);
  assert.equal(descriptor.file_server_runtime_opened, false);
  assert.equal(descriptor.sharepoint_runtime_opened, false);
  assert.equal(descriptor.google_drive_runtime_opened, false);
  assert.equal(descriptor.imanage_runtime_opened, false);
  const hermes = migration.createMigrationPlatformCp787ReviewRiskCloseoutHermesEvidencePacket();
  assert.equal(hermes.emits_runtime_receipt, false);
  const claude = migration.createMigrationPlatformCp787ReviewRiskCloseoutClaudeReviewPacket();
  assert.equal(claude.read_only, true);
  const handoff = migration.createMigrationPlatformCp787ReviewRiskCloseoutCloseoutHandoff();
  assert.equal(handoff.to_pack_id, binding.next_pack_id);
});

test("CP00-787 contract projection is latest", () => {
  const contract = readJson("contracts/migration-platform-contract.json");
  assert.equal(contract.program_contract.program_id, "RP25");
  assert.equal(contract.latest_pack.pack_id, "CP00-787");
  assert.equal(contract.latest_projection.descriptor, "MigrationPlatformCp787ReviewRiskCloseoutDescriptor");
  assert.equal(contract.projections.cp756.descriptor, "MigrationPlatformCp756ScopeContractFoundationDescriptor");
  assert.equal(contract.projections.cp757.descriptor, "MigrationPlatformCp757DomainImplementationDescriptor");
  assert.equal(contract.projections.cp758.descriptor, "MigrationPlatformCp758PermissionFixtureDescriptor");
  assert.equal(contract.projections.cp759.descriptor, "MigrationPlatformCp759ServiceFoundationDescriptor");
  assert.equal(contract.projections.cp760.descriptor, "MigrationPlatformCp760PrimaryServiceDescriptor");
  assert.equal(contract.projections.cp761.descriptor, "MigrationPlatformCp761SecondaryServiceDescriptor");
  assert.equal(contract.projections.cp762.descriptor, "MigrationPlatformCp762PermissionAuditServiceDescriptor");
  assert.equal(contract.projections.cp763.descriptor, "MigrationPlatformCp763FixtureInterfaceFoundationDescriptor");
  assert.equal(contract.projections.cp764.descriptor, "MigrationPlatformCp764InterfaceImplementationDescriptor");
  assert.equal(contract.projections.cp765.descriptor, "MigrationPlatformCp765InterfacePermissionFixtureDescriptor");
  assert.equal(contract.projections.cp766.descriptor, "MigrationPlatformCp766InterfaceUiFoundationDescriptor");
  assert.equal(contract.projections.cp767.descriptor, "MigrationPlatformCp767UiWorkflowDescriptor");
  assert.equal(contract.projections.cp768.descriptor, "MigrationPlatformCp768UiPermissionFixtureDescriptor");
  assert.equal(contract.projections.cp769.descriptor, "MigrationPlatformCp769UiFixtureFoundationDescriptor");
  assert.equal(contract.projections.cp770.descriptor, "MigrationPlatformCp770FixtureImplementationDescriptor");
  assert.equal(contract.projections.cp771.descriptor, "MigrationPlatformCp771FixturePermissionAuditDescriptor");
  assert.equal(contract.projections.cp772.descriptor, "MigrationPlatformCp772SyntheticFixtureTailDescriptor");
  assert.equal(contract.projections.cp773.descriptor, "MigrationPlatformCp773FixtureEvidenceUiFoundationDescriptor");
  assert.equal(contract.projections.cp774.descriptor, "MigrationPlatformCp774PermissionMatrixPrimaryDescriptor");
  assert.equal(contract.projections.cp775.descriptor, "MigrationPlatformCp775PermissionMatrixWorkflowDescriptor");
  assert.equal(contract.projections.cp776.descriptor, "MigrationPlatformCp776PermissionMatrixAuditBindingDescriptor");
  assert.equal(contract.projections.cp777.descriptor, "MigrationPlatformCp777PermissionMatrixFixtureFoundationDescriptor");
  assert.equal(contract.projections.cp778.descriptor, "MigrationPlatformCp778PermissionFixtureFailureFoundationDescriptor");
  assert.equal(contract.projections.cp779.descriptor, "MigrationPlatformCp779FailureRecoveryPrimaryDescriptor");
  assert.equal(contract.projections.cp780.descriptor, "MigrationPlatformCp780FailureRecoveryWorkflowDescriptor");
  assert.equal(contract.projections.cp781.descriptor, "MigrationPlatformCp781FailureRecoveryAuditBindingDescriptor");
  assert.equal(contract.projections.cp782.descriptor, "MigrationPlatformCp782FailureRecoveryAuditTailDescriptor");
  assert.equal(contract.projections.cp783.descriptor, "MigrationPlatformCp783FailureRecoveryAuditCloseoutDescriptor");
  assert.equal(contract.projections.cp784.descriptor, "MigrationPlatformCp784FailureFixtureReviewBridgeDescriptor");
  assert.equal(contract.projections.cp785.descriptor, "MigrationPlatformCp785ReviewReceiptImplementationBridgeDescriptor");
  assert.equal(contract.projections.cp786.descriptor, "MigrationPlatformCp786ReviewPacketRiskBridgeDescriptor");
  assert.equal(contract.projections.cp787.descriptor, "MigrationPlatformCp787ReviewRiskCloseoutDescriptor");
  assert.equal(contract.validation.valid, true);
});
