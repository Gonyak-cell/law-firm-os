CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

ALTER TABLE lawos_dms.documents
  ADD COLUMN privileged boolean NOT NULL DEFAULT false;

CREATE TABLE lawos_dms.precedent_sources (
  tenant_id text NOT NULL,
  source_id text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('internal_matter_document', 'case_law_document')),
  matter_id text NOT NULL,
  document_id text NOT NULL,
  version_id text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  court text,
  case_number text,
  decision_date date,
  source_url text,
  source_reference text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'unapproved')),
  source_revision bigint NOT NULL DEFAULT 1 CHECK (source_revision >= 1),
  approval_id text NOT NULL,
  approval_batch_id text NOT NULL,
  approval_decision_id text NOT NULL,
  approval_authority text NOT NULL CHECK (approval_authority = 'vault-approved-precedent-corpus-v1'),
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL,
  registered_by text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  disabled_by text,
  disabled_at timestamptz,
  unapproved_by text,
  unapproved_at timestamptz,
  PRIMARY KEY (tenant_id, source_id),
  FOREIGN KEY (tenant_id, document_id)
    REFERENCES lawos_dms.documents (tenant_id, document_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, version_id)
    REFERENCES lawos_dms.document_versions (tenant_id, version_id)
    ON DELETE RESTRICT,
  CHECK (
    source_kind <> 'case_law_document'
    OR (
      court IS NOT NULL AND char_length(court) BETWEEN 1 AND 200
      AND case_number IS NOT NULL AND char_length(case_number) BETWEEN 1 AND 200
      AND decision_date IS NOT NULL
      AND source_url IS NOT NULL AND char_length(source_url) BETWEEN 1 AND 2048
      AND source_reference IS NOT NULL AND char_length(source_reference) BETWEEN 1 AND 500
    )
  ),
  CHECK (
    (status = 'active' AND disabled_by IS NULL AND disabled_at IS NULL
      AND unapproved_by IS NULL AND unapproved_at IS NULL)
    OR (status = 'disabled' AND disabled_by IS NOT NULL AND disabled_at IS NOT NULL
      AND unapproved_by IS NULL AND unapproved_at IS NULL)
    OR (status = 'unapproved' AND unapproved_by IS NOT NULL AND unapproved_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX dms_precedent_active_document_index
  ON lawos_dms.precedent_sources (tenant_id, document_id)
  WHERE status = 'active';
CREATE INDEX dms_precedent_source_status_index
  ON lawos_dms.precedent_sources (tenant_id, status, source_id);

CREATE TABLE lawos_dms.precedent_extraction_receipts (
  tenant_id text NOT NULL,
  receipt_id text NOT NULL,
  source_id text NOT NULL,
  document_id text NOT NULL,
  version_id text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  extractor_id text NOT NULL,
  text_sha256 text NOT NULL CHECK (text_sha256 ~ '^[a-f0-9]{64}$'),
  character_count integer NOT NULL CHECK (character_count >= 0 AND character_count <= 1004000),
  issued_by text NOT NULL,
  issued_at timestamptz NOT NULL,
  authority text NOT NULL CHECK (authority = 'dms-immutable-version-extractor-v1'),
  receipt_signature text NOT NULL CHECK (receipt_signature ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY (tenant_id, receipt_id),
  FOREIGN KEY (tenant_id, source_id)
    REFERENCES lawos_dms.precedent_sources (tenant_id, source_id)
    ON DELETE RESTRICT,
  UNIQUE (
    tenant_id, receipt_id, source_id, document_id, version_id,
    content_sha256, extractor_id, text_sha256
  )
);

CREATE TABLE lawos_dms.precedent_search_index (
  tenant_id text NOT NULL,
  source_id text NOT NULL,
  source_revision bigint NOT NULL CHECK (source_revision >= 1),
  document_id text NOT NULL,
  version_id text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  extraction_receipt_id text NOT NULL,
  extractor_id text NOT NULL,
  text_sha256 text NOT NULL CHECK (text_sha256 ~ '^[a-f0-9]{64}$'),
  index_version text NOT NULL,
  index_hash text NOT NULL CHECK (index_hash ~ '^[a-f0-9]{64}$'),
  title_text text NOT NULL CHECK (char_length(title_text) BETWEEN 1 AND 300),
  metadata_text text NOT NULL CHECK (char_length(metadata_text) <= 4000),
  body_text text NOT NULL CHECK (char_length(body_text) <= 1000000),
  normalized_text text NOT NULL CHECK (char_length(normalized_text) <= 1004302),
  title_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, title_text), 'A')
  ) STORED,
  metadata_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, metadata_text), 'B')
  ) STORED,
  body_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, body_text), 'C')
  ) STORED,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, title_text), 'A')
    || setweight(to_tsvector('simple'::regconfig, metadata_text), 'B')
    || setweight(to_tsvector('simple'::regconfig, body_text), 'C')
  ) STORED,
  indexed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, source_id),
  FOREIGN KEY (tenant_id, source_id)
    REFERENCES lawos_dms.precedent_sources (tenant_id, source_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (
    tenant_id, extraction_receipt_id, source_id, document_id, version_id,
    content_sha256, extractor_id, text_sha256
  ) REFERENCES lawos_dms.precedent_extraction_receipts (
    tenant_id, receipt_id, source_id, document_id, version_id,
    content_sha256, extractor_id, text_sha256
  ) ON DELETE RESTRICT
);

CREATE INDEX dms_precedent_search_vector_gin
  ON lawos_dms.precedent_search_index USING gin (search_vector);
CREATE INDEX dms_precedent_search_korean_fallback_gin
  ON lawos_dms.precedent_search_index USING gin (normalized_text public.gin_trgm_ops);

CREATE FUNCTION lawos_dms.validate_precedent_source_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Precedent sources cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF ROW(OLD.tenant_id, OLD.source_id, OLD.source_kind, OLD.matter_id,
         OLD.document_id, OLD.registered_by, OLD.registered_at)
     IS DISTINCT FROM
     ROW(NEW.tenant_id, NEW.source_id, NEW.source_kind, NEW.matter_id,
         NEW.document_id, NEW.registered_by, NEW.registered_at) THEN
    RAISE EXCEPTION 'Precedent source identity is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.source_revision <= OLD.source_revision THEN
    RAISE EXCEPTION 'Precedent source revision must advance' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION lawos_dms.reject_precedent_extraction_receipt_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Precedent extraction receipts are immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER dms_precedent_source_guard
BEFORE UPDATE OR DELETE ON lawos_dms.precedent_sources
FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_precedent_source_update();
CREATE TRIGGER dms_precedent_extraction_receipt_guard
BEFORE UPDATE OR DELETE ON lawos_dms.precedent_extraction_receipts
FOR EACH ROW EXECUTE FUNCTION lawos_dms.reject_precedent_extraction_receipt_change();

ALTER TABLE lawos_dms.precedent_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.precedent_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.precedent_extraction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.precedent_extraction_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.precedent_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.precedent_search_index FORCE ROW LEVEL SECURITY;

CREATE POLICY dms_precedent_sources_tenant_policy ON lawos_dms.precedent_sources
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_precedent_extraction_receipts_tenant_policy ON lawos_dms.precedent_extraction_receipts
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_precedent_search_index_tenant_policy ON lawos_dms.precedent_search_index
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
