export function assertNoSecretMaterial(payload = {}) {
  const serialized = JSON.stringify(payload);
  if (/(sk-[a-zA-Z0-9]|password|secret|private_key)/i.test(serialized)) throw new Error("secret material detected");
  return Object.freeze({ secret_material_detected: false, production_ready_claim: false });
}
