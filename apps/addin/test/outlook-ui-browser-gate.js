import { OUTLOOK_UI_CONTRACT } from "../src/outlook-ui-contract.js";
import { enforceBrowserAccessibility } from "./outlook-ui-browser-a11y.js";
import { collectRenderedUi } from "./outlook-ui-browser-render.js";

/**
 * Browser-only OUTM-06 gate. Rendered facts come from computed DOM geometry;
 * names and live-region snapshots come from Playwright's accessibility tree.
 */
export async function validateOutlookUiPage(page, { profile } = {}) {
  if (!page || typeof page.locator !== "function" || typeof page.getByRole !== "function") {
    throw new TypeError("validateOutlookUiPage requires a Playwright page");
  }
  const violations = [];
  const add = (code, details = {}) => violations.push({ code, ...details });
  const shell = page.locator(OUTLOOK_UI_CONTRACT.shellSelector);
  const shellCount = await shell.count();
  if (shellCount !== 1) {
    add("shell_missing_or_duplicate", { count: shellCount });
    return { valid: false, passed: false, profile: null, violations };
  }

  const actualProfile = await shell.getAttribute("data-outlook-profile");
  if (!OUTLOOK_UI_CONTRACT.profiles.includes(actualProfile)) add("unknown_profile", { profile: actualProfile });
  if (profile && profile !== actualProfile) add("profile_mismatch", { expected: profile, actual: actualProfile });
  const rendered = await collectRenderedUi(shell, OUTLOOK_UI_CONTRACT.legacySurfaceSelectors);

  if (rendered.shellScrollWidth !== rendered.shellClientWidth) {
    add("shell_horizontal_overflow", {
      scrollWidth: rendered.shellScrollWidth,
      clientWidth: rendered.shellClientWidth,
    });
  }
  if (rendered.documentScrollWidth !== rendered.documentClientWidth) {
    add("document_horizontal_overflow", {
      scrollWidth: rendered.documentScrollWidth,
      clientWidth: rendered.documentClientWidth,
    });
  }
  if (rendered.lineFailures.length > 0) add("visible_text_not_one_line", { items: rendered.lineFailures });
  if (rendered.motionFailures.length > 0) add("reduced_motion_not_applied", { elements: rendered.motionFailures });
  if (rendered.rails.length > 0) add("visible_rail_label", { items: rendered.rails });
  if (rendered.tooltips.length > 0) add("visible_tooltip", { items: rendered.tooltips });
  if (rendered.legacySurfaces.length > 0) add("legacy_surface", { selectors: rendered.legacySurfaces });
  if (rendered.helperSurfaces.length > 0) add("visible_helper_surface", { items: rendered.helperSurfaces });
  if (rendered.decorativeSurfaces.length > 0) add("decorative_status_surface", { items: rendered.decorativeSurfaces });
  if (rendered.statusGridSurfaces.length > 0) add("status_grid_surface", { items: rendered.statusGridSurfaces });
  if (rendered.titleCount > 0) add("title_attribute", { count: rendered.titleCount });

  for (const text of OUTLOOK_UI_CONTRACT.legacyVisibleStrings) {
    const matches = page.getByText(text, { exact: true });
    for (let index = 0; index < await matches.count(); index += 1) {
      if (await matches.nth(index).isVisible()) add("legacy_visible_string", { text });
    }
  }

  const accessibility = await enforceBrowserAccessibility({
    shell,
    rendered,
    add,
    minimumIconPx: OUTLOOK_UI_CONTRACT.requirements.iconTargetMinimumPx,
  });
  return {
    valid: violations.length === 0,
    passed: violations.length === 0,
    profile: actualProfile,
    viewportWidth: page.viewportSize()?.width ?? null,
    violations,
    metrics: {
      ariaSnapshots: accessibility.ariaSnapshots,
      interactiveRoles: accessibility.interactiveRoles,
      criticalValues: rendered.criticalValues.length,
      iconTargets: accessibility.iconTargets.length,
      oneLineTextFailures: rendered.lineFailures.length,
    },
  };
}
