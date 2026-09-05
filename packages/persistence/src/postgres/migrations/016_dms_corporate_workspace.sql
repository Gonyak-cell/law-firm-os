ALTER TABLE lawos_dms.upload_sessions ALTER COLUMN matter_id DROP NOT NULL;
ALTER TABLE lawos_dms.documents ALTER COLUMN matter_id DROP NOT NULL;
ALTER TABLE lawos_dms.upload_sessions ADD COLUMN workspace_authority_sha256 text
  CHECK (workspace_authority_sha256 IS NULL OR workspace_authority_sha256 ~ '^[a-f0-9]{64}$');
CREATE UNIQUE INDEX dms_corporate_workspace_legal_entity_unique
  ON lawos_domain.records (tenant_id, (payload->>'legal_entity_id'))
  WHERE domain_id = 'dms-auxiliary' AND record_type = 'DmsWorkspace'
    AND payload->>'scope_type' = 'legal_entity_administration';

CREATE FUNCTION lawos_dms.validate_corporate_workspace_record()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  workspace jsonb;
  anchor jsonb;
  anchor_type text;
  anchor_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.domain_id = 'dms-auxiliary' AND OLD.record_type = 'DmsWorkspace'
       AND OLD.payload->>'scope_type' = 'legal_entity_administration' THEN
      RAISE EXCEPTION 'Corporate workspace must be preserved' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.domain_id = 'dms-auxiliary' AND OLD.record_type = 'DmsWorkspace'
     AND OLD.payload->>'scope_type' = 'legal_entity_administration' THEN
    IF ROW(NEW.tenant_id, NEW.domain_id, NEW.record_type, NEW.record_id,
           NEW.payload - ARRAY['status', 'name', 'updated_at']) IS DISTINCT FROM
       ROW(OLD.tenant_id, OLD.domain_id, OLD.record_type, OLD.record_id,
           OLD.payload - ARRAY['status', 'name', 'updated_at']) THEN
      RAISE EXCEPTION 'Corporate workspace authority is immutable' USING ERRCODE = '55000';
    END IF;
  END IF;
  IF NEW.domain_id <> 'dms-auxiliary' OR NEW.record_type <> 'DmsWorkspace'
     OR NEW.payload->>'scope_type' IS DISTINCT FROM 'legal_entity_administration' THEN RETURN NEW; END IF;
  workspace := NEW.payload;
  IF workspace->>'tenant_id' IS DISTINCT FROM NEW.tenant_id
     OR workspace->>'workspace_id' IS DISTINCT FROM NEW.record_id
     OR workspace->>'model_type' IS DISTINCT FROM 'DmsWorkspace'
     OR workspace->'matter_id' IS DISTINCT FROM 'null'::jsonb
     OR workspace->'synthetic_only' IS DISTINCT FROM 'false'::jsonb
     OR workspace->'client_visible_by_default' IS DISTINCT FROM 'false'::jsonb
     OR nullif(workspace->>'legal_entity_id', '') IS NULL
     OR nullif(workspace->>'organization_id', '') IS NULL
     OR nullif(workspace->>'party_id', '') IS NULL
     OR nullif(workspace->>'owner_user_id', '') IS NULL
     OR nullif(workspace->>'permission_ref', '') IS NULL
     OR nullif(workspace->>'permission_envelope_id', '') IS NULL
     OR workspace->>'status' IS NULL
     OR workspace->>'status' NOT IN ('pending_anchor', 'active', 'held', 'archived') THEN
    RAISE EXCEPTION 'Corporate workspace authority is invalid' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' AND workspace->>'status' <> 'pending_anchor' THEN
    RAISE EXCEPTION 'Corporate workspace starts pending anchor' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.payload->>'scope_type' IS DISTINCT FROM 'legal_entity_administration' THEN
    RAISE EXCEPTION 'Matter workspace cannot be reassigned' USING ERRCODE = '55000';
  END IF;
  IF workspace->>'status' = 'active' THEN
    IF TG_OP = 'UPDATE' AND OLD.payload->>'status' = 'pending_anchor' AND EXISTS (
      SELECT 1 FROM lawos_dms.upload_sessions WHERE tenant_id = NEW.tenant_id
        AND workspace_id = NEW.record_id AND state <> 'finalized'
    ) THEN
      RAISE EXCEPTION 'Corporate workspace has unfinished uploads' USING ERRCODE = '23514';
    END IF;
    FOR anchor_type, anchor_id IN SELECT * FROM (VALUES
      ('Entity', workspace->>'legal_entity_id'), ('Party', workspace->>'party_id'),
      ('Organization', workspace->>'organization_id')) AS anchors(kind, id)
    LOOP
      SELECT payload INTO anchor FROM lawos_domain.records
       WHERE tenant_id = NEW.tenant_id AND domain_id = 'master-data'
         AND record_type = anchor_type AND record_id = anchor_id FOR SHARE;
      IF NOT FOUND OR anchor->>'tenant_id' IS DISTINCT FROM NEW.tenant_id
         OR anchor->>'model_type' IS DISTINCT FROM anchor_type
         OR anchor->>(CASE anchor_type WHEN 'Entity' THEN 'entity_id' WHEN 'Party' THEN 'party_id' ELSE 'organization_id' END)
           IS DISTINCT FROM anchor_id
         OR anchor->>'owner_user_id' IS DISTINCT FROM workspace->>'owner_user_id'
         OR anchor->>'permission_ref' IS DISTINCT FROM workspace->>'permission_ref'
         OR anchor->'matter_id' IS DISTINCT FROM 'null'::jsonb
         OR anchor->>'status' IS DISTINCT FROM 'active'
         OR (anchor_type = 'Entity' AND anchor->>'entity_kind' IS DISTINCT FROM 'organization')
         OR (anchor_type = 'Party' AND (anchor->>'party_type' IS DISTINCT FROM 'organization'
           OR anchor->>'canonical_entity_id' IS DISTINCT FROM workspace->>'legal_entity_id'))
         OR (anchor_type = 'Organization' AND (anchor->>'entity_id' IS DISTINCT FROM workspace->>'legal_entity_id'
           OR anchor->>'party_id' IS DISTINCT FROM workspace->>'party_id')) THEN
        RAISE EXCEPTION 'Corporate workspace anchor is invalid' USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dms_corporate_workspace_record_guard BEFORE INSERT OR UPDATE OR DELETE
