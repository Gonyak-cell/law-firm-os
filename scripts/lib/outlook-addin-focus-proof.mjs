import assert from "node:assert/strict";

/**
 * Read focus state in the browser.  This function is passed to Playwright's
 * locator.evaluate(), so every helper it uses must remain self-contained.
 */
export function readFocusSnapshot(element) {
  const style = getComputedStyle(element);
  const parseColor = (value) => {
    const parts = String(value ?? "").match(/^rgba?\(([^)]+)\)$/iu)?.[1]
      ?.trim().split(/[,\s/]+/u).filter(Boolean) ?? [];
    const channels = parts.slice(0, 3).map((part) => {
      const number = Number.parseFloat(part);
      return part.endsWith("%") ? number * 2.55 : number;
    });
    const alphaPart = parts[3] ?? "1";
    const alphaNumber = Number.parseFloat(alphaPart);
    const alpha = alphaPart.endsWith("%") ? alphaNumber / 100 : alphaNumber;
    return channels.length === 3
      && channels.every(Number.isFinite)
      && Number.isFinite(alpha)
      ? channels.map((channel) => Math.max(0, Math.min(255, channel)))
        .concat(Math.max(0, Math.min(1, alpha)))
      : null;
  };
  const luminance = ([r, g, b]) => [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => (
    sum + value * [0.2126, 0.7152, 0.0722][index]
  ), 0);
  const contrast = (foreground, background) => {
    if (!foreground || !background || foreground[3] === 0) return 0;
    const blended = foreground.slice(0, 3).map((channel, index) => (
      channel * foreground[3] + background[index] * (1 - foreground[3])
    ));
    const values = [luminance(blended), luminance(background)];
    return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
  };
  let background = parseColor(style.backgroundColor);
  let ancestor = element;
  while ((!background || background[3] < 1) && ancestor.parentElement) {
    ancestor = ancestor.parentElement;
    const ancestorColor = parseColor(getComputedStyle(ancestor).backgroundColor);
    if (ancestorColor?.[3] === 1) background = ancestorColor;
  }
  if (!background || background[3] < 1) background = [255, 255, 255, 1];

  const normalizeCandidate = ({ candidateStyle, width, color, geometry }) => {
    const normalizedStyle = String(candidateStyle ?? "none").toLowerCase();
    const normalizedWidth = Number.isFinite(width) ? width : 0;
    const visible = !["none", "hidden"].includes(normalizedStyle)
      && normalizedWidth > 0
      && Boolean(color)
      && color[3] > 0;
    const ratio = visible ? contrast(color, background) : 0;
    return {
      visible,
      width: normalizedWidth,
      contrast: ratio,
      style: normalizedStyle,
      color,
      geometry,
      qualifying: visible && normalizedWidth >= 2 && ratio >= 3,
    };
  };

  const outline = normalizeCandidate({
    candidateStyle: style.outlineStyle,
    width: Number.parseFloat(style.outlineWidth),
    color: parseColor(style.outlineColor),
    geometry: { offset: style.outlineOffset },
  });
  const border = normalizeCandidate({
    candidateStyle: style.borderStyle,
    width: Number.parseFloat(style.borderWidth),
    color: parseColor(style.borderColor),
    geometry: { radius: style.borderRadius },
  });
  const shadowValue = style.boxShadow;
  const shadowLengths = (shadowValue.match(/-?\d+(?:\.\d+)?px/giu) ?? [])
    .map((value) => Math.abs(Number.parseFloat(value)));
  const shadow = normalizeCandidate({
    candidateStyle: shadowValue === "none" ? "none" : "solid",
    width: shadowValue === "none" ? 0 : Math.max(...shadowLengths, 0),
    color: parseColor(shadowValue.match(/rgba?\([^)]*\)/iu)?.[0]),
    geometry: { value: shadowValue, lengths: shadowLengths },
  });
  const candidates = { outline, border, shadow };
  const ringKind = ["outline", "border", "shadow"]
    .find((kind) => candidates[kind].qualifying) ?? null;
  const ring = ringKind ? candidates[ringKind] : null;
  return {
    active: document.activeElement === element,
    focusVisible: element.matches(":focus-visible"),
    candidates,
    ringKind,
    ringWidth: ring?.width ?? 0,
    ringContrast: ring?.contrast ?? 0,
  };
}

export function assertVisibleFocusRing(snapshot, label) {
  assert.equal(snapshot.active, true, `${label} must receive focus`);
  assert.equal(snapshot.focusVisible, true, `${label} must match :focus-visible`);
  assert.ok(
    snapshot.ringWidth >= 2,
    `${label} must expose a visible focus ring at least 2px wide`,
  );
  assert.ok(
    snapshot.ringContrast >= 3,
    `${label} focus ring must have at least 3:1 contrast`,
  );
}

function candidateChanged(beforeCandidate, afterCandidate) {
  if (!beforeCandidate?.qualifying) return true;
  if (beforeCandidate.width !== afterCandidate.width) return true;
  if (beforeCandidate.style !== afterCandidate.style) return true;
  if (JSON.stringify(beforeCandidate.geometry) !== JSON.stringify(afterCandidate.geometry)) return true;
  if (beforeCandidate.contrast !== afterCandidate.contrast) return true;
  const visibleStyle = (candidate) => candidate.visible
    && candidate.width >= 2
    && !["none", "hidden"].includes(candidate.style);
  if (visibleStyle(beforeCandidate) && visibleStyle(afterCandidate)) {
    return JSON.stringify(beforeCandidate.color) !== JSON.stringify(afterCandidate.color);
  }
  return false;
}

export function assertFocusStateDelta(before, after, label) {
  assertVisibleFocusRing(after, label);
  const attributed = ["outline", "border", "shadow"].some((kind) => {
    const afterCandidate = after.candidates?.[kind];
    return afterCandidate?.qualifying
      && candidateChanged(before.candidates?.[kind], afterCandidate);
  });
  assert.ok(
    attributed,
    `${label} must change the qualifying computed focus indicator when focused`,
  );
}

/** Exercise a deliberately invalid focus fixture and require proof rejection. */
export async function assertNegativeFocusFixture(
  page,
  { id, label, cssText, focusCssText = "" },
) {
  await page.evaluate(({ fixtureId, fixtureCss, fixtureFocusCss }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "focus fixture";
    button.id = fixtureId;
    button.style.cssText = fixtureCss;
    document.body.append(button);
    if (fixtureFocusCss) {
      const style = document.createElement("style");
      style.dataset.outm36FocusFixture = fixtureId;
      style.textContent = fixtureFocusCss;
      document.head.append(style);
    }
  }, { fixtureId: id, fixtureCss: cssText, fixtureFocusCss: focusCssText });
  try {
    const fixture = page.locator(`#${id}`);
    const before = await fixture.evaluate(readFocusSnapshot);
    await fixture.focus();
    await fixture.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const after = await fixture.evaluate(readFocusSnapshot);
    assert.throws(
      () => assertFocusStateDelta(before, after, label),
      /focus indicator|focus ring|:focus-visible/u,
      `${label} must fail without a qualifying focus-state change`,
    );
  } finally {
    await page.evaluate((fixtureId) => {
      document.getElementById(fixtureId)?.remove();
      document.querySelector(`style[data-outm36-focus-fixture="${fixtureId}"]`)?.remove();
    }, id);
  }
}
