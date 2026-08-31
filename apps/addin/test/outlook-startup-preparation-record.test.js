import assert from "node:assert/strict";
import test from "node:test";

import {
  KEY,
  OWNER_A as OWNER,
  PRINCIPAL_REF,
  SECRET_MAILBOX,
  SECRET_TOKEN,
  T0,
  binding,
  digest,
  machine,
  readyRaw,
  storage,
  storedBinding,
} from "./outlook-startup-preparation-test-support.js";

test("public binding accepts only the signed opaque principal_ref and persists its digest", async () => {
  const authoritative = binding();
  let calls = 0;
  const store = storage();
  const runtime = await machine({
    store,
    prepare: async () => { calls += 1; return { state: "ready" }; },
  });
  const result = await runtime.prepare(authoritative);
  const saved = JSON.parse(store.raw());
  assert.deepEqual([result.state, result.cache_hit, calls], ["ready", false, 1]);
  assert.equal(saved.binding.subject_hash, await digest(PRINCIPAL_REF));
  assert.equal(store.raw().includes(PRINCIPAL_REF), false);

  const obsolete = { ...authoritative, subject_id: "raw-entra-subject" };
  delete obsolete.principal_ref;
  const invalidPrincipalRefs = [
    ["obsolete subject_id", obsolete],
    ["empty", { ...authoritative, principal_ref: "" }],
    ["whitespace padded", { ...authoritative, principal_ref: ` ${PRINCIPAL_REF} ` }],
    ["42 characters", { ...authoritative, principal_ref: `odpr_${"A".repeat(42)}` }],
    ["44 characters", { ...authoritative, principal_ref: `odpr_${"A".repeat(44)}` }],
    ["invalid alphabet", { ...authoritative, principal_ref: `odpr_${"A".repeat(42)}.` }],
  ];
  for (const [name, input] of invalidPrincipalRefs) {
    const rejectedStore = storage();
    let rejectedCalls = 0;
    const rejected = await machine({
      store: rejectedStore,
      prepare: async () => { rejectedCalls += 1; return { state: "ready" }; },
    });
    await assert.rejects(Promise.resolve().then(() => rejected.prepare(input)), TypeError, name);
    assert.deepEqual([
      rejectedCalls,
      rejectedStore.calls.get + rejectedStore.calls.set + rejectedStore.calls.remove,
      rejectedStore.raw(),
    ], [0, 0, null], name);
  }
});

test("stable and mutable principal_ref accessors are snapshotted exactly once", async () => {
  const secondRef = `odpr_${"B".repeat(43)}`;
  const expectedHash = await digest(PRINCIPAL_REF);
  const secondHash = await digest(secondRef);
  const observed = [];
  for (const [name, values] of [
    ["stable", [PRINCIPAL_REF, PRINCIPAL_REF]],
    ["mutable", [PRINCIPAL_REF, secondRef]],
  ]) {
    let reads = 0;
    const input = binding();
    Object.defineProperty(input, "principal_ref", {
      enumerable: true,
      get() { const value = values[Math.min(reads, values.length - 1)]; reads += 1; return value; },
    });
    const store = storage();
    const runtime = await machine({ store });
    assert.equal((await runtime.prepare(input)).state, "ready", name);
    const savedHash = JSON.parse(store.raw()).binding.subject_hash;
    observed.push([name, reads, savedHash === expectedHash, savedHash === secondHash]);
  }
  assert.deepEqual(observed, [
    ["stable", 1, true, false],
    ["mutable", 1, true, false],
  ]);
});

test("throwing and coercible principal_ref values fail with fixed non-disclosing errors", async () => {
  let coercions = 0;
  const observed = [];
  const invalidValues = [
    ["throwing", Object.defineProperty(binding(), "principal_ref", {
      enumerable: true,
      get() { throw new Error(`principal-getter:${SECRET_TOKEN}:${SECRET_MAILBOX}`); },
    })],
    ["coercion", binding({ principal_ref: { toString() { coercions += 1; return PRINCIPAL_REF; } } })],
  ];
  for (const [name, input] of invalidValues) {
    const store = storage();
    let calls = 0;
    const runtime = await machine({
      store,
      prepare: async () => { calls += 1; return { state: "ready" }; },
    });
    let exposed;
    try { await runtime.prepare(input); } catch (error) { exposed = error; }
    const observable = `${exposed?.message}\n${exposed?.stack}\n${JSON.stringify(exposed)}`;
    observed.push([
      name,
      exposed instanceof TypeError,
      exposed?.message === "principal_ref is invalid",
      exposed?.cause === undefined,
      calls,
      store.calls.get + store.calls.set + store.calls.remove,
      store.raw(),
      !/principal-getter|callback-secret|privileged-lawyer/u.test(observable),
    ]);
  }
  assert.deepEqual(observed, [
    ["throwing", true, true, true, 0, 0, null, true],
    ["coercion", true, true, true, 0, 0, null, true],
  ]);
  assert.equal(coercions, 0);
});

