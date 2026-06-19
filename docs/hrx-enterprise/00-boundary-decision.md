# HRX Boundary Decision

Status: accepted
Date: 2026-06-19
TUW: HRX-ENT-L0-W01-T01

## Decision

HRX remains an embedded People and HR evidence/runtime track inside Law Firm OS. It is not a standalone HR SaaS product and it is not production HRIS-ready until the later runtime, trust, API, UI, workflow, AI, hardening, release, and human go-live gates pass.

## Accepted Direction

The accepted product direction is:

- Preserve HRX as part of Law Firm OS.
- Move from descriptor-backed evidence toward embedded People/HR runtime in sequential TUW packs.
- Keep Employee separate from IAM User; any relationship must be a controlled link.
- Treat audit as a product surface, not only backend storage.
- Require permission decision plus audit evidence for sensitive HR read/write.

## Non Goals

This boundary explicitly blocks:

- Standalone HRX SaaS readiness claims.
- Production HRIS readiness claims.
- Payroll calculation runtime in the first execution tranche.
- AI final decisions for hiring, firing, pay, evaluation, discipline, or termination.
- Sensitive HR mutation without permission and audit receipt.

## Evidence Rule

Descriptor-only, synthetic fixture, no runtime, no state write, no permission write, and no audit write evidence cannot close runtime readiness. These forms of evidence remain useful planning or guardrail evidence, but they do not prove HRX runtime availability.

## Next Pack Dependency

HRX-P02 Governance may proceed after this pack only if the boundary remains intact in:

- docs/hrx-enterprise/01-terminology.md
- contracts/hrx-payroll-boundary.json
- contracts/hrx-ai-decision-boundary.json

