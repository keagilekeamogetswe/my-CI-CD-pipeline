CREATE TABLE user_emails (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_emails_user
        FOREIGN KEY (user_id)
        REFERENCES user_authentication(id)
        ON DELETE CASCADE,

    INDEX idx_user_emails_user (user_id),
    UNIQUE KEY uniq_user_email (user_id, email)
);
