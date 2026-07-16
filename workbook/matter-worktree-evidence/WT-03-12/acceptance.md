# WT-03-12 오류·충돌 복구 UI

- 상태: PASS (source/test/build/render).
- denied state hides records/counts and states lack of access.
- network error has a distinct retry action.
- conflict identifies concurrent change and reloads the latest version.
- selected node identity is preserved across refetch when it still exists.
- 실제 브라우저에서 denied·network error·409 conflict 세 상태를 각각 렌더하고 문구와 복구 버튼을 확인했다.
