CREATE TABLE user_session (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    jti VARCHAR(255) NOT NULL UNIQUE,
    token_hash VARCHAR(225) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fp_hash VARCHAR(255) NOT NULL,
    session_type ENUM("primary", "web") NOT NULL DEFAULT "primary",
    FOREIGN KEY (user_id)
        REFERENCES user_credentials(id)
        ON DELETE CASCADE);