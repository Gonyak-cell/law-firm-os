import assert from "node:assert/strict";

/**
 * Read the product's keyboard focus contract in the browser.  This function
 * is passed to Playwright's locator.evaluate(), so its helpers are local.
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
  // An outline with an offset is painted outside the element border.  Contrast
  // it with the nearest opaque outside surface, never the focused element's
  // own fill (which can hide a low-contrast ring in a computed-style check).
  let background = null;
  let ancestor = element.parentElement;
  while (ancestor) {
    const ancestorColor = parseColor(getComputedStyle(ancestor).backgroundColor);
    if (ancestorColor?.[3] === 1) {
      background = ancestorColor;
      break;
    }
    ancestor = ancestor.parentElement;
  }
  if (!background) background = [255, 255, 255, 1];

  const styleName = String(style.outlineStyle ?? "none").toLowerCase();
  const width = Number.parseFloat(style.outlineWidth);
  const color = parseColor(style.outlineColor);
  const visible = !["none", "hidden"].includes(styleName)
    && Number.isFinite(width)
    && width > 0
    && Boolean(color)
    && color[3] > 0;
  const ratio = visible ? contrast(color, background) : 0;
  const outline = {
    visible,
    width: Number.isFinite(width) ? width : 0,
    contrast: ratio,
    style: styleName,
    color,
    offset: style.outlineOffset,
    qualifying: visible && width >= 2 && ratio >= 3,
  };
  return {
    active: document.activeElement === element,
    focusVisible: element.matches(":focus-visible"),
    outline,
    ringWidth: outline.qualifying ? outline.width : 0,
    ringContrast: outline.qualifying ? outline.contrast : 0,
  };
}

export function assertVisibleFocusRing(snapshot, label) {
  assert.equal(snapshot.active, true, `${label} must receive focus`);
  assert.equal(snapshot.focusVisible, true, `${label} must match :focus-visible`);
  assert.ok(
    snapshot.outline?.qualifying,
    `${label} must expose a visible focus outline at least 2px wide with 3:1 contrast`,
  );
}

function outlineChanged(before, after) {
  return before?.visible !== after.visible
    || before?.style !== after.style
    || (before?.width ?? 0) !== after.width
    || before?.offset !== after.offset
    || JSON.stringify(before?.color ?? null) !== JSON.stringify(after.color);
}

export function assertFocusStateDelta(before, after, label) {
  assertVisibleFocusRing(after, label);
  assert.ok(
    outlineChanged(before.outline, after.outline),
    `${label} must change the qualifying focus outline when focused`,
  );
}

async function mountFocusFixture(page, { id, cssText, focusCssText = "" }) {
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
}

async function removeFocusFixture(page, id) {
  await page.evaluate((fixtureId) => {
    document.getElementById(fixtureId)?.remove();
    document.querySelector(`style[data-outm36-focus-fixture="${fixtureId}"]`)?.remove();
  }, id);
}

export async function assertPositiveFocusFixture(
  page,
  { id, label, cssText, focusCssText = "", expectedColor, minimumContrast = 3 },
) {
  await mountFocusFixture(page, { id, cssText, focusCssText });
  try {
    const fixture = page.locator(`#${id}`);
    const before = await fixture.evaluate(readFocusSnapshot);
    await fixture.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const after = await fixture.evaluate(readFocusSnapshot);
    assertFocusStateDelta(before, after, label);
    assert.ok(
      after.outline.contrast >= minimumContrast,
      `${label} focus outline must meet the expected contrast`,
    );
    if (expectedColor) assert.deepEqual(after.outline.color, expectedColor);
  } finally {
    await removeFocusFixture(page, id);
  }
}

/** Exercise a deliberately invalid focus fixture and require proof rejection. */
export async function assertNegativeFocusFixture(
  page,
  { id, label, cssText, focusCssText = "" },
) {
  await mountFocusFixture(page, { id, cssText, focusCssText });
  try {
    const fixture = page.locator(`#${id}`);
    const before = await fixture.evaluate(readFocusSnapshot);
    await fixture.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const after = await fixture.evaluate(readFocusSnapshot);
    assert.throws(
      () => assertFocusStateDelta(before, after, label),
      /focus indicator|focus ring|focus outline|:focus-visible/u,
      `${label} must fail without a qualifying focus-outline change`,
    );
  } finally {
    await removeFocusFixture(page, id);
  }
}
