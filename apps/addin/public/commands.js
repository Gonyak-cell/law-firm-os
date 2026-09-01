(() => {
  const onReady = globalThis.Office?.onReady;
  if (typeof onReady !== "function") return;
  try {
    void onReady(() => {});
  } catch {
    // ShowTaskpane commands do not execute work in the hidden function runtime.
  }
})();