ON lawos_domain.records FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_corporate_workspace_record();

CREATE FUNCTION lawos_dms.validate_corporate_document_binding()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  workspace jsonb;
  workspace_hash text;
  preservation_update boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'upload_sessions' AND TG_OP = 'UPDATE' THEN
    IF NEW.workspace_authority_sha256 IS DISTINCT FROM OLD.workspace_authority_sha256 THEN
      RAISE EXCEPTION 'Corporate upload authority digest is immutable' USING ERRCODE = '55000';
    END IF;
    -- Failure evidence must remain writable after the authority changes.
    IF NEW.state <> 'finalized' OR OLD.state = 'finalized' THEN RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME = 'documents' AND TG_OP = 'UPDATE' AND (OLD.matter_id IS NULL OR NEW.matter_id IS NULL)
     AND ROW(OLD.tenant_id, OLD.document_id, OLD.workspace_id, OLD.matter_id, OLD.permission_envelope_id)
       IS DISTINCT FROM ROW(NEW.tenant_id, NEW.document_id, NEW.workspace_id, NEW.matter_id, NEW.permission_envelope_id) THEN
    RAISE EXCEPTION 'Corporate document authority is immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_TABLE_NAME = 'documents' AND TG_OP = 'UPDATE' THEN
    preservation_update := (to_jsonb(NEW) - ARRAY['legal_hold_status', 'updated_at'])
      = (to_jsonb(OLD) - ARRAY['legal_hold_status', 'updated_at']);
  END IF;
  SELECT payload, payload_hash INTO workspace, workspace_hash FROM lawos_domain.records
   WHERE tenant_id = NEW.tenant_id AND domain_id = 'dms-auxiliary'
     AND record_type = 'DmsWorkspace' AND record_id = NEW.workspace_id FOR SHARE;
  IF NEW.matter_id IS NOT NULL THEN
    IF workspace->>'scope_type' = 'legal_entity_administration' THEN
      RAISE EXCEPTION 'Corporate document cannot reference a matter' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF workspace IS NULL OR workspace->>'scope_type' IS DISTINCT FROM 'legal_entity_administration'
     OR workspace->>'tenant_id' IS DISTINCT FROM NEW.tenant_id
     OR workspace->>'workspace_id' IS DISTINCT FROM NEW.workspace_id
     OR workspace->'matter_id' IS DISTINCT FROM 'null'::jsonb
     OR workspace->'synthetic_only' IS DISTINCT FROM 'false'::jsonb
     OR workspace->>'permission_envelope_id' IS DISTINCT FROM NEW.permission_envelope_id
     OR workspace->>'status' IS NULL
     OR (workspace->>'status' NOT IN ('pending_anchor', 'active')
       AND NOT (preservation_update AND workspace->>'status' IN ('held', 'archived'))) THEN
    RAISE EXCEPTION 'Corporate document requires canonical private workspace' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'upload_sessions' THEN
    IF NEW.workspace_authority_sha256 IS DISTINCT FROM workspace_hash
       OR NEW.actor_id IS DISTINCT FROM workspace->>'owner_user_id' THEN
      RAISE EXCEPTION 'Corporate upload owner or authority digest changed' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dms_corporate_upload_binding BEFORE INSERT OR UPDATE ON lawos_dms.upload_sessions
FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_corporate_document_binding();
CREATE TRIGGER dms_corporate_document_binding BEFORE INSERT OR UPDATE ON lawos_dms.documents
FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_corporate_document_binding();

REVOKE ALL ON FUNCTION lawos_dms.validate_corporate_workspace_record() FROM PUBLIC;
REVOKE ALL ON FUNCTION lawos_dms.validate_corporate_document_binding() FROM PUBLIC;
