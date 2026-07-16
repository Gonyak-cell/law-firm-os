import { evaluateProviderReceipt } from "./approvalProviderRunKernel.js";
import { assertNoForbiddenProjection, redactLcxFullValue } from "./readinessModel.js";
import { PEOPLE_FEATURE_GROUPS } from "../people/peopleFeatureCatalog.js";

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;
const SETUP_SECTIONS = Object.freeze([
  "people-role",
  "people-work-profile",
  "people-work-schedule",
  "people-work-schedule-external",
  "people-work-type",
  "people-leave"
]);

const GOVERNANCE_ACTIONS = Object.freeze([
  "people.approval.request",
  "people.permission.assign",
  "people.permission.revoke",
  "people.field_policy.patch",
  "people.connected_app.request"
]);

const INTEGRATION_SCOPES = Object.freeze({
  e_contract: "people.e-contract.send",
  payroll: "people.payroll.export",
  message: "people.message.send",
  company_registry: "people.integration.register"
});

function safeRef(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const ref = value.trim();
  return SAFE_REF_PATTERN.test(ref) ? ref : fallback;
}

function allFeatures() {
  return PEOPLE_FEATURE_GROUPS.flatMap((group) => (group.children ?? []).map((feature) => ({ ...feature, groupLabel: group.label })));
}

export function buildPeopleReadinessCatalog() {
  const features = allFeatures();
  const counts = features.reduce((acc, feature) => {
    acc[feature.state] = (acc[feature.state] ?? 0) + 1;
    return acc;
  }, {});
  return Object.freeze({
    catalog_state: "derived_from_people_feature_catalog",
    total_features: features.length,
    state_counts: Object.freeze(counts),
    setup_sections: Object.freeze(features.filter((feature) => SETUP_SECTIONS.includes(feature.section)).map((feature) => feature.section)),
    count_source_hard_coded: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function configurePeopleSetupRows({ sectionRefs = SETUP_SECTIONS, configuredByRef = "actor:people-setup" } = {}) {
  const featuresBySection = new Map(allFeatures().map((feature) => [feature.section, feature]));
  const rows = sectionRefs.map((sectionRef) => {
    const section = safeRef(sectionRef, "people-setup");
    const feature = featuresBySection.get(section);
    return Object.freeze({
      section_ref: section,
      label: feature?.label ?? section,
      group_label: feature?.groupLabel ?? "People",
      setup_state: feature ? "configured" : "blocked",
      configured_by_ref: safeRef(configuredByRef, "actor:people-setup"),
      payroll_calculation_claim: false,
      external_provider_write_claim: false
    });
  });
  return Object.freeze({
    setup_state: rows.every((row) => row.setup_state === "configured") ? "configured" : "blocked",
    rows: Object.freeze(rows),
    payroll_calculation_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function createPeopleGovernancePacket({ approvalTypes = ["leave", "payroll", "permission"], connectedAppProviderReceipt } = {}) {
  const connectedProvider = evaluateProviderReceipt({
    receipt: connectedAppProviderReceipt,
    requiredScope: "people.connected-app.write"
  });
  return Object.freeze({
    approval_type_state: approvalTypes.length > 0 ? "configured" : "blocked",
    approval_types: Object.freeze(approvalTypes.map((type) => safeRef(type)).filter(Boolean)),
    permission_action_state: "owner-audit-required",
    field_policy_state: "sensitive-field-guarded",
    connected_app_state: connectedProvider.allowed ? "request-ready" : "provider-blocked",
    connected_app_provider_reason: connectedProvider.reason,
    governed_actions: GOVERNANCE_ACTIONS,
    direct_permission_mutation_performed: false,
    sensitive_field_exposed: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function createPeopleIntegrationRequest({
  integrationKind,
  providerReceipt,
  ownerReceiptRef = "",
  registryReceiptRef = "registry:people-integration-local"
} = {}) {
  const safeKind = Object.hasOwn(INTEGRATION_SCOPES, integrationKind) ? integrationKind : "company_registry";
  const provider = evaluateProviderReceipt({
    receipt: providerReceipt,
    requiredScope: INTEGRATION_SCOPES[safeKind]
  });
  const registryReady = Boolean(safeRef(registryReceiptRef));
  const ownerReady = Boolean(safeRef(ownerReceiptRef));
  const requestState = !registryReady
    ? "registry-blocked"
    : !ownerReady
      ? "owner-blocked"
      : provider.allowed
        ? "request-ready"
        : "provider-blocked";
  return Object.freeze({
    integration_kind: safeKind,
    provider_scope: INTEGRATION_SCOPES[safeKind],
    request_state: requestState,
    provider_reason: provider.reason,
    provider_receipt_state: provider.receipt.receipt_state,
    registry_receipt_ref: safeRef(registryReceiptRef, "registry:people-integration-local"),
    external_send_performed: false,
    payroll_calculation_performed: false,
    payroll_disbursement_performed: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function assertPeopleWorkflowSafe(value) {
  return assertNoForbiddenProjection(redactLcxFullValue(value));
}
