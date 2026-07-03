import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  LAWOS_NOTIFICATION_EVENT_CLASSES,
  createNotificationFiringService,
} from "../packages/notifications/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/upl-e06-notification-firing-proof.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/upl-e06-notification-firing-proof.md");

const EVENT_SAMPLES = Object.freeze({
  approval_pending: Object.freeze({
    title: "결재 대기",
    body: "새 결재 요청이 검토 대기 중입니다.",
    resource_ref: "approval:approval_upl_e06_001",
  }),
  deadline_approaching: Object.freeze({
    title: "기한 임박",
    body: "사건 기한이 48시간 이내로 다가왔습니다.",
    resource_ref: "deadline:deadline_upl_e06_001",
  }),
  contract_expiring: Object.freeze({
    title: "계약 만료 예정",
    body: "근로계약 만료일이 30일 이내입니다.",
    resource_ref: "hrx-document:contract_upl_e06_001",
  }),
  risk_detected: Object.freeze({
    title: "리스크 발생",
    body: "HRX 리스크 스캔에서 조치 대상이 발견되었습니다.",
    resource_ref: "risk:risk_upl_e06_001",
  }),
});

function sampleEvent(eventClass) {
  const sample = EVENT_SAMPLES[eventClass];
  return {
    event_id: `upl-e06-${eventClass}`,
    event_class: eventClass,
    tenant_id: "tenant_upl_e06_notifications",
    actor_id: "system_upl_e06",
    recipient_user_id: "user_lawyer_upl_e06",
    recipient_email: "lawyer-upl-e06@example.invalid",
    title: sample.title,
    body: sample.body,
    resource_ref: sample.resource_ref,
    occurred_at: "2026-07-03T00:00:00.000+09:00",
  };
}

const service = createNotificationFiringService({
  fromEmail: "notifications@lawos.example.invalid",
  now: () => "2026-07-03T00:00:00.000+09:00",
});

const result = await service.fireRequiredEventClasses(LAWOS_NOTIFICATION_EVENT_CLASSES.map(sampleEvent));
const checks = [
  {
    id: "required-event-classes-fired",
    passed: result.outcome === "passed" &&
      LAWOS_NOTIFICATION_EVENT_CLASSES.every((eventClass) => result.fired_event_classes.includes(eventClass)),
  },
  { id: "in-app-deliveries-recorded", passed: result.in_app_count === 4 },
  { id: "ses-send-records-recorded", passed: result.ses_send_count === 4 },
  {
    id: "single-event-produces-both-channels",
    passed: result.receipts.every((receipt) => receipt.in_app_delivery.event_id === receipt.ses_send_record.event_id),
  },
  {
    id: "no-secret-or-body-material-in-records",
    passed: result.receipts.every((receipt) => (
      receipt.ses_send_record.credential_material_included === false &&
      receipt.ses_send_record.payload_body_included === false &&
      receipt.event.payload_body_included === false
    )),
  },
];

const artifact = {
  schema_version: "lawos.wave1.upl-e06.notification-firing-proof.v1",
  generated_at: new Date().toISOString(),
  row_id: "UPL-E-06",
  status: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  scope: "lightweight SES-shaped email plus in-app event firing receipt",
  boundary: {
    delivery_mode: "notification_simulated_local_recorder",
    aws_ses_provider_shape: true,
    ses_transport: "local-ses-send-recorder",
    external_aws_ses_network_call_made: result.external_ses_network_call_made,
    production_ready_claim: false,
    credential_material_included: false,
  },
  required_event_classes: LAWOS_NOTIFICATION_EVENT_CLASSES,
  checks,
  receipts: result.receipts,
};

mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
writeFileSync(ARTIFACT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(
  ARTIFACT_MD,
  [
    "# UPL-E-06 Notification Firing Proof",
    "",
    `Status: ${artifact.status}`,
    "",
    `- Required event classes: ${artifact.required_event_classes.join(", ")}`,
    `- In-app deliveries: ${result.in_app_count}`,
    `- SES send records: ${result.ses_send_count}`,
    `- External AWS SES network call made: ${artifact.boundary.external_aws_ses_network_call_made}`,
    `- Delivery mode: ${artifact.boundary.delivery_mode}`,
    `- SES transport: ${artifact.boundary.ses_transport}`,
    `- Production-ready claim: ${artifact.boundary.production_ready_claim}`,
    "",
    "| Check | Passed |",
    "|---|---:|",
    ...checks.map((check) => `| ${check.id} | ${check.passed} |`),
    "",
  ].join("\n"),
);

if (artifact.status !== "PASS") throw new Error(`UPL-E-06 notification proof failed: ${ARTIFACT_JSON}`);
console.log(`UPL-E-06 notification firing proof PASS -> ${ARTIFACT_JSON}`);
