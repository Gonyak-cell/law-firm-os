ALTER TABLE lawos_dms.delete_intents
  ADD COLUMN approval_receipt_ref text,
  ADD COLUMN approval_receipt_sha256 text CHECK (
    approval_receipt_sha256 IS NULL OR approval_receipt_sha256 ~ '^[a-f0-9]{64}$'
  ),
  ADD COLUMN approval_key_id text,
  ADD COLUMN permanent_delete_approval_verified boolean NOT NULL DEFAULT false;

ALTER TABLE lawos_dms.delete_intents
  ADD CONSTRAINT dms_permanent_delete_approval_check CHECK (
    permanent_delete_approval_verified = false
    OR (
      approval_receipt_ref IS NOT NULL
      AND approval_receipt_sha256 IS NOT NULL
      AND approval_key_id IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION lawos_dms.reject_delete_approval_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.approval_receipt_ref IS DISTINCT FROM NEW.approval_receipt_ref
     OR OLD.approval_receipt_sha256 IS DISTINCT FROM NEW.approval_receipt_sha256
     OR OLD.approval_key_id IS DISTINCT FROM NEW.approval_key_id
     OR OLD.permanent_delete_approval_verified IS DISTINCT FROM NEW.permanent_delete_approval_verified THEN
    RAISE EXCEPTION 'DMS permanent delete approval fields are immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dms_delete_approval_immutable
BEFORE UPDATE OF approval_receipt_ref, approval_receipt_sha256, approval_key_id,
  permanent_delete_approval_verified
ON lawos_dms.delete_intents
FOR EACH ROW
EXECUTE FUNCTION lawos_dms.reject_delete_approval_mutation();
