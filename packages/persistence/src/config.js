export const PERSISTENCE_CONFIG_SCHEMA_VERSION = "law-firm-os.persistence-config.v0.1";
export const SYNTHETIC_PROTOCOL = "lawos-synthetic:";

function requireNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} is required`);
  }
  return value.trim();
}

function parseSyntheticUrl(input) {
  const url = new URL(requireNonEmptyString(input, "persistence url"));
  if (url.protocol !== SYNTHETIC_PROTOCOL) {
    throw new TypeError("Only lawos-synthetic:// persistence URLs are allowed before DEC-RS-001 is approved");
  }
  const root = url.searchParams.get("root") ?? url.searchParams.get("dir") ?? "";
  return {
    url: url.toString(),
    adapter: "synthetic-file",
    root_dir: root.trim(),
    host: url.hostname,
    sandbox_only: true,
    production_ready_claim: false
  };
}

export function createPersistenceConfig(input = {}) {
  const parsed = parseSyntheticUrl(input.url ?? input.connection_url ?? "lawos-synthetic://runtime-spine?root=");
  const config = {
    schema_version: PERSISTENCE_CONFIG_SCHEMA_VERSION,
    ...parsed,
    environment: input.environment ?? "test",
    synthetic_only: true,
    no_production_credentials: true
  };
  if (input.username || input.password || input.token || input.secret) {
    throw new TypeError("Persistence config must not include inline credentials");
  }
  if (config.environment === "production") {
    throw new TypeError("Runtime Spine RS-1A does not allow production persistence configuration");
  }
  return Object.freeze(config);
}

export function createPersistenceConfigFromEnv(env = process.env) {
  return createPersistenceConfig({
    url: env.LAWOS_PERSISTENCE_URL ?? "lawos-synthetic://runtime-spine?root=",
    environment: env.LAWOS_PERSISTENCE_ENV ?? "test"
  });
}
