import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { PRODUCT_BRAND } from "../brand/brand";
import { MatterSplash } from "./MatterSplash.jsx";
import { MatterLogo } from "./MatterLogo.jsx";
import { Field } from "./primitives.jsx";
import { HomeSurface } from "./HomeSurface.jsx";

export function AuthSurface({ labels, locale, authStep, setAuthStep, onLogin = () => {} }) {
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
            <AuthForm labels={labels} locale={locale} step={authStep} onLogin={onLogin} />
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

export function AuthForm({ labels, locale, step, onLogin = () => {} }) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  if (step === "login") {
    return (
      <form
        className="form-stack"
        data-login-form="email-password"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loginEmail.trim() || !loginPassword) return;
          onLogin({ email: loginEmail.trim(), password: loginPassword });
        }}
      >
        <label className="field">
          <span>이메일</span>
          <input
            data-login-email
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            type="email"
            required
          />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input
            data-login-password
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            autoComplete="current-password"
            type="password"
            required
          />
        </label>
        <button className="primary-button full" type="submit">
          로그인
        </button>
        <div className="auth-links">
          <a>비밀번호를 잊으셨나요?</a>
        </div>
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
