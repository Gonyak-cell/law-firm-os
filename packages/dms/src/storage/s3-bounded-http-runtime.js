import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { NodeHttpHandler } from "@smithy/node-http-handler";

function agent(value, AgentType) {
  if (value instanceof AgentType || typeof value?.destroy === "function") return value;
  return new AgentType({ keepAlive: true, maxSockets: 50, ...value });
}

function stateFrom(options = {}) {
  const config = {
    ...options,
    httpAgent: agent(options.httpAgent, HttpAgent),
    httpsAgent: agent(options.httpsAgent, HttpsAgent),
  };
  return { config, delegate: new NodeHttpHandler(config) };
}

function timeout(value) {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : 0;
}

function timeoutError(message) {
  return Object.assign(new Error(message), { code: "ETIMEDOUT", name: "TimeoutError" });
}

function destroyState(state) {
  state.delegate.destroy();
  state.config.httpAgent?.destroy?.();
  if (state.config.httpsAgent !== state.config.httpAgent) state.config.httpsAgent?.destroy?.();
}

export class BoundedS3HttpRuntime {
  constructor(options = {}) {
    this.optionsProvider = typeof options === "function"
      ? Promise.resolve().then(options)
      : Promise.resolve(options);
    this.socketWarningTimestamp = 0;
  }

  async resolve() {
    if (!this.statePromise) this.statePromise = this.optionsProvider.then(stateFrom);
    const state = await this.statePromise;
    this.state = state;
    if (this.destroyed) destroyState(state);
    return state;
  }

  destroy() {
    this.destroyed = true;
    if (this.state) destroyState(this.state);
  }

  updateHttpClientConfig(key, value) {
    const apply = (state) => {
      const next = key === "httpAgent"
        ? agent(value, HttpAgent)
        : key === "httpsAgent" ? agent(value, HttpsAgent) : value;
      state.config[key] = next;
      state.delegate.updateHttpClientConfig(key, next);
      return state;
    };
    if (this.state) {
      apply(this.state);
      return;
    }
    if (this.statePromise) {
      this.statePromise = this.statePromise.then(apply);
      return;
    }
    this.optionsProvider = this.optionsProvider.then((options) => ({ ...options, [key]: value }));
  }

  httpHandlerConfigs() {
    return this.state?.config ?? {};
  }

  arm(outgoing, { agent: requestAgent, config, isTls, requestTimeout } = {}) {
    const timers = new Set();
    let cleared = false;
    const schedule = (callback, delay) => {
      if (delay === 0) return;
      const timer = setTimeout(callback, delay);
      timers.add(timer);
    };
    const clear = () => {
      if (cleared) return;
      cleared = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
    const connectionTimeout = timeout(config.connectionTimeout);
    if (connectionTimeout) {
      outgoing.once("socket", (socket) => {
        if (!socket.connecting || cleared) return;
        const connected = isTls ? "secureConnect" : "connect";
        const timer = setTimeout(() => outgoing.destroy(timeoutError(
          `S3 connection timed out after ${connectionTimeout} ms`,
        )), connectionTimeout);
        timers.add(timer);
        socket.once(connected, () => {
          clearTimeout(timer);
          timers.delete(timer);
        });
      });
    }
    const effectiveRequestTimeout = timeout(requestTimeout ?? config.requestTimeout);
    schedule(() => {
      const message = `S3 request exceeded ${effectiveRequestTimeout} ms`;
      if (config.throwOnRequestTimeout) outgoing.destroy(timeoutError(message));
      else config.logger?.warn?.(message);
    }, effectiveRequestTimeout);
    const socketTimeout = timeout(config.socketTimeout);
    if (socketTimeout) {
      outgoing.setTimeout(socketTimeout, () => outgoing.destroy(timeoutError(
        `S3 socket was inactive for ${socketTimeout} ms`,
      )));
    }
    const warningTimeout = timeout(config.socketAcquisitionWarningTimeout)
      || connectionTimeout + effectiveRequestTimeout || 3_000;
    schedule(() => {
      this.socketWarningTimestamp = NodeHttpHandler.checkSocketUsage(
        requestAgent,
        this.socketWarningTimestamp,
        config.logger,
      );
    }, warningTimeout);
    outgoing.once("close", clear);
    return clear;
  }
}
