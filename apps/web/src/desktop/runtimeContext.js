export const DEFAULT_DESKTOP_RUNTIME_CONTEXT = Object.freeze({
  desktopMode: false,
  routeSource: "web",
  mutate: false,
  fileBridge: false,
  authMutation: false,
  auditMutation: false,
  billing: false
});

export function readDesktopRuntimeContext(source = globalThis) {
  return {
    ...DEFAULT_DESKTOP_RUNTIME_CONTEXT,
    ...(source.materRuntime?.context ?? {})
  };
}
