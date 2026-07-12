import { Database } from "../../app/deamon/db";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodemailer from "nodemailer";
import ReportProcess from "../../app/deamon/report";
import Scheduler from "../../app/deamon/scheduler";
import RequirementResolver from "../../app/deamon/actions/dependency/requirement.resolver";
import { RabbitMQ } from "../../app/deamon/rabbitmq";
import { resolve } from "node:dns";
import JobProcessor from "../../app/deamon/processor";

const transporter = nodemailer.createTransport({
  host: "127.0.0.1",
  port: 1025,
  secure: false,
});

const MAILPIT_API_URL = "http://127.0.0.1:8025/api/v1/messages";

describe("Report", () => {
  let mysql_connection;
  let job_id;
  let job_claimed;
  let channel;
  beforeEach(async () => {
    mysql_connection = await Database.getSQLConnection();
    channel = await RabbitMQ.getChannel(false);
    await channel.assertExchange(
      process.env.RMQ_DEAD_LETTER_EXCHANGE,
      "direct",
      { durable: true },
    );
    await channel.assertQueue(process.env.RMQ_DEAD_LETTER_QUEUE, {
      durable: true,
    });
    await channel.bindQueue(
      process.env.RMQ_DEAD_LETTER_QUEUE,
      process.env.RMQ_DEAD_LETTER_EXCHANGE,
      process.env.RMQ_DEAD_LETTER_QUEUE,
    );
    await mysql_connection.beginTransaction();
    RequirementResolver.setupResolver("mysql_connection", mysql_connection);

    RequirementResolver.setupResolver(
      "delayed_channel",
      await RabbitMQ.getChannel(true),
    );
    RequirementResolver.setupResolver(
      "none_delayed_channel",
      await RabbitMQ.getChannel(false),
    );

    // Insert a job
    const [jobResult] = await mysql_connection.execute(
      "INSERT INTO jobs(payload, type, attempts) VALUES (?, ?, ?)",
      [JSON.stringify({}), "session.save", 1],
    );
    job_id = jobResult.insertId;
    // Set claimed job
    [[job_claimed]] = await mysql_connection.execute(
      "SELECT * FROM jobs WHERE id = ?",
      [job_id],
    );
  });

  afterEach(async () => {
    if (mysql_connection) {
      await mysql_connection.rollback();
      await mysql_connection.close();
    }
    await RabbitMQ.closeConnections();
  });

  it("should test insert report", async () => {
    const error = new Error("Some error - sanitized for db store");

    // Insert a report linked to that job
    const error_string = ReportProcess.compute_error(error);
    const [[row]] = await mysql_connection.execute(
      "SELECT * FROM jobs WHERE id = ?",
      [job_id],
    );
    const job = Scheduler.compute(row);
    expect(mysql_connection).toBeDefined();
    const notice = await ReportProcess.notify(job, error_string);

    expect(notice).toHaveProperty("affectedRows", 1);
    expect(notice).toHaveProperty("insertId");
  });
  it("Consumer for Reporting and dead letter queue for RabbitMQ", async () => {
    //Publishing with max retries
    const computed_job = Scheduler.compute(job_claimed);
    console.log("intial: ", computed_job);
    // An update on attempts in computed_job triggeres an unawaited promise
    // so will wil edit the max retires to be less than attempts instead to induce a dead letter publication in schedule consumer logiv
    computed_job.maxRetries = -1;
    const job_run_status = await Scheduler.consumer_logic(computed_job);
    // Worker implementation
    const dead_letter_channel = await RabbitMQ.getChannel(false);

    //Set up the consumer
    const consume_Promise = await new Promise((resolve, reject) => {
      dead_letter_channel.consume(
        process.env.RMQ_DEAD_LETTER_QUEUE,
        async (msg) => {
          const { job, error } = await JSON.parse(msg.content.toString());
          dead_letter_channel.ack(msg);
          expect(job.id).toBe(computed_job.id);
          expect(job.type).toBe(computed_job.type);
          expect(job.payload).toBeUndefined();

          const notify = await ReportProcess.notify(job, error);
          resolve(notify);
        },
      );
    });
    expect(typeof consume_Promise.insertId).toBe("number");
    expect(consume_Promise.affectedRows).toBe(1);
  }, 20000);
});
