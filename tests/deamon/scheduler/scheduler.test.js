import { vi, afterAll, beforeAll, describe, it, expect } from "vitest";
import { Database } from "../../../app/deamon/db";
import amqp from "amqplib";
import JobProcessor from "../../../app/deamon/processor";
import RequirementResolver from "../../../app/deamon/actions/dependency/requirement.resolver";
import Scheduler from "../../../app/deamon/scheduler";
import { RabbitMQ } from "../../../app/deamon/rabbitmq";

describe("Testing the Scheduler flow with consumer_logic", () => {
  let conn;
  let channel;
  let exchange;
  let routing_key;
  const queue = process.env.RMQ_DELAYED_QUEUE;
  const deadLetterQueue = process.env.RMQ_DEAD_LETTER_QUEUE;
  let mysql_connection;
  let originalMethods;
  let user_id;

  beforeAll(async () => {
    conn = mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();

    // Insert a user to satisfy FK constraints
    const [user_result] = await mysql_connection.execute(
      "INSERT INTO user_credentials(password_hash) VALUES (?)",
      ["password_hash"],
    );
    user_id = user_result.insertId;

    // Clean jobs table
    await mysql_connection.execute("DELETE FROM jobs;");

    // Insert a job payload
    await mysql_connection.execute(`
      INSERT INTO jobs (type, payload)
      VALUES (
        'session.save',
        '{
          "user_id":${user_id},"jti":"jti_job_testing","token_hash":"hash_031",
          "expires_at":"2026-12-31 23:59:59","fp_hash":"fp_031"
        }'
      );
    `);

    originalMethods = {
      rollback: mysql_connection.rollback.bind(mysql_connection),
      commit: mysql_connection.commit.bind(mysql_connection),
      beginTransaction:
        mysql_connection.beginTransaction.bind(mysql_connection),
      close: mysql_connection.close.bind(mysql_connection),
    };

    // Prevent auto-commit in tests
    vi.spyOn(mysql_connection, "rollback").mockResolvedValue();
    vi.spyOn(mysql_connection, "commit").mockResolvedValue();
    vi.spyOn(mysql_connection, "beginTransaction").mockResolvedValue();
    RequirementResolver.setupResolver("mysql_connection", mysql_connection);
    const delayed_channel = await RabbitMQ.getChannel();
    const none_delayed_channel = await RabbitMQ.getChannel(false);

    channel = delayed_channel;
    RequirementResolver.setupResolver("delayed_channel", delayed_channel);
    RequirementResolver.setupResolver(
      "none_delayed_channel",
      none_delayed_channel,
    );
  });

  afterAll(async () => {
    try {
      await originalMethods.rollback();
      await originalMethods.close();
      await channel.close();
      await conn.close();
    } catch (error) {
      console.error(error);
    }
  });

  it("Should fail a job run then schedule via consumer_logic", async () => {
    // Force first run to fail

    const retrieved_job = await JobProcessor.claim_job();
    const computed_job = Scheduler.compute(retrieved_job);

    const result = await Scheduler.schedule_job(computed_job);

    // Verify job status in DB
    const [[job_row]] = await mysql_connection.execute(
      "SELECT status FROM jobs WHERE id = ?",
      [retrieved_job.id],
    );
    //When attempt is updated the job is automatically set to scheduled
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve();
      }, 60),
    );
    expect(["failed", "scheduled"]).toContain(job_row.status);
    expect(result).toHaveProperty("success", true);
  }, 20000);

  it("Should run a scheduled job successfully via consumer_logic", async () => {
    const { delayed_channel } = RequirementResolver.resolve({
      delayed_channel: true,
    });
    const consumePromise = await new Promise((resolve) => {
      delayed_channel.consume(process.env.RMQ_DELAYED_QUEUE, (msg) => {
        delayed_channel.ack(msg);
        resolve(msg.content.toString());
      });
    });

    const computed_job = await Scheduler.recompute(consumePromise);
    console.log();
    const job_run_status = await Scheduler.consumer_logic(computed_job);
    // Verify DB row in user_session
    const [[session_data]] = await mysql_connection.execute(
      "SELECT * FROM user_session WHERE id = ?",
      [job_run_status.intrinsic.insertId],
    );
    console.log({ job_run_status });
    expect(job_run_status).toBeDefined();
    expect(job_run_status).toHaveProperty("success", true);

    const payload = { ...computed_job.payload };
    if (payload.expires_at) {
      const expected = new Date(payload.expires_at).toISOString();
      const actual = new Date(session_data.expires_at).toISOString();
      expect(actual).toBe(expected);
      delete payload.expires_at;
    }
    expect(session_data).toMatchObject(payload);
  }, 10000);

  it("Should push to dead-letter queue after max retries", async () => {
    const { none_delayed_channel } = RequirementResolver.resolve({
      none_delayed_channel: true,
    });
    // Insert a job with a type that always fails
    await mysql_connection.execute(`
      INSERT INTO jobs (type, payload)
      VALUES (
        'session.save',
        '{
          "user_id":${user_id},"jti":"jti_dead_letter_testing","token_hash":"hash_031",
          "expires_at":"2026-12-31 23:59:59","fp_hash":"fp_031"
        }'
      );
    `);
    vi.spyOn(JobProcessor, "run_job").mockReturnValueOnce({ success: false });

    const retrieved_job = await JobProcessor.claim_job();
    const computed_job = Scheduler.compute(retrieved_job);
    computed_job["attempts"] = 20;
    await mysql_connection
      .execute("SELECT status FROM jobs WHERE id = ?", [retrieved_job.id])
      .then((data) => {
        const [[retrieved]] = data;
        expect(retrieved).toHaveProperty("status", "scheduled");
      });

    // Run consumer logic until retries exhausted
    await Scheduler.consumer_logic(computed_job);

    // Check DB status
    const [[job_row]] = await mysql_connection.execute(
      "SELECT status FROM jobs WHERE id = ?",
      [retrieved_job.id],
    );
    expect(job_row.status).toBe("failed");
    // Consume from dead-letter queue
    const consumePromise = new Promise((resolve) => {
      none_delayed_channel.consume(deadLetterQueue, (msg) => {
        const payload = JSON.parse(msg.content.toString());
        channel.ack(msg);
        resolve(payload);
      });
    });

    const deadLetterJob = await consumePromise;
    expect(deadLetterJob.id).toBe(retrieved_job.id);
  }, 15000);
});
