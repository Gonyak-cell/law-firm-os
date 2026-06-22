#!/usr/bin/env node
import assert from "node:assert/strict";
import { NOTIFICATION_TEMPLATES } from "../apps/desktop/src/main/notifications.js";

const sensitivePatterns = [
  ["client_names", /\bclient\s*names?\b|clientName|client_name|\{\{\s*client/i],
  ["matter_names", /\bmatter\s*names?\b|matterName|matter_name|\{\{\s*matter/i],
  ["document_names", /\bdocument\s*names?\b|documentName|document_name|\{\{\s*document/i],
  ["snippets", /\bsnippets?\b|snippet|excerpt|quote/i],
  ["sensitive_deadlines", /\bdeadline\b|\bdue\s+(today|tomorrow|date)\b/i],
  ["billing_amounts", /\bbilling\b|\bamount\b|invoice|retainer|\$\{?\s*amount/i]
];

function templateFindings(templates) {
  const findings = [];
  for (const [templateId, template] of Object.entries(templates)) {
    for (const [field, value] of Object.entries(template)) {
      if (typeof value !== "string") continue;
      for (const [code, pattern] of sensitivePatterns) {
        if (pattern.test(value)) findings.push(`${templateId}.${field}:${code}`);
      }
    }
  }
  return findings;
}

const findings = templateFindings(NOTIFICATION_TEMPLATES);
const probes = {
  client_names: templateFindings({ probe: { title: "Matter for {{clientName}}", body: "Open matter" } }),
  matter_names: templateFindings({ probe: { title: "Matter {{matterName}} updated", body: "Open matter" } }),
  document_names: templateFindings({ probe: { title: "Document {{documentName}}", body: "Open matter" } }),
  snippets: templateFindings({ probe: { title: "matter update", body: "Snippet: privileged text" } }),
  sensitive_deadlines: templateFindings({ probe: { title: "Deadline tomorrow", body: "Open matter" } }),
  billing_amounts: templateFindings({ probe: { title: "Billing amount due", body: "$100 due" } })
};

for (const [probeName, probeFindings] of Object.entries(probes)) {
  assert(probeFindings.some((finding) => finding.includes(probeName)), `${probeName} probe was not detected`);
}

assert.deepEqual(findings, [], "notification templates include sensitive copy placeholders");

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      templates_checked: Object.keys(NOTIFICATION_TEMPLATES).length,
      findings,
      probes: Object.fromEntries(Object.keys(probes).map((probeName) => [probeName, "detected"]))
    },
    null,
    2
  )
);
