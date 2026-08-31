import { OUTLOOK_OPERATION_STATES } from "./outlook-operation-state.js";

const SCHEMA_VERSION = "lawos.outlook-readiness.v1";
const MATTER_PRODUCT_ID = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
const INSTALLATION_SOURCE = "lawos_outlook_desktop_installations";
const CONNECTION_SOURCE = "lawos_m365_connection_state";
const ENTITLEMENT_SOURCE = "lawos_outlook_desktop_entitlement_roster";
const IDENTITY_SOURCE = "lawos_signed_session";
const PRINCIPAL_REF = /^odpr_[A-Za-z0-9_-]{43}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;

export const OUTLOOK_READINESS_ACTIONS = Object.freeze({
  none: null,
  confirmMicrosoft: "confirm_microsoft",
  refresh: "refresh",
});

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function snapshotDataObject(value, keys) {
  if (!isObject(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if ((prototype !== Object.prototype && prototype !== null)
      || !Reflect.ownKeys(descriptors).every((key) => Object.hasOwn(descriptors[key], "value"))) return null;
  return Object.freeze(Object.fromEntries(keys
    .filter((key) => Object.hasOwn(descriptors, key))
    .map((key) => [key, descriptors[key].value])));
}

function snapshotDataArray(value) {
  if (!Array.isArray(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length?.value;
  if (!Number.isSafeInteger(length) || length < 0
      || !Reflect.ownKeys(descriptors).every((key) => Object.hasOwn(descriptors[key], "value"))) return null;
  const entries = Array.from({ length }, (_, index) => descriptors[index]);
  return entries.every((entry) => entry && Object.hasOwn(entry, "value"))
    ? Object.freeze(entries.map((entry) => entry.value))
    : null;
}

const ITEM_KEYS = ["schema_version", "entitlement", "identity_binding", "enterprise_app_assignment", "central_deployment", "client_propagation", "installation", "delegated_connection", "snapshot", "next_action", "browser_required", "safe_error_codes", "user_connection_revoke_requested", "provider_runtime_executed", "admin_runtime_executed", "trusted", "release_trust_state"];
const AXIS_KEYS = ["state", "authoritative", "source", "observed_at"];
const INSTALLATION_KEYS = ["installation_id", "state", "state_version", "release_trusted", "lease_expires_at", "retired_at", "source", "trusted", "release_trust_state"];
const CONNECTION_KEYS = ["state", "state_version", "expires_at", "source", "observed_at"];
const SNAPSHOT_KEYS = ["observed_at", "consistency", "version_vector"];
const VECTOR_KEYS = ["roster_version", "installation_state_version", "delegated_connection_state_version"];
const TASKPANE_SELF_OBSERVED_ERROR_CODES = new Set([
  "OUTLOOK_READINESS_ASSIGNMENT_UNKNOWN",
  "OUTLOOK_READINESS_DEPLOYMENT_UNKNOWN",
  "OUTLOOK_READINESS_PROPAGATION_UNKNOWN",
]);

function snapshotReadiness(body) {
  const root = snapshotDataObject(body, ["outcome", "item"]);
  const item = snapshotDataObject(root?.item, ITEM_KEYS);
  if (!root || !item) return null;
  const nested = {
    entitlement: snapshotDataObject(item.entitlement, ["state", "source", "roster_version"]),
    identity_binding: snapshotDataObject(item.identity_binding, ["state", "source", "principal_ref"]),
    enterprise_app_assignment: snapshotDataObject(item.enterprise_app_assignment, AXIS_KEYS),
    central_deployment: snapshotDataObject(item.central_deployment, [...AXIS_KEYS, "product_id", "manifest_version"]),
    client_propagation: snapshotDataObject(item.client_propagation, AXIS_KEYS),
    installation: snapshotDataObject(item.installation, INSTALLATION_KEYS),
    delegated_connection: snapshotDataObject(item.delegated_connection, CONNECTION_KEYS),
    snapshot: snapshotDataObject(item.snapshot, SNAPSHOT_KEYS),
  };
  const versionVector = snapshotDataObject(nested.snapshot?.version_vector, VECTOR_KEYS);
  const safeErrorCodes = snapshotDataArray(item.safe_error_codes);
  if (!versionVector || !safeErrorCodes || !Object.values(nested).every(Boolean)) return null;
  nested.snapshot = Object.freeze({ ...nested.snapshot, version_vector: versionVector });
  return Object.freeze({ outcome: root.outcome, item: Object.freeze({ ...item, ...nested, safe_error_codes: safeErrorCodes }) });
}

const validInstant = (value) => typeof value === "string"
  && Number.isFinite(Date.parse(value));

const positiveVersion = (value) => Number.isSafeInteger(value) && value > 0;

function authoritativeAxis(axis, state) {
  return axis?.state === state
    && axis.authoritative === true
    && typeof axis.source === "string"
    && axis.source.length > 0
    && validInstant(axis.observed_at);
}

function authoritativeSnapshot(item) {
  const snapshot = item?.snapshot;
  const vector = snapshot?.version_vector;
  return snapshot?.consistency === "component_versioned"
    && validInstant(snapshot?.observed_at)
    && typeof vector?.roster_version === "string"
    && vector.roster_version === item?.entitlement?.roster_version
    && vector.installation_state_version
      === item?.installation?.state_version
    && vector.delegated_connection_state_version
      === item?.delegated_connection?.state_version;
}

function authoritativeInstallation(
  item,
  {
    requireInstallationId = true,
    requireReleaseTrust = true,
  } = {},
) {
  const installation = item?.installation;
  const snapshotAt = Date.parse(item?.snapshot?.observed_at);
  const installationIdValid = !Object.hasOwn(installation, "installation_id")
    || (typeof installation.installation_id === "string"
      && INSTALLATION_ID.test(installation.installation_id));
  const releaseTrustValid = installation?.release_trusted === true
    || (!requireReleaseTrust
      && !Object.hasOwn(installation, "release_trusted"));
  return installation?.state === "active"
    && (requireInstallationId
      ? typeof installation.installation_id === "string"
        && INSTALLATION_ID.test(installation.installation_id)
      : installationIdValid)
    && installation.source === INSTALLATION_SOURCE
    && releaseTrustValid
    && positiveVersion(installation.state_version)
    && validInstant(installation.lease_expires_at)
    && Date.parse(installation.lease_expires_at) > snapshotAt
    && installation.retired_at === null;
}

function authoritativeConnection(item) {
  const connection = item?.delegated_connection;
  return connection?.state === "connected"
    && connection.source === CONNECTION_SOURCE
    && positiveVersion(connection.state_version)
    && validInstant(connection.expires_at)
    && validInstant(connection.observed_at);
}

function validEnvelope(body) {
  const snapshot = snapshotReadiness(body);
  if (!snapshot) return null;
  const { outcome, item } = snapshot;
  if (
    outcome !== "passed"
    || item.schema_version !== SCHEMA_VERSION
    || typeof item.browser_required !== "boolean"
    || !item.safe_error_codes.every((code) => typeof code === "string")
    || item.user_connection_revoke_requested !== false
    || item.provider_runtime_executed !== false
    || item.admin_runtime_executed !== false
  ) return null;
  return item;
}

function explicitReleaseTrustConflict(item) {
  return item.trusted === false
    || item.release_trust_state === "revoked"
    || item.installation?.trusted === false
    || item.installation?.release_trust_state === "revoked";
}

function authoritativeReady(item, options = {}) {
  return item.next_action === "none"
    && item.browser_required === false
    && item.safe_error_codes.length === 0
    && item.entitlement?.state === "approved"
    && item.entitlement?.source === ENTITLEMENT_SOURCE
    && typeof item.entitlement?.roster_version === "string"
    && item.entitlement.roster_version.length > 0
    && item.identity_binding?.state === "verified"
    && item.identity_binding?.source === IDENTITY_SOURCE
    && authoritativeAxis(item.enterprise_app_assignment, "assigned")
    && authoritativeAxis(item.central_deployment, "targeted")
    && item.central_deployment?.product_id === MATTER_PRODUCT_ID
    && typeof item.central_deployment?.manifest_version === "string"
    && item.central_deployment.manifest_version.length > 0
    && authoritativeAxis(item.client_propagation, "observed")
    && !explicitReleaseTrustConflict(item)
    && authoritativeInstallation(item, options)
    && authoritativeConnection(item)
    && authoritativeSnapshot(item);
}

function taskpaneSelfObservedReady(item) {
  const safeErrorCodes = item?.safe_error_codes;
  const externalAxes = [
    item?.enterprise_app_assignment,
    item?.central_deployment,
    item?.client_propagation,
  ];
  return item?.next_action === "contact_admin"
    && item?.browser_required === false
    && Array.isArray(safeErrorCodes)
    && safeErrorCodes.length === TASKPANE_SELF_OBSERVED_ERROR_CODES.size
    && safeErrorCodes.every((code) => TASKPANE_SELF_OBSERVED_ERROR_CODES.has(code))
    && [...TASKPANE_SELF_OBSERVED_ERROR_CODES]
      .every((code) => safeErrorCodes.includes(code))
    && externalAxes.every((axis) => axis?.state === "unknown"
      && axis.authoritative === false
      && axis.source === null
      && axis.observed_at === null)
    && item.central_deployment?.product_id === MATTER_PRODUCT_ID
    && item.central_deployment?.manifest_version === null
    && item.entitlement?.state === "approved"
    && item.entitlement?.source === ENTITLEMENT_SOURCE
    && typeof item.entitlement?.roster_version === "string"
    && item.entitlement.roster_version.length > 0
    && item.identity_binding?.state === "verified"
    && item.identity_binding?.source === IDENTITY_SOURCE
    && !explicitReleaseTrustConflict(item)
    && authoritativeInstallation(item)
    && authoritativeConnection(item)
    && authoritativeSnapshot(item);
}

export function parseOutlookStartupBinding(
  body,
  options = {},
) {
  try {
    const optionSnapshot = options === null
      ? {}
      : snapshotDataObject(options, ["principal_ref", "taskpane_self_observed"]);
    if (!optionSnapshot) return null;
    const expectedPrincipalRef = optionSnapshot.principal_ref ?? null;
    const taskpaneSelfObserved = optionSnapshot.taskpane_self_observed === true;
    if (optionSnapshot.taskpane_self_observed !== undefined
        && typeof optionSnapshot.taskpane_self_observed !== "boolean") return null;
    const item = validEnvelope(body);
    if (!item || (!authoritativeReady(item)
        && !(taskpaneSelfObserved && taskpaneSelfObservedReady(item)))) return null;
    const principalRef = item.identity_binding?.principal_ref;
    const installation = item.installation;
    if (
      typeof principalRef !== "string"
      || !PRINCIPAL_REF.test(principalRef)
      || (expectedPrincipalRef !== null
        && (typeof expectedPrincipalRef !== "string"
          || expectedPrincipalRef !== principalRef))
      || typeof installation?.installation_id !== "string"
      || !INSTALLATION_ID.test(installation.installation_id)
      || !positiveVersion(installation.state_version)
      || !positiveVersion(item.delegated_connection?.state_version)
    ) return null;
    return Object.freeze({
      principal_ref: principalRef,
      installation_id: installation.installation_id,
      installation_state_version: installation.state_version,
      delegated_connection_state_version: item.delegated_connection.state_version,
    });
  } catch {
    return null;
  }
}

export function presentOutlookReadiness(body) {
  const item = validEnvelope(body);
  if (!item) return null;

  if (authoritativeReady(item, {
    requireInstallationId: false,
    requireReleaseTrust: false,
  })) {
    return Object.freeze({
      status: OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: "Outlook 연결 준비됨",
      fullMessage: "Outlook 연결과 추가 기능 전파가 확인되었습니다.",
      action: OUTLOOK_READINESS_ACTIONS.none,
      actionLabel: null,
    });
  }

  if (
    item.next_action === "confirm_microsoft"
    && item.browser_required === true
    && item.safe_error_codes.includes("M365_INTERACTION_REQUIRED")
  ) {
    return Object.freeze({
      status: OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: "Microsoft 확인 필요",
      fullMessage: "계정 확인, 동의 또는 추가 인증이 필요할 수 있습니다.",
      action: OUTLOOK_READINESS_ACTIONS.confirmMicrosoft,
      actionLabel: "계정 확인",
    });
  }

  if (
    item.next_action === "relaunch_outlook"
    && item.browser_required === false
    && authoritativeAxis(item.enterprise_app_assignment, "assigned")
    && authoritativeAxis(item.central_deployment, "targeted")
    && item.central_deployment?.product_id === MATTER_PRODUCT_ID
    && typeof item.central_deployment?.manifest_version === "string"
    && item.central_deployment.manifest_version.length > 0
    && authoritativeInstallation(item, {
      requireInstallationId: false,
      requireReleaseTrust: false,
    })
    && authoritativeConnection(item)
    && authoritativeAxis(item.client_propagation, "not_observed")
    && authoritativeSnapshot(item)
  ) {
    return Object.freeze({
      status: OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: "Outlook 추가 기능 전파 확인 필요",
      fullMessage: "Outlook을 완전히 종료한 뒤 다시 열고 상태를 확인해 주세요.",
      action: OUTLOOK_READINESS_ACTIONS.refresh,
      actionLabel: "Outlook 다시 열기",
    });
  }

  return null;
}
