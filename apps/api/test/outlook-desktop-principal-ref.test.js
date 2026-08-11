import assert from "node:assert/strict";
import test from "node:test";

import { outlookDesktopPrincipalRef } from "../src/session-auth.js";

const PRINCIPAL = Object.freeze({
  tenant_id: "tenant-principal-ref-a",
  user_id: "user-principal-ref-a",
  entra_subject_id: "subject-principal-ref-a",
});

test("desktop principal ref is stable opaque and bound to the full server tuple", () => {
  const reference = outlookDesktopPrincipalRef(PRINCIPAL);
  assert.match(reference, /^odpr_[A-Za-z0-9_-]{43}$/u);
  assert.equal(outlookDesktopPrincipalRef({ ...PRINCIPAL }), reference);
  assert.equal(JSON.stringify(reference).includes(PRINCIPAL.tenant_id), false);
  assert.equal(JSON.stringify(reference).includes(PRINCIPAL.user_id), false);
  assert.equal(
    JSON.stringify(reference).includes(PRINCIPAL.entra_subject_id),
    false,
  );
  for (const [field, value] of Object.entries(PRINCIPAL)) {
    assert.notEqual(outlookDesktopPrincipalRef({
      ...PRINCIPAL,
      [field]: `${value}-other`,
    }), reference);
  }
});

test("desktop principal ref is absent until Entra subject is server-verified", () => {
  assert.equal(outlookDesktopPrincipalRef({
    tenant_id: PRINCIPAL.tenant_id,
    user_id: PRINCIPAL.user_id,
    entra_subject_id: null,
  }), null);
  assert.equal(outlookDesktopPrincipalRef({
    ...PRINCIPAL,
    entra_subject_id: "   ",
  }), null);
});
