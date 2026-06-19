import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import {
  ADMIN_CONSOLE_CP645_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP645_PACK_BINDING,
  ADMIN_CONSOLE_CP645_REQUIREMENTS,
  ADMIN_CONSOLE_CP646_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP646_PACK_BINDING,
  ADMIN_CONSOLE_CP646_REQUIREMENTS,
  ADMIN_CONSOLE_CP647_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP647_PACK_BINDING,
  ADMIN_CONSOLE_CP647_REQUIREMENTS,
  ADMIN_CONSOLE_CP648_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP648_PACK_BINDING,
  ADMIN_CONSOLE_CP648_REQUIREMENTS,
  ADMIN_CONSOLE_CP649_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP649_PACK_BINDING,
  ADMIN_CONSOLE_CP649_REQUIREMENTS,
  ADMIN_CONSOLE_CP650_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP650_PACK_BINDING,
  ADMIN_CONSOLE_CP650_REQUIREMENTS,
  ADMIN_CONSOLE_CP651_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP651_PACK_BINDING,
  ADMIN_CONSOLE_CP651_REQUIREMENTS,
  ADMIN_CONSOLE_CP652_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP652_PACK_BINDING,
  ADMIN_CONSOLE_CP652_REQUIREMENTS,
  ADMIN_CONSOLE_CP653_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP653_PACK_BINDING,
  ADMIN_CONSOLE_CP653_REQUIREMENTS,
  ADMIN_CONSOLE_CP654_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP654_PACK_BINDING,
  ADMIN_CONSOLE_CP654_REQUIREMENTS,
  ADMIN_CONSOLE_CP655_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP655_PACK_BINDING,
  ADMIN_CONSOLE_CP655_REQUIREMENTS,
  ADMIN_CONSOLE_CP656_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP656_PACK_BINDING,
  ADMIN_CONSOLE_CP656_REQUIREMENTS,
  ADMIN_CONSOLE_CP657_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP657_PACK_BINDING,
  ADMIN_CONSOLE_CP657_REQUIREMENTS,
  ADMIN_CONSOLE_CP658_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP658_PACK_BINDING,
  ADMIN_CONSOLE_CP658_REQUIREMENTS,
  ADMIN_CONSOLE_CP659_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP659_PACK_BINDING,
  ADMIN_CONSOLE_CP659_REQUIREMENTS,
  ADMIN_CONSOLE_CP660_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP660_PACK_BINDING,
  ADMIN_CONSOLE_CP660_REQUIREMENTS,
  ADMIN_CONSOLE_CP661_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP661_PACK_BINDING,
  ADMIN_CONSOLE_CP661_REQUIREMENTS,
  ADMIN_CONSOLE_CP662_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP662_PACK_BINDING,
  ADMIN_CONSOLE_CP662_REQUIREMENTS,
  ADMIN_CONSOLE_CP663_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP663_PACK_BINDING,
  ADMIN_CONSOLE_CP663_REQUIREMENTS,
  ADMIN_CONSOLE_CP664_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP664_PACK_BINDING,
  ADMIN_CONSOLE_CP664_REQUIREMENTS,
  ADMIN_CONSOLE_CP665_NO_WRITE_ATTESTATION,
  ADMIN_CONSOLE_CP665_PACK_BINDING,
  ADMIN_CONSOLE_CP665_REQUIREMENTS,
  ADMIN_CONSOLE_PROGRAM_CONTRACT,
  createAdminConsoleCoreContractProjection,
  createAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor,
  createAdminConsoleCp665ClaudeReviewPacket,
  createAdminConsoleCp665CloseoutHandoff,
  createAdminConsoleCp665HermesEvidencePacket,
  createAdminConsoleCp664TestGoldenReviewTailDescriptor,
  createAdminConsoleCp664ClaudeReviewPacket,
  createAdminConsoleCp664CloseoutHandoff,
  createAdminConsoleCp664HermesEvidencePacket,
  createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor,
  createAdminConsoleCp661ClaudeReviewPacket,
  createAdminConsoleCp661CloseoutHandoff,
  createAdminConsoleCp661HermesEvidencePacket,
  createAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor,
  createAdminConsoleCp662ClaudeReviewPacket,
  createAdminConsoleCp662CloseoutHandoff,
  createAdminConsoleCp662HermesEvidencePacket,
  createAdminConsoleCp663ReviewReadinessBridgeDescriptor,
  createAdminConsoleCp663ClaudeReviewPacket,
  createAdminConsoleCp663CloseoutHandoff,
  createAdminConsoleCp663HermesEvidencePacket,
  createAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor,
  createAdminConsoleCp660ClaudeReviewPacket,
  createAdminConsoleCp660CloseoutHandoff,
  createAdminConsoleCp660HermesEvidencePacket,
  createAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor,
  createAdminConsoleCp659ClaudeReviewPacket,
  createAdminConsoleCp659CloseoutHandoff,
  createAdminConsoleCp659HermesEvidencePacket,
  createAdminConsoleCp658FailureReceiptEscalationDescriptor,
  createAdminConsoleCp658ClaudeReviewPacket,
  createAdminConsoleCp658CloseoutHandoff,
  createAdminConsoleCp658HermesEvidencePacket,
  createAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor,
  createAdminConsoleCp657ClaudeReviewPacket,
  createAdminConsoleCp657CloseoutHandoff,
  createAdminConsoleCp657HermesEvidencePacket,
  createAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor,
  createAdminConsoleCp656ClaudeReviewPacket,
  createAdminConsoleCp656CloseoutHandoff,
  createAdminConsoleCp656HermesEvidencePacket,
  createAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor,
  createAdminConsoleCp655ClaudeReviewPacket,
  createAdminConsoleCp655CloseoutHandoff,
  createAdminConsoleCp655HermesEvidencePacket,
  createAdminConsoleCp654SyntheticPermissionMatrixDescriptor,
  createAdminConsoleCp654ClaudeReviewPacket,
  createAdminConsoleCp654CloseoutHandoff,
  createAdminConsoleCp654HermesEvidencePacket,
  createAdminConsoleCp653PermissionFixtureTailDescriptor,
  createAdminConsoleCp653ClaudeReviewPacket,
  createAdminConsoleCp653CloseoutHandoff,
  createAdminConsoleCp653HermesEvidencePacket,
  createAdminConsoleCp652FixtureGoldenCaseDescriptor,
  createAdminConsoleCp652ClaudeReviewPacket,
  createAdminConsoleCp652CloseoutHandoff,
  createAdminConsoleCp652HermesEvidencePacket,
  createAdminConsoleCp651UiPermissionFixtureDescriptor,
  createAdminConsoleCp651ClaudeReviewPacket,
  createAdminConsoleCp651CloseoutHandoff,
  createAdminConsoleCp651HermesEvidencePacket,
  createAdminConsoleCp650UiImplementationSliceDescriptor,
  createAdminConsoleCp650ClaudeReviewPacket,
  createAdminConsoleCp650CloseoutHandoff,
  createAdminConsoleCp650HermesEvidencePacket,
  createAdminConsoleCp649ReviewCloseoutApiUiDescriptor,
  createAdminConsoleCp649ClaudeReviewPacket,
  createAdminConsoleCp649CloseoutHandoff,
  createAdminConsoleCp649HermesEvidencePacket,
  createAdminConsoleCp648ClaudeReviewBoundaryDescriptor,
  createAdminConsoleCp648ClaudeReviewPacket,
  createAdminConsoleCp648CloseoutHandoff,
  createAdminConsoleCp648HermesEvidencePacket,
  createAdminConsoleCp645ClaudeReviewPacket,
  createAdminConsoleCp645CloseoutHandoff,
  createAdminConsoleCp645HermesEvidencePacket,
  createAdminConsoleCp645ScopeDomainFoundationDescriptor,
  createAdminConsoleCp646ClaudeReviewPacket,
  createAdminConsoleCp646CloseoutHandoff,
  createAdminConsoleCp646DomainServiceBridgeDescriptor,
  createAdminConsoleCp646HermesEvidencePacket,
  createAdminConsoleCp647ClaudeReviewPacket,
  createAdminConsoleCp647CloseoutHandoff,
  createAdminConsoleCp647HermesEvidencePacket,
  createAdminConsoleCp647TestEvidenceReviewPacketDescriptor,
  validateAdminConsoleCoreContractProjection,
  validateAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor,
  validateAdminConsoleCp661Coverage,
  validateAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor,
  validateAdminConsoleCp662Coverage,
  validateAdminConsoleCp663ReviewReadinessBridgeDescriptor,
  validateAdminConsoleCp663Coverage,
  validateAdminConsoleCp664TestGoldenReviewTailDescriptor,
  validateAdminConsoleCp664Coverage,
  validateAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor,
  validateAdminConsoleCp665Coverage,
  validateAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor,
  validateAdminConsoleCp660Coverage,
  validateAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor,
  validateAdminConsoleCp659Coverage,
  validateAdminConsoleCp658FailureReceiptEscalationDescriptor,
  validateAdminConsoleCp658Coverage,
  validateAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor,
  validateAdminConsoleCp657Coverage,
  validateAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor,
  validateAdminConsoleCp656Coverage,
  validateAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor,
  validateAdminConsoleCp655Coverage,
  validateAdminConsoleCp654SyntheticPermissionMatrixDescriptor,
  validateAdminConsoleCp654Coverage,
  validateAdminConsoleCp653PermissionFixtureTailDescriptor,
  validateAdminConsoleCp653Coverage,
  validateAdminConsoleCp652FixtureGoldenCaseDescriptor,
  validateAdminConsoleCp652Coverage,
  validateAdminConsoleCp651UiPermissionFixtureDescriptor,
  validateAdminConsoleCp651Coverage,
  validateAdminConsoleCp650UiImplementationSliceDescriptor,
  validateAdminConsoleCp650Coverage,
  validateAdminConsoleCp649ReviewCloseoutApiUiDescriptor,
  validateAdminConsoleCp649Coverage,
  validateAdminConsoleCp648ClaudeReviewBoundaryDescriptor,
  validateAdminConsoleCp648Coverage,
  validateAdminConsoleCp645Coverage,
  validateAdminConsoleCp645ScopeDomainFoundationDescriptor,
  validateAdminConsoleCp646Coverage,
  validateAdminConsoleCp646DomainServiceBridgeDescriptor,
  validateAdminConsoleCp647Coverage,
  validateAdminConsoleCp647TestEvidenceReviewPacketDescriptor,
} from "../packages/admin/src/index.js";

