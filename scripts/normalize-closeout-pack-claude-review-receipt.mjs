#!/usr/bin/env node
import path from "node:path";
import {
  normalizeRawClaudeReviewReceipt,
  normalizePackId,
  parseArgs,
  readJson,
  reviewArtifactRoot,
  writeJson,
} from "./lib/closeout-pack-claude-review-hardening.mjs";

const args = parseArgs(process.argv.slice(2));
const packId = normalizePackId(args._[0]);
const root = args.dir ?? reviewArtifactRoot(packId);
const requestPath = args.request ?? path.join(root, "review-request.json");
const request = await readJson(requestPath);
const rawPath = args.raw ?? request.raw_output_ref ?? path.join(root, "raw-output.json");
const outPath = args.out ?? request.receipt_ref ?? path.join(root, "review-receipt.json");
const raw = await readJson(rawPath);

const receipt = normalizeRawClaudeReviewReceipt({ packId, request, raw, rawPath, requestPath, root });

await writeJson(outPath, receipt);
if (receipt.valid_review) {
  console.log(`Normalized valid Claude review receipt for ${packId}.`);
} else {
  console.error(`Normalized invalid Claude review receipt for ${packId}: ${receipt.invalid_reason}`);
  process.exitCode = 1;
}
console.log(`receipt: ${outPath}`);
