ALTER TABLE requests ADD COLUMN body_content_type TEXT;
ALTER TABLE requests ADD COLUMN form_data_fields_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE requests ADD COLUMN binary_file_name TEXT;
ALTER TABLE requests ADD COLUMN binary_mime_type TEXT;
