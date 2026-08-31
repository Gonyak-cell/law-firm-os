# AMIC OS Vault — AI slop review and lint escapes

Date: 2026-08-31

Goal: `01a0475e-7c6c-7332-8021-37f33cfcd319`

Command:

```text
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py \
  --repo "$PWD" --changed
```

Result: command exit `0`; 200 findings reported for manual classification.

## Classification

| Severity | Count | Disposition |
| --- | ---: | --- |
| `no-verify` | 0 | none |
| `strong` | 129 | documented non-product test-code false positive |
| `weak` | 71 | manually reviewed; inherited design tokens, technical substrings and evidence text |

All 129 strong findings are `ai-buzzword-stack` matches in eight API test files:

- `apps/api/test/amic-vault-exact-export-runtime.test.js`
- `apps/api/test/amic-vault-read-runtime.test.js`
- `apps/api/test/desktop-vault-export-api.test.js`
- `apps/api/test/desktop-vault-export-runtime.test.js`
- `apps/api/test/desktop-vault-upload-api.test.js`
- `apps/api/test/outlook-vault-attachment-delivery-runtime.test.js`
- `apps/api/test/outlook-vault-delivery-token.test.js`
- `apps/api/test/outlook-vault-source-save-api.test.js`

The matches are a conventional internal test-fixture helper identifier and its
property references. These identifiers are not rendered, localized, serialized
into product responses, logged as product copy or shown to users. Renaming them
would add mechanical test churn without changing the product. They are retained
as a deliberate test-code escape.

The weak findings fall into these groups:

- existing AMIC OS design-system CSS using shadows/blur, permanent shell dark
  navigation and motion rules shared with many non-Vault surfaces;
- binary-body constructors and persistence field names in API, preload, tests
  and evidence that match visual heuristics but are not user-facing copy;
- documentation that names rejected visual patterns while explaining that the
  implementation does not use them.

No weak finding identifies a newly added ornamental visual treatment, fake KPI,
generic capability slogan, excessive rounded tile, dead control or
translation-only filler. Existing global style findings are not changed in this
bounded Vault integration task because that would broaden the scope across
unrelated AMIC OS surfaces.

## Rendered-surface manual QA

The following current evidence images were re-opened after the sealed
Vault-enabled Outlook build:

1. `.omo/evidence/amic-os-vault-vault-surface-final-20260829/vault-preview-opened-1440.png`
   - existing AMIC OS dark navigation and flat white document panels remain;
   - exact-version identifiers, preview and download actions are explicit;
   - there is no new gradient/glass treatment, fake KPI or capability slogan;
   - hierarchy, contrast and action grouping remain readable.
2. `.omo/evidence/amic-os-vault-vault-surface-final-20260829/vault-upload-complete-390-bottom.png`
   - one explicit Matter selector and one exact save receipt are visible;
   - document/version/file-object/hash/audit evidence is concrete rather than
     congratulatory or promotional copy;
   - the narrow layout stays single-column and scrollable without overlapping
     controls.
3. `.omo/evidence/amic-os-vault-mail-save-ui/source-save-recovered-after-relaunch-390.png`
   - the task pane uses the existing flat AMIC OS mail surface;
   - relaunch does not auto-read Office storage or call Vault; the user must open
     `저장 옵션` and press the explicit `중단된 Vault 저장 상태 확인` action;
   - the status readback is a single factual green notice, not a modal or
     animation, and ordinary item selection shows no Vault processing affordance.

The current screenshot fixture subject `Vault resume initial` is test data, not
localized production copy. Actual controls and recovery copy are Korean and
concrete.

## Review result

AI slop review: pass with documented escapes. There are zero `no-verify`
findings. The 129 strong findings are confined to non-rendered test helper names;
the remaining 71 weak findings are inherited/technical signals and were checked
against actual Vault and Outlook render evidence. No product UI/copy change is
required by this bounded review.
