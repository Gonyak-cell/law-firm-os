import { createPrecedentCursorAuthority } from "./precedent-cursor.js";
import { PRECEDENT_INDEX_VERSION } from "./precedent-common.js";
import { createDocumentPrivilegeRepository } from "./document-privilege-repository.js";
import { createPrecedentExtractionReceiptAuthority } from "./precedent-extraction-receipt.js";
import { createPrecedentIndexRepository } from "./precedent-index-repository.js";
import { createPrecedentReadinessRepository } from "./precedent-readiness-repository.js";
import { createPrecedentRegistryRepository } from "./precedent-registry-repository.js";
import { createPrecedentSearchRepository } from "./precedent-search-repository.js";

export {
  PRECEDENT_INDEX_VERSION,
  buildVaultDocumentNavigationHref,
  derivePrecedentAuthorityKeys,
} from "./precedent-common.js";
export { createDocumentPrivilegeRepository } from "./document-privilege-repository.js";
export { createPrecedentCursorAuthority } from "./precedent-cursor.js";
export { PRECEDENT_SEARCH_SQL } from "./precedent-search-repository.js";

export function createPostgresPrecedentRepository({
  pool,
  cursorSecret,
  extractionReceiptSecret,
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  if (Buffer.from(cursorSecret ?? "").equals(Buffer.from(extractionReceiptSecret ?? ""))) {
    throw new TypeError("precedent cursor and extraction receipt signing keys must be distinct");
  }
  const cursorAuthority = createPrecedentCursorAuthority({
    secret: cursorSecret,
    indexVersion: PRECEDENT_INDEX_VERSION,
  });
  const extractionReceiptAuthority = createPrecedentExtractionReceiptAuthority({
    secret: extractionReceiptSecret,
  });
  const registry = createPrecedentRegistryRepository({ pool });
  const privilege = createDocumentPrivilegeRepository({ pool });
  const index = createPrecedentIndexRepository({ pool, extractionReceiptAuthority });
  const readiness = createPrecedentReadinessRepository({ pool });
  const search = createPrecedentSearchRepository({ pool, cursorAuthority });
  return Object.freeze({
    index_version: PRECEDENT_INDEX_VERSION,
    ...registry,
    ...privilege,
    ...index,
    ...readiness,
    ...search,
  });
}
