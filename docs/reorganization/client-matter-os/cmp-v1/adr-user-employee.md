# ADR-CMP-R4-002: User and Employee Separation

Status: Proposed
Date: 2026-06-20

## Context

CMP R4 requires MatterTeam staffing and workforce analytics to use Employee identity, not IAM User identity.

## Decision

Employee is owned by People/HRX. User is session authority only. UserEmployeeLink is a controlled link and cannot collapse the two identities.

## Consequences

- MatterTeamMember requires employee_id.
- TimeEntry and capacity references use Employee.
- UI may show linked user context only after permission and masking checks.
