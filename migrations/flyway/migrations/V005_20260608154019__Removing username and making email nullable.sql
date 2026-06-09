ALTER TABLE user_credentials
    DROP COLUMN username,
    MODIFY email VARCHAR(255) NULL;
