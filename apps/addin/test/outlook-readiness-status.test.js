import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_READINESS_ACTIONS,
  parseOutlookStartupBinding,
  presentOutlookReadiness,
} from "../src/outlook-readiness-status.js";

const PRINCIPAL_REF = `odpr_${"A".repeat(43)}`;
const INSTALLATION_ID = "odi_readiness_000000000001";

function response(overrides = {}) {
  return {
    outcome: "passed",
    item: {
      schema_version: "lawos.outlook-readiness.v1",
      entitlement: {
        state: "approved",
        source: "lawos_outlook_desktop_entitlement_roster",
        roster_version: "synthetic-readiness-v1",
      },
      identity_binding: {
        state: "verified",
        source: "lawos_signed_session",
        principal_ref: PRINCIPAL_REF,
      },
      enterprise_app_assignment: {
        state: "assigned",
        authoritative: true,
        source: "tenant_admin_readback_receipt",
        observed_at: "2026-08-11T02:55:00.000Z",
      },
      central_deployment: {
        state: "targeted",
        authoritative: true,
        product_id: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
        manifest_version: "1.0.1.0",
        source: "integrated_apps_assignment_readback",
        observed_at: "2026-08-11T02:56:00.000Z",
      },
      client_propagation: {
        state: "observed",
        authoritative: true,
        source: "outlook_message_read_command_receipt",
        observed_at: "2026-08-11T02:57:00.000Z",
      },
      installation: {
        installation_id: INSTALLATION_ID,
        state: "active",
        state_version: 4,
        release_trusted: true,
        lease_expires_at: "2026-08-18T03:00:00.000Z",
        retired_at: null,
        source: "lawos_outlook_desktop_installations",
      },
      delegated_connection: {
        state: "connected",
        state_version: 7,
        expires_at: "2026-09-11T03:00:00.000Z",
        source: "lawos_m365_connection_state",
        observed_at: "2026-08-11T03:00:00.000Z",
      },
      snapshot: {
        observed_at: "2026-08-11T03:00:00.000Z",
        consistency: "component_versioned",
        version_vector: {
          roster_version: "synthetic-readiness-v1",
          installation_state_version: 4,
          delegated_connection_state_version: 7,
        },
      },
      next_action: "none",
      browser_required: false,
      safe_error_codes: [],
      user_connection_revoke_requested: false,
      provider_runtime_executed: false,
      admin_runtime_executed: false,
      ...overrides,
    },
  };
}

test("authoritative ready response becomes the exact compact success copy", () => {
  assert.deepEqual(presentOutlookReadiness(response()), {
    status: "complete",
    visibleMessage: "Outlook 연결 준비됨",
    fullMessage: "Outlook 연결과 추가 기능 전파가 확인되었습니다.",
    action: OUTLOOK_READINESS_ACTIONS.none,
    actionLabel: null,
  });
});

test("legacy same-v1 presentation remains complete without additive startup fields", () => {
  const legacy = response();
  delete legacy.item.identity_binding.principal_ref;
  delete legacy.item.installation.installation_id;
  delete legacy.item.installation.release_trusted;
  assert.deepEqual(presentOutlookReadiness(legacy), {
    status: "complete",
    visibleMessage: "Outlook 연결 준비됨",
    fullMessage: "Outlook 연결과 추가 기능 전파가 확인되었습니다.",
    action: OUTLOOK_READINESS_ACTIONS.none,
    actionLabel: null,
  });
});

test("startup binding parser returns only the signed principal and server-selected versions", () => {
  assert.deepEqual(parseOutlookStartupBinding(response()), {
    principal_ref: PRINCIPAL_REF,
    installation_id: INSTALLATION_ID,
    installation_state_version: 4,
    delegated_connection_state_version: 7,
  });
  assert.deepEqual(
    Object.keys(parseOutlookStartupBinding(response())).sort(),
    [
      "delegated_connection_state_version",
      "installation_id",
      "installation_state_version",
      "principal_ref",
    ],
  );
});

