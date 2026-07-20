# LawOS private staging and Entra pilot runbook

This runbook creates only the isolated synthetic LawOS staging environment authorized by `LAWOS-PRIVATE-STAGING-ENTRA-PILOT-CONDITIONAL-EXECUTION-APPROVAL-20260720`. It never targets the existing AMIC Vault staging environment.

## Pre-deploy

1. Require a clean `codex/lawos-private-staging-entra-pilot-20260720` worktree and record exact commit/tree.
2. Re-fetch `origin/main`. Stop if the approved base no longer anchors the target or if the intended staging artifact revision is not separately authorized.
3. Validate independent signed approval receipts and owner-instruction digest. Do not convert approval receipts into execution PASS receipts.
4. Run:

   ```bash
   PATH=/opt/homebrew/opt/node@22/bin:$PATH npm ci
   PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run private-staging:validate
   PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run private-staging:entra:validate
   ```

5. Use AWS SSO role chaining, never the empty default profile:

   ```bash
   aws sso login --profile amic-vault-staging-admin
   aws sts get-caller-identity --profile matter-staging-admin --no-cli-pager
   ```

6. Re-inventory protected AMIC resources read-only. Compare their configuration fingerprints to the pre-approval inventory.
7. Run AWS `cloudformation validate-template` for both templates. This is read-only.
8. Confirm the cost model remains at or below USD 100 and KRW 300,000 per month.
9. Require a human tenant administrator to provision at least two cloud-only synthetic pilot identities. Record only their synthetic identifiers, UPNs, roles, and `accounts_provisioned=true` in a 0600 manifest outside the repository. Do not include passwords, tokens, recovery material, or real employee identities.
10. Build the Lambda archive only from a clean exact head and store it outside the repository:

   ```bash
   PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run private-staging:artifact:build -- \
     --source-sha <exact-40-char-sha> \
     --source-tree <exact-40-char-tree> \
     --synthetic-identity-manifest <private-0600-file-outside-repo> \
     --output-dir <private-0700-directory-outside-repo>
   ```

11. Review artifact manifest, dependency-lock digest, RDS CA digest, synthetic-identity manifest digest and safe counts, byte size, and S3 key. Confirm that the real roster/account source files are absent. Never upload an ad-hoc or dirty artifact.

## Approval deltas required before AWS creation

### Lambda VPC ENI bootstrap

AWS requires six EC2 ENI actions with `Resource: "*"` while it attaches a Lambda function to VPC subnets. The checked-in policy is separate, conditional, default-off, and limited to those six actions. An explicit `lambda:SourceFunctionArn` Deny prevents function code from exercising them. Provisioning must remain blocked until the owner approves:

> LAWOS-LAMBDA-VPC-ENI-BOOTSTRAP-IAM-EXCEPTION-20260720 승인. AWS 공식 요구상 LawOS private staging VPC 연결에 필요한 ec2:CreateNetworkInterface, ec2:DescribeNetworkInterfaces, ec2:DescribeSubnets, ec2:DeleteNetworkInterface, ec2:AssignPrivateIpAddresses, ec2:UnassignPrivateIpAddresses에 한해 Resource:* 임시 Allow를 승인합니다. 적용 대상은 lawos-private-staging-api-role과 lawos-private-staging-admin-role뿐이며, 각 함수가 Active/Successful이 된 즉시 해당 Allow 정책을 stack update로 제거하고 lambda:SourceFunctionArn explicit Deny를 유지하십시오. 그 밖의 wildcard Allow는 금지합니다.

### Exact staging artifact revision

The approval requires an exact-main artifact but also forbids main merge until CUT-007 passes. Those two gates are circular for the new administration handler and IaC. Provisioning must remain blocked until the owner either authorizes the exact CI-passing PR head as a staging-only artifact or permits a preliminary non-production tooling merge. The recommended delta is:

> LAWOS-PRIVATE-STAGING-EXACT-PR-HEAD-ARTIFACT-EXCEPTION-20260720 승인. exact-head CI와 security review가 PASS한 codex/lawos-private-staging-entra-pilot-20260720 PR head SHA/tree 및 그 SHA에서 재현한 artifact digest를 synthetic-only LawOS private staging에 한해 배포하는 것을 승인합니다. 모든 receipt는 해당 PR head SHA/tree/artifact digest에 고정하고, CUT-007 PASS 후 동일 exact head만 main 병합 후보로 사용하십시오. production, release, signing, real-data 및 go-live 권한은 부여하지 않습니다.

### KMS current-key policy wildcard semantics

AWS KMS key policies use `Resource: "*"` to mean only the KMS key to which that policy is attached; a self-referencing key ARN cannot replace it. The template contains exactly two such Allows: same-account IAM delegation and regional CloudWatch Logs encryption constrained to `/aws/lambda/lawos-private-staging-*`. This still conflicts with the approval's literal wildcard prohibition. Provisioning must remain blocked until the owner approves:

