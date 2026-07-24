#!/usr/bin/env node
import {
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { basename, resolve } from "node:path";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramBytes,
} from "./lib/json-postgres-program-files.mjs";
import {
  canonicalizeJsonPostgresProgramReceipt,
  validateJsonPostgresProgramReceipt,
  verifyJsonPostgresProgramReceipt,
} from "./lib/json-postgres-program-receipt.mjs";

function parse(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) throw new TypeError(`invalid option: ${flag ?? ""}`);
    const key = flag.slice(2);
    if (result[key] != null) throw new TypeError(`duplicate option: ${flag}`);
    result[key] = value;
  }
  return result;
}

function required(value, label) {
  if (!value) throw new TypeError(`--${label} is required`);
  return value;
}

const options = parse(process.argv.slice(2));
const receiptPath = required(options.receipt, "receipt");
const registryPath = required(options.registry, "registry");
const privateKeyPath = required(options["private-key"], "private-key");
const receiptBytes = readPrivateProgramBytes(receiptPath, "unsigned program receipt");
const receipt = JSON.parse(receiptBytes.toString("utf8"));
const registryBytes = readPrivateProgramBytes(registryPath, "owner trust registry");
if (sha256ProgramBytes(registryBytes) !== required(options["registry-sha256"], "registry-sha256")) {
  throw new Error("owner trust registry digest mismatch");
}
const registry = JSON.parse(registryBytes.toString("utf8"));
validateJsonPostgresProgramReceipt(receipt);
const privateKey = createPrivateKey(readPrivateProgramBytes(privateKeyPath, "owner private key"));
const publicKeyPem = createPublicKey(privateKey).export({ type: "spki", format: "pem" });
const registeredKey = registry.keys?.find((candidate) => candidate.key_id === receipt.signer_key_id);
if (!registeredKey || registeredKey.public_key_spki_pem !== publicKeyPem) {
  throw new Error("owner private key does not match the registered signer");
}
const canonicalBytes = Buffer.from(canonicalizeJsonPostgresProgramReceipt(receipt));
const signature = sign(null, canonicalBytes, privateKey);
verifyJsonPostgresProgramReceipt({
  receipt,
  signature,
  trustRegistry: registry,
});

const outputDir = createPrivateProgramOutputDirectory(required(options["output-dir"], "output-dir"));
const sealedName = basename(resolve(receiptPath));
const sealedReceipt = writePrivateProgramBytes(resolve(outputDir, sealedName), receiptBytes);
const sealedSignature = writePrivateProgramBytes(resolve(outputDir, `${sealedName}.sig`), signature);
const checksum = writePrivateProgramBytes(
  resolve(outputDir, `${sealedName}.sha256`),
  `${sealedReceipt.sha256}  ${sealedName}\n`,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  receipt_id: receipt.receipt_id,
  receipt_kind: receipt.receipt_kind,
  receipt_path: sealedReceipt.path,
  receipt_sha256: sealedReceipt.sha256,
  signature_path: sealedSignature.path,
  signature_sha256: sealedSignature.sha256,
  checksum_path: checksum.path,
  signature_valid: true,
  sensitive_material_returned: false,
}, null, 2)}\n`);
