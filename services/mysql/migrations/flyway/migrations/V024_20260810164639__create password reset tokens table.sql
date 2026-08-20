CREATE TABLE password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    verification_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,

    CONSTRAINT fk_reset_token_verification
        FOREIGN KEY (verification_id)
        REFERENCES password_reset_verifications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reset_token_user
        FOREIGN KEY (user_id)
        REFERENCES user_authentication(id)
        ON DELETE CASCADE,

    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);