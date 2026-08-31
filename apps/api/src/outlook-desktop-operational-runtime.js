import { types } from "node:util";

import {
  assignmentIdentifier,
} from "../../../packages/email-dms/src/outlook-desktop-assignment-contract.js";
import {
  createPostgresOutlookDesktopInstallationAuthorityService,
} from "../../../packages/email-dms/src/postgres-outlook-desktop-installation-authority-service.js";
import {
  createPostgresOutlookDesktopLegacyWindowsCompatibilityService,
} from "../../../packages/email-dms/src/postgres-outlook-desktop-installation-service.js";
import {
  evaluateOutlookDesktopEntitlement,
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
} from "./outlook-desktop-entitlement.js";
import {
  assertPostgresOutlookDesktopLifecycleAuthority,
  createPostgresOutlookDesktopLifecycleAuthority,
} from "../../../packages/email-dms/src/postgres-outlook-desktop-lifecycle-authority.js";
import {
  assertOutlookDesktopActivationReservation,
  assertOutlookDesktopActivationReservationProofBinding,
  assertOutlookDesktopActivationControlPort,
  createPostgresOutlookDesktopActivationControlPort,
} from "./outlook-desktop-activation-authority.js";
import {
  createOutlookDesktopActivationService,
} from "./outlook-desktop-activation-authority-service.js";
import {
  assertOutlookDesktopLifecycleControlPort,
  createOutlookDesktopLifecycleControlPort,
  executeOutlookDesktopLifecycleVerifier,
} from "./outlook-desktop-lifecycle-verifier.js";
import {
  createOutlookDesktopActivationContract,
} from "../../../packages/email-dms/src/outlook-desktop-activation-contract.js";

const AUTHORITY = "postgres-outlook-desktop-installation-authority";
const REQUIRED_METHODS = Object.freeze([
  "register",
  "heartbeat",
  "retire",
  "read",
  "readCurrent",
  "readTrustedCurrent",
  "projectAssignmentState",
]);
const CONTROL_PORT_OPTION_KEYS = Object.freeze([
  "app_pool", "control_pool", "tenant_id", "verifier_pool",
]);
const CONTROL_PORT_KEYS = Object.freeze([
  "outlookDesktopActivationControlPort",
  "outlookDesktopLifecycleControlPort",
]);
const RUNTIME_OPTION_KEYS = Object.freeze([
  "entitlement_roster",
  "entra_tenant_id",
  "outlookDesktopActivationControlPort",
  "outlookDesktopLifecycleControlPort",
  "pool",
  "tenant_id",
]);
const COMPOSED_CONTROL_PORTS = new WeakMap();
export const OUTLOOK_DESKTOP_WINDOWS_INTERNAL_CANARY_PACKAGE_IDENTITY =
  Object.freeze({
    app_version: "0.1.29",
    platform: "win32",
    source_sha: "4df77e1848b52ea455f20b41b9b1c64961bfa1cf",
  });
const CURRENT_INSTALLATION_KEYS = Object.freeze([
  "installation_id",
  "status",
  "platform",
  "app_version",
  "source_sha",
  "registered_at",
  "last_seen_at",
  "lease_expires_at",
  "retired_at",
  "retire_reason",
  "state_version",
]);
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;

function exactDataObject(value, keys, label, { allowMissing = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || types.isProxy(value)) {
    throw new TypeError(`${label} must be an exact data object`);
  }
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw new TypeError(`${label} must be an exact data object`);
  }
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string"
      || !keys.includes(key) || !("value" in descriptors[key]))
      || (!allowMissing && actual.length !== keys.length)) {
    throw new TypeError(`${label} must be an exact data object`);
  }
  return Object.fromEntries(
    keys.filter((key) => Object.hasOwn(descriptors, key))
      .map((key) => [key, descriptors[key].value]),
  );
}

function postgresPool(value, label) {
  if ((!value || (typeof value !== "object" && typeof value !== "function"))
      || types.isProxy(value) || typeof value.connect !== "function") {
    throw new TypeError(`${label} PostgreSQL pool is required`);
  }
  return value;
}

function exactAuthorityService(service) {
  if (
    service?.authority !== AUTHORITY
    || REQUIRED_METHODS.some((method) => typeof service[method] !== "function")
  ) {
    throw new TypeError("007 PostgreSQL authority service is required");
  }
  return service;
}

