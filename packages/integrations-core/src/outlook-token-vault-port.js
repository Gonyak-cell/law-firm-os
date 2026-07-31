function safeId(value, field) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,200}$/.test(value.trim())) {
    throw new TypeError(`${field} must be a safe identifier`);
  }
  return value.trim();
}

function failure(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

function tenantBoundRef(input, states) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("token lookup requires tenant_id and ref");
  }
  const tenantId = safeId(input.tenant_id, "tenant_id");
  const ref = safeId(input.ref, "ref");
  const state = states.get(ref);
  if (!state || state.tenant_id !== tenantId) {
    throw failure("OUTLOOK_TOKEN_NOT_FOUND", "Token reference was not found");
  }
  return { tenantId, ref, state };
}

function publicRef(ref, state) {
  return Object.freeze({
    opaque_ref: true,
    tenant_id: state.tenant_id,
    kind: state.kind,
    ref,
    key_version: state.key_version,
  });
}

export function assertOpaqueTokenRef(value, {
  tenant_id,
  kind,
  field = "token_ref",
  raw_value = null,
  expected_ref = null,
  reference_prefix = "vault:",
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.opaque_ref !== true) {
    throw failure("OUTLOOK_VAULT_OPAQUE_REF_REQUIRED", `${field} must be an opaque reference envelope`);
  }
  const ref = safeId(value.ref, field);
  if (
    safeId(value.tenant_id, `${field}.tenant_id`) !== safeId(tenant_id, "tenant_id")
    || safeId(value.kind, `${field}.kind`) !== safeId(kind, "kind")
  ) {
    throw failure("OUTLOOK_VAULT_REF_SCOPE_INVALID", `${field} scope does not match the request`);
  }
  if (typeof raw_value === "string" && ref === raw_value) {
    throw failure(
      "OUTLOOK_VAULT_RETURNED_RAW_TOKEN",
      "Opaque token vault returned token material instead of a reference",
    );
  }
  if (expected_ref !== null && ref !== safeId(expected_ref, `${field}.expected_ref`)) {
    throw failure("OUTLOOK_VAULT_REF_MISMATCH", `${field} does not match the stored reference`);
  }
  if (!ref.startsWith(safeId(reference_prefix, "reference_prefix"))) {
    throw failure("OUTLOOK_VAULT_REF_NAMESPACE_INVALID", `${field} is outside the vault reference namespace`);
  }
  return ref;
}

export function assertOutlookTokenVaultPort(vault, { operational = false } = {}) {
  const methods = [
    "stageTransition",
    "commitTransition",
    "abortTransition",
    "getTransition",
    "describeRef",
    "resolveForProvider",
  ];
  if (!vault || methods.some((method) => typeof vault[method] !== "function")) {
    throw new TypeError(`opaque token vault must implement ${methods.join(", ")}`);
  }
  safeId(vault.reference_prefix, "vault.reference_prefix");
  if (
    operational
    && (
      vault.test_only === true
      || vault.durable !== true
      || vault.opaque_at_rest !== true
      || vault.failure_atomic_transitions !== true
      || vault.staged_refs_provider_inaccessible !== true
    )
  ) {
    throw failure(
      "OUTLOOK_OPERATIONAL_VAULT_REQUIRED",
      "Operational Outlook access requires a durable opaque-at-rest token vault adapter",
    );
  }
  return vault;
}

export function assertOperationalOutlookTokenVault(vault) {
  return assertOutlookTokenVaultPort(vault, { operational: true });
}

