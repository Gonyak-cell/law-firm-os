#!/usr/bin/env node
import path from "node:path";
import {
  countValidReceipts,
  normalizePackId,
  parseArgs,
  readJson,
  reviewArtifactRoot,
  validateReviewReceiptObject,
} from "./lib/closeout-pack-claude-review-hardening.mjs";

const args = parseArgs(process.argv.slice(2));
const packId = normalizePackId(args._[0]);
const root = args.dir ?? reviewArtifactRoot(packId);
const receiptPath = args.receipt ?? path.join(root, "review-receipt.json");
const receipt = await readJson(receiptPath);
const errors = validateReviewReceiptObject(packId, receipt);

const validReceiptCount = await countValidReceipts(packId, receiptPath);
if (validReceiptCount !== 1) errors.push(`exactly one valid receipt is required, found ${validReceiptCount}`);

if (errors.length > 0) {
  console.error("Closeout pack Claude review receipt validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Closeout pack Claude review receipt validation passed for ${packId}.`);
