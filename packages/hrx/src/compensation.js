import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const RAW_AMOUNT_FIELDS = Object.freeze(["amount", "salary", "base_pay", "bonus_amount", "equity_value", "gross_pay", "net_pay"]);
export const COMPENSATION_ENVELOPE_PREFIX = "lawos-comp-v1.";
const COMPENSATION_KEY_ENV = "LAWOS_HRX_COMPENSATION_ENCRYPTION_KEY";
const SYNTHETIC_COMPENSATION_KEY_MATERIAL = "lawos-synthetic-only-compensation-key-v1";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function keyMaterial(input, { allowSyntheticKey = false } = {}) {
  const value = input ?? process.env[COMPENSATION_KEY_ENV];
  if (typeof value === "string" && value.length > 0) return value;
  if (Buffer.isBuffer(value) && value.byteLength > 0) return value;
  if (allowSyntheticKey) return SYNTHETIC_COMPENSATION_KEY_MATERIAL;
  throw new TypeError(`compensation encryption requires injected key material or ${COMPENSATION_KEY_ENV}`);
}

function digest(value, length = 24) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(value) {
  return Buffer.from(String(value), "base64url");
}

function compensationKey(options = {}) {
  return createHash("sha256").update(keyMaterial(options.keyMaterial, options)).digest();
}

function compensationAad(input = {}) {
  return Buffer.from(
    JSON.stringify({
      schema: "lawos.hrx.compensation.aad.v1",
      tenant_id: requiredString(input, "tenant_id"),
      employee_id: requiredString(input, "employee_id"),
      compensation_id: requiredString(input, "compensation_id"),
    }),
  );
}

function amountMinor(input) {
  const value = Number(input);
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("amount_minor must be a non-negative safe integer");
  return value;
}

function parseCompensationEnvelope(ref) {
  const value = requiredString({ ref }, "ref");
  if (!value.startsWith(COMPENSATION_ENVELOPE_PREFIX)) throw new TypeError("encrypted_amount_ref must be a lawos-comp-v1 envelope");
  const decoded = JSON.parse(fromB64url(value.slice(COMPENSATION_ENVELOPE_PREFIX.length)).toString("utf8"));
  if (decoded.alg !== "AES-256-GCM") throw new TypeError("encrypted_amount_ref uses an unsupported algorithm");
  for (const field of ["iv", "tag", "ciphertext", "aad_hash", "key_ref"]) {
    if (typeof decoded[field] !== "string" || decoded[field].trim() === "") throw new TypeError(`encrypted_amount_ref missing ${field}`);
  }
  return decoded;
}

export function isCompensationAmountRefEncrypted(ref) {
  return typeof ref === "string" && ref.startsWith(COMPENSATION_ENVELOPE_PREFIX);
}

export function maskCompensationRef(ref) {
  return `compensation_ref_hash:${digest(ref)}`;
}

