CREATE TABLE password_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_history_user
        FOREIGN KEY (user_id)
        REFERENCES user_authentication(id),

    INDEX idx_password_history_user (
        user_id
    )
);