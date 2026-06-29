// app/deamon/scheduler/index.js
import JobProcessor from "./processor";
import RequirementResolver from "./actions/dependency/requirement.resolver";
import AttemptsProxyHandler from "./scheduler/attemps.proxy.handler";
import { SchedulerCalculator } from "./scheduler/calculater";
import registry from "./registry";
import { RabbitMQ } from "./rabbitmq";
const Scheduler = (() => {
  async function run_precomputed(precomputed_job) {
    const channel = await RabbitMQ.getChannel();

    const { retries, attempts } = precomputed_job;
    const nextDelay = retries[attempts];
    precomputed_job.attempts += 1;

    await channel.publish(
      process.env.RMQ_DELAYED_EXCHANGE,
      process.env.RMQ_DELAYED_QUEUE,
      Buffer.from(JSON.stringify(precomputed_job)),
      { headers: { "x-delay": nextDelay } },
    );

    return { success: true, intrinsic: { published: true, delay: nextDelay } };
  }

  async function consume(rawMessage, channel, exchange, routing_key) {
    // recompute job from raw message
    const computed_job = await recompute(rawMessage);

    // attempt job run
    const job_run_status = await JobProcessor.run_job(computed_job);

    const { mysql_connection } = RequirementResolver.resolve({
      mysql_connection: true,
    });

    if (job_run_status.success) {
      // mark job as done
      await mysql_connection.execute(
        "UPDATE jobs SET status = 'done' WHERE id = ?",
        [computed_job.id],
      );
      return job_run_status;
    } else {
      // retry if attempts < maxRetries
      if (computed_job.attempts < computed_job.maxRetries) {
        await run_precomputed(computed_job, channel, exchange, routing_key);
      } else {
        // mark job as failed
        await mysql_connection.execute(
          "UPDATE jobs SET status = 'failed' WHERE id = ?",
          [computed_job.id],
        );
      }
      return job_run_status;
    }
  }

  async function recompute(computed_job_msg) {
    const target = JSON.parse(computed_job_msg);
    return new Proxy(target, AttemptsProxyHandler);
  }

  function compute(retrieved_job) {
    const { id, payload, type } = retrieved_job;
    const job_info = registry.getJob(type);
    const { priority, maxRetries, timeout, severity, backoff } = job_info.rules;
    const calc = new SchedulerCalculator(backoff);
    const retries = [];
    for (let index = 1; index <= maxRetries; index++) {
      retries.push(calc.calculate(backoff.type, index));
    }
    const computed_job = {
      id,
      type,
      payload,
      attempts: 0,
      retries,
      priority,
      severity,
      timeout,
      maxRetries,
    };
    return new Proxy(computed_job, AttemptsProxyHandler);
  }

  return { compute, recompute, run_precomputed, consume };
})();

export default Scheduler;
