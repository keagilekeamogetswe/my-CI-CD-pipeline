import { test, expect, describe, it, beforeAll, afterAll, vi } from "vitest";
import registry from "../../app/deamon/registry";
import JobProcessor from "../../app/deamon/processor";
import { Database } from "../../app/deamon/db";
import RequirementResolver from "../../app/deamon/actions/dependency/requirement.resolver";
import argon2 from "argon2";
import Collector from "../../app/deamon/metrics/collector";

describe("Job flow testing", async () => {
  let mysql_connection;
  let originalMethods;
  let user_id;

  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();

    // Generate dependent foreign key relation for job payloads
    const [user_result] = await mysql_connection.execute(
      "INSERT INTO user_credentials(password_hash) VALUES (?)",
      ["password_hash"],
    );
    user_id = user_result.insertId;

    // Purge old data to guarantee an isolated test state
    await mysql_connection.execute("DELETE FROM jobs;");

    const job_insert_query = `
    INSERT INTO jobs (type, payload)
    VALUES (
      'session.save',
      '{
        "user_id":${user_id},"jti":"jti_job_testing","token_hash":"hash_031","expires_at":"2026-12-31 23:59:59","fp_hash":"fp_031"
      }'
    );`;
    await mysql_connection.execute(job_insert_query);

    // Keep direct references to original transaction controls before mocking
    originalMethods = {
      rollback: mysql_connection.rollback.bind(mysql_connection),
      commit: mysql_connection.commit.bind(mysql_connection),
      beginTransaction:
        mysql_connection.beginTransaction.bind(mysql_connection),
      close: mysql_connection.close.bind(mysql_connection),
    };

    // Intercept transaction states to prevent individual tests from auto-committing modifications
    vi.spyOn(mysql_connection, "rollback").mockResolvedValue();
    vi.spyOn(mysql_connection, "commit").mockResolvedValue();
    vi.spyOn(mysql_connection, "beginTransaction").mockResolvedValue();
  });

  afterAll(async () => {
    try {
      // Revert all structural mutations and safely free connection pools
      await originalMethods.rollback();
      await originalMethods.close();
    } catch (error) {
      console.error(error);
    }
  });

  it("should execute job successfully", async () => {
    RequirementResolver.setupResolver("mysql_connection", mysql_connection);
    const job_type = "session.save";
    const job = registry.jobs[job_type];

    JobProcessor.setConnection(mysql_connection);
    RequirementResolver.setupResolver("mysql_connection", mysql_connection);

    const job_retrieved = await JobProcessor.claim_job();
    const job_return = await JobProcessor.run_job(job_retrieved);
    const intrinsic = { ...job_return.intrinsic };
    console.log(intrinsic);
    expect(job_return.success).toBeTruthy();
    expect(intrinsic.insertId).toBeDefined();
  });

  it("Should excute job and fail.", async () => {
    // Intercept target queue pipeline with an invalid payload structure
    vi.spyOn(JobProcessor, "claim_job").mockResolvedValue({
      id: 18,
      type: "session.save",
      payload: {},
      attempts: 0,
    });

    const job_retirved = await JobProcessor.claim_job();
    const job_run_status = await JobProcessor.run_job(job_retirved);

    expect(job_run_status.success).toBe(false);
    expect(job_run_status.intrinsic).toBeInstanceOf(Error);
  });

  it("Should use metrics", async () => {
    const job_type = "mocked.job.type";

    // Intercept the execution path to profile a deterministic Argon2 payload execution
    const runJobSpy = vi
      .spyOn(JobProcessor, "run_job")
      .mockImplementation(async () => {
        const password = "***********";
        const hash = await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 131072,
          timeCost: 60,
          parallelism: 4,
        });
        return { intrinsic: hash, success: true };
      });

    const jobMetrics = await Collector.useMetricsFrom(
      job_type,
      JobProcessor.run_job,
    );

    expect(runJobSpy).toHaveBeenCalledTimes(1);
    expect(jobMetrics.status).toBeTruthy();
    expect(typeof jobMetrics.intrinsic !== typeof new Error("")).toBeTruthy();

    const job_metrics_id = Collector.saveMetricsFrom(job_type, jobMetrics);
    if (!job_metrics_id) throw new Error("Job metrics not inserted.");

    // Validate metric generation metrics accurately map to database storage fields
    const [[retrieved_job_metrics]] = await mysql_connection.execute(
      "SELECT * FROM job_metrics WHERE job_type  = ?",
      [job_type],
    );
    expect(jobMetrics.cpuTimeMs).toBe(retrieved_job_metrics.total_cpu_time_ms);
    expect(jobMetrics.durationMs).toBe(retrieved_job_metrics.total_duration_ms);
    expect(jobMetrics.ramChangeMB).toBe(
      retrieved_job_metrics.total_ram_allocated_mb,
    );

    // Verify accumulation rollup rules apply correctly on sequential metric records
    await Collector.saveMetricsFrom(job_type, jobMetrics);
    const [[retrieved_job_metricsx2]] = await mysql_connection.execute(
      "SELECT * FROM job_metrics WHERE job_type  = ?",
      [job_type],
    );
    expect(jobMetrics.cpuTimeMs * 2).toBe(
      retrieved_job_metricsx2.total_cpu_time_ms,
    );
    expect(jobMetrics.durationMs * 2).toBe(
      retrieved_job_metricsx2.total_duration_ms,
    );
  });
});
