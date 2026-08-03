#!/usr/bin/env node
import {
  emitMatterRollbackFailure,
  parseMatterRollbackOptions,
  readMatterRollbackPacketLive,
} from "./lib/matter-rollback-contract.mjs";
import {
  commitMatterRollbackFinalization,
  readPrivateJson,
  resolveMatterRollbackSidecarOutputPath,
  validateMatterRollbackFinalReceiptEnvelope,
  validateMatterRollbackReceipt,
} from "./lib/matter-rollback-execution-evidence.mjs";

function required(options, name) {
  if (!options[name]) throw Object.assign(new Error("required rollback argument missing"), { code: "MATTER_ROLLBACK_ARGUMENT" });
  return options[name];
}

try {
  const options = parseMatterRollbackOptions(process.argv.slice(2), {
    allowed: ["--receipt", "--seal-receipt", "--seal-signature", "--replay-registry", "--rf13-dist-sidecar"],
  });
  const receipt = readPrivateJson(required(options, "receipt"), "rollback receipt").value;
  validateMatterRollbackFinalReceiptEnvelope(receipt);
  const sidecarPath = options["rf13-dist-sidecar"]
    ? resolveMatterRollbackSidecarOutputPath(options["rf13-dist-sidecar"])
    : null;
  const livePacket = readMatterRollbackPacketLive(receipt.packet.path);
  const prepared = validateMatterRollbackReceipt(receipt, {
    sealReceiptPath: required(options, "seal-receipt"),
    sealSignaturePath: required(options, "seal-signature"),
    macosLiveValidations: livePacket.macosLiveValidations,
  });
  const result = commitMatterRollbackFinalization(receipt, prepared, {
    replayRegistryPath: required(options, "replay-registry"),
    sidecarPath,
  });
  process.stdout.write(`${JSON.stringify({
    ...result,
    production_go_live_claim: false,
    production_rollback_claim: false,
  }, null, 2)}\n`);
} catch (error) {
  emitMatterRollbackFailure(error);
  process.exitCode = 1;
}
