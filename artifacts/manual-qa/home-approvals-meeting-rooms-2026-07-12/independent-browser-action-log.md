# Independent browser action log

Surface: local Vite web renderer from the current worktree (`apps/web`), Chromium headless, read-only mocked Home API responses.

## HOME-CARD

- Invocation: `GET /?view=home&ctx=allow#home-dashboard` at `1280x820`; wait for `[data-dashboard-section="pending-approvals"]`.
- Result: PASS. The card rendered the rows `휴가` and `비용처리`; the measured document scroll width did not exceed the viewport.
- Artifact: `05-independent-dashboard-1280x820.png`.

## APPROVAL-LEAVE-ROUTE

- Invocation: click the first `.dashboard-record-row` inside `[data-dashboard-section="pending-approvals"]`.
- Result: PASS. URL hash became `#home-requests-leave` and the dedicated leave screen rendered.
- Artifact: `06-independent-leave-route-1280x820.png`.

## SIDEBAR-EXPANSION

- Invocation: `GET /?view=home&ctx=allow#home-dashboard` at `1280x820`; click `button[aria-label*="승인 대기 하위 메뉴"]`.
- Result: PASS. The sidebar exposed exactly `home-requests-leave` (`휴가`) and `home-requests-expenses` (`비용처리`).
- Artifact: `07-independent-sidebar-approvals-1280x820.png`.

## SIDEBAR-EXPENSE-ROUTE

- Invocation: click `[data-sidebar-section="home-requests-expenses"]`.
- Result: PASS. URL hash became `#home-requests-expenses`; the expense filter rendered.
- Artifact: `07-independent-sidebar-approvals-1280x820.png` and `08-independent-meeting-rooms-720x800.png` (same run directory; route state is also recorded above).

## TODO-TAB-REMOVAL

- Invocation: click the sidebar button with exact accessible name `할 일`.
- Result: PASS. URL hash became `#home-todo`; `[data-home-tab-prefix="work"]` count was `0`.
- Artifact: this action log and the scoped UI test run log.

## MEETING-ROOM-COMPACT

- Invocation: `GET /?view=home&ctx=allow#home-meeting-rooms` at `720x800`.
- Result: PASS. Heading was `회의실 예약`; measured `innerWidth=720`, `scrollWidth=720`.
- Artifact: `08-independent-meeting-rooms-720x800.png`.
