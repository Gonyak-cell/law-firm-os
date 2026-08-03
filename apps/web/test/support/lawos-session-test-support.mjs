export const MATTER_UI_SESSION = Object.freeze({
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "session_matter_ui_harness",
  source: "api_signed_session",
  actor_ref: "user_matter_ui_harness",
  tenant_refs: Object.freeze({
    default: "tenant_default_ui_harness",
    client: "tenant_client_ui_harness",
    matter: "tenant_matter_ui_harness",
    vault: "tenant_vault_ui_harness",
    crm: "tenant_crm_ui_harness",
    hrx: "tenant_hrx_ui_harness",
  }),
  role_ids: Object.freeze(["lawos_admin", "matter_runtime_user"]),
  scopes: Object.freeze([
    "matter.admin",
    "hrx.people.read",
    "analytics.finance.read",
    "finance.bank.read",
    "finance.time.write",
    "finance.expense.write",
    "finance.billing.write",
    "finance.payment.write",
    "finance.export",
  ]),
  review_state: "allow",
  expires_at: "2099-01-01T00:00:00.000Z",
});

export function installMatterUiSignedSessionContext(source = globalThis) {
  const targets = [...new Set([source, source?.window])]
    .filter((target) => target && typeof target === "object");
  const previous = targets.map((target) => ({
    target,
    present: Object.hasOwn(target, "__LAWOS_SESSION_CONTEXT__"),
    value: target.__LAWOS_SESSION_CONTEXT__,
  }));
  for (const target of targets) target.__LAWOS_SESSION_CONTEXT__ = MATTER_UI_SESSION;
  return () => {
    for (const entry of previous) {
      if (entry.present) entry.target.__LAWOS_SESSION_CONTEXT__ = entry.value;
      else delete entry.target.__LAWOS_SESSION_CONTEXT__;
    }
  };
}

export async function installMatterUiSignedSession(page) {
  await page.addInitScript((session) => { window.__LAWOS_SESSION_CONTEXT__ ??= session; }, MATTER_UI_SESSION);
  await page.evaluate((session) => { window.__LAWOS_SESSION_CONTEXT__ ??= session; }, MATTER_UI_SESSION);
}
