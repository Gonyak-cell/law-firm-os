# CTI I25 Owner Approval Receipt

Approval signature ref: `I25-CTI-PASSWORD-RESET-SES-API-VPCE-JWSUH-LIVE-SEND-OWNER-APPROVAL-2026-07-06`

Recorded at: `2026-07-06T12:09:25.826Z`

Approved goal: `cti-password-reset-jwsuh-live-send-retry`

Approved SES API VPC endpoint: `com.amazonaws.ap-northeast-2.email`

VPC: `vpc-038f70d924a774bea`

Subnets: `subnet-0a718a221e621715f`, `subnet-0af415c198603de77`

Endpoint SG: `matter-lawos-prod-ses-api-vpce-sg`, inbound TCP 443 from `sg-0f555cc1f1708fc22` only

Retry scope is exactly one password-reset live send to `jwsuh@amic.kr`. The remaining 8 users are explicitly out of live-send and credential-mutation scope.
