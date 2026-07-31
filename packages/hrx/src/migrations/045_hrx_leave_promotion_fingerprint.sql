ALTER TABLE hrx_leave_promotion_campaigns
  ADD COLUMN business_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_leave_promotion_business_fingerprint
  ON hrx_leave_promotion_campaigns (tenant_id, business_fingerprint)
  WHERE business_fingerprint IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_leave_promotion_fingerprinted_basis
  ON hrx_leave_promotion_campaigns (
    tenant_id,
    policy_version_id,
    entitlement_period_end,
    schedule_profile_id
  )
  WHERE business_fingerprint IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_promotion_fingerprint_required
BEFORE INSERT ON hrx_leave_promotion_campaigns
WHEN
  NEW.business_fingerprint IS NULL
  OR LENGTH(NEW.business_fingerprint) <> 64
  OR NEW.business_fingerprint GLOB '*[^a-f0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'leave promotion campaign business fingerprint is required');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_promotion_fingerprint_update
BEFORE UPDATE OF
  business_fingerprint,
  policy_version_id,
  entitlement_period_end,
  schedule_profile_id
ON hrx_leave_promotion_campaigns
WHEN
  NEW.business_fingerprint IS NULL
  OR LENGTH(NEW.business_fingerprint) <> 64
  OR NEW.business_fingerprint GLOB '*[^a-f0-9]*'
  OR (
    OLD.business_fingerprint IS NOT NULL
    AND (
      NEW.business_fingerprint <> OLD.business_fingerprint
      OR NEW.policy_version_id <> OLD.policy_version_id
      OR NEW.entitlement_period_end <> OLD.entitlement_period_end
      OR NEW.schedule_profile_id <> OLD.schedule_profile_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'leave promotion campaign business fingerprint is invalid or immutable');
END;
