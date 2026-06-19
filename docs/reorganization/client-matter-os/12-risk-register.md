# Risk Register

Status: Proposed
Source: `Law_Firm_OS_TUW_Backlog_v1.0.xlsx`

These risks are control requirements. A later implementation PR that touches the relevant module must include direct negative evidence for the matching risk.

| Risk ID | 리스크 | 영향 | 통제 | 등급 |
| --- | --- | --- | --- | --- |
| R-001 | CRM과 Billing의 Client 중복 | Conflict miss, invoice 오류 | Party Master single source | High |
| R-002 | Opportunity가 Matter로 직접 전환 | 수임통제 실패 | Intake clearance token 필수 | Critical |
| R-003 | Conflict memo가 CRM에 노출 | 비밀유지 위반 | Module boundary + ACL | Critical |
| R-004 | Audit in-memory 유지 | 감사·포렌식 불가 | Durable audit store | Critical |
| R-005 | AI가 DMS 권한 우회 | Cross-matter leakage | Permission-aware retrieval | Critical |
| R-006 | Invoice 확정 후 직접수정 | 세무·회계 불일치 | Locked state + adjustment workflow | High |
| R-007 | External portal overexposure | 고객자료·내부자료 유출 | Portal projection + external ACL | Critical |
| R-008 | User와 Employee 혼동 | HR 정보 유출 | HRX separation | High |
| R-009 | Analytics가 source object 수정 | Reporting/source 혼동 | Read model only | Medium |
| R-010 | Admin DB 직접수정 | 내부통제 무력화 | Admin API + break-glass audit | Critical |
| R-011 | DMS search index ACL 누락 | 문서 노출 | Index-level ACL filter | Critical |
| R-012 | Migration duplicate party | Conflict DB 오염 | Duplicate review queue | High |
| R-013 | Settlement run 수정 | 파트너 정산 분쟁 | Settlement lock/reversal | High |
| R-014 | Tax invoice 재처리 오류 | 세무 리스크 | Idempotency + reconciliation | High |
| R-015 | Descriptor를 runtime으로 오인 | 고객/내부 착오 | Runtime readiness badge | Medium |

## Highest-Risk Defaults

- Conflict, AI retrieval, portal projection, audit, tenant isolation, and invoice/payment mutation paths default to fail-closed.
- Descriptor-only evidence cannot close a runtime risk.
- CRM and Billing must not create separate Client identities.
