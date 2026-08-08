import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { hashDurableValue, LAWOS_DURABLE_STORE_ENVELOPE_KEY } from "../../persistence/src/durable-file.js";
import { createApprovedDocumentTemplateVersion, renderAgreementDocx } from "../src/agreement-docx.js";
import { createMatterDocumentEmailBuilderService } from "../src/document-email-builder-service.js";
import { parseApprovedDocumentTemplateVersion } from "../src/document-template-authority.js";
import { createMatterRepository } from "../src/repository.js";
import { approvedTemplate, canonicalInput, FIXED_TIME, TENANT } from "./helpers/outm32-document-builder-fixture.js";

test("OUTM-32 renders byte-stable valid DOCX from an approved template and canonical input", async () => {
  const template = approvedTemplate();
  const first = await renderAgreementDocx(canonicalInput(template));
  const second = await renderAgreementDocx(canonicalInput(template));
  assert.ok(Buffer.isBuffer(first.bytes));
  assert.equal(first.mime_type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(first.sha256, createHash("sha256").update(first.bytes).digest("hex"));
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(first.template_hash, template.template_hash);
  assert.equal(first.signature_anchors[0].anchor_id, "client_sign_here");
  assert.equal(first.contains_document_bytes, true);

  const artifactPath = process.env.OUTM32_ARTIFACT_PATH || join(mkdtempSync(join(tmpdir(), "outm32-artifact-")), "approved-builder.docx");
  writeFileSync(artifactPath, first.bytes);
  execFileSync("unzip", ["-t", artifactPath], { stdio: "pipe" });
  const documentXml = execFileSync("unzip", ["-p", artifactPath, "word/document.xml"], { encoding: "utf8" });
  assert.match(documentXml, /amic-sign:client:client_sign_here/);
  assert.equal(existsSync(artifactPath), true);

  const changedMatter = await renderAgreementDocx(canonicalInput(template, { matter_id: "matter_docx_002" }));
  const changedSigner = await renderAgreementDocx(canonicalInput(template, {
    signer_role_refs: [{ role_id: "client", party_ref: "party:other-client" }],
  }));
  assert.notEqual(first.sha256, changedMatter.sha256);
  assert.notEqual(first.sha256, changedSigner.sha256);
});

test("OUTM-32 rejects unapproved templates, missing data, and incomplete role anchors", async () => {
  assert.throws(() => createApprovedDocumentTemplateVersion({ ...approvedTemplate(), status: "draft" }), /approved template/i);
  await assert.rejects(
    renderAgreementDocx(canonicalInput(approvedTemplate(), { merge_data: { client_name: "테스트" } })),
    /merge field/i,
  );
  assert.throws(
    () => approvedTemplate({ content: [{ type: "signature_anchor", signer_role: "missing", anchor_id: "bad_anchor", label: "서명" }] }),
    /signer role/i,
  );
  assert.throws(
    () => approvedTemplate({
      signer_roles: [{ role_id: "client", required: true }, { role_id: "attorney", required: true }],
      content: [{ type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_here", label: "서명" }],
    }),
    /required signer role.*anchor/i,
  );
  assert.throws(
    () => approvedTemplate({
      signer_roles: [{ role_id: "client", required: true }, { role_id: "observer", required: false }],
      content: [{ type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_here", label: "서명" }],
    }),
    /signer role.*anchor/i,
  );
  assert.throws(
    () => approvedTemplate({
      content: [
        { type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_here", label: "서명" },
        { type: "signature_anchor", signer_role: "client", anchor_id: "client_sign_again", label: "재서명" },
      ],
    }),
    /exactly one unique signature anchor/i,
  );
});

test("OUTM-32 rejects content, schema, role, receipt and hash tampering after restart", () => {
  const mutations = [
    ["content", (record) => { record.content[0].runs[0].literal = "변조된 제목"; }, /template hash/i],
    ["schema", (record) => { record.merge_schema[0].max_length = 121; }, /template hash/i],
    ["role", (record) => { record.signer_roles[0].required = false; }, /template hash/i],
    ["receipt", (record) => { record.approval_receipt.approved_by_ref = "tampered-owner"; }, /receipt hash/i],
    ["hash", (record) => { record.template_hash = "0".repeat(64); }, /template hash/i],
  ];
  for (const [label, mutate, expected] of mutations) {
    const filePath = join(mkdtempSync(join(tmpdir(), `outm32-template-tamper-${label}-`)), "matter.json");
    const repository = createMatterRepository({ filePath });
    createMatterDocumentEmailBuilderService({ repository, templateVersions: [approvedTemplate()], clock: () => FIXED_TIME });
    repository.close();
    const state = JSON.parse(readFileSync(filePath, "utf8"));
    mutate(state.records.find((item) => item.model_type === "MatterDocumentTemplateVersion"));
    const { [LAWOS_DURABLE_STORE_ENVELOPE_KEY]: envelope, ...payload } = state;
    envelope.content_sha256 = hashDurableValue(payload);
    writeFileSync(filePath, `${JSON.stringify(state)}\n`);
    const reopened = createMatterRepository({ filePath });
    assert.throws(
      () => createMatterDocumentEmailBuilderService({ repository: reopened, clock: () => FIXED_TIME }).listDocumentTemplates({ tenant_id: TENANT }),
      expected,
      label,
    );
  }
});

test("OUTM-32 requires a sealed immutable template approval receipt at persistence and render", async () => {
  const template = approvedTemplate();
  assert.equal(parseApprovedDocumentTemplateVersion(template, { persisted: true }).template_hash, template.template_hash);
  const unsealed = structuredClone(template);
  delete unsealed.template_hash;
  delete unsealed.approval_receipt.template_hash;
  delete unsealed.approval_receipt.receipt_hash;
  assert.throws(
    () => createMatterDocumentEmailBuilderService({ repository: createMatterRepository(), templateVersions: [unsealed] }),
    /persisted template hash/i,
  );
  const tamperedReceipt = structuredClone(template);
  tamperedReceipt.approval_receipt.receipt_id = "tampered-receipt";
  assert.throws(() => parseApprovedDocumentTemplateVersion(tamperedReceipt, { persisted: true }), /receipt hash/i);
  await assert.rejects(renderAgreementDocx(canonicalInput(tamperedReceipt)), /receipt hash/i);

  const repository = createMatterRepository();
  createMatterDocumentEmailBuilderService({ repository, templateVersions: [template], clock: () => FIXED_TIME });
  const replacementReceipt = approvedTemplate({
    approval_receipt: { receipt_id: "template-approval:replacement", approved_by_ref: "template-owner:replacement", approved_at: FIXED_TIME },
  });
  assert.throws(
    () => createMatterDocumentEmailBuilderService({ repository, templateVersions: [replacementReceipt], clock: () => FIXED_TIME }),
    /template receipt is immutable/i,
  );
});

test("OUTM-32 pins the MIT DOCX generator to the server-side Matter workspace only", () => {
  const matterPackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const addinPackage = JSON.parse(readFileSync(new URL("../../../apps/addin/package.json", import.meta.url), "utf8"));
  const desktopPackage = JSON.parse(readFileSync(new URL("../../../apps/desktop/package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../../../package-lock.json", import.meta.url), "utf8"));
  assert.equal(matterPackage.dependencies.docx, "9.7.1");
  assert.equal(lock.packages["packages/matter"].dependencies.docx, "9.7.1");
  assert.equal(lock.packages["node_modules/docx"].version, "9.7.1");
  assert.equal(lock.packages["node_modules/docx"].license, "MIT");
  assert.equal(addinPackage.dependencies?.docx, undefined);
  assert.equal(addinPackage.devDependencies?.docx, undefined);
  assert.equal(desktopPackage.dependencies?.docx, undefined);
  assert.equal(desktopPackage.devDependencies?.docx, undefined);
});
