CREATE TABLE IF NOT EXISTS lawos_email_dms.outlook_desktop_release_artifacts (
  tenant_id text NOT NULL,
  release_artifact_id text NOT NULL
    CHECK (char_length(release_artifact_id) BETWEEN 1 AND 200),
  release_ticket_id text NOT NULL
    CHECK (char_length(release_ticket_id) BETWEEN 1 AND 200),
  release_ticket_key_id text NOT NULL
    CHECK (char_length(release_ticket_key_id) BETWEEN 1 AND 200),
  platform text NOT NULL
    CHECK (platform IN ('darwin', 'win32')),
  channel text NOT NULL
    CHECK (channel = 'formal'),
  app_version text NOT NULL
    CHECK (app_version ~ '^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$'),
  app_id text NOT NULL
    CHECK (app_id = 'com.amic.matter.desktop'),
  arch text NOT NULL
    CHECK (
      (platform = 'darwin' AND arch IN ('arm64', 'x64'))
      OR (platform = 'win32' AND arch = 'x64')
    ),
  source_sha text NOT NULL
    CHECK (source_sha ~ '^[a-f0-9]{40}$'),
  source_tree text NOT NULL
    CHECK (source_tree ~ '^[a-f0-9]{40}$'),
  embedded_build_manifest_sha256 text NOT NULL
    CHECK (embedded_build_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  embedded_inner_artifact_sha256 text NOT NULL
    CHECK (embedded_inner_artifact_sha256 ~ '^[a-f0-9]{64}$'),
  embedded_inner_artifact_bytes bigint NOT NULL
    CHECK (embedded_inner_artifact_bytes BETWEEN 1 AND 536870912),
  embedded_release_ticket_sha256 text NOT NULL
    CHECK (embedded_release_ticket_sha256 ~ '^[a-f0-9]{64}$'),
  embedded_release_ticket_signature_sha256 text NOT NULL
    CHECK (embedded_release_ticket_signature_sha256 ~ '^[a-f0-9]{64}$'),
  final_artifact_sha256 text NOT NULL
    CHECK (final_artifact_sha256 ~ '^[a-f0-9]{64}$'),
  final_artifact_bytes bigint NOT NULL
    CHECK (final_artifact_bytes BETWEEN 1 AND 8589934592),
  approval_sha256 text NOT NULL
    CHECK (approval_sha256 ~ '^[a-f0-9]{64}$'),
  trust_registry_sha256 text NOT NULL
    CHECK (trust_registry_sha256 ~ '^[a-f0-9]{64}$'),
  trust_registry_serial bigint NOT NULL
    CHECK (trust_registry_serial >= 1),
  signature_algorithm text NOT NULL
    CHECK (signature_algorithm = 'Ed25519'),
  macos_team_id text
    CHECK (macos_team_id IS NULL OR macos_team_id ~ '^[A-Z0-9]{10}$'),
  macos_certificate_sha256 text
    CHECK (macos_certificate_sha256 IS NULL OR macos_certificate_sha256 ~ '^[a-f0-9]{64}$'),
  macos_certificate_valid_from timestamptz,
  macos_certificate_valid_until timestamptz,
  macos_signature_valid boolean,
  macos_notarized boolean,
  macos_stapled boolean,
  macos_gatekeeper_status text NOT NULL
    CHECK (macos_gatekeeper_status IN ('accepted', 'not_applicable')),
  macos_technical_evidence_sha256 text
    CHECK (macos_technical_evidence_sha256 IS NULL OR macos_technical_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  macos_evidence_observed_at timestamptz,
  macos_evidence_expires_at timestamptz,
  windows_authenticode_status text NOT NULL
    CHECK (windows_authenticode_status IN ('valid', 'not_applicable')),
  ticket_issued_at timestamptz NOT NULL,
  ticket_expires_at timestamptz NOT NULL,
  approved_at timestamptz NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  revoked_at timestamptz,
  revocation_reason text
    CHECK (revocation_reason IS NULL OR char_length(revocation_reason) BETWEEN 1 AND 100),
  PRIMARY KEY (tenant_id, release_artifact_id),
  UNIQUE (tenant_id, release_ticket_id),
  UNIQUE (tenant_id, embedded_release_ticket_sha256),
  UNIQUE (tenant_id, embedded_release_ticket_signature_sha256),
  UNIQUE (tenant_id, final_artifact_sha256),
  CHECK (ticket_expires_at > ticket_issued_at),
  CHECK (approved_at BETWEEN ticket_issued_at AND valid_from),
  CHECK (valid_from >= ticket_issued_at),
  CHECK (valid_until > valid_from AND valid_until <= ticket_expires_at),
  CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL)
    OR (
      revoked_at IS NOT NULL
      AND revoked_at >= approved_at
      AND revocation_reason IS NOT NULL
    )
  ),
  CHECK (
    (
      platform = 'darwin'
      AND macos_team_id IS NOT NULL
      AND macos_certificate_sha256 IS NOT NULL
      AND macos_certificate_valid_from IS NOT NULL
      AND macos_certificate_valid_until IS NOT NULL AND macos_certificate_valid_until > macos_certificate_valid_from
      AND macos_signature_valid IS TRUE
      AND macos_notarized IS TRUE
      AND macos_stapled IS TRUE
      AND macos_gatekeeper_status = 'accepted'
      AND macos_technical_evidence_sha256 IS NOT NULL
      AND macos_evidence_observed_at IS NOT NULL AND macos_evidence_observed_at >= macos_certificate_valid_from
      AND macos_evidence_observed_at < macos_certificate_valid_until
      AND macos_evidence_observed_at <= approved_at
      AND approved_at >= macos_certificate_valid_from
      AND approved_at < macos_certificate_valid_until
      AND macos_evidence_expires_at IS NOT NULL AND macos_evidence_expires_at > macos_evidence_observed_at
      AND valid_from >= macos_certificate_valid_from
      AND valid_until <= macos_certificate_valid_until
      AND valid_until <= macos_evidence_expires_at
      AND windows_authenticode_status = 'not_applicable'
    )
    OR (
      platform = 'win32'
      AND macos_team_id IS NULL
      AND macos_certificate_sha256 IS NULL
      AND macos_certificate_valid_from IS NULL
      AND macos_certificate_valid_until IS NULL
      AND macos_signature_valid IS NULL
      AND macos_notarized IS NULL
      AND macos_stapled IS NULL
      AND macos_gatekeeper_status = 'not_applicable'
      AND macos_technical_evidence_sha256 IS NULL
      AND macos_evidence_observed_at IS NULL
      AND macos_evidence_expires_at IS NULL
      AND windows_authenticode_status = 'valid'
    )
  )
);
CREATE INDEX IF NOT EXISTS outlook_desktop_release_active_idx
  ON lawos_email_dms.outlook_desktop_release_artifacts
    (tenant_id, platform, channel, app_version, valid_until)
  WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS lawos_email_dms.outlook_desktop_release_trust_audit_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL
    CHECK (char_length(event_id) BETWEEN 1 AND 200),
  release_artifact_id text NOT NULL,
  event_type text NOT NULL
    CHECK (event_type IN ('approved', 'revoked')),
  release_ticket_sha256 text NOT NULL
    CHECK (release_ticket_sha256 ~ '^[a-f0-9]{64}$'),
  final_artifact_sha256 text NOT NULL
    CHECK (final_artifact_sha256 ~ '^[a-f0-9]{64}$'),
  approval_sha256 text NOT NULL
    CHECK (approval_sha256 ~ '^[a-f0-9]{64}$'),
  event_binding_sha256 text NOT NULL
    CHECK (event_binding_sha256 ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz NOT NULL
    CHECK (occurred_at = date_trunc('milliseconds', occurred_at)),
  PRIMARY KEY (tenant_id, event_id),
  UNIQUE (tenant_id, release_artifact_id, event_type),
  FOREIGN KEY (tenant_id, release_artifact_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_artifacts (tenant_id, release_artifact_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS outlook_desktop_release_audit_artifact_idx
  ON lawos_email_dms.outlook_desktop_release_trust_audit_events
    (tenant_id, release_artifact_id, occurred_at);
CREATE OR REPLACE FUNCTION lawos_email_dms.outlook_desktop_release_audit_binding_sha256(
  bound_tenant_id text, bound_event_id text, bound_artifact_id text, bound_event_type text,
  bound_ticket_sha256 text, bound_final_sha256 text, bound_approval_sha256 text, bound_occurred_at timestamptz
) RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path = pg_catalog AS $$
  SELECT encode(sha256(convert_to(string_agg(octet_length(value)::text || ':' || value, '' ORDER BY position), 'UTF8')), 'hex')
    FROM unnest(ARRAY['law-firm-os.outlook-desktop-release-audit-event.v1', bound_tenant_id,
      bound_event_id, bound_artifact_id, bound_event_type, bound_ticket_sha256, bound_final_sha256,
      bound_approval_sha256, ((extract(epoch FROM bound_occurred_at) * 1000)::bigint)::text])
      WITH ORDINALITY AS binding(value, position)
$$;
CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_release_audit_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE artifact lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
BEGIN
  SELECT * INTO artifact FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id = NEW.tenant_id AND release_artifact_id = NEW.release_artifact_id;
  IF NOT FOUND
     OR NEW.release_ticket_sha256 <> artifact.embedded_release_ticket_sha256
     OR NEW.final_artifact_sha256 <> artifact.final_artifact_sha256
     OR NEW.approval_sha256 <> artifact.approval_sha256
     OR NEW.event_binding_sha256 <> lawos_email_dms.outlook_desktop_release_audit_binding_sha256(
       NEW.tenant_id, NEW.event_id, NEW.release_artifact_id, NEW.event_type,
       NEW.release_ticket_sha256, NEW.final_artifact_sha256, NEW.approval_sha256, NEW.occurred_at)
     OR (NEW.event_type = 'approved' AND NEW.occurred_at <> artifact.approved_at)
     OR (NEW.event_type = 'revoked' AND (artifact.revoked_at IS NULL OR NEW.occurred_at <> artifact.revoked_at)) THEN
    RAISE EXCEPTION 'outlook desktop release audit must bind exact artifact state';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS outlook_desktop_release_audit_binding ON lawos_email_dms.outlook_desktop_release_trust_audit_events;
CREATE TRIGGER outlook_desktop_release_audit_binding
  BEFORE INSERT ON lawos_email_dms.outlook_desktop_release_trust_audit_events
  FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.enforce_outlook_desktop_release_audit_binding();

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_release_revocation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'outlook desktop approved release rows cannot be deleted';
  END IF;
  IF OLD.revoked_at IS NOT NULL
     OR NEW.revoked_at IS NULL
     OR NEW.revocation_reason IS NULL
     OR NEW.revoked_at < OLD.approved_at
     OR (to_jsonb(NEW) - 'revoked_at' - 'revocation_reason')
        IS DISTINCT FROM
        (to_jsonb(OLD) - 'revoked_at' - 'revocation_reason') THEN
    RAISE EXCEPTION 'outlook desktop approved release rows allow one monotonic revocation only';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS outlook_desktop_release_revocation_only ON lawos_email_dms.outlook_desktop_release_artifacts;
CREATE TRIGGER outlook_desktop_release_revocation_only
  BEFORE UPDATE OR DELETE ON lawos_email_dms.outlook_desktop_release_artifacts
  FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.enforce_outlook_desktop_release_revocation();

DROP TRIGGER IF EXISTS outlook_desktop_release_audit_immutable ON lawos_email_dms.outlook_desktop_release_trust_audit_events;
CREATE TRIGGER outlook_desktop_release_audit_immutable
  BEFORE UPDATE OR DELETE ON lawos_email_dms.outlook_desktop_release_trust_audit_events
  FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.reject_outlook_desktop_immutable_mutation();

GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app;
GRANT SELECT, INSERT, UPDATE ON lawos_email_dms.outlook_desktop_release_artifacts TO lawos_app;
GRANT SELECT, INSERT ON lawos_email_dms.outlook_desktop_release_trust_audit_events TO lawos_app;

ALTER TABLE lawos_email_dms.outlook_desktop_release_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_release_trust_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_release_artifacts FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_release_trust_audit_events FORCE ROW LEVEL SECURITY;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'outlook_desktop_release_artifacts',
    'outlook_desktop_release_trust_audit_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON lawos_email_dms.%I', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON lawos_email_dms.%I USING (tenant_id = lawos_security.current_tenant_id()) WITH CHECK (tenant_id = lawos_security.current_tenant_id())', table_name);
  END LOOP;
END
$$;
