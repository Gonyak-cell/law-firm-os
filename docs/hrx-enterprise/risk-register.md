# HRX Risk Register

Status: accepted
Date: 2026-06-20
TUW: HRX-L0-008
Source: `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_08_RISK_REGISTER.md`

| ID | Risk | Severity | Evidence | Mitigation |
| --- | --- | --- | --- | --- |
| R-HRX-001 | Durable persistence가 없는 상태에서 runtime-ready로 오인 | P0 | Current readiness string remains open | L1 validators fail if default runtime is in-memory |
| R-HRX-002 | HRX route가 policy engine 없이 실행 | P0 | Server routes HRX directly to handler | Route policy map plus middleware plus negative tests |
| R-HRX-003 | client-side hardcoded scopes/tenant로 권한 오염 | P0 | UI client constants can create false allow paths | Server-side session context only |
| R-HRX-004 | 감사 로그가 in-memory라 분쟁 대응 불가 | P0 | In-memory audit evidence is restart-fragile | Durable append-only hash-chain audit |
| R-HRX-005 | MFA/step-up 로직이 존재만 하고 sensitive route에 미강제 | P0 | Step-up utility alone is not enforcement | Sensitive route wrapper and validator |
| R-HRX-006 | Payroll preview가 payroll calculation으로 오인 | P0 | Payroll boundary preview only | Field block plus human review plus explicit no calculation |
| R-HRX-007 | HR document source_ref만 있고 원본 저장소 검증 부재 | P1 | Metadata-only document records | M365/DMS source adapter |
| R-HRX-008 | AI advisory response가 실제 RAG로 오인 | P1 | Source metadata only | Source ingestion plus citation validator |
| R-HRX-009 | Candidate가 CRM Party와 오염 | P0 | Candidate/Party separation must persist | Candidate privacy policy plus conversion gate |
| R-HRX-010 | go-live/R4 claim이 evidence route만으로 발생 | P0 | Current G12/API evidence is not release proof | No-premature-claim validator plus owner approval gate |

## Risk Gate

Any open P0 risk blocks the relevant PR exit gate. Owner deferral can document a risk, but it cannot convert a blocked runtime, security, compliance, or release gate into a pass.
