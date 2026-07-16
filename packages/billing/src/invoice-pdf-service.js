import { createHash } from "node:crypto";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function money(value) {
  return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function pdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 120);
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function buildPdf(lines) {
  const textLines = lines.map((line, index) => `1 0 0 1 72 ${760 - index * 18} Tm (${pdfText(line)}) Tj`).join("\n");
  const content = `BT\n/F1 11 Tf\n${textLines}\nET\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

export function renderSimpleTextPdf(lines = []) {
  if (!Array.isArray(lines) || lines.length === 0) throw new TypeError("PDF lines are required");
  return buildPdf(lines);
}

export function renderInvoicePdf({ invoice = {}, invoice_lines = [], generated_at = new Date().toISOString() } = {}) {
  const invoiceId = requiredString(invoice, "invoice_id");
  const invoiceNumber = invoice.invoice_number ?? invoiceId;
  const lines = [
    "Law Firm OS Invoice",
    `Invoice ID: ${invoiceId}`,
    `Invoice Number: ${invoiceNumber}`,
    `Matter: ${invoice.matter_id ?? "unassigned"}`,
    `Issued: ${invoice.issued_at ?? generated_at}`,
    `Due: ${invoice.due_date ?? "not set"}`,
    `Amount Due: ${money(invoice.amount_due ?? invoice.invoice_total ?? invoice.amount ?? 0)} ${invoice.currency ?? "KRW"}`,
    "Lines:",
    ...invoice_lines.map((line, index) =>
      `${index + 1}. ${line.line_type ?? "fees"} ${money(line.amount ?? line.line_amount ?? 0)} ${line.currency ?? invoice.currency ?? "KRW"}`
    ),
  ];
  const bytes = buildPdf(lines);
  return Object.freeze({
    invoice_id: invoiceId,
    invoice_number: invoiceNumber,
    generated_at,
    filename: `${invoiceNumber}.pdf`,
    mime_type: "application/pdf",
    bytes,
    byte_size: bytes.byteLength,
    sha256: sha256Hex(bytes),
    production_ready_claim: false,
    go_live_claim: false,
  });
}
