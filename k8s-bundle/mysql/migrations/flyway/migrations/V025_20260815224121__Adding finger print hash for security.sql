ALTER TABLE password_reset_tokens
ADD COLUMN fp_hash VARCHAR(255) NOT NULL AFTER token_hash;