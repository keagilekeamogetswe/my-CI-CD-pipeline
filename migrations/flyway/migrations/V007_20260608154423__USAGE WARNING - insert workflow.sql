-- Important: Because of the circular reference, inserts must be done in two steps:
-- Insert into user_credentials without phone_id.
-- Insert into phone_numbers referencing that user.
-- Update user_credentials.phone_id to point back to the phone record.

-- Insert workflow
-- Step 1: Insert a user without phone_id sql
-- INSERT INTO user_credentials (email, password_hash, role, status)
-- VALUES ('alice@example.com', 'hashed_password_here', 'user', 'active');
-- This creates a user (say id = 1) but leaves phone_id as NULL.

--Step 2: Insert a phone number referencing the user sql
-- INSERT INTO phone_numbers (user_id, dial_code, phone_body, initiated_by)
-- VALUES (1, '+27', '1234567890', NULL);
-- This creates a phone record (say id = 1) linked to user_id = 1.
-- initiated_by can be NULL or another user’s ID.

-- Step 3: Update the user to reference the phone

-- UPDATE user_credentials
-- SET phone_id = 1
-- WHERE id = 1;