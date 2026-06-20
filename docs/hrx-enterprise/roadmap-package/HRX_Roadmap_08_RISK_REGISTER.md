# HRX Risk Register

| ID | Risk | Severity | Evidence | Mitigation |
|---|---|---|---|---|
| R-HRX-001 | Durable persistence가 없는 상태에서 runtime-ready로 오인 | P0 | Current readiness string remains open | L1 validators fail if default runtime is in-memory |
| R-HRX-002 | HRX route가 policy engine 없이 실행 | P0 | Server routes HRX directly to handler | Route policy map + middleware + negative tests |
| R-HRX-003 | client-side hardcoded scopes/tenant로 권한 오염 | P0 | hrxApiClient.ts constants | Server-side session context only |
| R-HRX-004 | 감사 로그가 in-memory라 분쟁 대응 불가 | P0 | in-memory audit store | Durable append-only hash-chain audit |
| R-HRX-005 | MFA/step-up 로직이 존재만 하고 sensitive route에 미강제 | P0 | hrx-step-up.js not visibly wired | Sensitive route wrapper |
| R-HRX-006 | Payroll preview가 payroll calculation으로 오인 | P0 | payroll-boundary preview only | Field block + human review + explicit no calculation |
| R-HRX-007 | HR document source_ref만 있고 원본 저장소 검증 부재 | P1 | documents.js metadata-only | M365/DMS source adapter |
| R-HRX-008 | AI advisory response가 실제 RAG로 오인 | P1 | source metadata only | source ingestion + citation validator |
| R-HRX-009 | Candidate가 CRM Party와 오염 | P0 | candidate/party separation must persist | candidate privacy policy + conversion gate |
| R-HRX-010 | go-live/R4 claim이 evidence route만으로 발생 | P0 | G12 evidence-only | no-premature-claim validator + owner approval gate |
