pub const BASELINE_SCHEMA_VERSION: i64 = 5;

pub fn baseline_sql() -> &'static str {
    r#"
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      source_template_id TEXT,
      created_at_epoch_ms INTEGER NOT NULL,
      updated_at_epoch_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_sessions (
      workspace_id TEXT PRIMARY KEY,
      active_tab_id TEXT,
      active_environment_id TEXT,
      tabs_json TEXT NOT NULL,
      updated_at_epoch_ms INTEGER NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      expanded INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at_epoch_ms INTEGER NOT NULL,
      updated_at_epoch_ms INTEGER NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      collection_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      params_json TEXT NOT NULL,
      headers_json TEXT NOT NULL,
      body TEXT NOT NULL,
      body_type TEXT NOT NULL,
      body_content_type TEXT,
      form_data_fields_json TEXT NOT NULL DEFAULT '[]',
      binary_file_name TEXT,
      binary_mime_type TEXT,
      auth_json TEXT NOT NULL,
      tests_json TEXT NOT NULL DEFAULT '[]',
      mock_json TEXT NOT NULL DEFAULT 'null',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at_epoch_ms INTEGER NOT NULL,
      updated_at_epoch_ms INTEGER NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      variables_json TEXT NOT NULL,
      created_at_epoch_ms INTEGER NOT NULL,
      updated_at_epoch_ms INTEGER NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      request_id TEXT,
      request_name TEXT NOT NULL,
      request_method TEXT NOT NULL,
      request_url TEXT NOT NULL,
      request_snapshot_json TEXT NOT NULL,
      status INTEGER NOT NULL,
      status_text TEXT NOT NULL,
      elapsed_ms INTEGER NOT NULL,
      size_bytes INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      response_headers_json TEXT NOT NULL,
      response_preview TEXT NOT NULL,
      truncated INTEGER NOT NULL DEFAULT 0,
      execution_source TEXT NOT NULL DEFAULT 'live',
      executed_at_epoch_ms INTEGER NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_collections_workspace_id ON collections(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_requests_workspace_id ON requests(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_requests_collection_id ON requests(collection_id);
    CREATE INDEX IF NOT EXISTS idx_environments_workspace_id ON environments(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_history_workspace_id ON history_items(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_history_executed_at ON history_items(workspace_id, executed_at_epoch_ms DESC);
    "#
}
