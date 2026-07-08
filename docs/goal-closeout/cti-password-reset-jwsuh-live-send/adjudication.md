# CTI Password Reset JWSUH Live Send Adjudication

Verdict: `BLOCKED`

Status: `BLOCKED_JWSUH_LIVE_SEND`

Live send target: `jwsuh@amic.kr`

SES delivery status: `failed`

The remaining 8 production users were kept logic-ready only. No reset emails were sent to them and no credential mutation was performed for them in this lane.

No token, reset URL, password, secret value, production-ready claim, or go-live claim is recorded.

Network diagnosis after closeout: Lambda is VPC-attached with no NAT gateway and only a Secrets Manager VPC endpoint. The SES API endpoint service `com.amazonaws.ap-northeast-2.email` exists but is not attached to the VPC. Next required action is I25 approval for a SES API interface VPC endpoint, then retry only the `jwsuh@amic.kr` live-send lane.
