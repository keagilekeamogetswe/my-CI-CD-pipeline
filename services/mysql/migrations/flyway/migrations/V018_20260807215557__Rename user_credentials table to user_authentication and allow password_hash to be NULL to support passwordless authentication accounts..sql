RENAME TABLE user_credentials TO user_authentication;

ALTER TABLE user_authentication
MODIFY password_hash VARCHAR(255) NULL;