function rosterAllowsInternalCanary(principal, roster) {
  return evaluateOutlookDesktopEntitlement({
    principal: Object.freeze({
      ...principal,
      scopes: Object.freeze([
        OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
      ]),
    }),
    roster,
  }).eligible === true;
}

function approvedInternalCurrent(value) {
  let current;
  try {
    current = exactDataObject(
      value,
      CURRENT_INSTALLATION_KEYS,
      "current Outlook desktop installation",
    );
  } catch {
    return null;
  }
  const authoritySnapshotAt = new Date();
  const leaseExpiresAt = new Date(current.lease_expires_at);
  if (
    !INSTALLATION_ID.test(current.installation_id)
    || current.status !== "active"
    || current.platform
      !== OUTLOOK_DESKTOP_WINDOWS_INTERNAL_CANARY_PACKAGE_IDENTITY.platform
    || current.app_version
      !== OUTLOOK_DESKTOP_WINDOWS_INTERNAL_CANARY_PACKAGE_IDENTITY.app_version
    || current.source_sha
      !== OUTLOOK_DESKTOP_WINDOWS_INTERNAL_CANARY_PACKAGE_IDENTITY.source_sha
    || !Number.isSafeInteger(current.state_version)
    || current.state_version < 1
    || current.retired_at !== null
    || !Number.isFinite(leaseExpiresAt.getTime())
    || leaseExpiresAt <= authoritySnapshotAt
  ) return null;
  return Object.freeze({
    installation_id: current.installation_id,
    status: current.status,
    state_version: current.state_version,
    lease_expires_at: leaseExpiresAt.toISOString(),
    retired_at: null,
    release_trusted: true,
    authority_snapshot_at: authoritySnapshotAt.toISOString(),
  });
}

export function createOutlookDesktopTrustedCurrentCompatibilityService({
  authority_service: authorityServiceInput,
  entitlement_roster: entitlementRoster,
} = {}) {
  const authorityService = exactAuthorityService(authorityServiceInput);
  return Object.freeze({
    ...authorityService,
    async readTrustedCurrent(input = {}) {
      let strictError = null;
      try {
        const strict = await authorityService.readTrustedCurrent(input);
        if (strict !== null) return strict;
      } catch (error) {
        strictError = error;
      }
      if (!rosterAllowsInternalCanary(input?.principal, entitlementRoster)) {
        if (strictError) throw strictError;
        return null;
      }
      let fallback;
      try {
        fallback = approvedInternalCurrent(
          await authorityService.readCurrent(input),
        );
      } catch (fallbackError) {
        if (strictError) throw strictError;
        throw fallbackError;
      }
      if (fallback !== null) return fallback;
      if (strictError) throw strictError;
      return null;
    },
  });
}

export function createPostgresOutlookDesktopOperationalControlPorts(
  options = {},
) {
  const value = exactDataObject(
    options,
    CONTROL_PORT_OPTION_KEYS,
    "Outlook desktop control-port options",
  );
  const appPool = postgresPool(value.app_pool, "application-role");
  const controlPool = postgresPool(value.control_pool, "control-role");
  const verifierPool = postgresPool(value.verifier_pool, "verifier-role");
  if (new Set([appPool, controlPool, verifierPool]).size !== 3) {
    throw new TypeError(
      "Outlook desktop authority requires three distinct PostgreSQL pools",
    );
  }
  const tenantId = assignmentIdentifier(value.tenant_id, "tenant_id");
  const activationPort = assertOutlookDesktopActivationControlPort(
    createPostgresOutlookDesktopActivationControlPort({
      app_pool: appPool,
      control_pool: controlPool,
      tenant_id: tenantId,
    }),
  );
  const lifecycleAuthority = assertPostgresOutlookDesktopLifecycleAuthority(
    createPostgresOutlookDesktopLifecycleAuthority({
      app_pool: appPool,
      tenant_id: tenantId,
      verifier_pool: verifierPool,
    }),
  );
  const activationContract = createOutlookDesktopActivationContract();
  const lifecyclePort = assertOutlookDesktopLifecycleControlPort(
    createOutlookDesktopLifecycleControlPort({
      verifyLifecycleTransition: (event) => (
        executeOutlookDesktopLifecycleVerifier({
          event,
          activationContract,
          assertActivationReservation:
            assertOutlookDesktopActivationReservation,
          assertActivationReservationProofBinding:
            assertOutlookDesktopActivationReservationProofBinding,
          loadActivationReservation: activationPort.loadActivationReservation,
          mintLifecycleAuthorization:
            lifecycleAuthority.verifyLifecycleTransition,
        })
      ),
      issueLifecycleChallenge: lifecycleAuthority.issueLifecycleChallenge,
      consumeLifecycleTransition:
        lifecycleAuthority.consumeLifecycleTransition,
    }),
  );
  const ports = Object.freeze({
    outlookDesktopActivationControlPort: activationPort,
    outlookDesktopLifecycleControlPort: lifecyclePort,
  });
  COMPOSED_CONTROL_PORTS.set(activationPort, Object.freeze({
    app_pool: appPool,
    lifecycle_port: lifecyclePort,
    tenant_id: tenantId,
  }));
  return ports;
}

