import { OUTLOOK_OPERATION_STATES } from "./outlook-operation-state.js";

const SCHEMA_VERSION = "lawos.outlook-readiness.v1";
const MATTER_PRODUCT_ID = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
const INSTALLATION_SOURCE = "lawos_outlook_desktop_installations";
const CONNECTION_SOURCE = "lawos_m365_connection_state";
const ENTITLEMENT_SOURCE = "lawos_outlook_desktop_entitlement_roster";
const IDENTITY_SOURCE = "lawos_signed_session";

export const OUTLOOK_READINESS_ACTIONS = Object.freeze({
  none: null,
  confirmMicrosoft: "confirm_microsoft",
  refresh: "refresh",
});

const isObject = (value) => value !== null
  && typeof value === "object"
  && !Array.isArray(value);

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

function authoritativeInstallation(item) {
  const installation = item?.installation;
  const snapshotAt = Date.parse(item?.snapshot?.observed_at);
  return installation?.state === "active"
    && installation.source === INSTALLATION_SOURCE
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
  const item = body?.item;
  if (
    body?.outcome !== "passed"
    || !isObject(item)
    || item.schema_version !== SCHEMA_VERSION
    || typeof item.browser_required !== "boolean"
    || !Array.isArray(item.safe_error_codes)
    || !item.safe_error_codes.every((code) => typeof code === "string")
    || item.user_connection_revoke_requested !== false
    || item.provider_runtime_executed !== false
    || item.admin_runtime_executed !== false
  ) return null;
  return item;
}

function authoritativeReady(item) {
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
    && authoritativeInstallation(item)
    && authoritativeConnection(item)
    && authoritativeSnapshot(item);
}

export function presentOutlookReadiness(body) {
  const item = validEnvelope(body);
  if (!item) return null;

  if (authoritativeReady(item)) {
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
    && authoritativeInstallation(item)
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
