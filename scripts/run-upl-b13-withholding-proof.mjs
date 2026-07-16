import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  calculateKoreanBusinessIncomeWithholding,
  createFinanceRepository,
  createTaxInvoice,
} from "../packages/billing/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/upl-b13-withholding-proof.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/upl-b13-withholding-proof.md");

const repository = createFinanceRepository();
repository.create({
  model_type: "Invoice",
  invoice_id: "invoice_upl_b13_withholding_001",
  tenant_id: "tenant_upl_b13",
  matter_id: "matter_upl_b13",
  amount_due: 1_000_000,
  status: "issued",
});

const withholding = calculateKoreanBusinessIncomeWithholding({ gross_amount: 1_000_000 });
const taxInvoice = createTaxInvoice({
  repository,
  actor_id: "user_upl_b13",
  idempotency_key: "upl-b13-tax-withholding-001",
  tax_invoice: {
    tax_invoice_id: "tax_invoice_upl_b13_withholding_001",
    tenant_id: "tenant_upl_b13",
    invoice_id: "invoice_upl_b13_withholding_001",
    tax_registration_ref: "local-tax-registration-ref-upl-b13",
    withholding_profile: "kr_3_3_business_income",
  },
});

const checks = [
  { id: "withholding-rate-3-3", passed: withholding.withholding_rate === 0.033 },
  { id: "income-tax-3-percent", passed: withholding.income_tax_amount === 30_000 },
  { id: "local-income-tax-0-3-percent", passed: withholding.local_income_tax_amount === 3_000 },
  { id: "net-payable-after-withholding", passed: withholding.net_payable_amount === 967_000 },
  { id: "tax-invoice-carries-withholding", passed: taxInvoice.tax_invoice.withholding_amount === 33_000 },
  { id: "no-external-vendor-sandbox-claim", passed: withholding.external_vendor_sandbox_claim === false },
];

const artifact = {
  schema_version: "lawos.wave1.upl-b13.withholding-proof.v1",
  generated_at: new Date().toISOString(),
  row_id: "UPL-B-13",
  status: checks.every((check) => check.passed) ? "LOCAL_WITHHOLDING_PASS_VENDOR_BLOCKED" : "FAIL",
  scope: "local Korean 3.3 percent withholding proof for tax invoice model",
  strict_boundary: {
    local_3_3_withholding_model_passed: true,
    external_tax_invoice_vendor_selected: false,
    external_vendor_sandbox_roundtrip: false,
    production_ready_claim: false,
  },
  withholding,
  tax_invoice: taxInvoice.tax_invoice,
  checks,
};

mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
writeFileSync(ARTIFACT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(
  ARTIFACT_MD,
  [
    "# UPL-B-13 Withholding Proof",
    "",
    `Status: ${artifact.status}`,
    "",
    `- Gross amount: ${withholding.gross_amount}`,
    `- Income tax 3%: ${withholding.income_tax_amount}`,
    `- Local income tax 0.3%: ${withholding.local_income_tax_amount}`,
    `- Total withholding: ${withholding.total_withholding_amount}`,
    `- Net payable: ${withholding.net_payable_amount}`,
    `- External vendor sandbox roundtrip: ${artifact.strict_boundary.external_vendor_sandbox_roundtrip}`,
    "",
  ].join("\n"),
);

if (artifact.status !== "LOCAL_WITHHOLDING_PASS_VENDOR_BLOCKED") {
  throw new Error(`UPL-B-13 withholding proof failed: ${ARTIFACT_JSON}`);
}
console.log(`UPL-B-13 withholding proof PASS with vendor blocker -> ${ARTIFACT_JSON}`);