> LAWOS-KMS-CURRENT-KEY-POLICY-WILDCARD-EXCEPTION-20260720 승인. lawos-private-staging 전용 KMS key policy에서 Resource:*가 해당 policy가 부착된 현재 단일 key만 의미하는 AWS KMS 문법임을 확인하고, 동일 AWS account IAM authority 위임과 `/aws/lambda/lawos-private-staging-*` encryption context로 제한된 regional CloudWatch Logs 서비스 사용에 한해 승인합니다. 다른 principal, action, context 또는 다른 Allow Resource:* 추가는 금지합니다.

## Deploy

1. Create the artifact-store CloudFormation change set. Review that it adds only one encrypted, versioned, public-blocked LawOS artifact bucket and deny policy.
2. Execute the artifact-store change set, then upload the exact artifact using its manifest S3 key and checksum metadata.
3. Create the main change set with `EnableLambdaEniBootstrap=true`, exact source SHA/tree, artifact SHA, owner-instruction SHA, tags, and no secret values.
4. Review every add/modify/delete. Require protected-resource modification count zero, named IAM roles exactly two, public RDS false, DB default routes zero, Function URLs zero, and predicted monthly total within cap.
5. Execute and wait for complete success. Any rollback or partial failure is a stop.
6. Verify both Lambda functions are `Active` with `LastUpdateStatus=Successful`.
7. Immediately update the stack with `EnableLambdaEniBootstrap=false`; verify the temporary IAM policy no longer exists.
8. Direct-invoke the administration Lambda with exact-head, instruction, approval, artifact, and synthetic-manifest digests. Do not pass secrets.
9. Verify migration checksums, two explicit tenant authorities, no wildcard tenant, least-privilege grants, private RDS, TLS verify-full, PITR, deletion protection, S3 versioning/Object Lock/KMS/public block, and unchanged protected AMIC fingerprints.

## Entra pilot

1. A human administrator signs in interactively with only the three just-in-time delegated Graph permissions in `entra-pilot-contract.json`. Do not create a bootstrap app credential. Automation must not request `User.ReadWrite.All` or `RoleManagement.ReadWrite.Directory`.
2. Verify that the interactive target tenant is the intended LawOS tenant and has Microsoft Entra ID P1 or P2 licensing. The current read-only CLI context returned zero subscribed SKUs on 2026-07-20 and must not be assumed to be ready.
3. Create the single-tenant public-client application, service principal, pilot group, emergency exclusion group, and exact staging redirect URI. A human tenant administrator separately creates the synthetic pilot users; automation only adds their supplied object references to the pilot group.
4. Allocate an unused authentication context. Create the phishing-resistant policy in `enabledForReportingButNotEnforced` state, scoped only to the pilot group and LawOS service principal, excluding the emergency group.
5. A human tenant administrator creates and role-assigns at least two cloud-only emergency identities outside the automation session, then registers and tests physical FIDO2/passkeys. No credential or recovery material enters evidence.
6. Store tenant/client/redirect/auth-context configuration only in the LawOS Entra Secrets Manager secret.
7. Observe seven complete days. Store safe counts and hashed object references, not tokens, UPNs, or raw sign-in logs.
8. Enable only for the pilot group after every declared condition passes. Otherwise keep report-only or disable.

## Post-deploy CUT gates

- CUT-005: signed synthetic manifest, final delta, counts/hashes/versions/rejected reasons, immediate replay no-op.
- CUT-006: exact artifact operational/postgres-v2, all new domain writes PostgreSQL-only, transaction/RLS/version/idempotency/audit/outbox PASS, JSON fallback/writer/dual-write counts zero.
- CUT-007: Entra FIDO2 pilot, role and tenant negatives, cold restart, Forest critical-flow smoke, DMS digest/hold/retention/delete-block/namespace, audit/outbox PASS.

Each gate receives an independent signed execution receipt. A failed or blocked gate remains failed or blocked; it is not summarized into a blanket PASS.

## Rollback triggers

Stop on source drift, protected-resource mutation, public RDS, database default route, missing Lambda VPC attachment, role reuse, unapproved wildcard Allow, TLS failure, secret/PII exposure, migration checksum drift, tenant/RLS failure, JSON authority activity, DMS failure, emergency-access failure, pilot spillover, cost overrun, or exact-head CI/security failure.

Before the first DB write, delete or isolate only the new LawOS stack. After a DB write, never return to JSON authority or dual-write; isolate the new endpoint and use forward repair or restore only the new staging database. Conditional Access returns to report-only or disabled. Existing AMIC Vault staging is never a rollback target.

## Scope exclusions

No production resource, real data, CUT-008+, release, signing, publication, production traffic, or company go-live is authorized by this runbook.
