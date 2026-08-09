import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_FEATURE_CATALOG,
  evaluateOutlookFeatureCatalog,
  getOutlookFeatureById,
  isOutlookFeatureRuntimeAvailable,
} from "../src/outlook-feature-catalog.js";

const ITEM = Object.freeze({
  itemContextKey: "item-context-1",
  immutableMessageId: "immutable-message-1",
  internetMessageId: "<message-1@example.test>",
  conversationId: "conversation-1",
  filedThreadId: "filed-thread-1",
  subject: "검토 요청",
  recipients: ["recipient@example.test"],
  bodyPreview: "검토 의견을 보냅니다.",
  isInSentItems: true,
  isDraft: false,
  senderMatchesMailbox: true,
});

function context(overrides = {}) {
  return {
    profile: "matter-full",
    host: "Mailbox",
    form: "read",
    surface: "taskpane",
    item: ITEM,
    itemFresh: true,
    matterId: "matter-1",
    connection: "connected",
    online: true,
    ...overrides,
  };
}

const EXPECTED_ROWS = [
  ["matter.search", "Matter 찾기", "matter-full", true, true, []],
  ["mail.save-with-attachments", "메일과 첨부 저장", "matter-full", true, false, []],
  ["filing.correct-placement", "저장 위치 바꾸기", "matter-full", true, false, []],
  ["conversation.auto-save", "대화 자동 저장", "matter-full", true, false, []],
  ["mail.save-sent", "보낸 메일 저장", "matter-full", true, false, []],
  ["task.create", "업무 만들기", "matter-full", true, false, []],
  ["time-entry.draft", "시간기록 초안", "matter-full", true, true, []],
  ["activity.recent", "최근 활동 보기", "matter-full", true, true, []],
  ["precedent.search", "유사 사건·선례 찾기", "matter-full", true, true, []],
  ["document.create-and-sign-status", "문서 만들기·서명 상태", "matter-full", true, true, []],
  ["inquiry.create", "새 문의 등록", "inquiry-only", true, false, []],
  ["inquiry.link-existing", "기존 문의 연결", "inquiry-only", true, false, []],
  ["smart-alert.on-message-send", "보내기 전 알림", "matter-full", false, true, ["OnMessageSend"]],
];

const EXPECTED_ENDPOINTS = {
  "matter.search": "/api/outlook/matters",
  "mail.save-with-attachments": "/api/outlook/email/file",
  "filing.correct-placement": "/api/outlook/email/corrections",
  "conversation.auto-save": "/api/outlook/conversation-policies",
  "mail.save-sent": "/api/outlook/sent/file",
  "task.create": "/api/outlook/tasks",
  "time-entry.draft": "/api/outlook/time-entry-drafts",
  "activity.recent": "/api/outlook/matters/:matter_id/timeline",
  "precedent.search": "/api/outlook/precedents",
  "document.create-and-sign-status": "/api/outlook/documents",
  "inquiry.create": "/api/outlook/inquiries",
  "inquiry.link-existing": "/api/outlook/inquiries",
  "smart-alert.on-message-send": "/api/outlook/smart-alerts/evaluate",
};

test("catalog has only the retained stable feature IDs and complete active contracts", () => {
  assert.deepEqual(
    OUTLOOK_FEATURE_CATALOG.map((feature) => [
      feature.id,
      feature.label,
      feature.profile,
      feature.availability.read,
      feature.availability.compose,
      feature.availability.event,
    ]),
    EXPECTED_ROWS,
  );
  assert.equal(new Set(OUTLOOK_FEATURE_CATALOG.map(({ id }) => id)).size, EXPECTED_ROWS.length);
  assert.deepEqual(
    Object.fromEntries(OUTLOOK_FEATURE_CATALOG.map(({ id, endpoint }) => [id, endpoint])),
    EXPECTED_ENDPOINTS,
  );

  const requiredKeys = [
    "profile",
    "availability",
    "requiredItemFields",
    "matterPrerequisite",
    "connectionPrerequisite",
    "opener",
    "endpoint",
    "domainService",
    "operationReceipt",
    "duplicateSemantics",
    "partialResultSemantics",
    "staleItemResponse",
    "offlineReconnectResponse",
    "focusTarget",
    "mutation",
    "implementationState",
  ];
  const allowedKeys = new Set([...requiredKeys, "id", "label", "itemConstraints",
    "integrationDependency", "runtimeReadinessKey", "readinessEndpoint"]);
  for (const feature of OUTLOOK_FEATURE_CATALOG) {
    assert.deepEqual(requiredKeys.filter((key) => !Object.hasOwn(feature, key)), []);
    assert.deepEqual(Object.keys(feature).filter((key) => !allowedKeys.has(key)), []);
    assert.equal(
      feature.implementationState,
      feature.id === "conversation.auto-save"
        ? "blocked_until_shell"
        : feature.id === "precedent.search"
          ? "blocked"
          : "active",
    );
    assert.ok(["rail icon", "all-functions row", "inquiry icon", "event"].includes(feature.opener));
    assert.ok(feature.endpoint.length > 0);
    assert.ok(feature.domainService.length > 0);
    assert.ok(feature.duplicateSemantics.length > 0);
    assert.ok(feature.partialResultSemantics.length > 0);
    assert.ok(feature.staleItemResponse.length > 0);
    assert.ok(feature.offlineReconnectResponse.offline.length > 0);
    assert.ok(feature.offlineReconnectResponse.reconnect.length > 0);
    assert.ok(feature.focusTarget.length > 0);
  }

});

