import assert from "node:assert/strict";
import test from "node:test";
import { renderInvoicePdf } from "../src/invoice-pdf-service.js";

test("B16 invoice PDF renderer emits deterministic PDF bytes and hash", () => {
  const rendered = renderInvoicePdf({
    generated_at: "2026-07-03T00:00:00.000Z",
    invoice: {
      invoice_id: "invoice-b16-001",
      invoice_number: "INV-2026-000016",
      matter_id: "matter-b16-001",
      amount_due: 1200000,
      currency: "KRW",
      issued_at: "2026-07-03T00:00:00.000Z",
      due_date: "2026-08-02",
    },
    invoice_lines: [{ line_type: "fees", amount: 1200000, currency: "KRW" }],
  });

  assert.equal(rendered.mime_type, "application/pdf");
  assert.equal(rendered.bytes.subarray(0, 8).toString("utf8"), "%PDF-1.4");
  assert.equal(rendered.byte_size, rendered.bytes.byteLength);
  assert.match(rendered.sha256, /^[a-f0-9]{64}$/);
  assert.equal(rendered.production_ready_claim, false);
});
