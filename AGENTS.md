<!-- PONYTAIL:ROUTER:BEGIN - managed by Codex; delete this block to opt out -->
## Use Ponytail by default for implementation work

Apply DietrichGebert/ponytail lazy senior developer mode for coding tasks in this repository.

Before writing code, stop at the first rung that holds:

1. Does this need to be built at all? If no, skip it.
2. Does it already exist here? Reuse the local helper, utility, or pattern.
3. Does the standard library already do it? Use that.
4. Does the native platform already cover it? Use that.
5. Does an already-installed dependency solve it? Use that.
6. Can this be one line? Make it one line.
7. Only then, write the minimum code that works.

The ladder runs after understanding the problem, not instead of it. Read the code the change touches, trace the real flow, and fix the root cause in the shared place when there is one.

Prefer deletion over addition, boring over clever, and the fewest files possible. Do not add abstractions, dependencies, or boilerplate that were not explicitly needed.

Do not be lazy about trust-boundary validation, data-loss handling, security, accessibility, hardware or platform calibration, tests, evidence, or anything explicitly requested. This block complements local project instructions and must not weaken stricter repo-specific gates.
<!-- PONYTAIL:ROUTER:END -->

<!-- AI-SLOP:ROUTER:BEGIN - managed by Codex; delete this block to opt out -->
## Use AI Slop Taxonomy For Product UI And Copy Work

Before designing, changing, or reviewing product UI, landing pages, dashboards, onboarding, pricing, checkout, settings, visual assets, or user-facing copy, apply the AI slop taxonomy from `/Users/jws/Applications/ai-slop-taxonomy/ai-slop-taxonomy.md`.

Use it as a negative checklist: avoid the strong/default AI signals unless there is an explicit product or brand reason. Strong and no-verify signals require either removal, a documented escape, or a manual QA note.

Minimum workflow for UI/copy changes:

1. Check the touched surface against the taxonomy before implementation.
2. Prefer concrete brand/content constraints over generic taste words and capability buzzwords.
3. Run `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` before finalizing when the repo has UI or user-facing copy.
4. For rendered UI, inspect the actual screen. Automatic lint does not replace visual QA for hierarchy, contrast, dead interactions, generated-image defects, or Korean translationese.
5. In the final response, report either `AI slop review: pass` or list the remaining flags and why they are intentional.

This block complements Lazyweb, Ponytail, and local project instructions. It must not weaken stricter repo-specific gates, accessibility rules, security checks, legal review requirements, or launch evidence requirements.
<!-- AI-SLOP:ROUTER:END -->

## AWS SSO And Matter Role Chain

Do not assume this repo has never used AWS SSO just because the default AWS
profile has no credentials. The Matter AWS profiles are role-chain profiles in
`~/.aws/config`, and the default profile may intentionally be empty.

Known local chain for this repo:

- `amic-vault-staging-admin`: SSO source profile, account `770880870480`,
  role `AdministratorAccess`, region `ap-northeast-2`.
- `matter-staging-admin`: assumes
  `arn:aws:iam::770880870480:role/matter-staging-admin` from
  `amic-vault-staging-admin`.
- `matter-prod-deploy-admin`: assumes
  `arn:aws:iam::770880870480:role/matter-prod-deploy-admin` from
  `matter-staging-admin`.
- `matter-cutover-operator`: assumes
  `arn:aws:iam::770880870480:role/matter-cutover-operator` from
  `matter-staging-admin`.
- `matter-readonly-auditor`: assumes
  `arn:aws:iam::770880870480:role/matter-readonly-auditor` from
  `matter-staging-admin`.

When AWS credentials are needed, first run:

```bash
aws sso login --profile amic-vault-staging-admin
aws sts get-caller-identity --profile matter-prod-deploy-admin --no-cli-pager
```

Use `matter-prod-deploy-admin` with region `ap-northeast-2` for the production
Matter API Lambda `matter-lawos-api-prod`. If a command says `NoCredentials`
without `--profile`, that only means the default profile is empty. It is not
evidence that Matter AWS SSO is unavailable. See
`docs/runbooks/aws-sso-role-chain.md` before changing AWS profile setup.
