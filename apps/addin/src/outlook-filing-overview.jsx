import React from "react";

function filingState({ item, busy, filed }) {
  if (item?.mode === "compose") return "작성 중";
  if (["file", "sent_file", "attachments"].includes(busy)) return "저장 중";
  return filed ? "저장됨" : "저장되지 않음";
}

function senderCopy(item) {
  if (item?.mode === "compose") return "작성 중인 메일";
  return item?.from?.name || item?.from?.email || "보낸 사람을 확인할 수 없습니다.";
}

export function OutlookFilingOverview({
  item,
  selectedMatterDisplay = "",
  busy = "",
  filed = false,
}) {
  const subject = item?.subject || "메일을 열어 주세요";
  return (
    <div className="outlook-filing-overview" data-testid="outlook-filing-overview">
      <section className="outlook-message-context" aria-labelledby="outlook-message-subject">
        <div className="outlook-message-copy">
          <h1 id="outlook-message-subject">{subject}</h1>
          <p>{senderCopy(item)}</p>
        </div>
        <span className="outlook-filing-state" data-testid="outlook-filing-state">
          {filingState({ item, busy, filed })}
        </span>
      </section>

      <section className="outlook-filing-location" aria-labelledby="outlook-filing-location-title">
        <h2 id="outlook-filing-location-title">저장 위치</h2>
        <p className={selectedMatterDisplay ? "outlook-selected-matter" : "outlook-matter-empty"}>
          {selectedMatterDisplay || "저장할 Matter를 선택해 주세요."}
        </p>
      </section>
    </div>
  );
}