export function encryptCompensationAmount(input = {}, options = {}) {
  const tenant_id = requiredString(input, "tenant_id");
  const employee_id = requiredString(input, "employee_id");
  const compensation_id = requiredString(input, "compensation_id");
  const payload = Buffer.from(
    JSON.stringify({
      schema_version: 1,
      amount_minor: amountMinor(input.amount_minor),
      currency_ref: input.currency_ref ?? null,
    }),
  );
  const iv = options.iv ? Buffer.from(options.iv) : randomBytes(12);
  if (iv.length !== 12) throw new TypeError("compensation encryption iv must be 12 bytes");
  const aad = compensationAad({ tenant_id, employee_id, compensation_id });
  const resolvedKeyMaterial = keyMaterial(options.keyMaterial, options);
  const cipher = createCipheriv("aes-256-gcm", compensationKey({ ...options, keyMaterial: resolvedKeyMaterial }), iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const envelope = {
    schema_version: 1,
    alg: "AES-256-GCM",
    key_ref: `lawos-key:${digest(resolvedKeyMaterial, 16)}`,
    aad_hash: digest(aad.toString("utf8")),
    iv: b64url(iv),
    tag: b64url(cipher.getAuthTag()),
    ciphertext: b64url(ciphertext),
  };
  return `${COMPENSATION_ENVELOPE_PREFIX}${b64url(JSON.stringify(envelope))}`;
}

export function decryptCompensationAmountRef(encrypted_amount_ref, context = {}, options = {}) {
  const envelope = parseCompensationEnvelope(encrypted_amount_ref);
  const aad = compensationAad(context);
  if (envelope.aad_hash !== digest(aad.toString("utf8"))) throw new TypeError("encrypted_amount_ref context mismatch");
  const decipher = createDecipheriv("aes-256-gcm", compensationKey(options), fromB64url(envelope.iv));
  decipher.setAAD(aad);
  decipher.setAuthTag(fromB64url(envelope.tag));
  const payload = JSON.parse(Buffer.concat([decipher.update(fromB64url(envelope.ciphertext)), decipher.final()]).toString("utf8"));
  return Object.freeze({
    amount_minor: amountMinor(payload.amount_minor),
    currency_ref: payload.currency_ref ?? null,
    decrypted_payload_included: true,
    key_ref: envelope.key_ref,
  });
}

export function createCompensationRecordMetadata(input = {}) {
  for (const field of RAW_AMOUNT_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Compensation metadata must not include raw ${field}`);
  }
  const encryptedAmountRef = requiredString(input, "encrypted_amount_ref");
  if (!isCompensationAmountRefEncrypted(encryptedAmountRef)) {
    throw new TypeError("encrypted_amount_ref must be a lawos-comp-v1 envelope");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    compensation_id: requiredString(input, "compensation_id"),
    employee_id: requiredString(input, "employee_id"),
    encrypted_amount_ref: encryptedAmountRef,
    currency_ref: input.currency_ref ?? null,
    effective_from: requiredString(input, "effective_from"),
    effective_to: input.effective_to ?? null,
    source_ref: requiredString(input, "source_ref"),
    employment_contract_id: requiredString(input, "employment_contract_id"),
    contract_document_ref: requiredString(input, "contract_document_ref"),
    raw_amount_included: false,
  });
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function visibleCompensationRecord(record = {}) {
  return Object.freeze({
    tenant_id: record.tenant_id,
    compensation_id: record.compensation_id,
    employee_id: record.employee_id,
    masked_compensation_ref: maskCompensationRef(record.encrypted_amount_ref),
    encrypted_amount_ref_included: false,
    encryption_envelope: "lawos-comp-v1",
    currency_ref: record.currency_ref,
    effective_from: record.effective_from,
    effective_to: record.effective_to,
    source_ref: record.source_ref,
    employment_contract_id: record.employment_contract_id,
    contract_document_ref: record.contract_document_ref,
    raw_amount_included: false,
  });
}

export function maskCompensationRecord(record = {}) {
  return visibleCompensationRecord(createCompensationRecordMetadata(record));
}

export function createInMemoryCompensationRecordStore(seed = []) {
  const records = new Map();
  const key = (tenantId, compensationId) => `${tenantId}:${compensationId}`;

  const store = {
    create(input) {
      const record = createCompensationRecordMetadata(input);
      records.set(key(record.tenant_id, record.compensation_id), clone(record));
      return Object.freeze(clone(record));
    },
    get(ref = {}) {
      const record = records.get(key(ref.tenant_id, ref.compensation_id));
      return record ? Object.freeze(clone(record)) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...records.values()]
          .filter((record) => record.tenant_id === query.tenant_id)
          .filter((record) => !query.employee_id || record.employee_id === query.employee_id)
          .sort((left, right) => `${right.effective_from}:${right.compensation_id}`.localeCompare(`${left.effective_from}:${left.compensation_id}`))
          .map((record) => Object.freeze(clone(record))),
      );
    },
    latest(query = {}) {
      return store.list(query)[0];
    },
    visible(query = {}) {
      return Object.freeze(store.list(query).map(maskCompensationRecord));
    },
  };

  for (const record of seed) store.create(record);

  return Object.freeze(store);
}

export function createSqlCompensationRecordStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL compensation record store requires store.query");

  function deserialize(row) {
    return row ? createCompensationRecordMetadata(row) : undefined;
  }

  const compensation = {
    create(input) {
      const record = createCompensationRecordMetadata(input);
      return deserialize(
        store.query("insert", {
          table: "hrx_compensation_records",
          row: { ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        }),
      );
    },
    get(ref = {}) {
      return deserialize(
        store.query("selectOne", {
          table: "hrx_compensation_records",
          where: { tenant_id: ref.tenant_id, compensation_id: ref.compensation_id },
        }),
      );
    },
    list(query = {}) {
      const where = { tenant_id: query.tenant_id };
      if (query.employee_id) where.employee_id = query.employee_id;
      return Object.freeze(
        store
          .query("select", { table: "hrx_compensation_records", where })
          .map(deserialize)
          .filter(Boolean)
          .sort((left, right) => `${right.effective_from}:${right.compensation_id}`.localeCompare(`${left.effective_from}:${left.compensation_id}`)),
      );
    },
    latest(query = {}) {
      return compensation.list(query)[0];
    },
    visible(query = {}) {
      return Object.freeze(compensation.list(query).map(maskCompensationRecord));
    },
  };

  return Object.freeze(compensation);
}
