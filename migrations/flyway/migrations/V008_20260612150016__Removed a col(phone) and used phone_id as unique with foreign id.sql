ALTER TABLE user_profiles
    DROP COLUMN phone,
    ADD COLUMN phone_id BIGINT NULL,
    ADD CONSTRAINT fk_user_profiles_phone
        FOREIGN KEY (phone_id)
        REFERENCES phone_numbers(id)
        ON DELETE SET NULL;