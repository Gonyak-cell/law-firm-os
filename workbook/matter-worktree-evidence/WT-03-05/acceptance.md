# WT-03-05 트리 캔버스

- 상태: PASS (source/test/build/render).
- virtual root, branch, Task, and unclassified Task nodes render through one recursive tree.
- desktop branches flow left-to-right with a fixed node width and explicit connector lines.
- branches support independent collapse and expand.
- Lazyweb design gate passed before implementation.
- 5노드와 300노드 트리를 실제 Chromium에서 렌더했고 루트·branch·Task·연결선·내부 스크롤을 확인했다.
