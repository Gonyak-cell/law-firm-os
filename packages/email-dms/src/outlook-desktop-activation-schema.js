export const OUTLOOK_DESKTOP_ACTIVATION_MODE = "operator_controlled_macos_v1";
export const OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_SCHEMA =
  "lawos.outlook-desktop-activation-challenge.v1";
export const OUTLOOK_DESKTOP_OPERATOR_RECEIPT_SCHEMA =
  "lawos.outlook-desktop-operator-activation.v1";
export const OUTLOOK_DESKTOP_ACTIVATION_CHALLENGE_MAX_LIFETIME_MS = 30 * 60 * 1000;
export const OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_LIFETIME_MS = 10 * 60 * 1000;
export const OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES = 32_768;

export const OPERATOR_RECEIPT_SOURCE = "law-firm-os.outlook-desktop-activation";
export const OPERATOR_RECEIPT_TYPE = "outlook-desktop-operator-activation";
export const OPERATOR_ROLE = "outlook-desktop-activation-operator";
export const OPERATOR_OPERATION = "authorize-outlook-desktop-activation";
export const OPERATOR_SCOPE = `${OUTLOOK_DESKTOP_ACTIVATION_MODE}:jwsuh_canary`;
export const CHALLENGE_NONCE_BYTES = 32;
export const ACTIVATION_ID_RANDOM_BYTES = 18;
export const BLOCKED_DOWNSTREAM = "BLOCKED_DOWNSTREAM";

export const SHA1 = /^[0-9a-f]{40}$/u;
export const SHA256 = /^[0-9a-f]{64}$/u;
export const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
export const ACTIVATION_ID = /^oda_[A-Za-z0-9_-]{24}$/u;
export const ENTRA_TENANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
export const TEAM_ID = /^[A-Z0-9]{10}$/u;
export const BASE64URL = /^[A-Za-z0-9_-]+$/u;
export const FORBIDDEN_PRIVACY_KEY = /(?:^|_)(?:email|e_mail|host_serial|serial_number|hardware_uuid|device_uuid|uuid|username|user_name|path|token|private_key|privatekey)(?:$|_)/iu;

export const ISSUE_KEYS = Object.freeze([
  "approved_release", "authenticated_principal", "candidate_device", "pilot_policy",
]);
export const CHALLENGE_KEYS = Object.freeze([
  "activation_binding_sha256", "activation_id", "activation_mode", "approved_release",
  "authenticated_principal", "candidate_device", "challenge_nonce_base64url",
  "challenge_nonce_sha256", "expires_at", "hardware_key_attested", "issued_at",
  "local_measurement_evidence_sha256", "mdm_attested", "pilot_policy",
  "remote_app_attested", "schema_version",
]);
export const REQUEST_KEYS = Object.freeze([
  "activation_binding_sha256", "activation_id", "activation_mode", "approved_release",
  "authenticated_principal", "candidate_device", "challenge_nonce_base64url",
  "hardware_key_attested", "local_measurement_evidence_sha256", "mdm_attested",
  "pilot_policy", "remote_app_attested",
]);
export const PRINCIPAL_KEYS = Object.freeze([
  "entra_subject", "entra_tenant_id", "lawos_tenant_id", "lawos_user_id",
]);
export const DEVICE_KEYS = Object.freeze([
  "continuity_key_fingerprint_sha256", "continuity_public_key_spki",
]);
export const POLICY_KEYS = Object.freeze([
  "owner_principal_id", "pilot_id", "policy_revision", "roster_sha256",
]);
export const RELEASE_KEYS = Object.freeze([
  "app_id", "app_version", "approval_sha256", "arch", "channel",
  "embedded_build_manifest_sha256", "macos_code_directory_sha256",
  "macos_designated_requirement_sha256", "macos_team_id",
  "macos_technical_evidence_sha256", "measured_inner_artifact_bytes",
  "measured_inner_artifact_sha256", "platform", "registered_final_artifact_bytes",
  "registered_final_artifact_sha256", "release_artifact_id", "release_ticket_id",
  "release_ticket_sha256", "release_ticket_signature_sha256", "source_sha",
  "source_tree", "tenant_id", "trust_registry_serial", "trust_registry_sha256",
  "valid", "valid_until",
]);
export const BINDING_KEYS = Object.freeze([
  "activation_id", "activation_mode", "approved_release", "authenticated_principal",
  "candidate_device", "hardware_key_attested", "local_measurement_evidence_sha256",
  "mdm_attested", "pilot_policy", "remote_app_attested",
]);
export const VERIFICATION_KEYS = Object.freeze([
  "activation_request", "issued_challenge", "operator_receipt_bytes",
  "operator_receipt_signature_bytes", "release_ticket_bytes",
  "release_ticket_signature_bytes",
]);
export const RECEIPT_KEYS = Object.freeze([
  "activation_binding_sha256", "bindings", "challenge_nonce_sha256", "expires_at",
  "issued_at", "key_id", "local_measurement_evidence_sha256", "operation",
  "operator_local_package_verified", "production_ready_claim", "receipt_source",
  "receipt_type", "schema_version", "signer_role", "signer_scope",
]);
export const CONSUMPTION_KEYS = Object.freeze([
  "activation_binding_sha256", "activation_id", "challenge_nonce_sha256",
  "replay_identity_sha256",
]);