test("startup binding parser rejects mutable accessor snapshots", () => {
  const base = response().item;
  const installation = { ...base.installation };
  let reads = 0;
  Object.defineProperty(installation, "state_version", {
    configurable: true,
    enumerable: true,
    get() {
      reads += 1;
      return reads < 3 ? 4 : 5;
    },
  });
  const parsed = parseOutlookStartupBinding({
    ...response(),
    item: { ...base, installation },
  });
  assert.equal(parsed, null);
  assert.equal(reads, 0);
});

test("startup binding parser snapshots plain-target proxy primitives", () => {
  const base = response().item;
  const descriptorReads = { installation_id: 0, state_version: 0 };
  let propertyReads = 0;
  const installation = new Proxy({ ...base.installation }, {
    get(target, property, receiver) {
      if (property === "installation_id" || property === "state_version") {
        propertyReads += 1;
      }
      return Reflect.get(target, property, receiver);
    },
    getOwnPropertyDescriptor(target, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
      if (property === "installation_id" || property === "state_version") {
        descriptorReads[property] += 1;
        return {
          ...descriptor,
          value: descriptorReads[property] === 1
            ? descriptor.value
            : property === "installation_id"
              ? "odi_forged_proxy_000099"
              : 99,
        };
      }
      return descriptor;
    },
  });
  assert.deepEqual(parseOutlookStartupBinding({
    ...response(),
    item: { ...base, installation },
  }), {
    principal_ref: PRINCIPAL_REF,
    installation_id: INSTALLATION_ID,
    installation_state_version: 4,
    delegated_connection_state_version: 7,
  });
  assert.deepEqual(descriptorReads, {
    installation_id: 1,
    state_version: 1,
  });
  assert.equal(propertyReads, 0);
});

test("startup binding parser rejects throwing accessors", () => {
  const base = response().item;
  const installation = { ...base.installation };
  Object.defineProperty(installation, "installation_id", {
    configurable: true,
    enumerable: true,
    get() {
      throw new Error("installation id accessor must not execute");
    },
  });
  assert.equal(parseOutlookStartupBinding({
    ...response(),
    item: { ...base, installation },
  }), null);
});

test("startup binding parser rejects accessor roots, custom prototypes, and coercion", () => {
  const accessorRoot = response();
  let itemReads = 0;
  Object.defineProperty(accessorRoot, "item", {
    configurable: true,
    enumerable: true,
    get() {
      itemReads += 1;
      return response().item;
    },
  });
  assert.equal(parseOutlookStartupBinding(accessorRoot), null);
  assert.equal(itemReads, 0);

  const customPrototype = Object.create({ installation_id: INSTALLATION_ID });
  Object.assign(customPrototype, response().item.installation);
  assert.equal(parseOutlookStartupBinding(response({
    installation: customPrototype,
  })), null);

  for (const overrides of [
    {
      identity_binding: {
        ...response().item.identity_binding,
        principal_ref: new String(PRINCIPAL_REF),
      },
    },
    {
      installation: {
        ...response().item.installation,
        installation_id: new String(INSTALLATION_ID),
      },
    },
    {
      installation: {
        ...response().item.installation,
        state_version: { valueOf: () => 4 },
      },
    },
  ]) {
    assert.equal(parseOutlookStartupBinding(response(overrides)), null);
  }
});

