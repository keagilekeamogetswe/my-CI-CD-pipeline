const ProcessorQueries = {
  // Lock the next eligible job row
  lock: `
  SELECT id, type, payload, attempts
  FROM jobs
  WHERE status = 'queued'
  ORDER BY created_at ASC, id ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  `,

  // Claim the job for execution
  claim: `
    UPDATE jobs
    SET status = 'running',
        attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = ?;
  `,

  // Mark job as completed successfully
  complete: `
    UPDATE jobs
    SET status = 'done',
        updated_at = NOW()
    WHERE id = ?;
  `,
  // Mark job as dead letter
  falied: `
    UPDATE jobs
    SET status = 'failed',
        attempt_count = ?,
        error = ?,
        updated_at = NOW()
    WHERE id = ?;
  `,
};

export default ProcessorQueries;
