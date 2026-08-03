#!/usr/bin/env node
import {
  buildMatterRollbackPacket,
  describeMatterRollbackAdapter,
  emitMatterRollbackFailure,
  parseMatterRollbackOptions,
  readMatterRollbackTargetManifestLive,
  resolvePrivateOutputPath,
  validateMatterRollbackProductionAuthority,
  writePrivateJson,
} from "./lib/matter-rollback-contract.mjs";

function required(options, name) {
  if (!options[name]) throw Object.assign(new Error("required rollback argument missing"), { code: "MATTER_ROLLBACK_ARGUMENT" });
  return options[name];
}

try {
  const options = parseMatterRollbackOptions(process.argv.slice(2), {
    allowed: [
      "--environment", "--current-manifest", "--target-manifest", "--api-adapter-module",
      "--desktop-adapter-module", "--output", "--production-authority-receipt",
      "--production-authority-signature", "--packet-id", "--execution-nonce", "--generated-at", "--expires-at",
    ],
    defaults: { environment: "staging" },
  });
  const output = resolvePrivateOutputPath(required(options, "output"));
  const currentRef = readMatterRollbackTargetManifestLive(required(options, "current-manifest"));
  const targetRef = readMatterRollbackTargetManifestLive(required(options, "target-manifest"));
  const apiAdapter = describeMatterRollbackAdapter(required(options, "api-adapter-module"), "api");
  const desktopAdapter = describeMatterRollbackAdapter(required(options, "desktop-adapter-module"), "desktop");
  let productionAuthority = null;
  if (options.environment === "production") {
    const receiptPath = required(options, "production-authority-receipt");
    productionAuthority = validateMatterRollbackProductionAuthority({
      currentRef,
      targetRef,
      receiptPath,
      signaturePath: options["production-authority-signature"] ?? `${receiptPath}.sig`,
    });
  } else if (options["production-authority-receipt"] || options["production-authority-signature"]) {
    throw Object.assign(new Error("production authority is invalid for staging"), { code: "MATTER_ROLLBACK_PRODUCTION_AUTHORITY_UNEXPECTED" });
  }
  const packet = buildMatterRollbackPacket({
    environment: options.environment,
    currentRef,
    targetRef,
    apiAdapter,
    desktopAdapter,
    productionAuthority,
    ...(options["packet-id"] ? { packetId: options["packet-id"] } : {}),
    ...(options["execution-nonce"] ? { executionNonce: options["execution-nonce"] } : {}),
    ...(options["generated-at"] ? { generatedAt: options["generated-at"] } : {}),
    ...(options["expires-at"] ? { expiresAt: options["expires-at"] } : {}),
  });
  writePrivateJson(output, packet);
  process.stdout.write(`${JSON.stringify({
    verdict: "APPROVAL_REQUIRED",
    packet_id: packet.packet_id,
    execution_nonce: packet.execution_nonce,
    environment: packet.environment,
    packet_path: output,
    packet_sha256: packet.packet_sha256,
    api_adapter_sha256: packet.execution_boundary.adapters.api.sha256,
    desktop_adapter_sha256: packet.execution_boundary.adapters.desktop.sha256,
    expires_at: packet.expires_at,
    external_mutation_count: 0,
    production_rollback_claim: false,
  }, null, 2)}\n`);
} catch (error) {
  emitMatterRollbackFailure(error);
  process.exitCode = 1;
}
