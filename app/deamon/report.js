import nodemailer from "nodemailer";
import RequirementResolver from "./actions/dependency/requirement.resolver";

const ReportProcess = (() => {
  // Configure mailer (use env vars for security)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  /**
   * Logs a job event to the database and sends an alert (if high/critical severity).
   * @param {Object} job - The job object
   * @param {Error|any} error - The error that occurred
   */
  async function notify(job, error) {
    if (!job?.id) {
      console.error("ReportProcess.notify: Missing job.id");
      return;
    }

    const mysql_connection = RequirementResolver.resolve({
      mysql_connection: 1,
    }).mysql_connection;

    const errorStr = compute_error(error);

    console.log("Job report:", {
      id: job.id,
      type: job.type,
      severity: job.severity,
    });
    let db_operation = null;

    // Log to reports table
    try {
      const [result] = await mysql_connection.execute(
        `INSERT INTO reports
         (job_id, type, severity, error)
         VALUES (?, ?, ?, ?)`,
        [
          job.id,
          job.type || "unknown",
          job.severity || "info",
          errorStr.substring(0, 2000), // truncate to avoid DB issues
        ],
      );
      db_operation = result;
    } catch (dbErr) {
      console.error("Failed to insert report:", dbErr);
    }

    // Send alert for high/critical severity (no cooldown)
    if (["high", "critical"].includes((job.severity || "").toLowerCase())) {
      await sendAlert(job, error);
    }
    return db_operation;
  }

  async function sendAlert(job, error) {
    const message = {
      from: `"Daemon Service" <${process.env.MAIL_USER}>`,
      to: process.env.ALERT_RECIPIENT,
      subject: `Job Failure Alert: ${job.name || job.id}`,
      html: `
        <h3>Job Failure</h3>
        <p><strong>Job ID:</strong> ${job.id}</p>
        <p><strong>Name:</strong> ${job.name || "N/A"}</p>
        <p><strong>Severity:</strong> ${job.severity}</p>
        <p><strong>Error:</strong> ${error.message || error}</p>
        <p><strong>Attempts:</strong> ${job.attempt_count || 0}</p>
        <details>
          <summary>Full Stack Trace + Payload</summary>
          <pre>${compute_error(error)}</pre>
          <pre>Payload: ${JSON.stringify(job.payload || {}, null, 2)}</pre>
        </details>
      `,
      text:
        `Job ${job.id} (${job.name}) failed.\n\n` +
        `Severity: ${job.severity}\n` +
        `Error: ${error.message}\n` +
        `Attempts: ${job.attempt_count}\n\n` +
        `Payload: ${JSON.stringify(job.payload)}`,
    };

    try {
      const info = await transporter.sendMail(message);
      console.log("Alert sent successfully:", info.messageId);
    } catch (err) {
      console.error("Failed to send alert email:", err);
    }
  }

  function compute_error(error) {
    if (error instanceof Error) {
      return `${error.name}\nMessage: ${error.message}\nStack:\n${error.stack}`;
    }
    if (typeof error === "string") return error;
    return String(error);
  }

  return {
    notify,
    compute_error,
    sendAlert, // exposed for manual use / testing
  };
})();

export default ReportProcess;