const planPath = new URL("../docs/closeout-pack-plan/closeout-pack-plan.json", import.meta.url);
const cp645ManifestPath = new URL("../docs/closeout-packs/cp00-645/manifest.json", import.meta.url);
const cp646ManifestPath = new URL("../docs/closeout-packs/cp00-646/manifest.json", import.meta.url);
const cp647ManifestPath = new URL("../docs/closeout-packs/cp00-647/manifest.json", import.meta.url);
const cp648ManifestPath = new URL("../docs/closeout-packs/cp00-648/manifest.json", import.meta.url);
const cp649ManifestPath = new URL("../docs/closeout-packs/cp00-649/manifest.json", import.meta.url);
const cp650ManifestPath = new URL("../docs/closeout-packs/cp00-650/manifest.json", import.meta.url);
const cp651ManifestPath = new URL("../docs/closeout-packs/cp00-651/manifest.json", import.meta.url);
const cp652ManifestPath = new URL("../docs/closeout-packs/cp00-652/manifest.json", import.meta.url);
const cp653ManifestPath = new URL("../docs/closeout-packs/cp00-653/manifest.json", import.meta.url);
const cp654ManifestPath = new URL("../docs/closeout-packs/cp00-654/manifest.json", import.meta.url);
const cp655ManifestPath = new URL("../docs/closeout-packs/cp00-655/manifest.json", import.meta.url);
const cp656ManifestPath = new URL("../docs/closeout-packs/cp00-656/manifest.json", import.meta.url);
const cp657ManifestPath = new URL("../docs/closeout-packs/cp00-657/manifest.json", import.meta.url);
const cp658ManifestPath = new URL("../docs/closeout-packs/cp00-658/manifest.json", import.meta.url);
const cp659ManifestPath = new URL("../docs/closeout-packs/cp00-659/manifest.json", import.meta.url);
const cp660ManifestPath = new URL("../docs/closeout-packs/cp00-660/manifest.json", import.meta.url);
const cp661ManifestPath = new URL("../docs/closeout-packs/cp00-661/manifest.json", import.meta.url);
const cp662ManifestPath = new URL("../docs/closeout-packs/cp00-662/manifest.json", import.meta.url);
const cp663ManifestPath = new URL("../docs/closeout-packs/cp00-663/manifest.json", import.meta.url);
const cp664ManifestPath = new URL("../docs/closeout-packs/cp00-664/manifest.json", import.meta.url);
const cp665ManifestPath = new URL("../docs/closeout-packs/cp00-665/manifest.json", import.meta.url);
const contractPath = new URL("../contracts/admin-console-contract.json", import.meta.url);

