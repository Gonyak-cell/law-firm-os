import { SEMANTIC_CONTROL_SELECTOR } from "./outlook-ui-browser-render.js";
import { isExactCopyAction } from "./outlook-ui-browser-copy.js";
const INTERACTIVE_ROLES = Object.freeze([
  "button",
  "link",
  "searchbox",
  "textbox",
  "combobox",
  "checkbox",
  "radio",
  "switch",
  "slider",
  "spinbutton",
  "listbox",
  "option",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tab",
  "treeitem",
]);
async function matchesNamedRole(root, locator, role) {
  const handle = await locator.elementHandle();
  if (!handle) return false;
  try {
    return await root.getByRole(role, { name: /.+/u }).evaluateAll(
      (elements, current) => elements.includes(current),
      handle,
    );
  } finally {
    await handle.dispose();
  }
}
async function matchesRole(root, locator, role) {
  const handle = await locator.elementHandle();
  if (!handle) return false;
  try {
    return await root.getByRole(role).evaluateAll((elements, current) => elements.includes(current), handle);
  } finally {
    await handle.dispose();
  }
}
async function collectAccessibilityTree(root) {
  const ariaSnapshots = [];
  for (const role of INTERACTIVE_ROLES) {
    const all = root.getByRole(role);
    const allCount = await all.count();
    for (let index = 0; index < allCount; index += 1) {
      ariaSnapshots.push({ role, snapshot: await all.nth(index).ariaSnapshot() });
    }
  }
  return ariaSnapshots;
}
async function enforceDomControls(shell, controls, rendered, add, minimumPx) {
  const iconTargets = [];
  const iconRoles = ["button", "link", "checkbox", "radio", "switch", "menuitem", "tab", "menuitemcheckbox", "menuitemradio", "treeitem"];
  for (const candidate of rendered.semanticControls) {
    if (!candidate.visible) continue;
    const locator = controls.nth(candidate.index);
    if (candidate.ariaHidden) add("visible_aria_hidden_control", { index: candidate.index, role: candidate.role });
    if (!(await matchesRole(shell, locator, candidate.role))) {
      add("control_not_accessible_tree", { index: candidate.index, role: candidate.role });
    }
    const hasName = await matchesNamedRole(shell, locator, candidate.role);
    if (!hasName) add("missing_accessible_name", { index: candidate.index, role: candidate.role });
    if (iconRoles.includes(candidate.role) && !candidate.visibleText) {
      const snapshot = await locator.ariaSnapshot();
      const target = { ...candidate, hasAccessibleName: hasName, snapshot };
      iconTargets.push(target);
      if (candidate.width < minimumPx || candidate.height < minimumPx) add("icon_target_too_small", target);
    }
  }
  return iconTargets;
}
async function enforceCriticalCopyControls(shell, rendered, controls, add) {
  for (const critical of rendered.criticalValues) {
    if (!["auto", "scroll"].includes(critical.overflowX)
      || critical.whiteSpace !== "nowrap"
      || critical.textOverflow === "ellipsis"
      || critical.userSelect === "none") {
      add("critical_value_contract", critical);
    }

    if (!critical.id || critical.associatedControlIndexes.length === 0) {
      add("critical_copy_control_missing", { id: critical.id || null });
      continue;
    }

    let visibleAssociated = 0;
    for (const index of critical.associatedControlIndexes) {
      const candidate = rendered.semanticControls[index];
      const locator = controls.nth(index);
      if (!candidate?.visible || !(await locator.isVisible())) continue;
      visibleAssociated += 1;
      const hasName = await matchesNamedRole(shell, locator, candidate.role);
      const snapshot = await locator.ariaSnapshot();
      if (!hasName) add("critical_copy_control_inaccessible", { id: critical.id, index });
      if (!isExactCopyAction(snapshot)) add("critical_copy_control_wrong_action", { id: critical.id, index });
    }
    if (visibleAssociated === 0) add("critical_copy_control_not_visible", { id: critical.id });
    if (visibleAssociated > 1) add("critical_copy_control_ambiguous", { id: critical.id, count: visibleAssociated });
  }
}
async function enforceFocusRings(shell, add) {
  const focusables = shell.locator('button, a[href], input, select, textarea, [role="button"], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])');
  const focusFailures = [];
  for (let index = 0; index < await focusables.count(); index += 1) {
    const target = focusables.nth(index);
    if (!(await target.isVisible()) || await target.isDisabled()) continue;
    const before = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
      };
    });
    await target.focus();
    const focus = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        active: document.activeElement === element,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
      };
    });
    const changed = Object.keys(before).some((key) => before[key] !== focus[key]);
    const borderRing = ["borderColor", "borderWidth", "borderStyle"].some((key) => before[key] !== focus[key]);
    const ring = (focus.outlineStyle !== "none" && focus.outlineWidth !== "0px") || focus.boxShadow !== "none" || borderRing;
    if (!focus.active || !changed || !ring) focusFailures.push({ before, after: focus });
  }
  if (focusFailures.length > 0) add("keyboard_focus_ring", { items: focusFailures });
}
async function enforceLiveErrorContract(shell, rendered, add) {
  const liveSnapshots = [];
  const live = shell.locator("[aria-live]");
  for (let index = 0; index < await live.count(); index += 1) {
    const region = live.nth(index);
    const snapshot = await region.ariaSnapshot();
    const metadata = rendered.liveRegions[index];
    liveSnapshots.push({ snapshot, metadata });
    if (metadata?.hidden || metadata?.ariaHidden || metadata?.display === "none"
      || metadata?.visibility === "hidden" || !snapshot?.trim()) {
      add("live_region_not_accessible", { index, snapshot });
    }
  }
  const alerts = shell.locator('[role="alert"]');
  for (const alertMeta of rendered.alerts) {
    if (!alertMeta.visible) continue;
    const alert = alerts.nth(alertMeta.index);
    if (alertMeta.ariaHidden) add("visible_aria_hidden_alert", { index: alertMeta.index });
    if (!(await matchesRole(shell, alert, "alert"))) add("alert_not_accessible_tree", { index: alertMeta.index });
    const summary = (await alert.innerText()).trim();
    if (summary.length === 0 || summary.length > 96) add("error_summary_not_concise", { length: summary.length });
    const controls = (await alert.getAttribute("aria-controls") || "").split(/\s+/u).filter(Boolean);
    if (controls.length !== 1) {
      add(controls.length === 0 ? "missing_error_aria_controls" : "wrong_error_aria_controls", { controls });
      add("missing_full_error_live_region", { summaryLength: summary.length });
      continue;
    }
    const controlId = controls[0];
    const controlled = await alert.evaluate((element, id) => {
      const target = document.getElementById(id);
      if (!target) return null;
      const shell = element.closest('[data-ui-shell="outm-06"]');
      return {
        id: target.id,
        live: target.hasAttribute("aria-live"),
        inShell: Boolean(shell && shell.contains(target)),
      };
    }, controlId);
    const matching = liveSnapshots.find(({ metadata }) => metadata?.id === controlId);
    if (!controlled || !controlled.live || !controlled.inShell || !matching) add("wrong_error_aria_controls", { controlId });
    if (matching && !matching.metadata?.visuallyHidden) add("full_error_not_visually_hidden", { controlId });
    if (!matching?.snapshot?.trim() || (matching.metadata?.textLength || 0) <= summary.length) {
      add("missing_full_error_live_region", { summaryLength: summary.length, controlId });
    }
  }
  return liveSnapshots;
}
export async function enforceBrowserAccessibility({ shell, rendered, add, minimumIconPx }) {
  const ariaSnapshots = await collectAccessibilityTree(shell);
  const controls = shell.locator(SEMANTIC_CONTROL_SELECTOR);
  const iconTargets = await enforceDomControls(shell, controls, rendered, add, minimumIconPx);
  for (const field of rendered.placeholderFields) {
    if (!["input", "textarea"].includes(field.tag) || !field.explicitName) {
      add("placeholder_is_only_name", { tag: field.tag, placeholder: field.placeholder });
    }
    if (field.visibleLabels || field.visibleLabelledBy) {
      add("placeholder_visible_label", { tag: field.tag, placeholder: field.placeholder });
    }
  }
  await enforceCriticalCopyControls(shell, rendered, controls, add);
  await enforceFocusRings(shell, add);
  const liveSnapshots = await enforceLiveErrorContract(shell, rendered, add);
  return {
    ariaSnapshots,
    interactiveRoles: INTERACTIVE_ROLES,
    iconTargets,
    liveSnapshots,
  };
}
