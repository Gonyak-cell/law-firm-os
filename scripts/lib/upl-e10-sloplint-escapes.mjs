const DOCUMENTED_ESCAPES = [
  {
    file: "apps/web/src/components/MattersSurface.jsx",
    rule_id: "mesh-aurora-background-default",
    severity: "weak",
    excerpt: "Blob",
    source_line: 'const url = URL.createObjectURL(new Blob([next.csv], { type: "text/csv;charset=utf-8" }));',
    context_fragments: [
      "async function handleDownloadMatterReport()",
      "fetchMatterOpsReportCsv({ ctx: liveCtx })",
    ],
    reason: "Blob is the browser CSV download constructor, not a visual background treatment.",
  },
  {
    file: "apps/web/src/components/MattersSurface.jsx",
    rule_id: "ai-buzzword-stack",
    severity: "strong",
    excerpt: "unlock",
    source_line: 'onUnlockTimeWeek={(payload) => handleMatterTimeWeek("unlock", payload)}',
    context_fragments: [
      'onSubmitTimeWeek={(payload) => handleMatterTimeWeek("submit", payload)}',
      'onLockTimeWeek={(payload) => handleMatterTimeWeek("lock", payload)}',
    ],
    reason: "unlock is the time-week lock-state action, not user-facing AI marketing copy.",
  },
  {
    file: "apps/web/src/components/matter-small-firm/MatterOperationsSurface.jsx",
    rule_id: "ai-buzzword-stack",
    severity: "strong",
    excerpt: "unlock",
    source_line: '<form className="matter-ops-reason-form" noValidate onSubmit={submitUnlock} data-time-week-unlock-form="true">',
    context_fragments: [
      "onUnlockTimeWeek?.(timeWeekPayload(unlockRow, {",
      "<strong>주간 잠금 해제</strong>",
    ],
    reason: "unlock names the time-week lock-release form state, not user-facing AI marketing copy.",
  },
  {
    file: "apps/web/src/components/matter-small-firm/MatterOperationsSurface.jsx",
    rule_id: "ai-buzzword-stack",
    severity: "strong",
    excerpt: "unlock",
    source_line: '<button type="submit" className="primary-button" disabled={timeWeekPendingAction === "unlock"}>해제</button>',
    context_fragments: [
      'data-time-week-unlock-form="true"',
      "<strong>주간 잠금 해제</strong>",
    ],
    reason: "unlock names the time-week lock-release pending state, not user-facing AI marketing copy.",
  },
  {
    file: "apps/web/src/data/apiClient.js",
    rule_id: "ai-buzzword-stack",
    severity: "strong",
    excerpt: "unlock",
    source_line: 'if (!actorId || !weekStart || (action === "unlock" && !String(reason ?? "").trim())) {',
    context_fragments: [
      "function matterOpsWeekMutation(action, {",
      'matterOpsMutationPath(`/api/matter/ops/time-weeks/${action}`)',
    ],
    reason: "unlock is the time-week lock-state action, not user-facing AI marketing copy.",
  },
  {
    file: "apps/web/src/data/apiClient.js",
    rule_id: "ai-buzzword-stack",
    severity: "strong",
    excerpt: "unlock",
    source_line: 'message: action === "unlock" ? "잠금 해제 사유를 입력해 주세요." : "주간 시간 대상을 확인해 주세요."',
    context_fragments: [
      "function matterOpsWeekMutation(action, {",
      'matterOpsMutationPath(`/api/matter/ops/time-weeks/${action}`)',
    ],
    reason: "unlock is the time-week lock-state action, not user-facing AI marketing copy.",
  },
  {
    file: "apps/web/src/data/apiClient.js",
    rule_id: "ai-buzzword-stack",
    severity: "strong",
    excerpt: "unlock",
    source_line: 'return matterOpsWeekMutation("unlock", options);',
    context_fragments: ["export function unlockMatterOpsTimeWeek(options = {}) {"],
    reason: "unlock is the time-week lock-state action, not user-facing AI marketing copy.",
  },
];

export function classifyDocumentedSloplintEscape(finding, {
  sourceLine = "",
  sourceContext = "",
} = {}) {
  const exactContext = DOCUMENTED_ESCAPES.find((candidate) => (
    candidate.file === finding.file
    && candidate.rule_id === finding.rule_id
    && candidate.severity === finding.severity
    && candidate.excerpt === finding.excerpt
    && candidate.source_line === sourceLine.trim()
    && candidate.context_fragments.every((fragment) => sourceContext.includes(fragment))
  ));
  if (!exactContext) return null;
  return {
    file: finding.file,
    line: finding.line,
    rule_id: finding.rule_id,
    severity: finding.severity,
    excerpt: finding.excerpt,
    reason: exactContext.reason,
  };
}

export function summarizeSloplintFindings(rawFindings, {
  allowedFiles = [],
  readSource = () => ({}),
} = {}) {
  const allowed = new Set(allowedFiles);
  const allFindings = (Array.isArray(rawFindings) ? rawFindings : [])
    .filter((finding) => allowed.has(finding.file));
  const documentedEscapes = [];
  const findings = [];
  for (const finding of allFindings) {
    const documentedEscape = classifyDocumentedSloplintEscape(finding, readSource(finding));
    if (documentedEscape) documentedEscapes.push(documentedEscape);
    else findings.push(finding);
  }
  return {
    raw_finding_count: allFindings.length,
    finding_count: findings.length,
    strong_count: findings.filter((finding) => finding.severity === "strong").length,
    weak_count: findings.filter((finding) => finding.severity === "weak").length,
    no_verify_count: findings.filter((finding) => finding.severity === "no-verify").length,
    files: [...new Set(findings.map((finding) => finding.file))].sort(),
    findings,
    documented_escapes: documentedEscapes,
    remaining_findings_documented_as: findings.length === 0
      ? "none; exact code-context false positives are recorded under documented_escapes"
      : "unescaped findings remain and are evaluated by severity",
  };
}
