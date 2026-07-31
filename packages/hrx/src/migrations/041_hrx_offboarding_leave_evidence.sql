ALTER TABLE hrx_offboarding_cases
  ADD COLUMN leave_reconciliation_evidence_ref TEXT;

CREATE TRIGGER IF NOT EXISTS trg_hrx_offboarding_leave_evidence_insert
BEFORE INSERT ON hrx_offboarding_cases
WHEN
  (
    NEW.leave_reconciliation_status = 'approved_and_synced'
    AND (
      NEW.leave_reconciliation_evidence_ref IS NULL
      OR LENGTH(TRIM(NEW.leave_reconciliation_evidence_ref)) = 0
    )
  )
  OR (
    NEW.leave_reconciliation_status <> 'approved_and_synced'
    AND NEW.leave_reconciliation_evidence_ref IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'offboarding leave completion and provider evidence must be recorded together');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_offboarding_leave_evidence_update
BEFORE UPDATE OF leave_reconciliation_status, leave_reconciliation_evidence_ref
ON hrx_offboarding_cases
WHEN
  (
    NEW.leave_reconciliation_status = 'approved_and_synced'
    AND (
      NEW.leave_reconciliation_evidence_ref IS NULL
      OR LENGTH(TRIM(NEW.leave_reconciliation_evidence_ref)) = 0
    )
  )
  OR (
    NEW.leave_reconciliation_status <> 'approved_and_synced'
    AND NEW.leave_reconciliation_evidence_ref IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'offboarding leave completion and provider evidence must be recorded together');
END;
