#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = ["pydantic>=2.13", "pypdf>=6.10", "python-docx>=1.2", "openpyxl>=3.1"]
# ///

# ─── How to run ───
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run with the bundled workspace runtime or uv:
#      uv run scripts/extract-amic-source-evidence.py <manifest.jsonl> <source-root> <private-output-root>
# 3. Resume an interrupted private extraction:
#      uv run scripts/extract-amic-source-evidence.py --resume <manifest.jsonl> <source-root> <private-output-root>
# ──────────────────

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Literal, assert_never

from pydantic import BaseModel, ConfigDict

from amic_source_evidence import ExtractionContext, ExtractionOutcome, SourceRecord, extract_text


SOURCE_REVISION = "amic-1-2026-07-10"
CHARACTER_LIMIT = 200_000
COURT_PATTERN = re.compile(r"((?:[가-힣]{1,12})?(?:고등법원|지방법원|가정법원|행정법원|특허법원|대법원))")
POLICE_PATTERN = re.compile(r"((?:[가-힣]{1,12})경찰서)")
PROSECUTION_PATTERN = re.compile(r"((?:[가-힣]{1,12})검찰청)")
CIVIL_CASE_PATTERN = re.compile(r"(20\d{2}\s*(?:가단|가합|나|다|카단|카합|카경|머|즈단)\s*\d+)")
CRIMINAL_CASE_PATTERN = re.compile(r"(20\d{2}\s*(?:고단|고합|고정|노|도)\s*\d+)")
PROSECUTION_SIBLING_PATTERN = re.compile(r"(20\d{2}\s*형제\s*\d+)")
ADMINISTRATIVE_CASE_PATTERN = re.compile(r"(20\d{2}\s*(?:구합|누|두|행심|행정심판)\s*\d+)")
EMAIL_PATTERN = re.compile(r"\b[^\s@]+@[^\s@]+\.[^\s@]+\b")
PHONE_PATTERN = re.compile(r"(?<!\d)(?:0|\+82[-.\s]?)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)")


class FieldCandidate(BaseModel):
    """One private review candidate for a Matter profile field."""

    model_config = ConfigDict(frozen=True)

    field: str
    value: str | bool


class StakeholderCandidate(BaseModel):
    """A contact-free MatterStakeholder proposal requiring human validation."""

    model_config = ConfigDict(frozen=True)

    relationship_role: str
    display_name: str


class EvidenceRecord(BaseModel):
    """Private, evidence-minimized extraction record with no source path or contact value."""

    model_config = ConfigDict(frozen=True)

    source_record_id: str
    source_ref: str
    source_path_disclosed: Literal[False]
    profile_kind_hint: str
    extractor: str
    extraction_status: str
    extracted_text_sha256: str | None
    extracted_character_count: int
    page_count: int | None
    truncated: bool
    error_kind: str | None
    client_name_candidates: tuple[str, ...]
    profile_field_candidates: tuple[FieldCandidate, ...]
    stakeholder_candidates: tuple[StakeholderCandidate, ...]
    contact_values_detected: bool
    review_required: Literal[True]


class RunArguments(BaseModel):
    """Validated command-line parameters for private evidence extraction."""

    model_config = ConfigDict(frozen=True)

    manifest_path: Path
    source_root: Path
    output_root: Path
    resume: bool


def deduplicated(values: list[str]) -> tuple[str, ...]:
    """Normalize candidate values and retain their first observed ordering."""

    normalized = [re.sub(r"\s+", " ", value).strip(" \t:：|-") for value in values]
    return tuple(dict.fromkeys(value for value in normalized if len(value) >= 2))


def regex_values(pattern: re.Pattern[str], text: str) -> tuple[str, ...]:
    """Collect first-capture values for a deterministic evidence pattern."""

    return deduplicated([match.group(1) for match in pattern.finditer(text)])


def labeled_values(text: str, labels: tuple[str, ...]) -> tuple[str, ...]:
    """Collect one-line values following any of the provided Korean field labels."""

    values: list[str] = []
    for label in labels:
        pattern = re.compile(rf"(?:{re.escape(label)})\s*[:：]?\s*([^\r\n]{{2,160}})")
        values.extend(match.group(1) for match in pattern.finditer(text))
    return deduplicated(values)


