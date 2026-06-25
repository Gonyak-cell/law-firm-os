# LCX-WEB Runtime Flow Verification

Generated at: 2026-06-25T15:36:05.886Z

Overall result: PASS

Source of truth: `apps/web`

## Checks

| Check | URL | Expected text | Result | Notes |
| --- | --- | --- | --- | --- |
| desktop-home-command-center | `/?locale=en&view=home&desktop=1&data=live&ctx=allow` | Client, Matter, 구성원, Vault | PASS | locale=en; overflow=false; cards=4 |
| clients-live | `/?locale=en&view=clients&data=live&ctx=allow` | Client와 상담 접수 | PASS | locale=en; overflow=false; cards=0 |
| matters-live | `/?locale=en&view=matters&data=live&ctx=allow` | Matter 상태, 구성원, 문서, 활동, 청구 흐름 | PASS | locale=en; overflow=false; cards=0 |
| people-live | `/?locale=en&view=people&data=live&ctx=allow` | 구성원 관리 | PASS | locale=en; overflow=false; cards=0 |
| vault-live | `/?locale=en&view=vault&data=live&ctx=allow` | Vault 문서와 권한 상태 | PASS | locale=en; overflow=false; cards=0 |
| clients-denied | `/?locale=en&view=clients&data=live&ctx=denied` | 접근 권한이 없습니다, 권한이 있는 의뢰인만 표시합니다 | PASS | locale=en; overflow=false; cards=0 |
| clients-review | `/?locale=en&view=clients&data=live&ctx=review` | 검토가 필요합니다, 검토가 끝나면 의뢰인 정보를 확인할 수 있습니다 | PASS | locale=en; overflow=false; cards=0 |
| matters-denied | `/?locale=en&view=matters&data=live&ctx=denied` | 접근 권한이 없습니다, 권한이 있는 정보만 표시됩니다 | PASS | locale=en; overflow=false; cards=0 |
| vault-denied | `/?locale=en&view=vault&data=live&ctx=denied` | 접근 권한이 없습니다, 권한이 있는 정보만 표시됩니다 | PASS | locale=en; overflow=false; cards=0 |

## Mobile Overflow

- scrollWidth: 390
- clientWidth: 390
- horizontalOverflow: false
- capabilityCards: 4

## Console Errors

Recorded for operator review. Denied/review flows may surface expected non-2xx network messages.

- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
- Failed to load resource: the server responded with a status of 403 (Forbidden)
