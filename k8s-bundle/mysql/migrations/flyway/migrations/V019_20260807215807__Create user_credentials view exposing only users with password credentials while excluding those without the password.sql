CREATE VIEW user_credentials AS
SELECT
    id,
    password_hash,
    email,
    role,
    created_at,
    updated_at,
    last_login,
    status
FROM user_authentication
WHERE password_hash IS NOT NULL;