def redacted(value: str) -> str:
    """Remove raw phone and email values before a candidate is persisted."""

    return PHONE_PATTERN.sub("[PHONE_REDACTED]", EMAIL_PATTERN.sub("[EMAIL_REDACTED]", value))


def utf8_safe(value: str) -> str:
    """Replace malformed PDF text code points before hashing or serializing candidates."""

    return value.encode("utf-8", errors="replace").decode("utf-8")


def candidates(field: str, values: tuple[str, ...]) -> tuple[FieldCandidate, ...]:
    """Convert evidence values into review-only profile-field candidates."""

    return tuple(FieldCandidate(field=field, value=redacted(value)) for value in values)


def client_names(text: str) -> tuple[str, ...]:
    """Find labeled party and client names without assigning them to a Client record."""

    return tuple(redacted(value) for value in labeled_values(text, ("의뢰인", "고객", "원고", "피고", "신청인", "고소인", "매도인", "매수인", "대상회사", "상대방")))


def stakeholders(text: str, labels: tuple[tuple[str, tuple[str, ...]], ...]) -> tuple[StakeholderCandidate, ...]:
    """Build review-only stakeholder proposals without contact identifiers or values."""

    results: list[StakeholderCandidate] = []
    for role, role_labels in labels:
        results.extend(StakeholderCandidate(relationship_role=role, display_name=redacted(value)) for value in labeled_values(text, role_labels))
    return tuple(dict.fromkeys(results))


def civil_fields(text: str) -> tuple[FieldCandidate, ...]:
    """Extract civil litigation candidates from visible text."""

    return (*candidates("jurisdiction_court", regex_values(COURT_PATTERN, text)), *candidates("case_number", regex_values(CIVIL_CASE_PATTERN, text)), *candidates("case_name", labeled_values(text, ("사건명",))), *candidates("chamber_name", labeled_values(text, ("재판부", "담당재판부"))))


def criminal_fields(text: str) -> tuple[FieldCandidate, ...]:
    """Extract criminal litigation candidates from visible text."""

    police_numbers = labeled_values(text, ("경찰 사건번호", "접수번호", "관리번호", "사건번호"))
    return (*candidates("police_case_number", police_numbers), *candidates("prosecution_sibling_number", regex_values(PROSECUTION_SIBLING_PATTERN, text)), *candidates("police_station", regex_values(POLICE_PATTERN, text)), *candidates("prosecution_office", regex_values(PROSECUTION_PATTERN, text)), *candidates("criminal_case_number", regex_values(CRIMINAL_CASE_PATTERN, text)), *candidates("case_name", labeled_values(text, ("사건명",))))


def administrative_fields(text: str) -> tuple[FieldCandidate, ...]:
    """Extract administrative litigation candidates from visible text."""

    return (*candidates("jurisdiction_court", regex_values(COURT_PATTERN, text)), *candidates("administrative_case_number", regex_values(ADMINISTRATIVE_CASE_PATTERN, text)), *candidates("case_name", labeled_values(text, ("사건명",))), *candidates("agency_name", labeled_values(text, ("처분청", "행정청", "피청구인"))), *candidates("disposition_name", labeled_values(text, ("처분명", "처분내용"))))


def deal_stage_candidates(text: str) -> tuple[FieldCandidate, ...]:
    """Map explicit transaction wording to the existing DEAL stage vocabulary."""

    stage_patterns = (
        ("origination", r"origination|발굴"),
        ("marketing", r"marketing|마케팅"),
        ("indicative_offer", r"indicative\s*offer|의향서|LOI"),
        ("due_diligence", r"due\s*diligence|실사"),
        ("negotiation", r"negotiation|협상"),
        ("signing", r"signing|계약체결"),
        ("closing", r"closing|종결"),
        ("post_closing", r"post[ -]?closing|종결 후"),
        ("on_hold", r"보류|on[ -]?hold"),
        ("terminated", r"중단|종료|terminated"),
    )
    return tuple(FieldCandidate(field="stage", value=stage) for stage, pattern in stage_patterns if re.search(pattern, text, flags=re.IGNORECASE))


