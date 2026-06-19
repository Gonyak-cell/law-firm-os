# ADR-G0-003: Client-Matter OS Planning Root

Status: Proposed
Date: 2026-06-19
Gate: `G0 Reorganization Gate`
TUW: `LFOS-G0-W00-T010`

## Context

The Client-Matter OS transition introduces a new G0-G7 planning lane on top of
an existing Law Firm OS repository that already contains closeout-pack evidence,
control-room data, product contracts, package descriptors, and launch planning
artifacts.

The current transition package lives under
`docs/reorganization/client-matter-os/`. The G0 closeout checklist left open
whether this folder should become the canonical planning root or whether the
approved documents should later move into another governance folder.

Moving the folder now would create avoidable churn across stacked G0 PRs and
would mix transition-planning artifacts with closeout-pack evidence that has a
different validation model.

## Decision

Keep `docs/reorganization/client-matter-os/` as the canonical planning root for
the G0-G7 Client-Matter OS transition.

Do not move these planning artifacts into closeout-pack folders, runtime package
folders, or product-contract folders during G0. Later implementation PRs may add
gate-specific runtime evidence beside the affected packages, but the transition
roadmap, TUW catalog, ADRs, risk register, and G0 closeout material stay in this
planning root unless a later governance ADR explicitly supersedes this decision.

## Boundary

| Artifact type | Canonical location |
| --- | --- |
| G0-G7 roadmap and gates | `docs/reorganization/client-matter-os/` |
| Full transition TUW catalog | `docs/reorganization/client-matter-os/` |
| G0 decision ADRs | `docs/reorganization/client-matter-os/` |
| Migration manifest template | `docs/reorganization/client-matter-os/` |
| Closeout-pack evidence | Existing `docs/closeout-packs/` structure |
| Runtime contracts | Existing `contracts/` structure |
| Runtime package evidence | Existing package-local docs/tests after each runtime PR |
| Product governance cross-links | May reference this planning root without moving it |

## Consequences

- G0 document links stay stable across the stacked PR chain.
- Closeout-pack evidence remains separate from transition-planning evidence.
- Runtime packages do not receive planning-only documents before implementation
  begins.
- Later G1-G7 PRs can cite a single planning root for TUW IDs, gates, risks, and
  ADRs.
- A future governance ADR may move or mirror selected accepted artifacts, but
  that is not part of this G0 decision.

## Validation Requirements

The G0 validator must keep checking that:

1. `docs/reorganization/client-matter-os/README.md` indexes the planning root.
2. The G0 closeout report references `ADR-G0-003`.
3. The planning root still contains roadmap, TUW catalog, risk register,
   workflow checklist, decision ADRs, and migration manifest template.
4. The G0 lane does not claim runtime readiness from planning-root existence
   alone.

## Status Boundary

This ADR is proposed by the G0 planning lane. It does not approve G0 by itself,
does not move files, and does not make planning artifacts runtime evidence.
Human review still needs to accept or amend the decision before G0 closeout.
