DELIMITER //

CREATE TRIGGER trg_jobs_attempts_update
BEFORE UPDATE ON jobs
FOR EACH ROW
BEGIN
  -- If attempts value is changing, set status to 'scheduled'
  IF NEW.attempts <> OLD.attempts THEN
    SET NEW.status = 'scheduled';
  END IF;
END;
//

DELIMITER ;
