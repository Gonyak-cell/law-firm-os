#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { programs } from "./rp-detailed-plan-catalog.mjs";
import { narrativeRows as catalogNarrativeRows } from "./spec-requirement-catalog.mjs";

const SPEC_PATH = path.resolve("/Users/jws/.codex/attachments/696e9f72-c1ec-4c7f-a8b8-4367755c57c3/pasted-text.txt");
const OUTPUT_DIR = path.resolve("docs");
const JSON_PATH = path.join(OUTPUT_DIR, "spec-coverage-audit.json");
const MD_PATH = path.join(OUTPUT_DIR, "spec-coverage-audit.md");
const REQUIREMENT_LEDGER_PATH = path.resolve("docs/spec-requirement-ledger.json");

const featurePrefixToPrograms = {
  TEN: ["RP00", "RP01", "RP21", "RP26"],
  USR: ["RP01", "RP02", "RP21", "RP26"],
  AUD: ["RP03", "RP16", "RP17", "RP29"],
  ENT: ["RP04", "RP10", "RP23"],
  CLI: ["RP04", "RP09", "RP12", "RP15"],
  CON: ["RP04", "RP09", "RP16"],
  LEAD: ["RP09"],
  OPP: ["RP09", "RP10", "RP05", "RP15"],
  PROP: ["RP09", "RP06", "RP10"],
  REF: ["RP09", "RP14", "RP16"],
  CAM: ["RP09", "RP15", "RP16"],
  REL: ["RP09", "RP15", "RP18"],
  CONF: ["RP10", "RP02", "RP04", "RP16"],
  ENG: ["RP10", "RP12", "RP06"],
  MAT: ["RP05", "RP02", "RP06", "RP15"],
  DOC: ["RP06", "RP07", "RP08", "RP17", "RP24", "RP25"],
  EML: ["RP08", "RP06", "RP07", "RP18"],
  SRCH: ["RP07", "RP02", "RP17", "RP18"],
  TIME: ["RP11", "RP12", "RP15", "RP18"],
  EXP: ["RP11", "RP12", "RP13"],
  BILL: ["RP12", "RP11", "RP13", "RP15"],
  PAY: ["RP13", "RP12", "RP15"],
  ACC: ["RP13", "RP23", "RP29"],
  SET: ["RP14", "RP15", "RP16"],
  AI: ["RP17", "RP18", "RP07", "RP06"],
};

