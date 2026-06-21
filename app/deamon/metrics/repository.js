import RequirementResolver from "../actions/dependency/requirement.resolver";
export const MetricsRepository = {
  /**
   * Saves metrics updates using an atomic UPSERT (ON DUPLICATE KEY UPDATE) statement.
   */
  async saveUsageFor(jobtype, metrics) {
    const { durationMs, cpuTimeMs, ramChangeMB, status } = metrics;

    const { mysql_connection } = RequirementResolver.resolve({
      mysql_connection: true,
    });

    const query = `
      INSERT INTO job_metrics (
        job_type, total_jobs, failed_jobs, total_duration_ms,
        successful_duration_ms, max_failed_duration_ms, max_successful_duration_ms,
        total_cpu_time_ms, total_ram_allocated_mb
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_jobs = total_jobs + 1,
        failed_jobs = failed_jobs + VALUES(failed_jobs),
        total_duration_ms = total_duration_ms + VALUES(total_duration_ms),
        successful_duration_ms = successful_duration_ms + VALUES(successful_duration_ms),
        max_failed_duration_ms = GREATEST(max_failed_duration_ms, VALUES(max_failed_duration_ms)),
        max_successful_duration_ms = GREATEST(max_successful_duration_ms, VALUES(max_successful_duration_ms)),
        total_cpu_time_ms = total_cpu_time_ms + VALUES(total_cpu_time_ms),
        total_ram_allocated_mb = total_ram_allocated_mb + VALUES(total_ram_allocated_mb);
    `;

    // Map specific variable updates dynamically based on the job outcome status
    const failedIncrement = status ? 0 : 1;
    const successfulDuration = status ? durationMs : 0;
    const maxFailedDuration = status ? 0 : durationMs;
    const maxSuccessfulDuration = status ? durationMs : 0;

    const values = [
      jobtype,
      failedIncrement,
      durationMs,
      successfulDuration,
      maxFailedDuration,
      maxSuccessfulDuration,
      cpuTimeMs,
      ramChangeMB,
    ];

    try {
      const result = mysql_connection.execute(query, values);
      return result;
    } catch (dbError) {
      console.error(
        `Database mutation error for job type [${jobtype}]:`,
        dbError,
      );
      throw dbError; // Bubble up execution breaks to the runner container
    }
  },
};
