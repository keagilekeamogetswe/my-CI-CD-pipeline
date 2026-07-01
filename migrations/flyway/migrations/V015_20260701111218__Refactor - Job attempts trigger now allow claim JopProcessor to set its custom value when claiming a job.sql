-- 1. Remove the existing trigger to avoid "Trigger already exists" errors
DROP TRIGGER IF EXISTS trg_jobs_attempts_update;

-- 2. Change the delimiter so MySQL doesn't cut off execution at the first semicolon
DELIMITER //

CREATE TRIGGER trg_jobs_attempts_update
BEFORE UPDATE ON jobs
FOR EACH ROW
BEGIN
  -- Only force 'scheduled' if it's past the first attempt
  IF NEW.attempts <> OLD.attempts AND NEW.attempts > 1 THEN
    SET NEW.status = 'scheduled';
  END IF;
END;
//

DELIMITER ;
