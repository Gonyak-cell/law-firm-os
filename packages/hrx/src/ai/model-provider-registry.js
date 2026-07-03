import { createHash } from "node:crypto";
import { createHrxModelGateway } from "./model-gateway.js";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "gemma4:12b";
const DEFAULT_NUM_PREDICT = 192;
const SAFE_METADATA_KEYS = Object.freeze([
  "provider",
  "model",
  "request_hash",
  "response_hash",
  "endpoint_hash",
  "provider_request_id_hash",
  "done",
  "done_reason",
  "http_status",
  "prompt_eval_count",
  "eval_count",
  "total_duration",
]);

function stableHash(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return createHash("sha256").update(serialized).digest("hex");
}

function optionalString(value, fallback = null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function parseInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function requireFetch(fetchImpl) {
  if (typeof fetchImpl !== "function") throw new TypeError("HRX model provider requires fetch");
  return fetchImpl;
}

function safeProviderMetadata(metadata = {}) {
  return Object.freeze(
    Object.fromEntries(
      SAFE_METADATA_KEYS
        .filter((key) => Object.hasOwn(metadata, key))
        .map((key) => [key, metadata[key]]),
    ),
  );
}

function sourceRefsFrom(promptContext = {}) {
  return Object.freeze(
    [...new Set((Array.isArray(promptContext.source_refs) ? promptContext.source_refs : [])
      .filter((item) => typeof item === "string" && item.trim() !== "")
      .map((item) => item.trim()))],
  );
}

function matchedTermsFrom(promptContext = {}) {
  return Object.freeze(
    [
      ...new Set(
        (Array.isArray(promptContext.matched_chunks) ? promptContext.matched_chunks : [])
          .flatMap((chunk) => Array.isArray(chunk.matched_terms) ? chunk.matched_terms : [])
          .filter((item) => typeof item === "string" && item.trim() !== "")
          .map((item) => item.trim()),
      ),
    ].slice(0, 20),
  );
}

export function buildHrxModelPrompt({ question, prompt_context: promptContext = {} } = {}) {
  if (typeof question !== "string" || question.trim() === "") throw new TypeError("HRX model prompt question is required");
  return [
    "You are Law Firm OS HRX local advisory AI.",
    "Use only metadata source references and citations already approved by the server.",
    "Do not make final hiring, firing, pay, discipline, evaluation, or termination decisions.",
    "Return one concise Korean advisory sentence.",
    `Payload policy: ${promptContext.context_payload_policy ?? "metadata_only"}`,
    `Source refs: ${sourceRefsFrom(promptContext).join(", ") || "none"}`,
    `Matched terms: ${matchedTermsFrom(promptContext).join(", ") || "none"}`,
    `Question: ${question.trim()}`,
  ].join("\n");
}

export function createOllamaHrxModelProvider({
  endpoint = DEFAULT_OLLAMA_URL,
  model = DEFAULT_OLLAMA_MODEL,
  fetchImpl = globalThis.fetch,
  num_predict: numPredict = DEFAULT_NUM_PREDICT,
  temperature = 0,
} = {}) {
  const resolvedFetch = requireFetch(fetchImpl);
  const resolvedEndpoint = String(endpoint ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
  const resolvedModel = optionalString(model, DEFAULT_OLLAMA_MODEL);

  return Object.freeze({
    provider_id: "ollama",
    model: resolvedModel,
    async complete(request = {}) {
      const selectedModel = optionalString(request.model, resolvedModel);
      const prompt = buildHrxModelPrompt(request);
      const response = await resolvedFetch(`${resolvedEndpoint}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          stream: false,
          think: false,
          options: {
            temperature,
            num_predict: numPredict,
          },
        }),
      });
      const body = await response.json();
      if (!response.ok || body.error) throw new Error(`HRX_OLLAMA_MODEL_GATEWAY_ERROR:${body.error ?? response.status}`);
      const output = typeof body.response === "string" ? body.response.trim() : "";
      return Object.freeze({
        output,
        provider_metadata: safeProviderMetadata({
          provider: "ollama",
          model: body.model ?? selectedModel,
          endpoint_hash: stableHash(resolvedEndpoint),
          request_hash: stableHash(prompt),
          response_hash: stableHash(output),
          done: body.done === true,
          done_reason: body.done_reason ?? null,
          http_status: response.status,
          prompt_eval_count: body.prompt_eval_count ?? null,
          eval_count: body.eval_count ?? null,
          total_duration: body.total_duration ?? null,
        }),
      });
    },
  });
}

export function createRemoteHrxModelGatewayProvider({
  endpoint,
  apiKey,
  model,
  fetchImpl = globalThis.fetch,
} = {}) {
  const resolvedFetch = requireFetch(fetchImpl);
  const resolvedEndpoint = optionalString(endpoint);
  const resolvedApiKey = optionalString(apiKey);
  const resolvedModel = optionalString(model, "remote-model");
  if (!resolvedEndpoint || !resolvedApiKey) return null;

  return Object.freeze({
    provider_id: "remote",
    model: resolvedModel,
    async complete(request = {}) {
      const requestBody = {
        model: optionalString(request.model, resolvedModel),
        question: request.question ?? null,
        prompt_context: request.prompt_context ?? null,
      };
      const response = await resolvedFetch(resolvedEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${resolvedApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      const body = await response.json();
      if (!response.ok || body.error) throw new Error(`HRX_REMOTE_MODEL_GATEWAY_ERROR:${body.error ?? response.status}`);
      const output = String(body.output ?? body.answer ?? body.response ?? "").trim();
      return Object.freeze({
        output,
        provider_metadata: safeProviderMetadata({
          provider: "remote",
          model: body.model ?? requestBody.model,
          endpoint_hash: stableHash(resolvedEndpoint),
          provider_request_id_hash: body.request_id ? stableHash(body.request_id) : null,
          request_hash: stableHash(requestBody),
          response_hash: stableHash(output),
          http_status: response.status,
        }),
      });
    },
  });
}

export const HRX_MODEL_PROVIDER_FACTORIES = Object.freeze({
  ollama: createOllamaHrxModelProvider,
  remote: createRemoteHrxModelGatewayProvider,
});

export function resolveHrxModelGatewayConfig(env = process.env) {
  const enabled = parseBoolean(env.LAWOS_MODEL_GATEWAY_ENABLED ?? env.HRX_MODEL_GATEWAY_ENABLED);
  const provider = optionalString(env.LAWOS_MODEL_GATEWAY_PROVIDER, env.LAWOS_MODEL_GATEWAY_URL ? "remote" : "ollama");
  const model = optionalString(env.LAWOS_MODEL_GATEWAY_MODEL ?? env.LAWOS_OLLAMA_MODEL, DEFAULT_OLLAMA_MODEL);
  return Object.freeze({
    enabled,
    provider,
    model,
    ollama: Object.freeze({
      endpoint: optionalString(env.LAWOS_OLLAMA_URL, DEFAULT_OLLAMA_URL),
      model,
      num_predict: parseInteger(env.LAWOS_MODEL_GATEWAY_NUM_PREDICT, DEFAULT_NUM_PREDICT),
    }),
    remote: Object.freeze({
      endpoint: optionalString(env.LAWOS_MODEL_GATEWAY_URL),
      apiKey: optionalString(env.LAWOS_MODEL_GATEWAY_API_KEY),
      model,
    }),
  });
}

export function createHrxModelGatewayFromEnv({
  env = process.env,
  fetchImpl = globalThis.fetch,
  providerFactories = HRX_MODEL_PROVIDER_FACTORIES,
} = {}) {
  const config = resolveHrxModelGatewayConfig(env);
  if (!config.enabled) return createHrxModelGateway();
  const factory = providerFactories[config.provider];
  if (typeof factory !== "function") return createHrxModelGateway({ enabled: true, model: config.model });
  const provider = factory({ ...(config[config.provider] ?? {}), fetchImpl });
  return createHrxModelGateway({
    enabled: Boolean(provider),
    model: config.model,
    provider,
  });
}