export function assertPostgresOutlookDesktopOperationalControlPorts(
  value,
  { app_pool: expectedAppPool, tenant_id: expectedTenantId } = {},
) {
  const ports = exactDataObject(
    value,
    CONTROL_PORT_KEYS,
    "API-composed Outlook desktop control ports",
  );
  let record;
  try {
    record = COMPOSED_CONTROL_PORTS.get(
      assertOutlookDesktopActivationControlPort(
        ports.outlookDesktopActivationControlPort,
      ),
    );
    assertOutlookDesktopLifecycleControlPort(
      ports.outlookDesktopLifecycleControlPort,
    );
  } catch {
    throw new TypeError(
      "API-composed Outlook desktop control ports are required",
    );
  }
  if (!record
      || record.lifecycle_port !== ports.outlookDesktopLifecycleControlPort
      || (expectedAppPool !== undefined && record.app_pool !== expectedAppPool)
      || (expectedTenantId !== undefined
        && record.tenant_id !== expectedTenantId)) {
    throw new TypeError(
      "API-composed Outlook desktop control ports are required",
    );
  }
  return value;
}

export function createPostgresOutlookDesktopOperationalRuntime(options = {}) {
  const value = exactDataObject(
    options,
    RUNTIME_OPTION_KEYS,
    "Outlook desktop operational runtime options",
    { allowMissing: true },
  );
  const appPool = postgresPool(value.pool, "application-role");
  const tenantId = assignmentIdentifier(value.tenant_id, "tenant_id");
  const activationSupplied =
    value.outlookDesktopActivationControlPort !== undefined;
  const lifecycleSupplied =
    value.outlookDesktopLifecycleControlPort !== undefined;
  if (activationSupplied !== lifecycleSupplied) {
    throw new TypeError(
      "API-composed Outlook desktop control ports are required",
    );
  }
  let activationService = null;
  if (activationSupplied) {
    assertPostgresOutlookDesktopOperationalControlPorts({
      outlookDesktopActivationControlPort:
        value.outlookDesktopActivationControlPort,
      outlookDesktopLifecycleControlPort:
        value.outlookDesktopLifecycleControlPort,
    }, { app_pool: appPool, tenant_id: tenantId });
    activationService = createOutlookDesktopActivationService({
      control_port: value.outlookDesktopActivationControlPort,
      lifecycle_port: value.outlookDesktopLifecycleControlPort,
    });
  }
  const authorityInstallationService = exactAuthorityService(
    createPostgresOutlookDesktopInstallationAuthorityService({
      pool: appPool,
      tenant_id: tenantId,
    }),
  );
  const legacyInstallationService =
    createPostgresOutlookDesktopLegacyWindowsCompatibilityService({
      pool: appPool,
      tenant_id: tenantId,
    });
  const installationService =
    createOutlookDesktopTrustedCurrentCompatibilityService({
      authority_service: authorityInstallationService,
      entitlement_roster: value.entitlement_roster,
    });
  return Object.freeze({
    activation_enabled: activationService !== null,
    entitlement_roster: value.entitlement_roster,
    entra_tenant_id: value.entra_tenant_id ?? null,
    activation_service: activationService,
    installation_service: installationService,
    legacy_installation_service: legacyInstallationService,
    lifecycle_port: activationSupplied
      ? value.outlookDesktopLifecycleControlPort
      : null,
  });
}
