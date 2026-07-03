#!/usr/bin/env node
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findRegisteredAccountByUserId, highestPrivilegeRegisteredAccount, MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const JSON_PATH = join(ARTIFACT_DIR, "upl-c07-contact-raw-values-proof.json");
const MD_PATH = join(ARTIFACT_DIR, "upl-c07-contact-raw-values-proof.md");
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const VALUE_READER_ACCOUNT = highestPrivilegeRegisteredAccount();
const CONTACT_OPERATOR_ACCOUNT = findRegisteredAccountByUserId("user_amic_tryoon") ?? VALUE_READER_ACCOUNT;
const MASKED_READER_ACCOUNT = CONTACT_OPERATOR_ACCOUNT;
const ACTOR = CONTACT_OPERATOR_ACCOUNT.user_id;
const EMAIL_CONTACT_ID = "contact_upl_c07_raw_email";
const PHONE_CONTACT_ID = "contact_upl_c07_raw_phone";
const EMAIL_VALUE = "contact.raw.uplc07@example.invalid";
const PHONE_VALUE = "+82 10-5555-0707";

mkdirSync(ARTIFACT_DIR, { recursive: true });

async function apiJson(baseUrl, path, options = {}) {
  const { account = CONTACT_OPERATOR_ACCOUNT, ...requestOptions } = options;
  const headers = {
    ...(await apiSessionHeaders(baseUrl, account)),
    ...(requestOptions.headers ?? {}),
  };
  if (requestOptions.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...requestOptions, headers });
  return { status: response.status, body: await response.json() };
}

function contactPayload({ contactId, displayName, email, phone, idempotencyKey }) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_c07_contact_value_write",
    audit_hint_ref: "upl_c07_contact_value_write_probe",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
    reason: "upl_c07_contact_raw_value_created",
    contact: {
      contact_id: contactId,
      tenant_id: TENANT,
      display_name: displayName,
      status: "active",
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    },
  };
}

function contactById(response, contactId) {
  return (response.body.items ?? []).find((item) => item.contact_id === contactId) ?? null;
}

const crmStorePath = join(mkdtempSync(join(tmpdir(), "upl-c07-crm-")), "crm.json");
let report;

