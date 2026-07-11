import { Database } from "../../app/deamon/db";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import nodemailer from "nodemailer";
import ReportProcess from "../../app/deamon/report";
import Scheduler from "../../app/deamon/scheduler";
import RequirementResolver from "../../app/deamon/actions/dependency/requirement.resolver";

const transporter = nodemailer.createTransport({
  host: "127.0.0.1",
  port: 1025,
  secure: false,
});

const MAILPIT_API_URL = "http://127.0.0.1:8025/api/v1/messages";

describe("Report", () => {
  let mysql_connection;
  let job_id;

  beforeEach(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();
    RequirementResolver.setupResolver(mysql_connection, mysql_connection);

    // Insert a job
    const [jobResult] = await mysql_connection.execute(
      "INSERT INTO jobs(payload, type, attempts) VALUES (?, ?, ?)",
      [JSON.stringify({}), "session.save", 1],
    );
    job_id = jobResult.insertId;
  });

  afterAll(async () => {
    if (mysql_connection) {
      await mysql_connection.rollback();
      await mysql_connection.close();
    }
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
});
