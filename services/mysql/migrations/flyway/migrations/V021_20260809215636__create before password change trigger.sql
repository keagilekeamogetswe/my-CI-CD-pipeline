DELIMITER //

CREATE TRIGGER before_password_change
BEFORE UPDATE ON user_authentication
FOR EACH ROW
BEGIN
    -- Only archive if password changed AND an old password actually existed
    IF OLD.password_hash IS NOT NULL AND NOT (OLD.password_hash <=> NEW.password_hash) THEN

        INSERT INTO password_history (
            user_id,
            password_hash
        )
        VALUES (
            OLD.id,
            OLD.password_hash
        );

    END IF;

END//

DELIMITER ;