# HRX Roadmap Pyramid TOC

| Layer | Name | Goal | Primary gate |
|---|---|---|---|
| L0 | Boundary & Source-of-Truth | 현재 runtime evidence와 production readiness 사이의 경계를 명문화하고 완료 claim을 통제한다. | R4/go-live 오인 차단 |
| L1 | Durable Runtime Foundation | in-memory HRX runtime을 DB-backed repository, migration, seed, backup 가능한 foundation으로 전환한다. | durable persistence |
| L2 | Trust Boundary | tenant/actor/session/authz/step-up/audit를 모든 HRX route에 강제한다. | security gate |
| L3 | Core HRIS Domain | Employee, EmploymentProfile, UserLink, Org, Role, Document, Compensation boundary를 core HRIS로 정리한다. | HR master data |
| L4 | People Operations Workflows | Leave, attendance, overtime, recruiting, onboarding, offboarding, HR risk를 runtime workflow로 확장한다. | workflow runtime |
| L5 | Portal & API Experience | Employee/Candidate/HR Admin portal을 session-based API-backed UI로 harden한다. | operator surface |
| L6 | AI/RAG & Analytics | permission-aware HR RAG, no-final-judgment guard, people analytics/read model을 source-grounded로 강화한다. | AI/analytics |
| L7 | Enterprise Hardening | SSO/MFA/SCIM, observability, compliance, retention/purge/legal hold, DR, performance를 operational control로 구현한다. | enterprise controls |
| L8 | Release, UAT & Go/No-Go | UAT, cutover, release readiness, owner decision, go/no-go gate를 실제 실행 기준으로 정리한다. | release control |

## Layer dependency

```text
L8 Release / Go-No-Go
  L7 Enterprise Hardening
    L6 AI/RAG & Analytics
      L5 Portal & API Experience
        L4 People Operations Workflows
          L3 Core HRIS Domain
            L2 Trust Boundary
              L1 Durable Runtime Foundation
                L0 Boundary & Source-of-Truth
```

## Non-negotiable rule
어떤 상위 layer도 하위 P0 gate가 통과되기 전에는 완료로 표시하지 않습니다.
