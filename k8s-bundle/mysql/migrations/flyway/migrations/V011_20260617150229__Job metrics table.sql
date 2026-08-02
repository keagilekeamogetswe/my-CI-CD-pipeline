CREATE TABLE job_metrics (
    job_type VARCHAR(100) NOT NULL,
    total_jobs INT UNSIGNED DEFAULT 0,
    failed_jobs INT UNSIGNED DEFAULT 0,
    total_duration_ms DOUBLE UNSIGNED DEFAULT 0.0,
    successful_duration_ms DOUBLE UNSIGNED DEFAULT 0.0,
    max_failed_duration_ms DOUBLE UNSIGNED DEFAULT 0.0,
    max_successful_duration_ms DOUBLE UNSIGNED DEFAULT 0.0,
    total_cpu_time_ms DOUBLE UNSIGNED DEFAULT 0.0,
    total_ram_allocated_mb DOUBLE UNSIGNED DEFAULT 0.0,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (job_type)
)
