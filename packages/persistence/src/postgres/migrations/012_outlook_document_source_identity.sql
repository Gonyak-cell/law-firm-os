ALTER TABLE lawos_dms.upload_sessions
  ADD COLUMN source_email_thread_id text,
  ADD COLUMN source_attachment_id text,
  ADD CONSTRAINT dms_upload_session_source_email_thread_id_check CHECK (
    source_email_thread_id IS NULL OR (
      char_length(source_email_thread_id) BETWEEN 1 AND 512
      AND source_email_thread_id = btrim(source_email_thread_id)
      AND source_email_thread_id !~ '[[:cntrl:]]'
    )
  ),
  ADD CONSTRAINT dms_upload_session_source_attachment_id_check CHECK (
    source_attachment_id IS NULL OR (
      source_email_thread_id IS NOT NULL
      AND char_length(source_attachment_id) BETWEEN 1 AND 512
      AND source_attachment_id = btrim(source_attachment_id)
      AND source_attachment_id !~ '[[:cntrl:]]'
    )
  );

ALTER TABLE lawos_dms.documents
  ADD COLUMN source_email_thread_id text,
  ADD COLUMN source_attachment_id text,
  ADD CONSTRAINT dms_document_source_email_thread_id_check CHECK (
    source_email_thread_id IS NULL OR (
      char_length(source_email_thread_id) BETWEEN 1 AND 512
      AND source_email_thread_id = btrim(source_email_thread_id)
      AND source_email_thread_id !~ '[[:cntrl:]]'
    )
  ),
  ADD CONSTRAINT dms_document_source_attachment_id_check CHECK (
    source_attachment_id IS NULL OR (
      source_email_thread_id IS NOT NULL
      AND char_length(source_attachment_id) BETWEEN 1 AND 512
      AND source_attachment_id = btrim(source_attachment_id)
      AND source_attachment_id !~ '[[:cntrl:]]'
    )
  );

CREATE FUNCTION lawos_dms.reject_outlook_source_identity_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.source_email_thread_id IS DISTINCT FROM NEW.source_email_thread_id
    OR OLD.source_attachment_id IS DISTINCT FROM NEW.source_attachment_id THEN
    RAISE EXCEPTION 'DMS Outlook source identity is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dms_upload_session_source_identity_immutable
BEFORE UPDATE ON lawos_dms.upload_sessions
FOR EACH ROW EXECUTE FUNCTION lawos_dms.reject_outlook_source_identity_update();

CREATE TRIGGER dms_document_source_identity_immutable
BEFORE UPDATE ON lawos_dms.documents
FOR EACH ROW EXECUTE FUNCTION lawos_dms.reject_outlook_source_identity_update();