const narrativeRequirements = [
  ["roles", "시스템 역할 17종", ["System Super Admin", "Tenant Owner", "Managing Partner", "Practice Group Leader", "Relationship Partner", "Origination Partner", "Responsible Partner", "Matter Manager", "Attorney", "Paralegal", "BD Manager", "Finance Manager", "Accounting Reviewer", "Security Admin", "External Counsel", "Client User", "Auditor"], ["RP01", "RP02", "RP21", "RP26"]],
  ["permission_layers", "권한 5계층 및 우선순위", ["RBAC", "ABAC", "Object ACL", "Deny Rule", "Security Trimming", "Legal Hold", "Ethical Wall"], ["RP02", "RP16"]],
  ["data_model", "핵심 데이터 모델 전체", ["Tenant", "Entity", "Client", "Matter", "Document", "Invoice", "Payment", "Settlement", "AIJob"], ["RP01", "RP04", "RP05", "RP06", "RP12", "RP13", "RP14", "RP17"]],
  ["analytics", "Analytics 대시보드와 수익성", ["Managing Partner Dashboard", "Partner Dashboard", "Matter P&L", "Client Profitability", "Forecast", "WIP"], ["RP15"]],
  ["workflows", "주요 업무 workflow", ["Opportunity", "Matter 전환", "문서 Lifecycle", "Billing Workflow", "Settlement Workflow", "Matter Closing"], ["RP05", "RP06", "RP09", "RP12", "RP14"]],
  ["screens", "화면 설계", ["Managing Partner Home", "Partner Home", "Attorney Home", "Finance Manager Home", "Matter 상세 화면"], ["RP15", "RP05", "RP11", "RP12"]],
  ["security", "보안 컴플라이언스", ["Authentication", "Authorization", "Encryption", "Key Management", "DLP", "Break-glass", "Backup", "Incident Response", "WORM Storage"], ["RP16", "RP26", "RP29"]],
  ["privacy", "개인정보 관리", ["수집 최소화", "목적 제한", "수신동의", "수신거부", "마스킹", "보존기간", "subprocessors"], ["RP04", "RP09", "RP16", "RP17"]],
  ["audit_events", "감사로그 이벤트", ["Login", "View", "Download", "Upload", "Edit", "Delete", "Share", "Permission Change", "Search", "AI Access", "Billing Change", "Payment Match", "Settlement Run", "Admin Access", "Export", "Break-glass"], ["RP03", "RP16", "RP17", "RP29"]],
  ["performance", "성능 목표", ["로그인", "Matter 목록", "문서목록", "일반검색", "복합검색", "OCR 처리", "AI 요약", "Proforma 생성", "월정산 preview", "대량 업로드"], ["RP06", "RP07", "RP12", "RP14", "RP18", "RP29"]],
  ["availability", "가용성/RPO/RTO/DR", ["99.0", "99.5", "99.9", "99.95", "RPO", "RTO", "백업", "재해복구", "status page"], ["RP26", "RP29"]],
  ["scalability", "확장성 목표", ["5,000", "1,000,000", "100,000,000", "500,000,000", "dedicated index", "Vector index", "rate limit", "cold storage"], ["RP26", "RP27", "RP29"]],
  ["architecture", "권장 기술 아키텍처", ["Next.js", "React", "PostgreSQL", "S3", "OpenSearch", "Redis", "Queue", "OCR", "OIDC", "Office.js", "OpenTelemetry", "Kubernetes", "Terraform"], ["RP26", "RP27", "RP29"]],
  ["integrations", "외부 연동", ["Microsoft 365", "Outlook", "Gmail", "Google Workspace", "Word", "Excel", "PowerPoint", "더존", "WEHAGO", "홈택스", "은행", "법인카드", "Slack", "Teams", "전자서명", "DART", "법원"], ["RP08", "RP22", "RP23", "RP24", "RP25"]],
  ["differentiation_korea", "한국형 로펌 특화", ["HWP", "HWPX", "국문 계약서", "한국 법령", "판례", "등기", "정관", "의사록", "LDD", "RFI", "CP", "전자세금계산서"], ["RP20", "RP23", "RP24"]],
  ["differentiation_management", "로펌 경영 특화", ["Matter P&L", "Partner Settlement", "WIP", "Fixed Fee", "Client Profitability", "Origination Tracking", "AR Risk", "Success Fee", "Disbursement Recovery"], ["RP12", "RP13", "RP14", "RP15"]],
  ["ai_ready_dms", "AI-ready DMS", ["문서버전 기반 AI", "권한연동 AI", "조항 단위 검색", "협상경과 요약", "마크업", "실사이슈", "고객보고서", "Billing narrative"], ["RP06", "RP07", "RP17", "RP18"]],
  ["open_decisions", "착수 전 결정 필요사항", ["제품 우선 포지션", "배포방식", "회계 범위", "전자세금계산서", "DMS migration", "이메일 정책", "AI 모델", "HWP", "정산정책", "인건비 배부", "개인정보 보존", "권한정책", "선례관리", "외부공유"], ["RP00"]],
];

const lower = (value) => String(value ?? "").toLowerCase();
const normalize = (value) => lower(value).replace(/[^a-z0-9가-힣]+/g, " ").trim();

function parseFeatureRows(specText) {
  return specText
    .split(/\n/)
    .filter((line) => /^[A-Z]{2,6}-\d{3}\s/.test(line))
    .map((line) => {
      const [id, name, description, priority, acceptance] = line.split(/\t/);
      const prefix = id.split("-")[0];
      return { id, prefix, name, description, priority, acceptance };
    });
}

async function readPlanCorpus() {
  const files = [
    "docs/full-spec-microphase-ledger.md",
    "docs/weighted-implementation-ledger.md",
    "docs/spec-requirement-ledger.md",
    ...programs.map((program) => `docs/${program.fileBase}.md`),
  ];
  const parts = [];
  for (const file of files) {
    try {
      parts.push(await readFile(path.resolve(file), "utf8"));
    } catch {
      // Missing files are detected by other validators; coverage audit can still run.
    }
  }
  return normalize(parts.join("\n"));
}

