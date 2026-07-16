# CTI Password Reset JWSUH Live Send Retry Adjudication

Verdict: `BLOCKED`

Status: `BLOCKED_JWSUH_LIVE_SEND_RETRY`

SES API VPC endpoint: `vpce-04fb1f44d80a790d6`

Endpoint state: `available`

Live send target: `jwsuh@amic.kr`

Delivery status: `failed`

The remaining 8 production users were kept logic-ready only. No reset emails were sent to them and no credential mutation was performed for them in this lane.

No token, reset URL, password, secret value, production-ready claim, or go-live claim is recorded.

I25 completed the SES API VPCE creation. The retry remains blocked because Lambda SG `sg-0f555cc1f1708fc22` does not egress TCP 443 to the SES API VPCE SG `sg-00d32ddc8de3a5a30`. I26 should authorize that single egress rule before another jwsuh-only retry.
