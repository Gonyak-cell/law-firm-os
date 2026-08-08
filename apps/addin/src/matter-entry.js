import { bootstrapOutlookSurface } from "./outlook-profile-bootstrap.js";

// Keep the 8f3 surface fixed before main.jsx (and its runtime configuration)
// starts. The full pane remains the existing application; this thin wrapper
// only establishes its identity-bound profile.
export function mountMatterSurface({
  loadMain = () => import("./main.jsx"),
  location = globalThis.location,
  globalObject = globalThis,
} = {}) {
  bootstrapOutlookSurface("matter-full", { location, globalObject });
  return loadMain();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void mountMatterSurface();
}
