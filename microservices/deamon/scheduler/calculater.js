export class SchedulerCalculator {
  constructor({ baseDelay = 1000, maxCap = 60000 } = {}) {
    this.baseDelay = baseDelay;
    this.maxCap = maxCap;
  }

  fixed() {
    return this.baseDelay;
  }

  exponential(attempt) {
    return Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxCap);
  }

  jitter(attempt) {
    const exp = this.exponential(attempt);
    return Math.floor(Math.random() * exp);
  }

  calculate(method, attempt = 1) {
    switch (method) {
      case "fixed":
        return this.fixed();
      case "exponential":
        return this.exponential(attempt);
      case "jitter":
        return this.jitter(attempt);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}
