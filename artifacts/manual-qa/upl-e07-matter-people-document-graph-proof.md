# UPL-E-07 Matter-People-Document Graph Proof

Generated: 2026-07-03T01:46:43.795Z

Overall result: PASS

Route: `/api/hrx/legal-people/matter-graph/traverse?matter_id=matter_lcx_001&depth=2`

## Readback

| Check | Result | Evidence |
|---|---|---|
| e07-api-route-200 | PASS | `"/api/hrx/legal-people/matter-graph/traverse?matter_id=matter_lcx_001&depth=2"` |
| e07-relationship-table-kind | PASS | `"matter_people_document_relationship_table"` |
| e07-matter-people-document-nodes | PASS | `{"document":2,"matter":1,"person":4}` |
| e07-required-relationship-types | PASS | `["matter_document","matter_person","person_document"]` |
| e07-matter-person-document-path | PASS | `[{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"person","node_id":"person_expert_witness_001"},"depth":1,"relationship_ids":["mpd_rel_matter_expert"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"document","node_id":"document_lcx_expert_report_001"},"depth":1,"relationship_ids":["mpd_rel_matter_expert_report"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"document","node_id":"document_lcx_hearing_bundle_001"},"depth":1,"relationship_ids":["mpd_rel_matter_hearing_bundle"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"person","node_id":"person_internal_lawyer_001"},"depth":1,"relationship_ids":["mpd_rel_matter_internal_lawyer"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"person","node_id":"person_opposing_counsel_001"},"depth":1,"relationship_ids":["mpd_rel_matter_opposing_counsel"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"person","node_id":"person_staff_paralegal_001"},"depth":1,"relationship_ids":["mpd_rel_matter_paralegal"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"document","node_id":"document_lcx_expert_report_001"},"depth":2,"relationship_ids":["mpd_rel_matter_expert","mpd_rel_expert_report"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"matter","node_id":"matter_lcx_001"},"depth":2,"relationship_ids":["mpd_rel_matter_expert","mpd_rel_matter_expert"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"person","node_id":"person_expert_witness_001"},"depth":2,"relationship_ids":["mpd_rel_matter_expert_report","mpd_rel_expert_report"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"matter","node_id":"matter_lcx_001"},"depth":2,"relationship_ids":["mpd_rel_matter_expert_report","mpd_rel_matter_expert_report"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"matter","node_id":"matter_lcx_001"},"depth":2,"relationship_ids":["mpd_rel_matter_hearing_bundle","mpd_rel_matter_hearing_bundle"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"matter","node_id":"matter_lcx_001"},"depth":2,"relationship_ids":["mpd_rel_matter_internal_lawyer","mpd_rel_matter_internal_lawyer"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"matter","node_id":"matter_lcx_001"},"depth":2,"relationship_ids":["mpd_rel_matter_opposing_counsel","mpd_rel_matter_opposing_counsel"]},{"from":{"node_type":"matter","node_id":"matter_lcx_001"},"to":{"node_type":"matter","node_id":"matter_lcx_001"},"depth":2,"relationship_ids":["mpd_rel_matter_paralegal","mpd_rel_matter_paralegal"]}]` |
| e07-restricted-redaction | PASS | `{"restricted_edge_count":3}` |
| e07-no-raw-document-body | PASS | `{"node_count":7,"relationship_count":7,"path_count":14,"raw_document_text_included":false,"provider_payload_included":false,"production_ready_claim":false}` |
| e07-no-production-claim | PASS | `{"matter_people_document_relationship_table_complete":true,"traversal_api_complete":true,"raw_document_text_included":false,"provider_payload_included":false,"production_ready":false,"go_live_approved":false,"enterprise_trust_approved":false}` |

## Boundary

- Production ready claim: false
- Go-live claim: false
- Raw document text included: false
- Provider payload included: false
