# Forest Desktop v0.1.16 및 AWS 배포 영수증

Status: **desktop formal candidate published and AWS production deployment completed and monitored**

Generated at: `2026-07-13T14:42:21Z` (`2026-07-13 23:42:21 KST`)

이 영수증은 승인된 PETRABRIDGE Forest 로그인과 green-A 앱 아이콘을 포함한 소스 커밋, macOS/Windows 데스크톱 후보, GitHub 프리릴리스, AWS 운영 Web/API 배포 및 롤백 증빙을 기록한다. GitHub stable 릴리스, 회사 전체 go-live, `production_ready`, App Store/Microsoft Store 배포, Windows Authenticode 또는 Windows 네이티브 설치 검증은 주장하지 않는다.

## Source 및 GitHub

| Field | Result |
| --- | --- |
| Branch | `codex/forest-v0.1.16-release-20260713` |
| 배포/릴리스 소스 커밋 | `137fa156cdb6bb30bb3af72bf3e928ad7e6e4959` |
| QA gate 보정 커밋 | `453fc124015004ef414cf1b0ac494c38a249269f` (selector/timeout only; 제품 런타임 변경 없음) |
| Draft PR | [#168](https://github.com/Gonyak-cell/law-firm-os/pull/168) |
| GitHub tag | `matter-desktop-v0.1.16-20260713-137fa156c` |
| GitHub release | [formal-candidate prerelease](https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.16-20260713-137fa156c) |
| Release state | published, prerelease, not draft |
| Published at | `2026-07-13T13:58:24Z` |
| Release assets | 12 uploaded; 원격 checksum 파일 round-trip 비교 PASS |

## Desktop 산출물

| Platform | Artifact | SHA-256 | Verification |
| --- | --- | --- | --- |
| macOS | `matter-0.1.16-macos.dmg` | `756afaae92ad70f83cd8a8e066a9143446b13eb6c99954f2939770a89fbd41f4` | Developer ID, strict codesign, Gatekeeper, notarization/stapler PASS |
| macOS | `matter-0.1.16-macos.zip` | `28730d758427dae15bd4953b3c38746dd1d9e59bcd653c57d7044ce6347762e8` | checksum PASS; private HRX source excluded |
| Windows | `matter-0.1.16-win-x64.exe` | `41a6088ff5e3e0cf65537ea634218e5c61498367ed48056ccbc23c366bc85c4c` | NSIS x64 package generated |
| Windows | `matter-0.1.16-win32-x64-unsigned.zip` | `774c0c37ff884f1f67283a144970f29b4a9971245b88a355c7522c0a993acf06` | portable unsigned package generated |

- 승인 로그인 이미지 SHA-256: `5ff1776144df2fff44977494ea3eecdcf1f2d5c96dfc30deba3411bf320ee3bf`
- green-A 아이콘 SHA-256: PNG `19722c977aa783616b75769a87f4186416d64f2969c4669e9e15303606dd3916`, ICNS `8fff8b262560a05b723bbaed39d56f6c277cae9cea312772cdff20b17ea1ef96`, ICO `70f741af2564838b4d7d45789af5b8fa970bfc8f9ff190d987f445295a26f075`.
- macOS 공증: app `f9fec74d-5a80-4678-b9d9-5a88f78af414`, DMG `1aba53c2-c6b2-47a9-ae96-4b241d3261ac`, 모두 Accepted.
- 정확한 정식 후보 앱을 Forest 로그인으로 시각 검증했고 1512px에서 가로 넘침이 없었다. 현재 `/private/tmp/lawos-forest-v016-release/apps/desktop/dist/mac/matter.app`을 PID `71150`으로 실행 중이다.
- 패키지 휴가 관리는 합성 데이터만 사용해 10/10 시나리오, 11개 화면, 콘솔 오류 0건, 1512/1280/1024/820/720px 가로 넘침 없음, 재시작 후 로그아웃 및 명시적 재로그인 뒤 도메인 스냅샷 동일을 확인했다.
- 게시한 Windows 산출물은 macOS 호스트에서 만들었고 Authenticode 서명은 없다. 제품 트리가 릴리스 커밋과 동일한 QA 보정 커밋으로 GitHub Windows runner에서 NSIS 빌드와 네이티브 Home/Client/Matter/People 화면 QA가 [통과](https://github.com/Gonyak-cell/law-firm-os/actions/runs/29258529530)했다. 게시된 EXE 자체의 별도 설치 round-trip은 수행하지 않았다.

## AWS 운영 배포

| Field | Result |
| --- | --- |
| Account / profile / region | `770880870480` / `matter-prod-deploy-admin` / `ap-northeast-2` |
| Web bucket | `s3://matter-lawos-web-prod-770880870480-apne2` |
| Bucket versioning | not enabled; 배포 전 37개 객체 전체 스냅샷으로 보완 |
| CloudFront | `E3MVAKX2DIR3CS`, Deployed, enabled |
| Live URL | `https://d2mthcc8vp3cr2.cloudfront.net` |
| Invalidation | `I5JLNJ0SVMNQQPBF0GME98LVK0`, Completed |
| Retired asset purge | `IBNUH6BGP0PE2S5BDZ1J01E9WC`, Completed; 5개 구 객체 S3 부재 |
| Stale build purge | `I7PR8XNS5UIOOYKB9DE6QLWNAU`, Completed; 이전 JS/CSS/cover 7개 제거 |
| S3/dist parity | 현재 `dist`와 S3가 28개 키로 1:1 일치 |
| API Lambda | `matter-lawos-api-prod`, Active / Successful, Node.js 22 |
| API Lambda reserved concurrency | `1` (기존 설정 유지) |
| Lambda revision | `48cca282-66ac-4e08-98eb-b7881378bcc4` |
| Lambda code SHA-256 | `kwnw2lXQbS7jcQT4qiNo3zALHQ8r0+BKfGXhFKXavPU=` |
| Lambda deployment commit | `137fa156cdb6bb30bb3af72bf3e928ad7e6e4959` |
| Desktop Runtime Lambda | `matter-temp-desktop-runtime`, Active / Successful, Node.js 20 |
| Desktop Runtime revision / code SHA | `f0f84def-e2db-4bbb-a00d-3e7cb0fa3b5a` / `ZSR8aktoUg7o1TahYLKdNxKvOJDU5Bm7P6hRIeDGsA0=` |
| Desktop Runtime commit | `137fa156cdb6bb30bb3af72bf3e928ad7e6e4959` |

### Web/API 검증

| Artifact / probe | Result |
| --- | --- |
| `index.html` | `4c05e87da29268294c0fe8d73307f58264df2bcfca0f44d329476b2970eb5901`; live/local 일치 |
| `assets/index-DeMDPpZt.js` | `28d2f2b07cebb0bd038b18f79ffaa6752779ebfe2174c75829a4e31433eb73ef`; live/local 일치 |
| `assets/index-4as5DOSr.css` | `4e58e48a2d4a8283cf3e871be6bf9e3d2c803002e9a2ce15a739440fe2560cd6`; live/local 일치 |
| `amic-law-icon.png` | `19722c977aa783616b75769a87f4186416d64f2969c4669e9e15303606dd3916`; live/local 일치 |
| HTTP | root 200; `/api/health` 200; `/health` 200 |
| 보호 경로 | 미인증 및 위조 identity/scope 헤더 HRX 경로 401; 데이터 노출 없음 |
| 라이브 렌더링 | PETRABRIDGE Forest 로그인 PASS; 1512px overflow 0; page error 0; 5xx 0 |

해시 자산을 먼저 올리고 `index.html`을 no-cache로 마지막에 배치했다. 배포 sync 후 별도 목록 검증으로 Parnas 이미지, Matter mark, 구 AMIC-PETRA mark 5개와 현재 `dist`에 없는 이전 JS/CSS/forest cover 7개를 정확히 제거했다. 현재 S3와 `dist`는 28개 키로 1:1 일치하며 그 밖의 객체는 삭제하지 않았다. 삭제된 키는 S3에서 부재하고 비공개 CloudFront 원본의 미존재 응답인 403을 반환한다. API Lambda는 배포 전 ZIP을 기반으로 현재 `lambda.js`와 승인 아이콘만 교체했고, 비공개 연락처 source-of-truth와 환경값은 제한된 패키지/owner-only 롤백 경로 밖으로 출력하거나 커밋하지 않았다. Desktop Runtime은 기존 계정·인증 모듈을 보존하고 현재 `index.mjs`와 승인 아이콘을 넣었으며 구 `icon-source-mark.png`는 제외했다. `/health`는 200, 미인증 `/api/desktop/accounts`는 직접 호출과 CloudFront 모두 401이었다. QA 비밀번호 재설정은 별도 승인 게이트이므로 실행하지 않았다.

## 배포 후 관측

라이브 브라우저 QA 시각(`2026-07-13T14:22:00Z`)에 예약 동시성 1인 API Lambda에서 throttle 1건이 발생했다. 같은 시각 Lambda errors와 CloudFront 5xx는 0이었고 직후 health 200/보호 경로 401이었다. 브라우저 fan-out을 중단한 독립 관측 창 `2026-07-13T14:26:00Z`–`2026-07-13T14:41:30Z`에는 throttle이 재발하지 않았다.

| Signal | Result |
| --- | --- |
| Lambda invocations | 9 |
| Lambda errors | 0 |
| Lambda throttles | 0 |
| Lambda error log events | 0 |
| Desktop Runtime invocations | 1 |
| Desktop Runtime errors | 0 |
| Desktop Runtime throttles | 0 |
| Desktop Runtime error log events | 0 |
| CloudFront 5xxErrorRate maximum | 0.0 |

## 롤백 증빙

Owner-only rollback root:

`/Users/jws/Library/Application Support/LawFirmOS/deploy-rollbacks/lawos-prod-137fa156c-20260713-225950`

| Surface | Preserved state |
| --- | --- |
| Lambda code | `lambda/predeploy.zip`, 3,830,326 bytes, SHA-256 `ef97afab0596df74c685e339659868b586f8d370e529a3672765509740095db1` |
| Lambda environment | mode `0600`; 41 keys; 값 미출력 |
| Previous Lambda | code SHA `75evqwWW33TGheM5ZZhotYb403DlKaNnJ2VQl0AJXbE=`, revision `03061e03-5821-4ed8-b583-17b8a7271f61`, commit `aa653bb1b4fb773774f160e2764c25b9a557f8a7` |
| Desktop Runtime | `temp-desktop-runtime/predeploy.zip`, 25,536 bytes, SHA-256 `d489992d014373d3dcb5d121dc3800d416f65b6c5e41fac7e046898313349242`; env 12 keys, 값 미출력 |
| Previous Desktop Runtime | code SHA `1ImZLQFDc9PctdEh3DgA1Bb2W2xeQfrH4EaJgxM0kkI=`, revision `034db2bf-71b1-43f1-8a7a-274cc22fd72c`, commit `1502e6772f80fa7aa9d950da2122e9c6d1d64bc9` |
| Web | 37개 파일 전체 스냅샷 및 checksum manifest |
| Previous `index.html` | SHA-256 `cf571682460206d83dd5ab83aeb0715eeb8088c19108164a6fc58a48f0935ede` |

장애 판정 시 Lambda는 보존 ZIP과 비공개 환경 스냅샷을 복원한 뒤 waiter 및 직접 health/보호 경로를 검증한다. Web은 스냅샷을 복원하고 보존 `index.html`을 no-cache로 마지막 업로드한 뒤 CloudFront invalidation과 live hash 검증을 반복한다.

## 검증과 경계

- Root suite 4,290 PASS; 환경/경합 2건은 직렬 재실행 3/3 PASS.
- Web UI 135 PASS, 1 intentional skip; typecheck/build PASS.
- Desktop smoke 94/94, file bridge 17/17, targeted API 41/41 PASS.
- Formal release validator 10/10, public-release-claim validator, packaged Forest/휴가 QA, production negative security smoke PASS.
- 전체 API serial 재실행은 장시간 특성 때문에 수행하지 않았고, 이번 API 변경 경로는 targeted 41/41로 검증했다.
- GitHub 게시물은 formal-candidate prerelease이며 stable 공개 릴리스가 아니다.
- AWS Web/API production 배포는 완료했지만 회사 전체 go-live, `production_ready`, owner final approval은 주장하지 않는다.

Machine-readable receipt: `docs/launch/aws-forest-desktop-v0.1.16-deploy-2026-07-13.json`.
