import { createOutlookEventRuntime } from "./outlook-event-runtime.js";

// Event-based activation does not run Office.onReady. Associate the exact
// manifest function synchronously as soon as Office.js loads this bundle.
const runtime = createOutlookEventRuntime();
runtime.register();
globalThis.onMessageSendHandler = runtime.onMessageSendHandler;
