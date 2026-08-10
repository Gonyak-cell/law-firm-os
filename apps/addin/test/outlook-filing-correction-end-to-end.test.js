import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";
import {
  createOutlookFilingCorrectionRequest,
  parseOutlookFilingCorrectionCurrentResponse,
  parseOutlookFilingCorrectionResponse,
} from "../src/outlook-filing-correction.js";
import {
  MATTER_A,
  MATTER_B,
} from "../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";
import {
  correctionApiRequest,
  currentCorrectionPath,
  startCorrectionApiFixture,
} from "../../api/test/helpers/outlook-email-filing-correction-api-fixture.js";

const ADDIN_ROOT = fileURLToPath(new URL("../", import.meta.url));
const ITEM_CONTEXT = { item_context_key: "item-context-outm22-e2e", session_generation: 22 };
const CORRECTION_PATH = "/api/outlook/email/corrections";

async function loadPanel(t) {
  const vite = await createServer({
    root: ADDIN_ROOT,
    configFile: `${ADDIN_ROOT}/vite.config.js`,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => vite.close());
  return (await vite.ssrLoadModule("/src/outlook-filing-correction-panel.jsx")).OutlookFilingCorrectionPanel;
}

function panelProps(result) {
  return {
    currentPlacement: { matter_id: MATTER_A },
    currentMatter: { matter_id: MATTER_A, matter_code: "OUTM21/A", title: "Matter A" },
    targetMatters: [{ matter_id: MATTER_B, matter_code: "OUTM21/B", title: "Matter B" }],
    targetMatterId: MATTER_B,
    targetQuery: "Matter B",
    reason: "담당 Matter 정정",
    confirmed: true,
    result,
    onTargetQueryChange: () => {},
    onTargetMatterChange: () => {},
    onReasonChange: () => {},
    onConfirmationChange: () => {},
    onSubmit: () => {},
    onCopy: () => {},
  };
}

test("OUTM-22 correction contract keeps server, client, and current Outlook view in one chain", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "outm22-e2e-"));
  const fixture = await startCorrectionApiFixture({ matterFilePath: join(root, "matter.json") });
  try {
    const Panel = await loadPanel(t);
    const initialHttp = await correctionApiRequest(fixture, currentCorrectionPath());
    assert.equal(initialHttp.response.status, 200, JSON.stringify(initialHttp.body));
    const current = parseOutlookFilingCorrectionCurrentResponse(
      { status: initialHttp.response.status, body: initialHttp.body },
      { email_thread_id: initialHttp.body.item.email_thread_id },
    );
    const request = await createOutlookFilingCorrectionRequest({
      ...ITEM_CONTEXT,
      email_thread_id: current.email_thread_id,
      current_placement: current,
      target_matter_id: MATTER_B,
      reason: "담당 Matter 정정",
      cryptoImpl: webcrypto,
    });
    assert.equal(request.path, CORRECTION_PATH);
    const createdHttp = await correctionApiRequest(fixture, request.path, {
      method: request.method,
      body: request.body,
    });
    assert.equal(createdHttp.response.status, 201, JSON.stringify(createdHttp.body));
    const created = parseOutlookFilingCorrectionResponse(
      { status: createdHttp.response.status, body: createdHttp.body },
      { request, current: ITEM_CONTEXT },
    );
    assert.equal(created.outcome, "created");
    assert.equal(created.apply_to_current_view, true);
    const successMarkup = renderToStaticMarkup(React.createElement(Panel, panelProps(created)));
    assert.match(successMarkup, /data-testid="filing-correction-result"[^>]*>변경됨</u);

    const replayHttp = await correctionApiRequest(fixture, request.path, {
      method: request.method,
      body: request.body,
    });
    assert.equal(replayHttp.response.status, 200, JSON.stringify(replayHttp.body));
    const replay = parseOutlookFilingCorrectionResponse(
      { status: replayHttp.response.status, body: replayHttp.body },
      { request, current: ITEM_CONTEXT },
    );
    assert.equal(replay.outcome, "idempotent_replay");
    assert.equal(replay.apply_to_current_view, true);
    const replayMarkup = renderToStaticMarkup(React.createElement(Panel, panelProps(replay)));
    assert.match(replayMarkup, /data-testid="filing-correction-result"[^>]*>이미 변경됨</u);

    const late = parseOutlookFilingCorrectionResponse(
      { status: createdHttp.response.status, body: createdHttp.body },
      {
        request,
        current: { item_context_key: "item-context-outm22-late", session_generation: ITEM_CONTEXT.session_generation + 1 },
      },
    );
    assert.equal(late.apply_to_current_view, false);
    const lateMarkup = renderToStaticMarkup(React.createElement(Panel, panelProps(late)));
    assert.doesNotMatch(lateMarkup, /data-testid="filing-correction-result"/u);

    const contradictory = {
      ...request,
      body: {
        ...request.body,
        reason: "다른 이유",
        idempotency_key: `outlook-email-correction:${"f".repeat(64)}`,
      },
    };
    assert.throws(
      () => parseOutlookFilingCorrectionResponse(
        { status: createdHttp.response.status, body: createdHttp.body },
        { request: contradictory, current: ITEM_CONTEXT },
      ),
      /provenance|binding|mismatch/u,
    );
  } finally {
    try {
      await fixture.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
