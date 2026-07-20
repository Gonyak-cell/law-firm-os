const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const REQUIRED_GRAPH_PERMISSIONS = Object.freeze([
  "Application.ReadWrite.All",
  "Group.ReadWrite.All",
  "Policy.ReadWrite.ConditionalAccess",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validatePrivateStagingEntraContract(contract) {
  assert(contract?.schema_version === "law-firm-os.private-staging.entra-pilot.v1", "Entra pilot contract schema is invalid");
  const serialized = JSON.stringify(contract);
  assert(!UUID_PATTERN.test(serialized), "Entra source contract must not contain tenant, client, group, or user object UUID values");
  assert(!EMAIL_PATTERN.test(serialized), "Entra source contract must not contain user principal names or email values");
  assert(contract.tenant_value_in_source === false, "Entra tenant value must be resolved interactively");
  assert(contract.licensing?.conditional_access_minimum === "Microsoft Entra ID P1", "Conditional Access requires Entra ID P1 or higher");
  assert(contract.licensing?.verified_in_source === false && contract.licensing?.interactive_tenant_verification_required === true, "Entra licensing must be verified against the interactive target tenant");
  const app = contract.application;
  assert(app.sign_in_audience === "AzureADMyOrg", "Entra application must be single-tenant");
  assert(app.public_client === true && app.client_secret_required === false, "Entra staging must use public-client PKCE without a client secret");
  assert(app.implicit_id_token === false && app.implicit_access_token === false, "implicit grant must be disabled");
  assert(app.required_resource_access.length === 0, "LawOS OIDC source trace does not justify Microsoft Graph runtime permissions");
  assert(app.redirect_uris.length === 1 && app.redirect_uris[0] === "matter://auth/lawos-private-staging/callback", "staging redirect URI must be exact");
  const optionalClaims = new Map(app.optional_id_token_claims.map((claim) => [claim.name, claim]));
  assert(optionalClaims.get("auth_time")?.essential === true, "auth_time ID token claim is required");
  assert(optionalClaims.get("amr")?.additional_properties?.includes("include_granular_amr"), "granular amr must be requested for pilot verification");
  const policy = contract.conditional_access;
  assert(policy.initial_state === "enabledForReportingButNotEnforced", "Conditional Access must start report-only");
  assert(policy.observation_days_minimum >= 7, "Conditional Access report-only observation must last at least seven days");
  assert(policy.all_users === false && policy.all_cloud_apps === false, "tenant-wide Conditional Access targeting is forbidden");
  assert(policy.enablement_scope === "pilot-group-only", "Conditional Access enablement must remain pilot-only");
  assert(policy.grant_control === "authenticationStrength" && policy.authentication_strength === "built-in-phishing-resistant-mfa", "phishing-resistant authentication strength is required");
  const emergency = contract.emergency_access;
  assert(emergency.minimum_cloud_only_accounts >= 2, "at least two cloud-only emergency accounts are required");
  assert(emergency.fido2_physical_registration_required === true, "physical FIDO2 emergency registration is required");
  assert(emergency.human_administrator_only === true, "emergency access must remain a human administrator step");
  assert(emergency.automation_user_creation === false && emergency.automation_role_assignment === false, "automation must not create or role-assign emergency accounts");
  assert(emergency.lawos_application_break_glass_separate === true, "Entra emergency access and LawOS break-glass must remain separate");
  const graph = contract.graph_authority;
  assert(graph.application_permission_grant === false && graph.bootstrap_application_credential === false, "Graph application permissions or bootstrap credentials are forbidden");
  assert(JSON.stringify([...graph.required_delegated_permissions].sort()) === JSON.stringify([...REQUIRED_GRAPH_PERMISSIONS].sort()), "Graph delegated permission set drifted");
  assert(graph.forbidden_permissions.includes("Directory.ReadWrite.All"), "broad directory write permission must be explicitly forbidden");
  assert(graph.forbidden_permissions.includes("RoleManagement.ReadWrite.Directory") && graph.forbidden_permissions.includes("User.ReadWrite.All"), "emergency account and role mutation permissions must be forbidden to automation");
  assert(contract.evidence.token_material_recorded === false && contract.evidence.raw_sign_in_logs_recorded === false, "Entra evidence must not contain token material or raw sign-in logs");
  return Object.freeze({
    verdict: "PASS_WITH_EXTERNAL_PREREQUISITES",
    report_only_minimum_days: policy.observation_days_minimum,
    tenant_wide_policy_count: 0,
    runtime_graph_permission_count: app.required_resource_access.length,
    delegated_configuration_permission_count: graph.required_delegated_permissions.length,
    physical_fido2_operator_step_required: true,
    current_session_scope_upgrade_required: true,
    conditional_access_license_external_verification_required: true,
    production_ready_claim: false,
  });
}
