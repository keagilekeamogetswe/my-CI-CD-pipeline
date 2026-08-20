CREATE TABLE jobs(
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    status ENUM("queued", "running", "done", "failed") NOT NULL DEFAULT "queued",
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(id, type), -- partition key MUST be in PK
    KEY idk_status_created (status, created_at),
    KEY idx_created(created_at)
)
PARTITION BY LIST COLUMNS(type) (
    PARTITION p_session_save VALUES IN ("session.save"));