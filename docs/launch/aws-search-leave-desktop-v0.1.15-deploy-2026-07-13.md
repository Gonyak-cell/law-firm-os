# Search · 휴가 관리 Desktop v0.1.15 및 AWS 배포 영수증

Status: **desktop formal candidate published and AWS production deployment completed**

Generated at: `2026-07-13T09:47:43Z` (`2026-07-13 18:47:43 KST`)

이 영수증은 Search 및 휴가 관리 구현이 포함된 소스 커밋, macOS/Windows 데스크톱 산출물, GitHub 프리릴리스, AWS 운영 Web/API 배포와 롤백 증빙을 기록한다. GitHub stable 공개 릴리스, 회사 전체 go-live, `production_ready`, App Store/Microsoft Store 배포, Windows Authenticode 또는 Windows 네이티브 설치 검증은 주장하지 않는다.

## Source 및 GitHub

| Field | Result |
| --- | --- |
| Branch | `codex/leave-search-release-20260713` |
| 구현 커밋 | `5617706aa0041ca33bead25917e5c46ea805ef60` |
| 최신 `origin/main` 통합 커밋 | `83788396a94a35799b3d5c4b888d84a86979d6c5` |
| 배포/릴리스 소스 커밋 | `ca59b3f23cbdd8a71bc66e9b119c333fd107caab` |
| 원격 브랜치 검증 | local HEAD와 `origin/codex/leave-search-release-20260713` 일치 |
| GitHub tag | `matter-desktop-v0.1.15-20260713-ca59b3f23` |
| GitHub release | [formal-candidate prerelease](https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.15-20260713-ca59b3f23) |
| Release state | published, prerelease, not draft |
| Published at | `2026-07-13T09:37:31Z` |
| Release assets | 12 uploaded; uploaded checksum file round-trip comparison PASS |
| Formal manifest | `apps/desktop/dist/release/matter-desktop-v0.1.15-20260713-ca59b3f23/release-manifest.json`; 10 artifacts |

## Desktop 산출물

| Platform | Artifact | SHA-256 | Verification |
| --- | --- | --- | --- |
| macOS | `matter-0.1.15-macos.dmg` | `198c6923fdc5d8d0146cfc52a5a690e04606d18d4bd5a8b30f47d9e3af002aba` | Developer ID, strict codesign, Gatekeeper, notarization/stapler PASS |
| macOS | `matter-0.1.15-macos.zip` | `2d7d54a9f0fea6368367a4341126f82aa74fc4446b1fcfacb155f7ee1b05034c` | checksum PASS; private HRX contact source excluded |
| Windows | `matter-0.1.15-win-x64.exe` | `2815e436742794d22f261f074c6714ad5c58011f4577bce28d910eb39cfeb835` | NSIS x64 package generated |
| Windows | `matter-0.1.15-win-x64.exe.blockmap` | `f43ca14c3ede8106a01bb8217fa2ddc7e17279c37cef6f10393b4bc9d98757d1` | checksum PASS |
| Windows | `matter-0.1.15-win32-x64-unsigned.zip` | `25ab43c1619c28922712d1c66d09a2a48af53e809507783ae7d8c0cbb76949a1` | portable unsigned package generated |

- macOS signing identity: `Developer ID Application: Jiwon Suh (LHDXU66NX3)`
- Apple notarization submission: `187bb848-b8b9-4978-a534-a8650169a86e`, Accepted
- 최종 `apps/desktop/dist/mac/matter.app` 버전 `0.1.15`를 새 프로세스로 실행해 Search → People → 휴가관리 흐름을 실제 클릭했다. 인증 세션에서 Search hero/dashboard와 휴가 신청 form이 보였고 console/page error, 4xx/5xx response, request failure는 없었다. 임시 로컬 CDP는 `127.0.0.1`에만 열었다가 제거했으며, `2026-07-13 18:57:57 KST`에 디버그 플래그가 없는 정상 앱을 다시 실행했다.
- Windows 산출물은 macOS 호스트에서 생성했다. Authenticode 서명과 Windows 네이티브 설치 스모크는 수행하지 않았다.

## AWS 운영 배포

| Field | Result |
| --- | --- |
| Account / profile / region | `770880870480` / `matter-prod-deploy-admin` / `ap-northeast-2` |
| Web bucket | `s3://matter-lawos-web-prod-770880870480-apne2` |
| Bucket versioning | not enabled; 배포 전 전체 객체 스냅샷으로 보완 |
| CloudFront | `E3MVAKX2DIR3CS`, `Deployed`, enabled |
| Live URL | `https://d2mthcc8vp3cr2.cloudfront.net` |
| Invalidation | `I2VF6D49DKFH35VTXAYNSOSQ0`, Completed |
| API Lambda | `matter-lawos-api-prod`, `Active / Successful`, Node.js 22 |
| Lambda revision | `ff755798-402e-4bd4-93ac-a534405fab54` |
| Lambda code SHA-256 | `nccmOoKBjK1TLjA0Hqk346+6TJpIA9zTdmwXf57bJWU=` |
| Lambda deployment commit | `ca59b3f23cbdd8a71bc66e9b119c333fd107caab` |

### Web 일치 검증