test("precedent UI stays blocked until shared-shell integration and then requires authoritative API readiness", () => {
  const feature = getOutlookFeatureById("precedent.search");
  assert.equal(feature.integrationDependency, "OUTM-08-12-shared-shell");
  assert.equal(feature.readinessEndpoint, "/api/outlook/precedents/readiness");
  assert.equal(isOutlookFeatureRuntimeAvailable(feature, {
    precedent_search: { authoritative: true, runtime_ready: true },
  }), false);
  const integrated = { ...feature, implementationState: "active" };
  assert.equal(isOutlookFeatureRuntimeAvailable(integrated, {
    precedent_search: { authoritative: false, runtime_ready: true },
  }), false);
  assert.equal(isOutlookFeatureRuntimeAvailable(integrated, {
    precedent_search: { authoritative: true, runtime_ready: false },
  }), false);
  assert.equal(isOutlookFeatureRuntimeAvailable(integrated, {
    precedent_search: { authoritative: true, runtime_ready: true },
  }), true);
});

test("required current-item and Matter prerequisites match the retained contract", () => {
  const sharedMessageFields = [
    "itemContextKey",
    "immutableMessageId",
    "internetMessageId",
    "conversationId",
  ];
  const inquiryFields = ["itemContextKey", "internetMessageId", "conversationId", "subject"];
  const expected = {
    "matter.search": [["itemContextKey"], false],
    "mail.save-with-attachments": [sharedMessageFields, true],
    "filing.correct-placement": [sharedMessageFields, true],
    "conversation.auto-save": [["itemContextKey", "conversationId", "filedThreadId"], true],
    "mail.save-sent": [sharedMessageFields, true],
    "task.create": [["itemContextKey", "subject"], true],
    "time-entry.draft": [["itemContextKey"], true],
    "activity.recent": [[], true],
    "precedent.search": [[], true],
    "document.create-and-sign-status": [[], true],
    "inquiry.create": [inquiryFields, false],
    "inquiry.link-existing": [inquiryFields, false],
    "smart-alert.on-message-send": [["recipients", "subject", "bodyPreview"], false],
  };
  assert.deepEqual(
    Object.fromEntries(OUTLOOK_FEATURE_CATALOG.map((feature) => [
      feature.id,
      [feature.requiredItemFields, feature.matterPrerequisite],
    ])),
    expected,
  );
  assert.deepEqual(
    OUTLOOK_FEATURE_CATALOG.filter(({ connectionPrerequisite }) => connectionPrerequisite).map(({ id }) => id),
    [
      "mail.save-with-attachments",
      "conversation.auto-save",
      "mail.save-sent",
      "inquiry.create",
      "inquiry.link-existing",
      "smart-alert.on-message-send",
    ],
  );
  assert.deepEqual(getOutlookFeatureById("mail.save-sent").itemConstraints, {
    isInSentItems: true,
    isDraft: false,
    senderMatchesMailbox: true,
  });
});

test("catalog and evaluated projections are deeply immutable", () => {
  assert.ok(Object.isFrozen(OUTLOOK_FEATURE_CATALOG));
  for (const feature of OUTLOOK_FEATURE_CATALOG) {
    assert.ok(Object.isFrozen(feature));
    assert.ok(Object.isFrozen(feature.availability));
    assert.ok(Object.isFrozen(feature.availability.event));
    assert.ok(Object.isFrozen(feature.requiredItemFields));
    assert.ok(Object.isFrozen(feature.operationReceipt));
    assert.ok(Object.isFrozen(feature.offlineReconnectResponse));
  }
  const evaluated = evaluateOutlookFeatureCatalog(context());
  assert.ok(Object.isFrozen(evaluated));
  assert.ok(evaluated.every(Object.isFrozen));
  assert.throws(() => evaluated.push(null), TypeError);
});

test("every mutation declares success, duplicate, partial, and failure receipts", () => {
  for (const feature of OUTLOOK_FEATURE_CATALOG.filter(({ mutation }) => mutation)) {
    for (const outcome of ["success", "duplicate", "partial", "failure"]) {
      assert.equal(typeof feature.operationReceipt[outcome], "string", `${feature.id}:${outcome}`);
      assert.ok(feature.operationReceipt[outcome].length > 0, `${feature.id}:${outcome}`);
    }
  }
});
