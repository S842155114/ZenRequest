ALTER TABLE requests ADD COLUMN execution_options_json TEXT NOT NULL DEFAULT '{"timeoutMs":null,"redirectPolicy":"follow","proxy":{"mode":"inherit"},"verifySsl":true}';
