# CMP R4 State Machine Registry

Status: source-intake-baseline

| Object | Required State Coverage |
| --- | --- |
| Opportunity | lead/open -> qualified -> intake_requested; direct Matter creation blocked |
| IntakeRequest | draft -> conflict_check -> waiver_or_clearance -> engagement_approved |
| Matter | opening -> active -> closing -> closed; clearance token required |
| DocumentVersion | created -> checked_out -> checked_in -> retained/deleted; legal hold blocks delete |
| TimeEntry | draft -> submitted -> approved -> locked |
| Invoice | draft -> issued -> corrected/voided; issued direct edit blocked |
| Payment | imported -> matched/partially_matched/unmatched -> reconciled |
| AIOutput | candidate -> review_required -> confirmed/rejected; citation required for confirm |