const shouldWrite = process.argv.includes("--write");

const closeoutPlan = JSON.parse(await readFile(planPath, "utf8"));
const cp645Manifest = JSON.parse(await readFile(cp645ManifestPath, "utf8"));
const cp646Manifest = JSON.parse(await readFile(cp646ManifestPath, "utf8"));
const cp647Manifest = existsSync(cp647ManifestPath) ? JSON.parse(await readFile(cp647ManifestPath, "utf8")) : null;
const cp648Manifest = existsSync(cp648ManifestPath) ? JSON.parse(await readFile(cp648ManifestPath, "utf8")) : null;
const cp649Manifest = existsSync(cp649ManifestPath) ? JSON.parse(await readFile(cp649ManifestPath, "utf8")) : null;
const cp650Manifest = existsSync(cp650ManifestPath) ? JSON.parse(await readFile(cp650ManifestPath, "utf8")) : null;
const cp651Manifest = existsSync(cp651ManifestPath) ? JSON.parse(await readFile(cp651ManifestPath, "utf8")) : null;
const cp652Manifest = existsSync(cp652ManifestPath) ? JSON.parse(await readFile(cp652ManifestPath, "utf8")) : null;
const cp653Manifest = existsSync(cp653ManifestPath) ? JSON.parse(await readFile(cp653ManifestPath, "utf8")) : null;
const cp654Manifest = existsSync(cp654ManifestPath) ? JSON.parse(await readFile(cp654ManifestPath, "utf8")) : null;
const cp655Manifest = existsSync(cp655ManifestPath) ? JSON.parse(await readFile(cp655ManifestPath, "utf8")) : null;
const cp656Manifest = existsSync(cp656ManifestPath) ? JSON.parse(await readFile(cp656ManifestPath, "utf8")) : null;
const cp657Manifest = existsSync(cp657ManifestPath) ? JSON.parse(await readFile(cp657ManifestPath, "utf8")) : null;
const cp658Manifest = existsSync(cp658ManifestPath) ? JSON.parse(await readFile(cp658ManifestPath, "utf8")) : null;
const cp659Manifest = existsSync(cp659ManifestPath) ? JSON.parse(await readFile(cp659ManifestPath, "utf8")) : null;
const cp660Manifest = existsSync(cp660ManifestPath) ? JSON.parse(await readFile(cp660ManifestPath, "utf8")) : null;
const cp661Manifest = existsSync(cp661ManifestPath) ? JSON.parse(await readFile(cp661ManifestPath, "utf8")) : null;
const cp662Manifest = existsSync(cp662ManifestPath) ? JSON.parse(await readFile(cp662ManifestPath, "utf8")) : null;
const cp663Manifest = existsSync(cp663ManifestPath) ? JSON.parse(await readFile(cp663ManifestPath, "utf8")) : null;
const cp664Manifest = existsSync(cp664ManifestPath) ? JSON.parse(await readFile(cp664ManifestPath, "utf8")) : null;
const cp665Manifest = existsSync(cp665ManifestPath) ? JSON.parse(await readFile(cp665ManifestPath, "utf8")) : null;
const cp645PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id) ??
  cp645Manifest.plan_binding_snapshot;
assert(cp645PlanPack, "CP00-645 plan pack must exist");
const cp646PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id) ??
  cp646Manifest.plan_binding_snapshot;
assert(cp646PlanPack, "CP00-646 plan pack must exist");
const cp647PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id) ??
  cp647Manifest?.plan_binding_snapshot;
assert(cp647PlanPack, "CP00-647 plan pack must exist");
const cp648PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id) ??
  cp648Manifest?.plan_binding_snapshot;
assert(cp648PlanPack, "CP00-648 plan pack must exist");
const cp649PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id) ??
  cp649Manifest?.plan_binding_snapshot;
assert(cp649PlanPack, "CP00-649 plan pack must exist");
const cp650PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id) ??
  cp650Manifest?.plan_binding_snapshot;
assert(cp650PlanPack, "CP00-650 plan pack must exist");
const cp651PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id) ??
  cp651Manifest?.plan_binding_snapshot;
assert(cp651PlanPack, "CP00-651 plan pack must exist");
const cp652PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id) ??
  cp652Manifest?.plan_binding_snapshot;
assert(cp652PlanPack, "CP00-652 plan pack must exist");
const cp653PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id) ??
  cp653Manifest?.plan_binding_snapshot;
assert(cp653PlanPack, "CP00-653 plan pack must exist");
const cp654PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id) ??
  cp654Manifest?.plan_binding_snapshot;
assert(cp654PlanPack, "CP00-654 plan pack must exist");
const cp655PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id) ??
  cp655Manifest?.plan_binding_snapshot;
assert(cp655PlanPack, "CP00-655 plan pack must exist");
const cp656PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id) ??
  cp656Manifest?.plan_binding_snapshot;
assert(cp656PlanPack, "CP00-656 plan pack must exist");
const cp657PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id) ??
  cp657Manifest?.plan_binding_snapshot;
assert(cp657PlanPack, "CP00-657 plan pack must exist");
const cp658PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id) ??
  cp658Manifest?.plan_binding_snapshot;
assert(cp658PlanPack, "CP00-658 plan pack must exist");
const cp659PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id) ??
  cp659Manifest?.plan_binding_snapshot;
assert(cp659PlanPack, "CP00-659 plan pack must exist");
const cp660PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id) ??
  cp660Manifest?.plan_binding_snapshot;
