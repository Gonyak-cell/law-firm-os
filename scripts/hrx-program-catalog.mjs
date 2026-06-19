import { standardPhases } from "./rp-detailed-plan-catalog.mjs";

export { standardPhases };

export const hrxProgram = {
  id: "RP30",
  title: "People HR Evidence (HRX Embedded)",
  fileBase: "rp30-people-hr-evidence-detailed-microphases",
  scope: "embedded People/HR evidence, HR documents, rule metadata, sensitive HR guards, and HR audit evidence inside Law Firm OS",
  aiOwner: "Codex",
  hermesGate: "H30",
  claudeGate: "C30",
  packageName: "hrx-people",
  hrx_embedded: true,
  primaryFiles: [
    "docs/hrx-integration/hrx-overlay-closeout-pack-map.json",
    "docs/hrx-requirement-ledger.json",
    "docs/hrx-weighted-implementation-ledger.json"
  ],
  entities: [
    "Employee",
    "EmploymentProfile",
    "HRDocument",
    "EmploymentContract",
    "CompensationRecord",
    "LeaveBalance",
    "LeaveRequest",
    "AttendanceRecord",
    "OvertimeRecord",
    "HRPolicy",
    "Candidate",
    "JobOpening",
    "Interview",
    "OnboardingPlan",
    "OffboardingPlan",
    "HRRiskEvent"
  ],
  workflows: [
    "employee registry",
    "hr document workspace",
    "leave and attendance approval",
    "recruitment evidence",
    "onboarding offboarding checklist",
    "hr risk review"
  ],
  uiSurfaces: [
    "HR Operations",
    "Employee Portal",
    "Candidate Portal",
    "AI Review Queue"
  ],
  goldenCases: [
    "employee linked to user",
    "payroll runtime deferred",
    "hr sensitive access denied",
    "hr assistant cites source"
  ],
  risks: [
    "user employee conflation",
    "payroll scope drift",
    "hr sensitive permission leak",
    "ai final judgment overreach",
    "separate product drift"
  ],
};
