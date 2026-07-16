# CTI Password Reset JWSUH Live Send Network Blocker

Status: `BLOCKED_SES_API_VPC_EGRESS`

The one-recipient live-send lane for `jwsuh@amic.kr` deployed code/env/IAM, but the SES delivery call returned `failed`.

Read-only AWS diagnosis:

- Lambda `matter-lawos-api-prod` is attached to VPC `vpc-038f70d924a774bea`.
- Lambda subnets: `subnet-0a718a221e621715f`, `subnet-0af415c198603de77`.
- Lambda security group: `sg-0f555cc1f1708fc22`.
- NAT gateway count in the VPC: `0`.
- Existing interface endpoint in the VPC: `com.amazonaws.ap-northeast-2.secretsmanager`.
- SES API endpoint service exists: `com.amazonaws.ap-northeast-2.email`.
- SES SMTP endpoint service exists: `com.amazonaws.ap-northeast-2.email-smtp`.

Probable root cause: the Lambda SESv2 HTTPS adapter cannot reach `email.ap-northeast-2.amazonaws.com` from the private VPC because there is no NAT gateway and no SES API interface VPC endpoint.

Recommended unblock: approve creation of a SES API interface VPC endpoint `com.amazonaws.ap-northeast-2.email` with private DNS enabled in the same two subnets, using a new endpoint SG that allows TCP 443 from `sg-0f555cc1f1708fc22` only. Then rerun the same one-recipient `jwsuh@amic.kr` live-send lane.

No reset email was sent to the remaining 8 users. No token, reset URL, password, secret, production-ready claim, or go-live claim was recorded.