assert(cp660PlanPack, "CP00-660 plan pack must exist");
const cp661PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id) ??
  cp661Manifest?.plan_binding_snapshot;
assert(cp661PlanPack, "CP00-661 plan pack must exist");
const cp662PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id) ??
  cp662Manifest?.plan_binding_snapshot;
assert(cp662PlanPack, "CP00-662 plan pack must exist");
const cp663PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id) ??
  cp663Manifest?.plan_binding_snapshot;
assert(cp663PlanPack, "CP00-663 plan pack must exist");
const cp664PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id) ??
  cp664Manifest?.plan_binding_snapshot;
assert(cp664PlanPack, "CP00-664 plan pack must exist");
const cp665PlanPack =
  closeoutPlan.packs.find((pack) => pack.pack_id === ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id) ??
  cp665Manifest?.plan_binding_snapshot;
assert(cp665PlanPack, "CP00-665 plan pack must exist");

const cp645Descriptor = createAdminConsoleCp645ScopeDomainFoundationDescriptor();
const cp646Descriptor = createAdminConsoleCp646DomainServiceBridgeDescriptor({ source_descriptor: cp645Descriptor });
const cp647Descriptor = createAdminConsoleCp647TestEvidenceReviewPacketDescriptor({ source_descriptor: cp646Descriptor });
const cp648Descriptor = createAdminConsoleCp648ClaudeReviewBoundaryDescriptor({ source_descriptor: cp647Descriptor });
const cp649Descriptor = createAdminConsoleCp649ReviewCloseoutApiUiDescriptor({ source_descriptor: cp648Descriptor });
const cp650Descriptor = createAdminConsoleCp650UiImplementationSliceDescriptor({ source_descriptor: cp649Descriptor });
const cp651Descriptor = createAdminConsoleCp651UiPermissionFixtureDescriptor({ source_descriptor: cp650Descriptor });
const cp652Descriptor = createAdminConsoleCp652FixtureGoldenCaseDescriptor({ source_descriptor: cp651Descriptor });
const cp653Descriptor = createAdminConsoleCp653PermissionFixtureTailDescriptor({ source_descriptor: cp652Descriptor });
const cp654Descriptor = createAdminConsoleCp654SyntheticPermissionMatrixDescriptor({ source_descriptor: cp653Descriptor });
const cp655Descriptor = createAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor({ source_descriptor: cp654Descriptor });
const cp656Descriptor = createAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor({ source_descriptor: cp655Descriptor });
const cp657Descriptor = createAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor({ source_descriptor: cp656Descriptor });
const cp658Descriptor = createAdminConsoleCp658FailureReceiptEscalationDescriptor({ source_descriptor: cp657Descriptor });
const cp659Descriptor = createAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor({
  source_descriptor: cp658Descriptor,
});
const cp660Descriptor = createAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor({
  source_descriptor: cp659Descriptor,
});
const cp661Descriptor = createAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor({
  source_descriptor: cp660Descriptor,
});
const cp662Descriptor = createAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor({
  source_descriptor: cp661Descriptor,
});
const cp663Descriptor = createAdminConsoleCp663ReviewReadinessBridgeDescriptor({
  source_descriptor: cp662Descriptor,
});
const cp664Descriptor = createAdminConsoleCp664TestGoldenReviewTailDescriptor({
  source_descriptor: cp663Descriptor,
});
const cp665Descriptor = createAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor({
  source_descriptor: cp664Descriptor,
});
const projection = createAdminConsoleCoreContractProjection({
  cp645Descriptor,
  cp646Descriptor,
  cp647Descriptor,
  cp648Descriptor,
  cp649Descriptor,
  cp650Descriptor,
  cp651Descriptor,
  cp652Descriptor,
  cp653Descriptor,
  cp654Descriptor,
  cp655Descriptor,
  cp656Descriptor,
  cp657Descriptor,
  cp658Descriptor,
  cp659Descriptor,
  cp660Descriptor,
  cp661Descriptor,
  cp662Descriptor,
  cp663Descriptor,
  cp664Descriptor,
  cp665Descriptor,
});

if (shouldWrite) {
  await writeFile(contractPath, `${JSON.stringify(projection, null, 2)}\n`);
}

