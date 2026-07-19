ALTER TABLE lawos_identity.break_glass_requests
  ADD COLUMN break_glass_account_ref text,
  ADD COLUMN minimum_privilege_profile text NOT NULL DEFAULT 'break_glass_minimum',
  ADD COLUMN required_approvals integer NOT NULL DEFAULT 2 CHECK (required_approvals >= 2),
  ADD COLUMN approval_count integer NOT NULL DEFAULT 0 CHECK (approval_count >= 0),
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN activated_at timestamptz;

ALTER TABLE lawos_identity.break_glass_requests
  ADD CONSTRAINT break_glass_approval_count_check CHECK (approval_count <= required_approvals),
  ADD CONSTRAINT break_glass_approved_state_check CHECK (
    state <> 'approved'
    OR (approval_count >= required_approvals AND activated_at IS NOT NULL)
  );

CREATE TABLE lawos_identity.break_glass_approvals (
  tenant_id text NOT NULL,
  approval_id text NOT NULL,
  break_glass_request_id text NOT NULL,
  approver_id text NOT NULL,
  approved_at timestamptz NOT NULL,
  evidence_sha256 text CHECK (evidence_sha256 IS NULL OR evidence_sha256 ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY (tenant_id, approval_id),
  UNIQUE (tenant_id, break_glass_request_id, approver_id),
  FOREIGN KEY (tenant_id, break_glass_request_id)
    REFERENCES lawos_identity.break_glass_requests (tenant_id, break_glass_request_id)
    ON DELETE RESTRICT
);

CREATE FUNCTION lawos_identity.validate_break_glass_request_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  derived_approval_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'break-glass requests cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'pending' OR NEW.approval_count <> 0 OR NEW.activated_at IS NOT NULL THEN
      RAISE EXCEPTION 'break-glass requests must start pending without approvals' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(OLD.tenant_id, OLD.break_glass_request_id, OLD.requester_user_id, OLD.requester_label,
         OLD.reason, OLD.requested_at, OLD.break_glass_account_ref, OLD.minimum_privilege_profile,
         OLD.required_approvals, OLD.expires_at)
     IS DISTINCT FROM
     ROW(NEW.tenant_id, NEW.break_glass_request_id, NEW.requester_user_id, NEW.requester_label,
         NEW.reason, NEW.requested_at, NEW.break_glass_account_ref, NEW.minimum_privilege_profile,
         NEW.required_approvals, NEW.expires_at) THEN
    RAISE EXCEPTION 'break-glass request identity is immutable' USING ERRCODE = '55000';
  END IF;
  SELECT count(*)::integer
    INTO derived_approval_count
    FROM lawos_identity.break_glass_approvals
   WHERE tenant_id = NEW.tenant_id
     AND break_glass_request_id = NEW.break_glass_request_id;
  IF NEW.approval_count IS DISTINCT FROM derived_approval_count THEN
    RAISE EXCEPTION 'break-glass approval count must match immutable approval rows' USING ERRCODE = '55000';
  END IF;
  IF NOT (
    NEW.state = OLD.state
    OR (OLD.state = 'pending' AND NEW.state IN ('approved', 'revoked'))
    OR (OLD.state = 'approved' AND NEW.state = 'revoked')
  ) THEN
    RAISE EXCEPTION 'break-glass state transition is invalid' USING ERRCODE = '55000';
  END IF;
  IF NEW.state = 'approved' AND (derived_approval_count < NEW.required_approvals OR NEW.activated_at IS NULL) THEN
    RAISE EXCEPTION 'break-glass activation requires multiple approvals' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER break_glass_requests_guard
BEFORE INSERT OR UPDATE OR DELETE ON lawos_identity.break_glass_requests
FOR EACH ROW EXECUTE FUNCTION lawos_identity.validate_break_glass_request_update();

CREATE FUNCTION lawos_identity.reject_break_glass_approval_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'break-glass approvals are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER break_glass_approvals_append_only
BEFORE UPDATE OR DELETE ON lawos_identity.break_glass_approvals
FOR EACH ROW EXECUTE FUNCTION lawos_identity.reject_break_glass_approval_mutation();

ALTER TABLE lawos_identity.break_glass_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.break_glass_approvals FORCE ROW LEVEL SECURITY;

CREATE POLICY identity_break_glass_approvals_tenant_policy ON lawos_identity.break_glass_approvals
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
