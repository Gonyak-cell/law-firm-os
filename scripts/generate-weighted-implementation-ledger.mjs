#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { programById, programs, standardPhases } from "./rp-detailed-plan-catalog.mjs";

const SOURCE_LEDGER_PATH = path.resolve("docs/full-spec-microphase-ledger.json");
const REQUIREMENT_LEDGER_PATH = path.resolve("docs/spec-requirement-ledger.json");
const CRITICAL_RP_HARDENING_PATH = path.resolve("contracts/critical-rp-saas-hardening-contract.json");
const OUTPUT_DIR = path.resolve("docs");
const JSON_PATH = path.join(OUTPUT_DIR, "weighted-implementation-ledger.json");
const MD_PATH = path.join(OUTPUT_DIR, "weighted-implementation-ledger.md");

const programComplexity = {
  RP00: 2.0,
  RP01: 2.4,
  RP02: 3.3,
  RP03: 3.2,
  RP04: 2.8,
  RP05: 3.2,
  RP06: 4.0,
  RP07: 4.0,
  RP08: 3.8,
  RP09: 3.0,
  RP10: 3.2,
  RP11: 3.0,
  RP12: 3.8,
  RP13: 3.4,
  RP14: 3.7,
  RP15: 3.3,
  RP16: 3.9,
  RP17: 4.0,
  RP18: 4.0,
  RP19: 3.3,
  RP20: 3.8,
  RP21: 3.2,
  RP22: 3.8,
  RP23: 3.8,
  RP24: 3.9,
  RP25: 4.0,
  RP26: 4.0,
  RP27: 3.6,
  RP28: 3.8,
  RP29: 3.5,
};

const phaseComplexityDelta = {
  P00: -1.0,
  P01: 0.0,
  P02: 1.0,
  P03: 0.0,
  P04: 0.5,
  P05: 0.5,
  P06: 1.0,
  P07: 1.0,
  P08: 0.5,
  P09: 0.0,
};

const microComplexityDelta = {
  M00: -1.0,
  M01: -0.5,
  M02: 0.0,
  M03: 1.0,
  M04: 0.5,
  M05: 1.0,
  M06: 0.5,
  M07: 1.0,
  M08: 0.5,
  M09: 0.25,
  M10: -0.75,
};

const highRiskProgramIds = new Set(["RP06", "RP07", "RP08", "RP12", "RP14", "RP16", "RP17", "RP18", "RP20", "RP22", "RP23", "RP24", "RP25", "RP26", "RP28"]);
const extraHeavyProgramIds = new Set(["RP18", "RP25", "RP26"]);
const heavyPhaseIds = new Set(["P02", "P06", "P07"]);
const heavyMicroIds = new Set(["M03", "M04", "M05", "M07"]);

