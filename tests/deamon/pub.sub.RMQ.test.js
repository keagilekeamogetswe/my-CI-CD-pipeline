import { vi, afterAll, beforeAll } from "vitest";
import { expect, it, describe } from "vitest";
import { Database } from "../../app/deamon/db";
import amqp from "amqplib";
import JobProcessor from "../../app/deamon/processor";
import RequirementResolver from "../../app/deamon/actions/dependency/requirement.resolver";
import { afterEach, before, beforeEach } from "vitest";
import Scheduler from "../../app/deamon/scheduler";

describe("Testing the Scheduler flow", () => {
  let conn;
  let channel;
  let exchange;
  let routing_key;
  const queue = process.env.RMQ_DELAYED_QUEUE;
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
    RequirementResolver.setupResolver("mysql_connection", mysql_connection);

    //Rabbit MQ Configuration
    conn = await amqp.connect("amqp://localhost");
    channel = await conn.createChannel();
    const delayed_exchange = (exchange = process.env.RMQ_DELAYED_EXCHANGE);
    const delayed_queue = (routing_key = process.env.RMQ_DELAYED_QUEUE);
    await channel.assertQueue(queue);
    await channel.assertExchange(delayed_exchange, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "direct" },
    });
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
  it("Should fail a job run then schedule", async () => {
    vi.spyOn(JobProcessor, "run_job").mockResolvedValueOnce({
      success: false,
    });
    const retrieved_job = await JobProcessor.claim_job();
    // Run a failing job
    const run_job_result = await JobProcessor.run_job(retrieved_job);
    if (run_job_result.success) {
      // Set job to success on db
      const { mysql_connection } = RequirementResolver.resolve({
        mysql_connection: true,
      });
      await mysql_connection.execute(
        "UPDATE set status = 'done' where id = ?",
        [retrieved_job.id],
      );
      return null;
    }
    console.log("going");
    // failed jobs here...
    // step 1: computerise job
    // Computed job uses a proxy that triggers changes the job attempts on the database
    const computed_job = Scheduler.compute(retrieved_job);
    // step 2: change attempts
    // step 3: Producer
    // Publish via exchange with delay, not sendToQueue
    const { retries, attempts } = computed_job;
    await channel.publish(
      exchange,
      routing_key,
      Buffer.from(JSON.stringify(computed_job)),
      { headers: { "x-delay": retries[attempts] } },
    );
  });
  it("Should run a scheduled job", async () => {
    const messages = [];

    // Bind queue to exchange with routing key
    await channel.bindQueue(queue, exchange, routing_key);
    const consumePromise = new Promise((resolve) => {
      channel.consume(routing_key, (msg) => {
        messages.push(msg.content.toString());
        channel.ack(msg);
        resolve(messages);
      });
    });

    const result = await consumePromise;
    const computed_job = await Scheduler.recompute(result);
    computed_job.attempts += 1;
    const job_run_status = await JobProcessor.run_job(computed_job);
    console.log(computed_job);
    console.log(job_run_status);
    const [[session_data]] = await mysql_connection.execute(
      "SELECT * FROM user_session WHERE id = ?",
      [job_run_status.intrinsic.insertId],
    );
    console.log("session: ", session_data);
    // better assertions: verify job ran successfully and DB row matches payload fields
    expect(job_run_status).toBeDefined();
    expect(job_run_status).toHaveProperty("success", true);
    // session_data may include extra DB columns; assert it contains payload fields
    // Normalize and compare expires_at as ISO strings to avoid format mismatches
    const payload = { ...computed_job.payload };
    if (payload.expires_at) {
      const expected = new Date(payload.expires_at).toISOString();
      const actual = new Date(session_data.expires_at).toISOString();
      expect(actual).toBe(expected);
      delete payload.expires_at;
    }
    expect(session_data).toMatchObject(payload);
  }, 10000);
});
