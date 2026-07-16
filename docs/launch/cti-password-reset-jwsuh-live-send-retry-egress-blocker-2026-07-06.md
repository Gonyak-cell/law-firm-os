# CTI Password Reset JWSUH Live Send Retry Egress Blocker

Status: `BLOCKED_LAMBDA_SG_EGRESS_TO_SES_API_VPCE`

I25 created the SES API interface VPC endpoint and constrained endpoint security group:

- SES API VPCE: `vpce-04fb1f44d80a790d6`
- State: `available`
- Private DNS: `true`
- Endpoint SG: `sg-00d32ddc8de3a5a30`
- Endpoint SG inbound: TCP 443 from Lambda SG `sg-0f555cc1f1708fc22` only

The `jwsuh@amic.kr` single-recipient live-send retry was attempted, but Lambda still returned safe `failed` delivery status.

Read-only diagnosis: Lambda SG `sg-0f555cc1f1708fc22` currently allows egress only to Secrets Manager VPCE on TCP 443 and EFS on TCP 2049. It does not allow egress TCP 443 to the new SES API VPCE SG `sg-00d32ddc8de3a5a30`.

Recommended unblock: I26 should authorize exactly one egress rule: Lambda SG `sg-0f555cc1f1708fc22` TCP 443 to SES API VPCE SG `sg-00d32ddc8de3a5a30`, then rerun `jwsuh@amic.kr` single-recipient live-send only.

No reset email was sent to the remaining 8 users. No token, reset URL, password, secret, production-ready claim, or go-live claim was recorded.