async function withServer(callback) {
  const started = await startApiServer({ port: 0, crmStorePath });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

await withServer(async (baseUrl) => {
  const emailCreate = await apiJson(baseUrl, "/api/crm/contacts", {
    method: "POST",
    body: JSON.stringify(
      contactPayload({
        contactId: EMAIL_CONTACT_ID,
        displayName: "UPL C07 raw email contact",
        email: EMAIL_VALUE,
        idempotencyKey: "upl-c07-create-email",
      }),
    ),
  });
  const phoneCreate = await apiJson(baseUrl, "/api/crm/contacts", {
    method: "POST",
    body: JSON.stringify(
      contactPayload({
        contactId: PHONE_CONTACT_ID,
        displayName: "UPL C07 raw phone contact",
        phone: PHONE_VALUE,
        idempotencyKey: "upl-c07-create-phone",
      }),
    ),
  });
  const maskedList = await apiJson(
    baseUrl,
    `/api/crm/contacts?tenant_id=${TENANT}&permission_ref=upl_c07_contact_read&audit_hint_ref=upl_c07_masked_read_probe`,
    { account: MASKED_READER_ACCOUNT },
  );
  const visibleList = await apiJson(
    baseUrl,
    `/api/crm/contacts?tenant_id=${TENANT}&permission_ref=upl_c07_contact_value_read&audit_hint_ref=upl_c07_visible_read_probe`,
    { account: VALUE_READER_ACCOUNT },
  );
  const maskedEmail = contactById(maskedList, EMAIL_CONTACT_ID);
  const maskedPhone = contactById(maskedList, PHONE_CONTACT_ID);
  const visibleEmail = contactById(visibleList, EMAIL_CONTACT_ID);
  const visiblePhone = contactById(visibleList, PHONE_CONTACT_ID);

  report = {
    schema_version: "law-firm-os.upl-c07.contact-raw-values-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: "PENDING",
    api_url: baseUrl,
    contract_ref: "UPL-C-07",
    route_surface: ["POST /api/crm/contacts", "GET /api/crm/contacts"],
    tenant_id: TENANT,
    checks: [
      {
        id: "email-and-phone-raw-values-are-accepted-and-stored",
        passed:
          emailCreate.status === 201 &&
          phoneCreate.status === 201 &&
          emailCreate.body.audit_event?.metadata?.raw_contact_value_stored === true &&
          phoneCreate.body.audit_event?.metadata?.raw_contact_value_stored === true,
      },
      {
        id: "create-response-does-not-leak-raw-contact-values",
        passed:
          emailCreate.body.item?.contact_point_value_included === false &&
          phoneCreate.body.item?.contact_point_value_included === false &&
          !("contact_point_value" in (emailCreate.body.item ?? {})) &&
          !("email" in (emailCreate.body.item ?? {})) &&
          !("contact_point_value" in (phoneCreate.body.item ?? {})) &&
          !("phone" in (phoneCreate.body.item ?? {})),
      },
      {
        id: "non-reader-contact-list-masks-raw-values",
        passed:
          maskedList.status === 200 &&
          maskedEmail?.contact_point_value_included === false &&
          maskedPhone?.contact_point_value_included === false &&
          maskedEmail?.contact_value_masked === true &&
          maskedPhone?.contact_value_masked === true &&
          !("contact_point_value" in (maskedEmail ?? {})) &&
          !("email" in (maskedEmail ?? {})) &&
          !("phone" in (maskedPhone ?? {})),
      },
      {
        id: "contact-value-reader-can-read-email-and-phone",
        passed:
          visibleList.status === 200 &&
          visibleEmail?.contact_point_value_included === true &&
          visibleEmail?.email_value_included === true &&
          visibleEmail?.email === EMAIL_VALUE &&
          visibleEmail?.contact_point_value === EMAIL_VALUE &&
          visiblePhone?.contact_point_value_included === true &&
          visiblePhone?.phone_value_included === true &&
          visiblePhone?.phone === PHONE_VALUE &&
          visiblePhone?.contact_point_value === PHONE_VALUE,
      },
      {
        id: "audit-response-and-output-omit-raw-secrets",
        passed:
          !JSON.stringify({
            emailAudit: emailCreate.body.audit_event,
            phoneAudit: phoneCreate.body.audit_event,
            maskedList: maskedList.body,
          }).includes(EMAIL_VALUE) &&
          !JSON.stringify({
            emailAudit: emailCreate.body.audit_event,
            phoneAudit: phoneCreate.body.audit_event,
            maskedList: maskedList.body,
          }).includes(PHONE_VALUE),
      },
    ],
    observed: {
      created: {
        email: {
          status: emailCreate.status,
          item: emailCreate.body.item,
          audit_metadata: emailCreate.body.audit_event?.metadata ?? null,
        },
        phone: {
          status: phoneCreate.status,
          item: phoneCreate.body.item,
          audit_metadata: phoneCreate.body.audit_event?.metadata ?? null,
        },
      },
      masked_read: {
        status: maskedList.status,
        email: maskedEmail,
        phone: maskedPhone,
      },
      visible_read: {
        status: visibleList.status,
        email: visibleEmail,
        phone: visiblePhone,
      },
    },
  };
});

await withServer(async (baseUrl) => {
  const visibleAfterRestart = await apiJson(
    baseUrl,
    `/api/crm/contacts?tenant_id=${TENANT}&permission_ref=upl_c07_contact_value_read&audit_hint_ref=upl_c07_restart_read_probe`,
    { account: VALUE_READER_ACCOUNT },
  );
  const restartedEmail = contactById(visibleAfterRestart, EMAIL_CONTACT_ID);
  const restartedPhone = contactById(visibleAfterRestart, PHONE_CONTACT_ID);
  const restartCheck = {
    id: "raw-values-survive-crm-runtime-restart",
    passed:
      visibleAfterRestart.status === 200 &&
      restartedEmail?.contact_point_value === EMAIL_VALUE &&
      restartedPhone?.contact_point_value === PHONE_VALUE &&
      restartedEmail?.contact_point_value_included === true &&
      restartedPhone?.contact_point_value_included === true,
  };
  report.checks.push(restartCheck);
  report.observed.restart_visible_read = {
    status: visibleAfterRestart.status,
    email: restartedEmail,
    phone: restartedPhone,
  };
});

report.verdict = report.checks.every((check) => check.passed) ? "PASS" : "FAIL";

writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  MD_PATH,
  [
    "# UPL-C-07 Contact Raw Values Proof",
    "",
    `- verdict: ${report.verdict}`,
    `- contract_ref: ${report.contract_ref}`,
    `- route_surface: ${report.route_surface.join(", ")}`,
    `- email_contact_id: ${EMAIL_CONTACT_ID}`,
    `- phone_contact_id: ${PHONE_CONTACT_ID}`,
    "",
    "## Checks",
    ...report.checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, report: MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
