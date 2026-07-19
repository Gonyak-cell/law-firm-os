CREATE TABLE lawos_domain.outbox_events (
  tenant_id text NOT NULL,
  domain_id text NOT NULL,
  event_id text NOT NULL,
  topic text NOT NULL,
  aggregate_type text,
  aggregate_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  PRIMARY KEY (tenant_id, domain_id, event_id)
);

CREATE FUNCTION lawos_domain.reject_outbox_identity_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'domain outbox events cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF ROW(
    OLD.tenant_id, OLD.domain_id, OLD.event_id, OLD.topic,
    OLD.aggregate_type, OLD.aggregate_id, OLD.payload, OLD.created_at
  ) IS DISTINCT FROM ROW(
    NEW.tenant_id, NEW.domain_id, NEW.event_id, NEW.topic,
    NEW.aggregate_type, NEW.aggregate_id, NEW.payload, NEW.created_at
  ) THEN
    RAISE EXCEPTION 'domain outbox event identity is immutable' USING ERRCODE = '55000';
  END IF;
  IF NOT (
    NEW.status = OLD.status
    OR (OLD.status = 'pending' AND NEW.status IN ('published', 'failed'))
    OR (OLD.status = 'failed' AND NEW.status IN ('pending', 'published'))
  ) THEN
    RAISE EXCEPTION 'domain outbox status transition is invalid' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER domain_outbox_identity_guard
BEFORE UPDATE OR DELETE ON lawos_domain.outbox_events
FOR EACH ROW EXECUTE FUNCTION lawos_domain.reject_outbox_identity_mutation();

CREATE INDEX domain_outbox_pending_index
  ON lawos_domain.outbox_events (tenant_id, domain_id, status, created_at)
  WHERE status <> 'published';

ALTER TABLE lawos_domain.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.outbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY domain_outbox_tenant_policy ON lawos_domain.outbox_events
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
