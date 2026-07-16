# UPL-C-07 Contact Raw Values Proof

- verdict: PASS
- contract_ref: UPL-C-07
- route_surface: POST /api/crm/contacts, GET /api/crm/contacts
- email_contact_id: contact_upl_c07_raw_email
- phone_contact_id: contact_upl_c07_raw_phone

## Checks
- PASS email-and-phone-raw-values-are-accepted-and-stored
- PASS create-response-does-not-leak-raw-contact-values
- PASS non-reader-contact-list-masks-raw-values
- PASS contact-value-reader-can-read-email-and-phone
- PASS audit-response-and-output-omit-raw-secrets
- PASS raw-values-survive-crm-runtime-restart