const phaseProfiles = {
  P00: [
    "Scope inventory",
    "Acceptance gate definition",
    "Non-goal boundary",
    "Target file map",
    "Contract schema outline",
    "Ownership note",
    "Matter-first trace note",
    "Permission baseline note",
    "Audit baseline note",
    "Synthetic data policy",
    "Risk register row",
    "Blocked-claim rule",
    "Hermes preflight fields",
    "Claude review prompts",
    "Human approval note",
    "Closeout handoff",
    "Dependency list",
    "Downstream RP routing",
    "Command matrix",
    "Receipt shape",
    "Plan consistency check",
    "Documentation polish",
    "Validation rerun",
    "Next phase entry criteria",
  ],
  P01: [
    "Package directory layout",
    "Primary entity identifier",
    "Tenant scope field",
    "Matter trace reference",
    "Lifecycle status enum",
    "Ownership metadata",
    "Reference relationship map",
    "Required field registry",
    "Optional field registry",
    "State transition map",
    "Validation helper",
    "Fixture model",
    "Serialization shape",
    "Public export",
    "Model unit test",
    "Invalid reference test",
    "Ownership drift test",
    "Hermes model summary",
    "Claude model review prompt",
    "Closeout handoff",
    "Documentation entry",
    "Index export check",
    "Type shape regression case",
    "Future schema migration note",
  ],
  P02: [
    "Service entrypoint contract",
    "Request normalization",
    "Tenant boundary precheck",
    "Matter trace precheck",
    "Permission precheck",
    "Audit hint precheck",
    "Primary happy path",
    "Secondary workflow path",
    "State transition enforcement",
    "Idempotency key handling",
    "Lock acquisition rule",
    "Persistence boundary",
    "Validation error mapping",
    "Review-required routing",
    "Approval-required routing",
    "Blocked-claim output",
    "Rollback behavior",
    "Retry behavior",
    "Unit test: happy path",
    "Unit test: denied path",
    "Unit test: review path",
    "Integration smoke case",
    "Golden fixture binding",
    "Hermes service evidence",
    "Claude service review prompt",
    "Human approval summary",
    "Closeout handoff",
    "Performance note",
    "Observability note",
    "Future extension point",
    "Backward compatibility check",
    "Documentation update",
    "Command rerun",
    "Risk register update",
    "Downstream dependency note",
    "No-real-data check",
    "Security trimming check",
    "Audit event expectation",
    "Failure receipt sample",
    "Next implementation slice",
  ],
  P03: [
    "Public export map",
    "Request contract",
    "Response contract",
    "Error code taxonomy",
    "Permission annotation",
    "Audit annotation",
    "Pagination or filtering contract",
    "Serialization guard",
    "Unauthorized data omission",
    "API fixture",
    "Contract test",
    "Invalid request test",
    "Denied response test",
    "Hermes API evidence",
    "Claude interface prompt",
    "Documentation example",
    "Versioning note",
    "Closeout handoff",
    "Downstream consumer note",
    "Command rerun",
    "Schema drift check",
    "Backward compatibility check",
    "OpenAPI placeholder",
    "Future extension point",
  ],
  P04: [
    "UI surface inventory",
    "Data dependency map",
    "Loading state",
    "Empty state",
    "Denied state",
    "Review-required state",
    "Primary interaction",
    "Secondary interaction",
    "Permission badge",
    "Audit hint display",
    "Error message copy",
    "Responsive desktop layout",
    "Responsive mobile layout",
    "Keyboard/focus behavior",
    "Visual density check",
    "Synthetic fixture binding",
    "Build smoke",
    "Hermes UI evidence",
    "Claude UI leak prompt",
    "Closeout handoff",
    "State snapshot",
    "No unauthorized count leak",
    "Jira-like style alignment",
    "Future admin surface note",
  ],
  P05: [
    "Base tenant fixture",
    "Base user fixture",
    "Base matter fixture",
    "Base document fixture",
    "Primary golden case",
    "Secondary golden case",
    "Review-required case",
    "Denied case",
    "Cross-tenant case",
    "Missing context case",
    "Audit hint case",
    "Security trimming case",
    "AI retrieval or analytics case",
    "Fixture manifest",
    "Golden test",
    "Failure test",
    "Hermes fixture evidence",
    "Claude missing-test prompt",
    "Closeout handoff",
    "No-real-data check",
    "Stable ID check",
    "Replay command",
    "Expected decision summary",
    "Documentation update",
  ],
  P06: [
    "Permission matrix row",
    "View decision binding",
    "Search decision binding",
    "Mutation decision binding",
    "Export/download decision binding",
    "Share decision binding",
    "AI retrieval decision binding",
    "Audit hint fields",
    "Matched rule capture",
    "Deny-over-allow check",
    "Legal hold interaction",
    "Ethical wall interaction",
    "Object ACL interaction",
    "Review-required route",
    "Approval-required route",
    "Security trimming proof",
    "Audit event expectation",
    "Permission fixture",
    "Allowed test",
    "Denied test",
    "Cross-tenant test",
    "Leak prevention test",
    "Hermes security evidence",
    "Claude bypass prompt",
    "Human approval note",
    "Closeout handoff",
    "Downstream audit note",
    "No-real-data check",
    "Command rerun",
    "Risk register update",
    "Future DLP/retention note",
    "Operational review note",
    "Regression guard",
    "Documentation update",
    "Blocked claim sample",
    "Next RP dependency",
  ],
  P07: [
    "Failure taxonomy",
    "Missing tenant failure",
    "Missing actor failure",
    "Missing Matter failure",
    "Missing resource failure",
    "Unknown action failure",
    "Cross-tenant failure",
    "Permission denied failure",
    "Ambiguous rule failure",
    "Stale reference failure",
    "Lock conflict failure",
    "Retry exhaustion failure",
    "Rollback expectation",
    "Compensation expectation",
    "Blocked-claim receipt",
    "Failure fixture",
    "Failure unit test",
    "Failure integration smoke",
    "Audit failure hint",
    "Hermes failure evidence",
    "Claude edge-case prompt",
    "Human escalation note",
    "Closeout handoff",
    "No silent success check",
    "No data leak check",
    "Recovery documentation",
    "Command rerun",
    "Risk register update",
    "Downstream correction route",
    "Future incident note",
  ],
  P08: [
    "Hermes command matrix",
    "Evidence field list",
    "Changed-file receipt",
    "Command result receipt",
    "Fixture summary receipt",
    "Blocked-claim receipt",
    "Permission summary receipt",
    "Audit summary receipt",
    "No-real-data receipt",
    "Claude dependency marker",
    "Human approval marker",
    "PASS semantics",
    "PASS_WITH_FINDINGS semantics",
    "BLOCK semantics",
    "Evidence template",
    "Validation command check",
    "Harness boundary note",
    "Closeout handoff",
    "Regression receipt",
    "Next gate readiness",
    "Documentation update",
    "Operator summary",
    "Risk register update",
    "Command rerun",
  ],
  P09: [
    "Architecture review questions",
    "Security review questions",
    "Permission bypass questions",
    "Audit completeness questions",
    "Missing test questions",
    "UI leak questions",
    "Downstream readiness questions",
    "Risk register",
    "Severity taxonomy",
    "Go/no-go verdict format",
    "Finding routing map",
    "Human approval summary",
    "Claude review packet",
    "Closeout criteria",
    "PASS closeout note",
    "PASS_WITH_FINDINGS closeout note",
    "BLOCK closeout note",
    "Next RP dependency",
    "Documentation update",
    "Command rerun",
    "Review receipt placeholder",
    "Future correction slot",
    "No-real-data confirmation",
    "Final handoff",
  ],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundQuarter(value) {
  return Math.round(value * 4) / 4;
}

function weightFromScore(score) {
  if (score < 1.75) return "L";
  if (score < 2.75) return "M";
  if (score < 3.75) return "H";
  return "XH";
}

function splitCountFor(weight, entry, score) {
  if (weight === "L") return heavyMicroIds.has(entry.micro_id) || entry.micro_id === "M08" || entry.micro_id === "M09" ? 2 : 1;
  if (weight === "M") {
    return clamp(3 + (heavyMicroIds.has(entry.micro_id) ? 1 : 0) + (["P04", "P05", "P08", "P09"].includes(entry.phase_id.slice(-3)) ? 1 : 0), 3, 5);
  }
  if (weight === "H") {
    return clamp(
      8 +
        (heavyPhaseIds.has(entry.phase_id.slice(-3)) ? 3 : 0) +
        (heavyMicroIds.has(entry.micro_id) ? 3 : 0) +
        (highRiskProgramIds.has(entry.program_id) ? 2 : 0),
      8,
      15,
    );
  }
  return clamp(
    20 +
      (extraHeavyProgramIds.has(entry.program_id) && heavyPhaseIds.has(entry.phase_id.slice(-3)) && heavyMicroIds.has(entry.micro_id) ? 5 : 0) +
      (programComplexity[entry.program_id] >= 4 && heavyPhaseIds.has(entry.phase_id.slice(-3)) && heavyMicroIds.has(entry.micro_id) ? 3 : 0) +
      (score >= 4.6 ? 2 : 0),
    20,
    30,
  );
}

function estimatedHoursFor(weight, splitCount) {
  if (weight === "L") return roundQuarter(splitCount === 1 ? 1 : 1.75);
  if (weight === "M") return roundQuarter(2 + ((splitCount - 3) * 4) / 2);
  if (weight === "H") return roundQuarter(8 + ((splitCount - 8) * 16) / 7);
  return roundQuarter(24 + ((splitCount - 20) * 56) / 30);
}

function estimateRangeFor(weight) {
  if (weight === "L") return "0.5-2h";
  if (weight === "M") return "2-6h";
  if (weight === "H") return "1-3d";
  return "3d-2w+";
}

function complexityFor(entry) {
  const phaseId = entry.phase_id.slice(-3);
  const programScore = programComplexity[entry.program_id] ?? 3;
  const rawScore = programScore + (phaseComplexityDelta[phaseId] ?? 0) + (microComplexityDelta[entry.micro_id] ?? 0);
  const score = clamp(rawScore, 1, 4.8);
  const weight = weightFromScore(score);
  const splitCount = splitCountFor(weight, entry, score);
  const estimatedHours = estimatedHoursFor(weight, splitCount);
  return {
    score: roundQuarter(score),
    weight,
    estimated_hours: estimatedHours,
    estimated_range: estimateRangeFor(weight),
    split_count: splitCount,
    rationale: [
      `program_score=${programScore}`,
      `phase_delta=${phaseComplexityDelta[phaseId] ?? 0}`,
      `micro_delta=${microComplexityDelta[entry.micro_id] ?? 0}`,
      highRiskProgramIds.has(entry.program_id) ? "high_risk_program=true" : "high_risk_program=false",
    ],
  };
}

async function readRequirementLedger() {
  try {
    await access(REQUIREMENT_LEDGER_PATH);
    return JSON.parse(await readFile(REQUIREMENT_LEDGER_PATH, "utf8"));
  } catch {
    return { requirements: [] };
  }
}

function requirementMaps(requirements) {
  const bySubphase = new Map();
  const byMicroPhase = new Map();
  const anchorFields = [
    ["primary_subphase_id", "primary_implementation"],
    ["contract_subphase_id", "contract"],
    ["test_subphase_id", "test"],
    ["hermes_subphase_id", "hermes_evidence"],
    ["claude_subphase_id", "claude_review"],
  ];

  for (const requirement of requirements) {
    for (const [field, role] of anchorFields) {
      const subphaseId = requirement[field];
      if (!subphaseId) continue;
      const ref = {
        requirement_id: requirement.id,
        requirement_name: requirement.name,
        requirement_type: requirement.type,
        priority: requirement.priority,
        anchor_role: role,
      };
      bySubphase.set(subphaseId, [...(bySubphase.get(subphaseId) ?? []), ref]);
      const microPhaseId = subphaseId.replace(/\.S\d+$/, "");
      byMicroPhase.set(microPhaseId, [...(byMicroPhase.get(microPhaseId) ?? []), ref]);
    }
  }
  return { bySubphase, byMicroPhase };
}

function subphaseObjective(entry, program, title, index, total, refs) {
  const focus = program?.scope ?? entry.program_scope;
  const requirementText = refs.length > 0 ? ` Requirement refs: ${refs.map((ref) => `${ref.requirement_id}:${ref.anchor_role}`).join(", ")}.` : "";
  return `${title} for ${entry.id} (${entry.program_title} / ${entry.phase_title}) so the implementation slice is testable, auditable, permission-aware, and Matter-traceable where applicable. Scope focus: ${focus}. Step ${index} of ${total}.${requirementText}`;
}

function deliverableType(title) {
  const lowered = title.toLowerCase();
  if (lowered.includes("test") || lowered.includes("smoke") || lowered.includes("regression")) return "test";
  if (lowered.includes("hermes") || lowered.includes("evidence") || lowered.includes("receipt")) return "hermes_evidence";
  if (lowered.includes("claude") || lowered.includes("review")) return "claude_review";
  if (lowered.includes("ui") || lowered.includes("layout") || lowered.includes("state") || lowered.includes("interaction")) return "ui";
  if (lowered.includes("permission") || lowered.includes("audit") || lowered.includes("security")) return "security_audit";
  if (lowered.includes("contract") || lowered.includes("schema") || lowered.includes("api")) return "contract";
  if (lowered.includes("fixture") || lowered.includes("golden")) return "fixture";
  if (lowered.includes("failure") || lowered.includes("rollback") || lowered.includes("retry")) return "failure_recovery";
  return "implementation";
}

function completionGatesFor(deliverableType, refs) {
  const universal = [
    {
      id: "implemented",
      status: "required",
      evidence: "Changed files or explicit BLOCK record are attached to the subphase.",
    },
    {
      id: "tests",
      status: "required",
      evidence: "Relevant unit, integration, contract, fixture, UI, or golden tests exist and pass, or a justified test deferral is recorded.",
    },
    {
      id: "permission_audit",
      status: "required",
      evidence: "Permission decision, security trimming, audit event, and tenant isolation implications are verified or explicitly not applicable.",
    },
    {
      id: "hermes_validation",
      status: "required",
      evidence: "Hermes evidence row records commands, results, blocked claims, and requirement IDs before closeout.",
    },
    {
      id: "claude_cross_validation",
      status: "required",
      evidence: "Claude Code review packet includes architecture, security, missing-test, and go/no-go questions for this subphase or its parent closeout.",
    },
    {
      id: "human_approval",
      status: "required_for_p0_p1_or_sensitive",
      evidence: "Human approval is recorded for P0/P1 requirements, security-sensitive changes, finance mutations, external sharing, and AI output behavior.",
    },
    {
      id: "production_readiness",
      status: "required",
      evidence: "Operational notes cover migration, observability, rollback, rate limits, data retention, and customer-support impact where applicable.",
    },
  ];

  const typed = {
    contract: [
      { id: "contract_acceptance_trace", status: "required", evidence: "Spec requirement acceptance text is preserved verbatim or mapped to explicit acceptance criteria." },
      { id: "schema_or_api_compatibility", status: "required", evidence: "Schema/API shape is versioned and backward-compatibility risk is noted." },
    ],
    implementation: [
      { id: "working_product_behavior", status: "required", evidence: "Behavior is available through package API, backend route, UI flow, worker, or explicit executable path." },
      { id: "failure_mode_covered", status: "required", evidence: "Denied, missing context, cross-tenant, rollback, retry, and blocked-claim cases are handled where relevant." },
    ],
    ui: [
      { id: "ux_verified", status: "required", evidence: "Primary workflow is manually or browser verified on desktop and mobile with no text overlap or hidden critical state." },
      { id: "accessibility_verified", status: "required", evidence: "Keyboard focus, labels, contrast, empty/error states, and disabled states are checked." },
      { id: "design_consistency", status: "required", evidence: "Jira-like UI density, navigation, table/panel behavior, and responsive layout are preserved." },
    ],
    test: [
      { id: "failing_then_passing_or_golden", status: "required", evidence: "Test proves the requirement, failure mode, or golden case rather than only exercising code paths." },
      { id: "fixture_integrity", status: "required", evidence: "Fixtures are synthetic, deterministic, tenant-scoped, and free of real client/matter data." },
    ],
    fixture: [
      { id: "synthetic_fixture_quality", status: "required", evidence: "Fixture includes expected decisions, audit hints, tenant IDs, Matter trace, and no real data." },
      { id: "golden_case_replay", status: "required", evidence: "Golden case can be replayed by tests and Hermes without hidden setup." },
    ],
    security_audit: [
      { id: "bypass_resistance", status: "required", evidence: "Admin, partner, cross-tenant, ethical wall, legal hold, object ACL, search, report, and AI retrieval bypasses are tested where relevant." },
      { id: "audit_completeness", status: "required", evidence: "Actor, action, object, before/after, reason, IP/device, matched rule, and retention implications are captured where relevant." },
      { id: "fail_closed", status: "required", evidence: "Missing or ambiguous context denies, blocks, or requires review rather than silently allowing." },
    ],
    failure_recovery: [
      { id: "recovery_path", status: "required", evidence: "Rollback, retry, compensation, operator escalation, and customer-safe error messaging are defined." },
      { id: "incident_traceability", status: "required", evidence: "Failure emits enough audit/observability evidence to reproduce and triage." },
    ],
    hermes_evidence: [
      { id: "evidence_packet_complete", status: "required", evidence: "Commands, outputs, changed files, requirement refs, blocked claims, and PASS/BLOCK verdict are recorded." },
      { id: "harness_boundary", status: "required", evidence: "Hermes verifies product behavior without owning product code or silently mutating production state." },
    ],
    claude_review: [
      { id: "independent_review_ready", status: "required", evidence: "Claude review prompt includes context, requirement refs, changed files, tests, risks, and expected verdict format." },
      { id: "finding_routing", status: "required", evidence: "P0/P1/P2/P3 findings route to concrete correction subphases before closeout." },
    ],
  };

  const requirementGates = refs.length > 0
    ? [
        {
          id: "spec_requirement_trace",
          status: "required",
          evidence: `Requirement refs must be satisfied, blocked, or deferred with owner and target phase: ${refs.map((ref) => `${ref.requirement_id}:${ref.anchor_role}`).join(", ")}.`,
        },
      ]
    : [];

  return [...universal, ...(typed[deliverableType] ?? []), ...requirementGates];
}

function completionStatusModel(refs) {
  return {
    allowed_statuses: [
      "planned",
      "in_progress",
      "implemented",
      "tested",
      "hermes_passed",
      "claude_reviewed",
      "ux_verified",
      "performance_verified",
      "security_verified",
      "production_ready",
      "blocked",
    ],
    minimum_closeout_status: "production_ready",
    blocked_requires: [
      "blocking_reason",
      "owner",
      "next_attempt_phase_or_subphase",
      "customer_or_security_impact",
    ],
    requirement_trace_required: refs.length > 0,
  };
}

function hardeningOverlayFor(entry, criticalOverlay) {
  if (!criticalOverlay) {
    return {
      critical_rp: false,
      contract_ref: "contracts/critical-rp-saas-hardening-contract.json",
      universal_control_count: 7,
      universal_control_refs: [
        "tenant_isolation",
        "object_level_authorization",
        "matter_first_traceability",
        "audit_or_evidence_emission",
        "synthetic_fixture_only",
        "hermes_gate",
        "claude_cross_validation",
      ],
      essential_capabilities: [],
      essential_capability_count: 0,
      safety_gate_count: 0,
      research_alignment: [],
    };
  }

  return {
    critical_rp: true,
    contract_ref: "contracts/critical-rp-saas-hardening-contract.json",
    overlay_ref: `${entry.program_id}.critical_rp_overlay`,
    tier: criticalOverlay.tier,
    why_critical: criticalOverlay.why_critical,
    research_alignment: criticalOverlay.research_alignment,
    universal_control_count: criticalRpHardening.universal_saas_controls.length,
    essential_capability_count: criticalOverlay.essential_capabilities.length,
    safety_gate_count: criticalOverlay.safety_gates.length,
    mandatory_artifact_count: criticalOverlay.mandatory_artifacts.length,
  };
}

function hermesValidationPlanFor(entry, refs, overlay) {
  return {
    gate_id: entry.hermes_gate,
    required: true,
    inspection_stage: "stage_03_hermes_gate",
    evidence_packet: [
      "commands_executed",
      "command_results",
      "changed_files",
      "fixture_summary",
      "requirement_refs",
      "blocked_claims",
      "permission_audit_summary",
      "no_real_data_confirmation",
      ...(overlay.critical_rp ? ["critical_rp_saas_controls_summary", "critical_rp_safety_gate_summary"] : []),
    ],
    verdicts: ["PASS", "PASS_WITH_FINDINGS", "BLOCK"],
    closeout_rule: "Hermes validates evidence and blocked claims, but does not own product code or silently mutate product state.",
    requirement_refs_required: refs.length > 0,
  };
}

function claudeCrossValidationPlanFor(entry, overlay) {
  return {
    gate_id: entry.claude_gate,
    required: true,
    inspection_stage: "stage_04_claude_cross_validation",
    review_focus: [
      "architecture_soundness",
      "security_bypass_paths",
      "permission_and_tenant_isolation",
      "audit_and_evidence_completeness",
      "missing_tests",
      "unsafe_ai_or_tool_authority",
      "go_no_go_verdict",
      ...(overlay.critical_rp ? ["critical_rp_safety_gate_coverage", "research_control_alignment"] : []),
    ],
    finding_severity: ["P0_BLOCKER", "P1_MUST_FIX", "P2_SHOULD_FIX", "P3_NOTE"],
    verdicts: ["PASS", "PASS_WITH_FINDINGS", "BLOCK"],
    closeout_rule: "P0/P1 findings route to correction subphases before production_ready closeout.",
  };
}

function constructionInspectionFor(entry, subphase, refs, overlay) {
  return {
    process_name: "준공검사",
    applies_to: subphase.id,
    required: true,
    minimum_final_verdict: "PASS",
    allowed_verdicts: ["PASS", "PASS_WITH_FINDINGS", "REWORK_REQUIRED", "BLOCK"],
    stages: [
      {
        id: "stage_01_self_completion",
        owner: "Codex",
        required_evidence: ["changed_files_or_block_record", "acceptance_mapping", "synthetic_data_confirmation"],
      },
      {
        id: "stage_02_product_verification",
        owner: "Codex",
        required_evidence: ["tests_or_golden_case", "permission_audit_result", "tenant_isolation_result", "matter_trace_result"],
      },
      {
        id: "stage_03_hermes_gate",
        owner: "Hermes",
        required_evidence: ["command_receipt", "evidence_packet", "blocked_claim_verdict", entry.hermes_gate],
      },
      {
        id: "stage_04_claude_cross_validation",
        owner: "Claude Code",
        required_evidence: ["architecture_review", "security_review", "missing_test_review", "go_no_go_verdict", entry.claude_gate],
      },
      {
        id: "stage_05_human_acceptance",
        owner: "Human",
        required_evidence: ["P0_P1_sensitive_change_approval", "release_or_deferral_decision"],
      },
    ],
    rework_policy: {
      pass_with_findings_allowed_only_for: ["P2_SHOULD_FIX", "P3_NOTE"],
      rework_required_for: ["failed_test", "missing_hermes_evidence", "missing_claude_review", "security_gap", "permission_or_tenant_isolation_gap", "critical_rp_safety_gate_gap"],
      block_required_for: ["real_client_data_leak", "secret_leak", "cross_tenant_leak", "unauthorized_mutation", "unreviewed_P0_or_P1_finding"],
    },
    checklist: [
      ...subphase.completion_gates.map((gate) => gate.id),
      "tenant_isolation",
      "object_level_authorization",
      "matter_first_traceability",
      "audit_or_evidence_emission",
      "synthetic_fixture_only",
      "hermes_gate",
      "claude_cross_validation",
      ...(overlay.critical_rp ? ["critical_rp_universal_controls", "critical_rp_essential_capabilities", "critical_rp_safety_gates", "critical_rp_research_alignment"] : []),
      ...(refs.length > 0 ? refs.map((ref) => `requirement:${ref.requirement_id}:${ref.anchor_role}`) : []),
    ],
  };
}

function phaseConstructionInspectionFor(entry, implementationSubphases, overlay) {
  return {
    process_name: "페이즈 준공검사",
    applies_to: entry.source_micro_phase_id,
    required: true,
    minimum_final_verdict: "PASS",
    subphase_count: implementationSubphases.length,
    required_subphase_status: "production_ready",
    required_verification_chain: [
      "Codex implementation evidence",
      "product tests or golden cases",
      `${entry.hermes_gate} Hermes evidence`,
      `${entry.claude_gate} Claude Code cross-validation`,
      "human approval where sensitive",
    ],
    critical_rp_overlay_required: overlay.critical_rp,
    closeout_rule: "The parent micro phase cannot close until every child subphase has 준공검사 PASS or an explicit BLOCK routed to a correction subphase.",
  };
}

function subphasesFor(entry, complexity, maps, criticalOverlay) {
  const phaseId = entry.phase_id.slice(-3);
  const profile = phaseProfiles[phaseId] ?? phaseProfiles.P02;
  const program = programById(entry.program_id);
  const perSubphaseHours = roundQuarter(complexity.estimated_hours / complexity.split_count);
  const overlay = hardeningOverlayFor(entry, criticalOverlay);

  return Array.from({ length: complexity.split_count }, (_, index) => {
    const order = index + 1;
    const padded = String(order).padStart(2, "0");
    const title = profile[index % profile.length];
    const id = `${entry.id}.S${padded}`;
    const refs = maps.bySubphase.get(id) ?? [];
    const type = deliverableType(title);
    const completionGates = completionGatesFor(type, refs);
    const subphase = {
      id,
      source_micro_phase_id: entry.id,
      order,
      title,
      deliverable_type: type,
      requirement_refs: refs,
      requirement_ref_count: refs.length,
      completion_status_model: completionStatusModel(refs),
      completion_gates: completionGates,
      critical_rp: overlay.critical_rp,
      saas_hardening_overlay_ref: overlay.critical_rp ? `${entry.program_id}.critical_rp_overlay` : "standard_saas_overlay",
      construction_inspection_required: true,
      construction_inspection_ref: "construction_inspection.v1",
      hermes_validation_required: true,
      hermes_validation_plan_ref: `${entry.hermes_gate}.weighted_subphase_evidence`,
      claude_cross_validation_required: true,
      claude_cross_validation_plan_ref: `${entry.claude_gate}.weighted_subphase_review`,
      estimated_hours: perSubphaseHours,
      objective: subphaseObjective(entry, program, title, order, complexity.split_count, refs),
      acceptance: [
        "The subphase has a concrete file, test, receipt, or blocked-claim deliverable.",
        "No real client, matter, document, billing, settlement, credential, or secret data is used.",
        "Permission, audit, tenant isolation, and Matter-first constraints are considered before closeout.",
        "All SaaS-grade completion gates pass before the subphase can move to production_ready.",
        "준공검사 stages pass with Hermes evidence, Claude Code cross-validation, and human approval where sensitive.",
        ...(overlay.critical_rp ? ["Critical RP SaaS hardening controls and safety gates are explicitly satisfied or blocked with owner and correction route."] : []),
        ...(refs.length > 0 ? refs.map((ref) => `Spec requirement ${ref.requirement_id} is implemented, tested, evidenced, or explicitly blocked for ${ref.anchor_role}.`) : []),
      ],
    };
    return {
      ...subphase,
    };
  });
}

function buildWeightedEntry(entry, maps, criticalOverlayById) {
  const complexity = complexityFor(entry);
  const criticalOverlay = criticalOverlayById.get(entry.program_id);
  const overlay = hardeningOverlayFor(entry, criticalOverlay);
  const implementationSubphases = subphasesFor(entry, complexity, maps, criticalOverlay);
  const requirementRefs = maps.byMicroPhase.get(entry.id) ?? [];
  return {
    source_micro_phase_id: entry.id,
    program_id: entry.program_id,
    program_title: entry.program_title,
    phase_id: entry.phase_id,
    phase_title: entry.phase_title,
    micro_id: entry.micro_id,
    micro_title: entry.micro_title,
    source_objective: entry.objective,
    ai_owner: entry.ai_owner,
    hermes_gate: entry.hermes_gate,
    claude_gate: entry.claude_gate,
    commands: entry.commands,
    weight: complexity.weight,
    complexity_score: complexity.score,
    estimated_hours: complexity.estimated_hours,
    estimated_range: complexity.estimated_range,
    split_count: complexity.split_count,
    split_rationale: complexity.rationale,
    critical_rp: overlay.critical_rp,
    phase_construction_inspection: phaseConstructionInspectionFor(entry, implementationSubphases, overlay),
    requirement_refs: requirementRefs,
    requirement_ref_count: requirementRefs.length,
    implementation_subphases: implementationSubphases,
    status: "planned",
  };
}

function distribution(entries) {
  const weights = { L: 0, M: 0, H: 0, XH: 0 };
  const subphases = { L: 0, M: 0, H: 0, XH: 0 };
  const programsById = {};
  let estimatedHours = 0;
  let subphaseCount = 0;

  for (const entry of entries) {
    weights[entry.weight] += 1;
    subphases[entry.weight] += entry.split_count;
    estimatedHours += entry.estimated_hours;
    subphaseCount += entry.split_count;
    programsById[entry.program_id] ??= { program_id: entry.program_id, program_title: entry.program_title, L: 0, M: 0, H: 0, XH: 0, subphase_count: 0, estimated_hours: 0 };
    programsById[entry.program_id][entry.weight] += 1;
    programsById[entry.program_id].subphase_count += entry.split_count;
    programsById[entry.program_id].estimated_hours = roundQuarter(programsById[entry.program_id].estimated_hours + entry.estimated_hours);
  }

  return {
    weight_counts: weights,
    subphase_counts_by_weight: subphases,
    implementation_subphase_count: subphaseCount,
    estimated_hours_total: roundQuarter(estimatedHours),
    estimated_person_days_total: roundQuarter(estimatedHours / 8),
    programs: Object.values(programsById).sort((a, b) => a.program_id.localeCompare(b.program_id)),
  };
}

function markdownFor(ledger) {
  const lines = [];
  lines.push("# Law Firm OS Weighted Implementation Ledger v1");
  lines.push("");
  lines.push("Purpose: convert the 3,300 planning micro phases into implementation-weighted slices. Heavier phases receive more implementation subphases.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Source micro phases: ${ledger.source_micro_phase_count}`);
  lines.push(`- Implementation subphases: ${ledger.implementation_subphase_count}`);
  lines.push(`- Spec requirements attached: ${ledger.requirement_count}`);
  lines.push(`- Subphase requirement refs: ${ledger.subphase_requirement_ref_count}`);
  lines.push("- Minimum subphase closeout status: production_ready");
  lines.push("- Required closeout chain: implemented -> tested -> Hermes evidence -> Claude review -> UX/performance/security where applicable -> production_ready");
  lines.push("- Internal 준공검사 meaning: 54,355 subphases production_ready + 227 requirements covered + Hermes pass + Claude pass + UX/performance/security/operations gates pass = SaaS-grade product candidate");
  lines.push("- Market SaaS recognition requires customer pilots, migration rehearsal, feedback loops, incident/load/security rehearsal, onboarding/support operations, and post-release defect loops.");
  lines.push(`- Critical RP hardening overlay: ${ledger.critical_rp_count} RPs, ${ledger.critical_rp_subphase_count} implementation subphases`);
  lines.push(`- Estimated hours: ${ledger.estimated_hours_total}`);
  lines.push(`- Estimated person-days at 8h/day: ${ledger.estimated_person_days_total}`);
  lines.push("- Weight bands: L=0.5-2h, M=2-6h, H=1-3d, XH=3d-2w+");
  lines.push("");
  lines.push("## Weight Distribution");
  lines.push("");
  lines.push("| Weight | Source phases | Implementation subphases | Rule |");
  lines.push("|---|---:|---:|---|");
  for (const weight of ["L", "M", "H", "XH"]) {
    const rule = weight === "L" ? "1-2 subphases" : weight === "M" ? "3-5 subphases" : weight === "H" ? "8-15 subphases" : "20-50 subphases";
    lines.push(`| ${weight} | ${ledger.weight_counts[weight]} | ${ledger.subphase_counts_by_weight[weight]} | ${rule} |`);
  }
  lines.push("");
  lines.push("## Program Distribution");
  lines.push("");
  lines.push("| RP | Program | L | M | H | XH | Subphases | Est. hours |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---:|");
  for (const row of ledger.program_distribution) {
    lines.push(`| ${row.program_id} | ${row.program_title} | ${row.L} | ${row.M} | ${row.H} | ${row.XH} | ${row.subphase_count} | ${row.estimated_hours} |`);
  }
  lines.push("");
  lines.push("## Implementation Ledger");
  lines.push("");
  for (const entry of ledger.entries) {
    lines.push(`### ${entry.source_micro_phase_id} | ${entry.weight} | ${entry.split_count} subphases | ${entry.estimated_hours}h`);
    lines.push("");
    lines.push(`${entry.program_title} / ${entry.phase_title} / ${entry.micro_title}`);
    lines.push("");
    lines.push(`준공검사: ${entry.phase_construction_inspection.required ? "required" : "not required"} | Hermes ${entry.hermes_gate} | Claude ${entry.claude_gate} | Critical RP: ${entry.critical_rp ? "yes" : "no"}`);
    lines.push("");
    lines.push(`Source objective: ${entry.source_objective}`);
    if (entry.requirement_ref_count > 0) {
      lines.push("");
      lines.push(`Requirement refs: ${entry.requirement_refs.map((ref) => `${ref.requirement_id}:${ref.anchor_role}`).join(", ")}`);
    }
    lines.push("");
    for (const subphase of entry.implementation_subphases) {
      const refs = subphase.requirement_ref_count > 0 ? ` | req: ${subphase.requirement_refs.map((ref) => `${ref.requirement_id}:${ref.anchor_role}`).join(", ")}` : "";
      const inspection = subphase.construction_inspection_required ? " | 준공검사" : "";
      const hardening = subphase.critical_rp ? " | critical-saas" : "";
      lines.push(`- ${subphase.id} | ${subphase.deliverable_type} | ${subphase.title} | ${subphase.estimated_hours}h | gates: ${subphase.completion_gates.length}${inspection}${hardening}${refs}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

const sourceLedger = JSON.parse(await readFile(SOURCE_LEDGER_PATH, "utf8"));
const requirementLedger = await readRequirementLedger();
const criticalRpHardening = JSON.parse(await readFile(CRITICAL_RP_HARDENING_PATH, "utf8"));
const criticalOverlayById = new Map((criticalRpHardening.rp_overlays ?? []).map((overlay) => [overlay.id, overlay]));
const maps = requirementMaps(requirementLedger.requirements ?? []);
const entries = sourceLedger.entries.map((entry) => buildWeightedEntry(entry, maps, criticalOverlayById));
const summary = distribution(entries);
const requirementRefCount = entries.reduce((sum, entry) => sum + entry.requirement_ref_count, 0);
const subphaseRequirementRefCount = entries.reduce((sum, entry) => sum + entry.implementation_subphases.reduce((inner, subphase) => inner + subphase.requirement_ref_count, 0), 0);
const criticalRpSubphaseCount = entries
  .filter((entry) => entry.critical_rp)
  .reduce((sum, entry) => sum + entry.implementation_subphases.length, 0);

const weightedLedger = {
  schema_version: "law-firm-os.weighted-implementation-ledger.v1",
  generated_from: "scripts/generate-weighted-implementation-ledger.mjs",
  source_ledger: "docs/full-spec-microphase-ledger.json",
  requirement_ledger: "docs/spec-requirement-ledger.json",
  critical_rp_hardening_contract: "contracts/critical-rp-saas-hardening-contract.json",
  source_micro_phase_count: sourceLedger.entries.length,
  requirement_count: requirementLedger.requirements?.length ?? 0,
  critical_rp_count: criticalRpHardening.critical_rp_ids?.length ?? 0,
  critical_rp_ids: criticalRpHardening.critical_rp_ids ?? [],
  critical_rp_subphase_count: criticalRpSubphaseCount,
  requirement_ref_count: requirementRefCount,
  subphase_requirement_ref_count: subphaseRequirementRefCount,
  release_program_count: programs.length,
  standard_phase_count: standardPhases.length,
  weight_policy: {
    scoring: "program_complexity + phase_delta + micro_delta, clamped to L/M/H/XH",
    L: { estimated_range: "0.5-2h", split_count: "1-2" },
    M: { estimated_range: "2-6h", split_count: "3-5" },
    H: { estimated_range: "1-3d", split_count: "8-15" },
    XH: { estimated_range: "3d-2w+", split_count: "20-50" },
  },
  saas_completion_policy: {
    minimum_closeout_status: "production_ready",
    universal_gates: ["implemented", "tests", "permission_audit", "hermes_validation", "claude_cross_validation", "human_approval", "production_readiness"],
    typed_gate_groups: ["contract", "implementation", "ui", "test", "fixture", "security_audit", "failure_recovery", "hermes_evidence", "claude_review"],
    phase_done_rule: "A subphase is not done for SaaS-grade purposes until every required completion gate has passing evidence or an explicit BLOCK record.",
    construction_inspection_rule: "Internal 준공검사 passes only when all 54,355 implementation subphases are production_ready, all 227 specification requirements remain covered, Hermes evidence passes, Claude Code cross-validation passes, and UX/performance/security/operations gates pass. This means SaaS-grade product candidate, not automatic market SaaS recognition.",
    critical_rp_rule: "Critical RP subphases must additionally satisfy the research-backed SaaS hardening overlay in contracts/critical-rp-saas-hardening-contract.json.",
  },
  construction_inspection_template: {
    id: "construction_inspection.v1",
    process_name: "준공검사",
    scope: "internal_product_completion_inspection",
    pass_means: "internal_saas_grade_product_candidate",
    pass_does_not_mean: "market_validated_saas",
    minimum_final_verdict: "PASS",
    allowed_verdicts: ["PASS", "PASS_WITH_FINDINGS", "REWORK_REQUIRED", "BLOCK"],
    internal_product_completion_formula: [
      "subphase_54355_all_production_ready",
      "spec_requirement_227_all_covered",
      "hermes_validation_all_passed",
      "claude_cross_validation_all_passed",
      "ux_performance_security_operations_gates_all_passed",
    ],
    stages: [
      "stage_01_codex_self_completion",
      "stage_02_product_verification",
      "stage_03_hermes_gate",
      "stage_04_claude_code_cross_validation",
      "stage_05_human_acceptance",
    ],
    rework_required_for: [
      "failed_test",
      "missing_hermes_evidence",
      "missing_claude_review",
      "security_gap",
      "permission_or_tenant_isolation_gap",
      "critical_rp_safety_gate_gap",
    ],
    block_required_for: [
      "real_client_data_leak",
      "secret_leak",
      "cross_tenant_leak",
      "unauthorized_mutation",
      "unreviewed_P0_or_P1_finding",
    ],
    maturity_ladder: [
      {
        level: "internal_saas_grade_product_candidate",
        criteria: "54,355 subphases production_ready, 227 requirements covered, Hermes passed, Claude passed, and UX/performance/security/operations gates passed.",
      },
      {
        level: "actual_work_usable_saas",
        criteria: "3-5 customer pilots pass with real workflow feedback, migration rehearsal, support handling, and defect correction.",
      },
      {
        level: "market_saas_grade",
        criteria: "Paid customers, operational metrics, incident response, security review, onboarding/support operations, and post-release defect loop are stable.",
      },
    ],
  },
  market_validation_template: {
    id: "market_validation.v1",
    starts_after: "construction_inspection.v1 PASS",
    required_for_market_saas_grade: true,
    required_activities: [
      "actual_customer_pilot_3_to_5_sites",
      "migration_rehearsal_with_realistic_business_data",
      "customer_feedback_triage_and_fix_loop",
      "incident_load_security_rehearsal",
      "pricing_permission_support_onboarding_operations",
      "post_release_defect_correction_loop",
    ],
    maturity_rule: "준공검사 PASS creates a SaaS-grade product candidate. Market SaaS-grade requires this market validation template to pass after launch rehearsal and customer pilot.",
  },
  hermes_validation_template: {
    ref_suffix: "weighted_subphase_evidence",
    verdicts: ["PASS", "PASS_WITH_FINDINGS", "BLOCK"],
    required_evidence: ["commands_executed", "command_results", "changed_files", "fixture_summary", "requirement_refs", "blocked_claims", "permission_audit_summary", "no_real_data_confirmation"],
    boundary_rule: "Hermes validates evidence and blocked claims, but does not own product code or silently mutate product state.",
  },
  claude_cross_validation_template: {
    ref_suffix: "weighted_subphase_review",
    verdicts: ["PASS", "PASS_WITH_FINDINGS", "BLOCK"],
    review_focus: ["architecture_soundness", "security_bypass_paths", "permission_and_tenant_isolation", "audit_and_evidence_completeness", "missing_tests", "unsafe_ai_or_tool_authority", "go_no_go_verdict"],
    finding_severity: ["P0_BLOCKER", "P1_MUST_FIX", "P2_SHOULD_FIX", "P3_NOTE"],
    closeout_rule: "P0/P1 findings route to correction subphases before production_ready closeout.",
  },
  weight_counts: summary.weight_counts,
  subphase_counts_by_weight: summary.subphase_counts_by_weight,
  implementation_subphase_count: summary.implementation_subphase_count,
  estimated_hours_total: summary.estimated_hours_total,
  estimated_person_days_total: summary.estimated_person_days_total,
  program_distribution: summary.programs,
  entries,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_PATH, `${JSON.stringify(weightedLedger, null, 2)}\n`);
await writeFile(MD_PATH, markdownFor(weightedLedger));

console.log("Generated weighted implementation ledger.");
console.log(`source_micro_phase_count: ${weightedLedger.source_micro_phase_count}`);
console.log(`implementation_subphase_count: ${weightedLedger.implementation_subphase_count}`);
console.log(`estimated_hours_total: ${weightedLedger.estimated_hours_total}`);
console.log(JSON_PATH);
console.log(MD_PATH);