test("valid startup binding projection remains exact with raw/token-shaped extras", () => {
  const input = response({
    identity_binding: {
      ...response().item.identity_binding,
      subject_id: "raw-entra-subject-never-project",
    },
    provider_token: "provider-token-never-project",
    desktop_token: "desktop-token-never-project",
  });
  const binding = parseOutlookStartupBinding(input);
  assert.deepEqual(binding, {
    principal_ref: PRINCIPAL_REF,
    installation_id: INSTALLATION_ID,
    installation_state_version: 4,
    delegated_connection_state_version: 7,
  });
  const serialized = JSON.stringify({
    binding,
    presentation: presentOutlookReadiness(input),
  });
  for (const forbidden of [
    "raw-entra-subject-never-project",
    "provider-token-never-project",
    "desktop-token-never-project",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("startup binding parser fails closed for forged or non-cacheable readiness projections", () => {
  const cases = [
    ["missing principal", { identity_binding: { state: "verified", source: "lawos_signed_session" } }],
    ["raw subject", { identity_binding: { ...response().item.identity_binding, principal_ref: "subject-raw" } }],
    ["no current installation", { installation: { ...response().item.installation, installation_id: null, state: "missing", state_version: null, lease_expires_at: null } }],
    ["missing installation id", { installation: { ...response().item.installation, installation_id: null } }],
    ["unproven release", { installation: { ...response().item.installation, release_trusted: undefined } }],
    ["untrusted release", { installation: { ...response().item.installation, release_trusted: false } }],
    ["nested untrusted release", { installation: { ...response().item.installation, trusted: false } }],
    ["expired installation", { installation: { ...response().item.installation, state: "expired" } }],
    ["retired installation", { installation: { ...response().item.installation, state: "retired", retired_at: "2026-08-11T02:00:00.000Z" } }],
    ["ambiguous installation", { installation: { ...response().item.installation, state: "ambiguous" } }],
    ["missing installation version", { installation: { ...response().item.installation, state_version: null } }],
    ["missing connection version", { delegated_connection: { ...response().item.delegated_connection, state_version: null } }],
    ["identity mismatch", { identity_binding: { ...response().item.identity_binding, state: "mismatch" } }],
  ];
  for (const [label, overrides] of cases) {
    assert.equal(parseOutlookStartupBinding(response(overrides)), null, label);
  }
  assert.equal(
    parseOutlookStartupBinding(response(), { principal_ref: `odpr_${"B".repeat(43)}` }),
    null,
  );
});

test("startup binding parser fails closed for explicit revoked release extras", () => {
  const revoked = response({
    trusted: false,
    release_trust_state: "revoked",
  });
  assert.equal(parseOutlookStartupBinding(revoked), null);
});

test("interaction-required response becomes the exact Microsoft confirmation action", () => {
  const result = presentOutlookReadiness(response({
    delegated_connection: { state: "reauthorization_required" },
    next_action: "confirm_microsoft",
    browser_required: true,
    safe_error_codes: ["M365_INTERACTION_REQUIRED"],
  }));
  assert.equal(result.visibleMessage, "Microsoft 확인 필요");
  assert.equal(result.action, OUTLOOK_READINESS_ACTIONS.confirmMicrosoft);
  assert.equal(result.actionLabel, "계정 확인");
});

test("unobserved propagation becomes the exact Outlook relaunch action", () => {
  const result = presentOutlookReadiness(response({
    client_propagation: {
      ...response().item.client_propagation,
      state: "not_observed",
    },
    next_action: "relaunch_outlook",
    safe_error_codes: ["OUTLOOK_READINESS_PROPAGATION_NOT_OBSERVED"],
  }));
  assert.equal(result.visibleMessage, "Outlook 추가 기능 전파 확인 필요");
  assert.equal(result.action, OUTLOOK_READINESS_ACTIONS.refresh);
  assert.equal(result.actionLabel, "Outlook 다시 열기");
});

test("unknown, admin, sign-in, and heartbeat results render no intervention", () => {
  for (const input of [
    null,
    {},
    response({ next_action: "contact_admin" }),
    response({ next_action: "sign_in" }),
    response({ next_action: "heartbeat" }),
    response({ next_action: "invented" }),
  ]) {
    assert.equal(presentOutlookReadiness(input), null);
  }
});

test("confirmation cannot be spoofed without the browser flag and interaction code", () => {
  for (const input of [
    response({
      next_action: "confirm_microsoft",
      browser_required: false,
      safe_error_codes: ["M365_INTERACTION_REQUIRED"],
    }),
    response({
      next_action: "confirm_microsoft",
      browser_required: true,
      safe_error_codes: [],
    }),
  ]) {
    assert.equal(presentOutlookReadiness(input), null);
  }
});

test("ready copy requires every authoritative axis and never projects identifiers", () => {
  for (const input of [
    response({ enterprise_app_assignment: { state: "assigned", authoritative: false } }),
    response({ central_deployment: { state: "targeted", authoritative: false } }),
    response({ client_propagation: { state: "observed", authoritative: false } }),
    response({ installation: { state: "expired" } }),
    response({ installation: { ...response().item.installation, release_trusted: false } }),
    response({ user_connection_revoke_requested: true }),
  ]) {
    assert.equal(presentOutlookReadiness(input), null);
  }

  const projected = presentOutlookReadiness(response({
    installation: {
      ...response().item.installation,
      installation_id: INSTALLATION_ID,
    },
    tenant_id: "tenant-secret",
    evidence_ref: "evidence-secret",
    access_token: "token-secret",
  }));
  const serialized = JSON.stringify(projected);
  for (const forbidden of [INSTALLATION_ID, "tenant-secret", "evidence-secret", "token-secret"] ) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("ready copy fails closed when versioned authority is incomplete", () => {
  const missingAuthority = [
    ["entitlement source", { entitlement: { ...response().item.entitlement, source: null } }],
    ["roster version", { entitlement: { ...response().item.entitlement, roster_version: null } }],
    ["identity source", { identity_binding: { state: "verified", source: null } }],
    ["assignment source", {
      enterprise_app_assignment: {
        ...response().item.enterprise_app_assignment,
        source: null,
      },
    }],
    ["assignment timestamp", {
      enterprise_app_assignment: {
        ...response().item.enterprise_app_assignment,
        observed_at: null,
      },
    }],
    ["deployment manifest version", {
      central_deployment: {
        ...response().item.central_deployment,
        manifest_version: null,
      },
    }],
    ["propagation timestamp", {
      client_propagation: {
        ...response().item.client_propagation,
        observed_at: null,
      },
    }],
    ["installation source", {
      installation: { ...response().item.installation, source: null },
    }],
    ["installation version", {
      installation: { ...response().item.installation, state_version: null },
    }],
    ["installation lease", {
      installation: { ...response().item.installation, lease_expires_at: null },
    }],
    ["connection source", {
      delegated_connection: {
        ...response().item.delegated_connection,
        source: null,
      },
    }],
    ["connection version", {
      delegated_connection: {
        ...response().item.delegated_connection,
        state_version: null,
      },
    }],
    ["connection expiry", {
      delegated_connection: {
        ...response().item.delegated_connection,
        expires_at: null,
      },
    }],
    ["connection timestamp", {
      delegated_connection: {
        ...response().item.delegated_connection,
        observed_at: null,
      },
    }],
    ["snapshot consistency", {
      snapshot: { ...response().item.snapshot, consistency: "contradictory" },
    }],
    ["snapshot timestamp", {
      snapshot: { ...response().item.snapshot, observed_at: null },
    }],
    ["snapshot installation version", {
      snapshot: {
        ...response().item.snapshot,
        version_vector: {
          ...response().item.snapshot.version_vector,
          installation_state_version: null,
        },
      },
    }],
    ["snapshot connection version", {
      snapshot: {
        ...response().item.snapshot,
        version_vector: {
          ...response().item.snapshot.version_vector,
          delegated_connection_state_version: null,
        },
      },
    }],
  ];
  for (const [label, overrides] of missingAuthority) {
    assert.equal(
      presentOutlookReadiness(response(overrides)),
      null,
      label,
    );
  }
});