async function readAnchoredRequirementIds() {
  try {
    await access(REQUIREMENT_LEDGER_PATH);
    const ledger = JSON.parse(await readFile(REQUIREMENT_LEDGER_PATH, "utf8"));
    return new Set((ledger.requirements ?? [])
      .filter((requirement) => requirement.primary_subphase_id && requirement.test_subphase_id && requirement.hermes_subphase_id && requirement.claude_subphase_id)
      .map((requirement) => requirement.id));
  } catch {
    return new Set();
  }
}

function scoreFeature(row, corpus, anchoredRequirementIds) {
  const expectedPrograms = featurePrefixToPrograms[row.prefix] ?? [];
  const programHits = expectedPrograms.filter((programId) => corpus.includes(lower(programId)));
  const nameTokens = normalize(row.name).split(/\s+/).filter((token) => token.length >= 2);
  const descriptionTokens = normalize(row.description).split(/\s+/).filter((token) => token.length >= 3);
  const acceptanceTokens = normalize(row.acceptance).split(/\s+/).filter((token) => token.length >= 3);
  const tokenHits = [...nameTokens, ...descriptionTokens].filter((token) => corpus.includes(token));
  const acceptanceHits = acceptanceTokens.filter((token) => corpus.includes(token));

  let status = "missing";
  if (anchoredRequirementIds.has(row.id)) status = "covered";
  if (programHits.length > 0 && tokenHits.length >= Math.min(2, Math.max(1, nameTokens.length))) status = "covered";
  if (programHits.length > 0 && status !== "covered") status = "weak";
  if (!anchoredRequirementIds.has(row.id) && status === "covered" && acceptanceHits.length === 0 && acceptanceTokens.length > 0) status = "weak";

  return {
    ...row,
    expected_programs: expectedPrograms,
    matched_programs: programHits,
    token_hits: tokenHits.slice(0, 12),
    acceptance_hits: acceptanceHits.slice(0, 12),
    status,
  };
}

function scoreNarrativeRequirement(requirement, corpus, anchoredRequirementIds) {
  const [id, title, terms, expectedPrograms] = requirement;
  const narrativeId = Object.fromEntries(catalogNarrativeRows().map((row) => [row.slug, row.id]))[id];
  const termHits = terms.filter((term) => corpus.includes(normalize(term)));
  const programHits = expectedPrograms.filter((programId) => corpus.includes(lower(programId)));
  const ratio = termHits.length / terms.length;
  const anchored = anchoredRequirementIds.has(narrativeId);
  return {
    id: narrativeId ?? id,
    slug: id,
    title,
    expected_programs: expectedPrograms,
    matched_programs: programHits,
    term_count: terms.length,
    matched_terms: termHits,
    missing_terms: terms.filter((term) => !termHits.includes(term)),
    status: anchored ? "covered" : ratio >= 0.65 && programHits.length > 0 ? "covered" : ratio >= 0.35 && programHits.length > 0 ? "weak" : "missing",
    anchored_requirement: anchored,
  };
}

function byPrefix(featureRows) {
  const summary = {};
  for (const row of featureRows) {
    summary[row.prefix] ??= { prefix: row.prefix, total: 0, covered: 0, weak: 0, missing: 0, expected_programs: featurePrefixToPrograms[row.prefix] ?? [] };
    summary[row.prefix].total += 1;
    summary[row.prefix][row.status] += 1;
  }
  return Object.values(summary).sort((a, b) => a.prefix.localeCompare(b.prefix));
}

