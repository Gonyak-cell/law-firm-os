import {
  APPROVED_LICENSES, CLIENT_GRAPH_SCOPES, CLIENT_OAUTH_SCOPES, FORBIDDEN_BUILD_SUFFIXES,
  FORBIDDEN_BUILD_TEXT, MANIFEST_PATHS, PRODUCT_IDS, PROFILE_CONTRACTS, PROFILE_NAMES,
  REQUIRED_COMMON_HOST_SCENARIOS, REQUIRED_HOSTS, REQUIRED_PREREQUISITES,
  REQUIRED_PROOF_CLASSES, REQUIRED_RELEASE_PATHS, REQUIRED_STATIC_PATHS, REQUIRED_TEST_PATHS,
  STATIC_NAMESPACES,
} from "./constants.mjs";
import { assertEqual, canonical, sorted } from "./primitives.mjs";

export function validateReleaseContract(contract) {
  if (contract?.schema_version !== 1) throw new Error("Outlook release gate schema_version must be 1");
  if (contract.release_version !== "1.1.0.0" || contract.rollback_version !== "1.0.1.1") {
    throw new Error("Outlook release and rollback versions drifted");
  }
  const profiles = contract.profiles ?? [];
  assertEqual(sorted(profiles.map(({ product_id }) => product_id)), sorted(PRODUCT_IDS), "release ProductIds");
  assertEqual(sorted(profiles.map(({ profile }) => profile)), sorted(PROFILE_NAMES), "release profiles");
  if (profiles.some(({ permission }) => permission !== "ReadItem")) throw new Error("release permission broadened");
  for (const profile of profiles) {
    const expected = PROFILE_CONTRACTS[profile.product_id];
    if (!expected || profile.profile !== expected.profile
      || profile.mailbox_min_version !== expected.mailbox_min_version
      || profile.production_manifest !== expected.production_manifest
      || profile.taskpane_html !== expected.taskpane_html) {
      throw new Error(`release profile identity/path mapping drifted: ${profile.product_id}`);
    }
    assertEqual(sorted(profile.required_static_paths ?? []), sorted(expected.required_static_paths), `${profile.profile} required static paths`);
  }
  assertEqual(sorted(contract.manifests ?? []), sorted(MANIFEST_PATHS), "release manifests");
  assertEqual(sorted(contract.client_outlook_graph_connection_scopes ?? []), sorted(CLIENT_GRAPH_SCOPES), "Client Outlook Graph scopes");
  assertEqual(sorted(contract.client_outlook_oauth_scopes ?? []), sorted(CLIENT_OAUTH_SCOPES), "Client Outlook OAuth scopes");
  assertEqual(sorted(contract.allowed_dependency_licenses ?? []), sorted(APPROVED_LICENSES), "dependency license allowlist");
  assertEqual(contract.required_dependencies, { docx: "MIT", "docusign-esign": "MIT" }, "required release dependencies");
  assertEqual(sorted(contract.required_release_paths ?? []), sorted(REQUIRED_RELEASE_PATHS), "required release paths");
  assertEqual(sorted(contract.required_test_paths ?? []), sorted(REQUIRED_TEST_PATHS), "required release tests");
  if (contract.build?.root !== "apps/addin/dist") throw new Error("Add-in build root drifted");
  assertEqual(contract.build?.command, ["npm", "--workspace", "apps/addin", "run", "build"], "Add-in build command");
  assertEqual(sorted(contract.build?.required_static_paths ?? []), sorted(REQUIRED_STATIC_PATHS), "required Add-in artifacts");
  assertEqual(sorted(contract.build?.forbidden_path_suffixes ?? []), sorted(FORBIDDEN_BUILD_SUFFIXES), "forbidden Add-in suffixes");
  assertEqual(sorted(contract.build?.forbidden_text_patterns ?? []), sorted(FORBIDDEN_BUILD_TEXT), "forbidden Add-in content markers");
  if (contract.api?.function_name !== "matter-lawos-api-prod" || contract.api?.aws_account_id !== "770880870480"
    || contract.api?.region !== "ap-northeast-2" || contract.api?.embedded_manifest_path !== "deployment-manifest.json") {
    throw new Error("API release target drifted");
  }
  if (JSON.stringify(canonical(contract.static_deploy?.namespaces)) !== JSON.stringify(canonical(STATIC_NAMESPACES))
    || JSON.stringify(contract.static_deploy?.protected_prefixes) !== JSON.stringify(["addin/manifests/"])
    || contract.static_deploy?.delete !== false || contract.static_deploy?.default_mode !== "dry-run") {
    throw new Error("static deployment must default to additive /addin and /outlook-addin dry-run namespaces");
  }
  if (contract.m365?.default_status !== "awaiting_authorized_deployment"
    || contract.m365?.propagation_window_is_sla !== false) {
    throw new Error("M365 release must default to awaiting authorization and a non-SLA observation window");
  }
  assertEqual(contract.m365?.propagation_observation_hours, [0, 24, 48, 72], "M365 propagation schedule");
  assertEqual(sorted(contract.m365?.required_host_evidence ?? []), sorted(REQUIRED_HOSTS), "M365 Outlook hosts");
  assertEqual(sorted(contract.m365?.required_common_host_scenarios ?? []), sorted(REQUIRED_COMMON_HOST_SCENARIOS), "M365 common host scenarios");
  assertEqual(sorted(contract.m365?.required_prerequisites ?? []), sorted(REQUIRED_PREREQUISITES), "M365 prerequisites");
  assertEqual(contract.m365?.required_profile_scenarios, {
    "matter-full": ["read", "compose", "on-message-send"],
    "inquiry-only": ["read"],
  }, "M365 profile scenarios");
  const evidence = contract.m365?.protected_evidence;
  if (evidence?.root_mode !== "read-only" || evidence?.reject_symlinks !== true
    || evidence?.hash_algorithm !== "sha256") {
    throw new Error("M365 protected evidence trust boundary drifted");
  }
  assertEqual(sorted(evidence?.required_proof_classes ?? []), sorted(REQUIRED_PROOF_CLASSES), "M365 proof classes");
  return { profile_count: 2, manifest_count: 4, release_version: contract.release_version };
}
