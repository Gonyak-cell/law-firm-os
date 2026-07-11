# WT-03-02 API client·상태 모델

- 상태: PASS (source/test/render). 브라우저에서 data·denied·error·conflict 상태를 실제 렌더했다.
- clients: read, create, approved-template apply, node create/patch/delete, Task complete/reopen
- explicit UI states: loading, data, empty, denied, error, conflict
- denied responses retain count-leak proof without exposing records.
- conflicts retain `current_version`; reads retain quoted ETag.
- desktop bridge forwards response headers so ETag is not discarded.

## Red → green

- RED: contract test failed because Worktree clients were absent.
- GREEN: API-client behavior and source contract passed 3/3 with WT-03-01.
- isolated commit은 43개 TUW 경계 감사 후 생성한다.
