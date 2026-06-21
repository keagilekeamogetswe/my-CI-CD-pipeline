/**
 * Class representing the active resource snapshot state tracker
 * and calculator for execution diffs.
 */
export class MetricsUsage {
  constructor() {
    this.beforeMetric = null;
    this.afterMetric = null;
    this.isSuccessful = true;
  }

  /**
   * Captures absolute resource baselines at the precise invocation point.
   */
  detect() {
    return {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      time: process.hrtime.bigint(),
    };
  }

  setBeforeMetric(metricsSnapshot) {
    this.beforeMetric = metricsSnapshot;
    return this; // Allows method chaining
  }

  setAfterMetrics(metricsSnapshot) {
    this.afterMetric = metricsSnapshot;
    return this; // Allows method chaining
  }

  setJobExecutionStatus(statusBoolean) {
    this.isSuccessful = statusBoolean;
    return this; // Allows method chaining
  }

  /**
   * Internal calculator that extracts the absolute delta between
   * the 'before' and 'after' snapshots.
   */
  calculate() {
    if (!this.beforeMetric || !this.afterMetric) {
      throw new Error(
        "Cannot calculate metrics without both before and after snapshots.",
      );
    }
    const timeDeltaMs =
      Number(this.afterMetric.time - this.beforeMetric.time) / 1_000_000;
    const cpuDelta = process.cpuUsage(this.beforeMetric.cpu);
    const cpuTotalMs = (cpuDelta.user + cpuDelta.system) / 1000;

    const memoryDeltaBytes =
      this.afterMetric.memory.heapUsed - this.beforeMetric.memory.heapUsed;
    const memoryDeltaMB = Number((memoryDeltaBytes / 1024 / 1024).toFixed(4));

    return {
      durationMs: Number(timeDeltaMs.toFixed(3)),
      cpuTimeMs: Number(cpuTotalMs.toFixed(3)),
      ramChangeMB: memoryDeltaMB > 0 ? memoryDeltaMB : 0,
      status: this.isSuccessful,
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * Triggers calculation profiles
   */
  async saveUsageFor(jobtype) {
    const computedPayload = this.calculate();
    return computedPayload;
  }
}
