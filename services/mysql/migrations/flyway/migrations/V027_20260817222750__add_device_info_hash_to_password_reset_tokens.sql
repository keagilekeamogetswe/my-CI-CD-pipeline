ALTER TABLE password_reset_tokens
ADD COLUMN device_info_hash VARCHAR(255) NOT NULL AFTER token_hash;
