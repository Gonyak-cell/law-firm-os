import { types } from "node:util";

import {
  assignmentIdentifier,
} from "../../../packages/email-dms/src/outlook-desktop-assignment-contract.js";
import {
  createPostgresOutlookDesktopInstallationAuthorityService,
} from "../../../packages/email-dms/src/postgres-outlook-desktop-installation-authority-service.js";
import {
  createPostgresOutlookDesktopInstallationService,
} from "../../../packages/email-dms/src/postgres-outlook-desktop-installation-service.js";
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
  const installationService = exactAuthorityService(
    createPostgresOutlookDesktopInstallationAuthorityService({
      pool: appPool,
      tenant_id: tenantId,
    }),
  );
  const legacyInstallationService = createPostgresOutlookDesktopInstallationService({
    pool: appPool,
    tenant_id: tenantId,
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
