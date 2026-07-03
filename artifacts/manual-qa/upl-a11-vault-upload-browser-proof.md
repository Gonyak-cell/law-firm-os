# UPL-A-11 Vault Upload Browser Proof

Generated: 2026-07-03T07:35:03.350Z

Overall result: PASS

## Evidence

| Check | Result | Evidence |
|---|---|---|
| a11-browser-file-input-present | PASS | `{}` |
| a11-ui-upload-response-created | PASS | `{"status":201,"outcome":"created"}` |
| a11-ui-receipt-has-document-and-sha256 | PASS | `{"upload_state":"data","document_id":"doc_ui_upload_1783064103004_a11_browser_upload_txt","sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6","form_document_id":"doc_ui_upload_1783064103004_a11_browser_upload_txt","form_sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6"}` |
| a11-request-uses-signed-session | PASS | `{"method":"POST","url":"http://127.0.0.1:5198/api/vault/documents/upload","has_authorization":true,"has_permission_context":false}` |
| a11-download-hash-matches-uploaded-file | PASS | `{"status":200,"content_sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6","recomputed_sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6","byte_size":35,"document_bytes_included":true,"raw_path_exposed":false,"storage_pointer_ref_included":false}` |
| a11-restart-download-preserves-hash | PASS | `{"status":200,"content_sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6","recomputed_sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6","byte_size":35,"document_bytes_included":true,"raw_path_exposed":false,"storage_pointer_ref_included":false}` |
| a11-safe-boundary | PASS | `{"status":200,"content_sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6","recomputed_sha256":"e1c3ba9f307af214242909b665e18ae4e327589c28c25f6bebb69f00f89bdcc6","byte_size":35,"document_bytes_included":true,"raw_path_exposed":false,"storage_pointer_ref_included":false}` |

## Boundary

- Browser upload route: `POST /api/vault/documents/upload`
- Download route: `GET /api/vault/documents/doc_ui_upload_1783064103004_a11_browser_upload_txt/download`
- Screenshot: `artifacts/manual-qa/screenshots/upl-a11-vault-upload-browser-proof.png`
- Production ready claim: false
- Go-live claim: false