def deal_fields(text: str) -> tuple[FieldCandidate, ...]:
    """Extract DEAL organization and transaction candidates, leaving numeric normalization for review."""

    shareholder_contact = (FieldCandidate(field="direct_shareholder_contact", value=True),) if "주주 직접 연락" in text else ()
    return (*candidates("transaction_value", labeled_values(text, ("거래규모", "거래금액", "기업가치", "매매대금", "인수대금"))), *deal_stage_candidates(text), *candidates("counterparty_name", labeled_values(text, ("상대방", "매수인", "매도인", "투자자"))), *candidates("counterparty_law_firm", labeled_values(text, ("상대방 자문펌", "상대방 법무법인"))), *candidates("sell_side_advisor", labeled_values(text, ("매각자문", "매도자문"))), *candidates("buy_side_advisor", labeled_values(text, ("인수자문", "매수자문"))), *candidates("accounting_firm", labeled_values(text, ("회계법인", "회계자문"))), *shareholder_contact)


def advisory_fields(text: str) -> tuple[FieldCandidate, ...]:
    """Extract corporate advisory profile candidates from labeled scope and delivery text."""

    mode = "retainer" if re.search(r"정기.?자문|retainer", text, flags=re.IGNORECASE) else "ad_hoc" if re.search(r"수시.?자문|ad.?hoc", text, flags=re.IGNORECASE) else "project" if re.search(r"프로젝트.?자문|project", text, flags=re.IGNORECASE) else None
    mode_candidate = (FieldCandidate(field="engagement_mode", value=mode),) if mode else ()
    return (*candidates("advisory_topic", labeled_values(text, ("자문주제", "자문 내용", "자문내용"))), *candidates("request_scope", labeled_values(text, ("의뢰 범위", "자문 범위", "업무범위"))), *mode_candidate, *candidates("delivery_reference", labeled_values(text, ("납품물", "산출물", "의견서"))))


def profile_fields(record: SourceRecord, text: str) -> tuple[FieldCandidate, ...]:
    """Select the profile-specific deterministic candidate set from the manifest hint."""

    match record.profile_kind_hint:
        case "civil_litigation":
            return civil_fields(text)
        case "criminal_litigation":
            return criminal_fields(text)
        case "administrative_litigation":
            return administrative_fields(text)
        case "deal":
            return deal_fields(text)
        case "corporate_advisory":
            return advisory_fields(text)
        case "unknown":
            return ()
        case unreachable:
            assert_never(unreachable)


def stakeholder_fields(record: SourceRecord, text: str) -> tuple[StakeholderCandidate, ...]:
    """Select only named stakeholder candidates applicable to the indicated work type."""

    match record.profile_kind_hint:
        case "civil_litigation":
            return stakeholders(text, (("court_contact", ("재판부 담당",)), ("court_clerk", ("담당주무관", "주무관"))))
        case "criminal_litigation":
            return stakeholders(text, (("police_officer", ("담당수사관", "담당 경찰관")), ("prosecutor", ("담당검사",))))
        case "administrative_litigation":
            return stakeholders(text, (("agency_officer", ("담당 공무원", "담당자")), ("court_clerk", ("담당주무관", "주무관"))))
        case "deal":
            return stakeholders(text, (("counterparty_lawyer", ("상대방 담당변호사",)), ("sell_side_advisor_lawyer", ("매각자문 담당변호사", "매도자문 담당변호사")), ("buy_side_advisor_lawyer", ("인수자문 담당변호사", "매수자문 담당변호사")), ("accountant", ("담당회계사", "회계법인 담당")), ("company_contact", ("담당직원", "회사 담당자")), ("shareholder", ("주주"))))
        case "corporate_advisory":
            return stakeholders(text, (("client_contact", ("의뢰 담당자", "담당직원")),))
        case "unknown":
            return ()
        case unreachable:
            assert_never(unreachable)


