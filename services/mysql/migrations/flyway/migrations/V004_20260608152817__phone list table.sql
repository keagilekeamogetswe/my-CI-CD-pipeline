CREATE TABLE phone_numbers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- Foreign key linking back to your master dial_codes table
    dial_code_id SMALLINT NOT NULL,
    -- Standardized length; E.164 numbers max out at 15 digits
    phone_body VARCHAR(15) NOT NULL,
    -- Tracks which user added it
    initiated_by BIGINT NULL,
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints & Relationships
    FOREIGN KEY (dial_code_id) REFERENCES dial_codes(id),
    FOREIGN KEY (initiated_by) REFERENCES user_credentials(id) ON DELETE CASCADE,
    -- Prevents the exact same phone number from being duplicated
    CONSTRAINT uq_phone_number UNIQUE (dial_code_id, phone_body, initiated_by)
);