| Artifact | SHA-256 / Result |
| --- | --- |
| `index.html` | `dec208a35f4be61aa633e941ba49fa994621aea093443c4af45746c270dc685d`; live와 local 일치 |
| `assets/index-DeiqVPGE.js` | `2d30926ad2f167b6449771add9ec390a676f58ae24f5b9e69a7607135cea2fa4`; live와 local 일치 |
| `assets/index-Bc5Magze.css` | `b85856ccc9f4d4e6f848cf3d9d7eda6ae3c9c5eefcacff25624cca523f551d16`; live와 local 일치 |
| S3 `index.html` | ETag `5d33127ec1e9903a96972819c4b4af33`, 1,102 bytes, `text/html` |
| Cache policy | `no-cache, no-store, must-revalidate` |
| HTTP | root 200; `/api/health` 200; `/health` 200 |

해시 자산을 먼저 올리고 `index.html`을 마지막에 배치했으며, 기존 S3 객체는 삭제하지 않았다. 인증 없이 HRX 직원 목록을 요청하면 401로 닫히고 목록/건수는 노출되지 않았다.

### Lambda 패키지와 개인정보 경계

- Candidate ZIP: 3,837,272 bytes, 1,125 entries, SHA-256 `9dc7263a82818cad532e30341ea937e3afba4c9a4803dcd3766c177f9edb2565`.
- AWS 코드 SHA는 candidate ZIP의 SHA-256 base64와 일치한다.
- 비공개 HRX 연락처 source-of-truth는 명시적인 `LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH`를 통해 제한된 Lambda 패키지에만 포함했다.
- 해당 파일은 Git 추적, 공개 GitHub release assets, macOS 앱/ZIP에서 제외했다. 원문 연락처 값이나 AWS 환경 비밀값은 출력하거나 커밋하지 않았다.
- Direct Lambda health는 200, 미인증 보호 경로는 401이었다.
- QA 비밀번호 재설정은 별도 승인 경계이므로 실행하지 않았다. 운영 스모크는 health, 계정 목록/권한 판정, 관리자 허용, QA 관리자 403 거부의 read-only 경로로 수행했다.

## 배포 후 관측

관측 창: `2026-07-13T09:22:34Z`–`2026-07-13T09:46:00Z`.

| Signal | Result |
| --- | --- |
| Lambda invocations | 8 |
| Lambda errors | 0 |
| Lambda error log events | 0 |
| CloudFront 5xxErrorRate maximum | 0.0 |

## 롤백 증빙

Owner-only rollback root:

`/Users/jws/Library/Application Support/LawFirmOS/deploy-rollbacks/lawos-prod-ca59b3f23-20260713-183802`

| Surface | Preserved state |
| --- | --- |
| Lambda code | `lambda/predeploy.zip`, 3,690,309 bytes, SHA-256 `d8188b5c14264ca3e2f7429c7561968e084a742b652480bce7ed12bd208ffac5` |
| Lambda environment | `lambda/predeploy-environment.private.json`, mode `0600`; 39 keys, values not printed |
| Previous Lambda | code SHA `2BiLXBQmTKPi90KcdWGWjghKdCtlJIC85+0SvSCP+sU=`, revision `f2586478-88ac-4980-a505-0a232d10f60b`, deployment commit `d2bf615ee` |
| Web | complete 35-file predeploy snapshot plus checksum manifest |
| Previous `index.html` | SHA-256 `048bae1362e4920aa3351f02a3786dbb97b20234ed78c40b6d85a3df54d8da74` |

롤백은 별도 장애 판정 후 이 스냅샷을 사용한다. Lambda는 보존 ZIP과 비공개 환경 스냅샷을 복원하고 `function-updated-v2` 대기 후 direct health/보호 경로를 다시 검증한다. Web은 스냅샷 자산을 복원하고 보존 `index.html`을 no-cache로 마지막 업로드한 뒤 CloudFront invalidation과 live hash 검증을 반복한다.

## 검증

| Gate | Result |
| --- | --- |
| HRX package | 425 / 425 PASS |
| Web UI | 136 PASS, 1 intentional skip |
| Web typecheck / production build | PASS / PASS |
| Desktop smoke | 95 / 95 PASS |
| Desktop file bridge | 17 / 17 PASS; validators PASS |
| HRX API targeted post-merge | 27 / 27 PASS |
| Leave validators | PASS |
| macOS current bundle | strict codesign, Gatekeeper, stapler, fresh-process render PASS |
| AWS runtime | health, permission-deny, live asset parity, monitoring PASS |
| Packaged UI click QA | Search hero/dashboard → People → 휴가관리 form PASS; console/page/request/4xx/5xx error 0 |

전체 API serial 재실행은 26개 통과 시점에 장시간 특성 때문에 중단했고, 동일 제품 기준 직전 authoritative full API run은 355/355 PASS였다. 이번 개인정보/휴가 변경은 current targeted 27/27로 재검증했다.

Clean-browser Web QA에서는 인증 없는 shell이 Search와 휴가관리까지 렌더링하고 보호 데이터는 fail-closed로 유지했다. 이 과정의 동시 API fan-out에서 단기 429가 관찰됐지만 5xx, request failure, page error, 데이터 누출은 없었고, 독립 재검증은 즉시 health 200 / 보호 경로 401로 복귀했다. 인증된 패키지 앱 흐름에서는 해당 오류가 재현되지 않았다.

## Claim boundary

- GitHub publication: formal-candidate prerelease, not stable public release.
- AWS Web/API production deployment: completed and monitored.
- macOS: signed, notarized, stapled, launched and visually inspected.
- Windows: artifacts published; Authenticode and Windows-native install smoke not claimed.
- Company-wide go-live, `production_ready`, owner final approval, App Store/Microsoft Store distribution: not claimed.

Machine-readable receipt: `docs/launch/aws-search-leave-desktop-v0.1.15-deploy-2026-07-13.json`.
