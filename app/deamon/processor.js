import RequirementResolver from "./actions/dependency/requirement.resolver";
import ProcessorQueries from "./queries/processor";
import registry from "./registry";
// import ReportProcess from "./report";

const JobProcessor = (() => {
  let mysql_connection;

  function checkConnection() {
    if (!mysql_connection) {
      throw new Error("Connection not set");
    }
  }

  async function claim_job() {
    mysql_connection = RequirementResolver.resolve({
      mysql_connection: true,
    }).mysql_connection;

    checkConnection();

    await mysql_connection.beginTransaction();

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
    }

    await mysql_connection.rollback();
    return null;
  }

  async function run_job(job) {
    const { handler, rules } = registry.getJob(job.type);

    try {
      const job_run_status = await Promise.race([
        Promise.resolve(handler(job.payload)),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout")),
            rules.timeout ?? job.timeout,
          ),
        ),
      ]);

      return job_run_status;
    } catch (error) {
      return {
        success: false,
        intrinsic: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  return {
    claim_job,
    run_job,
  };
})();

export default JobProcessor;
