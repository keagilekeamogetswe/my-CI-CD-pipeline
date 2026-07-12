// app/deamon/scheduler/index.js
import JobProcessor from "./processor";
import RequirementResolver from "./actions/dependency/requirement.resolver";
import { SchedulerCalculator } from "./scheduler/calculater";
import AttemptsProxyHandler from "./scheduler/attemps.proxy.handler";
import registry from "./registry";
import ReportProcess from "./report";

const Scheduler = (() => {
  async function schedule_job(precomputed_job) {
    const { delayed_channel } = RequirementResolver.resolve({
      delayed_channel: true,
    });

    const { retries, attempts } = precomputed_job;
    const nextDelay = retries[attempts];
    precomputed_job.attempts += 1;

    await delayed_channel.publish(
      process.env.RMQ_DELAYED_EXCHANGE,
      process.env.RMQ_DELAYED_QUEUE,
      Buffer.from(JSON.stringify(precomputed_job)),
      { headers: { "x-delay": nextDelay } },
    );

    return { success: true, intrinsic: { published: true, delay: nextDelay } };
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

  async function consumer_logic(computed_job) {
    const job_run_status = await JobProcessor.run_job(computed_job);

    const { mysql_connection, delayed_channel } = RequirementResolver.resolve({
      mysql_connection: true,
      delayed_channel: true,
    });

    if (job_run_status.success) {
      // mark job as done
      await mysql_connection.execute(
        "UPDATE jobs SET status = 'done' WHERE id = ?",
        [computed_job.id],
      );
      return job_run_status;
    } else {
      if (computed_job.attempts < computed_job.maxRetries) {
        // retry path → delegate to schedule_job
        await schedule_job(computed_job);
      } else {
        // mark job as failed
        const result = await mysql_connection.execute(
          "UPDATE jobs SET status = 'failed' WHERE id = ?",
          [computed_job.id],
        );
        const { none_delayed_channel } = RequirementResolver.resolve({
          none_delayed_channel: true,
        });
        // dead-letter path
        // Inside your RabbitMQ setup file
        const exchange = process.env.RMQ_DEAD_LETTER_EXCHANGE; // dead-letter exchange
        const queue = process.env.RMQ_DEAD_LETTER_QUEUE; // dead-letter queue
        const routingKey = process.env.RMQ_DEAD_LETTER_QUEUE; // binding key

        await none_delayed_channel.assertExchange(exchange, "direct", {
          durable: true,
        });
        await none_delayed_channel.assertQueue(queue, { durable: true });
        await none_delayed_channel.bindQueue(queue, exchange, routingKey);
        //Remove payload before sending
        delete computed_job.payload;
        delete computed_job.retries;
        delete computed_job.timeout;

        await none_delayed_channel.sendToQueue(
          process.env.RMQ_DEAD_LETTER_QUEUE,
          Buffer.from(
            JSON.stringify({
              job: computed_job,
              error: ReportProcess.compute_error(job_run_status.intrinsic),
            }),
            "utf8",
          ),
          { persistent: true },
        );
      }
      const { intrinsic } = job_run_status;
      return { intrinsic, success: false };
    }
  }

  return { compute, recompute, schedule_job, consumer_logic };
})();

export default Scheduler;