def evidence_record(record: SourceRecord, outcome: ExtractionOutcome) -> EvidenceRecord:
    """Build a private candidate row after deterministic extraction and contact redaction."""

    text = utf8_safe(outcome.text)
    return EvidenceRecord(
        source_record_id=record.source_record_id,
        source_ref=f"private-source-index://{SOURCE_REVISION}/{record.source_record_id}",
        source_path_disclosed=False,
        profile_kind_hint=record.profile_kind_hint,
        extractor=outcome.extractor,
        extraction_status=outcome.status,
        extracted_text_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest() if text else None,
        extracted_character_count=len(text),
        page_count=outcome.page_count,
        truncated=outcome.truncated,
        error_kind=outcome.error_kind,
        client_name_candidates=client_names(text),
        profile_field_candidates=profile_fields(record, text),
        stakeholder_candidates=stakeholder_fields(record, text),
        contact_values_detected=bool(EMAIL_PATTERN.search(text) or PHONE_PATTERN.search(text)),
        review_required=True,
    )


def parse_arguments(argv: list[str]) -> RunArguments:
    """Parse the intentionally small CLI without accepting undocumented options."""

    resume = "--resume" in argv
    paths = [argument for argument in argv if argument != "--resume"]
    if len(paths) != 3:
        raise ValueError("usage: extract-amic-source-evidence.py [--resume] <manifest.jsonl> <source-root> <private-output-root>")
    return RunArguments(manifest_path=Path(paths[0]), source_root=Path(paths[1]), output_root=Path(paths[2]), resume=resume)


def completed_results(path: Path) -> tuple[set[str], Counter[str]]:
    """Read completed identifiers and statuses from a resumable private partial output."""

    if not path.exists():
        return set(), Counter()
    records = tuple(EvidenceRecord.model_validate_json(line) for line in path.read_text(encoding="utf-8").splitlines() if line)
    return {record.source_record_id for record in records}, Counter(record.extraction_status for record in records)


def run(arguments: RunArguments) -> Counter[str]:
    """Create one resumable, private evidence-candidate snapshot from current materials only."""

    arguments.output_root.mkdir(parents=True, exist_ok=True)
    final_path = arguments.output_root / "source-evidence.jsonl"
    partial_path = arguments.output_root / "source-evidence.jsonl.partial"
    if final_path.exists():
        raise ValueError("final evidence output already exists; use a new revision directory")
    if partial_path.exists() and not arguments.resume:
        raise ValueError("partial evidence output exists; resume explicitly or use a new revision directory")
    done, counts = completed_results(partial_path) if arguments.resume else (set(), Counter())
    context = ExtractionContext(source_root=arguments.source_root, character_limit=CHARACTER_LIMIT)
    with arguments.manifest_path.open(encoding="utf-8") as manifest, partial_path.open("a", encoding="utf-8") as output:
        for line in manifest:
            record = SourceRecord.model_validate_json(line)
            if record.source_scope != "current" or record.source_record_id in done:
                continue
            outcome = extract_text(record, context)
            output.write(f"{evidence_record(record, outcome).model_dump_json()}\n")
            counts[outcome.status] += 1
            if sum(counts.values()) % 250 == 0:
                print(json.dumps({"progress": sum(counts.values()), "status_counts": dict(counts)}, ensure_ascii=False), flush=True)
    partial_path.replace(final_path)
    (arguments.output_root / "source-evidence-summary.json").write_text(json.dumps({"schema_version": "law-firm-os.amic_source_evidence.v1", "source_revision": SOURCE_REVISION, "processed": sum(counts.values()), "status_counts": dict(counts), "source_content_written": False, "raw_contact_values_written": False}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return counts


def main() -> None:
    """Run the private extraction and emit a sanitized completion receipt."""

    counts = run(parse_arguments(sys.argv[1:]))
    print(json.dumps({"verdict": "PASS", "processed": sum(counts.values()), "status_counts": dict(counts), "source_content_written": False, "raw_contact_values_written": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
