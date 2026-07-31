CREATE TABLE IF NOT EXISTS lawos_email_dms.inquiry_evidence_file_objects (
  tenant_id text NOT NULL,
  inquiry_evidence_file_object_id text NOT NULL,
  inquiry_email_evidence_id text NOT NULL,
  object_kind text NOT NULL
    CHECK (object_kind IN ('original_mime', 'sanitized_display')),
  storage_pointer_ref text NOT NULL
    CHECK (storage_pointer_ref ~ '^vault://'),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  mime_type text NOT NULL,
  scan_status text NOT NULL
    CHECK (scan_status IN ('pending', 'clean', 'quarantined', 'failed')),
  retention_policy_id text NOT NULL,
  legal_hold_state text NOT NULL
    CHECK (legal_hold_state IN ('none', 'held')),
  kms_key_ref text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, inquiry_evidence_file_object_id),
  UNIQUE (tenant_id, inquiry_email_evidence_id, object_kind),
  CHECK (
    (object_kind = 'original_mime' AND mime_type = 'message/rfc822')
    OR (
      object_kind = 'sanitized_display'
      AND mime_type ~ '^text/(html|plain)(;[[:space:]]*charset=utf-8)?$'
    )
  )
);

CREATE TABLE IF NOT EXISTS lawos_email_dms.inquiry_email_evidence (
  tenant_id text NOT NULL,
  inquiry_email_evidence_id text NOT NULL,
  mailbox_address text NOT NULL
    CHECK (
      length(mailbox_address) <= 320
      AND mailbox_address = lower(mailbox_address)
      AND mailbox_address ~ '^[^[:space:]]+@[^[:space:]]+$'
    ),
  lead_id text,
  graph_immutable_message_id text,
  internet_message_id text,
  conversation_id text,
  mime_file_object_id text,
  mime_sha256 text CHECK (
    mime_sha256 IS NULL OR mime_sha256 ~ '^[a-f0-9]{64}$'
  ),
  mime_byte_size bigint CHECK (
    mime_byte_size IS NULL OR mime_byte_size >= 0
  ),
  subject text NOT NULL DEFAULT '',
  sender jsonb NOT NULL,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  received_at timestamptz NOT NULL,
  display_file_object_id text,
  attachment_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  capture_status text NOT NULL
    CHECK (capture_status IN ('pending_link', 'complete', 'failed')),
  retention_policy_ref text NOT NULL,
  legal_hold_state text NOT NULL
    CHECK (legal_hold_state IN ('none', 'held')),
  captured_by text NOT NULL,
  captured_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, inquiry_email_evidence_id),
  CHECK (
    internet_message_id IS NOT NULL
    OR graph_immutable_message_id IS NOT NULL
  ),
  CHECK (
    capture_status = 'failed'
    OR (
      mime_file_object_id IS NOT NULL
      AND display_file_object_id IS NOT NULL
      AND mime_sha256 IS NOT NULL
      AND mime_byte_size IS NOT NULL
    )
  ),
  CHECK (capture_status <> 'complete' OR lead_id IS NOT NULL),
  CONSTRAINT inquiry_evidence_original_file_fk
    FOREIGN KEY (tenant_id, mime_file_object_id)
    REFERENCES lawos_email_dms.inquiry_evidence_file_objects
      (tenant_id, inquiry_evidence_file_object_id)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT inquiry_evidence_display_file_fk
    FOREIGN KEY (tenant_id, display_file_object_id)
    REFERENCES lawos_email_dms.inquiry_evidence_file_objects
      (tenant_id, inquiry_evidence_file_object_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX IF NOT EXISTS inquiry_email_evidence_internet_message_uq
  ON lawos_email_dms.inquiry_email_evidence
    (tenant_id, mailbox_address, internet_message_id)
  WHERE internet_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inquiry_email_evidence_graph_fallback_uq
  ON lawos_email_dms.inquiry_email_evidence
    (tenant_id, mailbox_address, graph_immutable_message_id)
  WHERE internet_message_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'inquiry_evidence_file_parent_fk'
       AND conrelid =
         'lawos_email_dms.inquiry_evidence_file_objects'::regclass
  ) THEN
    ALTER TABLE lawos_email_dms.inquiry_evidence_file_objects
      ADD CONSTRAINT inquiry_evidence_file_parent_fk
      FOREIGN KEY (tenant_id, inquiry_email_evidence_id)
      REFERENCES lawos_email_dms.inquiry_email_evidence
        (tenant_id, inquiry_email_evidence_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END
$$;

ALTER TABLE lawos_email_dms.inquiry_email_evidence
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.inquiry_email_evidence
  FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.inquiry_evidence_file_objects
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.inquiry_evidence_file_objects
  FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
  ON lawos_email_dms.inquiry_email_evidence;
CREATE POLICY tenant_isolation
  ON lawos_email_dms.inquiry_email_evidence
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation
  ON lawos_email_dms.inquiry_evidence_file_objects;
CREATE POLICY tenant_isolation
  ON lawos_email_dms.inquiry_evidence_file_objects
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