const contract = JSON.parse(await readFile(contractPath, "utf8"));
const cp645Coverage = validateAdminConsoleCp645Coverage(cp645PlanPack);
const cp646Coverage = validateAdminConsoleCp646Coverage(cp646PlanPack);
const cp647Coverage = validateAdminConsoleCp647Coverage(cp647PlanPack);
const cp648Coverage = validateAdminConsoleCp648Coverage(cp648PlanPack);
const cp649Coverage = validateAdminConsoleCp649Coverage(cp649PlanPack);
const cp650Coverage = validateAdminConsoleCp650Coverage(cp650PlanPack);
const cp651Coverage = validateAdminConsoleCp651Coverage(cp651PlanPack);
const cp652Coverage = validateAdminConsoleCp652Coverage(cp652PlanPack);
const cp653Coverage = validateAdminConsoleCp653Coverage(cp653PlanPack);
const cp654Coverage = validateAdminConsoleCp654Coverage(cp654PlanPack);
const cp655Coverage = validateAdminConsoleCp655Coverage(cp655PlanPack);
const cp656Coverage = validateAdminConsoleCp656Coverage(cp656PlanPack);
const cp657Coverage = validateAdminConsoleCp657Coverage(cp657PlanPack);
const cp658Coverage = validateAdminConsoleCp658Coverage(cp658PlanPack);
const cp659Coverage = validateAdminConsoleCp659Coverage(cp659PlanPack);
const cp660Coverage = validateAdminConsoleCp660Coverage(cp660PlanPack);
const cp661Coverage = validateAdminConsoleCp661Coverage(cp661PlanPack);
const cp662Coverage = validateAdminConsoleCp662Coverage(cp662PlanPack);
const cp663Coverage = validateAdminConsoleCp663Coverage(cp663PlanPack);
const cp664Coverage = validateAdminConsoleCp664Coverage(cp664PlanPack);
const cp665Coverage = validateAdminConsoleCp665Coverage(cp665PlanPack);
const cp645DescriptorValidation = validateAdminConsoleCp645ScopeDomainFoundationDescriptor(cp645Descriptor, contract);
const cp646DescriptorValidation = validateAdminConsoleCp646DomainServiceBridgeDescriptor(cp646Descriptor, contract);
const cp647DescriptorValidation = validateAdminConsoleCp647TestEvidenceReviewPacketDescriptor(cp647Descriptor, contract);
const cp648DescriptorValidation = validateAdminConsoleCp648ClaudeReviewBoundaryDescriptor(cp648Descriptor, contract);
const cp649DescriptorValidation = validateAdminConsoleCp649ReviewCloseoutApiUiDescriptor(cp649Descriptor, contract);
const cp650DescriptorValidation = validateAdminConsoleCp650UiImplementationSliceDescriptor(cp650Descriptor, contract);
const cp651DescriptorValidation = validateAdminConsoleCp651UiPermissionFixtureDescriptor(cp651Descriptor, contract);
const cp652DescriptorValidation = validateAdminConsoleCp652FixtureGoldenCaseDescriptor(cp652Descriptor, contract);
const cp653DescriptorValidation = validateAdminConsoleCp653PermissionFixtureTailDescriptor(cp653Descriptor, contract);
const cp654DescriptorValidation = validateAdminConsoleCp654SyntheticPermissionMatrixDescriptor(cp654Descriptor, contract);
const cp655DescriptorValidation = validateAdminConsoleCp655PermissionMatrixWorkflowTailDescriptor(cp655Descriptor, contract);
const cp656DescriptorValidation = validateAdminConsoleCp656PermissionAuditFixtureTransitionDescriptor(cp656Descriptor, contract);
const cp657DescriptorValidation = validateAdminConsoleCp657SyntheticFailureRecoveryBridgeDescriptor(cp657Descriptor, contract);
const cp658DescriptorValidation = validateAdminConsoleCp658FailureReceiptEscalationDescriptor(cp658Descriptor, contract);
const cp659DescriptorValidation = validateAdminConsoleCp659FailureRecoveryPermissionAuditBindingDescriptor(
  cp659Descriptor,
  contract,
);
const cp660DescriptorValidation = validateAdminConsoleCp660FailureRecoveryFixtureTransitionDescriptor(
  cp660Descriptor,
  contract,
);
const cp661DescriptorValidation = validateAdminConsoleCp661FailureRecoveryHermesEvidenceBridgeDescriptor(
  cp661Descriptor,
  contract,
);
const cp662DescriptorValidation = validateAdminConsoleCp662EvidencePermissionFixtureBridgeDescriptor(
  cp662Descriptor,
  contract,
);
const cp663DescriptorValidation = validateAdminConsoleCp663ReviewReadinessBridgeDescriptor(
  cp663Descriptor,
  contract,
);
const cp664DescriptorValidation = validateAdminConsoleCp664TestGoldenReviewTailDescriptor(
  cp664Descriptor,
  contract,
);
const cp665DescriptorValidation = validateAdminConsoleCp665ReviewEvidenceCloseoutBridgeDescriptor(
  cp665Descriptor,
  contract,
);
const contractValidation = validateAdminConsoleCoreContractProjection(contract, {
  cp645PlanPack,
  cp646PlanPack,
  cp647PlanPack,
  cp648PlanPack,
  cp649PlanPack,
  cp650PlanPack,
  cp651PlanPack,
  cp652PlanPack,
  cp653PlanPack,
  cp654PlanPack,
  cp655PlanPack,
  cp656PlanPack,
  cp657PlanPack,
  cp658PlanPack,
  cp659PlanPack,
  cp660PlanPack,
  cp661PlanPack,
  cp662PlanPack,
  cp663PlanPack,
  cp664PlanPack,
  cp665PlanPack,
});

assert.equal(cp645Coverage.valid, true, cp645Coverage.errors.join("; "));
assert.equal(cp646Coverage.valid, true, cp646Coverage.errors.join("; "));
assert.equal(cp647Coverage.valid, true, cp647Coverage.errors.join("; "));
assert.equal(cp648Coverage.valid, true, cp648Coverage.errors.join("; "));
assert.equal(cp649Coverage.valid, true, cp649Coverage.errors.join("; "));
assert.equal(cp650Coverage.valid, true, cp650Coverage.errors.join("; "));
assert.equal(cp651Coverage.valid, true, cp651Coverage.errors.join("; "));
assert.equal(cp652Coverage.valid, true, cp652Coverage.errors.join("; "));
assert.equal(cp653Coverage.valid, true, cp653Coverage.errors.join("; "));
assert.equal(cp654Coverage.valid, true, cp654Coverage.errors.join("; "));
assert.equal(cp655Coverage.valid, true, cp655Coverage.errors.join("; "));
assert.equal(cp656Coverage.valid, true, cp656Coverage.errors.join("; "));
assert.equal(cp657Coverage.valid, true, cp657Coverage.errors.join("; "));
assert.equal(cp658Coverage.valid, true, cp658Coverage.errors.join("; "));
assert.equal(cp659Coverage.valid, true, cp659Coverage.errors.join("; "));
assert.equal(cp660Coverage.valid, true, cp660Coverage.errors.join("; "));
assert.equal(cp661Coverage.valid, true, cp661Coverage.errors.join("; "));
assert.equal(cp662Coverage.valid, true, cp662Coverage.errors.join("; "));
assert.equal(cp663Coverage.valid, true, cp663Coverage.errors.join("; "));
assert.equal(cp664Coverage.valid, true, cp664Coverage.errors.join("; "));
assert.equal(cp665Coverage.valid, true, cp665Coverage.errors.join("; "));
assert.equal(cp645DescriptorValidation.valid, true, cp645DescriptorValidation.errors.join("; "));
assert.equal(cp646DescriptorValidation.valid, true, cp646DescriptorValidation.errors.join("; "));
assert.equal(cp647DescriptorValidation.valid, true, cp647DescriptorValidation.errors.join("; "));
assert.equal(cp648DescriptorValidation.valid, true, cp648DescriptorValidation.errors.join("; "));
assert.equal(cp649DescriptorValidation.valid, true, cp649DescriptorValidation.errors.join("; "));
assert.equal(cp650DescriptorValidation.valid, true, cp650DescriptorValidation.errors.join("; "));
assert.equal(cp651DescriptorValidation.valid, true, cp651DescriptorValidation.errors.join("; "));
assert.equal(cp652DescriptorValidation.valid, true, cp652DescriptorValidation.errors.join("; "));
assert.equal(cp653DescriptorValidation.valid, true, cp653DescriptorValidation.errors.join("; "));
assert.equal(cp654DescriptorValidation.valid, true, cp654DescriptorValidation.errors.join("; "));
assert.equal(cp655DescriptorValidation.valid, true, cp655DescriptorValidation.errors.join("; "));
assert.equal(cp656DescriptorValidation.valid, true, cp656DescriptorValidation.errors.join("; "));
assert.equal(cp657DescriptorValidation.valid, true, cp657DescriptorValidation.errors.join("; "));
assert.equal(cp658DescriptorValidation.valid, true, cp658DescriptorValidation.errors.join("; "));
assert.equal(cp659DescriptorValidation.valid, true, cp659DescriptorValidation.errors.join("; "));
assert.equal(cp660DescriptorValidation.valid, true, cp660DescriptorValidation.errors.join("; "));
assert.equal(cp661DescriptorValidation.valid, true, cp661DescriptorValidation.errors.join("; "));
assert.equal(cp662DescriptorValidation.valid, true, cp662DescriptorValidation.errors.join("; "));
assert.equal(cp663DescriptorValidation.valid, true, cp663DescriptorValidation.errors.join("; "));
assert.equal(cp664DescriptorValidation.valid, true, cp664DescriptorValidation.errors.join("; "));
assert.equal(cp665DescriptorValidation.valid, true, cp665DescriptorValidation.errors.join("; "));
assert.equal(contractValidation.valid, true, contractValidation.errors.join("; "));

