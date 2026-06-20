import { Database } from "./db";
import ProcessorQueries from "./queries/processor";
import registry from "./registry";
import ReportProcess from "./report";

const JobProcessor = (() => {
  let mysql_connection;
  function setConnection(connection) {
    mysql_connection = connection;
  }
  function checkConnection() {
    if (!mysql_connection) throw new Error("Connection not set");
  }
  async function claim_job() {
    checkConnection();
    await mysql_connection.beginTransaction();

    // Lock next eligible job row
    const [locked] = await mysql_connection.execute(ProcessorQueries.lock);
    if (locked.length === 0) {
      await mysql_connection.rollback();
      return null;
    }

    const job = locked[0];
    const [update] = await mysql_connection.execute(ProcessorQueries.claim, [
      job.id,
    ]);

    if (update.affectedRows === 1) {
      await mysql_connection.commit();
      return job;
    } else {
      await mysql_connection.rollback();
      return null;
    }
  }

  async function run_job(job) {
    const { handler, rules, requirements } = registry.getJob(job.type);

    // Run with timeout
    const job_run_status = await Promise.race([
      handler(job.payload),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), rules.timeout),
      ),
    ]);
    return job_run_status;
  }

  async function handleFailure(job, rules, error) {
    const attempts = job.attempt_count + 1;

    if (attempts < rules.maxRetries) {
      const nextRun = calculateNextRetry(rules.backoff, attempts);
      await mysql_connection.execute(ProcessorQueries.retry, [
        attempts,
        nextRun,
        error.message,
        job.id,
      ]);
    } else {
      await mysql_connection.execute(ProcessorQueries.deadLetter, [
        attempts,
        error.message,
        job.id,
      ]);
      if (["high", "critical"].includes(rules.severity)) {
        ReportProcess.notify(job, error);
      }
    }
  }
  return { setConnection, claim_job, run_job };
})();

export default JobProcessor;
