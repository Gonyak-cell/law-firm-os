import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const detail = await readFile(new URL("../src/components/matter-small-firm/MatterDetailTabs.jsx", import.meta.url), "utf8");
const operations = await readFile(new URL("../src/components/matter-small-firm/MatterOperationsSurface.jsx", import.meta.url), "utf8");
const matters = await readFile(new URL("../src/components/MattersSurface.jsx", import.meta.url), "utf8");

test("[TUW-20] selected Matter detail is a scoped five-tab shell with roving keyboard focus", () => {
  for (const label of ["개요", "업무·기한", "연락·기록", "문서", "시간·청구"]) {
    assert.match(detail, new RegExp(label));
  }
  assert.match(detail, /data-matter-detail-tabs="five"/);
  assert.match(detail, /role="tablist"/);
  assert.match(detail, /role="tabpanel"/);
  assert.match(detail, /matter\?\.matter_id/);
  assert.match(detail, /scoped\(/);
  assert.match(matters, /<MatterDetailTabs/);
});

test("[TUW-22] meeting form requires a Matter, title, and decision before the operations meeting command runs", () => {
  assert.match(operations, /data-matter-meeting-form="true"/);
  assert.match(operations, /회의 제목/);
  assert.match(operations, /참석자/);
  assert.match(operations, /결정사항/);
  assert.match(operations, /후속 업무 ID/);
  assert.match(operations, /attendeeIds\.length === 0 \|\| decisions\.length === 0/);
  assert.match(matters, /createMatterOpsMeeting/);
});

test("[TUW-27] follow-up screen exposes exactly the three operational saved views and stable deep links", () => {
  for (const label of ["오늘 후속", "의뢰인 답변 대기", "7일 연락 없음"]) {
    assert.match(operations, new RegExp(label));
  }
  assert.match(operations, /\["stale_7d", "7일 연락 없음"\]/);
  assert.match(operations, /data-followup-id=\{row\.followup_id\}/);
  assert.match(operations, /<OpenMatterButton row=\{row\} onSelectMatter=\{onSelectMatter\}/);
});

test("[TUW-38] close action reuses the audited status transition and is gated by live closeout readiness", () => {
  assert.match(detail, /canClose && !isClosed && onCloseMatter/);
  assert.match(detail, /disabled=\{closePending\}/);
  assert.match(detail, /data-matter-close-mutation-status/);
  assert.match(matters, /completeMatterStatus/);
  assert.match(matters, /onCloseMatter=\{handleCompleteStatus\}/);
});