test("matching READY skips preparation while every binding-axis mismatch invalidates it", async () => {
  let calls = 0;
  const hit = await machine({ store: storage(await readyRaw()), prepare: async () => { calls += 1; return { state: "ready" }; } });
  assert.deepEqual(await hit.prepare(binding()), { state: "ready", reason: null, supported: true, cache_hit: true });
  assert.equal(calls, 0);

  const mismatches = [
    { tenant_id: "tenant-b" }, { user_id: "user-b" }, { principal_ref: `odpr_${"B".repeat(43)}` },
    { mailbox_address: "lawyer-b@example.invalid" }, { installation_id: "odi_startup_preparation_000002" },
    { installation_state_version: 8 }, { delegated_connection_state_version: 12 }, { build: "build-b" },
  ];
  for (const patch of mismatches) {
    calls = 0;
    const runtime = await machine({ store: storage(await readyRaw()), prepare: async () => { calls += 1; return { state: "ready" }; } });
    const result = await runtime.prepare(binding(patch));
    assert.deepEqual([result.state, result.cache_hit, calls], ["ready", false, 1], JSON.stringify(patch));
  }
});

test("clock bounds and corrupt/generated records fail closed before a fresh READY", async () => {
  const raw = await readyRaw();
  const saved = JSON.parse(raw);
  const timeCases = [
    [saved.prepared_at - 60_000, "ready", true, 0, null],
    [saved.prepared_at - 61_000, "deferred", false, 0, "clock_skew"],
    [saved.expires_at + 60_000, "ready", true, 0, null],
    [saved.expires_at + 61_000, "ready", false, 1, null],
  ];
  for (const [time, state, hit, expectedCalls, reason] of timeCases) {
    let calls = 0;
    const runtime = await machine({ store: storage(raw), time, prepare: async () => { calls += 1; return { state: "ready" }; } });
    const result = await runtime.prepare(binding());
    assert.deepEqual([result.state, result.cache_hit, calls, result.reason], [state, hit, expectedCalls, reason]);
  }
  const corruptions = [
    "{",
    JSON.stringify({ ...saved, session_token: "lawos_session_v1.secret" }),
    JSON.stringify({ ...saved, expires_at: saved.expires_at + 1 }),
    JSON.stringify({ ...saved, state: "generated_ready" }),
  ];
  for (const corrupt of corruptions) {
    let calls = 0;
    const store = storage(corrupt);
    const runtime = await machine({ store, prepare: async () => { calls += 1; return { state: "ready" }; } });
    assert.equal((await runtime.prepare(binding())).state, "ready");
    assert.equal(calls, 1);
    assert.doesNotMatch(store.raw(), /lawos_session|generated_ready/u);
  }
});

test("regex-backed stored fields reject every non-string type before marker ownership", async () => {
  const fields = ["tenant_hash", "user_hash", "subject_hash", "mailbox_hash", "build_hash", "installation_id", "marker_owner"];
  for (const field of fields) {
    const record = { schema: KEY, state: "preparing", binding: await storedBinding(), marker_owner: OWNER, marker_started_at: T0, marker_expires_at: T0 + 30_000 };
    const target = field === "marker_owner" ? record : record.binding;
    const valid = target[field];
    for (const replacement of [[valid], { value: valid }, 7, null]) {
      target[field] = replacement;
      const store = storage(JSON.stringify(record));
      let calls = 0;
      const runtime = await machine({ store, prepare: async () => { calls += 1; return { state: "ready" }; } });
      const result = await runtime.prepare(binding());
      const kind = Array.isArray(replacement) ? "array" : replacement === null ? "null" : typeof replacement;
      assert.deepEqual([result.state, calls, JSON.parse(store.raw()).state], ["ready", 1, "ready"], `${field}:${kind}`);
    }
  }
});

test("READY persistence contains only hashed binding fields and no callback extras", async () => {
  const store = storage();
  const rawInput = binding({
    tenant_id: "raw-tenant",
    user_id: "raw-user",
    principal_ref: `odpr_${"C".repeat(43)}`,
    build: "raw-build",
  });
  const secrets = [SECRET_TOKEN, "provider.token.secret", "Confidential subject", "mail body", "secret.pdf"];
  const runtime = await machine({
    store,
    prepare: async () => ({
      state: "ready",
      session_token: secrets[0],
      access_token: secrets[1],
      email_subject: secrets[2],
      body: secrets[3],
      attachment: secrets[4],
    }),
  });
  await runtime.prepare(rawInput);
  for (const secret of [rawInput.tenant_id, rawInput.user_id, rawInput.principal_ref, rawInput.mailbox_address, rawInput.build, ...secrets]) {
    assert.equal(store.raw().includes(secret), false);
  }
  const saved = JSON.parse(store.raw());
  assert.deepEqual(Object.keys(saved.binding).sort(), [
    "build_hash", "delegated_connection_state_version", "installation_id",
    "installation_state_version", "mailbox_hash", "subject_hash", "tenant_hash", "user_hash",
  ]);
  for (const field of ["tenant_hash", "user_hash", "subject_hash", "mailbox_hash", "build_hash"]) {
    assert.match(saved.binding[field], /^[a-f0-9]{64}$/u);
  }
});
