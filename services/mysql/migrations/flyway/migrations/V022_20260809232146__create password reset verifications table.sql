CREATE TABLE password_reset_verifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    jti VARCHAR(255) NOT NULL UNIQUE,
    verification_token_hash VARCHAR(255) NOT NULL,
    method ENUM('email', 'phone') NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP NULL DEFAULT NULL,

    CONSTRAINT fk_password_reset_user 
        FOREIGN KEY (user_id) 
        REFERENCES user_authentication(id) 
        ON DELETE CASCADE,

    INDEX idx_user_id (user_id),
    INDEX idx_jti (jti)
);