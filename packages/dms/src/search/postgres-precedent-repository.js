import { createPrecedentCursorAuthority } from "./precedent-cursor.js";
import { PRECEDENT_INDEX_VERSION } from "./precedent-common.js";
import { createPrecedentExtractionReceiptAuthority } from "./precedent-extraction-receipt.js";
import { createPrecedentIndexRepository } from "./precedent-index-repository.js";
import { createPrecedentReadinessRepository } from "./precedent-readiness-repository.js";
import { createPrecedentRegistryRepository } from "./precedent-registry-repository.js";
import { createPrecedentSearchRepository } from "./precedent-search-repository.js";

export { PRECEDENT_INDEX_VERSION } from "./precedent-common.js";
export { createPrecedentCursorAuthority } from "./precedent-cursor.js";
export {
  createPrecedentExtractionReceiptAuthority,
  extractedTextSha256,
} from "./precedent-extraction-receipt.js";
export { PRECEDENT_SEARCH_SQL } from "./precedent-search-repository.js";

export function createPostgresPrecedentRepository({
  pool,
  authoritySecret,
  cursorSecret = authoritySecret,
  extractionReceiptSecret = authoritySecret,
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const cursorAuthority = createPrecedentCursorAuthority({
    secret: cursorSecret,
    indexVersion: PRECEDENT_INDEX_VERSION,
  });
  const extractionReceiptAuthority = createPrecedentExtractionReceiptAuthority({
    secret: extractionReceiptSecret,
  });
  const registry = createPrecedentRegistryRepository({ pool });
  const index = createPrecedentIndexRepository({ pool, extractionReceiptAuthority });
  const readiness = createPrecedentReadinessRepository({ pool });
  const search = createPrecedentSearchRepository({ pool, cursorAuthority });
  return Object.freeze({
    index_version: PRECEDENT_INDEX_VERSION,
    ...registry,
    ...index,
    ...readiness,
    ...search,
    issueExtractionReceipt: extractionReceiptAuthority.issue,
  });
}
