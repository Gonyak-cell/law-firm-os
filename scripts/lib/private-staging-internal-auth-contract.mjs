const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const SECRET_MATERIAL_PATTERN = /\b(password_hash|plaintext_password|reset_token|session_secret)\b/iu;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validatePrivateStagingInternalAuthContract(contract) {
  assert(contract?.schema_version === "law-firm-os.private-staging.internal-auth.v1", "internal auth contract schema is invalid");
  const serialized = JSON.stringify(contract);
  assert(!EMAIL_PATTERN.test(serialized), "internal auth source contract must not contain sender or recipient values");
  assert(!SECRET_MATERIAL_PATTERN.test(serialized), "internal auth source contract must not contain credential material fields");
  assert(!/entra/iu.test(serialized.replace('"entra_dependency_count":0', "")), "internal auth contract must not depend on Entra");
  assert(contract.authority === "internal-password", "staff authority must be internal-password");
  const directory = contract.account_directory;
  assert(directory?.authority === "postgres-v2", "account directory must use postgres-v2");
  assert(directory?.table === "lawos_identity.account_memberships", "account membership table drifted");
  assert(directory?.lookup_key === "normalized-email", "registered account lookup must use normalized email");
  assert(directory?.auto_registration === false, "unknown emails must not auto-register");
  assert(directory?.static_roster_operational_fallback === false, "operational static roster fallback is forbidden");
  assert(directory?.tenant_membership_required === true && directory?.disabled_account_denied === true, "tenant membership and disabled-account denial are required");
  const firstUse = contract.first_use;
  assert(firstUse?.imported_credential_status === "reset_required", "imported accounts must require first-use password setup");
  assert(firstUse?.plaintext_or_legacy_password_imported === false, "legacy password material must not be imported");
  assert(firstUse?.request_response_enumeration_safe === true, "password setup request must be enumeration safe");
  assert(firstUse?.reset_token_stored_as_hash_only === true && firstUse?.reset_token_single_use === true, "reset tokens must be hash-only and single-use");
  assert(firstUse?.reset_token_ttl_seconds === 60, "synthetic staging password setup token TTL must remain one minute");
  assert(firstUse?.password_minimum_length >= 12, "password minimum length must be at least 12");
  assert(firstUse?.password_hash_algorithm === "node-scrypt-v1", "password hash contract drifted");
  assert(firstUse?.active_sessions_revoked_on_reset === true, "password reset must revoke active sessions");
  const delivery = contract.delivery;
  assert(delivery?.provider === "aws-ses-v2", "password setup delivery must use AWS SES v2");
  assert(delivery?.vpc_endpoint_service === "com.amazonaws.${AWS::Region}.email", "SES API endpoint service drifted");
  assert(delivery?.internet_egress_required === false, "internal auth delivery must not require internet egress");
  assert(delivery?.synthetic_mailboxes_only === true && delivery?.real_employee_delivery_authorized === false, "staging delivery must remain synthetic only");
  assert(delivery?.sender_or_recipient_values_recorded_in_evidence === false, "auth evidence must not contain addresses");
  const protection = contract.login_protection;
  assert(protection?.max_failed_logins === 5 && protection?.lock_seconds === 60, "login lockout contract drifted");
  assert(protection?.unknown_email_response_indistinguishable === true, "unknown-email response must remain indistinguishable");
  assert(Object.values(contract.secrets ?? {}).every((value) => value === false || value === true), "secret evidence contract is malformed");
  assert(contract.secrets?.password_hashes_in_evidence === false && contract.secrets?.reset_tokens_in_evidence === false, "credential material must not enter evidence");
  assert(contract.secrets?.session_secrets_in_environment === false && contract.secrets?.secret_references_only === true, "session secrets must remain reference-only");
  assert(contract.entra_dependency_count === 0, "Entra dependency count must remain zero");
  return Object.freeze({
    verdict: "PASS",
    authority: contract.authority,
    directory_authority: directory.authority,
    first_use_reset_required: true,
    reset_token_ttl_seconds: firstUse.reset_token_ttl_seconds,
    max_failed_logins: protection.max_failed_logins,
    external_identity_prerequisite_count: 0,
    entra_dependency_count: 0,
    real_email_delivery_authorized: false,
    production_ready_claim: false,
  });
}
