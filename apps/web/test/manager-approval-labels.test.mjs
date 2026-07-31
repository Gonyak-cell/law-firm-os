import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("../", import.meta.url));

test("manager approval and audit rows render human labels without opaque object identifiers", async () => {
  const viteServer = await createServer({
    configFile: false,
    root: webRoot,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const { objectDisplayLabel } = await viteServer.ssrLoadModule("/src/people/approvals/ManagerApprovalQueue.tsx");
    const records = [
      { object_type: "LeaveRequest", object_id: "leave-003" },
      { object_type: "Employee", object_id: "emp_2026_09", display_name: "iam-user-1" },
      { object_type: "Document", object_id: "550e8400-e29b-41d4-a716-446655440000", object_name: "위임장 초안" },
      { object_type: "UnknownWorkflow", object_id: "object-42", display_name: "승인 대상 object-42" },
      { object_type: "UnknownWorkflow", object_id: "opaque-slug", object_name: "opaque-slug" },
      { object_type: "Document", object_id: "doc-opaque", object_name: "검토 문서 550e8400-e29b-41d4-a716-446655440000" },
    ];
    const markup = renderToStaticMarkup(createElement(
      "section",
      null,
      records.flatMap((record, index) => [
        createElement("span", { className: "approval-object", key: `approval-${index}` }, objectDisplayLabel(record)),
        createElement("span", { className: "audit-object", key: `audit-${index}` }, objectDisplayLabel(record)),
      ]),
    ));

    assert.match(markup, /휴가 요청/);
    assert.match(markup, /구성원/);
    assert.match(markup, /위임장 초안/);
    assert.match(markup, /요청/);
    for (const identifier of records.map((record) => record.object_id)) {
      assert.doesNotMatch(markup, new RegExp(identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.doesNotMatch(markup, /iam-user-1|550e8400|emp_2026_09|leave-003|object-42|opaque-slug|doc-opaque/);
  } finally {
    await viteServer.close();
  }
});