function markdown(audit) {
  const lines = [];
  lines.push("# Law Firm OS Spec Coverage Audit v1");
  lines.push("");
  lines.push("Purpose: check whether the current RP ledgers reflect the attached Law Firm OS specification.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Spec feature IDs audited: ${audit.feature_count}`);
  lines.push(`- Covered: ${audit.feature_status_counts.covered}`);
  lines.push(`- Weak: ${audit.feature_status_counts.weak}`);
  lines.push(`- Missing: ${audit.feature_status_counts.missing}`);
  lines.push(`- Narrative requirements audited: ${audit.narrative_count}`);
  lines.push(`- Narrative covered: ${audit.narrative_status_counts.covered}`);
  lines.push(`- Narrative weak: ${audit.narrative_status_counts.weak}`);
  lines.push(`- Narrative missing: ${audit.narrative_status_counts.missing}`);
  lines.push("");
  lines.push("## Feature Prefix Coverage");
  lines.push("");
  lines.push("| Prefix | Expected RP | Total | Covered | Weak | Missing |");
  lines.push("|---|---|---:|---:|---:|---:|");
  for (const row of audit.prefix_summary) {
    lines.push(`| ${row.prefix} | ${row.expected_programs.join(", ")} | ${row.total} | ${row.covered} | ${row.weak} | ${row.missing} |`);
  }
  lines.push("");
  lines.push("## Weak Or Missing Feature IDs");
  lines.push("");
  const weakOrMissing = audit.features.filter((row) => row.status !== "covered");
  if (weakOrMissing.length === 0) {
    lines.push("No weak or missing feature IDs detected by the keyword/RP audit.");
  } else {
    lines.push("| ID | Status | Feature | Expected RP | Reason |");
    lines.push("|---|---|---|---|---|");
    for (const row of weakOrMissing) {
      const reason = row.matched_programs.length === 0 ? "expected RP not detected" : "acceptance/detail terms weak";
      lines.push(`| ${row.id} | ${row.status} | ${row.name} | ${row.expected_programs.join(", ")} | ${reason} |`);
    }
  }
  lines.push("");
  lines.push("## Narrative Requirement Coverage");
  lines.push("");
  lines.push("| Requirement | Status | Expected RP | Missing terms |");
  lines.push("|---|---|---|---|");
  for (const row of audit.narrative_requirements) {
    lines.push(`| ${row.title} | ${row.status} | ${row.expected_programs.join(", ")} | ${row.missing_terms.slice(0, 10).join(", ")} |`);
  }
  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push("- `covered` means the current RP ledgers contain the expected responsible RP and enough matching feature/detail terms.");
  lines.push("- `weak` means the topic is represented at module level but the detailed acceptance criterion is not explicit enough.");
  lines.push("- `missing` means this audit could not find enough evidence in the current plan text.");
  lines.push("- This is a planning coverage audit, not proof that product code implements the feature.");
  return `${lines.join("\n")}\n`;
}

const specText = await readFile(SPEC_PATH, "utf8");
const corpus = await readPlanCorpus();
const anchoredRequirementIds = await readAnchoredRequirementIds();
const features = parseFeatureRows(specText).map((row) => scoreFeature(row, corpus, anchoredRequirementIds));
const narrative = narrativeRequirements.map((requirement) => scoreNarrativeRequirement(requirement, corpus, anchoredRequirementIds));

const countByStatus = (rows) => rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, { covered: 0, weak: 0, missing: 0 });

const audit = {
  schema_version: "law-firm-os.spec-coverage-audit.v1",
  generated_from: "scripts/audit-spec-coverage.mjs",
  spec_path: SPEC_PATH,
  plan_sources: [
    "docs/full-spec-microphase-ledger.md",
    "docs/weighted-implementation-ledger.md",
    "docs/spec-requirement-ledger.md",
    "docs/rp00-...-rp29 detailed microphase markdown files",
  ],
  anchored_requirement_count: anchoredRequirementIds.size,
  feature_count: features.length,
  feature_status_counts: countByStatus(features),
  prefix_summary: byPrefix(features),
  features,
  narrative_count: narrative.length,
  narrative_status_counts: countByStatus(narrative),
  narrative_requirements: narrative,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_PATH, `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(MD_PATH, markdown(audit));

console.log("Generated spec coverage audit.");
console.log(`feature_count: ${audit.feature_count}`);
console.log(`feature_status_counts: ${JSON.stringify(audit.feature_status_counts)}`);
console.log(`narrative_status_counts: ${JSON.stringify(audit.narrative_status_counts)}`);
console.log(JSON_PATH);
console.log(MD_PATH);
