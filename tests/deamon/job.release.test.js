import { test, expect, describe, it, beforeAll, afterAll, vi } from "vitest";
import JobProcessor from "../../app/deamon/processor";
import { Database } from "../../app/deamon/db";
import RequirementResolver from "../../app/deamon/actions/dependency/requirement.resolver";

describe("Job flow integration testing", () => {
  let mysql_connection;
  let job_id;

  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();

    // 1. Intercept transaction methods to prevent JobProcessor from breaking out of our test box
    vi.spyOn(mysql_connection, "beginTransaction").mockResolvedValue();
    vi.spyOn(mysql_connection, "commit").mockResolvedValue();
    vi.spyOn(mysql_connection, "rollback").mockResolvedValue();

    // 2. Bind JobProcessor to our exact, transaction-controlled connection
    vi.spyOn(RequirementResolver, "resolve").mockReturnValue({
      mysql_connection: mysql_connection,
    });

    // 3. START THE TRANSACTION: This creates our isolated sandbox environment
    await mysql_connection.query("START TRANSACTION;");

    // 4. Inject the test job fixture safely (No need to truncate tables!)
    const job_insert_query = `
    INSERT INTO jobs (type, status, payload, attempts)
    VALUES (
      'session.save',
      'queued',
      '{"some_payload_attribute":"some_payload_value"}',
      0
    );`;
    const [job_result] = await mysql_connection.execute(job_insert_query);
    job_id = job_result.insertId;
  });

  afterAll(async () => {
    try {
      // 5. ROLLBACK EVERYTHING: Instantly undoes the INSERT and all subsequent updates
      await mysql_connection.query("ROLLBACK;");
      await mysql_connection.end();
    } catch (error) {
      console.error("Cleanup connection failure:", error);
    }
    vi.restoreAllMocks();
  });

  it("should successfully lifecycle a job from claim to release", async () => {
    // Act: Claim the job
    const job = await JobProcessor.claim_job();

    expect(job).toBeDefined();
    expect(job.id).toBe(job_id);

    // Verify DB State: Validate running conditions
    const [runningRows] = await mysql_connection.execute(
      "SELECT status, attempts FROM jobs WHERE id = ?",
      [job_id],
    );
    expect(runningRows[0].status).toBe("running");
    expect(runningRows[0].attempts).toBe(1);

    // Act: Release the job
    const release_success = await JobProcessor.release_job(job);
    expect(release_success).toBe(true);

    // Verify DB State: Confirm properties cleanly reversed back to rest values
    const [releasedRows] = await mysql_connection.execute(
      "SELECT status, attempts FROM jobs WHERE id = ?",
      [job_id],
    );
    expect(releasedRows[0].status).toBe("queued");
    expect(releasedRows[0].attempts).toBe(0);
  });
});
