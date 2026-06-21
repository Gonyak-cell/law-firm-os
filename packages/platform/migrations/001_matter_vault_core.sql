-- Matter-Vault Integration R4 Migration Skeleton
-- Version: v1.0
-- This SQL is a developer handoff skeleton. Adapt types and constraints to the selected production DB.

create table if not exists matter_vault_links (
  tenant_id text not null,
  matter_id text not null,
  vault_workspace_id text not null,
  default_folder_id text,
  permission_envelope_id text not null,
  status text not null default 'active',
  source_transaction_id text not null,
  audit_event_id text not null,
  created_by_actor_id text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, matter_id),
  unique (tenant_id, vault_workspace_id)
);

create table if not exists vault_workspaces (
  tenant_id text not null,
  vault_workspace_id text not null,
  workspace_type text not null,
  matter_id text,
  name text not null,
  status text not null,
  permission_envelope_id text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, vault_workspace_id)
);

create table if not exists dms_folders (
  tenant_id text not null,
  folder_id text not null,
  vault_workspace_id text not null,
  parent_folder_id text,
  name text not null,
  path text not null,
  permission_ref text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, folder_id)
);

create table if not exists dms_documents (
  tenant_id text not null,
  document_id text not null,
  vault_workspace_id text not null,
  matter_id text,
  folder_id text,
  title text not null,
  status text not null,
  current_version_id text,
  privilege_label_id text,
  legal_hold_status text not null default 'none',
  permission_envelope_id text not null,
  created_by_actor_id text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, document_id)
);

create table if not exists dms_document_versions (
  tenant_id text not null,
  version_id text not null,
  document_id text not null,
  version_number integer not null,
  file_object_id text not null,
  sha256 text not null,
  status text not null,
  created_by_actor_id text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, version_id),
  unique (tenant_id, document_id, version_number)
);

create table if not exists dms_file_objects (
  tenant_id text not null,
  file_object_id text not null,
  storage_ref text not null,
  storage_provider text not null,
  sha256 text not null,
  byte_size bigint not null,
  mime_type text not null,
  raw_path_exposed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (tenant_id, file_object_id)
);

create table if not exists matter_timeline_events (
  tenant_id text not null,
  matter_id text not null,
  event_id text primary key,
  source_module text not null,
  source_object_type text not null,
  source_object_id text not null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  display_title text not null,
  safe_summary jsonb not null
);

create table if not exists integration_outbox (
  event_id text primary key,
  tenant_id text not null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