assert.deepEqual(contract.program, JSON.parse(JSON.stringify(ADMIN_CONSOLE_PROGRAM_CONTRACT)));
assert.deepEqual(contract.current_pack, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP665_PACK_BINDING)));
assert.deepEqual(contract.historical_pack_ids, [
  ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id,
  ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id,
]);
assert.deepEqual(contract.cp645_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP645_REQUIREMENTS)));
assert.deepEqual(contract.cp645_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP645_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp645_descriptor, JSON.parse(JSON.stringify(cp645Descriptor)));
assert.deepEqual(contract.cp645_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp645HermesEvidencePacket(cp645Descriptor))));
assert.deepEqual(contract.cp645_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp645ClaudeReviewPacket(cp645Descriptor))));
assert.deepEqual(contract.cp645_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp645CloseoutHandoff())));
assert.deepEqual(contract.cp646_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP646_REQUIREMENTS)));
assert.deepEqual(contract.cp646_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP646_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp646_descriptor, JSON.parse(JSON.stringify(cp646Descriptor)));
assert.deepEqual(contract.cp646_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp646HermesEvidencePacket(cp646Descriptor))));
assert.deepEqual(contract.cp646_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp646ClaudeReviewPacket(cp646Descriptor))));
assert.deepEqual(contract.cp646_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp646CloseoutHandoff())));
assert.deepEqual(contract.cp647_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP647_REQUIREMENTS)));
assert.deepEqual(contract.cp647_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP647_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp647_descriptor, JSON.parse(JSON.stringify(cp647Descriptor)));
assert.deepEqual(contract.cp647_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp647HermesEvidencePacket(cp647Descriptor))));
assert.deepEqual(contract.cp647_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp647ClaudeReviewPacket(cp647Descriptor))));
assert.deepEqual(contract.cp647_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp647CloseoutHandoff())));
assert.deepEqual(contract.cp648_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP648_REQUIREMENTS)));
assert.deepEqual(contract.cp648_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP648_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp648_descriptor, JSON.parse(JSON.stringify(cp648Descriptor)));
assert.deepEqual(contract.cp648_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp648HermesEvidencePacket(cp648Descriptor))));
assert.deepEqual(contract.cp648_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp648ClaudeReviewPacket(cp648Descriptor))));
assert.deepEqual(contract.cp648_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp648CloseoutHandoff())));
assert.deepEqual(contract.cp649_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP649_REQUIREMENTS)));
assert.deepEqual(contract.cp649_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP649_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp649_descriptor, JSON.parse(JSON.stringify(cp649Descriptor)));
assert.deepEqual(contract.cp649_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp649HermesEvidencePacket(cp649Descriptor))));
assert.deepEqual(contract.cp649_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp649ClaudeReviewPacket(cp649Descriptor))));
assert.deepEqual(contract.cp649_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp649CloseoutHandoff())));
assert.deepEqual(contract.cp650_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP650_REQUIREMENTS)));
assert.deepEqual(contract.cp650_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP650_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp650_descriptor, JSON.parse(JSON.stringify(cp650Descriptor)));
assert.deepEqual(contract.cp650_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp650HermesEvidencePacket(cp650Descriptor))));
assert.deepEqual(contract.cp650_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp650ClaudeReviewPacket(cp650Descriptor))));
assert.deepEqual(contract.cp650_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp650CloseoutHandoff())));
assert.deepEqual(contract.cp651_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP651_REQUIREMENTS)));
assert.deepEqual(contract.cp651_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP651_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp651_descriptor, JSON.parse(JSON.stringify(cp651Descriptor)));
assert.deepEqual(contract.cp651_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp651HermesEvidencePacket(cp651Descriptor))));
assert.deepEqual(contract.cp651_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp651ClaudeReviewPacket(cp651Descriptor))));
assert.deepEqual(contract.cp651_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp651CloseoutHandoff())));
assert.deepEqual(contract.cp652_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP652_REQUIREMENTS)));
assert.deepEqual(contract.cp652_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP652_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp652_descriptor, JSON.parse(JSON.stringify(cp652Descriptor)));
assert.deepEqual(contract.cp652_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp652HermesEvidencePacket(cp652Descriptor))));
assert.deepEqual(contract.cp652_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp652ClaudeReviewPacket(cp652Descriptor))));
assert.deepEqual(contract.cp652_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp652CloseoutHandoff())));
assert.deepEqual(contract.cp653_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP653_REQUIREMENTS)));
assert.deepEqual(contract.cp653_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP653_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp653_descriptor, JSON.parse(JSON.stringify(cp653Descriptor)));
assert.deepEqual(contract.cp653_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp653HermesEvidencePacket(cp653Descriptor))));
assert.deepEqual(contract.cp653_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp653ClaudeReviewPacket(cp653Descriptor))));
assert.deepEqual(contract.cp653_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp653CloseoutHandoff())));
assert.deepEqual(contract.cp654_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP654_REQUIREMENTS)));
assert.deepEqual(contract.cp654_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP654_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp654_descriptor, JSON.parse(JSON.stringify(cp654Descriptor)));
assert.deepEqual(contract.cp654_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp654HermesEvidencePacket(cp654Descriptor))));
assert.deepEqual(contract.cp654_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp654ClaudeReviewPacket(cp654Descriptor))));
assert.deepEqual(contract.cp654_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp654CloseoutHandoff())));
assert.deepEqual(contract.cp655_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP655_REQUIREMENTS)));
assert.deepEqual(contract.cp655_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP655_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp655_descriptor, JSON.parse(JSON.stringify(cp655Descriptor)));
assert.deepEqual(contract.cp655_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp655HermesEvidencePacket(cp655Descriptor))));
assert.deepEqual(contract.cp655_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp655ClaudeReviewPacket(cp655Descriptor))));
assert.deepEqual(contract.cp655_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp655CloseoutHandoff())));
assert.deepEqual(contract.cp656_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP656_REQUIREMENTS)));
assert.deepEqual(contract.cp656_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP656_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp656_descriptor, JSON.parse(JSON.stringify(cp656Descriptor)));
assert.deepEqual(contract.cp656_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp656HermesEvidencePacket(cp656Descriptor))));
assert.deepEqual(contract.cp656_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp656ClaudeReviewPacket(cp656Descriptor))));
assert.deepEqual(contract.cp656_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp656CloseoutHandoff())));
assert.deepEqual(contract.cp657_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP657_REQUIREMENTS)));
assert.deepEqual(contract.cp657_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP657_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp657_descriptor, JSON.parse(JSON.stringify(cp657Descriptor)));
assert.deepEqual(contract.cp657_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp657HermesEvidencePacket(cp657Descriptor))));
assert.deepEqual(contract.cp657_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp657ClaudeReviewPacket(cp657Descriptor))));
assert.deepEqual(contract.cp657_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp657CloseoutHandoff())));
assert.deepEqual(contract.cp658_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP658_REQUIREMENTS)));
assert.deepEqual(contract.cp658_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP658_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp658_descriptor, JSON.parse(JSON.stringify(cp658Descriptor)));
assert.deepEqual(contract.cp658_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp658HermesEvidencePacket(cp658Descriptor))));
assert.deepEqual(contract.cp658_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp658ClaudeReviewPacket(cp658Descriptor))));
assert.deepEqual(contract.cp658_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp658CloseoutHandoff())));
assert.deepEqual(contract.cp659_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP659_REQUIREMENTS)));
assert.deepEqual(contract.cp659_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP659_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp659_descriptor, JSON.parse(JSON.stringify(cp659Descriptor)));
assert.deepEqual(
  contract.cp659_hermes_evidence_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp659HermesEvidencePacket(cp659Descriptor))),
);
assert.deepEqual(
  contract.cp659_claude_review_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp659ClaudeReviewPacket(cp659Descriptor))),
);
assert.deepEqual(contract.cp659_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp659CloseoutHandoff())));
assert.deepEqual(contract.cp660_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP660_REQUIREMENTS)));
assert.deepEqual(contract.cp660_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP660_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp660_descriptor, JSON.parse(JSON.stringify(cp660Descriptor)));
assert.deepEqual(
  contract.cp660_hermes_evidence_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp660HermesEvidencePacket(cp660Descriptor))),
);
assert.deepEqual(
  contract.cp660_claude_review_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp660ClaudeReviewPacket(cp660Descriptor))),
);
assert.deepEqual(contract.cp660_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp660CloseoutHandoff())));
assert.deepEqual(contract.cp661_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP661_REQUIREMENTS)));
assert.deepEqual(contract.cp661_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP661_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp661_descriptor, JSON.parse(JSON.stringify(cp661Descriptor)));
assert.deepEqual(
  contract.cp661_hermes_evidence_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp661HermesEvidencePacket(cp661Descriptor))),
);
assert.deepEqual(
  contract.cp661_claude_review_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp661ClaudeReviewPacket(cp661Descriptor))),
);
assert.deepEqual(contract.cp661_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp661CloseoutHandoff())));
assert.deepEqual(contract.cp662_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP662_REQUIREMENTS)));
assert.deepEqual(contract.cp662_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP662_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp662_descriptor, JSON.parse(JSON.stringify(cp662Descriptor)));
assert.deepEqual(
  contract.cp662_hermes_evidence_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp662HermesEvidencePacket(cp662Descriptor))),
);
assert.deepEqual(
  contract.cp662_claude_review_packet,
  JSON.parse(JSON.stringify(createAdminConsoleCp662ClaudeReviewPacket(cp662Descriptor))),
);
assert.deepEqual(contract.cp662_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp662CloseoutHandoff())));
assert.deepEqual(contract.cp663_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP663_REQUIREMENTS)));
assert.deepEqual(contract.cp663_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP663_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp663_descriptor, JSON.parse(JSON.stringify(cp663Descriptor)));
assert.deepEqual(contract.cp663_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp663HermesEvidencePacket(cp663Descriptor))));
assert.deepEqual(contract.cp663_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp663ClaudeReviewPacket(cp663Descriptor))));
assert.deepEqual(contract.cp663_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp663CloseoutHandoff())));
assert.deepEqual(contract.cp664_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP664_REQUIREMENTS)));
assert.deepEqual(contract.cp664_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP664_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp664_descriptor, JSON.parse(JSON.stringify(cp664Descriptor)));
assert.deepEqual(contract.cp664_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp664HermesEvidencePacket(cp664Descriptor))));
assert.deepEqual(contract.cp664_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp664ClaudeReviewPacket(cp664Descriptor))));
assert.deepEqual(contract.cp664_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp664CloseoutHandoff())));
assert.deepEqual(contract.cp665_requirements, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP665_REQUIREMENTS)));
assert.deepEqual(contract.cp665_no_write_attestation, JSON.parse(JSON.stringify(ADMIN_CONSOLE_CP665_NO_WRITE_ATTESTATION)));
assert.deepEqual(contract.cp665_descriptor, JSON.parse(JSON.stringify(cp665Descriptor)));
assert.deepEqual(contract.cp665_hermes_evidence_packet, JSON.parse(JSON.stringify(createAdminConsoleCp665HermesEvidencePacket(cp665Descriptor))));
assert.deepEqual(contract.cp665_claude_review_packet, JSON.parse(JSON.stringify(createAdminConsoleCp665ClaudeReviewPacket(cp665Descriptor))));
assert.deepEqual(contract.cp665_closeout_handoff, JSON.parse(JSON.stringify(createAdminConsoleCp665CloseoutHandoff())));
assert.equal(contract.runtime_opened, false);
assert.equal(contract.cp645_closeout_handoff.to_pack_id, "CP00-646");
assert.equal(contract.cp645_closeout_handoff.next_subphase_id, "RP21.P01.M08.S06");
assert.equal(contract.cp646_closeout_handoff.to_pack_id, "CP00-647");
assert.equal(contract.cp646_closeout_handoff.next_subphase_id, "RP21.P02.M07.S07");
assert.equal(contract.cp647_closeout_handoff.to_pack_id, "CP00-648");
assert.equal(contract.cp647_closeout_handoff.next_subphase_id, "RP21.P02.M09.S03");
assert.equal(contract.cp648_closeout_handoff.to_pack_id, "CP00-649");
assert.equal(contract.cp648_closeout_handoff.next_subphase_id, "RP21.P02.M09.S13");
assert.equal(contract.cp649_closeout_handoff.to_pack_id, "CP00-650");
assert.equal(contract.cp649_closeout_handoff.next_subphase_id, "RP21.P04.M02.S08");
assert.equal(contract.cp650_closeout_handoff.to_pack_id, "CP00-651");
assert.equal(contract.cp650_closeout_handoff.next_subphase_id, "RP21.P04.M04.S18");
assert.equal(contract.cp651_closeout_handoff.to_pack_id, "CP00-652");
assert.equal(contract.cp651_closeout_handoff.next_subphase_id, "RP21.P04.M06.S16");
assert.equal(contract.cp652_closeout_handoff.to_pack_id, "CP00-653");
assert.equal(contract.cp652_closeout_handoff.next_subphase_id, "RP21.P05.M05.S14");
assert.equal(contract.cp653_closeout_handoff.to_pack_id, "CP00-654");
assert.equal(contract.cp653_closeout_handoff.next_subphase_id, "RP21.P05.M06.S02");
assert.equal(contract.cp654_closeout_handoff.to_pack_id, "CP00-655");
assert.equal(contract.cp654_closeout_handoff.next_subphase_id, "RP21.P06.M03.S20");
assert.equal(contract.cp655_closeout_handoff.to_pack_id, "CP00-656");
assert.equal(contract.cp655_closeout_handoff.next_subphase_id, "RP21.P06.M05.S16");
assert.equal(contract.cp656_closeout_handoff.to_pack_id, "CP00-657");
assert.equal(contract.cp656_closeout_handoff.next_subphase_id, "RP21.P06.M06.S04");
assert.equal(contract.cp657_closeout_handoff.to_pack_id, "CP00-658");
assert.equal(contract.cp657_closeout_handoff.next_subphase_id, "RP21.P07.M03.S15");
assert.equal(contract.cp658_closeout_handoff.to_pack_id, "CP00-659");
assert.equal(contract.cp658_closeout_handoff.next_subphase_id, "RP21.P07.M04.S03");
assert.equal(contract.cp659_closeout_handoff.to_pack_id, "CP00-660");
assert.equal(contract.cp659_closeout_handoff.next_subphase_id, "RP21.P07.M05.S21");
assert.equal(contract.cp660_closeout_handoff.to_pack_id, "CP00-661");
assert.equal(contract.cp660_closeout_handoff.next_subphase_id, "RP21.P07.M06.S09");
assert.equal(contract.cp661_closeout_handoff.to_pack_id, "CP00-662");
assert.equal(contract.cp661_closeout_handoff.next_subphase_id, "RP21.P08.M04.S20");
assert.equal(contract.cp662_closeout_handoff.to_pack_id, "CP00-663");
assert.equal(contract.cp662_closeout_handoff.next_subphase_id, "RP21.P08.M06.S18");
assert.equal(contract.cp663_closeout_handoff.to_pack_id, "CP00-664");
assert.equal(contract.cp663_closeout_handoff.next_subphase_id, "RP21.P09.M07.S03");
assert.equal(contract.cp664_closeout_handoff.to_pack_id, "CP00-665");
assert.equal(contract.cp664_closeout_handoff.next_subphase_id, "RP21.P09.M07.S13");
assert.equal(contract.cp665_closeout_handoff.to_pack_id, "CP00-666");
assert.equal(contract.cp665_closeout_handoff.next_subphase_id, "RP22.P00.M00.S01");

console.log(JSON.stringify({
  validator: "rp21:admin-console:validate",
  pack_id: ADMIN_CONSOLE_CP665_PACK_BINDING.pack_id,
  covered_units: cp665Coverage.summary.unit_count,
  section_count: Object.keys(ADMIN_CONSOLE_CP665_REQUIREMENTS.required_section_rows).length,
  next_pack_id: ADMIN_CONSOLE_CP665_PACK_BINDING.next_pack_id,
  historical_pack_ids_validated: [
    ADMIN_CONSOLE_CP645_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP646_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP647_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP648_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP649_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP650_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP651_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP652_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP653_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP654_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP655_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP656_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP657_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP658_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP659_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP660_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP661_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP662_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP663_PACK_BINDING.pack_id,
    ADMIN_CONSOLE_CP664_PACK_BINDING.pack_id,
  ],
  production_ready_candidate: true,
  runtime_opened: contract.runtime_opened,
}, null, 2));
