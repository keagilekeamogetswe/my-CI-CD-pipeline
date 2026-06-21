import { MetricsRepository } from "./repository.js";
import { MetricsUsage } from "./usage.js";

/**
 * Collector Module Wrapper Namespace
 */
const Collector = (() => {
  return {
    useMetricsFrom: async (jobtype, handler) => {
      let errors = null;
      const metrics_usage = new MetricsUsage();

      // Take snapshot baseline right before execution starts
      const before_usage = metrics_usage.detect();
      const handler_result = await handler();
      // Take snapshot baseline right after execution concludes
      const after_usage = metrics_usage.detect();

      // Fluid pipeline invocation maps values and dumps to Redis database storage
      const metrics = await metrics_usage
        .setBeforeMetric(before_usage)
        .setAfterMetrics(after_usage)
        .setJobExecutionStatus(handler_result.success)
        .saveUsageFor(jobtype);
      metrics["intrinsic"] = handler_result.intrinsic;
      return metrics;
    },
    saveMetricsFrom: async (jobtype, jobMetrics) => {
      console.log(jobMetrics);
      const [result] = await MetricsRepository.saveUsageFor(
        jobtype,
        jobMetrics,
      );
      return result;
    },
  };
})();

export default Collector;
