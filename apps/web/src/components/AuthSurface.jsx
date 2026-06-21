import React from "react";
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
import { copy } from "../i18n.js";
import { MaterSplash } from "./MaterSplash.jsx";
import { MatterLogo } from "./MatterLogo.jsx";
import { Field } from "./primitives.jsx";
import { HomeSurface } from "./HomeSurface.jsx";

export function AuthSurface({ labels, locale, authStep, setAuthStep }) {
  if (authStep === "signupModal") {
    return (
      <section className="auth-app-preview">
        <HomeSurface labels={copy.en} variant="default" setView={() => {}} onSave={() => {}} />
        <div className="auth-signup-modal">
          <h2>Get started free</h2>
          <button className="sso-button" type="button">Sign up with Google</button>
          <div className="divider-text"><span />Or<span /></div>
          <label className="field">
            <span>Your Name</span>
            <input placeholder="Jane Smith" />
          </label>
          <label className="field">
            <span>Email</span>
            <input placeholder="Work email" />
          </label>
          <label className="field">
            <span>Customer Data Storage Location</span>
            <button className="location-select" type="button">
              United States of America
              <ChevronDown size={14} />
            </button>
          </label>
          <label className="check-row">
            <input type="checkbox" />
            Agree to the terms of use and privacy statements
          </label>
          <label className="check-row">
            <input type="checkbox" />
            {`Receive emails about news from ${PRODUCT_BRAND}`}
          </label>
          <button className="primary-button full">Continue</button>
          <p>Have an account? <a>Login</a></p>
        </div>
        <p className="recaptcha-note">
          This site is protected by reCAPTCHA and the Google <a>Privacy Policy</a> and <a>Terms of Service</a> apply.
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
    ["onboarding", "Onboarding", ClipboardList],
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
            <span>Platform</span>
            <span>Solutions</span>
            <span>Resources</span>
            <span>Pricing</span>
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
          <MaterSplash compact className="auth-splash" />
          <div className="auth-title">
            <Icon size={20} />
            <h2>{current[1]}</h2>
          </div>
          {authStep === "onboarding" ? (
            <OnboardingCard labels={labels} locale={locale} />
          ) : authStep === "verify" || authStep === "sent" ? (
            <VerificationCard labels={labels} sent={authStep === "sent"} />
          ) : (
            <AuthForm labels={labels} locale={locale} step={authStep} />
          )}
        </div>
      </aside>
    </section>
  );
}

export function OnboardingCard({ labels, locale }) {
  const sources = ["DMS", "Billing", "Audit", "Client Portal", "Matter Graph", "CRM"];
  return (
    <div className="onboarding-card">
      <div className="progress-line">
        <span style={{ width: "66%" }} />
      </div>
      <h3>{locale === "ko" ? `${PRODUCT_BRAND} 설정 시작` : `Set up ${PRODUCT_BRAND}`}</h3>
      <p>
        {locale === "ko"
          ? `운영 데이터를 연결해 ${PRODUCT_BRAND} 작업공간을 완성하세요.`
          : `Connect your operating data to finish setting up ${PRODUCT_BRAND}.`}
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

export function AuthForm({ labels, locale, step }) {
  return (
    <form className="form-stack">
      {step === "login" && (
        <button className="sso-button" type="button">
          <ShieldCheck size={15} />
          {locale === "ko" ? "SSO로 계속" : "Continue with SSO"}
        </button>
      )}
      <Field label="Email" value="seoyun@amic.law" />
      {["signup", "org"].includes(step) && <Field label={locale === "ko" ? "이름" : "Name"} value="Seoyun Kim" />}
      {["signup", "password", "login", "reset"].includes(step) && (
        <Field label={step === "reset" ? "New password" : "Password"} value={step === "reset" ? `${PRODUCT_BRAND}-ready-2026` : "••••••••"} />
      )}
      {step === "org" && <Field label={locale === "ko" ? "조직명" : "Organization"} value="AMIC Law" />}
      {step === "signup" && (
        <label className="check-row">
          <input type="checkbox" defaultChecked />
          {locale === "ko" ? "대한민국 리전 저장 및 개인정보 처리에 동의합니다." : "I agree to regional data storage and privacy terms."}
        </label>
      )}
      {step === "password" && (
        <div className="notice success">
          <CheckCircle2 size={15} />
          {locale === "ko" ? "12자 이상, 대문자, 숫자 조건 충족" : "12 characters, uppercase, and number requirements met"}
        </div>
      )}
      <button className="primary-button full" type="button">
        {labels.continue}
      </button>
      <div className="auth-links">
        <a>{locale === "ko" ? "비밀번호를 잊으셨나요?" : "Forgot password?"}</a>
        <a>{locale === "ko" ? "이미 계정이 있나요?" : "Already have an account?"}</a>
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
          ? "We sent a reset link to seoyun@amic.law."
          : `Click the verification link sent to seoyun@amic.law to finish setting up your ${PRODUCT_BRAND} workspace.`}
      </p>
      <button className="secondary-button">{sent ? "Back to login" : "Resend email"}</button>
      <button className="text-button">{labels.cancel}</button>
    </div>
  );
}
