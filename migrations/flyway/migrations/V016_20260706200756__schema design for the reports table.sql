-- Migration: Create reports table without FK (partitioning limitation)
CREATE TABLE reports (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    job_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(100) NOT NULL,
    severity ENUM("low", "medium", "high", "critical") NOT NULL,
    error TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_job_id (job_id),
    KEY idx_severity_created (severity, created_at)
);

-- Trigger: Validate job_id exists in jobs before insert
DELIMITER //
CREATE TRIGGER trg_reports_job_check
BEFORE INSERT ON reports
FOR EACH ROW
BEGIN
    IF (SELECT COUNT(*) FROM jobs WHERE id = NEW.job_id) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid job_id: no matching job in jobs table';
    END IF;
END;
//
DELIMITER ;
