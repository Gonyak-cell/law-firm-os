# UPL-B-16 Invoice PDF DMS Hash Proof

Generated: 2026-07-03T09:20:26.247Z

Overall result: PASS

## Evidence

| Check | Result | Evidence |
|---|---|---|
| b16-pdf-renderer-emits-pdf-bytes | PASS | `{"invoice_id":"invoice_upl_b16_hash_proof","invoice_number":"INV-UPL-B16-HASH","byte_size":1063,"sha256":"0c503c7bcb7ba5f45520cc9eb3f78b9ab5d8750c4504f5782f24946c36025765"}` |
| b16-dms-upload-stores-rendered-sha256 | PASS | `{"upload_status":201,"file_object_id":"file:version_doc_upl_b16_invoice_pdf_hash_proof_1","stored_sha256":"0c503c7bcb7ba5f45520cc9eb3f78b9ab5d8750c4504f5782f24946c36025765","stored_byte_size":1063}` |
| b16-download-hash-matches-rendered-pdf | PASS | `{"download_status":200,"content_sha256":"0c503c7bcb7ba5f45520cc9eb3f78b9ab5d8750c4504f5782f24946c36025765","recomputed_sha256":"0c503c7bcb7ba5f45520cc9eb3f78b9ab5d8750c4504f5782f24946c36025765","byte_size":1063}` |
| b16-dms-restart-readback-preserves-pdf-hash | PASS | `{"baseUrl":"http://127.0.0.1:59555","status":200,"content_sha256":"0c503c7bcb7ba5f45520cc9eb3f78b9ab5d8750c4504f5782f24946c36025765","recomputed_sha256":"0c503c7bcb7ba5f45520cc9eb3f78b9ab5d8750c4504f5782f24946c36025765","byte_size":1063,"mime_type":"application/pdf","raw_path_exposed":false,"storage_pointer_ref_included":false}` |
| b16-download-safe-boundary | PASS | `{"raw_path_exposed":false,"storage_pointer_ref_included":false,"document_bytes_included":true}` |
| b16-email-linkage-not-claimed | PASS | `{"email_linkage_claim":false,"deferred_to_tuw":"UPL-E-06","external_email_receipt":false}` |

## Boundary

- PDF renderer: `packages/billing/src/invoice-pdf-service.js#renderInvoicePdf`
- DMS upload/download routes: `POST /api/vault/documents`, `GET /api/vault/documents/doc_upl_b16_invoice_pdf_hash_proof/download`
- Email linkage claim: false
- Email linkage deferred to: UPL-E-06
- Production ready claim: false
- Go-live claim: false
