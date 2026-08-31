import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { OUTLOOK_OPERATION_STATES } from "./outlook-operation-state.js";

const OPERATION_FAILURE_STATES = new Set([
  OUTLOOK_OPERATION_STATES.failed,
  OUTLOOK_OPERATION_STATES.permissionChanged,
  OUTLOOK_OPERATION_STATES.staleItem,
  OUTLOOK_OPERATION_STATES.offline,
  OUTLOOK_OPERATION_STATES.reconnectRequired,
  OUTLOOK_OPERATION_STATES.providerBlocked,
]);

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function outlookRailButtonId(featureId) {
  const safeFeatureId = String(featureId ?? "")
    .trim()
    .replace(/[^a-z0-9_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "");
  return `outlook-rail-${safeFeatureId || "action"}`;
}

function hasFeature(disabledFeatures, featureId) {
  return typeof disabledFeatures === "function"
    ? Boolean(disabledFeatures(featureId))
    : disabledFeatures instanceof Set
      ? disabledFeatures.has(featureId)
      : Array.isArray(disabledFeatures) && disabledFeatures.includes(featureId);
}

function OutlookIconRail({
  profile,
  railItems,
  activeFeature = "",
  disabledFeatures,
  onActivate,
  ariaLabel = "Outlook 기능",
}) {
  const items = Array.isArray(railItems) ? railItems : [];
  return (
    <nav className="outlook-icon-rail" aria-label={ariaLabel} data-outlook-rail={profile} data-testid="outlook-icon-rail">
      {items.map((item, index) => {
        const featureId = item.featureId ?? item.id ?? `rail-action-${index}`;
        const label = item.label ?? item.ariaLabel ?? featureId;
        const Icon = item.Icon ?? item.icon;
        const view = item.view;
        const disabled = hasFeature(disabledFeatures, featureId);
        if (!Icon) return null;
        return (
          <button
            key={featureId}
            type="button"
            className="outlook-icon-button"
            id={outlookRailButtonId(featureId)}
            data-feature-id={featureId}
            data-testid={`outlook-rail-${featureId}`}
            data-feature-view={view ?? "feature"}
            aria-label={label}
            aria-pressed={activeFeature === featureId}
            disabled={disabled}
            onClick={() => onActivate?.({ featureId, view: view ?? "feature" })}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span className="outlook-visually-hidden">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function OutlookTextNavigation({
  profile,
  railItems,
  activeFeature = "",
  disabledFeatures,
  onActivate,
}) {
  const items = Array.isArray(railItems) ? railItems : [];
  return (
    <nav
      className="outlook-icon-rail outlook-text-navigation"
      aria-label="다른 작업"
      data-outlook-rail={profile}
      data-testid="outlook-icon-rail"
    >
      {items.map((item, index) => {
        const featureId = item.featureId ?? item.id ?? `filing-action-${index}`;
        const label = item.label ?? item.ariaLabel ?? featureId;
        const disabled = hasFeature(disabledFeatures, featureId);
        return (
          <button
            key={featureId}
            type="button"
            className="outlook-icon-button outlook-text-action"
            id={outlookRailButtonId(featureId)}
            data-feature-id={featureId}
            data-testid={`outlook-rail-${featureId}`}
            data-feature-view={item.view ?? "feature"}
            aria-pressed={activeFeature === featureId}
            disabled={disabled}
            onClick={() => onActivate?.({ featureId, view: item.view ?? "feature" })}
          >
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function OutlookFlatActionRow({
  label,
  actionId,
  onClick,
  disabled = false,
  busy = false,
  children,
}) {
  return (
    <div className="outlook-flat-action-row" data-action-row={actionId}>
      <span className="outlook-flat-action-label">{label}</span>
      <button type="button" className="outlook-flat-action-button" onClick={onClick} disabled={disabled || busy}>
        {children ?? label}
      </button>
    </div>
  );
}

export function OutlookOneLineField({
  id,
  label,
  as = "input",
  className = "",
  ...props
}) {
  const fieldId = id || `outlook-field-${label?.replace(/\s+/gu, "-") || "value"}`;
  const Field = as === "select" ? "select" : "input";
  return (
    <>
      <label className="outlook-visually-hidden" htmlFor={fieldId}>{label}</label>
      <Field id={fieldId} className={`outlook-one-line-field ${className}`.trim()} {...props} />
    </>
  );
}

export function OutlookCriticalValueRow({ label, value, onCopy, copyLabel = "복사" }) {
  const criticalId = useId();
  const safeValue = value == null ? "" : String(value);
  return (
    <div className="outlook-critical-value-row" data-critical-value-row="true">
      <code id={criticalId} className="outlook-critical-value" data-ui-critical-value="true" tabIndex={0} aria-label={label}>
        {safeValue}
      </code>
      {typeof onCopy === "function" ? (
        <button
          type="button"
          className="outlook-icon-button outlook-critical-copy"
          aria-label={`${label} ${copyLabel}`}
          aria-controls={criticalId}
          onClick={() => onCopy(safeValue)}
        >
          <span aria-hidden="true">⧉</span>
        </button>
      ) : null}
    </div>
  );
}

export function OutlookInlineOperationState({ status = "", visibleMessage = "", fullMessage = "" }) {
  const recoveryId = useId();
  if (!visibleMessage && !fullMessage) return null;
  const isFailureLike = OPERATION_FAILURE_STATES.has(status);
  const visible = visibleMessage || fullMessage;
  const recovery = fullMessage || visible;
  return (
    <div className={`outlook-inline-operation-state outlook-inline-operation-state-${status || "notice"}`.trim()} data-operation-state={status}>
      <p
        className="outlook-one-line"
        role={isFailureLike ? "alert" : "status"}
        aria-controls={isFailureLike ? recoveryId : undefined}
      >
        {visible}
      </p>
      <span id={recoveryId} className="outlook-visually-hidden" aria-live="polite">{recovery}</span>
    </div>
  );
}

function focusables(node) {
  return node ? [...node.querySelectorAll(FOCUSABLE_SELECTOR)] : [];
}

function isEnabledElement(element) {
  return element instanceof HTMLElement
    && element.isConnected
    && !element.disabled
    && element.getAttribute("aria-disabled") !== "true";
}

function restoreFocusAfterOverlayClose(documentRef, appRoot, opener) {
  if (isEnabledElement(opener)) {
    opener.focus();
    return;
  }
  const railButton = (appRoot || documentRef).querySelector(
    ".outlook-icon-rail button:not([disabled]):not([aria-disabled='true'])",
  );
  if (isEnabledElement(railButton)) {
    railButton.focus();
    return;
  }
  const shell = appRoot?.querySelector(".outlook-compact-shell")
    || documentRef.querySelector(".outlook-compact-shell");
  if (shell instanceof HTMLElement) {
    shell.tabIndex = -1;
    shell.focus();
  }
}

function scheduleOverlayFocusRestore(documentRef, appRoot, opener, canRestore) {
  let cancelled = false;
  const restore = () => {
    if (cancelled || (typeof canRestore === "function" && !canRestore())) return;
    restoreFocusAfterOverlayClose(documentRef, appRoot, opener);
  };
  const view = documentRef?.defaultView;
  if (typeof view?.requestAnimationFrame === "function") {
    const frameId = view.requestAnimationFrame(restore);
    return () => {
      cancelled = true;
      view.cancelAnimationFrame?.(frameId);
    };
  }
  const timerId = typeof view?.setTimeout === "function"
    ? view.setTimeout(restore, 0)
    : setTimeout(restore, 0);
  return () => {
    cancelled = true;
    if (typeof view?.clearTimeout === "function") view.clearTimeout(timerId);
    else clearTimeout(timerId);
  };
}

export function OutlookOverlay({
  state,
  onClose,
  children,
  heading = "기능",
  closeLabel = "닫기",
}) {
  const dialogRef = useRef(null);
  const headingId = useId();
  const openerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const isOpen = Boolean(state?.open);
  const closeReasonRef = useRef("");
  const mountedRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const pendingRestoreRef = useRef(null);
  onCloseRef.current = onClose;
  isOpenRef.current = isOpen;

  const requestClose = (reason) => {
    closeReasonRef.current = reason;
    onCloseRef.current?.(reason);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingRestoreRef.current?.();
      pendingRestoreRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;
    pendingRestoreRef.current?.();
    pendingRestoreRef.current = null;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const opener = state?.openerId ? document.getElementById(state.openerId) : document.activeElement;
    openerRef.current = opener instanceof HTMLElement ? opener : null;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }
    const first = focusables(dialog)[0] || dialog;
    if (first instanceof HTMLElement) first.focus();

    const close = (reason) => requestClose(reason);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close("escape");
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusables(dialog);
      if (!controls.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const firstControl = controls[0];
      const lastControl = controls.at(-1);
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    };
    const onFocusIn = (event) => {
      if (dialog.contains(event.target)) return;
      const firstControl = focusables(dialog)[0] || dialog;
      if (firstControl instanceof HTMLElement) firstControl.focus();
    };
    dialog.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      document.body.style.overflow = previousOverflow;
      if (appRoot) {
        appRoot.inert = Boolean(previousInert);
        if (previousAriaHidden == null) appRoot.removeAttribute("aria-hidden");
        else appRoot.setAttribute("aria-hidden", previousAriaHidden);
      }
      const restore = state?.restoreFocusTo
        ? document.getElementById(state.restoreFocusTo)
        : openerRef.current;
      const reason = closeReasonRef.current;
      closeReasonRef.current = "";
      if (mountedRef.current && !isOpenRef.current) {
        restoreFocusAfterOverlayClose(document, appRoot, restore);
      }
      if (reason !== "escape") {
        pendingRestoreRef.current = scheduleOverlayFocusRestore(
          document,
          appRoot,
          restore,
          () => mountedRef.current && !isOpenRef.current,
        );
      }
    };
  }, [isOpen, state?.openerId, state?.restoreFocusTo]);

  if (!isOpen || typeof document === "undefined" || !document.body) return null;
  return createPortal(
    <div className="outlook-overlay-layer" data-outlook-overlay="open" data-testid="outlook-overlay">
      <div
        className="outlook-overlay-scrim"
        data-testid="outlook-overlay-scrim"
        role="presentation"
        aria-hidden="true"
        onPointerDown={(event) => {
          event.preventDefault();
          requestClose("outside");
        }}
      />
      <aside
        ref={dialogRef}
        className="outlook-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        data-overlay-feature={state?.featureId || "catalog"}
        data-overlay-context={state?.itemContextKey || undefined}
      >
        <h2 id={headingId} className="outlook-visually-hidden">{heading}</h2>
        <button type="button" className="outlook-icon-button outlook-overlay-close" data-testid="outlook-overlay-close" aria-label={closeLabel} onClick={(event) => {
          event.preventDefault();
          requestClose("close");
        }}>
          <X size={18} aria-hidden="true" />
        </button>
        <div className="outlook-overlay-content">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

export function OutlookCompactShell({
  profile = "",
  railItems,
  activeFeature = "",
  disabledFeatures,
  onFeatureSelect,
  children,
  overlay,
  status,
  layout = "compact",
  footer,
}) {
  if (!profile || !Array.isArray(railItems)) return null;
  const filingLayout = layout === "filing";
  if (filingLayout) {
    return (
      <main
        className="outlook-compact-shell outlook-filing-shell"
        data-ui-shell="outm-06"
        data-outlook-profile={profile}
        data-outlook-layout="filing"
        tabIndex={-1}
      >
        <header className="outlook-filing-header"><img src="./amic-law-logo.svg" alt="AMIC Law" width="92" height="15" /></header>
        <div className="outlook-filing-tab" aria-current="page">메일 저장</div>
        <section className="outlook-compact-content">
          {children}
          {status}
          <OutlookTextNavigation
            profile={profile}
            railItems={railItems}
            activeFeature={activeFeature}
            disabledFeatures={disabledFeatures}
            onActivate={onFeatureSelect}
          />
        </section>
        {footer ? <footer className="outlook-filing-footer">{footer}</footer> : null}
        {overlay}
      </main>
    );
  }
  return (
    <main className="outlook-compact-shell" data-ui-shell="outm-06" data-outlook-profile={profile} tabIndex={-1}>
      <OutlookIconRail
        profile={profile}
        railItems={railItems}
        activeFeature={activeFeature}
        disabledFeatures={disabledFeatures}
        onActivate={onFeatureSelect}
      />
      <section className="outlook-compact-content">
        {children}
        {status}
      </section>
      {overlay}
    </main>
  );
}
