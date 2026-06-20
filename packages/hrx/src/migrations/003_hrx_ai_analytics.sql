CREATE TABLE IF NOT EXISTS hrx_ai_review_items (
  tenant_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  interaction_id TEXT NOT NULL,
  state TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  answer_status TEXT NOT NULL,
  decision_domain TEXT,
  source_refs_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  resolved_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_ai_review_items_tenant_state
  ON hrx_ai_review_items (tenant_id, state);

CREATE TABLE IF NOT EXISTS hrx_ai_source_chunks (
  tenant_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  indexed_by_json TEXT NOT NULL,
  raw_payload_present INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, source_ref, chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_ai_source_chunks_source_ref
  ON hrx_ai_source_chunks (tenant_id, source_ref);

CREATE INDEX IF NOT EXISTS idx_hrx_ai_source_chunks_hash
  ON hrx_ai_source_chunks (tenant_id, chunk_hash);

CREATE TABLE IF NOT EXISTS hrx_analytics_snapshots (
  tenant_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  analytics_hash TEXT NOT NULL,
  analytics_json TEXT NOT NULL,
  snapshot_policy TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_analytics_snapshots_period
  ON hrx_analytics_snapshots (tenant_id, period_start, period_end);
