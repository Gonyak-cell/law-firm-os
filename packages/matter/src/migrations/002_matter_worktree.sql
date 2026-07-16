CREATE TABLE IF NOT EXISTS matter_worktrees (
  tenant_id TEXT NOT NULL,
  worktree_id TEXT NOT NULL,
  matter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, worktree_id)
);

CREATE TABLE IF NOT EXISTS matter_worktree_nodes (
  tenant_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  worktree_id TEXT NOT NULL,
  matter_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  parent_node_id TEXT,
  task_id TEXT,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (tenant_id, node_id)
);

CREATE TABLE IF NOT EXISTS matter_worktree_templates (
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  practice_area TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  approval_ref TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, template_id)
);

CREATE TABLE IF NOT EXISTS matter_worktree_template_nodes (
  tenant_id TEXT NOT NULL,
  template_node_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  parent_template_node_id TEXT,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (tenant_id, template_node_id)
);
