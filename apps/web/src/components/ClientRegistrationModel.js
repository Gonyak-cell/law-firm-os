const CLIENT_TYPES = new Set(["person", "organization"]);

export const CLIENT_REGISTRATION_INITIAL_FORM = Object.freeze({
  client_type: "person",
  display_name: "",
  legal_form: "",
  registration_number: "",
  email: "",
  phone: "",
  depositor_alias: ""
});

const REASON_LABELS = Object.freeze({
  exact_display_name: "고객명이 같습니다",
  similar_display_name: "고객명이 유사합니다",
  registration_number_match: "등록번호가 같습니다",
  contact_match: "연락처가 같습니다",
  restricted_candidate: "접근 제한 후보입니다",
  permission_review_required: "권한 검토가 필요합니다"
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeClientRegistrationForm(form = {}) {
  const clientType = CLIENT_TYPES.has(form.client_type)
    ? form.client_type
    : CLIENT_REGISTRATION_INITIAL_FORM.client_type;
  return {
    client_type: clientType,
    display_name: text(form.display_name),
    legal_form: clientType === "organization" ? text(form.legal_form) : "",
    registration_number: clientType === "organization" ? text(form.registration_number) : "",
    email: clientType === "person" ? text(form.email) : "",
    phone: clientType === "person" ? text(form.phone) : "",
    depositor_alias: text(form.depositor_alias)
  };
}

export function validateClientRegistrationForm(form = {}) {
  const normalized = normalizeClientRegistrationForm(form);
  const errors = {};
  if (!normalized.display_name) errors.display_name = "고객명을 입력해 주세요.";
  if (normalized.client_type === "organization" && !normalized.legal_form) {
    errors.legal_form = "법인·단체 형태를 선택해 주세요.";
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    form: normalized
  };
}

export function clientRegistrationFingerprint(form = {}) {
  return JSON.stringify(normalizeClientRegistrationForm(form));
}

export function reviewMatchesForm(review, form) {
  return Boolean(
    review?.fingerprint
    && review.fingerprint === clientRegistrationFingerprint(form)
  );
}

export function reviewCandidates(review) {
  return review?.item && Array.isArray(review.item.candidates)
    ? review.item.candidates
    : [];
}

export function hasReviewCandidates(review) {
  return reviewCandidates(review).length > 0;
}

export function reviewAllowsCreate(review, form, distinctConfirmed = false) {
  if (!reviewMatchesForm(review, form)) return false;
  if (review.item?.can_create !== true) return false;
  const candidates = reviewCandidates(review);
  if (candidates.length > 0 && distinctConfirmed !== true) return false;
  return review.outcome === "passed" && Boolean(review.item?.review_digest);
}

export function safeReasonLabel(reason) {
  const code = text(reason);
  return REASON_LABELS[code] ?? "유사 정보가 있습니다";
}

export function registrationResultUiState(result) {
  if (!result) return "idle";
  if (result.kind === "error") return "error";
  if (result.uiState === "denied" || result.outcome === "denied") return "denied";
  if (result.uiState === "review_required" || result.outcome === "review_required") return "review_required";
  if (result.kind === "data" && result.outcome === "passed") return "passed";
  return "error";
}
