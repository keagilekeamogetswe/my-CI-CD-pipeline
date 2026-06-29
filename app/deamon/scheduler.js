import registry from "./registry";
import AttemptsProxyHandler from "./scheduler/attemps.proxy.handler";
import attempsProxyHandler from "./scheduler/attemps.proxy.handler";
import { SchedulerCalculator } from "./scheduler/calculater";

const Scheduler = (() => {
  return {
    recompute: async (computed_job_msg) => {
      const target = await JSON.parse(computed_job_msg);
      return new Proxy(target, attempsProxyHandler);
    },
    compute: (retrived_job) => {
      const { id, payload, type } = retrived_job;
      const job_infor = registry.getJob(type);
      const { priority, maxRetries, timeout, severity, backoff } =
        job_infor.rules;
      const method = backoff.type;
      const calc = new SchedulerCalculator(backoff);
      const retries = [];
      for (let index = 1; index <= maxRetries; index++) {
        const delay = calc.calculate(method, index);
        retries.push(delay);
      }
      const computed_job = {
        type,
        payload,
        id,
        attempts: 0,
        type,
        retries,
        priority,
        severity,
        timeout,
        maxRetries,
      };
      const JobProxy = new Proxy(computed_job, AttemptsProxyHandler);
      return JobProxy;
    },
  };
})();

export default Scheduler;
