import path from "node:path";

export const SPEC_PATH = path.resolve("/Users/jws/.codex/attachments/696e9f72-c1ec-4c7f-a8b8-4367755c57c3/pasted-text.txt");

export const featurePrefixToPrograms = {
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

export const narrativeRequirements = [
  ["NARR-001", "roles", "시스템 역할 17종", ["System Super Admin", "Tenant Owner", "Managing Partner", "Practice Group Leader", "Relationship Partner", "Origination Partner", "Responsible Partner", "Matter Manager", "Attorney", "Paralegal", "BD Manager", "Finance Manager", "Accounting Reviewer", "Security Admin", "External Counsel", "Client User", "Auditor"], ["RP01", "RP02", "RP21", "RP26"]],
  ["NARR-002", "permission_layers", "권한 5계층 및 우선순위", ["RBAC", "ABAC", "Object ACL", "Deny Rule", "Security Trimming", "Legal Hold", "Ethical Wall"], ["RP02", "RP16"]],
  ["NARR-003", "data_model", "핵심 데이터 모델 전체", ["Tenant", "Entity", "Client", "Matter", "Document", "Invoice", "Payment", "Settlement", "AIJob"], ["RP01", "RP04", "RP05", "RP06", "RP12", "RP13", "RP14", "RP17"]],
  ["NARR-004", "analytics", "Analytics 대시보드와 수익성", ["Managing Partner Dashboard", "Partner Dashboard", "Matter P&L", "Client Profitability", "Forecast", "WIP"], ["RP15"]],
  ["NARR-005", "workflows", "주요 업무 workflow", ["Opportunity", "Matter 전환", "문서 Lifecycle", "Billing Workflow", "Settlement Workflow", "Matter Closing"], ["RP05", "RP06", "RP09", "RP12", "RP14"]],
  ["NARR-006", "screens", "화면 설계", ["Managing Partner Home", "Partner Home", "Attorney Home", "Finance Manager Home", "Matter 상세 화면"], ["RP15", "RP05", "RP11", "RP12"]],
  ["NARR-007", "security", "보안 컴플라이언스", ["Authentication", "Authorization", "Encryption", "Key Management", "DLP", "Break-glass", "Backup", "Incident Response", "WORM Storage"], ["RP16", "RP26", "RP29"]],
  ["NARR-008", "privacy", "개인정보 관리", ["수집 최소화", "목적 제한", "수신동의", "수신거부", "마스킹", "보존기간", "subprocessors"], ["RP04", "RP09", "RP16", "RP17"]],
  ["NARR-009", "audit_events", "감사로그 이벤트", ["Login", "View", "Download", "Upload", "Edit", "Delete", "Share", "Permission Change", "Search", "AI Access", "Billing Change", "Payment Match", "Settlement Run", "Admin Access", "Export", "Break-glass"], ["RP03", "RP16", "RP17", "RP29"]],
  ["NARR-010", "performance", "성능 목표", ["로그인", "Matter 목록", "문서목록", "일반검색", "복합검색", "OCR 처리", "AI 요약", "Proforma 생성", "월정산 preview", "대량 업로드"], ["RP06", "RP07", "RP12", "RP14", "RP18", "RP29"]],
  ["NARR-011", "availability", "가용성/RPO/RTO/DR", ["99.0", "99.5", "99.9", "99.95", "RPO", "RTO", "백업", "재해복구", "status page"], ["RP26", "RP29"]],
  ["NARR-012", "scalability", "확장성 목표", ["5,000", "1,000,000", "100,000,000", "500,000,000", "dedicated index", "Vector index", "rate limit", "cold storage"], ["RP26", "RP27", "RP29"]],
  ["NARR-013", "architecture", "권장 기술 아키텍처", ["Next.js", "React", "PostgreSQL", "S3", "OpenSearch", "Redis", "Queue", "OCR", "OIDC", "Office.js", "OpenTelemetry", "Kubernetes", "Terraform"], ["RP26", "RP27", "RP29"]],
  ["NARR-014", "integrations", "외부 연동", ["Microsoft 365", "Outlook", "Gmail", "Google Workspace", "Word", "Excel", "PowerPoint", "더존", "WEHAGO", "홈택스", "은행", "법인카드", "Slack", "Teams", "전자서명", "DART", "법원"], ["RP08", "RP22", "RP23", "RP24", "RP25"]],
  ["NARR-015", "differentiation_korea", "한국형 로펌 특화", ["HWP", "HWPX", "국문 계약서", "한국 법령", "판례", "등기", "정관", "의사록", "LDD", "RFI", "CP", "전자세금계산서"], ["RP20", "RP23", "RP24"]],
  ["NARR-016", "differentiation_management", "로펌 경영 특화", ["Matter P&L", "Partner Settlement", "WIP", "Fixed Fee", "Client Profitability", "Origination Tracking", "AR Risk", "Success Fee", "Disbursement Recovery"], ["RP12", "RP13", "RP14", "RP15"]],
  ["NARR-017", "ai_ready_dms", "AI-ready DMS", ["문서버전 기반 AI", "권한연동 AI", "조항 단위 검색", "협상경과 요약", "마크업", "실사이슈", "Client 보고서", "Billing narrative"], ["RP06", "RP07", "RP17", "RP18"]],
  ["NARR-018", "open_decisions", "착수 전 결정 필요사항", ["제품 우선 포지션", "배포방식", "회계 범위", "전자세금계산서", "DMS migration", "이메일 정책", "AI 모델", "HWP", "정산정책", "인건비 배부", "개인정보 보존", "권한정책", "선례관리", "외부공유"], ["RP00"]],
];

export const featurePrefixToPhase = {
  TEN: "P02",
  USR: "P02",
  AUD: "P02",
  ENT: "P02",
  CLI: "P02",
  CON: "P02",
  LEAD: "P02",
  OPP: "P02",
  PROP: "P02",
  REF: "P02",
  CAM: "P02",
  REL: "P02",
  CONF: "P02",
  ENG: "P02",
  MAT: "P02",
  DOC: "P02",
  EML: "P02",
  SRCH: "P02",
  TIME: "P02",
  EXP: "P02",
  BILL: "P02",
  PAY: "P02",
  ACC: "P02",
  SET: "P02",
  AI: "P02",
};

export function parseFeatureRows(specText) {
  return specText
    .split(/\n/)
    .filter((line) => /^[A-Z]{2,6}-\d{3}\s/.test(line))
    .map((line) => {
      const [id, name, description, priority, acceptance] = line.split(/\t/);
      const prefix = id.split("-")[0];
      return { id, type: "feature", prefix, name, description, priority, acceptance };
    });
}

export function narrativeRows() {
  return narrativeRequirements.map(([id, slug, title, terms, programs]) => ({
    id,
    type: "narrative",
    prefix: "NARR",
    slug,
    name: title,
    description: terms.join(", "),
    priority: slug === "open_decisions" ? "P0" : "P1",
    acceptance: `The plan explicitly accounts for: ${terms.join(", ")}.`,
    terms,
    expected_programs: programs,
  }));
}

export function expectedProgramsFor(row) {
  return row.type === "narrative" ? row.expected_programs : featurePrefixToPrograms[row.prefix] ?? [];
}

export function primaryProgramFor(row) {
  return expectedProgramsFor(row)[0] ?? "RP00";
}

export function implementationPhaseFor(row) {
  if (row.type === "narrative") {
    if (row.slug === "screens") return "P04";
    if (["performance", "availability", "scalability", "architecture"].includes(row.slug)) return "P07";
    if (["security", "privacy", "audit_events"].includes(row.slug)) return "P06";
    if (row.slug === "open_decisions") return "P00";
    return "P02";
  }
  return featurePrefixToPhase[row.prefix] ?? "P02";
}
