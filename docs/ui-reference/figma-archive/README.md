# Law Firm OS UI Reference Archive

이 폴더는 통합 Law Firm OS SaaS의 ERP, CMS, DMS, CRM, HR 화면 설계를 위해 수집한 Figma Community/Make UI 레퍼런스 아카이브입니다.

## 저장 범위

- Figma Design/Make 링크 21개를 `figma-sources.manifest.json`, `figma-sources.manifest.csv`에 정리했습니다.
- 각 링크별 공개 페이지 HTML, 웹 메타데이터, 썸네일 이미지를 `figma-sources/{source-id}/` 아래에 저장했습니다.
- Figma Design 파일 17개는 가능한 범위에서 MCP 스크린샷, 메타데이터, 디자인 컨텍스트, React/Tailwind 참고 코드, 참조 에셋을 저장했습니다.
- Figma Make 파일 4개는 MCP가 반환한 source/image 리소스 URI 목록을 `mcp/figma-make-resources.json`, `mcp/figma-make-resources.md`에 저장했습니다.
- 새로 추가한 CRM UI 4개는 `18-`부터 `21-`까지의 소스 폴더에 저장하고 CRM 분류/순위에 반영했습니다.

## 중요한 한계

현재 접근 가능한 자료는 모두 저장했지만 Figma 원본 파일 전체를 `.fig`처럼 완전 복제한 것은 아닙니다.

- Figma REST API `https://api.figma.com/v1/files/{fileKey}`는 현재 환경에 Figma API 토큰이 없어 `403 Forbidden`을 반환합니다.
- Figma Make의 `file://figma/make/source/...` 리소스 URI는 MCP가 목록은 반환하지만, 현재 권한에서는 본문 직접 읽기가 제한됩니다.
- 새 CRM 4개에서 공통 placeholder 에셋 ID `550e8400-e29b-41d4-a716-446655440000`만 404로 실패했습니다. 실제 화면 스크린샷과 사용 가능한 에셋은 저장되어 있습니다.

## 폴더 구조

```text
reference-ui-archive/
  figma-sources.manifest.json
  figma-sources.manifest.csv
  SOURCE_INDEX.md
  asset-classification-report.md
  asset-classification.json
  archive-verification.json
  mcp-extraction.summary.json
  mcp-extraction.errors.json
  mcp-assets.download.summary.json
  mcp-screenshots.downloaded.json
  failure-recovery/
  figma-mcp-extra-screenshots/
  figma-sources/
    {source-id}/
      source-page.html
      web-meta.json
      thumbnail.png
      mcp-screenshot.png
      mcp-screenshot.meta.json
      mcp/
        mcp-index.json
        raw/
        text/
        code/
        code-localized/
        metadata/
        figma-make-resources.json
        figma-make-resources.md
      mcp-assets/
        assets.manifest.json
        *.png
        *.svg
```

## 사용 방법

1. 전체 링크 목록은 `figma-sources.manifest.json` 또는 `figma-sources.manifest.csv`에서 확인합니다.
2. 빠른 시각 검토는 각 소스 폴더의 `thumbnail.png`와 `mcp-screenshot.png`를 봅니다.
3. 구현 아이디어는 `mcp/code/`와 `mcp/code-localized/`의 React/Tailwind 참고 코드를 봅니다.
4. 화면 구조와 레이어 정보는 `mcp/metadata/`의 XML 메타데이터를 봅니다.
5. Figma Make 템플릿의 파일 구성은 `mcp/figma-make-resources.md`를 봅니다.
6. HR/DMS/ERP/CRM 분류와 기능 순위는 `asset-classification-report.md`와 `asset-classification.json`을 봅니다.
7. Law Firm OS 통합 UI 조합 계획은 `law-firm-os-ui-composition-plan.md`를 봅니다.
8. 저장 누락, 실패 복구, 카운트 검증은 `archive-verification.json`과 `failure-recovery/`를 봅니다.

## 사용 메모

이 자료는 Law Firm OS UI의 방향성, 화면 정보 구조, 컴포넌트 패턴을 참고하기 위한 레퍼런스입니다. 커뮤니티 디자인을 그대로 복제해 제품에 사용하는 목적이 아니므로, 실제 제품 UI는 법률 업무 도메인과 브랜드에 맞게 재설계해야 합니다.

