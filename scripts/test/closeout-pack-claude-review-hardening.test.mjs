import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { normalizeRawClaudeReviewReceipt, validateReviewReceiptObject } from "../lib/closeout-pack-claude-review-hardening.mjs";

function makeDir() {
  return mkdtempSync(path.join(tmpdir(), "law-firm-os-review-hardening-"));
}

function writeJson(file, data) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function request(dir, rawName = "raw-output.json", receiptName = "review-receipt.json") {
  const requestPath = path.join(dir, "review-request.json");
  writeJson(requestPath, {
    schema_version: "law-firm-os.closeout-pack-claude-review-hardening.v0.1.request.v0.1",
    pack_id: "CP00-178",
    model: "claude-opus-4-8",
    effort: "max",
    permission_mode: "dontAsk",
    read_only: true,
    tools: ["Read", "Grep", "Glob"],
    raw_output_ref: path.join(dir, rawName),
    receipt_ref: path.join(dir, receiptName),
  });
  return requestPath;
}

function validStructuredReview() {
  return {
    overall_verdict: "PASS_WITH_FINDINGS",
    blocks_pack_closeout: false,
    blocks_goal_closeout: false,
    no_unresolved_p0: true,
    no_unresolved_p1: true,
    summary: "Fixture review passes with no unresolved P0/P1/P2.",
    findings: [
      {
        id: "fixture-p3",
        severity: "P3",
        title: "Advisory",
        file: "scripts/test/closeout-pack-claude-review-hardening.test.mjs",
        line: null,
        details: "Non-blocking fixture note.",
        recommendation: "No action required.",
        post_review_disposition: "advisory_non_blocking",
      },
    ],
    finding_counts: {
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 1,
      reported_p0: 0,
      reported_p1: 0,
      reported_p2: 0,
      reported_p3: 1,
    },
  };
}

test("normalizer promotes structured Claude output to a valid receipt", () => {
  const dir = makeDir();
  const requestPath = request(dir);
  const rawPath = path.join(dir, "raw-output.json");
  const stdout = JSON.stringify({
    type: "result",
    session_id: "fixture-session",
    uuid: "fixture-uuid",
    total_cost_usd: 0.01,
    permission_denials: [],
    structured_output: validStructuredReview(),
  });
  const raw = {
    schema_version: "law-firm-os.closeout-pack-claude-review-raw-output.v0.1",
    pack_id: "CP00-178",
    status: 0,
    signal: null,
    stdout,
    stderr: "",
  };
  writeJson(rawPath, raw);

  const receipt = normalizeRawClaudeReviewReceipt({
    packId: "CP00-178",
    request: JSON.parse(readFileSync(requestPath, "utf8")),
    raw,
    rawPath,
    requestPath,
    root: dir,
  });
  assert.equal(receipt.valid_review, true);
  assert.equal(receipt.closeout_eligible, true);
  assert.equal(receipt.review_execution.tools, "Read,Grep,Glob");
  assert.deepEqual(validateReviewReceiptObject("CP00-178", receipt), []);
});

test("normalizer rejects zero-byte stdout as invalid evidence", () => {
  const dir = makeDir();
  const requestPath = request(dir);
  const raw = {
    schema_version: "law-firm-os.closeout-pack-claude-review-raw-output.v0.1",
    pack_id: "CP00-178",
    status: 0,
    signal: null,
    stdout: "",
    stderr: "",
  };
  writeJson(path.join(dir, "raw-output.json"), raw);
  const receipt = normalizeRawClaudeReviewReceipt({
    packId: "CP00-178",
    request: JSON.parse(readFileSync(requestPath, "utf8")),
    raw,
    rawPath: path.join(dir, "raw-output.json"),
    requestPath,
    root: dir,
  });
  assert.equal(receipt.valid_review, false);
  assert.match(receipt.invalid_reason, /stdout_0_bytes/);
});

test("normalizer rejects fenced JSON plus prose and tool-call-shaped output", () => {
  const fencedDir = makeDir();
  const fencedRequestPath = request(fencedDir);
  const fencedRaw = {
    schema_version: "law-firm-os.closeout-pack-claude-review-raw-output.v0.1",
    pack_id: "CP00-178",
    status: 0,
    signal: null,
    stdout: "```json\n{\"overall_verdict\":\"PASS\"}\n```\nLooks good.",
    stderr: "",
  };
  writeJson(path.join(fencedDir, "raw-output.json"), fencedRaw);
  const fencedReceipt = normalizeRawClaudeReviewReceipt({
    packId: "CP00-178",
    request: JSON.parse(readFileSync(fencedRequestPath, "utf8")),
    raw: fencedRaw,
    rawPath: path.join(fencedDir, "raw-output.json"),
    requestPath: fencedRequestPath,
    root: fencedDir,
  });
  assert.match(fencedReceipt.invalid_reason, /fenced_json/);

  const toolDir = makeDir();
  const toolRequestPath = request(toolDir);
  const toolRaw = {
    schema_version: "law-firm-os.closeout-pack-claude-review-raw-output.v0.1",
    pack_id: "CP00-178",
    status: 0,
    signal: null,
    stdout: "<function_calls><invoke name=\"Read\" /></function_calls>",
    stderr: "",
  };
  writeJson(path.join(toolDir, "raw-output.json"), toolRaw);
  const toolReceipt = normalizeRawClaudeReviewReceipt({
    packId: "CP00-178",
    request: JSON.parse(readFileSync(toolRequestPath, "utf8")),
    raw: toolRaw,
    rawPath: path.join(toolDir, "raw-output.json"),
    requestPath: toolRequestPath,
    root: toolDir,
  });
  assert.match(toolReceipt.invalid_reason, /tool_call_shaped_output/);
});
