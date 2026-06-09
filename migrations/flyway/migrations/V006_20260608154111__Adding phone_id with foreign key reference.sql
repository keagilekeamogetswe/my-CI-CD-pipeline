ALTER TABLE user_credentials
    ADD COLUMN phone_id BIGINT NULL,
    ADD CONSTRAINT fk_user_phone FOREIGN KEY (phone_id) REFERENCES phone_numbers(id);
