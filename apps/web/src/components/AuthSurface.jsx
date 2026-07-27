import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  Eye,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { PRODUCT_BRAND } from "../brand/brand";
import amicLawLogo from "../assets/amic-law.svg";
import brochureCover from "../assets/brochure-cover.jpg";
import { MatterSplash } from "./MatterSplash.jsx";
import { MatterLogo } from "./MatterLogo.jsx";
import { Field } from "./primitives.jsx";
import { HomeSurface } from "./HomeSurface.jsx";
import { confirmLawosPasswordReset, requestLawosPasswordReset } from "../data/apiClient.js";

const LOGIN_INTRO_DURATION_MS = 2100;
const PASSWORD_RESET_TOKEN_PATTERN = /^(?=.{16,256}$)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/;

export function AuthSurface({ labels, locale, authStep, setAuthStep, authError = "", onLogin = () => {} }) {
  const [loginIntroState, setLoginIntroState] = useState("pending");
  const loginStageRef = useRef(null);
  const loginIntroLogoRef = useRef(null);
  const loginTargetLogoRef = useRef(null);

  useEffect(() => {
    if (authStep !== "login") return undefined;
    let cancelled = false;
    let frame = 0;
    let timer = 0;
    let started = false;

    setLoginIntroState("pending");
    async function prepareLoginIntro() {
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
      let playIntro = true;
      if (typeof window.matterSession?.claimLogoIntro === "function") {
        try {
          const claim = await window.matterSession.claimLogoIntro();
          playIntro = claim?.play_logo_animation === true;
        } catch {
          playIntro = true;
        }
      } else {
        try {
          const key = "matter.login.intro.played.v1";
          playIntro = window.sessionStorage.getItem(key) !== "1";
          if (playIntro) window.sessionStorage.setItem(key, "1");
        } catch {
          playIntro = true;
        }
      }
      if (cancelled) return;
      if (reducedMotion || !playIntro) {
        setLoginIntroState("complete");
        return;
      }

      frame = window.requestAnimationFrame(() => {
        const stage = loginStageRef.current;
        const source = loginIntroLogoRef.current?.getBoundingClientRect();
        const target = loginTargetLogoRef.current?.querySelector(".amic-law-logo")?.getBoundingClientRect();
        if (!stage || !source?.width || !target?.width) {
          setLoginIntroState("complete");
          return;
        }
        const dx = target.left + target.width / 2 - window.innerWidth / 2;
        const dy = target.top + target.height / 2 - window.innerHeight / 2;
        stage.style.setProperty("--forest-login-motion-duration", `${LOGIN_INTRO_DURATION_MS}ms`);
        stage.style.setProperty("--forest-login-logo-dx", `${dx.toFixed(3)}px`);
        stage.style.setProperty("--forest-login-logo-dy", `${dy.toFixed(3)}px`);
        stage.style.setProperty("--forest-login-logo-scale", (target.width / source.width).toFixed(4));
        setLoginIntroState("play");
        timer = window.setTimeout(() => setLoginIntroState("complete"), LOGIN_INTRO_DURATION_MS + 100);
      });
    }

    function startLoginIntroWhenFocused() {
      if (cancelled || started || document.visibilityState !== "visible" || !document.hasFocus()) return;
      started = true;
      void prepareLoginIntro();
    }

    document.addEventListener("visibilitychange", startLoginIntroWhenFocused);
    window.addEventListener("focus", startLoginIntroWhenFocused);
    startLoginIntroWhenFocused();
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", startLoginIntroWhenFocused);
      window.removeEventListener("focus", startLoginIntroWhenFocused);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [authStep]);

  if (authStep === "signupModal") {
    return (
      <section className="auth-app-preview">
        <HomeSurface labels={labels} variant="default" setView={() => {}} onSave={() => {}} />
        <div className="auth-signup-modal">
          <h2>작업공간 시작</h2>
          <button className="sso-button" type="button">Google로 가입</button>
          <div className="divider-text"><span />또는<span /></div>
          <label className="field">
            <span>이름</span>
            <input placeholder="이름 입력" />
          </label>
          <label className="field">
            <span>이메일</span>
            <input placeholder="업무 이메일" />
          </label>
          <label className="field">
            <span>데이터 저장 위치</span>
            <button className="location-select" type="button">
              대한민국
              <ChevronDown size={14} />
            </button>
          </label>
          <label className="check-row">
            <input type="checkbox" />
            이용약관과 개인정보 처리방침에 동의합니다.
          </label>
          <label className="check-row">
            <input type="checkbox" />
            {`${PRODUCT_BRAND} 안내 메일을 받습니다.`}
          </label>
          <button className="primary-button full">{labels.continue}</button>
          <p>이미 계정이 있나요? <a>로그인</a></p>
        </div>
        <p className="recaptcha-note">
          보안 확인을 위해 reCAPTCHA가 적용될 수 있습니다.
        </p>
      </section>
    );
  }

  const steps = [
    ["signup", labels.signupTitle, UserPlus],
    ["login", labels.loginTitle, LockKeyhole],
    ["verify", labels.verifyTitle, Mail],
    ["password", labels.passwordTitle, KeyRound],
    ["org", labels.orgTitle, ShieldCheck],
    ["onboarding", "초기 설정", ClipboardList],
    ["reset", labels.resetTitle, LogIn],
    ["sent", labels.emailSentTitle, CheckCircle2]
  ];
  const current = steps.find(([id]) => id === authStep) ?? steps[0];
  const Icon = current[2];
  if (authStep === "login") {
    return (
      <section
        ref={loginStageRef}
        className="auth-stage step-login matter-login-stage"
        data-login-screen="forest-split"
        data-login-intro={loginIntroState}
      >
        <div className="matter-login-intro" aria-hidden="true">
          <div ref={loginIntroLogoRef} className="matter-login-intro-logo">
            <img className="amic-law-logo matter-login-intro-a" src={amicLawLogo} alt="" />
            <img className="amic-law-logo matter-login-intro-mic" src={amicLawLogo} alt="" />
          </div>
        </div>
        <div className="matter-login-copy">
          <div className="matter-login-form-column">
            <div ref={loginTargetLogoRef} className="matter-login-logo-target">
              <MatterLogo />
            </div>
            <div className="matter-login-heading">
              <h1>{`Log in to ${PRODUCT_BRAND}`}</h1>
              <p>
                {`Don't have a ${PRODUCT_BRAND} account yet? `}
                <button type="button" onClick={() => setAuthStep("signup")}>
                  {labels.signupPreviewNotice}
                </button>
              </p>
            </div>
            <AuthForm labels={labels} locale={locale} step={authStep} authError={authError} onLogin={onLogin} />
          </div>
        </div>
        <aside className="matter-login-photo-panel" aria-label="AMIC Forest">
          <img src={brochureCover} alt="AMIC Forest" />
        </aside>
      </section>
    );
  }

  return (
    <section className={`auth-stage step-${authStep}`}>
      <div className="public-preview">
        <header className="public-nav">
          <MatterLogo />
          <nav>
            <span>제품</span>
            <span>업무 영역</span>
            <span>자료</span>
            <span>요금</span>
          </nav>
          <button className="secondary-button">{labels.requestDemo}</button>
          <button className="primary-button">{labels.getStarted}</button>
        </header>
        <div className="public-hero">
          <div className="hero-art" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <h1>{labels.publicTitle}</h1>
          <p>{labels.publicSubtitle}</p>
          <div className="hero-actions">
            <button className="primary-button">{labels.getStarted}</button>
            <button className="secondary-button">{labels.requestDemo}</button>
          </div>
        </div>
      </div>
      <aside className="auth-panel">
        <div className="segmented wrap">
          {steps.map(([id, label, StepIcon]) => (
            <button key={id} className={authStep === id ? "active" : ""} onClick={() => setAuthStep(id)}>
              <StepIcon size={14} />
              {label}
            </button>
          ))}
        </div>
        <div className="auth-card">
          <MatterSplash compact className="auth-splash" />
          <div className="auth-title">
            <Icon size={20} />
            <h2>{current[1]}</h2>
          </div>
          {authStep === "onboarding" ? (
            <OnboardingCard labels={labels} locale={locale} />
          ) : authStep === "verify" || authStep === "sent" ? (
            <VerificationCard labels={labels} sent={authStep === "sent"} />
          ) : (
            <AuthForm labels={labels} locale={locale} step={authStep} authError={authError} onLogin={onLogin} />
          )}
        </div>
      </aside>
    </section>
  );
}

export function OnboardingCard({ labels, locale }) {
  const sources = ["Vault", "청구", "감사", "Client 공유", "Matter", "상담"];
  return (
    <div className="onboarding-card">
      <div className="progress-line">
        <span style={{ width: "66%" }} />
      </div>
      <h3>{`${PRODUCT_BRAND} 설정 시작`}</h3>
      <p>
        {`운영 데이터를 연결해 ${PRODUCT_BRAND} 작업공간을 완성하세요.`}
      </p>
      <div className="source-grid">
        {sources.map((source, index) => (
          <button key={source} className={index < 3 ? "source-card selected" : "source-card"}>
            <Database size={16} />
            <strong>{source}</strong>
            <span>{index < 3 ? labels.verified : labels.planned}</span>
          </button>
        ))}
      </div>
      <button className="primary-button full">{labels.continue}</button>
    </div>
  );
}

export function AuthForm({ labels, locale, step, authError = "", onLogin = () => {} }) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [recoveryState, setRecoveryState] = useState("sign_in");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loginEmailInputRef = useRef(null);
  const resetPasswordInputRef = useRef(null);
  const resetTokenRef = useRef("");

  useEffect(() => {
    if (step !== "login" || typeof window.matterSession?.onPasswordResetDeepLink !== "function") return undefined;
    const unsubscribe = window.matterSession.onPasswordResetDeepLink((intent) => {
      const token = typeof intent?.token === "string" ? intent.token : "";
      if (intent?.type !== "password_reset_confirm" || !PASSWORD_RESET_TOKEN_PATTERN.test(token)) return;
      resetTokenRef.current = token;
      setResetPassword("");
      setResetPasswordConfirm("");
      setRecoveryMessage("");
      setRecoveryState("confirm");
      window.requestAnimationFrame(() => resetPasswordInputRef.current?.focus());
    });
    return () => {
      resetTokenRef.current = "";
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [step]);

  function returnToSignIn(message = "") {
    resetTokenRef.current = "";
    setLoginPassword("");
    setResetPassword("");
    setResetPasswordConfirm("");
    setRecoveryMessage(message);
    setRecoveryState("sign_in");
    window.requestAnimationFrame(() => loginEmailInputRef.current?.focus());
  }

  async function requestRecovery() {
    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setRecoveryMessage("업무 이메일을 먼저 입력하세요.");
      loginEmailInputRef.current?.focus();
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setLoginPassword("");
    setRecoveryState("requesting");
    setRecoveryMessage("");
    try {
      const result = await requestLawosPasswordReset({ email });
      if (result.ok) {
        setRecoveryState("sent");
        setRecoveryMessage("등록 및 사용 가능한 계정이라면 비밀번호 재설정 메일을 보냈습니다.");
        return;
      }
      setRecoveryState("sign_in");
      setRecoveryMessage("재설정 메일 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmRecovery(event) {
    event.preventDefault();
    if (submitting) return;
    if (!PASSWORD_RESET_TOKEN_PATTERN.test(resetTokenRef.current)) {
      returnToSignIn("재설정 링크가 없거나 만료되었습니다. 새 메일을 요청하세요.");
      return;
    }
    if (resetPassword.length < 12) {
      setRecoveryMessage("새 비밀번호는 12자 이상이어야 합니다.");
      resetPasswordInputRef.current?.focus();
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setRecoveryMessage("새 비밀번호가 서로 다릅니다.");
      return;
    }
    setSubmitting(true);
    setRecoveryMessage("");
    try {
      const result = await confirmLawosPasswordReset({
        token: resetTokenRef.current,
        password: resetPassword
      });
      if (result.ok) {
        resetTokenRef.current = "";
        setResetPassword("");
        setResetPasswordConfirm("");
        setRecoveryState("success");
        setRecoveryMessage("비밀번호가 설정되었습니다. 새 비밀번호로 로그인하세요.");
        return;
      }
      setRecoveryMessage(
        result.status === 401
          ? "링크가 만료되었거나 이미 사용되었습니다. 새 재설정 메일을 요청하세요."
          : "비밀번호를 설정하지 못했습니다. 잠시 후 다시 시도하세요."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "login") {
    if (recoveryState === "confirm") {
      return (
        <form
          className="form-stack matter-login-form matter-login-recovery"
          data-login-form="password-reset"
          onSubmit={confirmRecovery}
        >
          <div className="matter-login-recovery-copy">
            <strong>새 비밀번호 설정</strong>
            <span>새 비밀번호를 두 번 입력하세요.</span>
          </div>
          <label className="matter-login-field">
            <span>새 비밀번호</span>
            <input
              ref={resetPasswordInputRef}
              data-reset-new-password
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="12자 이상"
              type="password"
              minLength={12}
              required
            />
            <KeyRound size={22} strokeWidth={1.9} aria-hidden="true" />
          </label>
          <label className="matter-login-field">
            <span>새 비밀번호 확인</span>
            <input
              data-reset-confirm-password
              value={resetPasswordConfirm}
              onChange={(event) => setResetPasswordConfirm(event.target.value)}
              autoComplete="new-password"
              placeholder="한 번 더 입력"
              type="password"
              minLength={12}
              required
            />
            <KeyRound size={22} strokeWidth={1.9} aria-hidden="true" />
          </label>
          {recoveryMessage && (
            <div className="login-local-state" data-login-recovery-state="true" aria-live="polite">
              <span>{recoveryMessage}</span>
            </div>
          )}
          <div className="matter-login-recovery-actions">
            <button className="matter-login-submit" type="submit" disabled={submitting}>
              {submitting ? "설정 중" : "비밀번호 설정"}
            </button>
            <button className="matter-login-secondary" type="button" onClick={() => returnToSignIn()}>
              로그인으로 돌아가기
            </button>
          </div>
        </form>
      );
    }

    if (recoveryState === "sent" || recoveryState === "requesting" || recoveryState === "success") {
      const succeeded = recoveryState === "success";
      return (
        <div className="matter-login-recovery" data-login-recovery-panel={recoveryState}>
          <div className="matter-login-recovery-icon" aria-hidden="true">
            {succeeded ? <CheckCircle2 size={28} /> : <Mail size={28} />}
          </div>
          <div className="matter-login-recovery-copy" aria-live="polite">
            <strong>{succeeded ? "비밀번호 설정 완료" : "재설정 메일 확인"}</strong>
            <span>
              {recoveryState === "requesting"
                ? "비밀번호 재설정 메일을 요청하고 있습니다."
                : recoveryMessage}
            </span>
          </div>
          <div className="matter-login-recovery-actions">
            {!succeeded && (
              <button
                className="matter-login-submit"
                type="button"
                data-login-reset-resend
                disabled={submitting}
                onClick={() => void requestRecovery()}
              >
                {submitting ? "전송 중" : "메일 다시 보내기"}
              </button>
            )}
            <button className="matter-login-secondary" type="button" onClick={() => returnToSignIn()}>
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    return (
      <form
        className="form-stack matter-login-form"
        data-login-form="email-password"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting || !loginEmail.trim() || !loginPassword) return;
          setSubmitting(true);
          try {
            await onLogin({ email: loginEmail.trim(), password: loginPassword, remember: rememberLogin });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="matter-login-field">
          <span>Email</span>
          <input
            ref={loginEmailInputRef}
            data-login-email
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="업무 이메일"
            type="email"
            required
          />
          <Mail size={22} strokeWidth={1.9} aria-hidden="true" />
        </label>
        <label className="matter-login-field">
          <span>Password</span>
          <input
            data-login-password
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="••••••••••••"
            type="password"
            required
          />
          <Eye size={22} strokeWidth={1.9} aria-hidden="true" />
        </label>
        <div className="matter-login-options">
          <label className="matter-login-remember">
            <input
              type="checkbox"
              checked={rememberLogin}
              data-login-remember
              onChange={(event) => setRememberLogin(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <button
            className="matter-login-forgot"
            type="button"
            data-login-forgot-password
            disabled={submitting}
            onClick={() => void requestRecovery()}
          >
            Forgot<br />
            password?
          </button>
        </div>
        {(rememberLogin || recoveryMessage || authError) && (
          <div className="login-local-state" data-login-local-state="true" aria-live="polite">
            {rememberLogin && <span data-login-remember-state="true">이 기기에서 로그인 이메일을 기억합니다.</span>}
            {recoveryMessage && <span data-login-recovery-state="true">{recoveryMessage}</span>}
            {authError && <span data-login-error="true">{authError}</span>}
          </div>
        )}
        <button className="matter-login-submit" type="submit" disabled={submitting}>
          {submitting ? "Signing in" : "Log in"}
        </button>
      </form>
    );
  }

  return (
    <form className="form-stack">
      <Field label="이메일" value="" />
      {["signup", "org"].includes(step) && <Field label="이름" value="" />}
      {["signup", "password", "login", "reset"].includes(step) && (
        <Field label={step === "reset" ? "새 비밀번호" : "비밀번호"} value="" />
      )}
      {step === "org" && <Field label="조직명" value="" />}
      {step === "signup" && (
        <label className="check-row">
          <input type="checkbox" defaultChecked />
          대한민국 리전 저장 및 개인정보 처리에 동의합니다.
        </label>
      )}
      {step === "password" && (
        <div className="notice success">
          <CheckCircle2 size={15} />
          12자 이상, 대문자, 숫자 조건 충족
        </div>
      )}
      <button className="primary-button full" type="button">
        {labels.continue}
      </button>
      <div className="auth-links">
        <a>비밀번호를 잊으셨나요?</a>
        <a>이미 계정이 있나요?</a>
      </div>
    </form>
  );
}

export function VerificationCard({ labels, sent }) {
  return (
    <div className="verification-card">
      <div className="mail-illustration">
        <Mail size={24} />
      </div>
      <p>
        {sent
          ? `${PRODUCT_BRAND} 재설정 링크를 보냈습니다.`
          : `이메일로 받은 확인 링크를 눌러 ${PRODUCT_BRAND} 설정을 완료하세요.`}
      </p>
      <button className="secondary-button">{sent ? "로그인으로 돌아가기" : "이메일 다시 보내기"}</button>
      <button className="text-button">{labels.cancel}</button>
    </div>
  );
}
