import React from "react";

export function DesktopDeniedState() {
  return (
    <div className="live-data-state live-data-denied desktop-denied-state" data-desktop-denied-state="true">
      <strong>접근 권한이 없습니다</strong>
      <span>
        담당자에게 접근을 요청하세요.
      </span>
    </div>
  );
}