export function createTestOnlyInMemoryOpaqueTokenVault({
  backing = {},
  reference_prefix = "vault:",
} = {}) {
  const referencePrefix = safeId(reference_prefix, "reference_prefix");
  const values = backing.values ?? new Map();
  const states = backing.states ?? new Map();
  const operations = backing.operations ?? new Map();
  backing.values = values;
  backing.states = states;
  backing.operations = operations;
  backing.sequence ??= 0;
  backing.direct_sequence ??= 0;

  function transitionFor(input) {
    const tenantId = safeId(input?.tenant_id, "tenant_id");
    const operationId = safeId(input?.operation_id, "operation_id");
    const operation = operations.get(`${tenantId}\u0000${operationId}`);
    if (!operation) throw failure("OUTLOOK_VAULT_TRANSITION_NOT_FOUND", "Vault transition was not found");
    return operation;
  }

  function stageTransition({
    tenant_id,
    operation_id,
    creates = [],
    revoke_refs = [],
  } = {}) {
    const tenantId = safeId(tenant_id, "tenant_id");
    const operationId = safeId(operation_id, "operation_id");
    const operationKey = `${tenantId}\u0000${operationId}`;
    const replay = operations.get(operationKey);
    if (replay) {
      if (replay.status === "aborted") {
        throw failure("OUTLOOK_VAULT_TRANSITION_ABORTED", "Vault transition was aborted");
      }
      return Object.freeze({
        operation_id: operationId,
        status: replay.status,
        refs: Object.freeze(Object.fromEntries(
          [...replay.created_refs].map(([key, ref]) => [key, publicRef(ref, states.get(ref))]),
        )),
      });
    }
    const revokeRefs = revoke_refs.map((ref) => {
      const resolved = tenantBoundRef({ tenant_id: tenantId, ref }, states);
      if (resolved.state.state !== "active") {
        throw failure("OUTLOOK_TOKEN_REVOKED", "Token reference is not active");
      }
      return resolved.ref;
    });
    const createdRefs = new Map();
    const createdValues = [];
    try {
      for (const input of creates) {
        const key = safeId(input.key, "create.key");
        if (createdRefs.has(key)) throw new TypeError("create.key must be unique");
        const kind = safeId(input.kind, "create.kind");
        const keyVersion = safeId(input.key_version ?? "v1", "create.key_version");
        let value;
        if (typeof input.value === "string" && input.value) {
          value = input.value;
        } else if (input.copy_ref) {
          const source = tenantBoundRef({ tenant_id: tenantId, ref: input.copy_ref }, states);
          if (source.state.state !== "active") {
            throw failure("OUTLOOK_TOKEN_REVOKED", "Token reference is not active");
          }
          value = values.get(source.ref);
        } else {
          throw new TypeError("create requires value or copy_ref");
        }
        const ref = `${referencePrefix}${tenantId}:${kind}:${++backing.sequence}`;
        const state = {
          tenant_id: tenantId,
          kind,
          key_version: keyVersion,
          state: "staged",
          operation_id: operationId,
        };
        values.set(ref, value);
        states.set(ref, state);
        createdRefs.set(key, ref);
        createdValues.push(ref);
      }
    } catch (error) {
      for (const ref of createdValues) {
        states.set(ref, { ...states.get(ref), state: "revoked" });
      }
      throw error;
    }
    const operation = {
      tenant_id: tenantId,
      operation_id: operationId,
      status: "staged",
      created_refs: createdRefs,
      revoke_refs: revokeRefs,
    };
    operations.set(operationKey, operation);
    return Object.freeze({
      operation_id: operationId,
      status: "staged",
      refs: Object.freeze(Object.fromEntries(
        [...createdRefs].map(([key, ref]) => [key, publicRef(ref, states.get(ref))]),
      )),
    });
  }

  function commitTransition(input = {}) {
    const operation = transitionFor(input);
    if (operation.status === "committed") return getTransition(input);
    if (operation.status !== "staged") {
      throw failure("OUTLOOK_VAULT_TRANSITION_ABORTED", "Vault transition was aborted");
    }
    for (const ref of operation.created_refs.values()) {
      if (states.get(ref)?.state !== "staged") {
        throw failure("OUTLOOK_VAULT_TRANSITION_INVALID", "Staged token state is invalid");
      }
    }
    for (const ref of operation.revoke_refs) {
      if (states.get(ref)?.state !== "active") {
        throw failure("OUTLOOK_VAULT_TRANSITION_INVALID", "Revoked token state is invalid");
      }
    }
    for (const ref of operation.created_refs.values()) {
      states.set(ref, { ...states.get(ref), state: "active" });
    }
    for (const ref of operation.revoke_refs) {
      states.set(ref, { ...states.get(ref), state: "revoked" });
    }
    operation.status = "committed";
    return getTransition(input);
  }

  function abortTransition(input = {}) {
    const operation = transitionFor(input);
    if (operation.status === "committed") {
      throw failure("OUTLOOK_VAULT_TRANSITION_COMMITTED", "Committed transition cannot be aborted");
    }
    if (operation.status === "aborted") return getTransition(input);
    for (const ref of operation.created_refs.values()) {
      states.set(ref, { ...states.get(ref), state: "revoked" });
    }
    operation.status = "aborted";
    return getTransition(input);
  }

  function getTransition(input = {}) {
    const operation = transitionFor(input);
    return Object.freeze({
      tenant_id: operation.tenant_id,
      operation_id: operation.operation_id,
      status: operation.status,
      refs: Object.freeze(Object.fromEntries(
        [...operation.created_refs].map(([key, ref]) => [key, publicRef(ref, states.get(ref))]),
      )),
      revoke_refs: Object.freeze(
        operation.revoke_refs.map((ref) => publicRef(ref, states.get(ref))),
      ),
    });
  }

  function resolveForProvider(input) {
    const { ref, state } = tenantBoundRef(input, states);
    if (state.state !== "active") throw failure("OUTLOOK_TOKEN_REVOKED", "Token reference is not active");
    return values.get(ref);
  }

  function describeRef(input) {
    const { ref, state } = tenantBoundRef(input, states);
    if (input?.kind != null && state.kind !== safeId(input.kind, "kind")) {
      throw failure("OUTLOOK_TOKEN_NOT_FOUND", "Token reference was not found");
    }
    return publicRef(ref, state);
  }

  function put({ tenant_id, kind, value, key_version = "v1" } = {}) {
    const tenantId = safeId(tenant_id, "tenant_id");
    const operationId = `direct-put:${++backing.direct_sequence}`;
    const staged = stageTransition({
      tenant_id: tenantId,
      operation_id: operationId,
      creates: [{ key: "token", kind, value, key_version }],
    });
    commitTransition({ tenant_id: tenantId, operation_id: operationId });
    return staged.refs.token.ref;
  }

  function revoke({ tenant_id, ref } = {}) {
    const tenantId = safeId(tenant_id, "tenant_id");
    const operationId = `direct-revoke:${++backing.direct_sequence}`;
    stageTransition({
      tenant_id: tenantId,
      operation_id: operationId,
      revoke_refs: [ref],
    });
    commitTransition({ tenant_id: tenantId, operation_id: operationId });
    return true;
  }

  function rotate({ tenant_id, ref, key_version } = {}) {
    const tenantId = safeId(tenant_id, "tenant_id");
    const source = tenantBoundRef({ tenant_id: tenantId, ref }, states);
    const operationId = `direct-rotate:${++backing.direct_sequence}`;
    const staged = stageTransition({
      tenant_id: tenantId,
      operation_id: operationId,
      creates: [{
        key: "token",
        kind: source.state.kind,
        copy_ref: source.ref,
        key_version,
      }],
      revoke_refs: [source.ref],
    });
    commitTransition({ tenant_id: tenantId, operation_id: operationId });
    return staged.refs.token.ref;
  }

  function snapshot() {
    return Object.freeze([...states].map(([ref, state]) => Object.freeze({
      ref,
      tenant_id: state.tenant_id,
      kind: state.kind,
      state: state.state,
      key_version: state.key_version,
      operation_id: state.operation_id,
    })));
  }

  return Object.freeze({
    reference_prefix: referencePrefix,
    durable: false,
    opaque_at_rest: false,
    failure_atomic_transitions: true,
    staged_refs_provider_inaccessible: true,
    test_only: true,
    stageTransition,
    commitTransition,
    abortTransition,
    getTransition,
    describeRef,
    resolveForProvider,
    put,
    revoke,
    rotate,
    snapshot,
  });
}

export function createInMemoryOpaqueTokenVault(options) {
  return createTestOnlyInMemoryOpaqueTokenVault(options);
}
